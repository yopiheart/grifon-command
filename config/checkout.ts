/**
 * Checkout tunables.
 *
 * The reservation timer is an HONEST soft-urgency device: it counts down from
 * the moment the buyer lands on checkout (persisted in sessionStorage so a
 * refresh can't reset it). When it hits zero the copy turns urgent but the
 * checkout still works — we never hard-lock or fabricate a deadline.
 */
export const CHECKOUT_RESERVATION_MINUTES = 15;

/**
 * Order-bump add-on shown on checkout. DISPLAY ONLY — the real charge is
 * server-authoritative in api/_lib/paymongo.ts (ADD_ON_CATALOG). Keep `id` and
 * `priceLabel` in sync with that catalog entry.
 */
export const ORDER_BUMP = {
  id: 'onboarding_call',
  title: '1-on-1 Onboarding Call',
  blurb: 'Add a 30-min setup & strategy call — we map your first winning ad with you, live.',
  priceLabel: '₱997',
} as const;
