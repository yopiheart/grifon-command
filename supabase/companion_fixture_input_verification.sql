-- Server-attested, immutable fixture input preflight. No worker, dispatch or paid authority.
-- Apply after companion_cloud_fixture_references.sql. Existing jobs are never backfilled.
begin;
create table if not exists grifon_fixture.input_verifications (
  request_id text primary key check (request_id ~ '^[a-f0-9]{64}$'),
  owner_id uuid not null,
  source_save_id text not null check (source_save_id ~ '^[a-f0-9]{64}$'),
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  manifest_sha256 text not null check (manifest_sha256 ~ '^[a-f0-9]{64}$'),
  plan_snapshot_sha256 text not null check (plan_snapshot_sha256 ~ '^[a-f0-9]{64}$'),
  verified_media jsonb not null check (jsonb_typeof(verified_media) = 'array' and jsonb_array_length(verified_media) between 1 and 6 and octet_length(verified_media::text) <= 8192),
  verified_at bigint not null check (verified_at between 0 and 9007199254740991),
  actual_cents integer not null default 0 check (actual_cents = 0)
);
alter table grifon_fixture.input_verifications enable row level security;
revoke all on grifon_fixture.input_verifications from public,anon,authenticated,service_role;

create or replace function grifon_fixture.input_verification_guard()
returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'FIXTURE_INPUT_VERIFICATION_IMMUTABLE' using errcode = '55000'; end;
$$;
drop trigger if exists grifon_fixture_input_verification_guard on grifon_fixture.input_verifications;
create trigger grifon_fixture_input_verification_guard before update or delete on grifon_fixture.input_verifications for each row execute function grifon_fixture.input_verification_guard();

create or replace function grifon_fixture.input_verification_wire(receipt grifon_fixture.input_verifications)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('version',1,'runtime','fixture-input-verification-v1','fixture',true,'actualCents',0,
    'ownerId',receipt.owner_id,'requestId',receipt.request_id,'sourceSaveId',receipt.source_save_id,'inputHash',receipt.input_hash,
    'manifestSha256',receipt.manifest_sha256,'planSnapshotSha256',receipt.plan_snapshot_sha256,'decoder','ffmpeg-full-null-v1',
    'orientation','identity-only','verifiedMedia',receipt.verified_media,'verifiedAt',receipt.verified_at);
$$;

create or replace function grifon_fixture.input_verification_get(p_request_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); receipt grifon_fixture.input_verifications;
begin
  if p_request_id is null or p_request_id !~ '^[a-f0-9]{64}$' then raise exception 'INVALID_FIXTURE_REQUEST' using errcode = '22023'; end if;
  select * into receipt from grifon_fixture.input_verifications where owner_id = owner and request_id = p_request_id;
  if not found then return null; end if;
  return grifon_fixture.input_verification_wire(receipt);
end;
$$;

