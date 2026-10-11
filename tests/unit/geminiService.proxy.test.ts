import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

// generateAdScript runs in flow mode: api/gemini/text.ts executes the
// server-side prompt + parser and returns the parsed Script as the body.
const okFlow = (payload: unknown) => ({
  ok: true,
  status: 200,
  json: async () => payload,
});

const unauthorized = () => ({
  ok: false,
  status: 401,
  json: async () => ({ error: 'unauthorized' }),
});

const { generateAdScript, generateMarketResearch, generateStoryboard, generateSceneImage, generateThumbnail, generateVideoPrompts, generateEditDecisionList } = await import('../../services/geminiService');

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
afterEach(() => vi.useRealTimers());

describe('ambiguous generation dispatch outcomes', () => {
  it.each([
    { status: 422, error: 'flow_output_invalid' },
    { status: 429, error: 'gemini_quota' },
  ])('does not replay a post-provider $status $error flow failure', async ({ status, error }) => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockResolvedValue({ ok: false, status, json: async () => ({ error, retry_after_seconds: 1 }) });
    const result = generateAdScript(businessInfo, 'Fixture', 'English').catch(failure => failure);
    await vi.runAllTimersAsync();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await result).toMatchObject({ status, generationOutcomeUnknown: true });
  });
  it.each(['adscript', 'marketmind', 'storyboard'])('rejects a missing %s flow result without paid replay', async flow => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockResolvedValue(okFlow({}));
    const result = (flow === 'adscript' ? generateAdScript(businessInfo, 'Fixture', 'English')
      : flow === 'marketmind' ? generateMarketResearch({ brandName: 'Fixture', productName: 'Coffee', productDescription: 'Fixture' } as any)
        : generateStoryboard(['Fixture'], 'Fixture presenter', businessInfo, 'Global', 'English')).catch(error => error);
    await vi.runAllTimersAsync();
    expect(await result).toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(['not JSON', '{}', '[]'])('keeps an unusable shot-planning result unresolved: %s', async text => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockResolvedValue(okFlow({ text }));
    const result = generateVideoPrompts([{ scriptLine: 'Fixture', sceneDescription: 'Fixture' }], businessInfo).catch(error => error);
    await vi.runAllTimersAsync();
    expect(await result).toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each(['not JSON', '{}'])('keeps a malformed edit decision unresolved: %s', async text => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockResolvedValue(okFlow({ text }));
    const result = generateEditDecisionList({ finalScript: 'Fixture', sceneBatch: [], audioOverlays: [], aspectRatio: '9:16', targetPlatform: 'tiktok' } as any).catch(error => error);
    await vi.runAllTimersAsync();
    expect(await result).toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it.each([{}, null, { candidates: [{ content: { parts: {} } }] }, { candidates: [{ content: { parts: [{ inlineData: { mimeType: 'image/png' } }] } }] }])('keeps a valid JSON image response without an image unresolved: %j', async payload => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockResolvedValue(okFlow(payload));
    const result = generateSceneImage('Fixture image', '9:16', '1K').catch(error => error);
    await vi.runAllTimersAsync();
    expect(await result).toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('keeps a missing cover frame unresolved rather than asking the outer stage to replay it', async () => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockResolvedValue(okFlow({}));
    const result = generateThumbnail(['Fixture'], 'Fixture presenter', businessInfo, '9:16', '', '1K').catch(error => error);
    await vi.runAllTimersAsync();
    expect(await result).toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  for (const status of [503, 504]) it(`does not replay an ambiguous HTTP ${status} generation POST`, async () => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockResolvedValueOnce({ ok: false, status, json: async () => ({ error: 'upstream_failed' }) }).mockResolvedValue(okFlow({ hook1: ['second paid call'] }));
    const result = generateAdScript(businessInfo, 'Fixture', 'English').catch(error => error);
    await vi.runAllTimersAsync();
    expect(await result).toMatchObject({ status, generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('marks the 55-second abort as unresolved without repeating POST', async () => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockImplementation((_url, options) => new Promise((_resolve, reject) => options.signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))));
    const result = generateAdScript(businessInfo, 'Fixture', 'English').catch(error => error);
    await vi.runAllTimersAsync();
    expect(await result).toMatchObject({ status: 504, generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('marks a lost connection after dispatch as unresolved', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    await expect(generateAdScript(businessInfo, 'Fixture', 'English')).rejects.toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('retains an unreadable successful response as an unknown paid outcome', async () => {
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockResolvedValue({ ok: true, status: 200, json: async () => { throw new SyntaxError('Incomplete response'); } });
    await expect(generateAdScript(businessInfo, 'Fixture', 'English')).rejects.toMatchObject({ generationOutcomeUnknown: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('still retries an explicit quota-unavailable rejection before provider dispatch', async () => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({ error: 'quota_unavailable' }) }).mockResolvedValueOnce(okFlow({ hook1: ['ready'], hook2: ['ready'], body: ['ready'] }));
    const result = generateAdScript(businessInfo, 'Fixture', 'English');
    await vi.runAllTimersAsync();
    expect(await result).toMatchObject({ hook1: ['ready'] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
  it('still retries a confirmed pre-dispatch rate-limit rejection', async () => {
    vi.useFakeTimers();
    getSessionMock.mockResolvedValue({ data: { session: { access_token: 'fixture-token' } } });
    fetchMock.mockResolvedValueOnce({ ok: false, status: 429, json: async () => ({ error: 'rate_limited' }) }).mockResolvedValueOnce(okFlow({ hook1: ['ready'], hook2: ['ready'], body: ['ready'] }));
    const result = generateAdScript(businessInfo, 'Fixture', 'English');
    await vi.runAllTimersAsync();
    expect(await result).toMatchObject({ hook1: ['ready'] });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
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
      .mockResolvedValueOnce(okFlow({
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
    fetchMock.mockResolvedValueOnce(okFlow({
      hook1: ['x'], hook2: ['x'], body: ['x'],
    }));

    await generateAdScript(businessInfo, 'TestBrand', 'English');

    expect(refreshSessionMock).not.toHaveBeenCalled();
    expect(signOutMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  }, 10_000);
});
