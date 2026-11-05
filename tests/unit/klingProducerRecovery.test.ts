import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { db, upstream, meter } = vi.hoisted(() => ({
  db: { owner: 'user-1', attempt: 2, status: 'submitting', jobHandle: null as unknown },
  upstream: vi.fn(),
  meter: vi.fn(),
}));

vi.mock('../../api/_lib/supabaseAdmin.js', () => ({
  getUserFromAccessToken: async (token: string) => ({ id: token }),
  getSupabaseAdmin: () => ({
    from(table: string) {
      const row = table === 'producer_runs'
        ? { run_id: 'test-run-01', user_id: db.owner }
        : { run_id: 'test-run-01', scene_idx: 0, attempts: db.attempt, status: db.status, job_handle: db.jobHandle };
      const predicates: [string, unknown][] = [];
      return {
        select() { return this; },
        eq(key: string, value: unknown) { predicates.push([key, value]); return this; },
        is(key: string, value: unknown) { predicates.push([key, value]); return this; },
        async maybeSingle() {
          const matches = predicates.every(([key, value]) => row[key as keyof typeof row] === value);
          return { data: matches ? row : null, error: null };
        },
      };
    },
  }),
}));
vi.mock('../../api/_lib/rateLimit.js', () => ({ rateLimitCheck: async () => true }));
vi.mock('../../api/_lib/userPlan.js', () => ({ getUserPlan: async () => 'business' }));
vi.mock('../../api/_lib/quota.js', () => ({ meterVideoRequest: meter }));
vi.mock('../../api/_lib/modelCosts.js', () => ({ logVideoUsage: vi.fn() }));
vi.mock('../../api/_lib/klingAuth.js', () => ({
  getKlingAccessToken: () => 'fixture-provider-token',
  invalidateKlingAccessToken: vi.fn(),
  KLING_API_BASE: 'https://fixture.invalid',
}));

import submit from '../../api/kling/video.js';
import advance from '../../api/producer/advance.js';

const externalId = '3e1f00d798e03fd91da5a54be76cad42';
const providerPath = 'https://fixture.invalid/v1/videos/image2video';
const submitBody = {
  model_name: 'kling-v3', image: 'fixture-image', prompt: 'fixture prompt', duration: '5',
  aspect_ratio: '9:16', finishedAdId: 'test-run-01', producerScene: { sceneIdx: 0, attempt: 2 },
};
const lookupBody = { action: 'lookup_kling', runId: 'test-run-01', sceneIdx: 0, attempt: 2 };

async function call(handler: typeof submit | typeof advance, body: unknown, token = 'user-1') {
  const res = { status: vi.fn().mockReturnThis(), json: vi.fn(), setHeader: vi.fn() };
  await handler({ method: 'POST', headers: { authorization: `Bearer ${token}` }, body } as any, res as any);
  return { status: res.status.mock.calls[0]?.[0], body: res.json.mock.calls[0]?.[0] };
}

beforeEach(() => {
  Object.assign(db, { owner: 'user-1', attempt: 2, status: 'submitting', jobHandle: null });
  upstream.mockReset();
  meter.mockReset().mockResolvedValue({ ok: true });
  vi.stubGlobal('fetch', upstream);
});
afterEach(() => vi.unstubAllGlobals());

describe('Kling One-Shot submission recovery', () => {
  it('tags the paid submission and recovers the accepted operation with a GET for the same ID', async () => {
    upstream.mockResolvedValueOnce(Response.json({ code: 0, data: { task_id: 'provider-job-22' } }));
    expect((await call(submit, { ...submitBody, external_task_id: 'caller-override' })).status).toBe(200);
    const [postUrl, post] = upstream.mock.calls[0];
    expect(postUrl).toBe(providerPath);
    expect(post.method).toBe('POST');
    expect(JSON.parse(post.body)).toEqual({
      model_name: 'kling-v3', image: 'fixture-image', prompt: 'fixture prompt', duration: '5',
      aspect_ratio: '9:16', mode: 'std', external_task_id: externalId,
    });

    upstream.mockResolvedValueOnce(Response.json({ code: 0, data: {
      task_id: 'provider-job-22', task_status: 'processing', task_info: { external_task_id: externalId },
    } }));
    expect(await call(advance, lookupBody)).toEqual({ status: 200, body: { operation: {
      task_id: 'provider-job-22', task_status: 'processing',
    } } });
    expect(upstream).toHaveBeenLastCalledWith(`${providerPath}/${externalId}`, expect.objectContaining({ method: 'GET' }));
    expect(upstream).toHaveBeenCalledTimes(2);
    expect(meter).toHaveBeenCalledExactlyOnceWith('user-1', 'business', 'test-run-01');
  });

  it('rejects a stale tagged submission and skips a stale or already-recorded lookup', async () => {
    db.attempt = 3;
    expect(await call(submit, submitBody)).toEqual({ status: 409, body: { error: 'producer_scene_not_submittable' } });
    expect(await call(advance, lookupBody)).toEqual({ status: 200, body: { operation: null } });
    db.attempt = 2;
    db.jobHandle = { operation: { task_id: 'saved-job' } };
    expect(await call(advance, lookupBody)).toEqual({ status: 200, body: { operation: null } });
    expect(upstream).not.toHaveBeenCalled();
    expect(meter).not.toHaveBeenCalled();
  });

  it('rejects another user before metering or calling Kling', async () => {
    expect((await call(submit, submitBody, 'user-2')).status).toBe(403);
    expect((await call(advance, lookupBody, 'user-2')).status).toBe(403);
    expect(upstream).not.toHaveBeenCalled();
    expect(meter).not.toHaveBeenCalled();
  });

  it('leaves a provider duplicate-ID response eligible for lookup', async () => {
    upstream.mockResolvedValueOnce(Response.json({ code: 1201, message: 'external_task_id already exists' }, { status: 400 }));
    expect(await call(submit, submitBody)).toEqual({ status: 502, body: { error: 'kling_submission_uncertain' } });
    expect(upstream).toHaveBeenCalledTimes(1);
  });

  it('keeps a lookup miss, a mismatched ID and a transport error unresolved', async () => {
    upstream.mockResolvedValueOnce(new Response(null, { status: 404 }));
    upstream.mockResolvedValueOnce(Response.json({ code: 0, data: {
      task_id: 'wrong-job', task_info: { external_task_id: 'different-external-id' },
    } }));
    upstream.mockRejectedValueOnce(new Error('fixture transport failure'));
    for (let i = 0; i < 3; i += 1) {
      expect(await call(advance, lookupBody)).toEqual({ status: 200, body: { operation: null } });
    }
    expect(upstream).toHaveBeenCalledTimes(3);
    expect(upstream.mock.calls.map(([, options]) => options.method)).toEqual(['GET', 'GET', 'GET']);
    expect(meter).not.toHaveBeenCalled();
  });
});
