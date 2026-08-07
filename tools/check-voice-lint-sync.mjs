#!/usr/bin/env node
/**
 * check-voice-lint-sync.mjs — fails when the funnels' voice gates drift apart.
 *
 * WHY THIS EXISTS
 * `scripts/lint-voice.mjs` is COPIED into every funnel, not imported, and that is
 * deliberate: funnels ship via `npx vercel deploy` run from inside their own
 * directory, so nothing above the funnel root is uploaded. A shared module one
 * level up would break the build. The cost of copying is drift, and on 2026-08-07
 * that cost came due:
 *
 *   - `oceanides-paolo` had 64 rules. `_template` and `oceanides-price-page` had 53.
 *   - The missing 11 were the ENTIRE 2026-08-06 "KLASE, HINDI SALITA" block —
 *     the one its own comment calls the most important in the file, including the
 *     `15 araw -> 15 days` rule Neil was most emphatic about.
 *   - Because `_template` was behind, every FUTURE funnel would have started
 *     without the hardest-won rules.
 *   - And because `price-page` was behind, 14 real violations were sitting in
 *     LIVE copy, invisible: `24 oras`, `30 araw`, and `sa iyo` x7.
 *
 * A rule that exists in one funnel and not the others is not a rule, it is a note.
 * This gate makes the copies provably identical, so "fixed once" means "fixed
 * everywhere" — the thing the manual copy-paste kept failing to deliver.
 *
 * CANONICAL = funnels/_template/scripts/lint-voice.mjs. The template is what
 * funnel-forge builds from, so it is the copy that must never be behind.
 *
 * Run: node tools/check-voice-lint-sync.mjs   (wired into CI `verify`)
 */

import { createHash } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const FUNNELS = join(ROOT, 'funnels');
const CANONICAL = join(FUNNELS, '_template', 'scripts', 'lint-voice.mjs');
const REL = 'scripts/lint-voice.mjs';

const sha = (s) => createHash('sha256').update(s).digest('hex').slice(0, 12);
// Normalize line endings only — the defreezer's git checkout can flip CRLF/LF,
// and that is not drift. Everything else must match byte for byte.
const norm = (s) => s.replace(/\r\n/g, '\n');

let canonical;
try {
  canonical = norm(await readFile(CANONICAL, 'utf8'));
} catch {
  console.error(`✗ canonical gate missing: ${relative(ROOT, CANONICAL)}`);
  process.exit(1);
}

const dirs = (await readdir(FUNNELS, { withFileTypes: true }))
  .filter((e) => e.isDirectory() && e.name !== '_template')
  .map((e) => e.name);

const drift = [];
const ok = [];
const skipped = [];

for (const name of dirs) {
  const file = join(FUNNELS, name, REL);
  let body;
  try {
    body = norm(await readFile(file, 'utf8'));
  } catch {
    // A funnel with no voice gate is only correct when its copy is ENGLISH
    // (STEP 0a — e.g. `grifon-starter`). Report it so the choice stays visible
    // instead of silently looking like an oversight.
    skipped.push(name);
    continue;
  }
  if (body === canonical) ok.push(name);
  else drift.push({ name, file: relative(ROOT, file), got: sha(body), want: sha(canonical) });
}

for (const s of skipped) {
  console.log(`  ·  ${s} — walang voice gate (dapat ENGLISH ang copy nito, STEP 0a)`);
}
for (const o of ok) console.log(`  ✓  ${o}`);

if (drift.length === 0) {
  console.log(`voice-lint sync ok — ${ok.length} funnel katulad ng _template (${sha(canonical)})`);
  process.exit(0);
}

console.error(`\n✗ VOICE-LINT DRIFT — ${drift.length} funnel ang hindi tugma sa _template\n`);
for (const d of drift) {
  console.error(`  ${d.file}`);
  console.error(`    nasa funnel: ${d.got}   dapat: ${d.want}\n`);
}
console.error('Ang canonical ay funnels/_template/scripts/lint-voice.mjs.');
console.error('Ayusin: i-edit ang canonical, tapos kopyahin sa bawat funnel:\n');
for (const d of drift) console.error(`  cp ${relative(ROOT, CANONICAL)} ${d.file}`);
console.error('\nBakit kinokopya at hindi ina-import: nasa header ng gate mismo.\n');
process.exit(1);
