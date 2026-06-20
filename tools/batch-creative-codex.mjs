#!/usr/bin/env node
// batch-creative-codex: fan a list of ad angles out into N DISTINCT on-brand
// creatives by looping the existing codex-image skill (gpt-image-2, billed to
// the ChatGPT plan via `codex login`) once per angle, with a locked brand
// master prompt. This is the "100 creatives in ~4 minutes, $0" workflow — the
// distinct-plate method (each angle gets its own generated image), as opposed
// to the in-app BatchFanOut module (one hero + Canvas text overlay).
//
// It is a pure orchestrator: it composes prompts and dispatches to
// .claude/skills/codex-image/generate.mjs, which owns all Codex auth/preflight
// and the real image generation. Nothing here talks to Codex directly.
//
// Usage:
//   node tools/batch-creative-codex.mjs --angles assets/creative-angles/grifon-zam.starter.json --dry-run
//   node tools/batch-creative-codex.mjs --angles <angles.json> --ref assets/brand/zam-ref.jpg --limit 2
//   node tools/batch-creative-codex.mjs --angles <angles.json> --ref assets/brand/zam-ref.jpg --concurrency 4
//
// Args:
//   --angles <file.json>  (required) array of { id?, headline, scene?, badge? }
//   --ref <path>          optional reference photo (Zam) → forwarded to generate.mjs as --edit
//   --out <dir>           output dir (default .tmp/batch-creative/<timestamp>/)
//   --size <WxH>          image size (default 1024x1536, a 4:5 feed plate)
//   --concurrency <n>     parallel generations (default 3) — the "4 minutes" lever
//   --limit <n>           only generate the first N angles (cheap smoke runs)
//   --master <file>       override the brand master prompt template
//   --dry-run             compose + print every prompt and command; spawn nothing

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const out = { concurrency: 3, size: '1024x1536', dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--angles') out.angles = argv[++i];
    else if (a === '--ref') out.ref = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--size') out.size = argv[++i];
    else if (a === '--concurrency') out.concurrency = Math.max(1, parseInt(argv[++i], 10) || 1);
    else if (a === '--limit') out.limit = parseInt(argv[++i], 10);
    else if (a === '--master') out.master = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
  }
  return out;
}

function die(msg, code = 1) {
  console.error(`\n[batch-creative] ${msg}\n`);
  process.exit(code);
}

function slugify(s, fallback) {
  const slug = String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || fallback;
}

const args = parseArgs(process.argv.slice(2));
if (!args.angles) die('Missing --angles <file.json>. See workflows/batch_creative_codex.md');

// --- Load + validate the angles list ---
const anglesPath = path.resolve(args.angles);
if (!existsSync(anglesPath)) die(`Angles file not found: ${anglesPath}`);
let angles;
try {
  angles = JSON.parse(readFileSync(anglesPath, 'utf8'));
} catch (e) {
  die(`Angles file is not valid JSON: ${e.message}`);
}
if (!Array.isArray(angles) || angles.length === 0) die('Angles file must be a non-empty JSON array.');
for (const [i, a] of angles.entries()) {
  if (!a || typeof a.headline !== 'string' || !a.headline.trim()) {
    die(`Angle #${i} is missing a non-empty "headline".`);
  }
}
if (Number.isInteger(args.limit) && args.limit > 0) angles = angles.slice(0, args.limit);

// --- Load the brand master prompt template ---
const masterPath = args.master ? path.resolve(args.master) : path.join(__dirname, 'batch-creative-codex.master.txt');
if (!existsSync(masterPath)) die(`Master prompt template not found: ${masterPath}`);
const master = readFileSync(masterPath, 'utf8');

function composePrompt(angle) {
  return master
    .replaceAll('{{HEADLINE}}', (angle.headline || '').trim())
    .replaceAll('{{SCENE}}', (angle.scene || 'clean premium studio backdrop').trim())
    .replaceAll('{{BADGE}}', (angle.badge || 'GRIFON AI · VIP').trim());
}

// --- Reference photo (optional) ---
let refAbs = null;
if (args.ref) {
  refAbs = path.resolve(args.ref);
  if (!existsSync(refAbs)) die(`Reference photo not found: ${refAbs}\n  Drop Zam's headshot there, or omit --ref for a face-optional run.`);
}

