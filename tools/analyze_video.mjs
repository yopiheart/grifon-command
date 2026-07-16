#!/usr/bin/env node
// Viral Autopsy analyzer (Node port of tools/analyze_video.py) — have Gemini
// watch a social video/ad and return an evidence-bound Edit DNA breakdown as JSON.
//
// One job: video in (local file or direct http(s) file URL) -> structured
// analysis JSON out. The viral-autopsy skill (.claude/skills/viral-autopsy/)
// orchestrates what happens with the result (swipe-file entry, pattern index,
// remix).
//
// Node, not Python: the cafe-PC defreezer wipes Python; node_modules
// (@google/genai) ships with the repo, so this runtime survives a reboot. The
// yt-dlp download ladder is intentionally NOT ported — platform-page URLs go
// through the Python tool or the skill's Step-2b fallback ladder.
//
// Usage:
//   node tools/analyze_video.mjs <path-or-https-url> [--niche NICHE] [--source SOURCE]
//                                [--model MODEL] [--out-dir DIR]
//
//   path-or-url   local video file (primary) or a plain http(s) direct-file URL
//   --niche       e.g. "skincare PH", "home tools" (recorded in output metadata)
//   --source      e.g. tiktok | fb-ad-library | youtube | instagram | file
//   --model       Gemini model id (default: gemini-3.5-flash)
//   --out-dir     where to write artifacts (default: .tmp/viral-intel)
//
// Output: analysis JSON on stdout, also written to <out-dir>/<slug>.json.
// Exit codes: 0 ok, 1 usage/input error, 2 download/API failure,
//             3 GENERIC_OUTPUT (analysis failed the specificity validator).
// Secrets: GEMINI_API_KEY from environment or repo-root .env (never hardcoded).

