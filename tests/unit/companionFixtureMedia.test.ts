import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createReferenceDraft } from '../../services/companionReferenceDraft';
import { confirmSampleReview, createSampleReview } from '../../services/companionReferenceReview';
import { createFixtureJobIntent } from '../../services/companionFixtureJobs';
import { FIXTURE_VIDEO_MANIFEST, verifyFixtureResultVideoBlob } from '../../services/companionFixtureVideo';
import type { CloudFixtureResultReceipt } from '../../services/companionFixtureResults';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), createClient: vi.fn(), user: vi.fn(), rate: vi.fn(), video: vi.fn(), session: vi.fn(), library: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: (...args: unknown[]) => mocks.createClient(...args) }));
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({ getUserFromAccessToken: (...args: unknown[]) => mocks.user(...args) }));
vi.mock('../../api/_lib/rateLimit.js', () => ({ rateLimitCheck: (...args: unknown[]) => mocks.rate(...args) }));
vi.mock('../../api/_lib/companionFixtureVideo.js', () => ({ loadFixtureVideoBytes: () => mocks.video() }));
vi.mock('../../services/supabaseClient', () => ({ getSupabase: () => ({ auth: { getSession: () => mocks.session() } }) }));
vi.mock('../../services/geminiService', () => ({ listVideoLibrary: () => mocks.library() }));

import handler from '../../api/fixtures/video';
import { loadFixtureResultVideo, listCompanionVideoLibrary } from '../../services/companionAssets';

const owner = '11111111-1111-4111-8111-111111111111';
const other = '22222222-2222-4222-8222-222222222222';
const bytes = readFileSync('api/_lib/assets/fixtures/companion-video-v1.mp4');
const session = { data: { session: { user: { id: owner }, access_token: 'fixture-token' } } };

async function receipt(): Promise<CloudFixtureResultReceipt> {
  const inputHash = 'a'.repeat(64);
  const plan = confirmSampleReview(createSampleReview(createReferenceDraft(), inputHash, 0), inputHash, 0);
  const intent = await createFixtureJobIntent(owner, 'fixture-chat', plan, 'normal', { version: 1, saveId: 'b'.repeat(64), inputHash });
  return { version: 1, fixture: true, runtime: 'supabase-cloud-fixture-result-v1', fixtureVersion: 'v1', manifestId: FIXTURE_VIDEO_MANIFEST.id,
    ownerId: owner, ownerChatId: intent.ownerChatId, requestId: intent.requestId, jobId: '33333333-3333-4333-8333-333333333333',
    sourceSaveId: intent.cloudReference!.saveId, inputHash, intentText: JSON.stringify(intent),
    status: 'READY', actualCents: 0, createdAt: Date.now(), readyAt: Date.now() };
}
function response() {
  const res: any = { statusCode: 0, body: undefined, headers: {} as Record<string, string> };
  res.status = (code: number) => { res.statusCode = code; return res; };
  res.json = (value: unknown) => { res.body = value; return res; };
  res.send = res.json;
  res.setHeader = (key: string, value: string) => { res.headers[key] = value; return res; };
  return res;
}
const request = (requestId: string, change: Record<string, unknown> = {}) => ({ method: 'GET', query: { requestId }, headers: { authorization: 'Bearer fixture-token' }, ...change } as any);

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('SUPABASE_URL', 'https://fixture.supabase.co');
  vi.stubEnv('SUPABASE_ANON_KEY', 'fixture-public-key');
  mocks.createClient.mockReturnValue({ rpc: mocks.rpc });
  mocks.user.mockResolvedValue({ id: owner });
  mocks.rate.mockResolvedValue(true);
  mocks.video.mockResolvedValue(bytes);
  mocks.session.mockResolvedValue(session);
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('the shipped fixture is the exact playable asset contract', () => {
  it('pins the deployed bytes and rejects wrong MIME, truncation and same-size corruption', async () => {
    expect(bytes.length).toBe(FIXTURE_VIDEO_MANIFEST.sizeBytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(FIXTURE_VIDEO_MANIFEST.sha256);
    expect(await verifyFixtureResultVideoBlob(new Blob([bytes], { type: 'video/mp4' }))).toBeInstanceOf(Blob);
    for (const blob of [new Blob([bytes], { type: 'text/html' }), new Blob([bytes.subarray(1)], { type: 'video/mp4' }), new Blob([new Uint8Array(bytes.length)], { type: 'video/mp4' })]) {
      await expect(verifyFixtureResultVideoBlob(blob)).rejects.toThrow(/match/i);
    }
  });
});

describe('private fixture media API reads only an authorized READY result', () => {
  it('preserves user JWT RPC authorization and returns pinned bytes without publishing a URL', async () => {
    const saved = await receipt(); mocks.rpc.mockResolvedValue({ data: saved, error: null });
    const res = response(); await handler(request(saved.requestId), res);
    expect(res.statusCode).toBe(200); expect(res.body).toEqual(bytes);
    expect(res.headers['Cache-Control']).toBe('private, no-store');
    expect(res.headers['Content-Type']).toBe('video/mp4');
    expect(res.headers['Content-Length']).toBe(String(bytes.length));
    expect(mocks.createClient.mock.calls[0][2].global.headers.Authorization).toBe('Bearer fixture-token');
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith('grifon_fixture_result_get', { p_request_id: saved.requestId });
  });
  it('rejects methods, invalid paths, missing/invalid auth and rate limit before reading bytes', async () => {
    const saved = await receipt();
    for (const [req, expected] of [[request(saved.requestId, { method: 'POST' }), 405], [request('../file'), 400], [request(saved.requestId, { headers: {} }), 401]] as const) {
      const res = response(); await handler(req, res); expect(res.statusCode).toBe(expected);
    }
    mocks.user.mockResolvedValueOnce(null);
    const denied = response(); await handler(request(saved.requestId), denied); expect(denied.statusCode).toBe(401);
    mocks.rate.mockResolvedValueOnce(false);
    const limited = response(); await handler(request(saved.requestId), limited); expect(limited.statusCode).toBe(429);
    expect(limited.headers['Retry-After']).toBe('60'); expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.video).not.toHaveBeenCalled();
  });
  it('returns no media for missing, pending, foreign, forged or mismatched results', async () => {
    const saved = await receipt();
    for (const [data, expected] of [[null, 404], [{ ...saved, status: 'PENDING', readyAt: null }, 409], [{ ...saved, ownerId: other }, 503], [{ ...saved, manifestId: 'unapproved' }, 503], [{ ...saved, requestId: 'c'.repeat(64) }, 503]] as const) {
      mocks.rpc.mockResolvedValueOnce({ data, error: null });
      const res = response(); await handler(request(saved.requestId), res); expect(res.statusCode).toBe(expected);
      expect(res.headers['Cache-Control']).toBe('private, no-store');
    }
    expect(mocks.video).not.toHaveBeenCalled();
  });
  it('reports unavailable RPC/files safely without generation or credential details', async () => {
    const saved = await receipt();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'private remote detail' } });
    const offline = response(); await handler(request(saved.requestId), offline);
    expect(offline.statusCode).toBe(503); expect(JSON.stringify(offline.body)).not.toContain('private remote detail');
    mocks.rpc.mockResolvedValueOnce({ data: saved, error: null }); mocks.video.mockRejectedValueOnce(new Error('private filesystem detail'));
    const missing = response(); await handler(request(saved.requestId), missing);
    expect(missing.statusCode).toBe(503); expect(JSON.stringify(missing.body)).not.toContain('private filesystem detail');
  });
});

