import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ user: vi.fn(), rpc: vi.fn(), options: vi.fn(), fetch: vi.fn() }));
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: (...args: unknown[]) => mocks.user(...args),
  getSupabaseAdmin: () => ({ rpc: (...args: unknown[]) => mocks.rpc(...args) }),
}));
vi.mock('@google/genai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@google/genai')>();
  return {
    ...actual,
    GoogleGenAI: class extends actual.GoogleGenAI {
      constructor(options: ConstructorParameters<typeof actual.GoogleGenAI>[0]) {
        mocks.options(options);
        super(options);
      }
    },
  };
});
import { COMPANION_LIVE_MODEL, COMPANION_LIVE_SYSTEM } from '../../api/_lib/companionLiveVoiceConfig.js';

const owner = '11111111-1111-4111-8111-111111111111';
const start = Date.parse('2026-10-17T00:00:00Z');
const testKey = 'fixture-gemini-server-key';
let handler: typeof import('../../api/gemini/live-session.js').default;
const request = () => ({ method: 'POST', body: {}, headers: { authorization: 'Bearer fixture-access-token' } } as any);
function response() {
  const res: any = { statusCode: 0, body: null, headers: {} };
  res.setHeader = (name: string, value: string) => { res.headers[name] = value; return res; };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (body: unknown) => { res.body = body; return res; };
  return res;
}

