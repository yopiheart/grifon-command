import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  attachPaymentMethod,
  createEwalletPaymentMethod,
} from '../_lib/paymongo.js';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';

const Body = z.object({
  intent_id: z.string().min(1),
  client_key: z.string().min(1),
  type: z.enum(['gcash', 'paymaya', 'grab_pay']),
});

const RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 60;

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
  const { intent_id, client_key, type } = parsed.data;

  const allowed = await rateLimitCheck(
    `billing_ewallet:${user.id}`,
    RATE_LIMIT,
    RATE_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(RATE_WINDOW_SECONDS));
    return res.status(429).json({ error: 'rate_limited' });
  }

  const email = user.email ?? '';
  // PayMongo requires billing.name; e-wallets carry the real name from
  // GCash/Maya/GrabPay anyway, so we just need a non-empty placeholder.
  const billingName = email ? email.split('@')[0] : 'Grifon Customer';
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
  const return_url = `${appUrl}/billing/3ds-return?intent=${encodeURIComponent(intent_id)}`;

  try {
    const pm = await createEwalletPaymentMethod({
      type,
      billing: { name: billingName, email },
    });
    const intent = await attachPaymentMethod({
      intent_id,
      client_key,
      payment_method_id: pm.id,
      return_url,
    });
    return res.status(200).json({
      status: intent.status,
      next_action: intent.next_action,
      last_payment_error: intent.last_payment_error,
    });
  } catch (err: any) {
    return res
      .status(502)
      .json({ error: 'paymongo_error', detail: err?.message ?? 'unknown' });
  }
}
