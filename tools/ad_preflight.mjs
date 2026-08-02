#!/usr/bin/env node
// ad_preflight — ang gate na dapat nandito noong 2026-08-03.
//
// BAKIT SYA UMIIRAL
// Ang GB-001-AD-v1 ay pumasa sa mata ko at bumagsak sa mata ni Neil sa apat na
// bagay na LAHAT ay nakasulat na sa repo bago pa magsimula:
//   1. 14-salitang hook sa dalawang pangungusap (tuned rule: 5-8, ISANG linya)
//   2. 20 at 21 salita kada body line (tuned rule: 7-12)
//   3. hook overlay sa y=150 — naputol nang malinis sa 4:5 feed crop
//   4. walang caption, walang SFX, music sa 0.10 (halos hindi marinig)
// Wala sa apat ang bagong aral. Lahat sila nasa `api/_lib/prompts.ts`, sa
// `.claude/skills/kuya-marvin-ads/SKILL.md`, at sa KM-003 production record.
// Ang pagkabigo ay hindi kaalaman, PROSESO — hindi binuksan ang skill bago
// gumalaw. Ang prosa ay hindi nakabantay. Ang script, oo.
//
// CLAUDE.md: "prefer encoding the lesson as a verifier over prose."
//
// Usage:
//   node tools/ad_preflight.mjs --script <spec.json>            # BAGO ang plates
//   node tools/ad_preflight.mjs --build <build-cut.sh> --video <out.mp4>   # BAGO sabihing tapos
//
// Exit: 0 = pasado, 1 = may BAGSAK, 2 = usage error.

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };

// ---------------------------------------------------------------------------
// TUNED CONSTANTS — hinila sa pinagmulan, hindi sa memorya. Kapag nagbago ang
// pinagmulan, ito rin. Ang bawat isa ay may sariling file at linya.
// ---------------------------------------------------------------------------
const RULES = {
  hookWordsMax: 8,          // api/_lib/prompts.ts — "5-8 words TOTAL on ONE line"
  hookWordsMin: 5,
  hookSentencesMax: 1,      // "never split into multiple sentences or stacked clauses"
  bodyWordsMin: 7,          // "Strictly 7-12 words per body line (Sabri Suby Slide)"
  bodyWordsMax: 12,
  englishRatioMin: 0.15,    // ACCENT LOCK ~70/30 Tagalog-English. 0.15 ang sahig,
  englishRatioMax: 0.45,    //   0.45 ang kisame (lampas nun = American accent)
  openingEnglishMax: 2,     // OPENING ACCENT TRIGGER: max 2 sunod na English sa umpisa
  feedSafeTop: 285,         // SKILL.md — 1080x1920 -> 1080x1350 sa feed
  feedSafeBottom: 1635,
  presets: ['classic','impact','hype','clean','none','punch','bars','spotlight'],
  presetDefault: 'spotlight', // KM-004 pataas, approved ni Neil 2026-07-27
  musicFloorDb: -30,        // mas tahimik dito = wala talagang naririnig
};

// Ang English na TINATANGGAP sa Taglish na script: brand, numero, hiram na verb,
// at ang mga noun na TOTOONG sinasabi ng Pinoy sa English. Kapag wala ang salita
// dito at hindi sya Tagalog, English pa rin syang binibilang — kaya kapag mababa
// ang ratio, ang lunas ay hindi mag-Inglis, ang lunas ay ibalik ang mga NOUN na
// talagang binibigkas (septic tank, truck, receipt), hindi ang connector.
const EN = new Set(`septic tank truck page schedule receipt warranty form price
booking online message text call load hose service company office business
oceanides sec bir denr meta facebook messenger grifon
ok okay sorry thanks free live update check confirm book save`.split(/\s+/));

const fail = [];
const warn = [];
const pass = [];
const F = (m) => fail.push(m);
const W = (m) => warn.push(m);
const P = (m) => pass.push(m);

const words = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(Boolean);
const sentences = (s) => s.split(/[.!?]+/).map((x) => x.trim()).filter(Boolean);
const isEnglish = (w) => EN.has(w) || /^\d+$/.test(w);

