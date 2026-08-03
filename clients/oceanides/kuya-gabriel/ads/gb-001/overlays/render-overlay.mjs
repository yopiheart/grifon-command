#!/usr/bin/env node
// GB-001 overlay renderer — HTML composition -> video, deterministiko.
//
//   node <this> --html hook-overlay.html --out hook-overlay.mov --dur 2.6 --alpha
//   node <this> --html quote-card.html   --out quote-card.mp4   --dur 3.4
//
// BAKIT HTML AT HINDI DRAWTEXT (Neil, 2026-08-03): "ang nagpaganda pa sa KM003
// meron tong html/hyperframes na ginamit bilang b-roll o call to action sa huli
// na may numero/animations sa text." Ang GB-001 v1 ay purong drawtext band at
// yun ang isa sa anim na dahilan kung bakit sya bumagsak.
//
// BAKIT PNG SEQUENCE AT HINDI CSS ANIMATION: ang bawat composition ay
// naglalantad ng `window.render(t, dur)`. Tinatawag namin sya kada frame at
// kinukunan ng screenshot. Walang inaasahang totoong oras, kaya pareho ang
// labas sa bawat takbo — mahalaga yun sa cafe PC na nire-restore araw-araw.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };
const has = (n) => argv.includes(n);

const htmlArg = arg('--html');
const outArg = arg('--out');
const dur = +(arg('--dur') || 3);
const fps = +(arg('--fps') || 30);
const alpha = has('--alpha');
if (!htmlArg || !outArg) { console.error('kailangan ang --html at --out'); process.exit(2); }

const here = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const htmlPath = path.resolve(existsSync(htmlArg) ? htmlArg : path.join(here, htmlArg));
const outPath = path.resolve(existsSync(path.dirname(outArg)) ? outArg : path.join(here, outArg));
mkdirSync(path.dirname(outPath), { recursive: true });

const ffmpeg = (() => {
  const local = path.resolve('.tools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe');
  return existsSync(local) ? local : 'ffmpeg';
})();

const frames = Math.max(1, Math.round(dur * fps));
const tmp = mkdtempSync(path.join(tmpdir(), 'gb001-ovl-'));

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  for (let i = 0; i < frames; i++) {
    const t = i / fps;
    await page.evaluate(([t, d]) => window.render && window.render(t, d), [t, dur]);
    await page.screenshot({
      path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`),
      omitBackground: alpha,
    });
  }
  await page.close();
} finally {
  await browser.close();
}

// qtrle = alpha na nabubuhay sa MOV; ang h264 ay walang alpha channel.
const codec = alpha
  ? ['-c:v', 'qtrle', '-pix_fmt', 'argb']
  : ['-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p'];
const r = spawnSync(ffmpeg, [
  '-y', '-v', 'error', '-framerate', String(fps),
  '-i', path.join(tmp, 'f%04d.png'), ...codec, outPath,
], { stdio: 'inherit' });
rmSync(tmp, { recursive: true, force: true });
if (r.status !== 0) { console.error('[overlay] bagsak ang ffmpeg'); process.exit(1); }
console.log(`[overlay] ✓ ${path.relative(process.cwd(), outPath)} (${frames} frame, ${dur}s${alpha ? ', may alpha' : ''})`);
