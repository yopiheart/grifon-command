import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { funnelConfig } from '../src/funnel.config.js';

// ===========================================================================
// POST /api/lead — the ONLY backend this funnel has.
//
// Self-contained on purpose: each funnel deploys as its own Vercel project, so
// nothing here may import from the Grifon repo root. It is also the only
// UNAUTHENTICATED write in the system (it is a public form), which is why the
// pipeline below is defence-in-depth rather than a thin proxy:
//
//   POST only → honeypot → zod → normalise email → IP rate limit →
//   server stamps identity/consent/metadata → service-role upsert
//
// The client NEVER supplies client_id, funnel_id, consent_text or
// policy_version. Those are read from the build-baked config here, so a forged
// body cannot write a lead into another funnel's roster or invent a record of
// consent the server didn't witness (consent_capture_plan.md doctrine).
// ===========================================================================

const Body = z.object({
  name: z.string().trim().max(120).optional(),
  email: z.string().trim().max(320).email(),
  phone: z.string().trim().max(40).optional(),
  /** The consent checkbox state as the user left it. */
  consent: z.boolean(),
  qualifiers: z.record(z.string(), z.string().max(200)).optional(),
  utm: z.record(z.string(), z.string().max(400)).optional(),
  referrer: z.string().max(2000).optional(),
  pageUrl: z.string().max(2000).optional(),
  /** Honeypot. Non-empty ⇒ bot. */
  website: z.string().optional(),
});

// Best-effort, per-container: a Vercel deployment may run many containers, so
// this thins out a single noisy source rather than enforcing a global quota.
// The real duplicate defence is the (funnel_id, email) unique index.
const RATE_LIMIT = { max: 10, windowMs: 60_000 };
const hits = new Map<string, number[]>();

const rateLimited = (ip: string): boolean => {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // crude memory ceiling; correctness is unaffected
  return recent.length > RATE_LIMIT.max;
};

const firstHop = (req: VercelRequest): string | null =>
  (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ?? null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const raw = (req.body ?? {}) as Record<string, unknown>;

  // Honeypot first, before validation: bots get an indistinguishable success so
  // they don't learn to try again with the field cleared. Nothing is written.
  if (typeof raw.website === 'string' && raw.website.trim() !== '') {
    return res.status(200).json({ ok: true });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body' });
  }
  const lead = parsed.data;

  const { consent: consentConfig } = funnelConfig.form;
  if (consentConfig.required && !lead.consent) {
    return res.status(400).json({ error: 'missing_consent' });
  }

  // The dedupe index is on plain columns, so normalisation MUST happen before
  // every write or "Neil@x.com" and "neil@x.com" become two leads.
  const email = lead.email.trim().toLowerCase();

  const ip = firstHop(req);
  if (ip && rateLimited(ip)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'rate_limited' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('[api/lead] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured');
    return res.status(500).json({ error: 'not_configured' });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Qualifiers ride inside the utm jsonb (L3) — one attribution bag per lead,
  // no schema change when a funnel adds a segment question.
  const utm = {
    ...(lead.utm ?? {}),
    ...(lead.qualifiers ? { qualifiers: lead.qualifiers } : {}),
  };

  try {
    const { error } = await admin.from('funnel_leads').upsert(
      {
        created_at: new Date().toISOString(),
        client_id: funnelConfig.meta.clientId,
        funnel_id: funnelConfig.meta.funnelId,
        name: lead.name ?? null,
        email,
        phone: lead.phone ?? null,
        consent: lead.consent,
        consent_text: consentConfig.text,
        policy_version: consentConfig.policyVersion,
        ip,
        user_agent: (req.headers['user-agent'] as string | undefined) ?? null,
        utm: Object.keys(utm).length > 0 ? utm : null,
        referrer: lead.referrer ?? null,
        page_url: lead.pageUrl ?? null,
      },
      { onConflict: 'funnel_id,email' }
    );

    if (error) {
      console.error('[api/lead] db error:', error.message);
      return res.status(500).json({ error: 'db_write_failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/lead] error:', err instanceof Error ? err.message : 'unknown');
    return res.status(500).json({ error: 'lead_write_failed' });
  }
}
