import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { asciiSafe, finalize } from './_gates.mjs';

const root = resolve(import.meta.dirname, '../..');
const media = resolve(root, 'assets/blender-reveal');
const encode = (file, mime) => `data:${mime};base64,${readFileSync(resolve(media, file)).toString('base64')}`;
// Match HTML parser newline normalization before hashing inline CSP blocks.
const template = readFileSync(resolve(import.meta.dirname, 'blender-reveal.tpl.html'), 'utf8').replace(/\r\n?/g, '\n');
const replacements = {
  FINAL_VIDEO: encode('noir-01-reveal.mp4', 'video/mp4'),
  REFERENCE_VIDEO: encode('camera-reference.mp4', 'video/mp4'),
  HERO_IMAGE: encode('hero.png', 'image/png'),
  START_IMAGE: encode('start.png', 'image/png'),
  MID_IMAGE: encode('mid.png', 'image/png'),
  EDITABLE_SCENE: encode('scene.blend', 'application/octet-stream'),
};
let html = template;
for (const [key, value] of Object.entries(replacements)) html = html.replaceAll(`{{${key}}}`, value);
html = asciiSafe(html, { label: 'blender-reveal' });
const hashBlock = tag => createHash('sha256').update(html.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))[1]).digest('base64');
const policy = `default-src 'none'; img-src data:; media-src data:; style-src 'sha256-${hashBlock('style')}'; script-src 'sha256-${hashBlock('script')}'; base-uri 'none'; form-action 'none'`;
html = html.replace('{{CONTENT_POLICY}}', policy);
html = finalize(html, {
  label: 'blender-reveal',
  required: ['<meta charset="utf-8">', 'class="ground"', 'id="film"', 'NOIR', 'data:video/mp4;base64,'],
  leftover: [/\{\{[A-Z_]+\}\}/g],
});
mkdirSync(resolve(root, 'artifacts'), { recursive: true });
const output = resolve(root, 'artifacts/blender-reveal.html');
writeFileSync(output, html);
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(html), selfContained: true, source: media }));
