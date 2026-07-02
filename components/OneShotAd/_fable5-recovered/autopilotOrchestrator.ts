import type {
  Avatar,
  BusinessInfo,
  ClientDetails,
  ConsolidationResult,
  ConsolidationScene,
  EditDecisionInput,
  EditDecisionList,
  EditTargetPlatform,
  FinalRenderRequest,
  FinalRenderResult,
  FinalRenderScene,
  MarketResearchInput,
  MarketResearchReport,
  Scene,
  Script,
  StabilityMode,
  StoryboardResponse,
  VideoModelType,
  VideoPrompt,
} from '../types';
import { estimateSpokenSec } from '../utils/spokenDuration';
// Type-only — elided at runtime, so the orchestrator never pulls the heavy
// geminiService chain into a unit-test import. The real wiring lives in
// services/autopilotDeps.ts (the app's default deps).
import type { RenderJob, RunQueueOpts } from '../components/GenerateVideo/RenderAllRunner';

/**
 * One-Shot Ad (Autopilot) — headless, client-side, RESUMABLE orchestrator.
 *
 * Chains the EXISTING pipeline service functions end-to-end so a single click
 * produces a finished ad with one human gate (the First Cut review). It does
 * NOT reimplement any AI flow — it only sequences the same tuned functions the
 * manual wizard/modules already call, persisting state after every stage so a
 * reload/reboot resumes from the last completed stage instead of re-spending.
 *
 * Stochastic-failure policy (locked product decision): auto-retry each stage;
 * if a scene still fails, mark it `flagged`, assemble the ad anyway, and let the
 * user one-tap reshoot it at the review gate. The run never hard-stops on a
 * single bad scene — only a fatal early-stage failure (research/script) aborts.
 *
 * Service calls are injected via `deps` so the unit tests exercise the state
 * machine (advance / persist→resume / retry-then-flag) against mocks with ZERO
 * real API spend. The app uses the real-services default.
 */

export type AutopilotStageId =
  | 'market_research'
  | 'script'
  | 'storyboard'
  | 'scene_images'
  | 'video'
  | 'voices'
  | 'edl'
  | 'final_render';

export type StageStatus = 'pending' | 'running' | 'done' | 'failed';

export interface AutopilotStageState {
  id: AutopilotStageId;
  /** Outcome-framed UI label ("Researching your market", not "calling MarketMind"). */
  label: string;
  status: StageStatus;
  /** A short proof-of-work line revealed on completion ("Found your customer's #1 fear"). */
  detail?: string;
  error?: string;
  attempts: number;
}

export type SceneStatus = 'pending' | 'rendering' | 'done' | 'flagged';

export interface AutopilotSceneState {
  sceneIdx: number;
  status: SceneStatus;
  imageUrl?: string;
  videoUrl?: string;
  audioUrl?: string;
  /** Why this scene needs a reshoot (image/video/voice failure). */
  flaggedReason?: string;
}

/** Everything the intake form collects (3 hero inputs + Customize-drawer defaults). */
export interface AutopilotInput {
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
  /** When true, ignore any cached market research for this product and run fresh
   * (the intake "Re-research" toggle). Default: reuse the cache when present. */
  forceFreshResearch?: boolean;
}

export type AutopilotRunStatus = 'running' | 'review' | 'done' | 'error';

export interface AutopilotRun {
  runId: string;
  userId: string;
  createdAt: number;
  updatedAt: number;
  status: AutopilotRunStatus;
  input: AutopilotInput;
  stages: AutopilotStageState[];
  scenes: AutopilotSceneState[];
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
}

/**
 * Injected service surface — structural signatures so the orchestrator stays
 * decoupled from the concrete service modules (no heavy import). The app passes
 * `realAutopilotDeps` from services/autopilotDeps.ts; tests pass mocks.
 */
