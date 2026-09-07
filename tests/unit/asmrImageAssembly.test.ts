import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSceneImage } from '../../services/geminiService.js';
import { buildStoryboardPrompt } from '../../api/_lib/prompts.js';
import {
  createProductionRun, regenSceneImage, reshootScene, runProduction,
  type ProducerDeps, type ProductionInput,
} from '../../services/producerOrchestrator.js';
import type { BusinessInfo, MarketResearchReport, Scene, Script } from '../../types.js';

vi.mock('../../services/supabaseClient.js', () => ({
  getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 'mock-token' } } }) } }),
}));
vi.mock('../../services/analyticsService.js', () => ({ trackEvent: vi.fn() }));

const dataUrl = (marker: string) => `data:image/png;base64,${Buffer.from(marker).toString('base64')}`;
const AVATAR = dataUrl('AVATAR');
const HERO = dataUrl('HERO');
const BOX = dataUrl('PACKAGING');
const CONTINUITY = dataUrl('CONTINUITY');
type ImageRequest = { contents: { parts: { inlineData?: { data: string }; text?: string }[] } };
const requests: { body: ImageRequest; output: string }[] = [];
const textOf = (r: ImageRequest) => r.contents.parts.map(p => p.text ?? '').join('');
const refsOf = (r: ImageRequest) => r.contents.parts.filter(p => p.inlineData).map(p => Buffer.from(p.inlineData!.data, 'base64').toString());
const requestFor = (marker: string) => {
  const found = requests.find(r => textOf(r.body).includes(`**Scene Prompt:** ${marker}`));
  expect(found, `image proxy received ${marker}`).toBeDefined();
  return found!;
};

beforeEach(() => {
  vi.useFakeTimers();
  requests.length = 0;
  vi.stubGlobal('fetch', vi.fn(async (url: string, init: RequestInit) => {
    if (url !== '/api/gemini/image') throw new Error(`Unexpected external call: ${url}`);
    const output = `GENERATED_${requests.length}`;
    requests.push({ body: JSON.parse(init.body as string), output });
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: Buffer.from(output).toString('base64') } }] } }] }));
  }));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function settle<T>(promise: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return promise;
}

const input = (overrides: Partial<ProductionInput> = {}): ProductionInput => ({
  brandName: 'Silid Home', productName: 'Sampaguita Candle', productDescription: 'Squat labeled jar with lift-off lid',
  offer: 'One candle', price: '499', heroImageBase64: HERO,
  avatar: { url: AVATAR, description: 'Filipina presenter', ethnicity: 'Filipino', prompt: '' },
  voiceId: 'mock-voice', language: 'English', aspectRatio: '9:16', scriptType: 'UGCPro',
  ugcProFormat: 'unboxing', asmrFlag: true,
  servicePhotos: [{ slot: 'packaging', url: BOX }], ...overrides,
} as ProductionInput);

const scenes = (): Scene[] => [
  { scriptLine: 'Listen', sceneDescription: 'Tactile hook', imagePrompt: 'S1 texture', referenceImage: 'both' },
  { scriptLine: 'Lift the lid', sceneDescription: 'Open packaging', imagePrompt: 'S2 START closed packaging', startFramePrompt: 'S2 START closed packaging', endFramePrompt: 'S2 END Sampaguita Candle on the table', referenceImage: 'both', venueSlot: 'packaging' },
  { scriptLine: 'Feel the jar', sceneDescription: 'Jar detail', imagePrompt: 'S3 detail', referenceImage: 'product' },
  { scriptLine: 'Order yours', sceneDescription: 'Presenter CTA', imagePrompt: 'CTA face and supported jar', referenceImage: 'both' },
];

function harness(board = scenes(), intake = input()) {
  const deps: ProducerDeps = {
    generateMarketResearch: vi.fn(async () => ({ subject: 'Silid Home' } as MarketResearchReport)),
    generateAdScript: vi.fn(async () => ({ hook1: ['Listen'], hook2: ['Touch'], body: ['Lift', 'Order'] } as Script)),
    generateStoryboard: vi.fn(async () => ({ scenes: structuredClone(board), strategicAudit: '' })),
    generateSceneImage,
    generateVideoPrompts: vi.fn(async () => board.map(s => ({ scriptLine: s.scriptLine, type: 'b-roll' as const, prompt: 'mock video' }))),
    generateEditDecisionList: vi.fn(),
    consolidateVoices: vi.fn(async () => []),
    renderFinalVideo: vi.fn(async () => ({ status: 'done' as const, url: 'mock://final' })),
    submitVideo: vi.fn(async config => ({ operation: {}, prompt: config.prompt, model: config.model, aspectRatio: config.aspectRatio, duration: config.duration })),
    pollVideo: vi.fn(async () => ({ url: 'mock://video', downloadUrl: 'mock://video', mimeType: 'video/mp4' })),
    persist: vi.fn(async () => {}), now: () => 1000,
    run: {
      seedScenes: vi.fn(async () => {}), claimScene: vi.fn(async () => ({ claimed: true })),
      recordScene: vi.fn(async () => ({ changed: true })), recordSceneImage: vi.fn(async () => ({ changed: true })),
      completeScene: vi.fn(async () => ({ changed: true })), flagScene: vi.fn(async () => ({ changed: true })),
      requeueScene: vi.fn(async () => ({ changed: true })),
    },
  };
  const cb = { onUpdate: vi.fn(), signal: new AbortController().signal, userId: 'mock-user' };
  const fresh = () => settle(runProduction(createProductionRun(intake, cb.userId), cb, deps));
  return { deps, cb, fresh };
}

