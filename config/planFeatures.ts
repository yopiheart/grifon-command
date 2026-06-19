import type { PlanId } from '../services/checkoutService';

/**
 * Single source of truth for per-plan "what's included" display copy.
 *
 * Consumed by both the pricing page (GrifonPricingPage.tsx) and the checkout
 * Order Summary (OrderSummary.tsx) so the two surfaces can never drift apart.
 * Copy is display-only marketing text — the billing source of truth is
 * PLAN_CATALOG in api/_lib/paymongo.ts. (Free is not a checkout plan, so it
 * stays inline in the pricing page.)
 */
export const PLAN_FEATURES: Record<PlanId, string[]> = {
  starter: [
    '1 finished video ad a month',
    'Your full ad plan: research, script, storyboard, avatar & thumbnail',
    "Clean-cut video — your character's real voice, no dead air",
    'No watermarks',
  ],
  pro: [
    '8 finished video ads a month',
    'AI video editor — captions, music & effects that keep viewers watching to the end',
    'Director mode — control every scene',
    'Choose your storyboard format & editing style',
    'Facebook caption & headline packs',
    'Community + monthly group call',
    'Priority support',
  ],
  // Honesty pass (2026-06-19): dropped 'brand profiles', 'team seats' and
  // 'White-label exports' — none are built, and white-label contradicts the ToS.
  // Director mode moved to Pro (it's a Pro+ unlock — App.tsx directorUnlocked),
  // so Business shows only its real incremental unlocks.
  business: [
    '15 finished video ads a month',
    '4K ultra-real images',
    'Choose your video render quality — up to 4K',
    'Commercial & cinematic ad studio',
    'Weekly strategy call + dedicated account manager',
  ],
};
