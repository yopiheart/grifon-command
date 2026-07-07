import { getSupabaseAdmin } from './supabaseAdmin.js';
import { rateLimitCheck } from './rateLimit.js';
import { consumeCredit, peekCredits } from './credits.js';
import type { ServerPlanId } from './userPlan.js';

// Per-tier daily request budgets for ElevenLabs hot paths.
// Tuned against Starter plan's ~30,000 credits/month (~1,000/day) shared across
// all users. Numbers assume ~30% of MAU active any given day; revisit when real
// telemetry contradicts the model. Edit here, redeploy, and the new caps take
// effect on the next call (the rate_limit_check RPC reads the limit per-call).
export const TTS_DAILY: Record<ServerPlanId, number> = {
  free: 3,
  starter: 10,
  pro: 60,
  business: 150,
};

export const STS_DAILY: Record<ServerPlanId, number> = {
  free: 2,
  starter: 8,
  pro: 40,
  business: 100,
};

// Voice clone is Pro+ gated upstream; free/starter are 0 belt-and-suspenders
// (Starter is a deliberately bare trial tier — cloning is a Pro perk).
export const CLONE_DAILY: Record<ServerPlanId, number> = {
  free: 0,
  starter: 0,
  pro: 5,
  business: 10,
};

// Generative music beds (ElevenLabs Music) — a Pro/Business perk. free/starter
// are 0 belt-and-suspenders: the client gates the toggle on tier, but the server
// is authoritative, so a free/starter request can never burn the shared credit
// pool — it just falls back to a static bed. Music draws from the SAME ElevenLabs
// credit pool as TTS/STS, so these are deliberately modest. Caching (one gen per
// ad, keyed by render seed) keeps real spend well under these caps. Tune from
// real credit-cost telemetry before raising.
export const MUSIC_DAILY: Record<ServerPlanId, number> = {
  free: 0,
  starter: 0,
  pro: 10,
  business: 25,
};

// Global circuit-breaker on music generation across ALL users in a rolling 24h.
// This is the "voice wins" guard: it hard-caps total music spend so a burst can
// never starve the shared ElevenLabs credit pool that TTS/STS (the core feature)
// depends on. Conservative on purpose; raise once cost telemetry exists.
export const MUSIC_GLOBAL_DAILY = 200;

export const DAILY_WINDOW_SECONDS = 86_400;

export type QuotaStatus = {
  used: number;
  limit: number;
  remaining: number;
  resetSeconds: number;
};

// Reads current usage for a key without consuming a slot. Mirrors the same
// stale-window logic as the rate_limit_check RPC: if the stored window is
// already older than windowSeconds, we report 0 used.
export async function peekQuota(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<QuotaStatus> {
  if (limit <= 0) {
    return { used: 0, limit: 0, remaining: 0, resetSeconds: 0 };
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('rate_limits')
    .select('count, window_start')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    console.error('[quota] peek error:', error.message);
    return { used: 0, limit, remaining: limit, resetSeconds: 0 };
  }
  if (!data) {
    return { used: 0, limit, remaining: limit, resetSeconds: 0 };
  }

  const startMs = new Date(data.window_start as string).getTime();
  const elapsedSec = Math.floor((Date.now() - startMs) / 1000);
  if (elapsedSec >= windowSeconds) {
    return { used: 0, limit, remaining: limit, resetSeconds: 0 };
  }

  const used = Math.max(0, Math.min(limit, (data.count as number) ?? 0));
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    resetSeconds: Math.max(0, windowSeconds - elapsedSec),
  };
}

export const ttsDailyKey = (userId: string) => `tts:daily:${userId}`;
export const stsDailyKey = (userId: string) => `sts:daily:${userId}`;
export const cloneDailyKey = (userId: string) => `clone:daily:${userId}`;
export const musicDailyKey = (userId: string) => `music:daily:${userId}`;
// Single shared key — the global music ceiling is account-wide, not per-user.
export const musicGlobalDailyKey = () => `music:global:daily`;

// ---------------------------------------------------------------------------
// Monthly usage metering (quota-wall tier-upgrade feature).
//
// Unlike the daily voice budgets above, these are PER-PLAN MONTHLY allowances
// that mirror the marketing caps in utils/planGate.ts (PLAN_LIMITS, minus the
// boolean `watermark`). We reuse the same rate_limits table + rate_limit_check
// RPC, but stamp the calendar month (YYYY-MM) into the key so a new month gets
// a fresh counter automatically — no billing-cycle coupling, no migration.
// MONTHLY_WINDOW_SECONDS is just a safety expiry; the month stamp does the work.
//
// MONTHLY_LIMITS is intentionally a standalone literal (not imported from
// utils/planGate) to keep server enforcement self-contained. tests/unit/
// quota.parity.test.ts deep-equals it against PLAN_LIMITS so the two cannot
// drift.
// ---------------------------------------------------------------------------

