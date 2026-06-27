import { getSupabaseAdmin } from './supabaseAdmin.js';

export type ServerPlanId = 'free' | 'starter' | 'pro' | 'business';

const VALID_PLANS: readonly ServerPlanId[] = ['free', 'starter', 'pro', 'business'];

// Reads the user's active plan from the subscriptions table.
// Defaults to 'free' if no row exists OR the subscription isn't in a billable state.
// Mirrors the client-side logic in hooks/useSubscription.ts so client UI and
// server-side enforcement agree on tier.
export async function getUserPlan(userId: string): Promise<ServerPlanId> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('subscriptions')
    .select('plan_id, status')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[userPlan] query error:', error.message);
    return 'free';
  }
  if (!data) return 'free';

  const status = data.status as string | null;
  if (status !== 'active' && status !== 'trialing') return 'free';

  const plan = data.plan_id as string | null;
  return VALID_PLANS.includes(plan as ServerPlanId) ? (plan as ServerPlanId) : 'free';
}
