import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createReferenceDraft } from '../../services/companionReferenceDraft.js';
import { confirmSampleReview, createSampleReview } from '../../services/companionReferenceReview.js';
import { createFixtureJobIntent } from '../../services/companionFixtureJobs.js';
import { fixtureInputTextSha256, readFixtureInputVerification, verifyFixtureInputs, validateFixtureInputVerificationReceipt, type FixtureInputVerificationReceipt } from '../../services/companionInputVerification.js';

const mocks = vi.hoisted(() => ({ user: vi.fn(), rate: vi.fn(), createClient: vi.fn(), rpc: vi.fn(), download: vi.fn(), record: vi.fn(), verify: vi.fn() }));
vi.mock('@supabase/supabase-js', () => ({ createClient: (...args: unknown[]) => mocks.createClient(...args) }));
vi.mock('../../api/_lib/supabaseAdmin.js', () => ({ getUserFromAccessToken: (...args: unknown[]) => mocks.user(...args), getSupabaseAdmin: () => ({ rpc: (...args: unknown[]) => ({ abortSignal: () => mocks.record(...args) }) }) }));
vi.mock('../../api/_lib/rateLimit.js', () => ({ rateLimitCheck: (...args: unknown[]) => mocks.rate(...args) }));
vi.mock('../../api/_lib/companionInputVerifier.js', () => ({ FixtureInputVerificationError: class FixtureInputVerificationError extends Error { constructor(public code: string) { super(code); } }, verifySavedFixtureInputs: (...args: unknown[]) => mocks.verify(...args) }));
import handler from '../../api/fixtures/verify-inputs.js';
import { FixtureInputVerificationError } from '../../api/_lib/companionInputVerifier.js';

