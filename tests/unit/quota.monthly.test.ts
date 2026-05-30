import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase admin client both rateLimitCheck (rpc) and peekQuota
// (from().select().eq().maybeSingle()) depend on.
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

import {
  consumeMonthly,
  monthlyKey,
  MONTHLY_WINDOW_SECONDS,
} from '../../api/_lib/quota.js';

describe('monthlyKey', () => {
  it('stamps the UTC calendar month as YYYY-MM', () => {
    const key = monthlyKey('reports', 'user-123', new Date(Date.UTC(2026, 4, 31))); // May 2026
    expect(key).toBe('reports:monthly:2026-05:user-123');
  });

  it('zero-pads single-digit months', () => {
    const key = monthlyKey('video_ads', 'u', new Date(Date.UTC(2026, 0, 1))); // Jan
    expect(key).toContain('2026-01');
  });
});

describe('consumeMonthly', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    maybeSingleMock.mockReset();
  });

  it('returns allowed:false without touching the counter when limit is 0', async () => {
    // free.video_ads === 0
    const res = await consumeMonthly('video_ads', 'user-1', 'free');
    expect(res.allowed).toBe(false);
    expect(res.limit).toBe(0);
    expect(res.remaining).toBe(0);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('consumes a slot and surfaces used/limit/remaining when under cap', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null }); // allowed
    maybeSingleMock.mockResolvedValue({
      data: { count: 1, window_start: new Date().toISOString() },
      error: null,
    });

    const res = await consumeMonthly('reports', 'user-2', 'free'); // free.reports === 1
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(res.allowed).toBe(true);
    expect(res.limit).toBe(1);
    expect(res.used).toBe(1);
    expect(res.remaining).toBe(0);
  });

  it('reports allowed:false when the RPC denies (cap already hit)', async () => {
    rpcMock.mockResolvedValue({ data: false, error: null }); // denied
    maybeSingleMock.mockResolvedValue({
      data: { count: 1, window_start: new Date().toISOString() },
      error: null,
    });

    const res = await consumeMonthly('reports', 'user-3', 'free');
    expect(res.allowed).toBe(false);
    expect(res.limit).toBe(1);
  });

  it('uses a ~31-day safety window', () => {
    expect(MONTHLY_WINDOW_SECONDS).toBe(31 * 86_400);
  });
});
