// PRODUCT_IDENTITY_LOCK's ordinal — this file's oldest bug, third occurrence.
//
// "Reference Image N" is POSITIONAL: it names whatever landed in parts[N-1] inside
// generateSceneImage, which pushes avatar -> product -> continuity with NO regard for
// referenceImageMode. PRODUCT_IDENTITY_LOCK hard-codes "Reference Image 1" in four of its
// eight rules (IDENTITY, VISUAL_GROUND_TRUTH_PRIORITY, NO_LOGO_HALLUCINATION,
// NO_UNSOLICITED_PRODUCT). Every producer call site passes `avatarUrl: run.input.avatar.url`
// unconditionally, so on that path the avatar IS parts[0] and all four rules were pointing at
// the presenter's portrait while the product photo sat unnamed at parts[1].
//
// Neil, 2026-08-31, on a Silid Home unboxing: the packaging box came back with a blanked
// wordmark, then as a cylinder reading "300g" against a real 200g label, standing in the
// AVATAR PHOTO'S KITCHEN while its own prompt said "wooden shelf". The model obeyed the rule
// it was given -- reproduce Reference Image 1, which was a woman in a kitchen. The jar in the
// same run rendered perfectly, because nothing in rule 8's banned list ("outer box, carton,
// sleeve") describes a jar.
//
// The fix is the pattern this file already uses for the continuity frame: compute the ordinal
// from the parts actually pushed. Its no-op property is the safety argument -- with no avatar
// pushed the product IS parts[0], the ordinal stays 1, and the text is byte-identical to
// today's. See continuityLock.test.ts for the same assertion on the continuity ordinal.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } }),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const PNG = 'data:image/png;base64,AAAA';

const okImage = () => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png', data: 'BBBB' } }] } }],
  }),
});

const lastBody = (): any => {
  const calls = fetchMock.mock.calls;
  if (calls.length === 0) throw new Error('fetch was not called');
  return JSON.parse(calls[calls.length - 1][1].body);
};

const lastPromptText = (): string =>
  (lastBody().contents.parts as any[]).filter((p) => typeof p.text === 'string').map((p) => p.text).join('\n');

const imagePartCount = (): number =>
  (lastBody().contents.parts as any[]).filter((p) => p.inlineData).length;

const { generateSceneImage } = await import('../../services/geminiService');

describe('PRODUCT_IDENTITY_LOCK points at the product photo, not at whatever is first', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(okImage());
  });

  it('names Reference Image 2 when an avatar was pushed ahead of the product', async () => {
    await generateSceneImage('the packaging box on a wooden shelf', '9:16', '1K', { avatarUrl: PNG, productUrl: PNG }, 'Filipino', [], 'UGCPro', undefined, undefined, 0, 'product');

    const text = lastPromptText();
    expect(imagePartCount()).toBe(2);
    expect(text).toContain('PRODUCT_IDENTITY_LOCK');
    // The four rules that carry the ordinal.
    expect(text).toContain('Reproduce the product from Reference Image 2');
    expect(text).toContain('Reference Image 2 is the VISUAL GROUND TRUTH');
    expect(text).toContain('appears in Reference Image 2');
    expect(text).toContain('Render ONLY the product shown in Reference Image 2');
  });

  it('never leaves a rule pointing at the avatar when both photos are present', async () => {
    await generateSceneImage('the packaging box', '9:16', '1K', { avatarUrl: PNG, productUrl: PNG }, 'Filipino', [], 'UGCPro', undefined, undefined, 0, 'product');

    const text = lastPromptText();
    expect(text).not.toContain('Reproduce the product from Reference Image 1');
    expect(text).not.toContain('Render ONLY the product shown in Reference Image 1');
  });

  it('stays byte-identical when no avatar is pushed — the product IS the first part', async () => {
    await generateSceneImage('the packaging box', '9:16', '1K', { productUrl: PNG }, 'Filipino', [], 'UGCPro', undefined, undefined, 0, 'product');

    const text = lastPromptText();
    expect(imagePartCount()).toBe(1);
    expect(text).toContain('Reproduce the product from Reference Image 1');
    expect(text).toContain('Reference Image 1 is the VISUAL GROUND TRUTH');
    expect(text).toContain('Render ONLY the product shown in Reference Image 1');
  });

  it('an avatar that is not an inline data URL was never pushed, so the ordinal stays 1', async () => {
    await generateSceneImage('the packaging box', '9:16', '1K', { avatarUrl: 'https://example.com/a.png', productUrl: PNG }, 'Filipino', [], 'UGCPro', undefined, undefined, 0, 'product');

    expect(imagePartCount()).toBe(1);
    expect(lastPromptText()).toContain('Reproduce the product from Reference Image 1');
  });

  it('leaves DUAL_REFERENCE_LOCK alone — it already numbered both photos correctly', async () => {
    await generateSceneImage('the creator holding it', '9:16', '1K', { avatarUrl: PNG, productUrl: PNG }, 'Filipino', [], 'UGCPro', undefined, undefined, 0, 'both');

    const text = lastPromptText();
    expect(text).toContain('DUAL_REFERENCE_LOCK');
    expect(text).toContain('FROM AVATAR (Reference Image 1');
    expect(text).toContain('FROM PRODUCT (Reference Image 2');
  });
});
