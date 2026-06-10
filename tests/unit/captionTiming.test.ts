import { describe, it, expect } from 'vitest';
import {
  wordTimings, planScene, buildWordFilters, estWidth, hookTitleLayout, isPowerWord,
} from '../../api/_lib/renderFfmpeg.js';
import type { TextLayer } from '../../api/_lib/renderFfmpeg.js';
import { HYPE } from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene } from '../../types.js';

const DIMS: [number, number] = [1080, 1920];

describe('wordTimings (character-weight interpolation)', () => {
  const t = wordTimings('GRABE ANG LAMBOT', 1.0, 3.0, 76, 0.48, 1080);

  it('partitions the window exactly: first starts at start, last ends at end', () => {
    expect(t[0].start).toBeCloseTo(1.0, 3);
    expect(t[t.length - 1].end).toBeCloseTo(3.0, 3);
  });

  it('is contiguous and monotonic', () => {
    for (let j = 1; j < t.length; j++) {
      expect(t[j].start).toBeCloseTo(t[j - 1].end, 3);
      expect(t[j].end).toBeGreaterThan(t[j].start);
    }
  });

  it('longer words get longer windows (char weight)', () => {
    const lambot = t.find((w) => w.word === 'LAMBOT')!;
    const ang = t.find((w) => w.word === 'ANG')!;
    expect(lambot.end - lambot.start).toBeGreaterThan(ang.end - ang.start);
  });

  it('trailing punctuation buys a beat', () => {
    const a = wordTimings('ORDER NA', 0, 2, 76, 0.48, 1080);
    const b = wordTimings('ORDER NA!', 0, 2, 76, 0.48, 1080);
    const naA = a[1].end - a[1].start;
    const naB = b[1].end - b[1].start;
    expect(naB).toBeGreaterThan(naA);
  });

  it('x offsets advance by the rendered width of the preceding words', () => {
    for (let j = 1; j < t.length; j++) expect(t[j].xPx).toBeGreaterThan(t[j - 1].xPx);
    const lineX = (1080 - estWidth('GRABE ANG LAMBOT', 76, 0.48)) / 2;
    expect(t[0].xPx).toBe(Math.round(lineX));
  });

  it('single word fills the whole window; empty input yields []', () => {
    const one = wordTimings('PROMISE', 0.5, 1.5, 76, 0.48, 1080);
    expect(one).toHaveLength(1);
    expect(one[0].start).toBeCloseTo(0.5, 3);
    expect(one[0].end).toBeCloseTo(1.5, 3);
    expect(wordTimings('', 0, 1, 76, 0.48, 1080)).toEqual([]);
    expect(wordTimings('X', 2, 2, 76, 0.48, 1080)).toEqual([]);
  });
});

describe('hookTitleLayout (reference-grade title stack)', () => {
  it('pops words sequentially at the cadence, lines stacked and centered', () => {
    const t = hookTitleLayout(['5 BEST', 'FREE WEBSITES'], 100, 0.64, 1080, 600, 0.05, 0.32);
    expect(t.map((w) => w.word)).toEqual(['5', 'BEST', 'FREE', 'WEBSITES']);
    expect(t[0].start).toBeCloseTo(0.05, 3);
    expect(t[1].start).toBeCloseTo(0.37, 3);
    expect(t[3].start).toBeCloseTo(1.01, 3);
    // line 2 sits one line-height below line 1
    expect(t[2].yPx!).toBeGreaterThan(t[0].yPx!);
    expect(t[2].yPx).toBe(t[3].yPx);
    // each line independently centered
    const line2X = (1080 - estWidth('FREE WEBSITES', 100, 0.64)) / 2;
    expect(t[2].xPx).toBe(Math.round(line2X));
  });

  it('power words go gold: numbers + lexicon; at least one highlight guaranteed', () => {
    expect(isPowerWord('5')).toBe(true);
    expect(isPowerWord('TIGNAN')).toBe(true);
    expect(isPowerWord('BEST')).toBe(true);
    expect(isPowerWord('websites')).toBe(false);
    const t = hookTitleLayout(['5 BEST', 'FREE WEBSITES'], 100, 0.64, 1080, 600, 0, 0.3);
    expect(t[0].highlight).toBe(true);   // "5"
    expect(t[3].highlight).toBeFalsy();  // WEBSITES
    // no power words at all → first word forced gold
    const none = hookTitleLayout(['HELLO WORLD'], 100, 0.64, 1080, 600, 0, 0.3);
    expect(none[0].highlight).toBe(true);
  });
});

