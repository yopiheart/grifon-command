/**
 * Oceanides brand-mark review page.
 *
 * Builds artifacts/oceanides-logo.html from COMMITTED sources only:
 *   clients/oceanides/brand/*.svg            the new mark family
 *   clients/oceanides/assets/logo.jpg        the old mark, for the before/after
 *   api/_lib/assets/fonts/{Anton,Inter-Black} page type, inlined
 *
 *   node tools/artifacts/build-oceanides-logo.mjs
 *
 * The SVGs are inlined as MARKUP, not as <img src="data:...">. Two reasons that
 * matter: the page can recolour and resize them per specimen without shipping a
 * second copy of each file, and inlining proves the artifact is showing the real
 * committed geometry rather than a screenshot of it.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalize } from './_gates.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const BRAND = join(ROOT, 'clients', 'oceanides', 'brand');
const TPL = join(HERE, 'oceanides-logo.tpl.html');
const OUT = join(ROOT, 'artifacts', 'oceanides-logo.html');
const kb = (n) => `${Math.round(n / 1024)} KB`;

const src = {};
for (const n of ['mark', 'mark-small', 'mark-mono', 'logo-primary', 'logo-lockup']) {
  src[n] = await readFile(join(BRAND, `${n}.svg`), 'utf8');
}

/**
 * Inline one SVG at a given size.
 *
 * The uid rewrite is load-bearing, not tidiness: every mark file declares
 * `id="sh"` for its shield clipPath, and this page inlines eleven copies. In one
 * document those ids collide, the browser resolves url(#sh) to whichever came
 * first, and every later specimen gets clipped by the wrong shape -- silently,
 * and only in the composite, so each file still looks correct on its own.
 */
let uid = 0;
const put = (name, px, axis = 'height') => {
  const id = `s${uid++}`;
  return src[name]
    .replace(/id="sh"/g, `id="sh${id}"`)
    .replace(/url\(#sh\)/g, `url(#sh${id})`)
    .replace('<svg ', `<svg ${axis}="${px}" `);
};

/** Reversed = swap ground and ink on the MONO file, in one pass so neither
 *  replacement can eat the other's output. */
const reversed = (px) => {
  const id = `r${uid++}`;
  return src['mark-mono']
    .replace(/id="sh"/g, `id="sh${id}"`)
    .replace(/url\(#sh\)/g, `url(#sh${id})`)
    .replace(/#0A1F45|#FFFFFF/g, (m) => (m === '#0A1F45' ? '#FFFFFF' : '#0A1F45'))
    .replace('<svg ', `<svg height="${px}" `);
};

const cell = (svg, label) => `<div class="cell">${svg}<span class="cap">${label}</span></div>`;

const dataUri = async (p, mime) => {
  const buf = await readFile(p);
  return { uri: `data:${mime};base64,${buf.toString('base64')}`, bytes: buf.byteLength };
};

const old = await dataUri(join(ROOT, 'clients', 'oceanides', 'assets', 'logo.jpg'), 'image/jpeg');
const anton = await dataUri(join(ROOT, 'api', '_lib', 'assets', 'fonts', 'Anton-Regular.ttf'), 'font/ttf');
const inter = await dataUri(join(ROOT, 'api', '_lib', 'assets', 'fonts', 'Inter-Black.ttf'), 'font/ttf');

const tokens = {
  __OLD_LOGO__: old.uri,
  __FONT_ANTON__: anton.uri,
  __FONT_INTER__: inter.uri,
  __MARK_BA__: put('mark', 150),
  __SIZES__: [16, 24, 32, 48, 96].map((p) => cell(put('mark', p), `${p}px`)).join(''),
  __SMALLS__: [16, 24, 32].map((p) => cell(put('mark-small', p), `${p}px`)).join(''),
  __MONO__: cell(put('mark-mono', 120), 'one colour'),
  __REV__: cell(reversed(120), 'reversed'),
  __PRIMARY__: put('logo-primary', '100%', 'width'),
  __LOCKUP__: put('logo-lockup', '100%', 'width'),
};

let html = await readFile(TPL, 'utf8');
for (const [k, v] of Object.entries(tokens)) html = html.split(k).join(v);

// This page must never quietly become a raster mock-up of a vector deliverable:
// if a <img> of the NEW mark ever appears, or a gradient sneaks into the family,
// the whole point of the rebuild is gone and the page would still look fine.
const afterBA = html.split('<h2>The mark at size</h2>')[1] || '';
for (const [name, re] of [
  ['raster in a specimen', /<img[^>]*>/],
  ['gradient in the mark family', /(linearGradient|radialGradient)/i],
]) {
  if (re.test(afterBA)) throw new Error(`BUILD_FAILED [oceanides-logo]: ${name}`);
}
// 13 = 1 before/after + 5 size steps + 3 small-variant steps + mono + reversed
// + 2 lockups. Asserted rather than counted by eye: this caught the author's own
// miscount on the first run, which is exactly the class of error that otherwise
// ships as a silently missing specimen.
const inlined = (html.match(/<svg /g) || []).length;
if (inlined !== 13) {
  throw new Error(`BUILD_FAILED [oceanides-logo]: expected 13 inlined SVGs, found ${inlined}`);
}

html = finalize(html, {
  label: 'oceanides-logo',
  leftover: [/__[A-Z0-9_]+__/g],
  required: ['Before / after', 'The mark at size', 'Two lockups', 'Archivo Expanded'],
});

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, html, 'utf8');
console.log(`OK ${OUT}\n  ${inlined} inlined SVGs | page ${kb(Buffer.byteLength(html))}`);
