import { getSupabaseAdmin } from './supabaseAdmin.js';
import { ADD_ON_CATALOG, type AddOnId } from './paymongo.js';

// Top-up finished-ad credits (Slice 6b). Granted by add-on purchases (webhook),
// consumed when the monthly video_ads allowance is exhausted (quota.ts). Backed
// by subscriptions.video_ad_credits / cinematic_credits + the grant_credits /
// consume_credit RPCs (see supabase/credits.sql).
//
// NOTE (2026-06-19): cinematic credits are GRANTED here but not yet CONSUMED —
// the Commercial/Spec render path sends no cinematic signal to the video proxy,
// so the server can't tell a spec render from a standard one. Cinematic
// consumption (+ the Business spec metering model) is a parked follow-up; until
// then the cinematic top-up is intentionally NOT surfaced in the purchase UI.

export type CreditKind = 'video_ad' | 'cinematic' | 'omni_style';

// Splits add-on IDs into {video, cinematic, omni} finished-ad credit grants.
// Unknown IDs and non-credit add-ons (e.g. onboarding_call) contribute nothing.
export function creditsForAddOns(
  addOnIds: readonly string[]
): { video: number; cinematic: number; omni: number } {
  let video = 0;
  let cinematic = 0;
  let omni = 0;
  for (const id of addOnIds) {
    const addOn = ADD_ON_CATALOG[id as AddOnId];
    if (!addOn) continue;
    if (addOn.omniStyleCredits) omni += addOn.omniStyleCredits;
    if (!addOn.videoAdCredits) continue;
    if (addOn.cinematic) cinematic += addOn.videoAdCredits;
    else video += addOn.videoAdCredits;
  }
  return { video, cinematic, omni };
}

// Additive grant via RPC. Returns false (and logs) on error so the caller can
// surface a partial-fulfilment alert — the subscription upsert is unaffected.
export async function grantCredits(
  userId: string,
  video: number,
  cinematic: number,
  omni = 0
): Promise<boolean> {
  if (video <= 0 && cinematic <= 0 && omni <= 0) return true;
  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc('grant_credits', {
    p_user_id: userId,
    p_video: video,
    p_cinematic: cinematic,
    p_omni: omni,
  });
  if (error) {
    console.error('[credits] grant rpc error:', error.message);
    return false;
  }
  return true;
}

// Atomic consume-one. FAILS CLOSED: on RPC error returns false so we never hand
// out a free (expensive) render we can't confirm was paid for. This is the
// deliberate opposite of rateLimitCheck's fail-open — credits gate real money.
export async function consumeCredit(userId: string, kind: CreditKind): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc('consume_credit', {
    p_user_id: userId,
    p_kind: kind,
  });
  if (error) {
    console.error('[credits] consume rpc error:', error.message);
    return false;
  }
  return data === true;
}

// Reads remaining credit balances (display only — drives the usage snapshot).
// Returns zeros on error or missing row.
export async function peekCredits(
  userId: string
): Promise<{ video_ad_credits: number; cinematic_credits: number; omni_style_credits: number }> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('subscriptions')
    .select('video_ad_credits, cinematic_credits, omni_style_credits')
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) return { video_ad_credits: 0, cinematic_credits: 0, omni_style_credits: 0 };
  return {
    video_ad_credits: (data.video_ad_credits as number) ?? 0,
    cinematic_credits: (data.cinematic_credits as number) ?? 0,
    // Missing column degrades to zero (belt-and-suspenders if the migration lags).
    omni_style_credits: (data.omni_style_credits as number) ?? 0,
  };
}
