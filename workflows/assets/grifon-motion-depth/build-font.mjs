// Extract the actual Inter contours for editable 3D type. No generated fonts.
import { createRequire } from 'node:module';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
const cache = process.env.MOTION_NPM_CACHE || path.join(os.homedir(), 'AppData/Local/npm-cache/_npx');
const parser = process.env.MOTION_FONTKIT_PATH || readdirSync(cache).map(name => path.join(cache, name, 'node_modules/fontkit/dist/main.cjs')).find(existsSync);
if (!parser) throw new Error('Existing fontkit is required. No automatic install.');
const require = createRequire(import.meta.url);
const fontkit = require(parser);
const fontPath = path.join(root, 'workflows/assets/grifon-promo-canvas/fonts/inter-900.ttf');
const font = fontkit.openSync(fontPath);
const commands = { moveTo: 'M', lineTo: 'L', quadraticCurveTo: 'Q', bezierCurveTo: 'C', closePath: 'Z' };
const glyphs = {};
for (let code = 32; code < 127; code++) {
  const character = String.fromCharCode(code);
  const run = font.layout(character);
  const glyph = run.glyphs[0];
  glyphs[character] = { advance: run.positions[0].xAdvance,
    commands: glyph.path.commands.map(({ command, args }) => {
      if (!commands[command]) throw new Error(`Unsupported contour command ${command}`);
      return [commands[command], ...args];
    }) };
}
const out = { family: font.fullName, unitsPerEm: font.unitsPerEm,
  source: 'workflows/assets/grifon-promo-canvas/fonts/inter-900.ttf',
  sha256: createHash('sha256').update(readFileSync(fontPath)).digest('hex'), glyphs };
mkdirSync(path.join(here, 'assets'), { recursive: true });
writeFileSync(path.join(here, 'assets/inter-outlines.json'), JSON.stringify(out) + '\n');
console.log(`Extracted ${Object.keys(glyphs).length} actual ${font.fullName} glyphs (${font.unitsPerEm} units/em).`);
