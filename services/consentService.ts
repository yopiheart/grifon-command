import type { MarketingConsent } from '../types';
import { getSupabase } from './supabaseClient';

// Marketing / retargeting consent client. Writes (grant/withdraw) go through the
// service-role api/consent proxy so the record-of-consent is server-stamped;
// reads come straight from the public client under RLS (users_read_own_consent).
// See workflows/consent_capture_plan.md.

const getAccessToken = async (): Promise<string> => {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');
  return token;
};

const postAction = async (
  action: 'grant' | 'withdraw',
  policyVersion?: string
): Promise<MarketingConsent> => {
  const token = await getAccessToken();
  const response = await fetch('/api/consent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    // policy_version is only an ACCURACY hint for the signup-reconcile grant (the
    // version the user saw at signup); the server validates it against an
    // allowlist and ignores anything unknown. Omitted → server stamps current.
    body: JSON.stringify(policyVersion ? { action, policy_version: policyVersion } : { action }),
  });
  const data = await response.json().catch(() => ({} as any));
  if (!response.ok) {
    const message = typeof data?.error === 'string' ? data.error : `CONSENT_FAILED (${response.status})`;
    throw new Error(message);
  }
  return {
    granted: !!data.granted,
    consentAt: data.consentAt ?? null,
    withdrawnAt: data.withdrawnAt ?? null,
    policyVersion: data.policyVersion ?? null,
  };
};

// policyVersion is optional — the Settings toggle omits it (server stamps the
// current policy); the signup-reconcile passes the version the user saw at signup.
export const grant = (policyVersion?: string): Promise<MarketingConsent> =>
  postAction('grant', policyVersion);

export const withdraw = (): Promise<MarketingConsent> => postAction('withdraw');

// Reads the signed-in user's current consent row via RLS. Returns a default
// "not granted" state when no row exists (the common case) or on any error, so
// legacy callers never have to special-case nulls. Strict reads let Settings
// distinguish a missing record from a failed read without showing false consent.
export const getMarketingConsent = async (options: { strict?: boolean } = {}): Promise<MarketingConsent> => {
  const NONE: MarketingConsent = {
    granted: false,
    consentAt: null,
    withdrawnAt: null,
    policyVersion: null,
  };
  try {
    const sb = getSupabase();
    const { data: sessionData, error: sessionError } = await sb.auth.getSession();
    if (sessionError) throw sessionError;
    const uid = sessionData.session?.user?.id;
    if (!uid) {
      if (options.strict) throw new Error('NOT_AUTHENTICATED');
      return NONE;
    }
    const { data, error } = await sb
      .from('marketing_consent')
      .select('consent_at, withdrawn_at, policy_version')
      .eq('user_id', uid)
      .maybeSingle();
    if (error) throw error;
    if (!data) return NONE;
    return {
      granted: !!data.consent_at && !data.withdrawn_at,
      consentAt: data.consent_at ?? null,
      withdrawnAt: data.withdrawn_at ?? null,
      policyVersion: data.policy_version ?? null,
    };
  } catch (error) {
    if (options.strict) throw error;
    return NONE;
  }
};
