// Pull one producer run's FINISHED VIDEO out of R2 and write it to disk.
//
//   node --env-file=.env scripts/pull-run-final.mjs --list
//   node --env-file=.env scripts/pull-run-final.mjs <run_id> <out_path.mp4>
//
// WHY THIS EXISTS: a finished run's mp4 lives in R2 (MEDIA_STORE='r2'), and
// `producer_runs.artifacts.finalVideoUrl` stores the PRESIGNED url, not the object
// key. Those signatures expire, so a run from last week looks unrecoverable even
// though the object is sitting in the bucket untouched. Re-rendering to get a file
// you already own costs a video credit; re-signing costs nothing. On 2026-08-28 a
// session looked for this mp4 in the Supabase bucket (4 stale July smoke files) and
// nearly concluded the source was gone.
//
// Every format sample in public/samples/ is cut from one of these, so this is the
// first step of every sample cut, not a one-off. Sibling of pull-run-frames.mjs
// (stills) and pull-run-input.mjs (the brief).
//
// SECRETS: reads R2_* + Supabase from process.env ONLY. Never prints a key, never
// prints a signed URL — a presigned URL IS a capability, anyone holding it can fetch
// the object. Prints run ids, object basenames, byte counts and HTTP status only.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { AwsClient } from 'aws4fetch';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.log('RESULT: NO_ENV — VITE_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY are unset.');
  console.log('Run with: node --env-file=.env scripts/pull-run-final.mjs <run_id> <out_path.mp4>');
  process.exit(1);
}
if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.log('RESULT: R2_NOT_CONFIGURED — need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET.');
  process.exit(1);
}

const rest = async (path) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}` },
  });
  if (!r.ok) {
    console.log(`RESULT: REST_${r.status} — could not read producer_runs.`);
    process.exit(1);
  }
  return r.json();
};

const [runId, outPath] = process.argv.slice(2);

if (runId === '--list') {
  const rows = await rest('producer_runs?select=run_id,status,current_stage,created_at&order=created_at.desc&limit=25');
  for (const r of rows) {
    console.log(`${r.created_at.slice(0, 10)}  ${r.status.padEnd(8)} ${r.current_stage.padEnd(12)} ${r.run_id}`);
  }
  process.exit(0);
}

if (!runId || !outPath) {
  console.log('Usage: node --env-file=.env scripts/pull-run-final.mjs <run_id> <out_path.mp4>');
  console.log('       node --env-file=.env scripts/pull-run-final.mjs --list');
  process.exit(1);
}

const rows = await rest(`producer_runs?run_id=eq.${encodeURIComponent(runId)}&select=artifacts`);
if (!rows.length) {
  console.log(`RESULT: NO_RUN — ${runId} is not in producer_runs.`);
  process.exit(1);
}

const stored = rows[0]?.artifacts?.finalVideoUrl;
if (!stored) {
  console.log('RESULT: NO_FINAL — this run has no artifacts.finalVideoUrl (it never reached a final render).');
  process.exit(1);
}

// Pull the object key back out of the stored presigned URL: /<bucket>/<uid>/final/<id>.mp4
const key = (() => {
  try {
    const p = new URL(stored).pathname.split('/').filter(Boolean).map(decodeURIComponent);
    return p[0] === bucket ? p.slice(1).join('/') : p.join('/');
  } catch {
    return null;
  }
})();
if (!key) {
  console.log('RESULT: NO_KEY — could not parse an object key out of the stored URL.');
  process.exit(1);
}
console.log(`OBJECT=${key.split('/').pop()}  PREFIX_DEPTH=${key.split('/').length - 1}`);

const client = new AwsClient({ accessKeyId, secretAccessKey, region: 'auto', service: 's3' });
const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
const encodeKey = (k) => k.split('/').map(encodeURIComponent).join('/');

// Bucket the signing timestamp to the hour so repeated runs produce a stable URL
// (mirrors scripts/resign-restitch-urls.mjs).
const hourBucketedAmzDate = () => {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};

const url = new URL(`${endpoint}/${bucket}/${encodeKey(key)}`);
url.searchParams.set('X-Amz-Expires', '3600');
const signed = await client.sign(url.toString(), {
  method: 'GET',
  aws: { signQuery: true, datetime: hourBucketedAmzDate() },
});

// A presigned URL signs the METHOD, so HEAD against a GET signature returns 403 and
// looks exactly like an expired signature. Probe with a 1-byte ranged GET instead:
// same method that was signed, ~no egress. 403 here = really expired/denied,
// 404 = the object is genuinely gone.
const probe = await fetch(signed.url, { headers: { Range: 'bytes=0-0' } });
console.log(`PROBE_STATUS=${probe.status}`);
if (!(probe.ok || probe.status === 206)) {
  console.log(probe.status === 404
    ? 'RESULT: OBJECT_GONE — 404, the object is no longer in the bucket.'
    : `RESULT: DENIED — ${probe.status}. 403 means the signature was rejected, not that the object is missing.`);
  process.exit(1);
}

const res = await fetch(signed.url);
if (!res.ok) {
  console.log(`RESULT: FETCH_${res.status}`);
  process.exit(1);
}
const buf = Buffer.from(await res.arrayBuffer());
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, buf);
console.log(`BYTES=${buf.length}  MB=${(buf.length / 1048576).toFixed(2)}`);
console.log(`RESULT: OK — wrote ${outPath}`);
