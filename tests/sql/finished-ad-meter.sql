-- TEST DATABASE ONLY. Transactional assertions against the real migration.
-- This tests SQL behavior, not independent concurrent database connections.
begin;
do $$
declare
  u uuid := '10000000-0000-0000-0000-000000000001';
  r jsonb;
  k text;
begin
  perform public.grant_credits(u, 2, 0, 2);
  foreach k in array array['video_ads', 'omni_ads'] loop
    r := public.consume_finished_ad(u, k, 'monthly', 1);
    assert r @> '{"allowed":true,"alreadyCounted":false,"fromCredit":false,"used":1,"remaining":0}', 'first monthly debit';
    r := public.consume_finished_ad(u, k, 'monthly', 1);
    assert r @> '{"allowed":true,"alreadyCounted":true,"used":1}', 'monthly retry receipt';
    r := public.consume_finished_ad(u, k, 'topup', 1);
    assert r @> '{"allowed":true,"alreadyCounted":false,"fromCredit":true}', 'topup debit';
    r := public.consume_finished_ad(u, k, 'topup', 1);
    assert r @> '{"allowed":true,"alreadyCounted":true,"fromCredit":false}', 'topup retry receipt';
    r := public.consume_finished_ad(u, k, 'last-topup', 1);
    assert r->>'allowed' = 'true', 'last topup';
    r := public.consume_finished_ad(u, k, 'exhausted', 1);
    assert r->>'allowed' = 'false', 'budget exhaustion';
    -- Existing old markers remain receipts; no new debit even after 31 days.
    update public.rate_limits set window_start = now() - interval '60 days'
      where key like '%:' || u::text || ':monthly';
    r := public.consume_finished_ad(u, k, 'monthly', 1);
    assert r->>'alreadyCounted' = 'true', 'durable old receipt';
  end loop;
  assert (select video_ad_credits = 0 and omni_style_credits = 0 from public.subscriptions where user_id = u), 'exactly two topups each';
  assert not has_function_privilege('anon', 'public.consume_finished_ad(uuid,text,text,int)', 'execute'), 'anon forbidden';
  assert not has_function_privilege('authenticated', 'public.consume_finished_ad(uuid,text,text,int)', 'execute'), 'authenticated forbidden';
  assert has_function_privilege('service_role', 'public.consume_finished_ad(uuid,text,text,int)', 'execute'), 'service role allowed';
end;
$$;

-- Force the final receipt write to fail: both possible debits must roll back.
create function public.test_reject_receipt() returns trigger language plpgsql as $$
begin
  if new.key like '%:rollback-%' and new.count = 1 then raise exception 'fixture_receipt_failure'; end if;
  return new;
end;
$$;
create trigger test_reject_receipt before update on public.rate_limits
  for each row execute function public.test_reject_receipt();
do $$
declare
  u uuid := '10000000-0000-0000-0000-000000000002';
  k text;
begin
  perform public.grant_credits(u, 1, 0, 1);
  foreach k in array array['video_ads', 'omni_ads'] loop
    begin
      perform public.consume_finished_ad(u, k, 'rollback-monthly', 1);
      raise exception 'expected failure';
    exception when others then
      assert sqlerrm = 'fixture_receipt_failure', 'monthly failure reached receipt';
    end;
    assert not exists (select 1 from public.rate_limits where key like k || ':monthly:%:' || u::text), 'monthly debit rolled back';
    begin
      perform public.consume_finished_ad(u, k, 'rollback-topup', 0);
      raise exception 'expected failure';
    exception when others then
      assert sqlerrm = 'fixture_receipt_failure', 'topup failure reached receipt';
    end;
  end loop;
  assert (select video_ad_credits = 1 and omni_style_credits = 1 from public.subscriptions where user_id = u), 'topup debit rolled back';
  assert not exists (select 1 from public.rate_limits where key like '%:' || u::text || ':rollback-%'), 'failed receipts rolled back';
end;
$$;
rollback;
