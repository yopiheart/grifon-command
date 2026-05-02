import { getSupabase } from './supabaseClient';

export type PlanId = 'creator' | 'pro' | 'business';
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

  const res = await fetch('/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan_id, billing_cycle }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Checkout failed (${res.status}): ${text}`);
  }

  const body = (await res.json()) as { checkout_url?: string };
  if (!body.checkout_url) throw new Error('Missing checkout_url in response');
  window.location.href = body.checkout_url;
};
