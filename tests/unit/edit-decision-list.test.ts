import { describe, it, expect, vi, beforeEach } from 'vitest';

// Schema test for the Remotion AI Editor brain (Phase 1 half (b)).
//
// Catches:
//   1. EditDecisionList output-shape regressions when the function parses
//      a canned Gemini JSON response.
//   2. Closed-vocabulary breaches — any SFX ID outside the bank, any
//      transition / camera / overlay-style / overlay-position / target-
//      platform / formulaApplied / scriptStyleDetected value outside its
//      declared union.
//   3. Request-shape regressions — sceneBatch.renderedUrl MUST land as
//      fileData parts and audioOverlays as base64 inlineData parts (blob:
//      URLs can't go to Gemini's File API) on the outbound /api/gemini/text
//      body in the documented order (text prompt → per-scene video → audio
//      overlays).
//
// Does NOT catch (by design):
//   - Real-world Gemini API drift. The fetch is mocked; production
//     responses may differ.
//   - Stochastic output quality (style detection accuracy, Cialdini lever
//     correctness, overlay copy fitness). Those are caught by gemini-eval.

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

// generateEditDecisionList fetches each audioOverlay URL (ElevenLabs blob:
// URLs live in browser memory) and inlines it as base64 before calling the
// proxy. Route the global fetch mock by URL: blob fetches get a Blob-shaped
// response whose bytes are the URL itself (so each overlay's base64 payload
// stays distinguishable), everything else gets the canned Gemini response.
const blobResponse = (url: string) => ({
  blob: async () => ({
    arrayBuffer: async () => new TextEncoder().encode(url).buffer,
  }),
});

const mockFetchRouting = (edl: unknown) => {
  fetchMock.mockImplementation(async (url: any) =>
    typeof url === 'string' && url.startsWith('blob:') ? blobResponse(url) : okGemini(edl)
  );
};

const captureLastFetchBody = (): any => {
  const calls = fetchMock.mock.calls;
  if (calls.length === 0) throw new Error('fetch was not called');
  const init = calls[calls.length - 1][1];
  if (!init?.body) throw new Error('fetch was called without a body');
  return JSON.parse(init.body);
};

const { generateEditDecisionList } = await import('../../services/geminiService');

const SFX_BANK = ['whoosh', 'glitch', 'pop', 'ding', 'riser', 'drop', 'snap', 'swish', 'boom', 'sparkle'];
const TRANSITION_TYPES = ['cut', 'flash', 'whip', 'zoom', 'particles'];
const CAMERA_EFFECTS = ['zoom-in', 'zoom-out', 'pan', 'shake', 'none'];
const OVERLAY_STYLES = ['hook', 'callout', 'subtitle', 'punchline'];
const OVERLAY_POSITIONS = ['top', 'center', 'bottom'];
const TARGET_PLATFORMS = ['tiktok', 'reels', 'shorts', 'youtube'];
const SCRIPT_STYLES = ['mrbeast', 'temu', 'testimonial'];
const FORMULAS = ['mrbeast', 'sabri-suby', 'cialdini'];

