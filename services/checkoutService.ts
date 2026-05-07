import { getSupabase } from './supabaseClient';

/**
 * Client-side orchestrator for the on-domain checkout flow.
 *
 * Cards are tokenized in the browser via direct call to PayMongo's
 * /v1/payment_methods using the PUBLIC key (Basic auth, public_key + ':').
 * The resulting payment_method_id is then attached to the PaymentIntent
 * server-side via /api/billing/confirm — that's the only step that uses
 * the SECRET key. Raw card data never touches our backend, which keeps
 * us in PCI SAQ A scope.
 */

export type PlanId = 'creator' | 'pro' | 'business';
export type BillingCycle = 'monthly' | 'annual';

export type IntentBreakdown = {
  subtotal_centavos: number;
  vat_centavos: number;
  total_centavos: number;
  monthly_equivalent_centavos: number | null;
  annual_savings_centavos: number | null;
};

export type IntentResponse = {
  intent_id: string;
  client_key: string;
  status: string;
  plan: { id: PlanId; name: string; description: string; billing_cycle: BillingCycle };
  breakdown: IntentBreakdown;
};

export type CardDetails = {
  card_number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
  cardholder_name: string;
  email: string;
};

export type PaymentNextAction =
  | { type: string; redirect?: { url: string; return_url: string } }
  | null;

export type ConfirmResponse = {
  status: string;
  next_action: PaymentNextAction;
  last_payment_error: { code?: string; message?: string } | null;
};

export type StatusResponse = {
  status: string;
  last_payment_error: { code?: string; message?: string } | null;
  amount: number;
};

const PAYMONGO_API_BASE = 'https://api.paymongo.com/v1';

const getAuthToken = async (): Promise<string> => {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');
  return token;
};

const proxyError = async (res: Response, prefix: string): Promise<never> => {
  const text = await res.text().catch(() => '');
  throw new Error(`${prefix} (${res.status}): ${text}`);
};

export const fetchIntent = async (
  plan_id: PlanId,
  billing_cycle: BillingCycle
): Promise<IntentResponse> => {
  const token = await getAuthToken();
  const res = await fetch('/api/billing/intent', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ plan_id, billing_cycle }),
  });
  if (!res.ok) await proxyError(res, 'INTENT_FAILED');
  return res.json();
};

const tokenizeCard = async (details: CardDetails): Promise<string> => {
  const env = (import.meta as any).env || {};
  const publicKey = env.VITE_PAYMONGO_PUBLIC_KEY;
  if (!publicKey) throw new Error('PAYMONGO_PUBLIC_KEY_MISSING');

  const auth = 'Basic ' + btoa(`${publicKey}:`);
  const res = await fetch(`${PAYMONGO_API_BASE}/payment_methods`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      data: {
        attributes: {
          type: 'card',
          details: {
            card_number: details.card_number,
            exp_month: details.exp_month,
            exp_year: details.exp_year,
            cvc: details.cvc,
          },
          billing: {
            name: details.cardholder_name,
            email: details.email,
          },
        },
      },
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    let parsedMessage = errBody;
    try {
      const errJson = JSON.parse(errBody);
      parsedMessage = errJson?.errors?.[0]?.detail ?? errBody;
    } catch {}
    throw new Error(`CARD_TOKENIZATION_FAILED: ${parsedMessage}`);
  }

  const json = (await res.json()) as { data?: { id?: string } };
  if (!json.data?.id) throw new Error('CARD_TOKENIZATION_NO_ID');
  return json.data.id;
};

const confirmIntent = async (
  intent_id: string,
  client_key: string,
  payment_method_id: string
): Promise<ConfirmResponse> => {
  const token = await getAuthToken();
  const res = await fetch('/api/billing/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ intent_id, client_key, payment_method_id }),
  });
  if (!res.ok) await proxyError(res, 'CONFIRM_FAILED');
  return res.json();
};

/**
 * Process a card payment end-to-end:
 *  1. tokenize card via PayMongo public-key endpoint
 *  2. attach the resulting payment_method_id via /api/billing/confirm
 *  3. if 3DS challenge required, the caller should redirect to next_action.redirect.url
 *  4. otherwise, status === 'succeeded' means we're done — webhook activates the subscription
 */
export const processCardPayment = async (
  intent: IntentResponse,
  card: CardDetails
): Promise<ConfirmResponse> => {
  const payment_method_id = await tokenizeCard(card);
  return confirmIntent(intent.intent_id, intent.client_key, payment_method_id);
};

export type EwalletType = 'gcash' | 'paymaya' | 'grab_pay';

/**
 * Start an e-wallet payment: server creates the PaymentMethod (no sensitive
 * data leaves the wallet) and attaches it to the PaymentIntent. The response
 * carries next_action.redirect.url which the caller should follow to send
 * the user into GCash/Maya/GrabPay; PayMongo redirects back to the
 * return_url after the user pays in the wallet.
 */
export const processEwalletPayment = async (
  intent: IntentResponse,
  type: EwalletType
): Promise<ConfirmResponse> => {
  const token = await getAuthToken();
  const res = await fetch('/api/billing/ewallet', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      intent_id: intent.intent_id,
      client_key: intent.client_key,
      type,
    }),
  });
  if (!res.ok) await proxyError(res, 'EWALLET_FAILED');
  return res.json();
};

export const fetchStatus = async (intent_id: string): Promise<StatusResponse> => {
  const token = await getAuthToken();
  const res = await fetch(
    `/api/billing/status?intent_id=${encodeURIComponent(intent_id)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  if (!res.ok) await proxyError(res, 'STATUS_FAILED');
  return res.json();
};

export const formatPHP = (centavos: number): string => {
  const pesos = centavos / 100;
  return `₱${pesos.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};
