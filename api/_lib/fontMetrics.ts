// Real glyph advance widths, read from the bundled font's own tables.
//
// Why: the layout engine's estWidth is a FLAT per-character average
// (length x advRatio x fontsize). That model cannot represent per-glyph
// variation — W/M are very wide, I/T/L are narrow — so the SAME ratio is
// simultaneously too tight on "HUWAG" (+0.63em on Montserrat-ExtraBold, more
// than the 0.34em inter-word gap → adjacent words render FUSED, "HUWAG NANG"
// printing as "HUWACNANG") and far too loose on "SULIT" (-0.47em). Raising the
// uppercase bump fixes one word and worsens the other; only real metrics fix
// both. Measurements + reproduction: tools/measure_font_advance.mjs.
//
// This is a minimal TrueType reader — table directory → head/hhea/hmtx +
// format-4 cmap — which is everything an advance-width lookup needs. It runs
// INSIDE the render path, so it never throws: an unreadable, missing or
// unparseable font, or a glyph the cmap doesn't cover, returns null and the
// caller falls back to the estimate. A font problem must degrade layout, not
// fail a render.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface ParsedFont {
  unitsPerEm: number;
  /** Advance in font units, or null when the cmap doesn't cover the codepoint. */
  advanceOf(codePoint: number): number | null;
}

// Same roots renderFfmpeg.ts's findAsset walks (GRIFON_ASSET_DIR → module-dir
// assets → repo-root api/_lib/assets), resolved per call rather than at load so
// a harness that sets GRIFON_ASSET_DIR after import still wins. Duplicated
// rather than imported because renderFfmpeg.ts imports drawPlan.ts, which
// imports this — pulling findAsset back across would close the cycle.
function assetRoots(): string[] {
  return [
    process.env.GRIFON_ASSET_DIR,
    join(dirname(fileURLToPath(import.meta.url)), 'assets'),
    join(process.cwd(), 'api', '_lib', 'assets'),
  ].filter((p): p is string => !!p);
}

/** Absolute path for a preset `fontFile` (e.g. 'fonts/Inter-Black.ttf'), or null. */
export function resolveFontFile(fontFile: string): string | null {
  if (!fontFile) return null;
  try {
    if (isAbsolute(fontFile)) return existsSync(fontFile) ? fontFile : null;
    for (const root of assetRoots()) {
      const p = join(root, fontFile);
      if (existsSync(p)) return p;
    }
  } catch {
    return null;
  }
  return null;
}

// Parsed fonts are cached per process, keyed by RESOLVED path: layout calls this
// for every word of every hook, and re-reading a 450 KB TTF each time is waste.
// A null (unparseable) result is cached too, so a bad font is read once.
const FONT_CACHE = new Map<string, ParsedFont | null>();

/** Parse the tables an advance lookup needs. Throws on anything malformed — every
 * caller wraps this, so a throw here surfaces as a null measurement. */
function parseFont(buf: Buffer): ParsedFont {
  const u16 = (o: number) => buf.readUInt16BE(o);
  const i16 = (o: number) => buf.readInt16BE(o);
  const u32 = (o: number) => buf.readUInt32BE(o);

  const numTables = u16(4);
  const tables: Record<string, { off: number; len: number }> = {};
  for (let i = 0; i < numTables; i++) {
    const o = 12 + i * 16;
    tables[buf.toString('ascii', o, o + 4)] = { off: u32(o + 8), len: u32(o + 12) };
  }
  if (!tables.head || !tables.hhea || !tables.hmtx || !tables.cmap) {
    throw new Error('missing a required table (head/hhea/hmtx/cmap)');
  }

  const unitsPerEm = u16(tables.head.off + 18);
  if (!unitsPerEm) throw new Error('unitsPerEm is 0');
  const numberOfHMetrics = u16(tables.hhea.off + 34);
  if (!numberOfHMetrics) throw new Error('numberOfHMetrics is 0');

  // hmtx: numberOfHMetrics x (advanceWidth u16, lsb i16), then lsb-only entries
  // that all share the LAST advance width (monospaced tail).
  const advanceForGid = (gid: number) =>
    u16(tables.hmtx.off + Math.min(gid, numberOfHMetrics - 1) * 4);

  // cmap: prefer a (3,1) Unicode BMP subtable, fall back to the first format-4 one.
  const cmapOff = tables.cmap.off;
  const nSub = u16(cmapOff + 2);
  let best: number | null = null;
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

  const gidOf = (cp: number): number => {
    for (let s = 0; s < segCount; s++) {
      if (u16(endO + s * 2) < cp) continue;
      const start = u16(startO + s * 2);
      if (cp < start) return 0;
      const delta = i16(deltaO + s * 2);
      const rangeOffset = u16(rangeO + s * 2);
      if (rangeOffset === 0) return (cp + delta) & 0xffff;
      const g = u16(rangeO + s * 2 + rangeOffset + (cp - start) * 2);
      return g === 0 ? 0 : (g + delta) & 0xffff;
    }
    return 0;
  };

  return {
    unitsPerEm,
    advanceOf: (cp: number) => {
      // gid 0 is .notdef — the font has no glyph for this codepoint, so its
      // advance would be a lie. Report "uncovered" and let the caller estimate.
      const gid = gidOf(cp);
      return gid === 0 ? null : advanceForGid(gid);
    },
  };
}

function loadFont(fontFile: string): ParsedFont | null {
  const path = resolveFontFile(fontFile);
  if (!path) return null;
  const hit = FONT_CACHE.get(path);
  if (hit !== undefined) return hit;
  let parsed: ParsedFont | null = null;
  try {
    parsed = parseFont(readFileSync(path));
  } catch {
    parsed = null;
  }
  FONT_CACHE.set(path, parsed);
  return parsed;
}

/**
 * Advance width of `text` in EM units (1.0 = one font size), or null when the
 * font can't be read/parsed or doesn't cover every codepoint. Never throws.
 */
export function measureTextEm(fontFile: string, text: string): number | null {
  try {
    const font = loadFont(fontFile);
    if (!font) return null;
    let units = 0;
    for (const ch of text) {
      const adv = font.advanceOf(ch.codePointAt(0) as number);
      if (adv === null) return null;
      units += adv;
    }
    return units / font.unitsPerEm;
  } catch {
    return null;
  }
}

/** measureTextEm scaled to a font size, in pixels. Null propagates. */
export function textWidthPx(fontFile: string, text: string, fontsize: number): number | null {
  const em = measureTextEm(fontFile, text);
  return em === null ? null : em * fontsize;
}
