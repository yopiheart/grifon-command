import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { getUserFromAccessToken, getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { TTS_DAILY, STS_DAILY, DAILY_WINDOW_SECONDS, ttsDailyKey, stsDailyKey } from '../_lib/quota.js';
import { synthesizeTts, convertSts, ElevenLabsError } from '../_lib/elevenlabs.js';
import { extractAudioFromMp4 } from '../_lib/audioExtract.js';
import { routeScene, assertUniqueSceneIdx } from '../_lib/sceneVoiceRoute.js';
import type { ConsolidationScene, ConsolidationResult } from '../../types.js';

// Server-side per-scene voice routing + Supabase persistence (Phase 1 of
// workflows/render_pipeline_voice_10.md). Replaces the browser blob: pipeline
// so the final-render executor (Phase 2) can reach every scene's voice MP3 by
// signed URL. Routes talking → STS (lip-sync), b-roll/cinematic → TTS, persists
// each MP3 to the gemini-videos bucket under ${user.id}/audio/, and returns
// 24h-signed URLs keyed by sceneIdx.

const SceneSchema = z.object({
  sceneIdx: z.number().int().nonnegative(),
  type: z.enum(['talking', 'b-roll', 'cinematic']),
  scriptLine: z.string().default(''),
  videoUrl: z.string().url().optional(),
});

const Body = z.object({
  scenes: z.array(SceneSchema).min(1).max(12),
  voiceId: z.string().min(1),
  stabilityMode: z.enum(['creative', 'natural', 'robust']).default('robust'),
});

const CONSOLIDATE_LIMIT = 6;            // batch requests / window (each fans out many EL calls)
const CONSOLIDATE_WINDOW_SECONDS = 60;
const SIGNED_URL_TTL_SECONDS = 86_400;  // 24h
const BUCKET = 'gemini-videos';
const MAX_MP4_BYTES = 60 * 1024 * 1024; // guard against pulling an oversized source

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

  const { scenes, voiceId, stabilityMode } = parsed.data;

  const keyCheck = assertUniqueSceneIdx(scenes as ConsolidationScene[]);
  if (!keyCheck.ok) {
    return res.status(400).json({ error: 'invalid_scenes', detail: keyCheck.error });
  }

  // Batch-level sliding window (each request can fan out to many ElevenLabs calls).
  const allowed = await rateLimitCheck(
    `voice:consolidate:${user.id}`,
    CONSOLIDATE_LIMIT,
    CONSOLIDATE_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(CONSOLIDATE_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'voice-consolidate',
      retry_after_seconds: CONSOLIDATE_WINDOW_SECONDS,
    });
  }

  const plan = await getUserPlan(user.id);
  const admin = getSupabaseAdmin();
  const results: ConsolidationResult[] = [];

  // Sequential per scene: respects ElevenLabs rate limits, bounds memory, and
  // lets one scene fail without sinking the batch (partial results returned).
  for (const scene of scenes as ConsolidationScene[]) {
    const route = routeScene(scene);

    if (route.action === 'skip') {
      results.push({ sceneIdx: scene.sceneIdx, audioUrl: null, skipped: true, error: route.reason });
      continue;
    }

    // Per-tier daily cap, consumed per upstream call (STS for talking, TTS otherwise).
    const dailyLimit = route.unit === 'sts' ? STS_DAILY[plan] : TTS_DAILY[plan];
    const dailyKey = route.unit === 'sts' ? stsDailyKey(user.id) : ttsDailyKey(user.id);
    const withinDaily = await rateLimitCheck(dailyKey, dailyLimit, DAILY_WINDOW_SECONDS);
    if (!withinDaily) {
      results.push({
        sceneIdx: scene.sceneIdx,
        audioUrl: null,
        error: `daily_quota_reached:${route.unit}:${plan}:${dailyLimit}`,
      });
      continue;
    }

    try {
      let mp3: Buffer;
      if (route.action === 'sts') {
        const mp4 = await fetchVideoBuffer(route.videoUrl);
        const sourceAudio = await extractAudioFromMp4(mp4);
        mp3 = await convertSts(voiceId, sourceAudio, 'audio/mpeg', stabilityMode);
      } else {
        // 'tts' or 'tts-fallback'
        mp3 = await synthesizeTts(voiceId, route.text, stabilityMode);
      }

      const path = `${user.id}/audio/${randomUUID()}.mp3`;
      const upload = await admin.storage.from(BUCKET).upload(path, mp3, {
        contentType: 'audio/mpeg',
        cacheControl: '3600',
        upsert: false,
      });
      if (upload.error) {
        results.push({ sceneIdx: scene.sceneIdx, audioUrl: null, error: `storage_upload_failed:${upload.error.message}` });
        continue;
      }

      const sign = await admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
      if (sign.error || !sign.data?.signedUrl) {
        results.push({ sceneIdx: scene.sceneIdx, audioUrl: null, error: `sign_failed:${sign.error?.message ?? 'unknown'}` });
        continue;
      }

      results.push({ sceneIdx: scene.sceneIdx, audioUrl: sign.data.signedUrl });
    } catch (err: any) {
      const reason =
        err instanceof ElevenLabsError ? `elevenlabs_${err.status}` :
        err?.name === 'AudioExtractError' ? `audio_extract:${err.message}` :
        (err?.message ?? 'unknown');
      console.error(`[api/voice/consolidate] scene ${scene.sceneIdx} failed:`, reason);
      results.push({ sceneIdx: scene.sceneIdx, audioUrl: null, error: reason });
    }
  }

  return res.status(200).json({ results });
}

async function fetchVideoBuffer(url: string): Promise<Buffer> {
  const r = await fetch(url);
  if (!r.ok) {
    throw new Error(`video_fetch_failed_${r.status}`);
  }
  const len = Number(r.headers.get('content-length') ?? 0);
  if (len > MAX_MP4_BYTES) {
    throw new Error(`video_too_large_${len}`);
  }
  const arr = await r.arrayBuffer();
  if (arr.byteLength > MAX_MP4_BYTES) {
    throw new Error(`video_too_large_${arr.byteLength}`);
  }
  return Buffer.from(arr);
}
