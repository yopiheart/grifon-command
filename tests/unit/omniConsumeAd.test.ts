import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mirrors finishedAd.test.ts's mock of the Supabase admin client: rpcMock backs
// rateLimitCheck (rate_limit_check) + consumeCredit (consume_credit); the shared
// select().eq().maybeSingle() chain backs every peekQuota read AND peekCredits.
const rpcMock = vi.fn();
const maybeSingleMock = vi.fn();
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getSupabaseAdmin: () => ({
    rpc: rpcMock,
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: maybeSingleMock,
        }),
      }),
    }),
  }),
}));

import { consumeOmniAd, omniAdJobKey } from '../../api/_lib/quota.js';

const fresh = () => ({ data: null, error: null }); // no counter row yet
const counted = (n: number) => ({
  data: { count: n, window_start: new Date().toISOString() },
  error: null,
});

describe('omniAdJobKey', () => {
  it('namespaces the omni marker by user + ad', () => {
    expect(omniAdJobKey('u1', 'ad-42')).toBe('omniad:u1:ad-42');
  });
});

describe('consumeOmniAd', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    maybeSingleMock.mockReset();
  });

  it('charges ONE omni credit + sets the marker the first time an ad is charged', async () => {
    // 1) marker peek → no row (fresh ad)
    // 2) consumeMonthly's post-consume peek → count 1
    maybeSingleMock.mockResolvedValueOnce(fresh()).mockResolvedValueOnce(counted(1));
    // rate_limit_check twice: consumeMonthly (allow) then mark the omni job key
    rpcMock.mockResolvedValue({ data: true, error: null });

    const res = await consumeOmniAd('u1', 'business', 'ad-1'); // business.omni_ads === 5
    expect(res.allowed).toBe(true);
    expect(res.alreadyCounted).toBe(false);
    expect(res.limit).toBe(5);
    expect(res.used).toBe(1);
    // one consume + one marker write
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT re-charge an already-charged ad (re-roll stays free)', async () => {
    // 1) marker peek → already counted (count 1)
    // 2) peekMonthly read → 2 omni_ads used so far
    maybeSingleMock.mockResolvedValueOnce(counted(1)).mockResolvedValueOnce(counted(2));

    const res = await consumeOmniAd('u1', 'business', 'ad-1');
    expect(res.allowed).toBe(true);
    expect(res.alreadyCounted).toBe(true);
    expect(res.used).toBe(2);
    // no consume, no marker write — the meter is untouched
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('falls back to a purchased omni_style credit when the monthly allowance is exhausted', async () => {
    // free.omni_ads === 0 → consumeMonthly short-circuits without an RPC, then
    // consume_credit succeeds (data:true) and the marker is written.
    maybeSingleMock.mockResolvedValueOnce(fresh());
    rpcMock.mockResolvedValue({ data: true, error: null });

    const res = await consumeOmniAd('u1', 'free', 'ad-credit');
    expect(res.allowed).toBe(true);
    expect(res.fromCredit).toBe(true);
    expect(res.alreadyCounted).toBe(false);
    // consume_credit + marker write (rate_limit_check), in that order
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock.mock.calls.map((c) => c[0])).toEqual(['consume_credit', 'rate_limit_check']);
    // credit consumed under the omni_style kind
    expect(rpcMock.mock.calls[0][1]).toMatchObject({ p_kind: 'omni_style' });
  });

  it('does NOT allow (and writes NO marker) when allowance AND credits are both exhausted', async () => {
    // free.omni_ads === 0 → consumeMonthly short-circuits, then consume_credit
    // finds no credit (data:false) → not allowed, marker never written.
    maybeSingleMock.mockResolvedValueOnce(fresh());
    rpcMock.mockResolvedValue({ data: false, error: null });

    const res = await consumeOmniAd('u1', 'free', 'ad-1');
    expect(res.allowed).toBe(false);
    expect(res.alreadyCounted).toBe(false);
    expect(res.fromCredit).toBeUndefined();
    // only the credit probe — no monthly consume, no marker write
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.mock.calls[0][0]).toBe('consume_credit');
  });
});
