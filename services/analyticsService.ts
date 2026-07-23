// First-party telemetry client for the Data-Driven Growth Loop (Phase 0).
// Mirrors recentWorkService.ts (pure functions, browser-safe, best-effort) and
// the checkoutService.ts auth-token convention. POSTs product events to the
// service-role /api/events sink — the client never touches the events table.
//
// Also owns the Meta-pixel CONSENT flag (a single source of truth read by
// services/metaPixel.ts + the ConsentBanner). First-party telemetry below is
// legitimate-interest and fires regardless of pixel consent, but it is always
// fire-and-forget and never throws into the UI.

import { getSupabase } from './supabaseClient';

const SESSION_KEY = 'grifon_session_id';
const CONSENT_KEY = 'grifon_pixel_consent';

const isBrowser = () =>
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

// ── Anonymous session correlator ─────────────────────────────────────────────
// Persistent id that survives until signup so pre-auth funnel events can be
// stitched to the user who eventually converts (events.session_id).
export const getSessionId = (): string => {
  if (!isBrowser()) return 'server';
  try {
    let id = window.localStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `s_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      window.localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return 'anon';
  }
};

// ── Pixel consent ─────────────────────────────────────────────────────────────
export type PixelConsent = { granted: boolean; grantedAt: number };

export const getPixelConsent = (): PixelConsent | null => {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.granted === 'boolean') return parsed as PixelConsent;
    return null;
  } catch {
    return null;
  }
};

export const setPixelConsent = (granted: boolean): void => {
  if (!isBrowser()) return;
  try {
    const value: PixelConsent = { granted, grantedAt: Date.now() };
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
  } catch {
    // Storage disabled — consent is best-effort; default stays "not granted".
  }
};

// ── Telemetry ─────────────────────────────────────────────────────────────────
export type TrackPayload = {
  event: string;
  module?: string;
  step?: string;
  /** Producer run correlator (P2 observability). When set, /api/events persists it on
   * the events.run_id column so node lifecycle rows join to a producer_runs row. */
  run_id?: string;
  meta?: Record<string, unknown>;
};

const getAccessToken = async (): Promise<string | null> => {
  try {
    const supabase = getSupabase();
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
};

/**
 * Fire-and-forget a product event to /api/events. Never throws — telemetry must
 * never break a user flow. Attaches the anon session id always, and the auth
 * token when a session exists (so the server can stamp a verified user_id).
 */
export const trackEvent = async (payload: TrackPayload): Promise<void> => {
  if (!isBrowser()) return;
  try {
    const token = await getAccessToken();
    await fetch('/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        event: payload.event,
        session_id: getSessionId(),
        ...(payload.module ? { module: payload.module } : {}),
        ...(payload.step ? { step: payload.step } : {}),
        ...(payload.run_id ? { run_id: payload.run_id } : {}),
        ...(payload.meta ? { meta: payload.meta } : {}),
      }),
      keepalive: true,
    });
  } catch {
    // Best-effort: swallow network/serialization errors silently.
  }
};
