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
  linesPerRollMax: 1,       // SKILL.md PACING Fix 2 — BINAWI ni Neil 2026-07-27
};

// Ang English na TINATANGGAP sa Taglish na script: brand, numero, hiram na verb,
// at ang mga noun na TOTOONG sinasabi ng Pinoy sa English. Kapag wala ang salita
// dito at hindi sya Tagalog, English pa rin syang binibilang — kaya kapag mababa
// ang ratio, ang lunas ay hindi mag-Inglis, ang lunas ay ibalik ang mga NOUN na
// talagang binibigkas (septic tank, truck, receipt), hindi ang connector.
const EN = new Set(`septic tank truck page schedule receipt warranty form
booking online message text call load hose service company office business
plunger phone quote toilet manhole cover tubo-english discount promo
oceanides sec bir denr meta facebook messenger grifon
ok okay sorry thanks free live update check confirm book save`.split(/\s+/));
// ⚠️ Sadyang WALA ang `price` dito. Sinasabi ng Pinoy ang `presyo`, at ang
// panukalang palitan yun ng `price` ay isang totoong pagkakamali noong
// 2026-08-02 (taglish-voice.md): sinira sana nito ang linyang walang sira.
// Ang lexicon na to ay listahan ng SINASABI, hindi ng pwedeng i-Ingles.

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
  // ⚠️ ASIMETRIKO SYA, SINASADYA (naitama 2026-08-03 pagkatapos ng unang takbo).
  // Ang ACCENT LOCK ay isang TEKNIKAL na panganib sa ISANG direksyon lang:
  // binabasa ni Veo ang accent sa DOMINANTENG wika, kaya ang sobrang TAAS na
  // English ay nagbibigay ng American accent — sira ang clip, bayad ang roll.
  // Ang sobrang BABA ay hindi nagsisira ng accent, mas Filipino pa nga.
  // Panlasa sya (nawawala ang mga noun na totoong binibigkas), kaya WARNING.
  // Ang purong-Tagalog na linya ay hindi awtomatikong mali — ang KM-003 hook
  // ang pinakamalakas na linyang pag-aari natin (taglish-voice.md rule 6).
  if (ratio < RULES.englishRatioMin) {
    W(`English ratio ${pct}% — mababa (target ~30%, ACCENT LOCK 70/30). Hindi to accent risk, ` +
      `naturalness risk: tingnan kung may NOUN kang tinagalog na sinasabi naman sa English ` +
      `(septic tank, truck, receipt, schedule, plunger). Kung wala, pwede syang dumaan.`);
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

  // --- ISANG LINYA KADA ROLL -------------------------------------------------
  // 🔴 ANG BUTAS NA NAGPALUSOT SA GB-001 v2 (2026-08-03). Binibilang ng gate na
  // to ang salita kada LINYA, pero hindi nya binibilang ang linya kada CLIP.
  // Kaya nakalusot ang pagsaksak ng DALAWANG linya sa bawat 8s na roll — ang
  // eksaktong bagay na BINAWI ni Neil noong 2026-07-27 (SKILL.md PACING Fix 2):
  //
  //   "ang pagdikit ng 2 formula-lines ay nag-solve nga ng Veo stretching, pero
  //    PINUTOL NITO SA KALAHATI ANG CUT RATE — 4 na mahabang single-angle na
  //    eksena imbes na ~8. Ito ang eksaktong dahilan kung bakit mas engaging ang
  //    one-shot kaysa KM-003. KAPALIT: ~$6-8 kada ad imbes na $4."
  //
  // Ang mas mura ay hindi ang mas tama. Alam na yun ni Neil at binayaran na nya
  // ang desisyon. Dito na sya nakabantay, hindi na sa alaala ng agent.
  const spoken = /^(hook|line\s*\d+)/i;
  const rollOf = (r) => (String(r ?? '').match(/\d+/) || [null])[0];
  if (!Array.isArray(spec.beatMap) || !spec.beatMap.length) {
    W('walang beatMap sa spec — hindi ko masuri ang isang-linya-kada-roll. Idagdag: [{beat,plate,roll,says}]');
  } else {
    const perRoll = new Map();
    for (const b of spec.beatMap) {
      if (!spoken.test(String(b.says || '').trim())) continue;
      const r = rollOf(b.roll);
      if (!r) continue;
      if (!perRoll.has(r)) perRoll.set(r, []);
      perRoll.get(r).push(String(b.says).trim());
    }
    let bad = 0;
    for (const [r, says] of perRoll) {
      if (says.length > RULES.linesPerRollMax) {
        bad++;
        F(`roll ${r} ay nagsasalita ng ${says.length} linya (${says.join(' + ')}) sa isang 8s na clip. ` +
          `Max ${RULES.linesPerRollMax}. BINAWI ni Neil ang pagdikit ng linya noong 2026-07-27 — pinuputol nito ` +
          `sa kalahati ang cut rate at nagiging tuloy-tuloy na 8 segundong pagsasalita ang eksena. ` +
          `Ang tama ay isang linya kada roll, mas maraming maikling eksena, ~$6-8 kada ad. Aprubado na nya ang halagang yun.`);
      }
    }
    if (!bad) P(`isang linya kada roll (${perRoll.size} roll)`);
  }

  // --- budget ceiling para sa hook ---
  // Ito ang binibilang ng veo-render-gate.sh. Kapag walang bilang, walang
  // hangganan — at 10 tawag ang nangyari noong 2 lang ang inaprubahan (2026-08-03).
  if (typeof spec.maxPaidRolls !== 'number' || spec.maxPaidRolls < 1) {
    F('walang `maxPaidRolls` (bilang) sa spec. Ito ang kisame na ipinapatupad ng veo-render-gate.sh. ' +
      'Walang bilang = walang hangganan, at 10 tawag ang nangyari noong 2 lang ang inaprubahan.');
  } else P(`maxPaidRolls = ${spec.maxPaidRolls}`);

  // --- b-roll ay dapat may motion lane ---
  // Neil, 2026-08-03: "pag broll KLING ang gagamitin para pagalawin, hindi VEO."
  // At ang mas matandang puna sa KM-003: "hindi gumagalaw ung b-roll, picture lang."
  for (const b of spec.broll || []) {
    if (!b.motion) F(`b-roll ${b.id} ay walang \`motion\` lane. Ang static na b-roll ang puna ni Neil sa KM-003 ("picture lang"). Ilagay: "Kling".`);
    else if (!/kling/i.test(b.motion)) F(`b-roll ${b.id} ay naka-motion sa "${b.motion}". Kling ang pampagalaw ng b-roll (Neil, 2026-08-03) — Veo ay para sa talking LANG.`);
    else P(`b-roll ${b.id} motion = ${b.motion}`);
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

  // --- STS: totoong boses ni Marvin ------------------------------------------
  // 🔴 IDINAGDAG 2026-08-04, matapos maipasa ang KM-004 sa BAWAT gate na may
  // maling boses. Ang hilaw na Veo clip ay may SARILING synthetic na boses. Ang
  // STS pass ang nagpapalit nun ng clone ni Marvin, at nasa division-of-labor
  // table ng skill sya mula pa noong KM-002 — pero PROSA lang sya, at hindi
  // nakabantay ang prosa. Hindi natakbo ang hakbang, walang humuli, at ang
  // lumabas ay ad na naghahalinhinan ang DALAWANG boses: Veo sa limang talking
  // beat, si Marvin sa apat na VO-over-still. Tainga ni Neil ang nakahuli, isang
  // oras bago mag-upload.
  //
  // Bakit hindi sya kayang hulihin ng ibang check: perpekto ang lahat ng
  // sinusukat nila. Tama ang haba, tama ang caption sync, tama ang crop, walang
  // dead air. Ang boses ay hindi geometry — kaya walang nakakita.
  //
  // Ang hinahanap nito ay ang PINAGMULAN, hindi ang tunog: kapag may talking
  // beat na kumukuha sa hilaw na `clips/`, kailangang may STS sa daan.
  // ⚠️ TINATANGGAL ANG KOMENTO BAGO MAG-TEST. Ang unang bersyon ng check na to ay
  // pumasa sa mismong build na hinahanap nya, dahil ang paliwanag ko sa itaas ng
  // `C=` ay may nakasulat na `clips/sts` — ang komento mismo ang nagpasa. Ang
  // gate na kayang pasahan ng sarili nyang dokumentasyon ay hindi gate.
  const shCode = sh.replace(/^[ \t]*#.*$/gm, '');
  const usesTalkingClips = /\b(talking|splice|cropped)\s+"\$C\//.test(shCode);
  const hasSts = /clips\/sts|audio-post\.mjs\s+sts|\bsts\s+--in/.test(shCode);
  if (usesTalkingClips && !hasSts)
    F('may talking clip pero WALANG STS sa daan. Boses ni Veo ang lalabas, hindi si Marvin. Ito mismo ang nakalusot sa KM-004 hanggang sa tainga ni Neil. Ayos:\n     for f in r1 r2 r3 r4 r5; do node clients/oceanides/kuya-marvin/test-rigs/audio-post.mjs sts --in <ad>/clips/$f.mp4 --out <ad>/clips/sts/$f.mp4 --stability natural; done\n     tapos ituro ang C= sa clips/sts');
  else if (usesTalkingClips) P('dumaan sa STS ang talking clips');

  if (!/flash|whoosh|sfx|SFX/i.test(sh)) F('walang transition SFX o flash. Aral #7: flash pagkatapos ng hook at kada pangalawang cut, max 3.');
  else P('may transition SFX');

  const vol = sh.match(/volume=([0-9.]+)/);
  if (vol && +vol[1] < 0.18) F(`music sa volume=${vol[1]} — hindi na sya marinig. Ito ang "nawawala ang background music" ni Neil. Gamitin ang >=0.18.`);
  else if (vol) P(`music volume=${vol[1]}`);

  if (!/captions?|build-captions/i.test(sh)) F('walang caption sa build. P1, 11 corroborations, `applied`: ANG PACE AY CAPTION CHURN, hindi cut rate. Ito ang pinakamalakas na lever at libre sya.');
  else P('may caption step');

  // --- HTML / Hyperframes ----------------------------------------------------
  // Neil, 2026-08-03: "ang nagpaganda pa sa KM003 meron tong html/hyperframes na
  // ginamit bilang b-roll o call to action sa huli na may numero/animations sa
  // text." Ang GB-001 v1 ay purong drawtext band — yun ang bumaba.
  if (!/\.mov|overlays?\//i.test(sh)) F('walang HTML overlay (transparent MOV) sa build. Ang hook overlay ay HTML/Hyperframes, hindi drawtext band — yan ang nagpaganda sa KM-003.');
  else P('may HTML overlay step');
  if (!/end[-_]?card/i.test(sh)) F('walang end card sa build. Ang CTA sa dulo ay HTML card na may animation, hindi drawtext (KM-003).');
  else P('may end card');

  // --- galaw kada beat -------------------------------------------------------
  // SINUKAT 2026-08-03: ang push-in ni Veo ay ~15% sa 8s, ~7% na lang matapos ang
  // speech-cut — nasa ilalim ng makikita. Kaya ang zoom ay dito na ginagawa,
  // kung saan tayo ang may hawak ng lakas (MOTION DOCTRINE, 2026-07-27).
  if (!/zoompan|scale=.*iw\*|crop=.*t\/|setpts.*zoom/i.test(sh) && !/PUNCH|ZOOM/i.test(sh))
    F('walang zoom o punch-in sa edit. Halos hindi nakikita ang sariling galaw ni Veo (~7% matapos ang cut). Kung walang galaw ang eksena, patay sya — MrBeast rule, at hiling mismo ni Neil 2026-08-03.');
  else P('may edit-side na galaw');
}

function checkVideo(videoPath) {
  const ff = (a) => execFileSync('ffprobe', a, { encoding: 'utf8' }).trim();
  const dur = +ff(['-v','error','-show_entries','format=duration','-of','csv=p=0', videoPath]);
  const dim = ff(['-v','error','-select_streams','v','-show_entries','stream=width,height','-of','csv=p=0', videoPath]);
  // Ang layunin ng check na to ay: 9:16, full-bleed, walang letterbox at walang
  // maling aspect. 1080x1920 lang ang alam nya noong isinulat sya, kasi 1080
  // lahat ng pinagmulan noon.
  //
  // 🔴 PINALUWAG PARA SA 720x1280 (2026-08-03, KM-004). HINDI ito exception para
  // sa isang ad — pagwawasto ito ng constant. Dalawa sa limang clip ng KM-004 ay
  // native na 720 mula sa Flow (ang 1080p ay nasa likod ng Pro/Plus, at ubos na
  // ang API budget), at NAPATUNAYAN naming hindi kayang mag-upscale ng ffmpeg:
  // resampling lang ang lanczos, at sa 1:1 na paghahambing ay naglusaw ang
  // balbas at nagsanib ang buhok sa kilay. Ang pag-akyat sa 1080 ay magdadagdag
  // ng smearing na wala doon. Ang pagbaba naman ay hindi nakakasira.
  //
  // Parehong 9:16 sila at parehong nasa itaas ng minimum ng Meta (500px na
  // lapad). Ang intensyon ng gate ay nasusunod pa rin. Ang mga geometry constant
  // ng bawat ad ay ini-scale sa canvas nito, hindi hardcoded dito.
  const OK_DIMS = ['1080,1920', '720,1280'];
  if (!OK_DIMS.includes(dim)) F(`dimensions ${dim}, dapat isa sa: ${OK_DIMS.join(' o ')} (9:16, full-bleed)`);
  else P(`${dim.replace(',', 'x')}`);
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
