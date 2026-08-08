import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { rateLimitCheck } from './_lib/rateLimit.js';
import {
  WAITLIST_CLIENT_ID,
  WAITLIST_FUNNEL_ID,
  WAITLIST_CONSENT_TEXT,
  matchesInviteCode,
  normalizeInviteCode,
  parseInviteCodes,
} from '../config/launchGate.js';
import { POLICY_VERSION } from '../services/consentConstants.js';

// ===========================================================================
// LAUNCH GATE — the pre-launch curtain's only server surface.
//
// Two actions, one function (they are one feature, and Vercel bills per
// function): redeem an invite code, or join the waitlist.
//
// UNAUTHENTICATED by design — the whole point is that the visitor has no
// account yet. Every path is IP-rate-limited, and both writes go through the
// service role (funnel_leads and events are RLS-on/no-policies, so an anon
// browser can't touch either table directly).
//
// Invite codes live in LAUNCH_INVITE_CODES (server-only, NO VITE_ prefix) so
// they never reach the browser bundle. Revoking a code = editing that env var
// and redeploying. This is a curtain, not an auth boundary: a redeemed pass is
// persisted client-side, so treat it as "who sees the marketing site", never as
// permission to do anything. Real permission is still Supabase auth + planGate.
// ===========================================================================

// Telemetry-sized bodies only — nothing here is larger than an email address.
export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

const Body = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('redeem'),
    code: z.string().min(1).max(64),
  }),
  z.object({
    action: z.literal('request'),
    email: z.string().email().max(200),
    name: z.string().max(120).optional(),
    // Attribution captured client-side from location.search at submit time.
    utm: z.record(z.string(), z.string()).optional(),
    referrer: z.string().max(500).optional(),
    page_url: z.string().max(500).optional(),
  }),
]);

// Brute-forcing a code is the only real abuse vector here, so redeem gets the
// tighter budget of the two. Both are per-IP: there is no user to key on.
const REDEEM_LIMIT = 10;
const REDEEM_WINDOW_SECONDS = 60;
const REQUEST_LIMIT = 5;
const REQUEST_WINDOW_SECONDS = 300;

const clientIp = (req: VercelRequest): string => {
  const fwd = req.headers['x-forwarded-for'];
  const raw = Array.isArray(fwd) ? fwd[0] : fwd;
  return (raw?.split(',')[0] ?? '').trim() || 'unknown';
};

// Per-instance sliding window, used ONLY when rateLimitCheck throws outright.
// It throws (rather than returning false) when the service role is unconfigured
// — getSupabaseAdmin() can't even build a client — and _lib/rateLimit.ts's own
// backstop never runs in that case. Letting that 500 would shut an invited
// founder out over a misconfiguration that has nothing to do with them, so the
// gate degrades to a coarse local ceiling instead of to a closed door. Same
// caveat as the _lib backstop: per-instance, resets on cold start.
const localHits = new Map<string, number[]>();
const localBackstopAllows = (key: string, limit: number, windowSeconds: number): boolean => {
  const now = Date.now();
  const recent = (localHits.get(key) ?? []).filter((t) => now - t < windowSeconds * 1000);
  if (recent.length >= limit) {
    localHits.set(key, recent);
    return false;
  }
  recent.push(now);
  localHits.set(key, recent);
  return true;
};

const allowRequest = async (key: string, limit: number, windowSeconds: number): Promise<boolean> => {
  try {
    return await rateLimitCheck(key, limit, windowSeconds);
  } catch (err) {
    console.error('[gate] rate limit unavailable, using local backstop:', (err as Error).message);
    return localBackstopAllows(key, limit, windowSeconds);
  }
};

/**
 * Fire-and-forget audit row. Never throws and never changes the response: a
 * telemetry outage must not close the door on a legitimate invited visitor.
 */
