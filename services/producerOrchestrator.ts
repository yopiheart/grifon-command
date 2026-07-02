// One-Shot / Concierge "producer" orchestrator — RUNTIME (slice 3, 2026-07-01 grill).
//
// Rebuilt from Fable 5's recovered blueprint (components/OneShotAd/_fable5-recovered/
// producerOrchestrator.ts) against the CURRENT service signatures, plus the three
// things Fable 5 never had:
//   1. TWO human gates — storyboard-image approval (before the expensive video render)
//      and the First Cut preset gate — each PARKS the run (status: 'review').
//   2. Fan-out video rendering with an atomic per-scene claim (exactly-once / no
//      double-spend), replacing the sequential loop.
//   3. Server-side run-state, injected via deps.run so a closed tab / lost connection /
//      different device resumes to true state (see services/producerRunService.ts).
//
// Service + run-store calls are INJECTED via `deps` so the state machine (advance /
// persist→resume / retry-then-flag / gate-park / fan-out-claim) is unit-testable with
// zero real spend. The app passes the real services; tests pass mocks. The orchestrator
// imports ONLY types at runtime (plus the light estimateSpokenSec helper), so the UI can
// keep importing these types without pulling the heavy gemini/voice/render chain.

import { estimateSpokenSec } from '../utils/spokenDuration';
// Reuse the intake's richer report→wizard projection (emits servicePhotos / archetypes /
// businessType / listingPrice so the venue router resolves). oneShotIntake is a pure,
// types-only module — importing it at runtime pulls no heavy Gemini/voice chain.
import { mapReportToWizard } from './oneShotIntake';
import type {
  Avatar,
  BusinessInfo,
  Script,
  Scene,
  VideoPrompt,
  MarketResearchReport,
  ClientDetails,
  EditDecisionList,
  EditDecisionInput,
  EditTargetPlatform,
  ConsolidationScene,
  ConsolidationResult,
  FinalRenderRequest,
  FinalRenderResult,
  FinalRenderScene,
  LockablePresetId,
  MarketResearchInput,
  StabilityMode,
  StoryboardResponse,
  VideoModelType,
} from '../types';
import type { RenderJob } from '../components/GenerateVideo/RenderAllRunner';

/** Config for a single scene's video submit — the shape submitVideo (geminiService) expects. */
export interface VideoSubmitConfig {
  model: VideoModelType;
  prompt: string;
  duration: number;
  resolution: '720p' | '1080p';
  aspectRatio: '9:16' | '16:9' | '1:1';
  audioEnabled: boolean;
  startFrame?: string;
  endFrame?: string;
}

/** Serializable provider job handle: the poll target recorded in producer_scenes.job_handle
 * so a crashed run POLLS the in-flight render (no re-spend) instead of re-submitting on resume.
 * Structurally mirrors geminiService's VideoJobHandle; kept local so the orchestrator stays
 * decoupled from the heavy service chain (deps inject the real submit/poll functions). */
export interface VideoJobHandle {
  operation: unknown;
  prompt: string;
  sceneIdx?: number;
  model: VideoModelType;
  aspectRatio: string;
  duration: number;
}

export type ProductionStageId =
  | 'market_research'
  | 'script'
  | 'storyboard'
  | 'scene_images'
  | 'video'
  | 'voices'
  | 'edl'
  | 'final_render';

export type StageStatus = 'pending' | 'running' | 'done' | 'failed';

export interface ProductionStageState {
  id: ProductionStageId;
  /** Outcome-framed UI label ("Researching your market", not "calling MarketMind"). */
  label: string;
  status: StageStatus;
  /** A short proof-of-work line revealed on completion ("Found your customer's #1 fear"). */
  detail?: string;
  error?: string;
  attempts: number;
}

export type SceneStatus = 'pending' | 'rendering' | 'done' | 'flagged';

export interface ProductionSceneState {
  sceneIdx: number;
  status: SceneStatus;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  /** Why this scene needs a reshoot (image/video/voice failure). */
  flaggedReason?: string;
}

/** Everything the intake form collects (3 hero inputs + Customize-drawer defaults). */
export interface ProductionInput {
  brandName: string;
  offer: string;
  price: string;
  productName: string;
  productDescription: string;
  /** Hero product image (base64 / data URL) — product-in-hand for size anchoring. */
  heroImageBase64: string;
  /** Avatar locked at intake (uploaded or generated+accepted) so the run is pure. */
  avatar: Avatar;
  /** Pinoy/pinay voice id chosen at intake. */
  voiceId: string;
  language: 'English' | 'Taglish';
  aspectRatio: '9:16' | '16:9' | '1:1';
  /** Render resolution. 720p is the only unlocked tier today; 1080p is gated to
   * Business (UI shows it LOCKED). Defaults to '720p' when absent so older runs
   * and the current intake stay valid. Drives engine + duration selection. */
  resolution?: '720p' | '1080p';
  /** Script strategy — auto-detected default, override in the Customize drawer. */
  scriptType: NonNullable<BusinessInfo['scriptType']>;
  stabilityMode?: StabilityMode;
  /** Phase 2: guided per-slot real photos for Service/RealEstate verticals (the slot IS the tag).
   * Feeds the per-scene real-photo router. Empty/absent for Product (which uses heroImageBase64). */
  servicePhotos?: BusinessInfo['servicePhotos'];
  /** Which beat the Service ad leads with (venue|work|practitioner). */
  serviceArchetype?: BusinessInfo['serviceArchetype'];
  /** Which beat the RealEstate ad leads with (listing|agent|developer). */
  realEstateArchetype?: BusinessInfo['realEstateArchetype'];
  /** Local-business research toggle (Service: user checkbox; RealEstate: always true). */
  isLocalService?: boolean;
  /** Service venue / property location — feeds local Market Research grounding. */
  businessAddress?: string;
  /** When true, ignore any cached market research for this product and run fresh
   * (the intake "Re-research" toggle). Default: reuse the cache when present. */
  forceFreshResearch?: boolean;
}

