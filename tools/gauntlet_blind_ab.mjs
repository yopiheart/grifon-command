#!/usr/bin/env node
// Gauntlet blind A/B: forced-choice pairwise judging of two still images by a
// fresh-context Gemini vision critic, with the two controls the viral version
// of this loop leaves out.
//
// WHY THIS EXISTS
// The "Gauntlet Loop" pattern (builder sub-agent + blind critic sub-agent,
// iterate until the critic passes) is only as good as the critic. Before any
// verdict from a critic is allowed to gate work, we measure whether the critic
// is a measuring instrument or a coin with an opinion:
//
//   1. POSITION BIAS (--null)  Show the SAME image in both slots. A calibrated
//      judge lands at ~50/50. Any deviation is pure slot preference, since
//      there is no content difference to detect. This number is the error bar
//      on every real verdict the critic gives.
//   2. ORDER FLIP (default)    Every real pair is judged twice, A/B and B/A.
//      A judge with taste picks the same IMAGE both times. A judge without
//      taste picks the same SLOT both times. Agreement rate = self-consistency.
//
// Blindness is structural: images are sent inline as IMAGE 1 / IMAGE 2 with no
// filenames, no paths, and no brand context in the prompt.
//
// Usage:
//   node tools/gauntlet_blind_ab.mjs --a <img> --b <img> [--trials 6]
//        [--axis "which would stop a thumb"] [--model gemini-3.5-flash]
//   node tools/gauntlet_blind_ab.mjs --null <img> [--trials 6]
//
// Output: per-trial picks + a verdict block on stdout; JSON to
//   .tmp/gauntlet/<stamp>.json
// Exit: 0 ok, 1 usage error, 2 API/IO failure.
// Secrets: GEMINI_API_KEY from environment or repo-root .env.

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(REPO_ROOT, '.tmp', 'gauntlet');
const DEFAULT_MODEL = 'gemini-3.5-flash';
const MAX_EDGE = 1080;

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

const DEFAULT_AXIS =
  'stop a distracted person mid-scroll in a Facebook feed and make them read the next line';

async function toInline(path) {
  const buf = await sharp(resolve(REPO_ROOT, path))
    .resize({ width: MAX_EDGE, height: MAX_EDGE, fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 82 })
    .toBuffer();
  return { inlineData: { mimeType: 'image/jpeg', data: buf.toString('base64') } };
}

const buildPrompt = (axis) => `You are judging two candidate ad images blind. You have no information about who made either one, and no context beyond what you can see.

Pick the ONE image that would better ${axis}.

You must commit to a pick. "Both are similar", "it depends", and ties are not permitted. If the difference is genuinely marginal, still pick, and say so in your confidence.

Return ONLY JSON, no fences, no prose:
{
  "pick": 1 | 2,
  "confidence": "high" | "medium" | "coin-flip",
  "reason": "<one sentence, naming the specific visual thing that decided it>",
  "distinguishable": true | false
}
Set "distinguishable" to false if you believe the two images are identical or effectively identical.`;

async function judge(ai, model, imgA, imgB, axis) {
  const res = await ai.models.generateContent({
    model,
    contents: [{
      role: 'user',
      parts: [
        { text: buildPrompt(axis) },
        { text: 'IMAGE 1:' }, imgA,
        { text: 'IMAGE 2:' }, imgB,
      ],
    }],
    config: { temperature: 1.0, responseMimeType: 'application/json' },
  });
  const raw = (res.text ?? '').trim().replace(/^```(?:json)?|```$/g, '').trim();
  // The model occasionally appends a second object or trailing prose; take the
  // first balanced {...} block rather than failing the trial.
  let depth = 0, start = -1, end = -1;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '{') { if (depth === 0) start = i; depth++; }
    else if (raw[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
  }
  return JSON.parse(start > -1 && end > -1 ? raw.slice(start, end) : raw);
}

const pct = (n, d) => (d === 0 ? '0.0' : ((n / d) * 100).toFixed(1));

