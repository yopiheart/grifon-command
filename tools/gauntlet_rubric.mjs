#!/usr/bin/env node
// Gauntlet rubric scorer — calibrated-band grading of ONE image at a time,
// on a named axis, repeated for variance.
//
// WHY THIS EXISTS (two findings, one design)
//
// 1. Position bias. tools/gauntlet_blind_ab.mjs measured a forced-choice pairwise
//    critic picking slot 1 in 21/21 trials, including on IDENTICAL images. Scoring
//    a single image alone has no slots, so that failure mode cannot occur. This is
//    the Kart Royale fix: they dropped "side by side, blind" for calibrated bands
//    in ART_DIRECTION.md and got an honest 62/100 instead of an inflated verdict.
//
// 2. Axis choice. The viral method optimizes toward whatever bar you name. Grifon
//    measured its Marvin cards on "stop a scroll" and they lost 0-8 three times --
//    but KM-003 already produced ~100 messages and 1 order, so attention was never
//    the bottleneck. A critic pointed at the wrong axis returns confident, precise,
//    useless answers. This tool takes --axis explicitly so the same images can be
//    re-ranked on a different question and the two rankings compared.
//
// Usage:
//   node tools/gauntlet_rubric.mjs --axis attention --runs 3 <img> [<img> ...]
//   node tools/gauntlet_rubric.mjs --axis trust --runs 3 <img> [<img> ...]
//   node tools/gauntlet_rubric.mjs --list-axes
//
// Output: per-image median score + band + evidence, ranked; JSON to
//   .tmp/gauntlet/rubric-<axis>-<stamp>.json
// Exit: 0 ok, 1 usage error, 2 API/IO failure.
// Secrets: GEMINI_API_KEY from environment or repo-root .env.

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(REPO_ROOT, '.tmp', 'gauntlet');
const DEFAULT_MODEL = 'gemini-3.5-flash';
const MAX_EDGE = 1080;

// ---------------------------------------------------------------------------
// Calibrated bands. Forked from the Kart Royale ART_DIRECTION.md pattern: named
// bands with concrete descriptors, plus an explicit anti-generosity clause. A
// bare 0-100 ask produces flattery; bands produce routable findings.
// ---------------------------------------------------------------------------
const BANDS = `SCORING BANDS (use these exact meanings, do not invent your own scale):
  0-40   Amateur. Actively works against the goal. A cold viewer would dismiss it.
  41-60  Generic. Technically fine, forgettable, indistinguishable from filler.
  61-75  Competent. Clearly professional, but nothing about it is memorable.
  76-87  Strong. Category-competitive. A good agency would ship this.
  88-100 Best in category. Sets the standard others copy. Rare.

CALIBRATION DISCIPLINE: most real professional work lands 55-75. If you feel
inclined to give 85, look harder for what is missing and justify it or lower it.
A score above 88 requires naming something specific and rare that earns it.
Do not be generous. A generous score is a useless score.`;