export type MeterUnit = 'workflows' | 'reports' | 'captions' | 'images' | 'video_ads' | 'omni_ads';

// NOTE (2026-06-19): `video_ads` is now a FINISHED-AD allowance (one completed
// one-shot render), not a per-scene clip count. The consume call site moves from
// per-clip (api/gemini/video.ts) to once-per-finished-job in the render pipeline.
// `workflows` = ad PLANS (one-shot consultations); Free = 1 complete plan.
// `omni_ads` = the AI "Applying style" pass (Omni Edit Styles). Business-only
// (free/starter/pro 0); business 5 is a tunable PRD default.
export const MONTHLY_LIMITS: Record<ServerPlanId, Record<MeterUnit, number>> = {
  free:     { workflows: 1,   reports: 1,  captions: 10,  images: 5,   video_ads: 0,  omni_ads: 0 },
  starter:  { workflows: 3,   reports: 2,  captions: 30,  images: 25,  video_ads: 1,  omni_ads: 0 },
  pro:      { workflows: 40,  reports: 15, captions: 300, images: 150, video_ads: 8,  omni_ads: 0 },
  business: { workflows: 100, reports: 40, captions: 500, images: 300, video_ads: 15, omni_ads: 5 },
};

// 31 days — a generous safety expiry. The YYYY-MM stamp is the real reset.
export const MONTHLY_WINDOW_SECONDS = 31 * 86_400;

// ---------------------------------------------------------------------------
// Finished-ad metering (2026-06-19 restructure — Slice 3).
//
// `video_ads` is a FINISHED-AD allowance, not a per-scene clip count. A finished
// ad renders many scene-clips; metering each clip under-delivered vs the label
// ("8 ads" really meant ~8 scene renders ≈ 2 ads) and broke trust. We now meter
// ONE credit the first time a given finishedAdId is seen, then let every later
// scene-clip of that same ad through free. Keeping the meter co-located with the
// real upstream render call (rather than a separate "claim" endpoint) means a
// direct per-clip call can't bypass it.
//
// SCENE_CAP (the per-ad COGS dial — caps ad length) is enforced CLIENT-side in
// utils/planGate.ts: a monotonic server-side per-job counter would wrongly count
// scene REGENERATIONS against the cap. Server hardening of the cap is a parked
// follow-up; the per-ad credit above is the load-bearing margin control.
// ---------------------------------------------------------------------------

// `vidjob:${userId}:${finishedAdId}` — limit-1 marker: set once the ad's first
// scene has consumed a credit, so later scenes/regenerations don't double-charge.
export const finishedAdJobKey = (userId: string, finishedAdId: string): string =>
  `vidjob:${userId}:${finishedAdId}`;

// `fromCredit` is true when the ad was funded by a purchased top-up credit
// rather than the monthly allowance (used/limit then reflect the now-full meter).
export type FinishedAdResult = ConsumeResult & { alreadyCounted: boolean; fromCredit?: boolean };

// Consumes ONE video_ad allowance the first time finishedAdId is seen; subsequent
// scenes of the same ad return allowed:true without touching the meter. When the
// monthly allowance is exhausted, falls back to a purchased top-up credit so a
// buyer's overage ad still renders.
export async function consumeFinishedAd(
  userId: string,
  plan: ServerPlanId,
  finishedAdId: string,
): Promise<FinishedAdResult> {
  const jobKey = finishedAdJobKey(userId, finishedAdId);

  // Already metered this ad? peek the marker WITHOUT incrementing. Covers ads
  // funded by either the monthly meter OR a top-up credit — the marker is set
  // in both cases, so later scenes are always free.
  const seen = await peekQuota(jobKey, 1, MONTHLY_WINDOW_SECONDS);
  if (seen.used >= 1) {
    const status = await peekMonthly('video_ads', userId, plan);
    return { allowed: true, alreadyCounted: true, used: status.used, limit: status.limit, remaining: status.remaining };
  }

  // First scene of a new finished ad → consume one monthly credit.
  const result = await consumeMonthly('video_ads', userId, plan);
  if (result.allowed) {
    // Mark the ad as counted (0→1) so later scenes are free. Only on success, so
    // a rejected (out-of-quota) ad can still be metered after the user upgrades.
    await rateLimitCheck(jobKey, 1, MONTHLY_WINDOW_SECONDS);
    return { ...result, alreadyCounted: false };
  }

  // Monthly allowance exhausted → fall back to a purchased top-up credit. The
  // RPC fails closed, so on infra error we don't hand out a free render.
  const spentCredit = await consumeCredit(userId, 'video_ad');
  if (spentCredit) {
    await rateLimitCheck(jobKey, 1, MONTHLY_WINDOW_SECONDS);
    return { allowed: true, alreadyCounted: false, fromCredit: true, used: result.used, limit: result.limit, remaining: 0 };
  }

  return { ...result, alreadyCounted: false };
}

