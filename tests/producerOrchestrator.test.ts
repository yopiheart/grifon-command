import { describe, it, expect, vi, beforeEach } from 'vitest';

// Run events leave the orchestrator through services/analyticsService.trackEvent. Under the
// node test env that call already no-ops (isBrowser() is false), so replacing it costs no
// fidelity and turns the emitted event stream into an assertable seam — section 22 reads it.
const { trackEventMock } = vi.hoisted(() => ({ trackEventMock: vi.fn(async () => {}) }));
vi.mock('../services/analyticsService.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/analyticsService.js')>();
  return { ...actual, trackEvent: trackEventMock };
});

import {
  createProductionRun,
  runProduction,
  approveStoryboard,
  applyPreset,
  regenSceneImage,
  reshootScene,
  IDENTITY_REF_LOST_REASON,
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
import { gateDepsFor } from '../services/producerDeps.js';
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
  /** Mirrors producer_scenes.gate_verdict. Starts null, exactly like the real column. */
  gateVerdict: Record<string, unknown> | null;
}

const freshRow = (over: Partial<FakeSceneRow> = {}): FakeSceneRow => ({
  status: 'pending',
  jobHandle: null,
  videoUrl: null,
  audioUrl: null,
  flaggedReason: null,
  stale: false,
  gateVerdict: null,
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
    recordSceneImage: vi.fn(async (
      _runId: string, i: number, _imageUrl: string, _endFrameUrl?: string,
      gateVerdict?: Record<string, unknown> | null,
    ) => {
      if (!rows.has(i)) rows.set(i, freshRow());
      // Reproduce advance.ts 'record_image' three-state semantics EXACTLY: Supabase writes only
      // the keys present in the upsert object, so an ABSENT gateVerdict leaves the stored value
      // untouched while an explicit null clears it. Collapsing these in the fake would hide the
      // one bug this distinction exists to prevent (a verdict outliving the still it judged).
      if (gateVerdict !== undefined) rows.get(i)!.gateVerdict = gateVerdict;
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
    generateThumbnail: vi.fn(async () => 'thumb://cover.png'),
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

// --- 1b. Concurrent double-approve (F1) -----------------------------------

describe('approveStoryboard — concurrent double-approve fires exactly one driver', () => {
  it('a dual-click firing two approveStoryboard calls on the same run still submits each scene once', async () => {
    const { deps, spies, rows } = makeFakeDeps();
    const run = createProductionRun(makeInput(), 'u1');

    // Park at the storyboard gate — no spend yet.
    const gated = await runProduction(run, cb(), deps);
    expect(gated.gate).toBe('storyboard');
    expect(spies.submitVideo).not.toHaveBeenCalled();

    // Dual-click: BOTH handlers share the one `run` reference (mirrors ProducerFlow). Fire the
    // second before awaiting the first so the concurrency backstop — not sequential idempotency —
    // is what stops the second driver.
    const [a, b] = await Promise.all([
      approveStoryboard(run, cb(), deps),
      approveStoryboard(run, cb(), deps),
    ]);

    // Exactly one driver ran: one submit per scene (NOT double), and one batch voice pass —
    // the reported harm was a DOUBLED ElevenLabs burn from the second driver re-running the stage.
    expect(spies.submitVideo).toHaveBeenCalledTimes(2);
    expect(spies.consolidateVoices).toHaveBeenCalledTimes(1);
    expect(store2Count(deps, 'completeScene')).toBe(2);
    expect(rows.get(0)?.status).toBe('done');
    expect(rows.get(1)?.status).toBe('done');

    // Both callers observe the same finished run (same object reference — the early-return
    // second call returns the run the first driver drove to First Cut).
    expect(a.gate).toBe('first_cut');
    expect(b.gate).toBe('first_cut');
    expect(a.finalVideoUrl).toBe('final.mp4');
  });

  it('a failed persist un-wedges the guard: the run reverts to the parked gate and a later approve succeeds', async () => {
    // PR #70 critic Axis1 #4: without the revert, a thrown persist leaves storyboardApproved
    // true on the in-memory run, so every later Approve early-returns — gate dead until reload.
    const { deps, spies, rows } = makeFakeDeps();
    const run = createProductionRun(makeInput(), 'u1');
    await runProduction(run, cb(), deps);

    spies.persist.mockRejectedValueOnce(new Error('NETWORK_DOWN'));
    await expect(approveStoryboard(run, cb(), deps)).rejects.toThrow('NETWORK_DOWN');

    // Reverted to the parked-gate state — NOT wedged mid-approval.
    expect(run.storyboardApproved).toBeFalsy();
    expect(run.status).toBe('review');
    expect(run.gate).toBe('storyboard');
    expect(spies.submitVideo).not.toHaveBeenCalled(); // no driver started on the failed approve

    // The user taps Approve again once the network is back — this one must go through.
    const out = await approveStoryboard(run, cb(), deps);
    expect(out.gate).toBe('first_cut');
    expect(spies.submitVideo).toHaveBeenCalledTimes(2);
    expect(rows.get(0)?.status).toBe('done');
    expect(rows.get(1)?.status).toBe('done');
  });
});

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
    // identityAvatar() (a real `data:` reference) rather than makeInput()'s 'avatar.png'
    // placeholder: regen now REFUSES a reference the model cannot actually receive, and a remote
    // url is exactly that — generateSceneImage matches /^data:/ before attaching the part. The
    // placeholder was never load-bearing here; this test is about regen being image-only.
    const { deps, spies } = makeFakeDeps();
    const run = createProductionRun(makeInput({ avatar: identityAvatar() }), 'u1');
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

describe('camera framing rotation across scenes', () => {
  // AVATAR_CAMERA_ANGLES (services/geminiService.ts) is selected by
  // `variationIndex % AVATAR_CAMERA_ANGLES.length`. Its stated purpose, verbatim from that file:
  // "so consecutive scenes get different framings". The orchestrator's ONLY job is to feed it the
  // scene index — it used to pass a constant 0, which pinned all 9 scenes of a real run to one
  // framing and made the rotation contribute nothing (Neil's eyeball on the HIRAYA GLOW run,
  // 2026-07-25). Asserted on the variationIndex ARGUMENT (the seam), not on any rendered pixel.
  //
  // Kept in step with the set BY HAND on purpose: geminiService is a TUNED file and the set is
  // prompt content, so a change to it is a deliberate, approved act (HIGH_ANGLE_SELFIE was cut
  // 2026-07-25) — not something a test should silently absorb by importing the array.
  const CAMERA_ANGLE_COUNT = 3; // = AVATAR_CAMERA_ANGLES.length
  const FIVE: Scene[] = Array.from({ length: 5 }, (_, i) => ({
    scriptLine: `Line ${i}`,
    sceneDescription: `d${i}`,
    imagePrompt: `IMG${i}`,
    referenceImage: 'avatar' as const,
  }));
  const fiveSceneStoryboard = () =>
    vi.fn(async () => ({ scenes: FIVE.map((s) => ({ ...s })), strategicAudit: '' })) as any;
  /** variationIndex per main-image prompt, keyed by prompt so the pooled fan-out's
   *  nondeterministic completion order can't affect the assertion. */
  const framingByPrompt = (spy: { mock: { calls: unknown[][] } }) => {
    const m = new Map<string, number[]>();
    for (const c of spy.mock.calls as any[]) {
      const prompt = String(c[0]);
      m.set(prompt, [...(m.get(prompt) ?? []), (c[9] as number) % CAMERA_ANGLE_COUNT]);
    }
    return m;
  };

  it('gives consecutive scenes DIFFERENT framings, and wraps once the set is exhausted', async () => {
    const { deps, spies } = makeFakeDeps({ generateStoryboard: fiveSceneStoryboard() });
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps); // parks at the storyboard gate

    const framings = framingByPrompt(spies.generateSceneImage);
    const buckets = FIVE.map((_, i) => framings.get(`IMG${i}`)![0]);

    // One full pass of the set must land on a DIFFERENT framing every time — the entire point of
    // the rotation. Under the old constant every entry was 0 and the set size was 1.
    expect(new Set(buckets.slice(0, CAMERA_ANGLE_COUNT)).size).toBe(CAMERA_ANGLE_COUNT);
    // The scene right after a full pass wraps back onto scene 0's framing: proves a ROTATION,
    // not merely distinct values. Indexed off the count so cutting an angle can't silently
    // turn this into a tautology.
    expect(buckets[CAMERA_ANGLE_COUNT]).toBe(buckets[0]);
  });

  it('a still that fails the deterministic check rerolls onto a DIFFERENT framing', async () => {
    // The reroll is the only other reason this index varies: an identical framing would buy a
    // near-identical image from the model and waste the one extra generation the budget allows.
    const failedOnce = new Set<string>();
    const { deps, spies } = makeFakeDeps({
      generateStoryboard: fiveSceneStoryboard(),
      checkSceneImage: vi.fn(async (url: string) => {
        if (url === 'img://IMG0' && !failedOnce.has(url)) {
          failedOnce.add(url);
          return { ok: false, reason: 'min_short_side' };
        }
        return { ok: true };
      }) as any,
    });
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps);

    const attempts = framingByPrompt(spies.generateSceneImage).get('IMG0')!;
    expect(attempts).toHaveLength(2); // first attempt + one reroll
    expect(attempts[1]).not.toBe(attempts[0]);
  });
});

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
    // 5th arg = the gate verdict. These deps have no imageGateCheck (gate OFF), so it is
    // undefined — which the handler treats as "leave the stored column alone", NOT as a clear.
    expect(store.recordSceneImage).toHaveBeenCalledWith(run.runId, 0, 'img://START0', 'img://END0 Bukidnon Brew bottle reveal', undefined);
    expect(store.recordSceneImage).toHaveBeenCalledWith(run.runId, 1, 'img://IMG1', undefined, undefined);
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

    // Both paths produce a NEW image, so both pass an explicit null to CLEAR any stored verdict —
    // never undefined, which would leave the previous still's judgment attached to this one.
    await regenSceneImage(run, 0, callbacks, deps);
    expect(store.recordSceneImage).toHaveBeenCalledWith(run.runId, 0, 'img://START0', 'img://END0 Bukidnon Brew bottle reveal', null);

    await approveStoryboard(run, callbacks, deps);
    (store.recordSceneImage as any).mockClear();
    await reshootScene(run, 1, callbacks, deps);
    expect(store.recordSceneImage).toHaveBeenCalledWith(run.runId, 1, 'img://IMG1', undefined, null);
    expect(spies.submitVideo).toHaveBeenCalled();
  });
});

