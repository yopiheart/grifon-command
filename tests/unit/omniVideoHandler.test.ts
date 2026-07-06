import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import handler from '../../api/gemini/omni-video.js';

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