describe('chat and Assets load private media through the same verified read seam', () => {
  it('uses the receipt identity and current owner, then checks the actual downloaded bytes', async () => {
    const saved = await receipt(); const fetcher = vi.fn().mockResolvedValue(new Response(bytes, { headers: { 'Content-Type': 'video/mp4', 'Content-Length': String(bytes.length) } })); vi.stubGlobal('fetch', fetcher);
    const blob = await loadFixtureResultVideo(saved);
    expect(blob.size).toBe(bytes.length);
    expect(fetcher.mock.calls[0][0]).toBe(`/api/fixtures/video?requestId=${saved.requestId}`);
    expect(fetcher.mock.calls[0][1].headers.Authorization).toBe('Bearer fixture-token');
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('blocks a different account or cancelled request before fetching a file', async () => {
    const saved = await receipt(); const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    mocks.session.mockResolvedValueOnce({ data: { session: { ...session.data.session, user: { id: other } } } });
    await expect(loadFixtureResultVideo(saved)).rejects.toThrow(/account/i);
    const controller = new AbortController(); controller.abort();
    await expect(loadFixtureResultVideo(saved, controller.signal)).rejects.toThrow(/cancelled/i);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects corrupted bytes and a late response after an account change', async () => {
    const saved = await receipt(); vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(new Response(new Uint8Array(bytes.length), { headers: { 'Content-Type': 'video/mp4' } })).mockResolvedValueOnce(new Response(bytes, { headers: { 'Content-Type': 'video/mp4' } })));
    await expect(loadFixtureResultVideo(saved)).rejects.toThrow(/match/i);
    mocks.session.mockResolvedValueOnce(session).mockResolvedValueOnce({ data: { session: { ...session.data.session, user: { id: other } } } });
    await expect(loadFixtureResultVideo(saved)).rejects.toThrow(/account changed/i);
  });
  it('reuses the existing real video library without starting generation', async () => {
    const items = [{ path: `${owner}/saved.mp4`, url: 'https://media.example/saved', mimeType: 'video/mp4' }];
    mocks.library.mockResolvedValueOnce(items);
    expect(await listCompanionVideoLibrary()).toEqual(items); expect(mocks.library).toHaveBeenCalledTimes(1);
  });
});
