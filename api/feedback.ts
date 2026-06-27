import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromAccessToken, getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { rateLimitCheck } from './_lib/rateLimit.js';

// Client feedback sink for the Data-Driven Growth Loop (workflows/growth_loop.md
// Phase 1). The micro-widget (components/ui/FeedbackWidget.tsx) POSTs an NPS score
// + optional free text here; we write to public.feedback on the SERVICE ROLE. The
// client never writes the table directly (RLS-on/no-policies = default deny),
// consistent with this app's "all writes via api/" architecture.
//
// Auth is OPTIONAL: feedback.user_id is nullable so anonymous (pre-/non-auth)
// submissions are capturable, stitched to a user later via session_id. When a
// token is present we attach the VERIFIED user id — never a client-supplied one.

// Cap the body so a single caller can't write multi-MB rows (Vercel's default
// ~4MB parser is far too generous for a short feedback note).
export const config = { api: { bodyParser: { sizeLimit: '8kb' } } };

const FeedbackBody = z.object({
  nps_score: z.number().int().min(0).max(10),
  free_text: z.string().max(2000).optional(),
  module: z.string().max(120).optional(),
  session_id: z.string().max(200).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
});

// Hard ceiling on the serialized context payload — defense-in-depth behind the
// body limit, independent of how the host parses the body.
const MAX_CONTEXT_BYTES = 4 * 1024;

// Feedback is rare per user — a tight budget is plenty and bounds anon spam.
const FEEDBACK_LIMIT = 20;
const FEEDBACK_WINDOW_SECONDS = 60;

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

  // Optional auth — anonymous feedback allowed (nullable user_id), but verified
  // when a token is present so we never trust a client-supplied user id.
  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  const user = token ? await getUserFromAccessToken(token) : null;

  const parsed = FeedbackBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const { nps_score, free_text, module, session_id, context } = parsed.data;

  if (context && JSON.stringify(context).length > MAX_CONTEXT_BYTES) {
    return res.status(400).json({ error: 'context_too_large' });
  }

  // Rate-limit BEFORE the write — closes the anon-write spam vector. Key on an
  // UN-FORGEABLE identifier only: verified user id, else request IP. We do NOT
  // key on session_id (client-supplied — an attacker could rotate it to mint a
  // fresh bucket per request). Fails OPEN (rateLimit contract).
  const rlKey = `feedback:${user?.id ?? `ip:${clientIp(req)}`}`;
  const allowed = await rateLimitCheck(rlKey, FEEDBACK_LIMIT, FEEDBACK_WINDOW_SECONDS);
  if (!allowed) {
    res.setHeader('Retry-After', '30');
    return res.status(429).json({ error: 'rate_limited', retry_after_seconds: 30 });
  }

  const admin = getSupabaseAdmin();
  const { error } = await admin.from('feedback').insert({
    user_id: user?.id ?? null,
    session_id: session_id ?? null,
    module: module ?? null,
    nps_score,
    free_text: free_text ?? null,
    context: context ?? {},
  });
  if (error) {
    // Don't leak internal schema/constraint text to an (often anonymous) caller.
    console.error('[feedback] insert failed:', error.message);
    return res.status(500).json({ error: 'insert_failed' });
  }

  return res.status(200).json({ ok: true });
}
