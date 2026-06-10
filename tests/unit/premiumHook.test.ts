import { describe, it, expect } from 'vitest';
import { planScene, buildPremiumHookStmts, buildWordFilters } from '../../api/_lib/renderFfmpeg.js';
import type { TextLayer } from '../../api/_lib/renderFfmpeg.js';
import { HYPE, CLASSIC, HOOK_PALETTES, pickHookPalette } from '../../api/_lib/renderPresets.js';
import type { FinalRenderScene } from '../../types.js';

const DIMS: [number, number] = [1080, 1920];

const hook: FinalRenderScene = {
  sceneIdx: 0, videoUrl: 'v', isHook: true,
  overlayText: [{ text: 'TIGNAN MO TO', startSec: 0, endSec: 5, style: 'hook', position: 'center' }],
};

describe('hook palette rotation', () => {
  it('non-classic hook carries the seed-picked palette; classic carries none', () => {
    const a = planScene(hook, 4, DIMS, HYPE, 0)[0] as TextLayer;
    const b = planScene(hook, 4, DIMS, HYPE, 1)[0] as TextLayer;
    expect(a.gradient).toEqual(HOOK_PALETTES[0]);
    expect(b.gradient).toEqual(HOOK_PALETTES[1]);
    expect(a.gradient).not.toEqual(b.gradient);
    const classic = planScene(hook, 4, DIMS, CLASSIC, 0);
    expect(classic.every((l) => l.kind !== 'text' || !(l as TextLayer).gradient)).toBe(true);
  });

  it('pickHookPalette wraps deterministically', () => {
    expect(pickHookPalette(4)).toEqual(HOOK_PALETTES[0]);
    expect(pickHookPalette(7)).toEqual(pickHookPalette(7 + HOOK_PALETTES.length));
  });
});

describe('buildPremiumHookStmts (gradient clip + light sweep)', () => {
  const layer = planScene(hook, 4, DIMS, HYPE, 0)[0] as TextLayer; // TIGNAN(hi) MO TO(base)
  const names = ['w0.txt', 'w1.txt', 'w2.txt'];

  it('emits mask + gradient + alphamerge + overlay chains for both word classes', () => {
    const stmts = buildPremiumHookStmts(layer, DIMS, 'hook.ttf', names, HYPE, '[vb0]', '[vp0]', 4, 4);
    const g = stmts.join(';');
    // masks: white glyphs on black, gray output, no outline decoration
    expect(g).toContain('color=c=black:s=1080x1920');
    expect(g).toContain('format=gray[m_hi]');
    expect(g).toContain('format=gray[m_bs]');
    expect(g).toContain('fontcolor=white');
    // gradient fills with the palette endpoints
    expect(g).toContain(`c0=${HOOK_PALETTES[0].hi[0]}:c1=${HOOK_PALETTES[0].hi[1]}`);
    expect(g).toContain(`c0=${HOOK_PALETTES[0].base[0]}:c1=${HOOK_PALETTES[0].base[1]}`);
    // clip + composite chain from inLabel to outLabel
    expect(g).toContain('[f_hi][m_hi]alphamerge[c_hi]');
    expect(g).toContain('[vb0][c_hi]overlay=0:0');
    expect(g).toContain('[vp0]');
  });

  it('the light sweep rides the hi fill only, sliding after the last word lands', () => {
    const stmts = buildPremiumHookStmts(layer, DIMS, 'hook.ttf', names, HYPE, '[vb0]', '[vp0]', 4, 4);
    const g = stmts.join(';');
    expect(g).toContain('[gf_hi][4:v]overlay=');
    expect(g).toContain("x='-480+(t-");
    expect(g).toMatch(/enable='between\(t,\d+\.\d{3},\d+\.\d{3}\)'/);
    expect(g).not.toContain('[gf_bs]'); // base class: gradient only, no sweep
  });

  it('omits the sweep when the asset input is unavailable', () => {
    const g = buildPremiumHookStmts(layer, DIMS, 'hook.ttf', names, HYPE, '[vb0]', '[vp0]', null, 4).join(';');
    expect(g).not.toContain('overlay=x=');
    expect(g).toContain('alphamerge'); // gradient clip still happens
  });

  it('mask mode strips decoration; bed mode is all-black with outline', () => {
    const mask = buildWordFilters(layer, 'hook.ttf', names, HYPE, null, 'mask');
    expect(mask).toContain('fontcolor=white');
    expect(mask).not.toContain('borderw=');
    expect(mask).not.toContain('shadowcolor=');
    const bed = buildWordFilters(layer, 'hook.ttf', names, HYPE, null, 'bed');
    expect(bed).toContain('fontcolor=black');
    expect(bed).toContain('borderw=');
    expect(bed).not.toContain('fontcolor=0x'); // no gold in the bed
  });
});
