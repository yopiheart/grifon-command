import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyWebhookSignature, PLAN_CATALOG } from '../../api/_lib/paymongo.js';

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
