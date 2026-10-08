import { describe, it, expect, afterEach, vi } from 'vitest';
import { chooseTrim, renderFinalVideo, RenderError } from '../../api/_lib/renderFfmpeg.js';
import { CLASSIC, HYPE } from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene } from '../../types.js';

afterEach(() => { vi.restoreAllMocks(); });

describe('explicit native audio trim policy', () => {
  it.each(['preserve', 'mute'] as const)('%s uses visual duration even when replacement speech ends early', (audioPolicy) => {
    const scene = { audioPolicy, audioUrl: 'https://example.com/voice.mp3', hasEndFrame: true };
    expect(chooseTrim(scene, 5, 0.8)).toEqual({ trimSec: 5, padAudio: audioPolicy === 'preserve' });
  });

  it.each(['preserve', 'mute'] as const)('%s keeps the full clip ahead of visual caps', (audioPolicy) => {
    expect(chooseTrim({ audioPolicy, keepFullClip: true, targetDurationSec: 1, fallbackDurationSec: 2 }, 5, 0.8))
      .toEqual({ trimSec: 5, padAudio: audioPolicy === 'preserve' });
  });

  it.each(['preserve', 'mute'] as const)('%s applies target and fallback caps against the known clip', (audioPolicy) => {
    const padAudio = audioPolicy === 'preserve';
    expect(chooseTrim({ audioPolicy, targetDurationSec: 2, fallbackDurationSec: 1 }, 5, 0.8))
      .toEqual({ trimSec: 2, padAudio });
    expect(chooseTrim({ audioPolicy, targetDurationSec: 8 }, 5, null)).toEqual({ trimSec: 5, padAudio });
    expect(chooseTrim({ audioPolicy, fallbackDurationSec: 2 }, 5, null)).toEqual({ trimSec: 2, padAudio });
    expect(chooseTrim({ audioPolicy, fallbackDurationSec: 8 }, 5, null)).toEqual({ trimSec: 5, padAudio });
    expect(chooseTrim({ audioPolicy, fallbackDurationSec: 2 }, null, null)).toEqual({ trimSec: 2, padAudio });
  });

  it('replacement and absent policy keep measured VO and hook timing on every preset', () => {
    const voice = { audioUrl: 'https://example.com/voice.mp3', keepFullClip: true };
    for (const [preset, expectedTrim] of [[CLASSIC, 1.3], [HYPE, 1.15]] as const) {
      const absent = chooseTrim(voice, 5, 0.8, preset);
      expect(chooseTrim({ ...voice, audioPolicy: 'replace' }, 5, 0.8, preset)).toEqual(absent);
      expect(absent.trimSec).toBeCloseTo(expectedTrim);
      expect(absent.padAudio).toBe(true);
    }
    // Legacy fallback behavior is intentionally untouched outside the explicit path.
    expect(chooseTrim({ fallbackDurationSec: 8 }, 5, null)).toEqual({ trimSec: 8, padAudio: false });
  });

  it.each([undefined, null, ''])('rejects replacement with missing audioUrl %s before downloading anything', async (audioUrl) => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const scene: FinalRenderScene = { sceneIdx: 0, videoUrl: 'https://example.com/video.mp4', audioPolicy: 'replace', audioUrl };
    await expect(renderFinalVideo([scene], '1:1')).rejects.toBeInstanceOf(RenderError);
    await expect(renderFinalVideo([scene], '1:1')).rejects.toThrow('replace_audio_requires_audio_url');
    expect(fetch).not.toHaveBeenCalled();
  });
});
