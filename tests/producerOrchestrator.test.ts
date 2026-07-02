import { describe, it, expect, vi } from 'vitest';
import {
  createProductionRun,
  runProduction,
  approveStoryboard,
  applyPreset,
  regenSceneImage,
  reshootScene,
  assembleFinalScript,
  mapReportToWizard,
  deriveAngleBrief,
  aspectRatioToPlatform,
  pickSceneDuration,
  researchCacheKey,
  type ProductionInput,
  type ProducerDeps,
  type ProductionRun,
  type ProducerRunStore,
  type ProductionStageId,
  type VideoJobHandle,
} from '../services/producerOrchestrator.js';
import type { MarketResearchReport, Script, Scene, VideoPrompt } from '../types.js';

// ---------------------------------------------------------------------------
// The spend-bearing Producer state machine. Ported + extended from the dead
// blueprint test (components/OneShotAd/_fable5-recovered/autopilotOrchestrator.test.ts)
// against the CURRENT producerOrchestrator API: renamed types (ProductionRun /
// ProductionInput / ProducerDeps / ProducerRunStore), the split submitVideo /
// pollVideo deps (replacing the old runQueue), the run-store's recordScene /
// changed:boolean writes, the `busy` field, and the two human gates. Every path
// asserts BOTH the state transition AND the spend-count invariant via the fake
// deps' call counters (submitVideo/pollVideo) and the fake store's write counters.
// ---------------------------------------------------------------------------

// --- Fixtures -------------------------------------------------------------

const REPORT: MarketResearchReport = {
  subject: 'Brew',
  winningAvatar: 'Burned-out owner Bryan',
  demographics: '27-42, PH SMB',
  dayInTheLife: '...',
  bleedingNeck: 'Content eats my day',
  deepFear: '...',
  threeAmThought: 'Maybe I am not cut out for this',
  graveyard: [],
  objectionToUs: 'Just another AI tool',
  magicGenie: 'Ads that convert on autopilot',
  emotionalPayoff: 'Freedom from the grind',
  statusUpgrade: '...',
  bigIdea: 'Stop grinding, start shipping',
  headlines: ['h1'],
  videoHooks: [{ type: 'Pattern Interrupt', visual: 'v', spokenLine: 'Tignan mo to' } as any],
  villain: 'The P30K agency',
  competitorMatrix: [],
  fbAdLibraryAngles: [{ format: 'Testimonial', angle: 'real-talk', openingLine: 'Akala ko scam', whyItWorks: 'trust' } as any],
  rawEvidence: [],
  contrarianTruth: 'Process is not the moat',
  narrativeReport: '# report',
};

const SCRIPT: Script = { hook1: ['Hook one'], hook2: ['Hook two'], body: ['Body A', 'Body B'] } as any;

/** Two-scene storyboard (no imageUrl — scene_images sets it). */
const STORYBOARD_SCENES: Scene[] = [
  { scriptLine: 'Line 0', sceneDescription: 'd0', imagePrompt: 'IMG0', referenceImage: 'avatar' },
  { scriptLine: 'Line 1', sceneDescription: 'd1', imagePrompt: 'IMG1', referenceImage: 'product' },
];

const VIDEO_PROMPTS: VideoPrompt[] = [
  { scriptLine: 'Line 0', type: 'talking', prompt: 'P0' },
  { scriptLine: 'Line 1', type: 'b-roll', prompt: 'P1' },
];

/** Intake payload exercising the Phase-A guided fields (Service vertical). */
function makeInput(over: Partial<ProductionInput> = {}): ProductionInput {
  return {
    brandName: 'Brew',
    offer: 'Buy 1 Take 1',
    price: 'P199',
    productName: 'Bukidnon Brew',
    productDescription: 'Single-origin coffee',
    heroImageBase64: 'data:image/png;base64,AAAA',
    avatar: { url: 'avatar.png', description: 'a Filipino host', ethnicity: 'Filipino', prompt: '' },
    voiceId: 'voice_pinoy_1',
    language: 'Taglish',
    aspectRatio: '9:16',
    scriptType: 'Services',
    servicePhotos: [{ url: 'svc://exterior', slot: 'exterior', description: 'storefront' }],
    serviceArchetype: 'venue',
    isLocalService: true,
    businessAddress: '123 Sample St, Cebu City',
    ...over,
  };
}

// --- Fake run-store -------------------------------------------------------

interface FakeSceneRow {
  status: 'pending' | 'submitting' | 'rendering' | 'done' | 'flagged' | 'failed';
  jobHandle: VideoJobHandle | null;
  videoUrl: string | null;
  audioUrl: string | null;
  flaggedReason: string | null;
  /** Simulated ">10min untouched" — the requeue guard's stale-escape precondition. */
  stale: boolean;
}

const freshRow = (over: Partial<FakeSceneRow> = {}): FakeSceneRow => ({
  status: 'pending',
  jobHandle: null,
  videoUrl: null,
  audioUrl: null,
  flaggedReason: null,
  stale: false,
  ...over,
});