// --- 12. No-VO (Pure Hype / audioMode: 'sfx_only') --------------------------
// Music leads, SFX + burned overlay text carry the message: the voices stage skips
// consolidation, the final render burns no subtitles, holds no full-clip hook, cuts fast
// off the EDL keep-segments, and asks for the music as the LEAD track (not a ducked bed).

describe("no-VO path (audioMode: 'sfx_only')", () => {
  async function runSfxOnlyToFirstCut() {
    const harness = makeFakeDeps();
    const run = createProductionRun(makeInput({ audioMode: 'sfx_only' }), 'u1');
    const callbacks = cb();
    await runProduction(run, callbacks, harness.deps);
    await approveStoryboard(run, callbacks, harness.deps);
    return { ...harness, run };
  }

  it('skips voiceover consolidation but the (relabeled) voices stage still completes', async () => {
    const { spies, run } = await runSfxOnlyToFirstCut();
    expect(spies.consolidateVoices).not.toHaveBeenCalled();
    const voices = run.stages.find((s) => s.id === 'voices');
    expect(voices?.status).toBe('done');
    expect(voices?.label).toBe('Designing the sound');
  });

  it('renders music as the LEAD track, no subtitles, hook not held full, fast cuts', async () => {
    const { spies } = await runSfxOnlyToFirstCut();
    expect(spies.renderFinalVideo).toHaveBeenCalledTimes(1);
    const req = (spies.renderFinalVideo.mock.calls as any[])[0][0];
    expect(req.music.role).toBe('lead');
    expect(req.music.enabled).toBe(true);
    for (const sc of req.scenes) {
      expect(sc.scriptLine).toBe('');
      expect(sc.targetDurationSec).toBeGreaterThanOrEqual(1.2);
      expect(sc.targetDurationSec).toBeLessThanOrEqual(4.0);
    }
    expect(req.scenes.find((s: any) => s.isHook).keepFullClip).toBe(false);
  });

  it('regression: a default voiceover run consolidates voices and sends no music.role', async () => {
    const { spies } = await runToFirstCut();
    expect(spies.consolidateVoices).toHaveBeenCalled();
    const req = (spies.renderFinalVideo.mock.calls as any[])[0][0];
    expect(req.music.role).toBeUndefined();
  });
});

// --- 13. P3: video_prompts split into its own stage --------------------------
// generateVideoPrompts moved out of the storyboard stage into a dedicated video_prompts
// node so it can run parallel to scene_images. Failure DEGRADES (done-with-warning) and the
// video stage keeps its `vp?.prompt ?? scene.imagePrompt` fallback — never run-fatal.

const flush = () => new Promise((r) => setTimeout(r, 0));

