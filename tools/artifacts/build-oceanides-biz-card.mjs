/**
 * Oceanides business card -- 3 concepts for review.
 *
 * Builds the standalone twin at artifacts/oceanides-biz-card.html from
 * COMMITTED sources only (no .tmp cache -- the cafe-PC defreezer eats those):
 *
 *   clients/oceanides/assets/logo.jpg      the shield, inlined as a data URI
 *   api/_lib/assets/fonts/Anton-Regular.ttf   display face, inlined
 *   api/_lib/assets/fonts/Inter-Black.ttf     heavy label face, inlined
 *   tools/artifacts/data/oceanides-card-qr.json  QR path (make-card-qr.py)
 *
 * Fonts are INLINED rather than linked. The published artifact could pull
 * Google Fonts, but the twin is the copy Neil forwards over Viber and someone
 * double-clicks offline -- a <link> there renders the comps in Arial, which
 * makes a typography review a lie. One file, correct in both roles.
 *
 * There is no sharp/webp step here (unlike build-gb-001-brief.mjs): the logo is
 * a 22 KB 316x316 JPEG already, and node_modules is not guaranteed on a fresh
 * cafe clone. Raw inline keeps this builder runnable straight after a lite clone.
 *
 *   node tools/artifacts/build-oceanides-biz-card.mjs
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalize } from './_gates.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const TPL = join(HERE, 'oceanides-biz-card.tpl.html');
const OUT = join(ROOT, 'artifacts', 'oceanides-biz-card.html');

const kb = (n) => `${Math.round(n / 1024)} KB`;

const dataUri = async (path, mime) => {
  const buf = await readFile(path);
  return { uri: `data:${mime};base64,${buf.toString('base64')}`, bytes: buf.byteLength };
};

/**
 * QR as an inline SVG <path>, not an <img>.
 *
 * SIZE IS A PRINT DECISION, NOT A LAYOUT ONE. 100px on the 540px comp == 16.7mm
 * on the 90mm card. Across 43 modules (37 data + a 3-module quiet zone each
 * side) that is ~0.39mm per module, which sits just at the floor a mid-range
 * phone camera needs in poor lobby light. Do not shrink it to tidy the layout
 * -- shrink the URL instead (see the note in the page), which drops the QR
 * version and buys real modules back.
 */
const qrSvg = ({ modules, path }, px = 100) => {
  const q = 3; // quiet zone in modules
  const span = modules + q * 2;
  return `<svg width="${px}" height="${px}" viewBox="${-q} ${-q} ${span} ${span}" `
    + `role="img" aria-label="QR code to oceanidesph.com" shape-rendering="crispEdges">`
    + `<rect x="${-q}" y="${-q}" width="${span}" height="${span}" fill="#fff"/>`
    + `<path d="${path}" fill="#0A1F45"/></svg>`;
};

const tokens = {};
let total = 0;

const logo = await dataUri(join(ROOT, 'clients', 'oceanides', 'assets', 'logo.jpg'), 'image/jpeg');
tokens.__LOGO__ = logo.uri;
total += logo.bytes;
console.log(`  logo.jpg              ${kb(logo.bytes)}`);

const anton = await dataUri(join(ROOT, 'api', '_lib', 'assets', 'fonts', 'Anton-Regular.ttf'), 'font/ttf');
tokens.__FONT_ANTON__ = anton.uri;
total += anton.bytes;
console.log(`  Anton-Regular.ttf     ${kb(anton.bytes)}`);

const inter = await dataUri(join(ROOT, 'api', '_lib', 'assets', 'fonts', 'Inter-Black.ttf'), 'font/ttf');
tokens.__FONT_INTER__ = inter.uri;
total += inter.bytes;
console.log(`  Inter-Black.ttf       ${kb(inter.bytes)}`);

const qr = JSON.parse(await readFile(join(HERE, 'data', 'oceanides-card-qr.json'), 'utf8'));
tokens.__QR__ = qrSvg(qr);
console.log(`  QR                    v${qr.version}, ${qr.modules}x${qr.modules}, error ${qr.error}`);
console.log(`     -> ${qr.url}`);

let html = await readFile(TPL, 'utf8');
for (const [token, value] of Object.entries(tokens)) {
  html = html.split(token).join(value);
}

// Shared gates: unsubstituted-token guard, the banned clipped-gradient-text
// property, and the pure-ASCII rule that keeps the twin from mojibaking when it
// is opened straight off disk. See _gates.mjs.
//
// The extra banned patterns are THIS artifact's own hazard: the comps must never
// carry a credential that belongs to Globaltec. compliance-findings-2026-08-08.md
// scrubbed those strings from 22 files; a build gate is cheaper than doing it a
// second time.
//
// SCOPE IS THE WHOLE POINT. The page NAMES both banned IDs in prose -- that
// warning is why the artifact exists -- so a whole-file scan flags the very
// section doing the protecting. It did, on the first run. The check therefore
// reads ONLY the card markup, and every card lives inside a <figure>. Figures
// do not nest here, so the non-greedy match is exact.
const cards = (html.match(/<figure>[\s\S]*?<\/figure>/g) || []).join('\n');
if (cards.split('class="card').length - 1 !== 6) {
  throw new Error('BUILD_FAILED [oceanides-biz-card]: expected 6 cards inside <figure> blocks, '
    + `found ${cards.split('class="card').length - 1} -- the claim gate below would scan the wrong text`);
}
for (const [name, re] of [
  ['Globaltec DENR ID on a card', /OL-TR-R3-14-000080/],
  ['third-party treatment cert on a card', /BEHMC\(1\)/],
  ['DENR/LLDA claim attributed to Oceanides', /Oceanides[^<.]{0,40}(DENR|LLDA)-(accredited|registered)/i],
  ['data-mono on customer-facing creative', /JetBrains/i],
]) {
  if (re.test(cards)) {
    throw new Error(`BUILD_FAILED [oceanides-biz-card]: banned on card artwork -- ${name}`);
  }
}

html = finalize(html, {
  label: 'oceanides-biz-card',
  leftover: [/__[A-Z0-9_]+__/g],
  required: ['The Work Order', 'The Document', 'The Shield', 'Never print'],
});

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, html, 'utf8');
console.log(`\nOK ${OUT}\n  assets ${kb(total)} | page ${kb(Buffer.byteLength(html))}`);