// ---------------------------------------------------------------------------
// Omni-ad metering (Omni Edit Styles — Slice 3b). Structural twin of the
// finished-ad meter above: `omni_ads` is a FINISHED-AD-scoped allowance (one
// completed "Applying style" pass), metered once per finishedAdId via a limit-1
// marker so re-rolls of an already-charged ad stay free. Unlike video_ads, the
// consume is DEFERRED to a completion endpoint (api/gemini/omni-video/consume.ts)
// because there is no un-consume primitive — we can only charge once we know the
// pass landed with a non-fallback majority (see api/_lib/omniBilling.ts).
// ---------------------------------------------------------------------------

// `omniad:${userId}:${finishedAdId}` — limit-1 marker: set once an omni pass has
// been charged for this ad, so re-rolls of the same ad don't double-charge
// (mirrors finishedAdJobKey).
export const omniAdJobKey = (userId: string, finishedAdId: string): string =>
  `omniad:${userId}:${finishedAdId}`;

export type OmniAllowance = {
  allowed: boolean;
  alreadyCharged: boolean;
  used: number;
  limit: number;
  credits: number;
};

// PEEK ONLY — never increments. The fire path (api/gemini/omni-video.ts) uses
// this as a wall so a zero-allowance user can't start a paid pass. The actual
// charge happens later in consumeOmniAd via the consume endpoint. Order mirrors
// consumeOmniAd's fallback ladder: dev bypass → charged-marker → monthly
// remaining → purchased top-up credit.
export async function peekOmniAllowance(
  userId: string,
  plan: ServerPlanId,
  finishedAdId: string,
): Promise<OmniAllowance> {
  const status = await peekMonthly('omni_ads', userId, plan);

  // Dev bypass — the same flags consumeMonthly honors for video metering. Set in
  // LOCAL .env ONLY, never on Vercel.
  if (
    process.env.GRIFON_DEV_UNMETERED === 'true' ||
    process.env.GRIFON_DEV_UNMETERED_VIDEO === 'true'
  ) {
    return { allowed: true, alreadyCharged: false, used: status.used, limit: status.limit, credits: 0 };
  }

  // Already charged this ad? A re-roll of an already-charged ad always passes.
  const seen = await peekQuota(omniAdJobKey(userId, finishedAdId), 1, MONTHLY_WINDOW_SECONDS);
  if (seen.used >= 1) {
    return { allowed: true, alreadyCharged: true, used: status.used, limit: status.limit, credits: 0 };
  }

  // Monthly allowance left?
  if (status.remaining > 0) {
    return { allowed: true, alreadyCharged: false, used: status.used, limit: status.limit, credits: 0 };
  }

  // Fall back to a purchased top-up credit.
  const credits = await peekCredits(userId);
  const omniCredits = credits.omni_style_credits ?? 0;
  return {
    allowed: omniCredits > 0,
    alreadyCharged: false,
    used: status.used,
    limit: status.limit,
    credits: omniCredits,
  };
}

// Consumes ONE omni_ads allowance the first time finishedAdId is charged;
// subsequent re-rolls of the same ad return allowed:true without touching the
// meter. When the monthly allowance is exhausted, falls back to a purchased
// omni_style top-up credit. Structural mirror of consumeFinishedAd.
export async function consumeOmniAd(
  userId: string,
  plan: ServerPlanId,
  finishedAdId: string,
): Promise<FinishedAdResult> {
  const jobKey = omniAdJobKey(userId, finishedAdId);

  // Already charged this ad? peek the marker WITHOUT incrementing.
  const seen = await peekQuota(jobKey, 1, MONTHLY_WINDOW_SECONDS);
  if (seen.used >= 1) {
    const status = await peekMonthly('omni_ads', userId, plan);
    return { allowed: true, alreadyCounted: true, used: status.used, limit: status.limit, remaining: status.remaining };
  }

  // First charge for this ad → consume one monthly credit.
  const result = await consumeMonthly('omni_ads', userId, plan);
  if (result.allowed) {
    await rateLimitCheck(jobKey, 1, MONTHLY_WINDOW_SECONDS);
    return { ...result, alreadyCounted: false };
  }

  // Monthly allowance exhausted → fall back to a purchased omni_style credit.
  const spentCredit = await consumeCredit(userId, 'omni_style');
  if (spentCredit) {
    await rateLimitCheck(jobKey, 1, MONTHLY_WINDOW_SECONDS);
    return { allowed: true, alreadyCounted: false, fromCredit: true, used: result.used, limit: result.limit, remaining: 0 };
  }

  return { ...result, alreadyCounted: false };
}