import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs';
import { resolve, dirname, join, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_OUT_DIR = join(REPO_ROOT, '.tmp', 'viral-intel');
const DEFAULT_MODEL = 'gemini-3.5-flash';

const ANALYSIS_PROMPT = `You are a direct-response video editor doing a forensic autopsy of this video for a swipe file. Watch AND listen to the whole video before answering.

Return ONLY a JSON object with this exact shape (no markdown fence, no prose):

{
  "video": {"duration_s": <number>, "format_guess": "<talking-head UGC | VSL | b-roll montage | skit | listicle | demo | other>", "language": "<spoken language(s)>", "platform_native_style": "<which platform this edit grammar belongs to>"},
  "hook": {
    "first_3s_timeline": [{"t": "<start-end seconds, e.g. 0.0-0.8>", "what": "<exactly what is on screen and in audio>"}],
    "text_on_frame_1": <bool>,
    "first_on_screen_text": "<verbatim text or null>",
    "subject_or_product_visible_at_s": <number>,
    "hook_type": "<pattern interrupt | bold claim | question | curiosity gap | in-medias-res | stunt | other>",
    "spoken_hook_verbatim": "<first sentence(s) of VO/dialogue>"
  },
  "shots": {"count": <int>, "median_shot_s": <number>, "shortest_shot_s": <number>, "longest_shot_s": <number>},
  "perceived_pace_driver": "<what makes it FEEL fast: cut rate / caption churn / camera motion / content swaps / escalation — be specific with a measured rate>",
  "captions": {"present": <bool>, "chunk_words": "<e.g. 1-3>", "swap_interval_s": <number or null>, "case": "<ALL-CAPS | sentence | mixed>", "color": "<dominant + emphasis colors>", "screen_height_pct": "<approx vertical position, e.g. 55-60%>", "treatment": "<outline+shadow | background box | plain>", "animation": "<pop | karaoke fill | instant swap | word-pop | none>", "emphasis_method": "<solo word card | color shift | scale punch | none>"},
  "edit_grammar": {"transitions": ["<each distinct transition type + where used, with timestamp>"], "sfx_hits": ["<sfx + timestamp, or empty>"], "music": "<role + dynamics, or none>", "silences_over_0_3s": <int>, "dead_air_notes": "<where, if any>"},
  "camera": "<static / drift / constant zoom %s / punch-ins / handheld — with rates and where>",
  "product_reveal": {"at_s": <number or null>, "mechanic": "<in-frame-from-start | hard cut | title-card slam | unboxing | n/a>"},
  "proof_elements": ["<graphic/spoken proof + timestamp, e.g. 'follower-count pill at 12.4s'>"],
  "cta": {"first_at_s": <number or null>, "holds_to_final_frame": <bool>, "mechanic": "<spoken / caption / end card / pinned overlay>"},
  "storytelling_format": {"name": "<e.g. hook-problem-agitate-solve, listicle, transformation, testimonial>", "beats": [{"t": "<start-end s>", "beat": "<beat name>", "summary": "<one line>"}]},
  "transcript": "<full verbatim transcript of VO/dialogue — the literal string NO_VO if the video has no spoken audio at all (music/SFX only)>",
  "why_it_works": [{"claim": "<one specific reason this video retains/converts>", "timestamp": "<the second(s) that prove it>", "evidence": "<the measurable observation backing the claim — must contain a number (a duration, a rate, a count, a %)>", "confidence": "<high | medium | low>"}],
  "weaknesses": ["<anything this video does badly, with timestamp>"],
  "believability": {
    "performance": {"observation": "<energy, eye-contact-to-lens, gesture, emotion arc, authenticity cues — or 'not assessable' if no on-screen person>", "evidence": "<what on screen shows it + ~timestamp>", "confidence": "<high | medium | low>"},
    "voice_delivery": {"observation": "<tone, pace, emphasis, natural pauses/breaths — or 'not assessable' if no voice>", "evidence": "<...>", "confidence": "<high | medium | low>"},
    "lighting": {"observation": "<available / ring / studio; flat vs modeled; window vs fixture>", "evidence": "<...>", "confidence": "<high | medium | low>"},
    "camera_lens": {"observation": "<phone selfie vs framed; focal feel; handheld drift vs locked>", "evidence": "<...>", "confidence": "<high | medium | low>"},
    "image_realism": {"observation": "<skin texture/pores, imperfections, lived-in background, real props vs plastic/over-clean>", "evidence": "<...>", "confidence": "<high | medium | low>"},
    "lip_sync": {"observation": "<mouth↔audio match; any drift/desync — or 'not assessable' if no talking face>", "evidence": "<...>", "confidence": "<high | medium | low>"},
    "observed_register": "<raw-ugc | polished-ugc | cinematic>",
    "source_realism_verdict": {"verdict": "<real-human | likely-ai | mixed>", "evidence": "<the specific tells that decided it + ~timestamp>", "confidence": "<high | medium | low>"}
  }
}

HARD RULES:
- why_it_works MUST have at least 3 entries. Every entry MUST cite a timestamp and numeric evidence. "Strong hook" or "good pacing" without numbers is a failed analysis.
- Estimate numbers honestly from what you observe (shot lengths, caption swap rate, zoom speed). Approximate is fine; vague is not.
- transcript must be verbatim, not summarized.
- Report what IS there, not what should be. If captions are absent, say so.
- believability: classify exactly ONE observed_register (raw-ugc = phone selfie / available light / unretouched / lived-in; polished-ugc = creator-grade ring light, steady, clean-but-real; cinematic = premium/studio, reads as "an ad"). Judge source_realism_verdict from concrete tells (skin/hands/teeth/eye artifacts, lip-sync drift, impossible lighting, plastic texture) — NOT vibes. A believability dimension with no subject to read is "not assessable", not an invented read.
`;

// why_it_works entries and core hook fields are checked for substance below;
// an analysis that fails these is re-promptable noise, not swipe-file material.
const REQUIRED_TOP_KEYS = [
  'video', 'hook', 'shots', 'perceived_pace_driver', 'captions',
  'edit_grammar', 'camera', 'storytelling_format', 'transcript',
  'why_it_works',
];

// believability is intentionally NOT in REQUIRED_TOP_KEYS (soft capture). These
// enums are quoted from workflows/believability_dna.md (realism registers +
// AI-slop source guardrail) and only typo-guard a present-but-malformed block.
const REGISTER_VALUES = new Set(['raw-ugc', 'polished-ugc', 'cinematic']);
const REALISM_VERDICT_VALUES = new Set(['real-human', 'likely-ai', 'mixed']);

// Platform-page URLs need yt-dlp (Python tool) or the skill's Step-2b fallback
// ladder; this Node port only handles local files + direct http(s) file URLs.
const PLATFORM_HOST_RE = /(^|\.)(tiktok\.com|youtube\.com|youtu\.be|instagram\.com|facebook\.com|fb\.watch|fb\.com)$/i;

function fail(code, label, detail) {
  console.error(`${label}: ${detail}`);
  process.exit(code);
}

function loadEnvKey(name) {
  if (process.env[name]) return process.env[name];
  try {
    const envText = readFileSync(join(REPO_ROOT, '.env'), 'utf8');
    for (const line of envText.split(/\r?\n/)) {
      const t = line.trim();
      if (t.startsWith(`${name}=`)) return t.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  } catch { /* no .env */ }
  return null;
}

function slugify(text) {
  const slug = String(text).replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase();
  return slug.slice(0, 60) || 'video';
}

function mimeForVideo(path) {
  const ext = extname(path).toLowerCase();
  const map = {
    '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.mov': 'video/quicktime',
    '.webm': 'video/webm', '.mkv': 'video/x-matroska', '.avi': 'video/x-msvideo',
    '.mpeg': 'video/mpeg', '.mpg': 'video/mpeg', '.3gp': 'video/3gpp',
  };
  return map[ext] || 'video/mp4';
}

// Direct http(s) file download (fetch). Platform-page URLs are refused with a
// pointer to the yt-dlp path / Step-2b ladder — this port does NOT scrape pages.
async function downloadDirect(url, outDir) {
  let host = '';
  try { host = new URL(url).hostname; } catch { /* leave blank */ }
  if (PLATFORM_HOST_RE.test(host)) {
    fail(2, 'PLATFORM_URL_UNSUPPORTED',
      `cannot download platform-page URLs in the Node port (no yt-dlp): ${host}\n` +
      '  Use the Python tool for auto-download: python tools/analyze_video.py <url> --niche "..." --source ...\n' +
      "  Or resolve a real MP4 (WITH audio) via the viral-autopsy SKILL.md Step-2b download fallback ladder\n" +
      '  (logged-in browser cookies -> snaptik-class direct-.mp4 service -> Game Bar Win+Alt+R capture),\n' +
      '  then re-run this tool with that local file or the direct .mp4 URL.');
  }
  let name = basename(new URL(url).pathname) || 'download.mp4';
  if (!extname(name)) name = `${name}.mp4`;
  const outPath = join(outDir, name);
  console.error(`[download] ${url.slice(0, 80)}`);
  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    fail(2, 'DOWNLOAD_FAILED', `fetch error: ${String(e && e.message || e)}`);
  }
  if (!res.ok) fail(2, 'DOWNLOAD_FAILED', `HTTP ${res.status} for ${url}`);
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  return outPath;
}

async function analyzeWithGemini(videoPath, model, apiKey) {
  const ai = new GoogleGenAI({ apiKey });
  const mimeType = mimeForVideo(videoPath);

  console.error(`[upload] ${basename(videoPath)} (${Math.floor(statSync(videoPath).size / 1024)} KB)`);
  let uploaded = await ai.files.upload({ file: videoPath, config: { mimeType } });
  const deadline = Date.now() + 300_000;
  while (uploaded.state === 'PROCESSING') {
    if (Date.now() > deadline) fail(2, 'UPLOAD_TIMEOUT', 'Gemini file stuck in PROCESSING for 5 minutes');
    await new Promise((r) => setTimeout(r, 4000));
    uploaded = await ai.files.get({ name: uploaded.name });
  }
  if (uploaded.state === 'FAILED') fail(2, 'UPLOAD_FAILED', 'Gemini Files API reported FAILED state for the video');

  console.error(`[analyze] model=${model}`);
  const response = await ai.models.generateContent({
    model,
    contents: [
      { fileData: { fileUri: uploaded.uri, mimeType } },
      { text: ANALYSIS_PROMPT },
    ],
    config: { responseMimeType: 'application/json', temperature: 0.2 },
  });
  let text = (response.text || '').trim();
  if (text.startsWith('```')) text = text.replace(/^```[a-z]*\s*|\s*```$/g, '');
  try {
    return JSON.parse(text);
  } catch (exc) {
    fail(2, 'BAD_MODEL_JSON', `${String(exc && exc.message || exc)} — first 300 chars: ${text.slice(0, 300)}`);
  }
}

function validateSpecificity(analysis) {
  // Countermeasure for the 'generic analysis' failure mode: every claim needs a
  // timestamp and numeric evidence, or the run is rejected.
  const problems = [];
  for (const key of REQUIRED_TOP_KEYS) {
    if (!(key in analysis)) problems.push(`missing top-level key: ${key}`);
  }
  const hook = analysis.hook || {};
  const timeline = hook.first_3s_timeline;
  if (!timeline || (Array.isArray(timeline) && timeline.length === 0)) {
    problems.push('hook.first_3s_timeline is empty — no second-by-second hook breakdown');
  }
  const shots = analysis.shots || {};
  if (typeof shots.count !== 'number' || shots.count <= 0) {
    problems.push('shots.count missing or zero');
  }
  const claims = analysis.why_it_works || [];
  if (claims.length < 3) {
    problems.push(`why_it_works has ${claims.length} entries (need >= 3)`);
  }
  for (let i = 0; i < claims.length; i++) {
    const claim = claims[i] || {};
    const ts = String(claim.timestamp ?? '').trim();
    const ev = String(claim.evidence ?? '').trim();
    if (!/\d/.test(ts)) problems.push(`why_it_works[${i}] has no timestamp`);
    if (!/\d/.test(ev)) problems.push(`why_it_works[${i}] evidence has no measured value: ${JSON.stringify(ev.slice(0, 80))}`);
  }
  // No-VO videos (music/SFX only — e.g. TEMU pure-hype drops) legitimately have no
  // transcript: accept the explicit NO_VO sentinel, or an empty transcript when the
  // analysis itself heard no speech (no spoken hook). Only a short transcript that
  // CONTRADICTS observed speech is a specificity failure. (Learn-and-adapt 2026-07-09:
  // the old unconditional check rejected 3/4 genuinely silent TEMU virals twice.)
  const transcript = String(analysis.transcript ?? '').trim();
  const spokenHook = String(analysis.hook?.spoken_hook_verbatim ?? '').trim();
  const heardSpeech = spokenHook.length > 0 && !/^(null|n\/a|none|no_vo)$/i.test(spokenHook);
  if (transcript.length < 20 && transcript.toUpperCase() !== 'NO_VO' && heardSpeech) {
    problems.push('transcript missing or suspiciously short (yet a spoken hook was transcribed)');
  }
  // believability is soft-captured: its absence never fails the gate (clips with
  // no human subject legitimately omit it). Only typo-guard the two enums when
  // the block IS present, so a malformed register can't pollute a pattern count.
  const bel = analysis.believability;
  if (bel && typeof bel === 'object' && !Array.isArray(bel)) {
    const register = bel.observed_register;
    if (register != null && !REGISTER_VALUES.has(register)) {
      problems.push(`believability.observed_register not in {${[...REGISTER_VALUES].join(', ')}}: ${JSON.stringify(register)}`);
    }
    const srv = bel.source_realism_verdict;
    const verdict = (srv && typeof srv === 'object' && !Array.isArray(srv)) ? srv.verdict : null;
    if (verdict != null && !REALISM_VERDICT_VALUES.has(verdict)) {
      problems.push(`believability.source_realism_verdict.verdict not in {${[...REALISM_VERDICT_VALUES].join(', ')}}: ${JSON.stringify(verdict)}`);
    }
  }
  return problems;
}

function parseArgs(argv) {
  const args = { video: null, niche: '', source: '', model: DEFAULT_MODEL, outDir: String(DEFAULT_OUT_DIR) };
  const flagMap = { '--niche': 'niche', '--source': 'source', '--model': 'model', '--out-dir': 'outDir' };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a in flagMap) {
      args[flagMap[a]] = argv[++i] ?? '';
    } else if (args.video === null && !a.startsWith('--')) {
      args.video = a;
    }
  }
  return args;
}

