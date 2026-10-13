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

import { consumeOmniAd, omniAdJobKey } from '../../api/_lib/quota.js';

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

  it('uses one atomic debit-and-receipt RPC for the first ad charge', async () => {
    rpcMock.mockResolvedValue({ data: { allowed: true, alreadyCounted: false, fromCredit: false, used: 1, limit: 5, remaining: 4 }, error: null });
    expect(await consumeOmniAd('u1', 'business', 'ad-1')).toMatchObject({
      allowed: true, alreadyCounted: false, used: 1, limit: 5,
    });
    expect(rpcMock).toHaveBeenCalledExactlyOnceWith('consume_finished_ad', {
      p_user_id: 'u1', p_unit: 'omni_ads', p_finished_ad_id: 'ad-1', p_limit: 5,
    });
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });

  it('returns the existing receipt without a separate debit or marker write', async () => {
    rpcMock.mockResolvedValue({ data: { allowed: true, alreadyCounted: true, fromCredit: false, used: 2, limit: 5, remaining: 3 }, error: null });
    expect(await consumeOmniAd('u1', 'business', 'ad-1')).toMatchObject({
      allowed: true, alreadyCounted: true, used: 2,
    });
    expect(rpcMock).toHaveBeenCalledTimes(1);
    expect(maybeSingleMock).not.toHaveBeenCalled();
  });

  it('allows an atomic purchased-credit result with no monthly allowance', async () => {
    rpcMock.mockResolvedValue({ data: { allowed: true, alreadyCounted: false, fromCredit: true, used: 0, limit: 0, remaining: 0 }, error: null });
    expect(await consumeOmniAd('u1', 'free', 'ad-credit')).toMatchObject({
      allowed: true, alreadyCounted: false, fromCredit: true,
    });
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });

  it('denies an ad when neither monthly allowance nor top-up is available', async () => {
    rpcMock.mockResolvedValue({ data: { allowed: false, alreadyCounted: false, fromCredit: false, used: 0, limit: 0, remaining: 0 }, error: null });
    expect(await consumeOmniAd('u1', 'free', 'ad-1')).toEqual({
      allowed: false, alreadyCounted: false, used: 0, limit: 0, remaining: 0,
    });
    expect(rpcMock).toHaveBeenCalledTimes(1);
  });
});
