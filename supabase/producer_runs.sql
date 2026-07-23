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
  revision      integer not null default 0,              -- monotonic optimistic-concurrency guard:
                                                         -- checkpoint UPDATE is guarded WHERE revision=known
                                                         -- and increments, so a stale tab can't regress state.
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists producer_runs_user_id_idx on public.producer_runs(user_id);
create index if not exists producer_runs_status_idx   on public.producer_runs(status);

-- P2 observability spine (loop-arch). `engine` distinguishes the producer runtime from
-- legacy engines for A/B telemetry; `cost_usd` is the denormalized per-run generation
-- spend, written from the run_cogs view when a run reaches 'done' (api/producer/run.ts).
-- Idempotent adds for tables created before P2.
alter table public.producer_runs add column if not exists engine text default 'producer';
alter table public.producer_runs add column if not exists cost_usd numeric not null default 0;

-- P3 follow-up (loop-arch): the producer's cover frame. generateThumbnail returns a base64
-- DATA URL, so it gets its OWN small column written once via api/producer/advance.ts
-- 'record_thumbnail' — the run-header rule (images never in the artifacts jsonb) applies here
-- exactly as it does to producer_scenes.image_url. Before this column existed the cover frame
-- was simply lost on resume (First Cut hid the preview + download). Degrades safely: if this
-- alter has not been applied, the write 500s, the orchestrator swallows it (best-effort) and
-- the run behaves exactly as it did before — nothing else depends on it.
alter table public.producer_runs add column if not exists thumbnail_url text;

-- ── Per-scene job queue ───────────────────────────────────────────────────────
-- One row per (run, scene). A relational child table (not a jsonb array on the run)
-- is deliberate: it makes the atomic claim below a single-row UPDATE, which is what
-- guarantees exactly-once fan-out submission under concurrent advance/poll callers.
create table if not exists public.producer_scenes (
  run_id        text not null references public.producer_runs(run_id) on delete cascade,
  scene_idx     int  not null,
  status        text not null default 'pending',        -- pending|submitting|rendering|done|flagged|failed
  job_handle    jsonb,                                   -- Veo operation / Kling task handle (poll target)
  image_url     text,                                    -- scene image (base64 data URL) — written once via
                                                         -- 'record_image'; keeps images OUT of the run-header
                                                         -- checkpoint (multi-MB jsonb → statement timeouts)
  end_frame_url text,                                    -- hook-morph END keyframe (same handling)
  video_url     text,
  audio_url     text,
  flagged_reason text,
  attempts      int  not null default 0,
  updated_at    timestamptz not null default now(),
  primary key (run_id, scene_idx)
);

-- Idempotent upgrade for tables created before end_frame_url existed (2026-07-03).
alter table public.producer_scenes add column if not exists end_frame_url text;

-- P4 image gate (loop-arch): the AI still-gate verdict {pass, flags, compositionNotes?}
-- per scene, for OFFLINE precision measurement before the gate is ever given reroll
-- authority (plan §3.6/§3.8 — flag-only, fail-open this phase). FORWARD-PREP: the
-- orchestrator currently persists the verdict inside the run checkpoint's artifacts.scenes
-- jsonb (each ProductionSceneState carries gateVerdict), because the server-side per-scene
-- write path (api/producer/advance.ts 'record_image') carries only urls and is out of P4's
-- file scope. A dedicated per-scene verdict row lands with the advance.ts action-union touch
-- in a later slice; this column is added now so that migration is a no-op.
alter table public.producer_scenes add column if not exists gate_verdict jsonb;

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
