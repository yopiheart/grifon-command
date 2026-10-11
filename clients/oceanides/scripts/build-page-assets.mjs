#!/usr/bin/env node
/**
 * build-page-assets.mjs — ready-to-upload Facebook Page images for Oceanides.
 *
 * WHY A SCRIPT AND NOT "crop it yourself"
 * Facebook crops both slots, differently, and neither crop is the one you see
 * while you are choosing the file. The profile picture becomes a CIRCLE at
 * 176px, so anything with four tiers of small type turns to mush; the cover is
 * cropped wide on desktop and taller on mobile, and on desktop the profile
 * picture sits ON TOP of its bottom-left corner. Getting that right by eye,
 * twice, on a phone, is how a Page ends up with a beheaded photo.
 *
 * So the crops are computed here, from committed sources, and the output is a
 * file you upload without touching. Re-runnable after the defreezer.
 *
 * Run: node clients/oceanides/scripts/build-page-assets.mjs
 */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT = resolve(HERE, '..');
const REPO = resolve(CLIENT, '..', '..');
const OUT = resolve(CLIENT, 'page-assets');

await mkdir(OUT, { recursive: true });

// COVER — existing fleet-context photo.
// 1640x924 is the size Facebook wants uploaded; a centred band of the source
// keeps the truck whole and drops only sky and road.
// ---------------------------------------------------------------------------
const coverSrc = resolve(REPO, 'funnels/oceanides-price-page/public/img/hero-truck.webp');
const { width, height } = await sharp(coverSrc).metadata();
const bandHeight = Math.round(width / (1640 / 924));
await sharp(coverSrc)
  .extract({ left: 0, top: Math.round((height - bandHeight) / 2), width, height: bandHeight })
  .resize(1640, 924, { kernel: 'lanczos3' })
  .png()
  .toFile(resolve(OUT, 'fb-cover-truck-1640x924.png'));

console.log('page assets ->', OUT);
console.log('  fb-cover-truck-1640x924.png     (bottom-left kept clear)');
