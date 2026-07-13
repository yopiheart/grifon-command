import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const dir = path.resolve('.tmp/ad-run');
const jobs = [
  ['remix-01-im8.html', 'remix-01-im8-statstack.png'],
  ['remix-02-gruns.html', 'remix-02-gruns-goldcanvas.png'],
  ['remix-03-openai.html', 'remix-03-openai-tasklist.png'],
  ['remix-04-metabiz.html', 'remix-04-metabiz-checklist.png'],
  ['remix-05-gemini.html', 'remix-05-gemini-mascot.png'],
  ['remix-06-sabri.html', 'remix-06-sabri-callout.png'],
  ['remix-07-hormozi.html', 'remix-07-hormozi-card.png'],
  ['remix-08-kylie.html', 'remix-08-kylie-signature.png'],
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
