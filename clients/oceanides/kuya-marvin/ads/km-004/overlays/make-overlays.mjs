#!/usr/bin/env node
// KM-004 overlays — sumusulat ng HTML mula sa isang config, tapos ini-render
// silang lahat papuntang transparent MOV / MP4 gamit ang chromium.
//
//   export PATH="$PWD/.tools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin:$PATH"
//   node clients/oceanides/kuya-marvin/ads/km-004/overlays/make-overlays.mjs
//
// BAKIT ISANG GENERATOR AT HINDI WALONG HTML FILE: pareho ang hugis ng apat na
// slam — Anton caps, outline, salpok papasok. Ang nagkakaiba lang ay ang teksto
// at kung nasa taas o baba. Ang walong kamay na HTML ay walong lugar na
// pwedeng mag-drift ang geometry.
//
// BAKIT PNG SEQUENCE AT HINDI CSS ANIMATION: inilalantad ng bawat composition
// ang `window.render(t, dur)`. Tinatawag sya kada frame at kinukunan ng
// screenshot, kaya walang inaasahang totoong oras at pareho ang labas sa bawat
// takbo — mahalaga yun sa cafe PC na nire-restore araw-araw.

import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const W = 720, H = 1280, FPS = 30;

const ffmpeg = (() => {
  const local = path.resolve('.tools/ffmpeg/ffmpeg-8.1.2-essentials_build/bin/ffmpeg.exe');
  return existsSync(local) ? local : 'ffmpeg';
})();

// --- ang shell ng bawat page -----------------------------------------------
const page = (style, body, script) => `<!doctype html>
<html><head><meta charset="utf-8"><link rel="stylesheet" href="_base.css">
<style>${style}</style></head>
<body><div class="stage">${body}</div>
<script>${script}</script></body></html>`;

// Salpok papasok: sumusobra ng kaunti tapos umuupo. Walang fade sa unang linya
// ng hook — frame 0 ang kinukuha ni Meta bilang thumbnail.
const SLAM_JS = (lines, hit0) => `
  const els = ${JSON.stringify(lines.map((_, i) => 'l' + i))}.map((id) => document.getElementById(id));
  window.render = function (t) {
    els.forEach((el, i) => {
      const hit = ${hit0} + i * 0.14, grow = 0.16;
      const p = Math.max(0, Math.min(1, (t - hit) / grow));
      const ease = 1 - Math.pow(1 - p, 3);
      el.style.opacity = t >= hit ? 1 : 0;
      el.style.transform = 'scale(' + (t >= hit ? (1.18 - 0.18 * ease) : 1.18) + ')';
    });
  };
  window.render(0);`;

function slamPage({ lines, top, hit0 = 0 }) {
  const body = `<div class="slam" style="top:${top}px">` +
    lines.map((tx, i) => `<div class="line${i ? ' two' : ''}" id="l${i}">${tx}</div>`).join('<br>') +
    `</div>`;
  return page('', body, SLAM_JS(lines, hit0));
}

