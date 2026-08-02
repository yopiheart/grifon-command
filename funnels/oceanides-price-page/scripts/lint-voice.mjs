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

  // --- 2026-08-02: nakalusot lahat ng ito sa privacy.html ---
  // Isinulat ang buong page bago nabasa ang voice spec, at HINDI SYA NA-SCAN ng
  // gate na to kasi `src/` + `.tsx` lang ang nilalakad noon. Sabi ni Neil:
  // "YAN ANG SINASABE KO NOON PA! BAKIT HINDI PARIN NAAAYOS AT LAGI NALANG
  // PAULET ULET!" Tama sya. Prose ang lesson noong 2026-08-01 at prose lang,
  // kaya walang humuli. Ang bawat salita sa ibaba ay totoong nahuli sa live
  // copy, hindi hula.
  [/\bpahintulot\b/i, 'grade-4 rule, deep', 'consent'],
  [/\bnaitatala\b/i, 'grade-4 rule, deep', 'naka-save, nakasulat'],
  [/\bnakatala\b/i, 'grade-4 rule, deep', 'naka-save, nakasulat'],
  [/\bteksto(ng)?\b/i, 'tinagalog ang salitang English na sinasabi naman sa English', 'text'],
  [/\bnaka-imbak\b/i, 'grade-4 rule, deep', 'naka-store'],
  [/\bimbakan\b/i, 'grade-4 rule, deep', 'storage'],
  [/\bpinirmahan\b/i, 'deep, at madalas hindi totoo (tinick lang, hindi pumirma)', 'tinick mo'],

  // --- "Do Not Sound Like a Translation" (taglish-voice.md) ---
  // Ito ang mga tell na nakalista mismo sa spec bilang bawal. Mekanikal silang
  // mahuli, kaya wala silang dahilan na umasa pa sa pagtanda.
  [/\bang iyong\b/i, 'translated na tunog', 'yung, ang'],
  [/\bito ay\b/i, 'translated na tunog', 'ito yung, sya ay wala na'],
  [/\bupang\b/i, 'translated na tunog', 'para'],
  [/\bsa pamamagitan ng\b/i, 'translated na tunog', 'gamit ang'],
  [/\bmaaari(ng|n)?\b/i, 'translated na tunog', 'pwede'],
  [/\bnais\b/i, 'translated na tunog', 'gusto'],
  [/\bnararapat\b/i, 'deep Tagalog', 'dapat'],
  [/\bbagaman?t?\b/i, 'deep Tagalog', 'kahit'],
  [/\biminumungkahi\b/i, 'deep Tagalog', 'mas okay kung'],
  [/\bsa kabilang banda\b/i, 'deep Tagalog', 'pero'],

  // --- typography rules (Neil, 2026-07-20) ---
  [/—/, 'bawal ang em dash, halatang AI-written', 'period o comma'],
  [/\bn'yo\b/i, 'bawal ang apostrophe sa contraction', 'nyo'],
  [/\b'yan\b/i, 'bawal ang apostrophe sa contraction', 'yan'],
  [/\b'yun\b/i, 'bawal ang apostrophe sa contraction', 'yun'],
  [/\b'wag\b/i, 'bawal ang apostrophe sa contraction', 'wag'],
  [/hangga't/i, 'apostrophe contraction, iwasan', 'kung hindi pa'],
];

/**
 * Only user-visible strings matter. Four things are deliberately exempt:
 *  - JS/TS comments, which explain the code to developers and stay English
 *  - HTML comments, same reason (added 2026-08-02 with .html scanning)
 *  - `console.*` calls, which are dev-only warnings a visitor never sees
 *  - `src/demo/`, which is the template's stock sample config, not our copy
 *
 * `<style>` blocks are left in: CSS carries no prose, so stripping them would
 * only add a way for the stripper itself to be wrong.
 */
const strip = (src) =>
  src
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/console\.\w+\([\s\S]*?\);/g, '');

const SCANNABLE = /\.(tsx?|html)$/;

const walk = async (dir) => {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'demo') continue;
      out.push(...(await walk(full)));
    } else if (SCANNABLE.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
};

// 🔴 ANG SAKOP ANG NAGING BUTAS, HINDI ANG WORD LIST (2026-08-02).
// `src/` + `.tsx` lang ang nilalakad nito noon. Ang buong Privacy Policy ay
// nakaupo sa `public/privacy.html` — copy na nakikita ng customer, sa isang
// direktoryo at file type na hindi kayang basahin ng gate. Pumasa ang lint
// habang puno ng deep Tagalog ang page.
//
// Ang aral: ang gate na may bulag na sulok ay mas masama kaysa sa walang gate,
// kasi nagbibigay sya ng "voice ok" na tunog ng pruweba. Kapag may bagong lugar
// na tinitirhan ng customer-facing na copy, DITO SYA IDAGDAG sa parehong commit.
const ROOT = resolve(HERE, '..');
const PUBLIC = join(ROOT, 'public');
const ROOT_HTML = ['index.html', 'thank-you.html'].map((f) => join(ROOT, f));

const files = [...(await walk(SRC)), ...(await walk(PUBLIC)), ...ROOT_HTML];
const hits = [];

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const code = strip(raw);
  code.split('\n').forEach((line, i) => {
    for (const [re, why, better] of RULES) {
      const m = line.match(re);
      // Relative sa ROOT, hindi sa SRC: mula nang ma-scan ang public/ at ang root
      // HTML, ang SRC-relative na path ay lumalabas na `src/..\public\privacy.html`.
      if (m) hits.push({ file: relative(ROOT, file), line: i + 1, word: m[0], why, better });
    }
  });
}

if (hits.length === 0) {
  console.log(`voice ok — ${files.length} file, walang nahuli`);
  process.exit(0);
}

console.error(`\n✗ VOICE LINT — ${hits.length} nahuli\n`);
for (const h of hits) {
  console.error(`  ${h.file}:${h.line}`);
  console.error(`    "${h.word}" — ${h.why}`);
  console.error(`    gamitin: ${h.better}\n`);
}
console.error('Spec: .claude/skills/_shared/taglish-voice.md\n');
process.exit(1);
