import { afterEach, describe, expect, it, vi } from 'vitest';
import packetFixture from '../fixtures/ad-reference.synthetic.json';
import { createSaasDemoBrief, parseSaasDemoBrief, readSaasScreenshot, saasDemoGaps, validateSaasDemoBrief, MAX_SAAS_SCREENSHOT_BYTES } from '../../services/saasDemoBrief';
import { loadSaasDemoDraft, saveSaasDemoDraft } from '../../utils/saasDemoDraft';

const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a9X8AAAAASUVORK5CYII=';
const decode = vi.fn(async () => undefined);
function complete() {
  const brief = createSaasDemoBrief();
  brief.productFacts = { brandName: 'ElevenLabs', productName: 'Text to Speech', officialWebsite: 'https://elevenlabs.io/', useCaseOrOffer: 'Create a voice-over from a script' };
  brief.audienceHypothesis = 'Video creators';
  brief.creativeHypothesis = 'An audible before/after may make the benefit clear.';
  brief.cta = { text: 'Try Text to Speech', destinationUrl: 'https://elevenlabs.io/text-to-speech' };
  for (const screenshot of brief.screenshots) Object.assign(screenshot, {
    image: { dataUrl: PNG, mimeType: 'image/png', bytes: 68 }, caption: `${screenshot.slot} screen`,
    sourceUrl: 'https://elevenlabs.io/', capturedAt: '2026-10-08T01:00:00Z', ownerNote: 'I captured this screen.' });
  return brief;
}

