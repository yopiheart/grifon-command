#!/usr/bin/env node
// codex-executor: bridge wrapper that delegates a mechanical, spec-tight
// implementation brief to the OpenAI Codex CLI (the GPT 5.6 Sol executor lane).
// Same bridge pattern as .claude/skills/codex-image/generate.mjs: this file is
// a PURE DISPATCHER — it preflights Codex, hands over the brief, then enforces
// Grifon's guardrails post-hoc (Codex knows nothing about them):
//   1. TUNED-file guardrail: any diff to services/geminiService.ts or
//      api/_lib/prompts.ts is saved to a patch, reverted, and flagged.
//   2. Verification: npm run build + npx vitest run must pass.
// Billed against the user's ChatGPT plan via `codex login` — no OPENAI_API_KEY.
//
// Usage:
//   node .claude/skills/codex-executor/execute.mjs --brief .tmp/brief.md [--model <id>] [--self-review]
//
// Args:
//   --brief <path>   (required) in-repo markdown brief: plan/spec + files in
//                    scope + acceptance criteria. Codex has NO conversation
//                    context — the brief must contain everything (same rule as
//                    the code-executor subagent).
//   --model <id>     optional Codex model override (e.g. the GPT 5.6 Sol id);
//                    omit to use the Codex CLI default.
//   --self-review    after implementing, run a second Codex pass that
//                    adversarially inspects its own diff (dead handlers,
//                    unwired UI, missed acceptance criteria) and fixes them.
//
// Exit codes (the fallback SOP in SKILL.md keys off these):
//   0   success — diff in working tree, build + tests green
//   1   bad invocation / dirty tree / generic failure
//   2   TUNED-file guardrail tripped (patch saved, files reverted — main loop must review)
//   3   Codex finished but build or tests failed (diff left in tree for inspection)
//   10  Codex CLI not installed / not runnable            → fall back to code-executor
//   11  Codex installed but not logged in                 → fall back to code-executor
//   12  Codex quota / rate-limit / plan-limit exhausted   → fall back to code-executor
//
// Safety: always runs Codex in its workspace-write sandbox (--full-auto) and
// never disables Codex's sandbox or approval gates. Never commits — git stays
// in the main loop, which reviews the diff first.

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const TUNED_FILES = ['services/geminiService.ts', 'api/_lib/prompts.ts'];
const TUNED_PATCH = '.tmp/codex-executor-tuned-flagged.patch';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--brief') out.brief = argv[++i];
    else if (a === '--model') out.model = argv[++i];
    else if (a === '--self-review') out.selfReview = true;
  }
  return out;
}

function die(msg, code = 1) {
  console.error(`\n[codex-executor] ${msg}\n`);
  process.exit(code);
}

function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (r.error || r.status !== 0) die(`git ${args.join(' ')} failed: ${(r.stderr || r.error?.message || '').trim()}`);
  return (r.stdout || '').trim();
}

const args = parseArgs(process.argv.slice(2));
if (!args.brief) die('Missing --brief <path>. The brief must contain plan/spec + files in scope + acceptance criteria.');
const briefAbs = path.resolve(args.brief);
const repoRoot = process.cwd();
if (!existsSync(briefAbs)) die(`Brief not found: ${briefAbs}`);
if (!briefAbs.startsWith(repoRoot + path.sep)) {
  die(`--brief must be inside the repo (${repoRoot}) so Codex can read it within its sandbox. Got: ${briefAbs}`);
}

// The post-run TUNED check and diff report treat "whatever changed" as "what
// Codex did", so the tracked tree must start clean. Untracked files are fine.
if (git(['status', '--porcelain', '--untracked-files=no'])) {
  die('Working tree has uncommitted tracked changes. Commit or stash them first — the post-run guardrail diffs against HEAD to isolate Codex\'s work.');
}

