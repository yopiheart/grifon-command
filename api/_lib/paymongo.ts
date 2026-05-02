import crypto from 'node:crypto';

const BASE_URL = 'https://api.paymongo.com/v1';

const authHeader = (): string => {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error('PAYMONGO_SECRET_KEY not set');
  return 'Basic ' + Buffer.from(key + ':').toString('base64');
};

export type PlanId = 'creator' | 'pro' | 'business';
export type BillingCycle = 'monthly' | 'annual';

export type PlanCatalogEntry = {
  id: PlanId;
  name: string;
  description: string;
  monthlyCentavos: number;
  annualCentavos: number;
};

// Amounts in centavos (₱1 = 100). Source of truth for price — never trust client.
export const PLAN_CATALOG: Record<PlanId, PlanCatalogEntry> = {
  creator: {
    id: 'creator',
    name: 'Grifon Creator',
    description: '15 video workflows, 5 reports, 100 captions, 50 images.',
    monthlyCentavos: 99_700,
    annualCentavos: 997_200,
  },
  pro: {
    id: 'pro',
    name: 'Grifon Pro',
    description: '40 workflows, 15 reports, 300 captions, 150 images, 15 AI video ads.',
    monthlyCentavos: 249_700,
    annualCentavos: 2_497_200,
  },
  business: {
    id: 'business',
    name: 'Grifon Business',
    description: '100 workflows, 40 reports, 500 captions, 300 images, 40 AI video ads.',
    monthlyCentavos: 499_700,
    annualCentavos: 4_996_800,
  },
};

export type CreateCheckoutParams = {
  plan_id: PlanId;
  billing_cycle: BillingCycle;
  user_id: string;
  user_email: string;
  success_url: string;
  cancel_url: string;
};

export type CheckoutSessionResponse = {
  id: string;
  checkout_url: string;
};

export const createCheckoutSession = async (
  params: CreateCheckoutParams
): Promise<CheckoutSessionResponse> => {
  const plan = PLAN_CATALOG[params.plan_id];
  const amount =
    params.billing_cycle === 'annual' ? plan.annualCentavos : plan.monthlyCentavos;
  const cycleLabel = params.billing_cycle === 'annual' ? 'annual' : 'monthly';

  const body = {
    data: {
      attributes: {
        send_email_receipt: true,
        show_description: true,
        show_line_items: true,
        line_items: [
          {
            currency: 'PHP',
            amount,
            name: `${plan.name} (${cycleLabel})`,
            quantity: 1,
            description: plan.description,
          },
        ],
        payment_method_types: ['card', 'gcash', 'grab_pay', 'paymaya'],
        success_url: params.success_url,
        cancel_url: params.cancel_url,
        description: `${plan.name} — ${cycleLabel} subscription`,
        reference_number: `${params.user_id}:${plan.id}:${params.billing_cycle}:${Date.now()}`,
        metadata: {
          user_id: params.user_id,
          user_email: params.user_email,
          plan_id: plan.id,
          billing_cycle: params.billing_cycle,
        },
      },
    },
  };

  const res = await fetch(`${BASE_URL}/checkout_sessions`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayMongo ${res.status}: ${text}`);
  }

  const json = (await res.json()) as {
    data: { id: string; attributes: { checkout_url: string } };
  };
  return { id: json.data.id, checkout_url: json.data.attributes.checkout_url };
};

// PayMongo webhook signature header format:
//   t=<timestamp>,te=<test_sig>,li=<live_sig>
// Signed payload is `${timestamp}.${rawBody}` signed with webhook secret via HMAC-SHA256.
export const verifyWebhookSignature = (
  rawBody: string,
  signatureHeader: string | undefined,
  secret: string | undefined
): boolean => {
  if (!signatureHeader || !secret) return false;

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k.trim(), (v ?? '').trim()];
    })
  );

  const timestamp = parts.t;
  const providedSig = parts.li || parts.te;
  if (!timestamp || !providedSig) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(providedSig, 'hex')
    );
  } catch {
    return false;
  }
};
