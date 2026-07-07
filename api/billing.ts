import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import {
  PLAN_CATALOG,
  ADD_ON_CATALOG,
  sumAddOnCentavos,
  attachPaymentMethod,
  createEwalletPaymentMethod,
  createPaymentIntent,
  retrievePaymentIntent,
  type AddOnId,
  type PaymentMethodType,
} from './_lib/paymongo.js';
import { peekCredits } from './_lib/credits.js';
import {
  annualSavingsVsMonthly,
  monthlyEquivalent,
  splitVatInclusive,
} from './_lib/billing-math.js';
import { getUserFromAccessToken } from './_lib/supabaseAdmin.js';
import { rateLimitCheck } from './_lib/rateLimit.js';
import { getUserPlan } from './_lib/userPlan.js';
import { peekMonthly, type MeterUnit } from './_lib/quota.js';

// Consolidated billing endpoint. The 5 handlers
// (intent / confirm / ewallet / status / usage) live below as branches off
// ?action=... Folded together to stay under Vercel Hobby's 12-function cap.

const ALLOWED_METHODS: PaymentMethodType[] = ['card', 'gcash', 'paymaya', 'grab_pay'];
const ACTIONS = ['intent', 'topup', 'confirm', 'ewallet', 'status', 'usage'] as const;
type Action = (typeof ACTIONS)[number];

// Units surfaced to the dashboard quota meter + wall.
const METER_UNITS: MeterUnit[] = ['workflows', 'reports', 'captions', 'images', 'video_ads', 'omni_ads'];

const IntentBody = z.object({
  plan_id: z.enum(['starter', 'pro', 'business']),
  billing_cycle: z.enum(['monthly', 'annual']),
  // Optional order-bump add-on IDs. Validated server-side against ADD_ON_CATALOG;
  // the client only ever sends IDs, never an amount.
  add_ons: z.array(z.string()).max(5).optional(),
});

// Standalone top-up purchase — credit-bearing add-ons only (no plan). The
// onboarding_call (a subscription order-bump) is rejected here.
const TopupBody = z.object({
  add_ons: z.array(z.string()).min(1).max(5),
});

const ConfirmBody = z.object({
  intent_id: z.string().min(1),
  client_key: z.string().min(1),
  payment_method_id: z.string().min(1),
  // True for a standalone top-up — tags the 3DS return_url so the post-payment
  // screen doesn't claim a subscription was activated.
  topup: z.boolean().optional(),
});

const EwalletBody = z.object({
  intent_id: z.string().min(1),
  client_key: z.string().min(1),
  type: z.enum(['gcash', 'paymaya', 'grab_pay']),
  topup: z.boolean().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const actionParam = req.query.action;
  const action = (Array.isArray(actionParam) ? actionParam[0] : actionParam) as Action | undefined;
  if (!action || !ACTIONS.includes(action)) {
    return res.status(400).json({ error: 'unknown_action' });
  }

  const expectedMethod = action === 'status' || action === 'usage' ? 'GET' : 'POST';
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
    case 'topup':
      return handleTopup(req, res, user);
    case 'confirm':
      return handleConfirm(req, res, user);
    case 'ewallet':
      return handleEwallet(req, res, user);
    case 'status':
      return handleStatus(req, res, user);
    case 'usage':
      return handleUsage(req, res, user);
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

async function handleTopup(req: VercelRequest, res: VercelResponse, user: AuthedUser) {
  const parsed = TopupBody.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const addOnIds = parsed.data.add_ons;
  // Only credit-bearing add-ons can be bought standalone. Rejects unknown IDs and
  // the onboarding_call (which has no videoAdCredits and is a subscription bump).
  for (const id of addOnIds) {
    const addOn = ADD_ON_CATALOG[id as AddOnId];
    if (!addOn || !addOn.videoAdCredits) {
      return res.status(400).json({ error: 'not_a_topup', detail: id });
    }
  }

  if (!(await enforceRateLimit(res, `billing_topup:${user.id}`, 10, 60))) return;

  // Server-authoritative total — the client only ever sends add-on IDs.
  let total = 0;
  try {
    total = sumAddOnCentavos(addOnIds);
  } catch {
    return res.status(400).json({ error: 'unknown_add_on' });
  }

  const metadata: Record<string, string> = {
    user_id: user.id,
    user_email: user.email ?? '',
    purchase_type: 'topup',
    add_ons: addOnIds.join(','),
  };

  try {
    const intent = await createPaymentIntent({
      amountCentavos: total,
      description: `Grifon top-up — ${addOnIds.length} item(s)`,
      metadata,
      payment_method_allowed: ALLOWED_METHODS,
    });
    const { subtotal, vat } = splitVatInclusive(total);
    return res.status(200).json({
      intent_id: intent.id,
      client_key: intent.client_key,
      status: intent.status,
      // Shape parallels the subscription intent so the client checkout reuses the
      // same card/e-wallet processor. `plan` is a synthetic top-up descriptor —
      // no subscription is created; the webhook only grants credits.
      plan: {
        id: 'topup',
        name: 'Top-up credits',
        description: 'One-time finished-ad credits — no subscription.',
        billing_cycle: 'monthly',
      },
      breakdown: {
        subtotal_centavos: subtotal,
        vat_centavos: vat,
        total_centavos: total,
        add_on_centavos: total,
        monthly_equivalent_centavos: null,
        annual_savings_centavos: null,
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
  const { intent_id, client_key, payment_method_id, topup } = parsed.data;

  if (!(await enforceRateLimit(res, `billing_confirm:${user.id}`, 10, 60))) return;

  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
  const return_url = `${appUrl}/billing/3ds-return?intent=${encodeURIComponent(intent_id)}${topup ? '&topup=1' : ''}`;

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
  const { intent_id, client_key, type, topup } = parsed.data;

  if (!(await enforceRateLimit(res, `billing_ewallet:${user.id}`, 10, 60))) return;

  const email = user.email ?? '';
  // PayMongo requires billing.name; e-wallets carry the real name from
  // GCash/Maya/GrabPay anyway, so a non-empty placeholder is enough.
  const billingName = email ? email.split('@')[0] : 'Grifon Customer';
  const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
  const return_url = `${appUrl}/billing/3ds-return?intent=${encodeURIComponent(intent_id)}${topup ? '&topup=1' : ''}`;

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

// Read-only monthly usage snapshot for the current user. Drives the dashboard
// QuotaMeter + the quota-wall modal. peekMonthly reads the rate_limits counter
// without consuming a slot, so this is safe to poll.
async function handleUsage(_req: VercelRequest, res: VercelResponse, user: AuthedUser) {
  if (!(await enforceRateLimit(res, `billing_usage:${user.id}`, 30, 60))) return;

  const plan = await getUserPlan(user.id);
  const [entries, credits] = await Promise.all([
    Promise.all(
      METER_UNITS.map(async (unit) => {
        const { used, limit, remaining } = await peekMonthly(unit, user.id, plan);
        return [unit, { used, limit, remaining }] as const;
      })
    ),
    peekCredits(user.id),
  ]);

  return res.status(200).json({
    plan,
    ...Object.fromEntries(entries),
    // Purchased top-up balances (separate from the monthly meter above).
    credits,
  });
}
