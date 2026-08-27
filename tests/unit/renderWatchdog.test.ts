import { describe, it, expect } from 'vitest';

// P1 poll-side render watchdog: the pure staleness predicate api/render/final/poll.ts
// uses to convert a dead 'processing' job into 'failed:watchdog_stalled'. Encodes the
// spec directly (render_pipeline §3.10), not the implementation: a heartbeat gap past
// WATCHDOG_STALE_MS OR an age past WATCHDOG_MAX_AGE_MS → stalled; live/legacy/terminal
// sidecars are left alone. Both thresholds must stay above the 300s maxDuration that
// vercel.json pins for api/render/final.ts — see the note on the constants.

import { isRenderStalled, WATCHDOG_STALE_MS, WATCHDOG_MAX_AGE_MS, type RenderSidecar } from '../../api/_lib/renderJob.js';

const NOW = Date.parse('2026-07-23T12:00:00.000Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe('isRenderStalled', () => {
  it('fresh processing job (recent heartbeat) -> not stalled', () => {
    const s: RenderSidecar = { status: 'processing', startedAt: iso(30_000), updatedAt: iso(5_000) };
    expect(isRenderStalled(s, NOW)).toBe(false);
  });

  it('heartbeat one second past the threshold -> stalled', () => {
    const s: RenderSidecar = { status: 'processing', startedAt: iso(WATCHDOG_STALE_MS + 1_000), updatedAt: iso(WATCHDOG_STALE_MS + 1_000) };
    expect(isRenderStalled(s, NOW)).toBe(true);
  });

  it('heartbeat exactly at the threshold -> not yet stalled (strictly greater)', () => {
    const s: RenderSidecar = { status: 'processing', startedAt: iso(WATCHDOG_STALE_MS), updatedAt: iso(WATCHDOG_STALE_MS) };
    expect(isRenderStalled(s, NOW)).toBe(false);
  });

  // Regression, run apr_34d06c7f (2026-08-27). ffmpeg runs under spawnSync, which blocks the
  // event loop, so the heartbeat's PUT never leaves the process and `updatedAt` stays pinned to
  // `startedAt` for the WHOLE render. A live 134s render was killed twice at ~126s while 8
  // seconds from writing a finished 11.3MB MP4. The threshold must clear the function's own
  // maxDuration (300s in vercel.json), so no render Vercel is still willing to run reads as dead.
  it('a live 134s render with a frozen heartbeat is NOT stalled', () => {
    const s: RenderSidecar = { status: 'processing', startedAt: iso(134_000), updatedAt: iso(134_000) };
    expect(isRenderStalled(s, NOW)).toBe(false);
  });

  it('the threshold clears the 300s maxDuration pinned for api/render/final.ts', () => {
    expect(WATCHDOG_STALE_MS).toBeGreaterThan(300_000);
    expect(WATCHDOG_MAX_AGE_MS).toBeGreaterThan(300_000);
  });

  it('job age past the 330s backstop despite a fresh heartbeat -> stalled', () => {
    const s: RenderSidecar = { status: 'processing', startedAt: iso(WATCHDOG_MAX_AGE_MS + 1_000), updatedAt: iso(2_000) };
    expect(isRenderStalled(s, NOW)).toBe(true);
  });

  it('legacy processing sidecar with NEITHER timestamp -> not stalled (never guess)', () => {
    const s = { status: 'processing' } as unknown as RenderSidecar;
    expect(isRenderStalled(s, NOW)).toBe(false);
  });

  it('done sidecar is never touched, even if timestamps are ancient', () => {
    const s: RenderSidecar = { status: 'done', startedAt: iso(999_000), updatedAt: iso(999_000), url: 'x' };
    expect(isRenderStalled(s, NOW)).toBe(false);
  });

  it('failed sidecar is never touched', () => {
    const s: RenderSidecar = { status: 'failed', updatedAt: iso(999_000), error: 'boom' };
    expect(isRenderStalled(s, NOW)).toBe(false);
  });
});
