// Push a locally-approved ad video straight into a Meta ad account's media
// library, with no human in the loop.
//
//   node tools/meta_upload_video.mjs <local-file> [--title "..."] [--account 123]
//
// Why this exists: the Meta Ads MCP connector's ads_creative_upload_video is
// still behind a gradual rollout ("check back at a later date") on our ad
// account. The underlying Marketing API endpoint — POST /act_<id>/advideos —
// has been generally available for years, so we call it directly with the
// System User token in .env. Do NOT re-derive this: an un-rolled-out MCP tool
// says nothing about the API behind it.
//
// Meta fetches the bytes itself from `file_url`, so the file has to be publicly
// reachable for a moment. We stage it in R2 and hand over a short-lived
// presigned GET (same SigV4 path as api/_lib/r2.ts) rather than making anything
// public. Prints the video_id on stdout; progress on stderr.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { AwsClient } from 'aws4fetch';

const API_VERSIONS = ['v23.0', 'v21.0', 'v19.0']; // newest first; fall back on unknown-version errors

const args = process.argv.slice(2);
const filePath = args.find((a) => !a.startsWith('--'));
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : args[i + 1];
};
if (!filePath) {
  console.error('usage: node tools/meta_upload_video.mjs <local-file> [--title "..."] [--account <id>]');
  process.exit(1);
}

const env = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}

const token = env.ACCESS_TOKEN;
const account = flag('account') ?? env.AD_ACCOUNT_ID;
const title = flag('title') ?? basename(filePath);
if (!token || token.startsWith('PASTE_')) {
  console.error('ACCESS_TOKEN missing in .env (see workflows/infra_setup.md §7)');
  process.exit(2);
}
if (!account) {
  console.error('AD_ACCOUNT_ID missing in .env and no --account given');
  process.exit(2);
}

// --- stage in R2 -----------------------------------------------------------
const { R2_ACCOUNT_ID: acct, R2_ACCESS_KEY_ID: ak, R2_SECRET_ACCESS_KEY: sk, R2_BUCKET: bucket } = env;
if (!acct || !ak || !sk || !bucket) {
  console.error('R2_NOT_CONFIGURED — need R2_ACCOUNT_ID / R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET');
  process.exit(2);
}
const r2 = new AwsClient({ accessKeyId: ak, secretAccessKey: sk, region: 'auto', service: 's3' });
const key = `ad-delivery/${basename(filePath)}`;
const objectUrl = `https://${acct}.r2.cloudflarestorage.com/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;

const body = readFileSync(filePath);
console.error(`[1/4] R2 PUT ${key} (${body.length} bytes)`);
const put = await r2.fetch(objectUrl, { method: 'PUT', body, headers: { 'Content-Type': 'video/mp4' } });
if (!put.ok) {
  console.error(`r2_put_failed_${put.status}: ${(await put.text().catch(() => '')).slice(0, 300)}`);
  process.exit(3);
}

// Hour-floored X-Amz-Date, matching api/_lib/r2.ts so signatures stay cacheable.
const d = new Date();
d.setUTCMinutes(0, 0, 0);
const datetime = d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const signUrl = new URL(objectUrl);
signUrl.searchParams.set('X-Amz-Expires', '10800');
const { url: fileUrl } = await r2.sign(signUrl.toString(), {
  method: 'GET',
  aws: { signQuery: true, datetime },
});

// Probe with a ranged GET — never HEAD: the HTTP method is part of the SigV4
// canonical request, so HEAD against a GET-signed URL is always a 403.
const probe = await fetch(fileUrl, { method: 'GET', headers: { Range: 'bytes=0-0' } });
await probe.arrayBuffer().catch(() => {});
console.error(`[2/4] presigned GET -> ${probe.status}`);
if (!probe.ok) process.exit(4);

// --- hand to Meta ----------------------------------------------------------
let videoId = null;
let lastErr = '';
for (const v of API_VERSIONS) {
  const res = await fetch(`https://graph.facebook.com/${v}/act_${account}/advideos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ file_url: fileUrl, title, name: title, access_token: token }),
  });
  const json = await res.json().catch(() => ({}));
  if (res.ok && json.id) {
    videoId = json.id;
    console.error(`[3/4] Graph ${v} /advideos -> ${videoId}`);
    break;
  }
  lastErr = JSON.stringify(json.error ?? json).slice(0, 400);
  // Only a bad/unsupported version is worth retrying on another version.
  if (!/version/i.test(lastErr)) break;
  console.error(`[3/4] ${v} rejected (${lastErr.slice(0, 120)}) — trying older`);
}
if (!videoId) {
  console.error(`meta_advideos_failed: ${lastErr}`);
  process.exit(5);
}

// --- wait for encoding -----------------------------------------------------
// A freshly-created video is not usable in a creative until processing ends.
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 5000));
  const res = await fetch(
    `https://graph.facebook.com/${API_VERSIONS[0]}/${videoId}?fields=status&access_token=${encodeURIComponent(token)}`
  );
  const json = await res.json().catch(() => ({}));
  const phase = json?.status?.video_status ?? json?.status?.processing_phase?.status ?? 'unknown';
  console.error(`[4/4] status: ${phase}`);
  if (phase === 'ready') break;
  if (phase === 'error') {
    console.error(JSON.stringify(json.status).slice(0, 400));
    process.exit(6);
  }
}

console.log(videoId);
