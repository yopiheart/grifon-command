import { describe, it, expect, vi } from 'vitest';
import {
  createAutopilotRun,
  runAutopilot,
  reshootScene,
  assembleFinalScript,
  mapReportToWizard,
  deriveAngleBrief,
  aspectRatioToPlatform,
  pickSceneDuration,
  researchCacheKey,
  type AutopilotInput,
  type AutopilotDeps,
  type AutopilotRun,
} from '../../services/autopilotOrchestrator.js';
import type { VideoModelType, VideoPrompt } from '../../types.js';
import type { MarketResearchReport, Script } from '../../types.js';

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
  videoHooks: [{ type: 'Pattern Interrupt', visual: 'v', spokenLine: 'Tignan mo to' }],
  villain: 'The P30K agency',
  competitorMatrix: [],
  fbAdLibraryAngles: [{ format: 'Testimonial', angle: 'real-talk', openingLine: 'Akala ko scam', whyItWorks: 'trust' }],
  rawEvidence: [],
  contrarianTruth: 'Process is not the moat',
  narrativeReport: '# report',
};

const SCRIPT: Script = { hook1: ['Hook one'], hook2: ['Hook two'], body: ['Body A', 'Body B'] };

function makeInput(): AutopilotInput {
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
    scriptType: 'Testimonial',
  };
}

/** Fully-mocked happy-path deps. Overrides let a test inject a failure. */
function makeDeps(over: Partial<AutopilotDeps> = {}): { deps: AutopilotDeps; spies: Record<string, ReturnType<typeof vi.fn>> } {
  let clock = 1_000;
  const spies = {
    generateMarketResearch: vi.fn(async () => REPORT),
    generateAdScript: vi.fn(async () => SCRIPT),
    generateStoryboard: vi.fn(async () => ({
      scenes: [
        { scriptLine: 'Line 0', sceneDescription: 'd0', imagePrompt: 'IMG0', referenceImage: 'avatar' as const },
        { scriptLine: 'Line 1', sceneDescription: 'd1', imagePrompt: 'IMG1', referenceImage: 'product' as const },
      ],
      strategicAudit: '',
    })),
    generateVideoPrompts: vi.fn(async () => [
      { scriptLine: 'Line 0', type: 'talking' as const, prompt: 'P0' },
      { scriptLine: 'Line 1', type: 'b-roll' as const, prompt: 'P1' },
    ]),
    generateSceneImage: vi.fn(async (prompt: string) => `img://${prompt}`),
    consolidateVoices: vi.fn(async (scenes: { sceneIdx: number }[]) =>
      scenes.map((s) => ({ sceneIdx: s.sceneIdx, audioUrl: `aud://${s.sceneIdx}` }))
    ),
    generateEditDecisionList: vi.fn(async () => ({
      meta: { totalDurationSec: 10, aspectRatio: '9:16' as const, targetPlatform: 'tiktok' as const, hookStrategy: 'h', formulaApplied: [], scriptStyleDetected: 'testimonial' as const },
      scenes: [{ sceneIdx: 0, sourceVideoUrl: '', sourceAudioUrl: '', keepSegments: [], voiceOffsetSec: 0, overlayText: [], sfxCues: [], notes: '' }],
      globalSfxPicks: [],
      formulaCheck: { rulesApplied: [], weaknessesFlagged: [] },
    })),
    renderFinalVideo: vi.fn(async () => ({ done: true, status: 'done' as const, url: 'final.mp4', downloadUrl: 'final-dl.mp4' })),
    runQueue: vi.fn(async (jobs: { sceneIdx: number }[], opts: { onEvent: (e: any) => void }) => {
      for (const j of jobs) {
        opts.onEvent({ type: 'status', sceneIdx: j.sceneIdx, status: 'rendering' });
        opts.onEvent({ type: 'status', sceneIdx: j.sceneIdx, status: 'done', result: { url: `vid://${j.sceneIdx}`, downloadUrl: 'd', mimeType: 'video/mp4' } });
      }
      opts.onEvent({ type: 'complete' });
    }),
    persist: vi.fn(async () => {}),
    now: vi.fn(() => clock++),
  };
  return { deps: { ...spies, ...over } as unknown as AutopilotDeps, spies };
}

function cb(run: AutopilotRun, signal?: AbortSignal) {
  return { onUpdate: () => {}, signal: signal ?? new AbortController().signal, userId: 'u1' };
}

// --- Pure-helper tests ----------------------------------------------------

