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
//      fileData parts carrying a Gemini-minted `files/*` URI (never the raw
//      R2 object URL) and audioOverlays as base64 inlineData parts (blob:
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

// Scene videos are uploaded to the Gemini Files API through
// /api/gemini/files/upload before the EDL call (Gemini only accepts URIs it
// minted itself). Mocked at that proxy seam; the minted URI carries the source
// filename so part order stays checkable.
const uploadResponse = (body: string) => {
  const stem = JSON.parse(body).url.split('/').pop().replace('.mp4', '');
  return { ok: true, status: 200, json: async () => ({ uri: `files/${stem}`, name: `files/${stem}` }) };
};

// blob: audio fetches and Files API mints are infrastructure, not model attempts.
// Routed identically in every test so each mock below only has to describe what
// the MODEL returns.
const mediaResponse = (url: any, init: any): any | null => {
  if (typeof url !== 'string') return null;
  if (url.startsWith('blob:')) return blobResponse(url);
  if (url.includes('/api/gemini/files/upload')) return uploadResponse(init.body);
  return null;
};

const mockFetchRouting = (edl: unknown) => {
  fetchMock.mockImplementation(async (url: any, init: any) => mediaResponse(url, init) ?? okGemini(edl));
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

    // Parts 1..2: per-scene videos, in sceneBatch order, each carrying the URI
    // minted by /api/gemini/files/upload — NOT the R2 object URL. Gemini answers
    // a request carrying even ONE raw R2 URL with 429 RESOURCE_EXHAUSTED
    // (isolated live 2026-08-14 — see tests/unit/edlVideoAttachCap.test.ts).
    expect(parts[1].fileData).toEqual({ fileUri: 'files/a', mimeType: 'video/mp4' });
    expect(parts[2].fileData).toEqual({ fileUri: 'files/b', mimeType: 'video/mp4' });
    expect(parts.filter((p: any) => p.fileData).length).toBe(2);

    // Parts 3..4: audio overlays inlined as base64, in audioOverlays array
    // order (NOT sceneIdx order). The bytes are the blob URL itself (see mock).
    expect(parts[3].inlineData).toEqual({ mimeType: 'audio/mpeg', data: btoa('blob:for-scene-1') });
    expect(parts[4].inlineData).toEqual({ mimeType: 'audio/mpeg', data: btoa('blob:for-scene-0') });
  });
});