export type ProductionRunStatus = 'running' | 'review' | 'done' | 'error';

/** Which human gate a `review`-status run is parked at. */
export type ProductionGate = 'storyboard' | 'first_cut';

/** One-Shot (auto research + script) vs Concierge (user brings script + direction). */
export type ProductionMode = 'oneshot' | 'concierge';

export interface ProductionRun {
  runId: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  status: ProductionRunStatus;
  /** Intake mode — Concierge prefills script/storyboard and skips research + script. */
  mode?: ProductionMode;
  /** Set when status === 'review' so the container shows the right gate screen. */
  gate?: ProductionGate;
  /** Flipped true when the user approves the storyboard-image gate; lets the driver
   * cross from scene_images into the expensive video stage. Persisted so resume holds. */
  storyboardApproved?: boolean;
  /** Chosen First Cut edit preset (Decision 8). Absent → AUTO (server rotation). Set by
   * applyPreset() when a Pro user picks IMPACT/CLEAN; the final_render honors it. */
  presetId?: LockablePresetId;
  /** A First-Cut-gate operation in flight WITHOUT leaving the gate: a per-scene reshoot or a
   * preset re-assemble. Keeps status parked at 'review'/'first_cut' (so the container stays on
   * FirstCutScreen instead of the full RunningScreen) while driving the spinner. Cleared on finish. */
  busy?: 'reshoot' | 'preset';
  /** Manual re-rolls of scenes that already worked, counted toward the free-take allowance
   * (fixing a flagged scene is free and never counts). Lifted out of FirstCutScreen local state
   * and persisted so free takes survive remount AND reload. */
  takesUsed?: number;
  input: ProductionInput;
  stages: ProductionStageState[];
  scenes: ProductionSceneState[];
  // ---- Persisted intermediate artifacts (so resume skips completed stages) ----
  report?: MarketResearchReport;
  clientDetails?: ClientDetails;
  businessInfo?: BusinessInfo;
  script?: Script;
  finalScript?: string[];
  storyboard?: Scene[];
  videoPrompts?: VideoPrompt[];
  edl?: EditDecisionList;
  finalVideoUrl?: string;
  finalDownloadUrl?: string;
  error?: string;
  /** Monotonic checkpoint revision (optimistic-concurrency guard). Tracked in memory, sent on
   * every checkpoint, bumped on success; on a stale-write conflict the client adopts the
   * server's fresher revision. Absent → treated as 0 (a fresh run's first create). */
  revision?: number;
}

/**
 * Injected service surface — structural signatures so the orchestrator stays decoupled
 * from the concrete service modules (no heavy import). Verified against the CURRENT
 * signatures (services/geminiService.ts, voiceConsolidationService.ts,
 * finalRenderService.ts, GenerateVideo/RenderAllRunner.ts) on 2026-07-01.
 */
export interface ProducerDeps {
  generateMarketResearch: (input: MarketResearchInput) => Promise<MarketResearchReport>;
  generateAdScript: (
    businessInfo: BusinessInfo,
    brandName: string,
    language: 'English' | 'Taglish',
    offer: string,
    chosenAngleBrief: string,
    contrarianTruth: string
  ) => Promise<Script>;
  generateStoryboard: (
    script: string[],
    avatarDescription: string,
    businessInfo: BusinessInfo,
    ethnicity: string,
    language: 'English' | 'Taglish'
  ) => Promise<StoryboardResponse>;
  generateSceneImage: (
    prompt: string,
    aspectRatio: '9:16' | '16:9' | '1:1' | '4:5' | '3:4',
    imageQuality: '1K' | '2K',
    references: { avatarUrl?: string; productUrl?: string },
    ethnicity: string,
    brandColors: string[],
    scriptType: string,
    productDescription?: string,
    productName?: string,
    variationIndex?: number,
    referenceImageMode?: 'avatar' | 'product' | 'both' | 'none' | 'venue' | 'avatar_venue'
  ) => Promise<string>;
  generateVideoPrompts: (storyboard: Scene[], businessInfo: BusinessInfo) => Promise<VideoPrompt[]>;
  generateEditDecisionList: (input: EditDecisionInput) => Promise<EditDecisionList>;
  consolidateVoices: (scenes: ConsolidationScene[], voiceId: string, stabilityMode?: StabilityMode) => Promise<ConsolidationResult[]>;
  renderFinalVideo: (req: FinalRenderRequest, onProgress?: (s: 'processing') => void) => Promise<FinalRenderResult>;
  /** Submit ONE scene's render and return its serializable provider job handle WITHOUT polling.
   * The fan-out records this handle before the long poll so a crash resumes by polling it. */
  submitVideo: (config: VideoSubmitConfig, opts: { signal?: AbortSignal; sceneIdx?: number; userId?: string; finishedAdId?: string }) => Promise<VideoJobHandle>;
  /** Poll a submitted/recorded handle to completion (handle → final url). No provider re-spend. */
  pollVideo: (handle: VideoJobHandle, opts: { signal?: AbortSignal }) => Promise<{ url: string; downloadUrl: string; mimeType: string }>;
  /** Persist after every state change so a reload can resume (local + server). */
  persist: (run: ProductionRun) => Promise<void>;
  /** Server-side run-store — the no-double-spend + cross-device-resume half.
   * Injected so the state machine stays testable with mocks. */
  run: ProducerRunStore;
  /** Market-research cache (optional — absent in tests). */
  getCachedResearch?: (key: string) => Promise<MarketResearchReport | null>;
  putCachedResearch?: (key: string, report: MarketResearchReport) => Promise<void>;
  now: () => number;
}

