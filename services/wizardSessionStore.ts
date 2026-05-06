import type { ClientDetails, BusinessInfo, Script, Avatar, Scene, VideoPrompt } from '../types';

export interface WizardSessionV1 {
  version: 1;
  savedAt: number;
  currentStep: number;
  clientDetails: ClientDetails;
  businessInfo: BusinessInfo;
  script: Script | null;
  language: 'English' | 'Taglish' | null;
  finalScript: string[];
  avatar: Avatar | null;
  storyboard: Scene[];
  videoPrompts: VideoPrompt[];
  aspectRatio: '9:16' | '16:9' | null;
  thumbnailUrl: string | null;
}

const DB_NAME = 'grifon_wizard';
const STORE_NAME = 'sessions';
const DB_VERSION = 1;

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
        db.createObjectStore(STORE_NAME);
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

export async function getSession(userId: string): Promise<WizardSessionV1 | null> {
  try {
    const db = await openDb();
    return await new Promise<WizardSessionV1 | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(userId);
      req.onsuccess = () => {
        const result = req.result;
        if (!result || result.version !== 1) {
          resolve(null);
        } else {
          resolve(result as WizardSessionV1);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('[wizard-session] getSession failed', err);
    return null;
  }
}

export async function setSession(userId: string, session: WizardSessionV1): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
    tx.objectStore(STORE_NAME).put(session, userId);
  });
}

export async function clearSession(userId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
      tx.objectStore(STORE_NAME).delete(userId);
    });
  } catch (err) {
    console.warn('[wizard-session] clearSession failed', err);
  }
}
