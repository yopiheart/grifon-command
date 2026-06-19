import { describe, it, expect } from 'vitest';
import { computeUpgradeNudge } from '../../config/upgradeNudge.js';
import type { UnitUsage } from '../../hooks/useQuota.js';

const usage = (used: number, limit: number): UnitUsage => ({
  used,
  limit,
  remaining: Math.max(0, limit - used),
});

describe('computeUpgradeNudge — honest moment-of-value timing', () => {
  it('does not nag a fresh Free user who has shipped nothing', () => {
    expect(computeUpgradeNudge('free', usage(0, 1))).toBeNull();
  });

  it('stays quiet while a Free user still has plan headroom', () => {
    // (Hypothetical multi-plan free) — fires only once fully spent.
    expect(computeUpgradeNudge('free', usage(1, 3))).toBeNull();
  });

  it('fires (final) once a Free user has built their plan — pitch the video', () => {
    const nudge = computeUpgradeNudge('free', usage(1, 1));
    expect(nudge).not.toBeNull();
    expect(nudge!.urgency).toBe('final');
    expect(nudge!.message).toContain('ad plan');
  });

  it('never nudges while quota is still loading', () => {
    expect(computeUpgradeNudge('free', usage(1, 1), true)).toBeNull();
  });

  it('guards against an unmetered (limit 0) plan', () => {
    expect(computeUpgradeNudge('free', usage(0, 0))).toBeNull();
  });

  it('nudges Starter toward Pro once its allowance is spent', () => {
    expect(computeUpgradeNudge('starter', usage(1, 3))).toBeNull();
    const spent = computeUpgradeNudge('starter', usage(3, 3));
    expect(spent).not.toBeNull();
    expect(spent!.message).toContain('video ads');
  });

  it('never shows a standing nag on Pro or Business', () => {
    expect(computeUpgradeNudge('pro', usage(39, 40))).toBeNull();
    expect(computeUpgradeNudge('business', usage(100, 100))).toBeNull();
  });
});
