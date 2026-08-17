#!/usr/bin/env node
/**
 * Build SFX audition MP3s for the combined Slice 1+2 ear-gate
 * (workflows/sfx_upgrade_plan.md). No network, no API key, no render.
 *
 * The ear-gate has three listening targets. This tool covers the two that do
 * NOT need a full ad render:
 *   (a) rotation variants — does every variant of a class read as the SAME
 *       instrument at the SAME level? Rotation is only safe if it is.
 *   (b) chaching FAMILY curation — v3-v6 are machine-contested (mechanical
 *       register vs bell chime); keep the family that reads "cha-ching" on
 *       first listen, and prune the rest. Data-only decision.
 * Target (c), cue TIMING, needs a real ad and stays Neil's app work.
 *
 * Usage:
 *   node tools/ear_gate_audition.mjs            # all classes + the shortlists
 *   node tools/ear_gate_audition.mjs boom ding  # just these classes
 *
 * Output: .tmp/ear-gate/<class>.mp3 plus two shortlists:
 *   _CONTESTED.mp3 — only the variants the plan names as suspect
 *   _CHACHING.mp3  — the cha-ching family decision, in one file
 *
 * Each file plays variants in order separated by silence, so a level or timbre
 * outlier is audible without a spectrogram. Announce-free on purpose: a spoken
 * label between hits would colour the judgement.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpegPath from 'ffmpeg-static';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SFX_DIR = join(ROOT, 'api', '_lib', 'assets', 'sfx');
const OUT_DIR = join(ROOT, '.tmp', 'ear-gate');
const GAP_SEC = 0.7; // long enough to separate hits, short enough to compare them

/** The variants workflows/sfx_upgrade_plan.md flags as machine-contested. */
const CONTESTED = ['ding-v3', 'ding-v4', 'riser-v2', 'swish-v2', 'glitch-v4', 'whoosh-v5'];
const CHACHING = ['chaching-v1', 'chaching-v2', 'chaching-v3', 'chaching-v4', 'chaching-v5', 'chaching-v6'];

const ffmpeg = (args) => {
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', ...args], {
    encoding: 'utf8',
  });
  if (r.status !== 0) throw new Error(r.stderr?.slice(-400) || `ffmpeg exited ${r.status}`);
};

/** Concatenate `files` with GAP_SEC of silence between them into one mp3. */
function buildAudition(files, outPath) {
  const inputs = files.flatMap((f) => ['-i', f]);
  // anullsrc as the spacer; one silent input reused between every pair.
  const spacerIdx = files.length;
  const parts = [];
  files.forEach((_, i) => {
    parts.push(`[${i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${i}]`);
  });
  const seq = files.map((_, i) => (i === 0 ? `[a${i}]` : `[gap${i}][a${i}]`)).join('');
  files.forEach((_, i) => {
    if (i > 0) parts.push(`[${spacerIdx}:a]atrim=0:${GAP_SEC},asetpts=N/SR/TB[gap${i}]`);
  });
  const n = files.length * 2 - 1;
  parts.push(`${seq}concat=n=${n}:v=0:a=1[out]`);
  ffmpeg([
    ...inputs,
    '-f', 'lavfi', '-t', String(GAP_SEC * files.length + 1),
    '-i', 'anullsrc=r=44100:cl=stereo',
    '-filter_complex', parts.join(';'),
    '-map', '[out]', '-c:a', 'libmp3lame', '-q:a', '2', '-y', outPath,
  ]);
}

const variantsByClass = () => {
  const map = new Map();
  for (const name of readdirSync(SFX_DIR)) {
    const m = /^(.+)-v(\d+)\.mp3$/.exec(name);
    if (!m) continue;
    if (!map.has(m[1])) map.set(m[1], []);
    map.get(m[1]).push({ n: Number(m[2]), file: join(SFX_DIR, name), id: `${m[1]}-v${m[2]}` });
  }
  for (const list of map.values()) list.sort((a, b) => a.n - b.n);
  return map;
};

const byClass = variantsByClass();
const wanted = process.argv.slice(2);
const classes = wanted.length ? wanted : [...byClass.keys()].sort();

rmSync(OUT_DIR, { recursive: true, force: true });
mkdirSync(OUT_DIR, { recursive: true });

const manifest = [];
for (const cls of classes) {
  const list = byClass.get(cls);
  if (!list?.length) {
    console.log(`  ! ${cls}: no variants found — skipped`);
    continue;
  }
  const out = join(OUT_DIR, `${cls}.mp3`);
  buildAudition(list.map((v) => v.file), out);
  manifest.push({ file: `${cls}.mp3`, order: list.map((v) => v.id).join('  ') });
  console.log(`  ${cls.padEnd(14)} ${list.length} variants -> ${out}`);
}

// The two shortlists: the actual decisions, not the whole bank.
const pick = (ids) =>
  ids
    .map((id) => {
      const [cls] = id.split('-v');
      return byClass.get(cls)?.find((v) => v.id === id);
    })
    .filter(Boolean);

for (const [name, ids] of [['_CONTESTED', CONTESTED], ['_CHACHING', CHACHING]]) {
  const found = pick(ids);
  if (!found.length) continue;
  const out = join(OUT_DIR, `${name}.mp3`);
  buildAudition(found.map((v) => v.file), out);
  manifest.push({ file: `${name}.mp3`, order: found.map((v) => v.id).join('  ') });
  console.log(`  ${name.padEnd(14)} ${found.length} clips -> ${out}`);
}

writeFileSync(
  join(OUT_DIR, 'ORDER.txt'),
  'Playback order inside each file (separated by 0.7s silence).\n' +
    'Nothing is announced on the audio — a spoken label would colour the judgement.\n\n' +
    manifest.map((m) => `${m.file.padEnd(18)} ${m.order}`).join('\n') + '\n',
  'utf8'
);
console.log(`\nWrote ${manifest.length} audition files to ${OUT_DIR}`);
console.log('Playback order is in ORDER.txt — start with _CONTESTED.mp3 and _CHACHING.mp3.');
