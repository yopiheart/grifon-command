import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Run apr_fa7cedc3 scene 7: Veo improvised "Ito nang kanina ka." on top of the scripted line
 * and it reached the finished ad. It could not be trimmed, and the reason is architectural —
 * api/voice/consolidate.ts routes a `talking` scene to STS, which does this:
 *
 *     const mp4 = await fetchVideoBuffer(route.videoUrl);
 *     const sourceAudio = await extractAudioFromMp4(mp4);
 *     mp3 = await convertSts(voiceId, sourceAudio, ...);
 *
 * It re-voices the clip's OWN audio. `scriptLine` is used only for caption alignment, never as
 * the source of speech. So whatever the video model decides to say is real speech by the time
 * anything downstream sees it.
 *
 * OPTION B told the writer to lead with the quoted line, but never that the quoted line was
 * ALL of it — and two of its rules ("the clip ends on the next breath", "Last frame = next
 * syllable") read as instructions to still be mid-speech when the clip ends. On a line shorter
 * than the clip, the only way to obey that is to say something else.
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

const { generateVideoPrompts } = await import('../../services/geminiService');

/** The prompt text generateVideoPrompts actually sent upstream. */
const capturePrompt = async (): Promise<string> => {
  fetchMock.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ text: '[]' }),
  });

  const storyboard = [
    {
      scriptLine: 'Hook line here.',
      sceneDescription: 'Extreme close-up of a cheek.',
      imagePrompt: 'Close-up of skin.',
      startFramePrompt: 'Close-up of skin.',
      endFramePrompt: 'The performer holding the bottle.',
      referenceImage: 'avatar',
    },
    {
      scriptLine: 'Magaan siya sa balat at hindi malagkit kahit mag-commute ka pa.',
      sceneDescription: 'The performer looking at camera at the vanity.',
      imagePrompt: 'Seated at a wooden vanity, looking at the camera.',
      referenceImage: 'avatar',
    },
  ] as any;

  await generateVideoPrompts(storyboard, {
    product: 'Hiraya Glow',
    features: 'serum',
    productImageDescription: 'an amber dropper bottle',
    scriptType: 'Testimonial',
  } as any);

  const body = JSON.parse(fetchMock.mock.calls.at(-1)![1].body);
  const contents = body.contents ?? body.input?.contents;
  return typeof contents === 'string' ? contents : JSON.stringify(contents);
};

describe('generateVideoPrompts — DIALOGUE LOCK on talking scenes', () => {
  beforeEach(() => fetchMock.mockReset());

  it('sends a DIALOGUE LOCK to the video-prompt writer', async () => {
    expect(await capturePrompt()).toContain('DIALOGUE LOCK');
  });

  it('states the quoted line is the complete and only speech', async () => {
    const prompt = await capturePrompt();
    expect(prompt).toMatch(/COMPLETE and ONLY speech/);
    expect(prompt).toMatch(/no greeting before, no sign-off after/);
  });

  it('gives the model a legal way to end early instead of inventing filler', async () => {
    // Without an explicit permission to stop, "fill the clip" pressure produces speech.
    const prompt = await capturePrompt();
    expect(prompt).toMatch(/a silent tail is CORRECT/);
  });

  it('reconciles the frame-0 and last-frame rules that read as licence to keep talking', async () => {
    // These two rules still exist and still matter for lip-sync continuity; the lock must
    // scope them rather than delete them, or a future edit re-opens the same hole.
    const prompt = await capturePrompt();
    expect(prompt).toContain('the next syllable');
    expect(prompt).toMatch(/OF THE QUOTED LINE, never of an added word/);
  });

  it('instructs the writer to append the lock verbatim, so the video model actually reads it', async () => {
    // The video model never sees this instruction block — only the prose the writer emits.
    // END-CLEAN RULE proves the append pattern carries through: its sentence appeared word
    // for word in run apr_fa7cedc3's stored scene-7 prompt.
    const prompt = await capturePrompt();
    expect(prompt).toContain(
      'The performer speaks only the quoted line and nothing else — no added words, no greeting, no sign-off.'
    );
  });

  it('explains WHY it is strict, so a later edit does not soften it as redundant', async () => {
    const prompt = await capturePrompt();
    expect(prompt).toMatch(/re-voiced downstream by speech-to-speech/);
  });
});
