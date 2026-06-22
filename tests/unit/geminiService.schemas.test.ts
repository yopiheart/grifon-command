import { describe, it, expect, vi, beforeEach } from 'vitest';

// What this file catches:
//   1. Output-shape regressions — if a refactor breaks how geminiService parses
//      a flow response (or a legacy passthrough response), the typed return
//      shape will drift and tests fail.
//   2. Request-shape regressions — flow-mode calls must send `{flow, input}`
//      and must NOT leak the tuned prompt into the client request body;
//      legacy passthrough calls must keep their model IDs and JSON-mode config.
//   3. Prompt-invariant regressions — the tuned safety/strategy rules
//      (STILL_FRAME_RULE, 30/70, NO PRICE, STORY RELAY phase contract, etc.).
//      Server-side prompts moved to api/_lib/prompts.ts, so those invariants
//      are asserted against the prompt builders' output directly (server-side
//      introspection); client-side prompts are still asserted via the fetch body.
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

// Legacy passthrough mode: the proxy echoes Gemini's response as `{ text }`.
const okGemini = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => ({ text: JSON.stringify(payload) }),
});

// Flow mode: api/gemini/text.ts runs the server-side prompt + parser and
// returns the parsed object as the response body.
const okFlow = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => payload,
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

const { buildAdScriptPrompt, buildStoryboardPrompt, MODEL_TEXT } = await import(
  '../../api/_lib/prompts.js'
);

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

  const adScriptInput = {
    businessInfo,
    brandName: 'TestBrand',
    language: 'Taglish',
    offer: '',
    chosenAngleBrief: '',
  } as any;

  it('returns a Script-shaped object: hook1/hook2/body are arrays of strings', async () => {
    fetchMock.mockResolvedValueOnce(okFlow({
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

  it("targets /api/gemini/text in flow mode: {flow: 'adscript', input} with no prompt leak", async () => {
    fetchMock.mockResolvedValueOnce(okFlow({
      hook1: ['x'], hook2: ['x'], body: ['x'],
    }));
    await generateAdScript(businessInfo, 'TestBrand', 'English');

    const [url] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/gemini/text');

    const body = captureLastFetchBody();
    expect(body.flow).toBe('adscript');
    expect(body.input.businessInfo.product).toBe('Test Coffee');
    expect(body.input.brandName).toBe('TestBrand');

    // Crown-jewel guard: the tuned prompt is server-side now and must never
    // ride in the client request body.
    const dump = JSON.stringify(body);
    expect(dump).not.toContain('NO PRICE');
    expect(dump).not.toContain('LOGIC LOCK');

    // The adscript flow executes server-side on the flash-lite text model.
    expect(MODEL_TEXT).toMatch(/flash-lite/);
  }, 10_000);

  it('preserves tuned-prompt invariants: NO PRICE rule and Sabri Suby Slide pacing', () => {
    const prompt = buildAdScriptPrompt(adScriptInput);
    expect(prompt).toContain('NO PRICE');
    expect(prompt).toContain('Slide');
    expect(prompt).toContain('LOGIC LOCK');
  });

  it('MrBeast CTA invariants: bans link-sa-bio + requires verbatim value-ads (v1.x bundle)', () => {
    const prompt = buildAdScriptPrompt(adScriptInput);
    // Banned phrase is named in the prompt (so the model knows NOT to produce it).
    expect(prompt).toContain('link sa bio');
    expect(prompt).toContain('BANNED CTA PHRASES');
    // Require-verbatim language present.
    expect(prompt).toMatch(/value-add/i);
    expect(prompt).toContain('verbatim');
  });
});

describe('TESTIMONIAL invariants (v1.x bundle)', () => {
  const businessInfo = {
    product: 'Test Coffee',
    features: 'Premium beans',
    productImageDescription: 'Coffee bag',
    scriptType: 'Testimonial',
    audience: 'Filipino mom',
    painPoint: 'Bad mornings',
    benefit: 'Calm mornings',
    separator: 'Single-origin',
  } as any;

  const testimonialInput = {
    businessInfo,
    brandName: 'TestBrand',
    language: 'Taglish',
    offer: '',
    chosenAngleBrief: '',
  } as any;

  it('Intro hard-requires "Ako si [name]" opener and bans name-tag pattern', () => {
    const prompt = buildAdScriptPrompt(testimonialInput);
    expect(prompt).toContain('Ako si');
    expect(prompt).toContain('REQUIRED');
    // Forbidden pattern called out so the model avoids it.
    expect(prompt).toMatch(/name tag/i);
  });

  it('Discovery beat enforces verb-completion (no verbless fragments)', () => {
    const prompt = buildAdScriptPrompt(testimonialInput);
    // Verb-completion patterns are named.
    expect(prompt).toContain('natikman ko');
    expect(prompt).toContain('na-try ko');
    expect(prompt).toMatch(/verbless/i);
  });
});

describe('REAL ESTATE (#13) invariants', () => {
  const baseInfo = {
    product: 'Modern 3BR house and lot, Cavite',
    features: 'Sala, kitchen, 3 bedrooms, balcony view',
    productImageDescription: '[facade] two-storey house\n\n[living] sala',
    scriptType: 'RealEstate',
    realEstateArchetype: 'listing',
    audience: 'Young Filipino family',
    painPoint: 'Renting forever',
    benefit: 'Own home',
    separator: 'Near schools + flexible terms',
  } as any;

  const reInput = (overrides: Record<string, unknown> = {}) => ({
    businessInfo: { ...baseInfo, ...overrides },
    brandName: 'TestRealty',
    language: 'Taglish',
    offer: '',
    chosenAngleBrief: '',
  } as any);

  it('routes to the agent-led WALKTHROUGH branch (not customer-testimonial / MrBeast)', () => {
    const prompt = buildAdScriptPrompt(reInput());
    expect(prompt).toContain('REAL ESTATE WALKTHROUGH 6-BEAT');
    expect(prompt).toMatch(/agent-led/i);
    // It is the agent's own voice — explicitly NOT the customer-testimonial opener.
    expect(prompt).toContain('NEVER write "Ako si');
  });

  it('drives an inquiry/viewing CTA, never a checkout', () => {
    const prompt = buildAdScriptPrompt(reInput());
    expect(prompt).toMatch(/viewing/i);
    expect(prompt).toContain('NOT a checkout');
    expect(prompt).toContain('buy now');     // named as forbidden
    expect(prompt).toContain('add to cart'); // named as forbidden
  });

  it('PRICE RULE — blank price => inquiry-only, never invent a peso figure', () => {
    const prompt = buildAdScriptPrompt(reInput({ listingPrice: '' }));
    expect(prompt).toContain('INQUIRY-ONLY');
    expect(prompt).toMatch(/NEVER invent or imply a peso figure/i);
  });

  it('PRICE RULE — given price => stated ONCE verbatim, no inventing/rounding', () => {
    const prompt = buildAdScriptPrompt(reInput({ listingPrice: '₱4.2M' }));
    expect(prompt).toContain('₱4.2M');
    expect(prompt).toMatch(/ONCE/);
    expect(prompt).toMatch(/do NOT invent, round/i);
  });

  it('storyboard uses the agent-walkthrough strategy + property ground-truth realism', () => {
    const prompt = buildStoryboardPrompt({
      script: ['Pasok tayo sa sala'],
      avatarDescription: 'Filipino agent',
      businessInfo: baseInfo,
      ethnicity: 'Filipino',
      language: 'Taglish',
    } as any);
    expect(prompt).toContain('AGENT-LED PROPERTY WALKTHROUGH');
    expect(prompt).toContain('PHILIPPINE GROUND-TRUTH REALISM');
  });

  it('storyboard venueSlot routing fires for RealEstate when property photos exist (property slots)', () => {
    const prompt = buildStoryboardPrompt({
      script: ['Pasok tayo sa sala'],
      avatarDescription: 'Filipino agent',
      businessInfo: {
        ...baseInfo,
        servicePhotos: [
          { url: 'data:,', slot: 'facade' },
          { url: 'data:,', slot: 'living' },
        ],
      },
      ethnicity: 'Filipino',
      language: 'Taglish',
    } as any);
    expect(prompt).toContain('VENUE_SLOT_ROUTING');
    expect(prompt).toContain('facade');
    // The agent headshot slot must NOT be routed through place-identity-lock venue mode.
    expect(prompt).not.toMatch(/->\s*agent/);
  });
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

  const storyboardInput = {
    script: ['Line'],
    avatarDescription: 'Avatar',
    businessInfo,
    ethnicity: 'Filipino',
    language: 'English',
  } as any;

  it('returns StoryboardResponse: scenes[] each with scriptLine + sceneDescription strings, plus strategicAudit', async () => {
    fetchMock.mockResolvedValueOnce(okFlow({
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

    // Flow mode + crown-jewel guard: client sends `{flow, input}` only.
    const body = captureLastFetchBody();
    expect(body.flow).toBe('storyboard');
    expect(JSON.stringify(body)).not.toContain('STILL_FRAME_RULE');
  });

  it('preserves tuned-prompt invariants: STILL_FRAME_RULE, APPEARANCE_LOCK_RULE, VISUAL PURITY', () => {
    const prompt = buildStoryboardPrompt(storyboardInput);
    expect(prompt).toContain('STILL_FRAME_RULE');
    expect(prompt).toContain('APPEARANCE_LOCK_RULE');
    expect(prompt).toContain('VISUAL PURITY');
    expect(prompt).toContain('PACING RULE');
  });

  it('storyboard includes BAG_ORIENTATION_RULE (front-of-bag must face camera) — v1.x bundle', () => {
    const prompt = buildStoryboardPrompt(storyboardInput);
    expect(prompt).toContain('BAG_ORIENTATION_RULE');
    expect(prompt).toContain('FRONT of the bag');
    expect(prompt).toMatch(/banned/i);
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

  it('uses the research model and preserves the v6 STORY RELAY 6-phase contract', async () => {
    fetchMock.mockResolvedValueOnce(okGemini([]));
    await generateCinematicNarrative('Test product', theme, 'Test concept', hardware);

    const body = captureLastFetchBody();
    // Tuned model ID asserted verbatim so an unintended model change fails loudly;
    // an intended re-tune updates this expectation alongside it.
    expect(body.model).toBe('gemini-3.5-flash');

    const promptDump = JSON.stringify(body);
    expect(promptDump).toContain('STORY RELAY');
    expect(promptDump).toContain('PHASE 01');
    expect(promptDump).toContain('PHASE 06');
    expect(promptDump).toContain('LEXICON CONSTRAINTS');
    expect(promptDump).toContain('FORBIDDEN');
    expect(promptDump).toContain('MANDATORY');
  });
});
