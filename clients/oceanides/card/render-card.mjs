/**
 * Oceanides business card -- HTML to press-ready PNG.
 *
 *   node clients/oceanides/card/render-card.mjs            # press files, no guides
 *   node clients/oceanides/card/render-card.mjs --guides   # review comp, trim+safe shown
 *
 * WHY A DEDICATED RENDERER AND NOT clients/oceanides/render.mjs
 * The house renderer is built for SOCIAL: it fixes a viewport, uses
 * deviceScaleFactor 2, and screenshots #canvas. Two of those are wrong for print.
 *
 *   RESOLUTION. The card is authored at 6px == 1mm. A press wants 300dpi, and
 *   1mm at 300dpi is 11.811px, so the scale factor is 11.811/6 == 1.9685 -- not
 *   2. Rendering at 2x would hand the printer a 305dpi file whose millimetre
 *   grid no longer lands on whole pixels.
 *
 *   BLEED. #canvas is 576x336 == 96x56mm: the 90x50mm trim plus 3mm of bleed all
 *   round. The printer trims INTO the artwork, so the background must already
 *   run past the cut line. Screenshotting the trim size instead would give a
 *   card with a white hairline on whichever edge the guillotine drifted.
 *
 * Output is RGB PNG. Most PH shops accept that and convert; a shop that insists
 * on CMYK gets the PNG converted with their own profile, which is better than us
 * guessing at one. The navy will shift slightly on press either way -- check a
 * printed proof against the van before approving the run.
 */
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const GUIDES = process.argv.includes('--guides');
const DPI = 300;
const MM_PER_PX = 1 / 6;                       // the authoring grid
const SCALE = (DPI / 25.4) * MM_PER_PX;        // 1.9685

const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
try {
  for (const face of ['front', 'back']) {
    const page = await browser.newPage({
      viewport: { width: 700, height: 460 },
      deviceScaleFactor: SCALE,
    });
    await page.goto(pathToFileURL(join(HERE, `${face}.html`)).href, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready).catch(() => {});
    if (GUIDES) await page.evaluate(() => document.getElementById('canvas').classList.add('guides'));
    await page.waitForTimeout(400);

    // Fail loudly rather than shipping a card set in a fallback face: an @font-face
    // that silently 404s still renders, just in Arial, and nobody notices until
    // the box of 200 arrives.
    const faceOk = await page.evaluate(() => document.fonts.check('21px ArchivoX'));
    if (!faceOk) throw new Error(`ArchivoX did not load for ${face}.html -- check the @font-face path`);

    // SAFE-MARGIN GATE. The guillotine drifts; anything closer than 3mm to the trim
    // can be shaved off a card in the middle of the stack. Eyeballing a comp does not
    // catch a caption sitting 1px inside the line -- this does, per element, by name.
    const bust = await page.evaluate(() => {
      const SAFE = 36, W = 576, H = 336;
      const root = document.getElementById('canvas').getBoundingClientRect();
      const out = [];
      for (const el of document.querySelectorAll('#canvas *')) {
        if (el.tagName === 'IMG' && el.closest('.seal')) continue; // clipped by its parent
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const L = r.left - root.left, T = r.top - root.top;
        const R = L + r.width, B = T + r.height;
        // The amber tab is CUT at the bleed edge on purpose, and so is its positioning
        // wrapper -- the first run flagged the WRAPPER, not the tab, which is the gate
        // working and the exemption being too narrow. The tab carries 36px of left
        // padding precisely so its TEXT still starts on the safe line.
        const bleeds = el.classList.contains('tab') || !!el.querySelector?.('.tab') || el.tagName === 'HR';
        const minL = bleeds ? -1 : SAFE;
        if (L < minL - 0.5 || T < SAFE - 0.5 || R > W - SAFE + 0.5 || B > H - SAFE + 0.5) {
          out.push(`${el.className || el.tagName} L${L.toFixed(0)} T${T.toFixed(0)} R${R.toFixed(0)} B${B.toFixed(0)}`);
        }
      }
      return out;
    });
    if (bust.length) throw new Error(`${face}: outside the 3mm safe margin ->\n    ` + bust.join('\n    '));

    const el = await page.$('#canvas');
    const box = await el.boundingBox();
    if (Math.round(box.width) !== 576 || Math.round(box.height) !== 336) {
      throw new Error(`${face}: #canvas is ${box.width}x${box.height}, expected 576x336`);
    }
    const out = join(HERE, GUIDES ? `comp-${face}.png` : `press-${face}.png`);
    await el.screenshot({ path: out });
    console.log(`  ${out.split('/').pop().padEnd(18)} ${Math.round(box.width * SCALE)}x${Math.round(box.height * SCALE)} px @${DPI}dpi`);
    await page.close();
  }
  console.log(GUIDES
    ? '\ncomp files carry the trim + safe-margin guides. NOT for the printer.'
    : '\npress files: 96x56mm incl. 3mm bleed. Trim is 90x50mm.');
} finally {
  await browser.close();
}
