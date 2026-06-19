import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { getUserFromAccessToken, getSupabaseAdmin } from './_lib/supabaseAdmin.js';

// Post-render feedback capture. Fires when a user rates a delivered video
// (final MP4 or full scene pipeline). Writes rating + optional testimonial /
// private feedback to public.render_feedback via service role. There is NO
// tip/payment branch here by design — this endpoint captures sentiment only.

const Body = z.object({
  render_id: z.string().min(1).max(200),
  rating: z.number().int().min(1).max(5),
  // ≥4 path: optional public testimonial + consent + display name.
  testimonial: z.string().max(2000).optional(),
  consent_to_share: z.boolean().optional(),
  display_name: z.string().max(120).optional(),
  // ≤3 path: optional private feedback.
  feedback: z.string().max(2000).optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });
  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const { render_id, rating, testimonial, consent_to_share, display_name, feedback } = parsed.data;

  try {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from('render_feedback').insert({
      user_id: user.id,
      render_id,
      rating,
      testimonial: testimonial ?? null,
      feedback: feedback ?? null,
      consent_to_share: consent_to_share ?? false,
      display_name: display_name ?? null,
    });
    if (error) {
      return res.status(502).json({ error: 'feedback_write_failed', detail: error.message });
    }
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: 'feedback_error', detail: err?.message ?? 'unknown' });
  }
}
