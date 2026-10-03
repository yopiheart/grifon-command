import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, parse, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

// Separate fixed Vivo study. Pending/default runs read local files only.
const ENDPOINT = 'https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks';
const MODEL = 'dreamina-seedance-2-0-260128';
const PROPOSAL_DIGEST = 'da471418a3c56e161eafaac58f298fe097ab2e5212d72d7c64fb4df582eefa78';
const SPEC_PATH = 'assets/vivo-x80-ugc/seedance20.spec.json';
const LEDGER_PATH = '.tmp/vivo-x80-ugc/attempt.json';
const EVIDENCE_PATH = 'assets/vivo-x80-ugc/seedance20-run.json';
const OUTPUT_PATH = 'assets/vivo-x80-ugc/seedance20-raw.mp4';
const STUDY = 'MY TURN V2 / Vivo X80 / human finish';
const ASSETS = [
  ['assets/vivo-x80-previz-v2/camera-guide.mp4', 'b0a5742b5fbc811db122574f387855a69f30a249585328800106075eedab28e8', 'reference_video', 1162011],
  ['assets/vivo-x80-ugc/vivo-x80-product.png', '3d816b4f09566fc1499619a603be55e908eb50b04ebdcc1ce4413e562c7abf8b', 'reference_image', 365082],
];
const TERMINAL = new Set(['succeeded', 'failed', 'expired', 'cancelled']);
const STATUSES = new Set(['queued', 'running', ...TERMINAL]);
// Tutorial CDN plus the exact TOS host verified in the earlier ModelArk study.
const OUTPUT_HOSTS = new Set(['ark-content-generation-ap-southeast-1.tos-ap-southeast-1.volces.com',
  'ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com']);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
class StudyError extends Error {}
const requireValue = (condition, message) => { if (!condition) throw new StudyError(message); };
class RequestError extends StudyError {}
const safeMessage = error => error instanceof StudyError ? error.message : 'Local operation failed; details withheld; no automatic retry';
const canonical = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object'
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

export function approvalDigest(spec) {
  const tuple = structuredClone(spec);
  delete tuple.status;
  delete tuple.approval;
  if (tuple.staging) delete tuple.staging.privacy_verified;
  return sha256(canonical(tuple));
}

function studyPath(workspace, path, injected) {
  const root = resolve(workspace);
  const expected = resolve(root, path);
  requireValue(injected === undefined || resolve(injected) === expected, 'Only the exact Vivo study paths are allowed');
  const scopedParts = relative(root, expected).split(sep);
  requireValue(scopedParts.length > 1 && !scopedParts.includes('..'), 'Vivo study path escapes its workspace');
  const volume = parse(root).root;
  const parts = relative(volume, expected).split(sep);
  let current = volume;
  for (const part of parts) {
    current = resolve(current, part);
    let stat;
    try { stat = lstatSync(current); } catch (error) {
      if (error.code !== 'ENOENT') throw new StudyError('Vivo study path could not be inspected');
    }
    requireValue(!stat?.isSymbolicLink(), 'Vivo study paths cannot use symbolic links or junctions');
  }
  return expected;
}

function approvalReadiness(spec, digest) {
  const checks = {
    status: spec.status === 'approved_for_single_byteplus_test',
    approved: spec.approval?.approved === true,
    matching_digest: spec.approval?.request_sha256 === digest,
    single_no_funding_access_trial: spec.approval?.account_access_check === 'single_approved_submission_no_funding',
    pricing_verified: spec.approval?.pricing_verified === true,
    user_staging_approved: spec.approval?.staging_approved === true,
    exact_paid_tuple_approval: typeof spec.approval?.exact_paid_tuple_approval === 'string' &&
      spec.approval.exact_paid_tuple_approval.trim().length > 0 && !/pending/i.test(spec.approval.exact_paid_tuple_approval),
  };
  return { checks, missing: Object.keys(checks).filter(key => !checks[key]), freshPrivateBucketPreflight: 'pending; authenticated GET must confirm public:false before writes' };
}

