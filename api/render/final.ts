import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { putMedia, getMediaUrl } from '../_lib/mediaStore.js';
import { renderFinalVideo } from '../_lib/renderFfmpeg.js';
import { resolvePreset, rotationSeed, fnv1a, type RenderPreset } from '../_lib/renderPresets.js';
import { statusKey, finalKey, writeSidecar } from '../_lib/renderJob.js';
import { getRequestId } from '../_lib/requestId.js';
import type { FinalRenderScene, FinalRenderEndCard } from '../../types.js';

// Final-render executor — FIRE half (Phase 2 of render_pipeline_voice_10.md).
// Async fire-then-poll, out-of-band of the 55s client abort: returns a jobId
// immediately, runs the ffmpeg trim/mux/concat in the background (waitUntil on
// Vercel; floating promise in dev), and reports progress via a status sidecar
// that api/render/final/poll.ts reads.

const OverlayTextSchema = z.object({
  text: z.string().max(120),
  startSec: z.number().nonnegative(),
  endSec: z.number().nonnegative(),
  style: z.enum(['hook', 'callout', 'subtitle', 'punchline']),
  position: z.enum(['top', 'center', 'bottom']),
});

const SfxCueSchema = z.object({
  sfxId: z.enum([
    'whoosh', 'glitch', 'pop', 'ding', 'riser',
    'drop', 'snap', 'swish', 'boom', 'sparkle',
  ]),
  anchorSec: z.number().nonnegative(),
  reason: z.string().optional(),
});

const SceneSchema = z.object({
  sceneIdx: z.number().int().nonnegative(),
  videoUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), 'videoUrl must be an https URL'),
  audioUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), 'audioUrl must be an https URL')
    .nullish(),
  targetDurationSec: z.number().positive().nullish(),
  keepFullClip: z.boolean().optional(),
  fallbackDurationSec: z.number().positive().optional(),
  // Burn-in (from the EDL). All optional — absent → today's bare stitch for that scene.
  overlayText: z.array(OverlayTextSchema).max(8).optional(),
  sfxCues: z.array(SfxCueSchema).max(8).optional(),
  transitionIn: z
    .object({
      type: z.enum(['cut', 'flash', 'whip', 'zoom', 'particles']),
      durationSec: z.number().nonnegative(),
    })
    .optional(),
  cameraEffect: z.enum(['zoom-in', 'zoom-out', 'pan', 'shake', 'none']).optional(),
  // Overlay/caption engine inputs.
  scriptLine: z.string().max(500).optional(),
  sceneType: z.enum(['talking', 'b-roll', 'cinematic']).optional(),
  isHook: z.boolean().optional(),
  captionRegion: z
    .object({ yFracTop: z.number().min(0).max(1), yFracBottom: z.number().min(0).max(1) })
    .optional(),
  // Measured VO word timings (forced alignment) — real caption pacing.
  voiceWords: z
    .array(z.object({ text: z.string().max(80), start: z.number().nonnegative(), end: z.number().nonnegative() }))
    .max(200)
    .optional(),
});

const Body = z.object({
  scenes: z.array(SceneSchema).min(1).max(12),
  aspectRatio: z.enum(['9:16', '16:9', '1:1']),
  music: z
    .object({
      style: z.enum(['mrbeast', 'temu', 'testimonial', 'ugcpro']),
      enabled: z.boolean(),
      // Optional generated bed (from api/music/compose). When present + reachable
      // it overrides the static `style` bed; absent/unreachable → static fallback.
      // `style` is still required: it drives resolvePreset() and is the fallback.
      bedUrl: z
        .string()
        .url()
        .refine((u) => u.startsWith('https://'), 'bedUrl must be an https URL')
        .optional(),
      // 'bed' (default) ducks under VO; 'lead' (no-VO Pure Hype) plays music at full gain, no ducking.
      role: z.enum(['bed', 'lead']).optional(),
    })
    .optional(),
  // Explicit edit-style override (kill switch / future UI picker). Absent →
  // deterministic rotation keyed by script style + scene-URL hash.
  preset: z.object({ id: z.enum(['none', 'classic', 'impact', 'hype', 'clean', 'punch', 'bars', 'spotlight']).optional() }).optional(),
  // Offer-recap overlay burned into the LAST scene, held to its end. (Price
  // anchor removed 2026-06-13 — stale clients still sending priceAnchorText
  // are fine: z.object strips unknown keys.)
  endCard: z
    .object({
      recapText: z.string().max(80).optional(),
    })
    .optional(),
});

