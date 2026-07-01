-- Server-side run-state for the unified One-Shot / Concierge producer flow.
-- Backs two guarantees from the 2026-07-01 grill:
--   1. Resume-to-true-state — survive tab-close / lost internet / different device.
--   2. Exactly-once / no-double-spend — the atomic per-scene claim below makes fan-out
--      submission fire each provider render exactly once, even under resume/retry/2-tabs.
-- Apply this in the Supabase SQL editor AFTER schema.sql. Idempotent: safe to re-run.

-- ── Run header ────────────────────────────────────────────────────────────────
-- run_id is CLIENT-generated and stable for the life of the run: it is the
-- idempotency anchor (runId:stage[:sceneIdx]) the orchestrator keys every call on.
create table if not exists public.producer_runs (
  run_id        text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  mode          text not null default 'oneshot',        -- 'oneshot' | 'concierge'
  status        text not null default 'running',        -- 'running' | 'review' | 'done' | 'error'
  current_stage text,                                    -- last-entered ProductionStageId
  input         jsonb not null default '{}'::jsonb,      -- ProductionInput (threaded through every stage)
  stages        jsonb not null default '[]'::jsonb,      -- ProductionStageState[] checkpoint
  artifacts     jsonb not null default '{}'::jsonb,      -- report/script/storyboard/edl + final urls
  error         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists producer_runs_user_id_idx on public.producer_runs(user_id);
create index if not exists producer_runs_status_idx   on public.producer_runs(status);

-- ── Per-scene job queue ───────────────────────────────────────────────────────
-- One row per (run, scene). A relational child table (not a jsonb array on the run)
-- is deliberate: it makes the atomic claim below a single-row UPDATE, which is what
-- guarantees exactly-once fan-out submission under concurrent advance/poll callers.
create table if not exists public.producer_scenes (
  run_id        text not null references public.producer_runs(run_id) on delete cascade,
  scene_idx     int  not null,
  status        text not null default 'pending',        -- pending|submitting|rendering|done|flagged|failed
  job_handle    jsonb,                                   -- Veo operation / Kling task handle (poll target)
  image_url     text,
  video_url     text,
  audio_url     text,
  flagged_reason text,
  attempts      int  not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (run_id, scene_idx)
);

create index if not exists producer_scenes_run_idx on public.producer_scenes(run_id);

-- Service-role-only, like public.rate_limits / public.events (NOT user-owned): all
-- access goes through the api/producer/* proxies on the service role. RLS on + no
-- policies = default deny for anon/authenticated.
alter table public.producer_runs   enable row level security;
alter table public.producer_scenes enable row level security;

-- ── Atomic scene claim (the no-double-spend primitive) ────────────────────────
-- Flips exactly ONE pending scene to 'submitting' and reports whether THIS caller won.
-- Returns false if the scene is already submitting/rendering/done/flagged — in which
-- case the caller must poll the existing job_handle instead of re-submitting. This is
-- what makes a resumed run, a retried request, or a second open tab a no-op rather
-- than a double provider charge. Single-statement UPDATE takes the row lock → atomic.
create or replace function public.producer_claim_scene(
  p_run_id text,
  p_scene_idx int
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_claimed int;
begin
  update public.producer_scenes
     set status = 'submitting', attempts = attempts + 1, updated_at = now()
   where run_id = p_run_id and scene_idx = p_scene_idx and status = 'pending';
  get diagnostics v_claimed = row_count;
  return v_claimed = 1;
end;
$$;

revoke all on function public.producer_claim_scene(text, int) from public, anon, authenticated;
grant execute on function public.producer_claim_scene(text, int) to service_role;
