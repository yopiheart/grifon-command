-- Apply AFTER rate_limit.sql and credits.sql, BEFORE deploying quota.ts callers.
-- Not applied by the app. Service-role only; no paid/provider operations here.
-- Ad markers are receipts: do not expire or purge vidjob:/omniad: rows.
create or replace function public.consume_finished_ad(
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

revoke all on function public.consume_finished_ad(uuid, text, text, int) from public, anon, authenticated;
grant execute on function public.consume_finished_ad(uuid, text, text, int) to service_role;
