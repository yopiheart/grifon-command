// Oceanides local renderer — HTML template -> pixel-exact PNG.
// Usage: node render.mjs <html-path> <out-png> [width=1080] [height=1350]
// Reusable for every post (creative overlays + proof composites). Cheap + local.
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const [htmlArg, outArg, wArg = '1080', hArg = '1350'] = process.argv.slice(2);
if (!htmlArg || !outArg) {
  console.error('Usage: node render.mjs <html> <out.png> [w] [h]');
  process.exit(1);
}
const W = parseInt(wArg, 10), H = parseInt(hArg, 10);

const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: W, height: H },
    deviceScaleFactor: 2, // 2x for crisp text; output is exact aspect (2160x2700 for 1080x1350)
  });
  const url = pathToFileURL(path.resolve(htmlArg)).href;
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
  await page.waitForTimeout(1200);
  const el = await page.$('#canvas');
  if (!el) throw new Error('#canvas element not found');
  await el.screenshot({ path: outArg });
  const box = await el.boundingBox();
  console.log(`rendered ${outArg}  (css ${Math.round(box.width)}x${Math.round(box.height)} @2x)`);
} finally {
  await browser.close();
}
