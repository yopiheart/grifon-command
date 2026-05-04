import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { MAX_VOICES_PER_USER } from '../_lib/voiceConfig.js';
import { FILIPINO_LIBRARY } from '../_lib/filipinoLibrary.js';

const VOICES_LIMIT = 30;
const VOICES_WINDOW_SECONDS = 60;

const getApiKey = (): string => {
  const key = process.env.ELEVEN_LABS_API_KEY;
  if (!key) {
    throw new Error(
      'ELEVEN_LABS_NOT_CONFIGURED: set ELEVEN_LABS_API_KEY (server-side, no VITE_ prefix).'
    );
  }
  return key;
};

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url?: string;
  labels?: Record<string, unknown>;
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

  const allowed = await rateLimitCheck(
    `elevenlabs:voices:${user.id}`,
    VOICES_LIMIT,
    VOICES_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(VOICES_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'elevenlabs-voices',
      retry_after_seconds: VOICES_WINDOW_SECONDS,
    });
  }

  try {
    const admin = getSupabaseAdmin();
    const [upstream, dbResult] = await Promise.all([
      fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': getApiKey() },
      }),
      admin
        .from('user_voices')
        .select('elevenlabs_voice_id, voice_name, description, created_at')
        .eq('user_id', user.id),
    ]);

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => upstream.statusText);
      console.error('[api/elevenlabs/voices] upstream error:', upstream.status, detail);
      if (upstream.status === 429) {
        res.setHeader('Retry-After', '30');
        return res.status(429).json({ error: 'elevenlabs_quota', status: 429, detail });
      }
      return res.status(502).json({ error: 'elevenlabs_error', status: upstream.status, detail });
    }

    const data = await upstream.json().catch(() => ({} as any));
    const all: ElevenLabsVoice[] = Array.isArray(data?.voices) ? data.voices : [];

    const stockVoices = all
      .filter(v => v.category === 'premade')
      .map(v => ({
        voice_id: v.voice_id,
        name: v.name,
        category: v.category,
        preview_url: v.preview_url,
        labels: v.labels,
      }));

    const myRows = (dbResult.data ?? []) as Array<{
      elevenlabs_voice_id: string;
      voice_name: string;
      description: string | null;
      created_at: string;
    }>;
    const myIdSet = new Set(myRows.map(r => r.elevenlabs_voice_id));
    const elById = new Map(all.map(v => [v.voice_id, v]));

    const myVoices = myRows
      .filter(r => elById.has(r.elevenlabs_voice_id))
      .map(r => {
        const el = elById.get(r.elevenlabs_voice_id)!;
        return {
          voice_id: r.elevenlabs_voice_id,
          name: r.voice_name,
          preview_url: el.preview_url,
          description: r.description ?? undefined,
          created_at: r.created_at,
        };
      });

    // Allowlist gate: only voices explicitly curated in FILIPINO_LIBRARY are
    // surfaced to users. This is the security boundary that prevents admin's
    // personal clones, other users' clones, and saved English voices from
    // leaking into the picker. Order follows FILIPINO_LIBRARY (display order),
    // not the upstream ElevenLabs response order.
    const libraryVoices = FILIPINO_LIBRARY
      .map(entry => {
        const upstream = elById.get(entry.voice_id);
        if (!upstream) return null;
        return {
          voice_id: entry.voice_id,
          name: entry.displayName,
          preview_url: upstream.preview_url,
          description: entry.description,
        };
      })
      .filter(<T,>(v: T | null): v is T => v !== null);

    return res.status(200).json({
      stockVoices,
      myVoices,
      libraryVoices,
      quotaUsed: myIdSet.size,
      quotaMax: MAX_VOICES_PER_USER,
    });
  } catch (err: any) {
    const msg = err?.message ?? 'unknown';
    console.error('[api/elevenlabs/voices] error:', msg);
    return res.status(502).json({ error: 'elevenlabs_error', detail: msg });
  }
}
