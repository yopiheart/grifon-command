import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromAccessToken } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';
import { getUserPlan } from '../../_lib/userPlan.js';
import { consumeOmniAd } from '../../_lib/quota.js';
import { shouldConsumeOmniAd } from '../../_lib/omniBilling.js';

// api/gemini/omni-video/consume.ts — DEFERRED-CONSUME endpoint for the Omni
// "Applying style" pass (Slice 3b). The fire path (api/gemini/omni-video.ts)
// only PEEKS the allowance; the actual monthly/credit charge happens HERE, once
// the client knows how the whole ad's routed scenes landed. There is no
// un-consume primitive, so we can only charge after the pass settles with a
// non-fallback majority (api/_lib/omniBilling.ts shouldConsumeOmniAd).
//
// Accepted beta trust boundary: a client that never calls this endpoint gets
// free styling. That surface is bounded by (a) the Business-only fire gate and
// (b) the 12-call/day per-ad budget on the fire path — a determined bypass buys
// at most one ad's worth of styling per day, per ad. Server-authoritative
// billing on the render itself is a parked follow-up.

const CONSUME_LIMIT = 10;
const CONSUME_WINDOW_SECONDS = 600;

const Body = z.object({
  finishedAdId: z.string().min(1),
  outcomes: z
    .array(
      z.object({
        sceneIdx: z.number().int().nonnegative(),
        outcome: z.enum(['styled', 'fallback']),
      })
    )
    .max(12),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // NO kill-switch check on purpose: an in-flight pass that already fired must be
  // allowed to SETTLE its billing even if OMNI_STYLES_ENABLED was flipped off
  // mid-pass. (The fire path is where the kill switch belongs.)

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const { finishedAdId, outcomes } = parsed.data;

  const allowed = await rateLimitCheck(
    `omni:consume:${user.id}`,
    CONSUME_LIMIT,
    CONSUME_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(CONSUME_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'omni-consume',
      retry_after_seconds: CONSUME_WINDOW_SECONDS,
    });
  }

  const styled = outcomes.filter((o) => o.outcome === 'styled').length;
  const fallback = outcomes.length - styled;

  // Dev bypass — never bill under the local unmetered flag (mirrors the fire path).
  if (process.env.GRIFON_DEV_UNMETERED_VIDEO === 'true') {
    console.log('[grifon:omni:consume]', {
      t: Date.now(),
      userId: user.id,
      finishedAdId,
      scenes: outcomes.length,
      styled,
      fallback,
      charged: false,
      reason: 'dev_unmetered',
    });
    return res.status(200).json({ consumed: false, reason: 'dev_unmetered' });
  }

  // Strict-majority-fallback ads are NOT charged, and we deliberately do NOT set
  // the marker: a later re-roll that flips the majority into styled can still
  // charge at that point.
  if (!shouldConsumeOmniAd(outcomes)) {
    console.log('[grifon:omni:consume]', {
      t: Date.now(),
      userId: user.id,
      finishedAdId,
      scenes: outcomes.length,
      styled,
      fallback,
      charged: false,
      reason: 'majority_fallback',
    });
    return res.status(200).json({ consumed: false, reason: 'majority_fallback' });
  }

  const plan = await getUserPlan(user.id);
  const result = await consumeOmniAd(user.id, plan, finishedAdId);

  console.log('[grifon:omni:consume]', {
    t: Date.now(),
    userId: user.id,
    finishedAdId,
    scenes: outcomes.length,
    styled,
    fallback,
    charged: result.allowed,
    alreadyCounted: result.alreadyCounted,
    fromCredit: result.fromCredit ?? false,
    used: result.used,
    limit: result.limit,
  });

  if (!result.allowed) {
    if (result.unavailable) {
      res.setHeader('Retry-After', '30');
      return res.status(503).json({ error: 'quota_unavailable', detail: 'Allowance is temporarily unavailable. Retry shortly.' });
    }
    // Shouldn't happen after the fire-time peek passed (allowance drained
    // between fire and consume) — surface it but don't crash the client.
    console.warn('[api/gemini/omni-video/consume] consume denied post-fire-peek', {
      userId: user.id,
      finishedAdId,
    });
    return res.status(402).json({ error: 'omni_quota_exceeded' });
  }

  return res.status(200).json({
    consumed: true,
    alreadyCounted: result.alreadyCounted,
    fromCredit: result.fromCredit ?? false,
    used: result.used,
    limit: result.limit,
  });
}
