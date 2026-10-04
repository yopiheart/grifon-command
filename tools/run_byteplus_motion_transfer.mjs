import { createHash, randomUUID } from 'node:crypto';
import { closeSync, existsSync, fsyncSync, mkdirSync, openSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// One fixed study. Dry runs read local files only; credentials are injected by the caller.
const ENDPOINT = 'https://ark.ap-southeast.bytepluses.com/api/v3/contents/generations/tasks';
const MODEL = 'dreamina-seedance-2-0-260128';
const ASSETS = [
  ['assets/blender-reveal/camera-reference.mp4', '014860ecb8abef5ec097dd33f4961775ac833fff4dfbf89117e88648791f9eab', 'reference_video'],
  ['assets/blender-reveal/hero.png', '2ffeaff10fb960afc0cb92c4759df7e0e2f6be4f3d596522d9c708396cc678fd', 'reference_image'],
];
const TERMINAL = new Set(['succeeded', 'failed', 'expired', 'cancelled']);
const STATUSES = new Set(['queued', 'running', ...TERMINAL]);
// Tutorial CDN plus the exact TOS host returned by this study's authenticated task GET.
const OUTPUT_HOSTS = new Set(['ark-content-generation-ap-southeast-1.tos-ap-southeast-1.volces.com',
  'ark-acg-ap-southeast-1.tos-ap-southeast-1.volces.com']);
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
class RequestError extends Error {}
const canonical = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object'
  ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item);

export function approvalDigest(spec) {
  return sha256(canonical({ endpoint: spec.endpoint, method: spec.method, request: spec.request,
    assets: spec.assets.map(({ path, sha256, role }) => ({ path, sha256, role })),
    staging: { bucket: spec.staging.bucket, object_key: spec.staging.object_key, input_bytes: spec.staging.input_bytes,
      upload_requests_maximum: spec.staging.upload_requests_maximum, overwrite: spec.staging.overwrite,
      signed_url_ttl_seconds: spec.staging.signed_url_ttl_seconds, public_publication: spec.staging.public_publication },
    budget: { currency: spec.budget.currency, maximum_total_cost: spec.budget.maximum_total_cost,
      maximum_paid_submissions: spec.budget.maximum_paid_submissions, automatic_client_retries: spec.budget.automatic_client_retries,
      rerolls: spec.budget.rerolls, model_substitutions: spec.budget.model_substitutions,
      activation_purchases_allowed: spec.budget.activation_purchases_allowed, top_ups_allowed: spec.budget.top_ups_allowed,
      new_subscriptions_allowed: spec.budget.new_subscriptions_allowed,
      formula_tokens: spec.budget.formula_tokens, minimum_tokens_for_six_second_480p_16_9_with_video: spec.budget.minimum_tokens_for_six_second_480p_16_9_with_video,
      rate_usd_per_million_tokens: spec.budget.rate_usd_per_million_tokens, staging_fee_reserve_usd: spec.budget.staging_fee_reserve_usd } }));
}

