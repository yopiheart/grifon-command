#!/usr/bin/env node
// MULTI-ENGINE video auditor — fuses three analyzers into ONE timestamp-keyed
// report, each used only for what it is actually accurate at:
//
//   • ffmpeg (deterministic)  → EXACT duration, scene-cut timestamps, frame
//                               extraction. Timing is NEVER trusted to a model.
//   • Gemini watch (semantic) → audio/VO/accent/transcript/feel + caption-content
//                               sense. Watches+listens to the whole clip ONCE.
//   • Gemini vision (frames)  → reads burned on-screen TEXT off STILL extracted
//                               frames (far more reliable than reading a moving
//                               video), plus overlay-placement / band / legibility.
//
// Why this shape: a machine-watch alone gave wrong timestamps and MISSED a
// meaning-inverting caption (scene-6 "kailangan ng kape" dropping "hindi") on a
// real render — Playwright frame-stepping caught it but took 233 round-trips.
// ffmpeg pins the timeline in milliseconds; the model only does what models are
// good at (hearing speech, reading a single sharp frame). Same engine backs both
// FINAL_RENDER smoke and the viral-autopsy feature.
//
// Node, not Python: the cafe-PC defreezer wipes Python; node_modules
// (@google/genai + ffmpeg-static) ships with the repo. Survivable runtime.
//
// Usage:
//   node tools/render_audit.mjs <video-path-or-https-url> [--focus "extra concerns"] [--scene-thresh 0.3]
//
// Output: merged JSON on stdout, also written to .tmp/render-audit/<basename>.json
//         (extracted key frames kept under .tmp/render-audit/frames/ for eyeballing)
// Exit codes: 0 ok, 1 usage error, 2 download/ffmpeg/API failure.
// Secrets: GEMINI_API_KEY from environment or repo-root .env.

import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import ffmpegPath from 'ffmpeg-static';

const execFileP = promisify(execFile);
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(REPO_ROOT, '.tmp', 'render-audit');
const FRAME_DIR = join(OUT_DIR, 'frames');
const WATCH_MODEL = 'gemini-3.5-flash';
const VISION_MODEL = 'gemini-3.5-flash';
// Sample DENSELY, not one-frame-per-scene: burned keyword captions flash for
// <1s and a scene-midpoint frame misses them (v1 missed the scene-6 negation
// drop this way). 0.5s cadence catches anything on screen ≥~0.6s.
const SAMPLE_EVERY_S = 0.5;
const MAX_FRAMES = 80;    // hard cap (long videos) — cadence widens to fit
const VISION_BATCH = 16;  // frames per vision call; batches run in parallel

// ---------- env ----------
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

// ---------- ffmpeg: deterministic timing layer ----------
// ffmpeg writes its report to stderr; a non-zero exit on `-f null -` is normal
// for some builds, so we read stderr regardless of exit status.
async function runFfmpeg(args) {
  try {
    const { stderr } = await execFileP(ffmpegPath, args, { maxBuffer: 64 * 1024 * 1024 });
    return stderr || '';
  } catch (e) {
    return (e.stderr || '') + (e.stdout || ''); // still parse what we got
  }
}

async function probeDuration(file) {
  const out = await runFfmpeg(['-i', file]);
  const m = out.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]);
}

// Scene-change detection via the `select=scene` score + showinfo's pts_time.
async function detectCuts(file, thresh) {
  const out = await runFfmpeg([
    '-i', file,
    '-vf', `select='gt(scene,${thresh})',showinfo`,
    '-an', '-f', 'null', '-',
  ]);
  const cuts = [];
  const re = /pts_time:([0-9]+\.?[0-9]*)/g;
  let m;
  while ((m = re.exec(out)) !== null) cuts.push(parseFloat(m[1]));
  // ffmpeg sometimes double-fires on a single transition (e.g. 5.90 & 5.93);
  // merge cuts within 0.25s so the scene count isn't inflated by duplicates.
  const merged = [];
  for (const c of [...new Set(cuts)].sort((a, b) => a - b)) {
    if (!merged.length || c - merged[merged.length - 1] > 0.25) merged.push(c);
  }
  return merged;
}

// Map a timestamp to its scene index (1-based) given the cut boundaries.
function sceneOf(t, cuts) {
  let idx = 1;
  for (const c of cuts) { if (t >= c) idx++; else break; }
  return idx;
}

// Dense fixed-cadence sampling across the whole clip, each frame tagged with the
// scene it falls in. Cadence widens if the cap would be exceeded (long videos).
function sampleTimes(durationS, cuts) {
  const bounds = [0, ...cuts, durationS];
  const spanOf = (i) => ({ start: +bounds[i].toFixed(2), end: +bounds[i + 1].toFixed(2) });
  const spans = bounds.slice(0, -1).map((_, i) => spanOf(i));
  let every = SAMPLE_EVERY_S;
  if (durationS / every > MAX_FRAMES) every = durationS / MAX_FRAMES;
  const out = [];
  for (let t = every / 2; t < durationS; t += every) {
    const tt = +t.toFixed(2);
    const scene = sceneOf(tt, cuts);
    const span = spans[scene - 1] || spans[spans.length - 1];
    out.push({ scene, start: span.start, end: span.end, t: tt });
  }
  return out;
}

