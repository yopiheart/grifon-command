import { describe, it, expect } from 'vitest';

// Encodes the deferred-consume rule (PRD Decision 5): an omni ad is charged
// UNLESS a STRICT majority (>50%) of its routed scenes fell back. Tie → charged;
// empty (nothing routed) → no charge.
import { shouldConsumeOmniAd, type OmniOutcomeKind } from '../../api/_lib/omniBilling.js';

const of = (...kinds: OmniOutcomeKind[]) => kinds.map((outcome) => ({ outcome }));

describe('shouldConsumeOmniAd', () => {
  it('does NOT charge an empty (nothing-routed) pass', () => {
    expect(shouldConsumeOmniAd([])).toBe(false);
  });

  it('charges when all scenes styled', () => {
    expect(shouldConsumeOmniAd(of('styled', 'styled', 'styled'))).toBe(true);
  });

  it('charges when a styled majority (3 styled / 1 fallback)', () => {
    expect(shouldConsumeOmniAd(of('styled', 'styled', 'styled', 'fallback'))).toBe(true);
  });

  it('charges on a 2/2 tie (tie → charged)', () => {
    expect(shouldConsumeOmniAd(of('styled', 'styled', 'fallback', 'fallback'))).toBe(true);
  });

  it('does NOT charge when a strict fallback majority (1 styled / 3 fallback)', () => {
    expect(shouldConsumeOmniAd(of('styled', 'fallback', 'fallback', 'fallback'))).toBe(false);
  });

  it('does NOT charge when all scenes fell back', () => {
    expect(shouldConsumeOmniAd(of('fallback', 'fallback'))).toBe(false);
  });
});
