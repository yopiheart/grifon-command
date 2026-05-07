import { describe, it, expect, vi, beforeEach } from 'vitest';

// What this file catches:
//   1. Output-shape regressions — if a refactor breaks how geminiService parses
//      Gemini's JSON, the typed return shape will drift and tests fail.
//   2. Request-shape regressions — if model IDs or JSON-mode config change, tests fail.
//   3. Prompt-invariant regressions — if the tuned safety/strategy rules
//      (STILL_FRAME_RULE, 30/70, NO PRICE, STORY RELAY phase contract, etc.)
//      are accidentally dropped from the tuned prompt, tests fail.
//
// What this file does NOT catch:
//   - Real-world Gemini API drift. Tests use canned mocks; if Gemini starts
//     returning a new shape in production, only runtime validation would catch it.
//     Adding runtime validators to geminiService.ts is a separate, future task.
//   - Stochastic output quality (script wit, scene cohesion, etc.).

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const okGemini = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => ({ text: JSON.stringify(payload) }),
});

const captureLastFetchBody = (): any => {
  const calls = fetchMock.mock.calls;
  if (calls.length === 0) throw new Error('fetch was not called');
  const init = calls[calls.length - 1][1];
  if (!init?.body) throw new Error('fetch was called without a body');
  return JSON.parse(init.body);
};

const {
  generateAdScript,
  generateStoryboard,
  generateInfluencerStoryboard,
  generateCinematicNarrative,
} = await import('../../services/geminiService');

beforeEach(() => {
  fetchMock.mockReset();
});

// ----------------------------------------------------------------------------
// generateAdScript -> Promise<Script>
// ----------------------------------------------------------------------------

describe('generateAdScript schema', () => {
  const businessInfo = {
    product: 'Test Coffee',
    features: 'Premium beans, Quick brew',
    productImageDescription: 'Coffee bag',
    scriptType: 'MrBeast',
  } as any;

  it('returns a Script-shaped object: hook1/hook2/body are arrays of strings', async () => {
    fetchMock.mockResolvedValueOnce(okGemini({
      hook1: ['Hook A line 1', 'Hook A line 2'],
      hook2: ['Hook B line 1', 'Hook B line 2'],
      body: ['Body line 1', 'Body line 2', 'Body line 3'],
      strategicAudit: 'Solid hooks, tight Slide pacing.',
    }));

    const result = await generateAdScript(businessInfo, 'TestBrand', 'Taglish');

    expect(Array.isArray(result.hook1)).toBe(true);
    expect(result.hook1.every((s: unknown) => typeof s === 'string')).toBe(true);
    expect(Array.isArray(result.hook2)).toBe(true);
    expect(result.hook2.every((s: unknown) => typeof s === 'string')).toBe(true);
    expect(Array.isArray(result.body)).toBe(true);
    expect(result.body.every((s: unknown) => typeof s === 'string')).toBe(true);
    expect(
      result.strategicAudit === undefined || typeof result.strategicAudit === 'string'
    ).toBe(true);
  }, 10_000);

  it('targets /api/gemini/text with the flash-lite text model in JSON mode', async () => {
    fetchMock.mockResolvedValueOnce(okGemini({
      hook1: ['x'], hook2: ['x'], body: ['x'],
    }));
    await generateAdScript(businessInfo, 'TestBrand', 'English');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/gemini/text');

    const body = captureLastFetchBody();
    expect(body.model).toBe('gemini-3.1-flash-lite-preview');
    expect(body.config?.responseMimeType).toBe('application/json');
  }, 10_000);

  it('preserves tuned-prompt invariants: NO PRICE rule and Sabri Suby Slide pacing', async () => {
    fetchMock.mockResolvedValueOnce(okGemini({
      hook1: ['x'], hook2: ['x'], body: ['x'],
    }));
    await generateAdScript(businessInfo, 'TestBrand', 'Taglish');

    const promptDump = JSON.stringify(captureLastFetchBody());
    expect(promptDump).toContain('NO PRICE');
    expect(promptDump).toContain('Slide');
    expect(promptDump).toContain('LOGIC LOCK');
  }, 10_000);
});

// ----------------------------------------------------------------------------
// generateStoryboard -> Promise<StoryboardResponse>
// ----------------------------------------------------------------------------