const AXES = {
  attention: {
    label: 'ATTENTION — stopping a distracted scroller',
    question: `How well would this image stop a distracted person mid-scroll in a social feed and make them read the next line? Judge interruption power only: does the eye catch, is there a curiosity gap, does it survive a fast thumb.`,
  },
  trust: {
    label: 'TRUST — credibility of the business behind it',
    question: `How much would this image make a cautious buyer trust the business behind it enough to hand over money and let its people do work on their property? Judge credibility only: does it look like a real, competent, accountable operator, or like something that would make a careful person hesitate. Loud attention-grabbing is NOT trust, and may cost trust.`,
  },
  // Idinagdag 2026-08-06 (Neil): "ang organic cards kay kuya marvin ay puro value
  // content na hindi nag bebenta tulad ng kay Fibo lim, russel brunson, at alex
  // hormozi style." Hindi ito nasusukat ng attention o ng trust — pwedeng
  // makapigil ng scroll at mapagkatiwalaan ang isang card at wala pa ring
  // hinihingi. Ang bar dito ay ang Brunson (E82-E93) at Hormozi (E63-E66) sa
  // swipe file, na tumatakbo naman ng MABABA sa trust. Sinasadya yun: magkaiba
  // ang trabaho ng dalawa, at yun ang punto ng paghihiwalay ng axis.
  sell: {
    label: 'SELL — paggalaw ng tao papunta sa isang alok',
    question: `Does this image do sales work, or does it only hand out free value? Judge whether it names a specific offer, gives a reason to act, makes clear what the business actually sells, and gives the viewer a next step. Pure education — tips, "4 signs that...", explainer content — scores LOW no matter how genuinely useful or well made it is, because it asks for nothing. A specific offer with a clear next step scores HIGH. Beauty, polish and trustworthiness are NOT selling.`,
  },
  // Idinagdag 2026-08-08 (Neil: profile picture ni Marvin para sa PERSONAL niyang
  // FB/IG/Viber). Wala sa tatlong axis sa taas ang tanong dito. Ang `trust` ay
  // tanong tungkol sa NEGOSYONG nasa likod ng imahe — tama yun para sa ad o card,
  // pero mali ang KLASE para sa isang personal na profile photo, at ang mali na
  // klase ang tatlong beses nang tumama sa atin (tingnan ang Correction 2 sa
  // gauntlet_loop_decision.md). Ang trabaho ng isang PFP ay iisa: paniwalaan kang
  // totoong tao, at gustuhin kang kausapin. Ang bar dito ay HINDI ang ad swipe
  // file — mga TOTOONG litrato ni Marvin (refs/) at ang 8 Neil-approved frames.
  pfp: {
    label: 'PFP — totoong tao sa personal na profile photo',
    question: `Is this believably a real person's own profile photo on a personal Facebook / Instagram / Viber account, and does the person read as someone decent you would be glad to hear from? Judge two things only. (1) REALNESS: does it look like an actual photo an actual phone took of an actual person — or does it betray itself as AI-generated, stock, or studio-produced? Look for the tells: waxy or airbrushed skin, a face sharper or brighter than the body, a head that does not sit on its neck, background blur that no phone would produce, impossible lighting, invented text or logos. (2) THE PERSON: warmth, decency, competence — would you accept a friend request or trust a message from him. Advertising polish, dramatic lighting, and professional production LOWER the score, no matter how attractive the result: a profile photo that looks produced looks fake, and a fake profile photo has failed at its only job. A plain, slightly imperfect, genuinely photographed picture of a warm person outranks a beautiful one.`,
  },
  // Idinagdag 2026-08-08, ilang minuto matapos ang `pfp` sa taas (Neil: "wala bang
  // parang polished at ibat ibang camera lens? Kasi UGC style to eh"). HINDI ito
  // pareho ng `pfp`. Aktibong PINAPARUSAHAN ng `pfp` ang polish — tama yun doon,
  // kasi ang trabaho ng isang UGC profile photo ay magmukhang hindi ginawa. Dito
  // baligtad: hinihingi ang craft. Magkaibang tanong, kaya magkahiwalay na axis —
  // huwag pagsamahin, at huwag ding gamitin ang isa para husgahan ang kabila.
  //
  // ⚠️ WALANG BAR ANG AXIS NA ITO. Puro raw-UGC ang 8 Neil-approved frames at puro
  // bayad na ad ang 78 sa assets/ad-swipe/. Walang koleksyon ng magagandang
  // portrait sa repo na kayang buksan ng critic, kaya RANGGO lang ang maibibigay
  // nito, hindi "natalo natin ang X." Per STEP 1 ng gauntlet-loop: kung hindi
  // mabubuksan, hindi yun bar. Mata ni Neil ang bar dito hangga't wala pang corpus.
  portrait: {
    label: 'PORTRAIT — polished na portrait ng totoong tao',
    question: `How good is this as a POLISHED portrait of a real man, used as his personal profile picture? Judge photographic craft: is the light deliberately shaped (direction, softness, falloff, catchlights) or merely available; does the lens do real work (perspective, compression, genuine background separation); is the composition, colour and skin rendering considered; and does the subject have presence — does he read as confident, warm, and worth knowing. Craft is REWARDED here: a flat snapshot with no shaped light scores LOW no matter how authentic it feels. But it must still be a believable photograph of a real man — AI tells are disqualifying and cap the score in the generic band no matter how pretty the result: waxy or beauty-filtered skin with no pores, a face sharper or brighter than the body, a head that does not sit on its neck, background blur with no optical logic, warped hands or ears, invented text or logos. Retouched into a different, smoother man is a FAILURE, not polish.`,
  },
};

function loadEnvKey(name) {
  if (process.env[name]) return process.env[name];
  try {
    const envText = readFileSync(resolve(REPO_ROOT, '.env'), 'utf8');
    for (const line of envText.split(/\r?\n/)) {
      const t = line.trim();
      if (t.startsWith(`${name}=`)) {
        return t.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '');
      }
    }
  } catch { /* no .env */ }
  return null;
}

