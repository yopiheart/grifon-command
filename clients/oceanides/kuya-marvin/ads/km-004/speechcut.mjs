#!/usr/bin/env node
// speechcut — hanapin ang TOTOONG puwang ng salita sa bawat clip.
//
//   export PATH="$PWD/.tools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin:$PATH"
//   node clients/oceanides/kuya-marvin/ads/km-004/speechcut.mjs
//
// BAKIT SYA NASA AD FOLDER AT HINDI SA .tmp: ginawa ito ng GB-001 sa `.tmp/
// speechcut.mjs` at kinain ng defreezer. Ang recipe ay naka-commit, laging.
//
// Ang gagawin: hinahati ni Veo ang 8s clip sa salita + katahimikan + hangin.
// Ang hinahanap natin ay ang UNANG salita at ang HULING salita, tapos putol.
// Ang mga patlang sa LOOB ng pangungusap na mas maikli sa GAP_MERGE ay hindi
// hangganan — hininga lang sila, kaya pinagdurugtong.
//
// Ang labas ay JSON na binabasa ng build-cut.sh.

import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const AD = 'clients/oceanides/kuya-marvin/ads/km-004';
const CLIPS = ['r1', 'r2', 'r3', 'r4', 'r5'];

// 🔴 -20dB, HINDI ang -26dB ng GB-001. Sinukat 2026-08-03 sa totoong clip:
// binibilang ng -26dB ang HANGIN bilang salita, kaya 8.00s ang lumalabas na
// haba ng bawat clip — buong 8s, walang pinuputol. Ang tunog sa dulo ng clip ng
// Veo ay ambient, hindi boses. Sinweep ko ang -26/-20/-16/-12: ang -12 ay
// pumuputol na sa gitna ng salita ni Marvin (silence sa 1.34s ng r1), ang -16
// ay masyadong mahigpit sa mas tahimik na clip, ang -20 ang tumatama sa dulo ng
// hook sa 2.32s. Ito ang hangganan sa MATERYAL NA TO, hindi unibersal —
// sukatin ulit kapag ibang batch.
const NOISE = '-20dB';
const MIN_SIL = 0.20;    // ang mas maikli dito ay hindi man lang katahimikan
const GAP_MERGE = 0.50;  // hininga at hinto sa pagitan ng dalawang pangungusap, hindi hangganan
const PAD_HEAD = 0.06;   // huwag putulin ang unang katinig
const PAD_TAIL = 0.25;   // hayaang matapos ang huling pantig (GB-001: +0.25s)

const dur = (f) =>
  parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim());

// 🔴 spawnSync, HINDI execFileSync. Sa stderr sumusulat ang silencedetect at
// lumalabas pa rin ang ffmpeg nang exit 0 — kaya walang exception na masasalo,
// at stdout LANG ang ibinabalik ng execFileSync. Ang unang takbo nito ay
// nagbalik ng 0.00 -> 8.00 sa LAHAT ng clip (spans=1): blangko ang log, kaya
// walang katahimikang nakita, kaya iisang mahabang salita ang basa. Tahimik ang
// bagsak — mukha syang sagot.
function speechSpans(file) {
  const res = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', file, '-af', `silencedetect=noise=${NOISE}:d=${MIN_SIL}`, '-f', 'null', '-'],
    { encoding: 'utf8' });
  const log = String(res.stderr || '');
  if (!/silence_start/.test(log)) {
    console.warn(`  ⚠️  walang silence_start sa log ng ${file} — buong clip ang ibabalik. Tingnan mo mismo.`);
  }

  const total = dur(file);
  const sil = [];
  const re = /silence_start:\s*([\d.]+)|silence_end:\s*([\d.]+)/g;
  let m, open = null;
  while ((m = re.exec(log))) {
    if (m[1] !== undefined) open = parseFloat(m[1]);
    else if (open !== null) { sil.push([open, parseFloat(m[2])]); open = null; }
  }
  if (open !== null) sil.push([open, total]);   // katahimikan hanggang dulo

  // komplemento = salita
  let spans = [];
  let cur = 0;
  for (const [s, e] of sil) {
    if (s > cur) spans.push([cur, s]);
    cur = e;
  }
  if (cur < total) spans.push([cur, total]);

  return spans;
}

