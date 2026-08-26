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
  generateAdCreatives,
  generateVideoPrompts,
  generateThumbnail,
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

    // The adscript flow executes server-side on MODEL_TEXT. Pinned exactly, not by
    // pattern: this guard exists so the customer-facing text lane can never change
    // models by accident. Flipped flash-lite -> 3.7-flash 2026-08-16 on Neil's explicit
    // call for output quality (see api/_lib/prompts.ts:90 for the cost trade and the
    // 2027-01-01 intro-window expiry). Changing this line is a deliberate act.
    expect(MODEL_TEXT).toBe('gemini-3.7-flash');
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

  it('PRICE RULE — given price => affordability reframe, stated as given, no inventing/rounding', () => {
    const prompt = buildAdScriptPrompt(reInput({ listingPrice: '₱4.2M' }));
    expect(prompt).toContain('₱4.2M');
    expect(prompt).toMatch(/affordability reframe/i);
    expect(prompt).toMatch(/exactly as given/i);
    expect(prompt).toMatch(/never invent, round/i);
  });

  it('includes the legitimacy/trust beat + a low-friction keyword DM CTA (CMO spec)', () => {
    const prompt = buildAdScriptPrompt(reInput());
    expect(prompt).toMatch(/legitimacy/i);   // disarms "baka scam"
    expect(prompt).toMatch(/title/i);         // clean-title proof
    expect(prompt).toMatch(/COMPUTATION|BAHAY/); // keyword DM CTA
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

describe('generateVideoPrompts — expression continuity (identity survives the CUT)', () => {
  // WHY (Neil, 2026-08-16, from his own Kuya Marvin ad tests and confirmed on a Hiraya Glow
  // storyboard): a scene still is the FIRST FRAME of a clip, and the next scene cuts off this
  // one's LAST frame. Give the still or the clip a big reaction and the face deforms away from
  // the locked reference, then relaxes as the performer speaks — so it changes shape mid-clip and
  // stops matching the next scene. Drift shows up AT THE CUT, which is where viewers detect an AI.
  //
  // This layer had NO ceiling at all before: OPTION B asked for "facial tension, eye movement and
  // mouth shapes" with nothing bounding intensity, and the storyboard layer upstream was actively
  // REQUIRING "eyes wide in surprise". Both were fixed the same day; this guards the video half.
  const storyboard = [
    { scriptLine: 'Ang fresh na tignan.', sceneDescription: 'Looking at camera', referenceImage: 'avatar' },
  ] as any;
  const businessInfo = { product: 'Hiraya Glow', scriptType: 'Testimonial' } as any;

  const dumpPrompt = async () => {
    fetchMock.mockResolvedValueOnce(okGemini([{ scriptLine: 'x', type: 'talking', prompt: 'p' }]));
    await generateVideoPrompts(storyboard, businessInfo);
    return JSON.stringify(captureLastFetchBody());
  };

  it('bounds expression for EVERY scene type, not just talking heads', async () => {
    const dump = await dumpPrompt();
    // Placed above the per-type branches on purpose: the scene that broke on the live run
    // (hands raised near the face) classifies as b-roll, so an OPTION-B-only rule would miss it.
    expect(dump).toContain('EXPRESSION CONTINUITY');
    expect(dump).toContain('applies to EVERY type');
    expect(dump).toContain('The still is the CEILING');
    expect(dump).toContain('NO ESCALATION ACROSS THE CLIP');
  });

  it('names the teeth rule explicitly rather than saying "do not overdo it"', async () => {
    const dump = await dumpPrompt();
    // A vague ceiling gets ignored; a checkable one does not. If the reference shows no teeth,
    // a teeth-showing smile in the clip guarantees a mismatch at the next cut.
    expect(dump).toContain('TEETH RULE');
    expect(dump).toContain('does not show teeth');
  });

  it('gives the camera a MEASURABLE positive target, not only a list of bans', async () => {
    const dump = await dumpPrompt();
    // Two live scenes rendered fully static. The camera language was 6 bans and 4 damping
    // words against one weak positive ("a subtle push-in"), and the model answered a
    // ban-stack the way it always does — by delivering less. Same failure the marvin-avatar
    // skill records for lighting: bans with no target make the model under-deliver.
    expect(dump).toContain('STATE THE TARGET FIRST');
    expect(dump).toContain('ALREADY UNDERWAY AT FRAME 0');
    // Measurable, so "subtle" cannot collapse to "none".
    expect(dump).toContain('noticeably larger');
    expect(dump).toContain('FAILED shot');
    // The bans must be framed as trimming the STYLE of a move, never as removing it.
    expect(dump).toContain('never reduce it to nothing');
  });

  it('only asks for a hook MORPH when the scene actually has two frames', async () => {
    const dump = await dumpPrompt();
    // The hook branch is written for an anchor-bridged morph between a start and an end
    // frame, and says so ("Kling Omni ... between Start Frame and End Frame"). On a
    // single-image scene it was still firing, so the model warped the subject to invent the
    // transformation it had been told to deliver — the white wash across the hair.
    expect(dump).toContain('AND THE SCENE HAS **BOTH** A START FRAME AND AN END FRAME');
    expect(dump).toContain('this option DOES NOT APPLY');
    // ...and the fallback is stated on the branch that must catch it.
    expect(dump).toContain('OR** SCENE 1 HAS NO END FRAME');
  });

  it('runs on the 3.7-flash lane, asserted on the wire not on a private const', async () => {
    fetchMock.mockResolvedValueOnce(okGemini([]));
    await generateVideoPrompts(storyboard, businessInfo);
    // `fastTextModel` has exactly ONE caller — this brain — so the flip had zero blast radius.
    // It is the last reasoning step before paid video, where a bad prompt costs a render.
    expect(captureLastFetchBody().model).toBe('gemini-3.7-flash');
  });
});

describe('generateThumbnail — the cover frame must survive the click', () => {
  // WHY (Neil, 2026-08-16): the generated thumbnail came back studio-lit, saturated, and
  // showing a DIFFERENT-looking woman from the presenter in the video. Neither was a
  // hallucination — the prompt mandated "Commercial Photography", "sharp studio lighting with
  // strong rim lights", and "an EXTREME, high-energy facial expression (Shock/Surprise/Joy)".
  // The expression ceiling shipped earlier that day covered the storyboard and video layers;
  // this was the THIRD place and it was demanding the opposite. It also contradicted our own
  // decoded MrBeast law (15 real thumbnails): warm open smile, never shock.
  const dumpThumbPrompt = async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'AAAA' } }] } }],
      }),
    });
    await generateThumbnail(
      ['Bakit pagod ang balat ko?'],
      'Filipina mid-20s',
      { product: 'Hiraya Glow', productImageUrls: [] } as any,
      '9:16',
      'data:image/png;base64,AAAA',
      '1K'
    );
    return JSON.stringify(captureLastFetchBody());
  };

  it('caps the expression instead of demanding shock', async () => {
    const dump = await dumpThumbPrompt();
    expect(dump).toContain('EXPRESSION CEILING');
    expect(dump).toContain('CLOSED-LIP smile');
    // The exact words that produced the wrong face must be gone.
    expect(dump).not.toContain('extreme, high-energy facial expression');
    expect(dump).not.toContain('Shock/Surprise/Joy');
  });

  it('asks for the ad’s own register, not commercial key art', async () => {
    const dump = await dumpThumbPrompt();
    // A studio-lit cover on a phone-shot ad is the fastest way to make the whole thing read
    // as AI, and it is the exact list our believability scaffold bans.
    expect(dump).toContain('NEVER a commercial campaign key art');
    expect(dump).toContain('NO studio lighting');
    expect(dump).not.toContain('strong rim lights');
    expect(dump).not.toContain('High-End Commercial Photography');
  });

  it('states WHY identity matters here, so the rule survives a future trim', async () => {
    const dump = await dumpThumbPrompt();
    expect(dump).toContain('SAME PERSON');
    expect(dump).toContain('broken promise');
  });
});

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
    // an intended re-tune updates this expectation alongside it. Flipped to
    // gemini-3.6-flash in the Slice-2 research-tier flip (Neil-approved 2026-07-22).
    expect(body.model).toBe('gemini-3.6-flash');

    const promptDump = JSON.stringify(body);
    expect(promptDump).toContain('STORY RELAY');
    expect(promptDump).toContain('PHASE 01');
    expect(promptDump).toContain('PHASE 06');
    expect(promptDump).toContain('LEXICON CONSTRAINTS');
    expect(promptDump).toContain('FORBIDDEN');
    expect(promptDump).toContain('MANDATORY');
  });
});

