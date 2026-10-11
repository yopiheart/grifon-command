// Manually authored, text-free example art. No provider, network or product edits.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIMARY = path.resolve(process.env.GRIFON_TOOL_ROOT || 'C:/Users/ADMIN/Desktop/grifon-command');
const require = createRequire(path.join(PRIMARY, 'package.json'));
const sharp = require('sharp');
const WIDTH = 1120;
const HEIGHT = 1920;
const sha = value => crypto.createHash('sha256').update(value).digest('hex');

const defs = `<defs>
  <linearGradient id="ink" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#252529"/><stop offset=".46" stop-color="#09090B"/><stop offset="1" stop-color="#141416"/></linearGradient>
  <linearGradient id="gold" x1=".1" y1="0" x2=".9" y2="1"><stop stop-color="#FFF4BC"/><stop offset=".24" stop-color="#FFCC00"/><stop offset=".67" stop-color="#B08700"/><stop offset="1" stop-color="#FFE98B"/></linearGradient>
  <linearGradient id="paper" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFFDF7"/><stop offset="1" stop-color="#DBD9CD"/></linearGradient>
  <linearGradient id="plate" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#37373B"/><stop offset=".38" stop-color="#202023"/><stop offset="1" stop-color="#111113"/></linearGradient>
  <radialGradient id="goldWash"><stop stop-color="#FFCC00" stop-opacity=".11"/><stop offset="1" stop-color="#FFCC00" stop-opacity="0"/></radialGradient>
  <radialGradient id="orb" cx=".3" cy=".25" r=".7"><stop stop-color="#F8F7F0"/><stop offset=".23" stop-color="#DAD9D2"/><stop offset=".57" stop-color="#787879"/><stop offset=".79" stop-color="#242427"/><stop offset="1" stop-color="#0E0E10"/></radialGradient>
  <filter id="softShadow" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="24"/></filter>
  <filter id="smallShadow" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="9"/></filter>
</defs>`;

function grain(pale = false) {
  let seed = 419091;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  return Array.from({ length: 750 }, () => `<circle cx="${(random() * WIDTH).toFixed(2)}" cy="${(random() * HEIGHT).toFixed(2)}" r="${(.45 + random() * .8).toFixed(2)}" fill="${pale ? '#09090B' : '#F2F1EA'}" opacity="${(.03 + random() * .025).toFixed(3)}"/>`).join('');
}

function document(body, pale = false) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">${defs}${body}${grain(pale)}</svg>`;
}

function research() {
  const connector = 'fill="none" stroke="#FFCC00" stroke-width="6" stroke-linecap="round"';
  const node = (x, y, icon) => `<g transform="translate(${x} ${y})">
    <rect x="-102" y="-102" width="204" height="204" rx="40" fill="#09090B" opacity=".65" transform="translate(8 24)" filter="url(#smallShadow)"/>
    <rect x="-102" y="-102" width="204" height="204" rx="40" fill="url(#plate)" stroke="#F2F1EA" stroke-opacity=".16" stroke-width="2"/>
    <path d="M-65 -100H65" stroke="#FFFFFF" stroke-opacity=".25" stroke-width="2"/>
    <g fill="none" stroke="#F2F1EA" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${icon}</g>
  </g>`;
  return document(`<rect width="1120" height="1920" fill="url(#ink)"/>
    <ellipse cx="560" cy="990" rx="490" ry="650" fill="url(#goldWash)"/>
    <g fill="none" stroke="#F2F1EA" stroke-opacity=".045" stroke-width="2"><circle cx="560" cy="930" r="420"/><circle cx="560" cy="930" r="580"/><path d="M140 930H980M560 350V1510"/></g>
    <g ${connector} opacity=".54"><path d="M560 825V490"/><path d="M477 885L238 705"/><path d="M643 885L882 705"/><path d="M487 1000L265 1280"/><path d="M633 1000L855 1280"/></g>
    <g fill="#FFCC00"><circle cx="560" cy="635" r="7"/><circle cx="355" cy="790" r="7"/><circle cx="765" cy="790" r="7"/><circle cx="390" cy="1125" r="7"/><circle cx="730" cy="1125" r="7"/></g>
    ${node(560, 420, '<circle cy="-22" r="21"/><path d="M-43 45C-43 7 43 7 43 45"/>')}
    ${node(215, 690, '<circle cx="-10" cy="-10" r="29"/><path d="M12 12L42 42"/>')}
    ${node(905, 690, '<path d="M-40 30V-8M0 30V-39M40 30V-23"/><path d="M-49 48H49"/>')}
    ${node(245, 1305, '<path d="M-43-24Q-43-40-27-40H27Q43-40 43-24V14Q43 30 27 30H-9L-34 50V30Q-43 30-43 14Z"/><path d="M-22-13H22M-22 5H6"/>')}
    ${node(875, 1305, '<path d="M-39 4L-11 31L43-30"/>')}
    <ellipse cx="560" cy="968" rx="117" ry="60" fill="#09090B" opacity=".6" filter="url(#softShadow)"/>
    <circle cx="560" cy="930" r="115" fill="url(#gold)"/>
    <circle cx="560" cy="930" r="80" fill="none" stroke="#FFF9D6" stroke-opacity=".25" stroke-width="2"/>
    <circle cx="560" cy="930" r="21" fill="#09090B"/>
    <path d="M498 1558H622" stroke="#FFCC00" stroke-width="5" stroke-linecap="round"/>
  `);
}

