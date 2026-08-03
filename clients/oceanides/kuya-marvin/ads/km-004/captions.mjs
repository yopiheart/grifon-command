#!/usr/bin/env node
// KM-004 captions — PER-WORD INVERT, sa HTML, hindi sa drawtext.
//
//   export PATH="$PWD/.tools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin:$PATH"
//   node clients/oceanides/kuya-marvin/ads/km-004/captions.mjs
//
// BAKIT HTML AT HINDI DRAWTEXT — ITO ANG BUONG DAHILAN KUNG BAKIT NAKA-PARK
// ANG SPOTLIGHT. Pinili ni Neil ang `spotlight` noong 2026-07-27 dahil sa
// **VO-timed active-word invert**: gumagalaw kada SALITA, hindi isang beses
// kada chunk. Hindi pa sya naitatayo kailanman — sabi mismo ng gb-001/
// captions.mjs: *"HINDI PA GAWA: ang per-word invert... Huwag itong
// ipagpanggap na buong spotlight."*
//
// Ang totoong harang ay hindi timing, TYPOGRAPHY. Hindi kayang paiba-ibahin ng
// isang `drawtext` ang kulay ng ISANG salita sa loob ng isang parirala — isang
// kulay lang kada draw. Para gawin sya sa drawtext ay kailangan mong sukatin
// mismo ang lapad ng bawat salita sa font metrics at ilagay sila nang isa-isa.
// Sa HTML ay `<span>` lang sya.
//
// May chromium pipeline na tayo para sa overlays, kaya libre na ang daan.
// Bonus: nawawala rin ang footgun ng aral 12 — ang `fontfile` ng drawtext ay
// nireresolba laban sa CWD ng ffmpeg at TAHIMIK syang bumabagsak sa serif.
//
// P1, 11 corroborations: ANG PACE AY CAPTION CHURN, HINDI CUT RATE. Ang invert
// ay nagdodoble ng churn (mula ~2 galaw kada segundo papuntang ~4) nang walang
// dagdag na eksena at walang dagdag na piso.

import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const AD = 'clients/oceanides/kuya-marvin/ads/km-004';
const HERE = path.resolve(AD, 'captions');
const W = 720, H = 1280, FPS = 30;
const Y = 845;          // 1267 x 0.667 — yFracTalking 0.66, loob ng feed-safe 190-1090
const SIZE = 55;        // 82 x 0.667

const ffmpeg = (() => {
  const local = path.resolve('.tools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe');
  return existsSync(local) ? local : 'ffmpeg';
})();

// --- chunking: KOPYA ng gb-001, kasama ang kuwit na batas -------------------
// Aral 18 (Neil, 2026-08-03): walang caption chunk na tatawid sa kuwit. Ang
// kuwit ay hininga; ang chunk na pinagdidikit ang dalawang parirala ay
// nababasang mali kahit hindi mo masabi kung bakit.
function chunkify(text, dur) {
  const phrases = text.split(/[.,]/).map((p) => p.trim()).filter(Boolean);
  const chunks = [], phraseOf = [];
  phrases.forEach((ph, pi) => {
    const words = ph.split(/\s+/).filter(Boolean);
    for (let i = 0; i < words.length;) {
      const a = words[i], b = words[i + 1];
      if (b && (a.length + b.length) <= 13) { chunks.push([a, b]); phraseOf.push(pi); i += 2; }
      else { chunks.push([a]); phraseOf.push(pi); i += 1; }
    }
  });
  let per = dur / chunks.length;
  while (per < 0.40 && chunks.length > 1) {
    let merged = false;
    for (let i = 0; i < chunks.length - 1; i++) {
      if (phraseOf[i] === phraseOf[i + 1] && (chunks[i].join('') + chunks[i + 1].join('')).length <= 20) {
        chunks.splice(i, 2, [...chunks[i], ...chunks[i + 1]]);
        phraseOf.splice(i + 1, 1);
        merged = true; break;
      }
    }
    if (!merged) break;
    per = dur / chunks.length;
  }
  return chunks;
}

// Ang oras sa loob ng chunk ay hinahati ayon sa PANTIG, hindi pantay. Ang
// "nakakatakot" ay mas matagal sa "ang", at ang pantay na hati ay nag-iiwan ng
// invert sa maling salita. Bilang ng pangkat ng patinig ang panukat — sapat na
// sya sa Tagalog, kung saan halos laging isang pantig ang isang patinig.
const syl = (w) => Math.max(1, (w.toLowerCase().match(/[aeiou]+/g) || ['x']).length);

