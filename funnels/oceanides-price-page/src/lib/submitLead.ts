// ===========================================================================
// submitLead — the client half of the only backend call this funnel makes.
//
// Attribution is captured ONCE at module load (the URL can change under us on a
// back/forward, and the click that paid for this visit is the one in the URL we
// landed on). Everything else is stamped server-side in api/lead.ts.
// ===========================================================================

import { funnelConfig } from '../funnel.config';

export const THANK_YOU_URL = '/thank-you.html';

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const;

/** `?utm_source=fb&x=1` → `{ source: 'fb' }`. Unknown params are ignored. */
export const captureUtm = (search: string): Record<string, string> => {
  const params = new URLSearchParams(search);
  const utm: Record<string, string> = {};
  for (const key of UTM_KEYS) {
    const value = params.get(key);
    if (value) utm[key.replace('utm_', '')] = value;
  }
  // Meta/TikTok click ids ride along in the same bag — they are the join key for
  // any later offline-conversion upload.
  for (const key of ['fbclid', 'ttclid', 'gclid']) {
    const value = params.get(key);
    if (value) utm[key] = value;
  }
  return utm;
};

const CAPTURED_UTM = typeof window === 'undefined' ? {} : captureUtm(window.location.search);
const LANDING_REFERRER = typeof document === 'undefined' ? '' : document.referrer;

export interface LeadSubmission {
  name?: string;
  email: string;
  phone?: string;
  /** The consent checkbox state, exactly as the user left it. */
  consent: boolean;
  qualifiers?: Record<string, string>;
  /** Honeypot — real users never fill this. */
  website?: string;
}

export type LeadResult = { ok: true } | { ok: false; error: string };

/**
 * Where to send the lead next. With on-page magnet delivery configured, the
 * routing answer travels in the URL rather than in storage — the thank-you page
 * is a separate MPA document, so the redirect IS the only handoff there is.
 * No magnet (or no answer given) → the bare bridge, exactly as before.
 */
export const thankYouUrlFor = (qualifiers?: Record<string, string>, email?: string): string => {
  const { magnet } = funnelConfig.thankYou;
  const params = new URLSearchParams();
  const answer = magnet ? qualifiers?.[magnet.qualifierId] : undefined;
  if (answer) params.set('v', answer);
  // The lead's email rides along so the bridge CTA can hand it to the product's
  // signup prefill (?email=). The thank-you page scrubs it from its URL on
  // arrival — it exists in the address bar only for the duration of the redirect.
  if (email) params.set('email', email);
  const qs = params.toString();
  return qs ? `${THANK_YOU_URL}?${qs}` : THANK_YOU_URL;
};

/**
 * POSTs the lead and, on success, moves the browser to the thank-you bridge.
 * Returns the result too, so the caller can keep the button disabled through
 * the navigation instead of flashing back to an idle state.
 */
export const submitLead = async (submission: LeadSubmission): Promise<LeadResult> => {
  const body = {
    ...submission,
    utm: CAPTURED_UTM,
    referrer: LANDING_REFERRER || undefined,
    pageUrl: typeof window === 'undefined' ? undefined : window.location.href,
  };

  let response: Response;
  try {
    response = await fetch('/api/lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: 'network_error' };
  }

  let payload: { ok?: boolean; error?: string } = {};
  try {
    payload = (await response.json()) as typeof payload;
  } catch {
    // Fall through to the status check — an empty body on a 200 still counts.
  }

  if (!response.ok || payload.error) {
    return { ok: false, error: payload.error ?? `http_${response.status}` };
  }

  window.location.href = thankYouUrlFor(submission.qualifiers, submission.email);
  return { ok: true };
};
