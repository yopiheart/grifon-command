import { describe, it, expect, vi } from 'vitest';
import { ROTATION, resolvePreset, rotationSeed } from '../../api/_lib/renderPresets.js';
import {
  createProductionRun,
  applyPreset,
  type ProductionInput,
  type ProducerDeps,
  type ProductionRun,
  type ProducerRunStore,
} from '../../services/producerOrchestrator.js';
import type { BusinessInfo, EditDecisionList, FinalRenderRequest } from '../../types.js';

// Intent (Slice 3, Decision 1 + 4): UGC Pro gets its own caption/music identity.
//  - ROTATION.ugcpro is the hype pool (word-pop + gold caption grammar) — no new preset.
//  - The final_render style is a DETERMINISTIC override: a UGCPro run always burns 'ugcpro'
//    (we know the scriptType), never the EDL-detected style (which mis-detects UGCPro as
//    testimonial → CLEAN preset, burying the caption bet). Non-UGCPro keeps the EDL style.
//  - ASMR is audio-led → music.enabled seeds false (the taps ARE the audio).

describe('UGC Pro preset identity (ROTATION + resolvePreset)', () => {
  it("ROTATION.ugcpro is exactly ['hype']", () => {
    expect(ROTATION.ugcpro).toEqual(['hype']);
  });

  it("resolvePreset('ugcpro', undefined, seed) rotates to the hype preset", () => {
    const seed = rotationSeed(['https://cdn/a.mp4', 'https://cdn/b.mp4']);
    expect(resolvePreset('ugcpro', undefined, seed).id).toBe('hype');
  });
});

// ── producerOrchestrator deterministic override drive ──────────────────────
// applyPreset() re-runs the final_render stage directly, so it's the cheapest way to
// exercise the music.style/enabled construction without driving the whole pipeline.

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

const edlWith = (style: EditDecisionList['meta']['scriptStyleDetected']): EditDecisionList =>
  ({ meta: { scriptStyleDetected: style }, scenes: [], globalSfxPicks: [], formulaCheck: {} } as unknown as EditDecisionList);

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

function makeDeps(renderFinalVideo: ReturnType<typeof vi.fn>): ProducerDeps {
  return {
    generateMarketResearch: vi.fn(),
    generateAdScript: vi.fn(),
    generateStoryboard: vi.fn(),
    generateVideoPrompts: vi.fn(),
    generateSceneImage: vi.fn(),
    generateEditDecisionList: vi.fn(),
    consolidateVoices: vi.fn(),
    renderFinalVideo,
    submitVideo: vi.fn(),
    pollVideo: vi.fn(),
    persist: vi.fn(async () => {}),
    now: vi.fn(() => 1000),
    run: makeFakeStore(),
  } as unknown as ProducerDeps;
}

const cb = () => ({ onUpdate: () => {}, signal: new AbortController().signal, userId: 'u1' });

async function driveFinalRender(
  input: ProductionInput,
  opts: { edlStyle: EditDecisionList['meta']['scriptStyleDetected']; businessInfo?: Partial<BusinessInfo> } ,
): Promise<FinalRenderRequest> {
  const renderFinalVideo = vi.fn(async () => ({ status: 'done', url: 'final.mp4', downloadUrl: 'dl.mp4' }));
  const run: ProductionRun = createProductionRun(input, 'u1', {
    prefill: {
      storyboard: [{ scriptLine: 'Line 0', sceneDescription: 'd', imagePrompt: 'IMG0', referenceImage: 'avatar' } as any],
      scenes: [{ sceneIdx: 0, status: 'done', videoUrl: 'v0.mp4' }],
      edl: edlWith(opts.edlStyle),
      videoPrompts: [{ type: 'talking' } as any],
      businessInfo: { scriptType: input.scriptType, ...opts.businessInfo } as BusinessInfo,
    },
  });
  await applyPreset(run, null, cb(), makeDeps(renderFinalVideo));
  expect(renderFinalVideo).toHaveBeenCalledTimes(1);
  return renderFinalVideo.mock.calls[0][0] as FinalRenderRequest;
}

describe('final_render deterministic style override (§Decision 1)', () => {
  it('UGCPro run burns music.style = ugcpro, ignoring the EDL-detected testimonial', async () => {
    const req = await driveFinalRender(makeInput({ scriptType: 'UGCPro' }), { edlStyle: 'testimonial' });
    expect(req.music?.style).toBe('ugcpro');
  });

  it('non-UGCPro run keeps the EDL-detected style (no override)', async () => {
    const req = await driveFinalRender(makeInput({ scriptType: 'Testimonial' }), { edlStyle: 'testimonial' });
    expect(req.music?.style).toBe('testimonial');
  });

  it('non-UGCPro run keeps music enabled by default', async () => {
    const req = await driveFinalRender(makeInput({ scriptType: 'MrBeast' }), { edlStyle: 'mrbeast' });
    expect(req.music?.enabled).toBe(true);
  });
});

describe('final_render ASMR music-off default (§Decision 2)', () => {
  it('ASMR run seeds music.enabled = false (audio-led — the taps ARE the audio)', async () => {
    const req = await driveFinalRender(makeInput({ scriptType: 'UGCPro' }), {
      edlStyle: 'testimonial',
      businessInfo: { asmrFlag: true },
    });
    expect(req.music?.style).toBe('ugcpro');
    expect(req.music?.enabled).toBe(false);
  });

  it('non-ASMR UGCPro run keeps music enabled', async () => {
    const req = await driveFinalRender(makeInput({ scriptType: 'UGCPro' }), {
      edlStyle: 'testimonial',
      businessInfo: { asmrFlag: false },
    });
    expect(req.music?.enabled).toBe(true);
  });
});
