import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Fail-fast prod guard. The GRIFON_DEV_UNMETERED[_VIDEO] flags skip ALL metering
// (monthly quota in quota.ts + hourly video rate-limits in the Veo/Kling/omni
// proxies) and are LOCAL .env ONLY — a stray Vercel env var would mean unlimited
// free paid generation on the shared pools. Every api/ proxy imports this module
// for auth (api/CLAUDE.md: "Every proxy starts with verifySupabaseToken()"), so a
// module-load throw here turns that misconfig into a hard function-boot failure
// instead of silently unmetering prod. Inert locally + under vitest (no VERCEL).
if (
  process.env.VERCEL &&
  (process.env.GRIFON_DEV_UNMETERED === 'true' || process.env.GRIFON_DEV_UNMETERED_VIDEO === 'true')
) {
  throw new Error(
    'DEV_UNMETERED_ON_VERCEL: GRIFON_DEV_UNMETERED[_VIDEO] must never be set in a deployed environment — remove it from the Vercel project env.'
  );
}

let _admin: SupabaseClient | null = null;

export const getSupabaseAdmin = (): SupabaseClient => {
  if (_admin) return _admin;

  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      'SUPABASE_ADMIN_NOT_CONFIGURED: set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in env.'
    );
  }

  _admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
};

export const getUserFromAccessToken = async (
  accessToken: string
): Promise<{ id: string; email: string | null } | null> => {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
};
