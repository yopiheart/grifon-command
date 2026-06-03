import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getUserFromAccessToken, getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { renderFinalVideo } from '../_lib/renderFfmpeg.js';
import { statusKey, finalKey, writeSidecar, RENDER_BUCKET } from '../_lib/renderJob.js';
import type { FinalRenderScene } from '../../types.js';

// Final-render executor — FIRE half (Phase 2 of render_pipeline_voice_10.md).
// Async fire-then-poll, out-of-band of the 55s client abort: returns a jobId
// immediately, runs the ffmpeg trim/mux/concat in the background (waitUntil on
// Vercel; floating promise in dev), and reports progress via a status sidecar
// that api/render/final/poll.ts reads.

const SceneSchema = z.object({
  sceneIdx: z.number().int().nonnegative(),
  videoUrl: z.string().url(),
  audioUrl: z.string().url().nullish(),
  fallbackDurationSec: z.number().positive().optional(),
});

const Body = z.object({
  scenes: z.array(SceneSchema).min(1).max(12),
  aspectRatio: z.enum(['9:16', '16:9', '1:1']),
});

const RENDER_LIMIT = 6;
const RENDER_WINDOW_SECONDS = 600; // 6 renders / 10 min (renders are expensive)
const SIGNED_URL_TTL_SECONDS = 86_400; // 24h

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

  const { scenes, aspectRatio } = parsed.data;

  // Audio↔video keying contract (premortem #4a): sceneIdx must be unique.
  const idxSeen = new Set<number>();
  for (const s of scenes) {
    if (idxSeen.has(s.sceneIdx)) {
      return res.status(400).json({ error: 'duplicate_scene_idx', detail: String(s.sceneIdx) });
    }
    idxSeen.add(s.sceneIdx);
  }

  const allowed = await rateLimitCheck(`render:final:${user.id}`, RENDER_LIMIT, RENDER_WINDOW_SECONDS);
  if (!allowed) {
    res.setHeader('Retry-After', String(RENDER_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'render-final',
      retry_after_seconds: RENDER_WINDOW_SECONDS,
    });
  }

  const jobId = randomUUID();
  const admin = getSupabaseAdmin();

  // Write 'processing' BEFORE returning so the first poll never 404s.
  await writeSidecar(admin, statusKey(user.id, jobId), {
    status: 'processing',
    updatedAt: new Date().toISOString(),
  });

  const work = runRender(user.id, jobId, scenes as FinalRenderScene[], aspectRatio).catch(() => {});

  if (process.env.VERCEL) {
    try {
      const { waitUntil } = await import('@vercel/functions');
      waitUntil(work);
    } catch (err) {
      console.error('[api/render/final] waitUntil unavailable:', err);
    }
  }

  return res.status(202).json({ jobId });
}

async function runRender(
  userId: string,
  jobId: string,
  scenes: FinalRenderScene[],
  aspectRatio: '9:16' | '16:9' | '1:1'
): Promise<void> {
  const admin = getSupabaseAdmin();
  const sKey = statusKey(userId, jobId);
  try {
    const { buffer } = await renderFinalVideo(scenes, aspectRatio);

    const fKey = finalKey(userId, jobId);
    const upload = await admin.storage.from(RENDER_BUCKET).upload(fKey, buffer, {
      contentType: 'video/mp4',
      cacheControl: '3600',
      upsert: true,
    });
    if (upload.error) throw new Error(`upload_failed: ${upload.error.message}`);

    const playSign = await admin.storage.from(RENDER_BUCKET).createSignedUrl(fKey, SIGNED_URL_TTL_SECONDS);
    const dlSign = await admin.storage
      .from(RENDER_BUCKET)
      .createSignedUrl(fKey, SIGNED_URL_TTL_SECONDS, { download: 'grifon-final.mp4' });
    if (playSign.error || !playSign.data?.signedUrl || dlSign.error || !dlSign.data?.signedUrl) {
      throw new Error(`sign_failed: ${playSign.error?.message ?? dlSign.error?.message ?? 'unknown'}`);
    }

    await writeSidecar(admin, sKey, {
      status: 'done',
      url: playSign.data.signedUrl,
      downloadUrl: dlSign.data.signedUrl,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    const msg = err?.message ?? 'render_failed';
    console.error(`[api/render/final] job ${jobId} failed:`, msg);
    await writeSidecar(admin, sKey, {
      status: 'failed',
      error: msg,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }
}