export function validateStudy(spec, workspace = resolve('.'), execute = false) {
  requireValue(spec.endpoint === ENDPOINT && spec.method === 'POST', 'Unexpected provider endpoint or method');
  requireValue(spec.approved_fal_spec === 'assets/blender-reveal/motion-transfer.spec.json', 'Unexpected approved baseline');
  const baseline = JSON.parse(readFileSync(resolve(workspace, spec.approved_fal_spec), 'utf8'));
  requireValue(spec.assets?.length === 2 && baseline.assets?.length === 2, 'Expected exactly two approved inputs');
  const bytes = ASSETS.map(([path, hash, role], index) => {
    const asset = spec.assets[index];
    requireValue(asset.path === path && asset.sha256 === hash && asset.role === role, 'Input definition changed');
    requireValue(baseline.assets[index].path === path && baseline.assets[index].sha256 === hash && baseline.assets[index].role === role,
      'Approved baseline inputs changed');
    const data = readFileSync(resolve(workspace, path));
    requireValue(sha256(data) === hash, 'Input bytes do not match the approved SHA-256');
    return data;
  });
  requireValue(baseline.request.resolution === '480p' && baseline.request.duration === '6' && baseline.request.generate_audio === false,
    'Approved baseline settings changed');
  const expected = { model: MODEL, content: [
    { type: 'text', text: baseline.request.prompt },
    { type: 'video_url', video_url: { url: '{{SIGNED_CAMERA_REFERENCE_URL}}' }, role: 'reference_video' },
    { type: 'image_url', image_url: { url: '{{HERO_PNG_DATA_URI}}' }, role: 'reference_image' },
  ], resolution: '480p', ratio: '16:9', duration: 6,
  generate_audio: false, watermark: false, execution_expires_after: 3600 };
  requireValue(canonical(spec.request) === canonical(expected), 'Exact request or approved prompt changed');
  const staging = spec.staging;
  requireValue(staging.bucket === 'gemini-videos' && /^motion-tests\/noir-01\/[a-f0-9-]{36}\/camera-reference\.mp4$/.test(staging.object_key),
    'Unexpected staging bucket or key');
  requireValue(bytes[0].length === 882241 && staging.input_bytes === bytes[0].length && staging.upload_requests_maximum === 1 &&
    staging.overwrite === false && staging.signed_url_ttl_seconds === 7200 && staging.public_publication === false, 'Staging limits changed');
  const budget = spec.budget;
  requireValue(budget.currency === 'USD' && Number.isFinite(budget.maximum_total_cost) && budget.maximum_total_cost > 0 && budget.maximum_total_cost <= 5 &&
    budget.maximum_paid_submissions === 1 && budget.automatic_client_retries === 0 && budget.rerolls === 0 && budget.model_substitutions === 0 &&
    budget.activation_purchases_allowed === false && budget.top_ups_allowed === false && budget.new_subscriptions_allowed === false,
  'One-submission/no-funding budget changed');
  requireValue(budget.formula_tokens === 120528 && budget.minimum_tokens_for_six_second_480p_16_9_with_video === 100440 &&
    budget.rate_usd_per_million_tokens === 4.3 && budget.staging_fee_reserve_usd === 0.01, 'Approved pricing basis changed');
  const estimatedGenerationCost = Math.max(120528, 100440) * 4.3 / 1_000_000;
  requireValue(estimatedGenerationCost + budget.staging_fee_reserve_usd <= budget.maximum_total_cost, 'Estimated total exceeds approved cap');
  const digest = approvalDigest(spec);
  if (execute) {
    requireValue(spec.status === 'approved_for_single_byteplus_test' && spec.approval?.approved === true &&
      spec.approval.account_access_check === 'single_approved_submission_no_funding' &&
      spec.approval.pricing_verified === true && spec.approval.staging_approved === true,
    'Exact approval, single no-funding access trial, pricing and private staging must be attested before execution');
    requireValue(spec.approval.request_sha256 === digest, 'Approved request digest does not match');
  }
  return { bytes, digest, estimatedGenerationCost };
}

