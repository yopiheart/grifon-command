import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalize } from './_gates.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const embed = path => `data:image/png;base64,${readFileSync(resolve(root, path)).toString('base64')}`;
const css = readFileSync(resolve(root, 'tools/artifacts/studio-pilot.tpl.html'), 'utf8').match(/<style>([\s\S]*?)<\/style>/)?.[1];
if (!css) throw new Error('Missing shared studio review styling');
const hero = embed('assets/hero-film/studio-look/hero-frame.png');
const before = embed('assets/hero-film/studio-pilot/03_Product.png');
const template = readFileSync(resolve(root, 'tools/artifacts/studio-look.tpl.html'), 'utf8');
const html = finalize(template.replace('{{CSS}}', css).replaceAll('{{HERO}}', hero).replace('{{BEFORE}}', before), {
  label: 'studio-look', required: ['<title>', 'class="ground"', '<details class="panel">', 'Demo 01'], leftover: [/\{\{[A-Z_]+\}\}/g],
});
writeFileSync(resolve(root, 'artifacts/grifon-studio-look.html'), html);
console.log(`Built studio look review: ${Buffer.byteLength(html)} bytes; self-contained.`);
