#!/usr/bin/env node
// FINAL_RENDER QA reviewer: have Gemini watch a rendered ad and return a
// defect report JSON (VO accent, caption lag, AI-slop artifacts, overlay
// placement, dead air). Born 2026-06-13 reviewing Neil's The-Ordinary render;
// promoted from .tmp so every future render can be machine-watched before a
// human burns time on it.
//
// Node, not Python: the cafe-PC defreezer wipes Python entirely (pip
// self-install can't save you when the interpreter itself is gone), while
// node_modules/@google/genai ships with the repo's npm install. Same WAT
// "deterministic execution" layer, survivable runtime.
//
// Usage:
//   node tools/render_qa.mjs <video-path-or-https-url> [--focus "extra concerns"]
//
// Output: QA JSON on stdout, also written to .tmp/render-qa/<basename>.json
// Exit codes: 0 ok, 1 usage error, 2 download/API failure.
// Secrets: GEMINI_API_KEY from environment or repo-root .env.

import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(REPO_ROOT, '.tmp', 'render-qa');
const MODEL = 'gemini-3.5-flash';

const buildPrompt = (focus) => `You are a meticulous video-ad QA reviewer. Watch AND listen to this entire machine-generated ad (often Taglish — Filipino+English) before answering. Hunt for defects a paying business owner would reject.

Scene boundaries are hard cuts between distinct AI-generated clips (roughly 8s each).

Check EVERY category with timestamps and verbatim/visual evidence:

1. VO ACCENT: Tagalog words read with an English/American accent anywhere? Quote the opening sentence verbatim as heard — the engine locks accent from the opening words.
2. TRANSITIONS & GENERATIVE SLOP: morphing objects, impossible physics, cheap-looking start→end frame interpolation inside any scene.
3. CAPTION/LIP-SYNC LAG: per scene, estimate the lag between when a word is SPOKEN vs when its caption APPEARS. Flag every scene where captions trail audio by >0.3s.
4. PRODUCT CONTINUITY: does a held/shown product float, vanish, duplicate, change label, or behave impossibly anywhere?
5. PRONUNCIATION ARTIFACTS: any word pronounced unnaturally stretched or respelled-sounding; any odd spellings burned into captions.
6. OVERLAY PLACEMENT: does any text overlay (offer, price, recap, caption) cover a person's face or sit outside safe margins? Timestamp + screen position.
7. DEAD AIR: every silence/static stretch >1s (timestamp + duration), especially scene tails.
8. ANYTHING ELSE: caption typos, audio glitches, garbled label text, repeated identical sound effects, AI-slop tells.
${focus ? `\nEXTRA FOCUS FOR THIS RUN: ${focus}\n` : ''}
Return ONLY JSON (no fences, no prose):
{
  "duration_s": <number>,
  "scene_cut_timestamps": [<seconds>...],
  "opening_voiceover_verbatim": "<exact first sentence as heard>",
  "issues": [
    {"id": "<1-8>", "confirmed": <bool>, "severity": "<critical|major|minor|none>",
     "timestamps": ["<mm:ss or s range>"...], "evidence": "<specific, verbatim/visual detail>",
     "notes": "<anything that qualifies the verdict>"}
  ],
  "overall_grade": "<A-F>",
  "top_3_fixes_by_impact": ["<fix>", "<fix>", "<fix>"]
}`;

function loadEnvKey(name) {
  if (process.env[name]) return process.env[name];
  try {
    const envText = readFileSync(resolve(REPO_ROOT, '.env'), 'utf8');
    for (const line of envText.split(/\r?\n/)) {
      const t = line.trim();
      if (t.startsWith(`${name}=`)) return t.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  } catch { /* no .env */ }
  return null;
}

const args = process.argv.slice(2);
const focusIdx = args.indexOf('--focus');
const focus = focusIdx >= 0 ? args[focusIdx + 1] : '';
const target = args.find((a) => a !== '--focus' && a !== focus);
if (!target) {
  console.error('usage: node tools/render_qa.mjs <video-path-or-https-url> [--focus "extra concerns"]');
  process.exit(1);
}

const apiKey = loadEnvKey('GEMINI_API_KEY');
if (!apiKey) { console.error('GEMINI_API_KEY not found (env or .env)'); process.exit(2); }

mkdirSync(OUT_DIR, { recursive: true });

// URL → download to .tmp first (Gemini Files API wants a local file).
let videoPath = target;
if (/^https?:\/\//i.test(target)) {
  videoPath = join(OUT_DIR, 'download.mp4');
  console.error(`[download] ${target.slice(0, 80)}...`);
  const r = await fetch(target);
  if (!r.ok) { console.error(`DOWNLOAD_FAILED: HTTP ${r.status}`); process.exit(2); }
  writeFileSync(videoPath, Buffer.from(await r.arrayBuffer()));
}

const ai = new GoogleGenAI({ apiKey });
console.error(`[upload] ${videoPath}`);
let file = await ai.files.upload({ file: videoPath, config: { mimeType: 'video/mp4' } });
const deadline = Date.now() + 300_000;
while (file.state === 'PROCESSING') {
  if (Date.now() > deadline) { console.error('UPLOAD_TIMEOUT'); process.exit(2); }
  await new Promise((r) => setTimeout(r, 4000));
  file = await ai.files.get({ name: file.name });
}
if (file.state === 'FAILED') { console.error('UPLOAD_FAILED'); process.exit(2); }

console.error(`[analyze] model=${MODEL}`);
const response = await ai.models.generateContent({
  model: MODEL,
  contents: [
    { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
    { text: buildPrompt(focus) },
  ],
  config: { responseMimeType: 'application/json', temperature: 0.2 },
});
const text = (response.text || '').trim().replace(/^```[a-z]*\s*|\s*```$/g, '');
let parsed;
try { parsed = JSON.parse(text); }
catch (e) { console.error(`BAD_MODEL_JSON: ${e.message} — first 300: ${text.slice(0, 300)}`); process.exit(2); }
const outPath = join(OUT_DIR, `${basename(videoPath).replace(/\.[^.]+$/, '')}.json`);
writeFileSync(outPath, JSON.stringify(parsed, null, 2), 'utf8');
console.error(`[done] ${outPath}`);
console.log(JSON.stringify(parsed, null, 2));