describe('P3 — video_prompts as its own stage', () => {
  it('runs as its own stage (called once) and lands before the gate', async () => {
    const { deps, spies } = makeFakeDeps();
    const run = createProductionRun(makeInput(), 'u1');
    await runProduction(run, cb(), deps);
    expect(spies.generateVideoPrompts).toHaveBeenCalledTimes(1);
    expect(run.videoPrompts?.length).toBe(2);
    expect(run.stages.find((s) => s.id === 'video_prompts')?.status).toBe('done');
  });

  it('resume with video_prompts already done skips it (no re-gen)', async () => {
    const { deps, spies } = makeFakeDeps();
    const run = createProductionRun(makeInput(), 'u1', {
      doneStages: ['market_research', 'script', 'storyboard', 'scene_images', 'video_prompts'],
      prefill: {
        report: REPORT,
        script: SCRIPT,
        finalScript: assembleFinalScript(SCRIPT),
        ...mapReportToWizard(makeInput(), REPORT),
        storyboard: STORYBOARD_SCENES.map((s, i) => ({ ...s, imageUrl: `img://IMG${i}` })),
        videoPrompts: VIDEO_PROMPTS.map((v) => ({ ...v })),
      },
    });
    await runProduction(run, cb(), deps);
    expect(spies.generateVideoPrompts).not.toHaveBeenCalled(); // done → skipped
    expect(run.gate).toBe('storyboard'); // parks (not approved)
  });

  it('video_prompts failure DEGRADES: scene_images still completes, video falls back to imagePrompt, run finishes', async () => {
    const vpFail = vi.fn(async () => {
      throw new Error('vp 500');
    });
    const { deps, spies } = makeFakeDeps({ generateVideoPrompts: vpFail as any });
    const run = createProductionRun(makeInput(), 'u1');
    const callbacks = cb();

    await runProduction(run, callbacks, deps);
    // scene_images completed despite the PARALLEL video_prompts failure (independence).
    expect(spies.generateSceneImage).toHaveBeenCalledTimes(2);
    const vpStage = run.stages.find((s) => s.id === 'video_prompts');
    expect(vpStage?.status).toBe('done'); // done-with-warning, NOT failed
    expect(vpStage?.error).toContain('degraded');
    expect(run.videoPrompts).toBeUndefined(); // never committed → downstream falls back
    expect(run.status).toBe('review');
    expect(run.gate).toBe('storyboard'); // degrade never errors the run

    const out = await approveStoryboard(run, callbacks, deps);
    expect(out.gate).toBe('first_cut');
    // video stage used the imagePrompt fallback (vp?.prompt ?? scene.imagePrompt).
    const submittedPrompts = (spies.submitVideo.mock.calls as any[]).map((c) => c[0].prompt).sort();
    expect(submittedPrompts).toEqual(['IMG0', 'IMG1']);
  });
});

// --- 14. P3: scene_images ∥ video_prompts (the parallel pair) -----------------

describe('P3 — parallel pair (scene_images ∥ video_prompts)', () => {
  it('runs BOTH node bodies when both pending', async () => {
    const { deps, spies } = makeFakeDeps();
    const run = createProductionRun(makeInput(), 'u1');
    await runProduction(run, cb(), deps);
    expect(spies.generateSceneImage).toHaveBeenCalledTimes(2); // scene_images body ran
    expect(spies.generateVideoPrompts).toHaveBeenCalledTimes(1); // video_prompts body ran
    expect(run.stages.find((s) => s.id === 'scene_images')?.status).toBe('done');
    expect(run.stages.find((s) => s.id === 'video_prompts')?.status).toBe('done');
  });

  it('commits each stage status independently (scene_images done while video_prompts still running)', async () => {
    let releaseVP!: () => void;
    const vpGate = new Promise<void>((res) => {
      releaseVP = res;
    });
    const slowVP = vi.fn(async () => {
      await vpGate;
      return VIDEO_PROMPTS.map((v) => ({ ...v }));
    });
    const { deps } = makeFakeDeps({ generateVideoPrompts: slowVP as any });
    const run = createProductionRun(makeInput(), 'u1');
    const snaps: { si?: string; vp?: string }[] = [];
    const callbacks = cb({
      onUpdate: (r) =>
        snaps.push({
          si: r.stages.find((s) => s.id === 'scene_images')?.status,
          vp: r.stages.find((s) => s.id === 'video_prompts')?.status,
        }),
    });
    const p = runProduction(run, callbacks, deps);
    // Immediate image mocks let scene_images finish while video_prompts is still gated open.
    await flush();
    const independent = snaps.some((x) => x.si === 'done' && x.vp === 'running');
    releaseVP();
    await p;
    expect(independent).toBe(true);
    expect(run.stages.find((s) => s.id === 'scene_images')?.status).toBe('done');
    expect(run.stages.find((s) => s.id === 'video_prompts')?.status).toBe('done');
  });

  it('a per-scene image failure does NOT cancel video_prompts (it still completes)', async () => {
    const imageMock = vi.fn(async (prompt: string) => {
      if (prompt === 'IMG0') throw new Error('img 502');
      return `img://${prompt}`;
    });
    const { deps, spies } = makeFakeDeps({ generateSceneImage: imageMock as any });
    const run = createProductionRun(makeInput(), 'u1');
    await runProduction(run, cb(), deps);
    expect(spies.generateVideoPrompts).toHaveBeenCalledTimes(1);
    expect(run.videoPrompts?.length).toBe(2);
    expect(run.stages.find((s) => s.id === 'video_prompts')?.status).toBe('done');
    expect(run.scenes.find((s) => s.sceneIdx === 0)?.status).toBe('flagged'); // the failed scene
    expect(run.scenes.find((s) => s.sceneIdx === 1)?.imageUrl).toBe('img://IMG1'); // the survivor
  });
});

// --- 15. P3: scene image fan-out is pooled(3) --------------------------------

describe('P3 — pooled(3) scene images', () => {
  it('processes all scenes; one failure flags only that scene, the rest complete', async () => {
    const THREE: Scene[] = [
      { scriptLine: 'L0', sceneDescription: 'd0', imagePrompt: 'IMG0', referenceImage: 'avatar' },
      { scriptLine: 'L1', sceneDescription: 'd1', imagePrompt: 'IMG1', referenceImage: 'avatar' },
      { scriptLine: 'L2', sceneDescription: 'd2', imagePrompt: 'IMG2', referenceImage: 'avatar' },
    ];
    const imageMock = vi.fn(async (prompt: string) => {
      if (prompt === 'IMG1') throw new Error('img 502');
      return `img://${prompt}`;
    });
    const { deps } = makeFakeDeps({
      generateStoryboard: vi.fn(async () => ({ scenes: THREE.map((s) => ({ ...s })), strategicAudit: '' })) as any,
      generateVideoPrompts: vi.fn(async () => THREE.map((s, i) => ({ scriptLine: s.scriptLine, type: 'b-roll', prompt: `P${i}` }))) as any,
      generateSceneImage: imageMock as any,
    });
    const run = createProductionRun(makeInput(), 'u1');
    await runProduction(run, cb(), deps);

    expect(run.scenes.find((s) => s.sceneIdx === 0)?.imageUrl).toBe('img://IMG0');
    expect(run.scenes.find((s) => s.sceneIdx === 2)?.imageUrl).toBe('img://IMG2');
    expect(run.scenes.find((s) => s.sceneIdx === 1)?.status).toBe('flagged');
    expect(run.scenes.find((s) => s.sceneIdx === 1)?.flaggedReason).toContain('image');
    // IMG1 retried MAX_STAGE_ATTEMPTS (2) before flagging; the pool stayed alive for the rest.
    expect(imageMock.mock.calls.filter((c) => c[0] === 'IMG1')).toHaveLength(2);
    expect(run.gate).toBe('storyboard');
  });
});

