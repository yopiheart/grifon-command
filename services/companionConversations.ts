import { createCompanionDraft, loadCompanionDraft, type CompanionDraft } from './companionIntake';
import { isReferenceDraft, type CompanionReferenceDraft } from './companionReferenceDraft';

export interface CompanionConversation {
  id: string;
  draft: CompanionDraft;
  composer: string;
  runId: string | null;
  updatedAt: number;
  referenceDraft?: CompanionReferenceDraft;
}
export interface CompanionConversations {
  version: 1;
  revision?: number;
  userId: string;
  selectedId: string;
  chats: CompanionConversation[];
}

export function createConversation(draft = createCompanionDraft(), runId: string | null = null): CompanionConversation {
  return { id: crypto.randomUUID(), draft, composer: '', runId, updatedAt: Date.now() };
}
export function adoptConversations(userId: string, draft: CompanionDraft | null, runId: string | null): CompanionConversations {
  const chat = createConversation(draft ?? createCompanionDraft(), runId);
  return { version: 1, userId, selectedId: chat.id, chats: [chat] };
}
export function updateConversation(book: CompanionConversations, id: string, patch: Partial<Pick<CompanionConversation, 'draft' | 'composer' | 'runId' | 'referenceDraft'>>): CompanionConversations {
  const chat = book.chats.find(item => item.id === id);
  if (!chat || Object.entries(patch).every(([key, value]) => chat[key as keyof CompanionConversation] === value)) return book;
  return { ...book, chats: book.chats.map(chat => chat.id === id ? { ...chat, ...patch, updatedAt: Date.now() } : chat) };
}

export class ConversationConflictError extends Error {
  constructor() { super('Another tab saved newer chats. Keep this tab open. Save this chat as a copy to preserve both versions.'); }
}

// Image-heavy drafts stay in IndexedDB. Keep the old keys intact until and after adoption.
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('grifon_companion', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('conversations');
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('Conversation storage is busy.'));
    request.onsuccess = () => resolve(request.result);
  });
}
export async function loadConversations(userId: string): Promise<CompanionConversations> {
  const db = await openDatabase();
  try {
    const book = await new Promise<CompanionConversations | undefined>((resolve, reject) => {
      const request = db.transaction('conversations', 'readonly').objectStore('conversations').get(userId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (book) {
      if (book.version !== 1 || book.userId !== userId || !Array.isArray(book.chats) || !book.chats.length
        || !book.chats.every(chat => typeof chat.id === 'string' && typeof chat.composer === 'string' && (chat.runId === null || typeof chat.runId === 'string')
          && (chat.referenceDraft === undefined || isReferenceDraft(chat.referenceDraft))
          && loadCompanionDraft(userId, { getItem: () => JSON.stringify({ version: 1, userId, draft: chat.draft }) }))
        || !book.chats.some(chat => chat.id === book.selectedId)) throw new Error('Saved conversations could not be opened.');
      return { ...book, revision: book.revision ?? 0 };
    }
    // A denied legacy read is an error, not evidence that no previous draft exists.
    const runId = localStorage.getItem(`osa_producer_companion:${userId}`);
    const rawDraft = localStorage.getItem(`grifon_companion_draft:${userId}`);
    const draft = loadCompanionDraft(userId);
    if (rawDraft && !draft) throw new Error('The previous draft could not be opened.');
    return adoptConversations(userId, draft, runId);
  } finally { db.close(); }
}
export async function saveConversations(book: CompanionConversations): Promise<number> {
  const db = await openDatabase();
  try {
    return await new Promise<number>((resolve, reject) => {
      const transaction = db.transaction('conversations', 'readwrite');
      const store = transaction.objectStore('conversations');
      let revision = book.revision ?? 0;
      let conflict = false;
      let failure: unknown;
      transaction.oncomplete = () => resolve(revision);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(conflict ? new ConversationConflictError() : failure ?? transaction.error);
      const request = store.get(book.userId);
      request.onsuccess = () => {
        if ((request.result?.revision ?? 0) !== revision) { conflict = true; transaction.abort(); return; }
        try { revision++; store.put({ ...book, revision }, book.userId); }
        catch (error) { failure = error; transaction.abort(); }
      };
    });
  } finally { db.close(); }
}

export async function saveConversationCopy(userId: string, chat: CompanionConversation): Promise<CompanionConversations> {
  const db = await openDatabase();
  try {
    return await new Promise<CompanionConversations>((resolve, reject) => {
      const transaction = db.transaction('conversations', 'readwrite');
      const store = transaction.objectStore('conversations');
      let next: CompanionConversations;
      let failure: unknown;
      transaction.oncomplete = () => resolve(next);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(failure ?? transaction.error ?? new Error('Saved chats could not be recovered. Keep this tab open.'));
      const request = store.get(userId);
      request.onsuccess = () => {
        const latest = request.result as CompanionConversations | undefined;
        if (!latest || latest.userId !== userId || latest.version !== 1 || !Array.isArray(latest.chats)) { transaction.abort(); return; }
        try {
          const copy = { ...chat, id: crypto.randomUUID(), updatedAt: Date.now() };
          next = { ...latest, revision: (latest.revision ?? 0) + 1, selectedId: copy.id, chats: [copy, ...latest.chats] };
          store.put(next, userId);
        } catch (error) { failure = error; transaction.abort(); }
      };
    });
  } finally { db.close(); }
}