/** The subset of services/producerRunService the orchestrator drives for fan-out. */
export interface ProducerRunStore {
  seedScenes: (runId: string, sceneCount: number) => Promise<void>;
  /** Atomically try to own scene submission. `claimed:false` → poll `jobHandle` / reuse instead. */
  claimScene: (runId: string, sceneIdx: number) => Promise<{ claimed: boolean; status?: SceneJobStatus; videoUrl?: string | null; audioUrl?: string | null; jobHandle?: VideoJobHandle | null }>;
  /** Store the provider job handle after a winning claim submits (submitting → rendering).
   * `changed:false` means the scene left 'submitting' under us — a lost race the caller re-reads. */
  recordScene: (runId: string, sceneIdx: number, jobHandle: VideoJobHandle) => Promise<{ changed: boolean }>;
  completeScene: (runId: string, sceneIdx: number, videoUrl: string, audioUrl?: string) => Promise<{ changed: boolean }>;
  flagScene: (runId: string, sceneIdx: number, reason?: string) => Promise<{ changed: boolean }>;
  requeueScene: (runId: string, sceneIdx: number) => Promise<{ changed: boolean }>;
}

export type SceneJobStatus = 'pending' | 'submitting' | 'rendering' | 'done' | 'flagged' | 'failed';

export interface ProducerCallbacks {
  /** Fired after every state mutation so the UI can re-render live. */
  onUpdate: (run: ProductionRun) => void;
  signal: AbortSignal;
  userId: string;
}

const STAGE_ORDER: { id: ProductionStageId; label: string }[] = [
  { id: 'market_research', label: 'Researching your market' },
  { id: 'script', label: 'Writing your hook' },
  { id: 'storyboard', label: 'Designing your scenes' },
  { id: 'scene_images', label: 'Building your visuals' },
  { id: 'video', label: 'Filming your scenes' },
  { id: 'voices', label: 'Recording the voiceover' },
  { id: 'edl', label: 'Cutting the edit' },
  { id: 'final_render', label: 'Final cut' },
];

/** The gate boundary: everything BEFORE 'video' runs, then we park for storyboard approval. */
const GATE_BEFORE: ProductionStageId = 'video';

const MAX_STAGE_ATTEMPTS = 2;
/** Fan-out concurrency cap. K=5 matches the current per-user hourly video budget until
 * the provider-console concurrency is confirmed + the rate-limit is re-scoped (slice 2). */
const FANOUT_CONCURRENCY = 5;

/**
 * Create a fresh run. `opts.mode` selects One-Shot vs Concierge; `opts.prefill` seeds
 * artifacts a Concierge intake already has (script/storyboard), and `opts.doneStages`
 * marks those stages complete so the driver resumes past them.
 */
export function createProductionRun(
  input: ProductionInput,
  userId: string,
  opts: { runId?: string; mode?: ProductionMode; prefill?: Partial<ProductionRun>; doneStages?: ProductionStageId[]; now?: () => number } = {}
): ProductionRun {
  const now = opts.now ?? Date.now;
  const ts = now();
  const done = new Set(opts.doneStages ?? []);
  return {
    runId: opts.runId ?? `osa_${ts}_${Math.round((ts % 1000) + ts / 1e6) % 100000}`,
    userId,
    createdAt: ts,
    updatedAt: ts,
    status: 'running',
    mode: opts.mode ?? 'oneshot',
    input,
    stages: STAGE_ORDER.map((s) => ({ id: s.id, label: s.label, status: (done.has(s.id) ? 'done' : 'pending') as StageStatus, attempts: 0 })),
    scenes: opts.prefill?.storyboard ? opts.prefill.storyboard.map((_, i) => ({ sceneIdx: i, status: 'pending' as SceneStatus })) : [],
    ...opts.prefill,
  };
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-testable on their own) — lifted from the recovered blueprint.
// ---------------------------------------------------------------------------

/** Mirrors EditVideo.tsx's local aspectRatioToPlatform. */
export function aspectRatioToPlatform(ar: '9:16' | '16:9' | '1:1'): EditTargetPlatform {
  if (ar === '16:9') return 'youtube';
  if (ar === '1:1') return 'reels';
  return 'tiktok';
}

/** Project the MarketMind report onto the wizard fields. Re-exported from oneShotIntake so
 * intake and the orchestrator share ONE mapper — the intake version emits servicePhotos /
 * serviceArchetype / realEstateArchetype / businessType / listingPrice onto businessInfo so
 * the per-scene venue router (utils/sceneRender.ts) resolves slot-tagged photos. */
export { mapReportToWizard };

/** Stable cache key for a product's market research — normalized brand+product. */
export function researchCacheKey(brandName: string, productName: string): string {
  return `${brandName.trim().toLowerCase()}::${productName.trim().toLowerCase()}`;
}

/** A ready-to-brief angle for the script generator, pulled from the research. */
export function deriveAngleBrief(report: MarketResearchReport): string {
  const a = report.fbAdLibraryAngles?.[0];
  if (a) return `${a.format} angle: ${a.angle} — open with: "${a.openingLine}"`;
  const h = report.videoHooks?.[0];
  return h ? `${h.type}: "${h.spokenLine}"` : report.bigIdea || '';
}

/** Auto-pick hook1 (locked product decision) and concatenate the body. */
export function assembleFinalScript(script: Script): string[] {
  return [...(script.hook1 ?? []), ...(script.body ?? [])].filter((l) => l && l.trim());
}

/** Per-model, per-resolution valid clip durations (inline mirror of VIDEO_MODEL_SPECS). */
const VALID_DURATIONS: Partial<Record<VideoModelType, Record<'720p' | '1080p', number[]>>> = {
  'Veo_3.1_Lite': { '720p': [4, 6, 8], '1080p': [8] },
  'Veo_3.1_Fast': { '720p': [4, 6, 8], '1080p': [4, 6, 8] },
  'Veo_3.1_Quality': { '720p': [4, 6, 8], '1080p': [4, 6, 8] },
  'Kling_3_0': { '720p': [5, 10], '1080p': [5, 10] },
  'Kling_O1': { '720p': [5, 10], '1080p': [5, 10] },
};

