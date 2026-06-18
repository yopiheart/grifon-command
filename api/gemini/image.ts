import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { consumeMonthly } from '../_lib/quota.js';
import { logImageUsage } from '../_lib/modelCosts.js';

const Body = z.object({
  model: z.string().min(1),
  contents: z.unknown(),
  config: z.unknown().optional(),
});

const IMAGE_LIMIT = 15;
const IMAGE_WINDOW_SECONDS = 60;

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

  const allowed = await rateLimitCheck(
    `gemini:image:${user.id}`,
    IMAGE_LIMIT,
    IMAGE_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(IMAGE_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'image',
      retry_after_seconds: IMAGE_WINDOW_SECONDS,
    });
  }

  // Monthly plan allowance (images). Every image generation counts, including
  // the 3-4 in a storyboard daisy-chain (per Neil 2026-05-31). Distinct from the
  // per-minute rate-limit above; raises the in-app upgrade wall via the 402
  // quota_exceeded contract proxyCall recognizes.
  const plan = await getUserPlan(user.id);
  const imageQuota = await consumeMonthly('images', user.id, plan);
  if (!imageQuota.allowed) {
    return res.status(402).json({
      error: 'quota_exceeded',
      scope: 'images',
      used: imageQuota.used,
      limit: imageQuota.limit,
      remaining: 0,
      plan,
    });
  }

  try {
    const ai = getAi();
    const response = await ai.models.generateContent(parsed.data as any);
    logImageUsage('image', parsed.data.model, 1);

    return res.status(200).json({
      candidates: response.candidates ?? [],
      usageMetadata: (response as any).usageMetadata,
      promptFeedback: (response as any).promptFeedback,
    });
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
      res.setHeader('Retry-After', '30');
      return res.status(429).json({ error: 'gemini_quota', detail: msg });
    }

    // Surface upstream model overload as 503 so the client's retryWithBackoff
    // (which already retries 429/503) picks it up instead of treating it as a
    // hard failure. Pattern matches Gemini's `{code: 503, status: "UNAVAILABLE"}`.
    const isUnavailable =
      msg.includes('UNAVAILABLE') ||
      errStr.includes('UNAVAILABLE') ||
      errStr.includes('"code":503') ||
      err?.status === 503 ||
      err?.error?.code === 503 ||
      err?.error?.status === 'UNAVAILABLE';

    if (isUnavailable) {
      res.setHeader('Retry-After', '5');
      return res.status(503).json({ error: 'gemini_unavailable', detail: msg });
    }

    console.error('[api/gemini/image] error:', msg);
    return res.status(502).json({ error: 'gemini_error', detail: msg });
  }
}
