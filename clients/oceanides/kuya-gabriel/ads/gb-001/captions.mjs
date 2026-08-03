#!/usr/bin/env node
// GB-001 caption generator — naglalabas ng drawtext filter chain para sa isang beat.
//
//   node captions.mjs --text "Kahit anong plunger, balik nang balik ang problema." --dur 3.14
//
// BAKIT SYA UMIIRAL
// P1, 11 corroborations, `applied`: **ANG PACE AY CAPTION CHURN, HINDI CUT RATE.**
// 1-3 salita kada chunk, bawat 0.4-0.6s, habang ang shot ay humahawak ng 4-7s.
// Kapag "mabagal" ang pakiramdam ng ad, hatiin muna ang caption bago mag-isip ng
// mas maraming eksena. Libre sya at hindi nya ginagalaw ang render.
// Ang GB-001 v1 ay WALANG caption. Isa yun sa anim na dahilan ng pagbagsak nya.
//
// FEED-SAFE: y=1267 (yFracTalking 0.66 sa drawPlan.ts). Nasa loob ng 285-1635.
// FACE-SAFE: nasa ibabang bahagi, malayo sa mukha sa lahat ng framing natin.
//
// ⚠️ HINDI PA GAWA: ang per-word invert ng `spotlight` preset. Kailangan nun ng
// per-word timing na wala tayo nang walang transcription. Ang chunk-pop ang
// mismong lever ng P1, at yun ang ginagawa dito. Huwag itong ipagpanggap na
// buong spotlight.

const argv = process.argv.slice(2);
const arg = (n) => { const i = argv.indexOf(n); return i >= 0 ? argv[i + 1] : undefined; };

const text = arg('--text') || '';
const dur = +(arg('--dur') || 0);
const start = +(arg('--start') || 0);
const font = arg('--font') || 'api/_lib/assets/fonts/Anton-Regular.ttf';
const y = +(arg('--y') || 1267);
const size = +(arg('--size') || 82);
if (!text || !dur) { console.error('kailangan ang --text at --dur'); process.exit(2); }

// Ang drawtext ay pumuputol sa apostrophe at sa colon (wala tayo nun — typography
// rule ng taglish-voice.md). Ang kuwit at percent ay kailangang i-escape.
const esc = (s) => s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, '').replace(/,/g, '\\,').replace(/%/g, '\\%');

// Ang kuwit at tuldok ay hangganan ng parirala (Neil, 2026-08-03): ang chunk na
// tumatawid sa kuwit ay pinagdidikit ang dalawang hininga sa isang pitik, at
// nababasa yun bilang mali kahit hindi mo kayang sabihin kung bakit.
const phrases = text.split(/[.,]/).map((p) => p.trim()).filter(Boolean);

// 1-2 salita kada chunk, sa LOOB lang ng parirala. Ang mahabang salita ay
// nag-iisa para hindi sya lumagpas sa gilid sa 82px na Anton.
const chunks = [];
const phraseOf = []; // saang parirala nakatali ang bawat chunk — bantay ng merge
phrases.forEach((ph, pi) => {
  const words = ph.split(/\s+/).filter(Boolean);
  for (let i = 0; i < words.length;) {
    const a = words[i], b = words[i + 1];
    if (b && (a.length + b.length) <= 13) { chunks.push(`${a} ${b}`); phraseOf.push(pi); i += 2; }
    else { chunks.push(a); phraseOf.push(pi); i += 1; }
  }
});

// Pantay na hati sa buong beat. Kapag mas maikli sa 0.40s ang bawat isa, hindi na
// sya nababasa — pinagsasama ang mga chunk hanggang umabot sa sahig, pero HINDI
// kailanman tatawid sa kuwit.
let per = dur / chunks.length;
while (per < 0.40 && chunks.length > 1) {
  let merged = false;
  for (let i = 0; i < chunks.length - 1; i++) {
    if (phraseOf[i] === phraseOf[i + 1] && (chunks[i] + chunks[i + 1]).length <= 20) {
      chunks.splice(i, 2, `${chunks[i]} ${chunks[i + 1]}`);
      phraseOf.splice(i + 1, 1);
      merged = true; break;
    }
  }
  if (!merged) break;
  per = dur / chunks.length;
}

const filters = chunks.map((c, i) => {
  const a = (start + i * per).toFixed(3);
  const b = (start + (i + 1) * per).toFixed(3);
  return [
    `drawtext=fontfile=${font}`,
    `text='${esc(c.toUpperCase())}'`,
    'fontcolor=white',
    `fontsize=${size}`,
    // Outline, HINDI solid na kahon — P2, 8 corroborations. Ang box ay `bars`
    // at `classic`, at iniiwasan natin silang dalawa.
    'borderw=8:bordercolor=0x0A1F45',
    'shadowx=0:shadowy=6:shadowcolor=0x071630@0.55',
    'x=(w-text_w)/2',
    `y=${y}`,
    `enable='between(t,${a},${b})'`,
  ].join(':');
});

process.stdout.write(filters.join(','));