/** v1 per-scene clip duration — always valid for the routed model at the resolution. */
export function pickSceneDuration(type: VideoPrompt['type'], model: VideoModelType, resolution: '720p' | '1080p' = '720p'): number {
  const valid = VALID_DURATIONS[model]?.[resolution] ?? [8];
  const target = type === 'talking' || type === 'cinematic' ? 6 : 5;
  return valid.includes(target) ? target : valid.find((d) => d >= target) ?? valid[0];
}

/** Scene-type-aware model routing (resolution-aware talking-engine step-up). */
function routeModel(type: VideoPrompt['type'], fallback: VideoModelType, sceneIdx?: number, resolution: '720p' | '1080p' = '720p'): VideoModelType {
  if (sceneIdx === 0 && type === 'b-roll') return 'Kling_O1';
  if (type === 'talking') return resolution === '1080p' ? 'Veo_3.1_Fast' : 'Veo_3.1_Lite';
  if (type === 'b-roll') return 'Kling_3_0';
  if (type === 'cinematic') return 'Kling_3_0';
  return fallback;
}

async function withRetry<T>(fn: () => Promise<T>, attempts: number, onAttempt?: (n: number) => void): Promise<T> {
  let lastErr: unknown;
  for (let n = 1; n <= attempts; n++) {
    onAttempt?.(n);
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if ((e as Error)?.message === 'ABORTED') throw e;
    }
  }
  throw lastErr;
}

/** Bounded-concurrency map — the fan-out primitive (K in-flight at a time). One item's
 * failure flags that item (inside the worker) and NEVER tears down the pool: a transient
 * RPC blip on scene 3 must not abandon scenes 4-6 that already rendered. */
async function pooled<T>(items: T[], limit: number, worker: (item: T) => Promise<void>): Promise<void> {
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const idx = cursor++;
      try {
        await worker(items[idx]);
      } catch {
        /* isolated per-item failure — the worker already flags the scene; keep the pool alive */
      }
    }
  });
  await Promise.all(runners);
}

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

/**
 * Advance the run from its first incomplete stage. PARKS at two gates:
 *   - before `video`, unless `storyboardApproved` (the storyboard-image approval gate)
 *   - after `final_render` (the First Cut / preset gate)
 * Resumable: skips completed stages, so a reload/reboot continues from the checkpoint.
 * On a resumed run already at a gate, it re-parks idempotently.
 */
export async function runProduction(initial: ProductionRun, cb: ProducerCallbacks, deps: ProducerDeps): Promise<ProductionRun> {
  let run = initial;

  const commit = async (mut: (r: ProductionRun) => void) => {
    mut(run);
    run.updatedAt = deps.now();
    await deps.persist(run);
    cb.onUpdate(run);
  };
  const setStage = (id: ProductionStageId, patch: Partial<ProductionStageState>) =>
    commit((r) => {
      const st = r.stages.find((s) => s.id === id);
      if (st) Object.assign(st, patch);
    });

  for (const { id } of STAGE_ORDER) {
    if (cb.signal.aborted) return run;

    // ── Storyboard-image approval gate: park before the expensive video render ──
    if (id === GATE_BEFORE && !run.storyboardApproved) {
      await commit((r) => {
        r.status = 'review';
        r.gate = 'storyboard';
      });
      return run;
    }

    const stage = run.stages.find((s) => s.id === id)!;
    if (stage.status === 'done') continue; // resume: skip completed stages

    await setStage(id, { status: 'running', error: undefined });
    try {
      await runStage(id, run, deps, cb, setStage);
      await setStage(id, { status: 'done' });
    } catch (e: any) {
      if (e?.message === 'ABORTED') return run;
      await setStage(id, { status: 'failed', error: e?.message ?? 'STAGE_FAILED' });
      await commit((r) => {
        r.status = 'error';
        r.error = `${id}: ${e?.message ?? 'failed'}`;
      });
      return run;
    }
  }

  // ── First Cut / preset gate ──
  await commit((r) => {
    r.status = 'review';
    r.gate = 'first_cut';
  });
  return run;
}

/**
 * Approve the storyboard-image gate and continue into the video render. Called from the
 * gate screen after the user verifies/regenerates the scene images. Idempotent.
 */
export async function approveStoryboard(run: ProductionRun, cb: ProducerCallbacks, deps: ProducerDeps): Promise<ProductionRun> {
  run.storyboardApproved = true;
  run.status = 'running';
  run.gate = undefined;
  run.updatedAt = deps.now();
  await deps.persist(run);
  cb.onUpdate(run);
  return runProduction(run, cb, deps);
}

/**
 * Re-render the final cut with a chosen edit preset (Decision 8, Pro+ lever). AUTO passes
 * `null` to clear the lock and let the server rotate; IMPACT/CLEAN lock that preset. Only
 * the (already-rendered) scenes are re-assembled — no video re-generation, no re-spend.
 * Returns the run parked back at the First Cut gate.
 */
export async function applyPreset(run: ProductionRun, presetId: LockablePresetId | null, cb: ProducerCallbacks, deps: ProducerDeps): Promise<ProductionRun> {
  const commit = async (mut: (r: ProductionRun) => void) => {
    mut(run);
    run.updatedAt = deps.now();
    await deps.persist(run);
    cb.onUpdate(run);
  };
  await commit((r) => {
    r.presetId = presetId ?? undefined;
    // Stay parked at First Cut during the re-assemble (no video re-gen) so the preset switch
    // doesn't bounce the user to the "Building your ad" RunningScreen. run.busy drives the spinner.
    r.status = 'review';
    r.gate = 'first_cut';
    r.busy = 'preset';
  });
  try {
    await runStage('final_render', run, deps, cb, async (id, patch) => {
      await commit((r) => {
        const st = r.stages.find((x) => x.id === id);
        if (st) Object.assign(st, patch);
      });
    });
    await commit((r) => {
      r.status = 'review';
      r.gate = 'first_cut';
      r.busy = undefined;
    });
  } catch (e: any) {
    await commit((r) => {
      r.status = 'review';
      r.gate = 'first_cut';
      r.busy = undefined;
      r.error = `preset: ${e?.message ?? 'failed'}`;
    });
  }
  return run;
}

