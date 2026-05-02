import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { createCheckoutSession, PLAN_CATALOG } from './_lib/paymongo.js';
import { getUserFromAccessToken } from './_lib/supabaseAdmin.js';
import { rateLimitCheck } from './_lib/rateLimit.js';

const CheckoutBody = z.object({
  plan_id: z.enum(['creator', 'pro', 'business']),
  billing_cycle: z.enum(['monthly', 'annual']),
});

const CHECKOUT_LIMIT = 10;
const CHECKOUT_WINDOW_SECONDS = 60;

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

  const parsed = CheckoutBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const { plan_id, billing_cycle } = parsed.data;

  if (!PLAN_CATALOG[plan_id]) {
    return res.status(400).json({ error: 'unknown_plan' });
  }

  const allowed = await rateLimitCheck(
    `checkout:${user.id}`,
    CHECKOUT_LIMIT,
    CHECKOUT_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(CHECKOUT_WINDOW_SECONDS));
    return res.status(429).json({ error: 'rate_limited' });
  }

  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;

  try {
    const session = await createCheckoutSession({
      plan_id,
      billing_cycle,
      user_id: user.id,
      user_email: user.email ?? '',
      success_url: `${appUrl}/billing/success`,
      cancel_url: `${appUrl}/billing/cancel`,
    });
    return res.status(200).json({ checkout_url: session.checkout_url, id: session.id });
  } catch (err: any) {
    return res
      .status(502)
      .json({ error: 'paymongo_error', detail: err?.message ?? 'unknown' });
  }
}