describe('ASMR requests through real production and image transport', () => {
  it('anchors fresh packaging to the product lock and parks before video', async () => {
    const h = harness();
    const run = await h.fresh();
    expect(run.gate).toBe('storyboard');
    expect(h.deps.submitVideo).not.toHaveBeenCalled();
    const start = requestFor('S2 START');
    expect(refsOf(start.body)).toEqual(['PACKAGING']);
    expect(textOf(start.body)).toContain('PRODUCT_IDENTITY_LOCK');
    expect(textOf(start.body)).not.toContain('PLACE_IDENTITY_LOCK');
  });

  it.each(['fresh', 'regen', 'reshoot'] as const)('%s END uses hero then START continuity without avatar or sheet', async path => {
    const h = harness();
    const run = await h.fresh();
    if (path !== 'fresh') {
      requests.length = 0;
      await settle((path === 'regen' ? regenSceneImage : reshootScene)(run, 1, h.cb, h.deps));
      expect(run.scenes[1].flaggedReason).toBeUndefined();
      if (path === 'reshoot') expect(h.deps.renderFinalVideo).toHaveBeenCalledOnce();
    }
    const start = requestFor('S2 START');
    const end = requestFor('S2 END');
    expect.soft(refsOf(start.body)).toEqual(['PACKAGING']);
    expect.soft(textOf(start.body)).toContain('PRODUCT_IDENTITY_LOCK');
    expect.soft(refsOf(end.body)).toEqual(['HERO', start.output]);
    expect.soft(textOf(end.body)).toContain('PRODUCT_IDENTITY_LOCK');
    expect.soft(textOf(end.body)).toContain('Reproduce the product from Reference Image 1 EXACTLY');
    expect.soft(textOf(end.body)).toContain('CONTINUITY_LOCK');
    expect.soft(textOf(end.body)).toContain('Reference Image 2 governs WHERE the camera is');
    expect.soft(textOf(end.body)).not.toContain('DUAL_REFERENCE_LOCK');
    expect.soft(textOf(end.body)).not.toContain('TWO real objects');
  });

  it.each(['fresh', 'regen', 'reshoot'] as const)('%s CTA preserves face, supported product and physical scale', async path => {
    const h = harness();
    const run = await h.fresh();
    if (path !== 'fresh') {
      requests.length = 0;
      await settle((path === 'regen' ? regenSceneImage : reshootScene)(run, 3, h.cb, h.deps));
      expect(run.scenes[3].flaggedReason).toBeUndefined();
    }
    const cta = requestFor('CTA');
    expect(refsOf(cta.body)).toEqual(['AVATAR', 'HERO']);
    const prompt = textOf(cta.body);
    expect(prompt).toContain('DUAL_REFERENCE_LOCK');
    expect.soft(prompt).toContain('both eyes and mouth visible AND the supported product');
    expect.soft(prompt).toContain('physical size relative to the reference hand/grip');
    expect.soft(prompt).not.toContain('You MUST render this exact framing:');
    expect.soft(prompt).not.toMatch(/(?:one.third|a third|33%|AT LEAST)/);
    expect.soft(prompt).toContain('ACTUAL available light and white balance');
  });

  it('keeps the label and support rules beyond the 400-character scene cap', async () => {
    const board = scenes();
    board[2].imagePrompt = `LONG ${'x'.repeat(500)} TRUNCATED_TAIL`;
    await harness(board).fresh();
    const prompt = textOf(requestFor('LONG').body);
    expect(prompt).not.toContain('TRUNCATED_TAIL');
    expect.soft(prompt).toContain('Preserve ALL words, letters, logos and artwork');
    expect.soft(prompt).not.toContain('NO TEXT, NO TYPOGRAPHY, NO WORDS, NO LETTERS');
    expect.soft(prompt).toContain('A pointing or touching finger is NOT a support');
    expect.soft(prompt).toContain('width-to-height proportions');
    expect.soft(prompt).toContain('contact shadow');
    expect.soft(prompt).toContain('do not add an amber/orange cast');
  });

  it('does not drop a presenter when the product reference is missing', async () => {
    const h = harness(scenes(), input({ heroImageBase64: '', servicePhotos: [] }));
    const run = await h.fresh();
    expect(run.storyboard![1].referenceImage).toBe('both');
    expect(refsOf(requestFor('S2 START').body)).toEqual(['AVATAR']);
    expect(textOf(requestFor('S2 START').body)).not.toContain('ASMR PRODUCT PHYSICS');
  });

  it.each(['regen', 'reshoot'] as const)('%s refuses a lost CTA presenter before any replacement request', async path => {
    const h = harness();
    const run = await h.fresh();
    const original = run.storyboard![3].imageUrl;
    run.input.avatar.url = '';
    requests.length = 0;
    await settle((path === 'regen' ? regenSceneImage : reshootScene)(run, 3, h.cb, h.deps));
    expect(requests).toHaveLength(0);
    expect(run.storyboard![3].imageUrl).toBe(original);
    expect(run.scenes[3].flaggedReason).toContain('Presenter reference was lost');
    expect(h.deps.run.requeueScene).not.toHaveBeenCalled();
  });

  it('retains END guards for abstract reveals, missing heroes and the final scene', async () => {
    for (const kind of ['abstract', 'missing-hero', 'final'] as const) {
      requests.length = 0;
      const board = scenes();
      const idx = kind === 'final' ? 3 : 1;
      board[idx] = { ...board[idx], referenceImage: 'product', endFramePrompt: kind === 'abstract' ? 'GUARD END abstract smoke' : 'GUARD END Sampaguita Candle' };
      const h = harness(board, input(kind === 'missing-hero' ? { heroImageBase64: '' } : {}));
      await h.fresh();
      const end = requestFor('GUARD END');
      expect(refsOf(end.body)[0]).toBe('AVATAR');
      expect(refsOf(end.body)).toHaveLength(kind === 'final' ? 3 : 2);
      if (kind === 'final') expect(textOf(end.body)).toContain('DUAL_REFERENCE_LOCK');
    }
  });
});

