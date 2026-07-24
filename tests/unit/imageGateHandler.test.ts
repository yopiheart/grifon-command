import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// P4 image-gate metering redesign (2026-07-23). Gate mode (body `{ gateCheck }`)
// no longer draws down the customer monthly 'images' meter — it rides an INTERNAL
// COGS budget: a per-user 48/day cap + a per-(runId,sceneIdx) idempotency limit,
// both via rate_limit_check. These tests assert the metering seam at the handler
// boundary (auth / rate-limit / quota / gate / cogs mocks), never re-deriving the
// budget math from the implementation.
//
// Harness mirrors omniVideoHandler.test.ts: vi.mock BEFORE importing the handler,
// mockReq/mockRes helpers, save/restore IMAGE_GATE_ENABLED per test.

const rateLimitCheckMock = vi.fn(async () => true);
const getUserPlanMock = vi.fn(async () => 'business');
const consumeMonthlyMock = vi.fn(async () => ({ allowed: true, used: 0, limit: 25 }));
const logImageUsageMock = vi.fn();
const gateImageMock = vi.fn(async () => ({
  observations: null,
  verdict: { pass: true, flags: [] as string[] },
}));

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: vi.fn(async () => ({ id: 'u1' })),
}));
vi.mock('../../api/_lib/rateLimit.js', () => ({
  rateLimitCheck: (...args: unknown[]) => rateLimitCheckMock(...(args as [])),
}));
vi.mock('../../api/_lib/userPlan.js', () => ({
  getUserPlan: (...args: unknown[]) => getUserPlanMock(...(args as [])),
}));
vi.mock('../../api/_lib/quota.js', () => ({
  consumeMonthly: (...args: unknown[]) => consumeMonthlyMock(...(args as [])),
}));
vi.mock('../../api/_lib/modelCosts.js', () => ({
  logImageUsage: (...args: unknown[]) => logImageUsageMock(...(args as [])),
}));
vi.mock('../../api/_lib/imageGate.js', () => ({
  IMAGE_GATE_MODEL: 'gate-model-test',
  gateImage: (...args: unknown[]) => gateImageMock(...(args as [])),
}));

import handler from '../../api/gemini/image.js';

function mockReq(overrides: Record<string, unknown> = {}) {
  return { method: 'POST', headers: {}, body: {}, ...overrides } as any;
}

function mockRes() {
  const res: any = { statusCode: 0, body: undefined, headers: {} as Record<string, string> };
  res.status = (code: number) => {
    res.statusCode = code;
    return res;
  };
  res.json = (payload: unknown) => {
    res.body = payload;
    return res;
  };
  res.setHeader = (key: string, value: string) => {
    res.headers[key] = value;
  };
  return res;
}

const gateReq = (overrides: Record<string, unknown> = {}, gateExtra: Record<string, unknown> = {}) =>
  mockReq({
    headers: { authorization: 'Bearer t', ...(overrides.headers as object) },
    body: { gateCheck: { imageBase64: 'AAAA', referenceMode: 'avatar', sceneIdx: 3, ...gateExtra } },
    ...overrides,
  });

