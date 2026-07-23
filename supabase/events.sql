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

-- P2 observability spine (loop-arch). Correlates node-lifecycle + 'cogs' rows to a
-- producer_runs row so per-run fail rate and cost roll up. Nullable: non-run traffic
-- (PageView, wizard_step, …) carries no run_id. Idempotent add for existing tables.
alter table public.events add column if not exists run_id text;
create index if not exists events_run_id_idx on public.events(run_id);

-- Per-run COGS roll-up. Sums the estimated USD carried on each 'cogs' event's meta so a
-- run's total generation spend is one query (and gets denormalized onto
-- producer_runs.cost_usd when a run reaches 'done' — see api/producer/run.ts).
--
-- ⚠ PARTIAL / ESTIMATED (Neil, 2026-07-23): this view currently EXCLUDES ElevenLabs
-- voice spend, FFmpeg render compute, and post-run reshoots/regenerations (their proxy
-- calls carry no x-run-id once the run is parked); Veo/Kling rows are SUBMIT-TIME
-- ESTIMATES, so a render that later fails still shows its full estimated cost. Treat
-- est_usd as a lower-bound generation estimate for observability and trend analysis —
-- do NOT use it for final pricing or margin decisions.
create or replace view public.run_cogs as
  select run_id,
         sum((meta->>'estUsd')::numeric) as est_usd,
         count(*)                        as calls
    from public.events
   where event = 'cogs' and run_id is not null
   group by run_id;

-- Service-role-only, like public.rate_limits (NOT user-owned like user_voices).
-- Rationale: this is a server-written telemetry sink. Writes go through an api/*
-- proxy on the service role (consistent with this app's "all writes via api/"
-- architecture); an anon-writable events table would be a spam/abuse vector and a
-- guaranteed straw-man-audit finding. RLS on + no policies = default deny for
-- anon/authenticated. Admin/analytics reads happen via the service role.
alter table public.events enable row level security;
