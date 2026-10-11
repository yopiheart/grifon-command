import type { FinalRenderRequest, FinalRenderResult } from '../types';
import { getSupabase } from './supabaseClient';
import { unknownGenerationOutcome } from './generationTransportError';

// Client coordinator for the async final-render executor (Phase 2). Fires
// api/render/final, then polls api/render/final/poll until done. Deliberately
// uses its own fetch + polling loop (NOT geminiService's proxyCall, which aborts
// at 55s) so a long worst-case render is never killed by the client.

const POLL_INTERVAL_MS = 3_000;
const MAX_POLL_MS = 6 * 60 * 1000; // 6 min ceiling, well past the 300s render budget

const getAccessToken = async (): Promise<string> => {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');
  return token;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Fire the render and resolve the jobId. */
export const startFinalRender = async (req: FinalRenderRequest): Promise<string> => {
  const token = await getAccessToken();
  const res = await fetch('/api/render/final', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(req),
  }).catch(error => { throw unknownGenerationOutcome(error); });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    const error = new Error(`FINAL_RENDER_START_FAILED (${res.status}): ${detail}`);
    throw res.status >= 500 ? unknownGenerationOutcome(error) : error;
  }
  const body = (await res.json().catch(error => { throw unknownGenerationOutcome(error); })) as { jobId?: string } | null;
  const jobId = body?.jobId;
  if (typeof jobId !== 'string' || !jobId.trim()) throw unknownGenerationOutcome(new Error('FINAL_RENDER_NO_JOB_ID'));
  return jobId;
};

/** Poll a render job once. */
export const pollFinalRender = async (jobId: string): Promise<FinalRenderResult> => {
  const token = await getAccessToken();
  const res = await fetch(`/api/render/final/poll?jobId=${encodeURIComponent(jobId)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`FINAL_RENDER_POLL_FAILED (${res.status}): ${detail}`);
  }
  return (await res.json()) as FinalRenderResult;
};

/**
 * Fire-then-poll to completion. Calls onProgress on each poll tick so the UI can
 * show a working state. Resolves with the done/failed result, or throws on
 * timeout / transport failure.
 */
export const renderFinalVideo = async (
  req: FinalRenderRequest,
  onProgress?: (status: 'processing') => void
): Promise<FinalRenderResult> => {
  const jobId = await startFinalRender(req);
  const deadline = Date.now() + MAX_POLL_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    const result = await pollFinalRender(jobId).catch(error => { throw unknownGenerationOutcome(error); });
    if (typeof result?.done !== 'boolean' || (result.done && result.status !== 'failed' && (typeof result.url !== 'string' || !result.url.trim()))) {
      throw unknownGenerationOutcome(new Error('FINAL_RENDER_INCOMPLETE_RESPONSE'));
    }
    if (result.done) return result;
    onProgress?.('processing');
  }
  throw unknownGenerationOutcome(new Error('FINAL_RENDER_TIMEOUT'));
};
