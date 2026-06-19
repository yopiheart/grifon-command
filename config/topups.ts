/**
 * Top-up purchase display catalog (Slice 6c). DISPLAY ONLY — the real charge and
 * the granted credits are server-authoritative in api/_lib/paymongo.ts
 * (ADD_ON_CATALOG) and api/webhook.ts. Keep `id` + `priceLabel` + `credits` in
 * sync with that catalog.
 *
 * Only the standard finished-ad top-ups are surfaced. The cinematic top-up
 * (video_ad_cinematic) is intentionally omitted: its credit is granted but not
 * yet consumed (the Commercial/Spec render path sends no cinematic signal to the
 * server) — see api/_lib/credits.ts. Add it here once consumption is wired.
 */
export type TopUpId = 'video_ad_single' | 'video_ad_pack5';

export type TopUpDisplay = {
  id: TopUpId;
  name: string;
  /** Matches ADD_ON_CATALOG[id].centavos / 100. */
  priceLabel: string;
  /** Matches ADD_ON_CATALOG[id].videoAdCredits. */
  credits: number;
  blurb: string;
};

export const TOPUPS: Record<TopUpId, TopUpDisplay> = {
  video_ad_single: {
    id: 'video_ad_single',
    name: '1 Extra Video Ad',
    priceLabel: '₱499',
    credits: 1,
    blurb: 'Render one more finished ad — no subscription needed.',
  },
  video_ad_pack5: {
    id: 'video_ad_pack5',
    name: '5 Extra Video Ads',
    priceLabel: '₱2,250',
    credits: 5,
    blurb: 'Five more finished ads at the best per-ad price (₱450/ad).',
  },
};

export const isTopUpId = (value: string | null | undefined): value is TopUpId =>
  value === 'video_ad_single' || value === 'video_ad_pack5';
