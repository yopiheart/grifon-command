import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getUserFromAccessToken } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';
import { putMedia, getMediaUrl, downloadMediaText } from '../../_lib/mediaStore.js';
import { extractPosterFromMp4 } from '../../_lib/videoPoster.js';
import { runOmniGate, type OmniGateResult } from '../../_lib/omniGate.js';

// api/gemini/omni-video/poll.ts — poll one Omni edit interaction. Mirrors
// api/gemini/video/poll.ts (putMedia → poster → 24h signed URLs) but reads the
// raw REST interaction shape used by tools/omni_edit.py `_extract_video`
// (output_video.data base64 OR steps[].content[] type=video). Blocked/failed
// interactions return 200 with an error code — NOT a throw — so the client can
// run the FFmpeg-only fallback ladder.

const GENAI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

const Body = z.object({
  interactionId: z.string().min(1),
});

const POLL_LIMIT = 60;
const POLL_WINDOW_SECONDS = 60;
const SIGNED_URL_TTL_SECONDS = 86400; // 24h

// Status buckets — mirror tools/omni_edit.py's polling loop.
const IN_PROGRESS = new Set(['in_progress', 'processing', 'pending', 'queued']);
const DONE_OK = new Set(['completed', 'succeeded']);

const looksBlocked = (raw: string): boolean =>
  /safety|blocked|block_reason|blockreason|harmful|prohibited/i.test(raw);

