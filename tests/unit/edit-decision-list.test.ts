import { describe, it, expect, vi } from 'vitest';

// Schema test for the Remotion AI Editor brain (Phase 1 half (a) STUB).
//
// Catches:
//   1. EditDecisionList output-shape regressions (sceneIdx mapping, SFX vocabulary,
//      transition/camera union literals, formulaCheck arrays, meta block).
//   2. Drift between EditDecisionInput and EditDecisionList (e.g., audioOverlays
//      not landing on the right sceneIdx).
//   3. Curated-vocabulary breaches — any SFX ID outside the bank, any transition
//      type outside the allowed union.
//
// Does NOT catch (by design, while the brain is still a stub):
//   - Stochastic Gemini drift. When Phase 1 half (b) lands and replaces the stub
//     with a real /api/gemini/text call, the fetch mock pattern from
//     geminiService.schemas.test.ts will be added here.

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));

const { generateEditDecisionList } = await import('../../services/geminiService');

const SFX_BANK = ['whoosh', 'glitch', 'pop', 'ding', 'riser', 'drop', 'snap', 'swish', 'boom', 'sparkle'];
const TRANSITION_TYPES = ['cut', 'flash', 'whip', 'zoom', 'particles'];
const CAMERA_EFFECTS = ['zoom-in', 'zoom-out', 'pan', 'shake', 'none'];
const OVERLAY_STYLES = ['hook', 'callout', 'subtitle', 'punchline'];
const OVERLAY_POSITIONS = ['top', 'center', 'bottom'];
const TARGET_PLATFORMS = ['tiktok', 'reels', 'shorts', 'youtube'];

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
    expect(['mrbeast', 'sabri-suby']).toContain(f);
  });

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
    expect(scene.notes.length).toBeGreaterThan(0);
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