function script() {
  return document(`<rect width="1120" height="1920" fill="#F2F1EA"/>
    <circle cx="930" cy="220" r="510" fill="#FFCC00" opacity=".04"/>
    <path d="M0 1560Q610 1230 1120 1510" fill="none" stroke="#D4D2C8" stroke-width="2"/>
    <rect x="186" y="385" width="778" height="1190" rx="44" fill="#09090B" opacity=".13" filter="url(#softShadow)"/>
    <rect x="191" y="341" width="744" height="1190" rx="34" transform="rotate(5 563 936)" fill="#D9D6C9"/>
    <rect x="178" y="334" width="744" height="1190" rx="34" transform="rotate(-3 550 929)" fill="#E5E2D6" stroke="#CFCBBD" stroke-width="2"/>
    <rect x="175" y="315" width="770" height="1190" rx="34" fill="url(#paper)" stroke="#FFFFFF" stroke-width="3"/>
    <path d="M803 315H911Q945 315 945 349V458Z" fill="#EBE8DC"/>
    <path d="M803 315V424Q803 458 837 458H945" fill="none" stroke="#C8C4B7" stroke-width="2"/>
    <rect x="262" y="493" width="160" height="16" rx="8" fill="#09090B" opacity=".19"/>
    <rect x="262" y="585" width="596" height="148" rx="22" fill="#FFCC00"/>
    <rect x="296" y="624" width="441" height="20" rx="10" fill="#09090B"/>
    <rect x="296" y="670" width="298" height="16" rx="8" fill="#09090B" opacity=".48"/>
    <path d="M788 619V698" stroke="#09090B" stroke-width="5" stroke-linecap="round"/>
    <g fill="#09090B" opacity=".3"><rect x="262" y="808" width="540" height="18" rx="9"/><rect x="262" y="860" width="596" height="18" rx="9"/><rect x="262" y="912" width="469" height="18" rx="9"/></g>
    <path d="M262 1011H858" stroke="#09090B" stroke-opacity=".1" stroke-width="2"/>
    <g fill="#09090B" opacity=".2"><rect x="262" y="1083" width="596" height="18" rx="9"/><rect x="262" y="1135" width="522" height="18" rx="9"/><rect x="262" y="1187" width="569" height="18" rx="9"/><rect x="262" y="1239" width="377" height="18" rx="9"/></g>
    <circle cx="307" cy="1374" r="42" fill="#18181B"/>
    <path d="M288 1374H326M311 1359L326 1374L311 1389" fill="none" stroke="#FFCC00" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M501 1643H619" stroke="#18181B" stroke-opacity=".26" stroke-width="5" stroke-linecap="round"/>
  `, true);
}

