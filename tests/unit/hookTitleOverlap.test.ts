import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { hookTitleLayout, planScene, type TextLayer } from '../../api/_lib/renderFfmpeg.js';
import { measureTextEm } from '../../api/_lib/fontMetrics.js';
import { IMPACT, HYPE, CLEAN, PRESETS, type PresetId } from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene } from '../../types.js';

// F7 — hook-title words rendered FUSED ("HUWAG NANG" printing as "HUWACNANG" on a
// real First Cut, spotlight preset). hookTitleLayout placed each word at an x derived
// from estWidth, a flat length x ratio average; on Montserrat-ExtraBold that runs
// "HUWAG" 0.63em narrower than the glyphs actually advance — MORE than the whole
// 0.34em inter-word gap — so the next word landed on top of it.
//
// The invariant this file pins: a word's RENDERED right edge never crosses the next
// word's left edge. "Rendered width" is read from the font itself (its hmtx advances),
// which is the same thing ffmpeg's drawtext will lay down — never from the layout's own
// width model, or the test would agree with any bug the layout has.

const FONT_DIR = join(process.cwd(), 'api', '_lib', 'assets', 'fonts');
const HOOK_FONTS = readdirSync(FONT_DIR)
  .filter((f) => f.toLowerCase().endsWith('.ttf'))
  .map((f) => `fonts/${f}`);

const FRAME_W = 1080;
const FONTSIZE = 110;
const Y_TOP = 288;
const GAP_EM = 0.34; // hookTitleLayout's inter-word gap, from the spec/comment

// 'HUWAG NANG' is the reported failure; 'SULIT NA SULIT' is the opposite error the
// same estimate makes (over-spaced, so a bigger uppercase bump can't be the fix).
const PHRASES: string[][] = [
  ['HUWAG NANG'],
  ['SULIT NA SULIT'],
  ['STOP SCROLLING'],
  ['LUMA LANG'],
  ['TIGNAN MO TO', 'BAGO MAUBOS'],
  ['5 BEST', 'FREE WEBSITES'],
];

/** Rendered width in px, straight from the font's own advance table. */
const renderedPx = (fontFile: string, word: string, fontsize: number): number => {
  const em = measureTextEm(fontFile, word);
  expect(em, `no metrics for "${word}" in ${fontFile} — the invariant can't be judged`).not.toBeNull();
  return em! * fontsize;
};

describe('hookTitleLayout — words never overlap at their real glyph widths (F7)', () => {
  for (const fontFile of HOOK_FONTS) {
    for (const lines of PHRASES) {
      it(`${fontFile.replace('fonts/', '')} — ${lines.join(' / ')}`, () => {
        // advRatio is deliberately the preset value for a DIFFERENT font (0.5) to prove
        // the layout is driven by the measured font, not by a well-matched ratio.
        const words = hookTitleLayout(lines, FONTSIZE, 0.5, FRAME_W, Y_TOP, 0.05, 0.32, fontFile);
        expect(words.length).toBe(lines.join(' ').split(/\s+/).length);

        for (let i = 0; i + 1 < words.length; i++) {
          const a = words[i], b = words[i + 1];
          if (a.yPx !== b.yPx) continue; // different lines can't collide horizontally
          const clear = b.xPx - (a.xPx + renderedPx(fontFile, a.word, FONTSIZE));
          expect(
            clear,
            `"${a.word}" bleeds into "${b.word}" by ${(-clear).toFixed(1)}px`
          ).toBeGreaterThanOrEqual(0);
          // Stronger than "no overlap": the clear space IS the intended gap, so the
          // words are neither fused nor drifting apart (1px = the x-rounding budget).
          expect(
            Math.abs(clear - Math.round(GAP_EM * FONTSIZE)),
            `"${a.word}"→"${b.word}" clear ${clear.toFixed(1)}px, expected the ${Math.round(GAP_EM * FONTSIZE)}px gap`
          ).toBeLessThanOrEqual(1);
        }
      });
    }
  }

  it('keeps each line centered in the frame at its measured extent', () => {
    for (const fontFile of HOOK_FONTS) {
      for (const lines of PHRASES) {
        const words = hookTitleLayout(lines, FONTSIZE, 0.5, FRAME_W, Y_TOP, 0.05, 0.32, fontFile);
        const rows = new Map<number, typeof words>();
        for (const w of words) {
          const row = rows.get(w.yPx!) ?? [];
          row.push(w);
          rows.set(w.yPx!, row);
        }
        for (const [, row] of rows) {
          const left = row[0].xPx;
          const last = row[row.length - 1];
          const right = last.xPx + renderedPx(fontFile, last.word, FONTSIZE);
          expect(
            Math.abs((left + right) / 2 - FRAME_W / 2),
            `${fontFile} "${row.map((w) => w.word).join(' ')}" is off-center`
          ).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it('every title-stack preset lays its hook out without fusing words', () => {
    const scene: FinalRenderScene = {
      sceneIdx: 0, videoUrl: 'v', isHook: true,
      overlayText: [{ text: 'HUWAG NANG BUMILI NG LUMA', startSec: 0, endSec: 5, style: 'hook', position: 'center' }],
    };
    const stacked = (Object.keys(PRESETS) as PresetId[])
      .map((id) => PRESETS[id])
      .filter((p) => p.hook.layout === 'title-stack' && !p.stitchedOnly);
    expect(stacked.length).toBeGreaterThan(0);

    for (const preset of stacked) {
      const layer = planScene(scene, 4, [FRAME_W, 1920], preset, 0)
        .find((l): l is TextLayer => l.kind === 'text' && l.anim === 'word-pop');
      expect(layer, `${preset.id}: no title-stack hook layer`).toBeDefined();
      const words = layer!.words!;
      for (let i = 0; i + 1 < words.length; i++) {
        const a = words[i], b = words[i + 1];
        if (a.yPx !== b.yPx) continue;
        const clear = b.xPx - (a.xPx + renderedPx(preset.hook.fontFile, a.word, layer!.fontsize));
        expect(
          clear,
          `${preset.id}: "${a.word}" bleeds into "${b.word}" by ${(-clear).toFixed(1)}px`
        ).toBeGreaterThanOrEqual(0);
      }
      // The whole line still fits inside the frame.
      expect(Math.min(...words.map((w) => w.xPx))).toBeGreaterThanOrEqual(0);
    }
  });

  it('falls back to the old estimate when no font is passed (pre-F7 callers unchanged)', () => {
    // Same call the snapshot/unit suites make: no fontFile → byte-identical legacy math
    // (length x (advRatio + 0.10 uppercase bump) x fontsize, 0.34em gap).
    const legacy = hookTitleLayout(['FREE WEBSITES'], 100, 0.64, 1080, 600, 0.05, 0.32);
    const upper = (wd: string) => wd.length * 100 * (0.64 + 0.10);
    const gap = Math.round(100 * 0.34);
    const lineW = upper('FREE') + gap + upper('WEBSITES');
    expect(legacy[0].xPx).toBe(Math.round((1080 - lineW) / 2));
    expect(legacy[1].xPx - legacy[0].xPx).toBe(Math.round(upper('FREE')) + gap);
  });

  it('the hook fonts the shipped presets actually use are all measurable', () => {
    for (const preset of [IMPACT, HYPE, CLEAN]) {
      expect(HOOK_FONTS, `${preset.id} hook font missing from the bundle`).toContain(preset.hook.fontFile);
      expect(measureTextEm(preset.hook.fontFile, 'HUWAG NANG'), preset.id).not.toBeNull();
    }
  });
});
