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

// ---------------------------------------------------------------------------
// PROFILE — Gabriel, smiling (v1, not the neutral v2).
//
// A face, not the logo badge. The badge carries four tiers of type
// ("OCEANIDES" / "Malabanan Services" / "SIPHONING SEPTIC TANKS" / "PEST
// CONTROL") and three of them are unreadable at 176px, which is the size that
// actually ships beside every post and in the Messenger thread header. A face
// survives any size, and "kapitbahay na eksperto" IS the positioning.
//
// The crop tightens onto head-and-shoulders. The source frames him from the
// chest up with sky above, and a circle mask would spend half its area on wall
// and tree. 800px window from a 1254px square, centred on the face.
// ---------------------------------------------------------------------------
const profileSrc = resolve(CLIENT, 'kuya-gabriel/identity-lock/gabriel-profile-v1.png');
await sharp(profileSrc)
  .extract({ left: 240, top: 40, width: 800, height: 800 })
  .resize(1080, 1080, { kernel: 'lanczos3' })
  .png()
  .toFile(resolve(OUT, 'fb-profile-gabriel-1080.png'));

// ---------------------------------------------------------------------------
// COVER — the REAL truck photo, watermark and all.
//
// Deliberately not the AI cover plate (gabriel-cover-v3.png). Two reasons, and
// the second is the disqualifying one:
//
//   1. This Page's whole argument is "hindi kami peke." The two most-looked-at
//      images on it should be the ones we did not generate. The photo already
//      carries the OCEANIDES watermark, so the branding comes free.
//   2. The AI plate puts Gabriel at the bottom LEFT, which is exactly where
//      Facebook parks the profile picture on desktop, and its 3:2 source loses
//      his head and his feet once cropped to a 1.77:1 cover band. It is a good
//      picture in the wrong shape for this slot.
//
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
console.log('  fb-profile-gabriel-1080.png     (176px circle safe)');
console.log('  fb-cover-truck-1640x924.png     (bottom-left kept clear)');
