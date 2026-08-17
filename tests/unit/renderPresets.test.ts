import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  PRESETS, CLASSIC, NONE, ROTATION, fnv1a, rotationSeed, resolvePreset,
} from '../../api/_lib/renderPresets.js';
import type { PresetId } from '../../api/_lib/renderPresets.js';

const ASSETS = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'api', '_lib', 'assets');

describe('preset definitions', () => {
  it('Raw resolves to the stitched-only pipeline', () => {
    expect(resolvePreset('mrbeast', 'none', 'seed')).toBe(NONE);
    expect(NONE.stitchedOnly).toBe(true);
  });
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
      textColor: 'white', highlightColor: '0xFFCC00', wipeBox: true, wipeColor: '0xD90429',
      sizeFrac: 0.06, wordCadenceSec: 0, burnTransition: false,
      // Moved here from a renderFfmpeg module constant on 2026-08-10. The VALUE is
      // the one that has always shipped, so CLASSIC's look is still locked; what
      // changed is that each preset can now set its own beat.
      revealHoldSec: 0.5,
      // Added 2026-08-17 when the hook palette moved off the render seed onto the
      // preset. CLASSIC renders the `wipe` layout, which has no gradient path at
      // all, so `null` is what it has ALWAYS drawn — new field, unchanged look.
      // The drawPlan golden snapshot for CLASSIC is the independent proof.
      gradient: null,
    });
    expect(CLASSIC.transition.kind).toBe('none');
    expect(CLASSIC.camera.intensity).toBe(0);
    expect(CLASSIC.sfx.overlayMap).toEqual({ hook: 'boom', callout: 'pop', punchline: 'ding', subtitle: null });
    expect(CLASSIC.sfx.maxWhoosh).toBe(3);
    // 0.6 → 0.63 on 2026-08-17: Neil asked for +5% across every preset's SFX so
    // the cues sit slightly above the VO floor. This is a DELIBERATE break of the
    // regression lock, not drift — the lock covers CLASSIC's LOOK (font, colors,
    // layout, transition, camera), and a mix level is not part of that look.
    expect(CLASSIC.sfx.volume).toBe(0.63);
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

  // THE REGRESSION THIS FILE EXISTS TO CATCH (Neil, 2026-08-17): "lahat ng preset
  // overlay text design/font/animation ay pare-parehas". punch/bars/spotlight were
  // declared as `{ ...IMPACT, caption: {...} }`, overriding ONLY the captions, so
  // all four drew a byte-identical hook title. Nothing failed — there was no test
  // asserting the looks were different, only that each was internally valid.
  // A preset is an "editor personality"; two personalities that render the same
  // hook are one personality with two names.
  it('every burn-in preset has a hook look that is unique among presets', () => {
    const burned = Object.values(PRESETS).filter((p) => !p.stitchedOnly);
    const seen = new Map<string, string>();
    for (const p of burned) {
      const signature = JSON.stringify([
        p.hook.layout, p.hook.reveal, p.hook.fontFile, p.hook.textColor,
        p.hook.highlightColor, p.hook.sizeFrac, p.hook.gradient,
      ]);
      const clash = seen.get(signature);
      expect(clash, `${p.id} draws an identical hook to ${clash}`).toBeUndefined();
      seen.set(signature, p.id);
    }
    expect(seen.size).toBe(burned.length);
  });

  // Same defect class, sound instead of typography: the three IMPACT-derived
  // presets inherited its SFX palette verbatim, so the same cue classes fired in
  // all four no matter which preset the user picked.
  it('every burn-in preset has an SFX palette that is unique among presets', () => {
    const burned = Object.values(PRESETS).filter((p) => !p.stitchedOnly);
    const seen = new Map<string, string>();
    for (const p of burned) {
      const signature = JSON.stringify([p.sfx.overlayMap, p.sfx.maxWhoosh, p.sfx.volume]);
      const clash = seen.get(signature);
      expect(clash, `${p.id} sounds identical to ${clash}`).toBeUndefined();
      seen.set(signature, p.id);
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

  it('unknown style or explicit id degrades to the no-band default / rotation, never throws', () => {
    // Fallback is impact (no band) since classic left rotation 2026-06-16.
    expect(resolvePreset('cinematic-nonsense', undefined, 's').id).toBe('impact');
    expect(resolvePreset(undefined, undefined, 's').id).toBe('impact');
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
