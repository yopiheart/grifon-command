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
--
-- ⚠ ATTRIBUTION (2026-07-24): rows are attributed per (run_id, user_id). x-run-id is
-- client-supplied and NOT ownership-checked at write time (a DB round-trip per generation
-- call would slow the request path), so a run's TRUE cost is the row whose user_id matches
-- the run's OWNER (producer_runs.user_id). Any additional row on the same run_id belongs to
-- a DIFFERENT caller — that is a forged x-run-id and must NOT be summed into the run's cost.
-- Pre-2026-07-24 'cogs' rows carry user_id = null (unattributable legacy data) and therefore
-- match no owner.
-- COLUMN ORDER IS DELIBERATE: user_id is LAST. `create or replace view` may only APPEND
-- columns, so putting user_id at the end lets this file stay re-runnable in place — no
-- `drop view`, which would also discard any GRANTs the view has accumulated and briefly
-- break its one reader (api/producer/run.ts). Readers select by NAME, so order is
-- immaterial to them.
create or replace view public.run_cogs as
  select run_id,
         sum((meta->>'estUsd')::numeric) as est_usd,
         count(*)                        as calls,
         user_id
    from public.events
   where event = 'cogs' and run_id is not null
   group by run_id, user_id;

-- Forged-x-run-id DETECTOR (2026-07-24). The write side deliberately does NOT
-- ownership-check the client-supplied x-run-id (a DB round-trip per generation call would
-- slow the request path); run_cogs above only makes a forged row FILTERABLE by scoping the
-- roll-up to (run_id, user_id). This view is the read-side alarm that says one happened.
--
-- ANY row here means a caller attached telemetry to a run they do NOT own — i.e. a forged
-- x-run-id. EXPECTED TO BE EMPTY. Check it during the P4/P5 telemetry window (and any time
-- run_cogs totals look wrong): a non-empty result is a security/attribution signal, not a
-- data-quality nit.
--
-- Legacy rows written before 2026-07-24 carry user_id = null (the verified caller wasn't
-- recorded yet). They are UNATTRIBUTABLE, not anomalous, so `e.user_id is not null` excludes
-- them — otherwise every historical row would look like a forgery.
--
-- COLUMN ORDER IS DELIBERATE (same reason as run_cogs): `create or replace view` may only
-- APPEND columns, so any future field goes on the END and this file stays re-runnable in
-- place — no `drop view`. Joins public.producer_runs, so apply producer_runs.sql first on a
-- fresh project (or simply re-run this file afterwards).
create or replace view public.run_attribution_anomalies as
  select e.run_id,
         r.user_id as run_owner,
         e.user_id as event_user,
         count(*)  as row_count,
         sum(case when e.event = 'cogs' then (e.meta->>'estUsd')::numeric else 0 end) as est_usd,
         min(e.ts) as first_seen,
         max(e.ts) as last_seen
    from public.events e
    join public.producer_runs r on r.run_id = e.run_id
   where e.run_id is not null
     and e.user_id is not null
     and e.user_id <> r.user_id
   group by e.run_id, r.user_id, e.user_id;

-- Service-role-only, like public.rate_limits (NOT user-owned like user_voices).
-- Rationale: this is a server-written telemetry sink. Writes go through an api/*
-- proxy on the service role (consistent with this app's "all writes via api/"
-- architecture); an anon-writable events table would be a spam/abuse vector and a
-- guaranteed straw-man-audit finding. RLS on + no policies = default deny for
-- anon/authenticated. Admin/analytics reads happen via the service role.
alter table public.events enable row level security;

-- ⚠ 2026-08-07 — MANDATORY, AND THE REASON IS A REAL LEAK, NOT A LINT NIT.
--
-- RLS above protects the TABLE. It does NOT protect a view over the table. A Postgres
-- view defaults to SECURITY DEFINER semantics: it executes with the VIEW OWNER's rights
-- (postgres), so the deny-all RLS on public.events is bypassed for anyone allowed to
-- select from the view. `create ... view` also grants to anon + authenticated by default
-- here, and VITE_SUPABASE_ANON_KEY ships inside the browser bundle.
--
-- Net effect before this block existed: any visitor to the site could read every user's
-- per-run COGS together with their user_id. Confirmed live on 2026-08-07 —
-- `set role anon; select count(*) from run_cogs` returned rows while the same role got 0
-- from public.events. Found by the Tier 6 Health Watch routine (Supabase lint 0010), on
-- the first day its notification channel was verified.
--
-- Two independent guards, on purpose. security_invoker makes the view honour the CALLER's
-- RLS; the revoke means no browser role can reach it even if the option is ever lost (a
-- `drop view` would silently discard BOTH, which is the other reason this file never
-- drops a view — see the column-order notes above).
--
-- service_role bypasses RLS, so the one legitimate reader (api/producer/run.ts, on
-- getSupabaseAdmin()) is unaffected. Keep these four statements together with the view
-- definitions; splitting them is how the hole comes back.
alter view public.run_cogs                  set (security_invoker = on);
alter view public.run_attribution_anomalies set (security_invoker = on);

revoke all on public.run_cogs                  from anon, authenticated;
revoke all on public.run_attribution_anomalies from anon, authenticated;

grant select on public.run_cogs                  to service_role;
grant select on public.run_attribution_anomalies to service_role;
