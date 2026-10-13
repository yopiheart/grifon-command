import { useEffect, useState } from 'react';
import { getSupabase } from '../services/supabaseClient';

export type PlanId = 'free' | 'starter' | 'pro' | 'business';

const VALID_PLAN_IDS: readonly PlanId[] = ['free', 'starter', 'pro', 'business'];
const coercePlanId = (value: unknown): PlanId =>
  VALID_PLAN_IDS.includes(value as PlanId) ? (value as PlanId) : 'free';
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'trialing'
  | 'incomplete';

export type Subscription = {
  plan_id: PlanId;
  status: SubscriptionStatus;
  current_period_end: string | null;
  billing_cycle: 'monthly' | 'annual' | null;
  loading: boolean;
};

const DEFAULT: Subscription = {
  plan_id: 'free',
  status: 'active',
  current_period_end: null,
  billing_cycle: null,
  loading: true,
};

export const useSubscription = (): Subscription => {
  const [sub, setSub] = useState<Subscription>(DEFAULT);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();

    const load = async (userId: string) => {
      const { data } = await supabase
        .from('subscriptions')
        .select('plan_id, status, current_period_end, billing_cycle')
        .eq('user_id', userId)
        .maybeSingle();

      if (cancelled) return;
      if (data) {
        setSub({
          plan_id: coercePlanId(data.plan_id),
          status: data.status as SubscriptionStatus,
          current_period_end: data.current_period_end ?? null,
          billing_cycle: (data.billing_cycle as 'monthly' | 'annual' | null) ?? null,
          loading: false,
        });
      } else {
        setSub({ ...DEFAULT, loading: false });
      }
    };

    let channel: ReturnType<typeof supabase.channel> | null = null;
    const channelName = `sub:${Math.random().toString(36).slice(2)}`;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const userId = data.session?.user?.id;
      if (!userId) {
        setSub({ ...DEFAULT, loading: false });
        return;
      }
      load(userId);

      channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'subscriptions',
            filter: `user_id=eq.${userId}`,
          },
          () => load(userId)
        )
        .subscribe((status, err) => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.error(`[useSubscription] realtime ${status}`, err ?? '');
          }
        });
    });

    return () => {
      cancelled = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  return sub;
};
