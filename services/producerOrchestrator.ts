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
// P2 observability spine: stamp the active run id onto proxy calls (so server COGS/node
// events join to the run) and post node-lifecycle events through the existing analytics
// sink. Both are light, browser-safe modules; telemetry here is always best-effort.
import { setActiveRunId } from './runTelemetry';
import { trackEvent } from './analyticsService';
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
  VoiceWord,
} from '../types';
import type { RenderJob } from '../components/GenerateVideo/RenderAllRunner';
// P4 image gate: deterministic still checks (utils, free) + the AI gate result shape.
// Type-only imports — both are erased at runtime so the orchestrator stays decoupled
// (the concrete functions are injected via deps; imageGateService never enters the
// server bundle and its verdict prompt never enters this client module).
import type { ImageCheckResult, ExpectedAspect } from '../utils/imageChecks';
import type { ImageGateResult } from './imageGateService';

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
  /** The provider refused startFrame+endFrame and this clip was re-submitted single-frame.
   *  Absent = the pair was accepted (or none was sent). Recorded on the handle so it survives
   *  the checkpoint and a resumed run does not re-derive it by re-submitting. */
  morphDowngraded?: boolean;
}

export type ProductionStageId =
  | 'market_research'
  | 'script'
  | 'storyboard'
  | 'scene_images'
  | 'video_prompts'
  | 'thumbnail'
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
  /** Measured word timings for `audioUrl` (ElevenLabs forced alignment, from the
   * consolidation result). Fed to the final render as FinalRenderScene.voiceWords so trim +
   * overlays anchor to REAL speech-end instead of silencedetect. Always written together with
   * `audioUrl` — alignment from a different MP3 is worse than none — and absent (never `[]`)
   * when the aligner returned nothing, so the renderer falls back to the silence anchor.
   *
   * Lives in the run-header checkpoint jsonb, NOT a producer_scenes column. That is deliberate
   * and NOT a violation of the keep-blobs-off-the-header rule in supabase/producer_runs.sql:
   * images/base64 are excluded there because multi-MB jsonb caused statement timeouts, whereas
   * a whole ad's alignment is ~150 `{text,start,end}` objects — a few KB. Don't "fix" this by
   * moving it to its own column. */
  words?: VoiceWord[];
  /** Why this scene needs a reshoot (image/video/voice failure). */
  flaggedReason?: string;
  /** P4: the AI image-gate verdict for this scene's still (identity/label perception).
   * FLAG-ONLY this phase — a failing verdict annotates flaggedReason + surfaces a Gate-1
   * chip but never discards the image or blocks approval. Persisted via the run
   * checkpoint's artifacts.scenes jsonb so gate precision can be measured offline before
   * the gate is ever given reroll authority. Absent when the scene wasn't gated. */
  gateVerdict?: ImageGateResult['verdict'];
  /** The provider refused this scene's startFrame+endFrame pair and the clip was re-submitted
   *  single-frame (submitVideo's morph fallback). The stills still exist, so endFrameImageUrl
   *  stays set — but the CLIP carries no morph, and the final render's action hold must not
   *  hold a beat on a tail that never moves. Read off the recorded job handle, so a resumed
   *  run learns it without re-submitting. */
  morphDowngraded?: boolean;
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
  /** AI-written visual description of the hero photo, captured at upload. Optional and
   * best-effort; `mapReportToWizard` falls back to `productDescription` without it. */
  heroDescription?: string;
  /** Avatar locked at intake (uploaded or generated+accepted) so the run is pure. */
  avatar: Avatar;
  /** Pinoy/pinay voice id chosen at intake. */
  voiceId: string;
  language: 'English' | 'Taglish';
  aspectRatio: '9:16' | '16:9' | '1:1';
  /** Render resolution. The intake no longer sends this — the picker was removed and
   * One-Shot is always '720p' now (quality comes from the final-render lanczos+unsharp
   * upscale). Retained only for old-checkpoint resume back-compat; defaults to '720p'
   * when absent, so it's effectively always '720p'. Drives engine + duration selection. */
  resolution?: '720p' | '1080p';
  /** Script strategy — auto-detected default, override in the Customize drawer. */
  scriptType: NonNullable<BusinessInfo['scriptType']>;
  /** The chosen vertical's businessType, emitted straight from LaunchScreen's `vertical`
   * state. When present it WINS over the scriptType-derived fallback in businessTypeFor,
   * so a UGC Pro pick on a service/real-estate vertical routes to the right style. */
  businessType?: 'product' | 'service' | 'realestate';
  /** UGC Pro sub-format when the user picked one explicitly (Try-On / Unboxing / Demo /
   * Transformation / Tutorial). Undefined on the 'Auto' choice so the server classifies the
   * sub-format from the brief. */
  ugcProFormat?: 'tryon' | 'unboxing' | 'demo' | 'transformation' | 'tutorial';
  /** UGC Pro: audio-led ASMR flavor (whispered register, minimal VO, music off). Off by
   * default; mapReportToWizard copies it onto businessInfo.asmrFlag. */
  asmrFlag?: boolean;
  /** Audio identity. Absent/'voiceover' = today's TTS pipeline. 'sfx_only' = NO voiceover:
   * music leads, SFX + burned overlay text carry the message (the Pure Hype recipe). */
  audioMode?: 'voiceover' | 'sfx_only';
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
  /** Signed URL of the producer's generated thumbnail (cover frame), surfaced on
   * First Cut for download. Absent when the run produced no thumbnail artifact. */
  thumbnailUrl?: string;
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
    references: { avatarUrl?: string; productUrl?: string; continuityUrl?: string },
    ethnicity: string,
    brandColors: string[],
    scriptType: string,
    productDescription?: string,
    productName?: string,
    variationIndex?: number,
    referenceImageMode?: 'avatar' | 'product' | 'both' | 'none' | 'venue' | 'avatar_venue' | 'avatar_state'
  ) => Promise<string>;
  generateVideoPrompts: (storyboard: Scene[], businessInfo: BusinessInfo) => Promise<VideoPrompt[]>;
  /** P4 deterministic still check (decode/dims/min-res) — the ONLY automated reroll driver
   * this phase. Optional + injected: absent (e.g. in unit tests) → the check is skipped
   * entirely and scene-image behavior is byte-identical to pre-P4. */
  checkSceneImage?: (imageUrl: string, expectedAspect: ExpectedAspect) => Promise<ImageCheckResult>;
  /** P4 AI still gate (identity/label perception → server-side verdict). Best-effort +
   * FLAG-ONLY: absent, error, or timeout → skipped silently (fail-open). Never discards
   * an image, never blocks the run. */
  imageGateCheck?: (params: {
    imageBase64: string;
    referenceImageBase64?: string;
    expectedLabelText?: string;
    referenceMode: string;
    sceneIdx?: number;
  }) => Promise<ImageGateResult>;
  /** Cover-frame (MrBeast-style thumbnail). Best-effort node — thin wrapper over
   * geminiService.generateThumbnail. Optional so mock/legacy dep bundles that omit it
   * simply skip the thumbnail node (it degrades to "no cover frame", never fatal). */
  generateThumbnail?: (
    script: string[],
    avatarDescription: string,
    businessInfo: BusinessInfo,
    aspectRatio: '9:16' | '16:9',
    avatarUrl: string,
    imageQuality: '1K' | '2K',
    brandColors?: string[]
  ) => Promise<string>;
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
  /** Persist a scene's image(s) on its own row (written once per scene). Keeps multi-MB base64
   * out of the run-header checkpoint; resume rehydrates storyboard images from these rows. */
  recordSceneImage: (runId: string, sceneIdx: number, imageUrl: string, endFrameUrl?: string, gateVerdict?: Record<string, unknown> | null) => Promise<{ changed: boolean }>;
  /** Persist the run's cover frame on its own run-header column, same rationale as
   * recordSceneImage. OPTIONAL: absent in tests and on any deps built before this existed, in
   * which case the thumbnail simply isn't durable across resume (the pre-existing behavior). */
  recordThumbnail?: (runId: string, thumbnailUrl: string) => Promise<{ changed: boolean }>;
  /** Persist the locked presenter reference on its own run-header column. Unlike the thumbnail
   * this is not a convenience: `input` is slimmed in transit, so without it a resumed run has NO
   * avatar reference and regeneration is guaranteed-wrong. OPTIONAL for the same back-compat
   * reason as recordThumbnail; absent → identityRefLost refuses the regen instead. */
  recordAvatar?: (runId: string, avatarUrl: string) => Promise<{ changed: boolean }>;
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
  { id: 'video_prompts', label: 'Planning your shots' },
  { id: 'video', label: 'Filming your scenes' },
  { id: 'thumbnail', label: 'Designing your cover' },
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
/** Scene-image fan-out cap (P3). K=3 keeps the burst under the 15/60s image rate limit;
 * the image call path's own retryWithBackoff absorbs the occasional 429 without a second
 * retry loop layered here. */
const SCENE_IMAGE_CONCURRENCY = 3;

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
    // No-TTS runs (Pure Hype) design the sound instead of recording a voiceover — relabel that stage.
    stages: STAGE_ORDER.map((s) => ({
      id: s.id,
      label: s.id === 'voices' && input.audioMode === 'sfx_only' ? 'Designing the sound' : s.label,
      status: (done.has(s.id) ? 'done' : 'pending') as StageStatus,
      attempts: 0,
    })),
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

