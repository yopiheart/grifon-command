#!/usr/bin/env node
// Reference-Stack 3-model shootout harness (believability-refstack Phase 4).
//
// Given N shootout cases (each a model-ref + style-ref + short prompt), drive the
// SAME dual-reference technique through three lanes and blind-judge the results:
//   lane 1  gemini  — direct v1beta REST, two inline refs + prompt (PAID, gated)
//   lane 2  codex   — .claude/skills/codex-image/generate.mjs on an hstack panel
//                     composite (single --edit slot; $0 on the ChatGPT plan)
//   lane 3  muse    — a manual meta.ai run sheet Neil executes by hand (free)
// then anonymize -> blind grade -> unblind tally.
//
// Node, not Python: the cafe-PC defreezer wipes Python; Node ships fetch (>=18) +
// ffmpeg-static is already in node_modules. No new npm dependencies. This file
// NEVER touches services/geminiService.ts — it uses the brother's prompts, not the
// app's tuned ones (mirrors tools/eval_scene_image_models.mjs transport).
//
// Subcommands:
//   plan                 print cases + prompts, no calls
//   composite [--only c] ffmpeg hstack model-ref + style-ref -> composite/<case>.png
//   gemini [--only c] [--yes]  DRY-RUN by default; --yes fires the PAID image call
//   codex  [--only c]    spawn the codex-image dispatcher on the composite ($0)
//   musesheet            write workflows/believability-refstack/muse-run-sheet.md
//   anonymize [--seed N] [--partial]  shuffle 3 lanes -> A/B/C + key.json + sheet
//   tally --key <key.json> [--grades <sheet.md>] [--judge-dir <dir>]  unblind
//
// Usage:
//   node tools/shootout_refstack.mjs plan
//   node tools/shootout_refstack.mjs composite --only c01
//   node tools/shootout_refstack.mjs gemini --only c01           # dry-run
//   node tools/shootout_refstack.mjs gemini --only c01 --yes     # PAID
//   node tools/shootout_refstack.mjs codex --only c01
//   node tools/shootout_refstack.mjs anonymize --seed 42
//   node tools/shootout_refstack.mjs tally --key .tmp/refstack/shootout/judging/key.json \
//     --grades .tmp/refstack/shootout/judging/grading-sheet.md
//
// Secrets: GEMINI_API_KEY from environment or repo-root .env.
// Exit codes: 0 ok, 1 usage/input error, 2 API/ffmpeg/codex failure.

import {
  readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync,
} from 'node:fs';
import { resolve, dirname, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import ffmpegPath from 'ffmpeg-static';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CASES_FILE = join(REPO_ROOT, 'workflows', 'believability-refstack', 'shootout-cases.json');
const SHOOT_DIR = join(REPO_ROOT, '.tmp', 'refstack', 'shootout');
const COMPOSITE_DIR = join(SHOOT_DIR, 'composite');
const GEMINI_DIR = join(SHOOT_DIR, 'outputs', 'gemini');
const CODEX_DIR = join(SHOOT_DIR, 'outputs', 'codex');
const MUSE_DIR = join(SHOOT_DIR, 'outputs', 'muse');
const JUDGING_DIR = join(SHOOT_DIR, 'judging');
const MANIFEST_FILE = join(SHOOT_DIR, 'manifest.json');
const MUSE_SHEET = join(REPO_ROOT, 'workflows', 'believability-refstack', 'muse-run-sheet.md');
const CODEX_GEN = join(REPO_ROOT, '.claude', 'skills', 'codex-image', 'generate.mjs');

const GEMINI_MODEL = 'gemini-3.1-flash-lite-image';
const GEMINI_FALLBACK = 'gemini-3.1-flash-image-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CALL_TIMEOUT_MS = 90_000;

const SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
];

// The two reference-role framings. Two-image (gemini/muse) vs single-panel (codex).
const TWO_REF_PREFIX =
  'Reference Image 1 = the PERSON. Reference Image 2 = the SCENE/STYLE. ' +
  'Recreate the scene of Reference Image 2 — its lighting, skin rendering, posing, ' +
  'camera angle, background, and any text overlays — but the person in the output ' +
  'MUST be the woman from Reference Image 1: her exact face, facial geometry, and ' +
  'hair. Do NOT keep the face of the person shown in Reference Image 2; she is ' +
  'replaced by the woman from Reference Image 1. ';
