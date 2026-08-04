// Kuya Marvin — Linggo 1 Posting Pack (admin run sheet).
// Twin: artifacts/km-value-week-01.html (self-contained; images embedded as JPEG data URIs).
// Sources of truth (committed): clients/oceanides/kuya-marvin/organic/VALUE-WEEK-01.md (captions)
//   + organic/cards/*.png + organic/stills-week01/*.png (images).
// Usage: node tools/artifacts/build-km-week01-runsheet.mjs
import { chromium } from 'playwright';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const ORG = path.join(ROOT, 'clients', 'oceanides', 'kuya-marvin', 'organic');
const OUT = path.join(ROOT, 'artifacts', 'km-value-week-01.html');

// ---- captions mula sa VALUE-WEEK-01.md (single source of truth) ----
const md = readFileSync(path.join(ORG, 'VALUE-WEEK-01.md'), 'utf8');
const captions = {};
for (const m of md.matchAll(/## POST (\d+) — ([^\n(]+)[^\n]*\n[\s\S]*?```\n([\s\S]*?)```/g)) {
  captions[m[1]] = { title: m[2].trim(), text: m[3].trim() };
}
for (const n of ['1', '2', '3', '4', '5', '6', '7']) {
  if (!captions[n]) throw new Error('Walang caption para sa POST ' + n + ' sa VALUE-WEEK-01.md');
}

const POSTS = [
  { n: '1', img: 'cards/post1-ulan-card.png', kind: 'Hook card', note: 'May tanong sa dulo ng caption. Si Neil o Zam ang sasagot sa comments, hindi ang admin.' },
  { n: '2', img: 'cards/post2-beforeafter.png', kind: 'Before/after', note: 'Totoong litrato ng trabaho. Wag lagyan ng dagdag na text o sticker.' },
  { n: '3', img: 'cards/post3-senyales-card.png', kind: 'Hook card', note: 'Checklist post. Ito ang pinaka-malamang i-share, wag galawin ang caption.' },
  { n: '4', img: 'cards/post4-chemical-card.png', kind: 'Hook card', note: '' },
  { n: '5', img: 'stills-week01/vw1-s5-van-rear.png', kind: 'Litrato lang', note: 'Walang card na to, litrato lang talaga. Sadya yun para may totoong dating ang page.' },
  { n: '6', img: 'cards/post6-redflags-card.png', kind: 'Hook card', note: '' },
  { n: '7', img: 'stills-week01/vw1-s6-clipboard.png', kind: 'Litrato lang', note: '' },
];
const DAYS = ['Araw 1', 'Araw 2', 'Araw 3', 'Araw 4', 'Araw 5', 'Araw 6', 'Araw 7'];

// ---- i-compress ang images sa 1080w JPEG data URI gamit ang chromium canvas ----
const browser = await chromium.launch();
const page = await browser.newPage();
async function toJpegDataUri(absPath) {
  const pngUri = 'data:image/png;base64,' + readFileSync(absPath).toString('base64');
  return await page.evaluate(async (src) => {
    const img = new Image();
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = src; });
    const w = Math.min(1080, img.naturalWidth);
    const h = Math.round(img.naturalHeight * (w / img.naturalWidth));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    return c.toDataURL('image/jpeg', 0.85);
  }, pngUri);
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

let cardsHtml = '';
for (let i = 0; i < POSTS.length; i++) {
  const p = POSTS[i];
  const cap = captions[p.n];
  const dataUri = await toJpegDataUri(path.join(ORG, p.img));
  console.log(`post ${p.n}: ${p.img} -> ${(dataUri.length / 1024).toFixed(0)}KB embedded`);
  cardsHtml += `
  <section class="post" id="post${p.n}">
    <div class="post-head">
      <span class="day">${DAYS[i]}</span>
      <span class="when">6:00 PM</span>
      <span class="kind">${p.kind}</span>
    </div>
    <h2>Post ${p.n} &middot; ${esc(cap.title)}</h2>
    <img class="ph" src="${dataUri}" alt="Post ${p.n}" loading="lazy" />
    <p class="save-note">I-SAVE ANG LITRATO: pindutin nang matagal sa phone, o right-click sa PC.</p>
    <div class="cap-box">
      <div class="cap-head">
        <span>CAPTION (kopyahin nang buo, wag babaguhin)</span>
        <button class="copy" data-t="cap${p.n}">Kopyahin</button>
      </div>
      <pre id="cap${p.n}">${esc(cap.text)}</pre>
    </div>
    ${p.note ? `<p class="note">${esc(p.note)}</p>` : ''}
  </section>`;
}
await browser.close();

