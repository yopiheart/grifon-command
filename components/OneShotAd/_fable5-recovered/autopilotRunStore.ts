import type { AutopilotRun } from './autopilotOrchestrator';
import type { MarketResearchReport } from '../types';

/**
 * Persists a One-Shot Ad (Autopilot) run to IndexedDB so the client-side
 * orchestrator can RESUME after a tab close / reload / PC reboot on the same
 * device. v1 orchestration is client-side: the run only advances while a tab is
 * open, but its state (completed stages + intermediate artifacts) survives so
 * reopening the module rehydrates and continues from the last completed stage
 * instead of restarting from zero (and re-spending render $).
 *
 * Mirrors the proven activeJobStore.ts pattern (same non-fatal try/catch
 * envelope, userId index, TTL sweep) but in its own object store so the
 * multi-stage run state never collides with the per-render ActiveVideoJob rows.
 *
 * Cross-device / browser-closed resume is the v2 server-side-durable upgrade.
 */

const DB_NAME = 'grifon_autopilot_runs';
const STORE_NAME = 'runs';
/** Market-research cache: reuse a product's research across runs (consistent
 * targeting + saves a research call). Keyed by normalized brand+product. */
const CACHE_STORE = 'research_cache';
const DB_VERSION = 2;

/** A run older than this is almost certainly abandoned; sweep it on list. */
const RUN_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
/** Cached research older than this auto-refreshes (market/competitors drift). */
const RESEARCH_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedResearch {
  key: string;
  report: MarketResearchReport;
  createdAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'runId' });
        store.createIndex('userId', 'userId', { unique: false });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      reject(req.error);
    };
  });
  return dbPromise;
}

export async function saveAutopilotRun(run: AutopilotRun): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      tx.objectStore(STORE_NAME).put(run);
    });
  } catch (err) {
    console.warn('[autopilot-run-store] saveAutopilotRun failed (non-fatal):', err);
  }
}

export async function clearAutopilotRun(runId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      tx.objectStore(STORE_NAME).delete(runId);
    });
  } catch (err) {
    console.warn('[autopilot-run-store] clearAutopilotRun failed (non-fatal):', err);
  }
}

export async function listAutopilotRuns(userId: string): Promise<AutopilotRun[]> {
  try {
    const db = await openDb();
    return await new Promise<AutopilotRun[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('userId');
      const req = index.getAll(userId);
      req.onsuccess = () => {
        const all = (req.result as AutopilotRun[]) ?? [];
        const cutoff = Date.now() - RUN_TTL_MS;
        const fresh = all.filter((r) => r.updatedAt >= cutoff);
        const stale = all.filter((r) => r.updatedAt < cutoff);
        if (stale.length > 0) stale.forEach((r) => void clearAutopilotRun(r.runId));
        // Newest first so the module resumes the most recent run.
        resolve(fresh.sort((a, b) => b.updatedAt - a.updatedAt));
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[autopilot-run-store] listAutopilotRuns failed (non-fatal):', err);
    return [];
  }
}

/** The single in-progress (or awaiting-review) run for this user, if any. */
export async function loadActiveAutopilotRun(userId: string): Promise<AutopilotRun | null> {
  const runs = await listAutopilotRuns(userId);
  return runs.find((r) => r.status === 'running' || r.status === 'review') ?? null;
}

// --- Market-research cache (per brand+product, 30-day TTL) ------------------

/** Return cached research for this key if present AND fresh; else null. A stale
 * row is swept on read so the next run re-researches. Non-fatal: any error → null
 * (the caller just runs fresh research). */
export async function getCachedResearch(key: string): Promise<MarketResearchReport | null> {
  try {
    const db = await openDb();
    return await new Promise<MarketResearchReport | null>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readonly');
      const req = tx.objectStore(CACHE_STORE).get(key);
      req.onsuccess = () => {
        const row = req.result as CachedResearch | undefined;
        if (!row) return resolve(null);
        if (Date.now() - row.createdAt > RESEARCH_TTL_MS) {
          void clearCachedResearch(key);
          return resolve(null);
        }
        resolve(row.report);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[autopilot-run-store] getCachedResearch failed (non-fatal):', err);
    return null;
  }
}

export async function putCachedResearch(key: string, report: MarketResearchReport): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      tx.objectStore(CACHE_STORE).put({ key, report, createdAt: Date.now() } as CachedResearch);
    });
  } catch (err) {
    console.warn('[autopilot-run-store] putCachedResearch failed (non-fatal):', err);
  }
}

async function clearCachedResearch(key: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CACHE_STORE, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.objectStore(CACHE_STORE).delete(key);
    });
  } catch (err) {
    console.warn('[autopilot-run-store] clearCachedResearch failed (non-fatal):', err);
  }
}