const owner = '11111111-1111-4111-8111-111111111111', other = '22222222-2222-4222-8222-222222222222';
async function fixture() {
  const inputHash = 'a'.repeat(64), plan = confirmSampleReview(createSampleReview(createReferenceDraft(), inputHash, 0), inputHash, 0);
  const intent = await createFixtureJobIntent(owner, 'job-chat', plan, 'normal', { version: 1, saveId: 'b'.repeat(64), inputHash });
  const verifiedMedia = [{ slot: 'reference', mimeType: 'video/webm', sizeBytes: 643, sha256: 'c'.repeat(64), width: 90, height: 160, durationSeconds: 0.5, frames: 5, decoded: true as const }];
  const proof = { ownerId: owner, requestId: intent.requestId, sourceSaveId: intent.cloudReference!.saveId, inputHash, manifestSha256: 'd'.repeat(64), planSnapshotSha256: await fixtureInputTextSha256(intent.plan.confirmation!.planSnapshot), verifiedMedia };
  const receipt: FixtureInputVerificationReceipt = { ...proof, version: 1, runtime: 'fixture-input-verification-v1', fixture: true, actualCents: 0, decoder: 'ffmpeg-full-null-v1', orientation: 'identity-only', verifiedAt: 1000 };
  return { intent, proof, receipt, job: { intentText: JSON.stringify(intent) }, saved: { committed: true } };
}
function response() {
  const value: any = { statusCode: 0, body: null, headers: {} };
  value.setHeader = (key: string, data: string) => { value.headers[key] = data; return value; };
  value.status = (code: number) => { value.statusCode = code; return value; }; value.json = (body: unknown) => { value.body = body; return value; }; return value;
}
const request = (requestId: string, changes: Record<string, unknown> = {}) => ({ method: 'POST', body: { requestId }, headers: { authorization: 'Bearer fixture-token' }, ...changes } as any);
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv('SUPABASE_URL', 'https://fixture.supabase.co'); vi.stubEnv('SUPABASE_ANON_KEY', 'fixture-public-key');
  mocks.user.mockResolvedValue({ id: owner }); mocks.rate.mockResolvedValue(true); mocks.createClient.mockReturnValue({ rpc: mocks.rpc, storage: { from: () => ({ download: mocks.download }) } });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe('fixture input verification API transport boundary', () => {
  it('derives owner/snapshot from authenticated existing reads and records only trusted server proof at PHP0', async () => {
    const test = await fixture(); mocks.rpc.mockResolvedValueOnce({ data: test.job, error: null }).mockResolvedValueOnce({ data: test.saved, error: null });
    mocks.verify.mockResolvedValue(test.proof); mocks.record.mockResolvedValue({ data: test.receipt, error: null });
    const res = response(); await handler(request(test.intent.requestId), res);
    expect(res.statusCode).toBe(200); expect(res.body).toEqual(test.receipt);
    expect(mocks.createClient.mock.calls[0][2].global.headers.Authorization).toBe('Bearer fixture-token');
    expect(mocks.rpc.mock.calls).toEqual([['grifon_fixture_get', { p_request_id: test.intent.requestId }], ['grifon_reference_get', { p_save_id: test.intent.cloudReference!.saveId }]]);
    expect(mocks.verify).toHaveBeenCalledOnce(); expect(mocks.verify.mock.calls[0].slice(0, 4)).toEqual([owner, test.intent.requestId, test.job, test.saved]);
    expect(mocks.record.mock.calls[0]).toEqual(['grifon_fixture_input_verification_record', { p_owner_id: owner, p_request_id: test.intent.requestId, p_source_save_id: test.proof.sourceSaveId, p_input_hash: test.proof.inputHash, p_manifest_sha256: test.proof.manifestSha256, p_plan_snapshot_sha256: test.proof.planSnapshotSha256, p_verified_media: test.proof.verifiedMedia }]);
    expect(res.headers).toMatchObject({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  });
  it('rejects URL/path/owner/verified authority, wrong methods, auth and rate limits before reads or decoding', async () => {
    const test = await fixture();
    for (const [req, status] of [[request(test.intent.requestId, { method: 'GET' }), 405], [request('../escape'), 400], [request(test.intent.requestId, { body: { requestId: test.intent.requestId, ownerId: owner } }), 400], [request(test.intent.requestId, { body: { requestId: test.intent.requestId, verified: true } }), 400], [request(test.intent.requestId, { body: { requestId: test.intent.requestId, url: 'https://elsewhere.example/video' } }), 400], [request(test.intent.requestId, { headers: {} }), 401]] as const) { const res = response(); await handler(req, res); expect(res.statusCode).toBe(status); }
    mocks.user.mockResolvedValueOnce(null); const invalid = response(); await handler(request(test.intent.requestId), invalid); expect(invalid.statusCode).toBe(401);
    mocks.rate.mockResolvedValueOnce(false); const limited = response(); await handler(request(test.intent.requestId), limited); expect(limited.statusCode).toBe(429); expect(limited.headers['Retry-After']).toBe('60');
    expect(mocks.rpc).not.toHaveBeenCalled(); expect(mocks.verify).not.toHaveBeenCalled(); expect(mocks.record).not.toHaveBeenCalled();
  });
  it('never writes a receipt for missing inputs, failed decode or lost server writer acknowledgement', async () => {
    const test = await fixture(); mocks.rpc.mockResolvedValueOnce({ data: null, error: null }); const missing = response(); await handler(request(test.intent.requestId), missing); expect(missing.statusCode).toBe(404);
    mocks.rpc.mockResolvedValueOnce({ data: test.job, error: null }).mockResolvedValueOnce({ data: test.saved, error: null }); mocks.verify.mockRejectedValueOnce(new FixtureInputVerificationError('FIXTURE_MEDIA_DECODE_FAILED'));
    const bad = response(); await handler(request(test.intent.requestId), bad); expect(bad.statusCode).toBe(422); expect(bad.body).toEqual({ error: 'fixture_media_decode_failed' }); expect(mocks.record).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ data: test.job, error: null }).mockResolvedValueOnce({ data: test.saved, error: null }); mocks.verify.mockResolvedValueOnce(test.proof); mocks.record.mockResolvedValueOnce({ data: null, error: { message: 'secret-value' } });
    const lost = response(); await handler(request(test.intent.requestId), lost); expect(lost.statusCode).toBe(503); expect(JSON.stringify(lost.body)).not.toContain('secret-value');
  });
  it('enforces the overall55second deadline without recording a hung verification', async () => {
    vi.useFakeTimers(); const test = await fixture(); mocks.rpc.mockResolvedValueOnce({ data: test.job, error: null }).mockResolvedValueOnce({ data: test.saved, error: null }); mocks.verify.mockImplementationOnce(() => new Promise(() => {}));
    const res = response(), pending = handler(request(test.intent.requestId), res); await vi.advanceTimersByTimeAsync(55_001); await pending;
    expect(res.statusCode).toBe(422); expect(res.body).toEqual({ error: 'fixture_verification_deadline' }); expect(mocks.record).not.toHaveBeenCalled();
  });
  it('accepts PostgreSQL JSONB key ordering but rejects a conflicting or foreign receipt after decode', async () => {
    const test = await fixture(); const reordered = Object.fromEntries(Object.entries(test.receipt.verifiedMedia[0]).reverse());
    for (const [returned, expected] of [[{ ...test.receipt, verifiedMedia: [reordered] }, 200], [{ ...test.receipt, ownerId: other }, 503], [{ ...test.receipt, manifestSha256: 'e'.repeat(64) }, 503]] as const) {
      mocks.rpc.mockResolvedValueOnce({ data: test.job, error: null }).mockResolvedValueOnce({ data: test.saved, error: null }); mocks.verify.mockResolvedValueOnce(test.proof); mocks.record.mockResolvedValueOnce({ data: returned, error: null });
      const res = response(); await handler(request(test.intent.requestId), res); expect(res.statusCode).toBe(expected);
    }
  });
  it('bounds actual response streams and refuses any Supabase client fetch to an external origin or redirect', async () => {
    const test = await fixture(); mocks.rpc.mockResolvedValueOnce({ data: null, error: null }); const res = response(); await handler(request(test.intent.requestId), res);
    const privateFetch: typeof fetch = mocks.createClient.mock.calls[0][2].global.fetch, network = vi.fn(async () => new Response(new Uint8Array(6_000_001))); vi.stubGlobal('fetch', network);
    await expect(privateFetch('https://outside.example/media')).rejects.toThrow('FIXTURE_MEDIA_UNAVAILABLE'); expect(network).not.toHaveBeenCalled();
    await expect(privateFetch('https://fixture.supabase.co/storage/v1/object/test')).rejects.toThrow('FIXTURE_MEDIA_LIMIT_UNSUPPORTED');
    expect(network.mock.calls[0][1]).toMatchObject({ redirect: 'error', signal: expect.any(AbortSignal) });
  });
});

