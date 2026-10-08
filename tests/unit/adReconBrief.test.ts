import { describe, expect, it, vi } from 'vitest';
import { execFileSync } from 'node:child_process';
import packetFixture from '../fixtures/ad-reference.synthetic.json';
import { conceptIsUsable, displayedDateElapsedDays, parseReferencePacket, referenceLimits, resolveSelectedReference, selectedReferenceAngleReport, validateReferenceBrief, validateReferencePacket } from '../../services/adReconBrief.js';
import type { AdReferencePacket, MarketResearchReport } from '../../types.js';

const packet = (): AdReferencePacket => structuredClone(packetFixture) as AdReferencePacket;
const review = () => ({ packet: { ...packet(), evidenceMode: 'observed' as const }, selectedConceptId: 'morning-routine', acceptedLimits: true });

describe('local ad reference contract', () => {
  it('accepts the fixture as synthetic review, never production evidence', () => {
    const p = validateReferencePacket(packet());
    expect(p.evidenceMode).toBe('synthetic');
    expect(conceptIsUsable(p, p.concepts[0])).toBe(true);
    expect(resolveSelectedReference({ ...review(), packet: p }, p.subject, false)?.id).toBe('morning-routine');
    expect(() => resolveSelectedReference({ ...review(), packet: p }, p.subject)).toThrow('not production-ready');
    expect(referenceLimits(p)).toContain('Operator-recorded observations are not independently verified by importing this file.');
  });

  it('computes displayed-date elapsed time only at the recorded observation', () => {
    const source = packet().sources[0];
    expect(displayedDateElapsedDays(source)).toBe(7);
    expect(displayedDateElapsedDays({ ...source, startDate: null })).toBeNull();
  });

  it.each([
    ['non-Meta ad URL', (p: AdReferencePacket) => { p.sources[0].sourceUrl = 'https://facebook.com.evil.example/ads/library/?id=200000000001'; }],
    ['URL-only date filter', (p: AdReferencePacket) => { p.sources[0].sourceUrl += '&start_date[max]=2026-10-01'; }],
    ['duplicate library ID', (p: AdReferencePacket) => { p.sources.push({ ...p.sources[0], id: 'duplicate' }); }],
    ['wrong identity pin', (p: AdReferencePacket) => { p.competitors[0].identitySourceUrl = 'https://www.facebook.com/ads/library/?view_all_page_id=12345'; }],
    ['conflicting advertiser pins', (p: AdReferencePacket) => { p.competitors[0].identitySourceUrl += '&view_all_page_id=999999999'; }],
    ['conflicting profile IDs', (p: AdReferencePacket) => { p.competitors[0].identitySourceUrl = 'https://www.facebook.com/profile.php?id=100000000001&id=999999999'; }],
    ['dangling source', (p: AdReferencePacket) => { p.concepts[0].sourceIds = ['missing']; }],
    ['unrelated observation', (p: AdReferencePacket) => { p.concepts[0].observationIds = ['missing']; }],
    ['missing source observations', (p: AdReferencePacket) => { p.sources[0].observations = []; }],
    ['cosmetic angle duplicate', (p: AdReferencePacket) => { p.concepts[2].sellingAngle = `  ${p.concepts[0].sellingAngle.toUpperCase()}  `; }],
    ['cosmetic problem duplicate', (p: AdReferencePacket) => { p.concepts[2].customerProblem = p.concepts[0].customerProblem; }],
    ['impossible date', (p: AdReferencePacket) => { p.sources[0].startDate = '2026-02-30'; }],
    ['future displayed date', (p: AdReferencePacket) => { p.sources[0].startDate = '2026-10-09'; }],
    ['future observation', (p: AdReferencePacket) => { p.observedAt = '2099-01-01T00:00:00Z'; }],
    ['unknown evidence mode', (p: AdReferencePacket) => { (p as any).evidenceMode = 'verified'; }],
    ['supplied approval', (p: AdReferencePacket) => { (p as any).paidApproved = true; }],
    ['missing incomplete limits', (p: AdReferencePacket) => { p.competitors[0].limitations = []; }],
    ['too many concepts', (p: AdReferencePacket) => { p.concepts.push({ ...p.concepts[0], id: 'fourth' }); }],
  ])('rejects %s', (_label, mutate) => {
    const p = packet(); mutate(p);
    expect(() => validateReferencePacket(p)).toThrow('Ad references:');
  });

  it('rejects oversized raw whitespace before JSON parsing and does not fetch', () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    expect(() => parseReferencePacket(' '.repeat(65537))).toThrow('64 KiB');
    parseReferencePacket(JSON.stringify(packet()));
    expect(fetch).not.toHaveBeenCalled();
    fetch.mockRestore();
  });

  it('allows eligible partial sources but blocks unknown, blocked, inactive, and unknown-activity sources', () => {
    const b = review();
    expect(resolveSelectedReference(b, b.packet.subject)?.id).toBe('morning-routine');
    for (const state of ['blocked', 'unknown'] as const) {
      b.packet.competitors[0].collectionStatus = state;
      expect(() => resolveSelectedReference(b, b.packet.subject)).toThrow('usable collection evidence');
    }
    b.packet.competitors[0].collectionStatus = 'partial';
    for (const activity of ['inactive', 'unknown'] as const) {
      b.packet.sources[0].activity = activity;
      expect(() => resolveSelectedReference(b, b.packet.subject)).toThrow('active source');
    }
  });

  it('keeps unused blocked collections visible without disqualifying an eligible concept', () => {
    const b = review();
    b.packet.competitors.push({ ...b.packet.competitors[0], id: 'blocked-other', name: 'Blocked Example', pageId: '100000000002',
      identitySourceUrl: 'https://www.facebook.com/ads/library/?view_all_page_id=100000000002', collectionStatus: 'blocked', limitations: ['Access blocked.'] });
    expect(resolveSelectedReference(b, b.packet.subject)?.id).toBe('morning-routine');
    expect(referenceLimits(b.packet)).toContain('Blocked Example: Access blocked.');
  });

  it('requires explicit review and binds the selected evidence to brand/product/offer', () => {
    const b = review();
    expect(() => resolveSelectedReference({ ...b, acceptedLimits: false }, b.packet.subject)).toThrow('Review the observations');
    for (const key of ['brandName', 'productName', 'offer'] as const) {
      expect(() => resolveSelectedReference(b, { ...b.packet.subject, [key]: 'Different' })).toThrow(`packet ${key} does not match`);
    }
    expect(resolveSelectedReference(b, { ...b.packet.subject, brandName: ' RECOVERY  COFFEE ' })?.id).toBe('morning-routine');
  });

  it('revalidates nested stored values; an imported review cannot grant paid approval', () => {
    const b = review();
    b.packet.sources[0].libraryId = 'wrong';
    expect(() => validateReferenceBrief(b)).toThrow('numeric Meta ID');
    expect(() => validateReferenceBrief({ ...review(), productionApproved: true })).toThrow('unsupported fields');
  });

  it('projects only our selected concept, preserving generated research and raw evidence', () => {
    const b = review();
    const report = { fbAdLibraryAngles: [{ format: 'UGC', angle: 'Existing angle', openingLine: 'Generated line', whyItWorks: 'Generated hypothesis' }], rawEvidence: ['Generated evidence'] } as MarketResearchReport;
    const result = selectedReferenceAngleReport(b, b.packet.subject, report);
    expect(result.fbAdLibraryAngles[0].openingLine).toBe(b.packet.concepts[0].hook);
    expect(result.fbAdLibraryAngles[0].angle).toContain(b.packet.concepts[0].originalProof);
    expect(result.fbAdLibraryAngles[0].angle).not.toContain(b.packet.sources[0].observations[0].text);
    expect(result.rawEvidence).toBe(report.rawEvidence);
    expect(report.fbAdLibraryAngles[0].angle).toBe('Existing angle');
    expect(selectedReferenceAngleReport(undefined, b.packet.subject, report)).toBe(report);
    expect(selectedReferenceAngleReport({ ...b, selectedConceptId: undefined }, b.packet.subject, report)).toBe(report);
  });

  it('runs the deterministic CLI with no network and a synthetic status', () => {
    const output = execFileSync(process.execPath, ['tools/ad-recon-brief.mjs', '--input', 'tests/fixtures/ad-reference.synthetic.json'], { encoding: 'utf8' });
    expect(JSON.parse(output)).toMatchObject({ valid: true, evidenceMode: 'synthetic' });
    expect(() => execFileSync(process.execPath, ['tools/ad-recon-brief.mjs', '--input'], { encoding: 'utf8', stdio: 'pipe' })).toThrow();
  });
});