// --- 16. P3: old-checkpoint normalization (resume-safety) --------------------

describe('P3 — old-checkpoint normalization', () => {
  it('a run whose stages array predates video_prompts/thumbnail resumes without crashing and gains the entries', async () => {
    const { deps, spies } = makeFakeDeps();
    // A run checkpointed on OLD code: storyboard+scene_images done (old storyboard produced the
    // videoPrompts inline), parked at the gate — and its stages array lacks the two new entries.
    const run = createProductionRun(makeInput(), 'u1', {
      doneStages: ['market_research', 'script', 'storyboard', 'scene_images'],
      prefill: {
        report: REPORT,
        script: SCRIPT,
        finalScript: assembleFinalScript(SCRIPT),
        ...mapReportToWizard(makeInput(), REPORT),
        storyboard: STORYBOARD_SCENES.map((s, i) => ({ ...s, imageUrl: `img://IMG${i}` })),
        videoPrompts: VIDEO_PROMPTS.map((v) => ({ ...v })), // already produced on old code
      },
    });
    // Strip the new stage entries to simulate the pre-split checkpoint shape.
    run.stages = run.stages.filter((s) => s.id !== 'video_prompts' && s.id !== 'thumbnail');
    expect(run.stages.map((s) => s.id)).not.toContain('video_prompts');

    const out = await runProduction(run, cb(), deps); // must not throw on the stages.find(...)! lookups

    // Normalized: the two entries now exist, in STAGE_ORDER position.
    const ids = out.stages.map((s) => s.id);
    expect(ids).toContain('video_prompts');
    expect(ids).toContain('thumbnail');
    // video_prompts inferred DONE from the already-present artifact → not re-generated.
    expect(out.stages.find((s) => s.id === 'video_prompts')?.status).toBe('done');
    expect(spies.generateVideoPrompts).not.toHaveBeenCalled();
    // Resumes cleanly and re-parks at the storyboard gate.
    expect(out.status).toBe('review');
    expect(out.gate).toBe('storyboard');
  });
});

// --- 17. P3: thumbnail runs PARALLEL to video (no detached task, no gate-park race) ----
// Redesign: thumbnail moved AFTER video in STAGE_ORDER and co-executes with it via runStagePair.
// It is NOT fired at the storyboard-gate park — so the detached-task identity-split race
// (driver closes over run F, ProducerFlow approves on shallow-spread G ≠ F) cannot occur.

describe('P3 — thumbnail ∥ video (redesign)', () => {
  it('does NOT fire the thumbnail at the storyboard-gate park', async () => {
    const { deps, spies } = makeFakeDeps();
    const run = createProductionRun(makeInput(), 'u1');
    await runProduction(run, cb(), deps); // park at the storyboard gate
    expect(run.gate).toBe('storyboard');
    expect(spies.generateThumbnail).not.toHaveBeenCalled(); // thumbnail runs during filming, not the gate
    expect(run.thumbnailUrl).toBeUndefined();
  });

  it('shallow-spread approval identity split: no post-approval bounce, thumbnail generated exactly ONCE', async () => {
    // Regression for the reviewer's M1/M2. ProducerFlow hands the driver shallow spreads
    // (onUpdate → setRun({...u})) and approves on the React-state spread (a DIFFERENT object
    // than the driver first closed over). With the detached task deleted, no stale onUpdate can
    // bounce the UI back to the gate, and the thumbnail is generated once (no F/G double-fire).
    const { deps, spies } = makeFakeDeps();
    const run = createProductionRun(makeInput(), 'u1');

    // Pass 1 → storyboard gate.
    const gated = await runProduction(run, cb(), deps);
    expect(gated.gate).toBe('storyboard');
    expect(spies.generateThumbnail).not.toHaveBeenCalled();

    // Pass 2 → approve on a SHALLOW SPREAD (mirrors ProducerFlow's setRun({...u}) → approve).
    const spread = { ...run };
    const seen: string[] = [];
    const callbacks = cb({ onUpdate: (r) => seen.push(`${r.status}:${r.gate ?? ''}`) });
    const out = await approveStoryboard(spread, callbacks, deps);

    // Never re-parks at the storyboard gate after approval (no stale-object bounce).
    expect(seen.some((s) => s === 'review:storyboard')).toBe(false);
    expect(out.gate).toBe('first_cut');
    // Cover frame generated EXACTLY once across the whole run.
    expect(spies.generateThumbnail).toHaveBeenCalledTimes(1);
    expect(out.thumbnailUrl).toBe('thumb://cover.png');
    expect(out.stages.find((s) => s.id === 'thumbnail')?.status).toBe('done');
  });

  it('runs concurrently with the video stage (overlap observed)', async () => {
    let releaseVideo!: () => void;
    const videoGate = new Promise<void>((res) => {
      releaseVideo = res;
    });
    // Gate the video poll so the video stage stays 'running' while the (immediate) thumbnail lands.
    const slowPoll = vi.fn(async (handle: VideoJobHandle) => {
      await videoGate;
      return { url: `vid://${handle.sceneIdx}`, downloadUrl: 'd', mimeType: 'video/mp4' };
    });
    const { deps } = makeFakeDeps({ pollVideo: slowPoll as any });
    const run = videoStageRun(1); // approved, past the gate; video + thumbnail both pending
    const snaps: { v?: string; t?: string }[] = [];
    const callbacks = cb({
      onUpdate: (r) =>
        snaps.push({
          v: r.stages.find((s) => s.id === 'video')?.status,
          t: r.stages.find((s) => s.id === 'thumbnail')?.status,
        }),
    });
    const p = runProduction(run, callbacks, deps);
    await flush();
    const overlap = snaps.some((x) => x.v === 'running' && x.t === 'done'); // thumbnail done while video runs
    releaseVideo();
    const out = await p;
    expect(overlap).toBe(true);
    expect(out.stages.find((s) => s.id === 'thumbnail')?.status).toBe('done');
    expect(out.thumbnailUrl).toBe('thumb://cover.png');
    expect(out.gate).toBe('first_cut');
  });

  it('thumbnail failure during the pair DEGRADES; video is unaffected; run reaches first_cut', async () => {
    const thumbFail = vi.fn(async () => {
      throw new Error('thumb 500');
    });
    const { deps } = makeFakeDeps({ generateThumbnail: thumbFail as any });
    const run = videoStageRun(1);

    const out = await runProduction(run, cb(), deps);

    const tStage = out.stages.find((s) => s.id === 'thumbnail');
    expect(tStage?.status).toBe('done'); // done-with-warning, not failed
    expect(tStage?.error).toContain('degraded');
    expect(out.thumbnailUrl).toBeUndefined();
    expect(out.scenes[0].videoUrl).toBe('vid://0'); // video unaffected by the thumbnail failure
    expect(out.status).toBe('review');
    expect(out.gate).toBe('first_cut'); // run completes
  });

  it('resume order A — mid-video (video + thumbnail both pending): the pair finishes both', async () => {
    const { deps, spies } = makeFakeDeps();
    const run = videoStageRun(1); // video + thumbnail pending
    const out = await runProduction(run, cb(), deps);
    expect(spies.generateThumbnail).toHaveBeenCalledTimes(1);
    expect(out.stages.find((s) => s.id === 'video')?.status).toBe('done');
    expect(out.stages.find((s) => s.id === 'thumbnail')?.status).toBe('done');
    expect(out.thumbnailUrl).toBe('thumb://cover.png');
    expect(out.gate).toBe('first_cut');
  });

  it('resume order B — video already done, thumbnail pending: the pair finalizes just the thumbnail', async () => {
    const { deps, spies } = makeFakeDeps();
    const run = videoStageRun(1);
    // Simulate a resume where the video stage completed but the cover never landed.
    run.stages.find((s) => s.id === 'video')!.status = 'done';
    run.scenes[0].status = 'done';
    run.scenes[0].videoUrl = 'vid://0';

    const out = await runProduction(run, cb(), deps);

    expect(spies.submitVideo).not.toHaveBeenCalled(); // video not re-run
    expect(spies.generateThumbnail).toHaveBeenCalledTimes(1); // thumbnail finalized
    expect(out.thumbnailUrl).toBe('thumb://cover.png');
    expect(out.stages.find((s) => s.id === 'thumbnail')?.status).toBe('done');
    expect(out.gate).toBe('first_cut');
  });
});

