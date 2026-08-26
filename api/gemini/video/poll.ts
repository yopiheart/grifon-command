import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getUserFromAccessToken } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';
import { putMedia, getMediaUrl } from '../../_lib/mediaStore.js';
import { extractPosterFromMp4 } from '../../_lib/videoPoster.js';

const Body = z.object({
  operation: z.unknown(),
  metadata: z
    .object({
      prompt: z.string().min(1).optional(),
      sceneIdx: z.number().int().nonnegative().optional(),
      model: z.string().optional(),
      aspectRatio: z.string().optional(),
      duration: z.number().int().positive().optional(),
    })
    .optional(),
});

const POLL_LIMIT = 60;
const POLL_WINDOW_SECONDS = 60;
const SIGNED_URL_TTL_SECONDS = 86400; // 24h

/**
 * Download the finished Veo artifact, retrying only what a retry can fix.
 *
 * By the time we reach here the clip is ALREADY GENERATED AND BILLED — this fetch merely
 * collects it. A single attempt turned two transient 503s into two permanently flagged scenes
 * on a run the customer had already paid for: the 502 below reaches
 * services/geminiService.ts:321, which throws VEO_DOWNLOAD_FAILED straight out of
 * pollUntilDone's loop, and nothing catches it. The scene dies holding a finished video.
 *
 * Retriable is a POSITIVE test, never `!ok`. A 5xx or a 429 is the download host having a
 * moment. A 4xx means the URI expired or the key is wrong, and re-asking cannot change that —
 * it only spends the 60s this function is given (vercel.json pins maxDuration 60 here).
 *
 * Deliberately NOT the orchestrator's withRetry: that lives in services/producerOrchestrator.ts,
 * client-side, and pulling a 90KB module into a serverless handler to reuse fifteen lines is the
 * wrong trade. Its 2–4s backoff is also tuned for a pipeline stage, not for a request on a clock.
 *
 * `fetchImpl` and `sleep` are injectable so the retry policy can be tested without a network or
 * a real timer — see tests/unit/veoDownloadRetry.test.ts.
 */
export const VEO_DOWNLOAD_ATTEMPTS = 3;

export type VeoDownloadResult = { ok: true; buffer: Buffer } | { ok: false; status: number };

