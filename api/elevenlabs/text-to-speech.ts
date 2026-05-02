import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';

const Body = z.object({
  voiceId: z.string().min(1),
  text: z.string().min(1).max(10000),
  stabilityMode: z.enum(['creative', 'natural', 'robust']),
});

const TTS_LIMIT = 30;
const TTS_WINDOW_SECONDS = 60;
const TTS_MODEL_ID = 'eleven_v3';

const getApiKey = (): string => {
  const key = process.env.ELEVEN_LABS_API_KEY;
  if (!key) {
    throw new Error(
      'ELEVEN_LABS_NOT_CONFIGURED: set ELEVEN_LABS_API_KEY (server-side, no VITE_ prefix).'
    );
  }
  return key;
};

const stabilitySettings = (mode: 'creative' | 'natural' | 'robust') => {
  switch (mode) {
    case 'creative': return { stability: 0.30, similarity_boost: 0.70 };
    case 'robust':   return { stability: 0.75, similarity_boost: 0.85 };
    case 'natural':
    default:         return { stability: 0.50, similarity_boost: 0.75 };
  }
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
    `elevenlabs:tts:${user.id}`,
    TTS_LIMIT,
    TTS_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(TTS_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'elevenlabs-tts',
      retry_after_seconds: TTS_WINDOW_SECONDS,
    });
  }

  const { voiceId, text, stabilityMode } = parsed.data;

  try {
    const upstream = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': getApiKey(),
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: TTS_MODEL_ID,
        voice_settings: stabilitySettings(stabilityMode),
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => upstream.statusText);
      console.error('[api/elevenlabs/text-to-speech] upstream error:', upstream.status, detail);
      if (upstream.status === 429) {
        res.setHeader('Retry-After', '30');
        return res.status(429).json({ error: 'elevenlabs_quota', status: 429, detail });
      }
      return res.status(502).json({ error: 'elevenlabs_error', status: upstream.status, detail });
    }

    const arrayBuf = await upstream.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(arrayBuf.byteLength));
    return res.status(200).send(Buffer.from(arrayBuf));
  } catch (err: any) {
    const msg = err?.message ?? 'unknown';
    console.error('[api/elevenlabs/text-to-speech] error:', msg);
    return res.status(502).json({ error: 'elevenlabs_error', detail: msg });
  }
}
