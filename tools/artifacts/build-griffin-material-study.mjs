import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, relative, isAbsolute } from 'node:path';
import { asciiSafe, finalize } from './_gates.mjs';

const root = resolve(import.meta.dirname, '../..');
const selection = JSON.parse(readFileSync(resolve(root, 'assets/design/griffin-material-study/comparison.json'), 'utf8'));
const mediaRoot = resolve(root, 'assets/3d-lab/griffin-material-study');
const embed = (entry) => {
  const path = resolve(root, entry.path);
  const rel = relative(mediaRoot, path);
  if (isAbsolute(rel) || rel.startsWith('..')) throw new Error('Comparison asset must be inside the material study');
  const bytes = readFileSync(path);
  if (createHash('sha256').update(bytes).digest('hex') !== entry.sha256) throw new Error(`Asset hash mismatch: ${entry.path}`);
  if (!bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) throw new Error(`Expected PNG: ${entry.path}`);
  return `data:image/png;base64,${bytes.toString('base64')}`;
};
const views = Object.fromEntries(['hero', 'front', 'detail', 'profile'].map(view => [view, {
  baseline: embed(selection.views[view].baseline), candidate: embed(selection.views[view].candidate),
}]));
const replacements = {
  BASELINE_HERO: views.hero.baseline,
  CANDIDATE_HERO: views.hero.candidate,
  BASELINE_CHAT: embed(selection.chat.baseline),
  CANDIDATE_CHAT: embed(selection.chat.candidate),
  VERDICT: selection.verdict.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
  VIEWS_JSON: JSON.stringify(Object.fromEntries(Object.entries(views).filter(([view]) => view !== 'hero'))).replaceAll('<', '\\u003c'),
};
let html = readFileSync(resolve(import.meta.dirname, 'griffin-material-study.tpl.html'), 'utf8').replace(/\r\n?/g, '\n');
for (const [key, value] of Object.entries(replacements)) html = html.replaceAll(`{{${key}}}`, value);
html = asciiSafe(html, { label: 'griffin-material-study' });
const blockHash = tag => createHash('sha256').update(html.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))[1]).digest('base64');
html = html.replace('{{CONTENT_POLICY}}', `default-src 'none'; img-src data:; style-src 'sha256-${blockHash('style')}'; script-src 'sha256-${blockHash('script')}'; base-uri 'none'; form-action 'none'`);
html = finalize(html, { label: 'griffin-material-study', required: ['<meta charset="utf-8">', 'class="ground"', 'id="split"', 'data:image/png;base64,'], leftover: [/\{\{[A-Z_]+\}\}/g] });
const output = resolve(root, 'artifacts/griffin-material-study.html');
mkdirSync(resolve(root, 'artifacts'), { recursive: true });
writeFileSync(output, html);
console.log(JSON.stringify({ output, bytes: Buffer.byteLength(html), sha256: createHash('sha256').update(html).digest('hex'), selfContained: true }));
