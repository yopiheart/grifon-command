import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname, basename, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  SFX_VARIANT_POOLS, pickSfxVariant, sfxVariantsEnabled, fnv1a, rotationSeed,
} from '../../api/_lib/renderPresets.js';
import type { PresetId } from '../../api/_lib/renderPresets.js';
import { resolveSfxFile } from '../../api/_lib/renderFfmpeg.js';
import type { SfxBankId } from '../../types.js';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'api', '_lib', 'assets');
const SFX_DIR = join(ASSETS, 'sfx');

// The legacy SfxBankId classes (pre-Slice-2 classes that ship WITH a static
// <class>.mp3), hardcoded as an independent source of truth (not derived from the
// pools) so the legacy-static lock catches a deleted <class>.mp3. The Slice 2
// diegetic classes are deliberately absent here — they ship variant-only.
const ALL_SFX_IDS: SfxBankId[] = [
  'whoosh', 'glitch', 'pop', 'ding', 'riser', 'drop', 'snap', 'swish', 'boom', 'sparkle',
];
const PRESET_IDS: PresetId[] = ['classic', 'impact', 'hype', 'clean'];
const POOLED_IDS = Object.keys(SFX_VARIANT_POOLS) as SfxBankId[];

/** Variant seed a real ad would produce for a synthetic single-clip URL. */
function seedFor(urls: string[]): number {
  return fnv1a(rotationSeed(urls));
}

describe('SFX_VARIANT_POOLS — pool integrity', () => {
  it('every declared variant mp3 exists on disk and every pool has >= 4 variants', () => {
    for (const [classId, pool] of Object.entries(SFX_VARIANT_POOLS)) {
      expect(pool!.length, `${classId} pool length`).toBeGreaterThanOrEqual(4);
      for (const n of pool!) {
        const f = join(SFX_DIR, `${classId}-v${n}.mp3`);
        expect(existsSync(f), `missing variant ${classId}-v${n}.mp3`).toBe(true);
      }
    }
  });

  it('every legacy static <class>.mp3 still exists (CLASSIC / flag-off lock)', () => {
    for (const id of ALL_SFX_IDS) {
      expect(existsSync(join(SFX_DIR, `${id}.mp3`)), `missing legacy ${id}.mp3`).toBe(true);
    }
  });
});

describe('pickSfxVariant — determinism & shape', () => {
  it('is deterministic: same inputs yield the same pick', () => {
    expect(pickSfxVariant('pop', 123456)).toBe(pickSfxVariant('pop', 123456));
  });

  it('returns a bare basename matching /^pop-v\\d+$/', () => {
    expect(pickSfxVariant('pop', 123456)).toMatch(/^pop-v\d+$/);
  });

  it('snap has no pool and resolves to null (legacy static)', () => {
    expect(pickSfxVariant('snap', 42)).toBeNull();
  });
});

describe('pickSfxVariant — rotation across ads', () => {
  it('each pooled class shows more than one variant over 50 synthetic ad seeds', () => {
    for (const classId of POOLED_IDS) {
      const seen = new Set<string>();
      for (let i = 0; i < 50; i++) {
        seen.add(pickSfxVariant(classId, seedFor([`https://x/${i}.mp4`]))!);
      }
      expect(seen.size, `${classId} rotated only ${seen.size} variant(s)`).toBeGreaterThan(1);
    }
  });

  it('two different ads differ in at least one class pick', () => {
    const seedA = seedFor(['https://x/ad-alpha-1.mp4', 'https://x/ad-alpha-2.mp4']);
    const seedB = seedFor(['https://x/ad-bravo-1.mp4', 'https://x/ad-bravo-2.mp4']);
    const picksA = POOLED_IDS.map((c) => pickSfxVariant(c, seedA));
    const picksB = POOLED_IDS.map((c) => pickSfxVariant(c, seedB));
    expect(picksA).not.toEqual(picksB);
  });
});

describe('pickSfxVariant — class independence', () => {
  it('one seed lands on >= 2 distinct pool indices across the pooled classes', () => {
    const seed = seedFor(['https://x/single-ad.mp4']);
    const indices = new Set<number>();
    for (const classId of POOLED_IDS) {
      const variant = pickSfxVariant(classId, seed)!;
      const n = Number(variant.split('-v')[1]);
      const idx = SFX_VARIANT_POOLS[classId]!.indexOf(n);
      expect(idx, `${classId} picked ${variant} not in its pool`).toBeGreaterThanOrEqual(0);
      indices.add(idx);
    }
    expect(indices.size, 'all classes picked the same pool index (classId not in hash)').toBeGreaterThanOrEqual(2);
  });
});