function storyboard() {
  const frame = (y, art) => `<g transform="translate(220 ${y})"><rect x="9" y="22" width="700" height="310" rx="31" fill="#09090B" opacity=".8" filter="url(#smallShadow)"/><rect width="700" height="310" rx="31" fill="url(#plate)" stroke="#FFFFFF" stroke-opacity=".16" stroke-width="2"/><clipPath id="clip${y}"><rect x="20" y="20" width="660" height="235" rx="20"/></clipPath><g clip-path="url(#clip${y})">${art}</g><rect x="27" y="274" width="113" height="9" rx="4.5" fill="#F2F1EA" opacity=".25"/><rect x="160" y="274" width="228" height="9" rx="4.5" fill="#F2F1EA" opacity=".09"/><circle cx="653" cy="279" r="6" fill="#FFCC00"/></g>`;
  return document(`<rect width="1120" height="1920" fill="url(#ink)"/>
    <ellipse cx="610" cy="940" rx="540" ry="840" fill="url(#goldWash)"/>
    <path d="M142 430V1490" fill="none" stroke="#FFCC00" stroke-opacity=".28" stroke-width="3"/>
    <g fill="#FFCC00"><circle cx="142" cy="515" r="10"/><circle cx="142" cy="945" r="10"/><circle cx="142" cy="1375" r="10"/></g>
    <g fill="none" stroke="#FFCC00" stroke-opacity=".5" stroke-width="3"><path d="M142 515H220M142 945H220M142 1375H220"/></g>
    ${frame(360, '<rect x="20" y="20" width="660" height="235" fill="#F2F1EA"/><ellipse cx="354" cy="219" rx="115" ry="17" fill="#09090B" opacity=".18" filter="url(#smallShadow)"/><circle cx="355" cy="129" r="94" fill="url(#orb)"/><ellipse cx="355" cy="126" rx="122" ry="29" transform="rotate(-24 355 126)" fill="none" stroke="url(#gold)" stroke-width="9"/>')}
    ${frame(790, '<rect x="20" y="20" width="660" height="235" fill="#121214"/><path d="M114 289L375-19H524L263 289Z" fill="url(#gold)"/><path d="M366 289L627-19H739L478 289Z" fill="#F2F1EA" opacity=".9"/><path d="M240 281L493-17" stroke="#FFF4BC" stroke-width="2" opacity=".5"/>')}
    ${frame(1220, '<rect x="20" y="20" width="660" height="235" fill="#18181B"/><g fill="none" stroke="#FFCC00" stroke-width="4" opacity=".45"><path d="M348 135L184 71M348 135L526 67M348 135L196 224M348 135L526 214"/></g><g fill="#F2F1EA"><circle cx="184" cy="71" r="18"/><circle cx="526" cy="67" r="18"/><circle cx="196" cy="224" r="18"/><circle cx="526" cy="214" r="18"/></g><circle cx="348" cy="135" r="56" fill="url(#gold)"/><circle cx="348" cy="135" r="12" fill="#09090B"/>')}
    <path d="M508 1678H626" stroke="#FFCC00" stroke-width="5" stroke-linecap="round"/>
  `);
}

const authored = [
  { id: 'research', description: 'Nodes and relationships; abstract audience research motif.', svg: research() },
  { id: 'script', description: 'Paper, message lines and one selected passage; abstract script motif.', svg: script() },
  { id: 'storyboard', description: 'Three connected scene cards with manually authored material studies.', svg: storyboard() },
];
const files = [];
for (const plate of authored) {
  if (/<text\b|<image\b|href=|url\(https?:/i.test(plate.svg)) throw Error(`Unexpected text or external input in ${plate.id}`);
  const png = await sharp(Buffer.from(plate.svg), { density: 72 }).removeAlpha().png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  const metadata = await sharp(png).metadata();
  if (metadata.width !== WIDTH || metadata.height !== HEIGHT || metadata.hasAlpha) throw Error(`Unexpected opaque plate dimensions: ${plate.id}`);
  const output = `${plate.id}-example-7x12.png`;
  fs.writeFileSync(path.join(HERE, output), png);
  if (sha(fs.readFileSync(path.join(HERE, output))) !== sha(png)) throw Error(`Saved plate differs: ${plate.id}`);
  files.push({ id: plate.id, path: output, description: plate.description, width: WIDTH, height: HEIGHT, aspectRatio: '7:12', hasAlpha: false, bytes: png.length, sha256: sha(png), authoredSvgSha256: sha(plate.svg) });
}
const manifest = {
  schemaVersion: 1,
  generator: 'generate-plates.mjs',
  generatorSha256: sha(fs.readFileSync(fileURLToPath(import.meta.url))),
  provenance: 'Manually authored deterministic local SVG geometry, gradients and fixed-seed grain, rasterized with existing Sharp. Text-free illustrative example assets; no generated product output, logos, external inputs or provider calls.',
  usage: 'Private Grifon launch example-project fixture; matches unchanged SceneImageDisplay 112x192 object-cover slot.',
  runtime: { sharp: sharp.versions.sharp, librsvg: sharp.versions.rsvg },
  providerCalls: 0,
  spendUsd: 0,
  files,
};
fs.writeFileSync(path.join(HERE, 'plates-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`PASS: ${files.length} opaque text-free ${WIDTH}x${HEIGHT} example plates; zero external inputs or spend.`);