export interface AutopilotDeps {
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
    referenceImageMode?: 'avatar' | 'product' | 'both' | 'none'
  ) => Promise<string>;
  generateVideoPrompts: (storyboard: Scene[], businessInfo: BusinessInfo) => Promise<VideoPrompt[]>;
  generateEditDecisionList: (input: EditDecisionInput) => Promise<EditDecisionList>;
  consolidateVoices: (scenes: ConsolidationScene[], voiceId: string, stabilityMode?: StabilityMode) => Promise<ConsolidationResult[]>;
  renderFinalVideo: (req: FinalRenderRequest, onProgress?: (s: 'processing') => void) => Promise<FinalRenderResult>;
  runQueue: (jobs: RenderJob[], opts: RunQueueOpts) => Promise<void>;
  /** Persist after every state change so a reload can resume. */
  persist: (run: AutopilotRun) => Promise<void>;
  /** Market-research cache (optional — absent in tests). Reuse a product's
   * research across runs for consistent targeting + one fewer research call. */
  getCachedResearch?: (key: string) => Promise<MarketResearchReport | null>;
  putCachedResearch?: (key: string, report: MarketResearchReport) => Promise<void>;
  now: () => number;
}

export interface AutopilotCallbacks {
  /** Fired after every state mutation so the UI can re-render live. */
  onUpdate: (run: AutopilotRun) => void;
  signal: AbortSignal;
  userId: string;
}

const STAGE_ORDER: { id: AutopilotStageId; label: string }[] = [
  { id: 'market_research', label: 'Researching your market' },
  { id: 'script', label: 'Writing your hook' },
  { id: 'storyboard', label: 'Designing your scenes' },
  { id: 'scene_images', label: 'Building your visuals' },
  { id: 'video', label: 'Filming your scenes' },
  { id: 'voices', label: 'Recording the voiceover' },
  { id: 'edl', label: 'Cutting the edit' },
  { id: 'final_render', label: 'Final cut' },
];

const MAX_STAGE_ATTEMPTS = 2;

/** Create a fresh run record with all stages pending. */
export function createAutopilotRun(input: AutopilotInput, userId: string, now: () => number = Date.now): AutopilotRun {
  const ts = now();
  return {
    runId: `osa_${ts}_${Math.round((ts % 1000) + ts / 1e6) % 100000}`,
    userId,
    createdAt: ts,
    updatedAt: ts,
    status: 'running',
    input,
    stages: STAGE_ORDER.map((s) => ({ id: s.id, label: s.label, status: 'pending' as StageStatus, attempts: 0 })),
    scenes: [],
  };
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-testable on their own)
// ---------------------------------------------------------------------------

/** Mirrors EditVideo.tsx's local aspectRatioToPlatform. */
export function aspectRatioToPlatform(ar: '9:16' | '16:9' | '1:1'): EditTargetPlatform {
  if (ar === '16:9') return 'youtube';
  if (ar === '1:1') return 'reels';
  return 'tiktok';
}

/**
 * Project the MarketMind report onto the wizard fields the way the Director AI
 * auto-prefill does (App.tsx) — research is load-bearing context for the script.
 */
export function mapReportToWizard(input: AutopilotInput, report: MarketResearchReport): { clientDetails: ClientDetails; businessInfo: BusinessInfo } {
  return {
    clientDetails: { brandName: input.brandName, offer: input.offer },
    businessInfo: {
      product: input.productName,
      audience: report.winningAvatar || report.demographics || '',
      benefit: report.emotionalPayoff || report.magicGenie || input.offer,
      painPoint: report.bleedingNeck || report.threeAmThought || '',
      separator: report.contrarianTruth || report.villain || '',
      features: input.productDescription,
      productImageUrls: [input.heroImageBase64],
      productImageDescription: input.productDescription,
      scriptType: input.scriptType,
    },
  };
}

/** Stable cache key for a product's market research — normalized brand+product
 * so casing/whitespace don't fragment the cache. */
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

/**
 * Per-model, per-resolution valid clip durations — a tiny inline mirror of
 * VIDEO_MODEL_SPECS.durationsByResolution (geminiService.ts). Kept here so the
 * orchestrator never pulls the heavy geminiService chain into its unit-test
 * import (same convention as routeModel). Keep in sync if the specs change.
 */
const VALID_DURATIONS: Record<VideoModelType, Record<'720p' | '1080p', number[]>> = {
  'Veo_3.1_Lite':         { '720p': [4, 6, 8], '1080p': [8] }, // Lite HARD-locks 1080p to 8s
  'Veo_3.1_Fast':         { '720p': [4, 6, 8], '1080p': [4, 6, 8] },
  'Veo_3.1_Quality':      { '720p': [4, 6, 8], '1080p': [4, 6, 8] },
  'Kling_3_0':            { '720p': [5, 10], '1080p': [5, 10] },
  'Kling_O1':             { '720p': [5, 10], '1080p': [5, 10] },
  'Seedance_2_0_Fast':    { '720p': [5, 10], '1080p': [5, 10] },
  'Seedance_2_0_Quality': { '720p': [5, 10], '1080p': [5, 10] },
};

