#!/usr/bin/env node
/**
 * Render the hook title of EVERY preset onto a still, as PNGs. No video credit,
 * no Veo, no ElevenLabs, no network — it runs the real `planScene` +
 * `buildWordFilters` + `buildBoxFilter` off a background image, so what you see
 * is what the final render draws.
 *
 * Built 2026-08-17 because four presets were shipped and eyeballed only AFTER a
 * paid render, and they came back looking identical. A hook look is a design
 * decision; design decisions need to be seen before they are paid for.
 *
 * Usage:
 *   npx vite-node tools/hook_preview.mjs
 *   npx vite-node tools/hook_preview.mjs "BAKIT PUYAT KA PA RIN"
 *   npx vite-node tools/hook_preview.mjs "TEXT" path/to/background.png
 *
 * Output: .tmp/hook-preview/<preset>.png (1080x1920)
 */
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';
import { planScene, buildWordFilters, buildBoxFilter, buildTextFilter } from '../api/_lib/renderFfmpeg.ts';
import { PRESETS } from '../api/_lib/renderPresets.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, '.tmp', 'hook-preview');
const DIMS = [1080, 1920];
// Late enough that every word has popped and the box wipe has finished.
const FREEZE_AT = 3.0;

const TEXT = process.argv[2] || 'Bakit puyat ka pa rin';
const BG = process.argv[3]
  ? join(ROOT, process.argv[3])
  : join(ROOT, 'tests', 'fixtures', 'sample-batch', 'before.png');

if (!existsSync(BG)) {
  console.error(`background not found: ${BG}`);
  process.exit(1);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const scene = {
  sceneIdx: 0, videoUrl: 'v', isHook: true,
  overlayText: [{ text: TEXT, startSec: 0, endSec: 6, style: 'hook', position: 'center' }],
};

const findFont = (rel) => join(ROOT, 'api', '_lib', 'assets', rel);

for (const [id, preset] of Object.entries(PRESETS)) {
  if (preset.stitchedOnly) { console.log(`  ${id.padEnd(10)} stitched-only, no overlay`); continue; }

  const dir = join(OUT, `_work_${id}`);
  mkdirSync(dir, { recursive: true });

  // Fonts land beside the text files as BARE names — ffmpeg runs with cwd=dir so
  // a Windows drive-colon never enters the filtergraph (same rule as buildScene).
  copyFileSync(findFont(preset.caption.fontFile), join(dir, 'caption.ttf'));
  copyFileSync(findFont(preset.hook.fontFile), join(dir, 'hook.ttf'));
  let accentFontName = null;
  if (preset.hook.accentFontFile) {
    copyFileSync(findFont(preset.hook.accentFontFile), join(dir, 'hookaccent.ttf'));
    accentFontName = 'hookaccent.ttf';
  }

  const layers = planScene(scene, 6, DIMS, preset, 0);
  const filters = [];
  let k = 0;
  for (const layer of layers) {
    if (layer.kind === 'box') { filters.push(buildBoxFilter(layer)); continue; }
    const font = layer.font === 'hook' ? 'hook.ttf' : 'caption.ttf';
    if (layer.words?.length) {
      const names = layer.words.map((wd, j) => {
        const n = `w_${k}_${j}.txt`;
        writeFileSync(join(dir, n), wd.word, 'utf8');
        return n;
      });
      k++;
      filters.push(buildWordFilters(
        layer, font, names, preset, null, 'normal',
        layer.font === 'hook' ? accentFontName : null
      ));
    } else {
      const n = `t_${k++}.txt`;
      writeFileSync(join(dir, n), layer.text, 'utf8');
      filters.push(buildTextFilter(layer, font, n, preset));
    }
  }

  const outPng = join(OUT, `${id}.png`);
  const chain = `scale=${DIMS[0]}:${DIMS[1]}:force_original_aspect_ratio=increase,` +
    `crop=${DIMS[0]}:${DIMS[1]}` + (filters.length ? `,${filters.join(',')}` : '');
  const r = spawnSync(ffmpegPath, [
    '-hide_banner', '-loglevel', 'error',
    '-loop', '1', '-t', '6', '-i', BG,
    '-vf', chain,
    '-ss', String(FREEZE_AT), '-frames:v', '1', '-y', outPng,
  ], { cwd: dir, encoding: 'utf8' });

  if (r.status !== 0) {
    console.log(`  ${id.padEnd(10)} FAILED`);
    console.error(`     ${(r.stderr || '').slice(-500)}`);
    continue;
  }
  const h = preset.hook;
  console.log(
    `  ${id.padEnd(10)} ${h.accentMode.padEnd(12)} ` +
    `${h.fontFile.replace('fonts/', '').replace('.ttf', '').padEnd(22)} ` +
    `${h.caps ? 'CAPS' : 'mixed'}${h.glow ? ' +glow' : ''}${h.accentFontFile ? ' +serif' : ''}`
  );
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\nPNGs in ${OUT}`);
