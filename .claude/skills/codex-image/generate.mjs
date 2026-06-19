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
import { existsSync } from 'node:fs';
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

// --- Preflight 1: is the Codex CLI installed? ---
const ver = spawnSync('codex', ['--version'], { encoding: 'utf8' });
if (ver.error || ver.status !== 0) {
  die(
    'Codex CLI not found on PATH.\n' +
    '  This skill needs OpenAI Codex installed where Claude Code runs.\n' +
    '  Install:   npm i -g @openai/codex\n' +
    '  Then:      codex login   (sign in with your ChatGPT account)\n' +
    '  Re-arm after a machine wipe with: scripts/restore-codex.ps1'
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
const codexArgs = ['exec', '--full-auto'];
if (args.edit) codexArgs.push('-i', path.resolve(args.edit));
codexArgs.push(instruction);

console.error(`[codex-image] codex ${codexArgs.slice(0, -1).join(' ')} "<instruction>"`);
const run = spawnSync('codex', codexArgs, { stdio: 'inherit' });

if (run.error) die(`Failed to launch codex: ${run.error.message}`);
if (run.status !== 0) die(`codex exec exited with code ${run.status}.`, run.status || 1);

// --- Verify Codex actually wrote the file ---
if (!existsSync(outAbs)) {
  die(
    `codex finished but no file at ${outAbs}.\n` +
    '  Re-run with a simpler in-repo --out path (e.g. .tmp/hero.png).\n' +
    '  Check `codex exec --help` for flag changes between Codex versions.'
  );
}
console.log(`[codex-image] ✓ saved ${outAbs}`);