describe('generateEditDecisionList (Phase 1 half (a) stub)', () => {
  it('returns an EditDecisionList-shaped object for a TikTok hook ad (4 scenes)', async () => {
    const result = await generateEditDecisionList({
      sceneBatch: [
        { sceneIdx: 0, scriptLine: 'Wait until you see this!', renderedUrl: 'https://example.com/s0.mp4', type: 'talking' },
        { sceneIdx: 1, scriptLine: 'Three secrets nobody told you.', renderedUrl: 'https://example.com/s1.mp4', type: 'b-roll' },
        { sceneIdx: 2, scriptLine: 'This one changes everything.', renderedUrl: 'https://example.com/s2.mp4', type: 'cinematic' },
        { sceneIdx: 3, scriptLine: 'Tap to grab yours now.', renderedUrl: 'https://example.com/s3.mp4', type: 'talking' },
      ],
      audioOverlays: [
        { sceneIdx: 0, audioUrl: 'blob:audio-0' },
        { sceneIdx: 1, audioUrl: 'blob:audio-1' },
        { sceneIdx: 2, audioUrl: 'blob:audio-2' },
        { sceneIdx: 3, audioUrl: 'blob:audio-3' },
      ],
      finalScript: 'Wait until you see this! Three secrets nobody told you. This one changes everything. Tap to grab yours now.',
      targetPlatform: 'tiktok',
      aspectRatio: '9:16',
    });

    assertEdlShape(result, 4);
    expect(result.meta.aspectRatio).toBe('9:16');
    expect(result.meta.targetPlatform).toBe('tiktok');
    // Audio URLs should land on the right sceneIdx
    expect(result.scenes[0].sourceAudioUrl).toBe('blob:audio-0');
    expect(result.scenes[3].sourceAudioUrl).toBe('blob:audio-3');
  });

  it('returns an EditDecisionList-shaped object for a 1:1 IG square (3 scenes)', async () => {
    const result = await generateEditDecisionList({
      sceneBatch: [
        { sceneIdx: 0, scriptLine: 'Hook line.', renderedUrl: 'https://example.com/sq0.mp4', type: 'b-roll' },
        { sceneIdx: 1, scriptLine: 'Body claim.', renderedUrl: 'https://example.com/sq1.mp4', type: 'talking' },
        { sceneIdx: 2, scriptLine: 'CTA.', renderedUrl: 'https://example.com/sq2.mp4', type: 'b-roll' },
      ],
      audioOverlays: [
        { sceneIdx: 0, audioUrl: 'blob:sq-0' },
        { sceneIdx: 1, audioUrl: 'blob:sq-1' },
        { sceneIdx: 2, audioUrl: 'blob:sq-2' },
      ],
      finalScript: 'Hook. Body. CTA.',
      targetPlatform: 'reels',
      aspectRatio: '1:1',
    });

    assertEdlShape(result, 3);
    expect(result.meta.aspectRatio).toBe('1:1');
    expect(result.meta.targetPlatform).toBe('reels');
    // Under-4 scenes should flag a pacing weakness
    expect(result.formulaCheck.weaknessesFlagged.length).toBeGreaterThan(0);
  });

  it('returns an EditDecisionList-shaped object for a 16:9 YouTube short (5 scenes)', async () => {
    const result = await generateEditDecisionList({
      sceneBatch: [
        { sceneIdx: 0, scriptLine: 'Imagine this morning routine.', renderedUrl: 'https://example.com/y0.mp4', type: 'cinematic' },
        { sceneIdx: 1, scriptLine: 'Here is what changed for me.', renderedUrl: 'https://example.com/y1.mp4', type: 'talking' },
        { sceneIdx: 2, scriptLine: 'Watch the product in action.', renderedUrl: 'https://example.com/y2.mp4', type: 'b-roll' },
        { sceneIdx: 3, scriptLine: 'The results spoke for themselves.', renderedUrl: 'https://example.com/y3.mp4', type: 'talking' },
        { sceneIdx: 4, scriptLine: 'Try it risk free today.', renderedUrl: 'https://example.com/y4.mp4', type: 'talking' },
      ],
      audioOverlays: [
        { sceneIdx: 0, audioUrl: 'blob:y-0' },
        { sceneIdx: 1, audioUrl: 'blob:y-1' },
        { sceneIdx: 2, audioUrl: 'blob:y-2' },
        { sceneIdx: 3, audioUrl: 'blob:y-3' },
        { sceneIdx: 4, audioUrl: 'blob:y-4' },
      ],
      finalScript: 'Imagine this morning routine. Here is what changed for me. Watch the product in action. The results spoke for themselves. Try it risk free today.',
      targetPlatform: 'youtube',
      aspectRatio: '16:9',
      brandContext: { brandName: 'Glossier', voiceTone: 'Warm, confident, intimate.' },
    });

    assertEdlShape(result, 5);
    expect(result.meta.aspectRatio).toBe('16:9');
    expect(result.meta.targetPlatform).toBe('youtube');
    // 5 scenes — no pacing flag expected
    expect(result.formulaCheck.weaknessesFlagged.length).toBe(0);
    // First scene's audio overlay should land
    expect(result.scenes[0].sourceAudioUrl).toBe('blob:y-0');
  });

  it('routes audioOverlays by sceneIdx (not array order)', async () => {
    const result = await generateEditDecisionList({
      sceneBatch: [
        { sceneIdx: 0, scriptLine: 'A', renderedUrl: 'https://example.com/a.mp4', type: 'talking' },
        { sceneIdx: 1, scriptLine: 'B', renderedUrl: 'https://example.com/b.mp4', type: 'b-roll' },
      ],
      audioOverlays: [
        // Intentionally out of order
        { sceneIdx: 1, audioUrl: 'blob:for-scene-1' },
        { sceneIdx: 0, audioUrl: 'blob:for-scene-0' },
      ],
      finalScript: 'A B',
      targetPlatform: 'tiktok',
      aspectRatio: '9:16',
    });

    const scene0 = result.scenes.find((s) => s.sceneIdx === 0);
    const scene1 = result.scenes.find((s) => s.sceneIdx === 1);
    expect(scene0?.sourceAudioUrl).toBe('blob:for-scene-0');
    expect(scene1?.sourceAudioUrl).toBe('blob:for-scene-1');
  });
});