const scheduleRows = POSTS.map((p, i) =>
  `<tr><td>${DAYS[i]}</td><td>6:00 PM</td><td>Post ${p.n} &middot; ${esc(captions[p.n].title)}</td></tr>`).join('\n');

const html = `<title>Kuya Marvin — Linggo 1 Posting Pack</title>
<style>
  :root {
    --amber: #F5B301; --navy: #0E2C5E; --navy2: #0A1F45; --void: #071630;
    --ocean: #1C63AD; --sky: #5AA6E6; --dim: #8FB3DD;
    --white: #FFFFFF; --muted: #DFE8F5; --paper: #F4F6FA; --ink: #0B1B33;
    --good: #3ED36B; --danger: #D7263D;
    --head: 'Arial Narrow', 'Roboto Condensed', Impact, sans-serif;
    --body: Inter, 'Helvetica Neue', Arial, sans-serif;
    --mono: 'JetBrains Mono', Consolas, monospace;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: var(--void); }
  body { font-family: var(--body); color: var(--muted); line-height: 1.55; }
  .wrap { max-width: 640px; margin: 0 auto; padding: 20px 16px 60px; }

  .masthead { background: var(--navy2); border: 1px solid rgba(255,255,255,.1); border-radius: 10px; padding: 22px 20px; }
  .eyebrow { display: inline-block; background: var(--amber); color: var(--navy2); font-weight: 900;
    font-size: 11px; letter-spacing: 1.2px; text-transform: uppercase; padding: 5px 10px; border-radius: 4px; }
  h1 { font-family: var(--head); font-weight: 700; text-transform: uppercase; letter-spacing: .5px;
    line-height: .95; font-size: 40px; color: var(--white); margin-top: 14px; text-wrap: balance; }
  h1 .em { color: var(--amber); }
  .masthead p { margin-top: 12px; font-size: 15px; color: var(--muted); }
  .mono { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--dim); }
  .masthead .mono { margin-top: 14px; }

  .panel { background: var(--navy2); border: 1px solid rgba(255,255,255,.1); border-radius: 10px;
    padding: 20px; margin-top: 16px; }
  .panel h2, .post h2 { font-family: var(--head); font-weight: 700; text-transform: uppercase;
    font-size: 22px; letter-spacing: .5px; color: var(--white); line-height: 1.05; text-wrap: balance; }
  .steps { margin-top: 12px; display: grid; gap: 10px; }
  .step { display: flex; gap: 12px; align-items: flex-start; }
  .step b.num { flex: 0 0 26px; height: 26px; border-radius: 50%; background: var(--amber);
    color: var(--navy2); font-weight: 900; font-size: 14px; display: flex; align-items: center; justify-content: center; }
  .step p { font-size: 15px; }
  .step p strong { color: var(--white); }

  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
  th { font-family: var(--mono); font-size: 10px; letter-spacing: .14em; text-transform: uppercase;
    color: var(--sky); text-align: left; padding: 6px 8px; border-bottom: 1px solid rgba(255,255,255,.15); }
  td { padding: 8px; border-bottom: 1px dashed rgba(255,255,255,.12); vertical-align: top; }
  td:first-child { white-space: nowrap; font-weight: 800; color: var(--white); }
  td:nth-child(2) { white-space: nowrap; font-variant-numeric: tabular-nums; }

  .post { background: var(--navy2); border: 1px solid rgba(255,255,255,.1); border-radius: 10px;
    padding: 20px; margin-top: 20px; }
  .post-head { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 10px; }
  .day { background: var(--amber); color: var(--navy2); font-weight: 900; font-size: 12px;
    letter-spacing: 1px; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; }
  .when { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; color: var(--white);
    border: 1px solid rgba(255,255,255,.25); padding: 3px 8px; border-radius: 4px; }
  .kind { font-family: var(--mono); font-size: 11px; letter-spacing: .14em; text-transform: uppercase; color: var(--dim); }
  .ph { width: 100%; max-width: 100%; border-radius: 8px; margin-top: 12px; display: block;
    border: 1px solid rgba(255,255,255,.12); }
  .save-note { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; color: var(--dim); margin-top: 8px; }

  .cap-box { margin-top: 14px; background: var(--paper); border-radius: 8px; overflow: hidden; }
  .cap-head { display: flex; justify-content: space-between; align-items: center; gap: 10px;
    padding: 10px 14px; background: rgba(11,27,51,.08); border-bottom: 1px dashed rgba(11,27,51,.25); }
  .cap-head span { font-family: var(--mono); font-size: 10px; letter-spacing: .12em; color: #5B6B85; }
  .copy { background: var(--amber); color: var(--navy2); border: 0; font-weight: 900; font-size: 13px;
    padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: var(--body); }
  .copy:focus-visible { outline: 3px solid var(--ocean); outline-offset: 2px; }
  .copy.done { background: #1B8A3C; color: #fff; }
  pre { font-family: var(--body); font-size: 15px; color: var(--ink); white-space: pre-wrap;
    padding: 14px 16px 18px; line-height: 1.6; user-select: all; }
  .note { margin-top: 12px; font-size: 14px; color: var(--sky); border-left: 3px solid var(--ocean); padding-left: 10px; }

  .rules { margin-top: 12px; display: grid; gap: 8px; font-size: 15px; }
  .rules div { display: flex; gap: 10px; }
  .rules .x { color: var(--danger); font-weight: 900; }
  .rules .ok { color: var(--good); font-weight: 900; }
  .foot { margin-top: 26px; text-align: center; }
</style>
<div class="wrap">
  <header class="masthead">
    <span class="eyebrow">Oceanides &middot; Kuya Marvin</span>
    <h1>Linggo 1<br /><span class="em">Posting Pack</span></h1>
    <p>Pitong post, isang linggo, isang upuan lang ang pag-schedule. Lahat ng litrato at caption, nandito na. Kopyahin lang nang buo, wag babaguhin.</p>
    <p class="mono">// PAGE: KUYA MARVIN NG OCEANIDES &middot; 6:00 PM KADA POST</p>
  </header>

  <section class="panel">
    <h2>Paano gamitin (isang beses kada linggo)</h2>
    <div class="steps">
      <div class="step"><b class="num">1</b><p><strong>I-save ang 7 litrato</strong> dito sa page na to. Pindutin nang matagal ang bawat litrato (phone) o right-click (PC).</p></div>
      <div class="step"><b class="num">2</b><p>Sa <strong>Meta Business Suite &gt; Planner</strong>, gumawa ng scheduled post kada araw: ilagay ang litrato, pindutin ang <strong>Kopyahin</strong> sa caption dito, i-paste, tapos i-set ang oras sa <strong>6:00 PM</strong>.</p></div>
      <div class="step"><b class="num">3</b><p>Sundin ang order sa schedule sa baba. <strong>Pitong post, pitong araw, tapos ka na sa buong linggo.</strong></p></div>
    </div>
  </section>

  <section class="panel">
    <h2>Schedule ng linggo</h2>
    <table>
      <thead><tr><th>Araw</th><th>Oras</th><th>Post</th></tr></thead>
      <tbody>
${scheduleRows}
      </tbody>
    </table>
  </section>
${cardsHtml}
  <section class="panel">
    <h2>Mga bawal (importante)</h2>
    <div class="rules">
      <div><span class="x">&#10007;</span><p>Wag babaguhin ang caption, kahit isang salita. Wag din dadagdagan.</p></div>
      <div><span class="x">&#10007;</span><p>Walang emoji, walang hashtag, walang phone number sa caption. Nasa About at Call button na ang number.</p></div>
      <div><span class="x">&#10007;</span><p>Wag sagutin ang comments bilang page. Si Neil o Zam ang sasagot.</p></div>
      <div><span class="ok">&#10003;</span><p>Isang post lang kada araw, 6:00 PM. Kapag may na-miss na araw, ituloy lang sa susunod na araw, wag magdoble.</p></div>
    </div>
  </section>
  <p class="foot mono">OCEANIDES &middot; LINGGO 1 &middot; STAMPED 2026-08-04</p>
</div>
<script>
  document.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var text = document.getElementById(btn.dataset.t).innerText;
      function done() {
        btn.classList.add('done'); btn.textContent = 'Nakopya!';
        setTimeout(function () { btn.classList.remove('done'); btn.textContent = 'Kopyahin'; }, 2000);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallback(); });
      } else { fallback(); }
      function fallback() {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); done(); } catch (e) {}
        document.body.removeChild(ta);
      }
    });
  });
</script>
`;

writeFileSync(OUT, html);
console.log('wrote ' + OUT + ' (' + (html.length / 1024 / 1024).toFixed(2) + ' MB)');
