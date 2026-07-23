import { getSupabaseAdmin } from './supabaseAdmin.js';

/**
 * In-memory per-instance backstop for the fail-open path (audit HIGH #3).
 *
 * When the Supabase RPC errors, rate limiting would otherwise vanish entirely
 * and the shared paid pools (Gemini/Kling/ElevenLabs) would be wide open for the
 * whole outage. This coarse sliding-window limiter — Supabase-independent by
 * construction — caps abuse per serverless instance while still letting legit
 * users keep working (each key gets its normal budget per window). Caveat: it is
 * per-instance and resets on cold start, so N warm instances allow up to N× the
 * cap; it is a safety net, not a precise global ceiling. Pair with an upstream
 * spend alarm for the aggregate truth.
 */
const memoryHits = new Map<string, number[]>();

function memoryBackstopAllows(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const recent = (memoryHits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    memoryHits.set(key, recent); // keep the pruned window even while blocking
    return false;
  }
  recent.push(now);
  memoryHits.set(key, recent);
  return true;
}

/**
 * Atomic sliding-window rate limit check against Supabase.
 * Returns true if the call is allowed, false if rate-limited.
 * On RPC error (infra issue) it does NOT lock paying users out; instead of
 * blindly returning true it falls through to `memoryBackstopAllows`, a coarse
 * Supabase-independent per-instance ceiling, so a Supabase outage degrades to
 * approximate limiting rather than no limiting at all.
 */
export async function rateLimitCheck(
  key: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.rpc('rate_limit_check', {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) {
    console.error('[rateLimit] rpc error, falling back to in-memory backstop:', error.message);
    return memoryBackstopAllows(key, limit, windowSeconds);
  }
  return data === true;
}
