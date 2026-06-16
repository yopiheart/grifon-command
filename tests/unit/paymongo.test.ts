import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  verifyWebhookSignature,
  webhookEventAgeSeconds,
  WEBHOOK_MAX_AGE_SECONDS,
  PLAN_CATALOG,
  ADD_ON_CATALOG,
  sumAddOnCentavos,
} from '../../api/_lib/paymongo.js';

const SECRET = 'whsec_test_abc123';

const sign = (timestamp: string, body: string, secret = SECRET): string =>
  crypto.createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');

describe('verifyWebhookSignature', () => {
  it('returns true for a correctly signed payload', () => {
    const ts = '1700000000';
    const body = '{"event":"test"}';
    const sig = sign(ts, body);
    const header = `t=${ts},li=${sig}`;
    expect(verifyWebhookSignature(body, header, SECRET)).toBe(true);
  });

  it('returns false when signature does not match', () => {
    const ts = '1700000000';
    const body = '{"event":"test"}';
    const wrongSig = sign(ts, '{"event":"different"}');
    const header = `t=${ts},li=${wrongSig}`;
    expect(verifyWebhookSignature(body, header, SECRET)).toBe(false);
  });

  it('returns false when secret is missing', () => {
    const ts = '1700000000';
    const body = '{}';
    const header = `t=${ts},li=${sign(ts, body)}`;
    expect(verifyWebhookSignature(body, header, undefined)).toBe(false);
  });

  it('returns false when signature header is missing', () => {
    expect(verifyWebhookSignature('{}', undefined, SECRET)).toBe(false);
  });

  it('returns false on a malformed signature header (no timestamp)', () => {
    const sig = sign('1700000000', '{}');
    expect(verifyWebhookSignature('{}', `li=${sig}`, SECRET)).toBe(false);
  });

  it('falls back to test signature (te) when live (li) is absent', () => {
    const ts = '1700000000';
    const body = '{}';
    const sig = sign(ts, body);
    const header = `t=${ts},te=${sig}`;
    expect(verifyWebhookSignature(body, header, SECRET)).toBe(true);
  });
});

describe('webhookEventAgeSeconds (replay-window guard)', () => {
  // Anchor "now" so the math is deterministic regardless of when the test runs.
  const now = new Date('2026-06-16T12:00:00Z');
  const nowUnix = Math.floor(now.getTime() / 1000);

  it('reports a small age for a freshly-timestamped event', () => {
    const header = `t=${nowUnix - 10},li=deadbeef`;
    expect(webhookEventAgeSeconds(header, now)).toBe(10);
  });

  it('reports an age beyond the window for an old (replayed) event', () => {
    const header = `t=${nowUnix - 3600},li=deadbeef`;
    const age = webhookEventAgeSeconds(header, now);
    expect(age).toBe(3600);
    expect(Math.abs(age!)).toBeGreaterThan(WEBHOOK_MAX_AGE_SECONDS);
  });

  it('reports a negative age for a future-dated event (caller rejects via abs())', () => {
    const header = `t=${nowUnix + 3600},li=deadbeef`;
    const age = webhookEventAgeSeconds(header, now);
    expect(age).toBe(-3600);
    expect(Math.abs(age!)).toBeGreaterThan(WEBHOOK_MAX_AGE_SECONDS);
  });

  it('returns null when the header is missing entirely', () => {
    expect(webhookEventAgeSeconds(undefined, now)).toBeNull();
  });

  it('returns null when the header carries no timestamp field', () => {
    expect(webhookEventAgeSeconds('li=deadbeef', now)).toBeNull();
  });

  it('returns null when the timestamp is not a finite number', () => {
    expect(webhookEventAgeSeconds('t=notanumber,li=deadbeef', now)).toBeNull();
  });

  it('keeps a same-second real signed payload inside the freshness window', () => {
    // Belt-and-suspenders: a genuinely fresh event is well under the 5-min ceiling.
    const header = `t=${nowUnix},li=deadbeef`;
    expect(Math.abs(webhookEventAgeSeconds(header, now)!)).toBeLessThan(WEBHOOK_MAX_AGE_SECONDS);
  });
});

describe('PLAN_CATALOG', () => {
  it('exposes all three plan tiers with monthly + annual prices in centavos', () => {
    for (const id of ['creator', 'pro', 'business'] as const) {
      const plan = PLAN_CATALOG[id];
      expect(plan.id).toBe(id);
      expect(plan.monthlyCentavos).toBeGreaterThan(0);
      expect(plan.annualCentavos).toBeGreaterThan(0);
      // Annual should be cheaper per-month than monthly × 12 (otherwise why offer it)
      expect(plan.annualCentavos).toBeLessThan(plan.monthlyCentavos * 12);
    }
  });
});

describe('order-bump add-ons (sumAddOnCentavos)', () => {
  it('prices the onboarding call at ₱997 (99,700 centavos)', () => {
    expect(ADD_ON_CATALOG.onboarding_call.centavos).toBe(99_700);
  });

  it('returns 0 when no add-ons are selected', () => {
    expect(sumAddOnCentavos([])).toBe(0);
  });

  it('sums known add-on IDs server-side (price is never client-supplied)', () => {
    expect(sumAddOnCentavos(['onboarding_call'])).toBe(99_700);
  });

  it('throws on any unknown add-on ID so the client cannot inject an amount', () => {
    expect(() => sumAddOnCentavos(['onboarding_call', 'totally_made_up'])).toThrow(/unknown_add_on/);
    expect(() => sumAddOnCentavos(['0; DROP TABLE subscriptions'])).toThrow(/unknown_add_on/);
  });
});
