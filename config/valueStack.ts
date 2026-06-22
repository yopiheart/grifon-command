// Single source of truth for the Pro-anchored value stack shown on BOTH the
// landing OfferStack and the pricing page, so the two can never drift again.
// (Prior state: landing showed a ₱66k annual module-license stack while pricing
// showed this ₱135k deliverable stack — two different offers for one product.)
//
// Deliverable-based and anchored to Pro (the hero tier): quantities mirror Pro's
// monthly limits in utils/planGate.ts (40 workflows/scripts, 15 reports, 300
// captions, 150 images, 8 finished video ads). Each line is priced at the
// standalone rate it would cost from a freelancer/agency; the total anchors
// against Pro's ₱2,497/mo so the Hormozi value:price ratio reads well over 5×.
export interface ValueStackEntry {
  item: string;
  value: string;
}

export const PRO_VALUE_STACK: ValueStackEntry[] = [
  { item: '40 AI Video Ad Scripts', value: '₱20,000' },
  { item: '15 Deep Market Research Reports', value: '₱22,500' },
  { item: '15 Offer Optimizations', value: '₱15,000' },
  { item: '300 Ad Captions & Headlines', value: '₱15,000' },
  { item: '150 AI Ad Images', value: '₱15,000' },
  { item: '8 Finished AI Video Ads', value: '₱40,000' },
  { item: 'Monthly Strategy Call', value: '₱5,000' },
  { item: 'Private Community Access', value: '₱2,500' },
];

export const PRO_VALUE_TOTAL = '₱135,000';

// The hero offer the stack anchors against (Pro, monthly). Founding framing is
// real scarcity: the beta price is genuinely below the post-launch price and is
// locked for life for the first cohort.
export const PRO_PRICE_LABEL = '₱2,497/mo';
export const FOUNDING_NOTE = 'Founding rate · locked for life · price rises after beta';
