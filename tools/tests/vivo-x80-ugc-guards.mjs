import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';

// Independent offline guards. Every mutable study path lives in a copied fake workspace.
// This harness never executes against the real workspace or loads its environment.
const project = resolve('.');
const runnerPath = resolve('tools/run_vivo_x80_ugc.mjs');
const sourceBefore = readFileSync(runnerPath, 'utf8');
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const sourceShaBefore = sha256(sourceBefore);
const { approvalDigest, validateStudy, runStudy } = await import(pathToFileURL(runnerPath).href);
const specPath = 'assets/vivo-x80-ugc/seedance20.spec.json';
const ledgerPath = '.tmp/vivo-x80-ugc/attempt.json';
const evidencePath = 'assets/vivo-x80-ugc/seedance20-run.json';
const outputPath = 'assets/vivo-x80-ugc/seedance20-raw.mp4';
const oldLedgerPath = '.tmp/byteplus-motion-transfer/attempt.json';
const oldOutputPath = 'assets/blender-reveal/byteplus-motion-transfer.mp4';
const proposal = JSON.parse(readFileSync(specPath, 'utf8'));
const reportPath = 'assets/vivo-x80-ugc/offline-verification.json';
const fixtureRoot = resolve('.tmp/vivo-x80-ugc-guards/run-' + Date.now());
mkdirSync(fixtureRoot, { recursive: true });
const fakeEnv = { SystemRoot: 'C:/Windows', ARK_API_KEY: 'FAKE_VIVO_ARK_SECRET', SUPABASE_SERVICE_ROLE_KEY: 'FAKE_VIVO_STORAGE_SECRET', SUPABASE_URL: 'https://smoke-only.supabase.co' };
const markers = [fakeEnv.ARK_API_KEY, fakeEnv.SUPABASE_SERVICE_ROLE_KEY, 'FAKE_VIVO_SIGNED_CAPABILITY', 'FAKE_VIVO_OUTPUT_CAPABILITY'];
const taskId = 'vivo_fake_task_1';
const outputUrl = 'https://ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com/fake-vivo.mp4?token=FAKE_VIVO_OUTPUT_CAPABILITY';
const fakeVideo = Buffer.from('0000ftypisomVIVO_MOCK_CONTAINER_ONLY');
const cases = [];
let caseIndex = 0;
const approved = source => { const result = structuredClone(source); result.status = 'approved_for_single_byteplus_test'; result.approval = { ...result.approval, approved: true, request_sha256: approvalDigest(result), account_access_check: 'single_approved_submission_no_funding', pricing_verified: true, staging_approved: true, exact_paid_tuple_approval: 'FAKE OFFLINE ATTESTATION ONLY; no human or provider approval inferred' }; return result; };
const pending = structuredClone(proposal); pending.status = 'pending_exact_paid_approval'; pending.approval.approved = false; pending.approval.request_sha256 = null; pending.approval.staging_approved = false; pending.approval.exact_paid_tuple_approval = 'pending exact paid approval';
const study = approved(proposal);
function file(workspace, relativePath) { return resolve(workspace, relativePath); }
function save(path, value) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value, null, 2)); }
function fixture(name, spec = study) {
  const workspace = join(fixtureRoot, `${++caseIndex}-${name}`); mkdirSync(workspace, { recursive: true });
  for (const asset of proposal.assets) { const target = file(workspace, asset.path); mkdirSync(dirname(target), { recursive: true }); copyFileSync(file(project, asset.path), target); }
  save(file(workspace, specPath), spec);
  save(file(workspace, oldLedgerPath), 'EXHAUSTED_BOTTLE_LEDGER_CANARY_DO_NOT_READ_OR_WRITE');
  save(file(workspace, oldOutputPath), Buffer.from('ORIGINAL_BOTTLE_OUTPUT_CANARY_UNCHANGED'));
  return { workspace, mode: 'execute', env: fakeEnv, sleep: async () => {} };
}
function assertCanaries(options) { assert.equal(readFileSync(file(options.workspace, oldLedgerPath), 'utf8'), 'EXHAUSTED_BOTTLE_LEDGER_CANARY_DO_NOT_READ_OR_WRITE'); assert.equal(readFileSync(file(options.workspace, oldOutputPath), 'utf8'), 'ORIGINAL_BOTTLE_OUTPUT_CANARY_UNCHANGED'); }
function assertWithheld(value) { const text = typeof value === 'string' ? value : JSON.stringify(value); for (const marker of markers) assert(!text.includes(marker), 'Fake auth/capability appeared in externally returned or persisted evidence'); }
function persisted(options) { return [ledgerPath, evidencePath].map(path => file(options.workspace, path)).filter(existsSync).map(path => readFileSync(path, 'utf8')); }
function ledger(options) { return JSON.parse(readFileSync(file(options.workspace, ledgerPath), 'utf8')); }
function seedResume(options, extras = {}) {
  const value = { study: study.study, model: study.request.model, approval_digest: approvalDigest(study), request: study.request, assets: study.assets, paid_post_attempts: 1, upload_attempts: 1, client_retries: 0, maximum_cost_usd: 5, task_id: taskId, status: 'submitted', staging: { bucket: study.staging.bucket, object_key: study.staging.object_key, private_bucket_verified: true, upload_confirmed: true, cleanup: 'pending' }, ...extras };
  save(file(options.workspace, ledgerPath), value); return value;
}
const json = (value, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
function network(spec = study, config = {}) {
  const calls = [];
  const signedUrl = `https://smoke-only.supabase.co/storage/v1/object/sign/${spec.staging.bucket}/${spec.staging.object_key}?token=FAKE_VIVO_SIGNED_CAPABILITY`;
  const actualOutput = config.outputUrl ?? outputUrl;
  const fetchImpl = async (input, init = {}) => {
    const url = String(input), method = init.method ?? 'GET'; calls.push({ url, method, headers: init.headers ?? {}, body: init.body }); assert.equal(init.redirect, 'error');
    if (url === `${spec.endpoint}?page_num=1&page_size=1`) return json({ items: [] });
    if (url.endsWith(`/storage/v1/bucket/${spec.staging.bucket}`)) return json({ id: spec.staging.bucket, public: config.publicBucket ?? false });
    if (url.includes('/storage/v1/object/sign/') && method === 'POST') return json({ signedURL: config.signedPath ?? `/object/sign/${spec.staging.bucket}/${spec.staging.object_key}?token=FAKE_VIVO_SIGNED_CAPABILITY` });
    if (url === signedUrl && method === 'GET') return new Response(Buffer.from([0]), { status: config.probeStatus ?? 206, headers: { 'content-range': `bytes 0-0/${spec.staging.input_bytes}` } });
    if (url.endsWith(`/storage/v1/object/${spec.staging.bucket}/${spec.staging.object_key}`) && method === 'POST') { if (config.uploadError) throw config.uploadError; return json({ Key: `${spec.staging.bucket}/${spec.staging.object_key}` }); }
    if (url === spec.endpoint && method === 'POST') { if (config.postError) throw config.postError; return config.postResponse ?? json({ id: taskId }); }
    if (url === `${spec.endpoint}/${taskId}` && method === 'GET') return json({ id: taskId, model: config.model ?? spec.request.model, status: config.status ?? 'succeeded', usage: { completion_tokens: config.tokens ?? 301320, total_tokens: 301333 }, content: { video_url: actualOutput } });
    if (url.endsWith(`/storage/v1/object/${spec.staging.bucket}`) && method === 'DELETE') return json([{ name: spec.staging.object_key }]);
    if (url === actualOutput && method === 'GET') return new Response(fakeVideo);
    throw new Error('Unmatched simulated request; real networking is never permitted');
  };
  return { calls, fetchImpl, signedUrl };
}
function cliMock(options, tokens = 301320) {
  const preload = file(options.workspace, 'fake-cli-network.mjs');
  const logPath = file(options.workspace, '.tmp/fake-network.jsonl');
  const source = `import fs from 'node:fs';import {resolve,dirname} from 'node:path';import {syncBuiltinESMExports} from 'node:module';import http from 'node:http';import https from 'node:https';
const spec=JSON.parse(fs.readFileSync(${JSON.stringify(file(options.workspace, specPath))},'utf8'));
const oldPaths=new Set(${JSON.stringify([file(options.workspace, oldLedgerPath), file(options.workspace, oldOutputPath)])});
const originalRead=fs.readFileSync;fs.readFileSync=(path,...args)=>{if(oldPaths.has(resolve(String(path))))throw new Error('OLD_STUDY_READ_FORBIDDEN');return originalRead(path,...args)};syncBuiltinESMExports();
const deny=()=>{throw new Error('REAL_NETWORK_FORBIDDEN')};http.request=deny;http.get=deny;https.request=deny;https.get=deny;
const log=${JSON.stringify(logPath)},task=${JSON.stringify(taskId)},output=${JSON.stringify(outputUrl)};
const signed='https://smoke-only.supabase.co/storage/v1/object/sign/'+spec.staging.bucket+'/'+spec.staging.object_key+'?token=FAKE_VIVO_SIGNED_CAPABILITY';
const json=v=>new Response(JSON.stringify(v),{headers:{'content-type':'application/json'}});
globalThis.fetch=async(input,init={})=>{const url=String(input),method=init.method??'GET';fs.mkdirSync(dirname(log),{recursive:true});fs.appendFileSync(log,JSON.stringify({url,method,headers:init.headers??{}})+'\\n');if(init.redirect!=='error')throw new Error('REDIRECT_POLICY_FAILED');
if(url===spec.endpoint+'?page_num=1&page_size=1')return json({items:[]});
if(url.endsWith('/storage/v1/bucket/'+spec.staging.bucket))return json({id:spec.staging.bucket,public:false});
if(url.includes('/storage/v1/object/sign/')&&method==='POST')return json({signedURL:'/object/sign/'+spec.staging.bucket+'/'+spec.staging.object_key+'?token=FAKE_VIVO_SIGNED_CAPABILITY'});
if(url===signed&&method==='GET')return new Response(Buffer.from([0]),{status:206,headers:{'content-range':'bytes 0-0/'+spec.staging.input_bytes}});
if(url.endsWith('/storage/v1/object/'+spec.staging.bucket+'/'+spec.staging.object_key)&&method==='POST')return json({Key:spec.staging.bucket+'/'+spec.staging.object_key});
if(url===spec.endpoint&&method==='POST')return json({id:task});
if(url===spec.endpoint+'/'+task&&method==='GET')return json({id:task,model:spec.request.model,status:'succeeded',usage:{completion_tokens:${tokens},total_tokens:301333},content:{video_url:output}});
if(url.endsWith('/storage/v1/object/'+spec.staging.bucket)&&method==='DELETE')return json([{name:spec.staging.object_key}]);
if(url===output&&method==='GET')return new Response(Buffer.from(${JSON.stringify([...fakeVideo])}));
throw new Error('UNEXPECTED_OFFLINE_REQUEST')};`;
  save(preload, source);
  const copiedRunner = file(options.workspace, 'tools/run_vivo_x80_ugc.mjs'); save(copiedRunner, sourceBefore);
  return { logPath, run(flags) { return spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, copiedRunner, ...flags], { cwd: options.workspace, env: fakeEnv, encoding: 'utf8' }); } };
}
async function test(name, body) {
  let timer;
  try { const detail = await Promise.race([body(), new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Offline case deadline exceeded')), 8000); })]); cases.push({ name, status: 'PASS', detail }); }
  catch (error) { cases.push({ name, status: 'FAIL', error: markers.some(marker => String(error.message).includes(marker)) ? 'Fake credential-bearing diagnostic withheld' : error.message }); }
  finally { clearTimeout(timer); }
}

await test('Pending execute and resume fail before environment reads or network', async () => {
  for (const mode of ['execute', 'resume']) { const options = fixture('pending-' + mode, pending); let calls = 0; await assert.rejects(runStudy(pending, { ...options, mode, env: new Proxy({}, { get() { throw new Error('Environment read forbidden'); } }), fetchImpl: async () => { calls++; } }), /approval.*attested/); assert.equal(calls, 0); assert(!existsSync(file(options.workspace, ledgerPath))); assertCanaries(options); }
  return 'Both modes blocked without touching credentials, attempt ledger or old-study canaries.';
});
await test('Default and explicit dry CLI are network-free and pending paid modes fail safely', async () => {
  const options = fixture('cli-pending', pending); const preload = file(options.workspace, 'deny-network.mjs'); save(preload, "import http from 'node:http';import https from 'node:https';const block=()=>{throw new Error('OFFLINE_NETWORK_DENIED')};globalThis.fetch=block;http.request=block;http.get=block;https.request=block;https.get=block;");
  const exits = [];
  for (const flags of [[], ['--dry-run'], ['--execute'], ['--resume']]) { const child = spawnSync(process.execPath, ['--import', pathToFileURL(preload).href, runnerPath, ...flags], { cwd: options.workspace, env: fakeEnv, encoding: 'utf8' }); exits.push({ flags, exit_code: child.status }); assert.equal(child.status, flags.includes('--execute') || flags.includes('--resume') ? 1 : 0); assertWithheld(child.stdout + child.stderr); assert(!child.stderr.includes('OFFLINE_NETWORK_DENIED')); if (child.status === 0) { const result = JSON.parse(child.stdout); assert.equal(result.networkRequests, 0); assert.equal(result.mediaUploads, 0); assert.equal(result.paidSubmissions, 0); assert.equal(result.executionReady, false); } }
  assert(!existsSync(file(options.workspace, ledgerPath))); assert(!existsSync(file(options.workspace, outputPath))); assertCanaries(options); return exits;
});
await test('Dry readiness names every attestation and never implies an account balance check', async () => {
  const options = fixture('readiness'); const complete = await runStudy(study, { ...options, mode: 'dry-run', env: new Proxy({}, { get() { throw new Error('Environment read forbidden'); } }), fetchImpl: async () => { throw new Error('Network forbidden'); } }); assert.equal(complete.executionReady, true); assert.match(complete.accountStatus, /unverified/); assert.match(complete.privateBucketPreflight, /pending/);
  for (const [field, changed, expected] of [['status', 'pending_exact_paid_approval', 'status'], ['approved', false, 'approved'], ['request_sha256', '0'.repeat(64), 'matching_digest'], ['account_access_check', 'funded_account', 'single_no_funding_access_trial'], ['pricing_verified', false, 'pricing_verified'], ['staging_approved', false, 'user_staging_approved'], ['exact_paid_tuple_approval', 'pending approval', 'exact_paid_tuple_approval']]) { const spec = structuredClone(study); if (field === 'status') spec.status = changed; else spec.approval[field] = changed; const result = await runStudy(spec, { ...options, mode: 'dry-run', env: {} }); assert.equal(result.executionReady, false); assert.equal(result.approvalChecks[expected], false); assert(result.missingAttestations.includes(expected)); for (const mode of ['execute','resume']) { let envReads=0,networkCalls=0; await assert.rejects(runStudy(spec,{...options,mode,env:new Proxy({},{get(){envReads++;throw new Error('Environment forbidden');}}),fetchImpl:async()=>{networkCalls++;}}),/approval.*attested/);assert.equal(envReads,0);assert.equal(networkCalls,0); } }
  return 'Seven independent attestations each block execute and resume before credentials or networking; fresh bucket privacy still needs runtime GET.';
});
await test('Copied-source actual approved CLI uses only Vivo defaults through execute and resume', async () => {
  const options=fixture('cli-approved-isolation');const mock=cliMock(options);const exits=[];
  for(const flags of [[],['--execute'],['--resume'],['--execute']]) {const child=mock.run(flags);exits.push({flags,exit_code:child.status});assert.equal(child.status,exits.length===4?1:0);assertWithheld(child.stdout+child.stderr);assert(!/OLD_STUDY_READ_FORBIDDEN|REAL_NETWORK_FORBIDDEN/.test(child.stderr));if(child.status===0){const result=JSON.parse(child.stdout);assert.equal(result.approvalDigest,approvalDigest(study));if(flags.length)assert.equal(result.outputDownloaded,true);else assert.equal(result.networkRequests,0);}}
  const calls=readFileSync(mock.logPath,'utf8').trim().split('\n').map(JSON.parse);assert.equal(calls.filter(c=>c.url===study.endpoint&&c.method==='POST').length,1);assert.equal(calls.filter(c=>c.method==='POST'&&c.url.endsWith(`/object/${study.staging.bucket}/${study.staging.object_key}`)).length,1);assert.equal(calls.filter(c=>c.url===outputUrl).length,1);assert.equal(ledger(options).study,study.study);assert(existsSync(file(options.workspace,evidencePath)));assert(existsSync(file(options.workspace,outputPath)));assertCanaries(options);return exits;
});
await test('Media bytes, source metadata and exact 15s portrait/audio settings reject drift', async () => {
  for (const mutate of [s => s.request.duration = 6, s => s.request.ratio = '16:9', s => s.request.resolution = '720p', s => s.request.generate_audio = false, s => s.request.model = 'alternate-model', s => s.request.content[0].text += '\nIncorrect offline drift.', s => s.assets[0].duration_seconds = 14, s => s.assets[1].sha256 = '0'.repeat(64)]) { const spec = structuredClone(study); mutate(spec); spec.approval.request_sha256 = approvalDigest(spec); const options = fixture('settings-drift'); assert.throws(() => validateStudy(spec, options.workspace, true), /proposal changed/); }
  for (const asset of proposal.assets) { const options = fixture('byte-drift'); const target = file(options.workspace, asset.path); const bytes = readFileSync(target); bytes[bytes.length - 1] ^= 1; writeFileSync(target, bytes); assert.throws(() => validateStudy(study, options.workspace, true), /input bytes/); }
  return 'Fresh synthetic approval digests cannot authorize changed fixed proposal; each real copied media hash was exercised.';
});
await test('Cost, staging and proposal prose drift cannot be smuggled through fresh digests', async () => {
  for (const mutate of [s => s.budget.maximum_total_cost = 6, s => s.budget.maximum_paid_submissions = 2, s => s.budget.automatic_client_retries = 1, s => s.budget.top_ups_allowed = true, s => s.budget.rate_usd_per_million_tokens = 4.5, s => s.budget.minimum_tokens_for_fifteen_second_480p_9_16_with_video = 1, s => s.budget.staging_fee_reserve_usd = 0, s => s.staging.object_key = 'other/key.mp4', s => s.staging.public_publication = true, s => s.pass_criteria.push('Incorrect extra criterion')]) { const spec = structuredClone(study); mutate(spec); spec.approval.request_sha256 = approvalDigest(spec); const options = fixture('proposal-drift'); assert.throws(() => validateStudy(spec, options.workspace, true), /proposal changed/); }
  const changedApproval = structuredClone(study); changedApproval.approval.request_sha256 = '0'.repeat(64); assert.throws(() => validateStudy(changedApproval, fixture('stale-digest').workspace, true), /approval.*attested/); return 'Generation cost and full proposal are pinned; stale approval digest rejected.';
});
await test('Injected runtime and CLI spec escapes reject before environment or networking', async () => {
  for (const key of ['ledgerPath', 'evidencePath', 'outputPath']) { const options = fixture('path-escape'); let calls = 0; await assert.rejects(runStudy(study, { ...options, mode: 'dry-run', [key]: resolve(options.workspace, '../escape-' + key), env: new Proxy({}, { get() { throw new Error('Environment forbidden'); } }), fetchImpl: async () => { calls++; } }), /exact Vivo study paths/); assert.equal(calls, 0); assertCanaries(options); }
  const options = fixture('cli-spec-escape', pending); const child = spawnSync(process.execPath, [runnerPath, '--dry-run', '--spec', oldLedgerPath], { cwd: options.workspace, env: fakeEnv, encoding: 'utf8' }); assert.equal(child.status, 1); assert.match(child.stderr, /exact Vivo study paths/); assertCanaries(options); return 'All three injected outputs and wrong CLI --spec rejected; no old canary parsed.';
});
await test('Runtime ancestor junction cannot redirect a fixed study path', async () => {
  const options = fixture('runtime-junction'); const outside = join(fixtureRoot, 'junction-runtime-target'); mkdirSync(outside, { recursive: true }); const parent = file(options.workspace, '.tmp/vivo-x80-ugc'); mkdirSync(dirname(parent), { recursive: true }); symlinkSync(outside, parent, 'junction'); assert(lstatSync(parent).isSymbolicLink()); let calls = 0; await assert.rejects(runStudy(study, { ...options, mode: 'dry-run', fetchImpl: async () => { calls++; } }), /symbolic links|junction/); assert.equal(calls, 0); assert(!existsSync(join(outside, 'attempt.json'))); return 'Junction parent blocked before any redirected ledger creation.';
});
await test('Injected workspace root junction is rejected instead of silently following it', async () => {
  const options = fixture('workspace-target'); const linked = join(fixtureRoot, 'workspace-root-junction'); symlinkSync(options.workspace, linked, 'junction'); assert(lstatSync(linked).isSymbolicLink()); let calls = 0; await assert.rejects(runStudy(study, { ...options, workspace: linked, mode: 'dry-run', fetchImpl: async () => { calls++; } }), /symbolic links|junction/); assert.equal(calls, 0); return 'The workspace root itself is a path component, not an unchecked trust boundary.';
});
await test('Public bucket metadata prevents any upload or ledger reservation', async () => {
  for(const bucket of [{id:study.staging.bucket,public:true},{id:study.staging.bucket},{id:'wrong-bucket',public:false},{id:study.staging.bucket,public:'false'},null]) {const options=fixture('unsafe-bucket'),mock=network();const fetchImpl=async(url,init)=>String(url).includes('/storage/v1/bucket/')?(mock.calls.push({url:String(url),method:init.method??'GET'}),json(bucket)):mock.fetchImpl(url,init);await assert.rejects(runStudy(study,{...options,fetchImpl}));assert.equal(mock.calls.length,2);assert(mock.calls.every(call=>call.method==='GET'));assert(!existsSync(file(options.workspace,ledgerPath)));assertCanaries(options);}return 'Public, missing, wrong-identity, mistyped and null bucket metadata all stop before local reservation or cloud write.';
});
await test('Reported usage honors the 251100 floor and flags cap overruns without hiding billing uncertainty', async () => {
  for(const tokens of [1,301320,2000000]) {const options=fixture('usage-'+tokens),mock=network(study,{tokens});const result=await runStudy(study,{...options,fetchImpl:mock.fetchImpl});const expected=Math.max(tokens,251100)*4.3/1000000;assert.equal(result.cost.successful_generation_with_documented_floor,expected);assert.equal(result.cost.generation_from_reported_tokens,tokens*4.3/1000000);assert.equal(result.cost.within_approved_estimate,expected+.01<=5);assert.equal(result.cost.actual_total_bill,null);assert.match(result.cost.usage_basis,/completion_tokens/);assert.equal(mock.calls.filter(c=>c.url===study.endpoint&&c.method==='POST').length,1);}
  const options=fixture('cli-overrun'),mock=cliMock(options,2000000),child=mock.run(['--execute']);assert.equal(child.status,1);const summary=JSON.parse(child.stdout);assert.equal(summary.cost.within_approved_estimate,false);assert.equal(summary.status,'succeeded');assert.equal(summary.cleanup,'confirmed');assert.equal(summary.cost.actual_total_bill,null);assertWithheld(child.stdout+child.stderr);return 'Successful billing floor and reported-token overrun are distinct from invoice proof; overrun makes copied CLI exit 1 without another submission.';
});
await test('Exact private create-only flow separates credentials and withholds capabilities', async () => {
  const options = fixture('success'); const mock = network(); const result = await runStudy(study, { ...options, fetchImpl: mock.fetchImpl }); assert.equal(result.outputDownloaded, true); assert.equal(result.paidSubmissions, 1); assert.equal(result.cleanup, 'confirmed'); const upload = mock.calls.find(call => call.method === 'POST' && call.url.endsWith(`/object/${study.staging.bucket}/${study.staging.object_key}`)); assert.equal(upload.headers['x-upsert'], 'false'); assert.equal(upload.body.length, proposal.staging.input_bytes); const sign = mock.calls.find(call => call.method === 'POST' && call.url.includes('/object/sign/')); assert.deepEqual(JSON.parse(sign.body), { expiresIn: 7200 }); const probe = mock.calls.find(call => call.url === mock.signedUrl); assert.deepEqual(probe.headers, { Range: 'bytes=0-0' }); const paid = mock.calls.find(call => call.url === study.endpoint && call.method === 'POST'); assert.equal(paid.headers.Authorization, `Bearer ${fakeEnv.ARK_API_KEY}`); assert(!('apikey' in paid.headers)); const request = JSON.parse(paid.body); assert.equal(request.duration, 15); assert.equal(request.ratio, '9:16'); assert.equal(request.generate_audio, true); assert.equal(request.content[1].video_url.url, mock.signedUrl); assert(request.content[2].image_url.url.startsWith('data:image/png;base64,')); const download = mock.calls.find(call => call.url === outputUrl); assert.deepEqual(download.headers, {}); const deletes = mock.calls.filter(call => call.method === 'DELETE'); assert.equal(deletes.length, 1); assert.deepEqual(JSON.parse(deletes[0].body), { prefixes: [study.staging.object_key] }); assertWithheld(result); for (const saved of persisted(options)) assertWithheld(saved); assert.equal(ledger(options).request.content[1].video_url.url, '{{SIGNED_CAMERA_REFERENCE_URL}}'); assertCanaries(options); return 'One upload/POST, exact cleanup, placeholder evidence and mock container integrity verified; no real media/provider output inferred.';
});
await test('Duplicate execute never makes another request or alters the completed attempt', async () => {
  const options = fixture('duplicate'); const mock = network(); await runStudy(study, { ...options, fetchImpl: mock.fetchImpl }); const before = readFileSync(file(options.workspace, ledgerPath), 'utf8'); let calls = 0; await assert.rejects(runStudy(study, { ...options, fetchImpl: async () => { calls++; } }), /Attempt ledger exists/); assert.equal(calls, 0); assert.equal(readFileSync(file(options.workspace, ledgerPath), 'utf8'), before); return 'Second execution stopped before any authenticated request.';
});
await test('Concurrent contenders reserve exactly one upload and POST without overwriting winner', async () => {
  const options = fixture('concurrent'); const mock = network(); let arrivals = 0, releaseBuckets, reachedPost, releasePost; const buckets = new Promise(done => { releaseBuckets = done; }), postReached = new Promise(done => { reachedPost = done; }), postGate = new Promise(done => { releasePost = done; }); const fetchImpl = async (url, init) => { if (String(url).includes('/storage/v1/bucket/')) { if (++arrivals === 2) releaseBuckets(); await buckets; } if (String(url) === study.endpoint && init.method === 'POST') { reachedPost(); await postGate; } return mock.fetchImpl(url, init); }; const contenders = [runStudy(study, { ...options, fetchImpl }), runStudy(study, { ...options, fetchImpl })]; const lost = Promise.race(contenders.map(promise => promise.then(() => null, error => error))); await postReached; assert(await lost); assert.equal(ledger(options).paid_post_attempts, 1); assert.equal(ledger(options).staging.upload_confirmed, true); releasePost(); const results = await Promise.allSettled(contenders); assert.equal(results.filter(result => result.status === 'fulfilled').length, 1); assert.equal(mock.calls.filter(call => call.method === 'POST' && call.url === study.endpoint).length, 1); assert.equal(mock.calls.filter(call => call.method === 'POST' && call.url.endsWith(`/object/${study.staging.bucket}/${study.staging.object_key}`)).length, 1); return 'Exclusive reservation survives loser rejection while winner POST is deliberately held in flight.';
});
await test('Unknown upload result never retries or deletes an unconfirmed object', async () => {
  const options = fixture('unknown-upload'); const mock = network(study, { uploadError: new Error(fakeEnv.SUPABASE_SERVICE_ROLE_KEY + ' FAKE_VIVO_SIGNED_CAPABILITY') }); await assert.rejects(runStudy(study, { ...options, fetchImpl: mock.fetchImpl }), /result unknown.*no automatic retry/); assert.equal(ledger(options).upload_attempts, 1); assert.equal(ledger(options).paid_post_attempts, 0); assert.equal(ledger(options).staging.cleanup, 'pending'); assert(!mock.calls.some(call => call.method === 'DELETE')); assert(!mock.calls.some(call => call.url === study.endpoint && call.method === 'POST')); for (const saved of persisted(options)) assertWithheld(saved); return 'Upload ambiguity consumes its one try, no generation or unsafe deletion follows.';
});
await test('Unknown paid POST consumes the attempt and blocks execute/resume without task ID', async () => {
  const options = fixture('unknown-post'); const mock = network(study, { postError: new Error(outputUrl + ' ' + fakeEnv.ARK_API_KEY + ': HTTP 403; response body withheld') }); await assert.rejects(runStudy(study, { ...options, fetchImpl: mock.fetchImpl }), /result unknown.*no automatic retry/); assert.equal(ledger(options).paid_post_attempts, 1); assert.equal(ledger(options).staging.cleanup, 'pending'); assert(!mock.calls.some(call => call.method === 'DELETE')); for (const saved of persisted(options)) assertWithheld(saved); let extra = 0; for (const mode of ['execute', 'resume']) await assert.rejects(runStudy(study, { ...options, mode, fetchImpl: async () => { extra++; } })); assert.equal(extra, 0); return 'No transport message leakage, no second POST and no invented recovery task.';
});
await test('Failed signed probe before submission cleans exactly the confirmed owned key', async () => {
  const options = fixture('probe-failure'); const mock = network(study, { probeStatus: 200 }); await assert.rejects(runStudy(study, { ...options, fetchImpl: mock.fetchImpl }), /Signed media probe/); assert.equal(ledger(options).paid_post_attempts, 0); assert.equal(ledger(options).staging.cleanup, 'confirmed'); const deletes = mock.calls.filter(call => call.method === 'DELETE'); assert.equal(deletes.length, 1); assert.deepEqual(JSON.parse(deletes[0].body), { prefixes: [study.staging.object_key] }); return 'No task could have been created; only its confirmed newly uploaded key is removed.';
});
await test('Known 404/403 model/account rejection stops and cleans without funding or fallback', async () => {
  for (const [status, code] of [[404, 'ModelNotOpen'], [403, 'AccountOverdueError'], [403, 'OperationDenied.ServiceOverdue']]) { const options = fixture('known-rejection'); const mock = network(study, { postResponse: json({ error: { code, message: outputUrl + fakeEnv.ARK_API_KEY } }, status) }); let caught; try { await runStudy(study, { ...options, fetchImpl: mock.fetchImpl }); } catch (error) { caught = error; } assert(caught); assertWithheld(caught.message); assert.equal(ledger(options).paid_post_attempts, 1); assert.equal(ledger(options).staging.cleanup, 'confirmed'); assert.equal(ledger(options).status, 'rejected'); assert.equal(mock.calls.filter(call => call.url === study.endpoint && call.method === 'POST').length, 1); for (const saved of persisted(options)) assertWithheld(saved); }
  return 'Exact whitelisted codes recorded; provider messages withheld and one attempt remains consumed.';
});
await test('Malicious error bodies/codes and invalid JSON never leak or trigger another submission', async () => {
  for (const [status, body] of [[404, JSON.stringify({ error: { code: 'ModelNotOpen ' + fakeEnv.ARK_API_KEY, message: outputUrl } })], [429, outputUrl + fakeEnv.ARK_API_KEY], [200, outputUrl + fakeEnv.ARK_API_KEY]]) { const options = fixture('untrusted-error'); const mock = network(study, { postResponse: new Response(body, { status }) }); let caught; try { await runStudy(study, { ...options, fetchImpl: mock.fetchImpl }); } catch (error) { caught = error; } assert(caught); assertWithheld(caught.message); for (const saved of persisted(options)) assertWithheld(saved); assert.equal(ledger(options).paid_post_attempts, 1); assert.equal(ledger(options).staging.cleanup, 'pending'); assert(!mock.calls.some(call => call.method === 'DELETE')); }
  return 'Untrusted transport/body text is not mistaken for a safe terminal code.';
});
await test('Malicious sleep callback diagnostics are withheld and leave an unresolved attempt pending', async()=>{
  const options=fixture('callback-privacy'),mock=network(study,{status:'running'});let caught;try{await runStudy(study,{...options,fetchImpl:mock.fetchImpl,sleep:async()=>{throw new Error(outputUrl+' '+fakeEnv.ARK_API_KEY);}});}catch(error){caught=error;}assert(caught);assertWithheld(caught.message);for(const saved of persisted(options))assertWithheld(saved);assert.equal(ledger(options).paid_post_attempts,1);assert.equal(ledger(options).staging.cleanup,'pending');assert(!mock.calls.some(c=>c.method==='DELETE'));return 'Untrusted callback message never becomes evidence or triggers deletion/retry while task is running.';
});
await test('Malicious persistent local IO diagnostics do not escape the exported runner',async()=>{
  const options=fixture('io-privacy'),mock=network();const originalRename=fs.renameSync;let caught;
  fs.renameSync=()=>{throw new Error(fakeEnv.ARK_API_KEY+' FAKE_VIVO_SIGNED_CAPABILITY '+outputUrl);};syncBuiltinESMExports();
  try{await runStudy(study,{...options,fetchImpl:mock.fetchImpl});}catch(error){caught=error;}finally{fs.renameSync=originalRename;syncBuiltinESMExports();}
  assert(caught);assertWithheld(caught.message);for(const saved of persisted(options))assertWithheld(saved);assert(!mock.calls.some(c=>c.method==='POST'));return 'Repeated atomic-write failure surfaces a fixed diagnostic without raw IO values or simulated uploads/submissions.';
});
await test('GET-only resume accepts exact CDN without media auth and keeps one attempt', async () => {
  const options = fixture('resume'); seedResume(options); const mock = network(); const result = await runStudy(study, { ...options, mode: 'resume', fetchImpl: mock.fetchImpl }); assert.equal(result.outputDownloaded, true); assert.equal(result.paidSubmissions, 1); assert(mock.calls.every(call => ['GET', 'DELETE'].includes(call.method))); assert.deepEqual(mock.calls.find(call => call.url === outputUrl).headers, {}); assert.equal(ledger(options).output.path, outputPath); assert.equal(ledger(options).output.sha256, sha256(fakeVideo)); assert.match(ledger(options).output.decode_verification, /pending/); for (const saved of persisted(options)) assertWithheld(saved); assertCanaries(options); return 'Recorded Vivo task recovered using authenticated task GET, credential-free media GET and exact-key cleanup only.';
});
await test('Hostile CDN suffix, userinfo, HTTP and provider-origin output are refused before media fetch', async () => {
  for (const url of ['https://ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com.evil.example/output.mp4', 'https://FAKE_VIVO_OUTPUT_CAPABILITY@ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com/output.mp4', 'http://ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com/output.mp4', study.endpoint]) { const options = fixture('hostile-output'); seedResume(options); const mock = network(study, { outputUrl: url }); await assert.rejects(runStudy(study, { ...options, mode: 'resume', fetchImpl: mock.fetchImpl }), /Remote (host|URL)/); assert(!mock.calls.some(call => call.url === url)); assert(!existsSync(file(options.workspace, outputPath))); for (const saved of persisted(options)) assertWithheld(saved); }
  return 'Download host allowlist is separate from authenticated control-plane/storage hosts.';
});
await test('Corrupt, partial and unrecorded output reject resume before network without overwriting media', async () => {
  for (const variant of ['unrecorded', 'partial', 'mutated']) { const options = fixture('existing-' + variant); seedResume(options, variant === 'unrecorded' ? {} : { output: { path: outputPath, bytes: fakeVideo.length, sha256: sha256(fakeVideo) } }); const bytes = variant === 'partial' ? fakeVideo.subarray(0, 15) : Buffer.from(fakeVideo); if (variant === 'mutated') bytes[bytes.length - 1] ^= 1; save(file(options.workspace, outputPath), bytes); let calls = 0; await assert.rejects(runStudy(study, { ...options, mode: 'resume', fetchImpl: async () => { calls++; } }), /Existing output/); assert.equal(calls, 0); assert.deepEqual(readFileSync(file(options.workspace, outputPath)), bytes); assert.equal(ledger(options).paid_post_attempts, 1); }
  return 'Existing bytes cannot stand in for an unverified download or permit a new paid attempt.';
});
await test('Exact existing output resumes without another download', async () => {
  const options = fixture('existing-valid'); seedResume(options, { output: { path: outputPath, bytes: fakeVideo.length, sha256: sha256(fakeVideo) } }); save(file(options.workspace, outputPath), fakeVideo); const mock = network(); const result = await runStudy(study, { ...options, mode: 'resume', fetchImpl: mock.fetchImpl }); assert.equal(result.outputDownloaded, true); assert(!mock.calls.some(call => call.url === outputUrl)); assert(mock.calls.every(call => ['GET', 'DELETE'].includes(call.method))); return 'Stored output checked against its ledger length/SHA, retained unchanged.';
});
await test('Mismatched prior-study ledger or altered task request cannot be resumed', async () => {
  for (const mutate of [l => l.study = 'NOIR / 01', l => l.model = 'other-model', l => l.request = { duration: 6 }, l => l.assets = [], l => l.maximum_cost_usd = 6, l => l.staging.private_bucket_verified = false]) { const options = fixture('wrong-ledger'); const wrong = seedResume(options); mutate(wrong); save(file(options.workspace, ledgerPath), wrong); const before = readFileSync(file(options.workspace, ledgerPath), 'utf8'); let calls = 0; await assert.rejects(runStudy(study, { ...options, mode: 'resume', env: new Proxy({}, { get() { throw new Error('Environment forbidden'); } }), fetchImpl: async () => { calls++; } }), /exact Vivo study/); assert.equal(calls, 0); assert.equal(readFileSync(file(options.workspace, ledgerPath), 'utf8'), before); }
  return 'Study/request/assets/cost/privacy identity validated before credentials or rewriting the recorded task.';
});
await test('Controlled immutable-proposal mutant is detected by the drift verifier', async () => {
  const check = "requireValue(digest === PROPOSAL_DIGEST, 'Immutable Vivo proposal changed; exact inputs/request/settings/cost tuple must remain pinned');"; assert(sourceBefore.includes(check), 'Mutation target missing; update this controlled proof deliberately'); const mutant = join(fixtureRoot, 'mutant-digest.mjs'); save(mutant, sourceBefore.replace(check, '/* Controlled offline mutant: proposal pin deliberately removed. */')); const module = await import(pathToFileURL(mutant).href); const changed = structuredClone(study); changed.request.duration = 6; changed.request.generate_audio = false; changed.approval.request_sha256 = module.approvalDigest(changed); const options = fixture('mutant-drift'); assert.throws(() => assert.throws(() => module.validateStudy(changed, options.workspace, true), /proposal changed/), /Missing expected exception/); return 'The same rejection assertion fails against an isolated pin-disabled mutant; original source remained untouched.';
});
await test('Controlled injected-path mutant is detected by the isolation verifier', async () => {
  const check = "requireValue(injected === undefined || resolve(injected) === expected, 'Only the exact Vivo study paths are allowed');"; assert(sourceBefore.includes(check), 'Mutation target missing; update this controlled proof deliberately'); const mutant = join(fixtureRoot, 'mutant-path.mjs'); save(mutant, sourceBefore.replace(check, '/* Controlled offline mutant: injected-path guard deliberately removed. */')); const module = await import(pathToFileURL(mutant).href); const options = fixture('mutant-path'); await assert.rejects(assert.rejects(module.runStudy(study, { ...options, mode: 'dry-run', outputPath: resolve(options.workspace, '../should-reject.mp4'), env: {}, fetchImpl: async () => { throw new Error('Network forbidden'); } }), /exact Vivo study paths/), /Missing expected rejection/); return 'Isolation assertion fails against an isolated injection-check-disabled mutant, with dry-run/no networking only.';
});

const sourceShaAfter = sha256(readFileSync(runnerPath, 'utf8'));
cases.push({ name: 'Runner source remained stable during independent verification', status: sourceShaBefore === sourceShaAfter ? 'PASS' : 'FAIL', detail: { before: sourceShaBefore, after: sourceShaAfter } });
const report = { status: cases.every(test => test.status === 'PASS') ? 'PASS_OFFLINE_GUARDS_PENDING_PAID_APPROVAL' : 'FAIL_OFFLINE_GUARDS', checked_at_utc: new Date().toISOString(), command: 'node tools/tests/vivo-x80-ugc-guards.mjs', source: { path: 'tools/run_vivo_x80_ugc.mjs', sha256_start: sourceShaBefore, sha256_end: sourceShaAfter, proposal_digest: approvalDigest(proposal) }, isolated_fixture_root: fixtureRoot.replace(project, '<workspace>'), real_environment_loaded: false, real_network_calls: 0, paid_calls: 0, cloud_uploads: 0, actual_study_ledger_accessed: false, cases, totals: { pass: cases.filter(test => test.status === 'PASS').length, fail: cases.filter(test => test.status === 'FAIL').length }, limitations: ['Fake responses prove local guards only; no live entitlement, billing, generation, moderation, synchronized audio or story fidelity established.', 'No real workspace --execute/--resume, environment credentials or prior bottle attempt ledger were loaded.', 'Fake MP4 container is not decoded or claimed to be a playable provider result.'] };
save(reportPath, report);
console.log(JSON.stringify({ status: report.status, report: reportPath, source: report.source, totals: report.totals, cases: report.cases }, null, 2));
process.exitCode = report.totals.fail ? 1 : 0;
