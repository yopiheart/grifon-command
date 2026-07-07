import { describe, it, expect, vi, beforeEach } from 'vitest';

// credits.ts imports supabaseAdmin (for the grant/consume/peek RPC wrappers).
// creditsForAddOns is pure, but the module-level import must resolve — stub the
// admin client. Shared mocks (rpc + select().eq().maybeSingle()) so grantCredits
// / peekCredits can be asserted; creditsForAddOns never touches either.
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

import { creditsForAddOns, grantCredits, peekCredits } from '../../api/_lib/credits.js';

describe('creditsForAddOns', () => {
  it('sums single + 5-pack into the video bucket (1 + 5 = 6)', () => {
    expect(creditsForAddOns(['video_ad_single', 'video_ad_pack5'])).toEqual({
      video: 6,
      cinematic: 0,
      omni: 0,
    });
  });

  it('routes the cinematic add-on to the cinematic bucket', () => {
    expect(creditsForAddOns(['video_ad_cinematic'])).toEqual({ video: 0, cinematic: 1, omni: 0 });
  });

  it('routes the omni style add-on to the omni bucket', () => {
    expect(creditsForAddOns(['omni_style_single'])).toEqual({ video: 0, cinematic: 0, omni: 1 });
  });

  it('sums a mixed cart across every bucket', () => {
    expect(creditsForAddOns(['video_ad_pack5', 'omni_style_single'])).toEqual({
      video: 5,
      cinematic: 0,
      omni: 1,
    });
  });

  it('ignores non-credit add-ons (onboarding_call) and unknown ids', () => {
    expect(creditsForAddOns(['onboarding_call', 'bogus_id'])).toEqual({
      video: 0,
      cinematic: 0,
      omni: 0,
    });
  });

  it('returns zeros for an empty selection', () => {
    expect(creditsForAddOns([])).toEqual({ video: 0, cinematic: 0, omni: 0 });
  });
});

describe('grantCredits', () => {
  beforeEach(() => {
    rpcMock.mockReset().mockResolvedValue({ error: null });
  });

  it('passes p_omni to the grant_credits RPC', async () => {
    await grantCredits('u1', 0, 0, 3);
    expect(rpcMock).toHaveBeenCalledWith('grant_credits', {
      p_user_id: 'u1',
      p_video: 0,
      p_cinematic: 0,
      p_omni: 3,
    });
  });

  it('defaults p_omni to 0 for existing 3-arg call sites', async () => {
    await grantCredits('u1', 2, 1);
    expect(rpcMock).toHaveBeenCalledWith('grant_credits', {
      p_user_id: 'u1',
      p_video: 2,
      p_cinematic: 1,
      p_omni: 0,
    });
  });

  it('short-circuits (no RPC) when nothing is granted', async () => {
    const ok = await grantCredits('u1', 0, 0, 0);
    expect(ok).toBe(true);
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe('peekCredits', () => {
  beforeEach(() => {
    maybeSingleMock.mockReset();
  });

  it('returns omni_style_credits from the subscriptions row', async () => {
    maybeSingleMock.mockResolvedValue({
      data: { video_ad_credits: 1, cinematic_credits: 2, omni_style_credits: 4 },
      error: null,
    });
    const c = await peekCredits('u1');
    expect(c).toEqual({ video_ad_credits: 1, cinematic_credits: 2, omni_style_credits: 4 });
  });

  it('degrades every balance to zero on error or missing row', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });
    const c = await peekCredits('u1');
    expect(c).toEqual({ video_ad_credits: 0, cinematic_credits: 0, omni_style_credits: 0 });
  });
});
