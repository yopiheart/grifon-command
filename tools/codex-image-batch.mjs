// Reusable PARALLEL Codex image batch — the default path for "generate N images".
// Fans a manifest of {prompt, out, size?} out concurrently (NOT one-at-a-time),
// skips files that already exist, and TIMES the batch so wall-clock is visible.
//
// This is the durable, automatic version of a one-off batch — agents should reach
// for THIS on any multi-image request instead of looping the single-image wrapper.
//
// Usage:
//   node tools/codex-image-batch.mjs --manifest <path.json> [--concurrency 8] [--force]
//   node tools/codex-image-batch.mjs --json '[{"prompt":"...","out":"public/x.png"}]'
//
// Manifest item: { "prompt": string, "out": string (path inside repo), "size"?: "1024x1024",
//                  "edit"?: string | string[] (reference images for edit/identity-preserve runs) }
import { spawn } from 'node:child_process';
import { existsSync, statSync, readFileSync } from 'node:fs';

const GEN = '.claude/skills/codex-image/generate.mjs';
const DEFAULT_SIZE = '1024x1024';

const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const has = (name) => args.includes(name);

let items;
const manifestPath = flag('--manifest');
const inlineJson = flag('--json');
try {
  const raw = manifestPath ? readFileSync(manifestPath, 'utf8') : inlineJson;
  if (!raw) throw new Error('provide --manifest <file.json> or --json <string>');
  items = JSON.parse(raw);
  if (!Array.isArray(items) || !items.length) throw new Error('manifest must be a non-empty array');
} catch (e) {
  console.error(`[codex-image-batch] ${e.message}`);
  process.exit(2);
}

const concurrency = Math.max(1, parseInt(flag('--concurrency', '8'), 10) || 8);
const force = has('--force');
const fmt = (ms) => `${(ms / 1000).toFixed(1)}s`;
const have = (out) => existsSync(out) && statSync(out).size > 1000;

const todo = force ? items : items.filter((i) => !have(i.out));
const skipped = items.length - todo.length;
const t0 = Date.now();
console.log(`▶ ${todo.length} image(s) in PARALLEL via Codex (concurrency ${concurrency}, ${skipped} already present)…\n`);

function gen({ out, prompt, size, edit }) {
  const start = Date.now();
  const name = out.split(/[\\/]/).pop();
  // `edit` = one path or an array of them, passed through as repeated --edit flags
  // (codex -i is variadic). Identity-locked subjects like Marvin are ALWAYS edit
  // runs — body master + face ref — so a batch runner without this could not run
  // the identity-lock manifests at all.
  const refs = (Array.isArray(edit) ? edit : edit ? [edit] : []).flatMap((p) => ['--edit', p]);
  return new Promise((resolve) => {
    const child = spawn('node', [GEN, '--prompt', prompt, '--out', out, '--size', size || DEFAULT_SIZE, ...refs], { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.stdout.on('data', () => {});
    child.on('close', (code) => {
      const ok = code === 0 && have(out);
      console.log(`${ok ? '✓' : '✗'} ${name.padEnd(28)} ${fmt(Date.now() - start).padStart(7)}${ok ? '' : `   (exit ${code}) ${err.trim().split('\n').slice(-1)[0] || ''}`}`);
      resolve({ name, ok });
    });
  });
}

// Simple concurrency-limited pool (Codex throttles ~8 concurrent; over-spawning just queues).
const results = [];
let cursor = 0;
async function worker() {
  while (cursor < todo.length) {
    const item = todo[cursor++];
    results.push(await gen(item));
  }
}
await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));

const okCount = results.filter((r) => r.ok).length;
console.log(`\n──────────────────────────────────────────`);
console.log(`TOTAL: ${okCount}/${todo.length} in ${fmt(Date.now() - t0)} (wall-clock, parallel) · ${skipped} skipped`);
if (okCount < todo.length) process.exitCode = 1;
