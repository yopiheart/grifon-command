import { describe, it, expect } from 'vitest';
import { planScene, buildTextFilter } from '../../api/_lib/renderFfmpeg.js';
import type { TextLayer, BoxLayer } from '../../api/_lib/renderFfmpeg.js';
import { CLASSIC, IMPACT, HYPE, CLEAN } from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene } from '../../types.js';

const DIMS: [number, number] = [1080, 1920];

const hook: FinalRenderScene = {
  sceneIdx: 0, videoUrl: 'v', isHook: true,
  overlayText: [{ text: 'TIGNAN MO TO', startSec: 0, endSec: 5, style: 'hook', position: 'center' }],
};
const talking: FinalRenderScene = {
  sceneIdx: 1, videoUrl: 'v', sceneType: 'talking',
  scriptLine: 'Grabe ang lambot ng skin ko ngayon talaga promise',
  overlayText: [{ text: 'DERMA-TESTED', startSec: 0, endSec: 5, style: 'callout', position: 'top' }],
};
const cta: FinalRenderScene = {
  sceneIdx: 7, videoUrl: 'v', sceneType: 'b-roll',
  overlayText: [{ text: 'ORDER NA', startSec: 0, endSec: 5, style: 'punchline', position: 'bottom' }],
};

const texts = (ls: ReturnType<typeof planScene>) =>
  ls.filter((l): l is TextLayer => l.kind === 'text');

describe('planScene — classic identity', () => {
  it('omitting the preset and passing CLASSIC produce identical plans', () => {
    for (const scene of [hook, talking, cta]) {
      expect(planScene(scene, 5, DIMS)).toEqual(planScene(scene, 5, DIMS, CLASSIC));
    }
  });

  it('classic keeps the shipped hook timing (0.4s text, 0.55s box) and crimson box', () => {
    const layers = planScene(hook, 4, DIMS, CLASSIC);
    const box = layers[0] as BoxLayer;
    expect(box.color).toBe('0xD90429');
    expect(box.startSec).toBe(0.55);
    expect((layers[1] as TextLayer).startSec).toBe(0.4);
  });

  it('classic punchline keeps the 1.5s hold (no CTA-to-end change)', () => {
    const fade = texts(planScene(cta, 5, DIMS, CLASSIC)).find((l) => l.anim === 'fade')!;
    expect(fade.endSec).toBeCloseTo(1.5, 3);
  });
});

describe('planScene — preset styling', () => {
  it('hype: hook text lands on frame ~0 with the preset wipe color', () => {
    const layers = planScene(hook, 4, DIMS, HYPE);
    const box = layers[0] as BoxLayer;
    expect(box.color).toBe('0x111111');
    expect((layers[1] as TextLayer).startSec).toBeLessThanOrEqual(0.1);
  });

  it('clean: no hook wipe box at all', () => {
    const layers = planScene(hook, 4, DIMS, CLEAN);
    expect(layers.some((l) => l.kind === 'box')).toBe(false);
    expect((layers[0] as TextLayer).color).toBe('white');
  });

  it('impact: callout uses the gold highlight, snap SFX, outline (no box)', () => {
    const fade = texts(planScene(talking, 6, DIMS, IMPACT)).find((l) => l.anim === 'fade')!;
    expect(fade.color).toBe('0xFFCC00');
    expect(fade.emphasisSfx).toBe('snap');
    expect(fade.boxAlpha).toBe(0);
  });

  it('hype: caption chunks animate word-level, are gold, and run smaller/faster than classic', () => {
    const classicChunks = texts(planScene(talking, 6, DIMS, CLASSIC)).filter((l) => l.anim === 'none');
    const hypeChunks = texts(planScene(talking, 6, DIMS, HYPE))
      .filter((l) => l.anim === 'word-pop' || l.anim === 'pop');
    expect(hypeChunks.length).toBeGreaterThan(classicChunks.length);
    expect(hypeChunks[0].color).toBe('0xFFCC00');
    expect(hypeChunks[0].boxAlpha).toBe(0);
  });

  it('non-classic punchline (CTA) holds to the scene end — research §1.4 fix', () => {
    const fade = texts(planScene(cta, 5, DIMS, IMPACT)).find((l) => l.anim === 'fade')!;
    expect(fade.endSec).toBeCloseTo(5, 3);
  });

  it('clean (sincere) callout carries no SFX', () => {
    const fade = texts(planScene(talking, 6, DIMS, CLEAN)).find((l) => l.anim === 'fade')!;
    expect(fade.emphasisSfx).toBeUndefined();
  });
});

describe('buildTextFilter — preset rendering', () => {
  const base: TextLayer = {
    kind: 'text', text: 'X', fontsize: 80, color: 'white', boxAlpha: 0,
    xExpr: '(w-text_w)/2', yBase: 1200, startSec: 0.5, endSec: 2.5, anim: 'none',
  };

  it('outline presets emit borderw instead of a box', () => {
    const f = buildTextFilter(base, 'font.ttf', 'c.txt', HYPE);
    expect(f).toContain(`borderw=${Math.round(80 * HYPE.caption.borderWFrac)}`);
    expect(f).toContain('bordercolor=black');
    expect(f).not.toContain('box=1');
  });

  it('a boxed layer never gets an outline, even under an outline preset', () => {
    const f = buildTextFilter({ ...base, boxAlpha: 0.85 }, 'font.ttf', 'c.txt', HYPE);
    expect(f).toContain('box=1');
    expect(f).not.toContain(':borderw='); // boxborderw is the box pad, not an outline
  });

  it('pop animation: alpha snap + 85%→100% scale with overshoot', () => {
    const f = buildTextFilter({ ...base, anim: 'pop' }, 'font.ttf', 'c.txt', HYPE);
    expect(f).toContain("alpha='min(1,max(0,(t-0.5)/0.06))'");
    expect(f).toContain("fontsize='max(8,80*(0.85+0.15*");
  });

  it('classic output is byte-identical to the pre-preset renderer', () => {
    const f = buildTextFilter({ ...base, boxAlpha: 0.85 }, 'font.ttf', 'ov.txt', CLASSIC);
    expect(f).toContain('shadowcolor=black@0.73');
    expect(f).toContain('shadowx=6');
    expect(f).toContain('boxborderw=18'); // round(80*0.22)
    expect(f).toContain("enable='between(t,0.5,2.5)'");
    expect(buildTextFilter({ ...base, boxAlpha: 0.85 }, 'font.ttf', 'ov.txt'))
      .toBe(f); // default preset === CLASSIC
  });
});