// ===========================================================================
// MODE 1 — SCRIPT (bago ang plates, bago ang unang piso)
// ===========================================================================
function checkScript(specPath) {
  const spec = JSON.parse(readFileSync(specPath, 'utf8'));

  // --- preset ---
  if (!spec.preset) F(`walang preset. Itanong kay Neil BAGO magsimula (SKILL.md). Default ng KM-004 pataas: ${RULES.presetDefault}`);
  else if (!RULES.presets.includes(spec.preset)) F(`hindi kilalang preset "${spec.preset}". Pumili sa: ${RULES.presets.join(', ')}`);
  else P(`preset = ${spec.preset}`);

  // --- hook ---
  if (!spec.hook) F('walang hook sa spec');
  else {
    const w = words(spec.hook), s = sentences(spec.hook);
    if (w.length > RULES.hookWordsMax) F(`hook = ${w.length} salita, max ${RULES.hookWordsMax}. Ito mismo ang bumagsak sa GB-001 v1 (14 salita).`);
    else if (w.length < RULES.hookWordsMin) W(`hook = ${w.length} salita, target ${RULES.hookWordsMin}-${RULES.hookWordsMax}`);
    else P(`hook = ${w.length} salita`);
    if (s.length > RULES.hookSentencesMax) F(`hook = ${s.length} pangungusap. Dapat ISA lang, hindi hinahati (tuned rule).`);
  }

  // --- body lines ---
  (spec.lines || []).forEach((line, i) => {
    const w = words(line);
    if (w.length > RULES.bodyWordsMax) F(`line ${i + 1} = ${w.length} salita, max ${RULES.bodyWordsMax}. Hatiin sa dalawang linya.`);
    else if (w.length < RULES.bodyWordsMin) W(`line ${i + 1} = ${w.length} salita, min ${RULES.bodyWordsMin} (pwede bumaba, hindi tumaas)`);
    else P(`line ${i + 1} = ${w.length} salita`);
  });

  // --- accent lock ---
  const all = [spec.hook, ...(spec.lines || [])].filter(Boolean).join(' ');
  const aw = words(all);
  const en = aw.filter(isEnglish).length;
  const ratio = aw.length ? en / aw.length : 0;
  const pct = (ratio * 100).toFixed(0);
  if (ratio < RULES.englishRatioMin) {
    F(`English ratio ${pct}% — masyadong mababa (sahig ${RULES.englishRatioMin * 100}%). ` +
      `HINDI ibig sabihin nito na mag-Inglis ka ng connector. Ibalik ang mga NOUN na ` +
      `totoong binibigkas ng Pinoy: septic tank, truck, receipt, schedule.`);
  } else if (ratio > RULES.englishRatioMax) {
    F(`English ratio ${pct}% — masyadong mataas (kisame ${RULES.englishRatioMax * 100}%). Babasahin ng Veo bilang American accent.`);
  } else P(`English ratio ${pct}%`);

  // --- opening accent trigger ---
  if (spec.hook) {
    const hw = words(spec.hook);
    let lead = 0;
    while (lead < hw.length && isEnglish(hw[lead])) lead++;
    if (lead > RULES.openingEnglishMax) F(`${lead} sunod na English sa umpisa ng hook. Nila-lock nito ang American accent sa BUONG read (A/B verified 2026-06-13). Max ${RULES.openingEnglishMax}.`);
    else P(`opening accent trigger ok (${lead} English sa umpisa)`);
  }

  // --- isang jobsite ---
  const locs = [...new Set((spec.plates || []).map((p) => p.location).filter(Boolean))];
  if (locs.length > 1) F(`${locs.length} magkaibang lugar sa mga plate (${locs.join(', ')}). Isang jobsite lang, iba-ibang ANGGULO — kung hindi, mukhang magkaibang shoot na pinagdikit. Ito ang "parang dalawang body" ni Neil sa GB-001 v1.`);
  else if (locs.length === 1) P(`isang lugar: ${locs[0]}`);
  else W('walang location sa mga plate — hindi ko masuri ang isang-jobsite na tuntunin');
}

