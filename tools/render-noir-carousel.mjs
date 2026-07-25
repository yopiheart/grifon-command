// GRIFON noir carousel renderer — slide-*.html -> 1080x1350 PNG @2x (2160x2700).
// Same Playwright pattern as tools/render-wallpaper.mjs.
// Usage: node tools/render-noir-carousel.mjs [slide-name-filter ...]
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const DIR = path.resolve('assets/grifon-social/noir');
const requested = process.argv.slice(2);
const slides = fs.readdirSync(DIR)
  .filter((f) => /^slide-.*\.html$/.test(f))
  .filter((f) => requested.length === 0 || requested.some((r) => f.includes(r)))
  .sort();

if (slides.length === 0) {
  console.error('No slide-*.html found in assets/grifon-social/noir/');
  process.exit(1);
}

// Same sandbox escape hatch as tools/render-wallpaper.mjs: the web sandbox's
// pre-installed Chromium build number rarely matches the npm package's and
// `playwright install` is blocked by egress policy. Unset on the cafe PC, so
// behaviour there is unchanged.
//   PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;
const browser = await chromium.launch(executablePath ? { executablePath } : {});
try {
  for (const file of slides) {
    const page = await browser.newPage({
      viewport: { width: 1080, height: 1350 },
      deviceScaleFactor: 2,
    });
    const url = pathToFileURL(path.join(DIR, file)).href;
    await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(1200);
    const el = await page.$('#canvas');
    if (!el) throw new Error(`#canvas not found in ${file}`);
    const out = path.join(DIR, file.replace(/\.html$/, '.png'));
    await el.screenshot({ path: out });
    console.log(`rendered ${path.relative(process.cwd(), out)}`);
    await page.close();
  }
} finally {
  await browser.close();
}
