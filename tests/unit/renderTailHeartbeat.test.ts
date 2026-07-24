import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Slice B (watchdog coverage): runRender's upload/sign tail — a multi-MB putMedia plus two
// signing calls — runs AFTER renderFinalVideo returns and BEFORE the terminal 'done' sidecar
// write. Unbeaten, that window can exceed WATCHDOG_STALE_MS (120s) and let
// api/render/final/poll.ts fail a render that is actually succeeding.
//
// Asserted at the STORAGE seam: every sidecar write is a putMedia of the `.status.json` key,
// so the order of writes around the mp4 upload is directly observable. Deterministic — Date.now
// is a manual clock, and there is no ffmpeg, no network, no real timer wait.

const putMediaMock = vi.fn();
const getMediaUrlMock = vi.fn();
const renderFinalVideoMock = vi.fn();

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: vi.fn(async () => ({ id: 'u1' })),
}));
vi.mock('../../api/_lib/rateLimit.js', () => ({ rateLimitCheck: vi.fn(async () => true) }));
vi.mock('../../api/_lib/mediaStore.js', () => ({
  putMedia: (...args: unknown[]) => putMediaMock(...(args as [])),
  getMediaUrl: (...args: unknown[]) => getMediaUrlMock(...(args as [])),
  downloadMediaText: vi.fn(async () => ({ text: null, error: 'not_found' })),
}));
vi.mock('../../api/_lib/renderFfmpeg.js', () => ({
  renderFinalVideo: (...args: unknown[]) => renderFinalVideoMock(...(args as [])),
}));

import handler from '../../api/render/final.js';

const mockReq = () =>
  ({
    method: 'POST',
    headers: { authorization: 'Bearer t' },
    body: {
      scenes: [{ sceneIdx: 0, videoUrl: 'https://cdn.test/a.mp4', targetDurationSec: 5 }],
      aspectRatio: '9:16',
    },
  }) as any;

const mockRes = () => {
  const res: any = { statusCode: 0, body: undefined, headers: {} as Record<string, string> };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
  return res;
};

// Sidecar writes, in call order, with the putMedia call index they landed at.
const statusWrites = () =>
  putMediaMock.mock.calls
    .map((c, i) => ({ i, key: c[0] as string, body: c[1] as Buffer, contentType: c[2] as string }))
    .filter((c) => c.key.endsWith('.status.json'))
    .map((c) => ({ i: c.i, ...(JSON.parse(c.body.toString('utf-8')) as Record<string, unknown>) }));

const mp4UploadIndex = () => putMediaMock.mock.calls.findIndex((c) => c[2] === 'video/mp4');

// runRender is a floating promise (waitUntil only on Vercel). Yield the event loop until a
// terminal sidecar write has been issued — bounded, so a hang fails instead of spinning.
const flushRender = async () => {
  for (let i = 0; i < 50; i++) {
    if (statusWrites().some((w) => w.status === 'done' || w.status === 'failed')) return;
    await new Promise((r) => setTimeout(r, 0));
  }
};

let clock = 1_700_000_000_000;

describe('api/render/final — heartbeat covers the upload/sign tail', () => {
  beforeEach(() => {
    clock = 1_700_000_000_000;
    vi.spyOn(Date, 'now').mockImplementation(() => clock);
    putMediaMock.mockReset().mockImplementation(async () => ({ error: null }));
    getMediaUrlMock.mockReset().mockImplementation(async () => ({ url: 'https://cdn.test/signed', error: null }));
    renderFinalVideoMock.mockReset().mockImplementation(async (...args: unknown[]) => {
      // The real pipeline beats at its last boundary ('audio master') right before returning,
      // so the tail starts with the throttle window freshly spent — the worst case.
      (args[6] as (label: string) => void)('audio master');
      return { buffer: Buffer.from('mp4-bytes'), sizeBytes: 9 };
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('a slow upload gets a heartbeat before the terminal write (watchdog stays fed)', async () => {
    // 20s inside putMedia — a realistic multi-MB upload, and past the 15s beat throttle.
    putMediaMock.mockImplementation(async (_k: string, _b: Buffer, contentType: string) => {
      if (contentType === 'video/mp4') clock += 20_000;
      return { error: null };
    });

    const res = mockRes();
    await handler(mockReq(), res);
    expect(res.statusCode).toBe(202);
    await flushRender();

    const writes = statusWrites();
    const done = writes.at(-1)!;
    expect(done).toMatchObject({ status: 'done' });

    // The point of the slice: a 'processing' beat lands BETWEEN the mp4 upload and the
    // terminal write, so a poll during the tail sees a fresh sidecar instead of a stale one.
    const tailBeats = writes.filter((w) => w.status === 'processing' && w.i > mp4UploadIndex() && w.i < done.i);
    expect(tailBeats.length).toBeGreaterThan(0);
  });

  it('the terminal done write is always the last sidecar write', async () => {
    const res = mockRes();
    await handler(mockReq(), res);
    await flushRender();

    const writes = statusWrites();
    expect(writes.at(-1)).toMatchObject({ status: 'done' });
    expect(writes.filter((w) => w.status === 'done')).toHaveLength(1);
  });

  it('a fast tail writes no extra beats (the 15s throttle still bounds write amplification)', async () => {
    // Clock never advances → both tail beats fall inside the throttle window.
    const res = mockRes();
    await handler(mockReq(), res);
    await flushRender();

    const writes = statusWrites();
    const done = writes.at(-1)!;
    expect(done).toMatchObject({ status: 'done' });
    expect(writes.filter((w) => w.status === 'processing' && w.i > mp4UploadIndex() && w.i < done.i)).toHaveLength(0);
  });
});