/**
 * In-memory ProducerRunStore that mirrors api/producer/advance.ts's guarded
 * transitions: claim flips only from 'pending'; record guards status='submitting';
 * complete guards submitting|rendering; requeue is allowed from flagged/done/failed
 * OR a stale handle-less 'submitting' OR a stale 'rendering'. Every method is a vi.fn
 * so the tests can assert spend/write invariants via call counts.
 */
function makeFakeStore(seed: Record<number, Partial<FakeSceneRow>> = {}) {
  const rows = new Map<number, FakeSceneRow>();
  for (const [k, v] of Object.entries(seed)) rows.set(Number(k), freshRow(v));

  const store: ProducerRunStore = {
    seedScenes: vi.fn(async (_runId: string, count: number) => {
      for (let i = 0; i < count; i++) if (!rows.has(i)) rows.set(i, freshRow()); // idempotent: never resets in-flight
    }),
    claimScene: vi.fn(async (_runId: string, i: number) => {
      const s = rows.get(i);
      if (!s) return { claimed: false };
      if (s.status === 'pending') {
        s.status = 'submitting'; // atomic pending → submitting; only the winner submits
        return { claimed: true };
      }
      return { claimed: false, status: s.status, videoUrl: s.videoUrl, audioUrl: s.audioUrl, jobHandle: s.jobHandle };
    }),
    recordScene: vi.fn(async (_runId: string, i: number, handle: VideoJobHandle) => {
      const s = rows.get(i);
      if (s && s.status === 'submitting') {
        s.jobHandle = handle;
        s.status = 'rendering';
        return { changed: true };
      }
      return { changed: false }; // scene left 'submitting' under us → lost race
    }),
    // Image persistence rides its own upsert (row may not exist pre-seed) and touches ONLY
    // the image columns — mirrors advance.ts 'record_image'.
    recordSceneImage: vi.fn(async (_runId: string, i: number, _imageUrl: string, _endFrameUrl?: string) => {
      if (!rows.has(i)) rows.set(i, freshRow());
      return { changed: true };
    }),
    completeScene: vi.fn(async (_runId: string, i: number, videoUrl: string, audioUrl?: string) => {
      const s = rows.get(i);
      if (s && (s.status === 'submitting' || s.status === 'rendering')) {
        s.status = 'done';
        s.videoUrl = videoUrl;
        if (audioUrl !== undefined) s.audioUrl = audioUrl;
        return { changed: true };
      }
      return { changed: false };
    }),
    flagScene: vi.fn(async (_runId: string, i: number, reason?: string) => {
      const s = rows.get(i);
      if (s) {
        s.status = 'flagged';
        s.flaggedReason = reason ?? null;
        return { changed: true };
      }
      return { changed: false };
    }),
    requeueScene: vi.fn(async (_runId: string, i: number) => {
      const s = rows.get(i);
      if (!s) return { changed: false };
      const allowed =
        ['flagged', 'done', 'failed'].includes(s.status) ||
        (s.status === 'submitting' && !s.jobHandle && s.stale) ||
        (s.status === 'rendering' && s.stale);
      if (allowed) {
        Object.assign(s, freshRow()); // → pending, clears handle/urls/flag
        return { changed: true };
      }
      return { changed: false };
    }),
  };
  return { store, rows };
}

// --- Fake deps ------------------------------------------------------------

function makeFakeDeps(over: Partial<ProducerDeps> = {}, storeSeed: Record<number, Partial<FakeSceneRow>> = {}) {
  let clock = 1_000;
  const { store, rows } = makeFakeStore(storeSeed);

  const spies = {
    generateMarketResearch: vi.fn(async () => REPORT),
    generateAdScript: vi.fn(async () => SCRIPT),
    generateStoryboard: vi.fn(async () => ({ scenes: STORYBOARD_SCENES.map((s) => ({ ...s })), strategicAudit: '' })),
    generateVideoPrompts: vi.fn(async () => VIDEO_PROMPTS.map((v) => ({ ...v }))),
    generateSceneImage: vi.fn(async (prompt: string) => `img://${prompt}`),
    generateEditDecisionList: vi.fn(async () => ({
      meta: { totalDurationSec: 10, aspectRatio: '9:16', targetPlatform: 'tiktok', hookStrategy: 'h', formulaApplied: [], scriptStyleDetected: 'testimonial' },
      scenes: [
        { sceneIdx: 0, overlayText: [], sfxCues: [] },
        { sceneIdx: 1, overlayText: [], sfxCues: [] },
      ],
      globalSfxPicks: [],
      formulaCheck: { rulesApplied: [], weaknessesFlagged: [] },
    })),
    consolidateVoices: vi.fn(async (scenes: { sceneIdx: number }[]) => scenes.map((s) => ({ sceneIdx: s.sceneIdx, audioUrl: `aud://${s.sceneIdx}` }))),
    renderFinalVideo: vi.fn(async () => ({ done: true, status: 'done', url: 'final.mp4', downloadUrl: 'final-dl.mp4' })),
    submitVideo: vi.fn(async (config: any, opts: any): Promise<VideoJobHandle> => ({
      operation: {},
      prompt: config.prompt,
      sceneIdx: opts?.sceneIdx,
      model: config.model,
      aspectRatio: config.aspectRatio,
      duration: config.duration,
    })),
    pollVideo: vi.fn(async (handle: VideoJobHandle) => ({ url: `vid://${handle.sceneIdx}`, downloadUrl: 'd', mimeType: 'video/mp4' })),
    persist: vi.fn(async () => {}),
    now: vi.fn(() => clock++),
  };

  const deps = { ...spies, run: store, ...over } as unknown as ProducerDeps;
  return { deps, spies, store, rows };
}