/**
 * v1 per-scene clip duration — always a value VALID for the routed model at the
 * chosen resolution, so a talking scene (Veo) never throws INVALID_COMBO the way
 * the old flat `5` did (Veo @720p only accepts [4,6,8]). Hook/b-roll stay short
 * for pacing (Kling → 5); talking/cinematic get a slightly longer clip. The live
 * smoke (the you-and-me gate) later reconciles this with GenerateVideo's exact
 * word-count smart-duration math; this guarantees a renderable value meanwhile.
 */
export function pickSceneDuration(
  type: VideoPrompt['type'],
  model: VideoModelType,
  resolution: '720p' | '1080p' = '720p'
): number {
  const valid = VALID_DURATIONS[model]?.[resolution] ?? [8];
  const target = type === 'talking' || type === 'cinematic' ? 6 : 5;
  return valid.includes(target) ? target : valid.find((d) => d >= target) ?? valid[0];
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

// ---------------------------------------------------------------------------
// Driver
// ---------------------------------------------------------------------------

/** Pure copy of RenderAllRunner.autoRouteModelForType (kept inline to avoid the
 * heavy geminiService import chain). hook(scene0,b-roll)→Omni; talking→Veo;
 * b-roll/cinematic→Kling 3.0; else fallback. Resolution-aware: at 1080p the
 * talking engine steps up Veo Lite→Fast because Lite hard-locks 1080p to 8s
 * only (Fast keeps the flexible [4,6,8] set). Kling already does 1080p natively
 * so the b-roll/hook routes are unchanged. */
function routeModel(
  type: VideoPrompt['type'],
  fallback: VideoModelType,
  sceneIdx?: number,
  resolution: '720p' | '1080p' = '720p'
): VideoModelType {
  if (sceneIdx === 0 && type === 'b-roll') return 'Kling_O1';
  if (type === 'talking') return resolution === '1080p' ? 'Veo_3.1_Fast' : 'Veo_3.1_Lite';
  if (type === 'b-roll') return 'Kling_3_0';
  if (type === 'cinematic') return 'Kling_3_0';
  return fallback;
}

export async function runAutopilot(
  initial: AutopilotRun,
  cb: AutopilotCallbacks,
  deps: AutopilotDeps
): Promise<AutopilotRun> {
  let run = initial;

  const commit = async (mut: (r: AutopilotRun) => void) => {
    mut(run);
    run.updatedAt = deps.now();
    await deps.persist(run);
    cb.onUpdate(run);
  };

  const setStage = (id: AutopilotStageId, patch: Partial<AutopilotStageState>) =>
    commit((r) => {
      const st = r.stages.find((s) => s.id === id);
      if (st) Object.assign(st, patch);
    });

  for (const { id } of STAGE_ORDER) {
    if (cb.signal.aborted) return run;
    const stage = run.stages.find((s) => s.id === id)!;
    if (stage.status === 'done') continue; // resume: skip completed stages

    await setStage(id, { status: 'running', error: undefined });
    try {
      await runStage(id, run, deps, cb, setStage);
      await setStage(id, { status: 'done' });
    } catch (e: any) {
      if (e?.message === 'ABORTED') return run;
      // Fatal: an early planning stage failed unrecoverably → abort the run.
      await setStage(id, { status: 'failed', error: e?.message ?? 'STAGE_FAILED' });
      await commit((r) => {
        r.status = 'error';
        r.error = `${id}: ${e?.message ?? 'failed'}`;
      });
      return run;
    }
  }

  await commit((r) => {
    // Reached the end → hand to the First Cut review gate.
    r.status = 'review';
  });
  return run;
}

/**
 * Reshoot a single scene from the First Cut review (one-tap regenerate). Re-runs
 * that scene's image → video → voice, then re-assembles the final cut. Used for
 * a flagged scene OR a scene the user simply wants re-rolled. Returns the
 * updated run (back in `review` on success).
 */
export async function reshootScene(
  run: AutopilotRun,
  sceneIdx: number,
  cb: AutopilotCallbacks,
  deps: AutopilotDeps
): Promise<AutopilotRun> {
  const commit = async (mut: (r: AutopilotRun) => void) => {
    mut(run);
    run.updatedAt = deps.now();
    await deps.persist(run);
    cb.onUpdate(run);
  };
  const scene = run.storyboard?.[sceneIdx];
  const sc = run.scenes.find((s) => s.sceneIdx === sceneIdx);
  if (!scene || !sc) return run;

  await commit((r) => {
    r.status = 'running';
    const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
    s.status = 'rendering';
    s.flaggedReason = undefined;
  });

  try {
    // 1. Image
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
      r.scenes.find((x) => x.sceneIdx === sceneIdx)!.imageUrl = imageUrl;
    });

    // 2. Video
    const vp = run.videoPrompts?.[sceneIdx];
    const type = vp?.type ?? 'b-roll';
    const resolution = run.input.resolution ?? '720p';
    const model = routeModel(type, 'Veo_3.1_Lite', sceneIdx, resolution);
    const fallbackModel = routeModel('talking', 'Veo_3.1_Lite', undefined, resolution);
    let videoUrl: string | undefined;
    await deps.runQueue(
      [{ sceneIdx, prompt: vp?.prompt ?? prompt, startFrame: imageUrl, endFrame: scene.endFrameImageUrl, duration: pickSceneDuration(type, model, resolution), model }],
      {
        config: { model: fallbackModel, duration: pickSceneDuration('talking', fallbackModel, resolution), resolution, aspectRatio: run.input.aspectRatio, audioEnabled: true },
        signal: cb.signal,
        userId: cb.userId,
        onEvent: (evt) => {
          if (evt.type === 'status' && evt.status === 'done' && evt.result) videoUrl = evt.result.url;
        },
      }
    );
    if (!videoUrl) throw new Error('reshoot video failed');
    await commit((r) => {
      r.scenes.find((x) => x.sceneIdx === sceneIdx)!.videoUrl = videoUrl;
    });

    // 3. Voice
    const voiceRes = await deps.consolidateVoices(
      [{ sceneIdx, type, scriptLine: scene.scriptLine, videoUrl }],
      run.input.voiceId,
      run.input.stabilityMode ?? 'robust'
    );
    const audioUrl = voiceRes.find((v) => v.sceneIdx === sceneIdx)?.audioUrl ?? null;
    await commit((r) => {
      const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
      if (audioUrl) s.audioUrl = audioUrl;
      s.status = 'done';
    });

    // 4. Re-assemble the final cut + back to review.
    await runStage('final_render', run, deps, cb, async (id, patch) => {
      await commit((r) => {
        const st = r.stages.find((x) => x.id === id);
        if (st) Object.assign(st, patch);
      });
    });
    await commit((r) => {
      r.status = 'review';
    });
  } catch (e: any) {
    await commit((r) => {
      const s = r.scenes.find((x) => x.sceneIdx === sceneIdx)!;
      s.status = 'flagged';
      s.flaggedReason = `reshoot: ${e?.message ?? 'failed'}`;
      r.status = 'review';
    });
  }
  return run;
}

