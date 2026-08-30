// CONTINUITY_LOCK — the end frame is handed the START frame of its own beat.
//
// Neil, 2026-08-30, looking at a real unboxing pair: the start frame rendered as hands at a
// window and the end frame as a man at a bookshelf, so animating between them would read as a
// magic/blink cut instead of an unboxing. The two stills come from two independent prompts and
// neither can see the other. His call was to pass the picture rather than hope two descriptions
// agree ("Ang A ay nagpapabuti ng tsansa. Ang B ay nag-aalis ng tsansa sa usapan").
//
// The safety-critical assertion here is the ORDINAL. "Reference Image N" is POSITIONAL in
// geminiService — it names whatever landed in parts[N-1] — and this file has been bitten twice
// by an ordinal whose prompt text no longer pointed where it claimed. The avatar is exactly the
// reference that goes missing (input.avatar.url does not survive a checkpoint), so the
// avatar-missing case below is the regression that matters, not the happy path.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({ auth: { getSession: async () => ({ data: { session: { access_token: 't' } } }) } }),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const PNG = 'data:image/png;base64,AAAA';

/** The image proxy echoes one inlineData part back as the generated image. */
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

/** The single text part carries every instruction block. */
const lastPromptText = (): string => {
  const parts = lastBody().contents.parts as any[];
  return parts.filter((p) => typeof p.text === 'string').map((p) => p.text).join('\n');
};

const imagePartCount = (): number =>
  (lastBody().contents.parts as any[]).filter((p) => p.inlineData).length;

const { generateSceneImage } = await import('../../services/geminiService');

describe('CONTINUITY_LOCK', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(okImage());
  });

  it('is ABSENT when no continuity frame is passed — every existing caller is untouched', async () => {
    await generateSceneImage('a scene', '9:16', '1K', { avatarUrl: PNG, productUrl: PNG }, 'Filipino', [], 'MrBeast', undefined, undefined, 0, 'both');
    expect(lastPromptText()).not.toContain('CONTINUITY_LOCK');
    expect(imagePartCount()).toBe(2);
  });

  it('names Reference Image 3 when the avatar AND product both arrived', async () => {
    await generateSceneImage('a scene', '9:16', '1K', { avatarUrl: PNG, productUrl: PNG, continuityUrl: PNG }, 'Filipino', [], 'MrBeast', undefined, undefined, 0, 'both');
    const p = lastPromptText();
    expect(p).toContain('CONTINUITY_LOCK');
    expect(p).toContain('Reference Image 3 = the PREVIOUS frame');
    expect(imagePartCount()).toBe(3);
  });

  // THE REGRESSION THAT MATTERS. input.avatar.url does not survive a checkpoint, so this is the
  // ordinary resumed-run case, not an exotic one. A hard-coded "3" would point at nothing here
  // and the lock would describe an image that was never sent.
  it('names Reference Image 2 when the avatar is MISSING — the ordinal is computed, not assumed', async () => {
    await generateSceneImage('a scene', '9:16', '1K', { productUrl: PNG, continuityUrl: PNG }, 'Filipino', [], 'MrBeast', undefined, undefined, 0, 'product');
    const p = lastPromptText();
    expect(p).toContain('Reference Image 2 = the PREVIOUS frame');
    expect(p).not.toContain('Reference Image 3');
    expect(imagePartCount()).toBe(2);
  });

  it('names Reference Image 1 when it is the ONLY reference', async () => {
    await generateSceneImage('a scene', '9:16', '1K', { continuityUrl: PNG }, 'Filipino', [], 'MrBeast', undefined, undefined, 0, 'none');
    expect(lastPromptText()).toContain('Reference Image 1 = the PREVIOUS frame');
    expect(imagePartCount()).toBe(1);
  });

  // The rotation hands consecutive frames two DIFFERENT framings, which is exactly what the
  // lock's rule 2 forbids. Left in, one prompt would carry both instructions and contradict
  // itself. 'avatar_state' is excluded from the rotation for the identical reason.
  // Assert on the BLOCK, not on the bare string: the 'both' branch names CAMERA_MANDATORY inside
  // its own rule 3 ("framing per CAMERA_MANDATORY block") whether or not the block is emitted.
  // That leaves a dangling pointer when the block is suppressed, which is exactly why the lock's
  // rule 1 says it outranks every framing instruction above it.
  const MANDATE = '**CAMERA_MANDATORY (overrides';
  const ROTATION = 'You MUST render this exact framing';

  it('suppresses the random camera rotation, which would fight the lock', async () => {
    await generateSceneImage('a scene', '9:16', '1K', { avatarUrl: PNG, productUrl: PNG, continuityUrl: PNG }, 'Filipino', [], 'MrBeast', undefined, undefined, 0, 'both');
    const p = lastPromptText();
    expect(p).not.toContain(MANDATE);
    expect(p).not.toContain(ROTATION);
  });

  it('keeps the camera rotation when there is no continuity frame', async () => {
    await generateSceneImage('a scene', '9:16', '1K', { avatarUrl: PNG, productUrl: PNG }, 'Filipino', [], 'MrBeast', undefined, undefined, 0, 'both');
    const p = lastPromptText();
    expect(p).toContain(MANDATE);
    expect(p).toContain(ROTATION);
  });
});
