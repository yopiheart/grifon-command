// Independent reference: browser-native Inter rasterization versus actual Three triangulation.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const deps = [root, path.resolve(root, '..'), path.resolve(root, '../..'), path.resolve(root, '../../..')].find(dir => existsSync(path.join(dir, 'node_modules/playwright/package.json')));
const { chromium } = createRequire(path.join(deps, 'package.json'))('playwright');
const raw = JSON.parse(await readFile(path.join(here, 'assets/inter-outlines.json'), 'utf8'));
const normalized = JSON.parse(await readFile(path.join(here, 'assets/inter-normalized-outlines.json'), 'utf8'));
const browser = await chromium.launch({ headless: true, args: ['--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(pathToFileURL(path.join(here, 'index.html')).href);
  await page.waitForFunction(() => window.__motionReady === true, {}, { timeout: 20000 });
  const result = await page.evaluate(({ raw, normalized }) => {
    const size = 400, width = 640, height = 560, x = 55, baseline = 440;
    const glyphs = ['N', 'A', 'O'];
    const create = () => { const c = document.createElement('canvas'); c.width = width; c.height = height; return c; };
    function native(character) {
      const canvas = create(), context = canvas.getContext('2d');
      context.font = '900 400px Inter'; context.fillStyle = '#FFFFFF';
      context.textBaseline = 'alphabetic'; context.fillText(character, x, baseline);
      return canvas;
    }
    function triangulated(glyph, units) {
      const canvas = create(), context = canvas.getContext('2d');
      const p = new THREE.ShapePath();
      for (const c of glyph.commands) {
        if (c[0] === 'M') p.moveTo(c[1], c[2]);
        else if (c[0] === 'L') p.lineTo(c[1], c[2]);
        else if (c[0] === 'Q') p.quadraticCurveTo(...c.slice(1));
        else if (c[0] === 'C') p.bezierCurveTo(...c.slice(1));
        else if (c[0] === 'Z') p.currentPath.closePath();
      }
      const shapes = glyph.shapes ? glyph.shapes.map(polygon => {
        const shape = new THREE.Shape(polygon.outer.map(([x, y]) => new THREE.Vector2(x, y)));
        shape.holes = polygon.holes.map(hole => new THREE.Path(hole.map(([x, y]) => new THREE.Vector2(x, y))));
        return shape;
      }) : p.toShapes(false);
      const geometry = new THREE.ShapeGeometry(shapes, 10);
      const pos = geometry.attributes.position, index = geometry.index;
      context.fillStyle = '#FFFFFF';
      for (let i = 0; i < index.count; i += 3) {
        context.beginPath();
        for (let j = 0; j < 3; j++) {
          const v = index.getX(i + j);
          const px = x + pos.getX(v) * size / units, py = baseline - pos.getY(v) * size / units;
          if (!j) context.moveTo(px, py); else context.lineTo(px, py);
        }
        context.closePath(); context.fill();
      }
      geometry.dispose(); return canvas;
    }
    function dice(a, b) {
      const aa = a.getContext('2d').getImageData(0, 0, width, height).data;
      const bb = b.getContext('2d').getImageData(0, 0, width, height).data;
      let intersection = 0, countA = 0, countB = 0;
      for (let i = 3; i < aa.length; i += 4) { const inA = aa[i] >= 128, inB = bb[i] >= 128; countA += inA; countB += inB; intersection += inA && inB; }
      return 2 * intersection / (countA + countB);
    }
    const sheet = document.createElement('canvas'); sheet.width = width * 3; sheet.height = height * 3;
    const s = sheet.getContext('2d'); s.fillStyle = '#09090B'; s.fillRect(0, 0, sheet.width, sheet.height);
    const rows = glyphs.map((character, row) => {
      const ref = native(character), before = triangulated(raw.glyphs[character], raw.unitsPerEm), after = triangulated(normalized.glyphs[character], normalized.unitsPerEm);
      [ref, before, after].forEach((canvas, column) => s.drawImage(canvas, column * width, row * height));
      return { character, rawContourDice: dice(ref, before), normalizedContourDice: dice(ref, after) };
    });
    return { rows, sheet: sheet.toDataURL('image/png') };
  }, { raw, normalized });
  await mkdir(path.join(here, 'qa'), { recursive: true });
  await writeFile(path.join(here, 'qa/glyph-proof.png'), Buffer.from(result.sheet.split(',')[1], 'base64'));
  console.log(JSON.stringify(result.rows));
  if (result.rows.some(r => r.normalizedContourDice < .985)) throw new Error(`Normalized glyph differs from native Inter: ${JSON.stringify(result.rows)}`);
  if (!result.rows.some(r => r.rawContourDice < .985)) throw new Error('Original malformed-contour negative control was not rejected.');
  await writeFile(path.join(here, 'qa/glyph-check.json'), JSON.stringify({ status: 'PASS', reference: 'Independent browser-native Inter rasterization at 400px', originalDefectRejected: true, threshold: .985, rows: result.rows }, null, 2) + '\n');
  console.log(`PASS: native Inter versus normalized Three front-face silhouettes: ${JSON.stringify(result.rows)}; original malformed contours rejected.`);
} finally { await browser.close(); }
