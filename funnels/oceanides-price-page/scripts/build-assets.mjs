#!/usr/bin/env node
/**
 * build-assets.mjs — optimise the Oceanides brand assets into this funnel's public/.
 *
 * WHY THIS EXISTS
 * The source assets in clients/oceanides/assets/ are 1.8-4 MB PNGs. This is an ad
 * landing page: every extra byte is measurable on a Philippine mobile connection,
 * and the whole funnel ships zero external requests, so nothing can be offloaded
 * to a CDN. This resizes + re-encodes to webp with a jpeg fallback where needed.
 *
 * The OUTPUT is committed. Two reasons: (1) `npx vercel deploy` runs from inside
 * funnels/oceanides-price-page/ and cannot see the repo root, so the deploy must
 * be self-contained; (2) the cafe-PC defreezer wipes node_modules, and sharp is a
 * root dev dependency — a future session may not be able to re-run this at all.
 * Committing the output means the deploy never depends on this script working.
 *
 * SOURCE OF TRUTH stays clients/oceanides/assets/. Re-run after changing one:
 *   node funnels/oceanides-price-page/scripts/build-assets.mjs      (from repo root)
 *
 * ⛔ VERIFIED BEFORE INCLUSION (clients/oceanides/DESIGN.md Don'ts):
 *  - truck-street / van: eyeballed 2026-07-30. WHITE cab + silver aluminium closed
 *    van = the real fleet. NOT the invented blue vacuum tanker, which is a hard ban
 *    on every customer-facing surface.
 *  - before/after pairs are DELIBERATELY EXCLUDED. tb2-ba2/ba3 look like a genuine
 *    matched pair, but the `tb2-` prefix comes from the AI branch-page generator and
 *    provenance is unconfirmed. "Walang fake proof" — presenting an AI render as a
 *    real job is the blue-tanker mistake at a larger scale. Waiting on Neil.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const HERE = dirname(fileURLToPath(import.meta.url));
const INSTANCE = resolve(HERE, '..');
const REPO_ROOT = resolve(INSTANCE, '..', '..');
const SRC = join(REPO_ROOT, 'clients', 'oceanides', 'assets');
const OUT = join(INSTANCE, 'public', 'img');

/** @type {Array<{src: string, out: string, width: number, quality?: number, fit?: string}>} */
const JOBS = [
  // Logo — 316x316 jpeg with a near-white ground (sampled 243,252,251), so it is
  // rendered on a paper chip in the UI rather than keyed out. Keying white from a
  // JPEG leaves fringing on the navy.
  { src: 'logo.jpg', out: 'logo.webp', width: 256, quality: 88 },

  // Official marks. Both carry real alpha, so they drop straight onto navy.
  // badge-denr is a 704x78 wide lockup, badge-bir a 1280 square — different
  // aspect ratios, so they are sized by WIDTH and aligned on a shared row height.
  { src: 'badge-denr.png', out: 'badge-denr.webp', width: 420, quality: 90 },
  { src: 'badge-bir.png', out: 'badge-bir.webp', width: 200, quality: 90 },

  // Hero: real Philippine street, real fleet. Landscape suits the photoScrim
  // (the brand's one sanctioned cinematic move: a left-to-right navy wash).
  { src: 'tb2-truck-street.png', out: 'hero-truck.webp', width: 1280, quality: 74 },

  // Studio cutout of the same van for the narrower proof slot.
  { src: 'van-clean.png', out: 'van.webp', width: 720, quality: 78 },
];

const kb = (n) => `${Math.round(n / 1024)} KB`;

await mkdir(OUT, { recursive: true });

let total = 0;
for (const job of JOBS) {
  const inPath = join(SRC, job.src);
  const outPath = join(OUT, job.out);
  try {
    const buf = await sharp(inPath)
      .resize({ width: job.width, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: job.quality ?? 80 })
      .toBuffer();
    await writeFile(outPath, buf);
    total += buf.byteLength;
    console.log(`  ${job.src.padEnd(24)} -> public/img/${job.out.padEnd(20)} ${kb(buf.byteLength)}`);
  } catch (err) {
    console.error(`FAILED ${job.src}: ${err.message}`);
    process.exitCode = 1;
  }
}
console.log(`\ntotal: ${kb(total)} across ${JOBS.length} files`);
