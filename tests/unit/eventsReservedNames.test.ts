import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// api/events must refuse SERVER-DERIVED event names. 'cogs' and 'watchdog_kill' are written
// only by api/_lib/runEvents.ts on the service role (which bypasses this handler), so a POST
// carrying either is forged by definition.
//
// Why this matters — the invariant under test is a COST one, not a schema one:
// public.run_cogs sums meta->>'estUsd' across every event='cogs' row grouped by
// (run_id, user_id). Cross-user forgery already trips run_attribution_anomalies, but a caller
// forging 'cogs' against a run they legitimately OWN matches the run owner, raises no alarm,
// and silently inflates that run's cost — breaking "cost is server-derived".
//
// Source of truth for what must still be ACCEPTED is independent of api/events.ts: it is the
// client's own run-event union at services/producerOrchestrator.ts:481. If that union ever
// grows a name this file rejects, the 'accepts' case below fails — which is the point.

const { insertMock, getUserMock, rateLimitMock } = vi.hoisted(() => ({
  insertMock: vi.fn(() => Promise.resolve({ error: null })),
  getUserMock: vi.fn(async () => null),
  rateLimitMock: vi.fn(async () => true),
}));

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: getUserMock,
  getSupabaseAdmin: () => ({ from: () => ({ insert: insertMock }) }),
}));
vi.mock('../../api/_lib/rateLimit.js', () => ({ rateLimitCheck: rateLimitMock }));

import handler from '../../api/events.js';

const makeReq = (body: unknown, headers: Record<string, string> = {}): VercelRequest =>
  ({ method: 'POST', headers, body } as unknown as VercelRequest);

const makeRes = () => {
  const res: any = { statusCode: 0, body: undefined };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: unknown) => { res.body = b; return res; };
  res.setHeader = () => res;
  return res as VercelResponse & { statusCode: number; body: any };
};

beforeEach(() => {
  insertMock.mockReset().mockResolvedValue({ error: null });
  getUserMock.mockReset().mockResolvedValue(null);
  rateLimitMock.mockReset().mockResolvedValue(true);
});

// The client's legitimate producer-run vocabulary — transcribed from
// services/producerOrchestrator.ts:481, NOT from api/events.ts.
const CLIENT_RUN_EVENTS = [
  'node_start',
  'node_done',
  'node_fail',
  'check_fail',
  'check_skip',
  'gate_park',
  'gate_approve',
] as const;

describe('api/events reserved server-only names', () => {
  it.each(['cogs', 'watchdog_kill'])('rejects a client-POSTed %s with 403 and no insert', async (event) => {
    const res = makeRes();
    await handler(makeReq({ event, run_id: 'apr_ABC-123', meta: { estUsd: 999 } }), res);

    expect(res.statusCode).toBe(403);
    expect(res.body).toMatchObject({ error: 'reserved_event' });
    expect(insertMock).not.toHaveBeenCalled();
  });

  it('rejects a forged cogs row even from an AUTHENTICATED caller', async () => {
    // The sharp case: same-user forgery against a run the caller really owns. It matches the
    // run owner, so run_attribution_anomalies stays empty and nothing else would catch it.
    getUserMock.mockResolvedValue({ id: 'user-owns-this-run' } as never);
    const res = makeRes();
    await handler(
      makeReq({ event: 'cogs', run_id: 'apr_ABC-123', meta: { estUsd: 0.01 } }, { authorization: 'Bearer tok' }),
      res,
    );

    expect(res.statusCode).toBe(403);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it.each(CLIENT_RUN_EVENTS)('still accepts the legitimate client event %s', async (event) => {
    const res = makeRes();
    await handler(makeReq({ event, run_id: 'apr_ABC-123', meta: { node: 'scene_images' } }), res);

    expect(res.statusCode).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toMatchObject({ event, run_id: 'apr_ABC-123' });
  });

  it('still accepts ordinary product telemetry', async () => {
    const res = makeRes();
    await handler(makeReq({ event: 'PageView', module: 'landing' }), res);

    expect(res.statusCode).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });

  it('matches reserved names EXACTLY — no prefix/substring over-blocking', async () => {
    // 'cogs_estimate' is not a reserved name; a substring match would wrongly reject it and
    // silently drop a future telemetry stream.
    const res = makeRes();
    await handler(makeReq({ event: 'cogs_estimate' }), res);

    expect(res.statusCode).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);
  });
});
