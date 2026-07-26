#!/usr/bin/env node
// Build the Preset Foundry artifact: inline the five real caption/hook faces
// and one real frame from the KM-003 cut into the template. Fonts are inlined
// because the Artifact CSP blocks font CDNs, and a silent fallback would make
// a page whose whole job is judging typography useless.
//
//   node clients/oceanides/kuya-marvin/ads/build-preset-foundry.mjs
//
// Writes the self-contained page to .tmp/preset-foundry.html (gitignored —
// the template + this script are the committed sources).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const ROOT = process.cwd();
if (!existsSync(path.join(ROOT, 'api/_lib/assets/fonts/Anton-Regular.ttf'))) {
  console.error('ERROR: run from the repo root'); process.exit(1);
}

const AD = 'clients/oceanides/kuya-marvin/ads';
const F = 'api/_lib/assets/fonts';
const b64 = (p) => readFileSync(path.join(ROOT, p)).toString('base64');

// A real frame from the cut, small + hard-compressed: the comparison is only
// honest over a busy plate (a flat gradient flatters every preset equally).
mkdirSync(path.join(ROOT, '.tmp'), { recursive: true });
const framePath = path.join(ROOT, '.tmp', 'foundry-frame.jpg');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-ss', '12.0',
  '-i', path.join(ROOT, AD, 'km-003/KM-003-AD-v2.mp4'),
  '-frames:v', '1', '-vf', 'scale=288:512', '-q:v', '7', framePath]);

let html = readFileSync(path.join(ROOT, AD, 'preset-foundry.template.html'), 'utf8');
const subs = {
  __ANTON__: b64(`${F}/Anton-Regular.ttf`),
  __ARCHIVO__: b64(`${F}/ArchivoBlack-Regular.ttf`),
  __BANGERS__: b64(`${F}/Bangers-Regular.ttf`),
  __INTER__: b64(`${F}/Inter-Black.ttf`),
  __MONT__: b64(`${F}/Montserrat-ExtraBold.ttf`),
  __FRAME__: readFileSync(framePath).toString('base64'),
};
for (const [k, v] of Object.entries(subs)) {
  if (!html.includes(k)) { console.error(`ERROR: placeholder ${k} missing`); process.exit(1); }
  html = html.replace(k, v);
}
const out = path.join(ROOT, '.tmp', 'preset-foundry.html');
writeFileSync(out, html);
console.log(`✓ ${out}  (${(html.length / 1024 / 1024).toFixed(2)} MB)`);
