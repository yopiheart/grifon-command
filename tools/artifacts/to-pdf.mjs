#!/usr/bin/env node
// Render a committed standalone artifact page to PDF.
//
// Why: the claude.ai share button refused "Anyone with the link" for this
// artifact, and an .html attachment does not preview inside most phone
// messengers. A PDF opens everywhere, on any device, with no sign-in — so it is
// the phone-friendly half of the standalone-twin rule in CLAUDE.md.
//
// Usage: node tools/artifacts/to-pdf.mjs <input.html> <output.pdf>

import { chromium } from 'playwright';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const [inArg, outArg] = process.argv.slice(2);
if (!inArg || !outArg) {
  console.error('usage: node tools/artifacts/to-pdf.mjs <input.html> <output.pdf>');
  process.exit(1);
}
const input = resolve(inArg);
if (!existsSync(input)) { console.error(`not found: ${input}`); process.exit(1); }
const output = resolve(outArg);

// Playwright's bundled Chromium is wiped by the cafe-PC defreezer, so drive an
// already-installed system browser instead of re-downloading ~150MB each session.
// Edge ships with Windows 10, Chrome is the fallback, bundled Chromium is last.
let browser = null;
for (const channel of ['msedge', 'chrome', null]) {
  try { browser = await chromium.launch(channel ? { channel } : {}); break; }
  catch { /* try the next one */ }
}
if (!browser) {
  console.error('NO_BROWSER: no msedge/chrome/bundled chromium available. Run: npx playwright install chromium');
  process.exit(2);
}
const page = await browser.newPage({ viewport: { width: 900, height: 1400 } });
await page.goto(pathToFileURL(input).href, { waitUntil: 'load' });

// The page's charcoal ground and grain are position:fixed, which paint only on
// page 1 of a PDF — every later page would come out white with near-white text
// on it. Repaint the ground as a solid body background (which printBackground
// carries onto every page) and drop the fixed layers.
await page.addStyleTag({ content: `
  @media print {
    html, body { background: #0B0B0D !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .ground, .grain { display: none !important; }
    .reveal { opacity: 1 !important; transform: none !important; }
    .glass { break-inside: avoid; }
    .strip { overflow: visible !important; flex-wrap: wrap !important; }
    section { break-inside: auto; }
  }
` });
// Scroll-reveal is IntersectionObserver-driven; force every section visible.
await page.evaluate(() => document.querySelectorAll('.reveal').forEach(e => e.classList.add('in')));

await page.pdf({
  path: output,
  format: 'A4',
  printBackground: true,
  margin: { top: '14mm', bottom: '14mm', left: '12mm', right: '12mm' },
});
await browser.close();
console.log(`wrote ${output}`);
