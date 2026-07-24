import { describe, it, expect } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { measureTextEm, resolveFontFile, textWidthPx } from '../../api/_lib/fontMetrics.js';

// fontMetrics reads a bundled TTF's own hmtx/cmap tables so hook layout can place
// words at REAL glyph widths instead of estWidth's flat per-character average (F7:
// "HUWAG NANG" rendering fused as "HUWACNANG").
//
// Independent source of truth for the expected numbers below: tools/measure_font_advance.mjs,
// a SEPARATE parser written against the OpenType spec during the F7 root-cause pass —
// `node tools/measure_font_advance.mjs` reproduces every em value pinned here. They are
// literals on purpose: nothing in this file recomputes them with the code under test.
const KNOWN_EM: Array<[string, string, number]> = [
  ['fonts/Montserrat-ExtraBold.ttf', 'HUWAG', 4.332],
  ['fonts/Montserrat-ExtraBold.ttf', 'NANG', 3.168],
  ['fonts/Montserrat-ExtraBold.ttf', 'SULIT', 3.017],
  ['fonts/Inter-Black.ttf', 'HUWAG', 4.103],
  ['fonts/Inter-Black.ttf', 'SULIT', 2.931],
  ['fonts/ArchivoBlack-Regular.ttf', 'HUWAG', 4.277],
  ['fonts/Anton-Regular.ttf', 'HUWAG', 2.655],
  ['fonts/Bangers-Regular.ttf', 'HUWAG', 2.394],
];

const MONTSERRAT = 'fonts/Montserrat-ExtraBold.ttf';

describe('fontMetrics — real glyph advances from the bundled TTFs', () => {
  it('resolves a preset fontFile to the bundled asset on disk', () => {
    const p = resolveFontFile(MONTSERRAT);
    expect(p, 'preset fontFile must resolve — a null here silently reverts layout to the estimate').not.toBeNull();
    expect(p!.replace(/\\/g, '/')).toContain('api/_lib/assets/fonts/Montserrat-ExtraBold.ttf');
  });

  it('measures known words to the advances the reference parser reports', () => {
    for (const [font, word, em] of KNOWN_EM) {
      expect(measureTextEm(font, word), `${font} "${word}"`).toBeCloseTo(em, 3);
    }
  });

  it('per-glyph, not per-character: same length, different widths', () => {
    // 5 uppercase letters each. A flat length x ratio model calls these identical;
    // the font does not (this gap IS F7).
    const wide = measureTextEm(MONTSERRAT, 'HUWAG')!;
    const narrow = measureTextEm(MONTSERRAT, 'SULIT')!;
    expect(wide).toBeGreaterThan(narrow * 1.3);
  });

  it('is additive across glyphs and linear in font size', () => {
    const hu = measureTextEm(MONTSERRAT, 'HU')!;
    const wag = measureTextEm(MONTSERRAT, 'WAG')!;
    expect(measureTextEm(MONTSERRAT, 'HUWAG')).toBeCloseTo(hu + wag, 6);
    expect(textWidthPx(MONTSERRAT, 'HUWAG', 110)).toBeCloseTo(4.332 * 110, 2);
    expect(textWidthPx(MONTSERRAT, 'HUWAG', 110)).toBeCloseTo(2 * textWidthPx(MONTSERRAT, 'HUWAG', 55)!, 6);
  });

  it('caches per process: repeated calls return the identical value', () => {
    const first = measureTextEm(MONTSERRAT, 'STOP SCROLLING');
    for (let i = 0; i < 50; i++) {
      expect(measureTextEm(MONTSERRAT, 'STOP SCROLLING')).toBe(first);
    }
    // A second font in the cache must not disturb the first.
    expect(measureTextEm('fonts/Anton-Regular.ttf', 'STOP SCROLLING')).not.toBe(first);
    expect(measureTextEm(MONTSERRAT, 'STOP SCROLLING')).toBe(first);
  });

  it('never throws — every bad input degrades to null', () => {
    const garbage = mkdtempSync(join(tmpdir(), 'grifon-fontmetrics-'));
    const notAFont = join(garbage, 'not-a-font.ttf');
    writeFileSync(notAFont, 'this is definitely not a truetype file');
    const truncated = join(garbage, 'truncated.ttf');
    writeFileSync(truncated, Buffer.from([0x00, 0x01, 0x00, 0x00, 0x00, 0x09]));

    const bad: Array<[string, string]> = [
      ['fonts/DoesNotExist.ttf', 'missing file'],
      ['', 'empty fontFile'],
      ['../../../etc/passwd', 'traversal miss'],
      ['fonts/Montserrat-OFL.txt', 'a real file that is not a font'],
      [notAFont, 'garbage bytes'],
      [truncated, 'truncated header'],
    ];
    for (const [file, why] of bad) {
      expect(() => measureTextEm(file, 'HUWAG'), why).not.toThrow();
      expect(measureTextEm(file, 'HUWAG'), why).toBeNull();
      expect(textWidthPx(file, 'HUWAG', 110), why).toBeNull();
      expect(() => resolveFontFile(file), why).not.toThrow();
    }
  });

  it('returns null for a codepoint the font has no glyph for', () => {
    // Emoji / CJK are outside these Latin fonts' cmaps — the caller must estimate
    // rather than silently take .notdef's advance.
    expect(measureTextEm(MONTSERRAT, '\u{1F525}')).toBeNull();
    expect(measureTextEm(MONTSERRAT, '漢字')).toBeNull();
    expect(measureTextEm(MONTSERRAT, 'GRABE\u{1F525}')).toBeNull();
    // ...but the Latin-1 accents Filipino copy actually uses DO measure.
    expect(measureTextEm(MONTSERRAT, 'PIÑA')).toBeGreaterThan(0);
  });
});
