import { createCompanionDraft, loadCompanionDraft, type CompanionDraft } from './companionIntake';

export interface CompanionConversation {
  id: string;
  draft: CompanionDraft;
  composer: string;
  runId: string | null;
  updatedAt: number;
}
export interface CompanionConversations {
  version: 1;
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
export function updateConversation(book: CompanionConversations, id: string, patch: Partial<Pick<CompanionConversation, 'draft' | 'composer' | 'runId'>>): CompanionConversations {
  return { ...book, chats: book.chats.map(chat => chat.id === id ? { ...chat, ...patch, updatedAt: Date.now() } : chat) };
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
          && loadCompanionDraft(userId, { getItem: () => JSON.stringify({ version: 1, userId, draft: chat.draft }) }))
        || !book.chats.some(chat => chat.id === book.selectedId)) throw new Error('Saved conversations could not be opened.');
      return book;
    }
    // A denied legacy read is an error, not evidence that no previous draft exists.
    const runId = localStorage.getItem(`osa_producer_companion:${userId}`);
    const rawDraft = localStorage.getItem(`grifon_companion_draft:${userId}`);
    const draft = loadCompanionDraft(userId);
    if (rawDraft && !draft) throw new Error('The previous draft could not be opened.');
    return adoptConversations(userId, draft, runId);
  } finally { db.close(); }
}
export async function saveConversations(book: CompanionConversations): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction('conversations', 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      transaction.objectStore('conversations').put(book, book.userId);
    });
  } finally { db.close(); }
}