export async function downloadVeoVideo(
  url: string,
  fetchImpl: typeof fetch = fetch,
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms)),
): Promise<VeoDownloadResult> {
  let status = 0; // 0 = never got an HTTP reply at all (network throw)
  for (let attempt = 1; attempt <= VEO_DOWNLOAD_ATTEMPTS; attempt++) {
    try {
      const fetchRes = await fetchImpl(url);
      if (fetchRes.ok) return { ok: true, buffer: Buffer.from(await fetchRes.arrayBuffer()) };
      status = fetchRes.status;
      console.error(
        `[api/gemini/video/poll] veo download failed (attempt ${attempt}/${VEO_DOWNLOAD_ATTEMPTS}):`,
        status,
      );
      if (status !== 429 && status < 500) break; // permanent — stop spending the budget
    } catch (err: any) {
      status = 0;
      console.error(
        `[api/gemini/video/poll] veo download exception (attempt ${attempt}/${VEO_DOWNLOAD_ATTEMPTS}):`,
        err?.message,
      );
    }
    if (attempt < VEO_DOWNLOAD_ATTEMPTS) await sleep(attempt * 800 + Math.random() * 400);
  }
  return { ok: false, status };
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
    `gemini:video-poll:${user.id}`,
    POLL_LIMIT,
    POLL_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(POLL_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'video-poll',
      retry_after_seconds: POLL_WINDOW_SECONDS,
    });
  }

  // Poll the operation directly via HTTP. The @google/genai SDK's
  // getVideosOperation expects a class-instance Operation (it calls
  // operation._fromAPIResponse internally), but our pass-through design
  // serializes the operation to JSON across the wire and back, stripping
  // prototype methods. The underlying REST endpoint only needs operation.name.
  const opName = (parsed.data.operation as any)?.name;
  if (typeof opName !== 'string' || opName.length === 0) {
    return res.status(400).json({ error: 'invalid_operation', detail: 'missing operation.name' });
  }
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[api/gemini/video/poll] GEMINI_API_KEY not set');
    return res.status(502).json({ error: 'gemini_error', detail: 'GEMINI_NOT_CONFIGURED' });
  }

  let op: any;
  try {
    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${opName}?key=${encodeURIComponent(apiKey)}`;
    const pollRes = await fetch(pollUrl);
    if (!pollRes.ok) {
      const detail = await pollRes.text();
      console.error('[api/gemini/video/poll] poll http failed:', pollRes.status, detail.slice(0, 500));
      const isQuota = pollRes.status === 429 || detail.includes('RESOURCE_EXHAUSTED');
      if (isQuota) {
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ error: 'gemini_quota', detail });
      }
      return res.status(502).json({ error: 'gemini_error', detail: `poll_http_${pollRes.status}` });
    }
    op = await pollRes.json();
  } catch (err: any) {
    const msg = err?.message ?? 'unknown';
    console.error('[api/gemini/video/poll] poll error:', msg);
    return res.status(502).json({ error: 'gemini_error', detail: msg });
  }

  if (!op?.done) {
    return res.status(200).json({ done: false, operation: op });
  }

  if (op.error) {
    return res.status(200).json({
      done: true,
      error: { message: op.error?.message ?? 'Unknown Veo error' },
    });
  }

  // The v1beta REST endpoint nests output under `generateVideoResponse.generatedSamples`,
  // while the SDK (when it works) flattens this to `response.generatedVideos`. Accept all
  // observed shapes so this handler tolerates SDK vs. raw REST drift.
  const generated =
    op.response?.generateVideoResponse?.generatedSamples ??
    op.response?.generate_video_response?.generated_samples ??
    op.response?.generatedVideos ??
    op.response?.generated_videos;
  const video = generated?.[0]?.video;
  if (!video) {
    console.error(
      '[api/gemini/video/poll] VEO_NO_OUTPUT — response keys:',
      op.response ? Object.keys(op.response) : 'no response',
      'full response (truncated):',
      JSON.stringify(op.response ?? {}).slice(0, 1000)
    );
    return res.status(200).json({ done: true, error: { code: 'VEO_NO_OUTPUT' } });
  }

  const mimeType = video.mimeType ?? video.mime_type ?? 'video/mp4';
  const videoBytes = video.videoBytes ?? video.video_bytes;

  let buffer: Buffer | null = null;
  if (videoBytes) {
    buffer = Buffer.from(videoBytes, 'base64');
  } else if (video.uri) {
    const key = process.env.GEMINI_API_KEY;
    const sep = video.uri.includes('?') ? '&' : '?';
    const downloadUrl = key ? `${video.uri}${sep}key=${encodeURIComponent(key)}` : video.uri;
    // Unchanged 502 shape on final failure, so geminiService's VEO_DOWNLOAD_FAILED mapping
    // (services/geminiService.ts:321) keeps working with no client change.
    const dl = await downloadVeoVideo(downloadUrl);
    if (!dl.ok) return res.status(502).json({ error: 'veo_download_failed', status: dl.status });
    buffer = dl.buffer;
  } else {
    return res.status(200).json({ done: true, error: { code: 'VEO_EMPTY_VIDEO' } });
  }

  const path = `${user.id}/${randomUUID()}.mp4`;

  const upload = await putMedia(path, buffer, mimeType, { cacheControl: '3600', upsert: false });
  if (upload.error) {
    console.error('[api/gemini/video/poll] media upload failed:', upload.error);
    return res.status(502).json({ error: 'storage_upload_failed', status: 0, detail: upload.error });
  }

  // Best-effort: write a JSON sidecar with the prompt + render context so the
  // library endpoint can hydrate past renders with their prompts. Sidecar
  // failure is non-fatal — the video is already uploaded.
  if (parsed.data.metadata) {
    const sidecarPath = `${path}.meta.json`;
    const sidecar = {
      ...parsed.data.metadata,
      videoPath: path,
      mimeType,
      createdAt: new Date().toISOString(),
    };
    const sidecarBuffer = Buffer.from(JSON.stringify(sidecar), 'utf-8');
    const sidecarUpload = await putMedia(sidecarPath, sidecarBuffer, 'application/json', {
      cacheControl: '3600',
      upsert: false,
    });
    if (sidecarUpload.error) {
      console.warn(
        '[api/gemini/video/poll] sidecar upload failed (non-fatal):',
        sidecarUpload.error
      );
    }
  }

  // Best-effort poster: a tiny first-frame JPEG so the library gallery can show
  // a thumbnail without downloading the full MP4 (the egress fix's serving half).
  // Strictly non-fatal — the video is already uploaded; a failure just falls back
  // to the gallery's static placeholder card.
  try {
    const poster = await extractPosterFromMp4(buffer);
    if (poster) {
      const posterUpload = await putMedia(`${path}.jpg`, poster, 'image/jpeg', {
        cacheControl: '3600',
        upsert: false,
      });
      if (posterUpload.error) {
        console.warn('[api/gemini/video/poll] poster upload failed (non-fatal):', posterUpload.error);
      }
    }
  } catch (err: any) {
    console.warn('[api/gemini/video/poll] poster step failed (non-fatal):', err?.message);
  }

  const playSign = await getMediaUrl(path, SIGNED_URL_TTL_SECONDS);
  const dlSign = await getMediaUrl(path, SIGNED_URL_TTL_SECONDS, { downloadName: 'grifon-video.mp4' });

  if (playSign.error || !playSign.url || dlSign.error || !dlSign.url) {
    const detail = playSign.error ?? dlSign.error ?? 'sign_failed';
    console.error('[api/gemini/video/poll] sign url failed:', detail);
    return res.status(502).json({ error: 'storage_upload_failed', status: 0, detail });
  }

  return res.status(200).json({
    done: true,
    url: playSign.url,
    downloadUrl: dlSign.url,
    mimeType,
  });
}