// Pagdugtungin ang mga span na pinaghihiwalay ng patlang na mas maikli sa `gap`.
function mergeGaps(spans, gap) {
  const out = [];
  for (const sp of spans) {
    const last = out[out.length - 1];
    if (last && sp[0] - last[1] < gap) last[1] = sp[1];
    else out.push([...sp]);
  }
  return out.filter(([s, e]) => e - s >= 0.25);
}

// 🔴 ANG BILANG NG SALITA ANG PANUKAT, HINDI ANG HABA LANG.
// Bumagsak ang dalawang naunang paraan: (a) una-hanggang-huli — hinihila ng
// isang tilamsik ng hangin sa dulo pabalik sa buong 8s; (b) pinakamahabang
// span — pinutol nya ang r4 sa gitna ng dalawang pangungusap nito, kasi ang
// ambient sa dulo ay mas mahaba pa kaysa sa linya mismo.
//
// Alam natin ang eksaktong sasabihin sa bawat roll — nasa script.spec.json sya,
// at ipinapatupad ng gate na ISANG linya lang kada roll. Kaya alam din natin
// ang inaasahang haba. ~0.42s kada salita ang kumbersasyonal na Taglish
// (sinukat sa r1 at r3, ang dalawang malinis na basa). Kaya: gumawa ng mga
// kandidatong span sa iba't ibang gap threshold, at piliin ang pinakamalapit sa
// inaasahan. Ang hangin ay hindi kailanman may tamang haba; ang linya, oo.
const SEC_PER_WORD = 0.42;
const GAP_CANDIDATES = [0.35, 0.6, 0.9, 1.3, 1.8];
const SPOKEN = {
  r1: 'Puno na ang septic tank mo, hindi barado.',
  r2: 'Pero ang mas nakakatakot, yung singil pagdating ng truck.',
  r3: 'Kaya nasa page na ang buong presyo, nakasulat.',
  r4: 'Kapag hindi pa naman puno, uuwi kami. Hindi ka namin pipilitin.',
  r5: 'Basahin mo muna bago ka mag-book ng schedule.',
};
const wordCount = (s) => s.trim().split(/\s+/).length;

const map = {};
for (const id of CLIPS) {
  const f = `${AD}/clips/${id}.mp4`;
  const total = dur(f);
  const raw = speechSpans(f);
  if (!raw.length) { console.log(`${id}  WALANG salitang nakita — tingnan mo mismo`); continue; }

  const words = wordCount(SPOKEN[id]);
  const expect = words * SEC_PER_WORD;
  const candidates = [];
  for (const g of GAP_CANDIDATES) for (const sp of mergeGaps(raw, g)) candidates.push(sp);
  const best = candidates.reduce((a, b) =>
    Math.abs((b[1] - b[0]) - expect) < Math.abs((a[1] - a[0]) - expect) ? b : a);
  const spans = [best];
  // 🔴 ANG PINAKAMAHABANG SPAN, hindi ang una-hanggang-huli. Ang una-hanggang-huli
  // ay hinihila ng kahit isang tilamsik ng hangin sa dulo pabalik sa buong 8s —
  // yun ang bumagsak sa unang dalawang takbo nito. Isang linya lang ang sinasabi
  // sa bawat roll (isang-linya-kada-roll na batas), kaya ang linyang yun ANG
  // pinakamahabang tuloy-tuloy na tunog. Ang mga pahinga sa loob nya ay
  // pinagdurugtong na ng GAP_MERGE bago dumating dito.
  const longest = spans[0];
  const start = Math.max(0, longest[0] - PAD_HEAD);
  const end = Math.min(total, longest[1] + PAD_TAIL);
  map[id] = { in: +start.toFixed(3), out: +end.toFixed(3), dur: +(end - start).toFixed(3), source: +total.toFixed(3), spans: spans.map(([a, b]) => [+a.toFixed(3), +b.toFixed(3)]) };
  console.log(
    `${id}  ${start.toFixed(2)} -> ${end.toFixed(2)}  = ${(end - start).toFixed(2)}s  (inaasahan ${expect.toFixed(2)}s sa ${words} salita) ` +
    `(mula sa ${total.toFixed(1)}s, tinapon ${(total - (end - start)).toFixed(2)}s)  spans=${spans.length}`,
  );
}

const totalCut = Object.values(map).reduce((a, b) => a + b.dur, 0);
console.log(`\nKabuuan ng salita: ${totalCut.toFixed(2)}s sa limang talking beat.`);
writeFileSync(`${AD}/speechmap.json`, JSON.stringify(map, null, 2) + '\n');
console.log(`Naisulat: ${AD}/speechmap.json`);
