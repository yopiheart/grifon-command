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
 * TWO TIERS (2026-08-07)
 *   ERRORS   — the word blacklist below. Exact, proven, fails the build.
 *   WARNINGS — CLASS rules derived from workflows/taglish_2026_model.md. They
 *              catch shapes rather than words, so they can catch a line nobody
 *              has written yet. They PRINT but do not fail, because a noisy gate
 *              stops being read (same reader failure as loops.md Tier 0b).
 *              Promote one to ERROR only after it has fired correctly on real copy.
 *
 * ⚠ CANONICAL FILE — this must stay byte-identical across every funnel.
 * Enforced by tools/check-voice-lint-sync.mjs in root CI. It is COPIED, not
 * imported, because funnels deploy via `npx vercel deploy` from inside their own
 * directory: nothing above the funnel root is uploaded, so a shared module one
 * level up would break the build. Edit here, then run the sync tool.
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

/* ══════════════════════════════════════════════════════════════════════════
 * CLASS WARNINGS — hugis, hindi salita.
 * Source: workflows/taglish_2026_model.md (researched 2026-08-07, may sources).
 *
 * Bakit hiwalay sa RULES: blacklist ang RULES, at bawat entry doon ay dinagdag
 * PAGKATAPOS mahuli sa live copy — kaya laging huli ng isang insidente. Klase
 * ang tatlo dito, kaya humuhuli sila ng linyang hindi pa naisusulat ninuman.
 * Warning muna silang lahat. Tenga ni Neil pa rin ang huling gate.
 * ══════════════════════════════════════════════════════════════════════════ */

/**
 * (A) KONYO DETECTOR — ang pinaka-importante sa tatlo.
 *
 * Konyo = baligtad na Taglish: ENGLISH ang balangkas ng pangungusap, Tagalog ang
 * isinasabog sa loob. Lahat ng "Bad" na halimbawa sa taglish-voice.md ay ganito
 * ang hugis; wala lang silang pangalan noon kaya isa-isa lang nahuhuli.
 *
 * 🔴 HINDI LANG PANLASA ITO — RENDER BUG (Neil, 2026-08-07):
 * Binabasa ng Veo/TTS ang accent sa DOMINANTENG wika ng linya (ACCENT LOCK,
 * taglish-voice.md rule #7). Dahil English ang balangkas ng Konyo, English ang
 * lumalabas na dominante kahit may Tagalog na nakasabog — kaya pwedeng
 * mag-AMERICAN ACCENT ang Filipino avatar. Kaya sa spoken surface, ang Konyo ay
 * hindi lang maarte, sira sya.
 */
const KONYO = [
  [/\bmas (better|nicer|faster|bigger|smaller|cheaper|stronger|clearer|easier|worse|safer|more)\b/i,
    'dobleng comparative, klasikong Konyo ("mas okay" ay TAMA, "mas better" ay mali)',
    'mas maganda, mas mabilis, mas mura'],
  [/\bmake (kain|kulit|tusok|ligo|aral|tulog|inom|lakad|punta|bili)\b/i,
    'make + Tagalog root, ang pirma mismo ng Konyo',
    'gamitin ang Tagalog na verb: kumain, mag-aral'],
  [/\b(the|my|your|our|his|her|their|this|that) \w+ ay\b/i,
    'English na frame na may Tagalog na "ay" — English ang balangkas',
    'ibalik sa Tagalog ang frame'],
  [/\bang \w+ (is|are|was|were|will|has|have)\b/i,
    'nagbukas sa Tagalog, English ang kumuha ng frame',
    'ibalik sa Tagalog ang frame'],
  [/\b(is|are|was|were) (maganda|mabuti|okay|mali|tama|masaya|mabilis|mura|mahal)\b/i,
    'English copula + Tagalog adjective — walang ganito sa dalawang wika',
    'ibalik sa Tagalog ang frame'],
  [/\blike so\b/i, 'Konyo marker', 'tanggalin'],
  [/\b(kasi|pero|tapos|yung) [a-z]+ (is|are|will) [a-z]+\b/i,
    'Tagalog connector na idinikit sa buong English na clause',
    'buuin sa Tagalog ang pangungusap'],
];

