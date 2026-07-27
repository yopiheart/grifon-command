// One-shot: push a local MP4 to R2 and mint a presigned GET URL that Meta's
// ads_creative_upload_video can fetch server-side. Mirrors api/_lib/r2.ts
// (aws4fetch SigV4, hour-floored signing date) so behaviour matches the app.
import { readFileSync } from 'node:fs';
import { AwsClient } from 'aws4fetch';

const [, , filePath, key] = process.argv;
if (!filePath || !key) {
  console.error('usage: node r2-upload.mjs <local-file> <r2-key>');
  process.exit(1);
}

// Minimal .env reader — the repo's vite plugin does this for the dev server,
// but a bare node script gets nothing.
const env = {};
for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m) env[m[1]] = m[2];
}

const { R2_ACCOUNT_ID: acct, R2_ACCESS_KEY_ID: ak, R2_SECRET_ACCESS_KEY: sk, R2_BUCKET: bucket } = env;
if (!acct || !ak || !sk || !bucket) {
  console.error('R2_NOT_CONFIGURED — missing R2_* keys in .env');
  process.exit(2);
}

const client = new AwsClient({ accessKeyId: ak, secretAccessKey: sk, region: 'auto', service: 's3' });
const endpoint = `https://${acct}.r2.cloudflarestorage.com`;
const encodeKey = (k) => k.split('/').map(encodeURIComponent).join('/');
const objectUrl = `${endpoint}/${bucket}/${encodeKey(key)}`;

const body = readFileSync(filePath);
console.error(`[r2] PUT ${key} (${body.length} bytes)`);

const put = await client.fetch(objectUrl, {
  method: 'PUT',
  body,
  headers: { 'Content-Type': 'video/mp4' },
});
if (!put.ok) {
  console.error(`r2_put_failed_${put.status}: ${(await put.text().catch(() => '')).slice(0, 300)}`);
  process.exit(3);
}

// Hour-floored X-Amz-Date, same as api/_lib/r2.ts presignGet.
const d = new Date();
d.setUTCMinutes(0, 0, 0);
const datetime = d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

const url = new URL(objectUrl);
url.searchParams.set('X-Amz-Expires', String(7200 + 3600));
const signed = await client.sign(url.toString(), {
  method: 'GET',
  aws: { signQuery: true, datetime },
});

// Prove Meta will be able to fetch it before we hand the URL over. Must be a
// GET: the HTTP method is part of the SigV4 canonical request, so a HEAD
// against a GET-signed URL is a guaranteed 403 and tells us nothing.
const probe = await fetch(signed.url, { method: 'GET', headers: { Range: 'bytes=0-0' } });
console.error(`[r2] presigned GET -> ${probe.status} ${probe.headers.get('content-range') ?? probe.headers.get('content-length') ?? '?'}`);
await probe.arrayBuffer().catch(() => {});
if (!probe.ok) {
  console.error((await probe.text().catch(() => '')).slice(0, 300));
  process.exitCode = 4;
} else {
  console.log(signed.url);
}
