/**
 * The Veo artifact download in api/gemini/video/poll.ts.
 *
 * The clip is already generated and BILLED before this fetch runs, so a transient failure here
 * throws away something the customer paid for. Two 503s once flagged two scenes permanently.
 * These tests encode the policy, not the implementation: what gets retried, what must not be,
 * and what the caller is told when it finally gives up.
 *
 * `fetch` and `sleep` are injected, so nothing here touches the network or a real timer.
 */
import { describe, it, expect, vi } from 'vitest';

// The module pulls in the handler's _lib imports at load time. They are lazily initialised, but
// stub them anyway so this test never depends on Supabase or storage config being present.
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({ getUserFromAccessToken: vi.fn() }));
vi.mock('../../api/_lib/rateLimit.js', () => ({ rateLimitCheck: vi.fn() }));
vi.mock('../../api/_lib/mediaStore.js', () => ({ putMedia: vi.fn(), getMediaUrl: vi.fn() }));
vi.mock('../../api/_lib/videoPoster.js', () => ({ extractPosterFromMp4: vi.fn() }));

import { downloadVeoVideo, VEO_DOWNLOAD_ATTEMPTS } from '../../api/gemini/video/poll.js';

const PAYLOAD = 'the finished clip';

/** A Response-shaped stub carrying just what downloadVeoVideo reads. */
const reply = (status: number) => ({
  ok: status >= 200 && status < 300,
  status,
  arrayBuffer: async () => new TextEncoder().encode(PAYLOAD).buffer,
});

/** Queues one outcome per attempt. A number is an HTTP status; an Error is a network throw. */
function stubFetch(...outcomes: (number | Error)[]) {
  const calls: string[] = [];
  const impl = vi.fn(async (url: string) => {
    calls.push(url);
    const next = outcomes[calls.length - 1] ?? outcomes[outcomes.length - 1];
    if (next instanceof Error) throw next;
    return reply(next);
  });
  return { impl: impl as unknown as typeof fetch, calls, spy: impl };
}

const noSleep = vi.fn(async () => {});

describe('downloadVeoVideo', () => {
  it('returns the bytes without retrying when the first attempt succeeds', async () => {
    const f = stubFetch(200);
    const sleep = vi.fn(async () => {});

    const res = await downloadVeoVideo('https://veo/clip.mp4', f.impl, sleep);

    expect(res).toMatchObject({ ok: true });
    if (res.ok) expect(res.buffer.toString('utf8')).toBe(PAYLOAD);
    expect(f.spy).toHaveBeenCalledTimes(1);
    expect(sleep).not.toHaveBeenCalled(); // no backoff on a clean path
  });

  it('recovers a paid clip from a transient 503', async () => {
    // The exact failure that flagged two scenes on an already-billed run.
    const f = stubFetch(503, 200);

    const res = await downloadVeoVideo('https://veo/clip.mp4', f.impl, noSleep);

    expect(res.ok).toBe(true);
    expect(f.spy).toHaveBeenCalledTimes(2);
  });

  it('retries a 429, which is a rate limit and not a verdict', async () => {
    const f = stubFetch(429, 429, 200);

    const res = await downloadVeoVideo('https://veo/clip.mp4', f.impl, noSleep);

    expect(res.ok).toBe(true);
    expect(f.spy).toHaveBeenCalledTimes(3);
  });

  it('recovers from a network throw, which carries no status at all', async () => {
    const f = stubFetch(new Error('ECONNRESET'), 200);

    const res = await downloadVeoVideo('https://veo/clip.mp4', f.impl, noSleep);

    expect(res.ok).toBe(true);
    expect(f.spy).toHaveBeenCalledTimes(2);
  });

  it('gives up after the attempt budget and reports the last status', async () => {
    const f = stubFetch(503, 503, 503, 503);

    const res = await downloadVeoVideo('https://veo/clip.mp4', f.impl, noSleep);

    expect(res).toEqual({ ok: false, status: 503 });
    expect(f.spy).toHaveBeenCalledTimes(VEO_DOWNLOAD_ATTEMPTS);
  });

  it('reports status 0 when no HTTP reply ever arrived', async () => {
    // 0 is not a status the host sent — it means the request never landed. The caller
    // surfaces it as veo_download_failed status 0, same as before the retry existed.
    const f = stubFetch(new Error('ENOTFOUND'));

    const res = await downloadVeoVideo('https://veo/clip.mp4', f.impl, noSleep);

    expect(res).toEqual({ ok: false, status: 0 });
    expect(f.spy).toHaveBeenCalledTimes(VEO_DOWNLOAD_ATTEMPTS);
  });

  it('does NOT retry a 404 — an expired URI cannot be re-asked into existence', async () => {
    // The point of testing retriability POSITIVELY. Under a `!ok` rule this would burn all
    // three attempts plus two backoffs out of a 60s budget to learn what attempt 1 established.
    const f = stubFetch(404);

    const res = await downloadVeoVideo('https://veo/clip.mp4', f.impl, noSleep);

    expect(res).toEqual({ ok: false, status: 404 });
    expect(f.spy).toHaveBeenCalledTimes(1);
  });

  it('does NOT retry a 403, the shape a bad or missing key takes', async () => {
    const f = stubFetch(403);

    const res = await downloadVeoVideo('https://veo/clip.mp4', f.impl, noSleep);

    expect(res).toEqual({ ok: false, status: 403 });
    expect(f.spy).toHaveBeenCalledTimes(1);
  });

  it('backs off BETWEEN attempts and never after the last one', async () => {
    // Sleeping after the final failure would add dead latency to a request that is already
    // returning 502, inside a function with a 60s ceiling.
    const f = stubFetch(500, 500, 500);
    const sleep = vi.fn(async () => {});

    await downloadVeoVideo('https://veo/clip.mp4', f.impl, sleep);

    expect(sleep).toHaveBeenCalledTimes(VEO_DOWNLOAD_ATTEMPTS - 1);
    const waits = sleep.mock.calls.map((c) => c[0] as unknown as number);
    expect(waits[1]).toBeGreaterThan(waits[0]); // increasing, so a longer blip still clears
    expect(Math.max(...waits)).toBeLessThan(5_000); // and bounded well inside the budget
  });

  it('passes the signed download URL through untouched', async () => {
    // The key rides in the query string; mangling it would turn a 503 into a 403.
    const url = 'https://veo.example/clip.mp4?alt=media&key=SECRET-123';
    const f = stubFetch(200);

    await downloadVeoVideo(url, f.impl, noSleep);

    expect(f.calls).toEqual([url]);
  });
});