export function validateStudy(spec, workspace = resolve('.'), execute = false) {
  requireValue(spec.endpoint === ENDPOINT && spec.method === 'POST', 'Unexpected provider endpoint or method');
  const digest = approvalDigest(spec);
  requireValue(digest === PROPOSAL_DIGEST, 'Immutable Vivo proposal changed; exact inputs/request/settings/cost tuple must remain pinned');
  requireValue(spec.assets?.length === 2, 'Expected exactly two proposed Vivo inputs');
  const readiness = approvalReadiness(spec, digest);
  if (execute) requireValue(readiness.missing.length === 0,
    'Exact approval, single no-funding access trial, pricing and user staging approval must all be attested before execution');
  const bytes = ASSETS.map(([path, hash, role, size], index) => {
    const asset = spec.assets[index];
    requireValue(asset.path === path && asset.sha256 === hash && asset.role === role && asset.bytes === size, 'Vivo input definition changed');
    const data = readFileSync(studyPath(workspace, path));
    requireValue(data.length === size && sha256(data) === hash, 'Vivo input bytes do not match the proposed size/SHA-256');
    return data;
  });
  const staging = spec.staging;
  requireValue(staging.bucket === 'gemini-videos' && /^motion-tests\/vivo-x80-v2\/[a-f0-9-]{36}\/camera-guide\.mp4$/.test(staging.object_key),
    'Unexpected staging bucket or key');
  requireValue(staging.input_bytes === bytes[0].length && staging.upload_requests_maximum === 1 &&
    staging.overwrite === false && staging.signed_url_ttl_seconds === 7200 && staging.public_publication === false, 'Staging limits changed');
  const budget = spec.budget;
  requireValue(budget.currency === 'USD' && Number.isFinite(budget.maximum_total_cost) && budget.maximum_total_cost > 0 && budget.maximum_total_cost <= 5 &&
    budget.maximum_paid_submissions === 1 && budget.automatic_client_retries === 0 && budget.rerolls === 0 && budget.model_substitutions === 0 &&
    budget.activation_purchases_allowed === false && budget.top_ups_allowed === false && budget.new_subscriptions_allowed === false,
  'One-submission/no-funding budget changed');
  requireValue(budget.formula_tokens === 301320 && budget.minimum_tokens_for_fifteen_second_480p_9_16_with_video === 251100 &&
    budget.rate_usd_per_million_tokens === 4.3 && budget.staging_fee_reserve_usd === 0.01, 'Approved pricing basis changed');
  const estimatedGenerationCost = Math.max(301320, 251100) * 4.3 / 1_000_000;
  requireValue(estimatedGenerationCost + budget.staging_fee_reserve_usd <= budget.maximum_total_cost, 'Estimated total exceeds approved cap');
  return { bytes, digest, estimatedGenerationCost, readiness };
}

function safeUrl(value, projectHost, output = false) {
  let url;
  try { url = new URL(value); } catch { throw new StudyError('Invalid remote URL'); }
  requireValue(url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash, 'Remote URL is not allowed');
  requireValue(output ? OUTPUT_HOSTS.has(url.hostname) : url.hostname === 'ark.ap-southeast.bytepluses.com' ||
    (url.hostname === projectHost && /^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)), 'Remote host is not allowlisted');
  return url;
}

function saveJson(filename, value, exclusive = false) {
  mkdirSync(dirname(filename), { recursive: true });
  const next = exclusive ? filename : `${filename}.next-${randomUUID()}`;
  const fd = openSync(next, 'wx', 0o600);
  try { writeFileSync(fd, JSON.stringify(value, null, 2) + '\n'); fsyncSync(fd); } finally { closeSync(fd); }
  if (!exclusive) renameSync(next, filename);
}

function usageSummary(usage) {
  return Object.fromEntries(['completion_tokens', 'total_tokens', 'prompt_tokens'].flatMap(key =>
    Number.isFinite(usage?.[key]) && usage[key] >= 0 ? [[key, usage[key]]] : []));
}

