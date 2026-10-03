import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { approvalDigest, validateStudy, runStudy } from '../run_byteplus_motion_transfer.mjs';

const workspace = resolve('.');
const fixtureRoot = resolve('.tmp/byteplus-guard-smoke/run-' + Date.now());
mkdirSync(fixtureRoot, { recursive: true });
const realApprovedSpec = JSON.parse(readFileSync('assets/blender-reveal/motion-transfer.byteplus-seedance20.spec.json', 'utf8'));
const proposed = structuredClone(realApprovedSpec);
proposed.status = 'proposed_for_offline_fixture_only';
proposed.approval.approved = false;
const sourceHashAtStart = await import('node:crypto').then(({ createHash }) => createHash('sha256').update(readFileSync('tools/run_byteplus_motion_transfer.mjs')).digest('hex'));
const fakeEnv = { ARK_API_KEY: 'FAKE_ARK_SECRET_MUST_NOT_EMIT', SUPABASE_SERVICE_ROLE_KEY: 'FAKE_STORAGE_SECRET_MUST_NOT_EMIT', SUPABASE_URL: 'https://smoke-only.supabase.co' };
const markers = [fakeEnv.ARK_API_KEY, fakeEnv.SUPABASE_SERVICE_ROLE_KEY, 'FAKE_SIGNED_CAPABILITY_MUST_NOT_EMIT', 'FAKE_OUTPUT_CAPABILITY_MUST_NOT_EMIT'];
const approve = source => { const spec = structuredClone(source); spec.status = 'approved_for_single_byteplus_test'; spec.approval = { approved: true, account_verified: false, account_access_check: 'single_approved_submission_no_funding', pricing_verified: true, staging_approved: true, request_sha256: approvalDigest(spec) }; return spec; };
const approved = approve(proposed);
const records = [];
const optionsFor = name => {
  const directory = join(fixtureRoot, name); mkdirSync(directory, { recursive: true });
  return { mode: 'execute', workspace, env: fakeEnv, ledgerPath: join(directory, 'ledger.json'), evidencePath: join(directory, 'evidence.json'), outputPath: join(directory, 'output.mp4'), sleep: async () => {} };
};
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
const taskId = 'smoke_task_1';
const outputUrl = 'https://ark-content-generation-ap-southeast-1.tos-ap-southeast-1.volces.com/example.mp4?token=FAKE_OUTPUT_CAPABILITY_MUST_NOT_EMIT';
const videoBytes = Buffer.from('0000ftypisomMOCK_MP4_CONTAINER_ONLY');
const signedUrl = `https://smoke-only.supabase.co/storage/v1/object/sign/${approved.staging.bucket}/${approved.staging.object_key}?token=FAKE_SIGNED_CAPABILITY_MUST_NOT_EMIT`;
const digestBytes = bytes => createHash('sha256').update(bytes).digest('hex');
const seedResume = (options, extras = {}) => { const ledger = { approval_digest: approvalDigest(approved), paid_post_attempts: 1, client_retries: 0, task_id: taskId, status: 'submitted', model: approved.request.model, staging: { bucket: approved.staging.bucket, object_key: approved.staging.object_key, upload_confirmed: true, cleanup: 'pending' }, ...extras }; writeFileSync(options.ledgerPath, JSON.stringify(ledger)); return ledger; };
function fakeNetwork(spec, config = {}) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    url = String(url); const method = init.method ?? 'GET'; calls.push({ url, method, headers: init.headers ?? {}, body: init.body });
    assert.equal(init.redirect, 'error');
    if (url.includes('?page_num=')) return json({ items: [] });
    if (url.includes('/storage/v1/bucket/')) return json({ id: spec.staging.bucket, public: config.publicBucket ?? false });
    if (url.includes('/storage/v1/object/sign/') && method === 'POST') return json({ signedURL: `/object/sign/${spec.staging.bucket}/${spec.staging.object_key}?token=FAKE_SIGNED_CAPABILITY_MUST_NOT_EMIT` });
    if (url.includes('/storage/v1/object/sign/') && method === 'GET') return new Response(Buffer.from([0]), { status: config.probeStatus ?? 206, headers: { 'content-range': `bytes 0-0/${spec.staging.input_bytes}` } });
    if (url.includes('/storage/v1/object/') && method === 'POST') { if (config.uploadError) throw config.uploadError; return json({ Key: `${spec.staging.bucket}/${spec.staging.object_key}` }); }
    if (url === spec.endpoint && method === 'POST') { if (config.paidPostError) throw config.paidPostError; if (config.paidPostResponse) return config.paidPostResponse; return json({ id: taskId }); }
    if (url === `${spec.endpoint}/${taskId}` && method === 'GET') return json({ id: taskId, ...(config.taskModel ? { model: config.taskModel } : {}), status: config.taskStatus ?? 'succeeded', usage: { total_tokens: config.totalTokens ?? 120528, prompt_tokens: 0 }, content: { video_url: config.outputUrl ?? outputUrl } });
    if (url.includes('/storage/v1/object/') && method === 'DELETE') return json([{ name: spec.staging.object_key }]);
    if (url === (config.outputUrl ?? outputUrl) && method === 'GET') return new Response(videoBytes);
    throw new Error('Unexpected fake-network request');
  };
  return { fetchImpl, calls };
}
function assertNoSecrets(value) { const serialized = typeof value === 'string' ? value : JSON.stringify(value); for (const marker of markers) assert(!serialized.includes(marker), 'A fake secret/capability was emitted'); }
function persisted(options) { return [options.ledgerPath, options.evidencePath].filter(existsSync).map(path => readFileSync(path, 'utf8')); }
async function test(name, body) { let watchdog; try { const detail = await Promise.race([body(), new Promise((_, reject) => { watchdog = setTimeout(() => reject(new Error('Offline fixture deadline exceeded')), 5000); })]); records.push({ name, status: 'PASS', detail }); } catch (error) { records.push({ name, status: 'FAIL', error: markers.some(marker => String(error.message).includes(marker)) ? 'Failure message contained a fake secret marker; withheld' : error.message }); } finally { clearTimeout(watchdog); } }

