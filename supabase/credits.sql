-- Top-up finished-ad credits (Slice 6b, 2026-06-19).
-- Apply in the Supabase SQL editor AFTER schema.sql. Idempotent: safe to re-run.
-- This file is documentation; the app does NOT execute it at runtime. The live
-- migration was applied via Supabase MCP (migration name: topup_credits).
--
-- Credits are granted by add-on purchases (api/webhook.ts → grant_credits) and
-- consumed when the monthly video_ads allowance is exhausted (api/_lib/quota.ts
-- → consume_credit). They live on the subscriptions row because every user has
-- one (handle_new_user seeds free/active on signup), so a Free user with no paid
-- plan can still hold purchased credits — that's the standalone ₱499 single-ad door.

alter table public.subscriptions
  add column if not exists video_ad_credits int not null default 0,
  add column if not exists cinematic_credits int not null default 0;

-- Additive grant (webhook, service_role only). Upserts so a buyer always has a
-- row even in the unlikely case the signup trigger never fired for them.
create or replace function public.grant_credits(
  p_user_id uuid,
  p_video int,
  p_cinematic int
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, plan_id, status, video_ad_credits, cinematic_credits)
  values (p_user_id, 'free', 'active', greatest(p_video, 0), greatest(p_cinematic, 0))
  on conflict (user_id) do update
    set video_ad_credits  = public.subscriptions.video_ad_credits  + greatest(p_video, 0),
        cinematic_credits = public.subscriptions.cinematic_credits + greatest(p_cinematic, 0),
        updated_at = now();
end;
$$;

-- Atomic consume-one (quota fallback, service_role only). Decrements the matching
-- balance only if > 0; returns true if a credit was spent, false otherwise. The
-- single guarded UPDATE row-locks, so concurrent renders can't oversell.
create or replace function public.consume_credit(
  p_user_id uuid,
  p_kind text
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if p_kind = 'video_ad' then
    update public.subscriptions
      set video_ad_credits = video_ad_credits - 1, updated_at = now()
      where user_id = p_user_id and video_ad_credits > 0;
  elsif p_kind = 'cinematic' then
    update public.subscriptions
      set cinematic_credits = cinematic_credits - 1, updated_at = now()
      where user_id = p_user_id and cinematic_credits > 0;
  else
    return false;
  end if;
  get diagnostics v_updated = row_count;
  return v_updated > 0;
end;
$$;

revoke all on function public.grant_credits(uuid, int, int) from public, anon, authenticated;
grant execute on function public.grant_credits(uuid, int, int) to service_role;
revoke all on function public.consume_credit(uuid, text) from public, anon, authenticated;
grant execute on function public.consume_credit(uuid, text) to service_role;
