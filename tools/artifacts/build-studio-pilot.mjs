import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { finalize } from './_gates.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const assets = resolve(root, 'assets/hero-film/studio-pilot');
const embed = (name, mime) => `data:${mime};base64,${readFileSync(resolve(assets, name)).toString('base64')}`;
const replacements = {
  ESTABLISH: embed('01_Establish.png', 'image/png'),
  WORKSPACE: embed('02_Owner_workspace.png', 'image/png'),
  PRODUCT: embed('03_Product.png', 'image/png'),
  PREVIEW: embed('shaded-camera-preview.mp4', 'video/mp4'),
  POSTER: embed('preview-poster.png', 'image/png'),
};
let source = readFileSync(resolve(root, 'tools/artifacts/studio-pilot.tpl.html'), 'utf8');
for (const [key, value] of Object.entries(replacements)) source = source.replaceAll(`{{${key}}}`, value);
const html = finalize(source, { label: 'studio-pilot', required: ['<title>', 'class="ground"', 'controls', 'EMPTY'], leftover: [/\{\{[A-Z_]+\}\}/g] });
writeFileSync(resolve(root, 'artifacts/grifon-studio-pilot.html'), html);
console.log(`Built standalone studio review: ${Buffer.byteLength(html)} bytes, all media embedded.`);
