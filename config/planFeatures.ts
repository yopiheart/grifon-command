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
  creator: [
    '15 video ad workflows',
    '5 research reports',
    '100 captions & headlines',
    '50 AI images (1080p, clean)',
    'No watermarks on exports',
  ],
  pro: [
    '40 video ad workflows',
    '15 research reports',
    '300 captions & headlines',
    '150 AI images',
    '15 AI video ads/month',
    '5 brand profiles',
    'Community + monthly calls',
    'Priority support',
  ],
  business: [
    '100 video ad workflows',
    '40 research reports',
    '500 captions & headlines',
    '300 AI images',
    '40 AI video ads/month',
    '10 team seats',
    'White-label exports',
    'All advanced modules',
    'Dedicated account manager',
    'Weekly strategy calls',
  ],
};
