// LocalStorage-backed recent work feed for the dashboard.
// Phase 2 modules will call recordRecentWork() at meaningful checkpoints
// (wizard completion, research report finalized, image rendered, etc.).
// Until then the dashboard records module visits as a baseline signal.

const STORAGE_KEY = 'grifon_recent_work_v1';
const MAX_ITEMS = 12;

export type RecentWorkKind = 'visit' | 'ad' | 'research' | 'storyboard' | 'image' | 'script' | 'caption';

export interface RecentItem {
  id: string;
  moduleId: string;
  title: string;
  kind: RecentWorkKind;
  ts: number;
}

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const loadRecentWork = (): RecentItem[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is RecentItem =>
      x && typeof x.id === 'string' && typeof x.moduleId === 'string' && typeof x.ts === 'number'
    );
  } catch {
    return [];
  }
};

export const recordRecentWork = (item: Omit<RecentItem, 'ts'>): RecentItem[] => {
  if (!isBrowser()) return [];
  const now = Date.now();
  const existing = loadRecentWork();
  // Dedupe by id — newer wins.
  const next: RecentItem[] = [{ ...item, ts: now }, ...existing.filter(x => x.id !== item.id)].slice(0, MAX_ITEMS);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or disabled; silent — feed is best-effort.
  }
  return next;
};

export const clearRecentWork = (): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
};