/** A ready-to-brief angle for the script generator, pulled from the research.
 * The research line is INSPIRATION, never a dictated opening: "open with: X"
 * made the model obey X over the format's beat-0 skeleton rule (transformation
 * runs opened on product/testimonial hooks — spec findings #6/#10, root cause
 * confirmed 2026-07-12). The skeleton always outranks the angle brief. */
export function deriveAngleBrief(report: MarketResearchReport): string {
  const subordinate = (line: string) =>
    `hook inspiration (the format's beat-0 skeleton rule ALWAYS wins over this line — reframe it to fit the skeleton, never copy it as the opener): "${line}"`;
  const a = report.fbAdLibraryAngles?.[0];
  if (a) return `${a.format} angle: ${a.angle} — ${subordinate(a.openingLine)}`;
  const h = report.videoHooks?.[0];
  return h ? `${h.type} ${subordinate(h.spokenLine)}` : report.bigIdea || '';
}

/** Auto-pick hook1 (locked product decision) and concatenate the body. */
export function assembleFinalScript(script: Script): string[] {
  return [...(script.hook1 ?? []), ...(script.body ?? [])].filter((l) => l && l.trim());
}

/** Clamp n into [lo, hi]. Module-local so the no-VO fast-cut pacing math stays inline. */
const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n));

/** Normalize a consolidation result's forced alignment for storage: a usable array, or
 * `undefined` when the aligner returned nothing. An empty `[]` must never be stored — the
 * renderer treats "has words" as "anchor the trim on measured speech", and a zero-length
 * window would anchor on nothing. Shared by BOTH consolidation commit sites (batch voices
 * stage + single-scene reshoot) so a retried scene can't silently revert to the silence
 * anchor mid-ad. */
const alignedWords = (res: { words?: VoiceWord[] } | undefined): VoiceWord[] | undefined =>
  res?.words?.length ? res.words : undefined;

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

/** Scene-type-aware model routing (resolution-aware talking-engine step-up).
 * Scene-0 b-roll used to step up to Kling_O1 for a "hook morph", format-blind — with a
 * single start frame O1 degrades to camera-motion/warp and person-held product hooks
 * crystallize mid-shot (sample_batch_test_spec.md finding #23, Neil GO'd removal
 * 2026-07-15). Hooks now route like any b-roll; O1 stays available to GenerateVideo. */
export function routeModel(type: VideoPrompt['type'], fallback: VideoModelType, _sceneIdx?: number, resolution: '720p' | '1080p' = '720p'): VideoModelType {
  if (type === 'talking') return resolution === '1080p' ? 'Veo_3.1_Fast' : 'Veo_3.1_Lite';
  if (type === 'b-roll') return 'Kling_3_0';
  if (type === 'cinematic') return 'Kling_3_0';
  return fallback;
}

/** Post a producer-run lifecycle event to the shared /api/events sink via the existing
 * analytics transport (P2). Fire-and-forget and fully best-effort: a telemetry failure
 * must never block or fail a stage. */
const emitRunEvent = (
  event: 'node_start' | 'node_done' | 'node_fail' | 'check_fail' | 'check_skip' | 'gate_park' | 'gate_approve',
  runId: string,
  meta: Record<string, unknown>
): void => {
  try {
    void trackEvent({ event, run_id: runId, meta });
  } catch {
    /* best-effort — telemetry never breaks the run */
  }
};

/** Max chars of a swallowed gate error kept on a 'check_skip' row — enough to tell two
 *  infra failures apart, small enough that telemetry never carries a payload. */
const SKIP_DETAIL_MAX = 200;

/** Classify a swallowed image-gate error into a SHORT STABLE reason + a truncated raw
 * detail, so a skipped gate is countable in the flag-ON precision window instead of
 * silently indistinguishable from a clean pass. Sources of the reasons:
 *   - 'rate_limited'    : IMAGE_GATE_429 — gate + generate calls share the one
 *                         `gemini:image:${user.id}` bucket (api/gemini/image.ts), so a
 *                         parallel pooled run can 429 the gate; also the internal daily
 *                         gate budget / per-scene repeat cap (both 429, see `detail`).
 *   - 'aborted'         : the 55s client abort in services/imageGateService.ts (DOMException
 *                         'AbortError'), or a run-level ABORTED.
 *   - 'unauthenticated' : NOT_AUTHENTICATED — no Supabase session on the gate call.
 *   - 'other'           : anything else (e.g. IMAGE_GATE_503 image_gate_disabled).
 * Defensive by construction: an unknown value's `.message`/`.name` are read inside a try,
 * so an exotic thrown object can never escape the caller's fail-open catch. */
const classifyGateSkip = (err: unknown): { reason: string; detail?: string } => {
  let message = '';
  let name = '';
  try {
    const e = err as { message?: unknown; name?: unknown } | null | undefined;
    if (typeof e?.message === 'string') message = e.message;
    if (typeof e?.name === 'string') name = e.name;
  } catch {
    /* exotic getter — leave both empty and classify as 'other' */
  }
  const reason =
    name === 'AbortError' || /abort/i.test(message)
      ? 'aborted'
      : /^NOT_AUTHENTICATED/.test(message)
      ? 'unauthenticated'
      : /^IMAGE_GATE_429\b/.test(message)
      ? 'rate_limited'
      : 'other';
  return { reason, ...(message ? { detail: message.slice(0, SKIP_DETAIL_MAX) } : {}) };
};