// Post-parse coercion belt (2026-07-22): the EDL call has no responseSchema, so
// the model drifts. These tests exercise the defensive belt directly — meta
// hookStrategy/formulaApplied normalization + SFX-bank enum filtering — using
// raw EDL fixtures that inject the exact drift each rule guards against.
describe('generateEditDecisionList — meta / SFX coercion belt', () => {
  const singleInput = {
    sceneBatch: [
      { sceneIdx: 0, scriptLine: 'Hook.', renderedUrl: 'https://example.com/x0.mp4', type: 'talking' as const },
    ],
    audioOverlays: [{ sceneIdx: 0, audioUrl: 'blob:x-0' }],
    aspectRatio: '9:16' as const,
    targetPlatform: 'tiktok' as const,
  };

  // Minimal, valid raw EDL for one scene; `overrides` inject drift onto meta,
  // scenes, globalSfxPicks, or a stray top-level formulaApplied.
  const rawEdl = (overrides: {
    meta?: Record<string, unknown>;
    scenes?: unknown[];
    globalSfxPicks?: unknown;
    topLevelFormulaApplied?: unknown;
  } = {}) => ({
    meta: {
      totalDurationSec: 4,
      aspectRatio: '9:16',
      targetPlatform: 'tiktok',
      hookStrategy: 'Base hook.',
      formulaApplied: ['mrbeast'],
      scriptStyleDetected: 'mrbeast',
      ...(overrides.meta ?? {}),
    },
    scenes: overrides.scenes ?? [
      {
        sceneIdx: 0,
        sourceVideoUrl: 'https://example.com/x0.mp4',
        sourceAudioUrl: 'blob:x-0',
        keepSegments: [{ startSec: 0, endSec: 4 }],
        voiceOffsetSec: 0,
        notes: 'Lever: none — curiosity loop only.',
      },
    ],
    globalSfxPicks: overrides.globalSfxPicks ?? [],
    formulaCheck: { rulesApplied: ['Hook in first 3s'], weaknessesFlagged: [] },
    ...(overrides.topLevelFormulaApplied !== undefined
      ? { formulaApplied: overrides.topLevelFormulaApplied }
      : {}),
  });

  const runBelt = async (edl: unknown) => {
    mockFetchRouting(edl);
    return generateEditDecisionList({ ...singleInput, finalScript: 'Hook.' });
  };

  it('lifts a top-level formulaApplied array into meta (3.6 slot drift)', async () => {
    const result = await runBelt(
      rawEdl({ meta: { formulaApplied: undefined }, topLevelFormulaApplied: ['mrbeast', 'cialdini'] })
    );
    expect(result.meta.formulaApplied).toEqual(['mrbeast', 'cialdini']);
  });

  it('filters invalid formula names out of meta.formulaApplied; valid (case-normalized) survive', async () => {
    const result = await runBelt(rawEdl({ meta: { formulaApplied: ['mrbeast', 'bogus', 'SABRI-SUBY'] } }));
    expect(result.meta.formulaApplied).toEqual(['mrbeast', 'sabri-suby']);
  });

  it('clamps meta.hookStrategy to 160 chars and keeps it a string', async () => {
    const result = await runBelt(rawEdl({ meta: { hookStrategy: 'x'.repeat(200) } }));
    expect(typeof result.meta.hookStrategy).toBe('string');
    expect(result.meta.hookStrategy.length).toBe(160);
  });

  it('coerces a non-string meta.hookStrategy to an empty string', async () => {
    const result = await runBelt(rawEdl({ meta: { hookStrategy: 42 } }));
    expect(result.meta.hookStrategy).toBe('');
  });

  it("normalizes a capitalized sfxId ('Whoosh' → 'whoosh') and keeps the cue", async () => {
    const result = await runBelt(
      rawEdl({
        scenes: [
          {
            sceneIdx: 0,
            sourceVideoUrl: 'https://example.com/x0.mp4',
            sourceAudioUrl: 'blob:x-0',
            keepSegments: [{ startSec: 0, endSec: 4 }],
            voiceOffsetSec: 0,
            sfxCues: [{ sfxId: 'Whoosh', anchorSec: 0, reason: 'Hook opener.' }],
            notes: 'Lever: none — curiosity loop only.',
          },
        ],
      })
    );
    expect(result.scenes[0].sfxCues).toEqual([{ sfxId: 'whoosh', anchorSec: 0, reason: 'Hook opener.' }]);
  });

  it("drops a hallucinated sfxId ('explosion') that is outside the render bank", async () => {
    const result = await runBelt(
      rawEdl({
        scenes: [
          {
            sceneIdx: 0,
            sourceVideoUrl: 'https://example.com/x0.mp4',
            sourceAudioUrl: 'blob:x-0',
            keepSegments: [{ startSec: 0, endSec: 4 }],
            voiceOffsetSec: 0,
            sfxCues: [{ sfxId: 'explosion', anchorSec: 0, reason: 'Big boom.' }],
            notes: 'Lever: none — curiosity loop only.',
          },
        ],
      })
    );
    expect(result.scenes[0].sfxCues).toEqual([]);
  });

  it('filters invalid globalSfxPicks ids and normalizes case', async () => {
    const result = await runBelt(rawEdl({ globalSfxPicks: ['whoosh', 'explosion', 'Ding'] }));
    expect(result.globalSfxPicks).toEqual(['whoosh', 'ding']);
  });

  it('strips a "transitionIn": null to undefined (zod .optional() rejects null → FINAL_RENDER 400)', async () => {
    const result = await runBelt(
      rawEdl({
        scenes: [
          {
            sceneIdx: 0,
            sourceVideoUrl: 'https://example.com/x0.mp4',
            sourceAudioUrl: 'blob:x-0',
            keepSegments: [{ startSec: 0, endSec: 4 }],
            voiceOffsetSec: 0,
            transitionIn: null,
            notes: 'Lever: none — curiosity loop only.',
          },
        ],
      })
    );
    expect(result.scenes[0].transitionIn).toBeUndefined();
    // The render payload must not carry the key at all once serialized.
    expect(JSON.parse(JSON.stringify(result.scenes[0]))).not.toHaveProperty('transitionIn');
  });
});

