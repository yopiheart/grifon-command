import { getSupabase } from './supabaseClient';

export type PlanId = 'starter' | 'pro' | 'business';
export type BillingCycle = 'monthly' | 'annual';

const INTENDED_PLAN_KEY = 'grifon_intended_plan';

export const saveIntendedPlan = (plan_id: PlanId, billing_cycle: BillingCycle) => {
  try {
    sessionStorage.setItem(
      INTENDED_PLAN_KEY,
      JSON.stringify({ plan_id, billing_cycle })
    );
  } catch {}
};

// Non-destructive read (popIntendedPlan clears; this doesn't). Used to mirror a
// guest's pending plan into the /login URL without consuming the resume intent.
export const peekIntendedPlan = (): { plan_id: PlanId; billing_cycle: BillingCycle } | null => {
  try {
    const raw = sessionStorage.getItem(INTENDED_PLAN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.plan_id && parsed?.billing_cycle) return parsed;
    return null;
  } catch {
    return null;
  }
};

export const popIntendedPlan = (): { plan_id: PlanId; billing_cycle: BillingCycle } | null => {
  try {
    const raw = sessionStorage.getItem(INTENDED_PLAN_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(INTENDED_PLAN_KEY);
    const parsed = JSON.parse(raw);
    if (parsed?.plan_id && parsed?.billing_cycle) return parsed;
    return null;
  } catch {
    return null;
  }
};

export const startCheckout = async (
  plan_id: PlanId,
  billing_cycle: BillingCycle
): Promise<void> => {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    saveIntendedPlan(plan_id, billing_cycle);
    throw new Error('NOT_AUTHENTICATED');
  }

  // On-domain checkout: navigate to /checkout where the PaymentIntent is
  // created and the user enters card / e-wallet details. Replaces the prior
  // redirect to checkout.paymongo.com (still served by /api/checkout as a
  // fallback during the PayMongo Payment Intents rollout).
  const params = new URLSearchParams({ plan: plan_id, cycle: billing_cycle });
  window.location.href = `/checkout?${params.toString()}`;
};
