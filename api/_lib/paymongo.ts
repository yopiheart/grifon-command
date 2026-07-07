import crypto from 'node:crypto';

const BASE_URL = 'https://api.paymongo.com/v1';

const authHeader = (): string => {
  const key = process.env.PAYMONGO_SECRET_KEY;
  if (!key) throw new Error('PAYMONGO_SECRET_KEY not set');
  return 'Basic ' + Buffer.from(key + ':').toString('base64');
};

// Self-serve checkout plans (2026-06-19 ladder). 'free' is not a checkout plan;
// 'autopilot' is invite-only and never enters the catalog. 'starter' replaced
// the retired 'creator' tier.
export type PlanId = 'starter' | 'pro' | 'business';
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
  starter: {
    id: 'starter',
    name: 'Grifon Starter',
    description: '1 finished video ad a month — try the magic, no big commitment.',
    monthlyCentavos: 99_700,   // ₱997
    annualCentavos: 997_200,   // ₱9,972/yr ≈ ₱831/mo
  },
  pro: {
    id: 'pro',
    name: 'Grifon Pro',
    description: '8 finished video ads/mo + AI editor, format presets, and FB caption packs.',
    monthlyCentavos: 249_700,
    annualCentavos: 2_497_200,
  },
  business: {
    id: 'business',
    name: 'Grifon Business',
    description: '15 finished ads/mo + Director mode, 4K images, and the Commercial/Spec Studio.',
    monthlyCentavos: 499_700,
    annualCentavos: 4_996_800,
  },
};

// ── One-time order-bump + top-up add-ons ─────────────────────────────────────
// Amounts in centavos. Source of truth for add-on price — never trust client.
// Video-ad top-ups (2026-06-19) grant extra FINISHED-AD credits beyond a plan's
// monthly allowance, priced ~2x marginal cost so overage is always profitable.
// (Credit-granting flow is wired in the checkout/quota slice; this is the price
// source of truth.)
export type AddOnId =
  | 'onboarding_call'
  | 'video_ad_single'
  | 'video_ad_pack5'
  | 'video_ad_cinematic'
  | 'omni_style_single';

export type AddOnCatalogEntry = {
  id: AddOnId;
  name: string;
  description: string;
  centavos: number;
  /** Extra finished-ad credits this add-on grants (0 for non-credit add-ons). */
  videoAdCredits?: number;
  /** True for premium Quality+4K cinematic/spec credits (Business). */
  cinematic?: boolean;
  /** Omni Edit Style credits — styled finished ads — this add-on grants. */
  omniStyleCredits?: number;
};

export const ADD_ON_CATALOG: Record<AddOnId, AddOnCatalogEntry> = {
  onboarding_call: {
    id: 'onboarding_call',
    name: '1-on-1 Onboarding Call',
    description: 'A 30-minute setup & strategy call so you win in your first week.',
    centavos: 99_700, // ₱997 — confirmed with Neil 2026-05-30
  },
  video_ad_single: {
    id: 'video_ad_single',
    name: '1 Extra Video Ad',
    description: 'Render one more finished ad — no subscription needed.',
    centavos: 49_900, // ₱499
    videoAdCredits: 1,
  },
  video_ad_pack5: {
    id: 'video_ad_pack5',
    name: '5 Extra Video Ads',
    description: 'Five more finished ads at the best per-ad price.',
    centavos: 225_000, // ₱2,250 (₱450/ad)
    videoAdCredits: 5,
  },
  video_ad_cinematic: {
    id: 'video_ad_cinematic',
    name: '1 Cinematic Commercial Ad',
    description: 'One premium 4K cinematic/spec ad from the Commercial Studio.',
    centavos: 120_000, // ₱1,200
    videoAdCredits: 1,
    cinematic: true,
  },
  omni_style_single: {
    id: 'omni_style_single',
    name: '1 Omni Style Ad',
    description: 'Apply a premium Omni Edit Style to one more finished ad.',
    centavos: 49_900, // ₱499 — PRD default, tunable
    omniStyleCredits: 1,
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

// Replay window. A signature stays cryptographically valid forever, so signature
// verification alone does not stop a captured-and-resent event. Pairing it with a
// freshness window means a replayed event is only accepted within this many seconds
// of its signed `t=` timestamp. 5 min matches the common provider tolerance (Stripe's
// default) and comfortably absorbs PayMongo↔Vercel clock skew.
export const WEBHOOK_MAX_AGE_SECONDS = 300;

// Age (in seconds) of a PayMongo webhook, derived from the `t=` field of the
// signature header (`t=<unix>,li=<sig>`). Returns `now - t`, or null if the header
// is absent or carries no parseable timestamp. A negative result means the event is
// timestamped in the future (clock skew or a forged-future replay) — callers should
// treat |age| > WEBHOOK_MAX_AGE_SECONDS as stale in either direction.
export const webhookEventAgeSeconds = (
  signatureHeader: string | undefined,
  now: Date = new Date()
): number | null => {
  if (!signatureHeader) return null;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map((p) => {
      const [k, v] = p.split('=');
      return [k.trim(), (v ?? '').trim()];
    })
  );
  if (!parts.t) return null;
  const t = Number(parts.t);
  if (!Number.isFinite(t)) return null;
  return Math.floor(now.getTime() / 1000) - t;
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