/**
 * Regenerate a single scene's IMAGE ONLY — used by the storyboard gate (pre-render).
 * Critically it does NOT touch video/voice/final_render: the whole point of the gate is
 * that the expensive render hasn't run yet, so "Fix" here must stay cheap (image only).
 * (Contrast reshootScene, which re-runs the full pipeline at the First Cut gate.)
 */
export async function regenSceneImage(run: ProductionRun, sceneIdx: number, cb: ProducerCallbacks, deps: ProducerDeps): Promise<ProductionRun> {
  const commit = async (mut: (r: ProductionRun) => void) => {
    mut(run);
    run.updatedAt = deps.now();
    await deps.persist(run);
    cb.onUpdate(run);
  };
  const scene = run.storyboard?.[sceneIdx];
  const sc = run.scenes.find((s) => s.sceneIdx === sceneIdx);
  if (!scene || !sc) return run;

  await commit((r) => {
    const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
    s.status = 'rendering';
    s.flaggedReason = undefined;
  });
  try {
    const prompt = scene.imagePrompt || scene.startFramePrompt || scene.sceneDescription;
    const imageUrl = await withRetry(
      () =>
        deps.generateSceneImage(
          prompt,
          run.input.aspectRatio === '1:1' ? '1:1' : run.input.aspectRatio,
          '1K',
          { avatarUrl: run.input.avatar.url, productUrl: run.input.heroImageBase64 },
          run.input.avatar.ethnicity,
          [],
          run.input.scriptType,
          run.input.productDescription,
          run.input.productName,
          1, // fresh variation
          scene.referenceImage ?? 'avatar'
        ),
      MAX_STAGE_ATTEMPTS
    );
    await commit((r) => {
      if (r.storyboard) r.storyboard[sceneIdx].imageUrl = imageUrl;
      const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
      s.imageUrl = imageUrl;
      s.status = 'pending'; // image ready, video not started — back to gate-ready
      s.flaggedReason = undefined;
    });
  } catch (e: any) {
    await commit((r) => {
      const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
      s.status = 'flagged';
      s.flaggedReason = `image: ${e?.message ?? 'failed'}`;
    });
  }
  return run;
}

/**
 * Reshoot a single scene from the First Cut (one-tap regenerate). Re-runs image → video →
 * voice for that scene (via the atomic claim so it never double-spends), then re-assembles
 * the final cut. Used for a flagged scene OR a re-roll. Returns the run back in `review`.
 */
export async function reshootScene(run: ProductionRun, sceneIdx: number, cb: ProducerCallbacks, deps: ProducerDeps): Promise<ProductionRun> {
  const commit = async (mut: (r: ProductionRun) => void) => {
    mut(run);
    run.updatedAt = deps.now();
    await deps.persist(run);
    cb.onUpdate(run);
  };
  const scene = run.storyboard?.[sceneIdx];
  const sc = run.scenes.find((s) => s.sceneIdx === sceneIdx);
  if (!scene || !sc) return run;

  await commit((r) => {
    // Stay parked at the First Cut gate — a per-scene re-roll must NOT throw the user to the
    // full "Building your ad · ~15-45 min" RunningScreen. run.busy + the scene's own 'rendering'
    // status drive FirstCutScreen's spinner without a status flip (which would swap the screen).
    r.status = 'review';
    r.gate = 'first_cut';
    r.busy = 'reshoot';
    const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
    s.status = 'rendering';
    s.flaggedReason = undefined;
  });
  // Return the server scene row to pending so the claim path re-runs it exactly once. If the
  // requeue changed nothing, the scene isn't in a requeue-able state (e.g. another driver has it
  // in flight) — treat as a lost race and bail back to the gate rather than re-render blindly.
  const requeued = await deps.run.requeueScene(run.runId, sceneIdx);
  if (!requeued.changed) {
    await commit((r) => {
      const s = r.scenes.find((x) => x.sceneIdx === sceneIdx);
      if (s) s.status = s.videoUrl ? 'done' : 'flagged';
      r.status = 'review';
      r.gate = 'first_cut';
      r.busy = undefined;
    });
    return run;
  }

  try {
    // 1. Fresh image
    const prompt = scene.imagePrompt || scene.startFramePrompt || scene.sceneDescription;
    const imageUrl = await withRetry(
      () =>
        deps.generateSceneImage(
          prompt,
          run.input.aspectRatio === '1:1' ? '1:1' : run.input.aspectRatio,
          '1K',
          { avatarUrl: run.input.avatar.url, productUrl: run.input.heroImageBase64 },
          run.input.avatar.ethnicity,
          [],
          run.input.scriptType,
          run.input.productDescription,
          run.input.productName,
          1,
          scene.referenceImage ?? 'avatar'
        ),
      MAX_STAGE_ATTEMPTS
    );
    await commit((r) => {
      if (r.storyboard) r.storyboard[sceneIdx].imageUrl = imageUrl;
      r.scenes.find((x) => x.sceneIdx === sceneIdx)!.imageUrl = imageUrl;
    });

    // 2. Video (claimed → exactly-once)
    const vp = run.videoPrompts?.[sceneIdx];
    const type = vp?.type ?? 'b-roll';
    const resolution = run.input.resolution ?? '720p';
    const model = routeModel(type, 'Veo_3.1_Lite', sceneIdx, resolution);
    const videoUrl = await renderOneScene(
      run,
      { sceneIdx, prompt: vp?.prompt ?? prompt, startFrame: imageUrl, endFrame: scene.endFrameImageUrl, duration: pickSceneDuration(type, model, resolution), model },
      deps,
      cb
    );
    if (!videoUrl) throw new Error('reshoot video failed');
    await commit((r) => {
      r.scenes.find((x) => x.sceneIdx === sceneIdx)!.videoUrl = videoUrl;
    });

    // 3. Voice
    const voiceRes = await deps.consolidateVoices([{ sceneIdx, type, scriptLine: scene.scriptLine, videoUrl }], run.input.voiceId, run.input.stabilityMode ?? 'robust');
    const audioUrl = voiceRes.find((v) => v.sceneIdx === sceneIdx)?.audioUrl ?? null;
    await commit((r) => {
      const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
      if (audioUrl) s.audioUrl = audioUrl;
      s.status = 'done';
    });

    // 4. Re-assemble + back to the First Cut gate.
    await runStage('final_render', run, deps, cb, async (id, patch) => {
      await commit((r) => {
        const st = r.stages.find((x) => x.id === id);
        if (st) Object.assign(st, patch);
      });
    });
    await commit((r) => {
      r.status = 'review';
      r.gate = 'first_cut';
      r.busy = undefined;
    });
  } catch (e: any) {
    await commit((r) => {
      const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
      s.status = 'flagged';
      s.flaggedReason = `reshoot: ${e?.message ?? 'failed'}`;
      r.status = 'review';
      r.gate = 'first_cut';
      r.busy = undefined;
    });
  }
  return run;
}

