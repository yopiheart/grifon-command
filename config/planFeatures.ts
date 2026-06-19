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
    'Ready to post — auto-edited for you',
    'No watermarks',
  ],
  pro: [
    '8 finished video ads a month',
    'AI editor: captions, music & effects — ready to post',
    'Choose your storyboard format & editing style',
    'Facebook caption & headline packs',
    '3 brand profiles',
    'Community + monthly group call',
    'Priority support',
  ],
  business: [
    '15 finished video ads a month',
    'Director mode — control every scene',
    '4K ultra-real images',
    'Commercial & cinematic ad studio',
    '10 brand profiles · 10 team seats',
    'White-label exports',
    'Weekly strategy call + dedicated manager',
  ],
};
