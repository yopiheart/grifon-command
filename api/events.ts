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
  // Producer run correlator (P2 observability). Permissive here so a malformed value
  // is STRIPPED (see RUN_ID_RE below) rather than 400-ing the whole telemetry write.
  run_id: z.string().max(200).optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
});

// Same safe charset as api/_lib/requestId.ts. A run_id that doesn't match is dropped to
// null (not rejected) so a bad correlator never fails an otherwise-valid event insert.
const RUN_ID_RE = /^[A-Za-z0-9_-]{1,64}$/;

// SERVER-DERIVED event names — a client may never write these (2026-07-25, from the
// GPT 5.6 Sol architecture consult). Both are emitted exclusively by api/_lib/runEvents.ts
// on the SERVICE ROLE, which bypasses this handler entirely; the client's own run-event
// vocabulary (services/producerOrchestrator.ts:481 — node_start/node_done/node_fail/
// check_fail/check_skip/gate_park/gate_approve) deliberately excludes them.
//
// Why it matters: public.run_cogs sums meta->>'estUsd' over every event='cogs' row grouped
// by (run_id, user_id), so without this a caller could POST event='cogs' with an invented
// estUsd against their OWN run and inflate its cost. Cross-user forgery is already caught by
// run_attribution_anomalies, but SAME-user forgery matches the run owner and raises no alarm —
// it is invisible, and it breaks the "cost is server-derived" invariant the view rests on.
// Self-poisoning only (no other user's numbers move), which is why this is a guard, not a P0.
const SERVER_ONLY_EVENTS = new Set(['cogs', 'watchdog_kill']);

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
  const { event, session_id, module, step, meta, run_id } = parsed.data;

  if (meta && JSON.stringify(meta).length > MAX_META_BYTES) {
    return res.status(400).json({ error: 'meta_too_large' });
  }

  // Reject reserved server-derived names outright. 403 rather than a silent drop: a caller
  // reaching here is either forging cost attribution or a client bug that would otherwise
  // corrupt run_cogs invisibly — both deserve to be loud. Safe to reject because the only
  // client transport (services/analyticsService.ts trackEvent) is fire-and-forget inside a
  // try/catch with no retry, so a 403 can never surface to a user or storm the endpoint.
  if (SERVER_ONLY_EVENTS.has(event)) {
    console.warn(`[events] rejected reserved event '${event}' from user=${user?.id ?? 'anon'}`);
    return res.status(403).json({ error: 'reserved_event' });
  }

  // Sanitize the run correlator — a garbage value is stripped to null, never rejected.
  const runId = run_id && RUN_ID_RE.test(run_id) ? run_id : null;

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
    run_id: runId,
  });
  if (error) {
    // Don't leak internal schema/constraint text to an (often anonymous) caller.
    console.error('[events] insert failed:', error.message);
    return res.status(500).json({ error: 'insert_failed' });
  }

  return res.status(200).json({ ok: true });
}
