import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRESETS, CLASSIC, ROTATION, fnv1a, rotationSeed, resolvePreset,
} from '../../api/_lib/renderPresets.js';
import type { PresetId } from '../../api/_lib/renderPresets.js';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'api', '_lib', 'assets');

describe('preset definitions', () => {
  it('every preset references a font file that is actually bundled', () => {
    for (const p of Object.values(PRESETS)) {
      expect(existsSync(join(ASSETS, p.caption.fontFile)), `${p.id}: ${p.caption.fontFile}`).toBe(true);
    }
  });

  it('CLASSIC is exactly today\'s shipped look (regression lock)', () => {
    expect(CLASSIC.caption.fontFile).toBe('fonts/Inter-Black.ttf');
    expect(CLASSIC.caption.advRatio).toBe(0.62);
    expect(CLASSIC.caption.boxAlpha).toBe(0.85);
    expect(CLASSIC.caption.borderWFrac).toBe(0);
    expect(CLASSIC.caption.shadow).toEqual({ dx: 6, dy: 6, color: 'black@0.73' });
    expect(CLASSIC.caption.chunkAnim).toBe('none');
    expect(CLASSIC.caption.baseSizeFrac).toBe(0.04);
    expect(CLASSIC.caption.overlaySizeFrac).toBe(0.044);
    expect(CLASSIC.caption.yFracTalking).toBe(0.67);
    expect(CLASSIC.caption.yFracBroll).toBe(0.72);
    expect(CLASSIC.hook).toEqual({
      layout: 'wipe', reveal: 'flip', fontFile: 'fonts/Inter-Black.ttf', advRatio: 0.62,
      textColor: 'white', wipeBox: true, wipeColor: '0xD90429', sizeFrac: 0.06,
      wordCadenceSec: 0, burnTransition: false,
    });
    expect(CLASSIC.transition.kind).toBe('none');
    expect(CLASSIC.camera.intensity).toBe(0);
    expect(CLASSIC.sfx.overlayMap).toEqual({ hook: 'boom', callout: 'pop', punchline: 'ding', subtitle: null });
    expect(CLASSIC.sfx.maxWhoosh).toBe(3);
    expect(CLASSIC.sfx.volume).toBe(0.6);
  });

  it('every preset uses either a box or an outline, never both', () => {
    for (const p of Object.values(PRESETS)) {
      expect(p.caption.boxAlpha > 0 && p.caption.borderWFrac > 0, p.id).toBe(false);
    }
  });

  it('every preset ships with renderer camera motion OFF (pulse guard — camera lives in generation)', () => {
    for (const p of Object.values(PRESETS)) {
      expect(p.camera.intensity, p.id).toBe(0);
      expect(p.camera.chunkPunch, p.id).toBe(false);
    }
  });

  it('every hook font file is bundled', () => {
    for (const p of Object.values(PRESETS)) {
      expect(existsSync(join(ASSETS, p.hook.fontFile)), `${p.id}: ${p.hook.fontFile}`).toBe(true);
    }
  });
});

describe('rotation pools', () => {
  it('testimonial pool never contains a high-energy preset (sincerity guard)', () => {
    for (const id of ROTATION.testimonial) {
      expect(['clean', 'classic']).toContain(id);
    }
  });

  it('every pool id resolves to a defined preset', () => {
    for (const pool of Object.values(ROTATION)) {
      for (const id of pool) expect(PRESETS[id]).toBeDefined();
    }
  });
});

describe('fnv1a / rotationSeed', () => {
  it('is stable across calls and inputs are order-independent via rotationSeed', () => {
    expect(fnv1a('grifon')).toBe(fnv1a('grifon'));
    expect(fnv1a('a')).not.toBe(fnv1a('b'));
    expect(rotationSeed(['u2', 'u1'])).toBe(rotationSeed(['u1', 'u2']));
  });
});

describe('resolvePreset', () => {
  it('is deterministic: same style + seed always yields the same preset', () => {
    const a = resolvePreset('mrbeast', undefined, 'seed-123');
    const b = resolvePreset('mrbeast', undefined, 'seed-123');
    expect(a.id).toBe(b.id);
  });

  it('explicit id wins over rotation (the kill switch)', () => {
    expect(resolvePreset('mrbeast', 'classic', 'whatever').id).toBe('classic');
    expect(resolvePreset('temu', 'clean', 'whatever').id).toBe('clean');
  });

  it('unknown style or explicit id degrades to classic / rotation, never throws', () => {
    expect(resolvePreset('cinematic-nonsense', undefined, 's').id).toBe('classic');
    expect(resolvePreset(undefined, undefined, 's').id).toBe('classic');
    expect(resolvePreset('mrbeast', 'bogus' as PresetId, 'seed-123').id)
      .toBe(resolvePreset('mrbeast', undefined, 'seed-123').id);
  });

  it('rotation only ever picks from the style\'s own pool', () => {
    for (let i = 0; i < 50; i++) {
      expect(ROTATION.testimonial).toContain(resolvePreset('testimonial', undefined, `seed-${i}`).id);
      expect(ROTATION.mrbeast).toContain(resolvePreset('mrbeast', undefined, `seed-${i}`).id);
    }
  });

  it('different seeds actually rotate (more than one preset appears over 50 seeds)', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 50; i++) seen.add(resolvePreset('mrbeast', undefined, `seed-${i}`).id);
    expect(seen.size).toBeGreaterThan(1);
  });
});
