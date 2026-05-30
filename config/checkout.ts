/**
 * Checkout tunables.
 *
 * The reservation timer is an HONEST soft-urgency device: it counts down from
 * the moment the buyer lands on checkout (persisted in sessionStorage so a
 * refresh can't reset it). When it hits zero the copy turns urgent but the
 * checkout still works — we never hard-lock or fabricate a deadline.
 */
export const CHECKOUT_RESERVATION_MINUTES = 15;
