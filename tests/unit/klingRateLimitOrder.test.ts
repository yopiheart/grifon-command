import { describe, it, expect, vi, beforeEach } from 'vitest';

// Item 3: the Kling config/credential check must run BEFORE the rate-limit slot
// is consumed. A missing KLING_* env is our misconfiguration — it must 502
// without burning the caller's hourly budget. These tests prove the reorder by
// asserting the rate-limit RPC is never called when getKlingAccessToken throws,
// and pin the shared hourly pool at 12.

const rateLimitCheckMock = vi.fn();
const getUserMock = vi.fn();
const getKlingTokenMock = vi.fn();

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: (...a: unknown[]) => getUserMock(...a),
}));
vi.mock('../../api/_lib/rateLimit.js', () => ({
  rateLimitCheck: (...a: unknown[]) => rateLimitCheckMock(...a),
}));
vi.mock('../../api/_lib/klingAuth.js', () => ({
  getKlingAccessToken: (...a: unknown[]) => getKlingTokenMock(...a),
  invalidateKlingAccessToken: vi.fn(),
  KLING_API_BASE: 'https://api.klingai.com',
}));
// Reached only AFTER config check + rate-limit; mocked so the graph resolves.
vi.mock('../../api/_lib/userPlan.js', () => ({ getUserPlan: vi.fn(async () => 'free') }));
vi.mock('../../api/_lib/quota.js', () => ({
  meterVideoRequest: vi.fn(async () => ({ ok: true, used: 0, limit: 10 })),
}));

const videoMod = await import('../../api/kling/video.js');
const omniMod = await import('../../api/kling/omni-video.js');

function mockRes() {
  const res: any = {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    status(code: number) { this.statusCode = code; return this; },
    json(obj: unknown) { this.body = obj; return this; },
    setHeader(k: string, v: string) { this.headers[k] = v; return this; },
  };
  return res;
}

const videoBody = {
  model_name: 'kling-v3',
  image: 'data:image/png;base64,AAAA',
  prompt: 'a serum bottle glowing',
  duration: '5',
  aspect_ratio: '9:16',
};
const omniBody = {
  model_name: 'kling-video-o1',
  image_list: [{ image_url: 'https://x/y.png' }],
  prompt: 'a serum bottle glowing',
  duration: '5',
};

const mockReq = (body: unknown) =>
  ({ method: 'POST', headers: { authorization: 'Bearer tok' }, body } as any);

describe('Kling proxies — config check precedes the rate-limit slot', () => {
  beforeEach(() => {
    rateLimitCheckMock.mockReset();
    getUserMock.mockReset();
    getKlingTokenMock.mockReset();
    getUserMock.mockResolvedValue({ id: 'user-1' });
    getKlingTokenMock.mockImplementation(() => {
      throw new Error('KLING_NOT_CONFIGURED: set KLING_ACCESS_KEY and KLING_SECRET_KEY (server-side, no VITE_ prefix).');
    });
  });

  it('video: missing KLING env 502s WITHOUT calling rate_limit_check', async () => {
    const res = mockRes();
    await videoMod.default(mockReq(videoBody), res);
    expect(res.statusCode).toBe(502);
    expect(res.body).toMatchObject({ error: 'kling_error' });
    expect(rateLimitCheckMock).not.toHaveBeenCalled();
  });

  it('omni-video: missing KLING env 502s WITHOUT calling rate_limit_check', async () => {
    const res = mockRes();
    await omniMod.default(mockReq(omniBody), res);
    expect(res.statusCode).toBe(502);
    expect(res.body).toMatchObject({ error: 'kling_error' });
    expect(rateLimitCheckMock).not.toHaveBeenCalled();
  });

  it('auth still runs first: no bearer token 401s before the config check', async () => {
    const res = mockRes();
    await videoMod.default({ method: 'POST', headers: {}, body: videoBody } as any, res);
    expect(res.statusCode).toBe(401);
    expect(getKlingTokenMock).not.toHaveBeenCalled();
    expect(rateLimitCheckMock).not.toHaveBeenCalled();
  });
});

describe('Kling proxies — shared hourly pool is 12', () => {
  it('VIDEO_LIMIT === 12 in both handlers', () => {
    expect(videoMod.VIDEO_LIMIT).toBe(12);
    expect(omniMod.VIDEO_LIMIT).toBe(12);
  });
});
