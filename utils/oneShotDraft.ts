/**
 * oneShotDraft — durable autosave of the One-Shot Ad brief.
 *
 * The One-Shot composer holds its brief in local component state, so a navigation,
 * reload, lost connection, or closed browser would lose everything the user filled
 * in — the single most expensive thing they create before converting. This store
 * persists the brief to IndexedDB (chosen over localStorage because the hero /
 * presenter / asset photos are large base64 images that would blow the ~5MB
 * localStorage quota; IndexedDB comfortably holds them).
 *
 * A synchronous in-memory mirror (`memCache`) backs `loadOneShotDraft()` so the
 * composer can restore instantly during a session; `hydrateOneShotDraft()` pulls
 * the durable copy on a cold start. The container uses the warm/cold distinction
 * to decide between a silent restore (same session) and a "Resume / Start fresh"
 * prompt (cold).
 *
 * Lifecycle: autosaved (debounced) while editing → restored on return → cleared
 * on launch, an explicit Reset, or "Start fresh".
 */
import type { BusinessInfo } from '../types';
import type { ProductionInput } from '../services/oneShotIntake';
import type { ServiceArchetype, RealEstateArchetype } from '../components/guidedPhotoSlots';
import type { RecipeId } from '../components/OneShotAd/recipes';

type ServicePhoto = NonNullable<BusinessInfo['servicePhotos']>[number];

export interface OneShotDraft {
  hero: string;
  offer: string;
  brandName: string;
  price: string;
  forceFresh: boolean;
  servicePhotos: ServicePhoto[];
  serviceArchetype: ServiceArchetype;
  reArchetype: RealEstateArchetype;
  localService: boolean;
  businessAddress: string;
  vertical: string;
  format: 'ugc' | 'product_ugc' | 'ugc_pro' | 'commercial';
  strategy: 'Testimonial' | 'MrBeast';
  /** The named recipe the composer showed — a preset over format/strategy/ugcProChoice/asmr.
   * The four axis fields above are still saved (derived) so older readers stay valid. */
  recipe?: RecipeId;
  /** UGC Pro sub-format pick. 'auto' → the server classifies the sub-format from the brief. */
  ugcProChoice?: 'auto' | 'tryon' | 'unboxing' | 'demo' | 'transformation' | 'tutorial';
  /** UGC Pro: audio-led ASMR flavor (Unboxing only). Off by default. */
  asmrFlag?: boolean;
  presenterMode: 'auto' | 'upload';
  gender: 'Any' | 'Male' | 'Female';
  ageRange: string;
  ethnicity: string;
  avatarUrl: string;
  language: ProductionInput['language'];
  aspectRatio: ProductionInput['aspectRatio'];
  resolution: NonNullable<ProductionInput['resolution']>;
  voiceId: string;
}

const DB_NAME = 'grifon-oneshot';
const STORE = 'draft';
const KEY = 'current';

let memCache: OneShotDraft | null = null;
let hydrated = false;

const idbAvailable = (): boolean => typeof indexedDB !== 'undefined';

/** Open the DB, run one request against the store, resolve its result. Resolves
 * null on any failure (private mode, quota, no IndexedDB) — autosave is
 * best-effort and must never throw into the UI. */
function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest,
): Promise<T | null> {
  return new Promise((resolve) => {
    if (!idbAvailable()) { resolve(null); return; }
    let open: IDBOpenDBRequest;
    try {
      open = indexedDB.open(DB_NAME, 1);
    } catch {
      resolve(null);
      return;
    }
    open.onupgradeneeded = () => {
      if (!open.result.objectStoreNames.contains(STORE)) open.result.createObjectStore(STORE);
    };
    open.onerror = () => resolve(null);
    open.onsuccess = () => {
      const db = open.result;
      try {
        const tx = db.transaction(STORE, mode);
        const req = run(tx.objectStore(STORE));
        req.onsuccess = () => resolve((req.result as T) ?? null);
        req.onerror = () => resolve(null);
        tx.oncomplete = () => db.close();
      } catch {
        resolve(null);
      }
    };
  });
}

/** Pull the durable draft into the in-memory mirror once (cold start). */
export async function hydrateOneShotDraft(): Promise<OneShotDraft | null> {
  if (hydrated) return memCache;
  const v = await withStore<OneShotDraft>('readonly', (s) => s.get(KEY));
  memCache = v ?? null;
  hydrated = true;
  return memCache;
}

/** Synchronous read of the in-memory mirror (warm — populated this session). */
export const loadOneShotDraft = (): OneShotDraft | null => memCache;

export const saveOneShotDraft = (d: OneShotDraft): void => {
  memCache = d;
  hydrated = true;
  void withStore('readwrite', (s) => s.put(d, KEY));
};

export const clearOneShotDraft = (): void => {
  memCache = null;
  hydrated = true;
  void withStore('readwrite', (s) => s.delete(KEY));
};
