#!/usr/bin/env node
// codex-image: bridge wrapper that makes Claude Code generate an image by
// delegating to the OpenAI Codex CLI's built-in image generator (gpt-image-2,
// triggered with `$imagegen`). Billed against the user's ChatGPT plan via
// `codex login` — no OPENAI_API_KEY. This file is a PURE DISPATCHER: it parses
// args, preflights that Codex is installed + authed, then spawns `codex exec`.
// All image intelligence lives inside Codex.
//
// Usage:
//   node generate.mjs --prompt "a golden retriever on a beach" --out ./hero.png
//   node generate.mjs --prompt "edit: add a party hat" --edit ./in.png --out ./out.png --size 1024x1024
//
// Args:
//   --prompt <text>   (required) what to draw / how to edit
//   --out <path>      (required) where to save the PNG
//   --size <WxH>      optional, default 1024x1024 (e.g. 1024x1536, 1536x1024)
//   --edit <path>     optional input image → edit mode (passed to codex via -i)
//
// Safety: this always runs Codex in its workspace-write sandbox (--full-auto)
// and refuses output paths outside the repo. It never disables Codex's sandbox
// or approval gates.

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, copyFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--prompt') out.prompt = argv[++i];
    else if (a === '--out') out.out = argv[++i];
    else if (a === '--size') out.size = argv[++i];
    else if (a === '--edit') out.edit = argv[++i];
  }
  return out;
}

function die(msg, code = 1) {
  console.error(`\n[codex-image] ${msg}\n`);
  process.exit(code);
}

const args = parseArgs(process.argv.slice(2));
if (!args.prompt) die('Missing --prompt. Example: --prompt "a husky in snow" --out ./hero.png');
if (!args.out) die('Missing --out (output file path).');
const size = args.size || '1024x1024';
const outAbs = path.resolve(args.out);

// Keep everything inside Codex's workspace sandbox: refuse out-of-repo targets
// rather than reaching for a sandbox-bypass flag.
const repoRoot = process.cwd();
if (!outAbs.startsWith(repoRoot + path.sep)) {
  die(`--out must be inside the repo (${repoRoot}). Got: ${outAbs}\n  Pick a path like .tmp/hero.png so Codex can write it within its sandbox.`);
}

