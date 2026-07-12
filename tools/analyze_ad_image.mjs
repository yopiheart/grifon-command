#!/usr/bin/env node
// Static Ad Autopsy: have Gemini vision decode a still image ad (layout walk,
// verbatim copy, visual DNA, persuasion levers, pattern matches) into a
// specificity-gated JSON, and ingest a compressed copy of the source ad into
// assets/ad-swipe/ so the reference survives on the cafe PC. The still-image
// analog of tools/analyze_video.py; driven by .claude/skills/static-autopsy/.
//
// Node, not Python: the cafe-PC defreezer wipes the Python interpreter itself
// (pip self-install can't recover when the runtime is gone), while
// node_modules/@google/genai + node_modules/sharp ship back via the repo's
// npm install. Same WAT "deterministic execution" layer, survivable runtime.
//
// Usage:
//   node tools/analyze_ad_image.mjs <image-or-folder> --brand "Gruns" \
//     [--niche "..."] [--source fb-ad-library] \
//     [--entry E18 | --start-entry 18]   # entry IDs assigned by the skill
//     [--ingest-only]                     # compress+store only, NO Gemini call
//     [--no-ingest]                       # analyze without writing to assets/
//     [--force] [--model gemini-3.5-flash] [--out-dir .tmp/static-intel]
//
// Output: analysis JSON on stdout, also written to
//   .tmp/static-intel/E<NN>-<brand-slug>.json
// Exit codes: 0 ok, 1 usage error, 2 API/IO failure, 3 GENERIC_OUTPUT
//   (specificity gate failed — JSON still saved for inspection, matches the
//   analyze_video.py precedent).
// Secrets: GEMINI_API_KEY from environment or repo-root .env.

import { GoogleGenAI } from '@google/genai';
import sharp from 'sharp';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ASSETS_DIR = join(REPO_ROOT, 'assets', 'ad-swipe');
const SWIPE_FILE = join(REPO_ROOT, 'workflows', 'static_ad_swipe_file.md');
const DEFAULT_OUT_DIR = join(REPO_ROOT, '.tmp', 'static-intel');
const DEFAULT_MODEL = 'gemini-3.5-flash';
const MAX_EDGE = 1080;
const MAX_KB = 300;
const IMG_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// ---------------------------------------------------------------------------
// Secrets (env → repo-root .env), forked from render_qa.mjs.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Prompt (NEW — not a TUNED file). JSON-only, mirrors render_qa.mjs voice.
// ---------------------------------------------------------------------------
const buildPrompt = (patternIndex, ctx) => `You are a meticulous static-ad reverse-engineer. Study this single still image ad (a Facebook/Instagram feed or story creative, often for a DTC or SaaS offer) and decode WHY it converts. Read every word on the image verbatim — do not paraphrase.

Context supplied by the operator: brand="${ctx.brand}"${ctx.niche ? `, niche="${ctx.niche}"` : ''}${ctx.source ? `, source="${ctx.source}"` : ''}.

${patternIndex ? `Known persuasion patterns from the swipe file (match against these; use the exact S-IDs, do NOT invent IDs):\n${patternIndex}\n` : 'No pattern index was available; leave pattern_matches empty and propose new_pattern_candidates instead.\n'}
Be SPECIFIC or the analysis is rejected: quote on-image text verbatim, give real #hex palette values, and walk the layout with positional words (top/left/center/below/…). Vague output is worse than none.

Return ONLY JSON (no fences, no prose):
{
  "ad": {
    "format_guess": "<4:5 | 1:1 | 9:16 | other>",
    "ad_type": "<authority-portrait | product-hero | text-only-callout | benefit-anatomy | tier-compare | offer-stack | lifestyle | other>",
    "brand_visible": <bool>,
    "language": "<e.g. English | Taglish | Filipino>"
  },
  "copy": {
    "headline_verbatim": "<exact headline as printed; use \\"NO_TEXT\\" ONLY for a genuinely textless ad>",
    "all_text_verbatim": ["<every text element in top-to-bottom reading order, verbatim>"],
    "cta": {"text_verbatim": "<button/bar text>", "style": "<pill | bar | text | none>", "color": "<#hex or name>"}
  },
  "layout": {
    "description": "<top-to-bottom walk of the composition, >=80 chars, using positional words>",
    "focal_point": "<what the eye lands on first>",
    "hierarchy": ["<element 1 (most dominant)>", "<element 2>", "..."],
    "safe_zone_ok_9x16": <bool — is all text/product inside the central ~60% band>
  },
  "visual_dna": {
    "palette": [{"hex_approx": "#RRGGBB", "role": "<background | accent | text | cta | ...>"}],
    "typography": {"families_guess": "<closest font families>", "case": "<upper | title | mixed>", "weight_contrast": "<light..black spread>"},
    "composition": "<grid/negative-space/symmetry read>",
    "imagery": "<photo | illustration | product-shot | portrait | none>",
    "style_register": "<premium-editorial | flat-graphic | raw-ugc | minimal-anti-design | ...>",
    "brand_assets": "<logo/mascot/motif recall devices present>"
  },
  "levers": [{"lever": "<Cialdini/Suby name>", "evidence": "<verbatim on-image quote or visual proof>", "confidence": "<high|medium|low>"}],
  "why_it_works": [{"claim": "<why this converts>", "evidence": "<verbatim quote, #hex, or number from the ad>", "confidence": "<high|medium|low>"}],
  "weaknesses": ["<what a buyer/brand critic would flag>"],
  "trust_flags": ["<any fabrication: fake DM, fake countdown, invented stat, manufactured scarcity — S7-class>"],
  "pattern_matches": [{"id": "<S-ID from the index above>", "why": "<how this ad corroborates it>"}],
  "new_pattern_candidates": ["<a recurring-looking mechanic not yet in the index>"]
}`;

