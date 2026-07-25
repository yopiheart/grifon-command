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
  /** Cover frame (base64 data URL), written out-of-band via 'record_thumbnail' — kept OUT of
   * `artifacts` for the same reason scene images are (multi-MB jsonb → statement timeouts).
   * Optional: absent until supabase/producer_runs.sql has been re-run. */
  thumbnail_url?: string | null;
  /** Locked presenter reference (base64 data URL), written out-of-band via 'record_avatar'.
   * `input.avatar.url` cannot survive here: slimCheckpointInput drops data: strings over 700KB
   * and a 2K avatar exceeds that, so on resume this column is the ONLY copy.
   * Optional: absent until supabase/producer_runs.sql has been re-run. */
  avatar_url?: string | null;
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
  /** Hook-morph END keyframe (scene-1 visual hooks) — see 'record_image'. */
  end_frame_url: string | null;
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

const isDataUrl = (v: unknown): v is string => typeof v === 'string' && v.startsWith('data:');

/**
 * Strip base64 data-URL images out of a checkpoint's artifacts (pure — returns copies, never
 * mutates the caller's run state). Scene images are multi-MB base64 blobs and rode the
 * artifacts jsonb TWICE (storyboard[] + scenes[]), blowing past the endpoint's 2mb parser cap
 * and hitting Postgres statement timeouts — every checkpoint then silently failed, the server
 * state went stale, and resume re-bought the images (2026-07-02 SIGLA smoke). Images now
 * persist once per scene on producer_scenes rows ('record_image'); resume rehydrates from
 * there (ProducerFlow.fromRow). This is the transport-boundary guard so no caller can
 * reintroduce the fat payload.
 */
export const slimCheckpointArtifacts = (artifacts: Record<string, unknown>): Record<string, unknown> => {
  const out: Record<string, unknown> = { ...artifacts };
  const stripSceneImages = (arr: unknown): unknown =>
    Array.isArray(arr)
      ? arr.map((s) => {
          if (!s || typeof s !== 'object') return s;
          const copy: Record<string, unknown> = { ...(s as Record<string, unknown>) };
          if (isDataUrl(copy.imageUrl)) delete copy.imageUrl;
          if (isDataUrl(copy.endFrameImageUrl)) delete copy.endFrameImageUrl;
          return copy;
        })
      : arr;
  if (out.storyboard) out.storyboard = stripSceneImages(out.storyboard);
  if (out.scenes) out.scenes = stripSceneImages(out.scenes);
  // businessInfo duplicates the hero as productImageUrls[0]; the durable copy lives in
  // producer_runs.input (sent once, on create — see producerDeps.toCheckpoint).
  const bi = out.businessInfo as Record<string, unknown> | undefined;
  if (bi && Array.isArray(bi.productImageUrls)) {
    out.businessInfo = { ...bi, productImageUrls: bi.productImageUrls.filter((u) => !isDataUrl(u)) };
  }
  return out;
};

/**
 * Strip oversized base64 data-URL images out of a checkpoint's `input` (pure — deep-walks a
 * COPY, never mutates the caller's run state). On the create checkpoint, `input` carries the
 * uploaded product/presenter photos; when a call site read a file RAW, a 2.6MB PNG became a
 * ~3.5MB data-URL and the whole POST 413'd against api/producer/run's 2mb bodyParser cap — so
 * the run row was never created and the video stage died on `run_not_found` (2026-07-14 try_on
 * gate run). Guided uploads compress to well under 700KB, so dropping only strings that both
 * start with 'data:' AND exceed 700_000 chars degrades nothing on the live run — at most it
 * costs a cross-device resume of that one oversized image. This is the transport-boundary
 * guard for `input`, the sibling of slimCheckpointArtifacts.
 */