export async function runStudy(spec, options = {}) {
  const mode = options.mode ?? 'dry-run';
  requireValue(['dry-run', 'execute', 'resume'].includes(mode), 'Unknown run mode');
  const workspace = options.workspace ?? resolve('.');
  const checked = validateStudy(spec, workspace, mode !== 'dry-run');
  const ledgerPath = studyPath(workspace, LEDGER_PATH, options.ledgerPath);
  const evidencePath = studyPath(workspace, EVIDENCE_PATH, options.evidencePath);
  const outputPath = studyPath(workspace, OUTPUT_PATH, options.outputPath);
  const summary = { mode, specStatus: spec.status, approvalDigest: checked.digest, model: MODEL, durationSeconds: 15,
    resolution: '480p', estimatedGenerationCostUsd: checked.estimatedGenerationCost,
    estimatedTotalWithStagingReserveUsd: checked.estimatedGenerationCost + 0.01,
    maximumCostUsd: spec.budget.maximum_total_cost, maximumPaidSubmissions: 1, automaticRetries: 0,
    ratio: '9:16', generateAudio: true, executionReady: checked.readiness.missing.length === 0,
    approvalRequired: checked.readiness.missing.length > 0, missingAttestations: checked.readiness.missing,
    approvalChecks: checked.readiness.checks, privateBucketPreflight: checked.readiness.freshPrivateBucketPreflight,
    accountStatus: 'Entitlement and balance unverified; one approved submission tests access',
    networkRequests: 0, mediaUploads: 0, paidSubmissions: 0 };
  if (mode === 'dry-run') return summary;

  requireValue(mode !== 'execute' || !existsSync(ledgerPath), 'Attempt ledger exists: never resubmit; use --resume only with a recorded task');
  let ledger;
  if (mode === 'execute') {
    requireValue(!existsSync(evidencePath), 'Vivo evidence already exists; refusing to overwrite or submit');
    requireValue(!existsSync(outputPath), 'Local output already exists; refusing a new paid attempt');
  } else {
    ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
    requireValue(ledger.study === STUDY && ledger.model === MODEL && ledger.approval_digest === checked.digest &&
      canonical(ledger.request) === canonical(spec.request) && canonical(ledger.assets) === canonical(spec.assets) &&
      ledger.paid_post_attempts === 1 && ledger.upload_attempts === 1 && ledger.client_retries === 0 &&
      ledger.maximum_cost_usd === spec.budget.maximum_total_cost && ledger.staging?.bucket === spec.staging.bucket &&
      ledger.staging.object_key === spec.staging.object_key && ledger.staging.private_bucket_verified === true &&
      ledger.staging.upload_confirmed === true,
    'Recorded attempt does not match the exact Vivo study');
  }
  const env = options.env ?? process.env;
  requireValue(Boolean(env.ARK_API_KEY && env.SUPABASE_SERVICE_ROLE_KEY && (env.SUPABASE_URL || env.VITE_SUPABASE_URL)), 'Required injected credentials are missing');
  const project = safeUrl(env.SUPABASE_URL || env.VITE_SUPABASE_URL, new URL(env.SUPABASE_URL || env.VITE_SUPABASE_URL).hostname);
  requireValue(/^[a-z0-9-]+\.supabase\.co$/.test(project.hostname) && project.pathname === '/' && !project.search, 'Unexpected Supabase project URL');
  const storage = `${project.origin}/storage/v1`;
  const storageHeaders = { apikey: env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}` };
  const providerHeaders = { Authorization: `Bearer ${env.ARK_API_KEY}` };
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const sleep = options.sleep ?? (ms => new Promise(done => setTimeout(done, ms)));
  const now = options.now ?? Date.now;
  const objectPath = `${spec.staging.bucket}/${spec.staging.object_key}`;
  let ledgerOwned = false;
  let terminal = false;
  let uploaded = false;
  let outputVerified = false;
  const persist = () => {
    try {
      ledger.updated_at_utc = new Date(now()).toISOString();
      saveJson(ledgerPath, ledger);
      saveJson(evidencePath, ledger);
    } catch { throw new StudyError('Vivo ledger/evidence persistence failed; details withheld; no automatic retry'); }
  };
  const verifyExistingOutput = () => {
    const recorded = ledger.output;
    requireValue(recorded?.path === OUTPUT_PATH &&
      Number.isInteger(recorded.bytes) && recorded.bytes > 12 && /^[a-f0-9]{64}$/.test(recorded.sha256 ?? ''),
    'Existing output has no valid ledger record; stop without overwrite or resubmission');
    const bytes = readFileSync(outputPath);
    requireValue(bytes.length === recorded.bytes && sha256(bytes) === recorded.sha256,
      'Existing output does not match its recorded bytes/SHA-256; stop without overwrite or resubmission');
    outputVerified = true;
  };
  const request = async (stage, url, init = {}, read = 'json', output = false) => {
    safeUrl(url, project.hostname, output);
    summary.networkRequests++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    try {
      const response = await fetchImpl(url, { ...init, redirect: 'error', signal: controller.signal });
      if (!response.ok) {
        if (stage === 'Single paid submission' && [403, 404].includes(response.status)) {
          let code;
          try { code = (await response.json())?.error?.code; } catch { /* Unparseable bodies stay withheld. */ }
          if ((response.status === 404 && code === 'ModelNotOpen') ||
              (response.status === 403 && ['AccountOverdueError', 'OperationDenied.ServiceOverdue'].includes(code))) {
            const error = new RequestError(`${stage}: HTTP ${response.status}; ${code}; stop without activation, funding or resubmission`);
            error.rejectionCode = code;
            error.httpStatus = response.status;
            throw error;
          }
        }
        throw new RequestError(`${stage}: HTTP ${response.status}; response body withheld`);
      }
      if (read === 'probe') {
        if (response.status !== 206 || response.headers.get('content-range') !== `bytes 0-0/${spec.staging.input_bytes}`) {
          throw new RequestError('Signed media probe did not return the exact one-byte range');
        }
        if ((await response.arrayBuffer()).byteLength !== 1) throw new RequestError('Signed media probe returned unexpected bytes');
        return;
      }
      if (read === 'video') {
        const chunks = [];
        let length = 0;
        for await (const chunk of response.body) {
          length += chunk.length;
          if (length > 50 * 1024 * 1024) throw new RequestError('Output exceeds the local download limit');
          chunks.push(chunk);
        }
        const bytes = Buffer.concat(chunks);
        if (bytes.length <= 12 || bytes.subarray(4, 8).toString() !== 'ftyp') throw new RequestError('Downloaded output is not an MP4 container');
        return bytes;
      }
      try { return await response.json(); } catch { throw new RequestError(`${stage}: invalid JSON response; body withheld`); }
    } catch (error) {
      // Do not echo fetch errors: their messages can contain signed URLs or credentials.
      if (error instanceof RequestError) throw error;
      throw new StudyError(`${stage}: network result unknown; no automatic retry`);
    } finally { clearTimeout(timer); }
  };
  const taskId = value => { requireValue(typeof value === 'string' && /^[A-Za-z0-9_-]{1,160}$/.test(value), 'Provider task ID missing or invalid'); return value; };
  const recordTask = task => {
    requireValue(taskId(task.id) === ledger.task_id && STATUSES.has(task.status), 'Unexpected provider task identity/status');
    requireValue(task.model === undefined || task.model === MODEL, 'Provider returned a different model');
    ledger.status = task.status;
    ledger.usage = usageSummary(task.usage);
    const tokens = ledger.usage.completion_tokens ?? ledger.usage.total_tokens;
    ledger.cost = { currency: 'USD', generation_from_reported_tokens: tokens === undefined ? null : tokens * 4.3 / 1_000_000,
      successful_generation_with_documented_floor: task.status !== 'succeeded' || tokens === undefined ? null : Math.max(tokens, 251100) * 4.3 / 1_000_000,
      usage_basis: ledger.usage.completion_tokens !== undefined ? 'documented completion_tokens' : tokens !== undefined ? 'total_tokens fallback; verify billing' : 'usage absent',
      rate_usd_per_million_tokens: 4.3, actual_total_bill: null, status: 'Account bill and staging charges require separate verification' };
    ledger.cost.within_approved_estimate = task.status !== 'succeeded' || tokens === undefined ? null :
      Math.max(tokens, 251100) * 4.3 / 1_000_000 + spec.budget.staging_fee_reserve_usd <= spec.budget.maximum_total_cost;
    terminal = TERMINAL.has(task.status);
    persist();
  };
  try {
    if (mode === 'execute') {
      await request('Provider auth preflight', `${ENDPOINT}?page_num=1&page_size=1`, { headers: providerHeaders });
      const bucket = await request('Private bucket preflight', `${storage}/bucket/${spec.staging.bucket}`, { headers: storageHeaders });
      requireValue(bucket.id === spec.staging.bucket && bucket.public === false, 'Staging bucket must be confirmed private before writes');
      ledger = { study: STUDY, approval_digest: checked.digest, request: spec.request,
        assets: spec.assets, model: MODEL,
        staging: { bucket: spec.staging.bucket, object_key: spec.staging.object_key, private_bucket_verified: true, cleanup: 'pending' },
        status: 'reserved', created_at_utc: new Date(now()).toISOString(), paid_post_attempts: 0, client_retries: 0,
        upload_attempts: 0, maximum_cost_usd: spec.budget.maximum_total_cost,
        account_status: 'Entitlement and balance unverified; user authorized this single access trial without funding' };
      saveJson(ledgerPath, ledger, true);
      ledgerOwned = true;
      ledger.upload_attempts = 1;
      persist();
      const upload = await request('Create-only staging upload', `${storage}/object/${objectPath}`, {
        method: 'POST', headers: { ...storageHeaders, 'x-upsert': 'false', 'Content-Type': 'video/mp4', 'cache-control': 'max-age=3600' }, body: checked.bytes[0] });
      requireValue(upload.Key === objectPath, 'Upload response did not confirm the exact owned key');
      uploaded = true;
      summary.mediaUploads = 1;
      ledger.staging.upload_confirmed = true;
      persist();
      const signed = await request('Private media signing', `${storage}/object/sign/${objectPath}`, {
        method: 'POST', headers: { ...storageHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ expiresIn: 7200 }) });
      requireValue(typeof signed.signedURL === 'string', 'Signing response is missing signedURL');
      const signedUrl = safeUrl(`${storage}${signed.signedURL}`, project.hostname);
      requireValue(signedUrl.hostname === project.hostname && signedUrl.pathname === `/storage/v1/object/sign/${objectPath}` &&
        signedUrl.searchParams.has('token'), 'Signed capability is not for the exact approved object');
      const signedAt = now();
      await request('Signed media probe', signedUrl.href, { headers: { Range: 'bytes=0-0' } }, 'probe');
      const body = structuredClone(spec.request);
      body.content[1].video_url.url = signedUrl.href;
      body.content[2].image_url.url = `data:image/png;base64,${checked.bytes[1].toString('base64')}`;
      requireValue(now() - signedAt < 60_000, 'Signed capability is no longer fresh enough for the one-hour task');
      ledger.paid_post_attempts = 1;
      ledger.status = 'submission_result_unknown';
      persist();
      summary.paidSubmissions = 1;
      const created = await request('Single paid submission', ENDPOINT, {
        method: 'POST', headers: { ...providerHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      ledger.task_id = taskId(created.id);
      ledger.status = 'submitted';
      persist();
    } else {
      taskId(ledger.task_id);
      ledgerOwned = true;
      uploaded = true;
      if (existsSync(outputPath)) verifyExistingOutput();
    }
    const deadline = now() + 20 * 60_000;
    while (now() <= deadline) {
      const task = await request('Task poll', `${ENDPOINT}/${ledger.task_id}`, { headers: providerHeaders });
      recordTask(task);
      if (terminal) {
        if (task.status === 'succeeded') {
          if (!existsSync(outputPath)) {
            requireValue(typeof task.content?.video_url === 'string', 'Successful task has no video URL');
            const output = await request('Output download', task.content.video_url, {}, 'video', true);
            const fd = openSync(outputPath, 'wx', 0o600);
            try { writeFileSync(fd, output); fsyncSync(fd); } finally { closeSync(fd); }
            ledger.output = { path: OUTPUT_PATH, bytes: output.length, sha256: sha256(output),
              decode_verification: 'pending; MP4 container alone does not prove 15s duration, dimensions, synchronized audio or story transfer' };
            persist();
          }
          verifyExistingOutput();
          delete ledger.last_error;
          persist();
        }
        break;
      }
      await sleep(10_000);
    }
    requireValue(terminal, 'Polling deadline reached; task remains unresolved, no resubmission allowed');
  } catch (error) {
    if (ledgerOwned) {
      if (error instanceof RequestError && error.rejectionCode) {
        ledger.status = 'rejected';
        ledger.rejection = { http_status: error.httpStatus, error_code: error.rejectionCode,
          action: 'stop; no activation, funding, fallback or resubmission' };
        terminal = true;
      }
      ledger.last_error = safeMessage(error);
      persist();
    }
    throw error instanceof StudyError ? error : new StudyError(safeMessage(error));
  } finally {
    if (ledgerOwned && uploaded && (terminal || ledger.paid_post_attempts === 0) && ledger.staging.cleanup !== 'confirmed') {
      try {
        const deleted = await request('Exact owned-key cleanup', `${storage}/object/${spec.staging.bucket}`, {
          method: 'DELETE', headers: { ...storageHeaders, 'Content-Type': 'application/json' }, body: JSON.stringify({ prefixes: [spec.staging.object_key] }) });
        requireValue(Array.isArray(deleted) && deleted.some(item => item.name === spec.staging.object_key), 'Cleanup did not confirm the exact owned key');
        ledger.staging.cleanup = 'confirmed';
      } catch { ledger.staging.cleanup = 'pending; exact-key deletion not confirmed'; }
      persist();
    }
  }
  return { ...summary, paidSubmissions: ledger.paid_post_attempts, status: ledger.status, taskId: ledger.task_id, cleanup: ledger.staging.cleanup,
    outputDownloaded: outputVerified, usage: ledger.usage, cost: ledger.cost };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const flags = args.filter(arg => ['--execute', '--resume', '--dry-run'].includes(arg));
  const specIndex = args.indexOf('--spec');
  const allowed = new Set([...flags, ...(specIndex === -1 ? [] : ['--spec', args[specIndex + 1]])]);
  try {
    requireValue(flags.length <= 1 && args.every(arg => allowed.has(arg)) && (specIndex === -1 || Boolean(args[specIndex + 1])),
      'Usage: node tools/run_vivo_x80_ugc.mjs [--dry-run|--execute|--resume] [--spec <fixed Vivo json>]');
    const mode = flags[0]?.slice(2) ?? 'dry-run';
    const specPath = studyPath(resolve('.'), SPEC_PATH, specIndex === -1 ? undefined : args[specIndex + 1]);
    const spec = JSON.parse(readFileSync(specPath, 'utf8'));
    const result = await runStudy(spec, { mode });
    console.log(JSON.stringify(result, null, 2));
    if (mode !== 'dry-run' && (result.status !== 'succeeded' || result.cleanup !== 'confirmed' || !result.outputDownloaded ||
      result.cost?.within_approved_estimate === false)) process.exitCode = 1;
  } catch (error) { console.error(safeMessage(error)); process.exitCode = 1; }
}
