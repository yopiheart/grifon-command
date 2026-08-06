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

  // --- 2026-08-02, PANGALAWANG PASS: tinawag mismo ni Neil ang mga ito ---
  // "detalye, Rehistrado, awtomatikong, naka-imbak etc - MGA WORDS NA PANSIN
  // KONG SOBRANG LALIM BILANG FILIPINO! ... NAHAHALATA KANG AI!"
  //
  // Iisa ang hugis ng lahat ng ito: may **English na salitang sinasabi naman ng
  // Pinoy araw-araw**, pero hinanap pa ang katumbas sa Tagalog. Yun mismo ang
  // ipinagbabawal ng grade-4 rule sa taglish-voice.md ("Kapag may English na
  // salita na karaniwang sinasabi ng Pinoy, IYON ang gamitin"). Ang resulta ay
  // hindi mas magalang, mukha syang gawa ng makina.
  [/\bdetalye\b/i, 'sobrang lalim, may English na sinasabi naman ng tao', 'info, details'],
  [/\brehistrado\b/i, 'sobrang lalim, at hindi tugma sa "SEC Registered" sa page', 'registered'],
  [/\bawtomatik(o|ong|a)?\b/i, 'tinagalog ang salitang sinasabi naman sa English', 'automatic'],
  [/\bkusang?\b/i, 'sobrang lalim para sa "automatic"', 'automatic'],
  [/\bnaserbisyuhan\b/i, 'sobrang lalim', 'na-service'],
  [/\bserbisyo\b/i, 'mas natural ang English dito', 'service'],
  [/\bopisyal\b/i, 'tinagalog ang salitang sinasabi naman sa English', 'official'],
  [/\bipatama\b/i, 'hindi sinasabi ng tao', 'i-correct'],
  [/\btanging\b/i, 'formal na tunog', 'lang'],

  // --- 2026-08-02, PANGATLONG PASS: nahuli ng long-word scan pagkatapos maisulat
  // ang LANGUAGE LOCK. Iisa ang hugis: mahabang passive/potential na anyo na
  // walang taong bumibigkas. Ito ang mga natira matapos ang unang dalawang pass,
  // kaya patunay silang hindi sapat ang pag-eyeball.
  [/\bkumpirmahin\b/i, 'manual-Tagalog', 'i-confirm'],
  [/\bnapagkakasunduan\b/i, 'manual-Tagalog, 7 pantig', 'nagkakasundo'],
  [/\bmapaparadahan\b/i, 'manual-Tagalog, 6 pantig', 'pwedeng paradahan'],
  [/\bmagdedesisyon\b/i, 'manual-Tagalog', 'ikaw ang bahala, sa yo ang desisyon'],

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

  // --- 2026-08-06: KLASE, HINDI SALITA. Ito ang pinakamahalagang block dito. ---
  // Nahuli ni Neil ang `Labinlimang araw` at ang `dokumentasyon` sa card at sa
  // page: "Bilang Filipino di kame gumagamit ng ganyang tagalog word sa
  // pakikipag usap o pag susulat sobrang dalang... Bakit ganun di parin
  // nawawala ang mga slop words."
  //
  // Ang sagot ay nasa hugis mismo ng file na ito. Blacklist sya, at bawat entry
  // sa itaas ay idinagdag PAGKATAPOS mahuli sa live copy. Pero bago ang slop
  // kada beses — ibang malalim na salita ang lumalabas, kaya sa disenyo pa lang,
  // laging huli ng isang insidente ang blacklist. Kaya klase ang tatlo sa ibaba,
  // hindi salita: humuhuli sila ng mga salitang hindi pa naisusulat kahit kanino.
  //
  // Pansinin: MAY RULE NA PALA para sa `Labinlimang`. Carve-out (b) ng LANGUAGE
  // LOCK: "presyo at numero" ay English. Walang naghuhuli, kaya nakalusot.

  // (0) 🔴 BUONG PARIRALA ANG ENGLISH, HINDI LANG ANG NUMERO. Unang pass ko:
  //     `Labinlimang araw` -> `15 araw`. Sagot ni Neil: "15 araw? wtf ayan
  //     nanaman. SLOP nanamn ai words yan. 15 days!!!!!!!" Tama sya. Kalahati
  //     lang pala ang inayos ko — baybay ang pinalitan, iniwan ang unit.
  //     Sa timeline, English ang buong sukat: 15 days, 48 hours, 3 months.
  //     74 hit ang naabot nito sa page, sa copy doc at sa cards.
  //     ⚠️ Wala pang hatol sa `taon` — hindi pa sya tinawag ni Neil, kaya
  //     nakasama sya dito sa parehong hugis. Sabihin nya kung mali.
  [/\b\d+\s+araw\b/i, 'sa timeline, English ang buong sukat', '15 days'],
  [/\b\d+\s+oras\b/i, 'sa timeline, English ang buong sukat', '48 hours'],
  [/\b\d+\s+linggo\b/i, 'sa timeline, English ang buong sukat', '2 weeks'],
  [/\b\d+\s+buwan\b/i, 'sa timeline, English ang buong sukat', '3 months'],
  [/\b\d+\s+taon\b/i, 'sa timeline, English ang buong sukat', '1 year'],

  // (1) Baybay na numero mula 11 pataas. Sinasabi ng Pinoy ang isa hanggang
  //     sampu, pero walang taong nagsasabing "labinlimang araw" — 15 days yun.
  //     Sinasadyang hindi kasama ang isa-sampu, natural sila.
  [/\blabin[dgt]?\w*\b/i, 'baybay na numero, bawal sa carve-out (b): numero = English', '15, 12, 18'],
  [/\b(dalawampu|tatlumpu|apatnapu|limampu|animnapu|pitumpu|walumpu|siyamnapu)\w*/i,
    'baybay na numero, bawal sa carve-out (b)', '20, 30, 45'],
  [/\b(sandaan|isandaan|sanlibo|isanlibo)\b/i, 'baybay na numero', '100, 1,000'],

  // (2) Abstract na `-syon` noun. Hindi lahat ng -syon ay mali (sitwasyon,
  //     operasyon, sinasabi yun) — ang mali ay ang mahaba at corporate.
  [/\b\w*(dokumenta|rekomenda|kalibra|aplika|administra|verifika|notifika|konfigura|awtoriza|implementa|integra|dokumenta)syon\w*\b/i,
    'corporate na -syon noun, halatang AI', 'papel, mungkahi, testing, form'],

  // (3) Hiwalay na `sa yo`. Kapamilya sya ng nyo/yun/yan/wag sa ibaba —
  //     nakasulat na ang rule, ang anyo lang na ito ang wala sa listahan.
  [/\bsa yo\b/i, 'dapat magkadikit', 'sayo'],
  [/\bsa iyo\b/i, 'formal na anyo', 'sayo'],

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
