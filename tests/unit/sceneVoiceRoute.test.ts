import { describe, it, expect } from 'vitest';
import { routeScene, assertUniqueSceneIdx } from '../../api/_lib/sceneVoiceRoute.js';
import type { ConsolidationScene } from '../../types.js';

// Encodes the Phase 1 routing intent (workflows/render_pipeline_voice_10.md):
//   talking   → STS on the scene MP4 audio (lip-sync), TTS fallback w/o video
//   b-roll    → TTS on scriptLine
//   cinematic → TTS if scriptLine non-empty, else skip (visual-only)
// plus the audio↔video keying contract (premortem #4a): sceneIdx must be unique.

const scene = (over: Partial<ConsolidationScene>): ConsolidationScene => ({
  sceneIdx: 0,
  type: 'b-roll',
  scriptLine: 'hello',
  ...over,
});

describe('routeScene', () => {
  it('talking WITH videoUrl → speech-to-speech (preserves lip-sync)', () => {
    const r = routeScene(scene({ type: 'talking', videoUrl: 'https://x/y.mp4', scriptLine: 'hi' }));
    expect(r).toEqual({ action: 'sts', unit: 'sts', videoUrl: 'https://x/y.mp4' });
  });

  it('talking WITHOUT videoUrl but with scriptLine → TTS fallback', () => {
    const r = routeScene(scene({ type: 'talking', scriptLine: 'no video here' }));
    expect(r).toEqual({ action: 'tts-fallback', unit: 'tts', text: 'no video here' });
  });

  it('talking WITHOUT videoUrl and WITHOUT scriptLine → skip', () => {
    const r = routeScene(scene({ type: 'talking', scriptLine: '   ' }));
    expect(r.action).toBe('skip');
  });

  it('b-roll with scriptLine → TTS', () => {
    const r = routeScene(scene({ type: 'b-roll', scriptLine: 'buy now' }));
    expect(r).toEqual({ action: 'tts', unit: 'tts', text: 'buy now' });
  });

  it('b-roll with empty scriptLine → skip', () => {
    const r = routeScene(scene({ type: 'b-roll', scriptLine: '' }));
    expect(r.action).toBe('skip');
  });

  it('cinematic with scriptLine → TTS', () => {
    const r = routeScene(scene({ type: 'cinematic', scriptLine: 'a quiet sunset' }));
    expect(r).toEqual({ action: 'tts', unit: 'tts', text: 'a quiet sunset' });
  });

  it('cinematic with empty scriptLine → skip (visual-only)', () => {
    const r = routeScene(scene({ type: 'cinematic', scriptLine: '' }));
    expect(r).toEqual({ action: 'skip', reason: 'cinematic_visual_only' });
  });

  it('trims whitespace-only scriptLine to empty before routing', () => {
    expect(routeScene(scene({ type: 'cinematic', scriptLine: '\n\t  ' })).action).toBe('skip');
  });

  it('STS quota is charged for talking, TTS quota for everything else', () => {
    expect(routeScene(scene({ type: 'talking', videoUrl: 'https://x/y.mp4' })).unit).toBe('sts');
    expect(routeScene(scene({ type: 'b-roll', scriptLine: 'x' })).unit).toBe('tts');
    expect(routeScene(scene({ type: 'cinematic', scriptLine: 'x' })).unit).toBe('tts');
  });
});

describe('assertUniqueSceneIdx', () => {
  it('accepts distinct non-negative sceneIdx', () => {
    const out = assertUniqueSceneIdx([scene({ sceneIdx: 0 }), scene({ sceneIdx: 1 }), scene({ sceneIdx: 2 })]);
    expect(out.ok).toBe(true);
  });

  it('rejects duplicate sceneIdx (would break audio↔video keying)', () => {
    const out = assertUniqueSceneIdx([scene({ sceneIdx: 0 }), scene({ sceneIdx: 0 })]);
    expect(out.ok).toBe(false);
    expect(out.error).toContain('duplicate_scene_idx');
  });

  it('rejects negative or non-integer sceneIdx', () => {
    expect(assertUniqueSceneIdx([scene({ sceneIdx: -1 })]).ok).toBe(false);
    expect(assertUniqueSceneIdx([scene({ sceneIdx: 1.5 })]).ok).toBe(false);
  });
});