function arg(flag, fallback = null) {
  const i = process.argv.indexOf(flag);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

async function toInline(path) {
  const buf = await sharp(resolve(REPO_ROOT, path))
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { inlineData: { mimeType: 'image/jpeg', data: buf.toString('base64') } };
}

const buildPrompt = (axis) => `You are grading ONE image against a calibrated standard. You are not comparing it to another image. You have no information about who made it.

AXIS UNDER TEST — ${AXES[axis].label}
${AXES[axis].question}

${BANDS}

Return ONLY JSON, no fences, no prose:
{
  "score": <integer 0-100>,
  "band": "amateur" | "generic" | "competent" | "strong" | "best-in-category",
  "evidence": "<the specific visible thing that set the score — quote on-image text or name a concrete visual element>",
  "biggest_gap": "<the single largest thing holding it back on THIS axis, one sentence>"
}`;

function parseFirstJson(raw) {
  const t = raw.trim().replace(/^```(?:json)?|```$/g, '').trim();
  let depth = 0, start = -1;
  for (let i = 0; i < t.length; i++) {
    if (t[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (t[i] === '}') { depth--; if (depth === 0) return JSON.parse(t.slice(start, i + 1)); }
  }
  return JSON.parse(t);
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
};

async function main() {
  if (process.argv.includes('--list-axes')) {
    for (const [k, v] of Object.entries(AXES)) console.log(`  ${k.padEnd(10)} ${v.label}`);
    return;
  }

  const apiKey = loadEnvKey('GEMINI_API_KEY');
  if (!apiKey) { console.error('GEMINI_API_KEY not found in env or .env'); process.exit(2); }

  const axis = arg('--axis');
  const runs = parseInt(arg('--runs', '3'), 10);
  const model = arg('--model', DEFAULT_MODEL);
  const images = process.argv.slice(2).filter((a) => !a.startsWith('--') && /\.(png|jpe?g|webp)$/i.test(a));

  if (!axis || !AXES[axis] || images.length === 0) {
    console.error('Usage: --axis <attention|trust|sell|pfp> [--runs N] <img> [<img> ...]');
    console.error('       --list-axes');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  console.log(`\n  AXIS   ${AXES[axis].label}`);
  console.log(`  MODEL  ${model}`);
  console.log(`  CALLS  ${images.length * runs} (${images.length} images x ${runs} runs)\n`);

  const rows = [];
  for (const img of images) {
    const inline = await toInline(img);
    const scores = [], notes = [];
    for (let r = 0; r < runs; r++) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: [{ role: 'user', parts: [{ text: buildPrompt(axis) }, inline] }],
          config: { temperature: 1.0, responseMimeType: 'application/json' },
        });
        const j = parseFirstJson(res.text ?? '');
        scores.push(j.score);
        notes.push(j);
      } catch (e) {
        console.log(`    ${basename(img)} run ${r + 1} FAILED: ${e.message}`);
      }
    }
    if (!scores.length) { console.log(`  ${basename(img)}: all runs failed`); continue; }
    const med = median(scores);
    const spread = Math.max(...scores) - Math.min(...scores);
    const rep = notes[scores.indexOf(med)] ?? notes[0];
    rows.push({ image: img, name: basename(img), median: med, scores, spread, ...rep });
    console.log(`  ${basename(img).padEnd(34)} ${String(med).padStart(3)}  [${scores.join(',')}] spread ${spread}  ${rep.band}`);
    console.log(`      ${rep.evidence}`);
    console.log(`      gap: ${rep.biggest_gap}\n`);
  }

  rows.sort((a, b) => b.median - a.median);
  console.log(`  ${'-'.repeat(64)}`);
  console.log(`  RANKING on ${axis.toUpperCase()}`);
  rows.forEach((r, i) => console.log(`   ${i + 1}. ${String(r.median).padStart(3)}  ${r.name}`));
  console.log(`  ${'-'.repeat(64)}\n`);

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = join(OUT_DIR, `rubric-${axis}-${stamp}.json`);
  writeFileSync(outPath, JSON.stringify({ axis, model, runs, rows }, null, 2));
  console.log(`  saved  ${outPath}\n`);
}

main().catch((e) => { console.error(e); process.exit(2); });
