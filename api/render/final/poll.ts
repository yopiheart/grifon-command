import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromAccessToken } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';
import { statusKey, readSidecar, writeSidecar, isRenderStalled } from '../../_lib/renderJob.js';
import { getRequestId } from '../../_lib/requestId.js';
import type { FinalRenderResult } from '../../../types.js';

// Final-render executor — POLL half. Reads the status sidecar written by
// api/render/final.ts. The key embeds the user id, so a user can only poll
// their own job. Mirrors api/gemini/video/poll.ts's polling shape.

const POLL_LIMIT = 60;
const POLL_WINDOW_SECONDS = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('x-request-id', getRequestId(req));

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const jobId = typeof req.query.jobId === 'string' ? req.query.jobId : null;
  if (!jobId) return res.status(400).json({ error: 'missing_job_id' });

  const allowed = await rateLimitCheck(`render:poll:${user.id}`, POLL_LIMIT, POLL_WINDOW_SECONDS);
  if (!allowed) {
    res.setHeader('Retry-After', String(POLL_WINDOW_SECONDS));
    return res.status(429).json({ error: 'rate_limited', scope: 'render-poll', retry_after_seconds: POLL_WINDOW_SECONDS });
  }

  const sidecar = await readSidecar(statusKey(user.id, jobId));

  // No sidecar yet (or transient read miss) → still processing from the client's view.
  if (!sidecar) {
    const pending: FinalRenderResult = { done: false, status: 'processing' };
    return res.status(200).json(pending);
  }

  const receipt = sidecar.lineage ? {
    creativeId: sidecar.creativeId,
    lineage: sidecar.lineage,
    audioPolicies: sidecar.audioPolicies,
  } : {};

  if (sidecar.status === 'done') {
    const result: FinalRenderResult = {
      ...receipt,
      done: true,
      status: 'done',
      url: sidecar.url,
      downloadUrl: sidecar.downloadUrl,
      creativeId: sidecar.creativeId,
    };
    return res.status(200).json(result);
  }

  if (sidecar.status === 'failed') {
    const result: FinalRenderResult = { ...receipt, done: true, status: 'failed', error: sidecar.error ?? 'render_failed' };
    return res.status(200).json(result);
  }

  // Watchdog: a 'processing' job whose heartbeat went stale (>120s) or that blew the
  // absolute age backstop (>330s) is dead — the runner crashed or Vercel killed it.
  // Convert the sidecar to 'failed:watchdog_stalled' so the client stops polling and
  // the orchestrator's existing withRetry can re-fire. Legacy timestamp-less sidecars
  // fall through to 'processing' unchanged.
  if (isRenderStalled(sidecar)) {
    await writeSidecar(statusKey(user.id, jobId), {
      ...receipt,
      status: 'failed',
      error: 'watchdog_stalled',
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
    const result: FinalRenderResult = { ...receipt, done: true, status: 'failed', error: 'watchdog_stalled' };
    return res.status(200).json(result);
  }

  const processing: FinalRenderResult = { ...receipt, done: false, status: 'processing' };
  return res.status(200).json(processing);
}
