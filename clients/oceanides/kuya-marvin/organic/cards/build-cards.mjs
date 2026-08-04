// Value Week 01 — hook cards + BA composite renderer.
// Usage: node clients/oceanides/kuya-marvin/organic/cards/build-cards.mjs
// Renders #canvas @2x, same contract as clients/oceanides/render.mjs.
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));

const CARDS = [
  {
    out: 'post1-ulan-card.png',
    bg: '../stills-week01/vw1-s1-rain-gate.png',
    hook: 'Bakit tuwing umuulan, <em>may amoy sa banyo nyo?</em>',
  },
  {
    out: 'post3-senyales-card.png',
    bg: '../stills-week01/vw1-s2-tank-check.png',
    hook: '<em>Apat na senyales</em> na malapit nang mapuno ang septic tank nyo',
  },
  {
    out: 'post4-chemical-card.png',
    bg: '../stills-week01/vw1-s3-jug.png',
    hook: 'Yung binubuhos nyo sa inidoro, <em>baka sya pa ang sumisira</em>',
  },
  {
    out: 'post6-redflags-card.png',
    bg: '../stills-week01/vw1-s4-dusk-van.png',
    hook: '<em>Tatlong senyales</em> na dapat nyo bantayan bago magpa-siphon',
  },
];

const template = readFileSync(path.join(DIR, 'card-template.html'), 'utf8');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1350 },
    deviceScaleFactor: 2,
  });

  const renderFile = async (htmlPath, outPath) => {
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    await page.waitForTimeout(1200);
    const el = await page.$('#canvas');
    if (!el) throw new Error('#canvas not found: ' + htmlPath);
    await el.screenshot({ path: outPath });
    console.log('rendered ' + outPath);
  };

  for (const card of CARDS) {
    const html = template.replace('%%BG%%', card.bg).replace('%%HOOK%%', card.hook);
    const tmp = path.join(DIR, '.tmp-' + card.out.replace('.png', '.html'));
    writeFileSync(tmp, html);
    try {
      await renderFile(tmp, path.join(DIR, card.out));
    } finally {
      rmSync(tmp, { force: true });
    }
  }

  await renderFile(path.join(DIR, 'ba-card.html'), path.join(DIR, 'post2-beforeafter.png'));
} finally {
  await browser.close();
}