// ---------------------------------------------------------------------------
// Arg parsing.
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const opts = { flags: {}, positional: [] };
  const valueFlags = new Set(['--brand', '--niche', '--source', '--entry', '--start-entry', '--model', '--out-dir']);
  const boolFlags = new Set(['--ingest-only', '--no-ingest', '--force']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (valueFlags.has(a)) { opts.flags[a.slice(2)] = argv[++i]; }
    else if (boolFlags.has(a)) { opts.flags[a.slice(2)] = true; }
    else if (a.startsWith('--')) { console.error(`unknown flag: ${a}`); process.exit(1); }
    else opts.positional.push(a);
  }
  return opts;
}

function usage(msg) {
  if (msg) console.error(msg);
  console.error('usage: node tools/analyze_ad_image.mjs <image-or-folder> --brand "Name" [--niche "..."] [--source fb-ad-library] [--entry E18 | --start-entry 18] [--ingest-only] [--no-ingest] [--force] [--model gemini-3.5-flash] [--out-dir .tmp/static-intel]');
  process.exit(1);
}

const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

// "E18" | "18" -> 18
function entryNumber(raw) {
  const m = String(raw).trim().match(/^E?(\d+)$/i);
  return m ? parseInt(m[1], 10) : null;
}

// ---------------------------------------------------------------------------
// Pattern Index parsing (graceful fallback on failure).
// Rows: | S1 | **name** — description | count | status |
// ---------------------------------------------------------------------------
function loadPatternIndex() {
  try {
    const md = readFileSync(SWIPE_FILE, 'utf8');
    const ids = new Set();
    const lines = [];
    for (const line of md.split(/\r?\n/)) {
      const m = line.match(/^\|\s*(S\d+)\s*\|\s*(.+?)\s*\|/);
      if (!m) continue;
      const id = m[1];
      let label = m[2].replace(/\*\*/g, '').trim();
      if (label.length > 160) label = label.slice(0, 157) + '...';
      ids.add(id);
      lines.push(`${id}: ${label}`);
    }
    if (ids.size === 0) { console.error('[warn] Pattern Index empty/unparseable — running without S-ID injection'); return { ids: null, text: null }; }
    return { ids, text: lines.join('\n') };
  } catch (e) {
    console.error(`[warn] could not read Pattern Index (${e.message}) — running without S-ID injection`);
    return { ids: null, text: null };
  }
}