// --- 18. P3: abort mid image-pool ------------------------------------------

describe('P3 — abort mid image-pool', () => {
  it('signal aborted while pooled(3) workers are in flight → stage boundary throws ABORTED, run returns without parking at the gate', async () => {
    const controller = new AbortController();
    // First image call aborts the signal and throws; the remaining pooled workers then bail at
    // their own aborted-check, and the stage boundary re-throws ABORTED.
    const imageMock = vi.fn(async () => {
      controller.abort();
      throw new Error('ABORTED');
    });
    const { deps } = makeFakeDeps({ generateSceneImage: imageMock as any });
    const run = createProductionRun(makeInput(), 'u1');

    const out = await runProduction(run, cb({ signal: controller.signal }), deps);

    expect(out.status).toBe('running'); // bailed at the stage boundary
    expect(out.status).not.toBe('review');
    expect(out.gate).not.toBe('storyboard'); // did NOT park at the gate
    expect(out.error).toBeUndefined(); // abort is not an error
  });
});

// --- 19. P4: deterministic still check drives the ONE bounded reroll ----------
// After a scene image lands, the injected checkSceneImage (decode/dims/min-res) runs.
// On failure the orchestrator rerolls the image exactly once; still failing → hard-flag
// for Gate-1 triage (blocks approval, needs a regen). Absent dep → pre-P4 behavior.

describe('P4 — deterministic image check + one reroll', () => {
  const passCheck = { ok: true as const, width: 720, height: 1280 };

  it('rerolls a failing still ONCE, then hard-flags it if still failing (rest complete)', async () => {
    const checkMock = vi.fn(async (url: string) =>
      url.includes('IMG0') ? { ok: false, reason: 'too_small' as const, width: 100, height: 100 } : passCheck
    );
    const imageMock = vi.fn(async (prompt: string) => `img://${prompt}`);
    const { deps } = makeFakeDeps({ checkSceneImage: checkMock as any, generateSceneImage: imageMock as any });
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps);

    const sc0 = run.scenes.find((s) => s.sceneIdx === 0)!;
    expect(sc0.status).toBe('flagged'); // deterministic fail → hard flag (blocks approval)
    expect(sc0.flaggedReason).toContain('image_check');
    expect(sc0.imageUrl).toBeUndefined(); // a still that fails the gate is never committed
    // IMG0 was generated twice: initial (via withRetry) + exactly one reroll.
    expect(imageMock.mock.calls.filter((c) => c[0] === 'IMG0')).toHaveLength(2);
    // The healthy scene is unaffected and the run still parks at the gate.
    expect(run.scenes.find((s) => s.sceneIdx === 1)?.imageUrl).toBe('img://IMG1');
    expect(run.gate).toBe('storyboard');
  });

  it('keeps the rerolled image when the reroll PASSES the check (no flag)', async () => {
    let img0Checks = 0;
    const checkMock = vi.fn(async (url: string) => {
      if (url.includes('IMG0')) {
        img0Checks++;
        return img0Checks === 1 ? { ok: false, reason: 'aspect_mismatch' as const, width: 1, height: 1 } : passCheck;
      }
      return passCheck;
    });
    const { deps } = makeFakeDeps({ checkSceneImage: checkMock as any });
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps);

    const sc0 = run.scenes.find((s) => s.sceneIdx === 0)!;
    expect(sc0.status).not.toBe('flagged');
    expect(sc0.imageUrl).toBe('img://IMG0'); // the passing reroll is committed
    expect(run.gate).toBe('storyboard');
  });

  it('skips the check entirely when the dep is absent (pre-P4 behavior)', async () => {
    const { deps } = makeFakeDeps();
    const run = createProductionRun(makeInput(), 'u1');
    await runProduction(run, cb(), deps);
    expect(run.scenes.every((s) => s.status !== 'flagged')).toBe(true);
    expect(run.scenes.every((s) => s.gateVerdict === undefined)).toBe(true);
  });
});

// --- 20. P4: AI image gate (FLAG-ONLY, fail-open) -----------------------------
// The gate perceives identity/label and stores a verdict. A failing verdict annotates
// flaggedReason + stores gateVerdict (→ Gate-1 chip) but NEVER discards the image or
// changes status (never blocks approval). Any gate error is swallowed (fail-open).

