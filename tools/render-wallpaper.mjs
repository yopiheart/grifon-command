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

// CSS canvas is 1920x1080; deviceScaleFactor picks the output resolution.
const SCALES = [
  { dsf: 2, tag: '3840x2160' },
  { dsf: 1, tag: '1920x1080' },
];

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
    for (const { dsf, tag } of SCALES) {
      const page = await browser.newPage({
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: dsf,
      });
      const url = pathToFileURL(path.join(DIR, file)).href;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
      await page.waitForTimeout(1200);
      const el = await page.$('#canvas');
      if (!el) throw new Error(`#canvas not found in ${file}`);
      const out = path.join(DIR, `${base}-${tag}.png`);
      await el.screenshot({ path: out });
      console.log(`rendered ${path.relative(process.cwd(), out)}`);
      await page.close();
    }
  }
} finally {
  await browser.close();
}
