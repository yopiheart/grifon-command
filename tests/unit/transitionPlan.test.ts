import { describe, it, expect } from 'vitest';
import { planTransitions, buildTransitionFilters } from '../../api/_lib/renderFfmpeg.js';
import { CLASSIC, IMPACT, HYPE, CLEAN } from '../../api/_lib/renderPresets.js';
import type { TransitionStyle } from '../../api/_lib/renderPresets.js';

const FLASH: TransitionStyle = { kind: 'flash', halfDurSec: 0.07, everyN: 2, maxPerAd: 3 };
const WHIP: TransitionStyle = { kind: 'whip', halfDurSec: 0.05, everyN: 2, maxPerAd: 4 };
const DIP: TransitionStyle = { kind: 'dip', halfDurSec: 0.12, everyN: 3, maxPerAd: 2 };

describe('planTransitions', () => {
  it('classic (kind none) plans nothing — byte-identical pipeline to today', () => {
    for (const p of planTransitions(8, CLASSIC.transition)) {
      expect(p).toEqual({ fadeOutTail: false, fadeInHead: false });
    }
  });

  it('never transitions INTO scene 0 (nothing cuts into the hook)', () => {
    for (const style of [FLASH, WHIP, DIP, IMPACT.transition, HYPE.transition, CLEAN.transition]) {
      expect(planTransitions(9, style)[0].fadeInHead).toBe(false);
    }
  });

  it('flash everyN=2: picks cuts 1,3,5 — tail on outgoing, head on incoming', () => {
    const plans = planTransitions(8, FLASH);
    // cut 1 = scene0→scene1, cut 3 = scene2→scene3, cut 5 = scene4→scene5
    expect(plans[0].fadeOutTail).toBe(true);
    expect(plans[1].fadeInHead).toBe(true);
    expect(plans[2].fadeOutTail).toBe(true);
    expect(plans[3].fadeInHead).toBe(true);
    expect(plans[4].fadeOutTail).toBe(true);
    expect(plans[5].fadeInHead).toBe(true);
    // skipped cuts carry nothing
    expect(plans[1].fadeOutTail).toBe(false);
    expect(plans[2].fadeInHead).toBe(false);
    // capped at 3 — cut 7 not taken
    expect(plans[6].fadeOutTail).toBe(false);
    expect(plans[7].fadeInHead).toBe(false);
  });

  it('respects maxPerAd across a long ad', () => {
    const heads = planTransitions(20, FLASH).filter((p) => p.fadeInHead).length;
    expect(heads).toBe(3);
  });

  it('whip is incoming-only (blur reads as camera movement, no tail burn)', () => {
    const plans = planTransitions(6, WHIP);
    expect(plans.some((p) => p.fadeOutTail)).toBe(false);
    expect(plans.filter((p) => p.fadeInHead).length).toBeGreaterThan(0);
  });

  it('is deterministic and handles degenerate scene counts', () => {
    expect(planTransitions(6, DIP)).toEqual(planTransitions(6, DIP));
    expect(planTransitions(1, FLASH)[0]).toEqual({ fadeOutTail: false, fadeInHead: false });
    expect(planTransitions(0, FLASH)).toEqual([]);
  });
});

describe('buildTransitionFilters', () => {
  it('flash: white fade-in at head, white fade-out anchored to the trimmed tail', () => {
    const head = buildTransitionFilters({ fadeOutTail: false, fadeInHead: true }, FLASH, 4.0);
    expect(head).toBe('fade=t=in:st=0:d=0.07:color=white');
    const tail = buildTransitionFilters({ fadeOutTail: true, fadeInHead: false }, FLASH, 4.0);
    expect(tail).toBe('fade=t=out:st=3.930:d=0.07:color=white');
  });

  it('dip uses black', () => {
    const f = buildTransitionFilters({ fadeOutTail: true, fadeInHead: true }, DIP, 5.0);
    expect(f).toContain('color=black');
    expect(f).toContain('fade=t=in');
    expect(f).toContain('st=4.880');
  });

  it('skips the tail fade when the trimmed length is unknown or too short', () => {
    expect(buildTransitionFilters({ fadeOutTail: true, fadeInHead: false }, FLASH, null)).toBe('');
    expect(buildTransitionFilters({ fadeOutTail: true, fadeInHead: false }, FLASH, 0.1)).toBe('');
  });

  it('whip: 3-step decaying boxblur, time-gated (radius cannot animate per-frame)', () => {
    const f = buildTransitionFilters({ fadeOutTail: false, fadeInHead: true }, WHIP, 4.0);
    expect(f).toBe(
      "boxblur=18:1:enable='lt(t,0.050)'," +
      "boxblur=8:1:enable='between(t,0.050,0.100)'," +
      "boxblur=3:1:enable='between(t,0.100,0.150)'"
    );
  });

  it('returns empty for classic / no-op plans', () => {
    expect(buildTransitionFilters({ fadeOutTail: false, fadeInHead: false }, FLASH, 4)).toBe('');
    expect(buildTransitionFilters({ fadeOutTail: true, fadeInHead: true }, CLASSIC.transition, 4)).toBe('');
  });
});
