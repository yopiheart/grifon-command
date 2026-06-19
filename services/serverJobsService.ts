// Cross-device render-job awareness (engagement Phase 4).
//
// Final renders fire server-side and their status lives in a server Storage
// sidecar, but the client only knows its own jobIds via per-device IndexedDB.
// This service reads the per-user list endpoint (api/render/final/list.ts) so
// ANY device can see in-flight and just-finished renders — and a "seen" ledger
// keeps a finished render from re-notifying on every device/reload.

import { getSupabase } from './supabaseClient';

export type ServerRenderStatus = 'processing' | 'done' | 'failed';

export interface ServerRenderJob {
  jobId: string;
  status: ServerRenderStatus;
  url?: string;
  downloadUrl?: string;
  updatedAt?: string;
}

const isBrowser = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const VALID_STATUS = new Set<ServerRenderStatus>(['processing', 'done', 'failed']);

/** Defensive parse of the list endpoint payload — drops anything malformed. */
export const parseServerRenderJobs = (payload: any): ServerRenderJob[] => {
  const arr = Array.isArray(payload?.jobs) ? payload.jobs : [];
  const out: ServerRenderJob[] = [];
  for (const j of arr) {
    if (!j || typeof j.jobId !== 'string' || !VALID_STATUS.has(j.status)) continue;
    out.push({
      jobId: j.jobId,
      status: j.status,
      url: typeof j.url === 'string' ? j.url : undefined,
      downloadUrl: typeof j.downloadUrl === 'string' ? j.downloadUrl : undefined,
      updatedAt: typeof j.updatedAt === 'string' ? j.updatedAt : undefined,
    });
  }
  return out;
};

/** Fetch the current user's recent render jobs. Best-effort: returns [] on any failure. */
export const listServerRenderJobs = async (): Promise<ServerRenderJob[]> => {
  try {
    const sb = getSupabase();
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return [];
    const res = await fetch('/api/render/final/list', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return parseServerRenderJobs(await res.json());
  } catch {
    return [];
  }
};

// --- "Seen" ledger -----------------------------------------------------------
// Dedupes the cross-device "your render finished" notification so it fires once,
// not on every dashboard load or every device.

const SEEN_KEY = 'grifon_seen_render_jobs_v1';
const SEEN_MAX = 50;

export const getSeenRenderJobs = (): string[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(SEEN_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
};

export const hasSeenRenderJob = (jobId: string): boolean => getSeenRenderJobs().includes(jobId);

export const markRenderJobSeen = (jobId: string): void => {
  if (!isBrowser()) return;
  const existing = getSeenRenderJobs();
  if (existing.includes(jobId)) return;
  // Newest first, capped — old jobIds fall off (their sidecars reap at 48h anyway).
  const next = [jobId, ...existing].slice(0, SEEN_MAX);
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(next));
  } catch {
    // storage full/disabled — ledger is best-effort.
  }
};