// 2026-07-23 canary F2: a live production run failed 4/4 EDL generations with
// ZERO output tokens (inputTokens === totalTokens, outputTokens null). The old
// `response.text || '{}'` fallback silently coerced the empty reply to '{}' and
// misdiagnosed it as EDL_MALFORMED, discarding the promptFeedback/finishReason
// the proxy already returned. An empty model response is a TRANSPORT error
// (block, MAX_TOKENS), distinct from a parsed-but-wrong-shape draft.
describe('EDL_EMPTY_RESPONSE — empty model output is a transport error, not a malformed draft', () => {
  const singleInput = {
    sceneBatch: [
      { sceneIdx: 0, scriptLine: 'Hook.', renderedUrl: 'https://example.com/x0.mp4', type: 'talking' as const },
    ],
    audioOverlays: [{ sceneIdx: 0, audioUrl: 'blob:x-0' }],
    aspectRatio: '9:16' as const,
    targetPlatform: 'tiktok' as const,
  };

  // Route the fetch mock to return a raw Gemini envelope (not okGemini's
  // JSON.stringify wrapper) so `.text` and sibling fields — promptFeedback /
  // candidates — land on the parsed response exactly as the proxy delivers them.
  const mockRawEnvelope = (envelope: Record<string, unknown>) => {
    fetchMock.mockImplementation(async (url: any) =>
      typeof url === 'string' && url.startsWith('blob:')
        ? blobResponse(url)
        : { ok: true, status: 200, json: async () => envelope }
    );
  };

  const run = () => generateEditDecisionList({ ...singleInput, finalScript: 'Hook.' });

  it('throws EDL_EMPTY_RESPONSE with the blockReason when promptFeedback blocks the reply', async () => {
    mockRawEnvelope({ text: '', promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } });
    await expect(run()).rejects.toThrow(/EDL_EMPTY_RESPONSE/);
    await expect(run()).rejects.toThrow(/PROHIBITED_CONTENT/);
  });

  it('throws EDL_EMPTY_RESPONSE with the finishReason when the candidate hits MAX_TOKENS', async () => {
    mockRawEnvelope({ text: '', candidates: [{ finishReason: 'MAX_TOKENS' }] });
    await expect(run()).rejects.toThrow(/EDL_EMPTY_RESPONSE/);
    await expect(run()).rejects.toThrow(/MAX_TOKENS/);
  });

  it('throws EDL_EMPTY_RESPONSE for a whitespace-only reply', async () => {
    mockRawEnvelope({ text: '  \n ' });
    await expect(run()).rejects.toThrow(/EDL_EMPTY_RESPONSE/);
  });

  it('still throws EDL_MALFORMED (not EDL_EMPTY_RESPONSE) when JSON parses but has no scenes array', async () => {
    mockRawEnvelope({ text: '{"meta":{}}' });
    await expect(run()).rejects.toThrow(/EDL_MALFORMED/);
    await expect(run()).rejects.not.toThrow(/EDL_EMPTY_RESPONSE/);
  });
});