/** Callback factory — optional onUpdate/signal so tests can observe transitions / abort. */
function cb(opts: { onUpdate?: (r: ProductionRun) => void; signal?: AbortSignal } = {}) {
  return { onUpdate: opts.onUpdate ?? (() => {}), signal: opts.signal ?? new AbortController().signal, userId: 'u1' };
}

/** A run parked at the video stage (all pre-video stages done, storyboard approved, images set). */
function videoStageRun(sceneCount = 1): ProductionRun {
  const storyboard: Scene[] = STORYBOARD_SCENES.slice(0, sceneCount).map((s, i) => ({ ...s, imageUrl: `img://IMG${i}` }));
  const doneStages: ProductionStageId[] = ['market_research', 'script', 'storyboard', 'scene_images'];
  return createProductionRun(makeInput(), 'u1', {
    doneStages,
    prefill: {
      storyboardApproved: true,
      report: REPORT,
      script: SCRIPT,
      finalScript: assembleFinalScript(SCRIPT),
      ...mapReportToWizard(makeInput(), REPORT),
      storyboard,
      videoPrompts: VIDEO_PROMPTS.slice(0, sceneCount).map((v) => ({ ...v })),
    },
  });
}

/** Drive a fresh run all the way to the First Cut gate (through the storyboard gate). */
async function runToFirstCut() {
  const harness = makeFakeDeps();
  const history: string[] = [];
  const run = createProductionRun(makeInput(), 'u1');
  const callbacks = cb({ onUpdate: (r) => history.push(`${r.status}:${r.gate ?? ''}`) });
  await runProduction(run, callbacks, harness.deps);
  await approveStoryboard(run, callbacks, harness.deps);
  return { ...harness, run, history, callbacks };
}

// --- Pure-helper tests ----------------------------------------------------

describe('producer pure helpers', () => {
  it('assembleFinalScript auto-picks hook1 + body', () => {
    expect(assembleFinalScript(SCRIPT)).toEqual(['Hook one', 'Body A', 'Body B']);
  });

  it('mapReportToWizard threads the Phase-A guided fields onto the wizard businessInfo', () => {
    const input = makeInput();
    const { clientDetails, businessInfo } = mapReportToWizard(input, REPORT);
    expect(clientDetails).toEqual({ brandName: 'Brew', offer: 'Buy 1 Take 1' });
    expect(businessInfo.painPoint).toBe('Content eats my day');
    expect(businessInfo.servicePhotos).toEqual(input.servicePhotos);
    expect(businessInfo.serviceArchetype).toBe('venue');
    expect(businessInfo.businessType).toBe('service');
  });

  it('deriveAngleBrief uses the first FB ad-library angle', () => {
    expect(deriveAngleBrief(REPORT)).toContain('Akala ko scam');
  });

  it('aspectRatioToPlatform maps ratios to platforms', () => {
    expect(aspectRatioToPlatform('9:16')).toBe('tiktok');
    expect(aspectRatioToPlatform('16:9')).toBe('youtube');
    expect(aspectRatioToPlatform('1:1')).toBe('reels');
  });

  it('researchCacheKey normalizes brand + product (casing/whitespace agnostic)', () => {
    expect(researchCacheKey('  Brew ', 'Bukidnon BREW')).toBe('brew::bukidnon brew');
    expect(researchCacheKey('Brew', 'Bukidnon Brew')).toBe(researchCacheKey('BREW', ' bukidnon brew '));
  });

  it('pickSceneDuration never emits a model-invalid duration', () => {
    expect([4, 6, 8]).toContain(pickSceneDuration('talking', 'Veo_3.1_Lite', '720p'));
    expect([8]).toContain(pickSceneDuration('talking', 'Veo_3.1_Lite', '1080p'));
    expect([5, 10]).toContain(pickSceneDuration('b-roll', 'Kling_3_0', '720p'));
  });
});

// --- 1. Happy path --------------------------------------------------------