describe('autopilot pure helpers', () => {
  it('assembleFinalScript auto-picks hook1 + body', () => {
    expect(assembleFinalScript(SCRIPT)).toEqual(['Hook one', 'Body A', 'Body B']);
  });
  it('mapReportToWizard projects research onto wizard fields + carries the hero image', () => {
    const { clientDetails, businessInfo } = mapReportToWizard(makeInput(), REPORT);
    expect(clientDetails).toEqual({ brandName: 'Brew', offer: 'Buy 1 Take 1' });
    expect(businessInfo.painPoint).toBe('Content eats my day');
    expect(businessInfo.productImageUrls).toEqual(['data:image/png;base64,AAAA']);
    expect(businessInfo.scriptType).toBe('Testimonial');
  });
  it('deriveAngleBrief uses the first FB ad-library angle', () => {
    expect(deriveAngleBrief(REPORT)).toContain('Akala ko scam');
  });
  it('aspectRatioToPlatform maps ratios to platforms', () => {
    expect(aspectRatioToPlatform('9:16')).toBe('tiktok');
    expect(aspectRatioToPlatform('16:9')).toBe('youtube');
    expect(aspectRatioToPlatform('1:1')).toBe('reels');
  });
});

// --- Driver tests ---------------------------------------------------------

describe('runAutopilot — happy path', () => {
  it('advances every stage to done, reaches the review gate, and assembles the final video', async () => {
    const run = createAutopilotRun(makeInput(), 'u1');
    const { deps, spies } = makeDeps();
    const out = await runAutopilot(run, cb(run), deps);

    expect(out.status).toBe('review');
    expect(out.stages.every((s) => s.status === 'done')).toBe(true);
    expect(out.scenes.map((s) => s.status)).toEqual(['done', 'done']);
    expect(out.scenes.map((s) => s.videoUrl)).toEqual(['vid://0', 'vid://1']);
    expect(out.scenes.map((s) => s.audioUrl)).toEqual(['aud://0', 'aud://1']);
    expect(out.finalVideoUrl).toBe('final.mp4');
    expect(out.finalDownloadUrl).toBe('final-dl.mp4');
    // Each AI flow called exactly once on the happy path.
    expect(spies.generateMarketResearch).toHaveBeenCalledTimes(1);
    expect(spies.generateStoryboard).toHaveBeenCalledTimes(1);
    expect(spies.generateSceneImage).toHaveBeenCalledTimes(2);
    expect(spies.renderFinalVideo).toHaveBeenCalledTimes(1);
    // Persisted after every mutation (resumability).
    expect(spies.persist.mock.calls.length).toBeGreaterThan(8);
  });
});

describe('runAutopilot — persist → resume skips completed stages', () => {
  it('a run aborted mid-flight resumes without re-running completed stages', async () => {
    const input = makeInput();
    const run = createAutopilotRun(input, 'u1');

    // Pass 1: abort right after the storyboard stage completes.
    const controller = new AbortController();
    const { deps: deps1, spies: spies1 } = makeDeps();
    const onUpdate = (r: AutopilotRun) => {
      if (r.stages.find((s) => s.id === 'storyboard')?.status === 'done' && r.storyboard) controller.abort();
    };
    await runAutopilot(run, { onUpdate, signal: controller.signal, userId: 'u1' }, deps1);
    expect(run.stages.find((s) => s.id === 'storyboard')?.status).toBe('done');
    expect(run.stages.find((s) => s.id === 'scene_images')?.status).not.toBe('done');
    expect(spies1.generateSceneImage).not.toHaveBeenCalled(); // never reached

    // Pass 2: resume the SAME run with fresh spies — completed stages are skipped.
    const { deps: deps2, spies: spies2 } = makeDeps();
    const out = await runAutopilot(run, cb(run), deps2);
    expect(out.status).toBe('review');
    expect(spies2.generateMarketResearch).not.toHaveBeenCalled();
    expect(spies2.generateAdScript).not.toHaveBeenCalled();
    expect(spies2.generateStoryboard).not.toHaveBeenCalled();
    // ...but the unfinished stages DID run on resume.
    expect(spies2.generateSceneImage).toHaveBeenCalledTimes(2);
    expect(spies2.renderFinalVideo).toHaveBeenCalledTimes(1);
  });
});