async function runStage(
  id: AutopilotStageId,
  run: AutopilotRun,
  deps: AutopilotDeps,
  cb: AutopilotCallbacks,
  setStage: (id: AutopilotStageId, patch: Partial<AutopilotStageState>) => Promise<void>
): Promise<void> {
  const commit = async (mut: (r: AutopilotRun) => void) => {
    mut(run);
    run.updatedAt = deps.now();
    await deps.persist(run);
    cb.onUpdate(run);
  };
  const bump = (n: number) => void setStage(id, { attempts: n });

  switch (id) {
    case 'market_research': {
      const cacheKey = researchCacheKey(run.input.brandName, run.input.productName);
      // Reuse this product's research (consistent targeting + one fewer call)
      // unless the user asked for a fresh run via the intake "Re-research" toggle.
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
              isLocalService: false,
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
      await setStage(id, {
        detail: fromCache ? 'Reused your saved market research' : report.threeAmThought ? 'Found your customer’s #1 fear' : 'Mapped your market',
      });
      return;
    }

    case 'script': {
      const script = await withRetry(
        () =>
          deps.generateAdScript(
            run.businessInfo!,
            run.input.brandName,
            run.input.language,
            run.input.offer,
            deriveAngleBrief(run.report!),
            run.report!.contrarianTruth ?? ''
          ),
        MAX_STAGE_ATTEMPTS,
        bump
      );
      const finalScript = assembleFinalScript(script);
      await commit((r) => {
        r.script = script;
        r.finalScript = finalScript;
      });
      await setStage(id, { detail: finalScript[0] ? `“${finalScript[0]}”` : 'Hook locked' });
      return;
    }

    case 'storyboard': {
      const sb: StoryboardResponse = await withRetry(
        () =>
          deps.generateStoryboard(
            run.finalScript!,
            run.input.avatar.description,
            run.businessInfo!,
            run.input.avatar.ethnicity,
            run.input.language
          ),
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
          // Stochastic image failure → flag the scene, keep going (retry-then-flag).
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
      const fallbackModel = routeModel('talking', 'Veo_3.1_Lite', undefined, resolution);
      const jobs: RenderJob[] = scenes
        .map((scene, i): RenderJob | null => {
          if (!scene.imageUrl) return null; // image flagged → can't render; already flagged
          const vp = run.videoPrompts?.[i];
          const type = vp?.type ?? 'b-roll';
          const model = routeModel(type, 'Veo_3.1_Lite', i, resolution);
          return {
            sceneIdx: i,
            prompt: vp?.prompt ?? scene.imagePrompt ?? scene.sceneDescription,
            startFrame: scene.imageUrl,
            endFrame: scene.endFrameImageUrl,
            duration: pickSceneDuration(type, model, resolution),
            model,
          };
        })
        .filter((j): j is RenderJob => j !== null);

      await deps.runQueue(jobs, {
        // v1 defaults; reconciled with GenerateVideo during the live smoke gate.
        config: { model: fallbackModel, duration: pickSceneDuration('talking', fallbackModel, resolution), resolution, aspectRatio: run.input.aspectRatio, audioEnabled: true },
        signal: cb.signal,
        userId: cb.userId,
        onEvent: (evt) => {
          if (evt.type !== 'status') return;
          void commit((r) => {
            const sc = r.scenes.find((s) => s.sceneIdx === evt.sceneIdx);
            if (!sc) return;
            if (evt.status === 'rendering') sc.status = 'rendering';
            else if (evt.status === 'done' && evt.result) {
              sc.status = 'done';
              sc.videoUrl = evt.result.url;
            } else if (evt.status === 'failed') {
              sc.status = 'flagged';
              sc.flaggedReason = `video: ${evt.error ?? 'failed'}`;
            }
          });
        },
      });
      return;
    }

    case 'voices': {
      const rendered = run.scenes.filter((s) => s.videoUrl);
      if (rendered.length === 0) return; // nothing to voice
      const consolidationScenes: ConsolidationScene[] = rendered.map((s) => ({
        sceneIdx: s.sceneIdx,
        type: run.videoPrompts?.[s.sceneIdx]?.type ?? 'b-roll',
        scriptLine: run.storyboard?.[s.sceneIdx]?.scriptLine ?? '',
        videoUrl: s.videoUrl,
      }));
      const results: ConsolidationResult[] = await withRetry(
        () => deps.consolidateVoices(consolidationScenes, run.input.voiceId, run.input.stabilityMode ?? 'robust'),
        MAX_STAGE_ATTEMPTS,
        bump
      );
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
      const audioOverlays = rendered
        .filter((s) => s.audioUrl)
        .map((s) => ({ sceneIdx: s.sceneIdx, audioUrl: s.audioUrl as string }));
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
      // Mirrors EditVideo.tsx handleRenderFinal's FinalRenderScene assembly exactly.
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
      const req: FinalRenderRequest = { scenes, aspectRatio: run.input.aspectRatio, music };
      const result: FinalRenderResult = await withRetry(() => deps.renderFinalVideo(req), MAX_STAGE_ATTEMPTS, bump);
      if (result.status === 'failed' || !result.url) throw new Error(result.error ?? 'RENDER_FAILED');
      await commit((r) => {
        r.finalVideoUrl = result.url;
        r.finalDownloadUrl = result.downloadUrl ?? result.url;
      });
      return;
    }
  }
}
