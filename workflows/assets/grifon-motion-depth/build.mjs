// Offline build: one editable brief, embedded local assets, deterministic WebGL composition.
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { Script } from 'node:vm';
import { createRequire } from 'node:module';
import { build } from 'esbuild';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const specPath = process.argv[2] ? path.resolve(process.argv[2]) : path.join(here, 'demo.json');
const out = process.argv[3] ? path.resolve(process.argv[3]) : here;
const spec = JSON.parse(await readFile(specPath, 'utf8'));
if (spec.width !== 1920 || spec.height !== 1080 || spec.fps !== 30 || spec.duration !== 8) throw new Error('Authored for 1920x1080, 30fps, eight seconds.');
if (Object.values(spec.copy).some(value => typeof value !== 'string' || !value.trim() || value.length > 30)) throw new Error('Copy must be non-empty and at most 30 characters.');
if (spec.copy.headline.trim().split(/\s+/).length !== 3) throw new Error('The title assembly requires three words.');
for (const color of Object.values(spec.colors)) if (!/^#[\da-f]{6}$/i.test(color)) throw new Error('Use six-digit hex colors.');
const template = await readFile(path.join(here, 'composition.html.template'), 'utf8');
const gsapPath = path.join(root, 'workflows/assets/grifon-motion-spark/vendor/gsap.min.js');
const gsap = await readFile(gsapPath, 'utf8');
const outlinesPath = path.join(here, 'assets/inter-outlines.json');
const rawOutlines = JSON.parse(await readFile(outlinesPath, 'utf8'));
for (const character of spec.copy.headline) {
  if (!/\s/.test(character) && !Object.hasOwn(rawOutlines.glyphs, character)) throw new Error(`Unsupported headline character: ${character}`);
}
const Clipper = createRequire(import.meta.url)('./vendor/clipper.cjs');
const tolerance = .75;
const integerScale = 64;
function flattenContours(commands) {
  const contours = [];
  let points = [];
  let current = [0, 0];
  const midpoint = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const distance = (p, a, b) => {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    return Math.hypot(dx, dy) ? Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / Math.hypot(dx, dy) : Math.hypot(p[0] - a[0], p[1] - a[1]);
  };
  const append = point => { points.push(point); current = point; };
  const quadratic = (a, b, c, depth = 0) => {
    if (depth >= 16 || distance(b, a, c) <= tolerance) { append(c); return; }
    const ab = midpoint(a, b), bc = midpoint(b, c), center = midpoint(ab, bc);
    quadratic(a, ab, center, depth + 1); quadratic(center, bc, c, depth + 1);
  };
  const cubic = (a, b, c, d, depth = 0) => {
    if (depth >= 16 || Math.max(distance(b, a, d), distance(c, a, d)) <= tolerance) { append(d); return; }
    const ab = midpoint(a, b), bc = midpoint(b, c), cd = midpoint(c, d);
    const abc = midpoint(ab, bc), bcd = midpoint(bc, cd), center = midpoint(abc, bcd);
    cubic(a, ab, abc, center, depth + 1); cubic(center, bcd, cd, d, depth + 1);
  };
  const close = () => {
    const path = points.map(([x, y]) => ({ X: Math.round(x * integerScale), Y: Math.round(y * integerScale) }))
      .filter((point, index, all) => index === 0 || point.X !== all[index - 1].X || point.Y !== all[index - 1].Y);
    if (path.length > 1 && path[0].X === path.at(-1).X && path[0].Y === path.at(-1).Y) path.pop();
    if (path.length >= 3) contours.push(path);
    points = [];
  };
  for (const command of commands) {
    if (command[0] === 'M') { if (points.length) close(); append([command[1], command[2]]); }
    else if (command[0] === 'L') append([command[1], command[2]]);
    else if (command[0] === 'Q') quadratic(current, [command[1], command[2]], [command[3], command[4]]);
    else if (command[0] === 'C') cubic(current, [command[1], command[2]], [command[3], command[4]], [command[5], command[6]]);
    else if (command[0] === 'Z') close();
    else throw new Error(`Unsupported font contour: ${command[0]}`);
  }
  if (points.length) close();
  return contours;
}
function normalizeGlyph(glyph) {
  const paths = Clipper.Clipper.SimplifyPolygons(flattenContours(glyph.commands), Clipper.PolyFillType.pftNonZero);
  const union = new Clipper.Clipper();
  union.AddPaths(paths, Clipper.PolyType.ptSubject, true);
  const tree = new Clipper.PolyTree();
  union.Execute(Clipper.ClipType.ctUnion, tree, Clipper.PolyFillType.pftNonZero, Clipper.PolyFillType.pftNonZero);
  const shapes = [];
  const coordinates = (node, hole) => {
    const points = node.Contour().slice();
    if (Clipper.Clipper.Orientation(points) !== hole) points.reverse();
    return points.map(point => [point.X / integerScale, point.Y / integerScale]);
  };
  const visit = node => {
    for (const child of node.Childs()) {
      if (!child.IsHole()) shapes.push({ outer: coordinates(child, false), holes: child.Childs().filter(hole => hole.IsHole()).map(hole => coordinates(hole, true)) });
      visit(child);
    }
  };
  visit(tree);
  const commands = shapes.flatMap(shape => [shape.outer, ...shape.holes].flatMap(contour => [
    ['M', ...contour[0]], ...contour.slice(1).map(point => ['L', ...point]), ['Z'],
  ]));
  return { advance: glyph.advance, commands, shapes };
}
const outlines = {
  ...rawOutlines,
  normalization: { method: 'Clipper 6.4.2 nonzero union', flattenToleranceFontUnits: tolerance, integerScale },
  glyphs: Object.fromEntries(Object.entries(rawOutlines.glyphs).map(([character, glyph]) => [character, normalizeGlyph(glyph)])),
};
await mkdir(path.join(out, 'assets'), { recursive: true });
await mkdir(path.join(out, 'vendor'), { recursive: true });
await writeFile(path.join(out, 'assets/inter-normalized-outlines.json'), JSON.stringify(outlines) + '\n');
await copyFile(path.join(here, 'assets/OFL-Inter.txt'), path.join(out, 'assets/OFL-Inter.txt'));
if (out !== here) await copyFile(path.join(here, 'vendor/LICENSE-Clipper.txt'), path.join(out, 'vendor/LICENSE-Clipper.txt'));
const assets = {
  LOGO: ['public/logo.png', 'image/png', 'logo.png'],
  INTER: ['workflows/assets/grifon-promo-canvas/fonts/inter-900.ttf', 'font/ttf', 'inter-900.ttf'],
};
const embedded = {};
const hashes = {};
for (const [key, [source, mime, name]] of Object.entries(assets)) {
  const bytes = await readFile(path.join(root, source));
  embedded[key] = `data:${mime};base64,${bytes.toString('base64')}`;
  hashes[source] = createHash('sha256').update(bytes).digest('hex');
  await writeFile(path.join(out, 'assets', name), bytes);
}
if (out !== here) await copyFile(outlinesPath, path.join(out, 'assets/inter-outlines.json'));
const result = await build({
  stdin: { contents: "import * as THREE from './vendor/three.module.min.js';window.THREE=THREE;", resolveDir: here, sourcefile: 'three-vendor.js', loader: 'js' },
  bundle: true, write: false, format: 'iife', minify: true, target: 'es2022',
  supported: { 'template-literal': false },
});
await writeFile(path.join(out, 'vendor/three.global.js'), result.outputFiles[0].text);
await writeFile(path.join(out, 'vendor/gsap.min.js'), gsap);
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const values = {
  ...embedded,
  GSAP: 'vendor/gsap.min.js',
  THREE: 'vendor/three.global.js',
  CONFIG: JSON.stringify(spec).replace(/</g, '\\u003c'),
  OUTLINES: JSON.stringify(outlines).replace(/</g, '\\u003c'),
  BRAND: escapeHtml(spec.copy.brand), URL: escapeHtml(spec.copy.url),
  BG: spec.colors.background, GOLD: spec.colors.accent, TEXT: spec.colors.text,
};
const html = template.replace(/\{\{([A-Z]+)\}\}/g, (_, key) => {
    if (!(key in values)) throw new Error(`Unknown template token ${key}`);
    return String(values[key]);
  });
new Script(gsap);
new Script(result.outputFiles[0].text);
for (const [, script] of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)) new Script(script);
await writeFile(path.join(out, 'index.html'), html);
for (const source of ['composition.html.template', 'assets/inter-outlines.json', 'assets/OFL-Inter.txt', 'vendor/clipper.cjs', 'vendor/LICENSE-Clipper.txt', 'vendor/three.module.min.js', 'vendor/three.core.min.js', 'vendor/LICENSE']) {
  hashes[source] = createHash('sha256').update(await readFile(path.join(here, source))).digest('hex');
}
hashes['demo.json'] = createHash('sha256').update(await readFile(specPath)).digest('hex');
hashes['gsap.min.js'] = createHash('sha256').update(gsap).digest('hex');
hashes['vendor/three.global.js'] = createHash('sha256').update(result.outputFiles[0].text).digest('hex');
hashes['assets/inter-normalized-outlines.json'] = createHash('sha256').update(JSON.stringify(outlines) + '\n').digest('hex');
await writeFile(path.join(out, 'source-manifest.json'), JSON.stringify({
  spec, assets: hashes,
  three: { version: '0.180.0', license: 'MIT', source: 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.min.js' },
  clipper: { version: '6.4.2', license: 'BSL-1.0', notice: 'vendor/LICENSE-Clipper.txt', source: 'https://cdn.jsdelivr.net/npm/clipper-lib@6.4.2/clipper.js', buildTimeOnly: true },
  inter: { license: 'OFL-1.1', notice: 'assets/OFL-Inter.txt', source: 'https://github.com/rsms/inter/blob/master/LICENSE.txt' },
  gsap: { version: '3.14.2', source: 'workflows/assets/grifon-motion-spark/vendor/gsap.min.js' },
  output: { file: 'index.html', sha256: createHash('sha256').update(html).digest('hex'), selfContained: false, offlineDependencies: ['vendor/three.global.js', 'vendor/gsap.min.js'] },
  generationSpendUsd: 0,
}, null, 2) + '\n');
console.log(`Built ${spec.width}x${spec.height}, ${spec.duration}s, ${spec.fps}fps. No network or generation calls.`);
