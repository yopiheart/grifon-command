import { describe, it, expect, vi, beforeEach } from 'vitest';
import { rotationSeed } from '../../api/_lib/renderPresets.js';

// Behavioral contract for api/music/compose: ships dark (flag), is a Pro/Business
// perk (free/creator blocked), reuses a cached per-ad bed without generating, and
// soft-fails (502) so the render falls back to the static bed. Mocks every
// external boundary; the quota CONSTANTS (MUSIC_DAILY) run for real so the tier
// gate is exercised authentically. Storage goes through the MEDIA_STORE facade
// (api/_lib/mediaStore.js) — the cache check is now an explicit existence list,
// then a sign, because under R2 a presigned URL is minted even for a missing key.

const isMusicGenEnabledMock = vi.fn();
const getUserFromAccessTokenMock = vi.fn();
const getUserPlanMock = vi.fn();
const rateLimitMock = vi.fn();
const composeMusicMock = vi.fn();
const listMediaMock = vi.fn();
const putMediaMock = vi.fn();
const getMediaUrlMock = vi.fn();

vi.mock('../../api/_lib/voiceConfig.js', () => ({ isMusicGenEnabled: isMusicGenEnabledMock }));
vi.mock('../../api/_lib/userPlan.js', () => ({ getUserPlan: getUserPlanMock }));
vi.mock('../../api/_lib/rateLimit.js', () => ({ rateLimitCheck: rateLimitMock }));
vi.mock('../../api/_lib/elevenlabs.js', () => ({ composeMusic: composeMusicMock }));
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: getUserFromAccessTokenMock,
}));
vi.mock('../../api/_lib/mediaStore.js', () => ({
  listMedia: listMediaMock,
  putMedia: putMediaMock,
  getMediaUrl: getMediaUrlMock,
}));

const { default: handler } = await import('../../api/music/compose.js');

// The bed's cache key is derived server-side: `${uid}/music/${seed}-${style}.mp3`
// where seed = rotationSeed(videoUrls). The seed is a `|`-joined list of URL
// paths, so it CONTAINS slashes — the handler's existence check lists everything
// up to the last slash and matches the basename after it. Mirror musicBedKey's
// format and the same basename slice so the cache-hit entry matches exactly.
// (renderJob isn't imported — it pulls in the mocked mediaStore at module load,
// which trips vi.mock hoisting.)
const VIDEO_URLS = ['https://cdn/a.mp4'];
const SEED = rotationSeed(VIDEO_URLS);
const BED_KEY = `user-1/music/${SEED}-mrbeast.mp3`;
const CACHED_BED_FILE = BED_KEY.slice(BED_KEY.lastIndexOf('/') + 1);

const mockRes = () => {
  const res: any = { statusCode: 0, body: null, headers: {} };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; return res; };
  return res;
};
const mockReq = (body: any = { style: 'mrbeast', videoUrls: VIDEO_URLS, lengthMs: 30000 }) =>
  ({ method: 'POST', headers: { authorization: 'Bearer t' }, body }) as any;

describe('api/music/compose', () => {
  beforeEach(() => {
    isMusicGenEnabledMock.mockReset().mockReturnValue(true);
    getUserFromAccessTokenMock.mockReset().mockResolvedValue({ id: 'user-1' });
    getUserPlanMock.mockReset().mockResolvedValue('pro');
    rateLimitMock.mockReset().mockResolvedValue(true);
    composeMusicMock.mockReset().mockResolvedValue(Buffer.from('fake-mp3'));
    listMediaMock.mockReset().mockResolvedValue({ entries: [], error: null }); // default: cache miss
    putMediaMock.mockReset().mockResolvedValue({ error: null });
    getMediaUrlMock.mockReset().mockResolvedValue({ url: 'https://signed/new', error: null });
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
    listMediaMock.mockResolvedValueOnce({
      entries: [{ name: CACHED_BED_FILE, isFolder: false, createdAt: null, size: 1 }],
      error: null,
    });
    getMediaUrlMock.mockResolvedValueOnce({ url: 'https://signed/cached', error: null });
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ bedUrl: 'https://signed/cached', cached: true });
    expect(composeMusicMock).not.toHaveBeenCalled();
    expect(rateLimitMock).not.toHaveBeenCalled(); // no quota burned on a cache hit
  });

  it('cache miss generates, uploads, and returns a fresh signed bed', async () => {
    listMediaMock.mockResolvedValueOnce({ entries: [], error: null }); // miss
    getMediaUrlMock.mockResolvedValueOnce({ url: 'https://signed/new', error: null }); // post-upload
    const res = mockRes();
    await handler(mockReq(), res);
    expect(composeMusicMock).toHaveBeenCalledTimes(1);
    expect(putMediaMock).toHaveBeenCalledTimes(1);
    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({ bedUrl: 'https://signed/new', cached: false });
  });

  it('signs a missing key does NOT count as a cache hit (R2 presign always succeeds)', async () => {
    // Empty list = no object, even though getMediaUrl would still mint a URL.
    listMediaMock.mockResolvedValueOnce({ entries: [], error: null });
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.body?.cached).toBe(false); // generated, not served as a phantom cache hit
    expect(composeMusicMock).toHaveBeenCalledTimes(1);
  });

  it('soft-fails to 502 when generation throws (render falls back to static bed)', async () => {
    listMediaMock.mockResolvedValueOnce({ entries: [], error: null });
    composeMusicMock.mockRejectedValueOnce(new Error('elevenlabs_down'));
    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(502);
  });
});
