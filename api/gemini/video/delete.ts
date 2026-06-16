import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromAccessToken } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';
import { deleteMedia } from '../../_lib/mediaStore.js';

/**
 * Phase 4h.2 — Server-side DELETE for a single library entry.
 *
 * Why server-side: the Supabase JS client's `storage.remove()` returns
 * `{ data, error }` and doesn't throw on RLS denial. A direct-client call
 * silently fails when bucket policies don't expose DELETE — which is the
 * default. Routing through this endpoint uses the service role to do the
 * actual remove, after verifying the caller owns the path.
 *
 * Ownership check: every library object lives under `${user.id}/<filename>.mp4`
 * with a sibling `<filename>.mp4.meta.json` sidecar. We reject any path that
 * does not start with the caller's user.id prefix.
 */

const DELETE_LIMIT = 20;
const DELETE_WINDOW_SECONDS = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const path: unknown = (req.body ?? {}).path;
  if (typeof path !== 'string' || path.length === 0) {
    return res.status(400).json({ error: 'invalid_body', detail: 'missing path' });
  }
  if (!path.startsWith(`${user.id}/`)) {
    // Path does not belong to the caller — refuse without leaking ownership info.
    return res.status(403).json({ error: 'forbidden_path' });
  }

  const allowed = await rateLimitCheck(
    `gemini:video-delete:${user.id}`,
    DELETE_LIMIT,
    DELETE_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(DELETE_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'video-delete',
      retry_after_seconds: DELETE_WINDOW_SECONDS,
    });
  }

  const result = await deleteMedia([path, `${path}.meta.json`]);

  if (result.error) {
    console.error('[api/gemini/video/delete] remove failed:', result.error);
    return res.status(502).json({ error: 'delete_failed', detail: result.error });
  }

  console.log('[grifon:gv:delete-done]', {
    t: Date.now(),
    userId: user.id,
    path,
    removed: result.removed,
  });

  return res.status(200).json({ deleted: true });
}
