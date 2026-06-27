import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  verifyWebhookSignature,
  webhookEventAgeSeconds,
  WEBHOOK_MAX_AGE_SECONDS,
  PLAN_CATALOG,
  sumAddOnCentavos,
  type BillingCycle,
  type PlanId,
} from './_lib/paymongo.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';
import { creditsForAddOns, grantCredits } from './_lib/credits.js';
import { sendCapiPurchase } from './_lib/metaCapi.js';

// Fire a server-side Meta CAPI Purchase for a confirmed payment. Called only
// AFTER the atomic claimEvent() above has guaranteed exactly-once delivery, so
// it inherits that dedup and never double-counts. event_id is deterministic
// (`purchase:${intentId}`) so a future browser-side Purchase pixel dedups
// against this server event. Fail-SAFE: sendCapiPurchase never throws, and we
// still wrap it so a CAPI hiccup can never fail the payment webhook.
const firePurchaseCapi = async (
  admin: SupabaseClient,
  userId: string,
  intentId: string,
  valueCentavos: number
): Promise<void> => {
  try {
    // MARKETING-CONSENT GATE (straw-man-audit 2026-06-27, CRITICAL): the
    // Privacy Policy promises the account email is shared with Meta ONLY when the
    // user has actively opted in. Active consent = a marketing_consent row with
    // consent_at set AND withdrawn_at null. Without it we still fire the Purchase
    // for conversion measurement but OMIT the hashed email — external_id (the
    // pseudonymous hashed user id) carries attribution. FAIL CLOSED: if the
    // consent read errors, treat as no-consent and do NOT share the email.
    let consented = false;
    try {
      const { data: consentRow } = await admin
        .from('marketing_consent')
        .select('consent_at, withdrawn_at')
        .eq('user_id', userId)
        .maybeSingle();
      consented = Boolean(consentRow?.consent_at) && !consentRow?.withdrawn_at;
    } catch {
      consented = false;
    }
    let email: string | null = null;
    if (consented) {
      try {
        const { data } = await admin.auth.admin.getUserById(userId);
        email = data.user?.email ?? null;
      } catch {
        // Fall back to external_id (userId) matching only.
      }
    }
    await sendCapiPurchase({
      eventId: `purchase:${intentId}`,
      userId,
      email,
      value: valueCentavos / 100, // centavos → pesos
      currency: 'PHP',
    });
  } catch (err) {
    console.error('[webhook] CAPI Purchase failed (non-fatal):', err instanceof Error ? err.message : err);
  }
};

export const config = { api: { bodyParser: false } };

// Idempotency guard for the LEGACY checkout_session.payment.paid branch only.
// That branch performs an idempotent plan upsert (no additive grant), so a
// last-write-wins marker is adequate: re-applying the same activation is a no-op.
// The payment_intent.succeeded branch (which DOES additive credit grants) uses the
// stronger atomic claimEvent() below instead — a mutable marker can't safely dedupe
// an additive operation. We dedupe on the event's own id against the last one we
// recorded for this user (subscriptions.paymongo_last_checkout_id).
const alreadyProcessed = async (
  admin: SupabaseClient,
  user_id: string,
  eventId: string | undefined
): Promise<boolean> => {
  if (!eventId) return false;
  const { data } = await admin
    .from('subscriptions')
    .select('paymongo_last_checkout_id')
    .eq('user_id', user_id)
    .maybeSingle();
  return Boolean(data) && data!.paymongo_last_checkout_id === eventId;
};

// Atomic idempotency claim for a webhook event, keyed on the PayMongo intent id
// via the existing rate_limit_check RPC (limit 1). First delivery → count 1 →
// claimed (true); any concurrent OR replayed delivery → count > 1 → false. This
// is the dedup that the mutable `paymongo_last_checkout_id` marker could not
// provide for ADDITIVE credit grants — that marker is last-write-wins, so a
// concurrent double-delivery or a replay after a later purchase overwrote it
// could grant credits twice for one payment. The claim is one atomic statement,
// so concurrent deliveries can't both win.
//
// THROWS on RPC error: the handler then returns 5xx and PayMongo re-delivers
// (at-least-once), so we never grant on an unconfirmed claim (no double-grant)
// AND never silently drop a first delivery (the retry re-claims cleanly). The
// window only has to outlive the 300s freshness gate above; 1h is ample.
const WEBHOOK_CLAIM_WINDOW_SECONDS = 3600;
const claimEvent = async (admin: SupabaseClient, intentId: string): Promise<boolean> => {
  const { data, error } = await admin.rpc('rate_limit_check', {
    p_key: `webhook:evt:${intentId}`,
    p_limit: 1,
    p_window_seconds: WEBHOOK_CLAIM_WINDOW_SECONDS,
  });
  if (error) throw new Error(`claim_rpc_failed: ${error.message}`);
  return data === true;
};

const readRawBody = (req: VercelRequest): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });

const periodEnd = (cycle: BillingCycle): string => {
  const d = new Date();
  if (cycle === 'annual') d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end();
  }

  const rawBody = await readRawBody(req);
  const sigHeader = req.headers['paymongo-signature'];
  const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;

  if (!verifyWebhookSignature(rawBody, sig, process.env.PAYMONGO_WEBHOOK_SECRET)) {
    return res.status(400).json({ error: 'invalid_signature' });
  }

  // Reject stale (or future-dated) events even when the signature checks out — this
  // is what stops a captured valid event from being replayed indefinitely.
  const ageSeconds = webhookEventAgeSeconds(sig);
  if (ageSeconds === null || Math.abs(ageSeconds) > WEBHOOK_MAX_AGE_SECONDS) {
    return res.status(400).json({ error: 'stale_event' });
  }

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return res.status(400).json({ error: 'invalid_json' });
  }

  const type: string | undefined = event?.data?.attributes?.type;
  const payload: any = event?.data?.attributes?.data?.attributes ?? {};

  if (type === 'checkout_session.payment.paid') {
    const metadata = payload.metadata ?? {};
    const user_id: string | undefined = metadata.user_id;
    const plan_id = metadata.plan_id as PlanId | undefined;
    const billing_cycle = metadata.billing_cycle as BillingCycle | undefined;
    const checkout_id: string | undefined = event?.data?.attributes?.data?.id;

    if (!user_id || !plan_id || !billing_cycle) {
      return res.status(200).json({ ignored: 'missing_metadata' });
    }

    const admin = getSupabaseAdmin();
    if (await alreadyProcessed(admin, user_id, checkout_id)) {
      return res.status(200).json({ ignored: 'duplicate_event' });
    }
    const { error } = await admin
      .from('subscriptions')
      .upsert(
        {
          user_id,
          plan_id,
          status: 'active',
          billing_cycle,
          current_period_end: periodEnd(billing_cycle),
          paymongo_last_checkout_id: checkout_id ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) {
      return res.status(500).json({ error: 'db_upsert_failed', detail: error.message });
    }
    return res.status(200).json({ ok: true });
  }

  // New: custom on-domain checkout fires payment_intent.succeeded instead of
  // checkout_session.payment.paid. Same activation logic — single source of
  // truth for plan_id + billing_cycle is still the PaymentIntent metadata.
  if (type === 'payment_intent.succeeded') {
    const metadata = payload.metadata ?? {};
    const user_id: string | undefined = metadata.user_id;
    const intent_id: string | undefined = event?.data?.attributes?.data?.id;
    const add_ons =
      typeof metadata.add_ons === 'string' && metadata.add_ons.length
        ? metadata.add_ons.split(',')
        : null;

    if (!user_id) {
      return res.status(200).json({ ignored: 'missing_metadata' });
    }
    // No idempotency key → we can't safely run an additive credit grant. A real
    // payment_intent.succeeded always carries an id; bail rather than risk a
    // dedup-less grant.
    if (!intent_id) {
      return res.status(200).json({ ignored: 'missing_intent_id' });
    }

    const admin = getSupabaseAdmin();
    // Atomic claim (replaces the last-write-wins alreadyProcessed marker for this
    // branch) — closes the additive-grant double-grant window. On claim-RPC error
    // we 5xx so PayMongo re-delivers; we never grant on an unconfirmed claim.
    let claimed: boolean;
    try {
      claimed = await claimEvent(admin, intent_id);
    } catch {
      return res.status(500).json({ error: 'claim_failed' });
    }
    if (!claimed) {
      return res.status(200).json({ ignored: 'duplicate_event' });
    }

    // Standalone top-up purchase — grant finished-ad credits WITHOUT touching the
    // user's plan/status. This is the ₱499 single-ad door for Free users and the
    // overage door for subscribers; the intent carries purchase_type='topup' and
    // no plan_id. The atomic claimEvent() above has already guaranteed exactly-once
    // delivery, so this additive grant runs at most once per payment.
    if (metadata.purchase_type === 'topup') {
      if (!add_ons) {
        return res.status(200).json({ ignored: 'topup_no_add_ons' });
      }
      const { video, cinematic } = creditsForAddOns(add_ons);
      await grantCredits(user_id, video, cinematic);
      await admin
        .from('subscriptions')
        .update({
          paymongo_last_checkout_id: intent_id ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user_id);
      let topupCentavos = 0;
      try {
        topupCentavos = sumAddOnCentavos(add_ons);
      } catch {
        // Unknown add-on id (shouldn't happen for a real intent we created) —
        // skip value, still fire so the conversion is attributed.
      }
      await firePurchaseCapi(admin, user_id, intent_id, topupCentavos);
      return res.status(200).json({ ok: true, granted: { video, cinematic } });
    }

    // Subscription activation (existing flow).
    const plan_id = metadata.plan_id as PlanId | undefined;
    const billing_cycle = metadata.billing_cycle as BillingCycle | undefined;
    if (!plan_id || !billing_cycle) {
      return res.status(200).json({ ignored: 'missing_metadata' });
    }
    const { error } = await admin
      .from('subscriptions')
      .upsert(
        {
          user_id,
          plan_id,
          status: 'active',
          billing_cycle,
          current_period_end: periodEnd(billing_cycle),
          paymongo_last_checkout_id: intent_id ?? null,
          add_ons,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) {
      return res.status(500).json({ error: 'db_upsert_failed', detail: error.message });
    }
    // Grant any video-credit add-ons bought as order bumps alongside the plan
    // (no-op for non-credit bumps like onboarding_call).
    if (add_ons) {
      const { video, cinematic } = creditsForAddOns(add_ons);
      await grantCredits(user_id, video, cinematic);
    }
    // Server-authoritative purchase value: plan price (by cycle) + any add-on
    // order bumps. Never trust a client amount.
    const planCentavos =
      billing_cycle === 'annual'
        ? PLAN_CATALOG[plan_id].annualCentavos
        : PLAN_CATALOG[plan_id].monthlyCentavos;
    let addOnCentavos = 0;
    if (add_ons) {
      try {
        addOnCentavos = sumAddOnCentavos(add_ons);
      } catch {
        // Unknown add-on id — skip its value, still fire on the plan amount.
      }
    }
    await firePurchaseCapi(admin, user_id, intent_id, planCentavos + addOnCentavos);
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ignored: type ?? 'unknown' });
}
