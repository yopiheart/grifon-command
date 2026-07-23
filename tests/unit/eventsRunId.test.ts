import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';

// P2: api/events accepts an optional run_id. A VALID value (safe charset) is persisted
// to events.run_id; a GARBAGE value is STRIPPED to null rather than 400-ing the write —
// a bad correlator must never drop an otherwise-valid telemetry event.
//
// Supabase admin + rate-limit are mocked at the module seam so no env is required. The
// real zod body schema + sanitize run.

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

const makeReq = (body: unknown): VercelRequest =>
  ({ method: 'POST', headers: {}, body } as unknown as VercelRequest);

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

describe('api/events run_id', () => {
  it('persists a valid run_id on the insert', async () => {
    const res = makeRes();
    await handler(makeReq({ event: 'node_start', run_id: 'apr_ABC-123', meta: { node: 'script' } }), res);

    expect(res.statusCode).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toMatchObject({ event: 'node_start', run_id: 'apr_ABC-123' });
  });

  it('strips a garbage run_id to null WITHOUT failing the insert', async () => {
    const res = makeRes();
    await handler(makeReq({ event: 'node_done', run_id: 'has spaces & !!', meta: {} }), res);

    expect(res.statusCode).toBe(200);
    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toMatchObject({ event: 'node_done', run_id: null });
  });

  it('strips an over-length run_id (>64 chars) to null', async () => {
    const res = makeRes();
    await handler(makeReq({ event: 'gate_park', run_id: 'a'.repeat(65) }), res);

    expect(res.statusCode).toBe(200);
    expect(insertMock.mock.calls[0][0]).toMatchObject({ run_id: null });
  });

  it('inserts run_id null when the field is absent (back-compat)', async () => {
    const res = makeRes();
    await handler(makeReq({ event: 'PageView' }), res);

    expect(res.statusCode).toBe(200);
    expect(insertMock.mock.calls[0][0]).toMatchObject({ event: 'PageView', run_id: null });
  });
});
