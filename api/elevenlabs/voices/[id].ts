import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getSupabaseAdmin, getUserFromAccessToken } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';

const DELETE_LIMIT = 10;
const DELETE_WINDOW_SECONDS = 60;

const getApiKey = (): string => {
  const key = process.env.ELEVEN_LABS_API_KEY;
  if (!key) {
    throw new Error(
      'ELEVEN_LABS_NOT_CONFIGURED: set ELEVEN_LABS_API_KEY (server-side, no VITE_ prefix).'
    );
  }
  return key;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    res.setHeader('Allow', 'DELETE');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const rawId = req.query.id;
  const voiceId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!voiceId || typeof voiceId !== 'string' || !voiceId.trim()) {
    return res.status(400).json({ error: 'missing_voice_id' });
  }

  const allowed = await rateLimitCheck(
    `elevenlabs:voice_delete:${user.id}`,
    DELETE_LIMIT,
    DELETE_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(DELETE_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'elevenlabs-voice-delete',
      retry_after_seconds: DELETE_WINDOW_SECONDS,
    });
  }

  const admin = getSupabaseAdmin();

  const { data: row, error: lookupError } = await admin
    .from('user_voices')
    .select('id, elevenlabs_voice_id')
    .eq('user_id', user.id)
    .eq('elevenlabs_voice_id', voiceId)
    .maybeSingle();
  if (lookupError) {
    console.error('[api/elevenlabs/voices/[id]] lookup error:', lookupError.message);
    return res.status(500).json({ error: 'lookup_failed' });
  }
  if (!row) {
    return res.status(404).json({ error: 'voice_not_found' });
  }

  try {
    const upstream = await fetch(
      `https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`,
      { method: 'DELETE', headers: { 'xi-api-key': getApiKey() } }
    );

    if (!upstream.ok && upstream.status !== 404) {
      const detail = await upstream.text().catch(() => upstream.statusText);
      console.error('[api/elevenlabs/voices/[id]] upstream error:', upstream.status, detail);
      return res.status(502).json({
        error: 'elevenlabs_error',
        status: upstream.status,
        detail,
        message: 'Could not delete the voice. Please try again.',
      });
    }

    const { error: deleteError } = await admin
      .from('user_voices')
      .delete()
      .eq('id', row.id);
    if (deleteError) {
      console.error('[api/elevenlabs/voices/[id]] db delete error:', deleteError.message);
      return res.status(500).json({
        error: 'db_delete_failed',
        message: 'Voice was removed from ElevenLabs but our database delete failed. Please contact support.',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    const msg = err?.message ?? 'unknown';
    console.error('[api/elevenlabs/voices/[id]] error:', msg);
    return res.status(502).json({ error: 'elevenlabs_error', detail: msg });
  }
}
