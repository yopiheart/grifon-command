import type { PlanId } from '../utils/planGate';
import type { UnitUsage } from '../hooks/useQuota';

/**
 * Honest moment-of-value upgrade nudge (engagement Phase 2).
 *
 * Replaces the old permanent "You're on Free — upgrade" banner, which nagged
 * every Free/Creator user from their very first visit, before they'd gotten any
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
    // Only after they've shipped at least one workflow AND are down to the last
    // slot — pitch lands when the limit is real, not on a cold first visit.
    if (used <= 0 || remaining > 1) return null;
    return remaining === 0
      ? {
          message: `Ubos na ang ${limit} free workflows mo this month. Mag-Pro — 40 na/buwan, hindi ka na mauubusan. Tuloy lang.`,
          urgency: 'final',
        }
      : {
          message: `${remaining} free workflow na lang ngayong buwan. Mag-Pro para hindi ka maubusan — plus AI video ads.`,
          urgency: 'low',
        };
  }

  if (plan === 'creator') {
    // Creator never gets AI video ads; nudge toward Pro as the workflow tank runs low.
    if (remaining > 2) return null;
    return {
      message: `${remaining} sa ${limit} workflows na lang. Mag-Pro para may AI video ads ka na — ito ang kulang sa Creator.`,
      urgency: remaining === 0 ? 'final' : 'low',
    };
  }

  // Pro / Business: no standing upgrade nag — the quota wall covers a true cap-out.
  return null;
};
