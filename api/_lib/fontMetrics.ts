// No-dependency TrueType (sfnt) glyph-advance reader. Replaces the char-count
// `estWidth` estimate for the per-word title-stack hook layout, where each word is
// drawn as its own `drawtext` and positioned by absolute x — an underestimated
// advance lands the next word INSIDE the previous one, fusing them ("MATAPANG ANG"
// → "MATAPANGANG", 2026-06-17 final-render review). Real glyph advances are exact
// for any word/font, so the bug can't recur on a longer caps word.
//
// Parses only the tables needed for horizontal advance: head (unitsPerEm),
// maxp (numGlyphs), hhea (numberOfHMetrics), hmtx (advanceWidth[]), and cmap
// (char → glyphId) format 4 (BMP — covers Latin/Taglish hook text) with a format
// 12 fallback. Anything unexpected → `loadGlyphWidths` returns null and the caller
// degrades to the old estimate (mirrors the existsSync-guarded asset philosophy:
// a font we can't read must never fail a render).

import { readFileSync } from 'node:fs';

type MeasureFn = (text: string, fontsize: number) => number;

const CACHE = new Map<string, MeasureFn | null>();

/**
 * Build a cached `(text, fontsize) => widthPx` measurer from a .ttf path.
 * widthPx = Σ advanceWidth(glyph(char)) * fontsize / unitsPerEm.
 * Returns null if the font can't be parsed (caller falls back to estWidth).
 */
export function loadGlyphWidths(ttfPath: string): MeasureFn | null {
  if (CACHE.has(ttfPath)) return CACHE.get(ttfPath) ?? null;
  let fn: MeasureFn | null = null;
  try {
    fn = build(readFileSync(ttfPath));
  } catch {
    fn = null;
  }
  CACHE.set(ttfPath, fn);
  return fn;
}

function build(buf: Buffer): MeasureFn | null {
  const sfnt = buf.readUInt32BE(0);
  // 0x00010000 = TrueType outlines, 'true'/'ttcf' also seen; 'OTTO' (CFF) still
  // carries the hmtx/cmap tables we need, so accept it too.
  const numTables = buf.readUInt16BE(4);
  const tables = new Map<string, { offset: number; length: number }>();
  for (let i = 0; i < numTables; i++) {
    const rec = 12 + i * 16;
    const tag = buf.toString('latin1', rec, rec + 4);
    tables.set(tag, { offset: buf.readUInt32BE(rec + 8), length: buf.readUInt32BE(rec + 12) });
  }
  const head = tables.get('head');
  const hhea = tables.get('hhea');
  const hmtx = tables.get('hmtx');
  const cmap = tables.get('cmap');
  const maxp = tables.get('maxp');
  if (!head || !hhea || !hmtx || !cmap || !maxp) return null;
  void sfnt;

  const unitsPerEm = buf.readUInt16BE(head.offset + 18);
  if (!unitsPerEm) return null;
  const numHMetrics = buf.readUInt16BE(hhea.offset + 34);
  if (!numHMetrics) return null;

  const advanceOf = (gid: number): number => {
    // hmtx: numHMetrics × {advanceWidth u16, lsb i16}; glyphs past that reuse the
    // last advanceWidth (monospaced trailing run, per the spec).
    const i = gid < numHMetrics ? gid : numHMetrics - 1;
    const at = hmtx.offset + i * 4;
    if (at + 2 > buf.length) return 0;
    return buf.readUInt16BE(at);
  };

  const charToGlyph = buildCmap(buf, cmap.offset);
  if (!charToGlyph) return null;

  return (text: string, fontsize: number): number => {
    let units = 0;
    for (const ch of text) {
      units += advanceOf(charToGlyph(ch.codePointAt(0) ?? 0));
    }
    return (units * fontsize) / unitsPerEm;
  };
}

/** Resolve a usable cmap subtable (prefer Unicode) → (codepoint) => glyphId. */
function buildCmap(buf: Buffer, base: number): ((cp: number) => number) | null {
  const numSub = buf.readUInt16BE(base + 2);
  let best: { offset: number; score: number } | null = null;
  for (let i = 0; i < numSub; i++) {
    const rec = base + 4 + i * 8;
    const platform = buf.readUInt16BE(rec);
    const encoding = buf.readUInt16BE(rec + 2);
    const subOff = base + buf.readUInt32BE(rec + 4);
    // Prefer Windows BMP (3,1) and full-repertoire Unicode (3,10 / 0,*).
    let score = 0;
    if (platform === 3 && encoding === 10) score = 5;
    else if (platform === 3 && encoding === 1) score = 4;
    else if (platform === 0) score = 3;
    else if (platform === 3 && encoding === 0) score = 1;
    if (score && (!best || score > best.score)) best = { offset: subOff, score };
  }
  if (!best) return null;
  const fmt = buf.readUInt16BE(best.offset);
  if (fmt === 4) return cmapFormat4(buf, best.offset);
  if (fmt === 12) return cmapFormat12(buf, best.offset);
  return null;
}

function cmapFormat4(buf: Buffer, off: number): (cp: number) => number {
  const segX2 = buf.readUInt16BE(off + 6);
  const segCount = segX2 / 2;
  const endO = off + 14;
  const startO = endO + segX2 + 2; // +2 reservedPad
  const deltaO = startO + segX2;
  const rangeO = deltaO + segX2;
  return (cp: number): number => {
    if (cp > 0xffff) return 0;
    for (let i = 0; i < segCount; i++) {
      const end = buf.readUInt16BE(endO + i * 2);
      if (cp > end) continue;
      const start = buf.readUInt16BE(startO + i * 2);
      if (cp < start) return 0;
      const delta = buf.readInt16BE(deltaO + i * 2);
      const rangeOffset = buf.readUInt16BE(rangeO + i * 2);
      if (rangeOffset === 0) return (cp + delta) & 0xffff;
      const gidAddr = rangeO + i * 2 + rangeOffset + (cp - start) * 2;
      if (gidAddr + 2 > buf.length) return 0;
      const gid = buf.readUInt16BE(gidAddr);
      return gid === 0 ? 0 : (gid + delta) & 0xffff;
    }
    return 0;
  };
}

function cmapFormat12(buf: Buffer, off: number): (cp: number) => number {
  const nGroups = buf.readUInt32BE(off + 12);
  const groupsO = off + 16;
  return (cp: number): number => {
    for (let i = 0; i < nGroups; i++) {
      const g = groupsO + i * 12;
      const start = buf.readUInt32BE(g);
      const end = buf.readUInt32BE(g + 4);
      if (cp < start) return 0;
      if (cp > end) continue;
      return buf.readUInt32BE(g + 8) + (cp - start);
    }
    return 0;
  };
}