// ---------------------------------------------------------------------------
// Compression: longest edge <= 1080, JPEG quality 85->60 until <= 300KB.
// Re-encode strips EXIF. Returns { buffer, width, height, kb }.
// ---------------------------------------------------------------------------
async function compress(srcPath) {
  const base = sharp(srcPath, { failOn: 'error' }).rotate();
  const meta = await base.metadata();
  const longest = Math.max(meta.width || 0, meta.height || 0);
  const resize = longest > MAX_EDGE
    ? { width: (meta.width >= meta.height) ? MAX_EDGE : null, height: (meta.height > meta.width) ? MAX_EDGE : null, fit: 'inside', withoutEnlargement: true }
    : null;
  let buffer = null;
  let quality = 85;
  for (; quality >= 60; quality -= 5) {
    let pipe = sharp(srcPath, { failOn: 'error' }).rotate();
    if (resize) pipe = pipe.resize(resize);
    buffer = await pipe.jpeg({ quality, mozjpeg: true }).toBuffer();
    if (buffer.length <= MAX_KB * 1024) break;
  }
  const outMeta = await sharp(buffer).metadata();
  const kb = Math.round(buffer.length / 1024);
  if (kb > MAX_KB) console.error(`[warn] ${basename(srcPath)} still ${kb}KB at q=${quality + 5} (target <=${MAX_KB}KB)`);
  return { buffer, width: outMeta.width, height: outMeta.height, kb };
}

// ---------------------------------------------------------------------------
// Specificity gate — the stills analog of the video timestamp rule.
// ---------------------------------------------------------------------------
const POSITIONAL = /\b(top|bottom|left|right|center|centre|centered|above|below|beneath|upper|lower|corner|middle|header|footer|background|foreground|behind|beside|overlay|edge|band)\b/gi;
const HEX_RE = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b/;

