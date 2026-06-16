import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  verifyWebhookSignature,
  webhookEventAgeSeconds,
  WEBHOOK_MAX_AGE_SECONDS,
  type BillingCycle,
  type PlanId,
} from './_lib/paymongo.js';
import { getSupabaseAdmin } from './_lib/supabaseAdmin.js';

export const config = { api: { bodyParser: false } };

// Idempotency guard. A valid signature can be replayed within the freshness window,
// and PayMongo itself delivers at-least-once, so the same event can legitimately
// arrive twice. We dedupe on the event's own id against the last one we recorded for
// this user (subscriptions.paymongo_last_checkout_id) — if it matches, this exact
// activation was already applied, so re-processing is a no-op. No new table needed.
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
    const plan_id = metadata.plan_id as PlanId | undefined;
    const billing_cycle = metadata.billing_cycle as BillingCycle | undefined;
    const intent_id: string | undefined = event?.data?.attributes?.data?.id;
    const add_ons =
      typeof metadata.add_ons === 'string' && metadata.add_ons.length
        ? metadata.add_ons.split(',')
        : null;

    if (!user_id || !plan_id || !billing_cycle) {
      return res.status(200).json({ ignored: 'missing_metadata' });
    }

    const admin = getSupabaseAdmin();
    if (await alreadyProcessed(admin, user_id, intent_id)) {
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
          paymongo_last_checkout_id: intent_id ?? null,
          add_ons,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      );
    if (error) {
      return res.status(500).json({ error: 'db_upsert_failed', detail: error.message });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ignored: type ?? 'unknown' });
}
