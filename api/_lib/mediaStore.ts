import { getSupabaseAdmin } from './supabaseAdmin.js';
import * as r2 from './r2.js';

// MEDIA_STORE facade — the single seam between the storage call sites (video
// polls, voice consolidate, final render, library, delete) and the underlying
// object store. Heavy media on Supabase Storage is metered egress; serving the
// same MP4s repeatedly blew the free-tier quota (see STORAGE_AUDIT.md). This
// facade lets us move the bytes to Cloudflare R2 (zero egress) behind a flag,
// flipping every call site atomically with no per-handler churn.
//
//   MEDIA_STORE='supabase'  (default) — behaviour identical to before this seam.
//   MEDIA_STORE='r2'                  — same operations against R2 via api/_lib/r2.ts.
//
// One private bucket, one `${uid}/...` key scheme; ownership checks stay upstream.

const BUCKET = 'gemini-videos';

const useR2 = (): boolean => process.env.MEDIA_STORE === 'r2';

export interface PutOpts {
  cacheControl?: string;
  upsert?: boolean;
}

export interface SignOpts {
  downloadName?: string;
}

export interface ListOpts {
  limit?: number;
  sortByCreatedDesc?: boolean;
}

export interface MediaListEntry {
  name: string; // relative to the listed prefix, matching Supabase's list() shape
  isFolder: boolean;
  createdAt: string | null;
  size: number | null;
}

export const putMedia = async (
  key: string,
  body: Buffer,
  contentType: string,
  opts: PutOpts = {}
): Promise<{ error: string | null }> => {
  if (useR2()) {
    try {
      await r2.putObject(key, body, contentType, opts.cacheControl);
      return { error: null };
    } catch (err: any) {
      return { error: err?.message ?? 'r2_put_failed' };
    }
  }
  const admin = getSupabaseAdmin();
  const { error } = await admin.storage.from(BUCKET).upload(key, body, {
    contentType,
    cacheControl: opts.cacheControl ?? '3600',
    upsert: opts.upsert ?? false,
  });
  return { error: error?.message ?? null };
};

export const getMediaUrl = async (
  key: string,
  ttlSec: number,
  opts: SignOpts = {}
): Promise<{ url: string | null; error: string | null }> => {
  if (useR2()) {
    try {
      const url = await r2.presignGet(key, ttlSec, opts.downloadName);
      return { url, error: null };
    } catch (err: any) {
      return { url: null, error: err?.message ?? 'r2_sign_failed' };
    }
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage
    .from(BUCKET)
    .createSignedUrl(key, ttlSec, opts.downloadName ? { download: opts.downloadName } : undefined);
  return { url: data?.signedUrl ?? null, error: error?.message ?? null };
};

export const downloadMediaText = async (
  key: string
): Promise<{ text: string | null; error: string | null }> => {
  if (useR2()) {
    try {
      const text = await r2.getObjectText(key);
      return { text, error: text === null ? 'not_found' : null };
    } catch (err: any) {
      return { text: null, error: err?.message ?? 'r2_get_failed' };
    }
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage.from(BUCKET).download(key);
  if (error || !data) return { text: null, error: error?.message ?? 'not_found' };
  return { text: await data.text(), error: null };
};

export const listMedia = async (
  prefix: string,
  opts: ListOpts = {}
): Promise<{ entries: MediaListEntry[]; error: string | null }> => {
  if (useR2()) {
    try {
      const { objects, prefixes } = await r2.listPrefix(prefix, opts.limit);
      const base = prefix ? (prefix.endsWith('/') ? prefix : `${prefix}/`) : '';
      const fileEntries: MediaListEntry[] = objects.map((o) => ({
        name: base && o.key.startsWith(base) ? o.key.slice(base.length) : o.key,
        isFolder: false,
        createdAt: o.lastModified,
        size: o.size,
      }));
      const folderEntries: MediaListEntry[] = prefixes.map((p) => {
        const rel = base && p.startsWith(base) ? p.slice(base.length) : p;
        return { name: rel.replace(/\/$/, ''), isFolder: true, createdAt: null, size: null };
      });
      let entries = [...folderEntries, ...fileEntries];
      if (opts.sortByCreatedDesc) {
        entries = entries.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
      }
      return { entries, error: null };
    } catch (err: any) {
      return { entries: [], error: err?.message ?? 'r2_list_failed' };
    }
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage.from(BUCKET).list(prefix, {
    limit: opts.limit,
    ...(opts.sortByCreatedDesc ? { sortBy: { column: 'created_at', order: 'desc' as const } } : {}),
  });
  if (error) return { entries: [], error: error.message };
  const entries: MediaListEntry[] = (data ?? []).map((e: any) => ({
    name: e.name,
    isFolder: e.id === null, // Supabase marks pseudo-folders with a null id
    createdAt: e.created_at ?? null,
    size: typeof e.metadata?.size === 'number' ? e.metadata.size : null,
  }));
  return { entries, error: null };
};

export const deleteMedia = async (keys: string[]): Promise<{ removed: number; error: string | null }> => {
  if (useR2()) {
    try {
      await r2.deleteObjects(keys);
      return { removed: keys.length, error: null };
    } catch (err: any) {
      return { removed: 0, error: err?.message ?? 'r2_delete_failed' };
    }
  }
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.storage.from(BUCKET).remove(keys);
  return { removed: data?.length ?? 0, error: error?.message ?? null };
};