// --- ang siyam ---------------------------------------------------------------
// Ang `y` ay galing sa script.spec.json na naka-1080 pa, ini-scale ng 0.667.
const JOBS = [
  {
    // beat 1 — frame 0, WALANG fade sa unang linya (thumbnail ni Meta)
    name: 'hook', dur: 2.8, alpha: true,
    html: slamPage({ lines: ['PUNO NA.', 'HINDI BARADO.'], top: 192, hit0: 0 }),
  },
  { name: 'slam-toilet',    dur: 2.4, alpha: true, html: slamPage({ lines: ['HINDI TOILET', 'ANG SIRA.'], top: 213, hit0: 0.10 }) },
  { name: 'slam-resibo',    dur: 2.4, alpha: true, html: slamPage({ lines: ['IBA ANG RESIBO.'],           top: 213, hit0: 0.10 }) },
  {
    // 🔴 BEAT 6 — idinagdag 2026-08-03 matapos hulihin ng frame check na may
    // SARILING SUBTITLE si Veo na nakabaon sa r3 ("..ang buong presyo...."),
    // kahit nasa prompt ang "no captions, no text overlays" at nasa negative
    // tail ang "text, watermark, writing, letters, subtitles". Binalewala nya.
    // Ang tanging paraan para tanggalin sya nang walang bagong render ay CROP,
    // pero ibinababa nun ang mukha at tumatama sa bibig ang caption sa y=845.
    // Kaya slam na lang sa ITAAS, kung saan malinis ang frame kahit naka-crop.
    // Verbatim sa page ang linya ("Wala kaming itinatago") at may kahulugan
    // sya kapag mute — hindi nya inuulit ang NAKASULAT NA. ng beat 7.
    name: 'slam-itinatago', dur: 2.6, alpha: true,
    html: slamPage({ lines: ['WALA KAMING', 'ITINATAGO.'], top: 213, hit0: 0.10 }),
  },
  { name: 'slam-nakasulat', dur: 1.6, alpha: true, html: slamPage({ lines: ['NAKASULAT NA.'],             top: 213, hit0: 0.06 }) },
  {
    // 🔴 beat 9 — sa IBABA, hindi sa itaas. Buong close-up ang s4 at bawal
    // tumakip sa mukha; ang camera-distance rule ang mas mabigat kaysa sa
    // posisyon ng template. Walang bangga sa caption: sa ilalim ng batas na
    // isang-text-layer-lang, humihinto ang caption sa window na to.
    // 🔴 y=900, HINDI 767. Nakuha ng sarili nating 375px na test: sa 767 ay
    // lumalapag ang kahon sa PANGA at bibig ni Marvin — face-safe violation,
    // hard rule. Ang 767 ay literal na pagsasalin ng 1150 x 0.667, at doon ako
    // nagkamali: ang mukha nya sa s4 ay mas mababa sa frame kaysa sa inakala ko
    // dahil high-angle sya. Ang y=900 ay nasa dibdib na, malinis, at nasa loob
    // pa rin ng feed-safe bottom na 1090.
    name: 'slam-uuwi', dur: 2.6, alpha: true,
    html: slamPage({ lines: ['UUWI KAMI.'], top: 900, hit0: 0.10 }),
  },
  {
    // beat 5 — quote card. Totoong sinabi ng customer, hindi mukha ni Marvin.
    name: 'quote-card', dur: 2.6, alpha: false,
    html: page(
      /* Pinalaki mula 60px matapos ang 375px na test — bakante ang kalahati ng
         card at nawawala ang bigat ng sinabi ng customer. Ang card ay hindi
         pahina, isang hiyaw sya. */
      `html,body{background:#071630;}
       .card { justify-content: center; }
       .mark { font-family:'Anton',Impact,sans-serif; font-size:120px; line-height:.6; color:var(--amber);
               opacity:.55; height:64px; }
       .q { font-family:'Anton',Impact,sans-serif; font-size:82px; line-height:1.04; color:var(--white); }
       .q .hi { color: var(--amber); }
       .who { margin-top:40px; font-family:'InterBlack',sans-serif; font-size:24px; letter-spacing:.16em;
              color:var(--dim); text-transform:uppercase; }`,
      `<div class="card"><div class="mark">&ldquo;</div><div class="q" id="q">TALAGA <span class="hi">GRABE</span><br>ANG SINGILAN.</div>
       <div class="who" id="w">SABI NG ISANG CUSTOMER</div></div>`,
      `const q=document.getElementById('q'),w=document.getElementById('w');
       window.render=function(t){
         const p=Math.max(0,Math.min(1,t/0.28)), e=1-Math.pow(1-p,3);
         q.style.opacity=p; q.style.transform='translateY('+(18-18*e)+'px)';
         const p2=Math.max(0,Math.min(1,(t-0.34)/0.3));
         w.style.opacity=p2;
       }; window.render(0);`,
    ),
  },
  {
    // beat 8 — ticket card. VERBATIM sa page ang presyo at ang mga dagdag.
    // Bawal mag-imbento ng pangako para sa totoong kompanya (aral 19).
    name: 'ticket-card', dur: 3.2, alpha: false,
    html: page(
      `html,body{background:#071630;}
       .card { justify-content: center; }
       .h { font-family:'Anton',Impact,sans-serif; font-size:44px; color:var(--amber); letter-spacing:.02em; }
       .base { margin-top:18px; font-family:'Anton',Impact,sans-serif; font-size:88px; color:var(--white); line-height:1; }
       .base small { font-size:26px; color:var(--dim); display:block; letter-spacing:.14em; margin-top:8px;
                     font-family:'InterBlack',sans-serif; text-transform:uppercase; }
       .rows { margin-top:34px; border-top:2px solid rgba(245,179,1,.4); }
       .row { display:flex; justify-content:space-between; align-items:baseline; padding:13px 0;
              border-bottom:1px solid rgba(143,179,221,.22); font-family:'InterBlack',sans-serif; }
       .row .l { font-size:25px; color:var(--muted); }
       .row .r { font-size:28px; color:var(--amber); white-space:nowrap; padding-left:16px; }
       .foot { margin-top:26px; font-family:'InterBlack',sans-serif; font-size:24px; color:var(--white); }`,
      `<div class="card">
         <div class="h">BUONG PRESYO</div>
         <div class="base">₱5,000<small>ISANG TRUCKLOAD</small></div>
         <div class="rows" id="rows">
           <div class="row"><span class="l">Sobrang hose, kada 3 metro</span><span class="r">₱100</span></div>
           <div class="row"><span class="l">Bakbak ng takip, kasama ang pagsasara</span><span class="r">₱500 - 1,000</span></div>
           <div class="row"><span class="l">Semento sa pagsasara, kung kami ang magdadala</span><span class="r">₱500</span></div>
           <div class="row"><span class="l">Pangalawang truckload</span><span class="r">₱5,000</span></div>
         </div>
         <div class="foot" id="foot">Wala nang iba. Sasabihin namin bago magsimula.</div>
       </div>`,
      `const rows=[...document.querySelectorAll('.row')], foot=document.getElementById('foot');
       window.render=function(t){
         rows.forEach((r,i)=>{ const p=Math.max(0,Math.min(1,(t-(0.30+i*0.13))/0.24));
           r.style.opacity=p; r.style.transform='translateX('+(14-14*p)+'px)'; });
         foot.style.opacity=Math.max(0,Math.min(1,(t-0.95)/0.3));
       }; window.render(0);`,
    ),
  },
  {
    // beat 11 — end card. Walang piso, walang numero. Nakasulat lang.
    name: 'endcard', dur: 1.8, alpha: false,
    html: page(
      `html,body{background:#071630;}
       .card { align-items:center; justify-content:center; text-align:center; }
       .cta { font-family:'Anton',Impact,sans-serif; font-size:66px; color:var(--white); line-height:1.04; }
       .url { margin-top:26px; font-family:'Anton',Impact,sans-serif; font-size:46px; color:var(--amber);
              letter-spacing:.03em; }
       .logo { margin-top:40px; width:150px; opacity:.9; }`,
      `<div class="card">
         <div class="cta" id="cta">BASAHIN MO MUNA</div>
         <div class="url" id="url">OCEANIDESPH.COM</div>
         <img class="logo" id="logo" src="../../../brand/logo-source.png" alt="">
       </div>`,
      `const c=document.getElementById('cta'),u=document.getElementById('url'),g=document.getElementById('logo');
       window.render=function(t){
         const p=Math.max(0,Math.min(1,t/0.26)), e=1-Math.pow(1-p,3);
         c.style.opacity=p; c.style.transform='scale('+(1.1-0.1*e)+')';
         u.style.opacity=Math.max(0,Math.min(1,(t-0.30)/0.26));
         g.style.opacity=Math.max(0,Math.min(1,(t-0.60)/0.30))*0.9;
       }; window.render(0);`,
    ),
  },
];

