import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getUserFromAccessToken, getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';
import { getKlingAccessToken, invalidateKlingAccessToken, KLING_API_BASE } from '../../_lib/klingAuth.js';

const Body = z.object({
  operation: z.object({
    task_id: z.string().min(1),
    task_status: z.string().optional(),
    model_name: z.string().optional(),
    created_at: z.number().optional(),
  }),
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
// Reused with Veo + Kling V3. Renaming to a generic 'videos' is a P3 cleanup.
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

  // Own rate-limit pool — poll is read-only and called once every 10s per
  // in-flight job; separate counter from the submit pool avoids burning the
  // submit budget on long-running polls.
  const allowed = await rateLimitCheck(
    `kling:omni-video-poll:${user.id}`,
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

  const taskId = parsed.data.operation.task_id;

  let jwt: string;
  try {
    jwt = getKlingAccessToken();
  } catch (err: any) {
    console.error('[api/kling/omni-video/poll] auth error:', err?.message);
    return res.status(502).json({ error: 'kling_error', detail: err?.message ?? 'auth_failed' });
  }

  const pollKling = async (token: string) => {
    const upstream = await fetch(`${KLING_API_BASE}/v1/videos/omni-video/${encodeURIComponent(taskId)}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const text = await upstream.text();
    let json: any = null;
    try { json = JSON.parse(text); } catch { /* leave null */ }
    return { status: upstream.status, ok: upstream.ok, text, json };
  };

  let upstreamStatus = 0;
  let upstreamJson: any = null;
  try {
    let r = await pollKling(jwt);
    // One-shot 401 refresh — see api/kling/video.ts for rationale.
    if (r.status === 401) {
      console.warn('[api/kling/omni-video/poll] upstream 401 — refreshing JWT and retrying once');
      invalidateKlingAccessToken();
      jwt = getKlingAccessToken();
      r = await pollKling(jwt);
    }
    upstreamStatus = r.status;
    upstreamJson = r.json;
    if (!r.ok) {
      if (upstreamStatus === 401) {
        console.error('[api/kling/omni-video/poll] upstream 401 after refresh — JWT still rejected:', r.text.slice(0, 500));
        return res.status(502).json({ error: 'kling_auth_failed', detail: 'Kling rejected the proxy JWT.' });
      }
      if (upstreamStatus >= 400 && upstreamStatus < 500) {
        return res.status(upstreamStatus).json({
          error: 'kling_invalid_argument',
          detail: upstreamJson?.message ?? r.text.slice(0, 500),
          kling_code: upstreamJson?.code,
        });
      }
      console.error('[api/kling/omni-video/poll] upstream 5xx:', upstreamStatus, r.text.slice(0, 500));
      return res.status(502).json({ error: 'kling_error', detail: `upstream_${upstreamStatus}` });
    }
  } catch (err: any) {
    console.error('[api/kling/omni-video/poll] fetch error:', err?.message);
    return res.status(502).json({ error: 'kling_error', detail: err?.message ?? 'fetch_failed' });
  }

  if (upstreamJson?.code !== 0 || !upstreamJson?.data) {
    return res.status(502).json({
      error: 'kling_error',
      detail: upstreamJson?.message ?? 'unexpected_response_shape',
    });
  }

  const data = upstreamJson.data;
  const status = data.task_status;

  if (status === 'submitted' || status === 'processing') {
    return res.status(200).json({
      done: false,
      operation: {
        task_id: data.task_id,
        task_status: status,
        model_name: parsed.data.operation.model_name,
        created_at: data.created_at,
      },
    });
  }

  if (status === 'failed') {
    return res.status(200).json({
      done: true,
      error: {
        code: 'KLING_TASK_FAILED',
        message: data.task_status_msg ?? 'Kling Omni render failed',
      },
    });
  }

  if (status !== 'succeed') {
    return res.status(200).json({
      done: true,
      error: { code: 'KLING_UNKNOWN_STATUS', message: `Unexpected task_status: ${status}` },
    });
  }

  // status === 'succeed'
  const video = data.task_result?.videos?.[0];
  if (!video?.url) {
    console.error('[api/kling/omni-video/poll] KLING_NO_OUTPUT — response:', JSON.stringify(data).slice(0, 1000));
    return res.status(200).json({ done: true, error: { code: 'KLING_NO_OUTPUT' } });
  }

  let buffer: Buffer;
  try {
    const fetchRes = await fetch(video.url);
    if (!fetchRes.ok) {
      console.error('[api/kling/omni-video/poll] kling download failed:', fetchRes.status);
      return res.status(502).json({ error: 'kling_download_failed', status: fetchRes.status });
    }
    const arr = await fetchRes.arrayBuffer();
    buffer = Buffer.from(arr);
  } catch (err: any) {
    console.error('[api/kling/omni-video/poll] kling download exception:', err?.message);
    return res.status(502).json({ error: 'kling_download_failed', status: 0 });
  }

  const mimeType = 'video/mp4';
  const path = `${user.id}/${randomUUID()}.mp4`;
  const admin = getSupabaseAdmin();

  const upload = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: mimeType,
    cacheControl: '3600',
    upsert: false,
  });
  if (upload.error) {
    console.error('[api/kling/omni-video/poll] supabase upload failed:', upload.error.message);
    return res.status(502).json({ error: 'storage_upload_failed', status: 0, detail: upload.error.message });
  }

  if (parsed.data.metadata) {
    const sidecarPath = `${path}.meta.json`;
    const sidecar = {
      ...parsed.data.metadata,
      model: parsed.data.metadata.model ?? 'Kling_O1',
      videoPath: path,
      mimeType,
      createdAt: new Date().toISOString(),
      klingTaskId: data.task_id,
      // Omni's response-envelope credit-charge field may differ from V3's
      // `final_unit_deduction`. If absent, sidecar logs undefined; non-fatal.
      klingCreditsCharged: data.final_unit_deduction,
    };
    const sidecarBuffer = Buffer.from(JSON.stringify(sidecar), 'utf-8');
    const sidecarUpload = await admin.storage.from(BUCKET).upload(sidecarPath, sidecarBuffer, {
      contentType: 'application/json',
      cacheControl: '3600',
      upsert: false,
    });
    if (sidecarUpload.error) {
      console.warn(
        '[api/kling/omni-video/poll] sidecar upload failed (non-fatal):',
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
    console.error('[api/kling/omni-video/poll] sign url failed:', detail);
    return res.status(502).json({ error: 'storage_upload_failed', status: 0, detail });
  }

  return res.status(200).json({
    done: true,
    url: playSign.data.signedUrl,
    downloadUrl: dlSign.data.signedUrl,
    mimeType,
  });
}
