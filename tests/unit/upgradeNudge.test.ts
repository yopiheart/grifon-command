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
    expect(computeUpgradeNudge('free', usage(0, 3))).toBeNull();
  });

  it('stays quiet while a Free user has healthy headroom', () => {
    expect(computeUpgradeNudge('free', usage(1, 3))).toBeNull();
  });

  it('fires for a Free user down to their last workflow, quoting the real number', () => {
    const nudge = computeUpgradeNudge('free', usage(2, 3));
    expect(nudge).not.toBeNull();
    expect(nudge!.urgency).toBe('low');
    expect(nudge!.message).toContain('1 free workflow');
  });

  it('escalates to final urgency once a Free user is fully spent', () => {
    const nudge = computeUpgradeNudge('free', usage(3, 3));
    expect(nudge!.urgency).toBe('final');
  });

  it('never nudges while quota is still loading', () => {
    expect(computeUpgradeNudge('free', usage(3, 3), true)).toBeNull();
  });

  it('guards against an unmetered (limit 0) plan', () => {
    expect(computeUpgradeNudge('free', usage(0, 0))).toBeNull();
  });

  it('nudges Creator toward Pro only when the workflow tank runs low', () => {
    expect(computeUpgradeNudge('creator', usage(10, 15))).toBeNull();
    const low = computeUpgradeNudge('creator', usage(13, 15));
    expect(low).not.toBeNull();
    expect(low!.message).toContain('AI video ads');
  });

  it('never shows a standing nag on Pro or Business', () => {
    expect(computeUpgradeNudge('pro', usage(39, 40))).toBeNull();
    expect(computeUpgradeNudge('business', usage(100, 100))).toBeNull();
  });
});
