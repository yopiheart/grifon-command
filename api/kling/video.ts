import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSupabaseAdmin, getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { meterVideoRequest } from '../_lib/quota.js';
import { getKlingAccessToken, invalidateKlingAccessToken, KLING_API_BASE } from '../_lib/klingAuth.js';
import { logVideoUsage } from '../_lib/modelCosts.js';
import { getRunId } from '../_lib/requestId.js';
import { producerKlingTaskId } from '../_lib/producerKlingTask.js';

const Body = z.object({
  model_name: z.string().min(1),
  image: z.string().min(1),
  image_tail: z.string().min(1).optional(),
  prompt: z.string().min(1),
  negative_prompt: z.string().optional(),
  duration: z.string().min(1),
  mode: z.enum(['std', 'pro']).default('std'),
  aspect_ratio: z.string().min(1),
  cfg_scale: z.number().min(0).max(1).optional(),
  requestId: z.string().optional(),
  // Per-finished-ad id — metered once per ad (Slice 3); shared Veo+Kling key.
  finishedAdId: z.string().optional(),
  producerScene: z.object({
    sceneIdx: z.number().int().min(0).max(23),
    attempt: z.number().int().min(1).max(2_147_483_647),
  }).optional(),
});

export const VIDEO_LIMIT = 12;
const VIDEO_WINDOW_SECONDS = 3600;

