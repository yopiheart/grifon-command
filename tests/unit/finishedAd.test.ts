import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the transactional meter and legacy read seams; no database or paid calls.
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

  it('uses one atomic debit-and-receipt RPC for the first ad charge', async () => {
    rpcMock.mockResolvedValue({ data: { allowed: true, alreadyCounted: false, fromCredit: false, used: 1, limit: 8, remaining: 7 }, error: null });
    expect(await consumeFinishedAd('u1', 'pro', 'ad-1')).toMatchObject({
      allowed: true, alreadyCounted: false, used: 1, limit: 8,
    });
    expect(rpcMock).toHaveBeenCalledExactlyOnceWith('consume_finished_ad', {
      p_user_id: 'u1', p_unit: 'video_ads', p_finished_ad_id: 'ad-1', p_limit: 8,
    });
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });

  it('returns the existing receipt without a separate debit or marker write', async () => {
    rpcMock.mockResolvedValue({ data: { allowed: true, alreadyCounted: true, fromCredit: false, used: 2, limit: 8, remaining: 6 }, error: null });
    expect(await consumeFinishedAd('u1', 'pro', 'ad-1')).toMatchObject({
      allowed: true, alreadyCounted: true, used: 2,
    });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });

  it('allows an atomic purchased-credit result with no monthly allowance', async () => {
    rpcMock.mockResolvedValue({ data: { allowed: true, alreadyCounted: false, fromCredit: true, used: 0, limit: 0, remaining: 0 }, error: null });
    expect(await consumeFinishedAd('u1', 'free', 'ad-credit')).toMatchObject({
      allowed: true, alreadyCounted: false, fromCredit: true,
    });
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('denies an ad when neither monthly allowance nor top-up is available', async () => {
    rpcMock.mockResolvedValue({ data: { allowed: false, alreadyCounted: false, fromCredit: false, used: 0, limit: 0, remaining: 0 }, error: null });
    expect(await consumeFinishedAd('u1', 'free', 'ad-1')).toEqual({
      allowed: false, alreadyCounted: false, used: 0, limit: 0, remaining: 0,
    });
    expect(rpcMock).toHaveBeenCalledTimes(1);
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
