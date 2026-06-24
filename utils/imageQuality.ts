// Upload-quality gate (Director's Cut A4) — a soft, client-side check that nudges the user away from
// dark / blurry / low-resolution source photos BEFORE they reach the render engine. The engine
// recreates and unifies an upload (PLACE_IDENTITY_LOCK + CINEMATIC_GRADE), but a genuinely bad
// source (underexposed, soft-focus, tiny) still degrades the whole ad. Gate the input at intake.
//
// Advisory only — NEVER blocks an upload. The scoring helpers are pure (no DOM) so they unit-test
// without a canvas; analyzeImageQuality() is the thin browser wrapper that rasterizes + measures.

export interface ImageQuality {
  /** Natural source pixels (pre-downscale). */
  width: number;
  height: number;
  /** Mean perceived brightness, 0 (black) – 255 (white). */
  avgLuminance: number;
  /** Focus proxy — variance of the Laplacian over a fixed-width grayscale. Higher = sharper. */
  sharpness: number;
  dark: boolean;
  blurry: boolean;
  lowRes: boolean;
  /** Human-readable nudges (empty when the photo looks fine). */
  warnings: string[];
}

// ── Thresholds (tunable) ────────────────────────────────────────────────────────────────────────
/** Below this mean luminance the photo reads as underexposed. */
export const DARK_LUMA = 50;
/** Below this Laplacian variance (on the ANALYSIS_WIDTH grayscale) the photo reads as soft/blurry. */
export const BLUR_VARIANCE = 60;
/** Shorter source edge below this is risky — scene renders are ≥768px on the short edge. */
export const LOW_RES_MIN = 640;
/** Fixed analysis raster width so the sharpness threshold is stable across source sizes. */
export const ANALYSIS_WIDTH = 256;

/** Mean perceived luminance (Rec. 601) over an RGBA buffer, 0–255. */
export function avgLuminance(rgba: Uint8ClampedArray): number {
  if (rgba.length < 4) return 0;
  let sum = 0;
  let n = 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    sum += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
    n += 1;
  }
  return n ? sum / n : 0;
}

/** Convert an RGBA buffer to a flat grayscale array (Rec. 601), one value per pixel. */
export function toGrayscale(rgba: Uint8ClampedArray): number[] {
  const gray: number[] = [];
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    gray.push(0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]);
  }
  return gray;
}

/**
 * Variance of the discrete Laplacian (4-neighbour) over a grayscale image — the classic focus
 * measure. A crisp photo has strong edges (high variance); a blurry one is flat (low variance).
 */
export function laplacianVariance(gray: number[], w: number, h: number): number {
  if (w < 3 || h < 3) return Infinity; // too small to judge — don't flag
  const lap: number[] = [];
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const c = gray[y * w + x];
      const value =
        4 * c - gray[y * w + (x - 1)] - gray[y * w + (x + 1)] - gray[(y - 1) * w + x] - gray[(y + 1) * w + x];
      lap.push(value);
    }
  }
  if (!lap.length) return Infinity;
  const mean = lap.reduce((s, v) => s + v, 0) / lap.length;
  const variance = lap.reduce((s, v) => s + (v - mean) * (v - mean), 0) / lap.length;
  return variance;
}

/** Grade raw measurements into flags + human-readable warnings. Pure — the unit-test entry point. */
export function gradeQuality(input: {
  width: number;
  height: number;
  avgLuminance: number;
  sharpness: number;
}): Pick<ImageQuality, 'dark' | 'blurry' | 'lowRes' | 'warnings'> {
  const dark = input.avgLuminance < DARK_LUMA;
  const blurry = input.sharpness < BLUR_VARIANCE;
  const lowRes = Math.min(input.width, input.height) < LOW_RES_MIN;
  const warnings: string[] = [];
  if (dark) warnings.push('Looks dark — a brighter photo renders far better.');
  if (blurry) warnings.push('Looks soft/blurry — a crisper photo locks more detail.');
  if (lowRes) warnings.push('Low resolution — upload a larger, sharper photo if you can.');
  return { dark, blurry, lowRes, warnings };
}

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to decode image.'));
    img.src = src;
  });

/**
 * Rasterize a data-URL / object-URL to a fixed-width canvas and measure brightness, focus, and
 * resolution. Returns an all-clear result (no warnings) if the canvas is unavailable so the gate
 * can never block an upload on a measurement failure.
 */
export async function analyzeImageQuality(src: string): Promise<ImageQuality> {
  const img = await loadImage(src);
  const width = img.naturalWidth;
  const height = img.naturalHeight;
  const clear: ImageQuality = {
    width, height, avgLuminance: 255, sharpness: Infinity,
    dark: false, blurry: false, lowRes: false, warnings: [],
  };

  const scale = width > ANALYSIS_WIDTH ? ANALYSIS_WIDTH / width : 1;
  const w = Math.max(3, Math.round(width * scale));
  const h = Math.max(3, Math.round(height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { ...clear, lowRes: Math.min(width, height) < LOW_RES_MIN };
  ctx.drawImage(img, 0, 0, w, h);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, w, h).data;
  } catch {
    return { ...clear, lowRes: Math.min(width, height) < LOW_RES_MIN };
  }

  const lum = avgLuminance(data);
  const sharp = laplacianVariance(toGrayscale(data), w, h);
  const graded = gradeQuality({ width, height, avgLuminance: lum, sharpness: sharp });
  return { width, height, avgLuminance: lum, sharpness: sharp, ...graded };
}