function safeUrl(value, projectHost, output = false) {
  let url;
  try { url = new URL(value); } catch { throw new Error('Invalid remote URL'); }
  requireValue(url.protocol === 'https:' && !url.username && !url.password && !url.port && !url.hash, 'Remote URL is not allowed');
  requireValue(url.hostname === 'ark.ap-southeast.bytepluses.com' ||
    (url.hostname === projectHost && /^[a-z0-9-]+\.supabase\.co$/.test(url.hostname)) ||
    (output && OUTPUT_HOSTS.has(url.hostname)), 'Remote host is not allowlisted');
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
  const summary = { mode, specStatus: spec.status, approvalDigest: checked.digest, model: MODEL, durationSeconds: 6,
    resolution: '480p', estimatedGenerationCostUsd: checked.estimatedGenerationCost,
    estimatedTotalWithStagingReserveUsd: checked.estimatedGenerationCost + 0.01,
    maximumCostUsd: spec.budget.maximum_total_cost, maximumPaidSubmissions: 1, automaticRetries: 0,
    approvalRequired: !(spec.status === 'approved_for_single_byteplus_test' && spec.approval?.approved === true &&
      spec.approval.request_sha256 === checked.digest),
    accountStatus: 'Entitlement and balance unverified; one approved submission tests access',
    networkRequests: 0, mediaUploads: 0, paidSubmissions: 0 };
  if (mode === 'dry-run') return summary;

  const ledgerPath = options.ledgerPath ?? resolve(workspace, '.tmp/byteplus-motion-transfer/attempt.json');
  const evidencePath = options.evidencePath ?? resolve(workspace, 'assets/blender-reveal/byteplus-motion-transfer-run.json');
  const outputPath = options.outputPath ?? resolve(workspace, 'assets/blender-reveal/byteplus-motion-transfer.mp4');
  requireValue(mode !== 'execute' || !existsSync(ledgerPath), 'Attempt ledger exists: never resubmit; use --resume only with a recorded task');
  requireValue(mode !== 'execute' || !existsSync(evidencePath), 'Existing evidence: never resubmit an already recorded attempt');
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
  let ledger;
  let ledgerOwned = false;
  let terminal = false;
  let uploaded = false;
  let outputVerified = false;
  const persist = () => { ledger.updated_at_utc = new Date(now()).toISOString(); saveJson(ledgerPath, ledger); saveJson(evidencePath, ledger); };
  const verifyExistingOutput = () => {
    const recorded = ledger.output;
    requireValue(recorded?.path === 'assets/blender-reveal/byteplus-motion-transfer.mp4' &&
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
      throw new Error(`${stage}: network result unknown; no automatic retry`);
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
      successful_generation_with_documented_floor: task.status !== 'succeeded' || tokens === undefined ? null : Math.max(tokens, 100440) * 4.3 / 1_000_000,
      usage_basis: ledger.usage.completion_tokens !== undefined ? 'documented completion_tokens' : tokens !== undefined ? 'total_tokens fallback; verify billing' : 'usage absent',
      rate_usd_per_million_tokens: 4.3, actual_total_bill: null, status: 'Account bill and staging charges require separate verification' };
    terminal = TERMINAL.has(task.status);
    persist();
  };
  try {
    if (mode === 'execute') {
      requireValue(!existsSync(outputPath), 'Local output already exists; refusing a new paid attempt');
      await request('Provider auth preflight', `${ENDPOINT}?page_num=1&page_size=1`, { headers: providerHeaders });
      const bucket = await request('Private bucket preflight', `${storage}/bucket/${spec.staging.bucket}`, { headers: storageHeaders });
      requireValue(bucket.id === spec.staging.bucket && bucket.public === false, 'Staging bucket must be confirmed private before writes');
      ledger = { study: 'NOIR / 01', approval_digest: checked.digest, request: spec.request,
        assets: spec.assets.map(({ path, sha256, role }) => ({ path, sha256, role })), model: MODEL,
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
      ledger = JSON.parse(readFileSync(ledgerPath, 'utf8'));
      requireValue(ledger.approval_digest === checked.digest && ledger.paid_post_attempts === 1 && ledger.client_retries === 0 &&
        ledger.staging?.bucket === spec.staging.bucket && ledger.staging.object_key === spec.staging.object_key && ledger.staging.upload_confirmed === true,
      'Recorded attempt does not match the approved study');
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
            ledger.output = { path: 'assets/blender-reveal/byteplus-motion-transfer.mp4', bytes: output.length, sha256: sha256(output),
              decode_verification: 'pending; downloading an MP4 container does not prove duration, dimensions or silence' };
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
      ledger.last_error = error.message;
      persist();
    }
    throw error;
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
      'Usage: node tools/run_byteplus_motion_transfer.mjs [--dry-run|--execute|--resume] [--spec <json>]');
    const mode = flags[0]?.slice(2) ?? 'dry-run';
    const spec = JSON.parse(readFileSync(resolve(specIndex === -1 ? 'assets/blender-reveal/motion-transfer.byteplus-seedance20.spec.json' : args[specIndex + 1]), 'utf8'));
    const result = await runStudy(spec, { mode });
    console.log(JSON.stringify(result, null, 2));
    if (mode !== 'dry-run' && (result.status !== 'succeeded' || result.cleanup !== 'confirmed' || !result.outputDownloaded)) process.exitCode = 1;
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
