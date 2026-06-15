import { describe, it, expect, vi, beforeEach } from 'vitest';

// popIntendedPlan is the ONLY mechanism that resumes a checkout after the
// user signs in — if it silently drops the stash, the user loses their plan
// choice and the funnel breaks. These tests lock the round-trip and the
// defensive edges (bad JSON, partial payloads, storage throwing).

vi.mock('../../services/supabaseClient.js', () => ({
  getSupabase: vi.fn(),
}));

import { getSupabase } from '../../services/supabaseClient.js';
import {
  saveIntendedPlan,
  popIntendedPlan,
  startCheckout,
} from '../../services/billingService.js';

const KEY = 'grifon_intended_plan';

const makeSessionStorage = () => {
  const store = new Map<string, string>();
  return {
    getItem: vi.fn((k: string) => store.get(k) ?? null),
    setItem: vi.fn((k: string, v: string) => void store.set(k, v)),
    removeItem: vi.fn((k: string) => void store.delete(k)),
    clear: () => store.clear(),
    _store: store,
  };
};

let storage: ReturnType<typeof makeSessionStorage>;

beforeEach(() => {
  storage = makeSessionStorage();
  vi.stubGlobal('sessionStorage', storage);
});

describe('saveIntendedPlan / popIntendedPlan round-trip', () => {
  it('pop returns exactly what was saved, then clears the stash', () => {
    saveIntendedPlan('pro', 'annual');
    expect(popIntendedPlan()).toEqual({ plan_id: 'pro', billing_cycle: 'annual' });
    // One-shot: second pop must be empty.
    expect(popIntendedPlan()).toBeNull();
    expect(storage._store.has(KEY)).toBe(false);
  });

  it('pop without a prior save returns null', () => {
    expect(popIntendedPlan()).toBeNull();
  });

  it('pop tolerates corrupt JSON (returns null, never throws)', () => {
    storage._store.set(KEY, '{not json');
    expect(popIntendedPlan()).toBeNull();
  });

  it('pop rejects partial payloads missing plan_id or billing_cycle', () => {
    storage._store.set(KEY, JSON.stringify({ plan_id: 'pro' }));
    expect(popIntendedPlan()).toBeNull();
    storage._store.set(KEY, JSON.stringify({ billing_cycle: 'monthly' }));
    expect(popIntendedPlan()).toBeNull();
  });

  it('save swallows storage quota errors (private mode) without throwing', () => {
    storage.setItem.mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    expect(() => saveIntendedPlan('creator', 'monthly')).not.toThrow();
  });
});

describe('startCheckout when unauthenticated', () => {
  it('stashes the intended plan and throws NOT_AUTHENTICATED', async () => {
    (getSupabase as ReturnType<typeof vi.fn>).mockReturnValue({
      auth: { getSession: async () => ({ data: { session: null } }) },
    });
    await expect(startCheckout('business', 'monthly')).rejects.toThrow(
      'NOT_AUTHENTICATED'
    );
    // The stash must survive so the post-sign-in resume can pick it up.
    expect(popIntendedPlan()).toEqual({
      plan_id: 'business',
      billing_cycle: 'monthly',
    });
  });
});
