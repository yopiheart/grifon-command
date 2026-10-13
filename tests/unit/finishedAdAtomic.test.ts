import { beforeEach, describe, expect, it, vi } from 'vitest';

const db = vi.hoisted(() => ({ rows: new Map<string, number>(), credits: 2, fail: false, loseResponse: false }));
const rpc = vi.hoisted(() => vi.fn());
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getSupabaseAdmin: () => ({
    rpc,
    from: () => ({ select: () => ({ eq: (_: string, key: string) => ({
      maybeSingle: async () => ({ data: db.rows.has(key) ? { count: db.rows.get(key), window_start: new Date().toISOString() } : null, error: null }),
    }) }) }),
  }),
}));

import { consumeFinishedAd, consumeOmniAd, peekOmniAllowance } from '../../api/_lib/quota.js';

beforeEach(() => {
  db.rows.clear(); db.credits = 2; db.fail = false; db.loseResponse = false;
  rpc.mockReset().mockImplementation(async (name, p) => {
    if (db.fail) return { data: null, error: { message: 'offline' } };
    // Legacy RPC seams intentionally retained: this test reproduces the old race.
    if (name === 'consume_credit') {
      const allowed = db.credits > 0;
      if (allowed) db.credits--;
      return { data: allowed, error: null };
    }
    if (name === 'rate_limit_check') {
      const count = (db.rows.get(p.p_key) ?? 0) + 1;
      db.rows.set(p.p_key, count);
      if (db.loseResponse && /^(vidjob|omniad):/.test(p.p_key)) {
        db.loseResponse = false;
        throw new Error('response lost after commit');
      }
      return { data: count <= p.p_limit, error: null };
    }
    // Models the transactional RPC contract, not a substitute for PostgreSQL tests.
    const key = `${p.p_unit}:${p.p_user_id}:${p.p_finished_ad_id}`;
    const month = `${p.p_unit}:${p.p_user_id}:month`;
    let used = db.rows.get(month) ?? 0;
    const alreadyCounted = db.rows.has(key);
    let fromCredit = false;
    let allowed = alreadyCounted;
    if (!alreadyCounted && used < p.p_limit) { db.rows.set(month, ++used); allowed = true; }
    else if (!alreadyCounted && db.credits > 0) { db.credits--; fromCredit = true; allowed = true; }
    if (allowed) db.rows.set(key, 1);
    if (db.loseResponse) { db.loseResponse = false; throw new Error('response lost after commit'); }
    return { data: { allowed, alreadyCounted, fromCredit, used, limit: p.p_limit, remaining: Math.max(0, p.p_limit - used) }, error: null };
  });
});

describe.each([
  ['video', consumeFinishedAd], ['omni', consumeOmniAd],
] as const)('%s finished-ad billing', (_, consume) => {
  it('concurrent scenes of one ad spend exactly one purchased credit', async () => {
    const results = await Promise.all([consume('u1', 'free', 'same-ad'), consume('u1', 'free', 'same-ad')]);
    expect(results.every(r => r.allowed)).toBe(true);
    expect(db.credits).toBe(1);
    expect(results.filter(r => !r.alreadyCounted)).toHaveLength(1);
  });

  it('concurrent scenes of one ad consume one monthly slot', async () => {
    const results = await Promise.all([consume('u1', 'business', 'same-ad'), consume('u1', 'business', 'same-ad')]);
    expect(results.every(r => r.allowed && r.used === 1)).toBe(true);
    expect(results.filter(r => !r.alreadyCounted)).toHaveLength(1);
    expect(db.credits).toBe(2);
  });

  it('two different ads cannot overspend one credit', async () => {
    db.credits = 1;
    const results = await Promise.all([consume('u1', 'free', 'ad-a'), consume('u1', 'free', 'ad-b')]);
    expect(results.filter(r => r.allowed)).toHaveLength(1);
    expect(db.credits).toBe(0);
  });

  it('fails closed when the database is unavailable', async () => {
    db.fail = true;
    expect(await consume('u1', 'business', 'ad-a')).toMatchObject({ allowed: false, unavailable: true });
    expect(db.credits).toBe(2);
  });

  it('fails closed on malformed RPC data', async () => {
    rpc.mockResolvedValue({ data: { allowed: true }, error: null });
    expect(await consume('u1', 'business', 'ad-a')).toMatchObject({ allowed: false, unavailable: true });
  });

  it('a lost response denies generation but retry does not charge twice', async () => {
    db.loseResponse = true;
    expect((await consume('u1', 'free', 'ad-a')).allowed).toBe(false);
    expect(await consume('u1', 'free', 'ad-a')).toMatchObject({ allowed: true, alreadyCounted: true });
    expect(db.credits).toBe(1);
  });
});

it('omni allowance accepts an existing receipt without any debit RPC', async () => {
  db.rows.set('omniad:u1:saved-ad', 1);
  expect(await peekOmniAllowance('u1', 'free', 'saved-ad')).toMatchObject({ allowed: true, alreadyCharged: true });
  expect(rpc).not.toHaveBeenCalled();
});