// --- Resolve a spawnable Codex invocation (cross-platform) ---
// On Windows the npm-installed `codex` is a .cmd/.ps1 shim that Node's spawn
// cannot exec directly (it looks for codex.exe), and .cmd requires shell:true —
// which mangles args containing spaces, like our image instruction. So on
// Windows we invoke the underlying codex.js entry with `node` directly; on
// POSIX we call `codex` as before.
function resolveCodex() {
  if (process.platform !== 'win32') return { file: 'codex', pre: [] };
  const entry = (prefix) => path.join(prefix, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
  const candidates = [];
  // Try the default npm global prefix first (no child process → no shell warning).
  if (process.env.APPDATA) candidates.push(entry(path.join(process.env.APPDATA, 'npm')));
  // Fall back to `npm prefix -g` only if the default path didn't resolve.
  if (!candidates.some(existsSync)) {
    const pref = spawnSync('npm', ['prefix', '-g'], { encoding: 'utf8', shell: true });
    if (pref.status === 0 && pref.stdout) candidates.push(entry(pref.stdout.trim()));
  }
  const js = candidates.find(existsSync);
  if (js) return { file: process.execPath, pre: [js] }; // node <codex.js>
  return null;
}

const codex = resolveCodex();
if (!codex) {
  die(
    'Codex CLI not found.\n' +
    '  This skill needs OpenAI Codex installed where Claude Code runs.\n' +
    '  Install:   npm i -g @openai/codex\n' +
    '  Then:      codex login   (sign in with your ChatGPT account)\n' +
    '  Re-arm after a machine wipe with: scripts/restore-codex.ps1'
  );
}

// --- Preflight 1: is the Codex CLI runnable? ---
const ver = spawnSync(codex.file, [...codex.pre, '--version'], { encoding: 'utf8' });
if (ver.error || ver.status !== 0) {
  die(
    'Codex CLI found but not runnable.\n' +
    '  Reinstall: npm i -g @openai/codex\n' +
    '  Then:      codex login   (sign in with your ChatGPT account)'
  );
}

// --- Preflight 2: is the user logged in (OAuth token on disk)? ---
const authPath = path.join(homedir(), '.codex', 'auth.json');
if (!existsSync(authPath)) {
  die(
    `Codex is installed (${(ver.stdout || '').trim()}) but you are not logged in.\n` +
    `  No auth token at ${authPath}\n` +
    '  Run:  codex login   (signs in with your ChatGPT plan — no API key needed)'
  );
}

// --- Build the Codex instruction. `$imagegen` triggers the built-in generator. ---
const instruction =
  `$imagegen Generate an image and save it to the exact absolute path "${outAbs}". ` +
  `Size ${size}. Do NOT write code, do NOT edit project files, do NOT explain — ` +
  `only produce and save the image. ` +
  (args.edit ? `Edit the provided input image per: ${args.prompt}` : `Image: ${args.prompt}`);

// --full-auto runs Codex in its workspace-write sandbox (writes confined to the
// repo, network restricted) without interactive prompts — appropriate for a
// single headless image-gen that saves one file in-repo. We never bypass the
// sandbox. Exact flags can vary by Codex version — check `codex exec --help`.
// IMPORTANT: the PROMPT positional must come BEFORE -i. `codex exec`'s
// `-i/--image <FILE>...` is VARIADIC, so if -i precedes the prompt it swallows
// the instruction as another image → Codex finds no prompt and reads stdin
// ("No prompt provided via stdin"). Prompt first, then the image flag.
const codexArgs = [...codex.pre, 'exec', '--full-auto', instruction];
if (args.edit) codexArgs.push('-i', path.resolve(args.edit));

console.error(`[codex-image] ${path.basename(codex.file)} exec --full-auto "<instruction>"${args.edit ? ` -i ${path.resolve(args.edit)}` : ''}`);
const startMs = Date.now();
const run = spawnSync(codex.file, codexArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const log = (run.stdout || '') + (run.stderr || '');
process.stderr.write(log);

if (run.error) die(`Failed to launch codex: ${run.error.message}`);
if (run.status !== 0) die(`codex exec exited with code ${run.status}.`, run.status || 1);

// --- Save the result. `$imagegen` always persists its output under
// ~/.codex/generated_images/<session>/. On some platforms (Windows) Codex's
// sandbox blocks its own copy-into-repo step, so recover the file from that
// cache via THIS wrapper process (unsandboxed, normal FS access) instead of
// relying on Codex to do the copy.
//
// CRITICAL: only accept an image THIS run produced (mtime >= run start). Without
// the freshness guard, a run that generated nothing would silently copy a STALE
// cached image and report false success. We'd rather fail loudly. ---
if (!existsSync(outAbs)) {
  const genRoot = path.join(homedir(), '.codex', 'generated_images');
  const session = log.match(/session id:\s*([0-9a-f-]+)/i)?.[1];
  const freshPngsIn = (dir) =>
    existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.toLowerCase().endsWith('.png'))
          .map((f) => path.join(dir, f))
          .filter((p) => statSync(p).mtimeMs >= startMs - 2000) // 2s slack for fs granularity
      : [];
  // Prefer this run's own session dir; only then fall back to any fresh png.
  let candidates = session ? freshPngsIn(path.join(genRoot, session)) : [];
  if (!candidates.length && existsSync(genRoot)) {
    for (const d of readdirSync(genRoot)) candidates.push(...freshPngsIn(path.join(genRoot, d)));
  }
  const src = candidates.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
  if (src) {
    mkdirSync(path.dirname(outAbs), { recursive: true });
    copyFileSync(src, outAbs);
    console.error(`[codex-image] recovered image from Codex cache (${path.basename(src)})`);
  }
}

if (!existsSync(outAbs)) {
  die(
    `codex finished but no file at ${outAbs} (and none found in ~/.codex/generated_images).\n` +
    '  Re-run with a simpler in-repo --out path (e.g. .tmp/hero.png).\n' +
    '  Check `codex exec --help` for flag changes between Codex versions.'
  );
}
console.log(`[codex-image] ✓ saved ${outAbs}`);
