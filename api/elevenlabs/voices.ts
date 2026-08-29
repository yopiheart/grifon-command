import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSupabaseAdmin, getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getVoiceSlotMax, isCloningEnabled } from '../_lib/voiceConfig.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { CLONE_DAILY, DAILY_WINDOW_SECONDS, cloneDailyKey } from '../_lib/quota.js';
import { FILIPINO_LIBRARY } from '../_lib/filipinoLibrary.js';

const LIST_LIMIT = 30;
const LIST_WINDOW_SECONDS = 60;

const CLONE_LIMIT = 3;
const CLONE_WINDOW_SECONDS = 3600;

const DELETE_LIMIT = 10;
const DELETE_WINDOW_SECONDS = 60;

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

const CloneBody = z.object({
  voiceName: z.string().trim().min(3).max(50),
  description: z.string().trim().max(500).optional(),
  consent: z.literal(true),
  audio: z.string().min(1),
});

interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  preview_url?: string;
  labels?: Record<string, unknown>;
}

const getApiKey = (): string => {
  const key = process.env.ELEVEN_LABS_API_KEY;
  if (!key) {
    throw new Error(
      'ELEVEN_LABS_NOT_CONFIGURED: set ELEVEN_LABS_API_KEY (server-side, no VITE_ prefix).'
    );
  }
  return key;
};

const requireUser = async (req: VercelRequest, res: VercelResponse) => {
  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'missing_bearer_token' });
    return null;
  }
  const user = await getUserFromAccessToken(token);
  if (!user) {
    res.status(401).json({ error: 'invalid_token' });
    return null;
  }
  return user;
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

async function handleList(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

  const allowed = await rateLimitCheck(
    `elevenlabs:voices:${user.id}`,
    LIST_LIMIT,
    LIST_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(LIST_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'elevenlabs-voices',
      retry_after_seconds: LIST_WINDOW_SECONDS,
    });
  }

  try {
    const admin = getSupabaseAdmin();
    const [upstream, dbResult, plan] = await Promise.all([
      fetch('https://api.elevenlabs.io/v1/voices', {
        headers: { 'xi-api-key': getApiKey() },
      }),
      admin
        .from('user_voices')
        .select('elevenlabs_voice_id, voice_name, description, created_at')
        .eq('user_id', user.id),
      getUserPlan(user.id),
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
          gender: entry.gender,
        };
      })
      .filter(<T,>(v: T | null): v is T => v !== null);

    return res.status(200).json({
      stockVoices,
      myVoices,
      libraryVoices,
      quotaUsed: myIdSet.size,
      quotaMax: getVoiceSlotMax(plan),
    });
  } catch (err: any) {
    const msg = err?.message ?? 'unknown';
    console.error('[api/elevenlabs/voices] error:', msg);
    return res.status(502).json({ error: 'elevenlabs_error', detail: msg });
  }
}

async function handleClone(req: VercelRequest, res: VercelResponse) {
  if (!isCloningEnabled()) {
    return res.status(503).json({
      error: 'feature_disabled',
      message: 'Voice cloning is not yet available.',
    });
  }

  const user = await requireUser(req, res);
  if (!user) return;

  const parsed = CloneBody.safeParse(req.body ?? {});
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

  const plan = await getUserPlan(user.id);
  const dailyLimit = CLONE_DAILY[plan];
  if (dailyLimit <= 0) {
    return res.status(403).json({
      error: 'plan_does_not_allow_cloning',
      message: 'Voice cloning requires a Pro plan or higher. Upgrade to start cloning voices.',
      plan,
    });
  }
  const withinDaily = await rateLimitCheck(
    cloneDailyKey(user.id),
    dailyLimit,
    DAILY_WINDOW_SECONDS
  );
  if (!withinDaily) {
    res.setHeader('Retry-After', String(DAILY_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'daily_quota_reached',
      scope: 'elevenlabs-clone-daily',
      message: `You've used all ${dailyLimit} voice clones in your daily ${plan.toUpperCase()} budget. Wait for the rolling 24h window to reset, or upgrade for a larger budget.`,
      plan,
      daily_limit: dailyLimit,
    });
  }

  const admin = getSupabaseAdmin();

  const { count: usedCount, error: countError } = await admin
    .from('user_voices')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id);
  if (countError) {
    console.error('[api/elevenlabs/voices clone] quota query error:', countError.message);
    return res.status(500).json({ error: 'quota_check_failed' });
  }
  const slotMax = getVoiceSlotMax(plan);
  if ((usedCount ?? 0) >= slotMax) {
    return res.status(409).json({
      error: 'voice_quota_reached',
      message: `Your ${plan.toUpperCase()} plan allows up to ${slotMax} stored cloned voice${slotMax === 1 ? '' : 's'}. Delete an existing voice to create a new one, or upgrade for more slots.`,
      quotaUsed: usedCount ?? 0,
      quotaMax: slotMax,
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
      console.error('[api/elevenlabs/voices clone] upstream error:', upstream.status, detail);
      const mapped = mapElevenLabsError(upstream.status, detail);
      const httpStatus = upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status;
      return res.status(httpStatus).json({ error: mapped.code, message: mapped.message, detail });
    }

    const result = await upstream.json().catch(() => ({} as any));
    const voiceId: string | undefined = result?.voice_id;
    if (!voiceId) {
      console.error('[api/elevenlabs/voices clone] no voice_id in response:', result);
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
      console.error('[api/elevenlabs/voices clone] db insert error:', insertError.message);
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
    console.error('[api/elevenlabs/voices clone] error:', msg);
    return res.status(502).json({ error: 'elevenlabs_error', detail: msg });
  }
}

async function handleDelete(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req, res);
  if (!user) return;

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
    console.error('[api/elevenlabs/voices delete] lookup error:', lookupError.message);
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
      console.error('[api/elevenlabs/voices delete] upstream error:', upstream.status, detail);
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
      console.error('[api/elevenlabs/voices delete] db delete error:', deleteError.message);
      return res.status(500).json({
        error: 'db_delete_failed',
        message: 'Voice was removed from ElevenLabs but our database delete failed. Please contact support.',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err: any) {
    const msg = err?.message ?? 'unknown';
    console.error('[api/elevenlabs/voices delete] error:', msg);
    return res.status(502).json({ error: 'elevenlabs_error', detail: msg });
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  switch (req.method) {
    case 'GET':
      return handleList(req, res);
    case 'POST':
      return handleClone(req, res);
    case 'DELETE':
      return handleDelete(req, res);
    default:
      res.setHeader('Allow', 'GET, POST, DELETE');
      return res.status(405).json({ error: 'method_not_allowed' });
  }
}
