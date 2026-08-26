// Download a finished render artifact, retrying the transient failures.
//
// WHY THIS EXISTS
// Veo and Kling both hand back a URL to an already-generated, already-BILLED clip, and both
// pollers used to fetch it exactly once. A single transient 503 from the provider's file
// server therefore threw away a clip we had already paid for: the scene came back
// `flagged: VEO_DOWNLOAD_FAILED` and the only recovery was a re-render at full cost. Two of
// the eight scenes in run apr_fa7cedc3 died that way (2026-08-23).
//
// The retry is deliberately narrow. Only statuses that mean "ask again later" are retried;
// 403 and 404 are answers, not hiccups, and re-asking just burns the function's time budget.
// Three attempts with a 400ms/1200ms backoff adds at most ~1.6s to a poll that already waits
// on a multi-second download, which is well inside the serverless timeout.

/** Statuses that mean "the object may still arrive" — everything else is a verdict. */
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);

export interface FetchMediaResult {
  /** True only when a body was downloaded. */
  ok: boolean;
  /** Last HTTP status seen, or 0 when every attempt threw before responding. */
  status: number;
  /** The downloaded bytes, or null on failure. */
  buffer: Buffer | null;
  /** How many attempts were actually made (1 when the first try settled it). */
  attempts: number;
}

export interface FetchMediaOptions {
  /** Total attempts including the first. Default 3. */
  attempts?: number;
  /** Delay before attempt 2; each later delay triples it. Default 400ms. */
  baseDelayMs?: number;
  /** Injected for tests. */
  fetchImpl?: typeof fetch;
  /** Injected for tests so retries do not really sleep. */
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function fetchMediaWithRetry(
  url: string,
  options: FetchMediaOptions = {}
): Promise<FetchMediaResult> {
  const maxAttempts = Math.max(1, options.attempts ?? 3);
  const baseDelayMs = options.baseDelayMs ?? 400;
  const doFetch = options.fetchImpl ?? fetch;
  const sleep = options.sleep ?? defaultSleep;

  let lastStatus = 0;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let retryable: boolean;

    try {
      const res = await doFetch(url);
      lastStatus = res.status;

      if (res.ok) {
        const arr = await res.arrayBuffer();
        return { ok: true, status: res.status, buffer: Buffer.from(arr), attempts: attempt };
      }

      retryable = TRANSIENT_STATUSES.has(res.status);
    } catch {
      // A thrown fetch is a socket-level failure — always worth one more try.
      lastStatus = 0;
      retryable = true;
    }

    if (!retryable || attempt === maxAttempts) {
      return { ok: false, status: lastStatus, buffer: null, attempts: attempt };
    }

    await sleep(baseDelayMs * Math.pow(3, attempt - 1));
  }

  // Unreachable: the loop always returns on its final attempt.
  return { ok: false, status: lastStatus, buffer: null, attempts: maxAttempts };
}