const PANEL_PREFIX =
  'The input image is a two-panel reference sheet. LEFT panel = the PERSON ' +
  '(identity ground truth). RIGHT panel = the SCENE/STYLE. Recreate the right ' +
  'panel\'s scene — lighting, skin rendering, posing, camera angle, background, ' +
  'any text overlays — but the person in the output MUST be the woman from the ' +
  'LEFT panel: her exact face, facial geometry, and hair. Do NOT keep the face of ' +
  'the person in the right panel; she is replaced. Generate ONE single new ' +
  'photograph — do NOT reproduce the two-panel layout. ';
const MUSE_PREFIX =
  'First image = the person. Second image = the scene/style. Recreate the second ' +
  'image\'s scene (lighting, skin, pose, camera angle, background, text overlays) ' +
  'but the person MUST be the woman from the first image — her exact face and ' +
  'hair. Do not keep the face of the person in the second image. ';

const die = (msg, code = 1) => { console.error(`[shootout] ${msg}`); process.exit(code); };
const ensureDir = (d) => mkdirSync(d, { recursive: true });

function parseFlags(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--only') flags.only = argv[++i];
    else if (a === '--yes') flags.yes = true;
    else if (a === '--seed') flags.seed = parseInt(argv[++i], 10);
    else if (a === '--partial') flags.partial = true;
    else if (a === '--key') flags.key = argv[++i];
    else if (a === '--grades') flags.grades = argv[++i];
    else if (a === '--judge-dir') flags.judgeDir = argv[++i];
  }
  return flags;
}

function loadCases() {
  if (!existsSync(CASES_FILE)) {
    die(
      `no shootout cases file at:\n    ${CASES_FILE}\n` +
      '  Create it first. Expected shape:\n' +
      '    {\n' +
      '      "cases": [\n' +
      '        {\n' +
      '          "id": "c01",\n' +
      '          "triplet": "t07",\n' +
      '          "model_ref": "workflows/believability-samples/refstack/shootout-refs/c01-model.png",\n' +
      '          "style_ref": "workflows/believability-samples/refstack/shootout-refs/c01-style.png",\n' +
      '          "prompt": "<the short generation prompt>",\n' +
      '          "notes": "why this case is in the set"\n' +
      '        }\n' +
      '      ]\n' +
      '    }\n' +
      '  (Phase 4 curates 6 cases from the aggregate; the 12 ref images live under\n' +
      '   workflows/believability-samples/refstack/shootout-refs/ so they survive a wipe.)',
    );
  }
  let data;
  try { data = JSON.parse(readFileSync(CASES_FILE, 'utf8')); }
  catch (e) { die(`bad JSON in ${CASES_FILE}: ${e.message}`); }
  const cases = data?.cases;
  if (!Array.isArray(cases) || !cases.length) die(`${CASES_FILE} has no "cases" array`);
  return cases;
}

function selectCases(cases, only) {
  if (!only) return cases;
  const sel = cases.filter((c) => c.id === only);
  if (!sel.length) die(`--only "${only}" matched no case (ids: ${cases.map((c) => c.id).join(', ')})`);
  return sel;
}

function refPath(p) {
  // Cases store repo-relative paths; resolve against the repo root.
  const abs = resolve(REPO_ROOT, p);
  if (!existsSync(abs)) die(`reference image not found: ${p} (resolved ${abs})`);
  return abs;
}

function mimeFor(p) {
  const e = extname(p).toLowerCase();
  if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
  if (e === '.webp') return 'image/webp';
  return 'image/png';
}

function inlineData(p) {
  return { inlineData: { mimeType: mimeFor(p), data: readFileSync(p).toString('base64') } };
}