// --- Resolve a spawnable Codex invocation (cross-platform) ---
// Same dance as codex-image: on Windows the npm-installed `codex` is a .cmd
// shim Node can't spawn directly, and shell:true would mangle the instruction,
// so invoke the underlying codex.js entry with node.
function resolveCodex() {
  if (process.platform !== 'win32') return { file: 'codex', pre: [] };
  const entry = (prefix) => path.join(prefix, 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
  const candidates = [];
  if (process.env.APPDATA) candidates.push(entry(path.join(process.env.APPDATA, 'npm')));
  if (!candidates.some(existsSync)) {
    const pref = spawnSync('npm', ['prefix', '-g'], { encoding: 'utf8', shell: true });
    if (pref.status === 0 && pref.stdout) candidates.push(entry(pref.stdout.trim()));
  }
  const js = candidates.find(existsSync);
  if (js) return { file: process.execPath, pre: [js] };
  return null;
}

const codex = resolveCodex();
if (!codex) {
  die(
    'Codex CLI not found — falling back to the code-executor subagent (Opus 4.8) is the SOP.\n' +
    '  Install:   npm i -g @openai/codex\n' +
    '  Then:      codex login   (sign in with your ChatGPT account)\n' +
    '  Re-arm after a machine wipe with: scripts/restore-codex.ps1',
    10
  );
}

const ver = spawnSync(codex.file, [...codex.pre, '--version'], { encoding: 'utf8' });
if (ver.error || ver.status !== 0) {
  die('Codex CLI found but not runnable. Reinstall: npm i -g @openai/codex', 10);
}

const authPath = path.join(homedir(), '.codex', 'auth.json');
if (!existsSync(authPath)) {
  die(
    `Codex is installed (${(ver.stdout || '').trim()}) but not logged in (no ${authPath}).\n` +
    '  Run:  codex login   — or fall back to the code-executor subagent.',
    11
  );
}

function runCodex(instruction) {
  const codexArgs = [...codex.pre, 'exec', '--full-auto'];
  if (args.model) codexArgs.push('-m', args.model);
  codexArgs.push(instruction);
  const run = spawnSync(codex.file, codexArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const log = (run.stdout || '') + (run.stderr || '');
  process.stderr.write(log);
  if (run.error) die(`Failed to launch codex: ${run.error.message}`);
  // Quota/plan-limit exhaustion is the automatic-fallback trigger (exit 12):
  // the main loop re-dispatches the SAME brief to code-executor (Opus 4.8).
  if (run.status !== 0 && /rate.?limit|quota|usage.?limit|plan.?limit|too many requests|\b429\b/i.test(log)) {
    die('Codex hit a quota / rate limit. Fall back: dispatch the same brief to the code-executor subagent (Opus 4.8).', 12);
  }
  if (run.status !== 0) die(`codex exec exited with code ${run.status}.`, 1);
  return log;
}

// --- Pass 1: implement the brief. The guardrails are restated in-prompt as
// defense in depth, but enforcement is the post-run check below. ---
const instruction =
  `Read the implementation brief at "${briefAbs}" and implement it fully in this repository. Rules:\n` +
  `- Surgical scope: touch ONLY the files the brief puts in scope; match surrounding style, naming, and comment density.\n` +
  `- HARD GUARDRAIL: never modify prompt text, system instructions, response schemas, or model IDs in ` +
  TUNED_FILES.map((f) => `"${f}"`).join(' or ') +
  `. If the brief requires such an edit, STOP and write why to "${TUNED_PATCH}.blocked.txt" instead of editing.\n` +
  `- Do NOT run git commit or git push. Do NOT create branches.\n` +
  `- Do NOT install dependencies unless the brief explicitly says to.\n` +
  `- When done, print a per-file summary of what changed and note any acceptance criterion you could not meet.`;

runCodex(instruction);

// --- Optional pass 2: Sol's devil's-advocate self-review (the brief's
// "multi-pass refinement" pattern — catches its own dead buttons / unwired
// handlers BEFORE the Claude checker spends review effort on them). ---
if (args.selfReview) {
  console.error('[codex-executor] self-review pass…');
  runCodex(
    `Run "git diff" in this repository and adversarially inspect the changes you just made against the brief at "${briefAbs}". ` +
    `Hunt specifically for: event handlers that are defined but never wired, UI elements with no behavior, unhandled error paths, ` +
    `acceptance criteria from the brief that are not actually met, and TypeScript that will not compile. Fix what you find. ` +
    `Do NOT expand scope beyond the brief, and the same hard guardrail applies: never modify ` +
    TUNED_FILES.map((f) => `"${f}"`).join(' or ') + `.`
  );
}

// --- Guardrail enforcement: any change to a TUNED file is saved, reverted,
// and flagged. Deciding "transport-only vs tuned-content" mechanically is not
// reliable, so the conservative rule is ANY diff → flag; the main loop can
// re-apply a legitimately transport-only patch deliberately. ---
const tunedChanged = TUNED_FILES.filter((f) => {
  const r = spawnSync('git', ['diff', '--quiet', 'HEAD', '--', f]);
  return r.status === 1;
});
if (tunedChanged.length) {
  const patch = spawnSync('git', ['diff', 'HEAD', '--', ...tunedChanged], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  mkdirSync(path.dirname(path.resolve(TUNED_PATCH)), { recursive: true });
  writeFileSync(path.resolve(TUNED_PATCH), patch.stdout || '');
  spawnSync('git', ['checkout', 'HEAD', '--', ...tunedChanged]);
  die(
    `TUNED-file guardrail tripped: Codex modified ${tunedChanged.join(', ')}.\n` +
    `  The change was saved to ${TUNED_PATCH} and REVERTED.\n` +
    `  Remaining (non-tuned) diff is left in the tree but is UNVERIFIED — review it in the main loop,\n` +
    `  and take any tuned-file change to Neil for explicit approval before re-applying.`,
    2
  );
}

// --- Verification: same bar the code-executor subagent is held to. ---
function verify(label, cmd, vArgs) {
  console.error(`[codex-executor] ${label}…`);
  const r = spawnSync(cmd, vArgs, { encoding: 'utf8', shell: true, maxBuffer: 64 * 1024 * 1024 });
  process.stderr.write((r.stdout || '') + (r.stderr || ''));
  if (r.status !== 0) {
    die(
      `${label} FAILED (exit ${r.status}). Diff left in the working tree for inspection.\n` +
      `  Either brief Codex again with the failure output, or fall back to code-executor.`,
      3
    );
  }
}
verify('npm run build', 'npm', ['run', 'build']);
verify('npx vitest run', 'npx', ['vitest', 'run']);

console.error('\n[codex-executor] diff summary:');
console.error(git(['diff', 'HEAD', '--stat']) || '(no changes)');
console.log('\n[codex-executor] ✓ brief implemented, build + tests green. Diff is uncommitted — review it in the main loop before committing.');
