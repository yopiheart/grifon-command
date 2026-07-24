import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// P2: the COGS loggers gain an optional runId. When present they ALSO mirror the same
// payload into public.events as a 'cogs' run-event (for run_cogs roll-up); when absent
// they behave exactly as before (console only). The mirror is fully best-effort — a
// throwing logRunEvent must never propagate into the generation request path.
//
// The two server deps are mocked at the module seam so no Supabase env is required.

const { logRunEventMock, getSupabaseAdminMock } = vi.hoisted(() => ({
  logRunEventMock: vi.fn(() => Promise.resolve()),
  getSupabaseAdminMock: vi.fn(() => ({ __admin: true })),
}));

vi.mock('../../api/_lib/runEvents.js', () => ({ logRunEvent: logRunEventMock }));
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({ getSupabaseAdmin: getSupabaseAdminMock }));

import { logModelUsage, logImageUsage, logVideoUsage } from '../../api/_lib/modelCosts.js';

let logSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  logRunEventMock.mockReset().mockImplementation(() => Promise.resolve());
  getSupabaseAdminMock.mockReset().mockImplementation(() => ({ __admin: true }));
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
});
afterEach(() => {
  logSpy.mockRestore();
});

describe('modelCosts — runId threads a cogs run-event', () => {
  it('logModelUsage with a runId mirrors a cogs event carrying the payload (minus tag)', () => {
    logModelUsage(
      'flow:marketmind',
      'gemini-3.1-flash-lite',
      { promptTokenCount: 1000, candidatesTokenCount: 2000 },
      'apr_run123'
    );

    expect(logRunEventMock).toHaveBeenCalledTimes(1);
    const [admin, arg] = logRunEventMock.mock.calls[0] as any[];
    expect(admin).toEqual({ __admin: true });
    expect(arg).toMatchObject({
      runId: 'apr_run123',
      event: 'cogs',
      meta: { kind: 'text', label: 'flow:marketmind', model: 'gemini-3.1-flash-lite' },
    });
    expect(typeof arg.meta.estUsd).toBe('number');
    // The 'tag' field is dropped — the events.event column already records 'cogs'.
    expect(arg.meta).not.toHaveProperty('tag');
    // Console behavior is unchanged (still one cogs line).
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('logImageUsage with a runId mirrors a cogs event', () => {
    logImageUsage('image', 'gemini-3.1-flash-image-preview', 1, 'apr_run123');
    expect(logRunEventMock).toHaveBeenCalledTimes(1);
    const [, arg] = logRunEventMock.mock.calls[0] as any[];
    expect(arg).toMatchObject({ runId: 'apr_run123', event: 'cogs', meta: { kind: 'image' } });
  });

  it('logVideoUsage with a runId mirrors a cogs event', () => {
    logVideoUsage('gemini:video:submit', 'Veo_3.1_Lite', 6, 'apr_run123');
    expect(logRunEventMock).toHaveBeenCalledTimes(1);
    const [, arg] = logRunEventMock.mock.calls[0] as any[];
    expect(arg).toMatchObject({ runId: 'apr_run123', event: 'cogs', meta: { kind: 'video', seconds: 6 } });
  });

  it('does NOT fire a run-event when runId is absent', () => {
    logModelUsage('legacy', 'gemini-3.1-flash-lite', { promptTokenCount: 10, candidatesTokenCount: 10 });
    logImageUsage('image', 'gemini-3.1-flash-image-preview', 1);
    logVideoUsage('omni:fire', 'gemini-omni-flash-preview', 4);
    expect(logRunEventMock).not.toHaveBeenCalled();
    // Console still fired for each (unchanged behavior).
    expect(logSpy).toHaveBeenCalledTimes(3);
  });

  it('a throwing logRunEvent never propagates into the request path', () => {
    logRunEventMock.mockImplementation(() => {
      throw new Error('supabase_down');
    });
    expect(() =>
      logModelUsage('flow:script', 'gemini-3.1-flash-lite', { promptTokenCount: 1 }, 'apr_run123')
    ).not.toThrow();
    // The console cogs line still emitted despite the mirror failing.
    expect(logSpy).toHaveBeenCalledTimes(1);
  });

  it('a throwing getSupabaseAdmin (unconfigured) never propagates', () => {
    getSupabaseAdminMock.mockImplementation(() => {
      throw new Error('SUPABASE_ADMIN_NOT_CONFIGURED');
    });
    expect(() =>
      logModelUsage('flow:script', 'gemini-3.1-flash-lite', { promptTokenCount: 1 }, 'apr_run123')
    ).not.toThrow();
    expect(logRunEventMock).not.toHaveBeenCalled();
  });
});

// Attribution (2026-07-24): x-run-id is client-supplied and NOT ownership-checked, so a
// caller can point it at someone else's run. The defense is the row's user_id — the
// VERIFIED caller — which the roll-up filters on (run_cogs groups by run_id + user_id).
// These assert the id reaches the sink; they never re-derive it from the implementation.
describe('modelCosts — verified userId rides with the cogs run-event', () => {
  it('logModelUsage threads the verified userId into the run-event payload', () => {
    logModelUsage(
      'flow:adscript',
      'gemini-3.1-flash-lite',
      { promptTokenCount: 10, candidatesTokenCount: 20 },
      'apr_run123',
      'user-owner-1'
    );
    expect(logRunEventMock).toHaveBeenCalledTimes(1);
    const [, arg] = logRunEventMock.mock.calls[0] as any[];
    expect(arg).toMatchObject({ userId: 'user-owner-1', runId: 'apr_run123', event: 'cogs' });
  });

  it('logImageUsage threads the verified userId', () => {
    logImageUsage('image', 'gemini-3.1-flash-image-preview', 1, 'apr_run123', 'user-owner-1');
    const [, arg] = logRunEventMock.mock.calls[0] as any[];
    expect(arg).toMatchObject({ userId: 'user-owner-1', runId: 'apr_run123', event: 'cogs' });
  });

  it('logVideoUsage threads the verified userId', () => {
    logVideoUsage('gemini:video:submit', 'Veo_3.1_Lite', 6, 'apr_run123', 'user-owner-1');
    const [, arg] = logRunEventMock.mock.calls[0] as any[];
    expect(arg).toMatchObject({ userId: 'user-owner-1', runId: 'apr_run123', event: 'cogs' });
  });

  it('the userId is never taken from the payload — a different run id keeps its own owner', () => {
    logModelUsage('legacy', 'gemini-3.1-flash-lite', { promptTokenCount: 1 }, 'apr_victim', 'user-attacker');
    const [, arg] = logRunEventMock.mock.calls[0] as any[];
    // The forged run id is still recorded (it is what the client sent) but the row is
    // stamped with the ATTACKER's verified id, so the victim's owner-scoped roll-up
    // excludes it instead of silently absorbing the spend.
    expect(arg.runId).toBe('apr_victim');
    expect(arg.userId).toBe('user-attacker');
  });

  it('omitting the userId still mirrors the event (best-effort contract, no throw)', () => {
    expect(() =>
      logModelUsage('legacy', 'gemini-3.1-flash-lite', { promptTokenCount: 1 }, 'apr_run123')
    ).not.toThrow();
    expect(logRunEventMock).toHaveBeenCalledTimes(1);
    const [, arg] = logRunEventMock.mock.calls[0] as any[];
    expect(arg).toMatchObject({ runId: 'apr_run123', event: 'cogs' });
    expect(arg.userId).toBeUndefined();
  });
});
