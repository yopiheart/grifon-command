import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createCompanionLiveSessionHandler, type CompanionLiveSessionPolicy } from '../../api/_lib/companionLiveSession.js';

const admin = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn() }));
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: (...args: unknown[]) => admin.user(...args),
  getSupabaseAdmin: () => ({ rpc: (...args: unknown[]) => admin.rpc(...args) }),
}));

const owner = '11111111-1111-4111-8111-111111111111';
const start = Date.parse('2026-10-17T00:00:00Z');
const policy: CompanionLiveSessionPolicy = {
  model: 'opaque-fixture-model',
  tokenLifetimeMs: 10_000,
  newSessionLifetimeMs: 2_000,
  issuanceLeaseSeconds: 11,
  mintTimeoutMs: 500,
  requestTimeoutMs: 1_000,
  burst: { limit: 2, windowSeconds: 3 },
  userDaily: { limit: 4, windowSeconds: 17 },
  globalDaily: { limit: 8, windowSeconds: 19 },
};
const request = (changes: Record<string, unknown> = {}) => ({
  method: 'POST', body: {}, headers: { authorization: 'Bearer fixture-access-token' }, ...changes,
} as any);
function response() {
  const res: any = { statusCode: 0, body: null, headers: {} };
  res.setHeader = (name: string, value: string) => { res.headers[name] = value; return res; };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (body: unknown) => { res.body = body; return res; };
  return res;
}
function fixture(overrides: Record<string, unknown> = {}) {
  const mintToken = vi.fn().mockResolvedValue({
    name: 'auth_tokens/fixture-credential',
    expireTime: new Date(start + policy.tokenLifetimeMs).toISOString(),
    newSessionExpireTime: new Date(start + policy.newSessionLifetimeMs).toISOString(),
    ignoredSecret: 'fixture-server-secret',
  });
  const handler = createCompanionLiveSessionHandler({ policy, mintToken, ...overrides });
  return { handler, mintToken };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(start);
  vi.clearAllMocks();
  admin.user.mockResolvedValue({ id: owner, email: null });
  admin.rpc.mockResolvedValue({ data: true, error: null });
});
afterEach(() => { vi.useRealTimers(); });