describe('runAutopilot — retry-then-flag (never hard-stops on a bad scene)', () => {
  it('flags a scene whose image fails all retries, assembles the rest, reaches review', async () => {
    // Scene 0's image always fails (both attempts); scene 1 succeeds first try.
    const imageMock = vi.fn(async (prompt: string) => {
      if (prompt === 'IMG0') throw new Error('image 502');
      return `img://${prompt}`;
    });
    const { deps } = makeDeps({ generateSceneImage: imageMock as any });
    const run = createAutopilotRun(makeInput(), 'u1');
    const out = await runAutopilot(run, cb(run), deps);

    expect(out.status).toBe('review');
    expect(out.scenes[0].status).toBe('flagged');
    expect(out.scenes[0].flaggedReason).toContain('image');
    expect(out.scenes[1].status).toBe('done');
    // The flagged scene was retried (2 attempts on IMG0) before being flagged;
    // scene 1 succeeded on its first call → 3 total image calls.
    expect(imageMock.mock.calls.filter((c) => c[0] === 'IMG0')).toHaveLength(2);
    expect(out.finalVideoUrl).toBe('final.mp4'); // assembled from the surviving scene
  });

  it('flags a scene whose video render fails, keeps the rest', async () => {
    const { deps } = makeDeps({
      runQueue: vi.fn(async (jobs: { sceneIdx: number }[], opts: { onEvent: (e: any) => void }) => {
        for (const j of jobs) {
          if (j.sceneIdx === 1) opts.onEvent({ type: 'status', sceneIdx: 1, status: 'failed', error: 'veo timeout' });
          else opts.onEvent({ type: 'status', sceneIdx: j.sceneIdx, status: 'done', result: { url: `vid://${j.sceneIdx}` } });
        }
        opts.onEvent({ type: 'complete' });
      }) as any,
    });
    const run = createAutopilotRun(makeInput(), 'u1');
    const out = await runAutopilot(run, cb(run), deps);
    expect(out.status).toBe('review');
    expect(out.scenes[0].status).toBe('done');
    expect(out.scenes[1].status).toBe('flagged');
    expect(out.scenes[1].flaggedReason).toContain('video');
  });
});

describe('reshootScene — one-tap regenerate of a flagged scene', () => {
  it('re-runs the scene image+video+voice, clears the flag, re-assembles, returns to review', async () => {
    // First do a normal run where scene 1's video fails (flagged).
    const { deps } = makeDeps({
      runQueue: vi.fn(async (jobs: { sceneIdx: number }[], opts: { onEvent: (e: any) => void }) => {
        for (const j of jobs) {
          if (j.sceneIdx === 1) opts.onEvent({ type: 'status', sceneIdx: 1, status: 'failed', error: 'veo timeout' });
          else opts.onEvent({ type: 'status', sceneIdx: j.sceneIdx, status: 'done', result: { url: `vid://${j.sceneIdx}` } });
        }
        opts.onEvent({ type: 'complete' });
      }) as any,
    });
    const run = createAutopilotRun(makeInput(), 'u1');
    await runAutopilot(run, cb(run), deps);
    expect(run.scenes[1].status).toBe('flagged');

    // Now reshoot scene 1 with deps whose runQueue succeeds.
    const { deps: healDeps } = makeDeps();
    const out = await reshootScene(run, 1, cb(run), healDeps);
    expect(out.scenes[1].status).toBe('done');
    expect(out.scenes[1].videoUrl).toBe('vid://1');
    expect(out.scenes[1].flaggedReason).toBeUndefined();
    expect(out.status).toBe('review');
    expect(out.finalVideoUrl).toBe('final.mp4');
  });
});

