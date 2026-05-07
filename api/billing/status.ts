import type { VercelRequest, VercelResponse } from '@vercel/node';
import { retrievePaymentIntent } from '../_lib/paymongo.js';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';

// Polling endpoint for /billing/3ds-return — webhook is still source of
// truth for subscription activation; this is just for the UI confirmation.
const RATE_LIMIT = 30;
const RATE_WINDOW_SECONDS = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });
  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const intentParam = req.query.intent_id;
  const intent_id =
    (Array.isArray(intentParam) ? intentParam[0] : intentParam) ?? '';
  if (!intent_id) return res.status(400).json({ error: 'missing_intent_id' });

  const allowed = await rateLimitCheck(
    `billing_status:${user.id}`,
    RATE_LIMIT,
    RATE_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(RATE_WINDOW_SECONDS));
    return res.status(429).json({ error: 'rate_limited' });
  }

  try {
    const intent = await retrievePaymentIntent(intent_id);
    return res.status(200).json({
      status: intent.status,
      last_payment_error: intent.last_payment_error,
      amount: intent.amount,
    });
  } catch (err: any) {
    return res
      .status(502)
      .json({ error: 'paymongo_error', detail: err?.message ?? 'unknown' });
  }
}
