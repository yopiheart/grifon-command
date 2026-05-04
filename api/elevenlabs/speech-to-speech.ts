import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { STS_DAILY, DAILY_WINDOW_SECONDS, stsDailyKey } from '../_lib/quota.js';

const Body = z.object({
  voiceId: z.string().min(1),
  sourceFile: z.string().min(1),
  stabilityMode: z.enum(['creative', 'natural', 'robust']),
});

const STS_LIMIT = 15;
const STS_WINDOW_SECONDS = 60;
const STS_MODEL_ID = 'eleven_multilingual_sts_v2';

const ALLOWED_MIME = new Set<string>([
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/m4a',
  'audio/x-m4a',
  'audio/mp4',
  'audio/webm',
  'audio/ogg',
  'video/mp4',
  'video/quicktime',
]);

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

const parseDataUrl = (dataUrl: string): { mime: string; bytes: ArrayBuffer } | null => {
  // Header may carry codec params (e.g. `audio/webm;codecs=opus`) before `;base64,`.
  const match = /^data:([^,]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return null;
  const mime = match[1].split(';')[0].trim().toLowerCase();
  if (!mime) return null;
  const buf = Buffer.from(match[2], 'base64');
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return { mime, bytes: ab };
};

const extensionForMime = (mime: string): string => {
  if (mime.includes('quicktime')) return 'mov';
  if (mime.includes('mp4')) return mime.startsWith('video/') ? 'mp4' : 'm4a';
  if (mime.includes('m4a')) return 'm4a';
  if (mime.includes('wav') || mime.includes('wave')) return 'wav';
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  return 'mp3';
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

  const decoded = parseDataUrl(parsed.data.sourceFile);
  if (!decoded) {
    return res.status(400).json({ error: 'invalid_source_file', detail: 'sourceFile must be a data:<mime>;base64,<...> URL' });
  }

  if (!ALLOWED_MIME.has(decoded.mime)) {
    return res.status(415).json({
      error: 'unsupported_media_type',
      detail: `MIME '${decoded.mime}' not allowed. Use MP3, WAV, M4A, MP4, or MOV.`,
    });
  }

  const allowed = await rateLimitCheck(
    `elevenlabs:sts:${user.id}`,
    STS_LIMIT,
    STS_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(STS_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'elevenlabs-sts',
      retry_after_seconds: STS_WINDOW_SECONDS,
    });
  }

  const plan = await getUserPlan(user.id);
  const dailyLimit = STS_DAILY[plan];
  const withinDaily = await rateLimitCheck(
    stsDailyKey(user.id),
    dailyLimit,
    DAILY_WINDOW_SECONDS
  );
  if (!withinDaily) {
    res.setHeader('Retry-After', String(DAILY_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'daily_quota_reached',
      scope: 'elevenlabs-sts-daily',
      message: `You've used all ${dailyLimit} voice changes in your daily ${plan.toUpperCase()} budget. Upgrade for more, or wait for the rolling 24h window to reset.`,
      plan,
      daily_limit: dailyLimit,
    });
  }

  const { voiceId, stabilityMode } = parsed.data;

  try {
    const audioBlob = new Blob([decoded.bytes], { type: decoded.mime });
    const formData = new FormData();
    formData.append('audio', audioBlob, `source.${extensionForMime(decoded.mime)}`);
    formData.append('model_id', STS_MODEL_ID);
    formData.append('voice_settings', JSON.stringify(stabilitySettings(stabilityMode)));

    const upstream = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/${encodeURIComponent(voiceId)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': getApiKey(),
        Accept: 'audio/mpeg',
      },
      body: formData,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => upstream.statusText);
      console.error('[api/elevenlabs/speech-to-speech] upstream error:', upstream.status, detail);
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
    console.error('[api/elevenlabs/speech-to-speech] error:', msg);
    return res.status(502).json({ error: 'elevenlabs_error', detail: msg });
  }
}