function utcStamp() {
  // Match the Python "%Y-%m-%dT%H:%M:%SZ" shape (no milliseconds).
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.video) {
    console.error('usage: node tools/analyze_video.mjs <path-or-https-url> [--niche NICHE] [--source SOURCE] [--model MODEL] [--out-dir DIR]');
    process.exit(1);
  }

  const apiKey = loadEnvKey('GEMINI_API_KEY');
  if (!apiKey) fail(1, 'GEMINI_NOT_CONFIGURED', 'GEMINI_API_KEY not in environment or .env');

  const outDir = args.outDir;
  mkdirSync(outDir, { recursive: true });

  let videoPath;
  let sourceRef;
  if (/^https?:\/\//i.test(args.video)) {
    videoPath = await downloadDirect(args.video, outDir);
    sourceRef = args.video;
  } else {
    videoPath = args.video;
    if (!existsSync(videoPath) || !statSync(videoPath).isFile()) {
      fail(1, 'INPUT_NOT_FOUND', `no such file: ${videoPath}`);
    }
    sourceRef = videoPath;
  }

  const analysis = await analyzeWithGemini(videoPath, args.model, apiKey);
  const problems = validateSpecificity(analysis);

  const result = {
    meta: {
      source_ref: sourceRef,
      local_file: videoPath,
      niche: args.niche,
      source: args.source,
      model: args.model,
      analyzed_at: utcStamp(),
    },
    analysis,
  };
  const stem = basename(videoPath, extname(videoPath));
  const outPath = join(outDir, `${slugify(stem)}.json`);
  writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');

  if (problems.length) {
    console.log(JSON.stringify(result, null, 2));
    fail(3, 'GENERIC_OUTPUT',
      `analysis failed the specificity validator (saved to ${outPath} for inspection):\n  - ` +
      problems.join('\n  - '));
  }

  console.log(JSON.stringify(result, null, 2));
  console.error(`[done] wrote ${outPath}`);
}

main().catch((e) => fail(2, 'UNEXPECTED_ERROR', String(e && e.stack || e)));