describe('api/gemini/image — gate mode metering', () => {
  const prev = process.env.IMAGE_GATE_ENABLED;

  beforeEach(() => {
    rateLimitCheckMock.mockReset();
    rateLimitCheckMock.mockImplementation(async () => true);
    getUserPlanMock.mockReset();
    getUserPlanMock.mockImplementation(async () => 'business');
    consumeMonthlyMock.mockReset();
    consumeMonthlyMock.mockImplementation(async () => ({ allowed: true, used: 0, limit: 25 }));
    logImageUsageMock.mockReset();
    gateImageMock.mockReset();
    gateImageMock.mockImplementation(async () => ({
      observations: null,
      verdict: { pass: true, flags: [] },
    }));
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.IMAGE_GATE_ENABLED;
    else process.env.IMAGE_GATE_ENABLED = prev;
  });

  it('1) flag OFF → 503 image_gate_disabled; no rate-limit / quota / gate calls', async () => {
    delete process.env.IMAGE_GATE_ENABLED;
    const res = mockRes();
    await handler(gateReq(), res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'image_gate_disabled' });
    expect(rateLimitCheckMock).not.toHaveBeenCalled();
    expect(consumeMonthlyMock).not.toHaveBeenCalled();
    expect(gateImageMock).not.toHaveBeenCalled();
  });

  it('2) flag ON, happy path with x-run-id → 200; internal budget metered, customer meter untouched', async () => {
    process.env.IMAGE_GATE_ENABLED = 'true';
    const res = mockRes();
    await handler(gateReq({ headers: { authorization: 'Bearer t', 'x-run-id': 'run_abc' } }), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ observations: null, verdict: { pass: true, flags: [] } });
    // Gate mode no longer touches the customer meter or the plan lookup.
    expect(consumeMonthlyMock).not.toHaveBeenCalled();
    expect(getUserPlanMock).not.toHaveBeenCalled();
    // Burst limit + per-user daily budget + per-scene idempotency, in that order.
    const keys = rateLimitCheckMock.mock.calls.map((c) => c[0]);
    expect(rateLimitCheckMock).toHaveBeenCalledWith('imgate:burst:u1', 20, 60);
    expect(rateLimitCheckMock).toHaveBeenCalledWith('imgate:user:u1', 48, 86400);
    expect(rateLimitCheckMock).toHaveBeenCalledWith('imgate:run_abc:3', 2, 86400);
    expect(keys).toEqual(['imgate:burst:u1', 'imgate:user:u1', 'imgate:run_abc:3']);
    // The COGS row carries the client-supplied runId AND the verified user id (x-run-id is
    // not ownership-checked, so attribution is what makes a forged run id filterable).
    expect(logImageUsageMock).toHaveBeenCalledWith('image_gate', 'gate-model-test', 1, 'run_abc', 'u1');
  });

  it('3) flag ON, per-user daily budget denied → 429 image_gate_budget; gate NOT called', async () => {
    process.env.IMAGE_GATE_ENABLED = 'true';
    rateLimitCheckMock.mockImplementation(async (key: string) => key !== 'imgate:user:u1');
    const res = mockRes();
    await handler(gateReq({ headers: { authorization: 'Bearer t', 'x-run-id': 'run_abc' } }), res);
    expect(res.statusCode).toBe(429);
    expect(res.body).toMatchObject({ error: 'image_gate_budget' });
    expect(gateImageMock).not.toHaveBeenCalled();
  });

  it('4) flag ON, per-scene idempotency denied → 429 image_gate_scene_repeat; gate NOT called', async () => {
    process.env.IMAGE_GATE_ENABLED = 'true';
    rateLimitCheckMock.mockImplementation(async (key: string) => key !== 'imgate:run_abc:3');
    const res = mockRes();
    await handler(gateReq({ headers: { authorization: 'Bearer t', 'x-run-id': 'run_abc' } }), res);
    expect(res.statusCode).toBe(429);
    expect(res.body).toMatchObject({ error: 'image_gate_scene_repeat' });
    expect(gateImageMock).not.toHaveBeenCalled();
  });

  it('5) flag ON, no x-run-id and no sceneIdx → 200; per-scene key skipped', async () => {
    process.env.IMAGE_GATE_ENABLED = 'true';
    const res = mockRes();
    // No x-run-id header; gateCheck without sceneIdx (referenceMode only).
    await handler(
      mockReq({
        headers: { authorization: 'Bearer t' },
        body: { gateCheck: { imageBase64: 'AAAA', referenceMode: 'avatar' } },
      }),
      res
    );
    expect(res.statusCode).toBe(200);
    const imgateKeys = rateLimitCheckMock.mock.calls
      .map((c) => c[0] as string)
      .filter((k) => k.startsWith('imgate:'));
    expect(imgateKeys).toEqual(['imgate:burst:u1', 'imgate:user:u1']);
  });

  // REGRESSION GUARD. The gate used to share `gemini:image:${user.id}` with generation,
  // so a gated N-scene run spent 2N calls against ONE 15/60s allowance: the gate 429'd on
  // the later scenes (biasing gate-precision data toward early scenes) and could starve
  // the generate calls it follows. The separation is the fix — if anyone re-points the
  // gate at the generate bucket, this fails.
  it('8) flag ON, the gate NEVER touches the generate bucket', async () => {
    process.env.IMAGE_GATE_ENABLED = 'true';
    const res = mockRes();
    await handler(gateReq({ headers: { authorization: 'Bearer t', 'x-run-id': 'run_abc' } }), res);
    expect(res.statusCode).toBe(200);
    const keys = rateLimitCheckMock.mock.calls.map((c) => c[0] as string);
    expect(keys).not.toContain('gemini:image:u1');
    expect(keys.every((k) => k.startsWith('imgate:'))).toBe(true);
  });

  it('9) flag ON, gate burst denied → 429 scoped image_gate; gate NOT called, budget untouched', async () => {
    process.env.IMAGE_GATE_ENABLED = 'true';
    rateLimitCheckMock.mockImplementation(async (key: string) => key !== 'imgate:burst:u1');
    const res = mockRes();
    await handler(gateReq({ headers: { authorization: 'Bearer t', 'x-run-id': 'run_abc' } }), res);
    expect(res.statusCode).toBe(429);
    // Scope is 'image_gate', not 'image' — a gate 429 must be distinguishable from a
    // generate 429 in logs, since only one of them means lost gate coverage.
    expect(res.body).toMatchObject({ error: 'rate_limited', scope: 'image_gate' });
    expect(gateImageMock).not.toHaveBeenCalled();
    // Burst is checked FIRST, so the daily budget is never spent on a throttled call.
    expect(rateLimitCheckMock.mock.calls.map((c) => c[0])).toEqual(['imgate:burst:u1']);
  });

  it('6) flag ON, legacy model field is stripped before gateImage', async () => {
    process.env.IMAGE_GATE_ENABLED = 'true';
    const res = mockRes();
    await handler(gateReq({ headers: { authorization: 'Bearer t', 'x-run-id': 'run_abc' } }, { model: 'evil-model' }), res);
    expect(res.statusCode).toBe(200);
    expect(gateImageMock).toHaveBeenCalledTimes(1);
    const passedParams = gateImageMock.mock.calls[0][0] as Record<string, unknown>;
    expect(passedParams).not.toHaveProperty('model');
    expect(passedParams).not.toHaveProperty('sceneIdx');
    expect(passedParams).toMatchObject({ imageBase64: 'AAAA', referenceMode: 'avatar' });
  });

  it('7) generate path is untouched: flag OFF, quota exhausted → 402 quota_exceeded (consumeMonthly still runs)', async () => {
    delete process.env.IMAGE_GATE_ENABLED;
    consumeMonthlyMock.mockImplementation(async () => ({ allowed: false, used: 5, limit: 5 }));
    const res = mockRes();
    await handler(
      mockReq({ headers: { authorization: 'Bearer t' }, body: { model: 'gemini-x', contents: {} } }),
      res
    );
    expect(res.statusCode).toBe(402);
    expect(res.body).toMatchObject({ error: 'quota_exceeded', scope: 'images', used: 5, limit: 5 });
    expect(consumeMonthlyMock).toHaveBeenCalledWith('images', 'u1', 'business');
  });
});
