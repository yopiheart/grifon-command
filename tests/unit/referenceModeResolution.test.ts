import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * A reference mode is a PROMISE about which photos arrived, and every branch in
 * generateSceneImage re-checks it. When the promise does not hold the chain falls through to
 * STRICT_NEGATIVE — "NO faces, NO skin, NO hands, NO fingers" — while `humanSubjectInFrame`
 * still counts 'both' as human and keeps demanding a face in the camera mandate. The model is
 * then told to frame a person and render no anatomy at once.
 *
 * The hook morph triggers this by design: producerOrchestrator withholds productUrl on a morph
 * hook (the start frame must not contain the product) while the storyboard still labels the
 * scene 'both'. Run apr_fa7cedc3 scene 1 was one of only two 'both' scenes, and it opened on
 * bare skin instead of the performer.
 *
 * These tests pin the downgrade: a missing photo must cost the WEAKER lock, never the human.
 */

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: 't' } } }),
      refreshSession: vi.fn(),
      signOut: vi.fn(),
    },
  }),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const { generateSceneImage } = await import('../../services/geminiService');

const AVATAR = 'data:image/png;base64,QUFB';
const PRODUCT = 'data:image/png;base64,QkJC';

type Mode = 'avatar' | 'product' | 'both' | 'none' | 'venue' | 'avatar_venue' | 'avatar_state';

/** Returns the scene-image prompt text actually sent upstream. */
const promptFor = async (mode: Mode, references: { avatarUrl?: string; productUrl?: string }) => {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'QQ==' } }] } }],
    }),
  });

  await generateSceneImage(
    'Sitting at a wooden vanity, holding the dropper near the cheek, ordinary indoor daylight.',
    '9:16', '1K', references, 'Filipino', [], 'Testimonial',
    'an amber dropper bottle', 'Hiraya Glow', 0, mode,
  );

  return JSON.stringify(JSON.parse(fetchMock.mock.calls.at(-1)![1].body));
};

describe('generateSceneImage — reference mode resolves against the photos that arrived', () => {
  beforeEach(() => fetchMock.mockReset());

  it("'both' with only the avatar keeps the identity lock instead of banning humans", async () => {
    const prompt = await promptFor('both', { avatarUrl: AVATAR });
    expect(prompt).toContain('IDENTITY_LOCK');
    expect(prompt).not.toContain('STRICT_NEGATIVE');
  });

  it('the morph-hook shape specifically no longer lands on the no-humans ruleset', async () => {
    // This IS the hook: storyboard says 'both', the orchestrator withholds productUrl.
    const prompt = await promptFor('both', { avatarUrl: AVATAR, productUrl: undefined });
    expect(prompt).not.toMatch(/NO faces, NO skin, NO hands/);
  });

  it("'both' with both photos still uses the dual lock — no behaviour change", async () => {
    const prompt = await promptFor('both', { avatarUrl: AVATAR, productUrl: PRODUCT });
    expect(prompt).toContain('DUAL_REFERENCE_LOCK');
  });

  it("'both' with only the product falls to the product lock, not to no-humans", async () => {
    const prompt = await promptFor('both', { productUrl: PRODUCT });
    expect(prompt).toContain('PRODUCT_IDENTITY_LOCK');
    expect(prompt).not.toContain('STRICT_NEGATIVE');
  });

  it("'avatar' with an avatar is untouched", async () => {
    const prompt = await promptFor('avatar', { avatarUrl: AVATAR });
    expect(prompt).toContain('IDENTITY_LOCK');
  });

  it("'avatar' with NO avatar still reaches STRICT_NEGATIVE — the 2026-07-25 guard survives", async () => {
    // That guard exists because an unguarded avatar branch resolved "Reference Image 1" to the
    // PRODUCT photo and tried to preserve a bottle's face. Honest no-humans beats that.
    const prompt = await promptFor('avatar', {});
    expect(prompt).toContain('STRICT_NEGATIVE');
  });

  it("'product' with no product photo stays on no-humans, which is correct there", async () => {
    // No human is expected in a product-only frame, so the downgrade must NOT invent one.
    const prompt = await promptFor('product', {});
    expect(prompt).toContain('STRICT_NEGATIVE');
  });
});

/**
 * PARITY. The avatar branch and the dual (avatar+product) branch protect the same person, so
 * they must carry the same enforcement — but they have drifted apart once already, silently.
 *
 * c45c018 (2026-05-08) replaced the avatar branch's weak LOCKED line after an E2E smoke,
 * adding the non-negotiable framing, the tied-up/down worked example, the BANNED verdict on
 * hair drift, and the closing clause that fences scene-driven action out of wardrobe.
 * 6c26161 (2026-05-10) then introduced DUAL_REFERENCE_LOCK — two days later, written from the
 * text c45c018 had just condemned. The fix never propagated.
 *
 * Run apr_fa7cedc3 scene 4 is what that cost: the one 'both' scene holding BOTH photos was the
 * only human frame in the run to lose the beige blouse entirely and swap the bedroom set. Every
 * avatar-mode scene kept both.
 *
 * The old test pinned only the string 'DUAL_REFERENCE_LOCK' — the block's NAME. A lossy rewrite
 * of everything inside it passed. These pin the enforcement itself.
 */
const IDENTITY_ENFORCEMENT = [
  'Hair styling drift between scenes is BANNED',
  'same blouse/top across scenes',
  'MUST NOT change hair styling, wardrobe, or body type',
  'never in an unrelated location',
];

describe('the dual lock carries the same enforcement as the avatar lock', () => {
  beforeEach(() => fetchMock.mockReset());

  for (const clause of IDENTITY_ENFORCEMENT) {
    it(`'avatar' still states: ${clause}`, async () => {
      expect(await promptFor('avatar', { avatarUrl: AVATAR })).toContain(clause);
    });

    it(`'both' states it too: ${clause}`, async () => {
      expect(await promptFor('both', { avatarUrl: AVATAR, productUrl: PRODUCT })).toContain(clause);
    });
  }
});

/**
 * NO_UNSOLICITED_PRODUCT lived ONLY in the avatar branch, where it reads "this frame has no
 * product reference photo". The product and both branches DO have one, so they need the sibling
 * rule with the opposite premise: reproduce that product and nothing around it.
 *
 * Scene 8 of the same run is the failure — a HIRAYA GLOW carton stood beside the bottle. The
 * storyboard asked for it (eebb680), but nothing in the image ruleset would have refused.
 */
describe('a product reference does not license extra packaging', () => {
  beforeEach(() => fetchMock.mockReset());

  it("'product' bans invented boxes and sleeves", async () => {
    const prompt = await promptFor('product', { productUrl: PRODUCT });
    expect(prompt).toContain('NO_UNSOLICITED_PRODUCT');
    expect(prompt).toContain('Do NOT add an outer box, carton, sleeve');
  });

  it("'both' bans them as well", async () => {
    const prompt = await promptFor('both', { avatarUrl: AVATAR, productUrl: PRODUCT });
    expect(prompt).toContain('NO_UNSOLICITED_PRODUCT');
    expect(prompt).toContain('Do NOT add an outer box, carton, sleeve');
  });
});
