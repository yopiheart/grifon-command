import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromAccessToken } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';
import { listMedia } from '../../_lib/mediaStore.js';
import { statusKey, readSidecar } from '../../_lib/renderJob.js';
import type { FinalRenderStatus } from '../../../types.js';

// Final-render executor — LIST half (engagement Phase 4, cross-device resume).
//
// api/render/final.ts writes a per-job status sidecar to the media store at
// `${userId}/final/<jobId>.status.json`, and final/poll.ts reads ONE by jobId.
// But the client only knows its own jobIds via per-device IndexedDB, so a render
// fired on one device is invisible on another. This endpoint lists the user's
// recent render jobs (the prefix embeds the user id, so a user only ever sees
// their own) so any device can hydrate "still cooking" / "ready" state.
//
// Additive only: reuses listMedia + readSidecar + statusKey; no _lib changes.

const LIST_LIMIT = 60;
const LIST_WINDOW_SECONDS = 60;
const MAX_JOBS = 10; // cap sidecar reads — newest jobs only (sidecars reap at 48h)

const SUFFIX = '.status.json';

interface ServerRenderJob {
  jobId: string;
  status: FinalRenderStatus;
  url?: string;
  downloadUrl?: string;
  updatedAt?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const allowed = await rateLimitCheck(`render:list:${user.id}`, LIST_LIMIT, LIST_WINDOW_SECONDS);
  if (!allowed) {
    res.setHeader('Retry-After', String(LIST_WINDOW_SECONDS));
    return res.status(429).json({ error: 'rate_limited', scope: 'render-list', retry_after_seconds: LIST_WINDOW_SECONDS });
  }

  // Best-effort: a list miss must never block the dashboard from loading.
  const { entries, error } = await listMedia(`${user.id}/final`, { limit: 100, sortByCreatedDesc: true });
  if (error) return res.status(200).json({ jobs: [] });

  const jobIds = entries
    .filter((e) => !e.isFolder && e.name.endsWith(SUFFIX))
    .map((e) => e.name.slice(0, -SUFFIX.length))
    .slice(0, MAX_JOBS);

  const jobs: ServerRenderJob[] = [];
  for (const jobId of jobIds) {
    const sc = await readSidecar(statusKey(user.id, jobId));
    if (!sc) continue;
    jobs.push({ jobId, status: sc.status, url: sc.url, downloadUrl: sc.downloadUrl, updatedAt: sc.updatedAt });
  }

  return res.status(200).json({ jobs });
}
