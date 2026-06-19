-- Grifon AI — Supabase schema
-- Run once in Supabase SQL Editor (Project → SQL → New Query).
-- This file is documentation; the app does NOT execute it at runtime.

-- ============================================================
-- subscriptions: one row per user, mirrors their current plan.
-- Writes happen only via service role (from api/webhook.ts).
-- Reads are user-scoped via RLS.
-- ============================================================
create table if not exists public.subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_id text not null check (plan_id in ('free','creator','pro','business')),
  status text not null check (status in ('active','past_due','canceled','trialing','incomplete')),
  billing_cycle text check (billing_cycle in ('monthly','annual')),
  current_period_end timestamptz,
  paymongo_customer_id text,
  paymongo_last_checkout_id text,
  updated_at timestamptz not null default now()
);

alter table public.subscriptions enable row level security;

drop policy if exists "users read own subscription" on public.subscriptions;
create policy "users read own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies => only service role can write.

-- Realtime: enable postgres_changes for this table so the client hook
-- can subscribe to live updates from webhook upserts.
alter publication supabase_realtime add table public.subscriptions;

-- ============================================================
-- Seed a free subscription row whenever a new auth user signs up.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.subscriptions (user_id, plan_id, status)
  values (new.id, 'free', 'active')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Optional: backfill existing users without a subscription row.
-- Safe to run multiple times.
-- ============================================================
insert into public.subscriptions (user_id, plan_id, status)
select id, 'free', 'active' from auth.users
on conflict (user_id) do nothing;

-- ============================================================
-- render_feedback: one row per post-render rating a user leaves
-- after a video is delivered (final MP4 or full scene pipeline).
-- Writes come from api/feedback.ts via service role; reads are
-- user-scoped via RLS. There is deliberately NO tip/payment column
-- here — this captures rating + (optional) testimonial/feedback only.
-- ============================================================
create table if not exists public.render_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  render_id text not null,
  rating int not null check (rating between 1 and 5),
  testimonial text,
  feedback text,
  consent_to_share boolean not null default false,
  display_name text,
  created_at timestamptz not null default now()
);

create index if not exists render_feedback_user_id_idx
  on public.render_feedback (user_id);

alter table public.render_feedback enable row level security;

drop policy if exists "users read own render_feedback" on public.render_feedback;
create policy "users read own render_feedback"
  on public.render_feedback for select
  using (auth.uid() = user_id);

-- No insert/update/delete policies => only service role (api/feedback.ts) writes.
