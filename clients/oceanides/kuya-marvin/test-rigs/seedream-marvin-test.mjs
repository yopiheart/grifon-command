#!/usr/bin/env node
// Seedream 5.0 (Pro/Lite via fal.ai) Marvin identity test — dev-time script.
// Pay-as-you-go on FAL_KEY (no BytePlus subscription needed for the eyeball gate).
// Usage (repo root): node .tmp/seedream-marvin-test.mjs --manifest .tmp/seedream-manifest.json
// Manifest item: { endpoint, prompt, out, width, height, refs: [paths] }
// Notes from research: watermark defaults ON upstream (we pass every known off-switch),
// result URLs expire in 24h (we download immediately), no seed support (rolls not reproducible).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const KEY = process.env.FAL_KEY;
if (!KEY) throw new Error('FAL_KEY missing in .env — sign up at fal.ai, add FAL_KEY=<key>');

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const manifest = JSON.parse(readFileSync(arg('--manifest'), 'utf8'));

// fal accepts data URIs for image inputs; refs are 3-4MB 4096px JPEGs, so downscale
// once to <=1536px q90 via the repo's ffmpeg-static to keep request bodies sane.
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
    prompt: item.prompt,
    image_urls: item.refs.map(smallRef),
    image_size: { width: item.width, height: item.height },
    num_images: 1,
    // watermark off-switches — different hosts name it differently; unknown keys are ignored
    watermark: false,
    enable_watermark: false,
    output_format: 'png',
  };
  console.log(`[gen] ${item.endpoint} -> ${item.out}`);
  const res = await fetch(`https://fal.run/${item.endpoint}`, {
    method: 'POST',
    headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) { console.error(`[FAIL ${res.status}] ${item.out}\n${text.slice(0, 1500)}`); return { out: item.out, ok: false }; }
  const json = JSON.parse(text);
  const url = json.images?.[0]?.url || json.image?.url;
  if (!url) { console.error(`[FAIL no-image] ${item.out}\n${text.slice(0, 1000)}`); return { out: item.out, ok: false }; }
  const imgBuf = url.startsWith('data:')
    ? Buffer.from(url.split(',')[1], 'base64')
    : Buffer.from(await (await fetch(url)).arrayBuffer());
  mkdirSync(path.dirname(item.out), { recursive: true });
  writeFileSync(item.out, imgBuf);
  console.log(`[ok] saved ${item.out} (${Math.round(imgBuf.length / 1024)} KB)`);
  return { out: item.out, ok: true };
}

const results = [];
for (const item of manifest) results.push(await runOne(item)); // sequential — pay-per-image, fail fast on param errors
const failed = results.filter((r) => !r.ok);
console.log(`\n=== ${results.length - failed.length}/${results.length} ok ===`);
for (const f of failed) console.log(`FAILED: ${f.out}`);
process.exit(failed.length ? 1 : 0);
