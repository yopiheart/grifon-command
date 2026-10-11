import { describe, expect, it } from 'vitest';
import { getMarketMindEvidenceAttribution } from '../../components/marketMindEvidence';

describe('MarketMind evidence attribution', () => {
  it('exposes supplied HTTP sources in prose and Markdown without claiming verification', () => {
    const result = getMarketMindEvidenceAttribution(
      '[Source-backed] Review [source](https://example.com/review). Another: http://example.org/report?q=one.',
    );
    expect(result.status).toBe('Source link supplied');
    expect(result.sources).toEqual([
      { href: 'https://example.com/review', host: 'example.com' },
      { href: 'http://example.org/report?q=one', host: 'example.org' },
    ]);
  });

  it('requires a usable URL even when the report labels a claim source-backed', () => {
    expect(getMarketMindEvidenceAttribution('[Source-backed] Customers report better results.')).toEqual({
      status: 'Attribution missing', sources: [],
    });
  });

  it('identifies user attribution without treating it as verification', () => {
    expect(getMarketMindEvidenceAttribution('[User-provided] Customer feedback supplied by the founder.')).toEqual({
      status: 'User-provided', sources: [],
    });
  });

  it('keeps user provenance when that evidence also supplies a link', () => {
    expect(getMarketMindEvidenceAttribution('[User-provided] Feedback: https://example.com/review')).toEqual({
      status: 'User-provided', sources: [{ href: 'https://example.com/review', host: 'example.com' }],
    });
  });

  it.each([
    '[Source-backed] javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ftp://example.com/review',
    'https://',
    'https://[broken',
    'https://user:password@example.com/review',
    'https://trusted.example@other.example/review',
  ])('never turns unsafe or malformed attribution into a source link: %s', evidence => {
    expect(getMarketMindEvidenceAttribution(evidence)).toEqual({ status: 'Attribution missing', sources: [] });
  });

  it('keeps valid parentheses and IPv6 addresses, and deduplicates repeated links', () => {
    expect(getMarketMindEvidenceAttribution(
      'https://example.com/review_(one) https://[::1]/report https://example.com/review_(one)',
    ).sources).toEqual([
      { href: 'https://example.com/review_(one)', host: 'example.com' },
      { href: 'https://[::1]/report', host: '[::1]' },
    ]);
  });
});
