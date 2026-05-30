import { describe, it, expect } from 'vitest';

// Guards against drift between the client-facing marketing caps (PLAN_LIMITS,
// utils/planGate.ts) and the server-authoritative enforcement caps
// (MONTHLY_LIMITS, api/_lib/quota.ts). The two are deliberately separate
// literals (server enforcement stays self-contained) — this test is the seam
// that keeps them identical.
import { MONTHLY_LIMITS, type MeterUnit } from '../../api/_lib/quota.js';
import { PLAN_LIMITS, type PlanId } from '../../utils/planGate.js';

const UNITS: MeterUnit[] = ['workflows', 'reports', 'captions', 'images', 'video_ads'];
const PLANS: PlanId[] = ['free', 'creator', 'pro', 'business'];

describe('MONTHLY_LIMITS / PLAN_LIMITS parity', () => {
  it('matches PLAN_LIMITS for every plan and metered unit', () => {
    for (const plan of PLANS) {
      for (const unit of UNITS) {
        expect(MONTHLY_LIMITS[plan][unit]).toBe(PLAN_LIMITS[plan][unit]);
      }
    }
  });

  it('meters exactly the numeric units (no watermark, nothing extra)', () => {
    for (const plan of PLANS) {
      expect(Object.keys(MONTHLY_LIMITS[plan]).sort()).toEqual([...UNITS].sort());
    }
  });
});