beforeEach(async () => {
  vi.useFakeTimers(); vi.setSystemTime(start); vi.clearAllMocks();
  vi.stubEnv('GEMINI_API_KEY', testKey);
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.user.mockResolvedValue({ id: owner, email: null });
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.fetch.mockResolvedValue(new Response(JSON.stringify({ name: 'auth_tokens/fixture-credential' }), { status: 200 }));
  vi.resetModules();
  ({ default: handler } = await import('../../api/gemini/live-session.js'));
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('Companion Live server SDK mint boundary', () => {
  it('serializes the exact approved setup with a single-use constrained v1beta token', async () => {
    const res = response(); await handler(request(), res);
    expect(res.statusCode).toBe(200);
    expect(mocks.fetch).toHaveBeenCalledOnce();
    const [url, init] = mocks.fetch.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/auth_tokens');
    expect(init.method).toBe('POST');
    expect(new Headers(init.headers).get('x-goog-api-key')).toBe(testKey);
    expect(init.signal).toBeInstanceOf(AbortSignal);
    const body = JSON.parse(init.body);
    expect(body.uses).toBe(1);
    expect(body.expireTime).toBe(new Date(start + 300_000).toISOString());
    expect(body.newSessionExpireTime).toBe(new Date(start + 60_000).toISOString());
    expect(body).not.toHaveProperty('fieldMask');
    expect(body).toEqual({
      uses: 1,
      expireTime: new Date(start + 300_000).toISOString(),
      newSessionExpireTime: new Date(start + 60_000).toISOString(),
      bidiGenerateContentSetup: {
        model: COMPANION_LIVE_MODEL,
        generationConfig: {
          responseModalities: ['AUDIO'], maxOutputTokens: 512,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } },
        },
        systemInstruction: { role: 'user', parts: [{ text: COMPANION_LIVE_SYSTEM }] },
        inputAudioTranscription: {}, outputAudioTranscription: {}, tools: [],
      },
    });
    const instruction = body.bidiGenerateContentSetup.systemInstruction.parts.map((part: { text: string }) => part.text).join('');
    expect(Buffer.byteLength(instruction, 'utf8')).toBe(1490);
    expect(createHash('sha256').update(instruction).digest('hex')).toBe('3fc2f084a0bd8105232222c588711cd486d680c15dec600b25ed0f92557935c3');
    expect(instruction).toBe(COMPANION_LIVE_SYSTEM);
    expect(res.body).toEqual({ credential: 'auth_tokens/fixture-credential', model: COMPANION_LIVE_MODEL, expiresAt: start + 300_000 });
    expect(Object.keys(res.body).sort()).toEqual(['credential', 'expiresAt', 'model']);
    expect(mocks.options).toHaveBeenCalledExactlyOnceWith({
      apiKey: testKey, httpOptions: { apiVersion: 'v1beta', timeout: 15_000, retryOptions: { attempts: 1 } },
    });
    expect(mocks.rpc.mock.calls).toEqual([
      ['rate_limit_check', { p_key: `companion:live:burst:${owner}`, p_limit: 3, p_window_seconds: 60 }],
      ['rate_limit_check', { p_key: `companion:live:lease:${owner}`, p_limit: 1, p_window_seconds: 330 }],
      ['rate_limit_check', { p_key: `companion:live:daily:${owner}`, p_limit: 3, p_window_seconds: 86_400 }],
      ['rate_limit_check', { p_key: 'companion:live:daily:global', p_limit: 30, p_window_seconds: 86_400 }],
    ]);
    expect(mocks.user.mock.invocationCallOrder[0]).toBeLessThan(mocks.rpc.mock.invocationCallOrder[0]);
    expect(mocks.rpc.mock.invocationCallOrder[3]).toBeLessThan(mocks.options.mock.invocationCallOrder[0]);
    expect(init.signal.aborted).toBe(true);
  });

  it('loads without constructing a provider client and refuses failed auth before minting', async () => {
    expect(mocks.options).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
    vi.stubEnv('GEMINI_API_KEY', undefined);
    mocks.user.mockResolvedValueOnce(null);
    const res = response(); await handler(request(), res);
    expect(res.statusCode).toBe(401); expect(res.body).toEqual({ error: 'unauthorized' });
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.options).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('never constructs a client when a durable claim fails', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: true, error: { message: 'fixture-infrastructure-secret' } });
    const res = response(); await handler(request(), res);
    expect(res.statusCode).toBe(503); expect(res.body).toEqual({ error: 'live_voice_unavailable' });
    expect(mocks.options).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it('does not substitute another environment key when its server key is absent', async () => {
    vi.stubEnv('GEMINI_API_KEY', undefined);
    vi.stubEnv('GOOGLE_API_KEY', 'fixture-forbidden-fallback-key');
    const res = response(); await handler(request(), res);
    expect(res.statusCode).toBe(502); expect(res.body).toEqual({ error: 'live_voice_provider_error' });
    expect(mocks.rpc).toHaveBeenCalledTimes(4); expect(mocks.options).not.toHaveBeenCalled(); expect(mocks.fetch).not.toHaveBeenCalled();
  });

  it.each([429, 500, 503])('makes only one SDK HTTP attempt after status %s and returns no upstream details', async (status) => {
    mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'fixture-upstream-secret' } }), { status }));
    const res = response(); await handler(request(), res); await vi.advanceTimersByTimeAsync(60_000);
    expect(res.statusCode).toBe(502); expect(res.body).toEqual({ error: 'live_voice_provider_error' });
    expect(mocks.options).toHaveBeenCalledOnce(); expect(mocks.fetch).toHaveBeenCalledOnce();
    expect(JSON.stringify(res.body)).not.toContain(testKey); expect(JSON.stringify(res.body)).not.toContain(COMPANION_LIVE_SYSTEM);
    expect(mocks.rpc).toHaveBeenCalledTimes(4);
  });

  it('makes only one SDK attempt after a network error with unknown outcome', async () => {
    mocks.fetch.mockRejectedValueOnce(new Error('fixture-upstream-secret'));
    const res = response(); await handler(request(), res); await vi.advanceTimersByTimeAsync(60_000);
    expect(res.statusCode).toBe(502); expect(res.body).toEqual({ error: 'live_voice_provider_error' });
    expect(mocks.fetch).toHaveBeenCalledOnce(); expect(mocks.rpc).toHaveBeenCalledTimes(4);
  });

  it('passes cancellation through the actual SDK and bounds a hung mint at fifteen seconds', async () => {
    mocks.fetch.mockImplementationOnce((_url: unknown, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal!.addEventListener('abort', () => reject(new DOMException('Fixture cancelled', 'AbortError')), { once: true });
    }));
    const res = response(), pending = handler(request(), res);
    await vi.advanceTimersByTimeAsync(14_999);
    expect(res.statusCode).toBe(0); expect(mocks.fetch).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(2); await pending;
    expect(res.statusCode).toBe(503); expect(res.body).toEqual({ error: 'live_voice_timeout' });
    expect(mocks.fetch.mock.calls[0][1].signal.aborted).toBe(true);
    await vi.advanceTimersByTimeAsync(60_000); expect(mocks.fetch).toHaveBeenCalledOnce();
  });

  it('uses the original anchor after slow claims rather than extending provider token deadlines', async () => {
    mocks.rpc.mockImplementation(async () => { vi.setSystemTime(Date.now() + 1_000); return { data: true, error: null }; });
    const res = response(); await handler(request(), res);
    const body = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(body.expireTime).toBe(new Date(start + 300_000).toISOString());
    expect(body.newSessionExpireTime).toBe(new Date(start + 60_000).toISOString());
    expect(res.body.expiresAt).toBe(start + 300_000);
  });
});