describe('runProduction — happy path (parks at both gates, one submit per scene)', () => {
  it('threads input, parks at the storyboard gate, resumes on approval, reaches first_cut', async () => {
    const { deps, spies, rows } = makeFakeDeps();
    const run = createProductionRun(makeInput(), 'u1');

    // Pass 1: runs pre-video stages then PARKS at the storyboard gate — no spend yet.
    const gated = await runProduction(run, cb(), deps);
    expect(gated.status).toBe('review');
    expect(gated.gate).toBe('storyboard');
    expect(spies.submitVideo).not.toHaveBeenCalled(); // gate is BEFORE the expensive render
    expect(spies.generateMarketResearch).toHaveBeenCalledTimes(1);
    expect(spies.generateStoryboard).toHaveBeenCalledTimes(1);
    expect(spies.generateSceneImage).toHaveBeenCalledTimes(2);

    // Phase-A guided fields reach the research call...
    expect(spies.generateMarketResearch).toHaveBeenCalledWith(
      expect.objectContaining({ isLocalService: true, businessAddress: '123 Sample St, Cebu City', uploadedImages: ['data:image/png;base64,AAAA'] })
    );
    // ...and the wizard mapping (via mapReportToWizard on businessInfo).
    expect(gated.businessInfo?.serviceArchetype).toBe('venue');
    expect(gated.businessInfo?.servicePhotos).toEqual(makeInput().servicePhotos);
    expect(gated.businessInfo?.businessType).toBe('service');

    // Pass 2: approve the gate → resume through video/voices/edl/final_render → first_cut.
    const out = await approveStoryboard(run, cb(), deps);
    expect(out.status).toBe('review');
    expect(out.gate).toBe('first_cut');
    expect(out.stages.every((s) => s.status === 'done')).toBe(true);
    expect(out.scenes.map((s) => s.status)).toEqual(['done', 'done']);
    expect(out.scenes.map((s) => s.videoUrl)).toEqual(['vid://0', 'vid://1']);
    expect(out.finalVideoUrl).toBe('final.mp4');
    expect(out.finalDownloadUrl).toBe('final-dl.mp4');

    // Spend invariant: EXACTLY one submitVideo + one complete per scene.
    expect(spies.submitVideo).toHaveBeenCalledTimes(2);
    expect(store2Count(deps, 'completeScene')).toBe(2);
    expect(rows.get(0)?.status).toBe('done');
    expect(rows.get(1)?.status).toBe('done');
  });
});

// helper: read a store method's call count off the deps
function store2Count(deps: ProducerDeps, method: keyof ProducerRunStore): number {
  return (deps.run[method] as unknown as { mock: { calls: unknown[] } }).mock.calls.length;
}

// --- 2. Resume skips completed stages -------------------------------------

describe('runProduction — resume skips completed stages', () => {
  it('a run aborted after storyboard resumes without re-running done stages', async () => {
    // Pass 1: abort the moment the storyboard stage completes.
    const h1 = makeFakeDeps();
    const controller = new AbortController();
    const run = createProductionRun(makeInput(), 'u1');
    const onUpdate = (r: ProductionRun) => {
      if (r.stages.find((s) => s.id === 'storyboard')?.status === 'done' && r.storyboard) controller.abort();
    };
    await runProduction(run, cb({ onUpdate, signal: controller.signal }), h1.deps);
    expect(run.stages.find((s) => s.id === 'storyboard')?.status).toBe('done');
    expect(run.stages.find((s) => s.id === 'scene_images')?.status).not.toBe('done');
    expect(h1.spies.generateSceneImage).not.toHaveBeenCalled(); // never reached

    // Pass 2: resume the SAME run with fresh spies — completed stages are skipped.
    const h2 = makeFakeDeps();
    const out = await runProduction(run, cb(), h2.deps);
    expect(h2.spies.generateMarketResearch).not.toHaveBeenCalled();
    expect(h2.spies.generateAdScript).not.toHaveBeenCalled();
    expect(h2.spies.generateStoryboard).not.toHaveBeenCalled();
    // ...but the unfinished stage DID run, then parked at the storyboard gate.
    expect(h2.spies.generateSceneImage).toHaveBeenCalledTimes(2);
    expect(out.status).toBe('review');
    expect(out.gate).toBe('storyboard');
  });
});

// --- 3. Record/poll resume (B1 spine) -------------------------------------

describe('renderOneScene — resume polls a recorded handle instead of re-submitting', () => {
  it('a scene left submitting WITH a recorded handle is POLLED (no re-spend) and completed', async () => {
    const recordedHandle: VideoJobHandle = { operation: {}, prompt: 'P0', sceneIdx: 0, model: 'Veo_3.1_Lite', aspectRatio: '9:16', duration: 6 };
    const { deps, spies, rows } = makeFakeDeps({}, { 0: { status: 'submitting', jobHandle: recordedHandle } });
    const run = videoStageRun(1);

    const out = await runProduction(run, cb(), deps);

    expect(spies.pollVideo).toHaveBeenCalledTimes(1); // polled the recorded handle
    expect(spies.submitVideo).not.toHaveBeenCalled(); // NO provider re-spend
    expect(store2Count(deps, 'completeScene')).toBe(1);
    expect(rows.get(0)?.status).toBe('done');
    expect(out.scenes[0].status).toBe('done');
    expect(out.scenes[0].videoUrl).toBe('vid://0');
    expect(out.status).toBe('review');
    expect(out.gate).toBe('first_cut');
  });
});

// --- 4. Handle-less orphan ------------------------------------------------