const assertEdlShape = (edl: any, expectedScenes: number) => {
  // Meta block
  expect(edl).toBeTypeOf('object');
  expect(edl.meta).toBeTypeOf('object');
  expect(typeof edl.meta.totalDurationSec).toBe('number');
  expect(edl.meta.totalDurationSec).toBeGreaterThan(0);
  expect(['9:16', '16:9', '1:1']).toContain(edl.meta.aspectRatio);
  expect(TARGET_PLATFORMS).toContain(edl.meta.targetPlatform);
  expect(typeof edl.meta.hookStrategy).toBe('string');
  expect(edl.meta.hookStrategy.length).toBeGreaterThan(0);
  expect(Array.isArray(edl.meta.formulaApplied)).toBe(true);
  edl.meta.formulaApplied.forEach((f: string) => {
    expect(FORMULAS).toContain(f);
  });
  expect(SCRIPT_STYLES).toContain(edl.meta.scriptStyleDetected);

  // Scenes
  expect(Array.isArray(edl.scenes)).toBe(true);
  expect(edl.scenes.length).toBe(expectedScenes);
  edl.scenes.forEach((scene: any) => {
    expect(typeof scene.sceneIdx).toBe('number');
    expect(typeof scene.sourceVideoUrl).toBe('string');
    expect(typeof scene.sourceAudioUrl).toBe('string');
    expect(Array.isArray(scene.keepSegments)).toBe(true);
    expect(scene.keepSegments.length).toBeGreaterThan(0);
    scene.keepSegments.forEach((seg: any) => {
      expect(typeof seg.startSec).toBe('number');
      expect(typeof seg.endSec).toBe('number');
      expect(seg.endSec).toBeGreaterThanOrEqual(seg.startSec);
    });
    expect(typeof scene.voiceOffsetSec).toBe('number');
    if (scene.transitionIn) {
      expect(TRANSITION_TYPES).toContain(scene.transitionIn.type);
      expect(typeof scene.transitionIn.durationSec).toBe('number');
    }
    if (scene.cameraEffect) {
      expect(CAMERA_EFFECTS).toContain(scene.cameraEffect);
    }
    if (scene.overlayText) {
      expect(Array.isArray(scene.overlayText)).toBe(true);
      scene.overlayText.forEach((ov: any) => {
        expect(typeof ov.text).toBe('string');
        expect(typeof ov.startSec).toBe('number');
        expect(typeof ov.endSec).toBe('number');
        expect(OVERLAY_STYLES).toContain(ov.style);
        expect(OVERLAY_POSITIONS).toContain(ov.position);
      });
    }
    if (scene.sfxCues) {
      expect(Array.isArray(scene.sfxCues)).toBe(true);
      scene.sfxCues.forEach((cue: any) => {
        expect(SFX_BANK).toContain(cue.sfxId);
        expect(typeof cue.anchorSec).toBe('number');
        expect(typeof cue.reason).toBe('string');
      });
    }
    expect(typeof scene.notes).toBe('string');
  });

  // Global SFX picks
  expect(Array.isArray(edl.globalSfxPicks)).toBe(true);
  edl.globalSfxPicks.forEach((sfx: string) => {
    expect(SFX_BANK).toContain(sfx);
  });

  // Formula check
  expect(edl.formulaCheck).toBeTypeOf('object');
  expect(Array.isArray(edl.formulaCheck.rulesApplied)).toBe(true);
  expect(edl.formulaCheck.rulesApplied.length).toBeGreaterThan(0);
  expect(Array.isArray(edl.formulaCheck.weaknessesFlagged)).toBe(true);
};

// Helper: build a canned EDL fixture that echoes the input's sceneBatch +
// audioOverlays so the mock looks plausible to the test assertions.
const cannedEdl = (input: {
  sceneBatch: { sceneIdx: number; renderedUrl?: string; type: 'talking' | 'b-roll' | 'cinematic' }[];
  audioOverlays: { sceneIdx: number; audioUrl: string }[];
  aspectRatio: '9:16' | '16:9' | '1:1';
  targetPlatform: 'tiktok' | 'reels' | 'shorts' | 'youtube';
  scriptStyle?: 'mrbeast' | 'temu' | 'testimonial';
}) => {
  const audioBy = new Map(input.audioOverlays.map((a) => [a.sceneIdx, a.audioUrl]));
  return {
    meta: {
      totalDurationSec: input.sceneBatch.length * 4,
      aspectRatio: input.aspectRatio,
      targetPlatform: input.targetPlatform,
      hookStrategy: 'Curiosity-driven zoom-in with whoosh; punchline CTA on close.',
      formulaApplied: ['mrbeast', 'sabri-suby', 'cialdini'],
      scriptStyleDetected: input.scriptStyle ?? 'mrbeast',
    },
    scenes: input.sceneBatch.map((s, i) => ({
      sceneIdx: s.sceneIdx,
      sourceVideoUrl: s.renderedUrl ?? '',
      sourceAudioUrl: audioBy.get(s.sceneIdx) ?? '',
      keepSegments: [{ startSec: 0, endSec: 4 }],
      voiceOffsetSec: 0,
      transitionIn: i === 0 ? undefined : { type: 'cut', durationSec: 0.15 },
      overlayText: i === 0
        ? [{ text: 'WAIT FOR IT', startSec: 0.2, endSec: 2.5, style: 'hook', position: 'center' }]
        : undefined,
      sfxCues: i === 0
        ? [{ sfxId: 'whoosh', anchorSec: 0, reason: 'Hook opener.' }]
        : undefined,
      cameraEffect: i === 0 ? 'zoom-in' : 'pan',
      notes: i === 0
        ? 'Lever: Curiosity. Anchor: hook line opens loop.'
        : 'Lever: none — descriptive callout.',
    })),
    globalSfxPicks: ['whoosh', 'ding'],
    formulaCheck: {
      rulesApplied: ['Hook in first 3s', '4th-grade overlays', 'Language match: English'],
      weaknessesFlagged: [],
    },
  };
};

