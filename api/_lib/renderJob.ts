import type { FinalRenderStatus } from '../../types.js';
import { putMedia, downloadMediaText } from './mediaStore.js';

// Status tracking for the async final-render job. We use a JSON sidecar object
// in the media store (same idiom as api/gemini/video/poll.ts's .meta.json)
// instead of a new DB table — no migration, and it rides the existing cleanup
// cron's 48h reaping.

export const statusKey = (userId: string, jobId: string) => `${userId}/final/${jobId}.status.json`;
export const finalKey = (userId: string, jobId: string) => `${userId}/final/${jobId}.mp4`;

// Generated music bed — cached per AD, keyed by the render's deterministic seed
// (rotationSeed = hash of sorted scene videoUrls) + style. The same ad re-renders
// reuse this object (no regen, no extra credits), preserving the "same ad renders
// identically" contract. Stored in the same bucket so the cleanup cron reaps it.
export const musicBedKey = (userId: string, seed: string, style: string) =>
  `${userId}/music/${seed}-${style}.mp3`;

export interface RenderSidecar {
  status: FinalRenderStatus;
  url?: string;
  downloadUrl?: string;
  error?: string;
  updatedAt: string;
  // Heartbeat/watchdog (P1). `startedAt` is stamped once on the initial 'processing'
  // sidecar; `step` names the last pipeline boundary runRender reached. Both are
  // additive + optional — legacy sidecars (written before this field existed) simply
  // lack them, and every existing reader keys off `status` only. `updatedAt` is
  // re-stamped by the render heartbeat so a live job stays fresh past the watchdog.
  startedAt?: string;
  step?: string;
  // Attribution id (= jobId) for the Data-Driven Growth Loop. Surfaced to the
  // user so they can name the Meta ad "grifon-<creativeId>"; meta_insights_pull.py
  // parses it back out to join ad_performance to the creative that made the ad.
  creativeId?: string;
}

// Poll-side render watchdog (P1, render_pipeline §3.10). A render runs via
// `waitUntil`; a crash or Vercel timeout leaves the sidecar 'processing' forever
// until the 48h cron reaps it, with the client polling the whole time. This is the
// deterministic staleness predicate the poll handler uses to convert a dead job into
// a 'failed:watchdog_stalled' sidecar. Poll-driven = no new cron, no new function.
// THE HEARTBEAT CANNOT BE TRUSTED TO ADVANCE (measured 2026-08-27, run apr_34d06c7f).
// renderFinalVideo drives ffmpeg through `spawnSync` (api/_lib/renderFfmpeg.ts), which blocks
// the event loop for the whole render, so the onStep heartbeat's sidecar PUT can never leave the
// process while ffmpeg is working. `updatedAt` therefore sits frozen at `startedAt` for the whole
// render, and a 120s gap killed two consecutive live renders at 126s each — while the second was
// 8 seconds from writing a finished 11.3MB MP4. So the gap threshold must exceed the longest a
// render can legally live, which is the FUNCTION's own ceiling: vercel.json pins
// `api/render/final.ts` to maxDuration 300s. Past that Vercel has killed the invocation, so a
// still-'processing' sidecar really is dead. 330s = 300s + slack for the terminal write.
// Lowering this below the maxDuration in vercel.json re-arms the false kill.
// The real fix is a non-blocking ffmpeg; until then these two are deliberately equal.
export const WATCHDOG_STALE_MS = 330_000; // heartbeat gap while processing → stalled
export const WATCHDOG_MAX_AGE_MS = 330_000; // absolute backstop on total job age

/**
 * Pure staleness decision. Returns true ONLY for a 'processing' sidecar that either
 * (a) has an `updatedAt` older than WATCHDOG_STALE_MS, or (b) has any
 * available timestamp showing total job age > 330s (absolute backstop). A legacy
 * 'processing' sidecar with NEITHER timestamp is never killed here (returns false) —
 * we don't guess; the 48h cron still reaps it. done/failed sidecars are never touched.
 */
export function isRenderStalled(sidecar: RenderSidecar, now: number = Date.now()): boolean {
  if (sidecar.status !== 'processing') return false;
  const updatedMs = sidecar.updatedAt ? Date.parse(sidecar.updatedAt) : NaN;
  if (Number.isFinite(updatedMs) && now - updatedMs > WATCHDOG_STALE_MS) return true;
  const startedMs = sidecar.startedAt ? Date.parse(sidecar.startedAt) : NaN;
  const ageAnchor = Number.isFinite(startedMs)
    ? startedMs
    : Number.isFinite(updatedMs)
      ? updatedMs
      : NaN;
  if (Number.isFinite(ageAnchor) && now - ageAnchor > WATCHDOG_MAX_AGE_MS) return true;
  return false;
}

export async function writeSidecar(key: string, body: RenderSidecar): Promise<void> {
  const buf = Buffer.from(JSON.stringify(body), 'utf-8');
  const { error } = await putMedia(key, buf, 'application/json', {
    cacheControl: 'no-store',
    upsert: true,
  });
  if (error) {
    console.error('[renderJob] sidecar write failed:', key, error);
  }
}

export async function readSidecar(key: string): Promise<RenderSidecar | null> {
  const { text, error } = await downloadMediaText(key);
  if (error || !text) return null;
  try {
    return JSON.parse(text) as RenderSidecar;
  } catch {
    return null;
  }
}
