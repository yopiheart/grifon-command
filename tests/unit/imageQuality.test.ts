import { describe, it, expect } from 'vitest';
import {
  avgLuminance, toGrayscale, laplacianVariance, gradeQuality,
  DARK_LUMA, BLUR_VARIANCE, LOW_RES_MIN,
} from '../../utils/imageQuality.js';

// The upload-quality gate (A4) must be a SOFT nudge: it flags genuinely bad source photos
// (dark / blurry / tiny) but never fires on a normal phone shot. These tests pin the scoring
// helpers so the thresholds can't silently drift into false positives.

/** Build an RGBA buffer from a flat grayscale array (R=G=B=v, A=255). */
const rgbaFromGray = (gray: number[]): Uint8ClampedArray => {
  const out = new Uint8ClampedArray(gray.length * 4);
  gray.forEach((v, i) => {
    out[i * 4] = v; out[i * 4 + 1] = v; out[i * 4 + 2] = v; out[i * 4 + 3] = 255;
  });
  return out;
};

describe('avgLuminance', () => {
  it('returns the mid grey value for a flat mid-grey buffer', () => {
    expect(avgLuminance(rgbaFromGray([128, 128, 128, 128]))).toBeCloseTo(128, 0);
  });

  it('weights channels by Rec. 601 (green dominates)', () => {
    // pure green pixel → 0.587 * 255 ≈ 149.7
    const greenPixel = new Uint8ClampedArray([0, 255, 0, 255]);
    expect(avgLuminance(greenPixel)).toBeCloseTo(149.685, 1);
  });

  it('returns 0 for an empty buffer (never throws)', () => {
    expect(avgLuminance(new Uint8ClampedArray([]))).toBe(0);
  });
});

describe('laplacianVariance', () => {
  it('is ~0 for a perfectly flat (blurry) image', () => {
    const w = 8, h = 8;
    const gray = new Array(w * h).fill(120);
    expect(laplacianVariance(gray, w, h)).toBeCloseTo(0, 5);
  });

  it('is large for a high-contrast checkerboard (sharp edges)', () => {
    const w = 8, h = 8;
    const gray = Array.from({ length: w * h }, (_, i) => {
      const x = i % w, y = Math.floor(i / w);
      return (x + y) % 2 === 0 ? 0 : 255;
    });
    expect(laplacianVariance(gray, w, h)).toBeGreaterThan(BLUR_VARIANCE);
  });

  it('does not flag an image too small to judge', () => {
    expect(laplacianVariance([1, 2, 3, 4], 2, 2)).toBe(Infinity);
  });
});

describe('toGrayscale', () => {
  it('produces one value per pixel', () => {
    const rgba = new Uint8ClampedArray([10, 10, 10, 255, 20, 20, 20, 255]);
    expect(toGrayscale(rgba)).toHaveLength(2);
  });
});

describe('gradeQuality', () => {
  it('passes a bright, sharp, full-res photo with no warnings', () => {
    const g = gradeQuality({ width: 1280, height: 1920, avgLuminance: 140, sharpness: 400 });
    expect(g.dark).toBe(false);
    expect(g.blurry).toBe(false);
    expect(g.lowRes).toBe(false);
    expect(g.warnings).toHaveLength(0);
  });

  it('flags a dark photo', () => {
    const g = gradeQuality({ width: 1280, height: 1920, avgLuminance: DARK_LUMA - 10, sharpness: 400 });
    expect(g.dark).toBe(true);
    expect(g.warnings.some((w) => /dark/i.test(w))).toBe(true);
  });

  it('flags a blurry photo', () => {
    const g = gradeQuality({ width: 1280, height: 1920, avgLuminance: 140, sharpness: BLUR_VARIANCE - 10 });
    expect(g.blurry).toBe(true);
    expect(g.warnings.some((w) => /blur/i.test(w))).toBe(true);
  });

  it('flags a low-resolution photo by its shorter edge', () => {
    const g = gradeQuality({ width: LOW_RES_MIN - 100, height: 1920, avgLuminance: 140, sharpness: 400 });
    expect(g.lowRes).toBe(true);
    expect(g.warnings.some((w) => /resolution/i.test(w))).toBe(true);
  });

  it('stacks multiple warnings when a photo is dark AND blurry AND tiny', () => {
    const g = gradeQuality({ width: 320, height: 240, avgLuminance: 20, sharpness: 5 });
    expect(g.warnings).toHaveLength(3);
  });
});