// --- Output dir ---
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = path.resolve(args.out || path.join(repoRoot, '.tmp', 'batch-creative', stamp));
const generator = path.join(repoRoot, '.claude', 'skills', 'codex-image', 'generate.mjs');
if (!existsSync(generator)) die(`codex-image generator not found at ${generator}`);

// --- Build the job list ---
const jobs = angles.map((angle, i) => {
  const n = String(i + 1).padStart(2, '0');
  const file = `${n}-${slugify(angle.id || angle.headline, 'creative')}.png`;
  const outPath = path.join(outDir, file);
  const prompt = composePrompt(angle);
  const genArgs = [generator, '--prompt', prompt, '--out', outPath, '--size', args.size];
  if (refAbs) genArgs.push('--edit', refAbs);
  return { i, angle, file, outPath, prompt, genArgs };
});

console.error(`[batch-creative] ${jobs.length} creative(s) | size ${args.size} | concurrency ${args.concurrency}` +
  (refAbs ? ` | ref ${path.relative(repoRoot, refAbs)}` : ' | no ref (face-optional)'));
console.error(`[batch-creative] out: ${path.relative(repoRoot, outDir)}/`);

if (args.dryRun) {
  console.error('\n[batch-creative] DRY RUN — composing prompts, spawning nothing.\n');
  for (const j of jobs) {
    console.log(`\n===== #${j.i + 1}  ${j.file} =====`);
    console.log(`$ node ${path.relative(repoRoot, j.genArgs[0])} --prompt "<composed>" --out ${path.relative(repoRoot, j.outPath)} --size ${args.size}${refAbs ? ` --edit ${path.relative(repoRoot, refAbs)}` : ''}`);
    console.log('--- composed prompt ---');
    console.log(j.prompt.trim());
  }
  console.error(`\n[batch-creative] dry run complete — ${jobs.length} prompt(s) composed, 0 images generated.\n`);
  process.exit(0);
}

mkdirSync(outDir, { recursive: true });

// --- Run one generate.mjs job, capturing output ---
function runJob(job) {
  return new Promise((resolve) => {
    const child = spawn('node', job.genArgs, { cwd: repoRoot });
    let stderr = '';
    child.stdout.on('data', () => {});
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.on('error', (err) => resolve({ ...job, ok: false, error: err.message }));
    child.on('close', (code) => {
      const ok = code === 0 && existsSync(job.outPath);
      resolve({ ...job, ok, error: ok ? null : (stderr.trim().split('\n').slice(-3).join(' ') || `exit ${code}`) });
    });
  });
}

// --- Simple concurrency pool ---
async function runPool(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function spin() {
    while (next < items.length) {
      const idx = next++;
      console.error(`[batch-creative] → #${idx + 1}/${items.length}  ${items[idx].file}`);
      results[idx] = await worker(items[idx]);
      const r = results[idx];
      console.error(`[batch-creative] ${r.ok ? '✓' : '✗'} #${idx + 1}  ${items[idx].file}${r.ok ? '' : `  (${r.error})`}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, spin));
  return results;
}

const results = await runPool(jobs, args.concurrency, runJob);

// --- Manifest + summary ---
const manifest = {
  generatedAt: new Date().toISOString(),
  anglesFile: path.relative(repoRoot, anglesPath),
  ref: refAbs ? path.relative(repoRoot, refAbs) : null,
  size: args.size,
  master: path.relative(repoRoot, masterPath),
  creatives: results.map((r) => ({
    n: r.i + 1,
    file: r.file,
    ok: r.ok,
    error: r.error,
    headline: r.angle.headline,
    scene: r.angle.scene || null,
    badge: r.angle.badge || null,
    prompt: r.prompt.trim(),
  })),
};
const manifestPath = path.join(outDir, 'manifest.json');
writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

const okCount = results.filter((r) => r.ok).length;
const failCount = results.length - okCount;
console.error(`\n[batch-creative] done — ${okCount} ok, ${failCount} failed → ${path.relative(repoRoot, outDir)}/`);
console.error(`[batch-creative] manifest: ${path.relative(repoRoot, manifestPath)}`);
if (failCount > 0) {
  console.error('[batch-creative] some creatives failed (rate-limit? tune --concurrency, or re-run the failed angles).');
  process.exit(2);
}
