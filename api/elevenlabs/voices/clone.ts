import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSupabaseAdmin, getUserFromAccessToken } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';
import { MAX_VOICES_PER_USER, isCloningEnabled } from '../../_lib/voiceConfig.js';

const Body = z.object({
  voiceName: z.string().trim().min(3).max(50),
  description: z.string().trim().max(500).optional(),
  consent: z.literal(true),
  audio: z.string().min(1),
});

const CLONE_LIMIT = 3;
const CLONE_WINDOW_SECONDS = 3600;

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

// Tolerates optional media-type parameters between MIME and `;base64,`,
// e.g. `data:audio/webm;codecs=opus;base64,...` produced by MediaRecorder.
const parseDataUrl = (dataUrl: string): { mime: string; bytes: ArrayBuffer } | null => {
  if (!dataUrl.startsWith('data:')) return null;
  const idx = dataUrl.indexOf(';base64,');
  if (idx < 0) return null;
  const meta = dataUrl.slice(5, idx);
  const payload = dataUrl.slice(idx + ';base64,'.length);
  const mime = meta.split(';')[0].trim().toLowerCase();
  if (!mime) return null;
  const buf = Buffer.from(payload, 'base64');
  const ab = new ArrayBuffer(buf.byteLength);
  new Uint8Array(ab).set(buf);
  return { mime, bytes: ab };
};

const extensionForMime = (mime: string): string => {
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  if (mime.includes('wav') || mime.includes('wave')) return 'wav';
  return 'mp3';
};

const mapElevenLabsError = (status: number, body: string): { code: string; message: string } => {
  const lower = body.toLowerCase();
  if (lower.includes('missing_permissions') || lower.includes('missing permission')) {
    return {
      code: 'api_key_scope_missing',
      message: 'The ElevenLabs API key is missing the create_instant_voice_clone permission. Regenerate the key with that scope enabled in your ElevenLabs dashboard.',
    };
  }
  if (status === 401 || status === 403) {
    return {
      code: 'permission_denied',
      message: 'ElevenLabs rejected the request. Either the API key is invalid or your plan does not include voice cloning.',
    };
  }
  if (lower.includes('voice_limit') || lower.includes('voice limit')) {
    return { code: 'voice_limit_reached', message: 'All voice slots are currently in use. Please contact support.' };
  }
  if (lower.includes('already exists') || lower.includes('voice_already_exists') || lower.includes('name_taken')) {
    return { code: 'voice_name_taken', message: 'A voice with that name already exists. Choose a different name.' };
  }
  if (status === 422 || lower.includes('invalid') || lower.includes('could not')) {
    return { code: 'invalid_audio', message: 'We could not process that audio. Try a clearer 30+ second sample with a single speaker.' };
  }
  if (status === 429) {
    return { code: 'elevenlabs_quota', message: 'ElevenLabs is rate-limiting us. Please try again in a minute.' };
  }
  return { code: 'elevenlabs_error', message: 'Voice cloning failed. Please try again.' };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  if (!isCloningEnabled()) {
    return res.status(503).json({
      error: 'feature_disabled',
      message: 'Voice cloning is not yet available.',
    });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({
      error: 'invalid_body',
      message: 'Some fields are missing or invalid. Check voice name, consent, and audio sample.',
      issues: parsed.error.issues,
    });
  }

  const decoded = parseDataUrl(parsed.data.audio);
  if (!decoded) {
    return res.status(400).json({
      error: 'invalid_audio_data',
      message: 'Audio sample could not be read. Try re-recording or uploading a fresh file.',
      detail: 'audio must be a data:<mime>;base64,<...> URL',
    });
  }
  if (!ALLOWED_MIME.has(decoded.mime)) {
    return res.status(415).json({
      error: 'unsupported_media_type',
      message: `Audio format '${decoded.mime}' is not supported. Use MP3, WAV, M4A, or WebM.`,
      detail: `MIME '${decoded.mime}' not allowed.`,
    });
  }

  const allowed = await rateLimitCheck(
    `elevenlabs:clone:${user.id}`,
    CLONE_LIMIT,
    CLONE_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(CLONE_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      message: `You've made too many clone attempts in the last hour. Please wait up to ${Math.round(CLONE_WINDOW_SECONDS / 60)} minutes and try again.`,
      scope: 'elevenlabs-clone',
      retry_after_seconds: CLONE_WINDOW_SECONDS,
    });
  }

  const admin = getSupabaseAdmin();

  const { count: usedCount, error: countError } = await admin
    .from('user_voices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if (countError) {
    console.error('[api/elevenlabs/voices/clone] quota query error:', countError.message);
    return res.status(500).json({ error: 'quota_check_failed' });
  }
  if ((usedCount ?? 0) >= MAX_VOICES_PER_USER) {
    return res.status(409).json({
      error: 'voice_quota_reached',
      message: `You can have at most ${MAX_VOICES_PER_USER} cloned voice${MAX_VOICES_PER_USER === 1 ? '' : 's'}. Delete your existing voice to create a new one.`,
      quotaUsed: usedCount ?? 0,
      quotaMax: MAX_VOICES_PER_USER,
    });
  }

  const { voiceName, description } = parsed.data;
  const consentIp = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? null;

  try {
    const audioBlob = new Blob([decoded.bytes], { type: decoded.mime });
    const formData = new FormData();
    formData.append('name', voiceName);
    if (description) formData.append('description', description);
    formData.append('files', audioBlob, `sample.${extensionForMime(decoded.mime)}`);

    const upstream = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': getApiKey() },
      body: formData,
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => upstream.statusText);
      console.error('[api/elevenlabs/voices/clone] upstream error:', upstream.status, detail);
      const mapped = mapElevenLabsError(upstream.status, detail);
      const httpStatus = upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status;
      return res.status(httpStatus).json({ error: mapped.code, message: mapped.message, detail });
    }

    const result = await upstream.json().catch(() => ({} as any));
    const voiceId: string | undefined = result?.voice_id;
    if (!voiceId) {
      console.error('[api/elevenlabs/voices/clone] no voice_id in response:', result);
      return res.status(502).json({ error: 'elevenlabs_error', message: 'No voice_id returned by ElevenLabs.' });
    }

    const { error: insertError } = await admin.from('user_voices').insert({
      user_id: user.id,
      elevenlabs_voice_id: voiceId,
      voice_name: voiceName,
      description: description ?? null,
      consent_at: new Date().toISOString(),
      consent_ip: consentIp,
    });
    if (insertError) {
      console.error('[api/elevenlabs/voices/clone] db insert error:', insertError.message);
      // ElevenLabs has the voice but we couldn't record it. Best-effort cleanup
      // so the global slot isn't orphaned without a DB pointer.
      await fetch(`https://api.elevenlabs.io/v1/voices/${encodeURIComponent(voiceId)}`, {
        method: 'DELETE',
        headers: { 'xi-api-key': getApiKey() },
      }).catch(() => {});
      return res.status(500).json({ error: 'db_insert_failed', message: 'Could not save your voice. Please try again.' });
    }

    return res.status(201).json({ voice_id: voiceId, voice_name: voiceName });
  } catch (err: any) {
    const msg = err?.message ?? 'unknown';
    console.error('[api/elevenlabs/voices/clone] error:', msg);
    return res.status(502).json({ error: 'elevenlabs_error', detail: msg });
  }
}
