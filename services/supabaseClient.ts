import { createClient, SupabaseClient } from '@supabase/supabase-js';

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

export const signInWithGoogle = async (): Promise<void> => {
  const supabase = getSupabase();
  const redirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined;
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: redirectTo ? { redirectTo } : undefined,
  });
  if (error) throw error;
};

export const signUpWithPassword = async (
  email: string,
  password: string
): Promise<{ hasSession: boolean }> => {
  const supabase = getSupabase();
  const emailRedirectTo =
    typeof window !== 'undefined' ? window.location.origin : undefined;
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: emailRedirectTo ? { emailRedirectTo } : undefined,
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
