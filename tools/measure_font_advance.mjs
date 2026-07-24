#!/usr/bin/env node
// Measure REAL glyph advance widths from a TTF, so drawPlan's width estimates can be
// checked against ground truth instead of guessed.
//
// Why this exists: api/_lib/drawPlan.ts positions each hook-title word at an ESTIMATED
// x (`estWidth` = charCount x advRatio x fontsize, plus a hand-tuned +0.10 bump for
// uppercase). When the estimate under-measures by more than the inter-word gap, adjacent
// words render fused — F7, "HUWAG NANG" printing as "HUWACNANG". Tuning that bump by eye
// needs a full render per attempt; this reads the font's own hmtx table instead.
//
// Usage:
//   node tools/measure_font_advance.mjs                          # all hook fonts, default phrases
//   node tools/measure_font_advance.mjs Anton-Regular "HUWAG NANG"
//
// Output per word: real advance in em, what estWidth predicts at the preset ratio, and
// the shortfall in em. A shortfall larger than the 0.34em inter-word gap = words collide.

import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const FONT_DIR = 'api/_lib/assets/fonts';

// ---- minimal TTF reader: table directory -> head/hhea/hmtx/cmap(format 4) ----

function parseFont(buf) {
  const u16 = (o) => buf.readUInt16BE(o);
  const i16 = (o) => buf.readInt16BE(o);
  const u32 = (o) => buf.readUInt32BE(o);

  const numTables = u16(4);
  const tables = {};
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    tables[buf.toString('ascii', o, o + 4)] = { off: u32(o + 8), len: u32(o + 12) };
  }
  if (!tables.head || !tables.hhea || !tables.hmtx || !tables.cmap) {
    throw new Error('missing a required table (head/hhea/hmtx/cmap)');
  }

  const unitsPerEm = u16(tables.head.off + 18);
  const numberOfHMetrics = u16(tables.hhea.off + 34);

  // hmtx: numberOfHMetrics x (advanceWidth u16, lsb i16), then lsb-only entries that
  // all share the LAST advance width.
  const advanceOf = (gid) => {
    const i = Math.min(gid, numberOfHMetrics - 1);
    return u16(tables.hmtx.off + i * 4);
  };

  // cmap: prefer a (3,1) Unicode BMP subtable, fall back to (0,x).
  const cmapOff = tables.cmap.off;
  const nSub = u16(cmapOff + 2);
  let best = null;
  for (let i = 0; i < nSub; i++) {
    const rec = cmapOff + 4 + i * 8;
    const platform = u16(rec);
    const encoding = u16(rec + 2);
    const subOff = cmapOff + u32(rec + 4);
    if (u16(subOff) !== 4) continue; // only format 4 handled — enough for BMP Latin
    if (platform === 3 && encoding === 1) { best = subOff; break; }
    if (best === null) best = subOff;
  }
  if (best === null) throw new Error('no format-4 cmap subtable');

  const segCountX2 = u16(best + 6);
  const segCount = segCountX2 / 2;
  const endO = best + 14;
  const startO = endO + segCountX2 + 2;
  const deltaO = startO + segCountX2;
  const rangeO = deltaO + segCountX2;

  const gidOf = (cp) => {
    for (let s = 0; s < segCount; s++) {
      if (u16(endO + s * 2) < cp) continue;
      const start = u16(startO + s * 2);
      if (cp < start) return 0;
      const delta = i16(deltaO + s * 2);
      const rangeOffset = u16(rangeO + s * 2);
      if (rangeOffset === 0) return (cp + delta) & 0xffff;
      const gi = rangeO + s * 2 + rangeOffset + (cp - start) * 2;
      const g = u16(gi);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  };

  // Advance of a string in EM units (1.0 = one font size).
  const advanceEm = (text) => {
    let total = 0;
    for (const ch of text) total += advanceOf(gidOf(ch.codePointAt(0)));
    return total / unitsPerEm;
  };

  return { unitsPerEm, advanceEm };
}

// ---- drawPlan's estimate, mirrored ----
// estWidth(text, fontsize, ratio) === text.length * ratio * fontsize  -> in em: length * ratio
const estimateEm = (text, ratio) => text.length * ratio;

// Preset ratios that actually drive hook titles (api/_lib/renderPresets.ts).
const HOOK_RATIOS = {
  'Montserrat-ExtraBold': 0.64,
  'ArchivoBlack-Regular': 0.66,
  'Inter-Black': 0.62,
  'Anton-Regular': 0.5,
  'Bangers-Regular': 0.5,
};
const UPPER_BUMP = 0.1;  // drawPlan's hand-tuned uppercase bump
const GAP_EM = 0.34;     // drawPlan's inter-word gap

const [argFont, argPhrase] = process.argv.slice(2);
const phrases = argPhrase
  ? [argPhrase]
  : ['HUWAG NANG', 'LUMA LANG', 'GRABE ITO', 'STOP SCROLLING', 'SULIT NA SULIT'];

const fonts = argFont
  ? [`${argFont}.ttf`]
  : readdirSync(FONT_DIR).filter((f) => f.toLowerCase().endsWith('.ttf'));

for (const file of fonts) {
  const name = basename(file, '.ttf');
  const ratio = HOOK_RATIOS[name];
  if (ratio === undefined) { console.log(`\n${name}: (no hook ratio mapped, skipping)`); continue; }
  let font;
  try {
    font = parseFont(readFileSync(join(FONT_DIR, file)));
  } catch (e) {
    console.log(`\n${name}: PARSE FAILED — ${e.message}`);
    continue;
  }

  console.log(`\n=== ${name}  (preset advRatio ${ratio}, uppercase bump +${UPPER_BUMP}, gap ${GAP_EM}em) ===`);
  let worst = 0;
  for (const phrase of phrases) {
    for (const word of phrase.split(/\s+/)) {
      const real = font.advanceEm(word);
      const isUpper = /[A-Z]/.test(word) && word === word.toUpperCase();
      const est = estimateEm(word, ratio + (isUpper ? UPPER_BUMP : 0));
      const short = real - est;                 // >0 means the estimate is TOO NARROW
      if (short > worst) worst = short;
      const verdict = short > GAP_EM ? '  <-- COLLIDES (shortfall exceeds the gap)'
        : short > 0 ? '  (narrow, still inside the gap)' : '';
      console.log(
        `  ${word.padEnd(14)} real ${real.toFixed(3)}em   est ${est.toFixed(3)}em   ` +
        `shortfall ${short >= 0 ? '+' : ''}${short.toFixed(3)}em${verdict}`
      );
    }
  }
  const needed = (worst / Math.max(1, 1)) ;
  console.log(`  worst shortfall: ${worst >= 0 ? '+' : ''}${worst.toFixed(3)}em  ` +
    `(gap ${GAP_EM}em ${worst > GAP_EM ? 'INSUFFICIENT' : 'absorbs it'})`);
  void needed;
}
