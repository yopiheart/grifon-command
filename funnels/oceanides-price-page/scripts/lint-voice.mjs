#!/usr/bin/env node
/**
 * lint-voice.mjs — fails the build when page copy drifts out of Neil's register.
 *
 * WHY THIS EXISTS
 * Neil, 2026-07-30: "Di nanaman naapply ung taglish voice... lagi nalang
 * sumasablay, nakakalimot parang may amnesia kayo. Bat ganun need nalang lagi
 * icall out."
 *
 * He is right, and the cause was structural, not carelessness. A UserPromptSubmit
 * hook injects the voice rules when NEIL types Tagalog, so the agent's CHAT replies
 * stay in register. Nothing was checking the copy sitting inside funnel.config.ts —
 * it was written early, in a heavier register, and every later edit inherited that
 * voice because nobody re-read the spec.
 *
 * So the fix is the same one the repo already applies to visuals: don't rely on
 * remembering, make it a gate. brand-check does it for DESIGN.md; this does it for
 * .claude/skills/_shared/taglish-voice.md. Wired as `prebuild`, so bad copy cannot
 * reach a deploy.
 *
 * It is deliberately DUMB — a word list, not a judge. It catches the recurring
 * offenders, and it will never catch everything. Neil's ear is still the gate.
 *
 * Run: node scripts/lint-voice.mjs   (auto-runs on `npm run build`)
 */

import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = resolve(HERE, '..', 'src');

/**
 * Each rule: the pattern, why it is wrong, and what to write instead.
 * Sources: taglish-voice.md "Reading level: grade 4" table + "Typography Rules",
 * plus the words Neil rejected on sight in the live page.
 */
const RULES = [
  // --- Neil rejected these by name, 2026-07-30 ---
  [/\bhitsura\b/i, 'masyadong malalim', 'itsura, o iwasan na lang'],
  [/\bpagkumparahan\b/i, 'masyadong malalim', 'para may makita kayo'],
  [/\bnangangasiwa\b/i, 'masyadong malalim', 'caretaker'],
  [/\bBago\b(?=[^\n]*\bPagkatapos\b)/, 'photo label, dapat English', 'Before / After'],
  [/\bPagkatapos ng\b/i, 'mabigat sa label', 'After'],

  // --- taglish-voice.md grade-4 table ---
  [/\bdatos\b/i, 'grade-4 rule', 'data'],
  [/\bbadyet\b/i, 'grade-4 rule', 'budget'],
  [/\bkalibrasyon\b/i, 'grade-4 rule', 'testing'],
  [/\bpananagutan\b/i, 'grade-4 rule', 'sagot namin'],
  [/\bpanganib\b/i, 'grade-4 rule', 'risk'],
  [/\bhumaharang\b/i, 'grade-4 rule', 'blocker'],
  [/\bnaitala\b/i, 'grade-4 rule', 'nakasulat'],
  [/\bsamakatuwid\b/i, 'grade-4 rule', 'kaya'],
  [/\bgayunpaman\b/i, 'grade-4 rule', 'pero'],
  [/\bkabuuan\b/i, 'grade-4 rule', 'lahat'],
  [/\bisinasagawa\b/i, 'grade-4 rule', 'ginagawa'],
  [/\bkatiyakan\b/i, 'grade-4 rule', 'sigurado'],

  // --- typography rules (Neil, 2026-07-20) ---
  [/—/, 'bawal ang em dash, halatang AI-written', 'period o comma'],
  [/\bn'yo\b/i, 'bawal ang apostrophe sa contraction', 'nyo'],
  [/\b'yan\b/i, 'bawal ang apostrophe sa contraction', 'yan'],
  [/\b'yun\b/i, 'bawal ang apostrophe sa contraction', 'yun'],
  [/\b'wag\b/i, 'bawal ang apostrophe sa contraction', 'wag'],
  [/hangga't/i, 'apostrophe contraction, iwasan', 'kung hindi pa'],
];

/**
 * Only user-visible strings matter. Three things are deliberately exempt:
 *  - comments, which explain the code to developers and stay English
 *  - `console.*` calls, which are dev-only warnings a visitor never sees
 *  - `src/demo/`, which is the template's stock sample config, not our copy
 */
const strip = (src) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/console\.\w+\([\s\S]*?\);/g, '');

const walk = async (dir) => {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'demo') continue;
      out.push(...(await walk(full)));
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

const files = await walk(SRC);
const hits = [];

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const code = strip(raw);
  code.split('\n').forEach((line, i) => {
    for (const [re, why, better] of RULES) {
      const m = line.match(re);
      if (m) hits.push({ file: relative(SRC, file), line: i + 1, word: m[0], why, better });
    }
  });
}

if (hits.length === 0) {
  console.log(`voice ok — ${files.length} file, walang nahuli`);
  process.exit(0);
}

console.error(`\n✗ VOICE LINT — ${hits.length} nahuli\n`);
for (const h of hits) {
  console.error(`  src/${h.file}:${h.line}`);
  console.error(`    "${h.word}" — ${h.why}`);
  console.error(`    gamitin: ${h.better}\n`);
}
console.error('Spec: .claude/skills/_shared/taglish-voice.md\n');
process.exit(1);