async function withRetry<T>(fn: () => Promise<T>, attempts: number, onAttempt?: (n: number) => void): Promise<T> {
  let lastErr: unknown;
  for (let n = 1; n <= attempts; n++) {
    onAttempt?.(n);
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if ((e as Error)?.message === 'ABORTED') throw e;
      // Jittered backoff BETWEEN attempts (not after the final failure): give a
      // transient upstream blip time to clear instead of hot-looping the retry.
      if (n < attempts) {
        await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
      }
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

/** Resume-safety (P3): a run checkpointed on OLD code has a `stages` array that predates the
 * video_prompts / thumbnail split. Rebuild it against the CURRENT STAGE_ORDER, preserving every
 * existing entry's status and inferring done-ness for a freshly-added stage from artifacts
 * already on the run (so a resume never redoes completed work, and never crashes on the
 * `stages.find(...)!` lookups the driver assumes are total). No-op for a current-shape run. */
function normalizeStages(run: ProductionRun): void {
  const byId = new Map(run.stages.map((s) => [s.id, s]));
  if (STAGE_ORDER.every(({ id }) => byId.has(id))) return; // already current — nothing to do
  run.stages = STAGE_ORDER.map(({ id, label }) => {
    const existing = byId.get(id);
    if (existing) return existing;
    let status: StageStatus = 'pending';
    if (id === 'video_prompts' && (run.videoPrompts?.length ?? 0) > 0) status = 'done';
    if (id === 'thumbnail' && run.thumbnailUrl) status = 'done';
    const relabel = id === 'voices' && run.input.audioMode === 'sfx_only' ? 'Designing the sound' : label;
    return { id, label: relabel, status, attempts: 0 };
  });
}

/** Run ONE stage's node lifecycle: setStage(running)+node_start → runStage → setStage(done)+
 * node_done. On non-abort failure: `degrade` marks the stage done-with-warning (status stays
 * 'done', the reason lands in `error`) and emits node_fail{degraded} WITHOUT rethrowing — the
 * caller keeps going. Non-degrade re-throws after marking the stage failed (run-fatal, matching
 * the sequential loop). ABORTED always propagates. */
async function runNode(
  id: ProductionStageId,
  run: ProductionRun,
  deps: ProducerDeps,
  cb: ProducerCallbacks,
  setStage: (id: ProductionStageId, patch: Partial<ProductionStageState>) => Promise<void>,
  opts: { degrade?: boolean } = {}
): Promise<void> {
  const stage = run.stages.find((s) => s.id === id)!;
  await setStage(id, { status: 'running', error: undefined });
  emitRunEvent('node_start', run.runId, { node: id, attempt: stage.attempts });
  try {
    await runStage(id, run, deps, cb, setStage);
    await setStage(id, { status: 'done' });
    emitRunEvent('node_done', run.runId, { node: id });
  } catch (e: any) {
    if (e?.message === 'ABORTED') throw e;
    if (opts.degrade) {
      // done-with-warning: the run continues; downstream uses its existing fallback.
      await setStage(id, { status: 'done', error: `degraded: ${e?.message ?? 'failed'}` });
      emitRunEvent('node_fail', run.runId, { node: id, degraded: true, error: e?.message ?? 'failed' });
      return;
    }
    await setStage(id, { status: 'failed', error: e?.message ?? 'STAGE_FAILED' });
    emitRunEvent('node_fail', run.runId, { node: id, error: e?.message ?? 'failed' });
    throw e;
  }
}

/** P3 parallelism: run a `primary` stage ∥ a `secondary` stage whose bodies share a dependency
 * but not each other. Both pending bodies run concurrently, each committing its own status.
 * `allSettled` (not `all`) so one failing NEVER cancels the other. The secondary always runs
 * with DEGRADE semantics (never run-fatal); only the primary can reject run-fatally (or either
 * with ABORTED), which is re-thrown AFTER both settle so the caller can error/return the run.
 * On a resumed run where one is already done, only the other runs (single-element task list).
 * Sites: scene_images ∥ video_prompts (both need the storyboard) and video ∥ thumbnail (both
 * need the approved scene images; thumbnail is ~20s vs video's minutes, so zero added wall time). */
async function runStagePair(
  run: ProductionRun,
  deps: ProducerDeps,
  cb: ProducerCallbacks,
  setStage: (id: ProductionStageId, patch: Partial<ProductionStageState>) => Promise<void>,
  primary: ProductionStageId,
  secondary: ProductionStageId
): Promise<void> {
  const p = run.stages.find((s) => s.id === primary)!;
  const s = run.stages.find((st) => st.id === secondary)!;
  const tasks: Promise<void>[] = [];
  if (p.status !== 'done') tasks.push(runNode(primary, run, deps, cb, setStage));
  if (s.status !== 'done') tasks.push(runNode(secondary, run, deps, cb, setStage, { degrade: true }));
  const settled = await Promise.allSettled(tasks);
  const rejected = settled.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
  if (rejected) throw rejected.reason;
}

/** Build + run the cover-frame generation for a run. Returns the thumbnail url, or undefined
 * when the dep is absent or the run lacks the inputs (a legitimate skip — not an error). A real
 * generation failure THROWS after retry so the caller's degrade wrapper (runNode {degrade}) marks
 * the stage done-with-warning; ABORTED propagates unchanged. */
async function generateThumbnailFor(run: ProductionRun, deps: ProducerDeps): Promise<string | undefined> {
  if (!deps.generateThumbnail || !run.businessInfo || !run.finalScript?.length) return undefined;
  // generateThumbnail only accepts 9:16 | 16:9; 1:1 runs fall back to 9:16 (best-effort cover).
  const ar: '9:16' | '16:9' = run.input.aspectRatio === '16:9' ? '16:9' : '9:16';
  return withRetry(
    () => deps.generateThumbnail!(run.finalScript!, run.input.avatar.description, run.businessInfo!, ar, run.input.avatar.url, '1K', []),
    MAX_STAGE_ATTEMPTS
  );
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
  // Run starts (or resumes): stamp the active run id so every proxy call made below
  // carries x-run-id for server-side COGS/node attribution. try/finally (not inline
  // clears) so a throw-through from an injected dep or UI callback can never leave a
  // stale run id on the module singleton polluting later unrelated calls' telemetry.
  setActiveRunId(initial.runId);
  try {
    return await runProductionInner(initial, cb, deps);
  } finally {
    setActiveRunId(null);
  }
}

/** Hard ceiling on a persisted avatar — mirrors the zod cap on api/producer/advance.ts's
 *  'record_avatar'. Above it the POST would 400 and we would learn nothing. */
const MAX_AVATAR_CHARS = 3_000_000;

/**
 * Persist the presenter reference on its own run-header column, once, best-effort.
 *
 * This is the durable copy. `input.avatar.url` cannot survive a checkpoint — slimCheckpointInput
 * drops data: strings over 700KB and a 2K avatar exceeds that — so without this a resumed run has
 * no reference at all and every regen renders a wrong image (see identityRefLost).
 *
 * The size is MEASURED rather than assumed. A generated 2K avatar has never reached the database
 * intact, so its real length was unknown when this was written; if it exceeds the cap the skip is
 * emitted with the actual char count, which turns a silent failure into the exact number needed to
 * choose the next step (compress before storing, or move to Supabase Storage). Never throws —
 * telemetry and durability must not be able to fail a run.
 *
 * Returns SETTLED: true when there is nothing left to try — the write landed, or the case is
 * terminal (no recordAvatar dep, no data: avatar, over the cap). False ONLY when the attempt
 * threw, which is the retryable case: the run row not existing yet is exactly that 404, and it
 * stops being true the moment a checkpoint creates the row. The caller uses this to decide
 * whether to close the door; see the commit wrapper.
 */
async function persistAvatarReference(run: ProductionRun, deps: ProducerDeps): Promise<boolean> {
  const url = run.input.avatar?.url;
  if (!deps.run.recordAvatar || typeof url !== 'string' || !url.startsWith('data:')) return true;
  if (url.length > MAX_AVATAR_CHARS) {
    emitRunEvent('node_fail', run.runId, {
      node: 'avatar_persist', error: 'avatar_too_large', chars: url.length, cap: MAX_AVATAR_CHARS,
    });
    return true;
  }
  try {
    await deps.run.recordAvatar(run.runId, url);
    return true;
  } catch (e: any) {
    // Was a bare `catch {}`. That is what hid this for a month: api/producer/advance.ts rejects
    // EVERY action with 404 'run_not_found' before its switch when the run row does not exist
    // yet, post() throws on it, and the swallow made a guaranteed failure look like a success.
    // Still best-effort — never throws — but now it says so. Same doctrine as the size cap above.
    emitRunEvent('node_fail', run.runId, {
      node: 'avatar_persist', error: String(e?.message ?? 'record_avatar_failed'), status: e?.status,
    });
    return false;
  }
}

async function runProductionInner(initial: ProductionRun, cb: ProducerCallbacks, deps: ProducerDeps): Promise<ProductionRun> {
  let run = initial;

  // The avatar write is fire-and-forget — the reference is needed by a LATER regen, never by this
  // run's own stages (which still hold `input` in memory) — but it CANNOT fire before the run row
  // exists. api/producer/advance.ts checks ownership against producer_runs for every action and
  // 404s 'run_not_found' ahead of its switch, so firing here (as this did) hit a row that no
  // persist had created yet, threw, and was swallowed. Measured 2026-08-30: 25 of 33 runs have a
  // NULL avatar_url, and no 'avatar_too_large' event was ever emitted, i.e. it never got that far.
  //
  // So hang it off a persist instead. Deliberately not an extra persist of our own:
  // api/producer/run.ts guards on `revision`, and a concurrent write would risk the
  // optimistic-concurrency conflict this run depends on.
  //
  // The door is closed by the AVATAR write settling, never by the checkpoint before it.
  // `deps.persist` is best-effort and swallows its own errors (producerDeps.ts), so it always
  // resolves — awaiting it proves the checkpoint was ATTEMPTED, not that the run row exists.
  // Latching on that attempt spent the single try on precisely the case this fix is about: a
  // dropped create checkpoint means recordAvatar still 404s 'run_not_found', and avatar_url
  // stays NULL for the life of the run. So retry on the next commit until the write settles.
  // The in-flight guard keeps that to one outstanding attempt — commits are frequent and this
  // is fire-and-forget, so without it a slow POST would fan out into a burst.
  let avatarPersistSettled = false;
  let avatarPersistInFlight = false;
  const commit = async (mut: (r: ProductionRun) => void) => {
    mut(run);
    run.updatedAt = deps.now();
    await deps.persist(run);
    if (!avatarPersistSettled && !avatarPersistInFlight) {
      avatarPersistInFlight = true;
      void persistAvatarReference(run, deps).then((settled) => {
        avatarPersistSettled = settled;
        avatarPersistInFlight = false;
      });
    }
    cb.onUpdate(run);
  };
  const setStage = (id: ProductionStageId, patch: Partial<ProductionStageState>) =>
    commit((r) => {
      const st = r.stages.find((s) => s.id === id);
      if (st) Object.assign(st, patch);
    });

  // Resume-safety: reconcile an old-shape checkpoint (pre video_prompts/thumbnail split) with
  // the current STAGE_ORDER so the `stages.find(...)!` lookups below are total and no completed
  // work is redone.
  normalizeStages(run);

  for (const { id } of STAGE_ORDER) {
    if (cb.signal.aborted) return run;

    // ── Storyboard-image approval gate: park before the expensive video render ──
    if (id === GATE_BEFORE && !run.storyboardApproved) {
      await commit((r) => {
        r.status = 'review';
        r.gate = 'storyboard';
      });
      emitRunEvent('gate_park', run.runId, { node: 'storyboard', gate: 'storyboard' });
      return run;
    }

    // ── PARALLEL: scene_images ∥ video_prompts (both depend only on the storyboard) ──
    // Co-executed when the loop first reaches scene_images; video_prompts is skipped below
    // (already done) once the pair settles. A resumed run where one is done runs only the other.
    if (id === 'scene_images') {
      try {
        await runStagePair(run, deps, cb, setStage, 'scene_images', 'video_prompts');
      } catch (e: any) {
        if (e?.message === 'ABORTED') return run;
        const failed = run.stages.find((s) => s.status === 'failed')?.id ?? 'scene_images';
        await commit((r) => {
          r.status = 'error';
          r.error = `${failed}: ${e?.message ?? 'failed'}`;
        });
        return run;
      }
      if (cb.signal.aborted) return run;
      continue;
    }

    // ── video_prompts: normally finished by the pair above. Defensive standalone path (e.g. a
    // normalized old checkpoint reaching here pending) always DEGRADES — never run-fatal. ──
    if (id === 'video_prompts') {
      const st = run.stages.find((s) => s.id === 'video_prompts')!;
      if (st.status !== 'done') {
        try {
          await runNode('video_prompts', run, deps, cb, setStage, { degrade: true });
        } catch (e: any) {
          if (e?.message === 'ABORTED') return run;
        }
      }
      continue;
    }

    // ── PARALLEL: video ∥ thumbnail (both need the approved scene images; thumbnail ~20s vs
    // video's minutes → zero added wall time). Runs INSIDE the active-run window so the
    // thumbnail's COGS carries x-run-id. video is run-fatal; thumbnail DEGRADES. The gate park
    // above already returned for an unapproved run, so we only reach here post-approval. The
    // thumbnail iteration below is skipped once this pair marks it done. ──
    if (id === 'video') {
      try {
        await runStagePair(run, deps, cb, setStage, 'video', 'thumbnail');
      } catch (e: any) {
        if (e?.message === 'ABORTED') return run;
        const failed = run.stages.find((s) => s.status === 'failed')?.id ?? 'video';
        await commit((r) => {
          r.status = 'error';
          r.error = `${failed}: ${e?.message ?? 'failed'}`;
        });
        return run;
      }
      if (cb.signal.aborted) return run;
      continue;
    }

    // ── thumbnail: normally finished by the video pair above. Defensive standalone path (a
    // resume that reaches here with the cover still pending) always DEGRADES — best-effort,
    // never run-fatal (First Cut simply hides the download if it's absent). ──
    if (id === 'thumbnail') {
      const st = run.stages.find((s) => s.id === 'thumbnail')!;
      if (st.status !== 'done') {
        try {
          await runNode('thumbnail', run, deps, cb, setStage, { degrade: true });
        } catch (e: any) {
          if (e?.message === 'ABORTED') return run;
        }
      }
      continue;
    }

    const stage = run.stages.find((s) => s.id === id)!;
    if (stage.status === 'done') continue; // resume: skip completed stages

    await setStage(id, { status: 'running', error: undefined });
    emitRunEvent('node_start', run.runId, { node: id, attempt: stage.attempts });
    try {
      await runStage(id, run, deps, cb, setStage);
      await setStage(id, { status: 'done' });
      emitRunEvent('node_done', run.runId, { node: id });
    } catch (e: any) {
      if (e?.message === 'ABORTED') return run;
      await setStage(id, { status: 'failed', error: e?.message ?? 'STAGE_FAILED' });
      emitRunEvent('node_fail', run.runId, { node: id, error: e?.message ?? 'failed' });
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
  emitRunEvent('gate_park', run.runId, { gate: 'first_cut' });
  return run;
}

/**
 * Approve the storyboard-image gate and continue into the video render. Called from the
 * gate screen after the user verifies/regenerates the scene images. Idempotent.
 */
export async function approveStoryboard(run: ProductionRun, cb: ProducerCallbacks, deps: ProducerDeps): Promise<ProductionRun> {
  // Concurrency backstop (F1, live canary): a double-approve fired TWO runProduction drivers →
  // every batch stage double-ran (double ElevenLabs burn, doubled telemetry). The UI now guards
  // the button, but make the orchestrator idempotent under concurrency too. JS runs synchronously
  // up to the first await, so setting storyboardApproved + emitting the event BEFORE any await means
  // a second concurrent call sees the flag here and bails — no second driver, no second event.
  if (run.storyboardApproved) return run;
  run.storyboardApproved = true;
  emitRunEvent('gate_approve', run.runId, { gate: 'storyboard' });
  // Resume from the storyboard gate. No setActiveRunId here — the pre-loop work below
  // makes no proxied AI calls, and runProduction's try/finally owns the id lifecycle
  // (a set here without its own finally could leak if persist/onUpdate threw).
  run.status = 'running';
  run.gate = undefined;
  run.updatedAt = deps.now();
  try {
    await deps.persist(run);
  } catch (e) {
    // Un-wedge (PR #70 critic, Axis1 #4): a failed persist must not leave the sync guard
    // set on the in-memory run, or every later Approve early-returns and the gate is dead
    // until reload. Revert to the parked-gate state and rethrow so the UI can retry.
    run.storyboardApproved = false;
    run.status = 'review';
    run.gate = 'storyboard';
    throw e;
  }
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
  const previousPresetId = run.presetId;
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
      r.error = undefined;
    });
  } catch (e: any) {
    await commit((r) => {
      r.status = 'review';
      r.gate = 'first_cut';
      r.busy = undefined;
      r.presetId = previousPresetId;
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

  // Refuse before the spinner and before any spend — see identityRefLost. The good image stays,
  // and `status` is left alone so one refused scene can't block approval of a fine run.
  if (identityRefLost(run, scene)) {
    emitRunEvent('node_fail', run.runId, { node: 'regen', sceneIdx, error: 'identity_reference_lost' });
    await commit((r) => {
      const s = r.scenes.find((x) => x.sceneIdx === sceneIdx);
      if (s) s.flaggedReason = IDENTITY_REF_LOST_REASON;
    });
    return run;
  }

  await commit((r) => {
    const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
    s.status = 'rendering';
    s.flaggedReason = undefined;
  });
  try {
    const prompt = scene.imagePrompt || scene.startFramePrompt || scene.sceneDescription;
    // Hook morph: regen the PAIR (product-free start, then the end frame below) — a lone
    // fresh start against a stale end frame would morph between mismatched compositions.
    // Scene 0 only. The name means what it says: the HOOK's morph, whose start frame is a
    // product-free metaphor. Any other scene carrying a frame pair is showing two real states
    // of a real object (a sealed box, then the pouch out of it) and MUST keep its references.
    const isHookMorph = sceneIdx === 0 && !!scene.startFramePrompt && !!scene.endFramePrompt;
    const imageUrl = await withRetry(
      () =>
        deps.generateSceneImage(
          prompt,
          run.input.aspectRatio === '1:1' ? '1:1' : run.input.aspectRatio,
          '1K',
          // A scene that names a venueSlot must be anchored to THAT uploaded photo, not the
          // hero. Without this the regen paths ignored venueSlot entirely, so hitting
          // REGENERATE on an unboxing scene quietly swapped its box back for the pouch.
          { avatarUrl: run.input.avatar.url, productUrl: isHookMorph ? undefined : (slotPhotoFor(run, scene)?.url ?? run.input.heroImageBase64) },
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
      // A verdict describes the image it judged — a fresh image must not wear the old
      // IDENTITY?/LABEL? chip (PR #70 critic, Axis1 #1). Re-gating the regen is flag-ON work.
      s.gateVerdict = undefined;
    });
    if (scene.endFramePrompt) {
      const endUrl = await renderEndFrame(run, scene, sceneIdx, deps, imageUrl);
      await commit((r) => {
        if (r.storyboard) r.storyboard[sceneIdx].endFrameImageUrl = endUrl;
      });
    }
    // Refresh the scene's durable image row (best-effort — see the scene_images stage).
    // Explicit null CLEARS the stored gate verdict, matching the `s.gateVerdict = undefined`
    // above: this is a brand-new image, and a verdict that outlived the still it judged would
    // both show a wrong chip and poison the precision dataset with a mis-attributed label.
    // Re-gating a regen is flag-ON work; until then "no verdict" is the honest state.
    try {
      await deps.run.recordSceneImage(run.runId, sceneIdx, imageUrl, scene.endFrameImageUrl, null);
    } catch { /* best-effort */ }
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
/** Reference modes whose render REQUIRES the locked presenter photo. Same set as the gate's
 *  `wantIdentity` — kept as its own constant because this one guards GENERATION, not a check. */
const IDENTITY_MODES = new Set(['avatar', 'both', 'avatar_venue']);

/** Shown to the user on a refused regen/reshoot. Names the cause and the only real escape. */
export const IDENTITY_REF_LOST_REASON =
  'Presenter reference was lost on reload — Start over to re-shoot this scene';

/**
 * Has the presenter reference gone missing, making a fresh generation guaranteed-wrong?
 *
 * `slimCheckpointInput` (services/producerRunService.ts) drops any `data:` string over 700KB from
 * the checkpointed `input` to stay under api/producer/run's 2mb body cap. The compressed hero
 * survives that (~160KB measured); a 2K avatar does NOT — `avatarModel` still renders at 2K. So
 * after ANY reload or cross-device resume, `input.avatar.url` is simply gone.
 *
 * Generating anyway does not degrade — it produces a confidently wrong image, and the doc's stated
 * cost ("at most it costs a cross-device resume of that one oversized image") badly understates it.
 * Measured on run apr_876ef559 (2026-07-25): with the avatar absent, `generateSceneImage` still
 * takes its `referenceImageMode === 'avatar'` branch (that branch, alone among the five, has no
 * `&& references.avatarUrl` guard), so "Reference Image 1" silently resolves to the PRODUCT photo.
 * IDENTITY_LOCK then tries to preserve a bottle's face and hair — no person is rendered at all —
 * and the same branch's rule 6 states "This frame has no product reference photo — any label you
 * render would be an invented fake … leave the surface empty", which the model obeys faithfully.
 * Result: a product-only still wearing a BLANK label, overwriting a good image, for real money.
 *
 * 'both' and 'avatar_venue' fail differently but just as badly: their branches DO guard on the
 * avatar, so they fall through to the STRICT_NEGATIVE "NO HUMANS" branch — a people-free frame for
 * a scene whose whole point is the presenter.
 *
 * So: refuse. This is a stop-loss, not the fix — the real repair is to stop losing the reference
 * (compress it like the hero, or give it its own column the way `record_image` does for stills).
 */
function identityRefLost(run: ProductionRun, scene: Scene): boolean {
  if (!IDENTITY_MODES.has(scene.referenceImage ?? 'avatar')) return false;
  const url = run.input.avatar?.url;
  return !(typeof url === 'string' && url.startsWith('data:'));
}

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

  // BEFORE requeueScene, deliberately: requeue NULLs job_handle/video_url/audio_url, so guarding
  // after it would destroy the very clip we are declining to replace.
  if (identityRefLost(run, scene)) {
    emitRunEvent('node_fail', run.runId, { node: 'reshoot', sceneIdx, error: 'identity_reference_lost' });
    await commit((r) => {
      const s = r.scenes.find((x) => x.sceneIdx === sceneIdx);
      // status untouched: the existing clip is still good and must stay approvable.
      if (s) s.flaggedReason = IDENTITY_REF_LOST_REASON;
    });
    return run;
  }

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
    // 1. Fresh image (a hook-morph scene regens the PAIR — see regenSceneImage)
    const prompt = scene.imagePrompt || scene.startFramePrompt || scene.sceneDescription;
    // Scene 0 only. The name means what it says: the HOOK's morph, whose start frame is a
    // product-free metaphor. Any other scene carrying a frame pair is showing two real states
    // of a real object (a sealed box, then the pouch out of it) and MUST keep its references.
    const isHookMorph = sceneIdx === 0 && !!scene.startFramePrompt && !!scene.endFramePrompt;
    const imageUrl = await withRetry(
      () =>
        deps.generateSceneImage(
          prompt,
          run.input.aspectRatio === '1:1' ? '1:1' : run.input.aspectRatio,
          '1K',
          // A scene that names a venueSlot must be anchored to THAT uploaded photo, not the
          // hero. Without this the regen paths ignored venueSlot entirely, so hitting
          // REGENERATE on an unboxing scene quietly swapped its box back for the pouch.
          { avatarUrl: run.input.avatar.url, productUrl: isHookMorph ? undefined : (slotPhotoFor(run, scene)?.url ?? run.input.heroImageBase64) },
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
      const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
      s.imageUrl = imageUrl;
      s.gateVerdict = undefined; // fresh image — stale verdict must not ride along (PR #70 critic)
    });
    if (scene.endFramePrompt) {
      const endUrl = await renderEndFrame(run, scene, sceneIdx, deps, imageUrl);
      await commit((r) => {
        if (r.storyboard) r.storyboard[sceneIdx].endFrameImageUrl = endUrl;
      });
    }
    // Refresh the scene's durable image row (best-effort — see the scene_images stage).
    // Explicit null CLEARS the stored gate verdict, matching the `s.gateVerdict = undefined`
    // above: this is a brand-new image, and a verdict that outlived the still it judged would
    // both show a wrong chip and poison the precision dataset with a mis-attributed label.
    // Re-gating a regen is flag-ON work; until then "no verdict" is the honest state.
    try {
      await deps.run.recordSceneImage(run.runId, sceneIdx, imageUrl, scene.endFrameImageUrl, null);
    } catch { /* best-effort */ }

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
    const res = voiceRes.find((v) => v.sceneIdx === sceneIdx);
    const audioUrl = res?.audioUrl ?? null;
    await commit((r) => {
      const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
      if (audioUrl) {
        s.audioUrl = audioUrl;
        // New MP3 → new alignment (or none). Assigning even when absent CLEARS the previous
        // take's words, which would otherwise time this scene's trim off a discarded audio file.
        s.words = alignedWords(res);
      }
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
  if (isContentRefusal(e)) return false; // a refusal is permanent — never re-render it
  return /poll_http_40|not[_ ]?found|unknown|expired|invalid_operation|VEO_NO_OUTPUT|VEO_EMPTY_VIDEO/i.test(m);
}

/** The provider's safety filter refused this scene. PERMANENT: the identical prompt +
 * references can only be refused again, so the requeue + re-render path (which exists for
 * lost handles) would spend a second render to earn the same refusal. Flag it instead, and
 * carry the provider's own wording so the user learns WHY (2026-08-27: a Veo likeness
 * refusal was reaching the storyboard gate labelled "video: expired"). */
function isContentRefusal(e: any): boolean {
  return /VEO_CONTENT_REFUSED/i.test(String(e?.message ?? ''));
}

type PollOutcome = { kind: 'done'; url: string } | { kind: 'expired' } | { kind: 'failed'; reason: string };

/** Poll a handle to completion, mapping the provider result onto a re-render decision. */
async function pollHandle(handle: VideoJobHandle, cb: ProducerCallbacks, deps: ProducerDeps): Promise<PollOutcome> {
  try {
    const res = await deps.pollVideo(handle, { signal: cb.signal });
    return { kind: 'done', url: res.url };
  } catch (e: any) {
    if (e?.message === 'ABORTED') throw e;
    if (isContentRefusal(e)) {
      const detail = String(e?.message ?? '').split(/:\s*/).slice(1).join(': ').trim();
      return { kind: 'failed', reason: `refused by the provider safety filter${detail ? ` — ${detail}` : ''}` };
    }
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
const PRODUCT_STOPWORDS = new Set(['the', 'and', 'for', 'with', 'your', 'this', 'that', 'from', 'sleek', 'clean', 'portable']);

/** Compose two uploaded reference photos into ONE image, side by side on a white ground.
 *
 * `generateSceneImage` accepts a single `productUrl`, so a scene that must show TWO real
 * uploaded objects at the same time has no way to anchor both. The unboxing end frame is
 * exactly that: the product coming OUT of its own packaging. Given only the hero, the model
 * rendered the pouch correctly and invented a generic shipping carton for the box (Neil,
 * 2026-08-29) — it was allowed to draw a box because the prompt named one, but it had no
 * photo of ours to copy.
 *
 * This is the CHEAP probe, chosen over widening the generator's signature and writing a new
 * tuned "Reference Image 3" block. Be honest about the odds: a two-object reference is what
 * the old packaging photos were, and on a scene whose prompt said "the product" the model
 * simply picked one of them. The bet is that an end prompt naming BOTH objects and their
 * relationship reads differently. If it does not, the signature change is unavoidable and
 * we will have bought that knowledge for one free storyboard run.
 *
 * Both inputs are data URLs (the composer stores uploads as `c.dataUrl`), so nothing here can
 * taint the canvas. Browser-only: returns undefined without a DOM, and every caller falls
 * back to the single reference, which is the behaviour that shipped before this existed. */
async function composeReferenceSheet(a: string, b: string): Promise<string | undefined> {
  if (typeof document === 'undefined') return undefined;
  const load = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('reference load failed'));
    img.src = src;
  });
  try {
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    if (!ia.height || !ib.height) return undefined;
    const h = Math.min(1024, Math.max(ia.height, ib.height));
    const wa = Math.round(ia.width * (h / ia.height));
    const wb = Math.round(ib.width * (h / ib.height));
    const gap = 24;
    const canvas = document.createElement('canvas');
    canvas.width = wa + gap + wb;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    // A plain white gutter, so the sheet reads as two separate objects rather than one
    // strange wide product.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(ia, 0, 0, wa, h);
    ctx.drawImage(ib, wa + gap, 0, wb, h);
    return canvas.toDataURL('image/jpeg', 0.92);
  } catch {
    return undefined;
  }
}

/** The uploaded photo a scene's `venueSlot` points at, or undefined when it names none.
 *
 * Declared as a hoisted function on purpose — the regen paths above call it, and a `const`
 * arrow here would be in the temporal dead zone at those call sites. */
function slotPhotoFor(run: ProductionRun, scene: Scene) {
  return scene.venueSlot
    ? run.input.servicePhotos?.find((p) => p.slot === scene.venueSlot)
    : undefined;
}

/** Suffix appended to a hook-morph END prompt when the reference is a composed two-object sheet.
 *
 * Rides NO_UNSOLICITED_PRODUCT's own carve-out ("unless the Scene Prompt explicitly names it")
 * so the sheet's second object stops reading as an invented prop. See buildEndFramePrompt.
 *
 * Names the sheet by its ROLE, never by an ordinal. "Reference Image N" is POSITIONAL — it
 * means whatever landed in parts[N-1] inside generateSceneImage, which pushes avatar →
 * product → continuity and skips any reference that is not an inline data URL. This note
 * said "Reference Image 1" and the sheet arrives as the productUrl, so on the ONLY path that
 * composes a sheet (`reveals` → mode 'both', avatar passed) it pointed at the avatar portrait
 * and the carve-out never reached the sheet — the same positional-ordinal bug generateSceneImage's
 * own continuityIdx comment exists to prevent, and the reason the blank-wordmark fix did not
 * land. The role is unambiguous in every branch that accepts a product photo (DUAL_REFERENCE_LOCK
 * rule 6 "FROM PRODUCT", PRODUCT_IDENTITY_LOCK rule 1) and cannot go stale when the parts
 * order changes, so there is no ordinal to keep in sync. */
export const SHEET_NOTE = ' The product reference image shows TWO real objects, both named by this scene, so neither is an unsolicited prop: reproduce BOTH labels and wordmarks exactly. Do NOT copy their side-by-side layout.';

/** generateSceneImage truncates its prompt at 400 chars from the END. */
export const SCENE_PROMPT_CAP = 400;

/** Build the END-frame prompt, guaranteeing SHEET_NOTE survives the downstream truncation.
 *
 * Appending blind is what makes this fail silently: a long scene prompt pushes the note past
 * 400 chars and it is cut, which on screen is indistinguishable from a note the model ignored.
 * Reserve the note and trim the scene prompt instead. Exported for tests — the sheet path needs
 * a canvas, so this is the only seam that runs in node. */
export function buildEndFramePrompt(scenePrompt: string, hasSheet: boolean): string {
  if (!hasSheet) return scenePrompt;
  return `${scenePrompt.slice(0, Math.max(0, SCENE_PROMPT_CAP - SHEET_NOTE.length))}${SHEET_NOTE}`;
}

/**
 * Render the optional END keyframe for a hook-morph scene (startFramePrompt + endFramePrompt —
 * the storyboard prompt emits the pair for scene-1 visual hooks in every structure). Mirrors
 * utils/sceneRender.ts: the hero photo anchors the end frame ONLY when the prompt actually
 * names the product; a purely abstract-metaphor reveal stays product-free. Returns undefined
 * on failure — endFrame is optional downstream, so a failed end frame degrades the scene to
 * a single-frame render instead of flagging it.
 */
async function renderEndFrame(run: ProductionRun, scene: Scene, sceneIdx: number, deps: ProducerDeps, startFrameUrl?: string): Promise<string | undefined> {
  if (!scene.endFramePrompt) return undefined;
  const productWords = (run.input.productName || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !PRODUCT_STOPWORDS.has(w));
  const reveals = productWords.some((w) => scene.endFramePrompt!.toLowerCase().includes(w));
  // TWO real objects in one frame (the unboxing reveal: product out of its own packaging).
  // One productUrl cannot carry both, so compose a reference sheet when the scene names a
  // slot photo AND the end prompt reveals the product. The identity guard matters: on the
  // product path heroImageBase64 IS servicePhotos[0].url, so a hero-slot scene would
  // otherwise be composited against itself.
  const slot = slotPhotoFor(run, scene);
  const sheet = reveals && slot?.url && run.input.heroImageBase64 && slot.url !== run.input.heroImageBase64
    ? await composeReferenceSheet(slot.url, run.input.heroImageBase64)
    : undefined;
  // Rewritten 2026-08-30 after diagnosing the blank-wordmark defect from Postgres (runs
  // apr_0326cbc4 / apr_c0ddfe27). The sheet arrives as a SINGLE productUrl, and EVERY tuned
  // branch that accepts one carries NO_UNSOLICITED_PRODUCT: "Do NOT add an outer box, carton,
  // sleeve, pouch, gift set, second unit" ('product' rule 8, 'both' rule 10). A two-object
  // sheet IS a second unit, so the model was told to reproduce Reference Image 1 exactly AND
  // to not render what it contains. It split the difference by BLANKING both wordmarks while
  // keeping the unbranded bean window. That selective erasure is the fingerprint: lost
  // resolution blurs a label, it does not delete exactly the class of element a rule names —
  // which is why the earlier resolution/JPEG hypothesis is refuted and raising the sheet's
  // quality would have bought nothing. The lever is rule 8/10's OWN carve-out, "unless the
  // Scene Prompt explicitly names it": naming both objects here makes them solicited.
  //
  // The suffix MUST survive. generateSceneImage truncates at 400 chars from the END, so a long
  // scene prompt silently eats this instruction (measured endFramePrompt: 190 and 194, so the
  // margin is real but thin). Reserve the suffix and trim the scene prompt instead of appending
  // blind — a vanished instruction reads exactly like an ignored one, and costs a run to tell
  // apart.
  const endPrompt = buildEndFramePrompt(scene.endFramePrompt!, !!sheet);
  try {
    return await withRetry(
      () =>
        deps.generateSceneImage(
          endPrompt,
          run.input.aspectRatio === '1:1' ? '1:1' : run.input.aspectRatio,
          '1K',
          // continuityUrl = the START frame of this same beat. The two stills were previously
          // generated from two independent prompts with no sight of each other, so they landed
          // in different rooms at different distances and animated as a blink rather than an
          // unboxing (Neil, 2026-08-30, on a real pair). Passing the frame itself is what makes
          // the end still read as the same take seconds later.
          { avatarUrl: run.input.avatar.url, productUrl: reveals ? (sheet ?? run.input.heroImageBase64) : undefined, continuityUrl: startFrameUrl },
          run.input.avatar.ethnicity,
          [],
          run.input.scriptType,
          run.input.productDescription,
          run.input.productName,
          sceneIdx + 100, // end-frame variation seed — matches utils/sceneRender.ts
          reveals ? 'both' : (scene.referenceImage ?? 'none')
        ),
      MAX_STAGE_ATTEMPTS
    );
  } catch {
    return undefined;
  }
}

async function renderOneScene(run: ProductionRun, job: RenderJob, deps: ProducerDeps, cb: ProducerCallbacks): Promise<string | null> {
  const resolution = run.input.resolution ?? '720p';
  const fallbackModel = routeModel('talking', 'Veo_3.1_Lite', undefined, resolution);
  const model = (job.model ?? fallbackModel) as VideoModelType;
  const duration = job.duration ?? pickSceneDuration('talking', fallbackModel, resolution);
  const inFlight = (status?: SceneJobStatus) => status === 'submitting' || status === 'rendering';

  // A REFUSED frame pair must not keep its downstream action hold. submitVideo strips
  // config.lastFrame when the provider rejects startFrame+endFrame and re-submits single-frame,
  // so the clip carries no morph — but endFrameImageUrl is still set, and the final render would
  // hold ACTION_HOLD_SEC of static tail over padded silence: exactly the dead air the hold exists
  // to remove. The flag rides the job handle, which is what a resumed run re-reads, so this seam
  // reads the same on a fresh submit and on a resume that never submits at all.
  // ASSIGNS, never latches. A reshoot re-renders the end frame and calls this function again,
  // so a scene whose first submit was refused can have its second one ACCEPTED — and a flag that
  // only ever went true would keep the new clip's morph from earning its hold, permanently and
  // invisibly. A missing handle means nothing currently describes this clip (a handle-less orphan
  // on resume), which is not evidence either way, so leave what we already know.
  const noteMorph = (h?: VideoJobHandle | null) => {
    if (!h) return;
    const s = run.scenes.find((x) => x.sceneIdx === job.sceneIdx);
    if (s) s.morphDowngraded = h.morphDowngraded || undefined;
  };

  let claim = await deps.run.claimScene(run.runId, job.sceneIdx);
  noteMorph(claim.jobHandle);
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
    noteMorph(claim.jobHandle);
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
  noteMorph(handle);

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
        // UGC Pro: back-fill the resolved sub-format onto businessInfo so the storyboard
        // stage (which reads businessInfo.ugcProFormat) is always populated, even on the
        // 'Auto' path. Nullish — an explicit user pick is never overwritten.
        if (r.businessInfo && script.ugcProFormatResolved) {
          r.businessInfo.ugcProFormat = r.businessInfo.ugcProFormat ?? script.ugcProFormatResolved;
        }
      });
      await setStage(id, { detail: finalScript[0] ? `"${finalScript[0]}"` : 'Hook locked' });
      return;
    }

    case 'storyboard': {
      // video_prompts split out into its own stage (P3) so it can run PARALLEL to scene_images.
      const sb: StoryboardResponse = await withRetry(
        () => deps.generateStoryboard(run.finalScript!, run.input.avatar.description, run.businessInfo!, run.input.avatar.ethnicity, run.input.language),
        MAX_STAGE_ATTEMPTS,
        bump
      );
      await commit((r) => {
        r.storyboard = sb.scenes;
        r.scenes = sb.scenes.map((_, i) => ({ sceneIdx: i, status: 'pending' as SceneStatus }));
      });
      await setStage(id, { detail: `${sb.scenes.length} scenes` });
      return;
    }

    case 'video_prompts': {
      // Split from storyboard (P3); runs in parallel with scene_images. DEGRADE-on-failure: the
      // driver's degrade path marks this done-with-warning and the video stage keeps its existing
      // `vp?.prompt ?? scene.imagePrompt` fallback, so a failure here never kills the run.
      const storyboard = run.storyboard ?? [];
      const videoPrompts = await withRetry(() => deps.generateVideoPrompts(storyboard, run.businessInfo!), MAX_STAGE_ATTEMPTS, bump);
      await commit((r) => {
        r.videoPrompts = videoPrompts;
      });
      await setStage(id, { detail: `${videoPrompts.length} shot prompts` });
      return;
    }

    case 'thumbnail': {
      // Best-effort cover frame — runs PARALLEL to the video stage via runStagePair (or the
      // driver's defensive branch on resume), always under {degrade}. Already generated (a prior
      // resume) → skip. A real generation failure throws → the degrade wrapper marks the stage
      // done-with-warning; an absent dep/inputs returns undefined → done-with-absent-thumbnail.
      if (run.thumbnailUrl) return;
      const url = await generateThumbnailFor(run, deps);
      if (url) {
        await commit((r) => {
          r.thumbnailUrl = url;
        });
        // Durable cover-frame persistence: the run's OWN small column ('record_thumbnail'),
        // never the checkpoint artifacts jsonb — generateThumbnail returns a base64 data URL.
        // Best-effort, exactly like recordSceneImage: losing this costs the cover frame on a
        // resume (First Cut hides the download), never the run.
        try {
          await deps.run.recordThumbnail?.(run.runId, url);
        } catch { /* best-effort */ }
      }
      await setStage(id, { detail: url ? 'Cover frame ready' : 'No cover frame' });
      return;
    }

    case 'scene_images': {
      const scenes = run.storyboard ?? [];
      // P3: fan out the per-scene image generation with pooled(K=3) instead of the sequential
      // loop. Every per-scene semantic is preserved — resume-skip of done images, hook-morph
      // start/end frame handling, reference-image plumbing, per-scene failure → flagScene (pool
      // stays alive), and an independent commit of each imageUrl as it lands (so the gate screen
      // fills in progressively). The image call path's own retryWithBackoff absorbs the 15/60s
      // rate-limit 429s — no extra retry loop is layered on top of the existing per-scene one.
      await pooled(
        scenes.map((_, i) => i),
        SCENE_IMAGE_CONCURRENCY,
        async (i) => {
          if (cb.signal.aborted) throw new Error('ABORTED');
          const scene = scenes[i];
          const needsMain = !run.scenes.find((s) => s.sceneIdx === i)?.imageUrl; // resume: keep done images
          const needsEnd = !!scene.endFramePrompt && !scene.endFrameImageUrl;
          if (!needsMain && !needsEnd) return;
          const prompt = scene.imagePrompt || scene.startFramePrompt || scene.sceneDescription;
          const mode = scene.referenceImage ?? 'avatar';
          // Hook morph (start+end frame): the START frame is the "before" metaphor and must stay
          // product-free; the hero reference belongs on the END frame (reveal). Mirrors
          // utils/sceneRender.ts so the two surfaces don't drift.
          // SCENE 0 ONLY — see the same note in regenSceneImage. Left unscoped, a frame pair on
          // any other scene switches off BOTH slot routes below and strips that scene back to
          // the hero, undoing the packaging anchor. The index here is `i`, not `sceneIdx`.
          const isHookMorph = i === 0 && !!scene.startFramePrompt && !!scene.endFramePrompt;
          const imgAspect = (run.input.aspectRatio === '1:1' ? '1:1' : run.input.aspectRatio) as '9:16' | '16:9' | '1:1';

          // REAL-PHOTO ROUTING (2026-08-16). Until this landed the producer passed ONLY the
          // avatar + hero, so every `venueSlot` the storyboard emitted was silently discarded and
          // the uploaded before/after photos never reached a single frame — while the upload
          // modal told the user they "anchor the before->after so the AI doesn't invent them".
          // Same class of gap as the dropped endFrame plumbing (format_sample_readiness gate 7):
          // the wizard (utils/sceneRender.ts) had the router, the producer rebuild did not.
          const slotPhoto = scene.venueSlot
            ? run.input.servicePhotos?.find((p) => p.slot === scene.venueSlot)
            : undefined;
          const isAvatarScene = mode === 'avatar' || mode === 'both';
          // A person-STATE slot is the same human in a different condition; a place/product slot
          // is a different subject entirely. They need opposite render modes, so split on it.
          const isPersonStateSlot = scene.venueSlot === 'before'
            || scene.venueSlot === 'after'
            || scene.venueSlot === 'onbody';
          const avatarUrl = run.input.avatar.url;
          // Performer + their real state: lock the FACE to the avatar and the SKIN/BODY STATE to
          // the upload. This is what makes a before/after an actual proof instead of a claim.
          const usePersonState = !!slotPhoto && !isHookMorph && isPersonStateSlot && isAvatarScene && !!avatarUrl;
          // A real place or product state on a scene with no performer: anchor the thing itself.
          const useVenue = !!slotPhoto && !isHookMorph && !isPersonStateSlot && !isAvatarScene;
          const refMode = usePersonState ? 'avatar_state' : useVenue ? 'venue' : mode;
          // THE THIRD CASE, missing until 2026-08-29: a PRODUCT-state slot (packaging, inuse,
          // hero) on a scene that HAS a performer. usePersonState wants a person-state slot;
          // useVenue wants no performer. An unboxing S1/S2 is neither — it is the creator's
          // hands on the real uploaded box — so both tests failed and the slot fell through to
          // the hero, silently. Measured on run apr_ceddf31e: the storyboard emitted
          // venueSlot="packaging" on scenes 1 AND 2 exactly as instructed, and both rendered
          // the hero pouch. Two prompt fixes were spent before the drop was found here.
          // The slot photo now wins over the hero in the fallback too, so the face stays locked
          // to the avatar while the OBJECT locks to the photo the user actually uploaded.
          const refs = usePersonState
            ? { avatarUrl, productUrl: slotPhoto!.url }
            : useVenue
              ? { productUrl: slotPhoto!.url }
              : { avatarUrl, productUrl: isHookMorph ? undefined : (slotPhoto?.url ?? run.input.heroImageBase64) };

          const genMainImage = (variationIndex: number) =>
            deps.generateSceneImage(
              prompt,
              imgAspect,
              '1K',
              refs,
              run.input.avatar.ethnicity,
              [],
              run.input.scriptType,
              run.input.productDescription,
              run.input.productName,
              variationIndex,
              refMode
            );
          try {
            if (needsMain) {
              // variationIndex = the SCENE INDEX, so the 4-angle camera rotation in
              // geminiService (AVATAR_CAMERA_ANGLES, picked by `variationIndex % length`) actually
              // rotates — its whole stated purpose is "consecutive scenes get different
              // framings". Passing a constant 0 pinned every scene to INTIMATE_CLOSE_UP and the
              // rotation contributed nothing, leaving runs of near-identical eye-level frontal
              // shots (Neil's eyeball, 2026-07-25, HIRAYA GLOW run). utils/sceneRender.ts (the
              // wizard path) always passed `index` here, and renderEndFrame below already
              // threads `sceneIdx + 100` — so the constant was an oversight, not a choice.
              let url = await withRetry(() => genMainImage(i), MAX_STAGE_ATTEMPTS, bump);

              // P4 (a) DETERMINISTIC still check (decode/dims/min-res) — the only automated
              // reroll this phase. On failure: ONE fresh reroll (single call, ≤3 gens/scene
              // total with the withRetry budget above); still failing → flag for Gate-1 triage
              // and STOP (skip end frame + AI gate + record for this scene). Skipped entirely
              // when the dep is absent (unit tests) → pre-P4 behavior.
              if (deps.checkSceneImage) {
                const check = await deps.checkSceneImage(url, run.input.aspectRatio);
                if (!check.ok) {
                  emitRunEvent('check_fail', run.runId, { node: 'scene_images', sceneIdx: i, kind: 'deterministic', reason: check.reason });
                  let recovered = false;
                  try {
                    // i + 1 (not a constant 1): still the NEXT framing in the rotation, so the
                    // reroll is visibly different from the attempt that just failed the check —
                    // which is the only reason this call varies the index at all.
                    const reUrl = await genMainImage(i + 1); // one extra attempt total
                    const reCheck = await deps.checkSceneImage(reUrl, run.input.aspectRatio);
                    if (reCheck.ok) {
                      url = reUrl;
                      recovered = true;
                    } else {
                      emitRunEvent('check_fail', run.runId, { node: 'scene_images', sceneIdx: i, kind: 'deterministic', reason: reCheck.reason, reroll: true });
                    }
                  } catch (e: any) {
                    if (e?.message === 'ABORTED') throw e;
                  }
                  if (!recovered) {
                    try { await deps.run.flagScene(run.runId, i, `image_check: ${check.reason}`); } catch { /* best-effort */ }
                    await commit((r) => {
                      const sc = r.scenes.find((s) => s.sceneIdx === i);
                      if (sc) { sc.status = 'flagged'; sc.flaggedReason = `image_check: ${check.reason}`; }
                    });
                    return; // hard-flagged: never render/gate/record a still that fails the deterministic gate
                  }
                }
              }

              await commit((r) => {
                if (r.storyboard) r.storyboard[i].imageUrl = url;
                const sc = r.scenes.find((s) => s.sceneIdx === i);
                if (sc) sc.imageUrl = url;
              });

              // P4 (b) AI IMAGE GATE — best-effort, FLAG-ONLY, fails open. Only scenes whose
              // reference mode implies the locked avatar (identity) or that carry the product
              // (label) are gated; thumbnail/end-frames are not gated this phase. A failing
              // verdict annotates flaggedReason + stores gateVerdict (→ Gate-1 chip) but NEVER
              // changes status (so it can't block approval) or discards the image. Any dep
              // error/timeout is swallowed (fail-open).
              if (deps.imageGateCheck) {
                // Widen to string so the brief's full identity set (incl. 'avatar_venue', which
                // Scene.referenceImage can't currently emit) stays future-proof if the type grows.
                const gateMode: string = mode;
                const wantIdentity = gateMode === 'avatar' || gateMode === 'both' || gateMode === 'avatar_venue';
                const wantLabel = gateMode === 'product' || gateMode === 'both';
                if (wantIdentity || wantLabel) {
                  // SKIP 2 — the identity half of the check silently no-ops when the avatar
                  // reference isn't an inline image: the gate returns personMatchesReference:null
                  // (identity NEVER checked) yet pass:true, indistinguishable from a real pass.
                  // Happens after a reload/cross-device resume — slimCheckpointInput drops any
                  // oversized `data:` string from the checkpointed input. Only a data URL is
                  // usable: the gate feeds it to inlineData (api/_lib/imageGate.ts splitImageData),
                  // so a remote URL would be sent as bogus base64. VISIBILITY ONLY — the gate call
                  // below still fires exactly as before (the label half is still worth running,
                  // and changing call volume would move COGS).
                  const identityRefUsable = typeof run.input.avatar?.url === 'string' && run.input.avatar.url.startsWith('data:');
                  if (wantIdentity && !identityRefUsable) {
                    emitRunEvent('check_skip', run.runId, { node: 'scene_images', sceneIdx: i, kind: 'gate', reason: 'no_identity_reference' });
                  }
                  try {
                    const gateRes = await deps.imageGateCheck({
                      imageBase64: url,
                      referenceImageBase64: wantIdentity ? run.input.avatar.url : undefined,
                      expectedLabelText: wantLabel ? run.input.productName : undefined,
                      referenceMode: mode,
                      sceneIdx: i,
                    });
                    await commit((r) => {
                      const sc = r.scenes.find((s) => s.sceneIdx === i);
                      if (sc) sc.gateVerdict = gateRes.verdict;
                    });
                    // SKIP 3 — the SERVER failed the gate open. api/_lib/imageGate.ts swallows any
                    // vision/parse error and returns 200 with {pass:true, reason:'gate_unavailable'},
                    // so it never throws and the catch below never sees it. Without this the
                    // non-run was invisible: the 2026-07-25 flag-ON run had 2 of 9 scenes fail open
                    // with ZERO check_skip rows, making the "gate didn't actually run" rate
                    // uncountable — precisely the metric contamination the check_skip/check_fail
                    // split exists to prevent (see RunEventName in api/_lib/runEvents.ts). Emitted
                    // as check_skip, not check_fail, because the check genuinely never ran.
                    if (gateRes.verdict.reason === 'gate_unavailable') {
                      const detail = (gateRes.verdict as { detail?: string }).detail;
                      emitRunEvent('check_skip', run.runId, {
                        node: 'scene_images', sceneIdx: i, kind: 'gate', reason: 'gate_unavailable',
                        ...(detail ? { detail } : {}),
                      });
                    }
                    // FLAG-ONLY: a failing verdict lives ONLY in gateVerdict (the Gate-1 chip keys
                    // off gateVerdict.pass). flaggedReason is reserved for HARD flags (image_check /
                    // render failures) that set status='flagged' and block approval — a soft gate
                    // verdict never touches status or flaggedReason.
                    if (!gateRes.verdict.pass) {
                      emitRunEvent('check_fail', run.runId, { node: 'scene_images', sceneIdx: i, kind: 'gate', flags: gateRes.verdict.flags });
                    }
                  } catch (gateErr) {
                    // SKIP 1 — the gate never ran (429 on the shared image bucket, 55s abort,
                    // 503 kill switch…). Still fully swallowed: no flag, no block, no status
                    // change. The event only makes the non-run COUNTABLE, so flag-ON precision
                    // isn't computed over runs where the gate was silently absent.
                    const { reason, detail } = classifyGateSkip(gateErr);
                    emitRunEvent('check_skip', run.runId, { node: 'scene_images', sceneIdx: i, kind: 'gate', reason, ...(detail ? { detail } : {}) });
                  }
                }
              }
            }
            if (needsEnd) {
              const endUrl = await renderEndFrame(run, scene, i, deps, scene.imageUrl);
              await commit((r) => {
                if (r.storyboard) r.storyboard[i].endFrameImageUrl = endUrl;
              });
            }
            // Durable image persistence: the scene's OWN small row ('record_image'), never the fat
            // checkpoint jsonb (slimmed at the transport boundary). Best-effort — a miss only means
            // a coarser resume for this scene, never a lost render.
            //
            // The gate verdict rides along on this same write. It is read back off the run (the
            // gate's commit above set it there, not on `scene`) and is deliberately DURABLE: the
            // checkpoint jsonb it also lives in is overwritten on every transition, so before this
            // the per-scene verdict dataset — the entire product of the flag-only phase — was lost
            // each run. `undefined` (gate off / never reached) omits the field so the stored value
            // is left untouched, rather than being stomped to null.
            if (scene.imageUrl) {
              try {
                const verdict = run.scenes.find((s) => s.sceneIdx === i)?.gateVerdict;
                await deps.run.recordSceneImage(
                  run.runId, i, scene.imageUrl, scene.endFrameImageUrl,
                  verdict ? (verdict as unknown as Record<string, unknown>) : undefined,
                );
              } catch { /* best-effort */ }
            }
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
      );
      // pooled() swallows a worker's throw to keep the pool alive; surface an in-flight abort at
      // the stage boundary so the driver stops before the gate instead of parking mid-abort.
      if (cb.signal.aborted) throw new Error('ABORTED');
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
      // No-TTS runs (Pure Hype): music leads and SFX + overlay text carry the message, so there
      // is no voiceover to consolidate. Scenes keep no audioUrl → the EDL's audioOverlayAttached:no
      // is already structurally valid. The stage still ends 'done' (the driver marks it after return).
      if (run.input.audioMode === 'sfx_only') {
        await setStage(id, { detail: 'No voiceover — music + SFX ad' });
        return;
      }
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
          if (sc && res.audioUrl) {
            sc.audioUrl = res.audioUrl;
            // Keep the forced alignment paired with the MP3 it measured (see the reshoot path).
            sc.words = alignedWords(res);
          }
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
      // No-VO (Pure Hype): no subtitles, no full-clip hook hold, and fast EDL-driven cuts.
      const sfxOnly = run.input.audioMode === 'sfx_only';
      const scenes: FinalRenderScene[] = run.scenes
        .filter((s) => s.videoUrl)
        .map((s) => {
          const isHook = s.sceneIdx === 0;
          const scriptLine = run.storyboard?.[s.sceneIdx]?.scriptLine ?? '';
          const estimate = estimateSpokenSec(scriptLine);
          const plan = run.edl?.scenes.find((e) => e.sceneIdx === s.sceneIdx);
          // No-VO pacing: target the EDL keep-segment total, clamped to the fast-cut window
          // (hook 2–4s, body 1.2–3.5s) → 7 scenes ≈ 15–20s. A missing/empty/zero total falls
          // back to a punchy constant. Fast-cut window is non-tuned code, adjustable post-autopsy.
          const keptSec = sfxOnly
            ? plan?.keepSegments?.reduce((sum, seg) => sum + Math.max(0, seg.endSec - seg.startSec), 0)
            : undefined;
          const segSec = keptSec && keptSec > 0 ? keptSec : undefined;
          const sfxTarget = isHook ? clamp(segSec ?? 3.0, 2.0, 4.0) : clamp(segSec ?? 2.5, 1.2, 3.5);
          return {
            sceneIdx: s.sceneIdx,
            videoUrl: s.videoUrl as string,
            audioUrl: s.audioUrl ?? null,
            keepFullClip: sfxOnly ? false : isHook,
            targetDurationSec: sfxOnly ? sfxTarget : (isHook || estimate <= 0 ? null : estimate),
            overlayText: plan?.overlayText,
            sfxCues: plan?.sfxCues,
            transitionIn: plan?.transitionIn,
            // No-VO kills subtitle captions; EDL overlayText still burns.
            scriptLine: sfxOnly ? '' : scriptLine,
            // Measured VO word timings → the renderer anchors trim + overlay clamp on real
            // speech-end instead of silencedetect. Omitted in exactly the cases scriptLine is
            // blanked or there is no VO at all (no-VO run / audio-less scene) — there is no
            // speech to anchor to, and the silence/keepSegments path is the right one there.
            voiceWords: sfxOnly || !s.audioUrl ? undefined : s.words,
            sceneType: run.videoPrompts?.[s.sceneIdx]?.type ?? 'b-roll',
            // A frame PAIR means the storyboard decided this clip transforms between
            // two states, which is the only per-scene action signal we have. Read off
            // the storyboard, same object scriptLine comes from. No default: an unknown
            // scene must NOT inherit the hold.
            // `&& !morphDowngraded`: the stills are only half the signal. A provider that
            // refused the pair rendered a single-frame clip, which has no action to finish.
            hasEndFrame: !!run.storyboard?.[s.sceneIdx]?.endFrameImageUrl && !s.morphDowngraded,
            isHook,
          };
        });
      if (scenes.length === 0) throw new Error('NO_RENDERED_SCENES');
      // Deterministic style override: a UGCPro run always burns the 'ugcpro'
      // caption/music identity (hype word-pop) — we KNOW the scriptType, so we
      // don't ask the EDL (which mis-detects UGCPro as testimonial → CLEAN preset,
      // burying the P1/P2 caption bet). Non-UGCPro keeps the EDL-detected style.
      const isUgcPro = run.input.scriptType === 'UGCPro';
      const isAsmr = run.businessInfo?.asmrFlag ?? run.input.asmrFlag ?? false;
      const music = {
        style: isUgcPro ? ('ugcpro' as const) : (run.edl?.meta.scriptStyleDetected ?? 'mrbeast'),
        // ASMR is an audio-led format — the taps/handling ARE the audio; a music
        // bed buries them. User-flippable downstream; this only seeds the default.
        // No-VO (Pure Hype): music IS the audio → force-enabled + 'lead' role (higher gain,
        // no VO ducking). This overrides the ASMR disable; ASMR × product_ugc can't co-occur.
        enabled: sfxOnly ? true : !isAsmr,
        role: sfxOnly ? ('lead' as const) : undefined,
      };
      const req: FinalRenderRequest = {
        scenes,
        aspectRatio: run.input.aspectRatio,
        music,
        // AUTO (Decision 8) = omit preset so the server rotates; IMPACT/CLEAN lock it.
        preset: run.presetId ? { id: run.presetId } : undefined,
      };
      // Failed-status renders (incl. the poll watchdog's 'watchdog_stalled') must
      // throw INSIDE withRetry so the stage actually re-fires once — the render
      // service resolves (not throws) on a failed sidecar, and a throw out here
      // would skip the retry the watchdog design counts on (plan §3.10).
      const result = await withRetry(async () => {
        const r = await deps.renderFinalVideo(req);
        if (r.status === 'failed' || !r.url) throw new Error(r.error ?? 'RENDER_FAILED');
        return r;
      }, MAX_STAGE_ATTEMPTS, bump);
      await commit((r) => {
        r.finalVideoUrl = result.url;
        r.finalDownloadUrl = result.downloadUrl ?? result.url;
      });
      return;
    }
  }
}
