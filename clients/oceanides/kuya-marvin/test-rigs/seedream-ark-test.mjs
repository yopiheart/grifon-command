#!/usr/bin/env node
// Seedream 5.0 Marvin identity test — BytePlus ModelArk direct API.
// Usage (repo root): node .tmp/seedream-ark-test.mjs --manifest .tmp/seedream-ark-manifest.json
// Manifest item: { model, prompt, out, size, refs: [paths] }
// ModelArk notes: watermark defaults ON (we pass false); response URLs expire in 24h
// (we request b64_json instead); input refs: first free, +$0.003 each after.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const KEY = process.env.ARK_API_KEY;
if (!KEY || KEY === 'PASTE_KEY_HERE') throw new Error('ARK_API_KEY missing/placeholder in .env — create one in BytePlus console > API keys');

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const manifest = JSON.parse(readFileSync(arg('--manifest'), 'utf8'));
const ENDPOINT = 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations';

const FFMPEG = path.resolve('node_modules/ffmpeg-static/ffmpeg.exe');
const smallRef = (p) => {
  const outP = path.join('.tmp', 'seedream-refs', path.basename(p).replace(/\.(jpe?g|png)$/i, '-1536.jpg'));
  if (!existsSync(outP)) {
    mkdirSync(path.dirname(outP), { recursive: true });
    const r = spawnSync(FFMPEG, ['-hide_banner', '-loglevel', 'error', '-y', '-i', p, '-vf', "scale='min(1536,iw)':-2", '-q:v', '2', outP], { encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`ffmpeg resize failed for ${p}: ${r.stderr}`);
  }
  return `data:image/jpeg;base64,${readFileSync(outP).toString('base64')}`;
};

async function runOne(item) {
  if (existsSync(item.out)) { console.log(`[skip] exists: ${item.out}`); return { out: item.out, ok: true }; }
  const body = {
    model: item.model,
    prompt: item.prompt,
    image: item.refs.map(smallRef),
    size: item.size,
    watermark: false,
    response_format: 'b64_json',
  };
  console.log(`[gen] ${item.model} ${item.size} -> ${item.out}`);
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) { console.error(`[FAIL ${res.status}] ${item.out}\n${text.slice(0, 1500)}`); return { out: item.out, ok: false }; }
  const json = JSON.parse(text);
  const d = json.data?.[0];
  let imgBuf = null;
  if (d?.b64_json) imgBuf = Buffer.from(d.b64_json, 'base64');
  else if (d?.url) imgBuf = Buffer.from(await (await fetch(d.url)).arrayBuffer());
  if (!imgBuf) { console.error(`[FAIL no-image] ${item.out}\n${text.slice(0, 1000)}`); return { out: item.out, ok: false }; }
  mkdirSync(path.dirname(item.out), { recursive: true });
  writeFileSync(item.out, imgBuf);
  console.log(`[ok] saved ${item.out} (${Math.round(imgBuf.length / 1024)} KB)`);
  return { out: item.out, ok: true };
}

const results = [];
for (const item of manifest) results.push(await runOne(item)); // sequential, fail fast
const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - failed.length}/${results.length} ok ===`);
for (const f of failed) console.log(`FAILED: ${f.out}`);
process.exit(failed.length ? 1 : 0);