function buildHtml(chunks, dur) {
  const per = dur / chunks.length;
  // [{start, end, words:[{t, s, e}]}]
  const plan = chunks.map((words, i) => {
    const start = i * per, total = words.reduce((a, w) => a + syl(w), 0);
    let cur = start;
    const ws = words.map((t) => {
      const d = (per * syl(t)) / total;
      const w = { t, s: cur, e: cur + d };
      cur += d;
      return w;
    });
    return { start, end: start + per, words: ws };
  });

  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
@font-face { font-family:'Anton'; src:url('../../../../../../api/_lib/assets/fonts/Anton-Regular.ttf') format('truetype'); }
* { margin:0; padding:0; box-sizing:border-box; }
html,body { width:${W}px; height:${H}px; overflow:hidden; background:transparent; }
.row { position:absolute; left:0; right:0; top:${Y}px; text-align:center; white-space:nowrap; display:none; }
.w {
  display:inline-block; font-family:'Anton',Impact,sans-serif; font-size:${SIZE}px;
  line-height:1.0; letter-spacing:.01em; color:#FFFFFF; padding:2px 8px 5px; margin:0 3px;
  /* Outline sa pamamagitan ng text-shadow, HINDI solidong kahon sa buong lapad —
     P2, 8 corroborations, at kontra sa bars at classic na preset. */
  text-shadow: -4px 0 #0A1F45, 4px 0 #0A1F45, 0 -4px #0A1F45, 0 4px #0A1F45,
               -3px -3px #0A1F45, 3px -3px #0A1F45, -3px 3px #0A1F45, 3px 3px #0A1F45,
               0 5px 0 rgba(7,22,48,.55);
}
/* ANG INVERT: ang salitang binibigkas NGAYON ay bumabaligtad — navy na teksto
   sa amber. Ito ang buong punto ng spotlight, at ito ang gumagalaw kada salita. */
.w.on { color:#0A1F45; background:#F5B301; text-shadow:none; }
</style></head><body>
<div id="rows">${plan.map((p, i) =>
  `<div class="row" id="r${i}">${p.words.map((w, j) => `<span class="w" id="r${i}w${j}">${w.t.toUpperCase()}</span>`).join('')}</div>`,
).join('')}</div>
<script>
const PLAN = ${JSON.stringify(plan)};
window.render = function (t) {
  PLAN.forEach((p, i) => {
    const row = document.getElementById('r' + i);
    const live = t >= p.start && t < p.end;
    row.style.display = live ? 'block' : 'none';
    if (!live) return;
    p.words.forEach((w, j) => {
      const el = document.getElementById('r' + i + 'w' + j);
      el.className = 'w' + (t >= w.s && t < w.e ? ' on' : '');
    });
  });
};
window.render(0);
</script></body></html>`;
}

// --- ang mga beat na may caption --------------------------------------------
// ⚠️ WALANG CAPTION ANG BEAT 1 (hook). Aral 4 ng KM-002: hook scene = overlay
// text LANG, walang karaoke caption — digmaan sa atensyon sila.
// ⚠️ WALANG CAPTION ANG BEAT 7, 5, 8, 11 — sila mismo ay teksto na. Batas na
// isang-text-layer-lang.
const speech = JSON.parse(readFileSync(`${AD}/speechmap.json`, 'utf8'));
const BEATS = [
  { name: 'b2', text: 'Kahit anong plunger, balik nang balik ang problema.',       dur: 3.2 },
  // 🔴 4.78 at hindi speech.r2.dur: SPLICED na ang beat 3 sa build-cut.sh.
  // Nahuli ng render_audit na ang linyang naririnig ay "Yung singil pagdating
  // ng truck" LANG — naputol ang "Pero ang mas nakakatakot" kasi may 1.04s na
  // pahinga sa gitna ng pangungusap at ang aking speechcut ay pumili ng ISANG
  // span. Ngayon ay dalawang piraso na ang tinatahi at tinatanggal ang pahinga.
  { name: 'b3', text: 'Pero ang mas nakakatakot, yung singil pagdating ng truck.', dur: 3.89 },
  { name: 'b4', text: 'Isa ang presyo sa phone, iba na sa receipt.',                dur: 3.4 },
  { name: 'b6', text: 'Kaya nasa page na ang buong presyo, nakasulat.',             dur: speech.r3.dur },
  // beat 9 — may `UUWI KAMI.` na slam sa y=900. Ang caption ay nasa y=845,
  // magkabanggaan sila. Sa ilalim ng batas na isang-text-layer-lang, ang slam
  // ang nananalo dito: sya ang pinakamalakas na linya ng ad.
  { name: 'b10', text: 'Basahin mo muna bago ka mag-book ng schedule.',             dur: speech.r5.dur },
];

mkdirSync(HERE, { recursive: true });
const browser = await chromium.launch();
const t0 = Date.now();
try {
  for (const b of BEATS) {
    const chunks = chunkify(b.text, b.dur);
    const html = buildHtml(chunks, b.dur);
    const htmlPath = path.join(HERE, `${b.name}.html`);
    writeFileSync(htmlPath, html);

    const frames = Math.round(b.dur * FPS);
    const tmp = mkdtempSync(path.join(tmpdir(), 'km004-cap-'));
    const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await p.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle', timeout: 60000 });
    await p.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    for (let i = 0; i < frames; i++) {
      await p.evaluate((t) => window.render(t), i / FPS);
      await p.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`), omitBackground: true });
    }
    await p.close();

    const out = path.join(HERE, `${b.name}.mov`);
    const r = spawnSync(ffmpeg, ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
      '-c:v', 'qtrle', '-pix_fmt', 'argb', out], { encoding: 'utf8' });
    rmSync(tmp, { recursive: true, force: true });
    if (r.status !== 0) { console.log(` BAGSAK  ${b.name}\n${r.stderr}`); continue; }
    const words = chunks.reduce((a, c) => a + c.length, 0);
    console.log(`  OK  ${b.name}.mov  ${b.dur.toFixed(2)}s  ${chunks.length} chunk / ${words} salita  = ${(words / b.dur).toFixed(1)} galaw kada segundo`);
  }
} finally { await browser.close(); }
console.log(`\n${BEATS.length} caption track sa ${((Date.now() - t0) / 1000).toFixed(0)}s`);