async function extractFrame(file, t, outPath) {
  await execFileP(ffmpegPath, ['-ss', String(t), '-i', file, '-frames:v', '1', '-q:v', '3', '-y', outPath]);
}

// ---------- Gemini watch: audio + content layer ----------
const watchPrompt = (focus) => `You are a meticulous video-ad QA reviewer. WATCH and LISTEN to this entire machine-generated ad (often Taglish — Filipino+English). You are the AUDIO + CONTENT layer; exact timestamps are measured separately, so describe WHAT happens, approximate WHEN.

Check with verbatim/heard evidence:
1. VO ACCENT: any Tagalog word read with an English/American accent? Quote the opening sentence verbatim AS HEARD.
2. TRANSCRIPT: the spoken voiceover, roughly per scene.
3. CAPTION vs VO MEANING: does any burned caption CONTRADICT or invert what is spoken (e.g. a dropped negation like "hindi")? Quote both.
4. AUDIO: dead air >1s, repeated identical SFX, music clashing with VO, garbled pronunciation.
5. GENERATIVE SLOP heard/seen: morphing objects, impossible motion.
${focus ? `\nEXTRA FOCUS: ${focus}\n` : ''}
Return ONLY JSON (no fences):
{"opening_voiceover_verbatim":"...","transcript_by_scene":["..."],"audio_issues":[{"approx_time":"mm:ss","evidence":"...","severity":"critical|major|minor"}],"caption_vo_conflicts":[{"approx_time":"mm:ss","spoken":"...","caption":"...","note":"..."}],"vo_accent_ok":<bool>,"grade":"A-F"}`;

async function geminiWatch(ai, videoPath, focus) {
  let file = await ai.files.upload({ file: videoPath, config: { mimeType: 'video/mp4' } });
  const deadline = Date.now() + 300_000;
  while (file.state === 'PROCESSING') {
    if (Date.now() > deadline) throw new Error('WATCH_UPLOAD_TIMEOUT');
    await new Promise((r) => setTimeout(r, 4000));
    file = await ai.files.get({ name: file.name });
  }
  if (file.state === 'FAILED') throw new Error('WATCH_UPLOAD_FAILED');
  const res = await ai.models.generateContent({
    model: WATCH_MODEL,
    contents: [
      { fileData: { fileUri: file.uri, mimeType: 'video/mp4' } },
      { text: watchPrompt(focus) },
    ],
    config: { responseMimeType: 'application/json', temperature: 0.2 },
  });
  return safeJson(res.text);
}

// ---------- Gemini vision: read STILL frames (reliable text read) ----------
async function geminiVision(ai, frames) {
  const parts = [];
  for (const f of frames) {
    parts.push({ text: `Frame at ${f.t}s (scene ${f.scene}, spans ${f.start}-${f.end}s):` });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: readFileSync(f.path).toString('base64') } });
  }
  parts.push({ text: `For EACH labeled frame above, in order, return one JSON object. Transcribe ALL burned on-screen text VERBATIM (captions, overlays, badges). Flag if any text overlay covers a person's face/forehead. Note any solid colored band/box behind text and its color. Judge legibility on the background.
Return ONLY a JSON array (no fences), one object per frame in the same order:
[{"t":<sec>,"scene":<n>,"onscreen_text":"<verbatim, '' if none>","covers_face":<bool>,"band_or_box":"<color or 'none'>","legible":<bool>,"notes":"<short>"}]` });
  const res = await ai.models.generateContent({
    model: VISION_MODEL,
    contents: parts,
    config: { responseMimeType: 'application/json', temperature: 0.1 },
  });
  return safeJson(res.text);
}

function safeJson(raw) {
  const text = (raw || '').trim().replace(/^```[a-z]*\s*|\s*```$/g, '');
  try { return JSON.parse(text); }
  catch { return { _parse_error: true, _raw: text.slice(0, 400) }; }
}

// ---------- main ----------
const args = process.argv.slice(2);
const focusIdx = args.indexOf('--focus');
const focus = focusIdx >= 0 ? args[focusIdx + 1] : '';
const threshIdx = args.indexOf('--scene-thresh');
const sceneThresh = threshIdx >= 0 ? parseFloat(args[threshIdx + 1]) : 0.3;
const consumed = new Set(['--focus', focus, '--scene-thresh', threshIdx >= 0 ? args[threshIdx + 1] : '']);
const target = args.find((a) => !consumed.has(a));
if (!target) {
  console.error('usage: node tools/render_audit.mjs <video-path-or-https-url> [--focus "..."] [--scene-thresh 0.3]');
  process.exit(1);
}