async function main() {
  const apiKey = loadEnvKey('GEMINI_API_KEY');
  if (!apiKey) { console.error('GEMINI_API_KEY not found in env or .env'); process.exit(2); }

  const nullImg = arg('--null');
  const pathA = nullImg ?? arg('--a');
  const pathB = nullImg ?? arg('--b');
  const trials = parseInt(arg('--trials', '6'), 10);
  const axis = arg('--axis', DEFAULT_AXIS);
  const model = arg('--model', DEFAULT_MODEL);

  if (!pathA || !pathB) {
    console.error('Usage: --a <img> --b <img> [--trials N] [--axis "..."]  |  --null <img>');
    process.exit(1);
  }

  const ai = new GoogleGenAI({ apiKey });
  const [inlineA, inlineB] = await Promise.all([toInline(pathA), toInline(pathB)]);

  const mode = nullImg ? 'NULL (position-bias control)' : 'REAL PAIR (order-flipped)';
  console.log(`\n  MODE   ${mode}`);
  console.log(`  MODEL  ${model}`);
  console.log(`  AXIS   ${axis}`);
  console.log(`  A      ${pathA}`);
  console.log(`  B      ${pathB}`);
  console.log(`  TRIALS ${trials} (${trials / 2} per orientation)\n`);

  const results = [];
  for (let i = 0; i < trials; i++) {
    // Even trials: A in slot 1. Odd trials: B in slot 1. Same pair, flipped.
    const flipped = i % 2 === 1;
    const [slot1, slot2] = flipped ? [inlineB, inlineA] : [inlineA, inlineB];
    try {
      const r = await judge(ai, model, slot1, slot2, axis);
      // Map slot pick back to the actual image identity.
      const winner = flipped
        ? (r.pick === 1 ? 'B' : 'A')
        : (r.pick === 1 ? 'A' : 'B');
      results.push({ trial: i + 1, flipped, slotPick: r.pick, winner, ...r });
      console.log(
        `  #${String(i + 1).padStart(2)}  order=${flipped ? 'B,A' : 'A,B'}  ` +
        `slot=${r.pick}  ->  ${winner}   [${r.confidence}]` +
        `${r.distinguishable === false ? '  (says identical)' : ''}\n      ${r.reason}`
      );
    } catch (e) {
      console.log(`  #${String(i + 1).padStart(2)}  FAILED: ${e.message}`);
      results.push({ trial: i + 1, flipped, error: e.message });
    }
  }

  const ok = results.filter((r) => !r.error);
  const slot1Picks = ok.filter((r) => r.slotPick === 1).length;
  const winA = ok.filter((r) => r.winner === 'A').length;
  const winB = ok.filter((r) => r.winner === 'B').length;
  const sawIdentical = ok.filter((r) => r.distinguishable === false).length;

  console.log(`\n  ${'-'.repeat(64)}`);
  console.log(`  SLOT PREFERENCE   slot1 ${slot1Picks}/${ok.length}  (${pct(slot1Picks, ok.length)}%)`);
  console.log(`  IMAGE PREFERENCE  A ${winA}  ·  B ${winB}`);
  if (nullImg) {
    const bias = Math.abs(50 - parseFloat(pct(slot1Picks, ok.length)));
    console.log(`  POSITION BIAS     ${bias.toFixed(1)} points off 50/50`);
    console.log(`  ADMITTED IDENTICAL ${sawIdentical}/${ok.length}`);
    console.log(`\n  READ: identical images, so every point of deviation is slot`);
    console.log(`  preference, not judgement. This is the error bar on any real verdict.`);
  } else {
    const majority = Math.max(winA, winB);
    console.log(`  SELF-CONSISTENCY  ${majority}/${ok.length} agree on the same IMAGE (${pct(majority, ok.length)}%)`);
    console.log(`\n  READ: a judge with taste converges on one IMAGE across both`);
    console.log(`  orders. A judge without taste converges on one SLOT instead.`);
  }
  console.log(`  ${'-'.repeat(64)}\n`);

  mkdirSync(OUT_DIR, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = join(OUT_DIR, `${stamp}.json`);
  writeFileSync(outPath, JSON.stringify(
    { mode, model, axis, a: pathA, b: pathB, trials, results,
      summary: { slot1Picks, winA, winB, sawIdentical, n: ok.length } },
    null, 2,
  ));
  console.log(`  saved  ${outPath}\n`);
}

main().catch((e) => { console.error(e); process.exit(2); });
