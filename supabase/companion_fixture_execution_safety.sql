-- Independent synthetic safety ledger. Never gates or dispatches the existing sample worker.
-- TEST_UNIT is a lifetime test allowance, not money, credits or production spending authority.
begin;
create table if not exists grifon_fixture.execution_budgets (
  owner_id uuid primary key,
  cap_units integer not null default 120 check (cap_units = 120),
  held_units integer not null default 0 check (held_units >= 0),
  settled_units integer not null default 0 check (settled_units >= 0),
  actual_cents integer not null default 0 check (actual_cents = 0),
  check (held_units + settled_units <= cap_units)
);
create table if not exists grifon_fixture.execution_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references grifon_fixture.execution_budgets(owner_id),
  run_key text not null check (run_key ~ '^[a-zA-Z0-9_-]{1,64}$'),
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  issued_at bigint not null check (issued_at between 0 and 9007199254140991),
  expires_at bigint not null,
  cancelled boolean not null default false,
  actual_cents integer not null default 0 check (actual_cents = 0),
  unique(owner_id,run_key), unique(id,owner_id),
  check (expires_at = issued_at + 600000)
);
create table if not exists grifon_fixture.execution_attempts (
  owner_id uuid not null,
  run_id uuid not null,
  submission_key text not null check (submission_key ~ '^[a-zA-Z0-9_-]{1,64}$'),
  intent_text text not null check (octet_length(intent_text) <= 512),
  stage text not null check (stage in ('clip','voice','assemble')),
  ordinal integer not null check (ordinal between 1 and 2),
  units integer not null,
  state text not null check (state in ('reserved','submitting','submitted','succeeded','rejected','reconciliation_required','cancelled')),
  fake_handle text,
  evidence_key text,
  actual_cents integer not null default 0 check (actual_cents = 0),
  primary key(owner_id,submission_key),
  foreign key(run_id,owner_id) references grifon_fixture.execution_runs(id,owner_id),
  unique(run_id,stage,ordinal),
  check (units = case stage when 'clip' then 12 when 'voice' then 8 else 4 end),
  check (fake_handle is null or fake_handle = 'fixture:' || submission_key),
  check (coalesce((state = 'succeeded' and fake_handle is not null and evidence_key = 'fake-success:' || submission_key)
    or (state = 'rejected' and evidence_key = 'fake-reject:' || submission_key)
    or (state not in ('succeeded','rejected') and evidence_key is null),false)),
  check (state not in ('reserved','submitting','cancelled') or fake_handle is null),
  check (state not in ('submitted','succeeded') or fake_handle is not null)
);
alter table grifon_fixture.execution_budgets enable row level security;
alter table grifon_fixture.execution_runs enable row level security;
alter table grifon_fixture.execution_attempts enable row level security;
revoke all on grifon_fixture.execution_budgets, grifon_fixture.execution_runs, grifon_fixture.execution_attempts from public, anon, authenticated;

create or replace function grifon_fixture.execution_wire(p_run_id uuid, p_owner uuid)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('version',1,'runtime','fixture-execution-safety-v1','fixture',true,'actualCents',0,'currency','TEST_UNIT',
    'runId',r.id,'runKey',r.run_key,'inputHash',r.input_hash,'ownerId',r.owner_id,'cancelled',r.cancelled,'issuedAt',r.issued_at,'expiresAt',r.expires_at,
    'budget',jsonb_build_object('capUnits',b.cap_units,'heldUnits',b.held_units,'settledUnits',b.settled_units),
    'stages','{"clip":{"unitsPerAttempt":12,"maxAttempts":2},"voice":{"unitsPerAttempt":8,"maxAttempts":2},"assemble":{"unitsPerAttempt":4,"maxAttempts":2}}'::jsonb,
    'attempts',coalesce((select jsonb_agg(jsonb_build_object('submissionKey',a.submission_key,'intentText',a.intent_text,'stage',a.stage,
      'ordinal',a.ordinal,'state',a.state,'units',a.units,'fakeHandle',a.fake_handle,'evidenceKey',a.evidence_key) order by a.stage,a.ordinal)
      from grifon_fixture.execution_attempts a where a.run_id = r.id and a.owner_id = p_owner),'[]'::jsonb))
  from grifon_fixture.execution_runs r join grifon_fixture.execution_budgets b on b.owner_id = r.owner_id
  where r.id = p_run_id and r.owner_id = p_owner;
