import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { consumeMonthly } from '../_lib/quota.js';
import { getKlingAccessToken, invalidateKlingAccessToken, KLING_API_BASE } from '../_lib/klingAuth.js';

// Kling Omni (kling-video-o1) lives at a different upstream endpoint than
// image2video (kling-v3) and takes a different body shape. Auth, JWT, and the
// 5/hr rate-limit pool are shared with V3 — same Kling balance, same wallet.
const Body = z.object({
  model_name: z.string().min(1),
  image_list: z
    .array(
      z.object({
        image_url: z.string().min(1),
        type: z.enum(['first_frame', 'end_frame']).optional(),
      })
    )
    .min(1)
    .max(2),
  prompt: z.string().min(1),
  negative_prompt: z.string().optional(),
  duration: z.string().min(1),
  mode: z.enum(['std', 'pro', '4k']).default('std'),
  aspect_ratio: z.string().min(1).optional(),
  cfg_scale: z.number().min(0).max(1).optional(),
  sound: z.enum(['on', 'off']).default('off'),
  requestId: z.string().optional(),
});

const VIDEO_LIMIT = 5;
const VIDEO_WINDOW_SECONDS = 3600;

// HTTP 429 + envelope code 1102 = Kling account balance exhausted (NOT a rate
// limit). Surface as HTTP 402 so the UI shows a top-up CTA instead of looping
// the queue's auto-retry. See agent_lessons 2026-05-18.
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

  // SHARED with /api/kling/video — Kling balance is one wallet, the hourly
  // budget should match the spend pool.
  // Dev-only unmetered bypass (Neil 2026-06-10): GRIFON_DEV_UNMETERED_VIDEO='true'
  // in LOCAL .env skips the hourly rate-limit for back-to-back smoke renders.
  // NEVER set on Vercel — prod stays limited. Pairs with quota.ts monthly bypass.
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

  // Monthly plan allowance (video_ads). Shared cap across Veo + Kling (same
  // monthly key as /api/kling/video). Distinct from the hourly rate-limit and
  // the Kling balance-exhausted 402 below; uses the quota_exceeded contract
  // that raises the in-app upgrade wall.
  const plan = await getUserPlan(user.id);
  const videoQuota = await consumeMonthly('video_ads', user.id, plan);
  if (!videoQuota.allowed) {
    return res.status(402).json({
      error: 'quota_exceeded',
      scope: 'video_ads',
      used: videoQuota.used,
      limit: videoQuota.limit,
      remaining: 0,
      plan,
    });
  }

  const { requestId, ...klingBody } = parsed.data;
  console.log('[grifon:kling-omni:submit]', {
    t: Date.now(),
    userId: user.id,
    model: klingBody.model_name,
    duration: klingBody.duration,
    mode: klingBody.mode,
    sound: klingBody.sound,
    aspect: klingBody.aspect_ratio,
    frames: klingBody.image_list.length,
    requestId,
  });

  let jwt: string;
  try {
    jwt = getKlingAccessToken();
  } catch (err: any) {
    console.error('[api/kling/omni-video] auth error:', err?.message);
    return res.status(502).json({ error: 'kling_error', detail: err?.message ?? 'auth_failed' });
  }

  const submitToKling = async (token: string) => {
    const upstream = await fetch(`${KLING_API_BASE}/v1/videos/omni-video`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(klingBody),
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
    if (r.status === 401) {
      console.warn('[api/kling/omni-video] upstream 401 — refreshing JWT and retrying once');
      invalidateKlingAccessToken();
      jwt = getKlingAccessToken();
      r = await submitToKling(jwt);
    }
    upstreamStatus = r.status;
    upstreamText = r.text;
    upstreamJson = r.json;
  } catch (err: any) {
    console.error('[api/kling/omni-video] fetch error:', err?.message);
    return res.status(502).json({ error: 'kling_error', detail: err?.message ?? 'fetch_failed' });
  }

  // Success: HTTP 200 + Kling envelope code 0.
  if (upstreamStatus === 200 && upstreamJson?.code === 0 && upstreamJson?.data) {
    const data = upstreamJson.data;
    return res.status(200).json({
      operation: {
        task_id: data.task_id,
        task_status: data.task_status,
        model_name: klingBody.model_name,
        created_at: data.created_at,
      },
    });
  }

  // Balance exhausted → HTTP 402 (NOT rate-limit). Top-up CTA, no auto-retry.
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

  // 401 from Kling = our JWT was rejected after the one-shot refresh too.
  if (upstreamStatus === 401) {
    console.error('[api/kling/omni-video] upstream 401 — JWT rejected by Kling:', upstreamText.slice(0, 500));
    return res.status(502).json({
      error: 'kling_auth_failed',
      detail: 'Kling rejected the proxy JWT. Check KLING_ACCESS_KEY/SECRET_KEY validity.',
    });
  }

  // Other 4xx: pass through the status code so the client can react cleanly
  // (e.g. F2-style fallback detects 400 INVALID_ARGUMENT). Matches the
  // image2video proxy's pattern — do NOT 502-wrap 4xx.
  if (upstreamStatus >= 400 && upstreamStatus < 500) {
    console.warn('[api/kling/omni-video] upstream 4xx:', upstreamStatus, upstreamText.slice(0, 500));
    return res.status(upstreamStatus).json({
      error: 'kling_invalid_argument',
      detail: upstreamJson?.message ?? upstreamText.slice(0, 500),
      kling_code: upstreamJson?.code,
      request_id: upstreamJson?.request_id,
    });
  }

  // 5xx: wrap as 502 with detail.
  console.error('[api/kling/omni-video] upstream 5xx:', upstreamStatus, upstreamText.slice(0, 500));
  return res.status(502).json({
    error: 'kling_error',
    detail: `upstream_${upstreamStatus}: ${upstreamJson?.message ?? upstreamText.slice(0, 200)}`,
    request_id: upstreamJson?.request_id,
  });
}
