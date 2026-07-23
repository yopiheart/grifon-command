import { describe, it, expect, vi, beforeEach } from 'vitest';

const rpcMock = vi.fn();

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getSupabaseAdmin: () => ({ rpc: rpcMock }),
}));

const { rateLimitCheck } = await import('../../api/_lib/rateLimit.js');

describe('rateLimitCheck', () => {
  beforeEach(() => {
    rpcMock.mockReset();
  });

  it('returns true when the RPC reports the call is within the window', async () => {
    rpcMock.mockResolvedValueOnce({ data: true, error: null });
    const allowed = await rateLimitCheck('gemini:text:user-1', 30, 60);
    expect(allowed).toBe(true);
    expect(rpcMock).toHaveBeenCalledWith('rate_limit_check', {
      p_key: 'gemini:text:user-1',
      p_limit: 30,
      p_window_seconds: 60,
    });
  });

  it('returns false when the RPC reports the limit is exceeded', async () => {
    rpcMock.mockResolvedValueOnce({ data: false, error: null });
    const allowed = await rateLimitCheck('gemini:image:user-2', 15, 60);
    expect(allowed).toBe(false);
  });

  it('fails OPEN within the backstop cap: returns true when the RPC errors (infra issue should not lock paying users out)', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'connection refused' } });
    const allowed = await rateLimitCheck('checkout:user-3', 10, 60);
    expect(allowed).toBe(true);
  });

  it('backstop (audit #3): on repeated RPC errors, allows up to `limit` per instance then blocks', async () => {
    // Every call errors → each falls through to the in-memory per-instance ceiling.
    rpcMock.mockResolvedValue({ data: null, error: { message: 'supabase down' } });
    const key = 'gemini:video:backstop-user'; // unique key: memoryHits is module-level
    const results: boolean[] = [];
    for (let i = 0; i < 5; i++) {
      results.push(await rateLimitCheck(key, 3, 60));
    }
    // First 3 allowed (within the coarse cap), then blocked — not wide-open.
    expect(results).toEqual([true, true, true, false, false]);
  });

  it('backstop is Supabase-independent: never blocks while the RPC is healthy', async () => {
    // A healthy RPC path must not consume/observe the in-memory backstop.
    rpcMock.mockResolvedValue({ data: true, error: null });
    const key = 'gemini:text:healthy-user';
    for (let i = 0; i < 10; i++) {
      expect(await rateLimitCheck(key, 2, 60)).toBe(true);
    }
  });

  it('treats a non-true RPC response (e.g. null) as rate-limited', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const allowed = await rateLimitCheck('elevenlabs:tts:user-4', 30, 60);
    expect(allowed).toBe(false);
  });
});