const RENDER_LIMIT = 6;
const RENDER_WINDOW_SECONDS = 600; // 6 renders / 10 min (renders are expensive)
const SIGNED_URL_TTL_SECONDS = 86_400; // 24h

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rid = getRequestId(req);
  res.setHeader('x-request-id', rid);

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

  const { scenes, aspectRatio, music, preset: presetReq, endCard } = parsed.data;

  // Edit-style preset: same ad re-renders identically (seed = sorted videoUrls),
  // successive ads rotate looks within the script style's pool. classic = today.
  const seed = rotationSeed(scenes.map((s) => s.videoUrl));
  const preset = resolvePreset(music?.style, presetReq?.id, seed);
  // Same seed also rotates the premium hook palette (independent of preset id).
  const variantSeed = fnv1a(seed);

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

  // Write 'processing' BEFORE returning so the first poll never 404s. Stamp
  // startedAt (age backstop anchor) + updatedAt (heartbeat freshness) so the
  // poll-side watchdog has both timestamps from the very first poll.
  const startedAt = new Date().toISOString();
  await writeSidecar(statusKey(user.id, jobId), {
    status: 'processing',
    startedAt,
    updatedAt: startedAt,
  });

  const work = runRender(user.id, jobId, rid, startedAt, scenes as FinalRenderScene[], aspectRatio, music, preset, variantSeed, endCard).catch(() => {});

  if (process.env.VERCEL) {
    try {
      const { waitUntil } = await import('@vercel/functions');
      waitUntil(work);
    } catch (err) {
      console.error('[api/render/final] waitUntil unavailable:', { rid, err });
    }
  }

  return res.status(202).json({ jobId });
}

async function runRender(
  userId: string,
  jobId: string,
  rid: string,
  startedAt: string,
  scenes: FinalRenderScene[],
  aspectRatio: '9:16' | '16:9' | '1:1',
  music?: { style: 'mrbeast' | 'temu' | 'testimonial' | 'ugcpro'; enabled: boolean; bedUrl?: string; role?: 'bed' | 'lead' },
  preset?: RenderPreset,
  variantSeed?: number,
  endCard?: FinalRenderEndCard
): Promise<void> {
  const sKey = statusKey(userId, jobId);
  // Heartbeat: re-stamp the sidecar's updatedAt at pipeline boundaries so a live
  // render stays fresh past the 120s watchdog. Throttled to ≤1 write per ~15s
  // (cheaper than a write per step) and fire-and-forget — a heartbeat write must
  // never block or fail the render. startedAt is preserved so the age backstop keeps
  // its anchor across rewrites.
  let lastBeat = 0;
  // Terminal-write guard: a slow in-flight heartbeat PUT landing AFTER the 'done'
  // write would revert the sidecar to 'processing' and the watchdog would then
  // falsely fail a successful render. Track the last beat's promise and await it
  // before any terminal write so the terminal state always lands last.
  let lastBeatWrite: Promise<void> = Promise.resolve();
  const onStep = (label: string) => {
    const now = Date.now();
    if (now - lastBeat < 15_000) return;
    lastBeat = now;
    lastBeatWrite = writeSidecar(sKey, {
      status: 'processing',
      startedAt,
      updatedAt: new Date().toISOString(),
      step: label,
    }).catch(() => {});
  };
  try {
    const { buffer } = await renderFinalVideo(scenes, aspectRatio, music, preset, variantSeed, endCard, onStep);

    // The upload/sign tail runs AFTER ffmpeg is done but BEFORE the terminal write — a
    // multi-MB putMedia plus two signing calls. Unbeaten, that window could exceed the 120s
    // watchdog and let a poll fail a render that is actually succeeding. Both beats write
    // status:'processing', which is safe: the `await lastBeatWrite` below guarantees the
    // terminal state lands last.
    onStep('upload');
    const fKey = finalKey(userId, jobId);
    const upload = await putMedia(fKey, buffer, 'video/mp4', { cacheControl: '3600', upsert: true });
    if (upload.error) throw new Error(`upload_failed: ${upload.error}`);

    onStep('sign');
    const playSign = await getMediaUrl(fKey, SIGNED_URL_TTL_SECONDS);
    // Stamp the jobId into the download filename so the creative carries its
    // attribution id on disk (grifon-<jobId>.mp4) — the Growth Loop join key.
    const dlSign = await getMediaUrl(fKey, SIGNED_URL_TTL_SECONDS, { downloadName: `grifon-${jobId}.mp4` });
    if (playSign.error || !playSign.url || dlSign.error || !dlSign.url) {
      throw new Error(`sign_failed: ${playSign.error ?? dlSign.error ?? 'unknown'}`);
    }

    await lastBeatWrite;
    await writeSidecar(sKey, {
      status: 'done',
      url: playSign.url,
      downloadUrl: dlSign.url,
      creativeId: jobId,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    const msg = err?.message ?? 'render_failed';
    console.error(`[api/render/final] job ${jobId} failed:`, { rid, msg });
    await lastBeatWrite;
    await writeSidecar(sKey, {
      status: 'failed',
      error: msg,
      updatedAt: new Date().toISOString(),
    }).catch(() => {});
  }
}
