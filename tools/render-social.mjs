// Generic GRIFON social renderer — every *.html (except gallery.html) in a dir
// -> 1080x1350 PNG @2x (2160x2700). Same Playwright pattern as render-wallpaper.mjs.
// Usage: node tools/render-social.mjs <dir> [name-filter ...]
//   e.g. node tools/render-social.mjs assets/grifon-social/cream
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';

const [dirArg, ...requested] = process.argv.slice(2);
if (!dirArg) {
  console.error('Usage: node tools/render-social.mjs <dir> [name-filter ...]');
  process.exit(1);
}
const DIR = path.resolve(dirArg);
const files = fs.readdirSync(DIR)
  .filter((f) => f.endsWith('.html') && f !== 'gallery.html')
  .filter((f) => requested.length === 0 || requested.some((r) => f.includes(r)))
  .sort();

if (files.length === 0) {
  console.error(`No renderable .html files in ${dirArg}`);
  process.exit(1);
}

const browser = await chromium.launch();
try {
  for (const file of files) {
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
