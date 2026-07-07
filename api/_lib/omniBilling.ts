// api/_lib/omniBilling.ts — PURE, client-importable billing rule for the Omni
// "Applying style" pass (Slice 3b). No server imports, so both the consume
// endpoint (server) and the EditVideo UI (client) can share the exact same
// deferred-consume decision.

export type OmniOutcomeKind = 'styled' | 'fallback';

/** Deferred-consume rule (PRD Decision 5): the ad is charged UNLESS a STRICT
 *  majority (>50%, PRD tunables) of its Omni-routed scenes fell back.
 *  Tie (e.g. 2 of 4) → charged. Empty (nothing routed) → no charge. */
export const shouldConsumeOmniAd = (outcomes: readonly { outcome: OmniOutcomeKind }[]): boolean => {
  if (outcomes.length === 0) return false;
  const fallback = outcomes.filter((o) => o.outcome === 'fallback').length;
  return fallback * 2 <= outcomes.length;
};