/**
 * (B) KULANG SA PARTICLE.
 * Ang manual-Tagalog ay madalas HINDI maling salita — kulang sya sa particle.
 * Nawawala ang naman/lang/na/kasi kapag machine-written kasi wala silang
 * katumbas sa English, kaya tama ang grammar pero patay ang tunog.
 *   "Hindi barado ang inyong tangke."       -> patay
 *   "Hindi NAMAN barado yung tank nyo."     -> may nagsabi nyan
 * Mataas ang threshold sinadya: mahaba at malinaw na Tagalog lang ang hinuhuli.
 */
const PARTICLES = new Set(['na','pa','lang','naman','nga','pala','ba','daw','raw','po','ho',
  'muna','sana','kaya','din','rin','yata','tuloy','kasi','talaga','man','pala','eh']);

const TAGALOG_MARKERS = new Set(['ang','ng','sa','mga','yung','yun','yan','ito','ako','ka',
  'ikaw','sya','siya','kami','tayo','kayo','sila','hindi','di','wala','meron','may','at',
  'kung','para','pag','kapag','tapos','habang','kahit','basta','gusto','kailangan','pwede',
  'ko','mo','niya','nya','namin','natin','nyo','nila','ni','kay','ay','o','pero','dito','doon']);

/**
 * (C) LONG-WORD SCAN — kung paano mismo nahuli ang PANGATLONG PASS noong 08-02.
 * Bilang ng patinig ang syllable proxy; gumagana sya sa Tagalog dahil hiwalay
 * na pantig ang magkatabing patinig (na-pag-ka-ka-sun-du-an = 7).
 * Exempt ang pinaka-/nakaka-/pagka-/magka- — produktibo sila at sinasabi ng tao
 * (pinakamaganda, nakakatawa), kaya hindi sila slop.
 */
const LONG_WORD_MIN_SYLLABLES = 6;
const NATURAL_LONG_PREFIX = /^(pinaka|nakaka|nagka|magka|pagka|nakiki|makiki)/i;
// Kailangang mukhang Tagalog: may affix sa unahan o sa hulihan. Kung wala, malamang
// English compound sya (surfaceElevated, objectionReversal) at hindi natin problema.
const TAGALOG_AFFIX = /^(na|ma|pa|ka|ni|mag|nag|pag|pinag|ipina|maka|sina|ipa|ma[gk])|([aeiou](han|hin|an|in|ng))$/i;
const syllables = (w) => (w.match(/[aeiou]/gi) || []).length;

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
// 🐛 AYOS NA ANG MALING LINE NUMBER (2026-08-07). Dating basta binubura ang
// multi-line comment, kasama ang mga newline sa loob — kaya UMUUSOD PATAAS ang
// lahat ng linya sa ibaba, at mali ang line number na ini-report ng gate. Umiral
// ang bug na to sa lahat ng 64 na rule, hindi lang sa mga bago. Ngayon, blangko
// ang ipinapalit pero **buhay ang newline**, kaya eksakto na ang numero.
const blank = (m) => m.replace(/[^\n]/g, ' ');

const strip = (src) =>
  src
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/^[ \t]*\/\/.*$/gm, blank)
    .replace(/console\.\w+\([\s\S]*?\);/g, blank);

const SCANNABLE = /\.(tsx?|html)$/;