describe('renderOneScene — handle-less orphan requeues + reclaims + re-submits once', () => {
  it('a stale submitting scene with no handle takes the single-extra-render path', async () => {
    // stale:true so the requeue guard permits the handle-less 'submitting' escape.
    const { deps, spies, rows } = makeFakeDeps({}, { 0: { status: 'submitting', jobHandle: null, stale: true } });
    const run = videoStageRun(1);

    const out = await runProduction(run, cb(), deps);

    expect(store2Count(deps, 'requeueScene')).toBeGreaterThanOrEqual(1);
    expect(spies.submitVideo).toHaveBeenCalledTimes(1); // exactly one re-submit after reclaim
    expect(store2Count(deps, 'completeScene')).toBe(1);
    expect(rows.get(0)?.status).toBe('done');
    expect(out.scenes[0].status).toBe('done');
    expect(out.scenes[0].videoUrl).toBe('vid://0');
  });
});

// --- 5. Lost race on record -----------------------------------------------

describe('renderOneScene — lost race on recordScene does not double-complete', () => {
  it('recordScene returning changed:false makes the orchestrator re-read and adopt the winner url', async () => {
    const { deps, spies, rows } = makeFakeDeps();
    const run = videoStageRun(1);

    // Simulate another driver finishing the scene between our submit and our record:
    // record reports the lost race (changed:false) and the row is already 'done' with a foreign url.
    (deps.run.recordScene as any).mockImplementation(async (_r: string, i: number) => {
      const s = rows.get(i)!;
      s.status = 'done';
      s.videoUrl = `vid://foreign/${i}`;
      return { changed: false };
    });

    const out = await runProduction(run, cb(), deps);

    expect(spies.submitVideo).toHaveBeenCalledTimes(1); // we DID spend before discovering the race
    expect(spies.pollVideo).not.toHaveBeenCalled(); // re-read short-circuits before polling
    expect(store2Count(deps, 'completeScene')).toBe(0); // never double-completes
    expect(out.scenes[0].videoUrl).toBe('vid://foreign/0'); // adopted the winner's url
    expect(out.scenes[0].status).toBe('done');
    expect(out.status).toBe('review');
    expect(out.gate).toBe('first_cut');
  });
});

// --- 6. Retry-then-flag ---------------------------------------------------

describe('runProduction — retry-then-flag (a bad scene gates, never errors the whole run)', () => {
  it('flags a scene whose image fails all retries, renders the rest, reaches first_cut', async () => {
    const imageMock = vi.fn(async (prompt: string) => {
      if (prompt === 'IMG0') throw new Error('image 502');
      return `img://${prompt}`;
    });
    const { deps, spies } = makeFakeDeps({ generateSceneImage: imageMock as any });
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps); // parks at storyboard gate with scene 0 flagged
    const out = await approveStoryboard(run, cb(), deps);

    expect(out.status).toBe('review');
    expect(out.gate).toBe('first_cut'); // partial failure still gates
    expect(out.scenes[0].status).toBe('flagged');
    expect(out.scenes[0].flaggedReason).toContain('image');
    expect(out.scenes[1].status).toBe('done');
    // IMG0 retried MAX_STAGE_ATTEMPTS (2) times before flagging.
    expect(imageMock.mock.calls.filter((c) => c[0] === 'IMG0')).toHaveLength(2);
    // Spend invariant: only the surviving scene is submitted (flagged scene has no image → skipped).
    expect(spies.submitVideo).toHaveBeenCalledTimes(1);
    expect(out.finalVideoUrl).toBe('final.mp4');
  });

  it('flags a scene whose video submit fails, keeps the rest, still gates', async () => {
    const submitMock = vi.fn(async (config: any, opts: any): Promise<VideoJobHandle> => {
      if (opts?.sceneIdx === 1) throw new Error('veo 500');
      return { operation: {}, prompt: config.prompt, sceneIdx: opts?.sceneIdx, model: config.model, aspectRatio: config.aspectRatio, duration: config.duration };
    });
    const { deps } = makeFakeDeps({ submitVideo: submitMock as any });
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps);
    const out = await approveStoryboard(run, cb(), deps);

    expect(out.status).toBe('review');
    expect(out.gate).toBe('first_cut');
    expect(out.scenes[0].status).toBe('done');
    expect(out.scenes[1].status).toBe('flagged');
    expect(out.scenes[1].flaggedReason).toContain('video');
    expect(store2Count(deps, 'flagScene')).toBeGreaterThanOrEqual(1);
  });
});

// --- 7. Gates are persist-backed; Phase-C gate semantics ------------------