function loadEnvKey(name) {
  if (process.env[name]) return process.env[name];
  try {
    const text = readFileSync(join(REPO_ROOT, '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const t = line.trim();
      if (t.startsWith(`${name}=`)) return t.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  } catch { /* no .env */ }
  return null;
}

function readManifest() {
  if (!existsSync(MANIFEST_FILE)) return { runs: [] };
  try { return JSON.parse(readFileSync(MANIFEST_FILE, 'utf8')); }
  catch { return { runs: [] }; }
}

function appendManifest(entry) {
  ensureDir(SHOOT_DIR);
  const m = readManifest();
  if (!Array.isArray(m.runs)) m.runs = [];
  m.runs.push(entry);
  writeFileSync(MANIFEST_FILE, JSON.stringify(m, null, 2));
}

// Seeded PRNG (mulberry32) so anonymize shuffles reproducibly from --seed.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(arr, rnd) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---------------------------------------------------------------------------
// gemini REST (mirror eval_scene_image_models.mjs transport)
// ---------------------------------------------------------------------------

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGeminiOnce(modelId, parts, apiKey) {
  const body = {
    contents: [{ parts }],
    generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    safetySettings: SAFETY_SETTINGS,
  };
  const url = `${API_BASE}/${modelId}:generateContent?key=${apiKey}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } finally { clearTimeout(timer); }

  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
    err.status = res.status;
    throw err;
  }
  const blockReason = json?.promptFeedback?.blockReason || null;
  const finishReason = json?.candidates?.[0]?.finishReason || null;
  const parts_ = json?.candidates?.[0]?.content?.parts ?? [];
  let imageB64 = null;
  for (const p of parts_) if (p.inlineData?.data && !imageB64) imageB64 = p.inlineData.data;
  return { imageB64, blockReason, finishReason };
}

async function callGeminiRetry(modelId, parts, apiKey) {
  const backoffs = [2000, 8000];
  let lastErr;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { return await callGeminiOnce(modelId, parts, apiKey); }
    catch (e) {
      lastErr = e;
      const retryable = e.status === 429 || (e.status >= 500 && e.status < 600) || e.name === 'AbortError';
      if (!retryable || attempt === 2) throw e;
      console.log(`  [retry] ${modelId} attempt ${attempt + 1} (${e.status ?? e.name}); waiting ${backoffs[attempt]}ms`);
      await sleep(backoffs[attempt]);
    }
  }
  throw lastErr;
}

// ---------------------------------------------------------------------------
// subcommands
// ---------------------------------------------------------------------------

function cmdPlan() {
  const cases = loadCases();
  console.log(`\n=== reference-stack shootout plan — ${cases.length} case(s) ===\n`);
  for (const c of cases) {
    console.log(`[${c.id}] triplet=${c.triplet ?? '—'}`);
    console.log(`  model_ref: ${c.model_ref}`);
    console.log(`  style_ref: ${c.style_ref}`);
    console.log(`  prompt:    ${c.prompt}`);
    if (c.notes) console.log(`  notes:     ${c.notes}`);
    console.log('');
  }
  console.log('No API calls made. Next: composite -> gemini --yes / codex / musesheet.');
}

function cmdComposite(flags) {
  const cases = selectCases(loadCases(), flags.only);
  ensureDir(COMPOSITE_DIR);
  for (const c of cases) {
    const model = refPath(c.model_ref);
    const style = refPath(c.style_ref);
    const out = join(COMPOSITE_DIR, `${c.id}.png`);
    // Scale both panels to a matched height (1024), keep aspect, then hstack.
    const fc = '[0:v]scale=-2:1024[a];[1:v]scale=-2:1024[b];[a][b]hstack=inputs=2';
    try {
      execFileSync(ffmpegPath, [
        '-y', '-loglevel', 'error', '-i', model, '-i', style,
        '-filter_complex', fc, '-frames:v', '1', out,
      ], { stdio: ['ignore', 'inherit', 'inherit'] });
    } catch (e) {
      die(`ffmpeg hstack failed for ${c.id}: ${e.message}`, 2);
    }
    console.log(`[composite] ${c.id} -> ${out}`);
  }
}

async function cmdGemini(flags) {
  const cases = selectCases(loadCases(), flags.only);
  const dryRun = !flags.yes;
  const apiKey = loadEnvKey('GEMINI_API_KEY');
  if (!dryRun && !apiKey) die('GEMINI_API_KEY not found (env or .env). Use dry-run (omit --yes) to plan.', 2);
  ensureDir(GEMINI_DIR);

  console.log(`\n=== gemini lane ${dryRun ? '(DRY RUN — no API calls)' : '(PAID — --yes given)'} ===\n`);
  for (const c of cases) {
    const promptText = TWO_REF_PREFIX + c.prompt;
    const model = refPath(c.model_ref);
    const style = refPath(c.style_ref);
    const out = join(GEMINI_DIR, `${c.id}-01.png`);

    if (dryRun) {
      console.log(`--- [DRY] ${c.id} | model ${GEMINI_MODEL} | parts=3 (2 refs + text)`);
      console.log(`  refs: ${c.model_ref} , ${c.style_ref}`);
      console.log(`  text: ${promptText}`);
      console.log('  est cost: ~$0.10-0.20 / image. Re-run with --yes to execute.\n');
      continue;
    }

    const parts = [inlineData(model), inlineData(style), { text: promptText }];
    let usedModel = GEMINI_MODEL;
    let result;
    try {
      result = await callGeminiRetry(GEMINI_MODEL, parts, apiKey);
      // Safety block or empty candidate -> fall back to the -preview model.
      if (!result.imageB64 && (result.blockReason || result.finishReason === 'SAFETY' || result.finishReason === 'PROHIBITED_CONTENT')) {
        console.log(`  [fallback] ${c.id} blocked/empty on ${GEMINI_MODEL} (${result.blockReason || result.finishReason}) — trying ${GEMINI_FALLBACK}`);
        usedModel = GEMINI_FALLBACK;
        result = await callGeminiRetry(GEMINI_FALLBACK, parts, apiKey);
      }
    } catch (e) {
      console.log(`  [err] ${c.id}: ${e.message}`);
      appendManifest({ case: c.id, lane: 'gemini', model: usedModel, timestamp: new Date().toISOString(), path: null, error: e.message });
      continue;
    }
    if (!result.imageB64) {
      console.log(`  [nofx] ${c.id}: no image returned (${result.blockReason || result.finishReason || 'unknown'})`);
      appendManifest({ case: c.id, lane: 'gemini', model: usedModel, timestamp: new Date().toISOString(), path: null, error: 'no_image_part' });
      continue;
    }
    writeFileSync(out, Buffer.from(result.imageB64, 'base64'));
    console.log(`  [ok] ${c.id} (${usedModel}) -> ${out}`);
    appendManifest({ case: c.id, lane: 'gemini', model: usedModel, timestamp: new Date().toISOString(), path: relOut(out) });
  }
}

function relOut(abs) {
  return abs.startsWith(REPO_ROOT) ? abs.slice(REPO_ROOT.length + 1).split('\\').join('/') : abs;
}

function cmdCodex(flags) {
  const cases = selectCases(loadCases(), flags.only);
  if (!existsSync(CODEX_GEN)) die(`codex-image dispatcher not found at ${CODEX_GEN}`, 2);
  ensureDir(CODEX_DIR);

  for (const c of cases) {
    const composite = join(COMPOSITE_DIR, `${c.id}.png`);
    if (!existsSync(composite)) {
      die(`missing composite for ${c.id} — run: node tools/shootout_refstack.mjs composite --only ${c.id}`, 1);
    }
    const out = join(CODEX_DIR, `${c.id}-01.png`);
    const promptText = PANEL_PREFIX + c.prompt;
    console.log(`[codex] ${c.id} (edit composite -> single frame)…`);
    const run = spawnSync('node', [
      CODEX_GEN, '--edit', composite, '--prompt', promptText, '--out', out, '--size', '1024x1536',
    ], { stdio: ['ignore', 'inherit', 'inherit'] });
    if (run.error) die(`failed to spawn codex generate.mjs: ${run.error.message}`, 2);
    if (run.status !== 0 || !existsSync(out)) {
      console.log(`  [warn] ${c.id} codex lane produced no file (exit ${run.status}).`);
      appendManifest({ case: c.id, lane: 'codex', model: 'gpt-image-2', timestamp: new Date().toISOString(), path: null, error: `exit_${run.status}` });
      continue;
    }
    console.log(`  [ok] ${c.id} -> ${out}`);
    appendManifest({ case: c.id, lane: 'codex', model: 'gpt-image-2', timestamp: new Date().toISOString(), path: relOut(out) });
  }
}

function cmdMuseSheet() {
  const cases = loadCases();
  ensureDir(dirname(MUSE_SHEET));
  const L = [];
  L.push('# Meta Muse run sheet — reference-stack shootout (lane 3, manual)');
  L.push('');
  L.push('Neil runs these by hand at https://www.meta.ai/ — Muse is the third lane in the');
  L.push('3-model shootout (gemini + codex are automated). **Blind protocol:** save the');
  L.push('outputs with the exact names below; do NOT rename by model — the `anonymize` step');
  L.push('shuffles all three lanes into A/B/C so no judge (including you) knows which model');
  L.push('made which image until `tally` unblinds.');
  L.push('');
  L.push('Preferred mode is TWO separate reference attachments (person + style). If meta.ai');
  L.push('only accepts a single attachment, use the composite fallback noted per case and');
  L.push('tick the "mode used" box so the verdict records how each case was produced.');
  L.push('');
  for (const c of cases) {
    L.push(`## ${c.id}${c.triplet ? ` (from triplet ${c.triplet})` : ''}`);
    if (c.notes) L.push(`*${c.notes}*`);
    L.push('');
    L.push('**Two-reference mode (preferred):**');
    L.push('- Upload image 1 (the PERSON): `' + c.model_ref + '`');
    L.push('- Upload image 2 (the STYLE): `' + c.style_ref + '`');
    L.push('- Paste this prompt:');
    L.push('  > ' + (MUSE_PREFIX + c.prompt).replace(/\n/g, ' '));
    L.push('');
    L.push('**Composite fallback (if meta.ai takes only one attachment):**');
    L.push('- Upload the single panel: `.tmp/refstack/shootout/composite/' + c.id + '.png`');
    L.push('  (make it first with: `node tools/shootout_refstack.mjs composite --only ' + c.id + '`)');
    L.push('- Paste this prompt:');
    L.push('  > ' + (PANEL_PREFIX + c.prompt).replace(/\n/g, ' '));
    L.push('');
    L.push('**Save as:** `.tmp/refstack/shootout/outputs/muse/' + c.id + '-muse-01.png`');
    L.push('');
    L.push('**Mode used:**  ☐ two-ref   ☐ composite');
    L.push('');
    L.push('---');
    L.push('');
  }
  writeFileSync(MUSE_SHEET, L.join('\n'));
  console.log(`[musesheet] wrote ${MUSE_SHEET} (${cases.length} case(s))`);
}

function laneFileFor(lane, caseId) {
  if (lane === 'gemini') return join(GEMINI_DIR, `${caseId}-01.png`);
  if (lane === 'codex') return join(CODEX_DIR, `${caseId}-01.png`);
  return join(MUSE_DIR, `${caseId}-muse-01.png`); // muse
}

function cmdAnonymize(flags) {
  const cases = loadCases();
  const seed = Number.isFinite(flags.seed) ? flags.seed : 42;
  const rnd = mulberry32(seed);
  ensureDir(JUDGING_DIR);

  const LANES = ['gemini', 'codex', 'muse'];
  const LETTERS = ['A', 'B', 'C'];

  // Presence check first (list ALL missing before deciding to proceed).
  const missing = [];
  for (const c of cases) {
    for (const lane of LANES) {
      if (!existsSync(laneFileFor(lane, c.id))) missing.push(`${c.id}/${lane}`);
    }
  }
  if (missing.length && !flags.partial) {
    die(
      `missing lane outputs (need all 3 lanes per case):\n    ${missing.join('\n    ')}\n` +
      '  Produce them (gemini --yes / codex / Neil\'s Muse run), or pass --partial to ' +
      'anonymize only the fully-complete cases.',
      1,
    );
  }

  const key = { seed, cases: {} };
  const sheetRows = [];
  let done = 0;
  for (const c of cases) {
    const present = LANES.filter((lane) => existsSync(laneFileFor(lane, c.id)));
    if (present.length < 3 && !flags.partial) continue;
    if (present.length < 2) {
      console.log(`[anonymize] ${c.id}: only ${present.length}/3 lanes present — skipping (need >=2 to compare)`);
      continue;
    }
    if (present.length < 3) {
      console.log(`[anonymize] ${c.id}: ${present.length}/3 lanes present — anonymizing as a ${present.length}-way case (--partial)`);
    }
    const shuffled = seededShuffle(present, rnd);
    key.cases[c.id] = {};
    shuffled.forEach((lane, i) => {
      const letter = LETTERS[i];
      const src = laneFileFor(lane, c.id);
      const dst = join(JUDGING_DIR, `${c.id}-${letter}.png`);
      copyFileSync(src, dst);
      key.cases[c.id][letter] = { lane, source: relOut(src) };
      sheetRows.push(`${c.id}-${letter}.png`);
    });
    done++;
  }

  writeFileSync(join(JUDGING_DIR, 'key.json'), JSON.stringify(key, null, 2));

  const G = [];
  G.push('# Blind grading sheet — reference-stack shootout');
  G.push('');
  G.push('Grade each anonymized image. NO model names appear here on purpose — fill the');
  G.push('blanks, then run `tally --key … --grades <this file>` to unblind.');
  G.push('');
  G.push('| file | identity-lock /10 | style-match /10 | believability register read | AI-tells noticed | overall /10 |');
  G.push('|------|-------------------|-----------------|-----------------------------|------------------|-------------|');
  for (const row of sheetRows) {
    G.push(`| ${row} |  |  |  |  |  |`);
  }
  G.push('');
  writeFileSync(join(JUDGING_DIR, 'grading-sheet.md'), G.join('\n'));

  console.log(`[anonymize] ${done} case(s), ${sheetRows.length} images (seed ${seed}) -> ${JUDGING_DIR}`);
  console.log(`  key: ${join(JUDGING_DIR, 'key.json')}`);
  console.log(`  sheet: ${join(JUDGING_DIR, 'grading-sheet.md')}`);
}

function parseGradesMarkdown(path) {
  // Rows: | file | identity /10 | style /10 | register | tells | overall /10 |
  const rows = {};
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const t = line.trim();
    if (!t.startsWith('|')) continue;
    const cells = t.split('|').slice(1, -1).map((s) => s.trim());
    if (cells.length < 6) continue;
    const file = cells[0];
    if (!/\.png$/i.test(file)) continue; // skip header/separator rows
    rows[file] = {
      identity: parseFloat(cells[1]),
      style: parseFloat(cells[2]),
      register: cells[3],
      tells: cells[4],
      overall: parseFloat(cells[5]),
    };
  }
  return rows;
}

