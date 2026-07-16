import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.resolve('.tmp/ad-run');
const jobs = [
  ['ad-z1-authority.html', 'zam-01-authority.png'],
  ['ad-z2-enemy.html', 'zam-02-agency-enemy.png'],
  ['ad-g1-uihero.html', 'grifon-01-ui-hero.png'],
  ['ad-g2-blackcanvas.html', 'grifon-02-black-canvas.png'],
  ['ad-g3-language.html', 'grifon-03-language.png'],
];

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 1080, height: 1350 },
  deviceScaleFactor: 1,
});
const page = await ctx.newPage();

for (const [src, out] of jobs) {
  await page.goto(pathToFileURL(path.join(dir, src)).href, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const el = await page.$('.ad');
  const box = await el.boundingBox();
  await el.screenshot({ path: path.join(dir, 'png', out) });
  console.log(`${out}  box=${box.width}x${box.height}`);
}

await browser.close();
console.log('done');