describe('gates — park/resume are persist-backed and stay parked during busy ops', () => {
  it('every transition is persisted (persist paired with onUpdate) and passes through both gates', async () => {
    const { spies, run, history } = await runToFirstCut();
    expect(history).toContain('review:storyboard');
    expect(history).toContain('review:first_cut');
    // commit()/setStage() always persist BEFORE onUpdate → the counts match exactly (persist-after-every-transition).
    expect(spies.persist.mock.calls.length).toBe(history.length);
    expect(run.status).toBe('review');
    expect(run.gate).toBe('first_cut');
  });

  it('applyPreset re-assembles WITHOUT leaving the gate, busy set during then cleared', async () => {
    const { deps, spies, run } = await runToFirstCut();
    const busyLog: (string | undefined)[] = [];
    const callbacks = cb({ onUpdate: (r) => busyLog.push(r.busy) });
    const rendersBefore = spies.renderFinalVideo.mock.calls.length;

    const out = await applyPreset(run, 'impact', callbacks, deps);

    expect(out.presetId).toBe('impact');
    expect(out.status).toBe('review'); // never bounced to RunningScreen
    expect(out.gate).toBe('first_cut');
    expect(busyLog).toContain('preset'); // busy set during the op
    expect(out.busy).toBeUndefined(); // cleared after
    expect(spies.renderFinalVideo.mock.calls.length).toBe(rendersBefore + 1); // re-assemble only
    expect(spies.submitVideo).toHaveBeenCalledTimes(2); // no video re-gen beyond the original two
  });

  it('reshootScene re-runs one scene at the gate, busy set during then cleared, one re-submit', async () => {
    const { deps, spies, run } = await runToFirstCut();
    const submitsBefore = spies.submitVideo.mock.calls.length; // 2 from the happy path
    const takesBefore = run.takesUsed;
    const busyLog: (string | undefined)[] = [];
    const callbacks = cb({ onUpdate: (r) => busyLog.push(r.busy) });

    const out = await reshootScene(run, 1, callbacks, deps);

    expect(out.scenes[1].status).toBe('done');
    expect(out.scenes[1].videoUrl).toBe('vid://1');
    expect(out.status).toBe('review');
    expect(out.gate).toBe('first_cut');
    expect(busyLog).toContain('reshoot');
    expect(out.busy).toBeUndefined();
    expect(store2Count(deps, 'requeueScene')).toBeGreaterThanOrEqual(1);
    expect(spies.submitVideo.mock.calls.length).toBe(submitsBefore + 1); // exactly one re-submit
    // NOTE: reshootScene does NOT bump takesUsed — that is the caller's job
    // (components/OneShotAd/ProducerFlow.tsx:264 mutates run.takesUsed BEFORE calling
    // reshootScene, so reshootScene's own persist() checkpoints it). The orchestrator
    // unit leaves takesUsed untouched; the brief's "reshoot bumps takesUsed" lives in the UI.
    expect(out.takesUsed).toBe(takesBefore);
  });
});

// --- 8. regenSceneImage is image-only -------------------------------------

describe('regenSceneImage — image-only regenerate at the storyboard gate (no spend)', () => {
  it('regenerates the scene image without ever touching video/poll', async () => {
    const { deps, spies } = makeFakeDeps();
    const run = createProductionRun(makeInput(), 'u1');
    await runProduction(run, cb(), deps); // park at the storyboard gate (images built, no video)

    spies.generateSceneImage.mockClear();
    spies.submitVideo.mockClear();

    const out = await regenSceneImage(run, 0, cb(), deps);

    expect(spies.generateSceneImage).toHaveBeenCalledTimes(1);
    expect(spies.submitVideo).not.toHaveBeenCalled(); // image only — no expensive render
    expect(spies.pollVideo).not.toHaveBeenCalled();
    expect(store2Count(deps, 'claimScene')).toBe(0); // never enters the fan-out claim path
    expect(out.scenes[0].imageUrl).toBe('img://IMG0');
    expect(out.scenes[0].status).toBe('pending'); // image ready, back to gate-ready (not rendering)
  });
});

// --- 9. Abort mid fan-out -------------------------------------------------

describe('runProduction — abort mid fan-out stops work without erroring the whole run', () => {
  it('aborting during the video poll leaves the run running (not error), skips downstream stages', async () => {
    const controller = new AbortController();
    const { deps, spies } = makeFakeDeps();
    // Abort the signal while polling (mid fan-out) — deterministic regardless of pool interleaving.
    (deps.pollVideo as any).mockImplementation(async () => {
      controller.abort();
      throw new Error('ABORTED');
    });
    const run = videoStageRun(2);

    const out = await runProduction(run, cb({ signal: controller.signal }), deps);

    // Whole run is NOT flagged error — the fan-out isolates per-scene failures + the loop
    // bails at the next stage boundary on the aborted signal.
    expect(out.status).not.toBe('error');
    expect(out.error).toBeUndefined();
    // Work stopped at the fan-out boundary: downstream stages never ran.
    expect(spies.consolidateVoices).not.toHaveBeenCalled();
    expect(spies.renderFinalVideo).not.toHaveBeenCalled();
    expect(store2Count(deps, 'completeScene')).toBe(0); // nothing completed after the abort
    // NOTE (asymmetry): abort leaves the run in 'running' (no terminal 'aborted'/'review' state),
    // and submits already fired are NOT hard-cancelled — the two scenes were submitted+recorded
    // before pollVideo aborted, so "stops work" is best-effort at the stage/fan-out boundary,
    // not a mid-flight provider cancel. Matches current behavior.
    expect(out.status).toBe('running');
    expect(spies.submitVideo).toHaveBeenCalledTimes(2);
  });
});