// ----------------------------------------------------------------------------
// generateAdCreatives -> Promise<AdVariant[]> (family-branched: product | callout)
// ----------------------------------------------------------------------------
describe('generateAdCreatives schema', () => {
  const baseUplink = {
    brandIdentityName: 'TestBrand',
    originalPrice: '1999',
    offerPrice: '997',
    inventoryList: 'AI marketing app',
    targetDemographic: 'PH coffee shop owners',
    ageRange: '27-42',
    ethnicityProfile: 'Filipino',
    primaryBenefit: 'More sales with less work',
    problemSolved: 'No time to make ads',
    marketPainPoint: 'Ads that do not convert',
    uvp: 'AI does the marketing for you',
    keyFeatures: 'scripts, video, captions',
    hexCodes: '#FFCC00',
    aspectRatio: '4:5',
    resolution: '1K',
    language: 'ENGLISH',
    productAssets: [],
  } as any;

  it('callout family returns Niche Callout variants with composition fields', async () => {
    fetchMock.mockResolvedValueOnce(okGemini([
      {
        id: 1,
        templateType: 'Niche Callout',
        headline: 'If you run a coffee shop, we built the Sales Roadmap for you.',
        caption: 'Tara, gawan natin ng ad.',
        hookLogic: 'specificity / self-identification',
        imagePrompt: '',
        composition: { niche: 'coffee shop', qualifier: '', leadMagnet: 'Sales Roadmap' },
      },
    ]));

    const result = await generateAdCreatives({ ...baseUplink, family: 'callout' });

    expect(Array.isArray(result)).toBe(true);
    expect(result[0].templateType).toBe('Niche Callout');
    expect(typeof result[0].composition?.niche).toBe('string');
    expect(typeof result[0].composition?.leadMagnet).toBe('string');

    // The callout branch — not the legacy product templates — was sent.
    const sent = JSON.stringify(captureLastFetchBody());
    expect(sent).toContain('Niche Callout');
    expect(sent).not.toContain('Press Clip');
  }, 10_000);

  it('product family (default) keeps the legacy product-templates branch untouched', async () => {
    fetchMock.mockResolvedValueOnce(okGemini([
      { id: 1, templateType: 'Press Clip', headline: 'BREAKING', caption: 'c', hookLogic: 'authority', imagePrompt: 'p' },
    ]));

    const result = await generateAdCreatives({ ...baseUplink });

    expect(result[0].templateType).toBe('Press Clip');
    const sent = JSON.stringify(captureLastFetchBody());
    expect(sent).toContain('Press Clip');
    expect(sent).not.toContain('Niche Callout');
  }, 10_000);

  it('saas-offer family returns the 3 upsell templates with composition', async () => {
    fetchMock.mockResolvedValueOnce(okGemini([
      { id: 1, templateType: 'Guarantee Hero', headline: 'First ad live in 24h or your month is free.', caption: 'x', hookLogic: 'risk-reversal', imagePrompt: '', composition: { guarantee: 'Money back', ctaLabel: 'Upgrade now', badge: '24H' } },
      { id: 2, templateType: 'Ticket Compare', headline: 'CHOOSE YOUR LEVEL', caption: 'y', hookLogic: 'anchoring', imagePrompt: '', composition: { tiers: [{ name: 'Free', lines: ['DIY'], highlight: false }, { name: 'Pro', lines: ['Done for you'], highlight: true }], ctaLabel: 'Go Pro' } },
      { id: 3, templateType: 'Offer Stack Checklist', headline: 'All your money back if not 100%.', caption: 'z', hookLogic: 'reciprocity', imagePrompt: '', composition: { bullets: ['Ad script', 'Storyboard', 'Voiceover', 'Caption'], guarantee: 'Penny back', ctaLabel: 'Upgrade' } },
    ]));

    const result = await generateAdCreatives({ ...baseUplink, family: 'saas-offer' });

    expect(result.map((r: any) => r.templateType)).toEqual(['Guarantee Hero', 'Ticket Compare', 'Offer Stack Checklist']);
    expect(Array.isArray(result[1].composition?.tiers)).toBe(true);
    expect(Array.isArray(result[2].composition?.bullets)).toBe(true);

    const sent = JSON.stringify(captureLastFetchBody());
    expect(sent).toContain('SaaS Upsell Ads');
    expect(sent).not.toContain('Press Clip');
  }, 10_000);
});

