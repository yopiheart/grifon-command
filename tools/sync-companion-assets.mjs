import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Ship the accepted runtime verbatim. The embedding bridge is maintained separately.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(root, 'assets/3d-lab/grifon-companion-live');
const destination = resolve(root, 'public/companion');
const files = ['main.js', 'reactions.js', 'scene.json', 'scene.bin', 'baked-skin.png',
  'baked-hero.png', 'baked-body-clean.png', 'neutral.png', 'vendor/three.module.js',
  'vendor/three.core.js', 'vendor/LICENSE'];
const check = process.argv.includes('--check');
const digest = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const hashes = {};
for (const file of files) {
  const from = resolve(source, file), to = resolve(destination, file);
  if (!existsSync(from)) throw new Error(`Missing approved companion asset: ${file}`);
  if (!check) { mkdirSync(dirname(to), { recursive: true }); copyFileSync(from, to); }
  if (!existsSync(to) || digest(from) !== digest(to)) throw new Error(`Companion asset differs: ${file}`);
  hashes[file] = digest(to);
}
if (!check) writeFileSync(resolve(destination, 'asset-manifest.json'), JSON.stringify({
  source: 'assets/3d-lab/grifon-companion-live',
  approval: 'qa/reading-held/owner-approval.json', hashes,
}, null, 2) + '\n');
else {
  const manifest = JSON.parse(readFileSync(resolve(destination, 'asset-manifest.json'), 'utf8'));
  if (JSON.stringify(manifest.hashes) !== JSON.stringify(hashes)) throw new Error('Companion manifest differs');
}
console.log(`PASS: ${files.length} companion assets match the accepted source`);
