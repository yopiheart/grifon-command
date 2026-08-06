#!/usr/bin/env node
// Rebuild the "One Hook, Twelve Worlds" artifact page from committed sources.
//
// The published artifact lives at
//   https://claude.ai/code/artifact/6a32f03b-89af-4a98-a207-55e904b499c9
// but its SOURCE previously lived only in a session scratchpad, which the cafe-PC
// defreezer wipes. This script makes the page reproducible from the repo alone:
// the template is committed beside it, and the 12 inline thumbnails are derived
// from assets/ad-swipe/E82-E93 (also committed) rather than a temp cache.
//
// Usage:  node tools/artifacts/build-one-hook-twelve-worlds.mjs [--out <path>]
// Then:   publish the emitted HTML with the Artifact tool, passing
//         url: https://claude.ai/code/artifact/6a32f03b-89af-4a98-a207-55e904b499c9
//         so it REDEPLOYS in place instead of minting a new URL.

import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalize } from './_gates.mjs';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TPL = join(REPO_ROOT, 'tools', 'artifacts', 'one-hook-twelve-worlds.tpl.html');
const FIRST = 82, LAST = 93;
const THUMB_WIDTH = 360, THUMB_QUALITY = 68;

const outFlag = process.argv.indexOf('--out');
const OUT = outFlag !== -1 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1])
  // Defaults to the COMMITTED twin path, not .tmp/ — the twin is the share
  // mechanism and the defreezer eats .tmp/, so a builder that lands there by
  // default produces nothing that survives the session (and it errored outright
  // when .tmp/ did not exist). Standing rule: artifacts/<slug>.html.
  : join(REPO_ROOT, 'artifacts', 'one-hook-twelve-worlds.html');

let html = readFileSync(TPL, 'utf8');

for (let n = FIRST; n <= LAST; n++) {
  const src = join(REPO_ROOT, 'assets', 'ad-swipe', `E${n}-russell-brunson.jpg`);
  const buf = await sharp(src)
    .resize({ width: THUMB_WIDTH })
    .jpeg({ quality: THUMB_QUALITY, mozjpeg: true })
    .toBuffer();
  const token = `__E${n}__`;
  if (!html.includes(token)) {
    console.error(`[warn] ${token} not present in template — skipped`);
    continue;
  }
  html = html.split(token).join(`data:image/jpeg;base64,${buf.toString('base64')}`);
}

// Shared gates: unsubstituted-token guard, the banned clipped-text property, and
// the pure-ASCII rule that keeps the bare-file twin from mojibaking. See _gates.mjs.
html = finalize(html, {
  label: 'one-hook-twelve-worlds',
  leftover: [/__E\d+__/g],
});

writeFileSync(OUT, html, 'utf8');
console.log(`wrote ${OUT} (${Math.round(html.length / 1024)}KB)`);
