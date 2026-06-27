-- Telemetry sink for the Data-Driven Growth Loop (growth_loop.md, Phase 0).
-- Answers "why visitors don't convert" and "who hit checkout and bailed."
-- Apply this in the Supabase SQL editor AFTER schema.sql.
-- Idempotent: safe to re-run.

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  -- Nullable on purpose: anonymous visitors (PageView/ViewContent before signup)
  -- must be capturable. Stitched to a user post-signup via session_id.
  user_id uuid references auth.users(id) on delete cascade,
  -- Anonymous-session correlator (set client-side, survives until signup). Lets us
  -- join pre-auth funnel events to the user who eventually converts — needed for
  -- attribution and "hit InitiateCheckout but bailed" analysis.
  session_id text,
  event text not null,            -- e.g. 'PageView' | 'wizard_step' | 'InitiateCheckout'
  module text,                    -- dashboard module or route, when applicable
  step text,                      -- wizard step id, when applicable
  meta jsonb not null default '{}'::jsonb,
  ts timestamptz not null default now()
);

create index if not exists events_user_id_idx    on public.events(user_id);
create index if not exists events_session_id_idx  on public.events(session_id);
create index if not exists events_event_idx       on public.events(event);
create index if not exists events_ts_idx          on public.events(ts);

-- Service-role-only, like public.rate_limits (NOT user-owned like user_voices).
-- Rationale: this is a server-written telemetry sink. Writes go through an api/*
-- proxy on the service role (consistent with this app's "all writes via api/"
-- architecture); an anon-writable events table would be a spam/abuse vector and a
-- guaranteed straw-man-audit finding. RLS on + no policies = default deny for
-- anon/authenticated. Admin/analytics reads happen via the service role.
alter table public.events enable row level security;
