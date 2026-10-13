import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { meterVideoRequest } from '../_lib/quota.js';
import { logVideoUsage } from '../_lib/modelCosts.js';
import { getRunId } from '../_lib/requestId.js';

const Body = z.object({
  model: z.string().min(1),
  prompt: z.string().min(1),
  config: z.unknown().optional(),
  image: z
    .object({
      imageBytes: z.string().min(1),
      mimeType: z.string().min(1),
    })
    .optional(),
  // Phase 4a diagnostic: client-generated UUID correlates :click: → :proxy: → :submit:
  // logs so we can confirm whether a single user click produces multiple Veo calls.
  requestId: z.string().optional(),
  // Stable per-finished-ad id. Present → metered ONCE per ad (Slice 3); absent →
  // legacy per-call metering. All scenes of one Render All share the same value.
  finishedAdId: z.string().optional(),
});

const VIDEO_LIMIT = 5;
const VIDEO_WINDOW_SECONDS = 3600;

let _ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  if (_ai) return _ai;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_NOT_CONFIGURED: set GEMINI_API_KEY (server-side, no VITE_ prefix).');
  _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
};

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

  // Dev-only unmetered bypass (Neil 2026-06-10): GRIFON_DEV_UNMETERED_VIDEO='true'
  // in LOCAL .env skips the hourly video rate-limit for back-to-back smoke renders.
  // NEVER set on Vercel — prod stays limited. Pairs with quota.ts monthly bypass.
  const devUnmetered = process.env.GRIFON_DEV_UNMETERED_VIDEO === 'true';
  const allowed = devUnmetered || await rateLimitCheck(
    `gemini:video:${user.id}`,
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

  // Monthly plan allowance — now a FINISHED-AD credit (shared across Veo + Kling).
  // Metered once per finishedAdId; raises the in-app upgrade wall via the 402
  // quota_exceeded contract. Distinct from the hourly rate-limit above.
  const plan = await getUserPlan(user.id);
  const videoQuota = await meterVideoRequest(user.id, plan, parsed.data.finishedAdId);
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

  try {
    const ai = getAi();
    // Strip client-only fields before forwarding to Veo (not part of Veo's API surface).
    const { requestId, finishedAdId, ...veoParams } = parsed.data;
    const cfg: any = (veoParams as any).config ?? {};
    console.log('[grifon:gv:submit]', {
      t: Date.now(),
      userId: user.id,
      model: veoParams.model,
      resolution: cfg.resolution,
      duration: cfg.durationSeconds,
      requestId,
      finishedAdId,
    });
    const operation = await ai.models.generateVideos(veoParams as any);
    // COGS: the render is now billable. Fire-and-forget — never throws. When a producer
    // run supplied x-run-id, the estimate is also mirrored to public.events ('cogs' row)
    // so per-run cost rolls up (run_cogs view / producer_runs.cost_usd). x-run-id is
    // client-controlled, so the row also carries the VERIFIED user.id for attribution.
    logVideoUsage('gemini:video:submit', veoParams.model, Number(cfg.durationSeconds) || 0, getRunId(req), user.id);
    return res.status(200).json({ operation });
  } catch (err: any) {
    const msg = err?.message ?? 'unknown';
    const errStr = JSON.stringify(err ?? {});
    const isQuota =
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      err?.status === 429 ||
      err?.error?.code === 429 ||
      err?.error?.status === 'RESOURCE_EXHAUSTED';

    if (isQuota) {
      res.setHeader('Retry-After', '60');
      return res.status(429).json({ error: 'gemini_quota', detail: msg });
    }
    console.error('[api/gemini/video] error:', msg);
    return res.status(502).json({ error: 'gemini_error', detail: msg });
  }
}
