import { createClient } from '@supabase/supabase-js';

// Only authentication and rate limiting are substituted. The SDK, PostgREST
// filters, handler ownership predicate, SQL RPC and database transactions are real.
const origin = process.env.RECOVERY_REST_URL!;
const client = createClient(origin, 'isolated-test-key', {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.origin !== origin || !url.pathname.startsWith('/rest/v1/')) throw new Error('Unexpected SDK destination');
    url.pathname = url.pathname.slice('/rest/v1'.length);
    // Local PostgREST uses its fixture service role, not Supabase JWT validation.
    const headers = new Headers(init?.headers);
    headers.delete('authorization'); headers.delete('apikey');
    return fetch(url, { ...init, headers, signal: AbortSignal.timeout(5000) });
  } },
});
export const getSupabaseAdmin = () => client;
export async function getUserFromAccessToken(token: string) {
  if (token === 'owner') return { id: '20000000-0000-0000-0000-000000000001', email: null };
  if (token === 'stranger') return { id: '20000000-0000-0000-0000-000000000002', email: null };
  return null;
}
export async function rateLimitCheck() { return true; }
