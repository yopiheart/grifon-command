import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { MarketResearchReport } from '../../types.js';
import {
  getCachedResearch,
  putCachedResearch,
  getCachedResearchEntry,
} from '../../services/researchCacheStore.js';

// The store reads the bare global `localStorage` (browser API). vitest runs in `node`, so
// stand up a minimal Map-backed fake we can also corrupt / make throw per test.
class FakeStorage {
  private map = new Map<string, string>();
  throwOnGet = false;
  getItem(key: string): string | null {
    if (this.throwOnGet) throw new Error('storage unavailable');
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, value);
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
  /** Test-only: force a corrupt payload under the store's key. */
  poison(key: string, raw: string): void {
    this.map.set(key, raw);
  }
}

const STORAGE_KEY = 'grifon_research_cache_v1';

// Minimal stand-in for a full report — the store treats it as an opaque blob.
const fakeReport = (tag: string): MarketResearchReport =>
  ({ bigIdea: `idea-${tag}` } as unknown as MarketResearchReport);

let storage: FakeStorage;

beforeEach(() => {
  storage = new FakeStorage();
  vi.stubGlobal('localStorage', storage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('researchCacheStore', () => {
  it('roundtrips a put then get on the same key', async () => {
    await putCachedResearch('brand::product', fakeReport('a'));
    const got = await getCachedResearch('brand::product');
    expect(got).not.toBeNull();
    expect(got?.bigIdea).toBe('idea-a');
  });

  it('returns null on a missing key', async () => {
    expect(await getCachedResearch('nope::nope')).toBeNull();
  });

  it('caps at 10 entries, evicting the oldest savedAt', async () => {
    // Monotonic clock so each entry has a strictly increasing savedAt (eviction is age-based).
    let t = 1_000;
    vi.spyOn(Date, 'now').mockImplementation(() => (t += 1_000));

    for (let i = 0; i < 11; i++) {
      await putCachedResearch(`key-${i}`, fakeReport(String(i)));
    }

    // key-0 was the oldest of 11 → evicted; the newest 10 (key-1..key-10) survive.
    expect(await getCachedResearch('key-0')).toBeNull();
    for (let i = 1; i < 11; i++) {
      expect(await getCachedResearch(`key-${i}`)).not.toBeNull();
    }
  });

  it('returns null on a corrupt payload, and a subsequent put recovers the store', async () => {
    storage.poison(STORAGE_KEY, '{ this is not valid json');
    expect(await getCachedResearch('brand::product')).toBeNull();

    // A put must overwrite the corrupt blob with a valid map, not compound the corruption.
    await putCachedResearch('brand::product', fakeReport('recovered'));
    const got = await getCachedResearch('brand::product');
    expect(got?.bigIdea).toBe('idea-recovered');
  });

  it('getCachedResearchEntry exposes savedAt', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    await putCachedResearch('brand::product', fakeReport('x'));

    const entry = getCachedResearchEntry('brand::product');
    expect(entry).not.toBeNull();
    expect(entry?.savedAt).toBe(1_700_000_000_000);
    expect(entry?.report.bigIdea).toBe('idea-x');
    expect(getCachedResearchEntry('missing::key')).toBeNull();
  });
});