$$;

create or replace function grifon_fixture.execution_get(p_run_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner();
begin return grifon_fixture.execution_wire(p_run_id,owner); end;
$$;

create or replace function grifon_fixture.execution_find(p_run_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); run_id uuid;
begin
  if p_run_key is null or p_run_key !~ '^[a-zA-Z0-9_-]{1,64}$' then raise exception 'INVALID_EXECUTION_INPUT' using errcode = '22023'; end if;
  select id into run_id from grifon_fixture.execution_runs where owner_id = owner and run_key = p_run_key;
  if not found then return null; end if;
  return grifon_fixture.execution_wire(run_id,owner);
end;
$$;

create or replace function grifon_fixture.execution_quote(p_run_key text, p_input_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); r grifon_fixture.execution_runs; now_ms bigint := floor(extract(epoch from clock_timestamp())*1000)::bigint;
begin
  if p_run_key is null or p_run_key !~ '^[a-zA-Z0-9_-]{1,64}$' or p_input_hash is null or p_input_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_EXECUTION_INPUT' using errcode = '22023';
  end if;
  insert into grifon_fixture.execution_budgets(owner_id) values(owner) on conflict do nothing;
  -- Every mutation locks the one owner budget first, including distinct runs and replayed commands.
  perform 1 from grifon_fixture.execution_budgets where owner_id = owner for update;
  select * into r from grifon_fixture.execution_runs where owner_id = owner and run_key = p_run_key;
  if found then
    if r.input_hash <> p_input_hash then raise exception 'EXECUTION_IDEMPOTENCY_CONFLICT' using errcode = '22023'; end if;
    return grifon_fixture.execution_wire(r.id,owner);
  end if;
  if (select count(*) from grifon_fixture.execution_runs where owner_id = owner) >= 50 then raise exception 'EXECUTION_RUN_LIMIT' using errcode = '54000'; end if;
  insert into grifon_fixture.execution_runs(owner_id,run_key,input_hash,issued_at,expires_at)
    values(owner,p_run_key,p_input_hash,now_ms,now_ms+600000) returning * into r;
  return grifon_fixture.execution_wire(r.id,owner);
end;
$$;

create or replace function grifon_fixture.execution_reserve(p_run_id uuid, p_stage text, p_submission_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); r grifon_fixture.execution_runs; b grifon_fixture.execution_budgets;
  a grifon_fixture.execution_attempts; previous grifon_fixture.execution_attempts; amount integer; attempt_count integer; intent text;
begin
  if p_stage is null or p_stage not in ('clip','voice','assemble') or p_submission_key is null or p_submission_key !~ '^[a-zA-Z0-9_-]{1,64}$' then
    raise exception 'INVALID_EXECUTION_INPUT' using errcode = '22023';
  end if;
  select * into b from grifon_fixture.execution_budgets where owner_id = owner for update;
  select * into r from grifon_fixture.execution_runs where id = p_run_id and owner_id = owner for update;
  if not found then raise exception 'EXECUTION_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into a from grifon_fixture.execution_attempts where owner_id = owner and submission_key = p_submission_key;
  if found then
    if a.run_id <> p_run_id or a.stage <> p_stage then raise exception 'EXECUTION_IDEMPOTENCY_CONFLICT' using errcode = '22023'; end if;
    return grifon_fixture.execution_wire(r.id,owner);
  end if;
  if r.cancelled then raise exception 'EXECUTION_CANCELLED' using errcode = '55000'; end if;
  if floor(extract(epoch from clock_timestamp())*1000)::bigint >= r.expires_at then raise exception 'EXECUTION_QUOTE_EXPIRED' using errcode = '55000'; end if;
  select count(*) into attempt_count from grifon_fixture.execution_attempts where run_id = r.id and stage = p_stage;
  if attempt_count >= 2 then raise exception 'EXECUTION_ATTEMPT_LIMIT' using errcode = '54000'; end if;
  select * into previous from grifon_fixture.execution_attempts where run_id = r.id and stage = p_stage order by ordinal desc limit 1;
  if found and previous.state <> 'rejected' then raise exception 'EXECUTION_STAGE_UNRESOLVED' using errcode = '55000'; end if;
  amount := case p_stage when 'clip' then 12 when 'voice' then 8 else 4 end;
  if b.held_units + b.settled_units + amount > b.cap_units then raise exception 'EXECUTION_BUDGET_EXHAUSTED' using errcode = '54000'; end if;
  intent := '[' || to_json(owner::text)::text || ',' || to_json(r.id::text)::text || ',' || to_json(p_stage)::text || ',' || to_json(p_submission_key)::text || ',' || to_json(r.input_hash)::text || ']';
  -- The reservation and durable, stable submission intent commit together. Each reservation consumes an attempt before any hypothetical dispatch.
  insert into grifon_fixture.execution_attempts(owner_id,run_id,submission_key,intent_text,stage,ordinal,units,state)
    values(owner,r.id,p_submission_key,intent,p_stage,attempt_count+1,amount,'reserved');
  update grifon_fixture.execution_budgets set held_units = held_units + amount where owner_id = owner;
  return grifon_fixture.execution_wire(r.id,owner);
end;
$$;

create or replace function grifon_fixture.execution_command(p_run_id uuid, p_submission_key text, p_action text, p_fake_handle text, p_evidence_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); r grifon_fixture.execution_runs; a grifon_fixture.execution_attempts; target text;
begin
  if p_action is null or p_action not in ('begin','accept','unknown','stale','recover','succeed','reject') then raise exception 'INVALID_EXECUTION_COMMAND' using errcode = '22023'; end if;
  if p_submission_key is null or p_submission_key !~ '^[a-zA-Z0-9_-]{1,64}$' then raise exception 'INVALID_EXECUTION_INPUT' using errcode = '22023'; end if;
  if (p_action in ('accept','recover','succeed') and p_fake_handle is distinct from 'fixture:' || p_submission_key)
    or (p_action not in ('accept','recover','succeed') and p_fake_handle is not null)
    or (p_action = 'succeed' and p_evidence_key is distinct from 'fake-success:' || p_submission_key)
    or (p_action = 'reject' and p_evidence_key is distinct from 'fake-reject:' || p_submission_key)
    or (p_action not in ('succeed','reject') and p_evidence_key is not null) then raise exception 'INVALID_FAKE_EVIDENCE' using errcode = '22023'; end if;
  perform 1 from grifon_fixture.execution_budgets where owner_id = owner for update;
  select * into r from grifon_fixture.execution_runs where id = p_run_id and owner_id = owner for update;
  if not found then raise exception 'EXECUTION_NOT_FOUND' using errcode = 'P0002'; end if;
  select * into a from grifon_fixture.execution_attempts where owner_id = owner and run_id = r.id and submission_key = p_submission_key for update;
  if not found then raise exception 'EXECUTION_NOT_FOUND' using errcode = 'P0002'; end if;
  if (p_action = 'succeed' and a.state = 'succeeded') or (p_action = 'reject' and a.state = 'rejected')
    or (p_action = 'begin' and a.state = 'submitting') or (p_action in ('accept','recover') and a.state = 'submitted')
    or (p_action in ('unknown','stale') and a.state = 'reconciliation_required') then return grifon_fixture.execution_wire(r.id,owner); end if;
  if p_action = 'begin' then
    if r.cancelled then raise exception 'EXECUTION_CANCELLED' using errcode = '55000'; end if;
    if floor(extract(epoch from clock_timestamp())*1000)::bigint >= r.expires_at then raise exception 'EXECUTION_QUOTE_EXPIRED' using errcode = '55000'; end if;
    if a.state <> 'reserved' then raise exception 'EXECUTION_TRANSITION_REJECTED' using errcode = '55000'; end if;
    target := 'submitting';
  elsif p_action = 'accept' then
    if a.state <> 'submitting' then raise exception 'EXECUTION_TRANSITION_REJECTED' using errcode = '55000'; end if;
    target := 'submitted';
  elsif p_action = 'recover' then
    if a.state <> 'reconciliation_required' then raise exception 'EXECUTION_TRANSITION_REJECTED' using errcode = '55000'; end if;
    target := 'submitted';
  elsif p_action in ('unknown','stale') then
    if a.state not in ('submitting','submitted') then raise exception 'EXECUTION_TRANSITION_REJECTED' using errcode = '55000'; end if;
    target := 'reconciliation_required';
  elsif p_action = 'succeed' then
    if a.state not in ('submitted','reconciliation_required') or a.fake_handle is null then raise exception 'EXECUTION_TRANSITION_REJECTED' using errcode = '55000'; end if;
    target := 'succeeded';
  else
    if a.state not in ('submitting','submitted','reconciliation_required') then raise exception 'EXECUTION_TRANSITION_REJECTED' using errcode = '55000'; end if;
    target := 'rejected';
  end if;
  update grifon_fixture.execution_attempts set state = target, fake_handle = coalesce(p_fake_handle,fake_handle), evidence_key = p_evidence_key
    where owner_id = owner and submission_key = p_submission_key;
  if target in ('succeeded','rejected') then
    update grifon_fixture.execution_budgets set held_units = held_units - a.units,
      settled_units = settled_units + case when target = 'succeeded' then a.units else 0 end where owner_id = owner;
  end if;
  return grifon_fixture.execution_wire(r.id,owner);
end;
$$;

create or replace function grifon_fixture.execution_cancel(p_run_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare owner uuid := grifon_fixture.authorized_owner(); r grifon_fixture.execution_runs; released integer;
begin
  perform 1 from grifon_fixture.execution_budgets where owner_id = owner for update;
  select * into r from grifon_fixture.execution_runs where id = p_run_id and owner_id = owner for update;
  if not found then raise exception 'EXECUTION_NOT_FOUND' using errcode = 'P0002'; end if;
  if r.cancelled then return grifon_fixture.execution_wire(r.id,owner); end if;
  select coalesce(sum(units),0)::integer into released from grifon_fixture.execution_attempts where run_id = r.id and state = 'reserved';
  update grifon_fixture.execution_attempts set state = 'cancelled' where run_id = r.id and state = 'reserved';
  update grifon_fixture.execution_budgets set held_units = held_units - released where owner_id = owner;
  update grifon_fixture.execution_runs set cancelled = true where id = r.id;
  return grifon_fixture.execution_wire(r.id,owner);
end;
$$;

create or replace function public.grifon_fixture_execution_quote(p_run_key text, p_input_hash text)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.execution_quote(p_run_key,p_input_hash); $$;
create or replace function public.grifon_fixture_execution_reserve(p_run_id uuid, p_stage text, p_submission_key text)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.execution_reserve(p_run_id,p_stage,p_submission_key); $$;
create or replace function public.grifon_fixture_execution_command(p_run_id uuid, p_submission_key text, p_action text, p_fake_handle text default null, p_evidence_key text default null)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.execution_command(p_run_id,p_submission_key,p_action,p_fake_handle,p_evidence_key); $$;
create or replace function public.grifon_fixture_execution_cancel(p_run_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.execution_cancel(p_run_id); $$;
create or replace function public.grifon_fixture_execution_get(p_run_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.execution_get(p_run_id); $$;
create or replace function public.grifon_fixture_execution_find(p_run_key text)
returns jsonb language sql security invoker set search_path = '' as $$ select grifon_fixture.execution_find(p_run_key); $$;

revoke all on function grifon_fixture.execution_wire(uuid,uuid) from public,anon,authenticated;
revoke all on function grifon_fixture.execution_quote(text,text), grifon_fixture.execution_reserve(uuid,text,text), grifon_fixture.execution_command(uuid,text,text,text,text), grifon_fixture.execution_cancel(uuid), grifon_fixture.execution_get(uuid) from public,anon,authenticated;
revoke all on function public.grifon_fixture_execution_quote(text,text), public.grifon_fixture_execution_reserve(uuid,text,text), public.grifon_fixture_execution_command(uuid,text,text,text,text), public.grifon_fixture_execution_cancel(uuid), public.grifon_fixture_execution_get(uuid) from public,anon,authenticated;
grant execute on function grifon_fixture.execution_quote(text,text), grifon_fixture.execution_reserve(uuid,text,text), grifon_fixture.execution_command(uuid,text,text,text,text), grifon_fixture.execution_cancel(uuid), grifon_fixture.execution_get(uuid) to authenticated;
grant execute on function public.grifon_fixture_execution_quote(text,text), public.grifon_fixture_execution_reserve(uuid,text,text), public.grifon_fixture_execution_command(uuid,text,text,text,text), public.grifon_fixture_execution_cancel(uuid), public.grifon_fixture_execution_get(uuid) to authenticated;
revoke all on function grifon_fixture.execution_find(text), public.grifon_fixture_execution_find(text) from public,anon,authenticated;
grant execute on function grifon_fixture.execution_find(text), public.grifon_fixture_execution_find(text) to authenticated;
commit;
