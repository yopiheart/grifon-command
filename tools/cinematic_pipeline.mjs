#!/usr/bin/env node
// Cinematic pipeline driver: turn a shot manifest into rendered Seedance clips.
// A thin ORCHESTRATOR — it owns no image/video logic, it chains the two real
// execution layers per shot, resumably:
//   1) keyframe(s) -> Codex gpt-image-2 via tools/codex-image-batch.mjs
//   2) video       -> Seedance 2.0 API via tools/seedance_render.mjs
//
// Node port of tools/cinematic_pipeline.py — the runnable path on cafe PCs (no
// Python). Node built-ins only, no deps.
//
// Usage:
//   node tools/cinematic_pipeline.mjs --manifest .tmp/cinematic/<project>/shots.json \
//     [--dry-run] [--keyframes-only] [--force] [--only <id>]
//
// Manifest (JSON): { project, shots: [{ id, keyframe_prompt, keyframe_size?,
//   last_frame_prompt?, video_prompt, aspect, duration, mode }] }
// Outputs land beside the manifest: <id>.png (+ <id>.end.png), <id>.mp4.
// Re-runnable — existing keyframes/clips are skipped unless --force.
//
// Exit codes: 0 ok, 1 usage/manifest error, 2 a render sub-step failed.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CODEX_BATCH = join(REPO_ROOT, 'tools', 'codex-image-batch.mjs');
const SEEDANCE = join(REPO_ROOT, 'tools', 'seedance_render.mjs');
const DEFAULT_KEYFRAME_SIZE = '1024x1536';

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const has = (name) => args.includes(name);

const die = (msg, code = 1) => { console.error(`[pipeline] ${msg}`); process.exit(code); };

const manifestPath = flag('--manifest');
const dry = has('--dry-run');
const keyframesOnly = has('--keyframes-only');
const force = has('--force');
const only = flag('--only');

if (!manifestPath) die('missing --manifest <shots.json>');
if (!existsSync(manifestPath)) die(`manifest not found: ${manifestPath}`);

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch (e) {
  die(`bad manifest JSON: ${e.message}`);
}

const project = manifest.project || 'untitled';
let shots = Array.isArray(manifest.shots) ? manifest.shots : [];
if (!shots.length) die('manifest has no shots[]');
if (only) {
  shots = shots.filter((s) => String(s.id) === only);
  if (!shots.length) die(`--only "${only}" matched no shot in the manifest`);
}

// Outputs land alongside the manifest (.tmp/cinematic/<project>/).
const projDir = resolve(dirname(manifestPath));
if (!dry) mkdirSync(projDir, { recursive: true });
console.error(`[pipeline] project '${project}' — ${shots.length} shot(s) -> ${projDir}`);

const printCmd = (cmd) => console.log(`  ${dry ? 'DRY' : 'RUN'}  ${cmd.map((c) => (/\s/.test(c) ? `"${c}"` : c)).join(' ')}`);

// --- 1) keyframe step: one codex-image-batch manifest for the whole shot list ---
const batchItems = [];
for (const shot of shots) {
  const sid = String(shot.id || '');
  if (!sid) die('a shot is missing "id"');
  const size = shot.keyframe_size || DEFAULT_KEYFRAME_SIZE;
  if (shot.keyframe_prompt) batchItems.push({ prompt: shot.keyframe_prompt, out: join(projDir, `${sid}.png`), size });
  if (shot.last_frame_prompt) batchItems.push({ prompt: shot.last_frame_prompt, out: join(projDir, `${sid}.end.png`), size });
}

if (batchItems.length) {
  const batchManifestPath = join(projDir, '.keyframe-batch.json');
  const cmd = ['node', CODEX_BATCH, '--manifest', batchManifestPath];
  if (force) cmd.push('--force');
  if (dry) {
    console.log('[pipeline] keyframe step (codex-image-batch):');
    for (const it of batchItems) console.log(`    ${existsSync(it.out) && !force ? 'skip' : 'gen '} ${it.out}`);
    printCmd(cmd);
  } else {
    writeFileSync(batchManifestPath, JSON.stringify(batchItems, null, 2), 'utf8');
    printCmd(cmd);
    const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit' });
    if (r.status !== 0) console.error('[pipeline] WARNING: codex-image-batch exited non-zero — render will skip shots whose keyframe is missing');
  }
}

// --- 2) render step (sequential — 2.0 beta caps at 3 concurrent tasks) ---
const summary = [];
if (keyframesOnly) {
  console.error('\n[pipeline] --keyframes-only — stopping before render');
  for (const shot of shots) summary.push({ id: String(shot.id), status: 'skipped (keyframes-only)' });
} else {
  console.log('\n[pipeline] render step (seedance):');
  for (const shot of shots) {
    const sid = String(shot.id);
    if (!shot.video_prompt) { summary.push({ id: sid, status: 'skipped (no video_prompt)' }); continue; }

    const firstPng = join(projDir, `${sid}.png`);
    const endPng = join(projDir, `${sid}.end.png`);
    const mp4 = join(projDir, `${sid}.mp4`);

    if (!dry && existsSync(mp4) && !force) {
      console.error(`  skip render (exists): ${mp4}`);
      summary.push({ id: sid, status: 'skipped (exists)' });
      continue;
    }

    const cmd = ['node', SEEDANCE, '--prompt', shot.video_prompt, '--first-frame', firstPng, '--out', mp4,
      '--aspect', String(shot.aspect || '9:16'), '--duration', String(shot.duration ?? 5), '--mode', String(shot.mode || 'standard')];
    if (shot.resolution) cmd.push('--resolution', String(shot.resolution));
    if (shot.last_frame_prompt) cmd.push('--last-frame', endPng);
    if (dry) cmd.push('--dry-run');

    printCmd(cmd);
    if (dry) { summary.push({ id: sid, status: 'dry-run' }); continue; }

    const r = spawnSync(cmd[0], cmd.slice(1), { stdio: 'inherit' });
    summary.push({ id: sid, status: r.status === 0 ? 'ok' : 'failed' });
  }
}

// --- final summary table ---
console.error('\n[pipeline] summary:');
for (const row of summary) console.error(`  ${row.id.padEnd(16)} ${row.status}`);
const failed = summary.filter((r) => r.status === 'failed').length;
console.error(`[pipeline] done — ${summary.length} shot(s), ${failed} failed`);
process.exit(failed ? 2 : 0);