function validateSpecificity(analysis, validIds) {
  const reasons = [];
  const copy = analysis.copy || {};
  const layout = analysis.layout || {};
  const vd = analysis.visual_dna || {};

  const allText = Array.isArray(copy.all_text_verbatim) ? copy.all_text_verbatim.filter((t) => String(t || '').trim()) : [];
  if (allText.length === 0) reasons.push('all_text_verbatim empty');
  if (!copy.headline_verbatim || !String(copy.headline_verbatim).trim()) reasons.push('headline_verbatim empty');

  const desc = String(layout.description || '');
  const posHits = (desc.match(POSITIONAL) || []).length;
  if (desc.length < 80) reasons.push(`layout.description ${desc.length} chars (<80)`);
  if (posHits < 2) reasons.push(`layout.description has ${posHits} positional word(s) (<2)`);

  const levers = Array.isArray(analysis.levers) ? analysis.levers : [];
  const leversWithEvidence = levers.filter((l) => l && String(l.evidence || '').trim());
  if (leversWithEvidence.length < 2) reasons.push(`${leversWithEvidence.length} lever(s) with evidence (<2)`);

  const wiw = Array.isArray(analysis.why_it_works) ? analysis.why_it_works : [];
  const wiwConcrete = wiw.filter((w) => {
    const ev = String((w && w.evidence) || '');
    return /\d/.test(ev) || HEX_RE.test(ev) || /["'"'"]/.test(ev);
  });
  if (wiwConcrete.length < 3) reasons.push(`${wiwConcrete.length} why_it_works with concrete evidence (<3)`);

  const palette = Array.isArray(vd.palette) ? vd.palette : [];
  const validHex = palette.filter((p) => p && /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/.test(String(p.hex_approx || '').trim()));
  if (validHex.length < 2) reasons.push(`${validHex.length} valid #hex palette entries (<2)`);

  if (validIds) {
    const matches = Array.isArray(analysis.pattern_matches) ? analysis.pattern_matches : [];
    const bad = matches.filter((m) => m && m.id && !validIds.has(String(m.id).trim()));
    if (bad.length) reasons.push(`pattern_matches reference unknown IDs: ${bad.map((m) => m.id).join(', ')}`);
  }

  return { ok: reasons.length === 0, reasons };
}

// ---------------------------------------------------------------------------
// Gemini call with retry x3 on bad JSON / 429 / 5xx.
// ---------------------------------------------------------------------------
const RETRYABLE = /\b(429|5\d\d)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|INTERNAL|DEADLINE_EXCEEDED|overloaded/i;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function analyzeWithGemini(ai, model, prompt, base64) {
  let lastErr = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: [
          { inlineData: { data: base64, mimeType: 'image/jpeg' } },
          { text: prompt },
        ],
        config: { responseMimeType: 'application/json', temperature: 0.2 },
      });
      const text = (response.text || '').trim().replace(/^```[a-z]*\s*|\s*```$/g, '');
      try {
        return JSON.parse(text);
      } catch (e) {
        lastErr = new Error(`BAD_MODEL_JSON: ${e.message} — first 300: ${text.slice(0, 300)}`);
      }
    } catch (e) {
      lastErr = e;
      if (!RETRYABLE.test(String(e && (e.message || e)))) break; // non-retryable API error
    }
    if (attempt < 3) { const backoff = 2000 * attempt; console.error(`[retry] attempt ${attempt} failed (${(lastErr && lastErr.message || lastErr)}) — backing off ${backoff}ms`); await sleep(backoff); }
  }
  throw lastErr || new Error('unknown Gemini failure');
}