const apiKey = loadEnvKey('GEMINI_API_KEY');
if (!apiKey) { console.error('GEMINI_API_KEY not found (env or .env)'); process.exit(2); }

mkdirSync(FRAME_DIR, { recursive: true });

// Resolve input → local file (Gemini upload + ffmpeg both want a path).
let videoPath = target;
if (/^https?:\/\//i.test(target)) {
  videoPath = join(OUT_DIR, 'download.mp4');
  console.error(`[download] ${target.slice(0, 80)}...`);
  const r = await fetch(target);
  if (!r.ok) { console.error(`DOWNLOAD_FAILED: HTTP ${r.status}`); process.exit(2); }
  writeFileSync(videoPath, Buffer.from(await r.arrayBuffer()));
}

// 1) Deterministic timing (ffmpeg) — fast, runs first so the timeline is pinned.
console.error('[ffmpeg] duration + scene cuts');
const duration = await probeDuration(videoPath);
if (duration == null) { console.error('FFMPEG_NO_DURATION'); process.exit(2); }
const cuts = await detectCuts(videoPath, sceneThresh);
const frames = sampleTimes(duration, cuts);
console.error(`[ffmpeg] duration=${duration.toFixed(2)}s cuts=[${cuts.map((c) => c.toFixed(2)).join(', ')}] frames=${frames.length}`);
for (const f of frames) {
  f.path = join(FRAME_DIR, `t${String(f.t).replace('.', '_')}.jpg`);
  await extractFrame(videoPath, f.t, f.path);
}

// 2) + 3) Semantic layers (Gemini) — watch (audio/content) and vision (frame text).
const ai = new GoogleGenAI({ apiKey });
const chunks = [];
for (let i = 0; i < frames.length; i += VISION_BATCH) chunks.push(frames.slice(i, i + VISION_BATCH));
console.error(`[gemini] watch (audio/transcript) + vision (${frames.length} frames in ${chunks.length} batch(es)) ...`);
const [watch, ...visionChunks] = await Promise.all([
  geminiWatch(ai, videoPath, focus).catch((e) => ({ _error: String(e.message || e) })),
  ...chunks.map((c) => geminiVision(ai, c).catch((e) => ([{ _error: String(e.message || e) }]))),
]);
const vision = visionChunks.flat();

// 4) Fuse — deterministic timeline anchors the semantic reads (merge in JS, no
// extra model call: timing is ground-truth, the model only fills text/audio).
// Group dense frames back by scene; surface the DISTINCT burned captions seen
// across the span (so a sub-second caption isn't lost) + any face-cover/band.
const visionByT = new Map(Array.isArray(vision) ? vision.map((v) => [Number(v.t), v]) : []);
const bySceneIdx = new Map();
for (const f of frames) {
  if (!bySceneIdx.has(f.scene)) {
    bySceneIdx.set(f.scene, { scene: f.scene, start_s: f.start, end_s: f.end, texts: new Map(), covers_face: false, bands: new Set(), frames: [] });
  }
  const s = bySceneIdx.get(f.scene);
  const v = visionByT.get(f.t) || {};
  const txt = (v.onscreen_text ?? '').trim();
  if (txt) { if (!s.texts.has(txt)) s.texts.set(txt, f.t); }
  if (v.covers_face) s.covers_face = true;
  if (v.band_or_box && v.band_or_box !== 'none') s.bands.add(v.band_or_box);
  s.frames.push({ t: f.t, file: f.path });
}
const timeline = [...bySceneIdx.values()].sort((a, b) => a.scene - b.scene).map((s) => ({
  scene: s.scene,
  start_s: s.start_s,
  end_s: s.end_s,
  onscreen_texts: [...s.texts.entries()].map(([text, first_seen_s]) => ({ text, first_seen_s })),
  covers_face: s.covers_face,
  band_or_box: s.bands.size ? [...s.bands].join(',') : 'none',
  frames_sampled: s.frames.length,
}));

const report = {
  source: target,
  generated_by: 'tools/render_audit.mjs',
  deterministic: {
    duration_s: +duration.toFixed(2),
    scene_cut_timestamps_s: cuts.map((c) => +c.toFixed(2)),
    scene_count: cuts.length + 1,
    frames_sampled: frames.length,
    scene_threshold: sceneThresh,
  },
  audio_and_content: watch,   // Gemini watch
  timeline,                   // per-scene: ffmpeg spans + vision-read on-screen text
  notes: 'Timing fields (duration, cuts, spans, sampled_at) are ffmpeg-measured ground truth. onscreen_text is read from a still extracted frame. audio_and_content is a single machine-watch — cross-check its timestamps against the deterministic block.',
};

const outPath = join(OUT_DIR, `${basename(videoPath).replace(/\.[^.]+$/, '')}.audit.json`);
writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
console.error(`[done] ${outPath}  (frames in ${FRAME_DIR})`);
console.log(JSON.stringify(report, null, 2));
