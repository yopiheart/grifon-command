import { describe, it, expect } from 'vitest';
import { nextTier, PLAN_RANK } from '../../utils/planGate.js';

describe('nextTier', () => {
  it('walks free → creator → pro → business', () => {
    expect(nextTier('free')).toBe('creator');
    expect(nextTier('creator')).toBe('pro');
    expect(nextTier('pro')).toBe('business');
  });

  it('returns null on the top plan', () => {
    expect(nextTier('business')).toBeNull();
  });
});

describe('PLAN_RANK', () => {
  it('is exported and strictly ordered', () => {
    expect(PLAN_RANK.free).toBeLessThan(PLAN_RANK.creator);
    expect(PLAN_RANK.creator).toBeLessThan(PLAN_RANK.pro);
    expect(PLAN_RANK.pro).toBeLessThan(PLAN_RANK.business);
  });
});
