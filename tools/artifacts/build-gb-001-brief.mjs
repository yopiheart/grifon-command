#!/usr/bin/env node
/**
 * build-gb-001-brief.mjs — ang GB-001 work brief (Oceanides price-page campaign).
 *
 * BAKIT BUILD SCRIPT AT HINDI HAND-WRITTEN NA PAGE
 * Hinaharang ng artifact CSP ang bawat external request, kaya ang fonts at ang
 * static ad ay kailangang naka-inline bilang data URI. Ang gawin yun nang kamay ay
 * nangangahulugan ng ~200 KB na base64 na dumadaan sa isang chat turn.
 *
 * COMMITTED LANG ANG SOURCES — kailanman hindi `.tmp/` — per CLAUDE.md artifact rule,
 * kaya kayang i-rebuild to ng post-defreezer session mula sa sariwang clone.
 *
 * DESIGN: clients/oceanides/DESIGN.md, HINDI ang Grifon NOIR default. Client work to,
 * at hayagang kinakarve-out sya ng CLAUDE.md: navy + amber matte print, walang glass,
 * walang #FFCC00, walang charcoal. Ang pagkakamali dito ay nagkahalaga ng buong
 * artifact rebuild noong 2026-07-28.
 *
 * Patakbuhin mula sa repo root:  node tools/artifacts/build-gb-001-brief.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { finalize } from './_gates.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TPL = join(HERE, 'gb-001-brief.tpl.html');
const OUT = join(ROOT, 'artifacts', 'gb-001-brief.html');

const FONT_DIR = join(ROOT, 'funnels', 'oceanides-price-page', 'node_modules', '@fontsource');

const kb = (n) => `${Math.round(n / 1024)} KB`;

/** woff2 → data URI. Naka-inline, hindi naka-link: tahimik na pinapatay ng CSP ang font CDN. */
const font = async (pkg, file) => {
  const buf = await readFile(join(FONT_DIR, pkg, 'files', file));
  return `data:font/woff2;base64,${buf.toString('base64')}`;
};

const img = async (path, width, quality = 78) => {
  const buf = await sharp(path).resize({ width, withoutEnlargement: true }).webp({ quality }).toBuffer();
  return { uri: `data:image/webp;base64,${buf.toString('base64')}`, bytes: buf.byteLength };
};

const tokens = {};
let total = 0;

tokens.__FONT_ANTON__ = await font('anton', 'anton-latin-400-normal.woff2');
tokens.__FONT_INTER_400__ = await font('inter', 'inter-latin-400-normal.woff2');
tokens.__FONT_INTER_700__ = await font('inter', 'inter-latin-700-normal.woff2');

// Ang static ad. 900px ang lapad: sapat para mabasa ang ticket rows sa phone,
// hindi na kailangan ng buong 2160 dahil hindi to ang delivery file — ang
// committed PNG yun. Preview lang ang trabaho nito.
{
  const { uri, bytes } = await img(
    join(ROOT, 'clients', 'oceanides', 'out', 'price-addons-ticket.png'), 900);
  tokens.__STATIC_AD__ = uri;
  total += bytes;
  console.log(`  price-addons-ticket.png   ${kb(bytes)}`);
}

let html = await readFile(TPL, 'utf8');
for (const [token, value] of Object.entries(tokens)) {
  html = html.split(token).join(value);
}

// Shared gates: unsubstituted-token guard, banned clipped-text property, at ang
// pure-ASCII rule. Ang huli ang mahalaga dito -- ang twin na to ang binubuksan
// diretso sa disk, at 45 non-ASCII ang laman ng body nya (kasama ang bawat `₱`),
// kaya windows-1252 mojibake ang lahat ng presyo bago ito na-gate. Tingnan
// ang _gates.mjs.
html = finalize(html, {
  label: 'gb-001-brief',
  leftover: [/__[A-Z0-9_]+__/g],
});

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, html, 'utf8');
console.log(`\n✓ ${OUT}\n  assets ${kb(total)} · page ${kb(Buffer.byteLength(html))}`);
