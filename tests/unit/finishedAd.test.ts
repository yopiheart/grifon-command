import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mirrors quota.monthly.test's mock of the Supabase admin client: rpcMock backs
// rateLimitCheck (the rate_limit_check RPC), maybeSingleMock backs every
// peekQuota read (from().select().eq().maybeSingle()).
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
  consumeFinishedAd,
  meterVideoRequest,
  finishedAdJobKey,
} from '../../api/_lib/quota.js';
import { SCENE_CAP } from '../../utils/planGate.js';

const fresh = () => ({ data: null, error: null }); // no counter row yet
const counted = (n: number) => ({
  data: { count: n, window_start: new Date().toISOString() },
  error: null,
});

describe('finishedAdJobKey', () => {
  it('namespaces the marker by user + ad', () => {
    expect(finishedAdJobKey('u1', 'ad-42')).toBe('vidjob:u1:ad-42');
  });
});

describe('consumeFinishedAd', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    maybeSingleMock.mockReset();
  });

  it('charges ONE credit the first time an ad is seen', async () => {
    // 1) job-marker peek → no row (fresh ad)
    // 2) consumeMonthly's post-consume peek → count 1
    maybeSingleMock.mockResolvedValueOnce(fresh()).mockResolvedValueOnce(counted(1));
    // rateLimitCheck called twice: consumeMonthly (allow) then mark the job key
    rpcMock.mockResolvedValue({ data: true, error: null });

    const res = await consumeFinishedAd('u1', 'pro', 'ad-1'); // pro.video_ads === 8
    expect(res.allowed).toBe(true);
    expect(res.alreadyCounted).toBe(false);
    expect(res.limit).toBe(8);
    expect(res.used).toBe(1);
    // one consume + one job-marker write
    expect(rpcMock).toHaveBeenCalledTimes(2);
  });

  it('does NOT re-charge later scenes of the same ad', async () => {
    // 1) job-marker peek → already counted (count 1)
    // 2) peekMonthly read → 3 video_ads used so far
    maybeSingleMock.mockResolvedValueOnce(counted(1)).mockResolvedValueOnce(counted(3));

    const res = await consumeFinishedAd('u1', 'pro', 'ad-1');
    expect(res.allowed).toBe(true);
    expect(res.alreadyCounted).toBe(true);
    expect(res.used).toBe(3);
    // no consume, no marker write — the meter is untouched
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it('blocks when the allowance is 0 AND no top-up credits remain', async () => {
    // free.video_ads === 0 → consumeMonthly short-circuits without an RPC, then
    // we fall back to consume_credit, which finds no credit (data:false).
    maybeSingleMock.mockResolvedValueOnce(fresh());
    rpcMock.mockResolvedValue({ data: false, error: null }); // consume_credit → none

    const res = await consumeFinishedAd('u1', 'free', 'ad-1');
    expect(res.allowed).toBe(false);
    expect(res.alreadyCounted).toBe(false);
    expect(res.fromCredit).toBeUndefined();
    // only the credit probe — no monthly consume, no job-marker write
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(rpcMock.mock.calls[0][0]).toBe('consume_credit');
  });

  it('falls back to a purchased top-up credit when the allowance is exhausted', async () => {
    // free.video_ads === 0 → consumeMonthly short-circuits, then consume_credit
    // succeeds (data:true) and the job marker is written so later scenes are free.
    maybeSingleMock.mockResolvedValueOnce(fresh());
    rpcMock.mockResolvedValue({ data: true, error: null });

    const res = await consumeFinishedAd('u1', 'free', 'ad-credit');
    expect(res.allowed).toBe(true);
    expect(res.fromCredit).toBe(true);
    expect(res.alreadyCounted).toBe(false);
    // consume_credit + job-marker write (rate_limit_check), in that order
    expect(rpcMock).toHaveBeenCalledTimes(2);
    expect(rpcMock.mock.calls.map((c) => c[0])).toEqual(['consume_credit', 'rate_limit_check']);
  });
});

describe('meterVideoRequest', () => {
  beforeEach(() => {
    rpcMock.mockReset();
    maybeSingleMock.mockReset();
  });

  it('falls back to legacy per-call metering when no finishedAdId is given', async () => {
    rpcMock.mockResolvedValue({ data: true, error: null });
    maybeSingleMock.mockResolvedValue(counted(2));

    const res = await meterVideoRequest('u1', 'pro'); // no finishedAdId
    expect(res.ok).toBe(true);
    // exactly one consume RPC (no job-marker write on the legacy path)
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('rejects free video when no allowance and no credit', async () => {
    maybeSingleMock.mockResolvedValue(fresh());
    rpcMock.mockResolvedValue({ data: false, error: null }); // consume_credit → none
    const res = await meterVideoRequest('u1', 'free', 'ad-9');
    expect(res.ok).toBe(false);
  });
});

describe('SCENE_CAP — the COGS dial', () => {
  it('caps ad length per plan (free renders none)', () => {
    expect(SCENE_CAP.free).toBe(0);
    expect(SCENE_CAP.starter).toBe(4);
    expect(SCENE_CAP.pro).toBe(4);
    expect(SCENE_CAP.business).toBe(6);
  });
});
