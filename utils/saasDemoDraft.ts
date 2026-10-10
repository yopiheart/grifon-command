import { parseSaasDemoBrief, validateSaasDemoBrief, type SaasDemoBrief } from '../services/saasDemoBrief';

const DB = 'grifon-software-preparation';
const STORE = 'owner-drafts';

function ownerKey(ownerId: string): string {
  if (!ownerId.trim() || ownerId.length > 200) throw new Error('Sign in to save software preparation.');
  return ownerId;
}

function transact<T>(ownerId: string, mode: IDBTransactionMode, operation: (store: IDBObjectStore, key: string) => IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const key = ownerKey(ownerId);
    if (typeof indexedDB === 'undefined') { reject(new Error('Device storage is unavailable. Export your preparation instead.')); return; }
    let open: IDBOpenDBRequest;
    try { open = indexedDB.open(DB, 1); } catch { reject(new Error('Device storage is denied. Export your preparation instead.')); return; }
    open.onupgradeneeded = () => open.result.createObjectStore(STORE);
    open.onerror = () => reject(new Error('Could not open device storage. Export your preparation instead.'));
    open.onblocked = () => reject(new Error('Device storage is blocked by another tab. Close it and retry.'));
    open.onsuccess = () => {
      const db = open.result;
      try {
        const tx = db.transaction(STORE, mode);
        const request = operation(tx.objectStore(STORE), key);
        let result: T;
        request.onsuccess = () => { result = request.result; };
        tx.oncomplete = () => { db.close(); resolve(result); };
        tx.onabort = () => { db.close(); reject(new Error('Device save failed or storage is full. Your draft is still on this screen.')); };
        tx.onerror = () => { /* onabort reports transaction failure; request success is not a saved draft. */ };
      } catch { db.close(); reject(new Error('Device storage is unavailable. Export your preparation instead.')); }
    };
  });
}

export async function loadSaasDemoDraft(ownerId: string): Promise<SaasDemoBrief | null> {
  const value = await transact<unknown>(ownerId, 'readonly', (store, key) => store.get(key));
  return value === undefined ? null : parseSaasDemoBrief(JSON.stringify(value));
}

export async function saveSaasDemoDraft(ownerId: string, brief: SaasDemoBrief): Promise<void> {
  const checked = validateSaasDemoBrief(brief);
  await transact(ownerId, 'readwrite', (store, key) => store.put(checked, key));
}
