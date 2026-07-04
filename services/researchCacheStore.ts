// Research-reuse cache — makes the producer orchestrator's designed reuse real.
//
// The orchestrator (services/producerOrchestrator.ts) already has the seam:
// researchCacheKey(brand, product) + optional getCachedResearch/putCachedResearch deps,
// but services/producerDeps.ts never wired a real store, so reuse never happened. This
// localStorage-backed store closes that gap: research stays locked per brand identity so the
// target market doesn't drift between ads for the same offer. A fresh run only happens via
// the intake "Re-research" toggle (forceFreshResearch) or a genuinely new product.

import type { MarketResearchReport } from '../types';

const STORAGE_KEY = 'grifon_research_cache_v1';
const MAX_ENTRIES = 10;

interface CacheEntry {
  report: MarketResearchReport;
  savedAt: number;
}

type CacheMap = Record<string, CacheEntry>;

/** Is this a structurally-valid entry? Guards the eviction sort (map[k].savedAt) and the
 * LaunchScreen hint against cross-tab corruption — a null / shape-broken entry must not
 * survive into the map, or `map[k].savedAt` would throw and break the never-throws contract. */
function isValidEntry(entry: unknown): entry is CacheEntry {
  return (
    !!entry &&
    typeof entry === 'object' &&
    typeof (entry as CacheEntry).report === 'object' &&
    (entry as CacheEntry).report !== null &&
    typeof (entry as CacheEntry).savedAt === 'number'
  );
}

/** Read + parse the whole cache map. Never throws — degrades to {} on corrupt/absent JSON
 * or an unavailable localStorage (SSR, private mode, disabled storage). Filters out any
 * entry that isn't a well-formed { report, savedAt } so downstream reads/eviction are safe. */
function readMap(): CacheMap {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const clean: CacheMap = {};
    for (const [key, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (isValidEntry(entry)) clean[key] = entry;
    }
    return clean;
  } catch {
    return {};
  }
}

/** Persist the map. Never throws — a failed write is a silent no-op (reuse is best-effort). */
function writeMap(map: CacheMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* no-op: storage full / unavailable — reuse degrades gracefully */
  }
}

/** Sync accessor for the LaunchScreen "using your saved research" hint. Returns the entry
 * (report + savedAt) or null when absent/corrupt. */
export function getCachedResearchEntry(key: string): { report: MarketResearchReport; savedAt: number } | null {
  const entry = readMap()[key];
  // readMap already drops malformed entries, but re-assert savedAt is numeric so the hint
  // can never render 'Invalid Date' from a stale/hand-edited payload.
  if (!isValidEntry(entry)) return null;
  return { report: entry.report, savedAt: entry.savedAt };
}

/** Orchestrator dep — resolve a cached report for a brand+product key, or null. */
export async function getCachedResearch(key: string): Promise<MarketResearchReport | null> {
  return getCachedResearchEntry(key)?.report ?? null;
}

/** Orchestrator dep — cache a report under its brand+product key. Caps the store at
 * MAX_ENTRIES, evicting the oldest savedAt beyond the cap. Never throws. */
export async function putCachedResearch(key: string, report: MarketResearchReport): Promise<void> {
  const map = readMap();
  map[key] = { report, savedAt: Date.now() };

  const keys = Object.keys(map);
  if (keys.length > MAX_ENTRIES) {
    // Evict oldest-first until we're back under the cap.
    const byAge = keys.sort((a, b) => (map[a].savedAt ?? 0) - (map[b].savedAt ?? 0));
    for (const stale of byAge.slice(0, keys.length - MAX_ENTRIES)) {
      delete map[stale];
    }
  }

  writeMap(map);
}