// ----------------------------------------------------------------------------

describe('generateVideoPrompts — DIALOGUE LOCK (the line is the whole performance)', () => {
  // Run apr_fa7cedc3 (2026-08-23), scene 7. The video prompt carried the correct line and its
  // own scriptLine field:
  //
  //   "Magaan siya sa balat at hindi malagkit kahit mag-commute ka pa." ... the performer speaks
  //   directly into the camera lens, her mouth actively articulating the opening syllable 'Ma-'
  //
  // Veo said that line and then added "Ito nang kanina ka." Nothing in OPTION B was wrong; the
  // block said where to START and never where to STOP, so the model filled the rest of the clip.
  //
  // Unlike the other two "no guard" claims from the same triage, this one was REAL — checked by
  // reading the stored prompt, not by trusting the note.
  //
  // Why it has to be stopped HERE: talking scenes are re-voiced by STS from the model's OWN
  // audio (api/voice/consolidate.ts), which never reads the script. To every stage downstream an
  // improvised line is ordinary speech, so the trimmer keeps it and it reaches the final mix.
  const storyboard = [
    { scriptLine: 'Magaan siya sa balat.', sceneDescription: 'Looking at camera', referenceImage: 'avatar' },
  ] as any;
  const businessInfo = { product: 'Hiraya Glow', scriptType: 'Testimonial' } as any;

  const dumpPrompt = async () => {
    fetchMock.mockResolvedValueOnce(okGemini([{ scriptLine: 'x', type: 'talking', prompt: 'p' }]));
    await generateVideoPrompts(storyboard, businessInfo);
    return JSON.stringify(captureLastFetchBody());
  };

  it('tells the model where the dialogue ENDS, not only where it starts', async () => {
    const dump = await dumpPrompt();
    expect(dump).toContain('DIALOGUE LOCK');
    expect(dump).toContain('the WHOLE performance, not its opening');
  });

  it('ships a verbatim sentence into the prose rather than a rule the writer may paraphrase', async () => {
    // Same mechanism the END-CLEAN RULE already uses in this block: the constraint has to reach
    // the video model, and only text inside the generated prose does that.
    const dump = await dumpPrompt();
    expect(dump).toContain('Append this sentence verbatim');
    expect(dump).toContain('no added greeting, no extra sentence, no ad-lib');
  });

  it('names what to do with the leftover seconds, so silence is not read as a gap to fill', async () => {
    const dump = await dumpPrompt();
    expect(dump).toContain('she simply stops speaking and holds the look');
    expect(dump).toContain('A clip that runs out of dialogue is CORRECT');
  });

  it('records that nothing downstream can catch an improvised line', async () => {
    // If this reasoning is ever deleted, someone will "fix" improvisation in the trimmer, where
    // it is indistinguishable from real speech.
    const dump = await dumpPrompt();
    expect(dump).toContain('re-voiced from the model');
    expect(dump).toContain('never reads the script');
  });

  it('keeps the lock on the talking branch, where the avatar actually speaks', async () => {
    const dump = await dumpPrompt();
    const optionB = dump.slice(dump.indexOf('OPTION B'), dump.indexOf('OPTION C'));
    expect(optionB).toContain('DIALOGUE LOCK');
  });
});