describe('P4 — AI image gate', () => {
  it('a failing verdict flags SOFT: keeps the image, sets gateVerdict + flaggedReason, does not block', async () => {
    const gateMock = vi.fn(async () => ({ observations: null, verdict: { pass: false, flags: ['identity_drift'] } }));
    const { deps } = makeFakeDeps({ imageGateCheck: gateMock as any });
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps);

    const sc0 = run.scenes.find((s) => s.sceneIdx === 0)!;
    expect(sc0.imageUrl).toBe('img://IMG0'); // image KEPT (flag-only)
    expect(sc0.status).not.toBe('flagged'); // never blocks approval
    expect(sc0.gateVerdict).toEqual({ pass: false, flags: ['identity_drift'] });
    // Soft verdict lives ONLY in gateVerdict — flaggedReason stays reserved for hard flags.
    expect(sc0.flaggedReason).toBeUndefined();
    expect(run.gate).toBe('storyboard');
  });

  it('a gate 503 (kill switch off) is swallowed by fail-open: scene unflagged, no verdict, run healthy', async () => {
    // Mirrors the live path: imageGateService throws on the 503 → the orchestrator's gate
    // try/catch swallows it. Proves shipping-dark is safe end-to-end.
    const gateMock = vi.fn(async () => {
      throw new Error('IMAGE_GATE_503: image_gate_disabled');
    });
    const { deps } = makeFakeDeps({ imageGateCheck: gateMock as any });
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps);

    expect(run.scenes.every((s) => s.status !== 'flagged')).toBe(true);
    expect(run.scenes.every((s) => s.gateVerdict === undefined)).toBe(true);
    expect(run.status).toBe('review');
    expect(run.gate).toBe('storyboard');
  });

  it('gates identity scenes with the avatar reference and product scenes with the expected label', async () => {
    const gateMock = vi.fn(async () => ({ observations: null, verdict: { pass: true, flags: [] } }));
    const { deps } = makeFakeDeps({ imageGateCheck: gateMock as any });
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps);

    const scene0Call = (gateMock.mock.calls as any[]).find((c) => c[0].imageBase64 === 'img://IMG0')![0];
    const scene1Call = (gateMock.mock.calls as any[]).find((c) => c[0].imageBase64 === 'img://IMG1')![0];
    // Scene 0 (referenceImage 'avatar') → identity: avatar ref, no label.
    expect(scene0Call.referenceImageBase64).toBe('avatar.png');
    expect(scene0Call.expectedLabelText).toBeUndefined();
    expect(scene0Call.referenceMode).toBe('avatar');
    // Scene 1 (referenceImage 'product') → label: product name, no ref.
    expect(scene1Call.referenceImageBase64).toBeUndefined();
    expect(scene1Call.expectedLabelText).toBe('Bukidnon Brew');
    // A passing verdict is still stored for offline precision measurement.
    expect(run.scenes.find((s) => s.sceneIdx === 0)?.gateVerdict).toEqual({ pass: true, flags: [] });
  });

  it('swallows a gate error (fail-open): scene stays unflagged, no gateVerdict, run unblocked', async () => {
    const gateMock = vi.fn(async () => {
      throw new Error('gate 500');
    });
    const { deps } = makeFakeDeps({ imageGateCheck: gateMock as any });
    const run = createProductionRun(makeInput(), 'u1');

    await runProduction(run, cb(), deps);

    expect(run.scenes.every((s) => s.status !== 'flagged')).toBe(true);
    expect(run.scenes.every((s) => s.gateVerdict === undefined)).toBe(true);
    expect(run.gate).toBe('storyboard');
  });
});

// --- 21. P4: kill-switch dep wiring (ships DARK) ------------------------------
// gateDepsFor is the pure gate behind VITE_IMAGE_GATE_ENABLED. Flag off/absent → both
// deps undefined → the orchestrator runs pre-P4 (proven by the dep-absent tests above).

describe('P4 — gateDepsFor kill switch', () => {
  it("wires BOTH deps only when the flag is exactly 'true'", () => {
    const on = gateDepsFor('true');
    expect(typeof on.checkSceneImage).toBe('function');
    expect(typeof on.imageGateCheck).toBe('function');
  });

  it('leaves BOTH deps undefined when the flag is off / absent / any other value', () => {
    for (const off of [undefined, '', 'false', 'TRUE', '1']) {
      const d = gateDepsFor(off);
      expect(d.checkSceneImage).toBeUndefined();
      expect(d.imageGateCheck).toBeUndefined();
    }
  });
});

// --- 22. P4: gate-skip visibility ('check_skip') ------------------------------
// The gate exists to produce a gate_verdict dataset so its PRECISION can be measured
// before it is ever given reroll authority. Two paths make it silently NOT run — a
// swallowed infra error, and an identity check that no-ops because the avatar reference
// isn't an inline image — and both used to be invisible, so "no flags because the images
// were good" was indistinguishable from "no flags because the gate never ran". These
// assert the skip is now COUNTABLE, and that making it countable changed nothing else:
// same fail-open, same gate CALL VOLUME.

/** An avatar reference the gate can actually use (survives to an inlineData part). */
const identityAvatar = () => ({ url: 'data:image/png;base64,QVZBVEFS', description: 'a Filipino host', ethnicity: 'Filipino', prompt: '' });

/** The run events of one name, in emission order. */
const emitted = (name: string) =>
  (trackEventMock.mock.calls as any[]).map((c) => c[0]).filter((p) => p?.event === name);