describe('pickSceneDuration — never emits an INVALID_COMBO duration', () => {
  // Mirror of VIDEO_MODEL_SPECS.durationsByResolution (geminiService.ts) — the
  // server-side getValidDurations check generateVideo runs against job.duration.
  // The regression this guards: the old flat `return 5` threw on Veo @720p
  // ([4,6,8]) the moment the first talking scene rendered.
  const VALID: Record<string, Record<'720p' | '1080p', number[]>> = {
    Veo_3_1_Lite: { '720p': [4, 6, 8], '1080p': [8] },
    Veo_3_1_Fast: { '720p': [4, 6, 8], '1080p': [4, 6, 8] },
    Kling_3_0: { '720p': [5, 10], '1080p': [5, 10] },
    Kling_O1: { '720p': [5, 10], '1080p': [5, 10] },
  };
  // The (type → routed model) pairs the orchestrator actually produces.
  const ROUTED: { type: VideoPrompt['type']; model: VideoModelType; key: string }[] = [
    { type: 'talking', model: 'Veo_3.1_Lite', key: 'Veo_3_1_Lite' }, // 720p talking
    { type: 'talking', model: 'Veo_3.1_Fast', key: 'Veo_3_1_Fast' }, // 1080p talking (Lite→Fast)
    { type: 'b-roll', model: 'Kling_3_0', key: 'Kling_3_0' },
    { type: 'b-roll', model: 'Kling_O1', key: 'Kling_O1' }, // scene-0 hook
    { type: 'cinematic', model: 'Kling_3_0', key: 'Kling_3_0' },
  ];

  for (const res of ['720p', '1080p'] as const) {
    for (const { type, model, key } of ROUTED) {
      it(`${type} on ${model} @${res} is a model-valid duration`, () => {
        const d = pickSceneDuration(type, model, res);
        expect(VALID[key][res]).toContain(d);
      });
    }
  }

  it('defaults resolution to 720p when omitted', () => {
    expect([4, 6, 8]).toContain(pickSceneDuration('talking', 'Veo_3.1_Lite'));
    expect([5, 10]).toContain(pickSceneDuration('b-roll', 'Kling_3_0'));
  });
});

describe('market-research cache (per brand+product, reuse-by-default)', () => {
  it('researchCacheKey normalizes brand + product (casing/whitespace agnostic)', () => {
    expect(researchCacheKey('  Brew ', 'Bukidnon BREW')).toBe('brew::bukidnon brew');
    expect(researchCacheKey('Brew', 'Bukidnon Brew')).toBe(researchCacheKey('BREW', ' bukidnon brew '));
  });

  it('reuses cached research and SKIPS the research call on a cache hit', async () => {
    const getCachedResearch = vi.fn(async () => REPORT);
    const putCachedResearch = vi.fn(async () => {});
    const { deps, spies } = makeDeps({ getCachedResearch, putCachedResearch });
    const run = createAutopilotRun(makeInput(), 'u1');
    const out = await runAutopilot(run, cb(run), deps);

    expect(getCachedResearch).toHaveBeenCalledWith(researchCacheKey('Brew', 'Bukidnon Brew'));
    expect(spies.generateMarketResearch).not.toHaveBeenCalled();
    expect(putCachedResearch).not.toHaveBeenCalled(); // nothing new to store
    expect(out.businessInfo?.scriptType).toBe('Testimonial'); // still maps downstream
  });

  it('on a cache miss, runs research once and stores it under the key', async () => {
    const getCachedResearch = vi.fn(async () => null);
    const putCachedResearch = vi.fn(async () => {});
    const { deps, spies } = makeDeps({ getCachedResearch, putCachedResearch });
    const run = createAutopilotRun(makeInput(), 'u1');
    await runAutopilot(run, cb(run), deps);

    expect(spies.generateMarketResearch).toHaveBeenCalledTimes(1);
    expect(putCachedResearch).toHaveBeenCalledWith(researchCacheKey('Brew', 'Bukidnon Brew'), REPORT);
  });

  it('forceFreshResearch bypasses the cache entirely', async () => {
    const getCachedResearch = vi.fn(async () => REPORT);
    const putCachedResearch = vi.fn(async () => {});
    const { deps, spies } = makeDeps({ getCachedResearch, putCachedResearch });
    const run = createAutopilotRun({ ...makeInput(), forceFreshResearch: true }, 'u1');
    await runAutopilot(run, cb(run), deps);

    expect(getCachedResearch).not.toHaveBeenCalled();
    expect(spies.generateMarketResearch).toHaveBeenCalledTimes(1);
    expect(putCachedResearch).toHaveBeenCalledTimes(1);
  });
});

describe('runAutopilot — fatal early failure aborts the run', () => {
  it('market research failing all retries sets status error and runs nothing downstream', async () => {
    const { deps, spies } = makeDeps({
      generateMarketResearch: vi.fn(async () => {
        throw new Error('marketmind down');
      }) as any,
    });
    const run = createAutopilotRun(makeInput(), 'u1');
    const out = await runAutopilot(run, cb(run), deps);

    expect(out.status).toBe('error');
    expect(out.error).toContain('market_research');
    expect(out.stages.find((s) => s.id === 'market_research')?.status).toBe('failed');
    expect(spies.generateAdScript).not.toHaveBeenCalled();
    expect(spies.renderFinalVideo).not.toHaveBeenCalled();
  });
});
