import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Auth / rate-limit / plan / allowance are mocked so the fire-path can be walked
// past its guards to the omni-ad allowance wall. The kill-switch tests below
// return 503 before any of these are invoked, so the mocks are inert there.
const peekOmniAllowanceMock = vi.fn();
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: vi.fn(async () => ({ id: 'u1' })),
}));
vi.mock('../../api/_lib/rateLimit.js', () => ({
  rateLimitCheck: vi.fn(async () => true),
}));
vi.mock('../../api/_lib/userPlan.js', () => ({
  getUserPlan: vi.fn(async () => 'business'),
}));
vi.mock('../../api/_lib/quota.js', () => ({
  peekOmniAllowance: (...args: unknown[]) => peekOmniAllowanceMock(...args),
}));

import handler, { deriveGateExpectations } from '../../api/gemini/omni-video.js';
import { OMNI_PRESETS } from '../../api/_lib/omniPresets.js';

// Lightweight kill-switch check: the handler returns 503 before any auth /
// Supabase / Gemini call when OMNI_STYLES_ENABLED is not 'true'. All the _lib
// imports are lazily initialised, so importing + invoking the default export is
// side-effect-free — no mock harness needed for this early-return guard.

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

describe('api/gemini/omni-video — kill switch', () => {
  const prev = process.env.OMNI_STYLES_ENABLED;

  beforeEach(() => {
    delete process.env.OMNI_STYLES_ENABLED;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.OMNI_STYLES_ENABLED;
    else process.env.OMNI_STYLES_ENABLED = prev;
  });

  it('returns 503 omni_styles_disabled when the flag is unset', async () => {
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'omni_styles_disabled' });
  });

  it('returns 503 when the flag is set to something other than "true"', async () => {
    process.env.OMNI_STYLES_ENABLED = 'false';
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ error: 'omni_styles_disabled' });
  });

  it('rejects non-POST before the kill switch', async () => {
    const res = mockRes();
    await handler(mockReq({ method: 'GET' }), res);
    expect(res.statusCode).toBe(405);
  });
});

describe('api/gemini/omni-video — omni-ad allowance wall', () => {
  const prev = process.env.OMNI_STYLES_ENABLED;

  beforeEach(() => {
    process.env.OMNI_STYLES_ENABLED = 'true';
    peekOmniAllowanceMock.mockReset();
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.OMNI_STYLES_ENABLED;
    else process.env.OMNI_STYLES_ENABLED = prev;
  });

  const fireReq = () =>
    mockReq({
      headers: { authorization: 'Bearer tok' },
      body: {
        presetId: 'premium-reel-v2',
        slots: { transcript: 'hello world', emphasis_words: 'HELLO', brand_primary_hex: '#FFCC00' },
        videoUrl: 'https://example.com/scene.mp4',
        estimatedDurationSec: 4,
        finishedAdId: 'ad-1',
        sceneIdx: 0,
      },
    });

  it('returns 402 omni_quota_exceeded when the allowance peek denies', async () => {
    peekOmniAllowanceMock.mockResolvedValue({
      allowed: false,
      alreadyCharged: false,
      used: 5,
      limit: 5,
      credits: 0,
    });
    const res = mockRes();
    await handler(fireReq(), res);
    expect(res.statusCode).toBe(402);
    expect(res.body).toMatchObject({
      error: 'omni_quota_exceeded',
      reason: 'omni_allowance_exhausted',
      used: 5,
      limit: 5,
      credits: 0,
    });
  });

  it('returns retryable 503 when the allowance receipt cannot be read', async () => {
    peekOmniAllowanceMock.mockResolvedValue({ allowed: false, alreadyCharged: false, used: 0, limit: 5, credits: 0, unavailable: true });
    const res = mockRes();
    await handler(fireReq(), res);
    expect(res.statusCode).toBe(503);
    expect(res.body.error).toBe('quota_unavailable');
    expect(res.headers['Retry-After']).toBe('30');
  });
});

describe('deriveGateExpectations — style-brand leak guard', () => {
  it('vox-explainer-v1 forbids the "vox" style token (Neil eyeball 2026-07-07: literal Vox masthead rendered)', () => {
    const exp = deriveGateExpectations(OMNI_PRESETS['vox-explainer-v1'], { title_text: 'GLOW UP' });
    expect(exp.directedWords).toEqual(['GLOW UP']);
    expect(exp.forbiddenWords).toContain('vox');
  });

  it('never forbids a token the directed title legitimately contains (brand "Voxel")', () => {
    const exp = deriveGateExpectations(OMNI_PRESETS['vox-explainer-v1'], { title_text: 'VOXEL PRO' });
    expect(exp.directedWords).toEqual(['VOXEL PRO']);
    expect(exp.forbiddenWords).not.toContain('vox');
  });

  it('other presets do not carry the vox token; slot hexes still forbidden', () => {
    const exp = deriveGateExpectations(OMNI_PRESETS['premium-reel-v2'], {
      emphasis_words: 'THIRSTY',
      brand_primary_hex: '#FFCC00',
    });
    expect(exp.forbiddenWords).toEqual(['#FFCC00']);
  });
});