describe("P4 — gate-skip visibility ('check_skip')", () => {
  beforeEach(() => {
    trackEventMock.mockClear();
  });

  it('a 429 on the gate call emits ONE check_skip (rate_limited) and leaves fail-open untouched', async () => {
    // Gate and generate calls share the one `gemini:image:${user.id}` bucket, so a parallel
    // pooled run can 429 the gate. Only scene 0 429s — scene 1 proves the skip is per-scene.
    const gateMock = vi.fn(async (p: any) => {
      if (p.imageBase64 === 'img://IMG0') throw new Error('IMAGE_GATE_429: rate_limited');
      return { observations: null, verdict: { pass: true, flags: [] } };
    });
    const { deps } = makeFakeDeps({ imageGateCheck: gateMock as any });
    const run = createProductionRun(makeInput({ avatar: identityAvatar() }), 'u1');

    await runProduction(run, cb(), deps);

    const skips = emitted('check_skip');
    expect(skips).toHaveLength(1);
    expect(skips[0].run_id).toBe(run.runId);
    expect(skips[0].meta).toMatchObject({ node: 'scene_images', sceneIdx: 0, kind: 'gate', reason: 'rate_limited' });
    expect(String(skips[0].meta.detail)).toContain('IMAGE_GATE_429');

    // Fail-open UNCHANGED: image kept, scene never flagged, no verdict invented, run parks.
    const sc0 = run.scenes.find((s) => s.sceneIdx === 0)!;
    expect(sc0.imageUrl).toBe('img://IMG0');
    expect(sc0.status).not.toBe('flagged');
    expect(sc0.gateVerdict).toBeUndefined();
    expect(emitted('check_fail')).toHaveLength(0); // a skip is NOT a flag
    expect(run.status).toBe('review');
    expect(run.gate).toBe('storyboard');
  });

  it('classifies the other swallowed shapes: abort, unauthenticated, everything else', async () => {
    const cases: [unknown, string][] = [
      [Object.assign(new Error('The operation was aborted.'), { name: 'AbortError' }), 'aborted'],
      [new Error('NOT_AUTHENTICATED'), 'unauthenticated'],
      [new Error('IMAGE_GATE_503: image_gate_disabled'), 'other'],
      ['a bare string, not an Error', 'other'], // defensive: reading .message must never throw
    ];
    for (const [thrown, reason] of cases) {
      trackEventMock.mockClear();
      const gateMock = vi.fn(async () => {
        throw thrown;
      });
      const { deps } = makeFakeDeps({ imageGateCheck: gateMock as any });
      const run = createProductionRun(makeInput({ avatar: identityAvatar() }), 'u1');

      await runProduction(run, cb(), deps);

      expect(emitted('check_skip').map((s) => s.meta.reason)).toEqual([reason, reason]); // both gated scenes
      expect(run.gate).toBe('storyboard'); // still fails open on every shape
    }
  });

  it('an unusable identity reference emits check_skip{no_identity_reference} AND still calls the gate', async () => {
    // 'avatar.png' is not a data: URL — the post-resume shape slimCheckpointInput leaves
    // behind. The gate would return personMatchesReference:null with pass:true, i.e. identity
    // never actually checked.
    const gateMock = vi.fn(async () => ({ observations: null, verdict: { pass: true, flags: [] } }));
    const { deps } = makeFakeDeps({ imageGateCheck: gateMock as any });
    const run = createProductionRun(makeInput(), 'u1'); // scene 0 = 'avatar', scene 1 = 'product'

    await runProduction(run, cb(), deps);

    const skips = emitted('check_skip');
    expect(skips).toHaveLength(1); // identity scene only — the product scene wants no reference
    expect(skips[0].meta).toMatchObject({ node: 'scene_images', sceneIdx: 0, kind: 'gate', reason: 'no_identity_reference' });

    // GUARD — do NOT "optimize" this call away: the label half of the check is still worth
    // running, and dropping the call would change gate COGS and the metering budget.
    expect(gateMock).toHaveBeenCalledTimes(2);
    expect((gateMock.mock.calls as any[]).map((c) => c[0].imageBase64).sort()).toEqual(['img://IMG0', 'img://IMG1']);
    expect(run.scenes.find((s) => s.sceneIdx === 0)?.gateVerdict).toEqual({ pass: true, flags: [] });
  });

  it('an EMPTY avatar url skips identity the same way (still one gate call for that scene)', async () => {
    const gateMock = vi.fn(async () => ({ observations: null, verdict: { pass: true, flags: [] } }));
    const { deps } = makeFakeDeps({ imageGateCheck: gateMock as any });
    const run = createProductionRun(makeInput({ avatar: { url: '', description: '', ethnicity: '', prompt: '' } }), 'u1');

    await runProduction(run, cb(), deps);

    expect(emitted('check_skip').map((s) => s.meta.reason)).toEqual(['no_identity_reference']);
    expect(gateMock).toHaveBeenCalledTimes(2);
  });

  it('negative control: a passing gate with a usable reference emits NEITHER check_skip NOR check_fail', async () => {
    const gateMock = vi.fn(async () => ({ observations: null, verdict: { pass: true, flags: [] } }));
    const { deps } = makeFakeDeps({ imageGateCheck: gateMock as any });
    const run = createProductionRun(makeInput({ avatar: identityAvatar() }), 'u1');

    await runProduction(run, cb(), deps);

    expect(emitted('check_skip')).toHaveLength(0);
    expect(emitted('check_fail')).toHaveLength(0);
    expect(gateMock).toHaveBeenCalledTimes(2);
    expect(run.gate).toBe('storyboard');
  });

  it('a FAILING verdict still emits check_fail only — a real flag is never recorded as a skip', async () => {
    const gateMock = vi.fn(async () => ({ observations: null, verdict: { pass: false, flags: ['identity_drift'] } }));
    const { deps } = makeFakeDeps({ imageGateCheck: gateMock as any });
    const run = createProductionRun(makeInput({ avatar: identityAvatar() }), 'u1');

    await runProduction(run, cb(), deps);

    expect(emitted('check_skip')).toHaveLength(0);
    expect(emitted('check_fail')).toHaveLength(2);
    expect(emitted('check_fail')[0].meta).toMatchObject({ kind: 'gate', flags: ['identity_drift'] });
  });

  it('a SERVER-side fail-open emits check_skip{gate_unavailable} — the third silent non-run', async () => {
    // The gap the 2026-07-25 flag-ON run exposed: api/_lib/imageGate.ts swallows its own
    // vision/parse errors and answers 200 with {pass:true, reason:'gate_unavailable'}. Nothing
    // throws, so the catch above never fires — 2 of 9 scenes silently never ran and produced
    // ZERO skip rows. Distinct from the 429 case, which throws client-side.
    const gateMock = vi.fn(async (p: any) =>
      p.imageBase64 === 'img://IMG0'
        ? { observations: null, verdict: { pass: true, flags: [], reason: 'gate_unavailable' } }
        : { observations: null, verdict: { pass: true, flags: [] } },
    );
    const { deps } = makeFakeDeps({ imageGateCheck: gateMock as any });
    const run = createProductionRun(makeInput({ avatar: identityAvatar() }), 'u1');

    await runProduction(run, cb(), deps);

    const skips = emitted('check_skip');
    expect(skips).toHaveLength(1); // scene 1's real verdict must NOT be counted as a skip
    expect(skips[0].meta).toMatchObject({ node: 'scene_images', sceneIdx: 0, kind: 'gate', reason: 'gate_unavailable' });
    // A fail-open is not a flag, and the image is kept exactly as before.
    expect(emitted('check_fail')).toHaveLength(0);
    expect(run.scenes.find((s) => s.sceneIdx === 0)?.imageUrl).toBe('img://IMG0');
    expect(run.gate).toBe('storyboard');
  });
});

// --- 23. P4: the verdict must reach the DURABLE per-scene row ------------------
// The flag-only phase exists to accumulate a per-scene verdict dataset so the gate's PRECISION
// can be measured before it is ever granted reroll authority. Until 2026-07-25 nothing wrote
// producer_scenes.gate_verdict at all: the verdict reached only the run-header checkpoint jsonb,
// which is overwritten on every transition, so the dataset was discarded every run. These assert
// at the transport seam (recordSceneImage's arguments) — the durable write, not the checkpoint.

// --- 24. Regen/reshoot refuse when the presenter reference is gone -------------
// slimCheckpointInput drops any data: string over 700KB from the checkpointed input, and a 2K
// avatar exceeds that while the compressed hero does not. So after ANY reload the avatar url is
// absent — and generating anyway does not degrade, it produces a confidently WRONG image that
// overwrites a good one and costs money (measured on run apr_876ef559: a product-only still with
// a BLANK label, because generateSceneImage's 'avatar' branch is the one branch of five with no
// `&& references.avatarUrl` guard, so "Reference Image 1" silently became the product photo).

