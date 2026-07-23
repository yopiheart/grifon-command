// utils/imageChecks.ts — DETERMINISTIC, client-side, FREE scene-image checks (P4).
//
// The cheap, network-free first gate on a generated scene still: can we decode it,
// is its aspect ratio what we asked for, and is it big enough to seed a video
// render. Runs in the producer orchestrator's scene_images path (injected via
// producerDeps) and drives the ONLY automated reroll in this phase — the AI
// imageGate is flag-only. Must NEVER throw: any decode problem returns
// `decode_failed` so a broken byte-stream flags cleanly instead of crashing the pool.
//
// Dependency-free by design. Dimensions are read straight from the image file
// header (PNG / JPEG / GIF / WebP) rather than a browser Image/createImageBitmap
// decode, so the exact same code path runs in the browser AND in the node test
// runner — a browser-only decoder would leave aspect/min-res logic untestable
// (vitest runs `environment: 'node'`, no canvas). Header parsing still validates
// "is this a real, structurally-decodable image" which is the check's whole job.

export type ImageCheckReason = 'decode_failed' | 'aspect_mismatch' | 'too_small';

export interface ImageCheckResult {
  ok: boolean;
  reason?: ImageCheckReason;
  width: number;
  height: number;
}

export type ExpectedAspect = '9:16' | '16:9' | '1:1';

/** Target width/height ratio for each supported aspect. */
const ASPECT_RATIO: Record<ExpectedAspect, number> = {
  '9:16': 9 / 16,
  '16:9': 16 / 9,
  '1:1': 1,
};

/** Aspect tolerance (±2%) and the minimum short-side resolution a still must clear. */
const ASPECT_TOLERANCE = 0.02;
const MIN_SHORT_SIDE = 704;

const fail = (reason: ImageCheckReason): ImageCheckResult => ({ ok: false, reason, width: 0, height: 0 });

/** Decode a data URL / bare base64 string into raw bytes. Returns null on any failure. */
function toBytes(input: string): Uint8Array | null {
  try {
    const base64 = input.replace(/^data:[^;]+;base64,/, '');
    // atob in the browser; Buffer in node — both available in their respective runtimes.
    if (typeof atob === 'function') {
      const bin = atob(base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return bytes;
    }
    if (typeof Buffer !== 'undefined') {
      const buf = Buffer.from(base64, 'base64');
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    return null;
  } catch {
    return null;
  }
}

/** Read (width, height) from the image file header, or null if it isn't a format we parse. */
function readDimensions(b: Uint8Array): { width: number; height: number } | null {
  try {
    // PNG: 8-byte signature, then IHDR with width/height as big-endian u32 at 16/20.
    if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
      const width = (b[16] << 24) | (b[17] << 16) | (b[18] << 8) | b[19];
      const height = (b[20] << 24) | (b[21] << 16) | (b[22] << 8) | b[23];
      if (width > 0 && height > 0) return { width, height };
      return null;
    }
    // GIF: 'GIF8', width/height little-endian u16 at 6/8.
    if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) {
      const width = b[6] | (b[7] << 8);
      const height = b[8] | (b[9] << 8);
      if (width > 0 && height > 0) return { width, height };
      return null;
    }
    // WebP: 'RIFF'....'WEBP'. VP8 / VP8L / VP8X sub-chunk carries the dimensions.
    if (
      b.length >= 30 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
    ) {
      const fmt = String.fromCharCode(b[12], b[13], b[14], b[15]);
      if (fmt === 'VP8 ') {
        const width = (b[26] | (b[27] << 8)) & 0x3fff;
        const height = (b[28] | (b[29] << 8)) & 0x3fff;
        if (width > 0 && height > 0) return { width, height };
      } else if (fmt === 'VP8L') {
        const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
        const width = (bits & 0x3fff) + 1;
        const height = ((bits >> 14) & 0x3fff) + 1;
        if (width > 0 && height > 0) return { width, height };
      } else if (fmt === 'VP8X') {
        const width = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
        const height = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
        if (width > 0 && height > 0) return { width, height };
      }
      return null;
    }
    // JPEG: 0xFFD8, then scan SOF markers for the 16-bit height/width.
    if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
      let off = 2;
      while (off + 9 < b.length) {
        if (b[off] !== 0xff) {
          off++;
          continue;
        }
        const marker = b[off + 1];
        // SOF0..SOF15 (excluding DHT 0xC4, DAC 0xCC, RSTn) carry frame dimensions.
        if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
          const height = (b[off + 5] << 8) | b[off + 6];
          const width = (b[off + 7] << 8) | b[off + 8];
          if (width > 0 && height > 0) return { width, height };
          return null;
        }
        const segLen = (b[off + 2] << 8) | b[off + 3];
        if (segLen <= 0) return null;
        off += 2 + segLen;
      }
      return null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Deterministic decode + aspect + min-resolution check on a generated scene still.
 * NEVER throws. `expectedAspect` is the ratio the run asked the generator for.
 *   - decode_failed  : not a decodable image (garbage bytes / unknown format).
 *   - aspect_mismatch: measured w/h ratio outside ±2% of the expected aspect.
 *   - too_small      : short side under 704px (too low-res to seed a good render).
 */
export async function checkSceneImage(
  base64OrDataUrl: string,
  expectedAspect: ExpectedAspect
): Promise<ImageCheckResult> {
  const bytes = base64OrDataUrl ? toBytes(base64OrDataUrl) : null;
  if (!bytes || bytes.length === 0) return fail('decode_failed');
  const dims = readDimensions(bytes);
  if (!dims) return fail('decode_failed');
  const { width, height } = dims;

  const shortSide = Math.min(width, height);
  const ratio = width / height;
  const target = ASPECT_RATIO[expectedAspect];
  const withinAspect = Math.abs(ratio - target) <= target * ASPECT_TOLERANCE;

  if (!withinAspect) return { ok: false, reason: 'aspect_mismatch', width, height };
  if (shortSide < MIN_SHORT_SIDE) return { ok: false, reason: 'too_small', width, height };
  return { ok: true, width, height };
}