// --- render ------------------------------------------------------------------
mkdirSync(HERE, { recursive: true });
const only = process.argv.includes('--only') ? process.argv[process.argv.indexOf('--only') + 1] : null;
const jobs = only ? JOBS.filter((j) => j.name === only) : JOBS;
if (!jobs.length) { console.error(`walang "${only}". Meron: ` + JOBS.map((j) => j.name).join(', ')); process.exit(1); }

const browser = await chromium.launch();
const t0 = Date.now();
try {
  for (const job of jobs) {
    const htmlPath = path.join(HERE, `${job.name}.html`);
    writeFileSync(htmlPath, job.html);

    const frames = Math.max(1, Math.round(job.dur * FPS));
    const tmp = mkdtempSync(path.join(tmpdir(), 'km004-ovl-'));
    const p = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await p.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle', timeout: 60000 });
    await p.evaluate(() => document.fonts && document.fonts.ready).catch(() => {});
    for (let i = 0; i < frames; i++) {
      await p.evaluate(([t, d]) => window.render && window.render(t, d), [i / FPS, job.dur]);
      await p.screenshot({ path: path.join(tmp, `f${String(i).padStart(4, '0')}.png`), omitBackground: job.alpha });
    }
    await p.close();

    const out = path.join(HERE, `${job.name}.${job.alpha ? 'mov' : 'mp4'}`);
    const args = job.alpha
      ? ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
         '-c:v', 'qtrle', '-pix_fmt', 'argb', out]
      : ['-y', '-v', 'error', '-framerate', String(FPS), '-i', path.join(tmp, 'f%04d.png'),
         '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', out];
    const r = spawnSync(ffmpeg, args, { encoding: 'utf8' });
    rmSync(tmp, { recursive: true, force: true });
    if (r.status !== 0) { console.log(` BAGSAK  ${job.name}\n${r.stderr}`); continue; }
    console.log(`  OK  ${job.name}.${job.alpha ? 'mov' : 'mp4'}  ${job.dur}s  ${frames}f`);
  }
} finally { await browser.close(); }
console.log(`\n${jobs.length} overlay sa ${((Date.now() - t0) / 1000).toFixed(0)}s`);
console.log('⚠️  Machine triage lang. I-scale sa 375px at basahin bago kay Neil (aral 17).');
