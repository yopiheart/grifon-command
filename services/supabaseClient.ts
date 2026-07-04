import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { POLICY_VERSION } from './consentConstants';

let _client: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (_client) return _client;

  const env = (import.meta as any).env || {};
  const url = env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      'SUPABASE_NOT_CONFIGURED: set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.'
    );
  }

  _client = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return _client;
};

export type OAuthProvider = 'google' | 'github' | 'apple';

// NOTE: each provider must also be enabled in Supabase Dashboard → Auth → Providers.
// GitHub needs a (free) GitHub OAuth App; Apple needs an Apple Developer account
// (Service ID + key). Unconfigured providers fail with a Supabase error toast.
export const signInWithProvider = async (provider: OAuthProvider): Promise<void> => {
  const supabase = getSupabase();
  const redirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (error) throw error;
};

export const signInWithGoogle = (): Promise<void> => signInWithProvider('google');

// ── Passwordless email OTP (the email path) ──────────────────────────────────
// Sign-in and sign-up are one flow: send a 6-digit code, then verify it.
// `shouldCreateUser: true` makes Supabase create the account on first verify, so
// the SAME call serves new and returning users — no separate signup endpoint.
// Requires the Supabase "Magic Link" email template to emit {{ .Token }} (the
// code) and (for production deliverability) a custom SMTP sender.
export const sendEmailOtp = async (
  email: string,
  // Same intent-signal contract as the old password signup: carried as
  // user_metadata so the marketing opt-in survives to the post-auth reconcile,
  // which server-stamps the record-of-consent via api/consent (consentService).
  // Never treat user_metadata as proof of consent.
  marketingOptIn = false
): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: true,
      data: marketingOptIn
        ? { marketing_opt_in: true, marketing_policy_version: POLICY_VERSION }
        : { marketing_opt_in: false },
    },
  });
  if (error) throw error;
};

// Verify the 6-digit code. Returns whether this verify just CREATED the account
// (new user) so the caller can fire the Lead pixel only on a genuine first
// signup. Heuristic: a brand-new user's created_at ≈ last_sign_in_at (same
// moment); a returning user was created long before. 10s window absorbs skew.
export const verifyEmailOtp = async (
  email: string,
  token: string
): Promise<{ isNewUser: boolean }> => {
  const supabase = getSupabase();
  const { data, error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: 'email',
  });
  if (error) throw error;
  const u = data.user;
  const created = u?.created_at ? new Date(u.created_at).getTime() : 0;
  const lastSignIn = u?.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : created;
  const isNewUser = created > 0 && Math.abs(lastSignIn - created) < 10_000;
  return { isNewUser };
};

export const signUpWithPassword = async (
  email: string,
  password: string,
  // Retargeting/marketing opt-in carried as user_metadata so the INTENT survives
  // the cross-device confirm-email round-trip. This is only the intent signal —
  // the record-of-consent is server-stamped post-auth via api/consent
  // (consentService). Never treat user_metadata as proof of consent.
  marketingOptIn = false
): Promise<{ hasSession: boolean }> => {
  const supabase = getSupabase();
  const emailRedirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      ...(emailRedirectTo ? { emailRedirectTo } : {}),
      // Carry BOTH the intent and the policy version the user actually saw at
      // signup. The reconcile (App.tsx) stamps THIS version, not the (possibly
      // bumped) version in force on first login — accurate record-of-consent.
      data: marketingOptIn
        ? { marketing_opt_in: true, marketing_policy_version: POLICY_VERSION }
        : { marketing_opt_in: false },
    },
  });
  if (error) throw error;
  return { hasSession: !!data.session };
};

export const requestPasswordReset = async (email: string): Promise<void> => {
  const supabase = getSupabase();
  const redirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(
    email,
    redirectTo ? { redirectTo } : undefined
  );
  if (error) throw error;
};

export const resendSignupConfirmation = async (email: string): Promise<void> => {
  const supabase = getSupabase();
  const emailRedirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
  });
  if (error) throw error;
};

export const updatePassword = async (newPassword: string): Promise<void> => {
  const supabase = getSupabase();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
};