describe('planScene — word-level layers (hype)', () => {
  const talking: FinalRenderScene = {
    sceneIdx: 1, videoUrl: 'v', sceneType: 'talking',
    scriptLine: 'Grabe ang lambot ng skin ko ngayon talaga promise',
  };

  it('hype caption chunks carry word timings with the word-pop anim', () => {
    const chunks = planScene(talking, 6, DIMS, HYPE)
      .filter((l): l is TextLayer => l.kind === 'text' && l.anim === 'word-pop');
    expect(chunks.length).toBeGreaterThan(0);
    for (const c of chunks) {
      expect(c.words!.length).toBeGreaterThan(0);
      expect(c.words![0].start).toBeCloseTo(c.startSec, 3);
      expect(c.words![c.words!.length - 1].end).toBeCloseTo(c.endSec, 3);
      expect(Number.isFinite(Number(c.xExpr))).toBe(true); // numeric line origin
    }
  });
});

describe('buildWordFilters', () => {
  const layer: TextLayer = {
    kind: 'text', text: 'GRABE ANG', fontsize: 80, color: '0xFFCC00', boxAlpha: 0,
    xExpr: '300', yBase: 1200, startSec: 1.0, endSec: 2.0, anim: 'word-pop',
    words: [
      { word: 'GRABE', start: 1.0, end: 1.6, xPx: 300 },
      { word: 'ANG', start: 1.6, end: 2.0, xPx: 540 },
    ],
  };

  it('word-pop: one drawtext per word, elastic overshoot scale, accumulating, outlined', () => {
    const f = buildWordFilters(layer, 'font.ttf', ['w0.txt', 'w1.txt'], HYPE);
    expect(f.split('drawtext=').length - 1).toBe(2);
    expect(f).toContain("enable='between(t,1,2)'");      // first word holds to chunk end
    expect(f).toContain("enable='between(t,1.6,2)'");    // second pops later, same end
    expect(f).toContain('x=300');
    expect(f).toContain('x=540');
    expect(f).toContain('borderw=');
    expect(f).not.toContain('box=1');
    // elastic pop: 20%→100% easeOutBack scale + fast alpha snap
    expect(f).toContain("fontsize='max(8,80*(0.2+0.8*");
    expect(f).toContain("alpha='min(1,max(0,(t-1)/0.05))'");
  });

  it('word-pop honors per-word highlight color and yPx (title stack)', () => {
    const stacked = {
      ...layer,
      words: [
        { word: 'GRABE', start: 1.0, end: 2.0, xPx: 300, yPx: 600, highlight: true },
        { word: 'ANG', start: 1.3, end: 2.0, xPx: 540, yPx: 694 },
      ],
    };
    const f = buildWordFilters(stacked, 'hook.ttf', ['w0.txt', 'w1.txt'], HYPE);
    expect(f).toContain(`fontcolor=${HYPE.caption.highlightColor}`); // gold power word
    expect(f).toContain(`fontcolor=${stacked.color}`);               // base word
    expect(f).toContain('y=600');
    expect(f).toContain('y=694');
  });

  it('karaoke: base chunk + per-word highlight windows', () => {
    const f = buildWordFilters(
      { ...layer, anim: 'karaoke' }, 'font.ttf', ['w0.txt', 'w1.txt'], HYPE, 'base.txt'
    );
    expect(f).toContain('textfile=base.txt');
    expect(f).toContain(`fontcolor=${HYPE.caption.highlightColor}`);
    expect(f).toContain("enable='between(t,1,1.6)'");    // highlight leaves with its word
    expect(f).toContain("enable='between(t,1.6,2)'");
  });
});