describe('ASMR storyboard support and size contract', () => {
  it('requires believable support without a fixed CTA product occupancy', () => {
    const prompt = buildStoryboardPrompt({ script: ['Listen', 'Lift', 'Touch', 'Order'], avatarDescription: 'Filipina presenter', ethnicity: 'Filipino', language: 'English', businessInfo: { product: 'Sampaguita Candle', scriptType: 'UGCPro', ugcProFormat: 'unboxing', asmrFlag: true } as BusinessInfo });
    expect.soft(prompt).toContain('PHYSICAL SUPPORT');
    expect.soft(prompt).toContain('product MUST rest on the surface');
    expect.soft(prompt).toMatch(/without\s+a minimum product share/);
    expect.soft(prompt).not.toContain('LEAST a third of the frame height');
  });
});

describe('non-ASMR image request goldens captured before the approved patch', () => {
  it('preserves every payload byte across reference modes, angles and continuity', async () => {
    const goldens: Record<string, string> = {};
    for (const mode of ['product', 'avatar', 'both', 'venue', 'avatar_state', 'avatar_venue', 'none'] as const) {
      for (const continuity of [false, true]) {
        for (const angle of [0, 1, 2, 3]) {
          const refs = { avatarUrl: AVATAR, productUrl: HERO, ...(continuity ? { continuityUrl: CONTINUITY } : {}) };
          await settle(generateSceneImage('Golden reference scene', '9:16', '1K', refs, 'Filipino', [], 'UGCPro', 'Squat jar', 'Sampaguita Candle', angle, mode));
          const original = JSON.stringify(requests.at(-1)!.body);
          // Hashes freeze full payloads without duplicating tuned prompt text into a fixture.
          goldens[`${mode}/${continuity}/${angle}`] = createHash('sha256').update(original).digest('hex');
          await settle(Reflect.apply(generateSceneImage, undefined, ['Golden reference scene', '9:16', '1K', refs, 'Filipino', [], 'UGCPro', 'Squat jar', 'Sampaguita Candle', angle, mode, false]) as Promise<string>);
          expect(JSON.stringify(requests.at(-1)!.body)).toBe(original);
        }
      }
    }
    expect(goldens).toMatchSnapshot();
  });
});