/** Whether a poll error means the recorded handle is unknown/expired (so re-render is the only
 * recovery) vs a transient/content failure (flag, don't re-spend). Provider errors bubble up as
 * messages like `poll_http_404`, `NOT_FOUND`, `VEO_NO_OUTPUT`, `invalid_operation`. */
function isExpiredHandleError(e: any): boolean {
  const m = String(e?.message ?? '');
  return /poll_http_40|not[_ ]?found|unknown|expired|invalid_operation|VEO_NO_OUTPUT|VEO_EMPTY_VIDEO/i.test(m);
}

type PollOutcome = { kind: 'done'; url: string } | { kind: 'expired' } | { kind: 'failed'; reason: string };

/** Poll a handle to completion, mapping the provider result onto a re-render decision. */
async function pollHandle(handle: VideoJobHandle, cb: ProducerCallbacks, deps: ProducerDeps): Promise<PollOutcome> {
  try {
    const res = await deps.pollVideo(handle, { signal: cb.signal });
    return { kind: 'done', url: res.url };
  } catch (e: any) {
    if (e?.message === 'ABORTED') throw e;
    if (isExpiredHandleError(e)) return { kind: 'expired' };
    return { kind: 'failed', reason: e?.message ?? 'failed' };
  }
}

/**
 * Render a single scene through the atomic claim (exactly-once, no double-spend):
 *   claim → submit → recordScene(handle) → poll → completeScene.
 * On resume, a scene already 'submitting'/'rendering' WITH a recorded handle is POLLED to
 * completion (no new provider spend); only a handle-less stale claim (crash before record) or
 * an expired handle takes the requeue + re-render path (the acceptable single-extra-render case).
 * Returns the url, or null if it failed or another driver owns/finished it.
 */
async function renderOneScene(run: ProductionRun, job: RenderJob, deps: ProducerDeps, cb: ProducerCallbacks): Promise<string | null> {
  const resolution = run.input.resolution ?? '720p';
  const fallbackModel = routeModel('talking', 'Veo_3.1_Lite', undefined, resolution);
  const model = (job.model ?? fallbackModel) as VideoModelType;
  const duration = job.duration ?? pickSceneDuration('talking', fallbackModel, resolution);
  const inFlight = (status?: SceneJobStatus) => status === 'submitting' || status === 'rendering';

  let claim = await deps.run.claimScene(run.runId, job.sceneIdx);
  if (!claim.claimed) {
    // A scene that's genuinely DONE (has a url) — reuse it, never re-submit.
    if (claim.videoUrl) return claim.videoUrl;
    // In flight WITH a recorded handle → POLL it to completion. No new provider spend: this is
    // the resume path that replaces the old blind re-render between spend and completeScene.
    if (inFlight(claim.status) && claim.jobHandle) {
      const outcome = await pollHandle(claim.jobHandle, cb, deps);
      if (outcome.kind === 'done') {
        await deps.run.completeScene(run.runId, job.sceneIdx, outcome.url);
        return outcome.url;
      }
      if (outcome.kind === 'failed') {
        await deps.run.flagScene(run.runId, job.sceneIdx, `video: ${outcome.reason}`);
        return null;
      }
      // expired → fall through to requeue + reclaim + re-render (single-extra-render).
    }
    // Handle-less orphan (crash before record) OR expired handle: reclaim + re-render so the
    // scene never gets stuck/wrongly-flagged on resume. The user's video_ad credit is deduped
    // by runId, so at most one extra provider render per crashed scene.
    await deps.run.requeueScene(run.runId, job.sceneIdx);
    claim = await deps.run.claimScene(run.runId, job.sceneIdx);
    if (!claim.claimed) {
      // Lost the reclaim race to another driver. Reuse a finished url, poll their in-flight
      // handle, or leave the scene to the owner.
      if (claim.videoUrl) return claim.videoUrl;
      if (inFlight(claim.status) && claim.jobHandle) {
        const outcome = await pollHandle(claim.jobHandle, cb, deps);
        if (outcome.kind === 'done') {
          await deps.run.completeScene(run.runId, job.sceneIdx, outcome.url);
          return outcome.url;
        }
        return null;
      }
      return claim.videoUrl ?? null;
    }
  }

  // We own the claim (status: 'submitting'). Submit → record BEFORE the long poll → poll → complete.
  let handle: VideoJobHandle;
  try {
    handle = await deps.submitVideo(
      { model, prompt: job.prompt, duration, resolution, aspectRatio: run.input.aspectRatio, audioEnabled: true, startFrame: job.startFrame, endFrame: job.endFrame },
      { signal: cb.signal, sceneIdx: job.sceneIdx, userId: cb.userId, finishedAdId: run.runId } // one video_ad credit per finished ad, not per scene
    );
  } catch (e: any) {
    if (e?.message === 'ABORTED') throw e;
    await deps.run.flagScene(run.runId, job.sceneIdx, `video: ${e?.message ?? 'submit failed'}`);
    return null;
  }

  // Record the handle so a crash between spend and completeScene resumes by polling, not re-spending.
  const rec = await deps.run.recordScene(run.runId, job.sceneIdx, handle);
  if (!rec.changed) {
    // Lost race: the scene left 'submitting' under us. Re-read fresh state (claimScene is a
    // side-effect-free read when status != pending) and adopt a finished url rather than proceed
    // blindly. We already spent, so if it isn't done we still poll OUR handle to salvage the url.
    const fresh = await deps.run.claimScene(run.runId, job.sceneIdx);
    if (fresh.videoUrl) return fresh.videoUrl;
  }

  const outcome = await pollHandle(handle, cb, deps);
  if (outcome.kind === 'done') {
    await deps.run.completeScene(run.runId, job.sceneIdx, outcome.url);
    return outcome.url;
  }
  await deps.run.flagScene(run.runId, job.sceneIdx, `video: ${outcome.kind === 'expired' ? 'expired' : outcome.reason}`);
  return null;
}

