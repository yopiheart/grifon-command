#!/usr/bin/env node
// KM-004 b-roll motion + screen recording ng totoong page.
//
//   export PATH="$PWD/.tools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin:$PATH"
//   node clients/oceanides/kuya-marvin/ads/km-004/make-broll.mjs
//
// TATLONG PIRASO, LAHAT $0:
//   b1.mp4   plunger, dahan-dahang push-in
//   b2.mp4   phone, dahan-dahang lakad mula phone papuntang papel
//   page.mp4 1.2s na sulyap sa TOTOONG oceanidesph.com
//
// ⛔ WALA PANG KLING. Ang deklaradong lane sa script.spec.json ay Kling para sa
// dalawang b-roll (`motion: "Kling"`), at yun ang ipinapatupad ng preflight.
// Pero BAYAD sya at ubos ang Gemini budget ni Neil; hiwalay ang Kling account
// at hindi pa napapatunayang may credit. Kaya still + FFmpeg muna, kapareho ng
// ginawa ng GB-001 v3. Kapag may Kling credit, ang dalawang shot LANG ang
// papalitan — hindi na ulit ang buong build.
//
// 🔴 ANG PAGE BEAT AY 1.2s, PATUNAY LANG, HINDI BABASAHIN (aral 17). Ang
// GB-001 v2 ay may 5.6s na tuloy-tuloy na scroll na walang makakabasa sa 375px.
// Ang ayos: mabilis na sulyap na nagpapatunay na TOTOO ang page, tapos hard cut
// sa ticket-card na nababasa. Ang card ang nagdadala ng nilalaman, hindi ito.

import { chromium } from 'playwright';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const AD = 'clients/oceanides/kuya-marvin/ads/km-004';
const W = 720, H = 1280, FPS = 30;
const ffmpeg = (() => {
  const local = path.resolve('.tools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe');
  return existsSync(local) ? local : 'ffmpeg';
})();
mkdirSync(`${AD}/broll`, { recursive: true });

const run = (args, label) => {
  const r = spawnSync(ffmpeg, args, { encoding: 'utf8' });
  if (r.status !== 0) { console.log(` BAGSAK  ${label}\n${r.stderr.split('\n').slice(-6).join('\n')}`); return false; }
  console.log(`  OK  ${label}`);
  return true;
};

// --- b1: push-in sa gomang lubog sa tubig ------------------------------------
// Papalapit ka sa mismong bagay na hindi umuubra. `zoompan` sa isang still,
// deterministiko at $0. 1.00 -> 1.14 sa buong beat: kita pero hindi mahilo.
const B1_DUR = 3.2;
run([
  '-y', '-v', 'error', '-loop', '1', '-i', `${AD}/broll/b1.png`, '-t', String(B1_DUR),
  '-vf', [
    `scale=${W * 3}:-1`,
    `zoompan=z='min(1.0+0.14*on/(${Math.round(B1_DUR * FPS)}-1),1.14)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=${W}x${H}:fps=${FPS}`,
    'setsar=1',
  ].join(','),
  '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', `${AD}/broll/b1.mp4`,
], 'b1.mp4  push-in sa plunger');

// --- b2: lakad mula PHONE papuntang PAPEL ------------------------------------
// 🔴 KUWENTO ANG GALAW, HINDI DEKORASYON. Ang linya ay "Isa ang presyo sa
// phone, iba na sa receipt." Ang camera mismo ang naglalakbay mula sa phone
// papunta sa nakatuping papel habang binibigkas yun. Wala pa tayong ganitong
// shot kahit kailan. Pahilis pababa ang lakad kasi doon nakaupo ang papel sa
// litrato: kanang-baba.
const B2_DUR = 3.4;
const B2_FRAMES = Math.round(B2_DUR * FPS);
run([
  '-y', '-v', 'error', '-loop', '1', '-i', `${AD}/broll/b2.png`, '-t', String(B2_DUR),
  '-vf', [
    `scale=${W * 3}:-1`,
    `zoompan=z='1.22':x='iw/2-(iw/zoom/2)+(iw*0.16)*on/(${B2_FRAMES}-1)':y='ih/2-(ih/zoom/2)+(ih*0.10)*on/(${B2_FRAMES}-1)':d=1:s=${W}x${H}:fps=${FPS}`,
    'setsar=1',
  ].join(','),
  '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', `${AD}/broll/b2.mp4`,
], 'b2.mp4  lakad mula phone papuntang papel');

// --- page: 1.2s na sulyap sa TOTOONG page ------------------------------------
const PAGE_DUR = 1.2;
const URL = 'https://oceanidesph.com/';
const shot = `${AD}/broll/page.png`;

console.log(`\nKinukuha ang totoong page: ${URL}`);
const browser = await chromium.launch();
try {
  // 390px ang lapad — totoong telepono, at yun din ang lapad na sinusukat natin
  // sa 375px na read test. Ang page na kinuha sa desktop ay ibang page.
  const p = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });
  await p.goto(URL, { waitUntil: 'networkidle', timeout: 60000 });
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(1200);
  await p.screenshot({ path: shot, fullPage: true });
  await p.close();
  console.log(`  OK  page.png  (390px, 3x)`);
} catch (e) {
  console.log(`  BAGSAK ang page capture: ${e.message}`);
} finally { await browser.close(); }

if (existsSync(shot)) {
  // 🔴 ABSOLUTONG PIXEL, HINDI PORSYENTO NG TAAS NG PAGE. Ang full-page
  // screenshot ay 34,533px ang taas. Ang porsyento ay walang kahulugan doon:
  // ang 0.55 ay tumatalon ng ~18,000px at PUTING BAKANTE ang huling kalahati ng
  // beat, at kahit ang 0.09 ay ~3,000px pa rin. Nahuli pareho ng frame check.
  // Ang totoong ₱5,000 na headline at ticket ay nasa unang screen pa lang.
  // Kaya: magsimula sa 40px, umanod ng 180px. Hindi sya scroll, sulyap sya —
  // patunay na TOTOO ang page, at ang ticket-card ang susunod na may nilalaman.
  run([
    '-y', '-v', 'error', '-loop', '1', '-i', shot, '-t', String(PAGE_DUR),
    '-vf', [
      `scale=${W}:-1`,
      `crop=${W}:${H}:0:'40+180*min(1,t/${PAGE_DUR})'`,
      'setsar=1', `fps=${FPS}`,
    ].join(','),
    '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', `${AD}/broll/page.mp4`,
  ], 'page.mp4  1.2s na sulyap sa totoong page');
}