beforeEach(() => {
  fetchMock.mockReset();
});

describe('generateEditDecisionList (Phase 1 half (b) — real Gemini call)', () => {
  it('parses a canned EditDecisionList for a TikTok hook ad (4 scenes)', async () => {
    const inputSpec = {
      sceneBatch: [
        { sceneIdx: 0, scriptLine: 'Wait until you see this!', renderedUrl: 'https://example.com/s0.mp4', type: 'talking' as const },
        { sceneIdx: 1, scriptLine: 'Three secrets nobody told you.', renderedUrl: 'https://example.com/s1.mp4', type: 'b-roll' as const },
        { sceneIdx: 2, scriptLine: 'This one changes everything.', renderedUrl: 'https://example.com/s2.mp4', type: 'cinematic' as const },
        { sceneIdx: 3, scriptLine: 'Tap to grab yours now.', renderedUrl: 'https://example.com/s3.mp4', type: 'talking' as const },
      ],
      audioOverlays: [
        { sceneIdx: 0, audioUrl: 'blob:audio-0' },
        { sceneIdx: 1, audioUrl: 'blob:audio-1' },
        { sceneIdx: 2, audioUrl: 'blob:audio-2' },
        { sceneIdx: 3, audioUrl: 'blob:audio-3' },
      ],
      aspectRatio: '9:16' as const,
      targetPlatform: 'tiktok' as const,
    };
    mockFetchRouting(cannedEdl(inputSpec));

    const result = await generateEditDecisionList({
      ...inputSpec,
      finalScript: 'Wait until you see this! Three secrets nobody told you. This one changes everything. Tap to grab yours now.',
    });

    assertEdlShape(result, 4);
    expect(result.meta.aspectRatio).toBe('9:16');
    expect(result.meta.targetPlatform).toBe('tiktok');
    expect(result.scenes[0].sourceAudioUrl).toBe('blob:audio-0');
    expect(result.scenes[3].sourceAudioUrl).toBe('blob:audio-3');
  });

  it('parses a canned EditDecisionList for a 1:1 IG square (3 scenes)', async () => {
    const inputSpec = {
      sceneBatch: [
        { sceneIdx: 0, scriptLine: 'Hook line.', renderedUrl: 'https://example.com/sq0.mp4', type: 'b-roll' as const },
        { sceneIdx: 1, scriptLine: 'Body claim.', renderedUrl: 'https://example.com/sq1.mp4', type: 'talking' as const },
        { sceneIdx: 2, scriptLine: 'CTA.', renderedUrl: 'https://example.com/sq2.mp4', type: 'b-roll' as const },
      ],
      audioOverlays: [
        { sceneIdx: 0, audioUrl: 'blob:sq-0' },
        { sceneIdx: 1, audioUrl: 'blob:sq-1' },
        { sceneIdx: 2, audioUrl: 'blob:sq-2' },
      ],
      aspectRatio: '1:1' as const,
      targetPlatform: 'reels' as const,
    };
    mockFetchRouting(cannedEdl(inputSpec));

    const result = await generateEditDecisionList({
      ...inputSpec,
      finalScript: 'Hook. Body. CTA.',
    });

    assertEdlShape(result, 3);
    expect(result.meta.aspectRatio).toBe('1:1');
    expect(result.meta.targetPlatform).toBe('reels');
  });

  it('parses a canned EditDecisionList for a 16:9 YouTube short (5 scenes) with brandContext', async () => {
    const inputSpec = {
      sceneBatch: [
        { sceneIdx: 0, scriptLine: 'Imagine this morning routine.', renderedUrl: 'https://example.com/y0.mp4', type: 'cinematic' as const },
        { sceneIdx: 1, scriptLine: 'Here is what changed for me.', renderedUrl: 'https://example.com/y1.mp4', type: 'talking' as const },
        { sceneIdx: 2, scriptLine: 'Watch the product in action.', renderedUrl: 'https://example.com/y2.mp4', type: 'b-roll' as const },
        { sceneIdx: 3, scriptLine: 'The results spoke for themselves.', renderedUrl: 'https://example.com/y3.mp4', type: 'talking' as const },
        { sceneIdx: 4, scriptLine: 'Try it risk free today.', renderedUrl: 'https://example.com/y4.mp4', type: 'talking' as const },
      ],
      audioOverlays: [
        { sceneIdx: 0, audioUrl: 'blob:y-0' },
        { sceneIdx: 1, audioUrl: 'blob:y-1' },
        { sceneIdx: 2, audioUrl: 'blob:y-2' },
        { sceneIdx: 3, audioUrl: 'blob:y-3' },
        { sceneIdx: 4, audioUrl: 'blob:y-4' },
      ],
      aspectRatio: '16:9' as const,
      targetPlatform: 'youtube' as const,
    };
    mockFetchRouting(cannedEdl(inputSpec));

    const result = await generateEditDecisionList({
      ...inputSpec,
      finalScript: 'Imagine this morning routine. Here is what changed for me. Watch the product in action. The results spoke for themselves. Try it risk free today.',
      brandContext: { brandName: 'Glossier', voiceTone: 'Warm, confident, intimate.' },
    });

    assertEdlShape(result, 5);
    expect(result.meta.aspectRatio).toBe('16:9');
    expect(result.meta.targetPlatform).toBe('youtube');
    expect(result.scenes[0].sourceAudioUrl).toBe('blob:y-0');
  });

  it('sends parts in the documented order: [text prompt, ...video fileData, ...audio inlineData]', async () => {
    const inputSpec = {
      sceneBatch: [
        { sceneIdx: 0, scriptLine: 'A', renderedUrl: 'https://example.com/a.mp4', type: 'talking' as const },
        { sceneIdx: 1, scriptLine: 'B', renderedUrl: 'https://example.com/b.mp4', type: 'b-roll' as const },
      ],
      audioOverlays: [
        // Intentionally out of array order — verifies iteration over audioOverlays preserves their order.
        { sceneIdx: 1, audioUrl: 'blob:for-scene-1' },
        { sceneIdx: 0, audioUrl: 'blob:for-scene-0' },
      ],
      aspectRatio: '9:16' as const,
      targetPlatform: 'tiktok' as const,
    };
    mockFetchRouting(cannedEdl(inputSpec));

    await generateEditDecisionList({
      ...inputSpec,
      finalScript: 'A B',
    });

    const body = captureLastFetchBody();
    expect(body.model).toBe('gemini-3.6-flash');
    expect(Array.isArray(body.contents.parts)).toBe(true);
    const parts = body.contents.parts;

    // Part 0: text prompt
    expect(typeof parts[0].text).toBe('string');
    expect(parts[0].text.length).toBeGreaterThan(100);

    // Parts 1..2: per-scene video URLs, in sceneBatch order
    expect(parts[1].fileData).toEqual({ fileUri: 'https://example.com/a.mp4', mimeType: 'video/mp4' });
    expect(parts[2].fileData).toEqual({ fileUri: 'https://example.com/b.mp4', mimeType: 'video/mp4' });

    // Parts 3..4: audio overlays inlined as base64, in audioOverlays array
    // order (NOT sceneIdx order). The bytes are the blob URL itself (see mock).
    expect(parts[3].inlineData).toEqual({ mimeType: 'audio/mpeg', data: btoa('blob:for-scene-1') });
    expect(parts[4].inlineData).toEqual({ mimeType: 'audio/mpeg', data: btoa('blob:for-scene-0') });
  });
});