// ===========================================================================
// MODE 2 — VIDEO + BUILD SCRIPT (bago sabihing tapos)
// ===========================================================================
function checkBuild(buildPath) {
  const sh = readFileSync(buildPath, 'utf8');

  // feed-safe: hinuhugot ang totoong drawtext y at fontsize sa build script mismo,
  // kaya hindi sya umaasa sa pagtanda ko kung saan ko inilagay ang teksto.
  const calls = [...sh.matchAll(/band\s+"[^"]+"\s+"[^"]+"\s+"([\s\S]*?)"\s+(\d+)(?:\s+(\d+))?/g)];
  if (!calls.length) W('walang nakitang band() call sa build script — laktaw ang feed-safe check');
  for (const [, text, yS, sizeS] of calls) {
    const y = +yS, size = +(sizeS || 62);
    const lines = text.split('\n').length;
    const top = y - 28;                       // boxborderw
    const bottom = y + lines * size + (lines - 1) * 12 + 28;
    const label = text.split('\n')[0].slice(0, 24);
    if (top < RULES.feedSafeTop) F(`overlay "${label}" ay nagsisimula sa y=${top} — nasa LABAS ng feed-safe (${RULES.feedSafeTop}). Puputulin sya ng 4:5 feed crop. Eksaktong bug ng KM-003 v1 AT ng GB-001 v1.`);
    else if (bottom > RULES.feedSafeBottom) F(`overlay "${label}" ay nagtatapos sa y=${bottom} — lampas sa feed-safe (${RULES.feedSafeBottom}).`);
    else P(`overlay "${label}" nasa loob ng feed-safe (${top}-${bottom})`);
  }

  if (!/flash|whoosh|sfx|SFX/i.test(sh)) F('walang transition SFX o flash. Aral #7: flash pagkatapos ng hook at kada pangalawang cut, max 3.');
  else P('may transition SFX');

  const vol = sh.match(/volume=([0-9.]+)/);
  if (vol && +vol[1] < 0.18) F(`music sa volume=${vol[1]} — hindi na sya marinig. Ito ang "nawawala ang background music" ni Neil. Gamitin ang >=0.18.`);
  else if (vol) P(`music volume=${vol[1]}`);

  if (!/captions?|build-captions/i.test(sh)) F('walang caption sa build. P1, 11 corroborations, `applied`: ANG PACE AY CAPTION CHURN, hindi cut rate. Ito ang pinakamalakas na lever at libre sya.');
  else P('may caption step');
}

function checkVideo(videoPath) {
  const ff = (a) => execFileSync('ffprobe', a, { encoding: 'utf8' }).trim();
  const dur = +ff(['-v','error','-show_entries','format=duration','-of','csv=p=0', videoPath]);
  const dim = ff(['-v','error','-select_streams','v','-show_entries','stream=width,height','-of','csv=p=0', videoPath]);
  if (dim !== '1080,1920') F(`dimensions ${dim}, dapat 1080,1920`);
  else P('1080x1920');
  if (dur > 22) W(`${dur.toFixed(1)}s — target 15-20s (8.0% lang ang umabot sa dulo ng 36.8s ng KM-003)`);
  else P(`${dur.toFixed(1)}s`);

  const auditJson = `.tmp/render-audit/${videoPath.split(/[\\/]/).pop().replace(/\.mp4$/, '')}.audit.json`;
  if (!existsSync(auditJson)) F(`hindi pa napapatakbo ang render_audit.mjs. Sya lang ang NAKIKINIG — huwag sabihing tapos nang wala sya:\n     node tools/render_audit.mjs ${videoPath}`);
  else P('napatakbo ang render_audit.mjs');
}

// ===========================================================================
const scriptSpec = arg('--script');
const build = arg('--build');
const video = arg('--video');
if (!scriptSpec && !build && !video) {
  console.error('Usage:\n  --script <spec.json>            (bago ang plates)\n  --build <build-cut.sh> --video <out.mp4>   (bago sabihing tapos)');
  process.exit(2);
}
if (scriptSpec) checkScript(scriptSpec);
if (build) checkBuild(build);
if (video) checkVideo(video);

for (const m of pass) console.log(`  PASS  ${m}`);
for (const m of warn) console.log(`  warn  ${m}`);
for (const m of fail) console.log(`  FAIL  ${m}`);
console.log();
if (fail.length) {
  console.log(`${fail.length} BAGSAK. Ayusin bago magpatuloy — walang exception list dito, ang AD ang ayusin.`);
  process.exit(1);
}
console.log(`Pasado lahat${warn.length ? ` (${warn.length} warning)` : ''}.`);
