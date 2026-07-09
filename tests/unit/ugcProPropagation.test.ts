import { describe, it, expect, vi } from 'vitest';
import {
  createProductionRun,
  runProduction,
  type ProductionInput,
  type ProducerDeps,
  type ProductionRun,
  type ProducerRunStore,
  type VideoJobHandle,
} from '../../services/producerOrchestrator.js';
import type { MarketResearchReport, Script } from '../../types.js';

// Intent (Slice 2 §1): the server-resolved UGC Pro sub-format must be threaded back onto
// businessInfo.ugcProFormat after the script stage so the downstream storyboard prompt (which
// reads that field) is ALWAYS populated — even on the 'Auto' path where the user made no pick.
// The write-back is NULLISH: an explicit user pick must never be overwritten by the classifier's
// resolution, even if they disagree.

const REPORT = {
  subject: 'Aurora',
  winningAvatar: 'Gym-goer',
  bleedingNeck: 'Leggings go see-through',
  emotionalPayoff: 'confidence',
  bigIdea: 'Squat-proof',
  headlines: ['h1'],
  videoHooks: [{ type: 'Hook', visual: 'v', spokenLine: 'Grabe' } as any],
  fbAdLibraryAngles: [{ format: 'Testimonial', angle: 'real-talk', openingLine: 'Akala ko', whyItWorks: 'trust' } as any],
} as unknown as MarketResearchReport;

const makeScript = (resolved?: 'tryon' | 'transformation'): Script => ({
  hook1: ['Hook one'],
  hook2: ['Hook two'],
  body: ['Body A', 'Body B'],
  ...(resolved ? { ugcProFormatResolved: resolved } : {}),
});

function makeInput(over: Partial<ProductionInput> = {}): ProductionInput {
  return {
    brandName: 'Aurora',
    offer: '₱899 per set',
    price: '₱899',
    productName: 'Aurora Activewear Set',
    productDescription: 'squat-proof high-waist leggings',
    heroImageBase64: 'data:image/png;base64,AAAA',
    avatar: { url: 'avatar.png', description: 'a Filipino host', ethnicity: 'Filipino', prompt: '' },
    voiceId: 'v1',
    language: 'Taglish',
    aspectRatio: '9:16',
    scriptType: 'UGCPro',
    ...over,
  };
}

// Minimal ProducerRunStore — the run parks at the storyboard gate BEFORE any video spend,
// so only the pre-video image path touches the store.
function makeFakeStore(): ProducerRunStore {
  const noHandle = { changed: true };
  return {
    seedScenes: vi.fn(async () => {}),
    claimScene: vi.fn(async () => ({ claimed: true })),
    recordScene: vi.fn(async () => noHandle),
    recordSceneImage: vi.fn(async () => noHandle),
    completeScene: vi.fn(async () => noHandle),
    flagScene: vi.fn(async () => noHandle),
    requeueScene: vi.fn(async () => noHandle),
  } as unknown as ProducerRunStore;
}

function makeDeps(script: Script): ProducerDeps {
  return {
    generateMarketResearch: vi.fn(async () => REPORT),
    generateAdScript: vi.fn(async () => script),
    generateStoryboard: vi.fn(async () => ({
      scenes: [
        { scriptLine: 'Line 0', sceneDescription: 'd0', imagePrompt: 'IMG0', referenceImage: 'avatar' },
        { scriptLine: 'Line 1', sceneDescription: 'd1', imagePrompt: 'IMG1', referenceImage: 'product' },
      ],
      strategicAudit: '',
    })),
    generateVideoPrompts: vi.fn(async () => []),
    generateSceneImage: vi.fn(async (prompt: string) => `img://${prompt}`),
    generateEditDecisionList: vi.fn(async () => ({ meta: {}, scenes: [], globalSfxPicks: [], formulaCheck: {} })),
    consolidateVoices: vi.fn(async () => []),
    renderFinalVideo: vi.fn(async () => ({ done: true, status: 'done', url: 'final.mp4', downloadUrl: 'dl.mp4' })),
    submitVideo: vi.fn(async (): Promise<VideoJobHandle> => ({} as VideoJobHandle)),
    pollVideo: vi.fn(async () => ({ url: 'v', downloadUrl: 'd', mimeType: 'video/mp4' })),
    persist: vi.fn(async () => {}),
    now: vi.fn(() => 1000),
    run: makeFakeStore(),
  } as unknown as ProducerDeps;
}

const cb = () => ({ onUpdate: () => {}, signal: new AbortController().signal, userId: 'u1' });

async function runToStoryboardGate(input: ProductionInput, script: Script): Promise<ProductionRun> {
  const run = createProductionRun(input, 'u1');
  await runProduction(run, cb(), makeDeps(script));
  return run;
}

describe('UGC Pro sub-format propagation (§1) — producer script stage write-back', () => {
  it('Auto path: back-fills businessInfo.ugcProFormat from the server-resolved sub-format', async () => {
    const run = await runToStoryboardGate(makeInput({ ugcProFormat: undefined }), makeScript('tryon'));
    expect(run.gate).toBe('storyboard'); // parked before spend, script stage already ran
    expect(run.businessInfo?.scriptType).toBe('UGCPro');
    expect(run.businessInfo?.ugcProFormat).toBe('tryon');
  });

  it("explicit user pick is preserved and NOT overwritten by the resolution", async () => {
    // User explicitly chose transformation; the returned resolution (tryon) must NOT clobber it.
    const run = await runToStoryboardGate(makeInput({ ugcProFormat: 'transformation' }), makeScript('tryon'));
    expect(run.businessInfo?.ugcProFormat).toBe('transformation');
  });

  it('non-UGCPro runs never receive a ugcProFormat back-fill', async () => {
    const run = await runToStoryboardGate(makeInput({ scriptType: 'MrBeast' }), makeScript());
    expect(run.businessInfo?.ugcProFormat).toBeUndefined();
  });
});
