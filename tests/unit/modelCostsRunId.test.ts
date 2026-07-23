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