await test('CLI default and explicit dry run cannot use network or real credentials', async () => {
  const preload = join(fixtureRoot, 'deny-network.mjs');
  writeFileSync(preload, "import http from 'node:http'; import https from 'node:https'; const block = () => { throw new Error('OFFLINE_NETWORK_DENIED'); }; globalThis.fetch = block; http.request = block; http.get = block; https.request = block; https.get = block;\n");
  for (const flag of [[], ['--dry-run']]) {
    const child = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, 'tools/run_byteplus_motion_transfer.mjs', ...flag], { cwd: workspace, env: { SystemRoot: 'C:/Windows', ...fakeEnv }, encoding: 'utf8' });
    assert.equal(child.status, 0, child.stderr); const result = JSON.parse(child.stdout); assert.equal(result.networkRequests, 0); assert.equal(result.paidSubmissions, 0); assertNoSecrets(child.stdout + child.stderr);
  }
  const proposalPath = join(fixtureRoot, 'not-approved.spec.json'); writeFileSync(proposalPath, JSON.stringify(proposed));
  const denied = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, 'tools/run_byteplus_motion_transfer.mjs', '--execute', '--spec', proposalPath], { cwd: workspace, env: { SystemRoot: 'C:/Windows', ...fakeEnv }, encoding: 'utf8' });
  assert.equal(denied.status, 1); assert.match(denied.stderr, /Exact approval/); assert(!denied.stderr.includes('OFFLINE_NETWORK_DENIED')); assertNoSecrets(denied.stdout + denied.stderr);
  return 'Default/--dry-run CLI exit 0; proposed --execute exit 1 before denied networking.';
});
await test('Imported dry run returns before any environment read or network call', async () => {
  let fetchCalls = 0; const env = new Proxy({}, { get() { throw new Error('Environment read forbidden'); } });
  const result = await runStudy(proposed, { mode: 'dry-run', workspace, env, fetchImpl: async () => { fetchCalls++; throw new Error('Network forbidden'); } });
  assert.equal(fetchCalls, 0); assert.equal(result.mediaUploads, 0); assert.equal(result.paidSubmissions, 0); return 'Host environment and fetch remained inaccessible.';
});
await test('Proposal blocks execute before environment or network', async () => {
  let calls = 0; await assert.rejects(runStudy(proposed, { mode: 'execute', workspace, env: new Proxy({}, { get() { throw new Error('Environment read forbidden'); } }), fetchImpl: async () => { calls++; } }), /Exact approval/); assert.equal(calls, 0); return 'Approval gate precedes credentials and fetch.';
});
await test('Changed asset definition and actual bytes are rejected', async () => {
  const changed = structuredClone(approved); changed.assets[0].sha256 = '0'.repeat(64); assert.throws(() => validateStudy(changed, workspace, true), /Input definition changed/);
  const copyRoot = join(fixtureRoot, 'altered-assets'); mkdirSync(join(copyRoot, 'assets/blender-reveal'), { recursive: true });
  for (const asset of approved.assets) copyFileSync(resolve(workspace, asset.path), resolve(copyRoot, asset.path));
  copyFileSync(resolve(workspace, approved.approved_fal_spec), resolve(copyRoot, approved.approved_fal_spec));
  const target = resolve(copyRoot, approved.assets[1].path); const changedBytes = readFileSync(target); changedBytes[changedBytes.length - 1] ^= 1; writeFileSync(target, changedBytes);
  assert.throws(() => validateStudy(approved, copyRoot, true), /Input bytes do not match/); return 'One-byte copied PNG mutation fails the real SHA gate.';
});
await test('Changed prompt/model/settings and approval digest reject before network', async () => {
  for (const mutation of [s => s.request.content[0].text += ' Altered prompt.', s => s.request.model = 'different-model', s => s.request.resolution = '720p', s => s.request.duration = 7]) {
    const changed = structuredClone(approved); mutation(changed); assert.throws(() => validateStudy(changed, workspace, true), /Exact request or approved prompt changed/);
  }
  const changed = structuredClone(approved); changed.staging.object_key = 'motion-tests/noir-01/11111111-2222-3333-4444-555555555555/camera-reference.mp4'; assert.throws(() => validateStudy(changed, workspace, true), /digest does not match/); return 'Exact request and changed staging key need matching approval.';
});
await test('Budget changes reject unsafe cap/funding/retry or stale approval', async () => {
  for (const mutation of [s => s.budget.maximum_total_cost = 6, s => s.budget.maximum_paid_submissions = 2, s => s.budget.automatic_client_retries = 1, s => s.budget.top_ups_allowed = true, s => s.budget.rate_usd_per_million_tokens = 4.5]) {
    const changed = structuredClone(approved); mutation(changed); assert.throws(() => validateStudy(changed, workspace, true));
  }
  const changed = structuredClone(approved); changed.budget.maximum_total_cost = 2; assert.throws(() => validateStudy(changed, workspace, true), /digest does not match/); return 'Also rejects lower cap with stale exact approval digest.';
});
await test('Public bucket stops before any media upload or ledger reservation', async () => {
  const options = optionsFor('public-bucket'); const network = fakeNetwork(approved, { publicBucket: true });
  await assert.rejects(runStudy(approved, { ...options, fetchImpl: network.fetchImpl }), /confirmed private/);
  assert.equal(network.calls.length, 2); assert(network.calls.every(call => call.method === 'GET')); assert(!existsSync(options.ledgerPath)); return 'Two fake read-only preflight calls; no writes.';
});
await test('Successful fake flow separates auth, withholds capabilities and cleans exact owned key', async () => {
  const options = optionsFor('success'); const network = fakeNetwork(approved); const result = await runStudy(approved, { ...options, fetchImpl: network.fetchImpl });
  assert.equal(result.paidSubmissions, 1); assert.equal(result.cleanup, 'confirmed'); assert.equal(network.calls.filter(call => call.url === approved.endpoint && call.method === 'POST').length, 1);
  const upload = network.calls.find(call => call.method === 'POST' && call.url.includes('/storage/v1/object/') && !call.url.includes('/sign/')); assert.equal(upload.headers['x-upsert'], 'false'); assert.equal(upload.body.length, 882241);
  const paid = network.calls.find(call => call.url === approved.endpoint && call.method === 'POST'); const body = JSON.parse(paid.body); assert.equal(body.content[1].video_url.url, signedUrl); assert(body.content[2].image_url.url.startsWith('data:image/png;base64,')); assert.equal(paid.headers.Authorization, `Bearer ${fakeEnv.ARK_API_KEY}`); assert(!('apikey' in paid.headers));
  const probe = network.calls.find(call => call.url === signedUrl); assert.deepEqual(probe.headers, { Range: 'bytes=0-0' });
  const download = network.calls.find(call => call.url === outputUrl); assert.deepEqual(download.headers, {});
  const deletes = network.calls.filter(call => call.method === 'DELETE'); assert.equal(deletes.length, 1); assert.deepEqual(JSON.parse(deletes[0].body), { prefixes: [approved.staging.object_key] });
  assertNoSecrets(result); for (const saved of persisted(options)) assertNoSecrets(saved);
  const ledger = JSON.parse(readFileSync(options.ledgerPath)); assert.equal(ledger.request.content[1].video_url.url, '{{SIGNED_CAMERA_REFERENCE_URL}}'); assert.equal(ledger.request.content[2].image_url.url, '{{HERO_PNG_DATA_URI}}'); assert.equal(ledger.cost.actual_total_bill, null); assert.match(ledger.output.decode_verification, /pending/);
  return 'Mock flow only; output is fake MP4 container, decode/actual bill remain pending.';
});
await test('Ambiguous paid POST spends one attempt and cannot resubmit or resume without task ID', async () => {
  const options = optionsFor('ambiguous'); const network = fakeNetwork(approved, { paidPostError: new Error(`timeout ${signedUrl} ${fakeEnv.ARK_API_KEY}`) });
  await assert.rejects(runStudy(approved, { ...options, fetchImpl: network.fetchImpl }), /network result unknown; no automatic retry/);
  const ledger = JSON.parse(readFileSync(options.ledgerPath)); assert.equal(ledger.paid_post_attempts, 1); assert.equal(ledger.status, 'submission_result_unknown'); assert.equal(ledger.staging.cleanup, 'pending'); assert.equal(network.calls.filter(call => call.method === 'DELETE').length, 0); for (const saved of persisted(options)) assertNoSecrets(saved);
  let repeatedCalls = 0; const neverFetch = async () => { repeatedCalls++; throw new Error('Network forbidden'); };
  await assert.rejects(runStudy(approved, { ...options, fetchImpl: neverFetch }), /Attempt ledger exists/);
  await assert.rejects(runStudy(approved, { ...options, mode: 'resume', fetchImpl: neverFetch }), /task ID missing/); assert.equal(repeatedCalls, 0); return 'Ambiguous attempt retained; duplicate execute and missing-ID resume make zero network calls.';
});
await test('Recorded-ID resume only polls/downloads and deletes exact key; no submission or upload POST', async () => {
  const options = optionsFor('resume'); writeFileSync(options.ledgerPath, JSON.stringify({ approval_digest: approvalDigest(approved), paid_post_attempts: 1, client_retries: 0, task_id: taskId, status: 'submitted', staging: { bucket: approved.staging.bucket, object_key: approved.staging.object_key, upload_confirmed: true, cleanup: 'pending' } }));
  const network = fakeNetwork(approved); const result = await runStudy(approved, { ...options, mode: 'resume', fetchImpl: network.fetchImpl });
  assert.equal(result.paidSubmissions, 1); assert(network.calls.every(call => ['GET', 'DELETE'].includes(call.method))); assert.equal(network.calls.filter(call => call.method === 'DELETE').length, 1); assertNoSecrets(result); for (const saved of persisted(options)) assertNoSecrets(saved); return 'Fake recorded task resumed using GET plus exact-key DELETE, no POST.';
});
await test('Concurrent execute uses exclusive ledger to allow at most one upload and paid POST', async () => {
  const options = optionsFor('concurrent'); const network = fakeNetwork(approved); let bucketArrivals = 0; let release; const both = new Promise(done => { release = done; });
  let releasePost; const postGate = new Promise(done => { releasePost = done; }); let reachedPost; const postReached = new Promise(done => { reachedPost = done; });
  const fetchImpl = async (url, init) => { if (String(url).includes('/storage/v1/bucket/')) { bucketArrivals++; if (bucketArrivals === 2) release(); await both; } if (String(url) === approved.endpoint && init.method === 'POST') { reachedPost(); await postGate; } return network.fetchImpl(url, init); };
  const contenders = [runStudy(approved, { ...options, fetchImpl }), runStudy(approved, { ...options, fetchImpl })];
  const losingResult = Promise.race(contenders.map(promise => promise.then(() => null, error => error))); await postReached; assert(await losingResult);
  const inFlight = JSON.parse(readFileSync(options.ledgerPath, 'utf8')); assert.equal(inFlight.paid_post_attempts, 1, 'Losing contender overwrote winning durable paid reservation'); assert.equal(inFlight.staging.upload_confirmed, true);
  releasePost(); const results = await Promise.allSettled(contenders);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1); assert.equal(results.filter(result => result.status === 'rejected').length, 1);
  assert.equal(network.calls.filter(call => call.url === approved.endpoint && call.method === 'POST').length, 1); assert.equal(network.calls.filter(call => call.method === 'POST' && call.url.includes('/storage/v1/object/') && !call.url.includes('/sign/')).length, 1); return 'Concurrent contenders passed GET preflight; exclusive file create blocked the second before write.';
});
await test('Unknown output host rejected before download and still terminal owned-key cleanup', async () => {
  const options = optionsFor('bad-output-host'); const network = fakeNetwork(approved, { outputUrl: 'https://unexpected.example/output.mp4?token=FAKE_OUTPUT_CAPABILITY_MUST_NOT_EMIT' });
  await assert.rejects(runStudy(approved, { ...options, fetchImpl: network.fetchImpl }), /host is not allowlisted/); assert(!network.calls.some(call => call.url.includes('unexpected.example'))); assert.equal(network.calls.filter(call => call.method === 'DELETE').length, 1); for (const saved of persisted(options)) assertNoSecrets(saved); return 'Unallowlisted URL never fetched.';
});
await test('Fetch error resembling a safe HTTP message cannot emit signed URL or auth', async () => {
  const options = optionsFor('crafted-fetch-error'); const network = fakeNetwork(approved, { paidPostError: new Error(`${signedUrl} ${fakeEnv.ARK_API_KEY}: HTTP 403; response body withheld`) });
  let caught; try { await runStudy(approved, { ...options, fetchImpl: network.fetchImpl }); } catch (error) { caught = error; }
  assert(caught); assertNoSecrets(caught.message); for (const saved of persisted(options)) assertNoSecrets(saved); return 'Arbitrary fetch failure content is withheld even if it mimics internal HTTP errors.';
});
await test('HTTP error bodies and malformed JSON are withheld, one attempt remains reserved', async () => {
  for (const variant of ['http', 'json']) {
    const options = optionsFor('error-body-' + variant);
    const response = variant === 'http' ? new Response(signedUrl + fakeEnv.ARK_API_KEY, { status: 429 }) : new Response(signedUrl + fakeEnv.ARK_API_KEY, { status: 200 });
    const network = fakeNetwork(approved, { paidPostResponse: response }); let caught; try { await runStudy(approved, { ...options, fetchImpl: network.fetchImpl }); } catch (error) { caught = error; }
    assert(caught); assertNoSecrets(caught.message); for (const saved of persisted(options)) assertNoSecrets(saved);
    const ledger = JSON.parse(readFileSync(options.ledgerPath)); assert.equal(ledger.paid_post_attempts, 1); assert.equal(network.calls.filter(call => call.url === approved.endpoint && call.method === 'POST').length, 1); assert.equal(network.calls.filter(call => call.method === 'DELETE').length, 0);
  } return '429 and invalid JSON expose stage/status only, never provider body and never retry.';
});
await test('Reported model mismatch fails and low usage retains documented billing floor', async () => {
  const mismatch = optionsFor('model-mismatch'); const wrong = fakeNetwork(approved, { taskModel: 'unexpected-model' }); await assert.rejects(runStudy(approved, { ...mismatch, fetchImpl: wrong.fetchImpl }), /model/); assert(!existsSync(mismatch.outputPath));
  const floor = optionsFor('billing-floor'); const low = fakeNetwork(approved, { totalTokens: 1 }); const result = await runStudy(approved, { ...floor, fetchImpl: low.fetchImpl }); assert.equal(result.cost.successful_generation_with_documented_floor, 100440 * 4.3 / 1_000_000); assert.equal(result.cost.actual_total_bill, null); return 'Fixture math preserves token floor; account bill stays explicitly unknown.';
});
await test('Failed signed probe before paid submission cleans only confirmed owned object', async () => {
  const options = optionsFor('prepaid-probe-failure'); const network = fakeNetwork(approved, { probeStatus: 200 }); await assert.rejects(runStudy(approved, { ...options, fetchImpl: network.fetchImpl }), /Signed media probe/);
  const ledger = JSON.parse(readFileSync(options.ledgerPath)); assert.equal(ledger.paid_post_attempts, 0); assert.equal(ledger.staging.cleanup, 'confirmed'); assert.equal(network.calls.filter(call => call.url === approved.endpoint && call.method === 'POST').length, 0);
  const deletes = network.calls.filter(call => call.method === 'DELETE'); assert.equal(deletes.length, 1); assert.deepEqual(JSON.parse(deletes[0].body), { prefixes: [approved.staging.object_key] }); for (const saved of persisted(options)) assertNoSecrets(saved); return 'Confirmed input deleted exactly, no paid task could have been created.';
});
await test('Unknown upload result stops without retry or unsafe cleanup of unconfirmed key', async () => {
  const options = optionsFor('unknown-upload'); const network = fakeNetwork(approved, { uploadError: new Error(`timeout ${signedUrl} ${fakeEnv.SUPABASE_SERVICE_ROLE_KEY}`) }); await assert.rejects(runStudy(approved, { ...options, fetchImpl: network.fetchImpl }), /network result unknown; no automatic retry/);
  const ledger = JSON.parse(readFileSync(options.ledgerPath)); assert.equal(ledger.paid_post_attempts, 0); assert.equal(ledger.upload_attempts, 1); assert.equal(ledger.staging.cleanup, 'pending'); assert.equal(network.calls.filter(call => call.method === 'DELETE').length, 0); assert.equal(network.calls.filter(call => call.url === approved.endpoint && call.method === 'POST').length, 0); for (const saved of persisted(options)) assertNoSecrets(saved); return 'No paid POST, unconfirmed upload retained for exact-key investigation; no auto retry.';
});
await test('Untracked, partial and mutated existing output rejects before any network', async () => {
  for (const variant of ['untracked', 'partial', 'mutated']) {
    const options = optionsFor('existing-output-' + variant); const validRecord = { path: 'assets/blender-reveal/byteplus-motion-transfer.mp4', bytes: videoBytes.length, sha256: digestBytes(videoBytes) };
    seedResume(options, variant === 'untracked' ? {} : { output: validRecord });
    const bytes = variant === 'partial' ? videoBytes.subarray(0, 15) : Buffer.from(videoBytes); if (variant === 'mutated') bytes[bytes.length - 1] ^= 1; writeFileSync(options.outputPath, bytes);
    const originalLedger = JSON.parse(readFileSync(options.ledgerPath, 'utf8')); let fetchCalls = 0; await assert.rejects(runStudy(approved, { ...options, mode: 'resume', fetchImpl: async () => { fetchCalls++; throw new Error('No network permitted'); } }), /Existing output/);
    assert.equal(fetchCalls, 0); const after = JSON.parse(readFileSync(options.ledgerPath, 'utf8')); for (const [field, value] of Object.entries(originalLedger)) assert.deepEqual(after[field], value, 'Rejected resume must preserve recorded task/attempt/output identity'); assert.match(after.last_error, /Existing output/); assert.deepEqual(readFileSync(options.outputPath), bytes, 'Rejected output must not be overwritten');
  }
  const execute = optionsFor('execute-existing-output'); writeFileSync(execute.outputPath, videoBytes); let executeCalls = 0; await assert.rejects(runStudy(approved, { ...execute, fetchImpl: async () => { executeCalls++; } }), /Local output already exists/); assert.equal(executeCalls, 0); return 'All four collision/corruption variants stop before fetch, retain evidence and bytes.';
});
await test('Exact existing output passes recorded resume without re-downloading', async () => {
  const options = optionsFor('existing-output-exact'); writeFileSync(options.outputPath, videoBytes); seedResume(options, { output: { path: 'assets/blender-reveal/byteplus-motion-transfer.mp4', bytes: videoBytes.length, sha256: digestBytes(videoBytes) } });
  const network = fakeNetwork(approved); const result = await runStudy(approved, { ...options, mode: 'resume', fetchImpl: network.fetchImpl }); assert.equal(result.outputDownloaded, true); assert.equal(result.cleanup, 'confirmed'); assert(network.calls.every(call => call.method === 'GET' && call.url === `${approved.endpoint}/${taskId}` || call.method === 'DELETE')); assert(!network.calls.some(call => call.url === outputUrl)); assert.deepEqual(readFileSync(options.outputPath), videoBytes); for (const saved of persisted(options)) assertNoSecrets(saved); return 'Verified length+SHA retained; only task GET and exact-key cleanup performed.';
});
await test('Known model/access/account rejection consumes exactly one attempt and cleans confirmed object', async () => {
  for (const [status, code] of [[404, 'ModelNotOpen'], [403, 'AccountOverdueError'], [403, 'OperationDenied.ServiceOverdue']]) {
    const options = optionsFor('rejection-' + code.replaceAll('.', '-')); const response = json({ error: { code, message: `${signedUrl} ${fakeEnv.ARK_API_KEY}` } }, status); const network = fakeNetwork(approved, { paidPostResponse: response }); let caught;
    try { await runStudy(approved, { ...options, fetchImpl: network.fetchImpl }); } catch (error) { caught = error; }
    assert(caught); assertNoSecrets(caught.message); const ledger = JSON.parse(readFileSync(options.ledgerPath)); assert.equal(ledger.paid_post_attempts, 1); assert.equal(ledger.staging.cleanup, 'confirmed'); assert.equal(network.calls.filter(call => call.method === 'POST' && call.url === approved.endpoint).length, 1); const deletes = network.calls.filter(call => call.method === 'DELETE'); assert.equal(deletes.length, 1); assert.deepEqual(JSON.parse(deletes[0].body), { prefixes: [approved.staging.object_key] }); for (const saved of persisted(options)) assertNoSecrets(saved);
    assert(network.calls.every(call => call.url.startsWith(approved.endpoint) || call.url.startsWith('https://smoke-only.supabase.co/storage/v1/')), 'No activation/funding endpoint may be called'); let secondCalls = 0; await assert.rejects(runStudy(approved, { ...options, fetchImpl: async () => { secondCalls++; } }), /Attempt ledger exists/); assert.equal(secondCalls, 0);
  } return '404 ModelNotOpen and two 403 overdue codes stop, exact-key clean, no retries or funding.';
});
await test('Malicious provider error code and message withheld; uncertain rejection retains cleanup pending', async () => {
  const options = optionsFor('malicious-provider-code'); const response = json({ error: { code: `ModelNotOpen ${signedUrl} ${fakeEnv.ARK_API_KEY}`, message: signedUrl + fakeEnv.SUPABASE_SERVICE_ROLE_KEY } }, 404); const network = fakeNetwork(approved, { paidPostResponse: response }); let caught;
  try { await runStudy(approved, { ...options, fetchImpl: network.fetchImpl }); } catch (error) { caught = error; } assert(caught); assertNoSecrets(caught.message); for (const saved of persisted(options)) assertNoSecrets(saved); const ledger = JSON.parse(readFileSync(options.ledgerPath)); assert.equal(ledger.paid_post_attempts, 1); assert.equal(ledger.staging.cleanup, 'pending'); assert.equal(network.calls.filter(call => call.method === 'DELETE').length, 0); return 'Unallowlisted error code is never echoed or treated as proven safe terminal rejection.';
});
await test('2.0 account-access approval is explicit without invented account verification', async () => {
  assert.equal(approved.approval.account_verified, false); assert.equal(approved.approval.account_access_check, 'single_approved_submission_no_funding'); validateStudy(approved, workspace, true);
  const changed = structuredClone(approved); changed.approval.account_access_check = 'unverified_funding_permitted'; assert.throws(() => validateStudy(changed, workspace, true)); for (const field of ['omni_reference_task_type', 'draft', 'output_format']) { assert(!(field in approved.request)); const altered = structuredClone(approved); altered.request[field] = 'unsupported'; assert.throws(() => validateStudy(altered, workspace, true)); }
  return 'Model access tested by single request only; old 2.5-only fields rejected.';
});
await test('Authenticated-task actual CDN works through GET-only resume without media auth', async () => {
  const actualCdn = 'https://ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com/test-output.mp4?token=FAKE_OUTPUT_CAPABILITY_MUST_NOT_EMIT';
  const options = optionsFor('actual-cdn-resume'); seedResume(options, { last_error: 'Remote host is not allowlisted' }); const network = fakeNetwork(approved, { outputUrl: actualCdn });
  const result = await runStudy(approved, { ...options, mode: 'resume', fetchImpl: network.fetchImpl }); assert.equal(result.outputDownloaded, true); assert.equal(result.paidSubmissions, 1); assert.equal(result.cleanup, 'confirmed'); assert(network.calls.every(call => ['GET', 'DELETE'].includes(call.method)));
  const download = network.calls.find(call => call.url === actualCdn); assert(download); assert.equal(download.method, 'GET'); assert.deepEqual(download.headers, {}); const ledger = JSON.parse(readFileSync(options.ledgerPath)); assert(!('last_error' in ledger)); assert.equal(ledger.paid_post_attempts, 1); assert.equal(ledger.output.sha256, digestBytes(videoBytes)); assertNoSecrets(result); for (const saved of persisted(options)) assertNoSecrets(saved); return 'Exact production CDN accepted in fake GET-only recovery; no auth/media POST and stale download error cleared.';
});
await test('Hostile suffix and URL userinfo rejected before any media fetch', async () => {
  for (const [name, hostile] of [['suffix', 'https://ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com.evil.example/output.mp4?token=FAKE_OUTPUT_CAPABILITY_MUST_NOT_EMIT'], ['userinfo', 'https://FAKE_OUTPUT_CAPABILITY_MUST_NOT_EMIT@ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com/output.mp4']]) {
    const options = optionsFor('actual-cdn-hostile-' + name); seedResume(options); const network = fakeNetwork(approved, { outputUrl: hostile }); await assert.rejects(runStudy(approved, { ...options, mode: 'resume', fetchImpl: network.fetchImpl }), /Remote (host|URL)/); assert(!network.calls.some(call => call.url === hostile)); assert(network.calls.every(call => ['GET', 'DELETE'].includes(call.method))); assert(!existsSync(options.outputPath)); for (const saved of persisted(options)) assertNoSecrets(saved);
  } return 'Exact hostname matching and no URL credentials enforced before media fetch.';
});

const sourceHashAtEnd = await import('node:crypto').then(({ createHash }) => createHash('sha256').update(readFileSync('tools/run_byteplus_motion_transfer.mjs')).digest('hex'));
const report = { offline_only: true, real_environment_loaded: false, cloud_calls: 0, paid_calls: 0, source_sha256_start: sourceHashAtStart, source_sha256_end: sourceHashAtEnd, records, totals: { pass: records.filter(record => record.status === 'PASS').length, fail: records.filter(record => record.status === 'FAIL').length }, limitations: ['Fake fetch fixtures verify local guard behavior only.', 'No live provider entitlement, billing, storage or playable output proved.', 'No real secret values read or loaded.'] };
writeFileSync(join(fixtureRoot, 'report.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ report: join(fixtureRoot, 'report.json'), ...report }, null, 2));
process.exitCode = report.totals.fail > 0 || sourceHashAtStart !== sourceHashAtEnd ? 1 : 0;
