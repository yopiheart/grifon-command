// Oceanides batch builder — posts.json + layout templates -> pixel-exact PNGs.
// Usage: node build.mjs           (build all posts in posts.json)
//        node build.mjs id1 id2   (build only these ids)
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('clients/oceanides');
const only = process.argv.slice(2);
let posts = JSON.parse(fs.readFileSync(path.join(ROOT, 'posts.json'), 'utf8'));
if (only.length) posts = posts.filter(p => only.includes(p.id));

const tpl = {
  list: fs.readFileSync(path.join(ROOT, 'templates/layout-list.html'), 'utf8'),
  hero: fs.readFileSync(path.join(ROOT, 'templates/layout-hero.html'), 'utf8'),
};
const itemsHtml = items => items
  .map((t, i) => `<div class="item"><div class="n">${i + 1}</div><div class="x">${t}</div></div>`)
  .join('\n');

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 2 });
  for (const p of posts) {
    if (!tpl[p.layout]) { console.log('SKIP (unknown layout)', p.id); continue; }
    let html = tpl[p.layout]
      .replaceAll('{{BG}}', () => p.bg)
      .replaceAll('{{EYEBROW}}', () => p.eyebrow)
      .replaceAll('{{HEADLINE}}', () => p.headline);
    html = p.layout === 'list'
      ? html.replaceAll('{{ITEMS}}', () => itemsHtml(p.items || []))
      : html.replaceAll('{{SUB}}', () => p.sub || '');
    const genPath = path.join(ROOT, 'templates', `_gen-${p.id}.html`);
    fs.writeFileSync(genPath, html);
    await page.goto(pathToFileURL(genPath).href, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(1000);
    const el = await page.$('#canvas');
    await el.screenshot({ path: path.join(ROOT, 'out', `${p.id}.png`) });
    console.log('rendered', p.id);
  }
} finally {
  await browser.close();
}