describe('bounded companion live credential issuance', () => {
  it('authenticates, claims burst/lease/daily caps in order, and serializes only the temporary credential', async () => {
    const { handler, mintToken } = fixture(), res = response();
    await handler(request(), res);
    expect(admin.user).toHaveBeenCalledExactlyOnceWith('fixture-access-token');
    expect(admin.rpc.mock.calls).toEqual([
      ['rate_limit_check', { p_key: `companion:live:burst:${owner}`, p_limit: 2, p_window_seconds: 3 }],
      ['rate_limit_check', { p_key: `companion:live:lease:${owner}`, p_limit: 1, p_window_seconds: 11 }],
      ['rate_limit_check', { p_key: `companion:live:daily:${owner}`, p_limit: 4, p_window_seconds: 17 }],
      ['rate_limit_check', { p_key: 'companion:live:daily:global', p_limit: 8, p_window_seconds: 19 }],
    ]);
    expect(mintToken).toHaveBeenCalledExactlyOnceWith({
      model: policy.model,
      expireTime: new Date(start + policy.tokenLifetimeMs).toISOString(),
      newSessionExpireTime: new Date(start + policy.newSessionLifetimeMs).toISOString(),
      signal: expect.any(AbortSignal),
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ credential: 'auth_tokens/fixture-credential', model: policy.model, expiresAt: start + policy.tokenLifetimeMs });
    expect(res.headers['Cache-Control']).toBe('no-store');
    expect(JSON.stringify(res.body)).not.toContain('fixture-server-secret');
    expect(admin.user.mock.invocationCallOrder[0]).toBeLessThan(admin.rpc.mock.invocationCallOrder[0]);
    expect(admin.rpc.mock.invocationCallOrder[3]).toBeLessThan(mintToken.mock.invocationCallOrder[0]);
    expect(mintToken.mock.calls[0][0].signal.aborted).toBe(true);
  });

  it.each(['GET', 'PUT', 'DELETE', undefined])('rejects method %s before authentication or claims', async (method) => {
    const { handler, mintToken } = fixture(), res = response();
    await handler(request({ method }), res);
    expect(res.statusCode).toBe(405);
    expect(res.headers).toMatchObject({ Allow: 'POST', 'Cache-Control': 'no-store' });
    expect(admin.user).not.toHaveBeenCalled(); expect(admin.rpc).not.toHaveBeenCalled(); expect(mintToken).not.toHaveBeenCalled();
  });

  it.each([undefined, null, [], '{}', 'bad-json', { model: 'untrusted' }, { config: {} }, { tools: [] }, { context: 'untrusted' }, { ownerId: owner }, new Date(), Object.create(null)])('rejects a nonempty or nonobject request body %#', async (body) => {
    const { handler, mintToken } = fixture(), res = response();
    await handler(request({ body }), res);
    expect(res.statusCode).toBe(400); expect(res.body).toEqual({ error: 'invalid_request' });
    expect(admin.user).not.toHaveBeenCalled(); expect(admin.rpc).not.toHaveBeenCalled(); expect(mintToken).not.toHaveBeenCalled();
  });

  it.each([undefined, '', 'Basic fixture', 'Bearer', 'Bearer token extra', ['Bearer fixture']])('requires one bearer token %#', async (authorization) => {
    const { handler, mintToken } = fixture(), res = response();
    await handler(request({ headers: { authorization } }), res);
    expect(res.statusCode).toBe(401); expect(res.body).toEqual({ error: 'unauthorized' });
    expect(admin.user).not.toHaveBeenCalled(); expect(admin.rpc).not.toHaveBeenCalled(); expect(mintToken).not.toHaveBeenCalled();
  });

  it('refuses invalid authentication and fails closed on auth infrastructure errors', async () => {
    const { handler, mintToken } = fixture();
    admin.user.mockResolvedValueOnce(null);
    const denied = response(); await handler(request(), denied);
    expect(denied.statusCode).toBe(401);
    admin.user.mockRejectedValueOnce(new Error('fixture-server-secret'));
    const unavailable = response(); await handler(request(), unavailable);
    expect(unavailable.statusCode).toBe(503); expect(unavailable.body).toEqual({ error: 'live_voice_unavailable' });
    expect(admin.rpc).not.toHaveBeenCalled(); expect(mintToken).not.toHaveBeenCalled();
  });

  it.each([
    { data: true, error: { message: 'fixture-server-secret' } },
    { data: 'true', error: null }, { data: 1, error: null }, { data: null, error: null },
    { data: true }, { error: null }, null,
  ])('fails closed on an errored or malformed durable claim %#', async (claimResult) => {
    const { handler, mintToken } = fixture(), res = response();
    admin.rpc.mockResolvedValueOnce(claimResult);
    await handler(request(), res);
    expect(res.statusCode).toBe(503); expect(res.body).toEqual({ error: 'live_voice_unavailable' });
    expect(admin.rpc).toHaveBeenCalledOnce(); expect(mintToken).not.toHaveBeenCalled();
  });

  it('fails closed on a thrown durable claim without fallback or mint retry', async () => {
    const { handler, mintToken } = fixture(), res = response();
    admin.rpc.mockRejectedValueOnce(new Error('fixture-server-secret'));
    await handler(request(), res);
    expect(res.statusCode).toBe(503); expect(res.body).toEqual({ error: 'live_voice_unavailable' });
    expect(admin.rpc).toHaveBeenCalledOnce(); expect(mintToken).not.toHaveBeenCalled();
  });

  it.each([
    [0, 'live_voice_rate_limited', policy.burst.windowSeconds],
    [1, 'live_voice_session_active', policy.issuanceLeaseSeconds],
    [2, 'live_voice_daily_limit', policy.userDaily.windowSeconds],
    [3, 'live_voice_daily_limit', policy.globalDaily.windowSeconds],
  ])('stops at denied claim %s without refunding or retrying prior claims', async (deniedIndex, error, retry) => {
    const { handler, mintToken } = fixture(), res = response();
    for (let index = 0; index < Number(deniedIndex); index++) admin.rpc.mockResolvedValueOnce({ data: true, error: null });
    admin.rpc.mockResolvedValueOnce({ data: false, error: null });
    await handler(request(), res);
    expect(res.statusCode).toBe(429); expect(res.headers['Retry-After']).toBe(String(retry));
    expect(res.body).toEqual({ error, retry_after_seconds: retry });
    expect(admin.rpc).toHaveBeenCalledTimes(Number(deniedIndex) + 1); expect(mintToken).not.toHaveBeenCalled();
  });

  it('anchors expiry before the claims rather than after the delayed mint', async () => {
    admin.user.mockImplementationOnce(async () => { vi.setSystemTime(start + 100); return { id: owner, email: null }; });
    admin.rpc.mockImplementation(async () => { vi.setSystemTime(Date.now() + 50); return { data: true, error: null }; });
    const { handler, mintToken } = fixture(), res = response();
    mintToken.mockImplementationOnce(async () => { vi.setSystemTime(Date.now() + 100); return { name: 'auth_tokens/fixture-credential', expireTime: '2099-01-01T00:00:00Z' }; });
    await handler(request(), res);
    expect(res.statusCode).toBe(200); expect(res.body.expiresAt).toBe(start + 100 + policy.tokenLifetimeMs);
    expect(mintToken.mock.calls[0][0].newSessionExpireTime).toBe(new Date(start + 100 + policy.newSessionLifetimeMs).toISOString());
  });

  it('does not mint when claims consume the new-session connect window', async () => {
    const { handler, mintToken } = fixture({ policy: { ...policy, requestTimeoutMs: 4_000 } }), res = response();
    admin.rpc.mockImplementation(async () => { vi.setSystemTime(Date.now() + 500); return { data: true, error: null }; });
    await handler(request(), res);
    expect(res.statusCode).toBe(503); expect(res.body).toEqual({ error: 'live_voice_timeout' });
    expect(admin.rpc).toHaveBeenCalledTimes(4); expect(mintToken).not.toHaveBeenCalled();
  });

  it('discards a minted credential that arrives after the anchored connect window', async () => {
    const { handler, mintToken } = fixture({ policy: { ...policy, requestTimeoutMs: 4_000 } }), res = response();
    mintToken.mockImplementationOnce(async () => { vi.setSystemTime(start + policy.newSessionLifetimeMs); return { name: 'auth_tokens/fixture-credential' }; });
    await handler(request(), res);
    expect(res.statusCode).toBe(503); expect(res.body).toEqual({ error: 'live_voice_timeout' });
    expect(mintToken).toHaveBeenCalledOnce();
  });

  it.each(['auth', 'claim'])('bounds a hung %s operation and never continues into minting', async (operation) => {
    const { handler, mintToken } = fixture(), res = response();
    let finish: (result: unknown) => void = () => {};
    const waiting = new Promise((resolve) => { finish = resolve; });
    if (operation === 'auth') admin.user.mockReturnValueOnce(waiting);
    else admin.rpc.mockReturnValueOnce(waiting);
    const pending = handler(request(), res);
    await vi.advanceTimersByTimeAsync(policy.requestTimeoutMs + 1); await pending;
    expect(res.statusCode).toBe(503); expect(res.body).toEqual({ error: 'live_voice_timeout' });
    finish(operation === 'auth' ? { id: owner, email: null } : { data: true, error: null });
    await vi.advanceTimersByTimeAsync(1);
    expect(mintToken).not.toHaveBeenCalled();
  });

  it('aborts a mint with unknown outcome, does not retry, and ignores its late credential', async () => {
    const { handler, mintToken } = fixture(), res = response();
    let finish: (result: unknown) => void = () => {};
    mintToken.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
    const pending = handler(request(), res);
    await vi.advanceTimersByTimeAsync(policy.mintTimeoutMs + 1); await pending;
    expect(res.statusCode).toBe(503); expect(res.body).toEqual({ error: 'live_voice_timeout' });
    expect(mintToken).toHaveBeenCalledOnce(); expect(mintToken.mock.calls[0][0].signal.aborted).toBe(true);
    finish({ name: 'auth_tokens/late-credential' }); await vi.advanceTimersByTimeAsync(1);
    expect(res.body).toEqual({ error: 'live_voice_timeout' }); expect(mintToken).toHaveBeenCalledOnce();
    expect(admin.rpc).toHaveBeenCalledTimes(4);
  });

  it('returns a safe upstream failure without retrying or refunding claims', async () => {
    const { handler, mintToken } = fixture(), res = response();
    mintToken.mockRejectedValueOnce(new Error('fixture-server-secret'));
    await handler(request(), res);
    expect(res.statusCode).toBe(502); expect(res.body).toEqual({ error: 'live_voice_provider_error' });
    expect(mintToken).toHaveBeenCalledOnce(); expect(admin.rpc).toHaveBeenCalledTimes(4);
  });

  it.each([null, {}, { name: undefined }, { name: 4 }, { name: '' }, { name: 'fixture-master-key' }, { name: 'auth_tokens/' }, { name: 'auth_tokens/with space' }])('rejects an invalid provider token response %#', async (result) => {
    const { handler, mintToken } = fixture(), res = response();
    mintToken.mockResolvedValueOnce(result); await handler(request(), res);
    expect(res.statusCode).toBe(502); expect(res.body).toEqual({ error: 'live_voice_provider_error' });
    expect(mintToken).toHaveBeenCalledOnce();
  });

  it.each([
    { tokenLifetimeMs: 0 }, { newSessionLifetimeMs: 20_000 }, { issuanceLeaseSeconds: 10 },
    { requestTimeoutMs: 55_000 }, { mintTimeoutMs: 1_001 }, { burst: { limit: -1, windowSeconds: 3 } },
  ])('rejects unsafe server policy before authentication or minting %#', async (change) => {
    const { handler, mintToken } = fixture({ policy: { ...policy, ...change } }), res = response();
    await handler(request(), res);
    expect(res.statusCode).toBe(503); expect(res.body).toEqual({ error: 'live_voice_unavailable' });
    expect(admin.user).not.toHaveBeenCalled(); expect(admin.rpc).not.toHaveBeenCalled(); expect(mintToken).not.toHaveBeenCalled();
  });

  it('supports injected verification and raw claims while retaining strict claim validation', async () => {
    const verifyAccessToken = vi.fn().mockResolvedValue({ id: owner, email: null });
    const claimRateLimit = vi.fn().mockResolvedValue({ data: true, error: null });
    const { handler } = fixture({ verifyAccessToken, claimRateLimit }), res = response();
    await handler(request(), res);
    expect(res.statusCode).toBe(200); expect(verifyAccessToken).toHaveBeenCalledOnce(); expect(claimRateLimit).toHaveBeenCalledTimes(4);
    expect(admin.user).not.toHaveBeenCalled(); expect(admin.rpc).not.toHaveBeenCalled();
  });
});
