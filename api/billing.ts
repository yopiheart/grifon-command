import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  PLAN_CATALOG,
  sumAddOnCentavos,
  attachPaymentMethod,
  createEwalletPaymentMethod,
  createPaymentIntent,
  retrievePaymentIntent,
  type PaymentMethodType,
} from './_lib/paymongo.js';
import {
  annualSavingsVsMonthly,
  monthlyEquivalent,
  splitVatInclusive,
} from './_lib/billing-math.js';
import { getUserFromAccessToken } from './_lib/supabaseAdmin.js';
import { rateLimitCheck } from './_lib/rateLimit.js';

// Consolidated billing endpoint. The 4 original handlers
// (intent / confirm / ewallet / status) live below as branches off ?action=...
// Folded together to stay under Vercel Hobby's 12-function cap.

const ALLOWED_METHODS: PaymentMethodType[] = ['card', 'gcash', 'paymaya', 'grab_pay'];
const ACTIONS = ['intent', 'confirm', 'ewallet', 'status'] as const;
type Action = (typeof ACTIONS)[number];

const IntentBody = z.object({
  plan_id: z.enum(['creator', 'pro', 'business']),
  billing_cycle: z.enum(['monthly', 'annual']),
  // Optional order-bump add-on IDs. Validated server-side against ADD_ON_CATALOG;
  // the client only ever sends IDs, never an amount.
  add_ons: z.array(z.string()).max(5).optional(),
});

const ConfirmBody = z.object({
  intent_id: z.string().min(1),
  client_key: z.string().min(1),
  payment_method_id: z.string().min(1),
});

const EwalletBody = z.object({
  intent_id: z.string().min(1),
  client_key: z.string().min(1),
  type: z.enum(['gcash', 'paymaya', 'grab_pay']),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const actionParam = req.query.action;
  const action = (Array.isArray(actionParam) ? actionParam[0] : actionParam) as Action | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'unknown_action' });
  }

  const expectedMethod = action === 'status' ? 'GET' : 'POST';
  if (req.method !== expectedMethod) {
    res.setHeader('Allow', expectedMethod);
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });
  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  switch (action) {
    case 'intent':
      return handleIntent(req, res, user);
    case 'confirm':
      return handleConfirm(req, res, user);
    case 'ewallet':
      return handleEwallet(req, res, user);
    case 'status':
      return handleStatus(req, res, user);
  }
}

type AuthedUser = { id: string; email?: string | null };

async function enforceRateLimit(
  res: VercelResponse,
  bucket: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const allowed = await rateLimitCheck(bucket, limit, windowSeconds);
  if (!allowed) {
    res.setHeader('Retry-After', String(windowSeconds));
    res.status(429).json({ error: 'rate_limited' });
    return false;
  }
  return true;
}

async function handleIntent(req: VercelRequest, res: VercelResponse, user: AuthedUser) {
  const parsed = IntentBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const { plan_id, billing_cycle } = parsed.data;
  const addOnIds = parsed.data.add_ons ?? [];
  const plan = PLAN_CATALOG[plan_id];
  if (!plan) return res.status(400).json({ error: 'unknown_plan' });

  if (!(await enforceRateLimit(res, `billing_intent:${user.id}`, 10, 60))) return;

  const baseTotal = billing_cycle === 'annual' ? plan.annualCentavos : plan.monthlyCentavos;
  // Server-authoritative: add-on price is looked up here, never sent by the client.
  let addOnCentavos = 0;
  try {
    addOnCentavos = sumAddOnCentavos(addOnIds);
  } catch {
    return res.status(400).json({ error: 'unknown_add_on' });
  }
  const total = baseTotal + addOnCentavos;
  const description = addOnIds.length
    ? `${plan.name} — ${billing_cycle} + ${addOnIds.length} add-on(s)`
    : `${plan.name} — ${billing_cycle} subscription`;
  const metadata: Record<string, string> = {
    user_id: user.id,
    user_email: user.email ?? '',
    plan_id,
    billing_cycle,
  };
  if (addOnIds.length) metadata.add_ons = addOnIds.join(',');

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
        add_on_centavos: addOnCentavos,
        // Display-only: these are properties of the plan, not the chosen cycle, so we
        // return them for BOTH cycles. The monthly checkout view uses annual_savings_centavos
        // to render the honest "switch to annual & save ₱X" nudge. The charged `total`
        // (computed above) is unchanged and stays server-authoritative.
        monthly_equivalent_centavos: monthlyEquivalent(plan.annualCentavos),
        annual_savings_centavos: annualSavingsVsMonthly(plan.annualCentavos, plan.monthlyCentavos),
      },
    });
  } catch (err: any) {
    return res.status(502).json({ error: 'paymongo_error', detail: err?.message ?? 'unknown' });
  }
}

async function handleConfirm(req: VercelRequest, res: VercelResponse, user: AuthedUser) {
  const parsed = ConfirmBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const { intent_id, client_key, payment_method_id } = parsed.data;

  if (!(await enforceRateLimit(res, `billing_confirm:${user.id}`, 10, 60))) return;

  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
  const return_url = `${appUrl}/billing/3ds-return?intent=${encodeURIComponent(intent_id)}`;

  try {
    const intent = await attachPaymentMethod({
      intent_id,
      client_key,
      payment_method_id,
      return_url,
    });
    return res.status(200).json({
      status: intent.status,
      next_action: intent.next_action,
      last_payment_error: intent.last_payment_error,
    });
  } catch (err: any) {
    return res.status(502).json({ error: 'paymongo_error', detail: err?.message ?? 'unknown' });
  }
}

async function handleEwallet(req: VercelRequest, res: VercelResponse, user: AuthedUser) {
  const parsed = EwalletBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const { intent_id, client_key, type } = parsed.data;

  if (!(await enforceRateLimit(res, `billing_ewallet:${user.id}`, 10, 60))) return;

  const email = user.email ?? '';
  // PayMongo requires billing.name; e-wallets carry the real name from
  // GCash/Maya/GrabPay anyway, so a non-empty placeholder is enough.
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
    return res.status(502).json({ error: 'paymongo_error', detail: err?.message ?? 'unknown' });
  }
}

async function handleStatus(req: VercelRequest, res: VercelResponse, user: AuthedUser) {
  const intentParam = req.query.intent_id;
  const intent_id = (Array.isArray(intentParam) ? intentParam[0] : intentParam) ?? '';
  if (!intent_id) return res.status(400).json({ error: 'missing_intent_id' });

  if (!(await enforceRateLimit(res, `billing_status:${user.id}`, 30, 60))) return;

  try {
    const intent = await retrievePaymentIntent(intent_id);
    return res.status(200).json({
      status: intent.status,
      last_payment_error: intent.last_payment_error,
      amount: intent.amount,
    });
  } catch (err: any) {
    return res.status(502).json({ error: 'paymongo_error', detail: err?.message ?? 'unknown' });
  }
}