const logGateEvent = async (
  event: string,
  meta: Record<string, unknown>
): Promise<void> => {
  try {
    await getSupabaseAdmin().from('events').insert({ event, module: 'launch_gate', meta });
  } catch (err) {
    console.error('[gate] event log failed:', (err as Error).message);
  }
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const body = parsed.data;
  const ip = clientIp(req);

  if (body.action === 'redeem') {
    const allowed = await allowRequest(`gate:redeem:${ip}`, REDEEM_LIMIT, REDEEM_WINDOW_SECONDS);
    if (!allowed) {
      res.setHeader('Retry-After', String(REDEEM_WINDOW_SECONDS));
      return res.status(429).json({ error: 'rate_limited', retry_after_seconds: REDEEM_WINDOW_SECONDS });
    }

    const codes = parseInviteCodes(process.env.LAUNCH_INVITE_CODES);
    if (codes.length === 0) {
      // The curtain is up but nobody was given a key. Loud, because it means a
      // real invitee is standing at a door that can never open.
      console.error('[gate] LAUNCH_INVITE_CODES is empty — no invite code can be redeemed.');
      return res.status(503).json({ error: 'gate_not_configured' });
    }

    const code = normalizeInviteCode(body.code);
    if (!matchesInviteCode(code, codes)) {
      await logGateEvent('launch_gate_reject', { code: code.slice(0, 24), ip });
      return res.status(403).json({ error: 'invalid_code' });
    }

    // Which invite actually converted — the only reporting the curtain needs.
    await logGateEvent('launch_gate_redeem', { code, ip });
    return res.status(200).json({ ok: true, code });
  }

  // --- action === 'request' — join the waitlist -----------------------------
  const allowed = await allowRequest(`gate:request:${ip}`, REQUEST_LIMIT, REQUEST_WINDOW_SECONDS);
  if (!allowed) {
    res.setHeader('Retry-After', String(REQUEST_WINDOW_SECONDS));
    return res.status(429).json({ error: 'rate_limited', retry_after_seconds: REQUEST_WINDOW_SECONDS });
  }

  // funnel_leads' dedupe index is on plain (funnel_id, email), so the handler
  // owns normalization — see supabase/funnel_leads.sql.
  const email = body.email.trim().toLowerCase();

  try {
    const admin = getSupabaseAdmin();
    const { data, error } = await admin
      .from('funnel_leads')
      .upsert(
        {
          client_id: WAITLIST_CLIENT_ID,
          funnel_id: WAITLIST_FUNNEL_ID,
          email,
          name: body.name?.trim() || null,
          // Server-stamped record of consent: the visitor sent an action, not a
          // claim about their own consent state.
          consent: true,
          consent_text: WAITLIST_CONSENT_TEXT,
          policy_version: POLICY_VERSION,
          ip: ip === 'unknown' ? null : ip,
          user_agent: (req.headers['user-agent'] as string | undefined)?.slice(0, 500) ?? null,
          utm: body.utm ?? null,
          referrer: body.referrer ?? null,
          page_url: body.page_url ?? null,
        },
        { onConflict: 'funnel_id,email' }
      )
      .select('created_at')
      .single();

    if (error) {
      console.error('[gate] waitlist upsert failed:', error.message);
      return res.status(502).json({ error: 'waitlist_write_failed' });
    }

    // Position = how many people were already in line at THEIR join time, so a
    // repeat submit shows the same number instead of drifting to the back.
    let position: number | null = null;
    const { count, error: countError } = await admin
      .from('funnel_leads')
      .select('id', { count: 'exact', head: true })
      .eq('funnel_id', WAITLIST_FUNNEL_ID)
      .lte('created_at', data.created_at);
    if (countError) {
      console.error('[gate] waitlist count failed:', countError.message);
    } else {
      position = count ?? null;
    }

    return res.status(200).json({ ok: true, position });
  } catch (err) {
    // getSupabaseAdmin() throws when the service role isn't configured. Say so
    // rather than pretending the lead was captured — the UI offers a mailto.
    console.error('[gate] waitlist unavailable:', (err as Error).message);
    return res.status(503).json({ error: 'waitlist_unavailable' });
  }
}
