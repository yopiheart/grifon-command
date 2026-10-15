-- Isolated, synthetic pilot. Apply as postgres; this file never activates a worker.
-- No provider calls, generated media, production tables, auth writes or spending authority.
begin;
create schema if not exists grifon_fixture;
revoke all on schema grifon_fixture from public, anon, authenticated;
grant usage on schema grifon_fixture to authenticated;

create table if not exists grifon_fixture.allowed_owners (
  user_id uuid primary key
);
create table if not exists grifon_fixture.jobs (
  request_id text primary key check (request_id ~ '^[a-f0-9]{64}$'),
  owner_id uuid not null,
  owner_chat_id text not null,
  intent_text text not null check (octet_length(intent_text) <= 131072),
  queue jsonb not null check (coalesce(queue->'fixture' = 'true'::jsonb and queue->'actualCents' = '0'::jsonb and not queue ? 'plan', false)),
  updated_at bigint not null,
  next_due_at bigint
);
create index if not exists grifon_fixture_jobs_owner_idx on grifon_fixture.jobs(owner_id, updated_at desc);
create index if not exists grifon_fixture_jobs_due_idx on grifon_fixture.jobs(next_due_at) where next_due_at is not null;
create unique index if not exists grifon_fixture_jobs_active_chat_idx on grifon_fixture.jobs(owner_id, owner_chat_id)
  where queue->>'status' in ('running', 'failed') and queue->'invalidated' = 'false'::jsonb;
create table if not exists grifon_fixture.events (
  request_id text not null references grifon_fixture.jobs(request_id),
  revision integer not null,
  kind text not null check (kind in ('start', 'tick', 'retry', 'cancel', 'invalidate')),
  occurred_at bigint not null,
  queue jsonb not null check (coalesce(queue->'actualCents' = '0'::jsonb and not queue ? 'plan', false)),
  primary key(request_id, revision)
);
create table if not exists grifon_fixture.command_receipts (
  owner_id uuid not null,
  command_id uuid not null,
  payload jsonb not null,
  result jsonb not null,
  primary key(owner_id, command_id)
);
alter table grifon_fixture.allowed_owners enable row level security;
alter table grifon_fixture.jobs enable row level security;
alter table grifon_fixture.events enable row level security;
alter table grifon_fixture.command_receipts enable row level security;
revoke all on all tables in schema grifon_fixture from public, anon, authenticated;