describe('sfxVariantsEnabled — kill switch', () => {
  const prev = process.env.SFX_V2_ENABLED;
  const restore = () => {
    if (prev === undefined) delete process.env.SFX_V2_ENABLED;
    else process.env.SFX_V2_ENABLED = prev;
  };

  it('is off for every preset when the flag is unset or non-"true"', () => {
    try {
      for (const val of [undefined, 'false', 'TRUE', '1']) {
        if (val === undefined) delete process.env.SFX_V2_ENABLED;
        else process.env.SFX_V2_ENABLED = val;
        for (const p of PRESET_IDS) {
          expect(sfxVariantsEnabled(p), `flag=${val} preset=${p}`).toBe(false);
        }
      }
    } finally {
      restore();
    }
  });

  it('flag "true" enables impact/hype/clean but never classic', () => {
    try {
      process.env.SFX_V2_ENABLED = 'true';
      expect(sfxVariantsEnabled('impact')).toBe(true);
      expect(sfxVariantsEnabled('hype')).toBe(true);
      expect(sfxVariantsEnabled('clean')).toBe(true);
      expect(sfxVariantsEnabled('classic')).toBe(false);
    } finally {
      restore();
    }
  });
});

describe('resolveSfxFile — seam / CLASSIC byte-identity', () => {
  const prev = process.env.SFX_V2_ENABLED;
  const restore = () => {
    if (prev === undefined) delete process.env.SFX_V2_ENABLED;
    else process.env.SFX_V2_ENABLED = prev;
  };
  // basename equality — 'boom.mp3' endsWith must NOT be satisfied by 'boom-v1.mp3'.
  const base = (p: string | null) => (p ? basename(p.split(/[\\/]/).join(sep)) : null);

  it('flag unset → static boom.mp3 for every preset (flag-off lock)', () => {
    try {
      delete process.env.SFX_V2_ENABLED;
      const seed = seedFor(['https://x/seam.mp4']);
      for (const p of PRESET_IDS) {
        expect(base(resolveSfxFile('boom', p, seed)), `preset=${p}`).toBe('boom.mp3');
      }
    } finally {
      restore();
    }
  });

  it('flag "true" + classic → still static boom.mp3 (CLASSIC freeze)', () => {
    try {
      process.env.SFX_V2_ENABLED = 'true';
      const seed = seedFor(['https://x/seam.mp4']);
      expect(base(resolveSfxFile('boom', 'classic', seed))).toBe('boom.mp3');
    } finally {
      restore();
    }
  });

  it('flag "true" + impact → a boom variant file', () => {
    try {
      process.env.SFX_V2_ENABLED = 'true';
      const seed = seedFor(['https://x/seam.mp4']);
      const p = resolveSfxFile('boom', 'impact', seed);
      expect(base(p)).toMatch(/^boom-v[1-6]\.mp3$/);
    } finally {
      restore();
    }
  });

  it('flag "true" + impact + snap → static snap.mp3 (no pool)', () => {
    try {
      process.env.SFX_V2_ENABLED = 'true';
      const seed = seedFor(['https://x/seam.mp4']);
      expect(base(resolveSfxFile('snap', 'impact', seed))).toBe('snap.mp3');
    } finally {
      restore();
    }
  });
});

describe('diegetic classes (Slice 2) — variant-only, no legacy static', () => {
  const prev = process.env.SFX_V2_ENABLED;
  const restore = () => {
    if (prev === undefined) delete process.env.SFX_V2_ENABLED;
    else process.env.SFX_V2_ENABLED = prev;
  };
  const base = (p: string | null) => (p ? basename(p.split(/[\\/]/).join(sep)) : null);
  // Independent literal — the 5 diegetic classes, not derived from the pools.
  const DIEGETIC_IDS: SfxBankId[] = ['chaching', 'notification', 'paper', 'shutter', 'typing'];

  it('flag "true" + impact → a <class>-vN.mp3 variant for every diegetic class', () => {
    try {
      process.env.SFX_V2_ENABLED = 'true';
      const seed = seedFor(['https://x/diegetic.mp4']);
      for (const id of DIEGETIC_IDS) {
        expect(base(resolveSfxFile(id, 'impact', seed)), `class=${id}`)
          .toMatch(new RegExp(`^${id}-v\\d+\\.mp3$`));
      }
    } finally {
      restore();
    }
  });

  it('flag unset → null for every diegetic class (no legacy static fallback)', () => {
    try {
      delete process.env.SFX_V2_ENABLED;
      const seed = seedFor(['https://x/diegetic.mp4']);
      for (const id of DIEGETIC_IDS) {
        expect(resolveSfxFile(id, 'impact', seed), `class=${id}`).toBeNull();
      }
    } finally {
      restore();
    }
  });
});