describe('generateStoryboard schema', () => {
  const businessInfo = {
    product: 'Test Product',
    features: 'F1, F2',
    productImageDescription: 'Product image',
    scriptType: 'MrBeast',
  } as any;

  it('returns StoryboardResponse: scenes[] each with scriptLine + sceneDescription strings, plus strategicAudit', async () => {
    fetchMock.mockResolvedValueOnce(okGemini({
      scenes: [
        { scriptLine: 'Line 1', sceneDescription: 'Avatar talking', referenceImage: 'avatar' },
        { scriptLine: 'Line 2', sceneDescription: 'Product close-up', referenceImage: 'product' },
      ],
      strategicAudit: 'Tight pacing.',
    }));

    const result = await generateStoryboard(
      ['Line 1', 'Line 2'],
      'Avatar description',
      businessInfo,
      'Filipino',
      'Taglish'
    );

    expect(Array.isArray(result.scenes)).toBe(true);
    expect(result.scenes.length).toBeGreaterThan(0);
    for (const scene of result.scenes) {
      expect(typeof scene.scriptLine).toBe('string');
      expect(typeof scene.sceneDescription).toBe('string');
    }
    expect(typeof result.strategicAudit).toBe('string');
  });

  it('preserves tuned-prompt invariants: STILL_FRAME_RULE, APPEARANCE_LOCK_RULE, VISUAL PURITY', async () => {
    fetchMock.mockResolvedValueOnce(okGemini({ scenes: [], strategicAudit: 'x' }));
    await generateStoryboard(['Line'], 'Avatar', businessInfo, 'Filipino', 'English');

    const promptDump = JSON.stringify(captureLastFetchBody());
    expect(promptDump).toContain('STILL_FRAME_RULE');
    expect(promptDump).toContain('APPEARANCE_LOCK_RULE');
    expect(promptDump).toContain('VISUAL PURITY');
    expect(promptDump).toContain('PACING RULE');
  });
});

// ----------------------------------------------------------------------------
// generateInfluencerStoryboard -> Promise<{ scenes: Scene[]; directorNote: string }>
// ----------------------------------------------------------------------------

describe('generateInfluencerStoryboard schema', () => {
  const config = { monetizationGame: 'Affiliate', format: 'Reel' } as any;
  const script = {
    hook: 'Opening hook',
    body: ['Body 1', 'Body 2'],
    strategicAudit: 'audit',
  } as any;

  it('returns { scenes: Scene[]; directorNote: string } with typed scene fields', async () => {
    fetchMock.mockResolvedValueOnce(okGemini({
      scenes: [
        { scriptLine: 'Hook', sceneDescription: 'Avatar', referenceImage: 'avatar' },
        { scriptLine: 'Body 1', sceneDescription: 'B-roll', referenceImage: 'product' },
      ],
      directorNote: 'Pacing held.',
    }));

    const result = await generateInfluencerStoryboard(config, script);

    expect(Array.isArray(result.scenes)).toBe(true);
    for (const s of result.scenes) {
      expect(typeof s.scriptLine).toBe('string');
      expect(typeof s.sceneDescription).toBe('string');
    }
    expect(typeof result.directorNote).toBe('string');
  });

  it('preserves tuned-prompt invariants: 30/70 rule and consecutive talking-head limit', async () => {
    fetchMock.mockResolvedValueOnce(okGemini({ scenes: [], directorNote: 'x' }));
    await generateInfluencerStoryboard(config, script);

    const promptDump = JSON.stringify(captureLastFetchBody());
    expect(promptDump).toContain('30/70');
    expect(promptDump).toContain('CONSECUTIVE');
    expect(promptDump).toContain('VISUAL RHYTHM PROTOCOL');
  });
});

// ----------------------------------------------------------------------------
// generateCinematicNarrative -> Promise<CinematicNarrativeScene[]>
// ----------------------------------------------------------------------------

describe('generateCinematicNarrative schema', () => {
  const theme = { name: 'Test theme', texturePrompt: 'metal' } as any;
  const hardware = { camera: 'ARRI Alexa', lens: 'Cooke S4', focalLength: '50mm' };

  it('returns CinematicNarrativeScene[] with phase/action/emotion strings on each item', async () => {
    fetchMock.mockResolvedValueOnce(okGemini([
      { phase: 'PHASE 01 (MATERIAL)', action: 'Macro texture detail', emotion: 'Tension' },
      { phase: 'PHASE 02 (FORCE)', action: 'Material reacts to energy', emotion: 'Release' },
    ]));

    const result = await generateCinematicNarrative('Test product', theme, 'Test concept', hardware);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    for (const scene of result) {
      expect(typeof scene.phase).toBe('string');
      expect(typeof scene.action).toBe('string');
      expect(typeof scene.emotion).toBe('string');
    }
  });

  it('uses the research/pro model and preserves the v6 STORY RELAY 6-phase contract', async () => {
    fetchMock.mockResolvedValueOnce(okGemini([]));
    await generateCinematicNarrative('Test product', theme, 'Test concept', hardware);

    const body = captureLastFetchBody();
    expect(body.model).toBe('gemini-3.1-pro-preview');

    const promptDump = JSON.stringify(body);
    expect(promptDump).toContain('STORY RELAY');
    expect(promptDump).toContain('PHASE 01');
    expect(promptDump).toContain('PHASE 06');
    expect(promptDump).toContain('LEXICON CONSTRAINTS');
    expect(promptDump).toContain('FORBIDDEN');
    expect(promptDump).toContain('MANDATORY');
  });
});