/** Pull video bytes out of the interaction across the two documented shapes. */
function extractVideoBytes(interaction: any): Buffer | null {
  const outData = interaction?.output_video?.data;
  if (outData) return Buffer.from(outData, 'base64');
  for (const step of interaction?.steps ?? []) {
    if (step?.type !== 'model_output') continue;
    for (const part of step?.content ?? []) {
      if (part?.type === 'video' && part?.data) return Buffer.from(part.data, 'base64');
    }
  }
  return null;
}

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
    `gemini:omni-poll:${user.id}`,
    POLL_LIMIT,
    POLL_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(POLL_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'omni-poll',
      retry_after_seconds: POLL_WINDOW_SECONDS,
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[api/gemini/omni-video/poll] GEMINI_API_KEY not set');
    return res.status(502).json({ error: 'gemini_error', detail: 'GEMINI_NOT_CONFIGURED' });
  }

  const interactionId = parsed.data.interactionId;

  let status = 0;
  let text = '';
  let interaction: any = null;
  try {
    const upstream = await fetch(
      `${GENAI_BASE}/interactions/${encodeURIComponent(interactionId)}`,
      { headers: { 'x-goog-api-key': apiKey } }
    );
    status = upstream.status;
    text = await upstream.text();
    try {
      interaction = JSON.parse(text);
    } catch {
      /* leave null */
    }
    if (!upstream.ok) {
      // Blocked-at-poll: with background:true, Google defers the safety verdict —
      // a blocked interaction returns HTTP 400 "Request blocked due to safety
      // violations" on GET, not a failed status on an OK response (live smoke
      // 2026-07-06). Classify it BEFORE the infra-error paths so the client
      // ladder gets its omni_blocked signal instead of a retryable-looking 502.
      if (looksBlocked(text)) {
        return res.status(200).json({ done: true, error: 'omni_blocked' });
      }
      const isQuota = status === 429 || /resource_exhausted/i.test(text);
      if (isQuota) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ error: 'gemini_quota', detail: text.slice(0, 300) });
      }
      console.error('[api/gemini/omni-video/poll] poll http failed:', status, text.slice(0, 500));
      return res.status(502).json({ error: 'gemini_error', detail: `poll_http_${status}` });
    }
  } catch (err: any) {
    console.error('[api/gemini/omni-video/poll] poll error:', err?.message);
    return res.status(502).json({ error: 'gemini_error', detail: err?.message ?? 'fetch_failed' });
  }

  const interactionStatus: string = interaction?.status ?? 'completed';

  if (IN_PROGRESS.has(interactionStatus)) {
    return res.status(200).json({ done: false });
  }

  if (!DONE_OK.has(interactionStatus)) {
    // failed / cancelled / incomplete / blocked → let the client run the ladder.
    return res.status(200).json({
      done: true,
      error: looksBlocked(text) ? 'omni_blocked' : 'omni_failed',
    });
  }

  // Done + succeeded — extract the edited MP4.
  const buffer = extractVideoBytes(interaction);
  if (!buffer || buffer.byteLength === 0) {
    console.error(
      '[api/gemini/omni-video/poll] OMNI_NO_OUTPUT — response (truncated):',
      text.slice(0, 1000)
    );
    return res.status(200).json({ done: true, error: 'omni_failed' });
  }

  // QA gate — read the sidecar written at fire time (${uid}/omni-meta/${id}.json)
  // and run the vision check against the produced clip. Missing sidecar or any
  // infra hiccup FAILS OPEN (never discards this already-paid output); the
  // CLIENT decides retry/fallback on a real gate fail. We still upload + sign the
  // mp4 either way, and return the verdict alongside the url.
  let gate: OmniGateResult = { pass: true, reasons: ['gate_unavailable'] };
  try {
    const sidecarKey = `${user.id}/omni-meta/${interactionId}.json`;
    const { text: sidecarText } = await downloadMediaText(sidecarKey);
    if (sidecarText) {
      const meta = JSON.parse(sidecarText) as {
        directedWords?: string[];
        expectPerson?: boolean;
      };
      gate = await runOmniGate(buffer, {
        directedWords: Array.isArray(meta.directedWords) ? meta.directedWords : [],
        expectPerson: meta.expectPerson === true,
      });
    } else {
      console.warn('[api/gemini/omni-video/poll] gate sidecar missing — failing open');
    }
  } catch (err: any) {
    console.warn('[api/gemini/omni-video/poll] gate step failed (non-fatal, failing open):', err?.message);
  }

  const mimeType = 'video/mp4';
  // Root-level `${uid}/${uuid}.mp4` so api/cron/cleanup-gemini-videos.ts reaps it
  // (it walks each user folder and deletes aged files directly under it).
  const path = `${user.id}/${randomUUID()}.mp4`;

  const upload = await putMedia(path, buffer, mimeType, { cacheControl: '3600', upsert: false });
  if (upload.error) {
    console.error('[api/gemini/omni-video/poll] media upload failed:', upload.error);
    return res.status(502).json({ error: 'storage_upload_failed', status: 0, detail: upload.error });
  }

  // Best-effort poster (non-fatal) — see api/gemini/video/poll.ts.
  try {
    const poster = await extractPosterFromMp4(buffer);
    if (poster) {
      const posterUpload = await putMedia(`${path}.jpg`, poster, 'image/jpeg', {
        cacheControl: '3600',
        upsert: false,
      });
      if (posterUpload.error) {
        console.warn('[api/gemini/omni-video/poll] poster upload failed (non-fatal):', posterUpload.error);
      }
    }
  } catch (err: any) {
    console.warn('[api/gemini/omni-video/poll] poster step failed (non-fatal):', err?.message);
  }

  const playSign = await getMediaUrl(path, SIGNED_URL_TTL_SECONDS);
  const dlSign = await getMediaUrl(path, SIGNED_URL_TTL_SECONDS, { downloadName: 'grifon-video.mp4' });

  if (playSign.error || !playSign.url || dlSign.error || !dlSign.url) {
    const detail = playSign.error ?? dlSign.error ?? 'sign_failed';
    console.error('[api/gemini/omni-video/poll] sign url failed:', detail);
    return res.status(502).json({ error: 'storage_upload_failed', status: 0, detail });
  }

  return res.status(200).json({
    done: true,
    url: playSign.url,
    downloadUrl: dlSign.url,
    mimeType,
    gate,
  });
}
