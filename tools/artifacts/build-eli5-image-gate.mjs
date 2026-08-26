#!/usr/bin/env node
/**
 * build-eli5-image-gate.mjs - the ELI5 explainer for the two-flag scene image gate.
 *
 * WHY THIS IS A BUILD SCRIPT AND NOT A HAND-WRITTEN PAGE
 * -----------------------------------------------------
 * An explainer that cites line numbers is wrong the moment someone inserts a line
 * above one of them, and a wrong explainer is worse than none: it teaches a reader
 * to distrust the whole page. So no line number on this page is typed. Each one is
 * resolved here by finding a unique ANCHOR string in the committed source.
 *
 * That turns rot into a build failure. If a refactor deletes an anchor, or an anchor
 * stops being unique, this script throws and the page does not regenerate. Per
 * CLAUDE.md: prefer a verifier over a paragraph.
 *
 * The anchors are deliberately code, not prose. A comment can be reworded by anyone;
 * the 503 error string and the `if (deps.X)` wiring cannot move without the behaviour
 * this page describes moving with them, which is exactly when the page must be reread.
 *
 * COMMITTED SOURCES ONLY - never `.tmp/`, which the defreezer eats. Everything here
 * reads from tracked files in the repo, so a post-defreezer session rebuilds it from
 * a fresh clone with no cache.
 *
 * DESIGN: Grifon NOIR (.claude/skills/artifact-noir). This is Grifon-project internal
 * tooling, NOT client work, so charcoal + #FFCC00 + glass is correct here. Fonts are
 * system stacks on purpose: the committed twin has to open off a USB stick with no
 * network, and a font CDN link would silently fall back anyway under the artifact CSP.
 *
 * Run from the repo root:  node tools/artifacts/build-eli5-image-gate.mjs
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finalize } from './_gates.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');
const TPL = join(HERE, 'eli5-image-gate.tpl.html');
const OUT = join(ROOT, 'artifacts', 'eli5-image-gate.html');

/**
 * Each entry: the token in the template, the tracked file, and a substring that must
 * appear EXACTLY ONCE in it. Exactly-once is the point. A substring that matches twice
 * is not an anchor, it is a coin flip, and it would silently start citing the wrong
 * call site.
 */
const ANCHORS = [
  {
    token: '__LINE_SERVER_503__',
    file: 'api/gemini/image.ts',
    find: "'image_gate_disabled'",
    what: 'the server 503 when the unprefixed flag is off',
  },
  {
    token: '__LINE_GATE_DEPS__',
    file: 'services/producerDeps.ts',
    find: 'export function gateDepsFor',
    what: 'the one function that hands out BOTH halves from the client flag',
  },
  {
    token: '__LINE_DETERMINISTIC__',
    file: 'services/producerOrchestrator.ts',
    find: 'if (deps.checkSceneImage) {',
    what: 'Half A, the deterministic check',
  },
  {
    token: '__LINE_HARD_FLAG__',
    file: 'services/producerOrchestrator.ts',
    find: 'await deps.run.flagScene(run.runId, i,',
    what: 'Half A hard-flagging a scene out of approval',
  },
  {
    token: '__LINE_AI_GATE__',
    file: 'services/producerOrchestrator.ts',
    find: 'if (deps.imageGateCheck) {',
    what: 'Half B, the AI gate',
  },
];

/** 1-indexed line of the sole occurrence of `find`. Throws on 0 or 2+ matches. */
function lineOf(source, find, { file, what }) {
  const lines = source.split('\n');
  const hits = [];
  lines.forEach((line, i) => { if (line.includes(find)) hits.push(i + 1); });

  if (hits.length === 0) {
    throw new Error(
      `ANCHOR LOST [${file}]: could not find ${JSON.stringify(find)} (${what}).\n` +
      `  The code this page explains has moved. REREAD IT before re-anchoring - the\n` +
      `  explainer may now be describing behaviour that no longer exists.`
    );
  }
  if (hits.length > 1) {
    throw new Error(
      `ANCHOR AMBIGUOUS [${file}]: ${JSON.stringify(find)} matches ${hits.length} lines ` +
      `(${hits.join(', ')}).\n  Pick a longer, unique anchor - a multi-match anchor cites ` +
      `whichever call site happens to be first.`
    );
  }
  return hits[0];
}

const tokens = {};
for (const anchor of ANCHORS) {
  const source = await readFile(join(ROOT, anchor.file), 'utf8');
  const line = lineOf(source, anchor.find, anchor);
  tokens[anchor.token] = String(line);
  console.log(`  ${anchor.file}:${line}`.padEnd(46) + anchor.what);
}

// Stamp the SOURCES, not the clock. The first version used `new Date()`, which meant a
// rebuild on any later date rewrote the twin even when all five anchors resolved
// identically. That defeats the only check worth having here: `git diff --exit-code
// artifacts/` after a rebuild is meant to answer "did a cited call site move?", and a
// wall-clock stamp makes it answer "did someone rerun this today?" instead.
//
// Newest commit date across the cited files, so the stamp is a fact about the code the
// page describes and is byte-identical for anyone rebuilding at the same commit.
const stamped = execFileSync('git',
  ['log', '-1', '--format=%cs', '--', ...ANCHORS.map((a) => a.file)],
  { cwd: ROOT, encoding: 'utf8' }).trim();
if (!/^\d{4}-\d{2}-\d{2}$/.test(stamped)) {
  throw new Error(`BUILD_FAILED [eli5-image-gate]: git gave no commit date for the cited sources (got ${JSON.stringify(stamped)}).`);
}
tokens.__BUILT_AT__ = stamped;

let html = await readFile(TPL, 'utf8');
for (const [token, value] of Object.entries(tokens)) {
  html = html.split(token).join(value);
}

// Shared gates: truncation guard, unsubstituted-token guard, the banned clipped-text
// property, and the pure-ASCII rule that keeps the bare-file twin from mojibaking when
// it is opened straight off disk with no <meta charset>. See _gates.mjs.
html = finalize(html, {
  label: 'eli5-image-gate',
  required: ['<title>', 'class="ground"', 'class="matrix"', 'gateDepsFor'],
  leftover: [/__[A-Z0-9_]+__/g],
});

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, html, 'utf8');
console.log(`\n> ${OUT}\n  page ${Math.round(Buffer.byteLength(html) / 1024)} KB`);
