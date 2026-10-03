// Offline authoring build. Reuses committed assets; never calls a generation API.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const sourcePath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(here, 'demo.json');
const out = process.argv[3] ? path.resolve(process.argv[3]) : here;
const spec = JSON.parse(await readFile(sourcePath, 'utf8'));
const template = await readFile(path.join(here, 'composition.template.html'), 'utf8');
const gsap = await readFile(path.join(here, 'vendor/gsap.min.js'), 'utf8');
const assets = {
  LOGO: ['public/logo.png', 'image/png'],
  INTER: ['workflows/assets/grifon-promo-canvas/fonts/inter-900.ttf', 'font/ttf'],
  MONO: ['workflows/assets/grifon-promo-canvas/fonts/jbmono-600.ttf', 'font/ttf'],
};
const embedded = {};
const provenance = {};
for (const [key, [name, mime]] of Object.entries(assets)) {
  const bytes = await readFile(path.join(root, name));
  embedded[key] = `data:${mime};base64,${bytes.toString('base64')}`;
  provenance[name] = createHash('sha256').update(bytes).digest('hex');
}
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if (spec.duration !== 12 || spec.fps !== 24) throw new Error('This composition is authored for 12 seconds at 24 fps. Edit its timeline before changing duration/fps.');
for (const [key, value] of Object.entries(spec.copy)) {
  if (typeof value !== 'string' || !value.trim() || value.length > 24) throw new Error(`Invalid copy field: ${key}`);
}
await mkdir(out, { recursive: true });
await mkdir(path.join(out, 'vendor'), { recursive: true });
await writeFile(path.join(out, 'vendor/gsap.min.js'), gsap);
for (const [format, size] of Object.entries(spec.formats)) {
  if (!['portrait', 'landscape'].includes(format)) throw new Error(`Unknown layout: ${format}`);
  const values = {
    ...embedded, FORMAT: format, WIDTH: size.width, HEIGHT: size.height,
    BG: spec.colors.background, GOLD: spec.colors.accent, TEXT: spec.colors.text,
    ...Object.fromEntries(Object.entries(spec.copy).map(([k,v]) => [k.toUpperCase(), escapeHtml(v)])),
    GSAP: gsap,
  };
  for (const value of Object.values(spec.colors)) if (!/^#[\da-f]{6}$/i.test(value)) throw new Error('Colors must be six-digit hex values');
  const html = template.replace(/\{\{([A-Z]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template token: ${key}`);
    return String(values[key]);
  });
  const folder = path.join(out, format);
  await mkdir(folder, { recursive: true });
  await mkdir(path.join(folder, 'vendor'), { recursive: true });
  await writeFile(path.join(folder, 'vendor/gsap.min.js'), gsap);
  await writeFile(path.join(folder, 'index.html'), html);
  console.log(`Built ${format}: ${size.width}x${size.height}, 12s, 24fps`);
}
await writeFile(path.join(out, 'source-manifest.json'), JSON.stringify({
  spec, assets: provenance, gsap: { version: '3.14.2', sha256: createHash('sha256').update(gsap).digest('hex'), source:'https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js' },
  renderer: 'hyperframes@0.7.68', generationSpendUsd: 0,
}, null, 2) + '\n');
