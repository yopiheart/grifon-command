import type { PlanId } from '../utils/planGate';
import type { UnitUsage } from '../hooks/useQuota';

/**
 * Honest moment-of-value upgrade nudge (engagement Phase 2).
 *
 * Replaces the old permanent "You're on Free — upgrade" banner, which nagged
 * every Free/Starter user from their very first visit, before they'd gotten any
 * value. High-trust tone: we only surface the pitch once the user has actually
 * FELT the limit (shipped real work and run low on their key monthly
 * allowance), and we always quote the true remaining number — never invented
 * urgency, never a generic standing ad. The hard cap is handled separately by
 * <QuotaWallModal>; this is the softer "you're running low" heads-up before it.
 *
 * Returns the banner message, or null when there is no honest reason to nudge.
 */
export type UpgradeNudge = {
  message: string;
  /** Visual urgency for the banner — 'final' when nothing is left this month. */
  urgency: 'low' | 'final';
};

export const computeUpgradeNudge = (
  plan: PlanId,
  workflows: UnitUsage,
  loading = false
): UpgradeNudge | null => {
  if (loading) return null;
  const { used, limit, remaining } = workflows;
  if (limit <= 0) return null;

  if (plan === 'free') {
    // Free = one complete ad plan. Once they've built it, the honest pitch is:
    // turn the plan into a real video. Lands at the moment of value, not cold.
    if (used <= 0 || remaining > 0) return null;
    return {
      message: `Gawa mo na ang free ad plan mo — i-render na natin into a real video ad. Mag-Starter (₱997) para sa unang video, o mag-Pro para sa 8/buwan.`,
      urgency: 'final',
    };
  }

  if (plan === 'starter') {
    // Starter is deliberately bare (1 video ad). Nudge toward Pro for more ads
    // + the editor/presets/caption packs once they've used their plan slots.
    if (remaining > 0) return null;
    return {
      message: `Nasubukan mo na ang Starter — Mag-Pro para sa 8 video ads/buwan, editing styles, at Facebook caption packs.`,
      urgency: 'final',
    };
  }

  // Pro / Business: no standing upgrade nag — the quota wall covers a true cap-out.
  return null;
};
