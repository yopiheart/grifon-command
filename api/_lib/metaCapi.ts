import crypto from 'node:crypto';

// Server-side Meta Conversions API (CAPI) sender — Phase 0 of the Data-Driven
// Growth Loop (workflows/growth_loop.md). This is the SERVER half of the pixel:
// the browser fires PageView/Lead via fbq directly, while authoritative money
// events (Purchase) are sent here from api/webhook.ts after PayMongo confirms a
// payment. Deduped against any future browser-side Purchase via a shared event_id.
//
// SERVER-ONLY. The access token is read from process.env (NEVER VITE_-prefixed)
// so it can never reach the client bundle — the api/_lib boundary the
// straw-man-audit guards. Lives in _lib (not a routed api/ file) because it is
// imported and called server-to-server, never hit over HTTP by the browser.

const GRAPH_API_VERSION = 'v21.0';

// Normalize-then-hash per Meta's matching rules: trim + lowercase, SHA-256 hex.
// Empty/undefined inputs hash to nothing (omitted from user_data).
const sha256 = (value: string): string =>
  crypto.createHash('sha256').update(value).digest('hex');

const hashEmail = (email: string | null | undefined): string | undefined => {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return undefined;
  return sha256(normalized);
};

const hashExternalId = (id: string | null | undefined): string | undefined => {
  if (!id) return undefined;
  const normalized = id.trim().toLowerCase();
  if (!normalized) return undefined;
  return sha256(normalized);
};

export type CapiPurchaseParams = {
  /** Deterministic id shared with any browser-side Purchase so Meta dedups them. */
  eventId: string;
  /** Supabase user id — hashed into external_id (fallback identifier). */
  userId: string;
  /** User email — hashed into `em`. Optional; external_id still matches without it. */
  email?: string | null;
  /** Purchase value in the major currency unit (pesos, not centavos). */
  value: number;
  currency?: string;
  /** Unix seconds the payment happened. Defaults to now. */
  eventTime?: number;
  eventSourceUrl?: string;
  clientIp?: string;
  userAgent?: string;
};

/**
 * Fire a server-side `Purchase` to the Meta Conversions API.
 *
 * Fail-SAFE by contract: if the pixel/token env is not configured, or Meta
 * returns a non-2xx, this logs and resolves — it NEVER throws. The PayMongo
 * webhook that calls this must still return 200 and grant the purchase even if
 * CAPI is down; a missed analytics event is acceptable, a failed payment grant
 * is not. Callers should still wrap the await in try/catch as defense in depth.
 */
export const sendCapiPurchase = async (params: CapiPurchaseParams): Promise<void> => {
  const pixelId = process.env.META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    console.warn('[metaCapi] META_NOT_CONFIGURED: skipping CAPI Purchase (pixel id or token missing)');
    return;
  }

  const userData: Record<string, string> = {};
  const em = hashEmail(params.email);
  if (em) userData.em = em;
  const externalId = hashExternalId(params.userId);
  if (externalId) userData.external_id = externalId;
  // IP + UA are NOT hashed (Meta matches them raw).
  if (params.clientIp) userData.client_ip_address = params.clientIp;
  if (params.userAgent) userData.client_user_agent = params.userAgent;

  // Token goes in the POST BODY, not the query string — keeps it off any URL
  // that might land in a proxy/Vercel request log.
  const body = {
    access_token: accessToken,
    data: [
      {
        event_name: 'Purchase',
        event_time: params.eventTime ?? Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        action_source: 'website',
        ...(params.eventSourceUrl ? { event_source_url: params.eventSourceUrl } : {}),
        user_data: userData,
        custom_data: {
          value: params.value,
          currency: params.currency ?? 'PHP',
        },
      },
    ],
    ...(process.env.META_CAPI_TEST_EVENT_CODE
      ? { test_event_code: process.env.META_CAPI_TEST_EVENT_CODE }
      : {}),
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      // Never leak the token; detail is Meta's response body only.
      console.error(`[metaCapi] Purchase send failed (${res.status}): ${detail}`);
    }
  } catch (err) {
    console.error('[metaCapi] Purchase send threw:', err instanceof Error ? err.message : err);
  }
};
