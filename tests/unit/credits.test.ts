import { describe, it, expect, vi } from 'vitest';

// credits.ts imports supabaseAdmin (for the grant/consume/peek RPC wrappers).
// creditsForAddOns is pure, but the module-level import must resolve — stub the
// admin client so importing the unit never touches real Supabase env.
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getSupabaseAdmin: () => ({ rpc: vi.fn(), from: () => ({}) }),
}));

import { creditsForAddOns } from '../../api/_lib/credits.js';

describe('creditsForAddOns', () => {
  it('sums single + 5-pack into the video bucket (1 + 5 = 6)', () => {
    expect(creditsForAddOns(['video_ad_single', 'video_ad_pack5'])).toEqual({
      video: 6,
      cinematic: 0,
    });
  });

  it('routes the cinematic add-on to the cinematic bucket', () => {
    expect(creditsForAddOns(['video_ad_cinematic'])).toEqual({ video: 0, cinematic: 1 });
  });

  it('ignores non-credit add-ons (onboarding_call) and unknown ids', () => {
    expect(creditsForAddOns(['onboarding_call', 'bogus_id'])).toEqual({
      video: 0,
      cinematic: 0,
    });
  });

  it('returns zeros for an empty selection', () => {
    expect(creditsForAddOns([])).toEqual({ video: 0, cinematic: 0 });
  });
});