// --- 10. End-frame (hook morph) generation ---------------------------------
// The storyboard prompt emits startFramePrompt + endFramePrompt for scene-1 visual
// hooks (all structures). The producer must render BOTH keyframes and thread the end
// frame to the video job — mirroring utils/sceneRender.ts's morph heuristics (start
// frame product-free, hero anchors the end frame only when the prompt names the product).

/** Scene 0 is a hook morph (no imagePrompt — main falls back to startFramePrompt). */
const MORPH_SCENES: Scene[] = [
  { scriptLine: 'Hook', sceneDescription: 'metaphor', startFramePrompt: 'START0', endFramePrompt: 'END0 Bukidnon Brew bottle reveal', transitionEffect: 'morph', referenceImage: 'none' },
  { scriptLine: 'Line 1', sceneDescription: 'd1', imagePrompt: 'IMG1', referenceImage: 'product' },
];

function makeMorphDeps(over: Partial<ProducerDeps> = {}) {
  return makeFakeDeps({
    generateStoryboard: vi.fn(async () => ({ scenes: MORPH_SCENES.map((s) => ({ ...s })), strategicAudit: '' })) as any,
    ...over,
  });
}

describe('end-frame (hook morph) generation', () => {
  it('scene_images renders BOTH keyframes for a morph scene: product-free start, hero-anchored reveal end', async () => {
    const { deps, spies } = makeMorphDeps();
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps); // parks at the storyboard gate

    // 3 image gens: START0 + END0 (scene 0 morph) + IMG1 (scene 1 single-frame).
    expect(spies.generateSceneImage).toHaveBeenCalledTimes(3);
    const calls = spies.generateSceneImage.mock.calls as any[];
    const startCall = calls.find((c) => c[0] === 'START0')!;
    const endCall = calls.find((c) => String(c[0]).startsWith('END0'))!;
    const plainCall = calls.find((c) => c[0] === 'IMG1')!;
    // Morph START frame = the "before" metaphor → product-free; plain scenes keep the hero ref.
    expect(startCall[3]).toEqual({ avatarUrl: 'avatar.png', productUrl: undefined });
    expect(plainCall[3]).toEqual({ avatarUrl: 'avatar.png', productUrl: 'data:image/png;base64,AAAA' });
    // END frame names the product ("Bukidnon Brew") → hero-anchored, 'both' mode, +100 seed.
    expect(endCall[3]).toEqual({ avatarUrl: 'avatar.png', productUrl: 'data:image/png;base64,AAAA' });
    expect(endCall[9]).toBe(100);
    expect(endCall[10]).toBe('both');
    // Both urls persisted on the storyboard scene.
    expect(run.storyboard![0].imageUrl).toBe('img://START0');
    expect(run.storyboard![0].endFrameImageUrl).toBe('img://END0 Bukidnon Brew bottle reveal');
    expect(run.storyboard![1].endFrameImageUrl).toBeUndefined();
  });

  it('an abstract end frame (prompt does not name the product) stays product-free', async () => {
    const abstract: Scene[] = [{ ...MORPH_SCENES[0], endFramePrompt: 'ENDX smoke plume dissolving' }, { ...MORPH_SCENES[1] }];
    const { deps, spies } = makeFakeDeps({
      generateStoryboard: vi.fn(async () => ({ scenes: abstract.map((s) => ({ ...s })), strategicAudit: '' })) as any,
    });
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps);

    const endCall = (spies.generateSceneImage.mock.calls as any[]).find((c) => String(c[0]).startsWith('ENDX'))!;
    expect(endCall[3]).toEqual({ avatarUrl: 'avatar.png', productUrl: undefined });
    expect(endCall[10]).toBe('none'); // falls back to the scene's own referenceImage
  });

  it('the video fan-out threads the end frame to submitVideo (morph scene only)', async () => {
    const { deps, spies } = makeMorphDeps();
    const run = createProductionRun(makeInput(), 'u1');
    const callbacks = cb();

    await runProduction(run, callbacks, deps);
    await approveStoryboard(run, callbacks, deps);

    expect(spies.submitVideo).toHaveBeenCalledTimes(2);
    const submits = spies.submitVideo.mock.calls as any[];
    const scene0 = submits.find((c) => c[1].sceneIdx === 0)!;
    const scene1 = submits.find((c) => c[1].sceneIdx === 1)!;
    expect(scene0[0].startFrame).toBe('img://START0');
    expect(scene0[0].endFrame).toBe('img://END0 Bukidnon Brew bottle reveal');
    expect(scene1[0].endFrame).toBeUndefined();
  });

  it('end-frame failure degrades to a single-frame scene — never flags, never blocks the gate', async () => {
    const { deps, spies } = makeMorphDeps();
    (spies.generateSceneImage as any).mockImplementation(async (prompt: string) => {
      if (prompt.startsWith('END0')) throw new Error('img gen down');
      return `img://${prompt}`;
    });
    const run = createProductionRun(makeInput(), 'u1');

    const out = await runProduction(run, cb(), deps);

    expect(out.status).not.toBe('error');
    expect(out.gate).toBe('storyboard'); // still parks at the gate
    expect(out.storyboard![0].imageUrl).toBe('img://START0'); // main frame intact
    expect(out.storyboard![0].endFrameImageUrl).toBeUndefined(); // degraded to single frame
    expect(out.scenes[0].status).not.toBe('flagged');
  });

  it('regenSceneImage regenerates the PAIR for a morph scene (start+end stay in sync)', async () => {
    const storyboard: Scene[] = MORPH_SCENES.map((s, i) => ({ ...s, imageUrl: `img://old-${i}`, ...(s.endFramePrompt ? { endFrameImageUrl: 'img://old-end' } : {}) }));
    const run = createProductionRun(makeInput(), 'u1', {
      doneStages: ['market_research', 'script', 'storyboard', 'scene_images'],
      prefill: {
        report: REPORT,
        script: SCRIPT,
        finalScript: assembleFinalScript(SCRIPT),
        ...mapReportToWizard(makeInput(), REPORT),
        storyboard,
        videoPrompts: VIDEO_PROMPTS.map((v) => ({ ...v })),
      },
    });
    const { deps, spies } = makeMorphDeps();

    await regenSceneImage(run, 0, cb(), deps);

    expect(spies.generateSceneImage).toHaveBeenCalledTimes(2); // start + end, nothing else
    expect(run.storyboard![0].imageUrl).toBe('img://START0');
    expect(run.storyboard![0].endFrameImageUrl).toBe('img://END0 Bukidnon Brew bottle reveal');
    // Start frame stays product-free on regen too.
    const startCall = (spies.generateSceneImage.mock.calls as any[]).find((c) => c[0] === 'START0')!;
    expect(startCall[3]).toEqual({ avatarUrl: 'avatar.png', productUrl: undefined });
  });

  it('reshootScene re-renders the pair and threads the FRESH end frame to the reshoot video', async () => {
    const { deps, spies } = makeMorphDeps();
    const run = createProductionRun(makeInput(), 'u1');
    const callbacks = cb();
    await runProduction(run, callbacks, deps);
    await approveStoryboard(run, callbacks, deps); // → First Cut, scenes done
    (spies.submitVideo as any).mockClear();

    await reshootScene(run, 0, callbacks, deps);

    expect(spies.submitVideo).toHaveBeenCalledTimes(1);
    const cfg = (spies.submitVideo.mock.calls as any[])[0][0];
    expect(cfg.startFrame).toBe('img://START0');
    expect(cfg.endFrame).toBe('img://END0 Bukidnon Brew bottle reveal');
  });
});