// 2026-07-24 F2 bisect: Gemini deterministically blocks EDL requests whose prompt
// text carries a first-person testimonial ad script (promptFeedback.blockReason =
// PROHIBITED_CONTENT, zero output tokens) under its fabricated-testimonial policy.
// The block fires on the script-as-ad TEXT, not the attached media. The degrade
// lane re-issues the SAME tuned skeleton ONCE with the script fields replaced by
// neutral stubs (media unchanged) so the model reads the spoken lines from the
// attached voice audio. These tests assert at the proxy seam: the retry's outbound
// prompt no longer carries the script, the media parts are byte-for-byte reused,
// and a non-block empty does NOT trigger the (paid) retry.
describe('EDL degrade lane — script-stub retry on prompt block', () => {
  const markerInput = {
    sceneBatch: [
      { sceneIdx: 0, scriptLine: 'Ako si Elena TEST-MARKER', renderedUrl: 'https://example.com/m0.mp4', type: 'talking' as const },
      { sceneIdx: 1, scriptLine: 'Dati blemished, ngayon smooth TEST-MARKER', renderedUrl: 'https://example.com/m1.mp4', type: 'talking' as const },
    ],
    audioOverlays: [
      { sceneIdx: 0, audioUrl: 'blob:mk-0' },
      { sceneIdx: 1, audioUrl: 'blob:mk-1' },
    ],
    aspectRatio: '9:16' as const,
    targetPlatform: 'tiktok' as const,
  };
  const markerScript = 'Ako si Elena TEST-MARKER. Dati blemished, ngayon smooth TEST-MARKER.';

  const runMarker = () =>
    generateEditDecisionList({ ...markerInput, finalScript: markerScript });

  // Model attempts are the /api/gemini/text calls only — blob: audio fetches and
  // the /api/gemini/files/upload mints are media traffic, not attempts.
  const geminiProxyCalls = () =>
    fetchMock.mock.calls.filter((c: any) => {
      const url = c[0];
      return typeof url === 'string' && url.includes('/api/gemini/text');
    });

  const bodyOf = (call: any): any => JSON.parse(call[1].body);

  const emptyBlockedEnvelope = { text: '', promptFeedback: { blockReason: 'PROHIBITED_CONTENT' } };

  it('blocked → stubbed retry succeeds: reuses media, drops the script, parses the EDL', async () => {
    // 1st gemini call blocked-empty; 2nd returns a valid EDL. blob: fetches always
    // resolve to a Blob shape. Track only which gemini attempt we're on.
    let geminiAttempt = 0;
    fetchMock.mockImplementation(async (url: any, init: any) => {
      const media = mediaResponse(url, init);
      if (media) return media;
      geminiAttempt += 1;
      if (geminiAttempt === 1) {
        return { ok: true, status: 200, json: async () => emptyBlockedEnvelope };
      }
      return okGemini(cannedEdl(markerInput));
    });

    const result = await runMarker();

    // Resolves with a well-shaped, parsed EDL.
    assertEdlShape(result, 2);

    // Exactly two model attempts (no more, no fewer).
    const calls = geminiProxyCalls();
    expect(calls.length).toBe(2);

    const firstBody = bodyOf(calls[0]);
    const secondBody = bodyOf(calls[1]);

    // Attempt 1 carries the real script line(s).
    expect(firstBody.contents.parts[0].text).toContain('Ako si Elena TEST-MARKER');

    // Attempt 2's prompt is scrubbed of the marker and carries the stub line.
    expect(secondBody.contents.parts[0].text).not.toContain('TEST-MARKER');
    expect(secondBody.contents.parts[0].text).toContain('(see attached scene 1 audio for the spoken line)');
    expect(secondBody.contents.parts[0].text).toContain('(see attached scene 2 audio for the spoken line)');

    // Media parts (everything after the text prompt) are reused byte-for-byte and
    // in the same order across both attempts — only the prompt text changed.
    expect(secondBody.contents.parts.slice(1)).toEqual(firstBody.contents.parts.slice(1));
  });

  it('double block: both attempts empty+blocked → throws EDL_EMPTY_RESPONSE with the degraded-retry marker, no third call', async () => {
    fetchMock.mockImplementation(async (url: any, init: any) =>
      mediaResponse(url, init) ?? { ok: true, status: 200, json: async () => emptyBlockedEnvelope }
    );

    await expect(runMarker()).rejects.toThrow(/EDL_EMPTY_RESPONSE/);
    // Exactly two model attempts — the degrade lane runs once, then gives up.
    expect(geminiProxyCalls().length).toBe(2);
  });

  it('double block: the thrown message carries the "(degraded retry also blocked)" suffix', async () => {
    fetchMock.mockImplementation(async (url: any, init: any) =>
      mediaResponse(url, init) ?? { ok: true, status: 200, json: async () => emptyBlockedEnvelope }
    );
    await expect(runMarker()).rejects.toThrow(/\(degraded retry also blocked\)/);
  });

  it('empty WITHOUT a blockReason (MAX_TOKENS) does NOT fire the degrade lane — one call, no wasted spend', async () => {
    fetchMock.mockImplementation(async (url: any, init: any) =>
      mediaResponse(url, init) ??
      { ok: true, status: 200, json: async () => ({ text: '', candidates: [{ finishReason: 'MAX_TOKENS' }] }) }
    );

    await expect(runMarker()).rejects.toThrow(/EDL_EMPTY_RESPONSE/);
    // Degrade lane must NOT fire on a non-block empty: exactly one model attempt.
    expect(geminiProxyCalls().length).toBe(1);
    // And no degraded-retry marker, since the stub path never ran.
    await expect(runMarker()).rejects.not.toThrow(/degraded retry also blocked/);
  });
});