describe('strict fixture preflight receipt and guarded read/verify clients', () => {
  it('validates pinned owner/job/source/input/plan hash and bounded real decoded metadata', async () => {
    const test = await fixture(); expect(await validateFixtureInputVerificationReceipt(test.receipt, owner, test.intent)).toEqual(test.receipt);
    for (const change of [{ actualCents: 1 }, { fixture: false }, { ownerId: other }, { decoder: 'hash-only' }, { verified: true }, { sourceSaveId: 'e'.repeat(64) }, { planSnapshotSha256: 'f'.repeat(64) }]) await expect(validateFixtureInputVerificationReceipt({ ...test.receipt, ...change }, owner, test.intent)).rejects.toThrow();
    for (const change of [{ decoded: false }, { frames: 1801 }, { frames: 100 }, { durationSeconds: null }, { width: 0 }, { sizeBytes: 6_000_001 }, { slot: '../path' }]) await expect(validateFixtureInputVerificationReceipt({ ...test.receipt, verifiedMedia: [{ ...test.receipt.verifiedMedia[0], ...change }] }, owner, test.intent)).rejects.toThrow();
  });
  it('posts only requestId and rejects stale accounts after the server response without starting jobs', async () => {
    const test = await fixture(), send = vi.fn(async () => new Response(JSON.stringify(test.receipt), { status: 200 })), session = vi.fn().mockResolvedValue({ ownerId: owner, accessToken: 'fixture-token' });
    expect(await verifyFixtureInputs(test.intent, send, session)).toEqual(test.receipt);
    expect(send.mock.calls[0]).toEqual(['/api/fixtures/verify-inputs', expect.objectContaining({ method: 'POST', body: JSON.stringify({ requestId: test.intent.requestId }), cache: 'no-store' })]);
    session.mockResolvedValueOnce({ ownerId: owner, accessToken: 'fixture-token' }).mockResolvedValueOnce({ ownerId: other, accessToken: 'fixture-token' });
    await expect(verifyFixtureInputs(test.intent, send, session)).rejects.toThrow('account changed');
    session.mockResolvedValueOnce({ ownerId: other, accessToken: 'fixture-token' }); const before = send.mock.calls.length;
    await expect(verifyFixtureInputs(test.intent, send, session)).rejects.toThrow('Sign in'); expect(send.mock.calls).toHaveLength(before);
  });
  it('reopens only through the read RPC, returns missing without implicitly verifying and rejects an account change', async () => {
    const test = await fixture(), rpc = vi.fn().mockResolvedValue({ data: null, error: null }), currentOwner = vi.fn().mockResolvedValue(owner);
    expect(await readFixtureInputVerification(test.intent, rpc, currentOwner)).toBeNull();
    expect(rpc).toHaveBeenCalledExactlyOnceWith('grifon_fixture_input_verification_get', { p_request_id: test.intent.requestId });
    rpc.mockResolvedValueOnce({ data: test.receipt, error: null }); expect(await readFixtureInputVerification(test.intent, rpc, currentOwner)).toEqual(test.receipt);
    currentOwner.mockResolvedValueOnce(owner).mockResolvedValueOnce(other); rpc.mockResolvedValueOnce({ data: test.receipt, error: null });
    await expect(readFixtureInputVerification(test.intent, rpc, currentOwner)).rejects.toThrow('account changed');
  });
});
