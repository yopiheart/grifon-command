import { getSupabaseAdmin } from './supabaseAdmin.js';
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
