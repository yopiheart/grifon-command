import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { VercelRequest, VercelResponse } from '@vercel/node';
const { insert, track } = vi.hoisted(() => ({ insert: vi.fn(async () => ({ error: null })), track: vi.fn(async () => {}) }));
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: async () => null,
  getSupabaseAdmin: () => ({ from: () => ({ insert }) }),
}));
vi.mock('../../api/_lib/rateLimit.js', () => ({ rateLimitCheck: async () => true }));
vi.mock('../../services/analyticsService.js', () => ({ trackEvent: track }));
import handler from '../../api/events.js';
import { createProductionRun, runProduction, type ProductionInput, type ProducerDeps } from '../../services/producerOrchestrator.js';

const PRIVATE = 'PRIVATE_BRIEF_AND_CREDENTIAL_FIXTURE';
beforeEach(() => { insert.mockClear(); track.mockClear(); });

describe('producer monitoring privacy', () => {
  it('strips free text before the event sink stores producer events', async () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
    await handler({ method: 'POST', headers: {}, body: {
      event: 'node_fail', run_id: 'apr_123', meta: {
        node: 'video', status: 503, attempt: 2, degraded: true,
        error: PRIVATE, detail: PRIVATE, flags: [PRIVATE], brief: PRIVATE, reason: PRIVATE,
      },
    } } as VercelRequest, res as unknown as VercelResponse);
    expect(insert.mock.calls[0][0].meta).toEqual({ node: 'video', status: 503, attempt: 2, degraded: true });
    expect(JSON.stringify(insert.mock.calls)).not.toContain(PRIVATE);
  });

  it('strips raw provider text before leaving the browser', async () => {
    const input = { brandName: 'Fixture', offer: '', price: '', productName: 'Fixture', productDescription: PRIVATE, heroImageBase64: '', avatar: { url: '' }, voiceId: '', language: 'English', aspectRatio: '9:16', scriptType: 'ugc' } as ProductionInput;
    const deps = { now: () => 1, persist: async () => {}, run: {}, generateMarketResearch: async () => { throw new Error(PRIVATE); } } as unknown as ProducerDeps;
    await runProduction(createProductionRun(input, 'u1'), { userId: 'u1', onUpdate: () => {}, signal: new AbortController().signal }, deps);
    expect(track.mock.calls.some(([e]) => e.event === 'node_fail')).toBe(true);
    expect(JSON.stringify(track.mock.calls)).not.toContain(PRIVATE);
  });

  it('keeps ordinary analytics metadata unchanged', async () => {
    const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
    await handler({ method: 'POST', headers: {}, body: { event: 'PageView', meta: { source: 'landing' } } } as VercelRequest, res as unknown as VercelResponse);
    expect(insert.mock.calls[0][0].meta).toEqual({ source: 'landing' });
  });
});
