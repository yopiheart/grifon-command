import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  PLAN_CATALOG,
  createPaymentIntent,
  type PaymentMethodType,
} from '../_lib/paymongo.js';
import {
  splitVatInclusive,
  monthlyEquivalent,
  annualSavingsVsMonthly,
} from '../_lib/billing-math.js';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';

const Body = z.object({
  plan_id: z.enum(['creator', 'pro', 'business']),
  billing_cycle: z.enum(['monthly', 'annual']),
});

const RATE_LIMIT = 10;
const RATE_WINDOW_SECONDS = 60;
const ALLOWED_METHODS: PaymentMethodType[] = ['card', 'gcash', 'paymaya', 'grab_pay'];

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
  const { plan_id, billing_cycle } = parsed.data;
  const plan = PLAN_CATALOG[plan_id];
  if (!plan) return res.status(400).json({ error: 'unknown_plan' });

  const allowed = await rateLimitCheck(
    `billing_intent:${user.id}`,
    RATE_LIMIT,
    RATE_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(RATE_WINDOW_SECONDS));
    return res.status(429).json({ error: 'rate_limited' });
  }

  const total = billing_cycle === 'annual' ? plan.annualCentavos : plan.monthlyCentavos;
  const description = `${plan.name} — ${billing_cycle} subscription`;
  const metadata: Record<string, string> = {
    user_id: user.id,
    user_email: user.email ?? '',
    plan_id,
    billing_cycle,
  };

  try {
    const intent = await createPaymentIntent({
      amountCentavos: total,
      description,
      metadata,
      payment_method_allowed: ALLOWED_METHODS,
    });

    const { subtotal, vat } = splitVatInclusive(total);
    return res.status(200).json({
      intent_id: intent.id,
      client_key: intent.client_key,
      status: intent.status,
      plan: {
        id: plan_id,
        name: plan.name,
        description: plan.description,
        billing_cycle,
      },
      breakdown: {
        subtotal_centavos: subtotal,
        vat_centavos: vat,
        total_centavos: total,
        monthly_equivalent_centavos:
          billing_cycle === 'annual' ? monthlyEquivalent(plan.annualCentavos) : null,
        annual_savings_centavos:
          billing_cycle === 'annual'
            ? annualSavingsVsMonthly(plan.annualCentavos, plan.monthlyCentavos)
            : null,
      },
    });
  } catch (err: any) {
    return res
      .status(502)
      .json({ error: 'paymongo_error', detail: err?.message ?? 'unknown' });
  }
}