create or replace function grifon_fixture.text_ok(v jsonb, maximum integer)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(v) = 'string' and char_length(v #>> '{}')
    + (select count(*) from regexp_split_to_table(v #>> '{}', '') as chars(character) where ascii(character) > 65535) <= maximum, false);
$$;
create or replace function grifon_fixture.js_nonblank(v jsonb)
returns boolean language sql immutable set search_path = '' as $$
  select coalesce(jsonb_typeof(v) = 'string' and length(btrim(v #>> '{}',
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF')) > 0, false);
$$;
create or replace function grifon_fixture.integer_ok(v jsonb, minimum numeric)
returns boolean language plpgsql immutable set search_path = '' as $$
begin
  if jsonb_typeof(v) is distinct from 'number' or v::text !~ '^[0-9]+$' then return false; end if;
  return v::text::numeric between minimum and 9007199254740991;
end;
$$;
create or replace function grifon_fixture.cents(v jsonb)
returns bigint language plpgsql immutable set search_path = '' as $$
declare amount text; result bigint;
begin
  if not grifon_fixture.text_ok(v, 20) then raise exception 'INVALID_QUOTE' using errcode = '22023'; end if;
  amount := btrim(v #>> '{}');
  if amount !~ '^[0-9]{1,7}(\.[0-9]{1,2})?$' then raise exception 'INVALID_QUOTE' using errcode = '22023'; end if;
  result := (amount::numeric * 100)::bigint;
  if result > 100000000 then raise exception 'INVALID_QUOTE' using errcode = '22023'; end if;
  return result;
end;
$$;
create or replace function grifon_fixture.authorized_owner()
returns uuid language plpgsql security definer set search_path = '' as $$
declare owner uuid := auth.uid();
begin
  if owner is null or not exists(select 1 from grifon_fixture.allowed_owners where user_id = owner) then
    raise exception 'FIXTURE_OWNER_REQUIRED' using errcode = '42501';
  end if;
  return owner;
end;
$$;
-- Match the confirmed client's compact JSON while retaining the raw object's key order.
-- Fixture numeric fields are safe integers; arbitrary fractional extensions are rejected.
create or replace function grifon_fixture.compact_plan_json(v json, omit_confirmation boolean default false)
returns text language plpgsql immutable set search_path = '' as $$
declare kind text := json_typeof(v); item record; result text := ''; separator text := ''; number numeric;
begin
  if kind = 'object' then
    if (select count(*) <> count(distinct key) from json_each(v)) then
      raise exception 'INVALID_PLAN_OBJECT' using errcode = '22023';
    end if;
    for item in select * from json_each(v) with ordinality order by ordinality loop
      -- No official plan fields are integer-index keys, whose JS enumeration reorders them.
      if item.key ~ '^(0|[1-9][0-9]{0,9})$' then
        if item.key::numeric <= 4294967294 then raise exception 'INVALID_PLAN_OBJECT' using errcode = '22023'; end if;
      end if;
      if omit_confirmation and item.key = 'confirmation' then continue; end if;
      result := result || separator || to_json(item.key)::text || ':' || grifon_fixture.compact_plan_json(item.value);
      separator := ',';
    end loop;
    return '{' || result || '}';
  elsif kind = 'array' then
    for item in select * from json_array_elements(v) with ordinality order by ordinality loop
      result := result || separator || grifon_fixture.compact_plan_json(item.value); separator := ',';
    end loop;
    return '[' || result || ']';
  elsif kind = 'string' then return to_json(v #>> '{}')::text;
  elsif kind = 'number' then
    number := v::text::numeric;
    if number <> trunc(number) or abs(number) > 9007199254740991 then raise exception 'INVALID_PLAN_NUMBER' using errcode = '22023'; end if;
    return number::bigint::text;
  elsif kind in ('boolean', 'null') then return v::text;
  else raise exception 'INVALID_PLAN_JSON' using errcode = '22023';
  end if;
end;
$$;
create or replace function grifon_fixture.validate_intent(p_intent_text text, p_identity_text text, p_owner uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare intent jsonb; plan jsonb; confirmation jsonb; item jsonb; previous_end numeric := 0;
  scene_start numeric; scene_end numeric; low_total bigint; high_total bigint; cap bigint; canonical_identity text; canonical_plan text;
begin
  if p_intent_text is null or octet_length(p_intent_text) > 131072 or p_identity_text is null or octet_length(p_identity_text) > 131072 then
    raise exception 'INVALID_INTENT' using errcode = '22023';
  end if;
  intent := p_intent_text::jsonb; plan := intent->'plan'; confirmation := plan->'confirmation';
  if not coalesce(jsonb_typeof(intent) = 'object' and intent->'version' = '1'::jsonb and intent->'fixture' = 'true'::jsonb
    and intent->>'ownerId' = p_owner::text and grifon_fixture.text_ok(intent->'ownerChatId', 200) and length(intent->>'ownerChatId') > 0
    and intent->>'ownerChatId' !~ '[\x01-\x1f]' and grifon_fixture.integer_ok(intent->'inputRevision', 0)
    and grifon_fixture.text_ok(intent->'requestId', 64) and intent->>'requestId' ~ '^[a-f0-9]{64}$' and intent->>'scenario' in ('normal', 'second-clip-fails-once')
    and jsonb_typeof(plan) = 'object' and plan->'version' = '1'::jsonb and plan->'fixture' = 'true'::jsonb
    and grifon_fixture.integer_ok(plan->'revision', 1) and plan->'inputRevision' = intent->'inputRevision'
    and grifon_fixture.text_ok(plan->'inputHash', 64) and plan->>'inputHash' ~ '^[a-f0-9]{64}$' and plan->'stale' = 'false'::jsonb
    and grifon_fixture.text_ok(plan->'direction', 4000) and grifon_fixture.js_nonblank(plan->'direction')
    and plan->>'outputLanguage' in ('Taglish', 'Tagalog', 'English') and plan->>'adaptationMode' in ('adapt', 'close')
    and plan->>'speechMode' in ('spoken', 'silent') and jsonb_typeof(confirmation) = 'object'
    and confirmation->'revision' = plan->'revision' and confirmation->'inputRevision' = plan->'inputRevision'
    and confirmation->'inputHash' = plan->'inputHash' and grifon_fixture.text_ok(confirmation->'planSnapshot', 120000), false) then
    raise exception 'INVALID_INTENT' using errcode = '22023';
  end if;
  canonical_identity := '[' || to_json(intent->>'ownerId')::text || ',' || to_json(intent->>'ownerChatId')::text
    || ',' || to_json(confirmation->>'planSnapshot')::text || ']';
  canonical_plan := grifon_fixture.compact_plan_json(p_intent_text::json->'plan', true);
  if confirmation->>'planSnapshot' is distinct from canonical_plan
    or p_identity_text is distinct from canonical_identity
    or encode(sha256(convert_to(canonical_identity, 'UTF8')), 'hex') <> intent->>'requestId' then
    raise exception 'INVALID_IDENTITY_OR_CONFIRMATION' using errcode = '22023';
  end if;
  if plan->'voice' is distinct from 'null'::jsonb and not coalesce(jsonb_typeof(plan->'voice') = 'object'
    and grifon_fixture.text_ok(plan#>'{voice,id}', 200) and length(plan#>>'{voice,id}') > 0
    and grifon_fixture.text_ok(plan#>'{voice,name}', 200) and length(plan#>>'{voice,name}') > 0
    and plan#>>'{voice,source}' in ('curated', 'private'), false) then
    raise exception 'INVALID_VOICE' using errcode = '22023';
  end if;
  if not coalesce(jsonb_typeof(plan->'facts') = 'array' and jsonb_array_length(plan->'facts') <= 10
    and jsonb_typeof(plan->'missing') = 'array' and jsonb_array_length(plan->'missing') <= 10
    and jsonb_typeof(plan->'scenes') = 'array' and jsonb_array_length(plan->'scenes') between 1 and 12
    and jsonb_typeof(plan->'audio') = 'object' and grifon_fixture.text_ok(plan#>'{audio,speech}', 4000)
    and grifon_fixture.text_ok(plan#>'{audio,music}', 4000) and grifon_fixture.text_ok(plan#>'{audio,sfx}', 4000)
    and jsonb_typeof(plan->'quote') = 'object' and jsonb_typeof(plan#>'{quote,items}') = 'array'
    and jsonb_array_length(plan#>'{quote,items}') = 6, false) then
    raise exception 'INVALID_PLAN' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(plan->'facts') loop
    if not (grifon_fixture.text_ok(item->'label', 100) and grifon_fixture.text_ok(item->'value', 4000)) then
      raise exception 'INVALID_FACT' using errcode = '22023';
    end if;
  end loop;
  for item in select value from jsonb_array_elements(plan->'missing') loop
    if not grifon_fixture.text_ok(item, 100) then raise exception 'INVALID_MISSING' using errcode = '22023'; end if;
  end loop;
  if (select count(distinct value->>'id') from jsonb_array_elements(plan->'scenes')) <> jsonb_array_length(plan->'scenes')
    or (intent->>'scenario' = 'second-clip-fails-once' and jsonb_array_length(plan->'scenes') < 2) then
    raise exception 'INVALID_SCENES' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(plan->'scenes') loop
    if not coalesce(grifon_fixture.text_ok(item->'id', 100) and grifon_fixture.text_ok(item->'start', 10)
      and grifon_fixture.text_ok(item->'end', 10) and item->>'start' ~ '^[0-9]+(\.[0-9]{1,2})?$'
      and item->>'end' ~ '^[0-9]+(\.[0-9]{1,2})?$' and grifon_fixture.text_ok(item->'script', 2000)
      and grifon_fixture.text_ok(item->'visual', 2000) and grifon_fixture.js_nonblank(item->'visual')
      and ((plan->>'speechMode' = 'silent' and item->>'script' = '') or (plan->>'speechMode' = 'spoken' and grifon_fixture.js_nonblank(item->'script'))), false) then
      raise exception 'INVALID_SCENE' using errcode = '22023';
    end if;
    scene_start := (item->>'start')::numeric; scene_end := (item->>'end')::numeric;
    if scene_start <> previous_end or scene_end <= scene_start or scene_end > 60 then
      raise exception 'INVALID_SCENE_TIMING' using errcode = '22023';
    end if;
    previous_end := scene_end;
  end loop;
  if (select count(distinct value->>'id') from jsonb_array_elements(plan#>'{quote,items}')) <> 6 then
    raise exception 'INVALID_QUOTE' using errcode = '22023';
  end if;
  low_total := grifon_fixture.cents(plan#>'{quote,contingencyPesos}'); high_total := low_total;
  cap := grifon_fixture.cents(plan#>'{quote,maxDemoCapPesos}');
  for item in select value from jsonb_array_elements(plan#>'{quote,items}') loop
    if not (grifon_fixture.text_ok(item->'id', 100) and grifon_fixture.text_ok(item->'label', 200))
      or grifon_fixture.cents(item->'lowPesos') > grifon_fixture.cents(item->'highPesos') then
      raise exception 'INVALID_QUOTE' using errcode = '22023';
    end if;
    low_total := low_total + grifon_fixture.cents(item->'lowPesos'); high_total := high_total + grifon_fixture.cents(item->'highPesos');
  end loop;
  if not coalesce(high_total <= cap and confirmation->'lowCents' = to_jsonb(low_total)
    and confirmation->'highCents' = to_jsonb(high_total) and confirmation->'capCents' = to_jsonb(cap), false) then
    raise exception 'INVALID_CONFIRMED_QUOTE' using errcode = '22023';
  end if;
  return intent;
end;
$$;
create or replace function grifon_fixture.wire(job grifon_fixture.jobs)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('runtime', 'supabase-cloud-fixture-v1', 'intentText', job.intent_text,
    'queue', job.queue, 'updatedAt', job.updated_at, 'nextDueAt', job.next_due_at);
$$;
create or replace function grifon_fixture.save(p_request_id text, p_queue jsonb, p_kind text)
returns jsonb language plpgsql set search_path = '' as $$
declare job grifon_fixture.jobs; timestamp_ms bigint := floor(extract(epoch from clock_timestamp()) * 1000)::bigint;
begin
  update grifon_fixture.jobs set queue = p_queue, updated_at = timestamp_ms,
    next_due_at = case when p_queue->>'status' = 'running' and p_queue->'invalidated' = 'false'::jsonb then timestamp_ms + 1200 else null end
    where request_id = p_request_id returning * into strict job;
  insert into grifon_fixture.events values(p_request_id, (p_queue->>'revision')::integer, p_kind, timestamp_ms, p_queue);
  return grifon_fixture.wire(job);
end;
$$;

create or replace function grifon_fixture.start(p_intent_text text, p_identity_text text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); intent jsonb; job grifon_fixture.jobs;
  steps jsonb := '[]'::jsonb; item jsonb; index integer := 0; queue jsonb;
begin
  intent := grifon_fixture.validate_intent(p_intent_text, p_identity_text, owner);
  perform pg_advisory_xact_lock(hashtextextended(owner::text, 0));
  select * into job from grifon_fixture.jobs where request_id = intent->>'requestId';
  if found then
    if job.owner_id <> owner or job.intent_text::jsonb <> intent then raise exception 'INTENT_CONFLICT' using errcode = '23505'; end if;
    return grifon_fixture.wire(job);
  end if;
  if exists(select 1 from grifon_fixture.jobs j where j.owner_id = owner and j.owner_chat_id = intent->>'ownerChatId'
    and j.queue->>'status' in ('running', 'failed') and j.queue->'invalidated' = 'false'::jsonb) then
    raise exception 'ACTIVE_JOB_CONFLICT' using errcode = '23505';
  end if;
  if (select count(*) from grifon_fixture.jobs where owner_id = owner) >= 100
    or (select count(*) from grifon_fixture.jobs j where j.owner_id = owner and j.queue->>'status' in ('running', 'failed') and j.queue->'invalidated' = 'false'::jsonb) >= 3 then
    raise exception 'FIXTURE_OWNER_LIMIT' using errcode = '54000';
  end if;
  for item in select value from jsonb_array_elements(intent#>'{plan,scenes}') loop
    index := index + 1;
    steps := steps || jsonb_build_array(jsonb_build_object('id', 'clip-' || index, 'kind', 'clip',
      'status', case when index = 1 then 'running' else 'queued' end, 'attempts', case when index = 1 then 1 else 0 end));
  end loop;
  if intent#>>'{plan,speechMode}' = 'spoken' then
    steps := steps || '[{"id":"voice","kind":"voice","status":"queued","attempts":0}]'::jsonb;
  end if;
  for item in select value from jsonb_array_elements('["music","sfx","assembly","quality"]'::jsonb) loop
    steps := steps || jsonb_build_array(jsonb_build_object('id', item #>> '{}', 'kind', item #>> '{}', 'status', 'queued', 'attempts', 0));
  end loop;
  queue := jsonb_build_object('version', 1, 'fixture', true, 'id', gen_random_uuid(), 'revision', 2,
    'status', 'running', 'invalidated', false, 'scenario', intent->>'scenario', 'steps', steps, 'actualCents', 0);
  insert into grifon_fixture.jobs values(intent->>'requestId', owner, intent->>'ownerChatId', p_intent_text, queue, 0, null);
  return grifon_fixture.save(intent->>'requestId', queue, 'start');
end;
$$;
create or replace function grifon_fixture.get(p_request_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); job grifon_fixture.jobs;
begin
  select * into job from grifon_fixture.jobs where request_id = p_request_id and owner_id = owner;
  if not found then return null; end if;
  return grifon_fixture.wire(job);
end;
$$;
create or replace function grifon_fixture.list()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); result jsonb;
begin
  select coalesce(jsonb_agg(grifon_fixture.wire(job) order by job.updated_at desc, job.request_id), '[]'::jsonb) into result
    from (select * from grifon_fixture.jobs where owner_id = owner order by updated_at desc, request_id limit 100) job;
  return result;
end;
$$;
create or replace function grifon_fixture.command(p_request_id text, p_action text, p_command_id uuid, p_expected_revision integer default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); job grifon_fixture.jobs; receipt grifon_fixture.command_receipts;
  payload jsonb; queue jsonb; steps jsonb; step jsonb; index integer; result jsonb; revision integer;
begin
  if p_command_id is null or p_action is null or p_action not in ('retry', 'cancel', 'invalidate')
    or (p_expected_revision is not null and p_expected_revision < 1) or (p_action = 'retry' and p_expected_revision is null) then
    raise exception 'INVALID_COMMAND' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(owner::text, 0));
  payload := jsonb_build_object('requestId', p_request_id, 'action', p_action, 'expectedRevision', p_expected_revision);
  select * into receipt from grifon_fixture.command_receipts where owner_id = owner and command_id = p_command_id;
  if found then
    if receipt.payload <> payload then raise exception 'COMMAND_CONFLICT' using errcode = '23505'; end if;
    return receipt.result;
  end if;
  select * into job from grifon_fixture.jobs where request_id = p_request_id and owner_id = owner for update;
  if not found then raise exception 'JOB_NOT_FOUND' using errcode = 'P0002'; end if;
  queue := job.queue; revision := (queue->>'revision')::integer;
  if p_expected_revision is not null and p_expected_revision <> revision then raise exception 'REVISION_CONFLICT' using errcode = '40001'; end if;
  if p_action = 'retry' then
    if queue->>'status' <> 'failed' or queue->'invalidated' <> 'false'::jsonb then raise exception 'RETRY_NOT_AVAILABLE' using errcode = '55000'; end if;
    steps := queue->'steps'; index := 0;
    for step in select value from jsonb_array_elements(steps) loop
      exit when step->>'id' = 'clip-2' and step->>'status' = 'failed' and step->'attempts' = '1'::jsonb;
      index := index + 1;
    end loop;
    if index >= jsonb_array_length(steps) then raise exception 'RETRY_NOT_AVAILABLE' using errcode = '55000'; end if;
    steps := jsonb_set(steps, array[index::text], step || '{"status":"running","attempts":2}'::jsonb);
    queue := queue || jsonb_build_object('steps', steps, 'status', 'running', 'revision', revision + 1);
  else
    if queue->>'status' not in ('cancelled', 'complete') and queue->'invalidated' = 'false'::jsonb then
      revision := revision + 1; queue := queue || jsonb_build_object('status', 'cancelled', 'revision', revision);
    end if;
    if p_action = 'invalidate' and queue->'invalidated' = 'false'::jsonb then
      queue := queue || jsonb_build_object('invalidated', true, 'revision', revision + 1);
    end if;
  end if;
  result := case when queue = job.queue then grifon_fixture.wire(job) else grifon_fixture.save(p_request_id, queue, p_action) end;
  insert into grifon_fixture.command_receipts values(owner, p_command_id, payload, result);
  return result;
end;
$$;
create or replace function grifon_fixture.tick()
returns integer language plpgsql security definer set search_path = '' as $$
declare job grifon_fixture.jobs; queue jsonb; steps jsonb; step jsonb; index integer; fails boolean; status text; advanced integer := 0;
begin
  for job in select * from grifon_fixture.jobs where next_due_at <= floor(extract(epoch from clock_timestamp()) * 1000)::bigint
    order by next_due_at, request_id for update skip locked limit 20 loop
    queue := job.queue;
    if queue->>'status' <> 'running' or queue->'invalidated' <> 'false'::jsonb then raise exception 'INVALID_DUE_JOB'; end if;
    steps := queue->'steps'; index := 0;
    for step in select value from jsonb_array_elements(steps) loop
      exit when step->>'status' = 'running'; index := index + 1;
    end loop;
    if index >= jsonb_array_length(steps) then raise exception 'INVALID_DUE_JOB'; end if;
    fails := queue->>'scenario' = 'second-clip-fails-once' and step->>'id' = 'clip-2' and step->'attempts' = '1'::jsonb;
    steps := jsonb_set(steps, array[index::text], step || jsonb_build_object('status', case when fails then 'failed' else 'succeeded' end));
    status := case when fails then 'failed' when index = jsonb_array_length(steps) - 1 then 'complete' else 'running' end;
    if status = 'running' then
      steps := jsonb_set(steps, array[(index + 1)::text], steps->(index + 1) || '{"status":"running","attempts":1}'::jsonb);
    end if;
    perform grifon_fixture.save(job.request_id, queue || jsonb_build_object('revision', (queue->>'revision')::integer + 1, 'status', status, 'steps', steps), 'tick');
    advanced := advanced + 1;
  end loop;
  return advanced;
end;
$$;

-- The Data API sees only invoker wrappers; private implementations recheck auth.uid().
create or replace function public.grifon_fixture_start(p_intent_text text, p_identity_text text)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.start(p_intent_text, p_identity_text); $$;
create or replace function public.grifon_fixture_get(p_request_id text)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.get(p_request_id); $$;
create or replace function public.grifon_fixture_list()
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.list(); $$;
create or replace function public.grifon_fixture_command(p_request_id text, p_action text, p_command_id uuid, p_expected_revision integer default null)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.command(p_request_id, p_action, p_command_id, p_expected_revision); $$;
revoke all on all functions in schema grifon_fixture from public, anon, authenticated;
revoke all on function public.grifon_fixture_start(text, text), public.grifon_fixture_get(text), public.grifon_fixture_list(),
  public.grifon_fixture_command(text, text, uuid, integer) from public, anon, authenticated;
grant execute on function grifon_fixture.start(text, text), grifon_fixture.get(text), grifon_fixture.list(),
  grifon_fixture.command(text, text, uuid, integer) to authenticated;
grant execute on function public.grifon_fixture_start(text, text), public.grifon_fixture_get(text), public.grifon_fixture_list(),
  public.grifon_fixture_command(text, text, uuid, integer) to authenticated;
commit;
