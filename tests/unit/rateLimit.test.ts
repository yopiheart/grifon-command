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

  it('fails OPEN: returns true when the RPC errors (infra issue should not lock paying users out)', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: { message: 'connection refused' } });
    const allowed = await rateLimitCheck('checkout:user-3', 10, 60);
    expect(allowed).toBe(true);
  });

  it('treats a non-true RPC response (e.g. null) as rate-limited', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: null });
    const allowed = await rateLimitCheck('elevenlabs:tts:user-4', 30, 60);
    expect(allowed).toBe(false);
  });
});