// --- 11. Durable scene-image persistence (the checkpoint-size fix) ----------
// Scene images are multi-MB base64 blobs. They persist ONCE per scene on their own
// producer_scenes row ('record_image') and are STRIPPED from the run-header checkpoint
// (slimCheckpointArtifacts) — fat jsonb checkpoints hit statement timeouts, went stale,
// and made resume re-buy images (2026-07-02 SIGLA smoke).

describe('scene-image persistence (checkpoint-size fix)', () => {
  it('scene_images records each scene image (+ end frame when morphing) on its own row', async () => {
    const { deps, store } = makeMorphDeps();
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps);

    expect(store.recordSceneImage).toHaveBeenCalledTimes(2);
    expect(store.recordSceneImage).toHaveBeenCalledWith(run.runId, 0, 'img://START0', 'img://END0 Bukidnon Brew bottle reveal');
    expect(store.recordSceneImage).toHaveBeenCalledWith(run.runId, 1, 'img://IMG1', undefined);
  });

  it('a failed image-row write never breaks the stage (best-effort, coarser resume only)', async () => {
    const { deps, store } = makeMorphDeps();
    (store.recordSceneImage as any).mockRejectedValue(new Error('db down'));
    const run = createProductionRun(makeInput(), 'u1');

    const out = await runProduction(run, cb(), deps);

    expect(out.status).not.toBe('error');
    expect(out.gate).toBe('storyboard'); // still parks at the gate, images intact in memory
    expect(out.storyboard![0].imageUrl).toBe('img://START0');
  });

  it('regen + reshoot refresh the durable image row', async () => {
    const { deps, store, spies } = makeMorphDeps();
    const run = createProductionRun(makeInput(), 'u1');
    const callbacks = cb();
    await runProduction(run, callbacks, deps);
    (store.recordSceneImage as any).mockClear();

    await regenSceneImage(run, 0, callbacks, deps);
    expect(store.recordSceneImage).toHaveBeenCalledWith(run.runId, 0, 'img://START0', 'img://END0 Bukidnon Brew bottle reveal');

    await approveStoryboard(run, callbacks, deps);
    (store.recordSceneImage as any).mockClear();
    await reshootScene(run, 1, callbacks, deps);
    expect(store.recordSceneImage).toHaveBeenCalledWith(run.runId, 1, 'img://IMG1', undefined);
    expect(spies.submitVideo).toHaveBeenCalled();
  });
});