// Tolerant sa nawawalang folder: may funnel na walang `public/` (gaya ng
// `_template` mismo), at hindi yun error — nag-c-crash lang dati ang gate doon.
const walk = async (dir) => {
  const out = [];
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (e) {
    if (e.code === 'ENOENT') return out;
    throw e;
  }
  for (const entry of entries) {
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

// 🔴 2026-08-07 — HINDI NA HARDCODED ANG ROOT HTML.
// `['index.html', 'thank-you.html']` lang ang nakalista dati. Sa price-page,
// may `presyo.html` (cheat sheet nina Zam at Ejay) at `ops.html` na HINDI
// nasa-scan. Eksaktong parehong bitag ng privacy.html noong 08-02: hindi ang
// word list ang butas, ANG SAKOP. Ang pangako noon ("idagdag mo dito kapag may
// bagong lugar") ay pangako lang, at nakalimutan. Mekanismo na sya ngayon:
// awtomatikong hinahanap lahat ng .html sa root, kaya walang malilimutan.
const rootHtml = (await readdir(ROOT, { withFileTypes: true }))
  .filter((e) => e.isFile() && e.name.endsWith('.html'))
  .map((e) => join(ROOT, e.name));

// 🔴 2026-08-08 — SAKOP NG EXEMPTION, HINDI SAKOP NG WALKER.
// May legal exemption na sa loob ng PARTICLE loop sa ibaba, pero PANGUNGUSAP ang
// tinitingnan nya: kailangang nasa mismong linya ang RA / DENR / Privacy bago sya
// mag-exempt. Kaya tumatagas — ang `privacy.html:103` ("may karapatan kang malaman
// kung ano ang kinuha namin") ay purong legal, pero walang keyword, kaya nahuhuli.
// Ganun din ang numbered na how-to step sa `pack/` ("2. Sa Meta Business Suite,
// gumawa ng schedule").
//
// Ang particle test ay tanong na "parang sinasabi ba to ng tao nang malakas?" — at
// may dalawang surface na sadyang HINDI sinasalita: ang legal page at ang
// instructional pack. Ang pagdagdag ng naman/lang/kasi doon ay SIRA, hindi ayos.
//
// ⚠️ ANG PARTICLE LANG ANG NAKA-OFF DITO — hindi ito pagpapaliit ng sakop ng walker,
// at yun ang mahalagang pagkakaiba. Buhay pa rin ang RULES, ang KONYO at ang MAHABA
// sa mga page na to. Sila ang nakakahuli ng deep-Tagalog na privacy.html gaya noong
// 08-02, kaya hindi sila hinahawakan. Ang bumabasa nito bukas: wag mong idagdag ang
// MAHABA sa listahan — sya ang huling nakabantay sa manual-Tagalog sa legal page.
const FORMAL_SURFACE = /(^|[\\/])(privacy|terms)\.html$|(^|[\\/])pack[\\/]/i;

const files = [...(await walk(SRC)), ...(await walk(PUBLIC)), ...rootHtml];
const hits = [];
const warns = [];

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const code = strip(raw);
  // Isang beses kada file, hindi kada linya — pareho ang sagot sa buong file.
  const isFormalSurface = FORMAL_SURFACE.test(relative(ROOT, file));
  code.split('\n').forEach((line, i) => {
    // Relative sa ROOT, hindi sa SRC: mula nang ma-scan ang public/ at ang root
    // HTML, ang SRC-relative na path ay lumalabas na `src/..\public\privacy.html`.
    const where = { file: relative(ROOT, file), line: i + 1 };

    for (const [re, why, better] of RULES) {
      const m = line.match(re);
      if (m) hits.push({ ...where, word: m[0], why, better });
    }

    // (A) Konyo
    for (const [re, why, better] of KONYO) {
      const m = line.match(re);
      if (m) warns.push({ ...where, word: m[0], why, better, klase: 'KONYO' });
    }

    // 🔧 CALIBRATION 2026-08-07 — unang takbo = 113 babala, halos lahat basura:
    // camelCase na English identifier sa `config.types.ts` (surfaceElevated ->
    // "surfaceelevated", 7 patinig). Aral: ang linya ay hindi prose. Ang prose ay
    // nasa QUOTED STRING (.ts/.tsx) at sa TEXT SA LABAS NG TAG (.html) lang.
    // Tinatanggal muna ang attribute value (className, href) — path at token yun,
    // hindi copy.
    const noAttrs = line.replace(
      /\b(className|class|id|href|src|key|type|name|to|rel|alt|role|aria-[\w-]+|data-[\w-]+)\s*=\s*("[^"]*"|'[^']*'|\{[^}]*\})/g, ' ');
    const quoted = [...noAttrs.matchAll(/'([^']{3,})'|"([^"]{3,})"|`([^`]{3,})`/g)]
      .map((m) => m[1] || m[2] || m[3]).join(' ');
    const tagText = file.endsWith('.html') ? noAttrs.replace(/<[^>]+>/g, ' ') : '';
    const prose = `${quoted} ${tagText}`.trim();

    // camelCase/PascalCase = identifier, hindi salita ng tao. Hinuhuli sila sa
    // ORIHINAL na anyo bago mag-lowercase, kasi mawawala ang senyas pagka-lowercase.
    const rawWords = prose.match(/[A-Za-zñÑ][A-Za-zñÑ-]*/g) || [];
    const words = rawWords.filter((w) => !/[A-Z]/.test(w.slice(1))).map((w) => w.toLowerCase());

    // (B) PANGUNGUSAP ang sinusukat, hindi linya. Unang takbo: napagalitan nito
    // ang maiikling punchy na copy dahil tatlong pangungusap ang nasa iisang
    // linya ng HTML, kaya lumagpas sa 12 salita ang PINAGSAMA. Mali yun — walang
    // kailangang particle ang maikling linya, at yun mismo ang magandang copy.
    // Surface-level muna ang exemption (tingnan ang FORMAL_SURFACE sa itaas), tapos
    // ang lumang sentence-level na keyword check sa loob — para mahuli pa rin ang
    // legal na pangungusap na naka-embed sa isang sales page.
    for (const s of isFormalSurface ? [] : prose.split(/(?<=[.!?])\s+|\s*[|·•]\s*/)) {
      // Exempt ang legal at compliance na pangungusap. Pormal talaga sila nang
      // may dahilan (RA number, Data Privacy Act, DENR, BIR), at hindi pa
      // kailanman nireklamo ni Neil na "walang particle" ang ganitong linya.
      // Kung isasama sila, 33 ang babala at walang aaksyunan — mamamatay ang gate.
      if (/\b(RA|R\.A\.|Act of|DENR|BIR|DPA|Section|Presidential Decree)\b|\bPrivacy\b/.test(s)) continue;
      const sw = (s.match(/[A-Za-zñÑ][A-Za-zñÑ-]*/g) || [])
        .filter((w) => !/[A-Z]/.test(w.slice(1))).map((w) => w.toLowerCase());
      if (sw.length < 14) continue;
      const tagalogCount = sw.filter((w) => TAGALOG_MARKERS.has(w)).length;
      const particleCount = sw.filter((w) => PARTICLES.has(w)).length;
      // Density, hindi bilang: kailangang MALINAW na Tagalog ang pangungusap bago
      // sya husgahan sa particle. Ang halos-English na linya ay ibang usapan.
      if (tagalogCount / sw.length >= 0.3 && particleCount === 0) {
        warns.push({
          ...where, word: s.trim().slice(0, 60) + (s.trim().length > 60 ? '…' : ''),
          why: `${sw.length}-salitang Tagalog na pangungusap na walang particle — tama ang grammar, patay ang tunog`,
          better: 'subukan ang naman / lang / na / kasi / pala', klase: 'PARTICLE',
        });
      }
    }

    // (C) long-word scan — Tagalog LANG. Kailangang may Tagalog na affix ang
    // salita, kundi lahat ng mahabang English compound ay mahuhuli (yun ang
    // 113-babala na sablay). Ang target ay ang mahabang Tagalog na verb/noun,
    // at may affix silang lahat, kaya tumpak ang pilter na to.
    for (const w of new Set(words)) {
      if (w.length < 9 || NATURAL_LONG_PREFIX.test(w)) continue;
      if (syllables(w) < LONG_WORD_MIN_SYLLABLES) continue;
      if (!TAGALOG_AFFIX.test(w)) continue;
      warns.push({
        ...where, word: w,
        why: `${syllables(w)} pantig — bibigkasin ba to ng tao nang malakas?`,
        better: 'i-check sa affix machine (i- / mag- / na- + English root)', klase: 'MAHABA',
      });
    }
  });
}

// WARNINGS muna: babala lang sila, kaya lumalabas kahit pasado ang build.
if (warns.length) {
  console.warn(`\n⚠ ${warns.length} BABALA (klase, hindi salita — hindi to nagpapabagsak)\n`);
  for (const w of warns) {
    console.warn(`  [${w.klase}] ${w.file}:${w.line}`);
    console.warn(`    "${w.word}"`);
    console.warn(`    ${w.why}`);
    console.warn(`    ${w.better}\n`);
  }
  console.warn('Modelo: workflows/taglish_2026_model.md\n');
}

if (hits.length === 0) {
  console.log(`voice ok — ${files.length} file, ${warns.length} babala, walang nahuli`);
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
