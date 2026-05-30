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

// ── One-time order-bump add-ons ──────────────────────────────────────────────
// Amounts in centavos. Source of truth for add-on price — never trust client.
export type AddOnId = 'onboarding_call';

export type AddOnCatalogEntry = {
  id: AddOnId;
  name: string;
  description: string;
  centavos: number;
};

export const ADD_ON_CATALOG: Record<AddOnId, AddOnCatalogEntry> = {
  onboarding_call: {
    id: 'onboarding_call',
    name: '1-on-1 Onboarding Call',
    description: 'A 30-minute setup & strategy call so you win in your first week.',
    centavos: 99_700, // ₱997 — confirmed with Neil 2026-05-30
  },
};

const ADD_ON_IDS = Object.keys(ADD_ON_CATALOG) as AddOnId[];

export const isAddOnId = (value: string): value is AddOnId =>
  ADD_ON_IDS.includes(value as AddOnId);

/**
 * Server-authoritative sum of selected add-ons. Throws `unknown_add_on:<id>` on
 * any unrecognised ID so the client can never inject an arbitrary amount.
 */
export const sumAddOnCentavos = (addOnIds: readonly string[]): number => {
  let total = 0;
  for (const id of addOnIds) {
    const addOn = ADD_ON_CATALOG[id as AddOnId];
    if (!addOn) throw new Error(`unknown_add_on:${id}`);
    total += addOn.centavos;
  }
  return total;
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

// ----- Payment Intents API (custom on-domain checkout) ---------------------
//
// Cards are tokenized CLIENT-SIDE via PayMongo.js using PAYMONGO_PUBLIC_KEY
// — the server never sees raw PAN, which keeps us in PCI SAQ A scope.
// The client posts the resulting payment_method_id to /api/billing/confirm,
// which then calls attachPaymentMethod() below.
//
// E-wallets (GCash / Maya / GrabPay) carry no sensitive data, so the
// PaymentMethod can be safely created server-side via
// createEwalletPaymentMethod() and attached in the same request handler.

export type PaymentMethodType = 'card' | 'gcash' | 'paymaya' | 'grab_pay';
export type EwalletType = 'gcash' | 'paymaya' | 'grab_pay';

export type PaymentIntentNextAction = {
  type: string;
  redirect?: { url: string; return_url: string };
} | null;

export type PaymentIntentResponse = {
  id: string;
  client_key: string;
  status: string;
  amount: number;
  next_action: PaymentIntentNextAction;
  last_payment_error: { code?: string; message?: string } | null;
};

const mapPaymentIntent = (raw: any): PaymentIntentResponse => {
  const attrs = raw?.attributes ?? {};
  return {
    id: raw?.id,
    client_key: attrs.client_key,
    status: attrs.status,
    amount: attrs.amount,
    next_action: attrs.next_action ?? null,
    last_payment_error: attrs.last_payment_error ?? null,
  };
};

const paymongoFetch = async (path: string, init: RequestInit): Promise<any> => {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PayMongo ${res.status}: ${text}`);
  }
  return res.json();
};

export type CreatePaymentIntentParams = {
  amountCentavos: number;
  description: string;
  metadata: Record<string, string>;
  payment_method_allowed: PaymentMethodType[];
};

export const createPaymentIntent = async (
  params: CreatePaymentIntentParams
): Promise<PaymentIntentResponse> => {
  const json = await paymongoFetch('/payment_intents', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          amount: params.amountCentavos,
          currency: 'PHP',
          payment_method_allowed: params.payment_method_allowed,
          payment_method_options: { card: { request_three_d_secure: 'any' } },
          description: params.description,
          metadata: params.metadata,
        },
      },
    }),
  });
  return mapPaymentIntent(json.data);
};

export type CreateEwalletPaymentMethodParams = {
  type: EwalletType;
  billing: { name: string; email: string };
};

export type PaymentMethodResponse = { id: string; type: PaymentMethodType };

export const createEwalletPaymentMethod = async (
  params: CreateEwalletPaymentMethodParams
): Promise<PaymentMethodResponse> => {
  const json = await paymongoFetch('/payment_methods', {
    method: 'POST',
    body: JSON.stringify({
      data: {
        attributes: {
          type: params.type,
          billing: params.billing,
        },
      },
    }),
  });
  const raw = json.data;
  return { id: raw.id, type: raw.attributes.type };
};

export type AttachPaymentMethodParams = {
  intent_id: string;
  payment_method_id: string;
  client_key: string;
  return_url: string;
};

export const attachPaymentMethod = async (
  params: AttachPaymentMethodParams
): Promise<PaymentIntentResponse> => {
  const json = await paymongoFetch(
    `/payment_intents/${params.intent_id}/attach`,
    {
      method: 'POST',
      body: JSON.stringify({
        data: {
          attributes: {
            payment_method: params.payment_method_id,
            client_key: params.client_key,
            return_url: params.return_url,
          },
        },
      }),
    }
  );
  return mapPaymentIntent(json.data);
};

export const retrievePaymentIntent = async (
  intent_id: string
): Promise<PaymentIntentResponse> => {
  const json = await paymongoFetch(`/payment_intents/${intent_id}`, {
    method: 'GET',
  });
  return mapPaymentIntent(json.data);
};
