/**
 * VAT-inclusive price math for the checkout flow.
 *
 * Plan amounts in `paymongo.ts` PLAN_CATALOG are treated as VAT-INCLUSIVE
 * totals (per BIR-registered, Apple-PH-style display). This module derives
 * the subtotal and 12% VAT components for receipt purposes without ever
 * changing the customer-facing total.
 */

export const PH_VAT_RATE = 0.12;

export type VatBreakdown = {
  /** VAT-exclusive base amount, in centavos. */
  subtotal: number;
  /** 12% VAT, in centavos. */
  vat: number;
  /** Original VAT-inclusive total, in centavos (unchanged). */
  total: number;
};

/**
 * Split a VAT-inclusive total into its base + 12% VAT components.
 *
 * Example: 249_700 (₱2,497.00) → { subtotal: 222_946, vat: 26_754, total: 249_700 }
 */
export const splitVatInclusive = (totalCentavos: number): VatBreakdown => {
  const subtotal = Math.round(totalCentavos / (1 + PH_VAT_RATE));
  const vat = totalCentavos - subtotal;
  return { subtotal, vat, total: totalCentavos };
};

/**
 * Derive the per-month equivalent of an annual total — used by the checkout
 * summary to soften annual sticker shock ("₱2,081 / month, billed annually").
 */
export const monthlyEquivalent = (annualCentavos: number): number =>
  Math.round(annualCentavos / 12);

/**
 * Compute total savings if user picks annual over monthly.
 * Returns 0 if annual is not actually cheaper.
 */
export const annualSavingsVsMonthly = (
  annualCentavos: number,
  monthlyCentavos: number
): number => Math.max(0, monthlyCentavos * 12 - annualCentavos);
