import { getSupabase } from './supabaseClient';

// Client-side run-store for the unified One-Shot / Concierge flow (grill 2026-07-01).
// Thin fetch layer over the two service-role proxies:
//   api/producer/run.ts     — run header: checkpoint (POST) + resume-read (GET)
//   api/producer/advance.ts — per-scene video job queue (seed/claim/record/complete/flag/requeue)
//
// This is the durable half of Model A: the client drives the stage sequence, but every
// transition is checkpointed here so a closed tab / lost connection / different device
// resumes to true state, and the atomic 'claim' guarantees each render fires exactly once.

export type ProductionRunStatus = 'running' | 'review' | 'done' | 'error';
export type ProductionMode = 'oneshot' | 'concierge';
export type SceneJobStatus = 'pending' | 'submitting' | 'rendering' | 'done' | 'flagged' | 'failed';

export interface ProductionRunRow {
  run_id: string;
  user_id: string;
  mode: ProductionMode;
  status: ProductionRunStatus;
  current_stage: string | null;
  input: Record<string, unknown>;
  stages: unknown[];
  artifacts: Record<string, unknown>;
  error: string | null;
  /** Monotonic optimistic-concurrency guard (see api/producer/run.ts checkpoint). */
  revision: number;
  created_at: string;
  updated_at: string;
}

export interface ProductionSceneRow {
  run_id: string;
  scene_idx: number;
  status: SceneJobStatus;
  job_handle: Record<string, unknown> | null;
  image_url: string | null;
  video_url: string | null;
  audio_url: string | null;
  flagged_reason: string | null;
  attempts: number;
  updated_at: string;
}

/** Partial run-header checkpoint — send only the fields that changed this transition. */
export interface RunCheckpoint {
  mode?: ProductionMode;
  status?: ProductionRunStatus;
  currentStage?: string | null;
  input?: Record<string, unknown>;
  stages?: unknown[];
  artifacts?: Record<string, unknown>;
  error?: string | null;
  /** The client's last-known revision — the server guards the UPDATE on it (WHERE revision=known)
   * and increments. Omit on the first create (the row is inserted at revision 0). */
  revision?: number;
}

const getAccessToken = async (): Promise<string> => {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');
  return token;
};

const post = async (path: string, body: unknown): Promise<any> => {
  const token = await getAccessToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    const err = new Error(typeof data?.error === 'string' ? data.error : `PRODUCER_RUN_FAILED (${res.status})`);
    (err as any).status = res.status;
    throw err;
  }
  return data;
};

/**
 * Generate a stable, client-owned run id. It is the idempotency anchor for the whole
 * run (runId:stage:sceneIdx) — created ONCE at launch and reused across resume so the
 * server can dedupe every stage/scene against it.
 */
export const newRunId = (): string => {
  const rand = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.abs(Date.parse(new Date().toISOString())).toString(36) + Math.random().toString(36).slice(2);
  return `apr_${rand}`;
};

// ── Run header ──────────────────────────────────────────────────────────────────
/** Result of a checkpoint write. `changed:false` = a stale-write conflict (the server's
 * revision moved on); `current` carries the fresher row so the caller can adopt it. */
export interface CheckpointResult {
  changed: boolean;
  revision?: number;
  current?: ProductionRunRow;
}

/** Upsert the run header after a stage transition (persist-after-every-transition), guarded by
 * the optimistic-concurrency revision so a stale tab can't regress a fresher checkpoint. */
export const saveRunCheckpoint = (runId: string, patch: RunCheckpoint): Promise<CheckpointResult> =>
  post('/api/producer/run', { runId, ...patch }).then((d) => ({
    changed: d?.changed !== false,
    revision: typeof d?.revision === 'number' ? d.revision : undefined,
    current: d?.current as ProductionRunRow | undefined,
  }));

/** Resume-read: the run header + its scene queue, or null if the run doesn't exist. */
export const loadRun = async (
  runId: string
): Promise<{ run: ProductionRunRow; scenes: ProductionSceneRow[] } | null> => {
  const token = await getAccessToken();
  const res = await fetch(`/api/producer/run?runId=${encodeURIComponent(runId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  const data = await res.json().catch(() => ({} as any));
  if (!res.ok) {
    const err = new Error(typeof data?.error === 'string' ? data.error : `PRODUCER_LOAD_FAILED (${res.status})`);
    (err as any).status = res.status;
    throw err;
  }
  return { run: data.run as ProductionRunRow, scenes: (data.scenes ?? []) as ProductionSceneRow[] };
};

// ── Per-scene video job queue ────────────────────────────────────────────────────
/** Seed one pending row per scene at video-stage entry. Idempotent — re-seed is safe. */
export const seedScenes = (runId: string, sceneCount: number): Promise<void> =>
  post('/api/producer/advance', { action: 'seed', runId, sceneCount }).then(() => undefined);

/**
 * Atomically try to claim a scene for submission. `claimed:true` means THIS caller owns
 * the provider submit; `claimed:false` means someone else already did — poll `scene.job_handle`.
 */
export const claimScene = (
  runId: string,
  sceneIdx: number
): Promise<{ claimed: boolean; scene: ProductionSceneRow | null }> =>
  post('/api/producer/advance', { action: 'claim', runId, sceneIdx });

/** A scene write's outcome. `changed:false` = the guarded update matched no row (a lost race);
 * the caller re-reads scene state instead of proceeding blindly. */
export interface SceneWriteResult { changed: boolean; }

const toWriteResult = (d: any): SceneWriteResult => ({ changed: d?.changed !== false });

/** Store the provider job handle after a winning claim submits (submitting → rendering). */
export const recordScene = (runId: string, sceneIdx: number, jobHandle: Record<string, unknown>): Promise<SceneWriteResult> =>
  post('/api/producer/advance', { action: 'record', runId, sceneIdx, jobHandle }).then(toWriteResult);

/** Mark a scene done with its rendered urls (rendering → done). */
export const completeScene = (runId: string, sceneIdx: number, videoUrl: string, audioUrl?: string): Promise<SceneWriteResult> =>
  post('/api/producer/advance', { action: 'complete', runId, sceneIdx, videoUrl, audioUrl }).then(toWriteResult);

/** Flag a scene whose generation failed after retries (surfaced at a reshoot gate). */
export const flagScene = (runId: string, sceneIdx: number, reason?: string): Promise<SceneWriteResult> =>
  post('/api/producer/advance', { action: 'flag', runId, sceneIdx, reason }).then(toWriteResult);

/** Reshoot: return a flagged/done scene to pending so the claim path re-runs it once. */
export const requeueScene = (runId: string, sceneIdx: number): Promise<SceneWriteResult> =>
  post('/api/producer/advance', { action: 'requeue', runId, sceneIdx }).then(toWriteResult);