// Kling-specific error codes worth distinguishing client-side.
// Phase 1 smoke confirmed: HTTP 429 + code 1102 = balance exhausted (not rate-limited).
const KLING_CODE_BALANCE_EXHAUSTED = 1102;

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

  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const { requestId, finishedAdId, producerScene, ...klingBody } = parsed.data;

  // Config/credential check BEFORE the rate-limit slot is consumed: a missing
  // KLING_* env is our misconfiguration, so it must 502 without burning the
  // caller's hourly budget. Auth still runs first; only this check moved ahead
  // of rateLimitCheck (message/shape unchanged).
  let jwt: string;
  try {
    jwt = getKlingAccessToken();
  } catch (err: any) {
    console.error('[api/kling/video] auth error:', err?.message);
    return res.status(502).json({ error: 'kling_error', detail: err?.message ?? 'auth_failed' });
  }

  // Dev-only unmetered bypass (Neil 2026-06-10): GRIFON_DEV_UNMETERED_VIDEO='true'
  // in LOCAL .env skips the hourly video rate-limit so a long smoke test renders
  // back-to-back instead of tripping the shared pool (12/hr since 2026-07-16, Neil GO,
  // spec finding #22). Pairs with the same flag's monthly-quota bypass in quota.ts.
  // NEVER set on Vercel — prod stays limited.
  const devUnmetered = process.env.GRIFON_DEV_UNMETERED_VIDEO === 'true';
  const allowed = devUnmetered || await rateLimitCheck(
    `kling:video:${user.id}`,
    VIDEO_LIMIT,
    VIDEO_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(VIDEO_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'video',
      retry_after_seconds: VIDEO_WINDOW_SECONDS,
    });
  }

  let externalTaskId: string | undefined;
  if (producerScene) {
    // Only the current scene attempt of an owned Producer run may get a lookup ID.
    if (!finishedAdId || finishedAdId.length < 8 || finishedAdId.length > 200) {
      return res.status(400).json({ error: 'invalid_producer_run_id' });
    }
    const admin = getSupabaseAdmin();
    const { data: run, error: runError } = await admin.from('producer_runs')
      .select('user_id').eq('run_id', finishedAdId).maybeSingle();
    if (runError) return res.status(503).json({ error: 'producer_scene_unavailable' });
    if (!run) return res.status(404).json({ error: 'run_not_found' });
    if (run.user_id !== user.id) return res.status(403).json({ error: 'forbidden' });

    const { data: scene, error: sceneError } = await admin.from('producer_scenes')
      .select('scene_idx').eq('run_id', finishedAdId).eq('scene_idx', producerScene.sceneIdx)
      .eq('attempts', producerScene.attempt).eq('status', 'submitting').is('job_handle', null)
      .maybeSingle();
    if (sceneError) return res.status(503).json({ error: 'producer_scene_unavailable' });
    if (!scene) return res.status(409).json({ error: 'producer_scene_not_submittable' });
    externalTaskId = producerKlingTaskId(user.id, finishedAdId, producerScene.sceneIdx, producerScene.attempt);
  }

  // Monthly plan allowance (video_ads). Shared cap across Veo + Kling. Distinct
  // from both the hourly rate-limit above and the Kling balance-exhausted 402
  // below (error: 'kling_balance_exhausted'); this 402 uses the quota_exceeded
  // contract that raises the in-app upgrade wall.
  const plan = await getUserPlan(user.id);
  const videoQuota = await meterVideoRequest(user.id, plan, finishedAdId);
  if (!videoQuota.ok) {
    if (videoQuota.unavailable) {
      res.setHeader('Retry-After', '30');
      return res.status(503).json({ error: 'quota_unavailable', detail: 'Allowance is temporarily unavailable. Retry shortly.' });
    }
    return res.status(402).json({
      error: 'quota_exceeded',
      scope: 'video_ads',
      used: videoQuota.used,
      limit: videoQuota.limit,
      remaining: 0,
      plan,
    });
  }

  console.log('[grifon:kling:submit]', {
    t: Date.now(),
    userId: user.id,
    model: klingBody.model_name,
    duration: klingBody.duration,
    mode: klingBody.mode,
    aspect: klingBody.aspect_ratio,
    hasTail: !!klingBody.image_tail,
    requestId,
    finishedAdId,
  });

  const submitToKling = async (token: string) => {
    const upstream = await fetch(`${KLING_API_BASE}/v1/videos/image2video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(externalTaskId ? { ...klingBody, external_task_id: externalTaskId } : klingBody),
    });
    const text = await upstream.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* leave null */ }
    return { status: upstream.status, text, json };
  };

  let upstreamStatus = 0;
  let upstreamText = '';
  let upstreamJson: any = null;
  try {
    let r = await submitToKling(jwt);
    // One-shot 401 refresh — Kling sliding TTL / clock-skew can make a cached
    // JWT appear expired even when our `expiresAt` math says it's still good.
    // Invalidate, re-sign fresh, and retry once before giving up.
    if (r.status === 401) {
      console.warn('[api/kling/video] upstream 401 — refreshing JWT and retrying once');
      invalidateKlingAccessToken();
      jwt = getKlingAccessToken();
      r = await submitToKling(jwt);
    }
    upstreamStatus = r.status;
    upstreamText = r.text;
    upstreamJson = r.json;
  } catch (err: any) {
    console.error('[api/kling/video] fetch error:', err?.message);
    return res.status(502).json({ error: 'kling_error', detail: err?.message ?? 'fetch_failed' });
  }

  // Success: HTTP 200 + Kling envelope code 0.
  if (upstreamStatus === 200 && upstreamJson?.code === 0 && upstreamJson?.data) {
    const data = upstreamJson.data;
    // COGS: the render is now billable. Fire-and-forget — never throws. When a producer
    // run supplied x-run-id, the estimate is mirrored to public.events for per-run roll-up.
    // x-run-id is client-controlled, so the row also carries the VERIFIED user.id.
    logVideoUsage('kling:video:submit', klingBody.model_name, Number(klingBody.duration) || 0, getRunId(req), user.id);
    return res.status(200).json({
      operation: {
        task_id: data.task_id,
        task_status: data.task_status,
        model_name: klingBody.model_name,
        created_at: data.created_at,
      },
    });
  }

  // Balance exhausted is HTTP 429 + code 1102. Surface as a distinct client-facing
  // error so the UI doesn't auto-retry like a rate limit — the user needs to top up.
  if (upstreamStatus === 429 && upstreamJson?.code === KLING_CODE_BALANCE_EXHAUSTED) {
    res.setHeader('Retry-After', '3600');
    return res.status(402).json({
      error: 'kling_balance_exhausted',
      detail: upstreamJson?.message ?? 'Account balance not enough',
      request_id: upstreamJson?.request_id,
    });
  }

  // Other 429s from Kling are real rate limits.
  if (upstreamStatus === 429) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({
      error: 'kling_quota',
      detail: upstreamJson?.message ?? upstreamText.slice(0, 500),
      retry_after_seconds: 60,
      kling_code: upstreamJson?.code,
      request_id: upstreamJson?.request_id,
    });
  }

  // 401 from Kling = our JWT was rejected (signing bug, clock drift, or rotated keys).
  // Don't pass 401 to the client — client is Supabase-authenticated; 401 would trigger
  // a JWT refresh on the wrong layer. Wrap in 502 to mark this as our problem.
  if (upstreamStatus === 401) {
    console.error('[api/kling/video] upstream 401 — JWT rejected by Kling:', upstreamText.slice(0, 500));
    return res.status(502).json({
      error: 'kling_auth_failed',
      detail: 'Kling rejected the proxy JWT. Check KLING_ACCESS_KEY/SECRET_KEY validity.',
    });
  }

  // An ID conflict can refer to a job Kling already accepted for this attempt.
  if (externalTaskId && (upstreamStatus === 409 ||
      (upstreamStatus >= 400 && upstreamStatus < 500 && /already exists|duplicate/i.test(upstreamJson?.message ?? '')))) {
    return res.status(502).json({ error: 'kling_submission_uncertain' });
  }

  // Other 4xx: pass through the status code so the client can react cleanly
  // (e.g. F2's morph-fallback pattern detects 400 INVALID_ARGUMENT). This is the
  // KEY deviation from api/gemini/video.ts which wraps everything in 502.
  if (upstreamStatus >= 400 && upstreamStatus < 500) {
    console.warn('[api/kling/video] upstream 4xx:', upstreamStatus, upstreamText.slice(0, 500));
    return res.status(upstreamStatus).json({
      error: 'kling_invalid_argument',
      detail: upstreamJson?.message ?? upstreamText.slice(0, 500),
      kling_code: upstreamJson?.code,
      request_id: upstreamJson?.request_id,
    });
  }

  // 5xx: wrap as 502 with detail.
  console.error('[api/kling/video] upstream 5xx:', upstreamStatus, upstreamText.slice(0, 500));
  return res.status(502).json({
    error: 'kling_error',
    detail: `upstream_${upstreamStatus}: ${upstreamJson?.message ?? upstreamText.slice(0, 200)}`,
    request_id: upstreamJson?.request_id,
  });
}
