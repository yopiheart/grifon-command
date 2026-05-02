import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin } from '../_lib/supabaseAdmin.js';

const BUCKET = 'gemini-videos';
const MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48h
const LIST_PAGE = 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (req.headers['x-vercel-cron'] !== '1') {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const admin = getSupabaseAdmin();
  const cutoff = Date.now() - MAX_AGE_MS;

  let folders: { name: string }[] = [];
  try {
    const { data, error } = await admin.storage.from(BUCKET).list('', { limit: LIST_PAGE });
    if (error) throw error;
    folders = (data ?? []).filter((entry: any) => entry?.id === null && entry?.name);
  } catch (err: any) {
    console.error('[cron/cleanup-gemini-videos] list root failed:', err?.message);
    return res.status(502).json({ error: 'list_failed', detail: err?.message });
  }

  const toDelete: string[] = [];
  const errors: string[] = [];

  for (const folder of folders) {
    try {
      const { data, error } = await admin.storage
        .from(BUCKET)
        .list(folder.name, { limit: LIST_PAGE });
      if (error) throw error;
      for (const obj of data ?? []) {
        const created = obj?.created_at ? new Date(obj.created_at).getTime() : 0;
        if (created && created < cutoff) {
          toDelete.push(`${folder.name}/${obj.name}`);
        }
      }
    } catch (err: any) {
      errors.push(`${folder.name}: ${err?.message ?? 'unknown'}`);
    }
  }

  let deleted = 0;
  if (toDelete.length > 0) {
    const BATCH = 100;
    for (let i = 0; i < toDelete.length; i += BATCH) {
      const batch = toDelete.slice(i, i + BATCH);
      const { data, error } = await admin.storage.from(BUCKET).remove(batch);
      if (error) {
        errors.push(`remove batch ${i / BATCH}: ${error.message}`);
      } else {
        deleted += data?.length ?? 0;
      }
    }
  }

  return res.status(200).json({ deleted, errors });
}
