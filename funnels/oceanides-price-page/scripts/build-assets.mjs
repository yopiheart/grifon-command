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

/**
 * `dir` is an OPTIONAL source folder relative to the repo root, for the few
 * assets that do not live in clients/oceanides/assets/. Gabriel's portrait is
 * an identity-lock plate, and identity-lock is where the approved likeness of a
 * real person lives — copying it into assets/ would create a second copy that
 * can drift from the one QA signed off on.
 *
 * @type {Array<{src: string, out: string, width: number, quality?: number, circle?: boolean, dir?: string}>}
 */
const JOBS = [
  // Logo — 316x316 JPEG. The artwork is a full-colour CIRCULAR badge (navy shield,
  // blue wave, navy wordmark) sitting on a white ground.
  //
  // Neil, 2026-07-30: "paano yan lulutang ng walang white background pero visible."
  // Three options were on the table and only one is honest:
  //   ✗ key the white to transparent — the artwork is NAVY on white, so on a navy
  //     page it would vanish into the background. Worse than the chip.
  //   ✗ knock it out to solid white — throws away the shield, the wave, and the
  //     colour, i.e. most of the logo.
  //   ✓ CIRCULAR MASK. The logo is already a disc; the white is part of the disc,
  //     not a background behind it. Cutting the square corners off makes it read
  //     as a deliberate decal/seal instead of a pasted rectangle — and print
  //     brands put full-colour seals on white by convention anyway.
  // `circle: true` composites an SVG circle with dest-in, and webp keeps the alpha.
  { src: 'logo.jpg', out: 'logo.webp', width: 320, quality: 90, circle: true },

  // Official marks. Both carry alpha, BUT their artwork is near-black, so they are
  // effectively invisible on navy (Neil: "hindi rin masyadong visible dahil black").
  // Fix is in the UI, not here: SocialProofBar renders them on the PAPER band.
  // That is also how official seals are used in print — never reversed out.
  { src: 'badge-denr.png', out: 'badge-denr.webp', width: 560, quality: 92 },
  { src: 'badge-bir.png', out: 'badge-bir.webp', width: 260, quality: 92 },

  // Before/after pairs — the only outcome proof the brand owns. There are no
  // testimonials, no review count, no years-in-service, and inventing any of
  // them is a hard ban, so these two pairs carry the whole proof burden.
  //
  // ⛔ Only MATCHED pairs ship. Each of these is the same fixture, same lighting,
  // same surrounding concrete, shot before and after — ba-2 even keeps the same
  // red pipe in frame. `before-1.jpg` / `after-1.jpg` were DROPPED: they are two
  // different fixtures (a screened grease trap vs a dark tank), so as a "pair"
  // they prove nothing and quietly teach the reader to distrust the others.
  // Two real pairs beat three with one fake.
  //
  // 640px / q68, lazy-loaded below the fold: proof has to be legible, not sharp.
  { src: 'tb2-ba2-before.png', out: 'ba-1-before.webp', width: 640, quality: 68 },
  { src: 'tb2-ba2-after.png', out: 'ba-1-after.webp', width: 640, quality: 68 },
  { src: 'tb2-ba3-before.png', out: 'ba-2-before.webp', width: 640, quality: 68 },
  { src: 'tb2-ba3-after.png', out: 'ba-2-after.webp', width: 640, quality: 68 },

  // Hero: real Philippine street, real fleet. Landscape suits the photoScrim
  // (the brand's one sanctioned cinematic move: a left-to-right navy wash).
  { src: 'tb2-truck-street.png', out: 'hero-truck.webp', width: 1280, quality: 74 },

  // Studio cutout of the same van for the narrower proof slot.
  { src: 'van-clean.png', out: 'van.webp', width: 720, quality: 78 },

  // Gabriel, the field inspector. Consent signed and images approved by Neil,
  // 2026-08-01 — the same gate the identity-lock artifact was held behind.
  // "Sino ang darating" is the last question a household asks before booking a
  // stranger into their yard, so this is evidence, not decoration.
  // Source is 1024x1536, so `withoutEnlargement` leaves it at native width.
  {
    src: 'gabriel-website-v4.png',
    out: 'gabriel.webp',
    width: 1200,
    quality: 78,
    dir: 'clients/oceanides/kuya-gabriel/identity-lock',
  },
];

const kb = (n) => `${Math.round(n / 1024)} KB`;

await mkdir(OUT, { recursive: true });

let total = 0;
for (const job of JOBS) {
  const inPath = job.dir ? join(REPO_ROOT, job.dir, job.src) : join(SRC, job.src);
  const outPath = join(OUT, job.out);
  try {
    let pipe = sharp(inPath).resize({ width: job.width, fit: 'inside', withoutEnlargement: true });

    if (job.circle) {
      // Square-in, disc-out. `dest-in` keeps only the pixels under the circle,
      // so the square corners become genuinely transparent rather than white.
      // The SVG circle is antialiased, which is what stops the rim from jaggying
      // against navy the way a hard threshold would.
      const { width = job.width, height = job.width } = await pipe.metadata();
      const d = Math.min(width, height);
      const mask = Buffer.from(
        `<svg width="${width}" height="${height}"><circle cx="${width / 2}" cy="${height / 2}" r="${d / 2}" fill="#fff"/></svg>`,
      );
      pipe = sharp(await pipe.png().toBuffer()).composite([{ input: mask, blend: 'dest-in' }]);
    }

    const buf = await pipe.webp({ quality: job.quality ?? 80, alphaQuality: 100 }).toBuffer();
    await writeFile(outPath, buf);
    total += buf.byteLength;
    console.log(`  ${job.src.padEnd(24)} -> public/img/${job.out.padEnd(20)} ${kb(buf.byteLength)}`);
  } catch (err) {
    console.error(`FAILED ${job.src}: ${err.message}`);
    process.exitCode = 1;
  }
}
console.log(`\ntotal: ${kb(total)} across ${JOBS.length} files`);
