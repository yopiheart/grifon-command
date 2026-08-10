// Wallpaper renderer — HTML variants -> pixel-exact PNGs at 4K + 1080p.
// Adapted from clients/oceanides/render.mjs (same Playwright screenshot pattern).
// Usage: node tools/render-wallpaper.mjs [variant-glob-name ...]
//   (no args = render every assets/wallpapers/wallpaper-*.html)
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const DIR = path.resolve('assets/wallpapers');
const requested = process.argv.slice(2);
const variants = fs.readdirSync(DIR)
  .filter((f) => /^wallpaper-.*\.html$/.test(f))
  .filter((f) => requested.length === 0 || requested.some((r) => f.includes(r)));

if (variants.length === 0) {
  console.error('No wallpaper-*.html variants found in assets/wallpapers/');
  process.exit(1);
}

// The CSS canvas size is READ FROM THE PAGE, not assumed. It was hardcoded to
// 1920x1080 until the portrait phone variants landed (2026-08-08), which need a
// 1080x2340 canvas and a viewport tall enough to hold it — a short viewport
// makes backdrop-filter and mask layers sample a region that was never
// composited, so the glass renders subtly wrong instead of failing loudly.
//
// Output tags are computed as canvas x deviceScaleFactor, which reproduces the
// existing desktop filenames exactly (1920x1080 @2 = the 3840x2160 files) while
// naming the phone renders correctly with no extra flag.
const SCALES = [{ dsf: 2 }, { dsf: 1 }];

// Cafe PC has the browser Playwright expects, so launch() just works there.
// The Claude-Code-on-web sandbox ships a pre-installed Chromium whose build
// number rarely matches the npm package's, and `playwright install` is blocked
// by egress policy — so allow an explicit binary override instead of failing.
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  for (const file of variants) {
    const base = file.replace(/\.html$/, '');
    const url = pathToFileURL(path.join(DIR, file)).href;

    // Probe pass: measure #canvas so the real passes get a viewport that
    // actually contains it.
    const probe = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await probe.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    const size = await probe.evaluate(() => {
      const el = document.querySelector('#canvas');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { w: Math.round(r.width), h: Math.round(r.height) };
    });
    await probe.close();
    if (!size) throw new Error(`#canvas not found in ${file}`);

    for (const { dsf } of SCALES) {
      const page = await browser.newPage({
        viewport: { width: size.w, height: size.h },
        deviceScaleFactor: dsf,
      });
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      await page.waitForTimeout(1200);
      const el = await page.$('#canvas');
      if (!el) throw new Error(`#canvas not found in ${file}`);
      const tag = `${size.w * dsf}x${size.h * dsf}`;
      const out = path.join(DIR, `${base}-${tag}.png`);
      await el.screenshot({ path: out });
      console.log(`rendered ${path.relative(process.cwd(), out)}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
