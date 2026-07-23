import { describe, it, expect } from 'vitest';
import { checkSceneImage } from '../../utils/imageChecks.js';

// utils/imageChecks.ts — deterministic, network-free scene-image checks (P4). Dimensions
// are read from the PNG header, so these run identically in the node test runner and the
// browser. Expectations are independent literals (known image geometry), never derived from
// the implementation.

/** Build a minimal valid PNG data URL carrying just the signature + IHDR width/height. */
function pngDataUrl(width: number, height: number): string {
  const b = new Uint8Array(24);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0); // PNG signature
  b.set([0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52], 8); // IHDR length + "IHDR"
  b[16] = (width >>> 24) & 0xff;
  b[17] = (width >>> 16) & 0xff;
  b[18] = (width >>> 8) & 0xff;
  b[19] = width & 0xff;
  b[20] = (height >>> 24) & 0xff;
  b[21] = (height >>> 16) & 0xff;
  b[22] = (height >>> 8) & 0xff;
  b[23] = height & 0xff;
  return 'data:image/png;base64,' + Buffer.from(b).toString('base64');
}

describe('checkSceneImage — happy path', () => {
  it('passes a correctly-sized 9:16 still', async () => {
    const r = await checkSceneImage(pngDataUrl(720, 1280), '9:16');
    expect(r).toEqual({ ok: true, width: 720, height: 1280 });
  });

  it('passes a 16:9 and a 1:1 still at/above min resolution', async () => {
    expect((await checkSceneImage(pngDataUrl(1280, 720), '16:9')).ok).toBe(true);
    expect((await checkSceneImage(pngDataUrl(800, 800), '1:1')).ok).toBe(true);
  });
});

describe('checkSceneImage — aspect tolerance (±2%)', () => {
  it('accepts a ratio exactly on the ±2% boundary (inclusive)', async () => {
    // 1:1 target = 1.0, tolerance ±0.02. 800/816 = 0.9804 → |Δ| = 0.0196 ≤ 0.02 → ok.
    const r = await checkSceneImage(pngDataUrl(800, 816), '1:1');
    expect(r.ok).toBe(true);
  });

  it('rejects a ratio just outside the ±2% band', async () => {
    // 800/840 = 0.952 → |Δ| = 0.048 > 0.02 → aspect_mismatch.
    const r = await checkSceneImage(pngDataUrl(800, 840), '1:1');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('aspect_mismatch');
    expect(r.width).toBe(800);
    expect(r.height).toBe(840);
  });

  it('rejects an outright wrong aspect (square asked for 9:16)', async () => {
    const r = await checkSceneImage(pngDataUrl(1000, 1000), '9:16');
    expect(r.reason).toBe('aspect_mismatch');
  });
});

describe('checkSceneImage — minimum resolution (short side ≥ 704px)', () => {
  it('flags too_small when the short side is under 704 (aspect still correct)', async () => {
    // 360x640 is exact 9:16 but the short side (360) is < 704.
    const r = await checkSceneImage(pngDataUrl(360, 640), '9:16');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('too_small');
  });

  it('passes exactly at the 704 short-side floor', async () => {
    // 704x1252 ≈ 9:16 (0.5623, within ±2%), short side exactly 704.
    const r = await checkSceneImage(pngDataUrl(704, 1252), '9:16');
    expect(r.ok).toBe(true);
  });
});

describe('checkSceneImage — decode failures never throw', () => {
  it('returns decode_failed on garbage bytes', async () => {
    const r = await checkSceneImage('data:image/png;base64,bm90LWFuLWltYWdl', '9:16');
    expect(r).toEqual({ ok: false, reason: 'decode_failed', width: 0, height: 0 });
  });

  it('returns decode_failed on an empty string', async () => {
    const r = await checkSceneImage('', '1:1');
    expect(r.reason).toBe('decode_failed');
  });

  it('returns decode_failed on a non-image string, never throwing', async () => {
    await expect(checkSceneImage('img://IMG0', '9:16')).resolves.toMatchObject({ ok: false, reason: 'decode_failed' });
    await expect(checkSceneImage('hello world', '16:9')).resolves.toMatchObject({ ok: false });
  });

  it('returns decode_failed on a truncated PNG header (below IHDR)', async () => {
    const short = 'data:image/png;base64,' + Buffer.from(new Uint8Array([0x89, 0x50, 0x4e, 0x47])).toString('base64');
    const r = await checkSceneImage(short, '9:16');
    expect(r.reason).toBe('decode_failed');
  });
});
