import { describe, it, expect } from 'vitest';
import { planScene, buildPremiumHookStmts, buildWordFilters } from '../../api/_lib/renderFfmpeg.js';
import type { TextLayer } from '../../api/_lib/renderFfmpeg.js';
import {
  HYPE, CLASSIC, IMPACT, CLEAN, PUNCH, BARS, SPOTLIGHT, HOOK_PALETTES, pickHookPalette,
} from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene } from '../../types.js';

const DIMS: [number, number] = [1080, 1920];

const hook: FinalRenderScene = {
  sceneIdx: 0, videoUrl: 'v', isHook: true,
  overlayText: [{ text: 'TIGNAN MO TO', startSec: 0, endSec: 5, style: 'hook', position: 'center' }],
};

// The hook palette belongs to the PRESET, not to the render seed (2026-08-17).
// Before that, planScene called pickHookPalette(variantSeed), so the hook's
// colour was chosen by the ad: it changed between two renders of the same preset
// and was drawn from the same 4-palette pool for every title-stack preset. That
// is what "parehas lahat ng overlay text" actually was, and these tests encode
// the rule rather than the mechanism, so they survive a future re-implementation.
// A preset that opts INTO the metallic fill. No SHIPPED preset does as of
// 2026-08-17 — the swipe references Neil supplied are flat/boxed/glow and carry
// no metallic gradient anywhere, so both presets that had one were moved off it.
// The machinery stays wired and tested HERE so re-enabling it on a preset is a
// one-line change, not an archaeology exercise.
const METALLIC = { ...HYPE, hook: { ...HYPE.hook, gradient: HOOK_PALETTES[0] } };

describe('hook palette ownership', () => {
  it('the same preset yields the same palette regardless of render seed', () => {
    const a = planScene(hook, 4, DIMS, METALLIC, 0).find((l) => l.kind === 'text') as TextLayer;
    const b = planScene(hook, 4, DIMS, METALLIC, 999).find((l) => l.kind === 'text') as TextLayer;
    expect(a.gradient).toEqual(METALLIC.hook.gradient);
    expect(a.gradient).toEqual(b.gradient);
  });

  it('every SHIPPED preset is flat — no seed can put a gradient on one', () => {
    for (const p of [CLASSIC, IMPACT, HYPE, CLEAN, PUNCH, BARS, SPOTLIGHT]) {
      expect(p.hook.gradient, p.id).toBeNull();
      for (const seed of [0, 1, 7, 999]) {
        const layers = planScene(hook, 4, DIMS, p, seed);
        expect(
          layers.every((l) => l.kind !== 'text' || !(l as TextLayer).gradient),
          `${p.id} @ seed ${seed}`
        ).toBe(true);
      }
    }
  });

  it('pickHookPalette wraps deterministically', () => {
    expect(pickHookPalette(4)).toEqual(HOOK_PALETTES[0]);
    expect(pickHookPalette(7)).toEqual(pickHookPalette(7 + HOOK_PALETTES.length));
  });
});

describe('buildPremiumHookStmts (gradient clip + light sweep)', () => {
  const layer = planScene(hook, 4, DIMS, METALLIC, 0).find((l) => l.kind === 'text') as TextLayer; // TIGNAN(hi) MO TO(base)
  const names = ['w0.txt', 'w1.txt', 'w2.txt'];

  it('emits mask + gradient + alphamerge + overlay chains for both word classes', () => {
    const stmts = buildPremiumHookStmts(layer, DIMS, 'hook.ttf', names, METALLIC, '[vb0]', '[vp0]', 4, 4);
    const g = stmts.join(';');
    // masks: white glyphs on black, gray output, no outline decoration
    expect(g).toContain('color=c=black:s=1080x1920');
    expect(g).toContain('format=gray[m_hi]');
    expect(g).toContain('format=gray[m_bs]');
    expect(g).toContain('fontcolor=white');
    // gradient fills with HYPE'S OWN palette endpoints (preset-owned, not seeded)
    const pal = METALLIC.hook.gradient!;
    expect(g).toContain(`c0=${pal.hi[0]}:c1=${pal.hi[1]}`);
    expect(g).toContain(`c0=${pal.base[0]}:c1=${pal.base[1]}`);
    // clip + composite chain from inLabel to outLabel
    expect(g).toContain('[f_hi][m_hi]alphamerge[c_hi]');
    expect(g).toContain('[vb0][c_hi]overlay=0:0');
    expect(g).toContain('[vp0]');
  });

  it('the light sweep rides the hi fill only, sliding after the last word lands', () => {
    const stmts = buildPremiumHookStmts(layer, DIMS, 'hook.ttf', names, METALLIC, '[vb0]', '[vp0]', 4, 4);
    const g = stmts.join(';');
    expect(g).toContain('[gf_hi][4:v]overlay=');
    expect(g).toContain("x='-480+(t-");
    expect(g).toMatch(/enable='between\(t,\d+\.\d{3},\d+\.\d{3}\)'/);
    expect(g).not.toContain('[gf_bs]'); // base class: gradient only, no sweep
  });

  it('omits the sweep when the asset input is unavailable', () => {
    const g = buildPremiumHookStmts(layer, DIMS, 'hook.ttf', names, METALLIC, '[vb0]', '[vp0]', null, 4).join(';');
    expect(g).not.toContain('overlay=x=');
    expect(g).toContain('alphamerge'); // gradient clip still happens
  });

  it('mask mode strips decoration; bed mode is all-black with outline', () => {
    const mask = buildWordFilters(layer, 'hook.ttf', names, METALLIC, null, 'mask');
    expect(mask).toContain('fontcolor=white');
    expect(mask).not.toContain('borderw=');
    expect(mask).not.toContain('shadowcolor=');
    const bed = buildWordFilters(layer, 'hook.ttf', names, METALLIC, null, 'bed');
    expect(bed).toContain('fontcolor=black');
    expect(bed).toContain('borderw=');
    expect(bed).not.toContain('fontcolor=0x'); // no gold in the bed
  });
});
