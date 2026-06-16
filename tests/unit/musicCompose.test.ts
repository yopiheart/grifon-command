import { describe, it, expect, vi, beforeEach } from 'vitest';

// Behavioral contract for api/music/compose: ships dark (flag), is a Pro/Business
// perk (free/creator blocked), reuses a cached per-ad bed without generating, and
// soft-fails (502) so the render falls back to the static bed. Mocks every
// external boundary; the quota CONSTANTS (MUSIC_DAILY) run for real so the tier
// gate is exercised authentically.

const isMusicGenEnabledMock = vi.fn();
const getUserFromAccessTokenMock = vi.fn();
const getUserPlanMock = vi.fn();
const rateLimitMock = vi.fn();
const composeMusicMock = vi.fn();
const signedUrlMock = vi.fn();
const uploadMock = vi.fn();

vi.mock('../../api/_lib/voiceConfig.js', () => ({ isMusicGenEnabled: isMusicGenEnabledMock }));
vi.mock('../../api/_lib/userPlan.js', () => ({ getUserPlan: getUserPlanMock }));
vi.mock('../../api/_lib/rateLimit.js', () => ({ rateLimitCheck: rateLimitMock }));
vi.mock('../../api/_lib/elevenlabs.js', () => ({ composeMusic: composeMusicMock }));
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: getUserFromAccessTokenMock,
  getSupabaseAdmin: () => ({
    storage: { from: () => ({ createSignedUrl: signedUrlMock, upload: uploadMock }) },
  }),
}));

const { default: handler } = await import('../../api/music/compose.js');

const mockRes = () => {
  const res: any = { statusCode: 0, body: null, headers: {} };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; return res; };
  return res;
};
const mockReq = (body: any = { style: 'mrbeast', videoUrls: ['https://cdn/a.mp4'], lengthMs: 30000 }) =>
  ({ method: 'POST', headers: { authorization: 'Bearer t' }, body }) as any;

describe('api/music/compose', () => {
  beforeEach(() => {
    isMusicGenEnabledMock.mockReset().mockReturnValue(true);
    getUserFromAccessTokenMock.mockReset().mockResolvedValue({ id: 'user-1' });
    getUserPlanMock.mockReset().mockResolvedValue('pro');
    rateLimitMock.mockReset().mockResolvedValue(true);
    composeMusicMock.mockReset().mockResolvedValue(Buffer.from('fake-mp3'));
    signedUrlMock.mockReset();
    uploadMock.mockReset().mockResolvedValue({ error: null });
  });

  it('ships dark: flag off → 503 and never generates', async () => {
    isMusicGenEnabledMock.mockReturnValue(false);
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(503);
    expect(composeMusicMock).not.toHaveBeenCalled();
  });

  it('is a Pro/Business perk: free plan → 403 and never generates', async () => {
    getUserPlanMock.mockResolvedValue('free');
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(403);
    expect(composeMusicMock).not.toHaveBeenCalled();
  });

  it('cache hit returns the existing bed WITHOUT generating or consuming quota', async () => {
    signedUrlMock.mockResolvedValueOnce({ data: { signedUrl: 'https://signed/cached' }, error: null });
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ bedUrl: 'https://signed/cached', cached: true });
    expect(composeMusicMock).not.toHaveBeenCalled();
    expect(rateLimitMock).not.toHaveBeenCalled(); // no quota burned on a cache hit
  });

  it('cache miss generates, uploads, and returns a fresh signed bed', async () => {
    signedUrlMock
      .mockResolvedValueOnce({ data: null, error: { message: 'not_found' } }) // cache check
      .mockResolvedValueOnce({ data: { signedUrl: 'https://signed/new' }, error: null }); // post-upload
    const res = mockRes();
    await handler(mockReq(), res);
    expect(composeMusicMock).toHaveBeenCalledTimes(1);
    expect(uploadMock).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ bedUrl: 'https://signed/new', cached: false });
  });

  it('soft-fails to 502 when generation throws (render falls back to static bed)', async () => {
    signedUrlMock.mockResolvedValueOnce({ data: null, error: { message: 'not_found' } });
    composeMusicMock.mockRejectedValueOnce(new Error('elevenlabs_down'));
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(502);
  });
});
