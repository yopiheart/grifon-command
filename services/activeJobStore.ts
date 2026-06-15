import type { VideoModelType } from '../types';

/**
 * In-flight Veo render persisted to IndexedDB so the client can resume polling
 * after a tab close / browser restart / PC reboot on the same device. The
 * server-side poll endpoint (api/gemini/video/poll.ts) does the download +
 * upload to Supabase Storage when the client asks — but if the client never
 * comes back to ask, the rendered file never lands and the credit is wasted.
 *
 * On app mount, GenerateVideo lists active jobs for the current user and
 * resumes polling each one. Cross-device resume requires server-side job
 * polling (Phase 5d) — this IndexedDB store covers same-device disconnect.
 */
export interface ActiveVideoJob {
  jobId: string;                // crypto.randomUUID() at submit time
  userId: string;
  operation: any;               // Veo operation handle (has .name field for polling URL)
  prompt: string;
  sceneIdx?: number;            // undefined for one-shot renders
  model: VideoModelType;
  aspectRatio: string;
  duration: number;
  resolution: string;
  submittedAt: number;          // Date.now() — used to expire stale entries
}

const DB_NAME = 'grifon_active_jobs';
const STORE_NAME = 'jobs';
const DB_VERSION = 1;

/** Hard cap on how long we'll attempt to resume a job. Veo operations TTL
 * a few hours; anything past that almost certainly 404s on the poll. */
const RESUME_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

let dbPromise: Promise<IDBDatabase> | null = null;
// Cooldown after a hard open failure (private mode, blocked storage, quota) so
// we don't re-attempt indexedDB.open on every save/clear/list call.
let openFailedUntil = 0;
const OPEN_BACKOFF_MS = 5000;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  if (Date.now() < openFailedUntil) {
    return Promise.reject(new Error('IndexedDB open recently failed — backing off'));
  }
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      openFailedUntil = Date.now() + OPEN_BACKOFF_MS;
      reject(new Error('IndexedDB not available'));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'jobId' });
        store.createIndex('userId', 'userId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => {
      dbPromise = null;
      openFailedUntil = Date.now() + OPEN_BACKOFF_MS;
      reject(req.error);
    };
  });
  return dbPromise;
}

export async function saveActiveJob(job: ActiveVideoJob): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      tx.objectStore(STORE_NAME).put(job);
    });
  } catch (err) {
    console.warn('[active-job-store] saveActiveJob failed (non-fatal):', err);
  }
}

export async function clearActiveJob(jobId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      tx.objectStore(STORE_NAME).delete(jobId);
    });
  } catch (err) {
    console.warn('[active-job-store] clearActiveJob failed (non-fatal):', err);
  }
}

export async function listActiveJobs(userId: string): Promise<ActiveVideoJob[]> {
  try {
    const db = await openDb();
    return await new Promise<ActiveVideoJob[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('userId');
      const req = index.getAll(userId);
      req.onsuccess = () => {
        const all = (req.result as ActiveVideoJob[]) ?? [];
        const cutoff = Date.now() - RESUME_TTL_MS;
        const fresh = all.filter((j) => j.submittedAt >= cutoff);
        // Best-effort sweep of stale entries (don't block on this).
        const stale = all.filter((j) => j.submittedAt < cutoff);
        if (stale.length > 0) {
          stale.forEach((j) => void clearActiveJob(j.jobId));
        }
        resolve(fresh);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[active-job-store] listActiveJobs failed (non-fatal):', err);
    return [];
  }
}
