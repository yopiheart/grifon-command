import { getSupabaseAdmin } from './supabaseAdmin.js';
import { rateLimitCheck } from './rateLimit.js';
import type { ServerPlanId } from './userPlan.js';

// Per-tier daily request budgets for ElevenLabs hot paths.
// Tuned against Starter plan's ~30,000 credits/month (~1,000/day) shared across
// all users. Numbers assume ~30% of MAU active any given day; revisit when real
// telemetry contradicts the model. Edit here, redeploy, and the new caps take
// effect on the next call (the rate_limit_check RPC reads the limit per-call).
export const TTS_DAILY: Record<ServerPlanId, number> = {
  free: 3,
  creator: 20,
  pro: 60,
  business: 150,
};

export const STS_DAILY: Record<ServerPlanId, number> = {
  free: 2,
  creator: 15,
  pro: 40,
  business: 100,
};

// Voice clone is creator+ gated upstream; free is 0 belt-and-suspenders.
export const CLONE_DAILY: Record<ServerPlanId, number> = {
  free: 0,
  creator: 2,
  pro: 5,
  business: 10,
};

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

export type MeterUnit = 'workflows' | 'reports' | 'captions' | 'images' | 'video_ads';

export const MONTHLY_LIMITS: Record<ServerPlanId, Record<MeterUnit, number>> = {
  free:     { workflows: 3,   reports: 1,  captions: 10,  images: 5,   video_ads: 0  },
  creator:  { workflows: 15,  reports: 5,  captions: 100, images: 50,  video_ads: 0  },
  pro:      { workflows: 40,  reports: 15, captions: 300, images: 150, video_ads: 15 },
  business: { workflows: 100, reports: 40, captions: 500, images: 300, video_ads: 40 },
};

// 31 days — a generous safety expiry. The YYYY-MM stamp is the real reset.
export const MONTHLY_WINDOW_SECONDS = 31 * 86_400;

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
// for this unit is 0 — e.g. free/creator video_ads. Otherwise increments via
// the same atomic rate_limit_check RPC, then peeks to report the live count.
export async function consumeMonthly(
  unit: MeterUnit,
  userId: string,
  plan: ServerPlanId
): Promise<ConsumeResult> {
  // Dev-only video bypass (Neil 2026-06-05): when GRIFON_DEV_UNMETERED_VIDEO='true'
  // — set in LOCAL .env only, never on Vercel — skip the monthly video meter so
  // local smoke-testing doesn't burn the real per-plan video_ads cap. Scoped to
  // video_ads ONLY; every other meter and all of production stay fully enforced.
  // The flag is absent under vitest, so quota.monthly.test.ts still asserts the
  // real cap. Placed before the limit<=0 short-circuit so it also unblocks tiers
  // whose video_ads allowance is 0 (free/creator) during local testing.
  if (unit === 'video_ads' && process.env.GRIFON_DEV_UNMETERED_VIDEO === 'true') {
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
