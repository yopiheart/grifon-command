import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromAccessToken, getSupabaseAdmin } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { isMusicGenEnabled } from '../_lib/voiceConfig.js';
import { composeMusic } from '../_lib/elevenlabs.js';
import { musicPromptFor } from '../_lib/musicPrompts.js';
import { rotationSeed } from '../_lib/renderPresets.js';
import { RENDER_BUCKET, musicBedKey } from '../_lib/renderJob.js';
import {
  MUSIC_DAILY, MUSIC_GLOBAL_DAILY, DAILY_WINDOW_SECONDS,
  musicDailyKey, musicGlobalDailyKey,
} from '../_lib/quota.js';

// Generate (or reuse a cached) instrumental music bed via ElevenLabs Music, for
// the main ad render pipeline. PRE-STEP: the client calls this, gets a bedUrl,
// and passes it into api/render/final alongside `style`. The render downloads
// the bed and ducks it under the VO; on ANY failure here the client simply omits
// bedUrl and the render falls back to the tuned static bed. Mirrors the
// api/elevenlabs/* proxy shape (auth → rate-limit → quota → upstream).

const Body = z.object({
  style: z.enum(['mrbeast', 'temu', 'testimonial']),
  // Scene video URLs — the seed is derived server-side (rotationSeed), identical
  // to api/render/final, so the cache key matches the ad's render identity.
  videoUrls: z.array(z.string().url()).min(1).max(12),
  // Target bed length (ms) ≈ the ad's duration; clamped to ElevenLabs' window
  // (3s–600s) inside composeMusic.
  lengthMs: z.number().positive(),
});

const COMPOSE_LIMIT = 5;            // abuse guard: 5 generations / 60s per user
const COMPOSE_WINDOW_SECONDS = 60;
const SIGNED_URL_TTL_SECONDS = 86_400; // 24h — matches the render's bed lifetime

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Feature flag — ships dark. Off → 503, client falls back to the static bed.
  if (!isMusicGenEnabled()) {
    return res.status(503).json({ error: 'music_gen_disabled' });
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
  const { style, videoUrls, lengthMs } = parsed.data;

  // Tier gate (server-authoritative). free/creator = 0 → never generate, never
  // touch the credit pool. The client also hides the toggle for these tiers.
  const plan = await getUserPlan(user.id);
  if (MUSIC_DAILY[plan] <= 0) {
    return res.status(403).json({ error: 'music_gen_not_in_plan', plan });
  }

  const admin = getSupabaseAdmin();
  const seed = rotationSeed(videoUrls);
  const bedKey = musicBedKey(user.id, seed, style);

  // Cache hit: this ad already has a bed → return it, NO generation, NO quota.
  const cached = await admin.storage.from(RENDER_BUCKET).createSignedUrl(bedKey, SIGNED_URL_TTL_SECONDS);
  if (cached.data?.signedUrl && !cached.error) {
    return res.status(200).json({ bedUrl: cached.data.signedUrl, cached: true });
  }

  // Cache miss → we will generate. Apply the guards in order, cheapest first.
  const withinBurst = await rateLimitCheck(
    `music:compose:${user.id}`, COMPOSE_LIMIT, COMPOSE_WINDOW_SECONDS
  );
  if (!withinBurst) {
    res.setHeader('Retry-After', String(COMPOSE_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited', scope: 'music-compose', retry_after_seconds: COMPOSE_WINDOW_SECONDS,
    });
  }

  // "Voice wins" global circuit-breaker: a hard account-wide daily ceiling so a
  // burst of music gens can never starve the shared ElevenLabs credit pool that
  // TTS/STS depend on. Tripped → fall back to the static bed.
  const withinGlobal = await rateLimitCheck(
    musicGlobalDailyKey(), MUSIC_GLOBAL_DAILY, DAILY_WINDOW_SECONDS
  );
  if (!withinGlobal) {
    res.setHeader('Retry-After', String(DAILY_WINDOW_SECONDS));
    return res.status(429).json({ error: 'music_global_ceiling', scope: 'music-global' });
  }

  // Per-user daily quota (Pro/Business cap).
  const withinDaily = await rateLimitCheck(
    musicDailyKey(user.id), MUSIC_DAILY[plan], DAILY_WINDOW_SECONDS
  );
  if (!withinDaily) {
    res.setHeader('Retry-After', String(DAILY_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'daily_quota_reached', scope: 'music-daily', plan, daily_limit: MUSIC_DAILY[plan],
    });
  }

  try {
    const mp3 = await composeMusic(musicPromptFor(style), lengthMs);

    const upload = await admin.storage.from(RENDER_BUCKET).upload(bedKey, mp3, {
      contentType: 'audio/mpeg',
      cacheControl: '86400',
      upsert: true,
    });
    if (upload.error) throw new Error(`upload_failed: ${upload.error.message}`);

    const signed = await admin.storage.from(RENDER_BUCKET).createSignedUrl(bedKey, SIGNED_URL_TTL_SECONDS);
    if (signed.error || !signed.data?.signedUrl) {
      throw new Error(`sign_failed: ${signed.error?.message ?? 'unknown'}`);
    }
    return res.status(200).json({ bedUrl: signed.data.signedUrl, cached: false });
  } catch (err: any) {
    const msg = err?.message ?? 'unknown';
    console.error('[api/music/compose] error:', msg);
    // Non-fatal to the user flow: the client renders with the static bed instead.
    return res.status(502).json({ error: 'music_compose_failed', detail: msg });
  }
}