describe('regen/reshoot refuse a lost presenter reference', () => {
  /** The post-reload shape: avatar present as an object, `url` stripped by the slimmer. */
  const strippedAvatar = () => ({ url: undefined as unknown as string, description: 'a Filipino host', ethnicity: 'Filipino', prompt: '' });

  it('regen does NOT spend, does NOT touch the image, and surfaces a reason', async () => {
    const { deps, spies } = makeFakeDeps({ imageGateCheck: undefined, checkSceneImage: undefined });
    const run = createProductionRun(makeInput({ avatar: strippedAvatar() }), 'u1');
    await runProduction(run, cb(), deps);
    const before = run.scenes.find((s) => s.sceneIdx === 0)!.imageUrl;
    spies.generateSceneImage.mockClear();

    await regenSceneImage(run, 0, cb(), deps);

    expect(spies.generateSceneImage).not.toHaveBeenCalled(); // the whole point: zero spend
    const sc = run.scenes.find((s) => s.sceneIdx === 0)!;
    expect(sc.imageUrl).toBe(before); // the good image survives
    expect(sc.flaggedReason).toBe(IDENTITY_REF_LOST_REASON);
    // status untouched — one refused scene must not block approval of an otherwise-fine run.
    expect(sc.status).not.toBe('flagged');
  });

  it('a product scene still regenerates — it never needed the presenter', async () => {
    // Scene 1 of the default storyboard is referenceImage:'product'. Refusing it too would be a
    // false positive that breaks regen for scenes the missing avatar cannot affect.
    const { deps, spies } = makeFakeDeps({ imageGateCheck: undefined, checkSceneImage: undefined });
    const run = createProductionRun(makeInput({ avatar: strippedAvatar() }), 'u1');
    await runProduction(run, cb(), deps);
    spies.generateSceneImage.mockClear();

    await regenSceneImage(run, 1, cb(), deps);

    expect(spies.generateSceneImage).toHaveBeenCalledTimes(1);
    expect(run.scenes.find((s) => s.sceneIdx === 1)!.flaggedReason).toBeUndefined();
  });

  it('reshoot refuses BEFORE requeueScene, so the existing clip is not destroyed', async () => {
    // Ordering is the whole risk here: requeue NULLs job_handle/video_url/audio_url, so a guard
    // placed after it would wipe the very clip we are declining to replace.
    // Deliberately NOT going through approveStoryboard: that starts the production driver, whose
    // own stale-claim escape also calls requeueScene, which would contaminate the count. The guard
    // is the first statement in reshootScene, so it is reachable straight from the parked run.
    const { deps, spies, store } = makeFakeDeps({ imageGateCheck: undefined, checkSceneImage: undefined });
    const run = createProductionRun(makeInput({ avatar: strippedAvatar() }), 'u1');
    await runProduction(run, cb(), deps);
    (store.requeueScene as any).mockClear();
    spies.generateSceneImage.mockClear();

    await reshootScene(run, 0, cb(), deps);

    expect(store.requeueScene).not.toHaveBeenCalled();
    expect(spies.generateSceneImage).not.toHaveBeenCalled();
    expect(spies.submitVideo).not.toHaveBeenCalled();
    expect(run.scenes.find((s) => s.sceneIdx === 0)!.flaggedReason).toBe(IDENTITY_REF_LOST_REASON);
  });

  it('a usable data: reference is never refused', async () => {
    const { deps, spies } = makeFakeDeps({ imageGateCheck: undefined, checkSceneImage: undefined });
    const run = createProductionRun(makeInput({ avatar: identityAvatar() }), 'u1');
    await runProduction(run, cb(), deps);
    spies.generateSceneImage.mockClear();

    await regenSceneImage(run, 0, cb(), deps);

    expect(spies.generateSceneImage).toHaveBeenCalledTimes(1);
    expect(run.scenes.find((s) => s.sceneIdx === 0)!.flaggedReason).toBeUndefined();
  });

  it('a REMOTE url is refused too — only an inline data: reference actually reaches the model', async () => {
    // 'avatar.png' is the other post-slim shape. generateSceneImage matches /^data:/ before
    // attaching the part, so a remote url is silently no reference at all.
    const { deps, spies } = makeFakeDeps({ imageGateCheck: undefined, checkSceneImage: undefined });
    const run = createProductionRun(makeInput(), 'u1'); // default avatar url = 'avatar.png'
    await runProduction(run, cb(), deps);
    spies.generateSceneImage.mockClear();

    await regenSceneImage(run, 0, cb(), deps);

    expect(spies.generateSceneImage).not.toHaveBeenCalled();
    expect(run.scenes.find((s) => s.sceneIdx === 0)!.flaggedReason).toBe(IDENTITY_REF_LOST_REASON);
  });
});

describe('P4 — gate verdict persistence', () => {
  it('persists each scene’s verdict on the durable row, not just the checkpoint', async () => {
    const gateMock = vi.fn(async (p: any) => ({
      observations: null,
      verdict: p.imageBase64 === 'img://IMG0' ? { pass: false, flags: ['identity_drift'] } : { pass: true, flags: [] },
    }));
    const { deps, rows } = makeFakeDeps({ imageGateCheck: gateMock as any });
    const run = createProductionRun(makeInput({ avatar: identityAvatar() }), 'u1');

    await runProduction(run, cb(), deps);

    // The FAILING verdict is the one the precision analysis is actually about — it must survive
    // on the row, which outlives the checkpoint jsonb the verdict used to live in alone.
    expect(rows.get(0)!.gateVerdict).toEqual({ pass: false, flags: ['identity_drift'] });
    expect(rows.get(1)!.gateVerdict).toEqual({ pass: true, flags: [] });
  });

  it('leaves an EXISTING stored verdict alone when the gate is OFF', async () => {
    // Flag-off deps (gateDepsFor returns both undefined). Seed a verdict from a notional earlier
    // flag-on run: sending null here would erase it. Absent must mean "leave it alone".
    const priorVerdict = { pass: false, flags: ['label_unreadable'] };
    const { deps, rows } = makeFakeDeps(
      { imageGateCheck: undefined, checkSceneImage: undefined },
      { 0: { gateVerdict: priorVerdict }, 1: { gateVerdict: priorVerdict } },
    );
    const run = createProductionRun(makeInput({ avatar: identityAvatar() }), 'u1');

    await runProduction(run, cb(), deps);

    expect(rows.get(0)!.gateVerdict).toEqual(priorVerdict);
    expect(rows.get(1)!.gateVerdict).toEqual(priorVerdict);
  });

  it('a regenerated scene CLEARS the stored verdict rather than inheriting it', async () => {
    // regenSceneImage already drops the in-memory verdict ("a fresh image must not wear the old
    // chip"). The durable row has to follow, or the dataset keeps a judgment attached to a still
    // it never judged — worse than having no row at all.
    const { deps, rows } = makeFakeDeps({ imageGateCheck: vi.fn(async () => ({ observations: null, verdict: { pass: true, flags: [] } })) as any });
    const run = createProductionRun(makeInput({ avatar: identityAvatar() }), 'u1');
    await runProduction(run, cb(), deps);
    expect(rows.get(0)!.gateVerdict).toEqual({ pass: true, flags: [] }); // precondition

    await regenSceneImage(run, 0, cb(), deps);

    expect(rows.get(0)!.gateVerdict).toBeNull(); // cleared, not inherited
    expect(run.scenes.find((s) => s.sceneIdx === 0)?.gateVerdict).toBeUndefined();
  });
});