export type VideoMeterResult =
  | { ok: true; used: number; limit: number; remaining: number }
  | { ok: false; used: number; limit: number };

// Single entry point the three video proxies share. With a finishedAdId it
// meters per finished ad (idempotent); without one it falls back to the legacy
// per-call meter so ad-hoc single renders behave exactly as before.
export async function meterVideoRequest(
  userId: string,
  plan: ServerPlanId,
  finishedAdId?: string,
): Promise<VideoMeterResult> {
  if (!finishedAdId) {
    const r = await consumeMonthly('video_ads', userId, plan);
    return r.allowed
      ? { ok: true, used: r.used, limit: r.limit, remaining: r.remaining }
      : { ok: false, used: r.used, limit: r.limit };
  }
  const credit = await consumeFinishedAd(userId, plan, finishedAdId);
  return credit.allowed
    ? { ok: true, used: credit.used, limit: credit.limit, remaining: credit.remaining }
    : { ok: false, used: credit.used, limit: credit.limit };
}

// `${unit}:monthly:${YYYY}-${MM}:${userId}` — UTC calendar month.
export function monthlyKey(unit: MeterUnit, userId: string, when: Date = new Date()): string {
  const yyyy = when.getUTCFullYear();
  const mm = String(when.getUTCMonth() + 1).padStart(2, '0');
  return `${unit}:monthly:${yyyy}-${mm}:${userId}`;
}

// Reads current monthly usage for a unit without consuming a slot.
export async function peekMonthly(
  unit: MeterUnit,
  userId: string,
  plan: ServerPlanId
): Promise<QuotaStatus> {
  const limit = MONTHLY_LIMITS[plan][unit];
  return peekQuota(monthlyKey(unit, userId), limit, MONTHLY_WINDOW_SECONDS);
}

export type ConsumeResult = {
  allowed: boolean;
  used: number;
  limit: number;
  remaining: number;
};

// Atomically consumes one unit of the user's monthly allowance.
// Returns allowed:false (without touching the counter) when the plan's limit
// for this unit is 0 — e.g. free video_ads. Otherwise increments via
// the same atomic rate_limit_check RPC, then peeks to report the live count.
export async function consumeMonthly(
  unit: MeterUnit,
  userId: string,
  plan: ServerPlanId
): Promise<ConsumeResult> {
  // Dev-only smoke bypass — set in LOCAL .env ONLY, never on Vercel, so production
  // stays fully metered. Two scopes:
  //   • GRIFON_DEV_UNMETERED='true'        → bypass ALL monthly meters (images,
  //     reports, workflows, captions, video_ads). Needed because a single Director
  //     smoke renders 6+ storyboard scene IMAGES + a Market Research report, which
  //     otherwise burn the real per-plan caps every run (Neil hit images 150/150
  //     mid-smoke 2026-06-21 — the older video-only flag never covered images).
  //   • GRIFON_DEV_UNMETERED_VIDEO='true'  → legacy, video_ads only (kept for
  //     back-compat with existing .env / enable-dev-unmetered-video.ps1).
  // Both flags are absent under vitest, so quota.monthly.test.ts still asserts the
  // real caps. Placed before the limit<=0 short-circuit so it also unblocks tiers
  // whose allowance is 0 (e.g. free video_ads) during local testing. The bypass
  // short-circuits BEFORE reading the counter, so an already-exhausted meter
  // (e.g. 150/150) keeps rendering locally without any reset.
  const devUnmeterAll = process.env.GRIFON_DEV_UNMETERED === 'true';
  const devUnmeterVideo = unit === 'video_ads' && process.env.GRIFON_DEV_UNMETERED_VIDEO === 'true';
  if (devUnmeterAll || devUnmeterVideo) {
    const devLimit = MONTHLY_LIMITS[plan][unit] || 999;
    return { allowed: true, used: 0, limit: devLimit, remaining: devLimit };
  }

  const limit = MONTHLY_LIMITS[plan][unit];
  if (limit <= 0) {
    return { allowed: false, used: 0, limit, remaining: 0 };
  }

  const key = monthlyKey(unit, userId);
  const allowed = await rateLimitCheck(key, limit, MONTHLY_WINDOW_SECONDS);
  const status = await peekQuota(key, limit, MONTHLY_WINDOW_SECONDS);

  return {
    allowed,
    used: status.used,
    limit,
    remaining: status.remaining,
  };
}
