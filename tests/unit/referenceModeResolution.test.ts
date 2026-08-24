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
