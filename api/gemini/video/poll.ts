import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getUserFromAccessToken, getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';

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
const BUCKET = 'gemini-videos';

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
    try {
      const fetchRes = await fetch(downloadUrl);
      if (!fetchRes.ok) {
        console.error('[api/gemini/video/poll] veo download failed:', fetchRes.status);
        return res.status(502).json({ error: 'veo_download_failed', status: fetchRes.status });
      }
      const arr = await fetchRes.arrayBuffer();
      buffer = Buffer.from(arr);
    } catch (err: any) {
      console.error('[api/gemini/video/poll] veo download exception:', err?.message);
      return res.status(502).json({ error: 'veo_download_failed', status: 0 });
    }
  } else {
    return res.status(200).json({ done: true, error: { code: 'VEO_EMPTY_VIDEO' } });
  }

  const path = `${user.id}/${randomUUID()}.mp4`;
  const admin = getSupabaseAdmin();

  const upload = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    cacheControl: '3600',
    upsert: false,
  });
  if (upload.error) {
    console.error('[api/gemini/video/poll] supabase upload failed:', upload.error.message);
    return res.status(502).json({ error: 'storage_upload_failed', status: 0, detail: upload.error.message });
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
    const sidecarUpload = await admin.storage.from(BUCKET).upload(sidecarPath, sidecarBuffer, {
      contentType: 'application/json',
      cacheControl: '3600',
      upsert: false,
    });
    if (sidecarUpload.error) {
      console.warn(
        '[api/gemini/video/poll] sidecar upload failed (non-fatal):',
        sidecarUpload.error.message
      );
    }
  }

  const playSign = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  const dlSign = await admin.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: 'grifon-video.mp4' });

  if (playSign.error || !playSign.data?.signedUrl || dlSign.error || !dlSign.data?.signedUrl) {
    const detail = playSign.error?.message ?? dlSign.error?.message ?? 'sign_failed';
    console.error('[api/gemini/video/poll] sign url failed:', detail);
    return res.status(502).json({ error: 'storage_upload_failed', status: 0, detail });
  }

  return res.status(200).json({
    done: true,
    url: playSign.data.signedUrl,
    downloadUrl: dlSign.data.signedUrl,
    mimeType,
  });
}
