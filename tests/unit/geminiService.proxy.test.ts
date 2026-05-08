import { describe, it, expect, vi, beforeEach } from 'vitest';

// Covers the JWT auto-refresh + 401 retry behavior in proxyCall.
// What this catches:
//   1. 401 + valid refresh -> retry once with new bearer, return 200 payload silently.
//   2. 401 + failed refresh (refreshSession returns no session) -> signOut() is
//      called so onAuthStateChange routes the user back to the auth screen,
//      and the call rejects with NOT_AUTHENTICATED.
//   3. 200 happy path -> no refresh attempted (regression guard).

const getSessionMock = vi.fn();
const refreshSessionMock = vi.fn();
const signOutMock = vi.fn();

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: getSessionMock,
      refreshSession: refreshSessionMock,
      signOut: signOutMock,
    },
  }),
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const okGemini = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => ({ text: JSON.stringify(payload) }),
});

const unauthorized = () => ({
  ok: false,
  status: 401,
  json: async () => ({ error: 'unauthorized' }),
});

const { generateAdScript } = await import('../../services/geminiService');

const businessInfo = {
  product: 'Test Coffee',
  features: 'Premium beans, Quick brew',
  productImageDescription: 'Coffee bag',
  scriptType: 'MrBeast',
} as any;

beforeEach(() => {
  fetchMock.mockReset();
  getSessionMock.mockReset();
  refreshSessionMock.mockReset();
  signOutMock.mockReset();
});

describe('proxyCall JWT auto-refresh + 401 retry', () => {
  it('on 401: refreshes session once, retries with the new bearer, returns the 200 payload', async () => {
    getSessionMock.mockResolvedValueOnce({
      data: { session: { access_token: 'expired-token' } },
    });
    refreshSessionMock.mockResolvedValueOnce({
      data: { session: { access_token: 'fresh-token' } },
      error: null,
    });
    fetchMock
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(okGemini({
        hook1: ['x'], hook2: ['x'], body: ['x'],
      }));

    const result = await generateAdScript(businessInfo, 'TestBrand', 'Taglish');

    expect(result.hook1).toEqual(['x']);
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(signOutMock).not.toHaveBeenCalled();

    const firstAuth = (fetchMock.mock.calls[0][1] as any).headers.Authorization;
    const secondAuth = (fetchMock.mock.calls[1][1] as any).headers.Authorization;
    expect(firstAuth).toBe('Bearer expired-token');
    expect(secondAuth).toBe('Bearer fresh-token');
  }, 10_000);

  it('on 401 + refresh failure: calls signOut() and rejects with NOT_AUTHENTICATED', async () => {
    getSessionMock.mockResolvedValueOnce({
      data: { session: { access_token: 'expired-token' } },
    });
    refreshSessionMock.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'refresh_token_expired' },
    });
    signOutMock.mockResolvedValueOnce(undefined);
    fetchMock.mockResolvedValueOnce(unauthorized());

    await expect(generateAdScript(businessInfo, 'TestBrand', 'Taglish')).rejects.toThrow(
      'NOT_AUTHENTICATED'
    );
    expect(refreshSessionMock).toHaveBeenCalledTimes(1);
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  }, 10_000);

  it('happy path 200: never attempts refresh', async () => {
    getSessionMock.mockResolvedValueOnce({
      data: { session: { access_token: 'good-token' } },
    });
    fetchMock.mockResolvedValueOnce(okGemini({
      hook1: ['x'], hook2: ['x'], body: ['x'],
    }));

    await generateAdScript(businessInfo, 'TestBrand', 'English');

    expect(refreshSessionMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  }, 10_000);
});
