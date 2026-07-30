import { useCallback, useEffect, useState } from 'react';
import { getSupabase } from '../services/supabaseClient';
import type { PlanId } from '../utils/planGate';

export type MeterUnit = 'workflows' | 'reports' | 'captions' | 'images' | 'video_ads' | 'omni_ads';

export type UnitUsage = { used: number; limit: number; remaining: number };

/** Purchased top-up balances (separate from the monthly meter). */
export type Credits = { video_ad_credits: number; cinematic_credits: number; omni_style_credits: number };

export type Quota = Record<MeterUnit, UnitUsage> & {
  plan: PlanId;
  credits: Credits;
  loading: boolean;
  /** True only after a SUCCESSFUL usage fetch. Distinguishes "the numbers are
      real" from the DEFAULT zeros left behind by a failed/absent fetch —
      consumers making spend decisions must check this, not just !loading. */
  loaded: boolean;
  refetch: () => void;
};

const ZERO: UnitUsage = { used: 0, limit: 0, remaining: 0 };
const ZERO_CREDITS: Credits = { video_ad_credits: 0, cinematic_credits: 0, omni_style_credits: 0 };

const DEFAULT: Omit<Quota, 'refetch'> = {
  plan: 'free',
  workflows: ZERO,
  reports: ZERO,
  captions: ZERO,
  images: ZERO,
  video_ads: ZERO,
  omni_ads: ZERO,
  credits: ZERO_CREDITS,
  loading: true,
  loaded: false,
};

/**
 * Reads the current user's monthly usage snapshot from
 * GET /api/billing?action=usage. Mirrors useSubscription's shape. Unlike the
 * subscription hook there is no realtime channel — usage changes are driven by
 * the user's own actions, so callers refetch() after a generation or on the
 * quota-wall dismiss.
 */
export const useQuota = (): Quota => {
  const [state, setState] = useState<Omit<Quota, 'refetch'>>(DEFAULT);

  const load = useCallback(async () => {
    const sb = getSupabase();
    const { data: sessionData } = await sb.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) {
      setState({ ...DEFAULT, loading: false });
      return;
    }
    try {
      const res = await fetch('/api/billing?action=usage', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        setState((s) => ({ ...s, loading: false }));
        return;
      }
      const data = await res.json();
      setState({
        plan: (data.plan as PlanId) ?? 'free',
        workflows: data.workflows ?? ZERO,
        reports: data.reports ?? ZERO,
        captions: data.captions ?? ZERO,
        images: data.images ?? ZERO,
        video_ads: data.video_ads ?? ZERO,
        omni_ads: data.omni_ads ?? ZERO,
        credits: data.credits ?? ZERO_CREDITS,
        loading: false,
        loaded: true,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await load();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  return { ...state, refetch: load };
};
