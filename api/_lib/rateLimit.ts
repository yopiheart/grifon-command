import { getSupabaseAdmin } from './supabaseAdmin.js';

/**
 * Atomic sliding-window rate limit check against Supabase.
 * Returns true if the call is allowed, false if rate-limited.
 * Fails OPEN: if the RPC errors (infra issue), we return true rather than
 * blocking legitimate users. The billing endpoint is already auth-gated and
 * PayMongo has its own idempotency — the downside of a brief fail-open
 * window is far smaller than locking paying users out if Supabase hiccups.
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
    console.error('[rateLimit] rpc error:', error.message);
    return true;
  }
  return data === true;
}
