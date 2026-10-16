-- Apply after companion_cloud_fixture_references.sql. New linked jobs only; no historical backfill.
-- The existing worker completes jobs. These triggers record access to the immutable shipped sample.
begin;
create table if not exists grifon_fixture.results (
  request_id text not null references grifon_fixture.jobs(request_id),
  fixture_version text not null check (fixture_version = 'v1'),
  manifest_id text not null check (manifest_id = 'grifon-companion-fixture-video-v1'),
  owner_id uuid not null,
  owner_chat_id text not null,
  job_id uuid not null,
  source_save_id text not null check (source_save_id ~ '^[a-f0-9]{64}$'),
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  intent_text text not null check (octet_length(intent_text) <= 131072),
  status text not null check (status in ('PENDING', 'READY')),
  actual_cents bigint not null default 0 check (actual_cents = 0),
  created_at bigint not null check (created_at between 0 and 9007199254740991),
  ready_at bigint,
  primary key(request_id, fixture_version),
  check ((status = 'PENDING' and ready_at is null) or (status = 'READY' and ready_at is not null and ready_at between created_at and 9007199254740991))
);
create index if not exists grifon_fixture_results_owner_ready_idx on grifon_fixture.results(owner_id, ready_at desc, request_id) where status = 'READY';
alter table grifon_fixture.results enable row level security;
revoke all on grifon_fixture.results from public, anon, authenticated;

create or replace function grifon_fixture.result_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new is not distinct from old then return new; end if;
  if old.status = 'READY' or (to_jsonb(new) - array['status', 'ready_at']) is distinct from (to_jsonb(old) - array['status', 'ready_at'])
    or old.status <> 'PENDING' or new.status <> 'READY' or new.ready_at is null or new.ready_at < old.created_at then
    raise exception 'FIXTURE_RESULT_IMMUTABLE' using errcode = '55000';
  end if;
  return new;
end;
$$;
drop trigger if exists grifon_fixture_result_guard on grifon_fixture.results;
create trigger grifon_fixture_result_guard before update on grifon_fixture.results for each row execute function grifon_fixture.result_guard();

create or replace function grifon_fixture.result_accept_job()
returns trigger language plpgsql security definer set search_path = '' as $$
declare intent jsonb := new.intent_text::jsonb;
begin
  if not intent ? 'cloudReference' then return new; end if;
  if not coalesce(intent->'fixture' = 'true'::jsonb and intent->>'requestId' = new.request_id and intent->>'ownerId' = new.owner_id::text
    and intent->>'ownerChatId' = new.owner_chat_id and intent#>>'{cloudReference,inputHash}' = intent#>>'{plan,inputHash}'
    and new.queue->'actualCents' = '0'::jsonb and new.queue->>'status' = 'running' and new.queue->'invalidated' = 'false'::jsonb, false) then
    raise exception 'INVALID_FIXTURE_RESULT_JOB' using errcode = '22023';
  end if;
  insert into grifon_fixture.results(request_id, fixture_version, manifest_id, owner_id, owner_chat_id, job_id, source_save_id, input_hash,
    intent_text, status, actual_cents, created_at, ready_at)
  values(new.request_id, 'v1', 'grifon-companion-fixture-video-v1', new.owner_id, new.owner_chat_id, (new.queue->>'id')::uuid,
    intent#>>'{cloudReference,saveId}', intent#>>'{plan,inputHash}', new.intent_text, 'PENDING', 0,
    floor(extract(epoch from clock_timestamp()) * 1000)::bigint, null);
  return new;
end;
$$;
drop trigger if exists grifon_fixture_result_accept_job on grifon_fixture.jobs;
create trigger grifon_fixture_result_accept_job after insert on grifon_fixture.jobs for each row execute function grifon_fixture.result_accept_job();

create or replace function grifon_fixture.result_complete_job()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.queue->'invalidated' is distinct from 'false'::jsonb or new.queue->'actualCents' is distinct from '0'::jsonb
    or exists(select 1 from jsonb_array_elements(new.queue->'steps') step where step->>'status' is distinct from 'succeeded') then
    return new;
  end if;
  update grifon_fixture.results set status = 'READY', ready_at = new.updated_at
    where request_id = new.request_id and fixture_version = 'v1' and status = 'PENDING' and owner_id = new.owner_id
      and owner_chat_id = new.owner_chat_id and job_id = (new.queue->>'id')::uuid and intent_text = new.intent_text;
  return new;
end;
$$;
drop trigger if exists grifon_fixture_result_complete_job on grifon_fixture.jobs;
create trigger grifon_fixture_result_complete_job after update of queue on grifon_fixture.jobs for each row
  when (old.queue->>'status' is distinct from 'complete' and new.queue->>'status' = 'complete') execute function grifon_fixture.result_complete_job();

create or replace function grifon_fixture.result_receipt(result grifon_fixture.results)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('version', 1, 'fixture', true, 'runtime', 'supabase-cloud-fixture-result-v1',
    'fixtureVersion', result.fixture_version, 'manifestId', result.manifest_id, 'ownerId', result.owner_id, 'ownerChatId', result.owner_chat_id,
    'requestId', result.request_id, 'jobId', result.job_id, 'sourceSaveId', result.source_save_id, 'inputHash', result.input_hash,
    'intentText', result.intent_text, 'status', result.status, 'actualCents', result.actual_cents, 'createdAt', result.created_at, 'readyAt', result.ready_at);
$$;
create or replace function grifon_fixture.result_get(p_request_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); result grifon_fixture.results;
begin
  select * into result from grifon_fixture.results where request_id = p_request_id and fixture_version = 'v1' and owner_id = owner;
  if not found then return null; end if;
  return grifon_fixture.result_receipt(result);
end;
$$;
create or replace function grifon_fixture.result_list()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); receipts jsonb;
begin
  select coalesce(jsonb_agg(grifon_fixture.result_receipt(result) order by result.ready_at desc, result.request_id), '[]'::jsonb) into receipts
    from (select * from grifon_fixture.results where owner_id = owner and fixture_version = 'v1' and status = 'READY'
      order by ready_at desc, request_id limit 100) result;
  return receipts;
end;
$$;

create or replace function public.grifon_fixture_result_get(p_request_id text)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.result_get(p_request_id); $$;
create or replace function public.grifon_fixture_result_list()
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.result_list(); $$;
revoke all on function grifon_fixture.result_guard(), grifon_fixture.result_accept_job(), grifon_fixture.result_complete_job(),
  grifon_fixture.result_receipt(grifon_fixture.results), grifon_fixture.result_get(text), grifon_fixture.result_list() from public, anon, authenticated;
revoke all on function public.grifon_fixture_result_get(text), public.grifon_fixture_result_list() from public, anon, authenticated;
grant execute on function grifon_fixture.result_get(text), grifon_fixture.result_list() to authenticated;
grant execute on function public.grifon_fixture_result_get(text), public.grifon_fixture_result_list() to authenticated;
commit;
