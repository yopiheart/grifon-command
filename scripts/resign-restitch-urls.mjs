// Re-sign the expired R2 URLs in .tmp/restitch.json, and find the scene audio.
//
//   node scripts/resign-restitch-urls.mjs
//
// WHY THIS EXISTS
// producer_scenes stores the PRESIGNED clip URL, not the object key, and those
// signatures expire. A run from a week ago therefore looks unrecoverable — every
// clip HEADs 403 — which reads as "you need a fresh paid render" when the objects
// are still sitting in R2 untouched. 403 is an expired signature; 404 is a missing
// object. That distinction is the difference between ₱0 and ~₱550.
//
// It also fills audioUrl, which producer_scenes leaves null: the per-scene voice
// mp3s live in R2 under the same `${uid}/` prefix, so they are discovered by listing.
//
// SECRETS: reads R2_* from .env, never prints them, and never prints a signed URL
// (a presigned URL IS a capability — anyone holding it can fetch the object).
// Only counts, object keys' basenames, and HEAD verdicts are printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { AwsClient } from 'aws4fetch';

const env = readFileSync('.env', 'utf8');
const get = (k) => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim() : ''; };

const accountId = get('R2_ACCOUNT_ID');
const accessKeyId = get('R2_ACCESS_KEY_ID');
const secretAccessKey = get('R2_SECRET_ACCESS_KEY');
const bucket = get('R2_BUCKET');
if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
  console.log('RESULT: R2_NOT_CONFIGURED — need R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET in .env');
  process.exit(0);
}

const client = new AwsClient({ accessKeyId, secretAccessKey, region: 'auto', service: 's3' });
const endpoint = `https://${accountId}.r2.cloudflarestorage.com`;
const encodeKey = (k) => k.split('/').map(encodeURIComponent).join('/');
const hourBucketedAmzDate = () => {
  const d = new Date();
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
};
const presignGet = async (key, ttlSec = 86400) => {
  const url = new URL(`${endpoint}/${bucket}/${encodeKey(key)}`);
  url.searchParams.set('X-Amz-Expires', String(ttlSec));
  const signed = await client.sign(url.toString(), {
    method: 'GET',
    aws: { signQuery: true, datetime: hourBucketedAmzDate() },
  });
  return signed.url;
};

// Pull the object key back out of an old presigned URL: /<bucket>/<uid>/<name>
const keyFromUrl = (u) => {
  try {
    const p = new URL(u).pathname.split('/').filter(Boolean).map(decodeURIComponent);
    return p[0] === bucket ? p.slice(1).join('/') : p.join('/');
  } catch { return null; }
};

const spec = JSON.parse(readFileSync('.tmp/restitch.json', 'utf8'));
const uid = keyFromUrl(spec.scenes[0].videoUrl)?.split('/')[0];
if (!uid) { console.log('RESULT: NO_KEY — could not parse an object key out of the stored URL.'); process.exit(0); }
console.log(`UID_PREFIX_LEN=${uid.length}  SCENES=${spec.scenes.length}`);

// List everything under this user's prefix so audio can be matched by name.
const lr = await client.fetch(`${endpoint}/${bucket}?list-type=2&prefix=${encodeURIComponent(uid + '/')}&max-keys=1000`);
const xml = await lr.text();
const allKeys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]);
console.log(`LIST_STATUS=${lr.status}  OBJECTS_UNDER_PREFIX=${allKeys.length}`);
const audioKeys = allKeys.filter((k) => /\.(mp3|wav|m4a)$/i.test(k));
console.log(`AUDIO_OBJECTS=${audioKeys.length}`);
if (audioKeys.length) {
  console.log('AUDIO_BASENAMES=' + audioKeys.slice(0, 12).map((k) => k.split('/').pop()).join(' | '));
}

// A presigned URL signs the METHOD. Checking one with HEAD when it was signed for
// GET returns 403 — which looks exactly like an expired signature and led this
// script to report OBJECTS_GONE while all 9 objects were sitting in the bucket.
// Verify with a 1-byte ranged GET instead: same method that was signed, ~no egress.
const alive = async (url) => {
  try {
    const r = await fetch(url, { headers: { Range: 'bytes=0-0' } });
    return r.ok || r.status === 206;
  } catch { return false; }
};

let vLive = 0, vDead = 0, aSet = 0;
for (const sc of spec.scenes) {
  const vKey = keyFromUrl(sc.videoUrl);
  if (vKey) {
    sc.videoUrl = await presignGet(vKey);
    (await alive(sc.videoUrl)) ? vLive++ : vDead++;
  }
  // The EDL carries the voice mp3 as sourceAudioUrl, also presigned and also
  // expired, so it needs the same treatment. Name-matching against the bucket was
  // a dead end: the objects are bare UUIDs, not "SCENE 3.mp3".
  const aKey = keyFromUrl(sc.audioUrl);
  if (aKey) {
    sc.audioUrl = await presignGet(aKey);
    if (await alive(sc.audioUrl)) aSet++;
  }
}

writeFileSync('.tmp/restitch.json', JSON.stringify(spec, null, 2));
console.log(`\nVIDEO_LIVE=${vLive}  VIDEO_DEAD=${vDead}  AUDIO_ATTACHED=${aSet}`);
console.log('');
if (vLive === spec.scenes.length && aSet === spec.scenes.length) {
  console.log("RESULT: READY — next: node scripts/fill-restitch-alignment.mjs, then $env:RUN_RESTITCH='1'; npx vitest run tests/integration/restitch-real.test.ts");
} else if (vLive === spec.scenes.length) {
  console.log('RESULT: VIDEO_OK_AUDIO_SHORT — clips are back but ' + (spec.scenes.length - aSet) + ' scene(s) have no audio. Without audio the trim (#91) and onset (#94.1) anchors cannot be measured.');
} else if (vDead) {
  console.log('RESULT: OBJECTS_GONE — ' + vDead + ' clip(s) still fail after re-signing, so those objects were deleted, not merely expired.');
}
