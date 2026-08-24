import { describe, it, expect } from 'vitest';
import { fetchMediaWithRetry } from '../../api/_lib/fetchRetry.js';

/**
 * The rule this encodes (independent of the implementation):
 *
 *  - The clip on the other end of this URL is ALREADY generated and ALREADY billed, so a
 *    status that means "ask again later" must be retried rather than costing us the scene.
 *  - A status that is an ANSWER (403 forbidden, 404 gone) must settle on the first attempt.
 *    Re-asking cannot change it and only burns the serverless function's time budget.
 *  - Backoff is 400ms then 1200ms, so three attempts add at most ~1.6s.
 */

const bodyOf = (text: string) => new TextEncoder().encode(text).buffer as ArrayBuffer;

/** Builds a fake fetch that plays the given responses in order. */
const scriptedFetch = (steps: Array<number | 'throw'>, body = 'MP4BYTES') => {
  const calls: string[] = [];
  const impl = (async (url: string) => {
    calls.push(url);
    const step = steps[calls.length - 1];
    if (step === undefined) throw new Error(`unexpected extra fetch #${calls.length}`);
    if (step === 'throw') throw new Error('socket hang up');
    return {
      ok: step >= 200 && step < 300,
      status: step,
      arrayBuffer: async () => bodyOf(body),
    };
  }) as unknown as typeof fetch;
  return { impl, calls };
};

/** Records the backoff delays without actually waiting. */
const recordingSleep = () => {
  const delays: number[] = [];
  return { delays, sleep: async (ms: number) => { delays.push(ms); } };
};

describe('fetchMediaWithRetry', () => {
  it('recovers the clip when a transient 503 is followed by a 200', async () => {
    const { impl, calls } = scriptedFetch([503, 200]);
    const { sleep } = recordingSleep();

    const result = await fetchMediaWithRetry('https://veo.example/clip.mp4', { fetchImpl: impl, sleep });

    expect(result.ok).toBe(true);
    expect(result.status).toBe(200);
    expect(result.buffer?.toString('utf-8')).toBe('MP4BYTES');
    expect(result.attempts).toBe(2);
    expect(calls).toHaveLength(2);
  });

  it('retries every status that means "ask again later"', async () => {
    for (const transient of [408, 425, 429, 500, 502, 503, 504]) {
      const { impl, calls } = scriptedFetch([transient, 200]);
      const { sleep } = recordingSleep();

      const result = await fetchMediaWithRetry('https://veo.example/clip.mp4', { fetchImpl: impl, sleep });

      expect(result.ok, `status ${transient} should have been retried`).toBe(true);
      expect(calls).toHaveLength(2);
    }
  });

  it('does NOT retry a 404 — that is an answer, not a hiccup', async () => {
    const { impl, calls } = scriptedFetch([404]);
    const { sleep, delays } = recordingSleep();

    const result = await fetchMediaWithRetry('https://veo.example/gone.mp4', { fetchImpl: impl, sleep });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(404);
    expect(result.buffer).toBeNull();
    expect(result.attempts).toBe(1);
    expect(calls).toHaveLength(1);
    expect(delays).toEqual([]);
  });

  it('does NOT retry a 403', async () => {
    const { impl, calls } = scriptedFetch([403]);
    const { sleep } = recordingSleep();

    const result = await fetchMediaWithRetry('https://veo.example/denied.mp4', { fetchImpl: impl, sleep });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
    expect(calls).toHaveLength(1);
  });

  it('gives up after three attempts and reports the last status', async () => {
    const { impl, calls } = scriptedFetch([503, 503, 503]);
    const { sleep } = recordingSleep();

    const result = await fetchMediaWithRetry('https://veo.example/clip.mp4', { fetchImpl: impl, sleep });

    expect(result.ok).toBe(false);
    expect(result.status).toBe(503);
    expect(result.attempts).toBe(3);
    expect(calls).toHaveLength(3);
  });

  it('retries a thrown fetch and reports status 0 when every attempt throws', async () => {
    const recovered = scriptedFetch(['throw', 200]);
    const { sleep } = recordingSleep();
    const ok = await fetchMediaWithRetry('https://veo.example/clip.mp4', {
      fetchImpl: recovered.impl,
      sleep,
    });
    expect(ok.ok).toBe(true);
    expect(ok.attempts).toBe(2);

    const dead = scriptedFetch(['throw', 'throw', 'throw']);
    const failed = await fetchMediaWithRetry('https://veo.example/clip.mp4', {
      fetchImpl: dead.impl,
      sleep,
    });
    expect(failed.ok).toBe(false);
    expect(failed.status).toBe(0);
    expect(failed.attempts).toBe(3);
  });

  it('backs off 400ms then 1200ms, bounding the added latency', async () => {
    const { impl } = scriptedFetch([503, 503, 503]);
    const { sleep, delays } = recordingSleep();

    await fetchMediaWithRetry('https://veo.example/clip.mp4', { fetchImpl: impl, sleep });

    expect(delays).toEqual([400, 1200]);
    expect(delays.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(1600);
  });
});
