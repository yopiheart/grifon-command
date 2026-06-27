import { describe, it, expect } from 'vitest';

import {
  MUSIC_DAILY, MUSIC_GLOBAL_DAILY, musicDailyKey, musicGlobalDailyKey,
} from '../../api/_lib/quota.js';
import { musicGenEligible, type PlanId } from '../../utils/planGate.js';
import { musicBedKey } from '../../api/_lib/renderJob.js';
import { MUSIC_STYLE_PROMPTS, type MusicStyle } from '../../api/_lib/musicPrompts.js';

const PLANS: PlanId[] = ['free', 'starter', 'pro', 'business'];
const STYLES: MusicStyle[] = ['mrbeast', 'temu', 'testimonial'];

describe('generative-music quota + gating', () => {
  it('free/starter can NEVER generate music (MUSIC_DAILY = 0); pro/business can', () => {
    expect(MUSIC_DAILY.free).toBe(0);
    expect(MUSIC_DAILY.starter).toBe(0);
    expect(MUSIC_DAILY.pro).toBeGreaterThan(0);
    expect(MUSIC_DAILY.business).toBeGreaterThan(0);
  });

  it('keeps the client tier gate in lockstep with the server cap (eligible iff cap > 0)', () => {
    // This is the seam that guarantees the UI toggle and the authoritative
    // server gate agree — "free/starter never trigger gen" at BOTH layers.
    for (const plan of PLANS) {
      expect(musicGenEligible(plan)).toBe(MUSIC_DAILY[plan] > 0);
    }
  });

  it('has a positive global circuit-breaker ceiling', () => {
    expect(MUSIC_GLOBAL_DAILY).toBeGreaterThan(0);
  });

  it('keys the per-user bucket by user and the global ceiling as a single shared key', () => {
    expect(musicDailyKey('u1')).toBe('music:daily:u1');
    expect(musicDailyKey('u1')).not.toBe(musicDailyKey('u2'));
    expect(musicGlobalDailyKey()).toBe('music:global:daily'); // account-wide, no user
  });
});

describe('music bed cache key (per-ad)', () => {
  it('is deterministic for the same (user, seed, style) — re-renders reuse the bed', () => {
    expect(musicBedKey('u1', 'seedA', 'mrbeast')).toBe(musicBedKey('u1', 'seedA', 'mrbeast'));
  });

  it('differs by seed and by style so distinct ads / styles never collide', () => {
    expect(musicBedKey('u1', 'seedA', 'mrbeast')).not.toBe(musicBedKey('u1', 'seedB', 'mrbeast'));
    expect(musicBedKey('u1', 'seedA', 'mrbeast')).not.toBe(musicBedKey('u1', 'seedA', 'temu'));
  });
});

describe('canned music prompts', () => {
  it('covers exactly the three render styles', () => {
    expect(Object.keys(MUSIC_STYLE_PROMPTS).sort()).toEqual([...STYLES].sort());
  });

  it('every prompt enforces the mix-discipline invariant: instrumental + VO headroom', () => {
    for (const style of STYLES) {
      const p = MUSIC_STYLE_PROMPTS[style].toLowerCase();
      expect(p).toContain('instrumental');
      expect(p).toContain('no vocals');
      expect(p).toContain('voiceover');
    }
  });

  it('every prompt hard-bans singing/vocal intros (DR ads: any vocal fights the VO)', () => {
    // Regression guard for the 2026-06-16 leak (a sung vocal intro). The API's
    // force_instrumental is primary; these negatives are the belt-and-suspenders.
    for (const style of STYLES) {
      const p = MUSIC_STYLE_PROMPTS[style].toLowerCase();
      expect(p).toContain('no singing');
      expect(p).toContain('no vocal intro');
    }
  });
});