export const slimCheckpointInput = (input: Record<string, unknown>): Record<string, unknown> => {
  const MAX_DATA_URL = 700_000; // ≈700KB — above anything compressImageForUpload emits, below the 2mb cap
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk);
    if (value && typeof value === 'object') {
      const copy: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (typeof v === 'string' && v.startsWith('data:') && v.length > MAX_DATA_URL) continue; // drop oversized upload
        copy[k] = walk(v);
      }
      return copy;
    }
    return value;
  };
  return walk(input) as Record<string, unknown>;
};

/** Upsert the run header after a stage transition (persist-after-every-transition), guarded by
 * the optimistic-concurrency revision so a stale tab can't regress a fresher checkpoint.
 * Artifacts and input are slimmed at this choke-point — see slimCheckpointArtifacts /
 * slimCheckpointInput. */
export const saveRunCheckpoint = (runId: string, patch: RunCheckpoint): Promise<CheckpointResult> =>
  post('/api/producer/run', {
    runId,
    ...patch,
    ...(patch.artifacts ? { artifacts: slimCheckpointArtifacts(patch.artifacts) } : {}),
    ...(patch.input ? { input: slimCheckpointInput(patch.input) } : {}),
  }).then((d) => ({
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

/** Persist a scene's image(s) on its own row (upsert; image columns only). Written once per
 * scene so the multi-MB base64 stays out of the run-header checkpoint — resume rehydrates
 * storyboard images from these rows. */
export const recordSceneImage = (
  runId: string,
  sceneIdx: number,
  imageUrl: string,
  endFrameUrl?: string,
  /** P4 gate verdict for THIS still. Three-state, mirrored in api/producer/advance.ts:
   *  omit = leave the stored verdict alone (flag-off path), null = clear it (a fresh image
   *  must not inherit the previous one's judgment), object = store it. */
  gateVerdict?: Record<string, unknown> | null,
): Promise<SceneWriteResult> =>
  post('/api/producer/advance', {
    action: 'record_image', runId, sceneIdx, imageUrl, endFrameUrl: endFrameUrl ?? null,
    ...(gateVerdict !== undefined ? { gateVerdict } : {}),
  }).then(toWriteResult);

/** Persist the run's cover frame on its own run-header column (never in the checkpoint jsonb).
 * Best-effort at the call site: a failure here costs the cover frame on resume, nothing else. */
export const recordThumbnail = (runId: string, thumbnailUrl: string): Promise<SceneWriteResult> =>
  post('/api/producer/advance', { action: 'record_thumbnail', runId, thumbnailUrl }).then(toWriteResult);

/** Hard ceiling on a persisted avatar, matching advance.ts's zod cap. Above this the POST would
 *  400 and we would learn nothing, so the caller measures and reports instead — see recordAvatar. */
export const MAX_AVATAR_CHARS = 3_000_000;

/** Persist the locked presenter reference on its own run-header column. Best-effort at the call
 *  site: a failure costs correct regeneration after a reload, which the refusal guard then
 *  reports to the user rather than papering over. */
export const recordAvatar = (runId: string, avatarUrl: string): Promise<SceneWriteResult> =>
  post('/api/producer/advance', { action: 'record_avatar', runId, avatarUrl }).then(toWriteResult);

/** Mark a scene done with its rendered urls (rendering → done). */
export const completeScene = (runId: string, sceneIdx: number, videoUrl: string, audioUrl?: string): Promise<SceneWriteResult> =>
  post('/api/producer/advance', { action: 'complete', runId, sceneIdx, videoUrl, audioUrl }).then(toWriteResult);

/** Flag a scene whose generation failed after retries (surfaced at a reshoot gate). */
export const flagScene = (runId: string, sceneIdx: number, reason?: string): Promise<SceneWriteResult> =>
  post('/api/producer/advance', { action: 'flag', runId, sceneIdx, reason }).then(toWriteResult);

/** Reshoot: return a flagged/done scene to pending so the claim path re-runs it once. */
export const requeueScene = (runId: string, sceneIdx: number): Promise<SceneWriteResult> =>
  post('/api/producer/advance', { action: 'requeue', runId, sceneIdx }).then(toWriteResult);
