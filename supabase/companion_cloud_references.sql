-- Apply as postgres only after review. This stores original reference inputs, never generated media.
-- No worker, provider call, auth write, production unlock or spending authority is added.
begin;
create schema if not exists grifon_fixture;
revoke all on schema grifon_fixture from public, anon, authenticated;
grant usage on schema grifon_fixture to authenticated;
create table if not exists grifon_fixture.allowed_owners (user_id uuid primary key);
alter table grifon_fixture.allowed_owners enable row level security;
revoke all on grifon_fixture.allowed_owners from public, anon, authenticated;

create table if not exists grifon_fixture.reference_snapshots (
  owner_id uuid not null,
  save_id text not null check (save_id ~ '^[a-f0-9]{64}$'),
  source_chat_id text not null,
  manifest_text text not null,
  created_at bigint not null,
  committed boolean not null default false,
  reserved_bytes bigint not null check (reserved_bytes between 0 and 36000000),
  actual_bytes bigint,
  object_metadata jsonb,
  primary key(owner_id, save_id),
  check ((not committed and actual_bytes is null and object_metadata is null)
    or (committed and actual_bytes between 0 and reserved_bytes and jsonb_typeof(object_metadata) = 'object'))
);
create index if not exists grifon_reference_owner_created_idx on grifon_fixture.reference_snapshots(owner_id, created_at desc, save_id);
alter table grifon_fixture.reference_snapshots enable row level security;
revoke all on grifon_fixture.reference_snapshots from public, anon, authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('grifon-fixture-reference-media', 'grifon-fixture-reference-media', false, 6000000,
  array['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function grifon_fixture.reference_keys(v jsonb, required text[], optional text[] default array[]::text[])
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(v) = 'object' and v ?& required and (v - required - optional) = '{}'::jsonb, false);
$$;
create or replace function grifon_fixture.reference_text(v jsonb, maximum integer)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(v) = 'string' and char_length(v #>> '{}')
    + (select count(*) from regexp_split_to_table(v #>> '{}', '') as chars(character) where ascii(character) > 65535) <= maximum, false);
$$;
create or replace function grifon_fixture.reference_id(v jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select grifon_fixture.reference_text(v, 200) and length(v #>> '{}') > 0 and (v #>> '{}') !~ '[\x01-\x1f\x7f]';
$$;
create or replace function grifon_fixture.reference_integer(v jsonb, minimum numeric, maximum numeric)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(v) is distinct from 'number' then return false; end if;
  return v::text::numeric between minimum and maximum and v::text::numeric = trunc(v::text::numeric);
end;
$$;
create or replace function grifon_fixture.reference_unique_keys(v json)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item json;
begin
  if json_typeof(v) = 'object' then
    if (select count(*) <> count(distinct key) from json_each(v)) then return false; end if;
    for item in select value from json_each(v) loop
      if not grifon_fixture.reference_unique_keys(item) then return false; end if;
    end loop;
  elsif json_typeof(v) = 'array' then
    for item in select value from json_array_elements(v) loop
      if not grifon_fixture.reference_unique_keys(item) then return false; end if;
    end loop;
  end if;
  return true;
end;
$$;
create or replace function grifon_fixture.reference_media_ok(v jsonb, video boolean)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if not grifon_fixture.reference_keys(v, case when video then array['id', 'name', 'width', 'height', 'duration'] else array['id', 'name', 'width', 'height', 'role'] end)
    or not grifon_fixture.reference_id(v->'id') or not grifon_fixture.reference_text(v->'name', 255)
    or not grifon_fixture.reference_integer(v->'width', 1, 40000000) or not grifon_fixture.reference_integer(v->'height', 1, 40000000) then return false; end if;
  if (v->>'width')::numeric * (v->>'height')::numeric > 40000000 then return false; end if;
  if video then
    return coalesce(jsonb_typeof(v->'duration') = 'number' and (v->>'duration')::numeric > 0 and (v->>'duration')::numeric <= 180, false);
  end if;
  return coalesce(v->>'role' in ('product', 'character', 'clothing'), false);
end;
$$;
create or replace function grifon_fixture.reference_validate_manifest(p_manifest_text text)
returns jsonb language plpgsql set search_path = '' as $$
declare manifest jsonb; draft jsonb; media jsonb; original jsonb; field text; index integer := 0; photo_index integer := 0; video boolean; slot text;
begin
  if p_manifest_text is null or octet_length(p_manifest_text) > 262144 then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  manifest := p_manifest_text::jsonb;
  if not grifon_fixture.reference_unique_keys(p_manifest_text::json)
    or not grifon_fixture.reference_keys(manifest, array['version', 'draft', 'media', 'inputHash'])
    or manifest->'version' is distinct from '1'::jsonb
    or not grifon_fixture.reference_text(manifest->'inputHash', 64) or manifest->>'inputHash' !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  draft := manifest->'draft';
  if not grifon_fixture.reference_keys(draft, array['version', 'brief', 'brandName', 'productName', 'audience', 'offer', 'callToAction', 'instructions',
      'outputLanguage', 'referenceLanguage', 'referenceLink', 'referenceVideo', 'photos', 'voice'], array['adaptationMode', 'speechMode'])
    or draft->'version' is distinct from '1'::jsonb
    or not coalesce(draft->>'outputLanguage' in ('Taglish', 'Tagalog', 'English'), false)
    or (draft ? 'adaptationMode' and not coalesce(draft->>'adaptationMode' in ('adapt', 'close'), false))
    or (draft ? 'speechMode' and not coalesce(draft->>'speechMode' in ('spoken', 'silent'), false)) then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  foreach field in array array['brief', 'brandName', 'productName', 'audience', 'offer', 'callToAction', 'instructions', 'referenceLanguage', 'referenceLink'] loop
    if not grifon_fixture.reference_text(draft->field, 4000) then raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023'; end if;
  end loop;
  if draft->'voice' is distinct from 'null'::jsonb and not (
    grifon_fixture.reference_keys(draft->'voice', array['id', 'name', 'source'])
    and grifon_fixture.reference_text(draft#>'{voice,id}', 200) and length(draft#>>'{voice,id}') > 0
    and grifon_fixture.reference_text(draft#>'{voice,name}', 200) and length(draft#>>'{voice,name}') > 0
    and coalesce(draft#>>'{voice,source}' in ('curated', 'private'), false)) then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  if jsonb_typeof(draft->'photos') is distinct from 'array' or jsonb_typeof(manifest->'media') is distinct from 'array' then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  if jsonb_array_length(draft->'photos') > 5 or jsonb_array_length(manifest->'media') <> jsonb_array_length(draft->'photos')
    + (case when draft->'referenceVideo' = 'null'::jsonb then 0 else 1 end)
    or (select count(distinct value->>'id') from jsonb_array_elements(draft->'photos')) <> jsonb_array_length(draft->'photos') then
    raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
  end if;
  for media in select value from jsonb_array_elements(manifest->'media') loop
    video := index = 0 and draft->'referenceVideo' <> 'null'::jsonb;
    if video then original := draft->'referenceVideo'; slot := 'reference';
    else original := draft->'photos'->photo_index; slot := 'photo-' || photo_index::text; photo_index := photo_index + 1;
    end if;
    if not grifon_fixture.reference_media_ok(original, video)
      or not grifon_fixture.reference_keys(media, case when video then array['slot', 'id', 'name', 'width', 'height', 'duration', 'type', 'size', 'sha256']
        else array['slot', 'id', 'name', 'width', 'height', 'role', 'type', 'size', 'sha256'] end)
      or media - array['slot', 'type', 'size', 'sha256'] is distinct from original
      or media->>'slot' is distinct from slot or not grifon_fixture.reference_integer(media->'size', 1, 6000000)
      or not grifon_fixture.reference_text(media->'sha256', 64) or media->>'sha256' !~ '^[a-f0-9]{64}$'
      or not coalesce(case when video then media->>'type' in ('video/mp4', 'video/webm', 'video/quicktime')
        else media->>'type' in ('image/jpeg', 'image/png', 'image/webp') end, false) then
      raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
    end if;
    index := index + 1;
  end loop;
  return manifest;
exception when invalid_text_representation or numeric_value_out_of_range then
  raise exception 'INVALID_REFERENCE_MANIFEST' using errcode = '22023';
end;
$$;

create or replace function grifon_fixture.reference_owner(lock_owner boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid(); enrolled uuid;
begin
  if lock_owner then select user_id into enrolled from grifon_fixture.allowed_owners where user_id = owner for update;
  else select user_id into enrolled from grifon_fixture.allowed_owners where user_id = owner;
  end if;
  if owner is null or enrolled is null then raise exception 'REFERENCE_OWNER_REQUIRED' using errcode = '42501'; end if;
  return owner;
end;
$$;
create or replace function grifon_fixture.reference_receipt(snapshot grifon_fixture.reference_snapshots)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('runtime', 'supabase-cloud-reference-v1', 'ownerId', snapshot.owner_id, 'saveId', snapshot.save_id,
    'sourceChatId', snapshot.source_chat_id, 'manifestText', snapshot.manifest_text, 'createdAt', snapshot.created_at, 'committed', snapshot.committed);
$$;
create or replace function grifon_fixture.reference_reserve(p_save_id text, p_source_chat_id text, p_manifest_text text, p_identity_text text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.reference_owner(true); manifest jsonb; expected_identity text; snapshot grifon_fixture.reference_snapshots;
  record_count bigint; used_bytes bigint; reservation bigint;
begin
  if p_save_id is null or p_save_id !~ '^[a-f0-9]{64}$' or not grifon_fixture.reference_id(to_jsonb(p_source_chat_id))
    or p_identity_text is null or octet_length(p_identity_text) > 1048576 then
    raise exception 'INVALID_REFERENCE_IDENTITY' using errcode = '22023';
  end if;
  expected_identity := '[' || to_json(owner::text)::text || ',' || to_json(p_source_chat_id)::text || ',' || to_json(p_manifest_text)::text || ']';
  if p_identity_text is distinct from expected_identity or encode(sha256(convert_to(p_identity_text, 'UTF8')), 'hex') <> p_save_id then
    raise exception 'INVALID_REFERENCE_IDENTITY' using errcode = '22023';
  end if;
  manifest := grifon_fixture.reference_validate_manifest(p_manifest_text);
  select * into snapshot from grifon_fixture.reference_snapshots where owner_id = owner and save_id = p_save_id;
  if found then
    if snapshot.source_chat_id is distinct from p_source_chat_id or snapshot.manifest_text is distinct from p_manifest_text then
      raise exception 'REFERENCE_CONFLICT' using errcode = '22023';
    end if;
    return grifon_fixture.reference_receipt(snapshot);
  end if;
  reservation := jsonb_array_length(manifest->'media')::bigint * 6000000;
  select count(*), coalesce(sum(case when committed then actual_bytes else reserved_bytes end), 0)
    into record_count, used_bytes from grifon_fixture.reference_snapshots where owner_id = owner;
  if record_count >= 20 then raise exception 'REFERENCE_RECORD_LIMIT' using errcode = '54000'; end if;
  if used_bytes + reservation > 200000000 then raise exception 'REFERENCE_BYTE_LIMIT' using errcode = '54000'; end if;
  insert into grifon_fixture.reference_snapshots(owner_id, save_id, source_chat_id, manifest_text, created_at, reserved_bytes)
    values(owner, p_save_id, p_source_chat_id, p_manifest_text, floor(extract(epoch from clock_timestamp()) * 1000)::bigint, reservation)
    returning * into snapshot;
  return grifon_fixture.reference_receipt(snapshot);
end;
$$;
create or replace function grifon_fixture.reference_commit(p_save_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare request_owner uuid := grifon_fixture.reference_owner(true); snapshot grifon_fixture.reference_snapshots; media jsonb; metadata jsonb;
  metadata_snapshot jsonb := '{}'::jsonb; total_bytes bigint := 0;
begin
  select * into snapshot from grifon_fixture.reference_snapshots where owner_id = request_owner and save_id = p_save_id for update;
  if not found then raise exception 'REFERENCE_NOT_FOUND' using errcode = 'P0002'; end if;
  if snapshot.committed then return grifon_fixture.reference_receipt(snapshot); end if;
  for media in select value from jsonb_array_elements(snapshot.manifest_text::jsonb->'media') loop
    select objects.metadata into metadata from storage.objects where bucket_id = 'grifon-fixture-reference-media'
      and name = request_owner::text || '/' || p_save_id || '/' || (media->>'slot') for share;
    if not found then raise exception 'REFERENCE_MEDIA_INCOMPLETE' using errcode = '22023'; end if;
    if not grifon_fixture.reference_integer(metadata->'size', 1, 6000000) or metadata->'size' is distinct from media->'size'
      or metadata->>'mimetype' is distinct from media->>'type' then
      raise exception 'REFERENCE_MEDIA_MISMATCH' using errcode = '22023';
    end if;
    total_bytes := total_bytes + (metadata->>'size')::bigint;
    metadata_snapshot := metadata_snapshot || jsonb_build_object(media->>'slot', metadata);
  end loop;
  update grifon_fixture.reference_snapshots set committed = true, actual_bytes = total_bytes, object_metadata = metadata_snapshot
    where owner_id = request_owner and save_id = p_save_id returning * into snapshot;
  return grifon_fixture.reference_receipt(snapshot);
end;
$$;
create or replace function grifon_fixture.reference_get(p_save_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.reference_owner(); snapshot grifon_fixture.reference_snapshots;
begin
  select * into snapshot from grifon_fixture.reference_snapshots where owner_id = owner and save_id = p_save_id and committed;
  if not found then return null; end if;
  return grifon_fixture.reference_receipt(snapshot);
end;
$$;
create or replace function grifon_fixture.reference_list()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.reference_owner(); result jsonb;
begin
  select coalesce(jsonb_agg(grifon_fixture.reference_receipt(snapshot) order by created_at desc, save_id), '[]'::jsonb)
    into result from grifon_fixture.reference_snapshots snapshot where owner_id = owner and committed;
  return result;
end;
$$;
create or replace function grifon_fixture.reference_storage_allowed(p_bucket text, p_name text, inserting boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid();
begin
  if owner is null or p_bucket is distinct from 'grifon-fixture-reference-media'
    or not exists(select 1 from grifon_fixture.allowed_owners where user_id = owner) then return false; end if;
  return exists(select 1 from grifon_fixture.reference_snapshots snapshot,
      lateral jsonb_array_elements(snapshot.manifest_text::jsonb->'media') media
    where snapshot.owner_id = owner and (not inserting or not snapshot.committed)
      and p_name = owner::text || '/' || snapshot.save_id || '/' || (media->>'slot'));
end;
$$;

-- Only these two policies are owned here. No replacement, deletion or unrelated bucket access is granted.
-- Restrict INSERT to standard uploads: signed-upload capabilities can otherwise outlive the reservation.
drop policy if exists grifon_reference_insert on storage.objects;
create policy grifon_reference_insert on storage.objects for insert to authenticated
  with check (storage.allow_only_operation('object.upload') and grifon_fixture.reference_storage_allowed(bucket_id, name, true));
drop policy if exists grifon_reference_select on storage.objects;
create policy grifon_reference_select on storage.objects for select to authenticated
  using (grifon_fixture.reference_storage_allowed(bucket_id, name, false));

-- Native Data API entry points are invokers; private implementations derive and check auth.uid().
create or replace function public.grifon_reference_reserve(p_save_id text, p_source_chat_id text, p_manifest_text text, p_identity_text text)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.reference_reserve(p_save_id, p_source_chat_id, p_manifest_text, p_identity_text); $$;
create or replace function public.grifon_reference_commit(p_save_id text)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.reference_commit(p_save_id); $$;
create or replace function public.grifon_reference_get(p_save_id text)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.reference_get(p_save_id); $$;
create or replace function public.grifon_reference_list()
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.reference_list(); $$;
revoke all on function grifon_fixture.reference_keys(jsonb, text[], text[]), grifon_fixture.reference_text(jsonb, integer),
  grifon_fixture.reference_id(jsonb), grifon_fixture.reference_integer(jsonb, numeric, numeric), grifon_fixture.reference_unique_keys(json),
  grifon_fixture.reference_media_ok(jsonb, boolean), grifon_fixture.reference_validate_manifest(text), grifon_fixture.reference_owner(boolean),
  grifon_fixture.reference_receipt(grifon_fixture.reference_snapshots), grifon_fixture.reference_reserve(text, text, text, text),
  grifon_fixture.reference_commit(text), grifon_fixture.reference_get(text), grifon_fixture.reference_list(),
  grifon_fixture.reference_storage_allowed(text, text, boolean) from public, anon, authenticated;
revoke all on function public.grifon_reference_reserve(text, text, text, text), public.grifon_reference_commit(text),
  public.grifon_reference_get(text), public.grifon_reference_list() from public, anon, authenticated;
grant execute on function grifon_fixture.reference_reserve(text, text, text, text), grifon_fixture.reference_commit(text),
  grifon_fixture.reference_get(text), grifon_fixture.reference_list(), grifon_fixture.reference_storage_allowed(text, text, boolean) to authenticated;
grant execute on function public.grifon_reference_reserve(text, text, text, text), public.grifon_reference_commit(text),
  public.grifon_reference_get(text), public.grifon_reference_list() to authenticated;
commit;
