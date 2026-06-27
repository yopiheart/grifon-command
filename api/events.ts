import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromAccessToken, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { rateLimitCheck } from './_lib/rateLimit.js';

// In-app telemetry sink for the Data-Driven Growth Loop (workflows/growth_loop.md
// Phase 0). The client (services/analyticsService.ts) POSTs first-party product
// events here; we write them to public.events on the SERVICE ROLE. The client
// never writes to the table directly — consistent with this app's "all writes
// via api/" architecture, and the events table is RLS-on/no-policies (default
// deny) precisely so an anon browser can't insert.
//
// Auth is OPTIONAL: events.user_id is nullable by design so pre-signup funnel
// signals (PageView before a session exists) are still capturable, stitched to
// the user later via session_id. Authenticated calls attach the verified user id.

// Cap the request body so a single anon caller can't write multi-MB rows into
// public.events (Vercel's default ~4MB parser is far too generous for telemetry).
export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

const EventBody = z.object({
  event: z.string().min(1).max(120),
  session_id: z.string().max(200).optional(),
  module: z.string().max(120).optional(),
  step: z.string().max(120).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

// Hard ceiling on the serialized meta payload — defense-in-depth behind the body
// limit, and independent of how the host parses the body.
const MAX_META_BYTES = 8 * 1024;

// Generous budget — telemetry is high-frequency but one writer per user/session.
const EVENTS_LIMIT = 120;
const EVENTS_WINDOW_SECONDS = 60;

const clientIp = (req: VercelRequest): string => {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  return (raw?.split(',')[0] ?? '').trim() || 'unknown';
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // Optional auth — anonymous events allowed (nullable user_id), but verified
  // when a token is present so we never trust a client-supplied user id.
  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  const user = token ? await getUserFromAccessToken(token) : null;

  const parsed = EventBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const { event, session_id, module, step, meta } = parsed.data;

  if (meta && JSON.stringify(meta).length > MAX_META_BYTES) {
    return res.status(400).json({ error: 'meta_too_large' });
  }

  // Rate-limit BEFORE the write — closes the anon-write spam vector. Key on an
  // UN-FORGEABLE identifier only: the verified user id, else the request IP.
  // We deliberately do NOT key on session_id — it is client-supplied, so an anon
  // attacker could rotate it per request to mint a fresh bucket every time and
  // never trip the ceiling (and balloon both public.events and the shared
  // public.rate_limits table). Fails OPEN (rateLimit contract) so a Supabase
  // hiccup never silently drops legitimate telemetry.
  const rlKey = `events:${user?.id ?? `ip:${clientIp(req)}`}`;
  const allowed = await rateLimitCheck(rlKey, EVENTS_LIMIT, EVENTS_WINDOW_SECONDS);
  if (!allowed) {
    res.setHeader('Retry-After', '30');
    return res.status(429).json({ error: 'rate_limited', retry_after_seconds: 30 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('events').insert({
    user_id: user?.id ?? null,
    session_id: session_id ?? null,
    event,
    module: module ?? null,
    step: step ?? null,
    meta: meta ?? {},
  });
  if (error) {
    // Don't leak internal schema/constraint text to an (often anonymous) caller.
    console.error('[events] insert failed:', error.message);
    return res.status(500).json({ error: 'insert_failed' });
  }

  return res.status(200).json({ ok: true });
}