async function runStage(
  id: ProductionStageId,
  run: ProductionRun,
  deps: ProducerDeps,
  cb: ProducerCallbacks,
  setStage: (id: ProductionStageId, patch: Partial<ProductionStageState>) => Promise<void>
): Promise<void> {
  const commit = async (mut: (r: ProductionRun) => void) => {
    mut(run);
    run.updatedAt = deps.now();
    await deps.persist(run);
    cb.onUpdate(run);
  };
  const bump = (n: number) => void setStage(id, { attempts: n });

  switch (id) {
    case 'market_research': {
      const cacheKey = researchCacheKey(run.input.brandName, run.input.productName);
      let report = run.input.forceFreshResearch ? null : (await deps.getCachedResearch?.(cacheKey)) ?? null;
      const fromCache = report !== null;
      if (!report) {
        report = await withRetry(
          () =>
            deps.generateMarketResearch({
              brandName: run.input.brandName,
              productName: run.input.productName,
              productDescription: run.input.productDescription,
              priceOffer: run.input.price,
              isLocalService: run.input.isLocalService ?? false,
              businessAddress: run.input.businessAddress?.trim() || undefined,
              uploadedImages: [run.input.heroImageBase64],
            }),
          MAX_STAGE_ATTEMPTS,
          bump
        );
        await deps.putCachedResearch?.(cacheKey, report);
      }
      const { clientDetails, businessInfo } = mapReportToWizard(run.input, report);
      await commit((r) => {
        r.report = report!;
        r.clientDetails = clientDetails;
        r.businessInfo = businessInfo;
      });
      await setStage(id, { detail: fromCache ? 'Reused your saved market research' : report.threeAmThought ? "Found your customer's #1 fear" : 'Mapped your market' });
      return;
    }

    case 'script': {
      const script = await withRetry(
        () => deps.generateAdScript(run.businessInfo!, run.input.brandName, run.input.language, run.input.offer, deriveAngleBrief(run.report!), run.report!.contrarianTruth ?? ''),
        MAX_STAGE_ATTEMPTS,
        bump
      );
      const finalScript = assembleFinalScript(script);
      await commit((r) => {
        r.script = script;
        r.finalScript = finalScript;
      });
      await setStage(id, { detail: finalScript[0] ? `"${finalScript[0]}"` : 'Hook locked' });
      return;
    }

    case 'storyboard': {
      const sb: StoryboardResponse = await withRetry(
        () => deps.generateStoryboard(run.finalScript!, run.input.avatar.description, run.businessInfo!, run.input.avatar.ethnicity, run.input.language),
        MAX_STAGE_ATTEMPTS,
        bump
      );
      const videoPrompts = await withRetry(() => deps.generateVideoPrompts(sb.scenes, run.businessInfo!), MAX_STAGE_ATTEMPTS, bump);
      await commit((r) => {
        r.storyboard = sb.scenes;
        r.videoPrompts = videoPrompts;
        r.scenes = sb.scenes.map((_, i) => ({ sceneIdx: i, status: 'pending' as SceneStatus }));
      });
      await setStage(id, { detail: `${sb.scenes.length} scenes` });
      return;
    }

    case 'scene_images': {
      const scenes = run.storyboard ?? [];
      for (let i = 0; i < scenes.length; i++) {
        if (cb.signal.aborted) throw new Error('ABORTED');
        const scene = scenes[i];
        if (run.scenes.find((s) => s.sceneIdx === i)?.imageUrl) continue; // resume: keep done images
        const prompt = scene.imagePrompt || scene.startFramePrompt || scene.sceneDescription;
        const mode = scene.referenceImage ?? 'avatar';
        try {
          const url = await withRetry(
            () =>
              deps.generateSceneImage(
                prompt,
                run.input.aspectRatio === '1:1' ? '1:1' : run.input.aspectRatio,
                '1K',
                { avatarUrl: run.input.avatar.url, productUrl: run.input.heroImageBase64 },
                run.input.avatar.ethnicity,
                [],
                run.input.scriptType,
                run.input.productDescription,
                run.input.productName,
                0,
                mode
              ),
            MAX_STAGE_ATTEMPTS,
            bump
          );
          await commit((r) => {
            if (r.storyboard) r.storyboard[i].imageUrl = url;
            const sc = r.scenes.find((s) => s.sceneIdx === i);
            if (sc) sc.imageUrl = url;
          });
        } catch (e: any) {
          if (e?.message === 'ABORTED') throw e;
          await commit((r) => {
            const sc = r.scenes.find((s) => s.sceneIdx === i);
            if (sc) {
              sc.status = 'flagged';
              sc.flaggedReason = `image: ${e?.message ?? 'failed'}`;
            }
          });
        }
      }
      return;
    }

    case 'video': {
      const scenes = run.storyboard ?? [];
      const resolution = run.input.resolution ?? '720p';
      const jobs: RenderJob[] = scenes
        .map((scene, i): RenderJob | null => {
          if (!scene.imageUrl) return null; // image flagged → can't render; already flagged
          if (run.scenes.find((s) => s.sceneIdx === i)?.videoUrl) return null; // resume: keep done videos
          const vp = run.videoPrompts?.[i];
          const type = vp?.type ?? 'b-roll';
          const model = routeModel(type, 'Veo_3.1_Lite', i, resolution);
          return { sceneIdx: i, prompt: vp?.prompt ?? scene.imagePrompt ?? scene.sceneDescription, startFrame: scene.imageUrl, endFrame: scene.endFrameImageUrl, duration: pickSceneDuration(type, model, resolution), model };
        })
        .filter((j): j is RenderJob => j !== null);
      if (jobs.length === 0) return;

      // Seed the server job queue, then FAN OUT with the atomic per-scene claim so each
      // render fires exactly once (no double-spend) even under resume / retry / 2 tabs.
      await deps.run.seedScenes(run.runId, scenes.length);
      await pooled(jobs, FANOUT_CONCURRENCY, async (job) => {
        if (cb.signal.aborted) return;
        await commit((r) => {
          const sc = r.scenes.find((s) => s.sceneIdx === job.sceneIdx);
          if (sc) sc.status = 'rendering';
        });
        const url = await renderOneScene(run, job, deps, cb);
        await commit((r) => {
          const sc = r.scenes.find((s) => s.sceneIdx === job.sceneIdx);
          if (!sc) return;
          if (url) {
            sc.status = 'done';
            sc.videoUrl = url;
          } else {
            sc.status = 'flagged';
            sc.flaggedReason = sc.flaggedReason ?? 'video: failed';
          }
        });
      });
      return;
    }

    case 'voices': {
      const rendered = run.scenes.filter((s) => s.videoUrl);
      if (rendered.length === 0) return;
      const consolidationScenes: ConsolidationScene[] = rendered.map((s) => ({
        sceneIdx: s.sceneIdx,
        type: run.videoPrompts?.[s.sceneIdx]?.type ?? 'b-roll',
        scriptLine: run.storyboard?.[s.sceneIdx]?.scriptLine ?? '',
        videoUrl: s.videoUrl,
      }));
      const results = await withRetry(() => deps.consolidateVoices(consolidationScenes, run.input.voiceId, run.input.stabilityMode ?? 'robust'), MAX_STAGE_ATTEMPTS, bump);
      await commit((r) => {
        for (const res of results) {
          const sc = r.scenes.find((s) => s.sceneIdx === res.sceneIdx);
          if (sc && res.audioUrl) sc.audioUrl = res.audioUrl;
        }
      });
      return;
    }

    case 'edl': {
      const rendered = run.scenes.filter((s) => s.videoUrl);
      const sceneBatch = rendered.map((s) => ({
        sceneIdx: s.sceneIdx,
        scriptLine: run.storyboard?.[s.sceneIdx]?.scriptLine ?? '',
        renderedUrl: s.videoUrl,
        type: run.videoPrompts?.[s.sceneIdx]?.type ?? ('b-roll' as const),
      }));
      const audioOverlays = rendered.filter((s) => s.audioUrl).map((s) => ({ sceneIdx: s.sceneIdx, audioUrl: s.audioUrl as string }));
      const input: EditDecisionInput = {
        sceneBatch,
        audioOverlays,
        finalScript: (run.finalScript ?? []).join(' '),
        storyboard: run.storyboard,
        targetPlatform: aspectRatioToPlatform(run.input.aspectRatio),
        aspectRatio: run.input.aspectRatio,
        brandContext: { brandName: run.input.brandName, voiceTone: run.input.scriptType },
      };
      const edl = await withRetry(() => deps.generateEditDecisionList(input), MAX_STAGE_ATTEMPTS, bump);
      await commit((r) => {
        r.edl = edl;
      });
      return;
    }

    case 'final_render': {
      const scenes: FinalRenderScene[] = run.scenes
        .filter((s) => s.videoUrl)
        .map((s) => {
          const isHook = s.sceneIdx === 0;
          const scriptLine = run.storyboard?.[s.sceneIdx]?.scriptLine ?? '';
          const estimate = estimateSpokenSec(scriptLine);
          const plan = run.edl?.scenes.find((e) => e.sceneIdx === s.sceneIdx);
          return {
            sceneIdx: s.sceneIdx,
            videoUrl: s.videoUrl as string,
            audioUrl: s.audioUrl ?? null,
            keepFullClip: isHook,
            targetDurationSec: isHook || estimate <= 0 ? null : estimate,
            overlayText: plan?.overlayText,
            sfxCues: plan?.sfxCues,
            transitionIn: plan?.transitionIn,
            scriptLine,
            sceneType: run.videoPrompts?.[s.sceneIdx]?.type ?? 'b-roll',
            isHook,
          };
        });
      if (scenes.length === 0) throw new Error('NO_RENDERED_SCENES');
      const music = { style: run.edl?.meta.scriptStyleDetected ?? 'mrbeast', enabled: true as const };
      const req: FinalRenderRequest = {
        scenes,
        aspectRatio: run.input.aspectRatio,
        music,
        // AUTO (Decision 8) = omit preset so the server rotates; IMPACT/CLEAN lock it.
        preset: run.presetId ? { id: run.presetId } : undefined,
      };
      const result = await withRetry(() => deps.renderFinalVideo(req), MAX_STAGE_ATTEMPTS, bump);
      if (result.status === 'failed' || !result.url) throw new Error(result.error ?? 'RENDER_FAILED');
      await commit((r) => {
        r.finalVideoUrl = result.url;
        r.finalDownloadUrl = result.downloadUrl ?? result.url;
      });
      return;
    }
  }
}
