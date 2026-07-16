import { describe, it, expect } from 'vitest';
import { planScene, type TextLayer } from '../../api/_lib/renderFfmpeg.js';
import { CLASSIC } from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene } from '../../types.js';

// Item 4: the hook title falls back to the FIRST SENTENCE of the spoken line
// (split on ./!/?, terminal ?/! kept, 7-word cap, run through stripUnrenderable)
// when the EDL carries no hook overlay. Only when BOTH sources are empty does the
// hook plan zero layers.
const PORTRAIT: [number, number] = [1080, 1920];

const titleOf = (layers: ReturnType<typeof planScene>): string | null => {
  const t = layers.find((l) => l.kind === 'text') as TextLayer | undefined;
  return t ? t.text.split('\n').join(' ') : null;
};

describe('planScene — hook title fallback', () => {
  it('uses the first sentence of scriptLine when the hook overlay is absent', () => {
    const scene: FinalRenderScene = {
      sceneIdx: 0, videoUrl: 'v', isHook: true,
      scriptLine: "Hiraya Glow ba talaga 'to? Tingnan natin.",
    };
    const layers = planScene(scene, 4, PORTRAIT, CLASSIC, 0);
    // stripUnrenderable removes the apostrophe from "'to"; the terminal ? is kept.
    expect(titleOf(layers)).toBe('Hiraya Glow ba talaga to?');
  });

  it('caps the fallback at 7 words and drops the terminal mark when truncated', () => {
    const scene: FinalRenderScene = {
      sceneIdx: 0, videoUrl: 'v', isHook: true,
      scriptLine: 'Isa dalawa tatlo apat lima anim pito walo siyam?',
    };
    const layers = planScene(scene, 4, PORTRAIT, CLASSIC, 0);
    expect(titleOf(layers)).toBe('Isa dalawa tatlo apat lima anim pito');
  });

  it('the EDL overlay still wins over the scriptLine when present', () => {
    const scene: FinalRenderScene = {
      sceneIdx: 0, videoUrl: 'v', isHook: true,
      scriptLine: 'This spoken line should be ignored.',
      overlayText: [{ text: 'STOP SCROLLING', startSec: 0, endSec: 5, style: 'hook', position: 'center' }],
    };
    const layers = planScene(scene, 4, PORTRAIT, CLASSIC, 0);
    expect(titleOf(layers)).toBe('STOP SCROLLING');
  });

  it('plans zero layers when BOTH the overlay and the scriptLine are absent', () => {
    const scene: FinalRenderScene = {
      sceneIdx: 0, videoUrl: 'v', isHook: true,
    };
    expect(planScene(scene, 4, PORTRAIT, CLASSIC, 0)).toHaveLength(0);
  });
});
