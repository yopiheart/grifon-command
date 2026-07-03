#!/usr/bin/env node
// Deterministic harvest-cut assembler for the Cinematic Pipeline (WAT tool layer).
//
// The rough cut concatenates FULL clips; a finished spec ad is the best seconds
// of each take cut at pace (Production doctrine v2 / micro-splicing). This tool
// makes that edit REPRODUCIBLE and VERIFIABLE instead of hand-driven:
//
//   1) reads the same shots.json the render pipeline uses;
//   2) per shot, trims to its optional `"cut": {"in": s, "out": s}` window
//      (omit `cut` = keep the full clip; shots without an .mp4 are skipped
//      with a warning so a partial render can still be assembled);
//   3) normalizes every trim (uniform size/fps/audio) and concats them in
//      manifest order (or an explicit manifest-level `"assembly": [ids]`);
//   4) emits a SEAM SHEET — for every adjacent pair, the LAST frame of clip N
//      hstacked with the FIRST frame of clip N+1 — so a broken story bridge
//      (world jump, motion-vector flip, teleporting product) is visible as a
//      mismatched pair BEFORE anyone watches the video. Doctrine rule 1 QA.
//
// Usage:
//   node tools/assemble_cut.mjs --manifest .tmp/cinematic/<project>/shots.json \
//     [--out FINECUT.mp4] [--width 992] [--height 432] [--fps 24]
//
// Outputs land beside the manifest: FINECUT-<project>.mp4 + SEAMS-<project>.png
// Exit codes: 0 ok, 1 usage/manifest error, 2 ffmpeg failure.
import { readFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const die = (msg, code = 1) => { console.error(`[assemble] ${msg}`); process.exit(code); };

const manifestPath = flag('--manifest');
if (!manifestPath) die('missing --manifest <shots.json>');
if (!existsSync(manifestPath)) die(`manifest not found: ${manifestPath}`);

let manifest;
try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); }
catch (e) { die(`bad manifest JSON: ${e.message}`); }

const projDir = resolve(dirname(manifestPath));
const project = manifest.project || 'untitled';
const W = parseInt(flag('--width', '992'), 10);
const H = parseInt(flag('--height', '432'), 10);
const FPS = parseInt(flag('--fps', '24'), 10);
const outPath = resolve(flag('--out', join(projDir, `FINECUT-${project}.mp4`)));
const seamPath = join(projDir, `SEAMS-${project}.png`);
const tmpDir = join(projDir, '.assemble');

const order = Array.isArray(manifest.assembly) && manifest.assembly.length
  ? manifest.assembly.map(String)
  : manifest.shots.map((s) => String(s.id));
const byId = Object.fromEntries(manifest.shots.map((s) => [String(s.id), s]));

const ff = (fa) => {
  try { execFileSync(ffmpegPath, ['-y', '-loglevel', 'error', ...fa], { stdio: ['ignore', 'inherit', 'inherit'] }); }
  catch { die(`ffmpeg failed: ffmpeg ${fa.slice(0, 8).join(' ')}…`, 2); }
};

rmSync(tmpDir, { recursive: true, force: true });
mkdirSync(tmpDir, { recursive: true });

// --- 1) trim + normalize each shot ---
const pieces = [];
for (const id of order) {
  const shot = byId[id];
  if (!shot) die(`assembly id "${id}" not found in shots[]`);
  const src = join(projDir, `${id}.mp4`);
  if (!existsSync(src)) { console.error(`[assemble] WARNING: ${id}.mp4 missing — skipped`); continue; }
  const cut = shot.cut || {};
  const inS = Number(cut.in ?? 0);
  const trimmed = join(tmpDir, `${id}.trim.mp4`);
  const trimArgs = ['-ss', String(inS), '-i', src];
  if (cut.out != null) trimArgs.push('-t', String(Math.max(0.1, Number(cut.out) - inS)));
  trimArgs.push(
    '-vf', `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,fps=${FPS}`,
    '-c:v', 'libx264', '-crf', '18', '-preset', 'fast',
    '-c:a', 'aac', '-ar', '48000', '-b:a', '192k', trimmed,
  );
  ff(trimArgs);
  const win = cut.out != null ? `${inS}s→${cut.out}s` : (inS ? `${inS}s→end` : 'full');
  console.log(`[assemble] ${id.padEnd(6)} ${win}`);
  pieces.push({ id, file: trimmed });
}
if (pieces.length < 2) die('fewer than 2 clips available — nothing to assemble');

// --- 2) concat ---
const inputs = pieces.flatMap((p) => ['-i', p.file]);
const n = pieces.length;
const chain = pieces.map((_, i) => `[${i}:v][${i}:a]`).join('');
ff([...inputs, '-filter_complex', `${chain}concat=n=${n}:v=1:a=1[v][a]`, '-map', '[v]', '-map', '[a]',
  '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-c:a', 'aac', '-b:a', '192k', outPath]);

// --- 3) seam sheet: last frame of N | first frame of N+1 for every cut point ---
const rows = [];
for (let i = 0; i < n - 1; i++) {
  const a = join(tmpDir, `seam${i}a.png`);
  const b = join(tmpDir, `seam${i}b.png`);
  ff(['-sseof', '-0.15', '-i', pieces[i].file, '-frames:v', '1', '-update', '1', a]);
  ff(['-i', pieces[i + 1].file, '-frames:v', '1', '-update', '1', b]);
  const row = join(tmpDir, `seamrow${i}.png`);
  ff(['-i', a, '-i', b, '-filter_complex', '[0:v]pad=iw+6:ih:0:0:white[l];[l][1:v]hstack=2', row]);
  rows.push(row);
}
const rowInputs = rows.flatMap((r) => ['-i', r]);
ff([...rowInputs, '-filter_complex', `${rows.map((_, i) => `[${i}:v]`).join('')}vstack=${rows.length},scale=1980:-1`, seamPath]);

console.log(`[assemble] FINECUT: ${outPath}`);
console.log(`[assemble] SEAMS:   ${seamPath}  (${n - 1} cut points — each row: OUT of clip N | IN of clip N+1)`);
console.log(`[assemble] order:   ${pieces.map((p) => p.id).join(' → ')}`);