function cmdTally(flags) {
  if (!flags.key) die('tally needs --key <path to judging/key.json>', 1);
  if (!existsSync(flags.key)) die(`key not found: ${flags.key}`, 1);
  const key = JSON.parse(readFileSync(flags.key, 'utf8'));

  const grades = flags.grades && existsSync(flags.grades) ? parseGradesMarkdown(flags.grades) : {};
  if (flags.grades && !existsSync(flags.grades)) console.error(`[tally] --grades file not found: ${flags.grades} (continuing with judge JSONs only)`);
  const judgeDir = flags.judgeDir || join(REPO_ROOT, '.tmp', 'refstack', 'analysis');

  // Load any judge-mode JSONs (judge-<case>-<case>-<letter>.json).
  const judgeByFile = {};
  if (existsSync(judgeDir)) {
    for (const f of readdirSync(judgeDir)) {
      if (!f.startsWith('judge-') || !f.endsWith('.json')) continue;
      try {
        const j = JSON.parse(readFileSync(join(judgeDir, f), 'utf8'));
        const cand = basename(String(j?.meta?.candidate || ''));
        if (cand) judgeByFile[cand] = j.analysis || {};
      } catch { /* skip unreadable */ }
    }
  }

  // Accumulate per model (lane).
  const perModel = {};
  const perCaseWinner = {};
  const bump = (lane) => (perModel[lane] ??= { identity: [], style: [], overall: [], tells: 0, n: 0 });

  for (const [caseId, letters] of Object.entries(key.cases || {})) {
    let best = null;
    for (const [letter, info] of Object.entries(letters)) {
      const lane = info.lane;
      const file = `${caseId}-${letter}.png`;
      const m = bump(lane);
      m.n++;

      const g = grades[file];
      const j = judgeByFile[file];
      // Neil's human grade is authoritative; fall back to judge JSON on /100 -> /10.
      let identity = g && !Number.isNaN(g.identity) ? g.identity : null;
      let style = g && !Number.isNaN(g.style) ? g.style : null;
      let overall = g && !Number.isNaN(g.overall) ? g.overall : null;
      let tellCount = 0;
      if (j) {
        if (identity == null && typeof j?.identity_consistency?.score_pct === 'number') identity = j.identity_consistency.score_pct / 10;
        if (style == null && typeof j?.style_replication?.overall_pct === 'number') style = j.style_replication.overall_pct / 10;
        if (overall == null && identity != null && style != null) overall = (identity + style) / 2;
        tellCount = Array.isArray(j?.believability?.ai_tells) ? j.believability.ai_tells.length : 0;
      }
      if (identity != null) m.identity.push(identity);
      if (style != null) m.style.push(style);
      if (overall != null) m.overall.push(overall);
      m.tells += tellCount;

      const score = overall != null ? overall : ((identity ?? 0) + (style ?? 0)) / 2;
      if (!best || score > best.score) best = { lane, letter, score };
    }
    perCaseWinner[caseId] = best;
  }

  const avg = (arr) => (arr.length ? (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1) : 'n/a');

  console.log('\n=== reference-stack shootout — UNBLINDED tally ===\n');
  console.log('model  | n | avg identity | avg style | avg overall | total AI-tells');
  console.log('-------|---|--------------|-----------|-------------|---------------');
  for (const [lane, m] of Object.entries(perModel)) {
    console.log(`${lane.padEnd(6)} | ${String(m.n).padStart(1)} | ${avg(m.identity).padStart(12)} | ${avg(m.style).padStart(9)} | ${avg(m.overall).padStart(11)} | ${String(m.tells).padStart(13)}`);
  }
  console.log('\nper-case winners:');
  for (const [caseId, best] of Object.entries(perCaseWinner)) {
    console.log(`  ${caseId}: ${best ? `${best.lane} (${caseId}-${best.letter}, score ${best.score.toFixed(1)})` : 'no grades'}`);
  }
  console.log('');
}

