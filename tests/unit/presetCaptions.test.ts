import { describe, it, expect } from 'vitest';
import { planScene, buildTextFilter, buildWordFilters } from '../../api/_lib/renderFfmpeg.js';
import type { TextLayer, BoxLayer } from '../../api/_lib/renderFfmpeg.js';
import {
  CLASSIC, IMPACT, HYPE, CLEAN, PUNCH, BARS, SPOTLIGHT,
} from '../../api/_lib/renderPresets.js';
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
const captionOnly: FinalRenderScene = {
  sceneIdx: 2, videoUrl: 'v', sceneType: 'talking',
  scriptLine: 'Grabe ang lambot ng skin ko ngayon talaga promise',
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
  it('hype/impact hook is a title stack: no box, hook font, sequential elastic words', () => {
    for (const preset of [HYPE, IMPACT]) {
      const layers = planScene(hook, 4, DIMS, preset);
      expect(layers.some((l) => l.kind === 'box')).toBe(false);
      const title = layers[0] as TextLayer;
      expect(title.anim).toBe('word-pop');
      expect(title.font).toBe('hook');
      expect(title.words!.length).toBe(3); // TIGNAN MO TO
      expect(title.words![0].start).toBeLessThanOrEqual(0.1); // text on frame ~0
      // sequential cadence + persistence to scene end
      expect(title.words![1].start).toBeGreaterThan(title.words![0].start);
      expect(title.words![2].end).toBeCloseTo(4, 3);
      // two-tone: TIGNAN is a power word → gold highlight
      expect(title.words![0].highlight).toBe(true);
      expect(title.words![1].highlight).toBeFalsy();
      expect(title.emphasisSfx).toBe('boom');
    }
  });

  it('clean: title stack with no box, white base', () => {
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

describe('punch caption preset', () => {
  it('plans white word pops with a hard black contour and shadow', () => {
    const chunks = texts(planScene(captionOnly, 5, DIMS, PUNCH));
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((l) => l.anim === 'word-pop')).toBe(true);

    const textFilter = buildTextFilter(chunks[0], 'font.ttf', 'c.txt', PUNCH);
    expect(textFilter).toContain('fontcolor=white');
    expect(textFilter).toContain(`borderw=${Math.round(chunks[0].fontsize * PUNCH.caption.borderWFrac)}`);
    expect(textFilter).toContain('bordercolor=black');
    expect(textFilter).toContain('shadowcolor=black@0.6');

    const wordFilter = buildWordFilters(
      chunks[0], 'font.ttf', chunks[0].words!.map((_, i) => `w${i}.txt`), PUNCH
    );
    expect(wordFilter).toContain('fontcolor=white');
    expect(wordFilter).toContain('bordercolor=black');
  });
});

describe('bars caption preset', () => {
  it('plans per-line bars and emits alternating solid bars with a staggered slam', () => {
    const twoLineScene: FinalRenderScene = {
      ...captionOnly,
      scriptLine: 'EXTRAORDINARYTRANSFORMATION UNBELIEVABLERESULTS',
    };
    const chunks = texts(planScene(twoLineScene, 5, DIMS, BARS));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].anim).toBe('bars');
    expect(chunks[0].words?.map((line) => line.word)).toEqual([
      'EXTRAORDINARYTRANSFORMATION',
      'UNBELIEVABLERESULTS',
    ]);
    expect(chunks[0].words![1].start - chunks[0].words![0].start).toBeCloseTo(0.18);

    const layer = chunks[0];
    const f = buildWordFilters(layer, 'font.ttf', ['line0.txt', 'line1.txt'], BARS);
    expect(f).toContain('fontcolor=white:box=1:boxcolor=black@1');
    expect(f).toContain('fontcolor=black:box=1:boxcolor=white@1');
    expect(f).toContain("x='(w-text_w)/2-140*(1-");
    expect(f).toContain(`enable='between(t,${layer.words![1].start},${layer.endSec})'`);
    expect(f).toContain(`max(0,(${layer.endSec}-t)/0.18)`);
  });
});

describe('spotlight caption preset', () => {
  it('plans karaoke invert and gates a pulsing black-on-white spoken word', () => {
    const chunks = texts(planScene(captionOnly, 5, DIMS, SPOTLIGHT));
    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks.every((l) => l.anim === 'karaoke-invert')).toBe(true);

    const textFilter = buildTextFilter(chunks[0], 'font.ttf', 'base.txt', SPOTLIGHT);
    expect(textFilter).toContain('fontcolor=white');
    expect(textFilter).toContain(`borderw=${Math.round(chunks[0].fontsize * SPOTLIGHT.caption.borderWFrac)}`);
    expect(textFilter).toContain('bordercolor=black');

    const wordFilter = buildWordFilters(
      chunks[0], 'font.ttf', chunks[0].words!.map((_, i) => `w${i}.txt`), SPOTLIGHT, 'base.txt'
    );
    expect(wordFilter).toContain('fontcolor=white');
    expect(wordFilter).toContain('bordercolor=black');
    expect(wordFilter).toContain('fontcolor=black:box=1:boxcolor=white@1');
    expect(wordFilter).toContain('1+0.06*sin');
    expect(wordFilter).toContain(`enable='between(t,${chunks[0].words![0].start},${chunks[0].words![0].end})'`);
  });
});