describe('software demo preparation contract', () => {
  it('roundtrips original screenshot bytes and owner observations without generation readiness', async () => {
    const brief = complete();
    const restored = await parseSaasDemoBrief(JSON.stringify(brief), decode);
    expect(restored).toEqual(brief);
    expect(restored.preparationOnly).toBe(true);
    expect(restored.screenshots.map(s => s.image?.dataUrl)).toEqual([PNG, PNG, PNG]);
    expect(saasDemoGaps(restored)).toEqual(['No selected ad reference concept.']);
  });

  it('keeps incomplete drafts exportable while enumerating missing evidence', () => {
    const brief = validateSaasDemoBrief(createSaasDemoBrief());
    const gaps = saasDemoGaps(brief);
    expect(gaps).toContain('Brand name is missing.');
    expect(gaps).toContain('Setup screenshot is missing.');
    expect(gaps).toContain('Action screenshot is missing.');
    expect(gaps).toContain('Result screenshot is missing.');
    expect(brief.preparationOnly).toBe(true);
  });

  it('preserves selected references and flags synthetic, mismatched and unreviewed references', async () => {
    const brief = complete();
    brief.productFacts.brandName = packetFixture.subject.brandName;
    brief.productFacts.productName = packetFixture.subject.productName;
    brief.productFacts.useCaseOrOffer = packetFixture.subject.offer;
    brief.referenceBrief = { packet: structuredClone(packetFixture) as any, acceptedLimits: true, selectedConceptId: 'morning-routine' };
    const parsed = await parseSaasDemoBrief(JSON.stringify(brief), decode);
    expect(parsed.referenceBrief).toEqual(brief.referenceBrief);
    expect(saasDemoGaps(parsed).join(' ')).toContain('Synthetic fixture');
    parsed.referenceBrief!.packet.evidenceMode = 'observed';
    parsed.productFacts.brandName = 'Different';
    expect(saasDemoGaps(parsed).join(' ')).toContain('does not match');
    parsed.productFacts.brandName = packetFixture.subject.brandName;
    parsed.referenceBrief!.acceptedLimits = false;
    expect(saasDemoGaps(parsed).join(' ')).toContain('Review the observations');
  });

  it.each([
    ['generation-ready claim', (b: any) => { b.preparationOnly = false; }],
    ['extra AI fields', (b: any) => { b.productionInput = {}; }],
    ['duplicate slots', (b: any) => { b.screenshots[2].slot = 'setup'; }],
    ['remote image', (b: any) => { b.screenshots[0].image.dataUrl = 'https://example.com/image.png'; }],
    ['wrong MIME', (b: any) => { b.screenshots[0].image.mimeType = 'image/jpeg'; }],
    ['false byte count', (b: any) => { b.screenshots[0].image.bytes = 1; }],
    ['oversize asset', (b: any) => { b.screenshots[0].image.bytes = MAX_SAAS_SCREENSHOT_BYTES + 1; }],
    ['invalid date', (b: any) => { b.screenshots[0].capturedAt = '2026-02-30T01:00:00Z'; }],
    ['unsafe URL', (b: any) => { b.cta.destinationUrl = 'javascript:alert(1)'; }],
    ['credential URL', (b: any) => { b.productFacts.officialWebsite = 'https://user:pass@example.com'; }],
    ['local URL', (b: any) => { b.screenshots[0].sourceUrl = 'http://127.0.0.1/a'; }],
    ['plain HTTP official site', (b: any) => { b.productFacts.officialWebsite = 'http://example.com'; }],
    ['overlong field', (b: any) => { b.productFacts.brandName = 'x'.repeat(201); }],
  ])('rejects %s before replacing the current draft', async (_label, mutate) => {
    const current = complete();
    const imported = structuredClone(current); mutate(imported);
    await expect(parseSaasDemoBrief(JSON.stringify(imported), decode)).rejects.toThrow();
    expect(current).toEqual(complete());
  });

  it('rejects decode failure, corrupt JSON and oversized JSON without fetching', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    await expect(parseSaasDemoBrief(JSON.stringify(complete()), async () => { throw new Error('decode failed'); })).rejects.toThrow('decode failed');
    await expect(parseSaasDemoBrief('{broken', decode)).rejects.toThrow('valid JSON');
    await expect(parseSaasDemoBrief(' '.repeat(5 * 1024 * 1024), decode)).rejects.toThrow('4.5 MiB');
    expect(fetch).not.toHaveBeenCalled(); fetch.mockRestore();
  });

  it('rejects an oversized or wrong-type upload before reading or decoding', async () => {
    const arrayBuffer = vi.fn();
    await expect(readSaasScreenshot({ type: 'image/png', size: MAX_SAAS_SCREENSHOT_BYTES + 1, arrayBuffer } as any, decode)).rejects.toThrow('1 MiB');
    await expect(readSaasScreenshot({ type: 'image/svg+xml', size: 10, arrayBuffer } as any, decode)).rejects.toThrow('PNG or JPEG');
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it('retains exact uploaded PNG bytes and rejects a MIME-disguised file', async () => {
    const bytes = Uint8Array.from(atob(PNG.split(',')[1]), ch => ch.charCodeAt(0));
    const file = { type: 'image/png', size: bytes.length, arrayBuffer: async () => bytes.buffer } as File;
    expect(await readSaasScreenshot(file, decode)).toEqual({ dataUrl: PNG, mimeType: 'image/png', bytes: bytes.length });
    await expect(readSaasScreenshot({ ...file, type: 'image/jpeg' } as File, decode)).rejects.toThrow('does not match');
  });
});

describe('owner-scoped preparation persistence', () => {
  afterEach(() => vi.unstubAllGlobals());
  function storage() {
    const records = new Map<string, unknown>();
    const transactions: any[] = [];
    const open: any = {};
    const db = { close: vi.fn(), transaction: () => {
      const tx: any = { objectStore: () => ({
        get(key: string) { const req: any = {}; queueMicrotask(() => { req.result = records.get(key); req.onsuccess?.(); }); return req; },
        put(value: unknown, key: string) { const req: any = {}; queueMicrotask(() => { records.set(key, structuredClone(value)); req.result = key; req.onsuccess?.(); }); return req; },
      }) };
      transactions.push(tx); return tx;
    } };
    vi.stubGlobal('indexedDB', { open: () => { queueMicrotask(() => { open.result = db; open.onsuccess?.(); }); return open; } });
    return { records, transactions };
  }

  it('does not report success until the transaction commits', async () => {
    const state = storage();
    let saved = false;
    const pending = saveSaasDemoDraft('owner-a', createSaasDemoBrief()).then(() => { saved = true; });
    await Promise.resolve(); await Promise.resolve();
    expect(saved).toBe(false);
    expect(state.records.has('owner-a')).toBe(true);
    state.transactions[0].oncomplete();
    await pending;
    expect(saved).toBe(true);
  });

  it('keeps account keys separate and waits for read transaction completion', async () => {
    const state = storage();
    state.records.set('owner-a', complete());
    const pending = loadSaasDemoDraft('owner-b');
    await Promise.resolve(); await Promise.resolve();
    state.transactions[0].oncomplete();
    expect(await pending).toBeNull();
    expect(state.records.has('owner-a')).toBe(true);
  });

  it('reports aborted and unavailable storage as failures', async () => {
    const state = storage();
    const pending = saveSaasDemoDraft('owner-a', createSaasDemoBrief());
    await Promise.resolve(); await Promise.resolve();
    state.transactions[0].onabort();
    await expect(pending).rejects.toThrow('save failed');
    vi.stubGlobal('indexedDB', undefined);
    await expect(saveSaasDemoDraft('owner-a', createSaasDemoBrief())).rejects.toThrow('unavailable');
    await expect(saveSaasDemoDraft('', createSaasDemoBrief())).rejects.toThrow('Sign in');
  });
});
