-- REVIEW PROPOSAL ONLY. Not approved or applied.
-- Intended Supabase project: GRIFON AI / varoqxjccqmskzeejagn.
-- The caller must select that exact project; SQL cannot attest the project ref.
-- One DO statement keeps DDL, ACLs and postconditions in one transaction even
-- when the migration runner's outer transaction behavior is not documented.
-- Do not add BEGIN/COMMIT inside an apply_migration request.
do $grifon_meter_deploy$
declare
  v_function pg_proc%rowtype;
  v_service oid;
begin
  perform set_config('lock_timeout', '2s', true);
  -- A setting made inside DO does not establish a hard wall-clock cap for the
  -- already-running top-level statement. The runner must also bound its request.
  perform set_config('statement_timeout', '15s', true);

  if current_user <> 'postgres' then
    raise exception 'finished_ad_meter_requires_postgres_migration_role';
  end if;
  if to_regprocedure('public.consume_finished_ad(uuid,text,text,integer)') is not null then
    raise exception 'finished_ad_meter_already_exists_review_catalog_before_retry';
  end if;
  if to_regclass('public.rate_limits') is null
    or to_regclass('public.subscriptions') is null
    or to_regprocedure('public.consume_credit(uuid,text)') is null then
    raise exception 'finished_ad_meter_missing_required_prior_migration';
  end if;
  select oid into v_service from pg_roles where rolname = 'service_role';
  if v_service is null then
    raise exception 'finished_ad_meter_missing_service_role';
  end if;

  execute $grifon_meter_ddl$
create function public.consume_finished_ad(
  p_user_id uuid,
  p_unit text,
  p_finished_ad_id text,
  p_limit int
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job_key text;
  v_month_key text;
  v_seen int;
  v_used int;
  v_credit boolean := false;
  v_allowed boolean := false;
begin
  if p_user_id is null or p_unit not in ('video_ads', 'omni_ads')
    or p_unit is null or p_finished_ad_id is null or length(p_finished_ad_id) = 0
    or length(p_finished_ad_id) > 200 or p_limit is null or p_limit < 0 then
    raise exception 'invalid_finished_ad_meter_input';
  end if;
  v_job_key := (case when p_unit = 'video_ads' then 'vidjob:' else 'omniad:' end)
    || p_user_id::text || ':' || p_finished_ad_id;
  v_month_key := p_unit || ':monthly:' || to_char(now() at time zone 'UTC', 'YYYY-MM')
    || ':' || p_user_id::text;

  -- Lock order is always ad receipt -> monthly budget -> subscription credit.
  -- Same-ad callers wait here before inspecting the receipt, including a retry
  -- after a committed transaction whose HTTP response was lost.
  insert into public.rate_limits (key, count) values (v_job_key, 0)
    on conflict (key) do nothing;
  select count into v_seen from public.rate_limits where key = v_job_key for update;

  -- Different ads share this row lock. Legacy monthly RPC updates also respect
  -- this lock, so two ads cannot spend the last monthly slot concurrently.
  insert into public.rate_limits (key, count) values (v_month_key, 0)
    on conflict (key) do nothing;
  select count into v_used from public.rate_limits where key = v_month_key for update;

  if v_seen > 0 then
    v_allowed := true;
  elsif v_used < p_limit then
    update public.rate_limits set count = count + 1 where key = v_month_key
      returning count into v_used;
    v_allowed := true;
  else
    v_credit := public.consume_credit(p_user_id,
      case when p_unit = 'video_ads' then 'video_ad' else 'omni_style' end);
    v_allowed := v_credit;
  end if;

  if v_allowed and v_seen = 0 then
    update public.rate_limits set count = 1, window_start = now() where key = v_job_key;
  end if;
  -- No exception handler: any failed marker/debit write rolls back ALL changes.
  return jsonb_build_object(
    'allowed', v_allowed, 'alreadyCounted', v_seen > 0, 'fromCredit', v_credit,
    'used', least(v_used, p_limit), 'limit', p_limit,
    'remaining', greatest(0, p_limit - v_used)
  );
end;
$$;
$grifon_meter_ddl$;
  execute 'revoke all on function public.consume_finished_ad(uuid, text, text, int) from public, anon, authenticated';
  execute 'grant execute on function public.consume_finished_ad(uuid, text, text, int) to service_role';

  select * into strict v_function from pg_proc
    where oid = 'public.consume_finished_ad(uuid,text,text,integer)'::regprocedure;
  if md5(replace(v_function.prosrc, E'\r\n', E'\n')) <> '7cfd6fb078444301ec89dfebf51dbf54'
    or not v_function.prosecdef
    or v_function.proowner <> 'postgres'::regrole
    or v_function.prorettype <> 'jsonb'::regtype
    or v_function.prolang <> (select oid from pg_language where lanname = 'plpgsql')
    or v_function.proconfig is distinct from array['search_path=public']::text[] then
    raise exception 'finished_ad_meter_definition_postcondition_failed';
  end if;
  -- Reject PUBLIC and every non-owner grant except non-grantable service_role
  -- EXECUTE, including any unexpected privileges inherited from default ACLs.
  if exists (
    select 1 from aclexplode(coalesce(v_function.proacl, acldefault('f', v_function.proowner))) a
    where a.grantee <> v_function.proowner
      and (a.grantee <> v_service or a.privilege_type <> 'EXECUTE' or a.is_grantable)
  ) or not exists (
    select 1 from aclexplode(coalesce(v_function.proacl, acldefault('f', v_function.proowner))) a
    where a.grantee = v_service and a.privilege_type = 'EXECUTE' and not a.is_grantable
  ) or not has_function_privilege('service_role', v_function.oid, 'EXECUTE')
    or has_function_privilege('anon', v_function.oid, 'EXECUTE')
    or has_function_privilege('authenticated', v_function.oid, 'EXECUTE') then
    raise exception 'finished_ad_meter_permissions_postcondition_failed';
  end if;

  -- PostgreSQL delivers this only after the surrounding transaction commits.
  -- Delivery requests a reload; it does not prove that PostgREST loaded it.
  perform pg_notify('pgrst', 'reload schema');
end;
$grifon_meter_deploy$;