// ---------------------------------------------------------------------------
// Process one image end-to-end. Returns { entry, status }.
//   status: 'ok' | 'generic' | 'ingest-only'
// ---------------------------------------------------------------------------
async function processImage({ srcPath, num, brand, brandSlug, ctx, opts, ai, model, pattern, outDir }) {
  const entry = `E${num}`;
  const stem = `${entry}-${brandSlug}`;
  const assetPath = join(ASSETS_DIR, `${stem}.jpg`);
  const relAsset = `assets/ad-swipe/${stem}.jpg`;

  // (a) compress
  console.error(`[compress] ${basename(srcPath)} -> ${entry}`);
  const { buffer, width, height, kb } = await compress(srcPath);

  // (b) ingest (unless --no-ingest)
  let storedRel = null;
  if (!opts.flags['no-ingest']) {
    if (existsSync(assetPath) && !opts.flags.force) {
      console.error(`[ingest] ${relAsset} exists — skip (use --force to overwrite)`);
    } else {
      writeFileSync(assetPath, buffer);
      console.error(`[ingest] wrote ${relAsset} (${width}x${height}, ${kb}KB)`);
    }
    storedRel = relAsset;
  }

  // --ingest-only: duplicate-attach path, no Gemini call.
  if (opts.flags['ingest-only']) {
    console.log(`${entry}\t${relAsset}\t${width}x${height}\t${kb}KB\t(ingest-only, no analysis)`);
    return { entry, status: 'ingest-only' };
  }

  // (d) Gemini
  console.error(`[analyze] model=${model} ${entry}`);
  const analysis = await analyzeWithGemini(ai, model, buildPrompt(pattern.text, ctx), buffer.toString('base64'));

  // (f) wrap + write
  const out = {
    meta: {
      asset_path: storedRel,
      brand,
      niche: ctx.niche || null,
      source: ctx.source || null,
      model,
      entry,
      dims: `${width}x${height}`,
      kb,
    },
    analysis,
  };
  const outPath = join(outDir, `${stem}.json`);
  writeFileSync(outPath, JSON.stringify(out, null, 2), 'utf8');

  // (e) specificity gate
  const gate = validateSpecificity(analysis, pattern.ids);
  if (!gate.ok) {
    console.error(`[GENERIC_OUTPUT] ${entry}: ${gate.reasons.join('; ')} — JSON saved at ${outPath} for inspection`);
    console.log(JSON.stringify(out, null, 2));
    return { entry, status: 'generic' };
  }
  console.error(`[done] ${outPath}`);
  console.log(JSON.stringify(out, null, 2));
  return { entry, status: 'ok' };
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const target = opts.positional[0];
  if (!target) usage('missing <image-or-folder>');
  if (!opts.flags.brand) usage('--brand is required');
  if (!existsSync(target)) usage(`path not found: ${target}`);

  const brand = opts.flags.brand;
  const brandSlug = slugify(brand);
  if (!brandSlug) usage(`--brand "${brand}" produced an empty slug`);
  const model = opts.flags.model || DEFAULT_MODEL;
  const outDir = opts.flags['out-dir'] ? resolve(opts.flags['out-dir']) : DEFAULT_OUT_DIR;
  const ctx = { brand, niche: opts.flags.niche || '', source: opts.flags.source || '' };

  mkdirSync(ASSETS_DIR, { recursive: true });
  mkdirSync(outDir, { recursive: true });

  // Gemini not needed for the ingest-only path; only load the key when analyzing.
  let ai = null;
  const needsApi = !opts.flags['ingest-only'];
  if (needsApi) {
    const apiKey = loadEnvKey('GEMINI_API_KEY');
    if (!apiKey) { console.error('GEMINI_NOT_CONFIGURED: GEMINI_API_KEY not found (env or .env)'); process.exit(2); }
    ai = new GoogleGenAI({ apiKey });
  }

  const pattern = loadPatternIndex();
  const isDir = statSync(target).isDirectory();

  let anyGeneric = false;
  try {
    if (isDir) {
      // Batch mode: sorted images, sequential numbering from --start-entry.
      const start = entryNumber(opts.flags['start-entry']);
      if (start === null) usage('folder input requires --start-entry <N>');
      const files = readdirSync(target)
        .filter((f) => IMG_EXTS.has(extname(f).toLowerCase()))
        .sort()
        .map((f) => join(target, f));
      if (files.length === 0) usage(`no images (${[...IMG_EXTS].join(', ')}) in ${target}`);
      console.error(`[batch] ${files.length} image(s), entries E${start}..E${start + files.length - 1}`);
      for (let i = 0; i < files.length; i++) {
        const num = start + i;
        const stem = `E${num}-${brandSlug}`;
        if (!opts.flags['ingest-only'] && existsSync(join(outDir, `${stem}.json`)) && !opts.flags.force) {
          console.error(`[skip] ${basename(files[i])} -> E${num} (output exists; --force to redo)`);
          continue;
        }
        const r = await processImage({ srcPath: files[i], num, brand, brandSlug, ctx, opts, ai, model, pattern, outDir });
        if (r.status === 'generic') anyGeneric = true;
      }
    } else {
      // Single image: --entry (preferred) or --start-entry as the number.
      const num = entryNumber(opts.flags.entry) ?? entryNumber(opts.flags['start-entry']);
      if (num === null) usage('single image requires --entry E<N> (or --start-entry <N>)');
      const r = await processImage({ srcPath: target, num, brand, brandSlug, ctx, opts, ai, model, pattern, outDir });
      if (r.status === 'generic') anyGeneric = true;
    }
  } catch (e) {
    console.error(`API_FAILURE: ${e && (e.message || e)}`);
    process.exit(2);
  }

  process.exit(anyGeneric ? 3 : 0);
}

main();
