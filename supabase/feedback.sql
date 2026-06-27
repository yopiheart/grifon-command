-- Client feedback sink for the Data-Driven Growth Loop (growth_loop.md, Phase 1).
-- Captures in-app NPS + free-text at the "value delivered" moment (finished-ad
-- review screen). Combined later with Phase-0 drop-off (public.events) into a
-- ranked "what to fix" list feeding workflows/app_audit.md.
-- Apply this in the Supabase SQL editor AFTER schema.sql + events.sql.
-- Idempotent: safe to re-run.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  -- Nullable on purpose: anonymous (pre-/non-auth) feedback must be capturable.
  -- Stitched to a user via session_id when they later sign in.
  user_id uuid references auth.users(id) on delete cascade,
  -- Anonymous-session correlator (shared with public.events via analyticsService).
  session_id text,
  -- Where the prompt fired, e.g. 'wizard_final'.
  module text,
  -- Net Promoter Score 0..10 (the one required signal).
  nps_score int not null check (nps_score >= 0 and nps_score <= 10),
  -- Optional open-ended "anything we can improve?".
  free_text text,
  -- Free-form context (step id, plan, route, etc.).
  context jsonb not null default '{}'::jsonb,
  ts timestamptz not null default now()
);

create index if not exists feedback_user_id_idx   on public.feedback(user_id);
create index if not exists feedback_session_id_idx on public.feedback(session_id);
create index if not exists feedback_ts_idx         on public.feedback(ts);

-- Service-role-only, like public.events / public.rate_limits (NOT user-owned like
-- user_voices). Feedback is server-written UGC telemetry: writes go through the
-- api/feedback proxy on the service role (consistent with this app's "all writes
-- via api/" architecture). An anon-writable table would be a spam vector and a
-- guaranteed straw-man-audit finding. RLS on + no policies = default deny for
-- anon/authenticated; admin/analytics reads happen via the service role.
alter table public.feedback enable row level security;
