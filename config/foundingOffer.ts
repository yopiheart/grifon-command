/**
 * Founding-member launch offer — single source of truth for the urgency bar.
 *
 * Honest scarcity only: edit these values to reflect the REAL promo. When the
 * deadline passes the bar flips to the standard-price message (see UrgencyBar).
 * `seatsClaimed` is updated manually for now (no live counter yet).
 */
export interface FoundingOffer {
  /** Master switch — set false to hide the urgency bar everywhere. */
  enabled: boolean;
  /** ISO 8601 with PH offset. When this passes, founding pricing "ends". */
  deadlineISO: string;
  /** Total founding seats and how many are taken (manually maintained). */
  seatCap: number;
  seatsClaimed: number;
  /** Display labels — confirm the real numbers before launch. */
  foundingPriceLabel: string;
  standardPriceLabel: string;
  /** Human-readable close date shown in the bar, e.g. "June 30". */
  closesLabel: string;
}

export const FOUNDING_OFFER: FoundingOffer = {
  enabled: true,
  deadlineISO: '2026-06-30T23:59:59+08:00', // TODO(Neil): set the real close date
  seatCap: 200,
  seatsClaimed: 150, // TODO(Neil): update as seats fill
  foundingPriceLabel: '₱497/mo', // TODO(Neil): confirm real founding price
  standardPriceLabel: '₱997/mo',
  closesLabel: 'June 30',
};

export const seatsRemaining = (): number =>
  Math.max(0, FOUNDING_OFFER.seatCap - FOUNDING_OFFER.seatsClaimed);
