import { describe, it, expect } from 'vitest';
import { nextTier, PLAN_RANK } from '../../utils/planGate.js';

describe('nextTier', () => {
  it('walks free → starter → pro → business', () => {
    expect(nextTier('free')).toBe('starter');
    expect(nextTier('starter')).toBe('pro');
    expect(nextTier('pro')).toBe('business');
  });

  it('returns null on the top plan', () => {
    expect(nextTier('business')).toBeNull();
  });
});

describe('PLAN_RANK', () => {
  it('is exported and strictly ordered', () => {
    expect(PLAN_RANK.free).toBeLessThan(PLAN_RANK.starter);
    expect(PLAN_RANK.starter).toBeLessThan(PLAN_RANK.pro);
    expect(PLAN_RANK.pro).toBeLessThan(PLAN_RANK.business);
  });
});
