import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';

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

  const allowed = await rateLimitCheck(
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

  try {
    const ai = getAi();
    const operation = await ai.models.generateVideos(parsed.data as any);
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
