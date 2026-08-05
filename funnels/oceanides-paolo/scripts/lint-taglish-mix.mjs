#!/usr/bin/env node
/**
 * lint-taglish-mix.mjs — hinahanap ang PURONG TAGALOG na pangungusap sa loob ng
 * copy na dapat Taglish.
 *
 * WHY THIS EXISTS
 * Neil, 2026-08-02: "Tsaka iwasan ung tagalog na tatlong magkakasunod sunod...
 * BASTA NEVER MONG GAGAWIN NA isang buong sentence TAGALOG lalo kung ang gagawin
 * mong tone/voice ay TAGLISH! Kung english english lang."
 *
 * Kaiba sya sa `lint-voice.mjs`. Ang isang yun ay word list: hinuhuli nya ang
 * mga MALALIM na salita, isa-isa. Wala syang nakikitang mali sa isang
 * pangungusap na puro simpleng Tagalog — kahit iyon mismo ang sumisira sa
 * register. Ito ang sumusukat ng HALO, hindi ng bokabularyo.
 *
 * PAANO SYA HUMAHATOL
 * Sinusukat nito ang bawat pangungusap: ilan ang English token, at gaano
 * kahaba ang pinakamahabang tuloy-tuloy na Tagalog. Ang salita ay itinuturing
 * na English kung nasa `ENGLISH` set sa ibaba. Kung may bagong English na
 * salitang gamit sa copy at hindi sya nandito, IDAGDAG SYA — hindi bug ang
 * false positive, kulang lang ang listahan.
 *
 * ⚠️ REPORT-ONLY MUNA (hindi naka-wire sa prebuild). May dahilan: ang linyang
 * "Kapag nagbubuhos ka na ng timba para lang bumaba, hindi na yan barado." ay
 * PURONG TAGALOG at APPROVED at 98.5% ang retention nito sa 0:03 ng KM-003.
 * Kaya hindi lahat ng purong-Tagalog na pangungusap ay mali. Kailangan munang
 * i-calibrate ni Neil ang threshold bago to maging build gate.
 *
 * Run: node scripts/lint-taglish-mix.mjs
 */

import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const SRC = join(ROOT, 'src');
const PUBLIC = join(ROOT, 'public');

/**
 * Ang mga salitang binibilang na ENGLISH. Sinasadyang mapagbigay: kasama ang
 * mga technical noun na hinihinging manatiling English ng taglish-voice.md,
 * ang mga brand at institution name, at ang karaniwang English na tunay na
 * tina-type ng Pinoy.
 */
const ENGLISH = new Set(
  `a about ads after all also always am an and any apartment app are as at
   automatic available
   back bara base before bir bonus book booking boss bot bots branch brand
   browser budget building business but by
   call cancel card care caretaker cash certificate certified check checkbox
   city claim clean click client clients code company complete compliance
   confirmed consent contact conversion cookie cookies copy cost create
   credit crew customer
   dashboard data database date day days delete denr deposit design details
   discount do doctor domain down download
   e email emergency engine event events every exact
   facebook facility faq fb feed field file fill first fit five for form free
   from full function
   get gcash go good google got guarantee
   have help here hotel house how
   id if in info inspector install invoice ip is it
   job join
   key
   landing lead leads legal like limit link list live load loads location lock
   login logo
   manager manifest marketing may message messenger meta metro mobile month
   more my
   name new next no not number
   of off official offer ok okay on one online only open option or order our
   out owner
   page pages partner password pay payment permit phone photo pixel plan plans
   plumbing po policy post premium price pricing privacy pro problem product
   profile project promo property provider
   qr quality question quote
   rate receipt record register registered report request result results review
   reviews right risk
   sales save schedule sec second secret sept septic server service services
   session set setting settings share shop show sign siphoning site size slot
   solution spam standard start step steps stop store strategy submit support
   system
   tank tanks target team tenant terms test text thank the this three time to
   toilet total track truck trucks type
   update upgrade url use user
   van vercel verified version video view
   warranty waste we web website week what when where who why with work
   yes you your`
    .split(/\s+/)
    .filter(Boolean)
);

/** Bunutin ang user-visible na string sa loob ng quotes (TS/TSX). */
const stringsFromTs = (src) => {
  const out = [];
  const re = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;
  let m;
  while ((m = re.exec(src))) {
    const s = m[2];
    // Laktawan ang class name, import path, at token na parang code.
    if (s.length < 25) continue;
    if (/^[\w./@-]+$/.test(s)) continue;
    if (/[<>{}]|^\s*(https?:|\/|#)|text-|bg-|border-|flex|grid/.test(s)) continue;
    out.push(s);
  }
  return out;
};

/** Bunutin ang nakikitang teksto sa HTML (walang tag, walang style, walang comment). */
const textFromHtml = (src) =>
  src
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(style|script)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 25);

const sentences = (text) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const tokens = (sentence) =>
  sentence
    .toLowerCase()
    .replace(/[₱#*=_`]/g, ' ')
    .split(/[^a-z0-9-]+/)
    .filter((w) => w.length > 1 && !/^\d+$/.test(w));

const analyse = (sentence) => {
  const ws = tokens(sentence);
  if (ws.length < 4) return null;
  let english = 0;
  let run = 0;
  let longestRun = 0;
  for (const w of ws) {
    if (ENGLISH.has(w) || ENGLISH.has(w.replace(/^(mag|nag|i|ka|pa)-/, ''))) {
      english += 1;
      run = 0;
    } else {
      run += 1;
      longestRun = Math.max(longestRun, run);
    }
  }
  return { words: ws.length, english, longestRun };
};

const walk = async (dir, re) => {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'demo') continue;
      out.push(...(await walk(full, re)));
    } else if (re.test(e.name)) out.push(full);
  }
  return out;
};

const files = [
  ...(await walk(SRC, /\.tsx?$/)),
  ...(await walk(PUBLIC, /\.html$/)),
];

const pure = [];
const longRuns = [];

for (const file of files) {
  const raw = await readFile(file, 'utf8');
  const blocks = /\.html$/.test(file) ? textFromHtml(raw) : stringsFromTs(raw);
  for (const block of blocks) {
    for (const s of sentences(block)) {
      const a = analyse(s);
      if (!a) continue;
      const rel = relative(ROOT, file);
      if (a.english === 0) pure.push({ file: rel, s, ...a });
      else if (a.longestRun > 6) longRuns.push({ file: rel, s, ...a });
    }
  }
}

console.log('\nTAGLISH MIX — gaano kadalas walang English sa isang pangungusap\n');

console.log(`PURONG TAGALOG na pangungusap (zero English token): ${pure.length}`);
for (const p of pure) console.log(`  ${p.file}  [${p.words}w]  ${p.s}`);

console.log(`\nMAHABANG TAGALOG na tuloy-tuloy (>6 na salita bago pumasok ang English): ${longRuns.length}`);
for (const r of longRuns) console.log(`  ${r.file}  [run ${r.longestRun}]  ${r.s}`);

console.log('\nReport-only. Walang binabagsak na build.\n');