// ---------------------------------------------------------------------------
// dispatch
// ---------------------------------------------------------------------------

async function main() {
  const cmd = process.argv[2];
  const flags = parseFlags(process.argv.slice(3));
  switch (cmd) {
    case 'plan': cmdPlan(); break;
    case 'composite': cmdComposite(flags); break;
    case 'gemini': await cmdGemini(flags); break;
    case 'codex': cmdCodex(flags); break;
    case 'musesheet': cmdMuseSheet(); break;
    case 'anonymize': cmdAnonymize(flags); break;
    case 'tally': cmdTally(flags); break;
    default:
      console.error(
        'usage: node tools/shootout_refstack.mjs <plan|composite|gemini|codex|musesheet|anonymize|tally> [flags]\n' +
        '  plan                         print cases + prompts (no calls)\n' +
        '  composite [--only cNN]       ffmpeg hstack refs -> composite/<case>.png\n' +
        '  gemini [--only cNN] [--yes]  dry-run by default; --yes fires the PAID call\n' +
        '  codex [--only cNN]           spawn codex-image dispatcher on the composite\n' +
        '  musesheet                    write the manual meta.ai run sheet\n' +
        '  anonymize [--seed N] [--partial]  shuffle 3 lanes -> A/B/C + key + sheet\n' +
        '  tally --key <key.json> [--grades <sheet.md>] [--judge-dir <dir>]  unblind',
      );
      process.exit(cmd ? 1 : 1);
  }
}

main().catch((e) => { console.error(`[shootout] ${e.stack || e.message}`); process.exit(2); });