create or replace function grifon_fixture.input_verification_record(p_owner_id uuid,p_request_id text,p_source_save_id text,p_input_hash text,p_manifest_sha256 text,p_plan_snapshot_sha256 text,p_verified_media jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare job grifon_fixture.jobs; snapshot grifon_fixture.reference_snapshots; intent jsonb; manifest jsonb; media jsonb; expected jsonb; identity_text text;
  receipt grifon_fixture.input_verifications; ordinal integer := 0; video boolean;
begin
  if p_owner_id is null or not exists(select 1 from grifon_fixture.allowed_owners where user_id = p_owner_id) then raise exception 'FIXTURE_OWNER_REQUIRED' using errcode = '42501'; end if;
  select * into job from grifon_fixture.jobs where request_id = p_request_id and owner_id = p_owner_id for share;
  if not found or job.queue->'invalidated' is distinct from 'false'::jsonb or job.queue->'actualCents' is distinct from '0'::jsonb then raise exception 'FIXTURE_JOB_UNAVAILABLE' using errcode = 'P0002'; end if;
  intent := job.intent_text::jsonb;
  if not intent ? 'cloudReference' then raise exception 'FIXTURE_LINKED_INPUTS_REQUIRED' using errcode = '22023'; end if;
  identity_text := '[' || to_json(p_owner_id::text)::text || ',' || to_json(intent->>'ownerChatId')::text || ',' || to_json(intent#>>'{plan,confirmation,planSnapshot}')::text || ',' || to_json(intent#>>'{cloudReference,saveId}')::text || ']';
  intent := grifon_fixture.validate_intent(job.intent_text,identity_text,p_owner_id);
  select * into snapshot from grifon_fixture.reference_snapshots where owner_id = p_owner_id and save_id = p_source_save_id and committed for share;
  if not found then raise exception 'FIXTURE_SNAPSHOT_UNAVAILABLE' using errcode = 'P0002'; end if;
  manifest := grifon_fixture.reference_validate_manifest(snapshot.manifest_text);
  if p_request_id is distinct from intent->>'requestId' or p_source_save_id is distinct from intent#>>'{cloudReference,saveId}'
    or p_input_hash is distinct from manifest->>'inputHash' or p_input_hash is distinct from intent#>>'{plan,inputHash}'
    or p_input_hash is distinct from intent#>>'{cloudReference,inputHash}'
    or p_manifest_sha256 is distinct from encode(sha256(convert_to(snapshot.manifest_text,'UTF8')),'hex')
    or p_plan_snapshot_sha256 is distinct from encode(sha256(convert_to(intent#>>'{plan,confirmation,planSnapshot}','UTF8')),'hex') then raise exception 'FIXTURE_INPUT_IDENTITY_MISMATCH' using errcode = '22023'; end if;
  if p_verified_media is null or jsonb_typeof(p_verified_media) <> 'array' or jsonb_array_length(p_verified_media) not between 1 and 6
    or jsonb_array_length(p_verified_media) <> jsonb_array_length(manifest->'media') or octet_length(p_verified_media::text) > 8192 then raise exception 'INVALID_FIXTURE_MEDIA_EVIDENCE' using errcode = '22023'; end if;
  for media in select value from jsonb_array_elements(p_verified_media) loop
    expected := manifest->'media'->ordinal; video := expected->>'slot' = 'reference'; ordinal := ordinal + 1;
    if not grifon_fixture.reference_keys(media,array['slot','mimeType','sizeBytes','sha256','width','height','durationSeconds','frames','decoded'])
      or media->'decoded' is distinct from 'true'::jsonb or media->'slot' is distinct from expected->'slot'
      or media->'mimeType' is distinct from expected->'type' or media->'sizeBytes' is distinct from expected->'size'
      or media->'sha256' is distinct from expected->'sha256' or media->'width' is distinct from expected->'width' or media->'height' is distinct from expected->'height'
      or not grifon_fixture.reference_integer(media->'frames',1,1800) or (expected->>'width')::numeric * (expected->>'height')::numeric > 16000000 then raise exception 'INVALID_FIXTURE_MEDIA_EVIDENCE' using errcode = '22023'; end if;
    if video then
      if not coalesce(jsonb_typeof(media->'durationSeconds') = 'number' and (media->>'durationSeconds')::numeric > 0 and (media->>'durationSeconds')::numeric <= 30.001
        and abs((media->>'durationSeconds')::numeric - (expected->>'duration')::numeric) <= 0.001
        and (media->>'frames')::numeric / (media->>'durationSeconds')::numeric <= 60.001,false) then raise exception 'INVALID_FIXTURE_MEDIA_EVIDENCE' using errcode = '22023'; end if;
    elsif media->'durationSeconds' is distinct from 'null'::jsonb or media->'frames' is distinct from '1'::jsonb then raise exception 'INVALID_FIXTURE_MEDIA_EVIDENCE' using errcode = '22023'; end if;
  end loop;
  -- Only the trusted server writer can supply decoded evidence. A conflict returns the immutable first receipt.
  insert into grifon_fixture.input_verifications(request_id,owner_id,source_save_id,input_hash,manifest_sha256,plan_snapshot_sha256,verified_media,verified_at)
    values(p_request_id,p_owner_id,p_source_save_id,p_input_hash,p_manifest_sha256,p_plan_snapshot_sha256,p_verified_media,floor(extract(epoch from clock_timestamp())*1000)::bigint)
    on conflict(request_id) do nothing;
  select * into receipt from grifon_fixture.input_verifications where request_id = p_request_id;
  if receipt.owner_id is distinct from p_owner_id or receipt.source_save_id is distinct from p_source_save_id or receipt.input_hash is distinct from p_input_hash
    or receipt.manifest_sha256 is distinct from p_manifest_sha256 or receipt.plan_snapshot_sha256 is distinct from p_plan_snapshot_sha256 or receipt.verified_media is distinct from p_verified_media then raise exception 'FIXTURE_INPUT_VERIFICATION_CONFLICT' using errcode = '22023'; end if;
  return grifon_fixture.input_verification_wire(receipt);
end;
$$;

create or replace function public.grifon_fixture_input_verification_get(p_request_id text)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.input_verification_get(p_request_id); $$;
create or replace function public.grifon_fixture_input_verification_record(p_owner_id uuid,p_request_id text,p_source_save_id text,p_input_hash text,p_manifest_sha256 text,p_plan_snapshot_sha256 text,p_verified_media jsonb)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.input_verification_record(p_owner_id,p_request_id,p_source_save_id,p_input_hash,p_manifest_sha256,p_plan_snapshot_sha256,p_verified_media); $$;

revoke all on function grifon_fixture.input_verification_guard(), grifon_fixture.input_verification_wire(grifon_fixture.input_verifications) from public,anon,authenticated,service_role;
revoke all on function grifon_fixture.input_verification_get(text), public.grifon_fixture_input_verification_get(text) from public,anon,authenticated,service_role;
revoke all on function grifon_fixture.input_verification_record(uuid,text,text,text,text,text,jsonb), public.grifon_fixture_input_verification_record(uuid,text,text,text,text,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function grifon_fixture.input_verification_get(text), public.grifon_fixture_input_verification_get(text) to authenticated;
-- Required only for the new private server writer; no old function or table privileges are expanded.
grant usage on schema grifon_fixture to service_role;
grant execute on function grifon_fixture.input_verification_record(uuid,text,text,text,text,text,jsonb), public.grifon_fixture_input_verification_record(uuid,text,text,text,text,text,jsonb) to service_role;
commit;
