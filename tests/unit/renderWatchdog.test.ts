import { describe, it, expect } from 'vitest';

// P1 poll-side render watchdog: the pure staleness predicate api/render/final/poll.ts
// uses to convert a dead 'processing' job into 'failed:watchdog_stalled'. Encodes the
// spec directly (render_pipeline §3.10), not the implementation: 120s heartbeat gap OR
// 330s absolute age → stalled; live/legacy/terminal sidecars are left alone.

import { isRenderStalled, WATCHDOG_STALE_MS, WATCHDOG_MAX_AGE_MS, type RenderSidecar } from '../../api/_lib/renderJob.js';

const NOW = Date.parse('2026-07-23T12:00:00.000Z');
const iso = (msAgo: number) => new Date(NOW - msAgo).toISOString();

describe('isRenderStalled', () => {
  it('fresh processing job (recent heartbeat) -> not stalled', () => {
    const s: RenderSidecar = { status: 'processing', startedAt: iso(30_000), updatedAt: iso(5_000) };
    expect(isRenderStalled(s, NOW)).toBe(false);
  });

  it('heartbeat 121s stale -> stalled', () => {
    const s: RenderSidecar = { status: 'processing', startedAt: iso(121_000), updatedAt: iso(121_000) };
    expect(isRenderStalled(s, NOW)).toBe(true);
  });

  it('heartbeat exactly at the 120s threshold -> not yet stalled (strictly greater)', () => {
    const s: RenderSidecar = { status: 'processing', startedAt: iso(WATCHDOG_STALE_MS), updatedAt: iso(WATCHDOG_STALE_MS) };
    expect(isRenderStalled(s, NOW)).toBe(false);
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
