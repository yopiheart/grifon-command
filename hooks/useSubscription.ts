import { useCallback, useEffect, useRef, useState } from 'react';
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
  error?: boolean;
  refetch?: () => Promise<void>;
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
  const refresh = useRef<() => Promise<void>>(async () => {});
  const refetch = useCallback(() => refresh.current(), []);

  useEffect(() => {
    let cancelled = false;
    const supabase = getSupabase();
    let account: string | null = null;
    let initialized = false;
    let confirmed = false;
    let generation = 0;
    let request = 0;
    let authVersion = 0;
    let authTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const removeChannel = () => {
      if (channel) { void supabase.removeChannel(channel); channel = null; }
    };
    const load = async (userId: string, epoch: number) => {
      if (cancelled || account !== userId || generation !== epoch) return;
      const serial = ++request;
      const version = authVersion;
      setSub(previous => ({ ...previous, loading: !confirmed, error: false }));
      try {
        const { data, error } = await supabase.from('subscriptions').select('plan_id, status, current_period_end, billing_cycle').eq('user_id', userId).maybeSingle();
        if (cancelled || account !== userId || generation !== epoch || request !== serial || authVersion !== version) return;
        if (error) throw error;
        confirmed = true;
        setSub(data ? {
          plan_id: coercePlanId(data.plan_id), status: data.status as SubscriptionStatus,
          current_period_end: data.current_period_end ?? null,
          billing_cycle: (data.billing_cycle as 'monthly' | 'annual' | null) ?? null,
          loading: false, error: false,
        } : { ...DEFAULT, loading: false, error: false });
      } catch {
        if (!cancelled && account === userId && generation === epoch && request === serial && authVersion === version) setSub(previous => ({ ...previous, loading: false, error: true }));
      }
    };
    const selectAccount = (userId: string | null) => {
      if (cancelled) return;
      if (initialized && account === userId) { if (userId) void load(userId, generation); else setSub({ ...DEFAULT, loading: false, error: false }); return; }
      initialized = true; confirmed = false; account = userId; generation += 1; request += 1; removeChannel();
      setSub({ ...DEFAULT, loading: !!userId, error: false });
      if (!userId) return;
      const epoch = generation;
      void load(userId, epoch);
      channel = supabase.channel(`sub:${Math.random().toString(36).slice(2)}`).on('postgres_changes', {
        event: '*', schema: 'public', table: 'subscriptions', filter: `user_id=eq.${userId}`,
      }, () => { void load(userId, epoch); }).subscribe((status, err) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.error(`[useSubscription] realtime ${status}`, err ?? '');
      });
    };
    const readSession = async () => {
      const version = authVersion;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (cancelled || version !== authVersion) return;
        if (error) throw error;
        selectAccount(data.session?.user?.id ?? null);
      } catch {
        if (!cancelled && version === authVersion) setSub(previous => ({ ...previous, loading: false, error: true }));
      }
    };
    refresh.current = async () => { if (account) await load(account, generation); else await readSession(); };
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      authVersion += 1;
      if (authTimer !== null) clearTimeout(authTimer);
      // Defer SDK work until the auth callback has released its lock.
      authTimer = setTimeout(() => { authTimer = null; selectAccount(session?.user?.id ?? null); }, 0);
    });
    void readSession();
    return () => {
      cancelled = true; generation += 1; request += 1;
      if (authTimer !== null) clearTimeout(authTimer);
      listener.subscription.unsubscribe(); removeChannel(); refresh.current = async () => {};
    };
  }, []);

  return { ...sub, refetch };
};
