#!/usr/bin/env node
// Seedance 2.0 single-clip renderer (BytePlus ModelArk) — submit an
// image-to-video task and poll until the MP4 is ready. One job: a prompt
// (+ optional first/last keyframe images) -> a downloaded .mp4.
//
// Node port of tools/seedance_render.py. The cafe-PC defreezer wipes Python
// entirely, so the .mjs is the runnable path here (node_modules ships with the
// repo's npm install; this tool needs only Node built-ins, no deps). The API
// contract below is VERIFIED against the ModelArk console (2026-07-03) — see
// workflows/cinematic_pipeline.md "Notes / learnings".
//
// Usage:
//   node tools/seedance_render.mjs --prompt "<text>" --out out.mp4 \
//     [--first-frame path.png] [--last-frame path.png] \
//     [--aspect 9:16] [--duration 5] [--resolution 4k] \
//     [--mode standard|fast|mini] [--dry-run]
//
// Exit codes: 0 ok, 1 usage/input error, 2 auth/API/download failure,
//             3 render failed (task returned a non-success terminal status).
// Secrets: ARK_API_KEY (or SEEDANCE_API_KEY) from environment or repo-root .env.
import { readFileSync, existsSync, statSync, mkdirSync, createWriteStream } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_BASE_URL = 'https://ark.ap-southeast.bytepluses.com/api/v3';
const DEFAULT_MODEL_ID = 'dreamina-seedance-2-0-260128';
// Mode -> model id. Only the full 2.0 model supports 4K; fast/mini cap at 720p.
const MODE_MODELS = {
  standard: DEFAULT_MODEL_ID,
  fast: 'dreamina-seedance-2-0-fast-260128',
  mini: 'dreamina-seedance-2-0-mini-260615',
};

// --- .env fallback (manual parse, no dotenv dep — mirrors tools/render_qa.mjs) ---
let ENV_CACHE = null;
function envVal(name) {
  if (process.env[name]) return process.env[name];
  if (ENV_CACHE === null) {
    ENV_CACHE = {};
    try {
      const text = readFileSync(resolve(REPO_ROOT, '.env'), 'utf8');
      for (const line of text.split(/\r?\n/)) {
        const t = line.trim();
        if (!t || t.startsWith('#') || !t.includes('=')) continue;
        const i = t.indexOf('=');
        ENV_CACHE[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^['"]|['"]$/g, '');
      }
    } catch { /* no .env */ }
  }
  return ENV_CACHE[name] || null;
}

// --- flag parsing (mirrors tools/codex-image-batch.mjs) ---
const args = process.argv.slice(2);
const flag = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const has = (name) => args.includes(name);

const die = (msg, code = 1) => { console.error(`[seedance] ${msg}`); process.exit(code); };

const prompt = flag('--prompt');
const out = flag('--out');
const firstFrame = flag('--first-frame');
const lastFrame = flag('--last-frame');
// --ref is repeatable: multi-angle product/character reference images
// (Seedance 2.0 multimodal reference, role "reference_image", max 9).
const refs = [];
for (let i = 0; i < args.length; i++) if (args[i] === '--ref' && args[i + 1]) refs.push(args[i + 1]);
if (refs.length > 9) die('too many --ref images (Seedance 2.0 caps reference_image at 9)');
// API constraint (verified live 2026-07-03): reference_image content cannot be
// mixed with first/last frame content — pick ONE consistency lever per render.
if (refs.length && (firstFrame || lastFrame)) die('--ref cannot be combined with --first-frame/--last-frame (Seedance API rejects mixed content; choose keyframes OR references)');
const aspect = flag('--aspect', '9:16');
const duration = flag('--duration', '5');
const mode = flag('--mode', 'standard');
const resolutionFlag = flag('--resolution');
const dry = has('--dry-run');
const pollInterval = Math.max(1, parseInt(flag('--poll-interval', '10'), 10) || 10);
const timeout = Math.max(30, parseInt(flag('--timeout', '900'), 10) || 900);

if (!prompt) die('missing --prompt');
if (!out) die('missing --out');
if (!MODE_MODELS[mode]) die(`invalid --mode "${mode}" (expected standard|fast|mini)`);
// last_frame + first_frame are a matched pair on Seedance — reject a lone last.
if (lastFrame && !firstFrame) die('--last-frame requires --first-frame (Seedance needs both roles together)');

// Model: honor SEEDANCE_MODEL_ID as the override for the standard default; the
// fast/mini shortcuts always map to their dedicated model ids.
const model = mode === 'standard'
  ? (envVal('SEEDANCE_MODEL_ID') || DEFAULT_MODEL_ID)
  : MODE_MODELS[mode];

// Resolution: only the full 2.0 model does 4K. Default 4k on standard, 720p on
// fast/mini. Explicit 4k with fast/mini is a hard error.
const capped = mode === 'fast' || mode === 'mini';
if (resolutionFlag === '4k' && capped) {
  die(`resolution 4k is not supported in "${mode}" mode — only standard (2.0 full) renders 4K; drop --resolution or use --mode standard`);
}
const resolution = resolutionFlag || (capped ? '720p' : '4k');

const baseUrl = (envVal('SEEDANCE_BASE_URL') || DEFAULT_BASE_URL).replace(/\/+$/, '');
const createUrl = `${baseUrl}/contents/generations/tasks`;

function mimeFor(p) {
  const ext = extname(p).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

// http(s) refs pass through; local files inline as base64 data URLs.
function imageUrl(p) {
  if (/^https?:\/\//i.test(p)) return p;
  if (!existsSync(p)) die(`image not found: ${p}`);
  const b64 = readFileSync(p).toString('base64');
  return `data:${mimeFor(p)};base64,${b64}`;
}

function addImage(content, p, role) {
  let url;
  if (/^https?:\/\//i.test(p)) url = p;
  else if (dry) {
    const size = existsSync(p) ? `${statSync(p).size} bytes elided` : `missing local file: ${p}`;
    url = `data:${mimeFor(p)};base64,<${size}>`;
  } else url = imageUrl(p);
  content.push({ type: 'image_url', image_url: { url }, role });
}

function buildBody() {
  const content = [{ type: 'text', text: prompt }];
  if (firstFrame) addImage(content, firstFrame, 'first_frame');
  if (lastFrame) addImage(content, lastFrame, 'last_frame');
  for (const r of refs) addImage(content, r, 'reference_image');
  // Top-level render params — NOT appended to the prompt text. No seed (ignored on 2.0).
  return { model, content, resolution, ratio: aspect, duration: Number(duration), watermark: false, generate_audio: true };
}

const body = buildBody();

if (dry) {
  console.log(JSON.stringify({
    model,
    POST: createUrl,
    headers: { Authorization: 'Bearer <ARK_API_KEY>', 'Content-Type': 'application/json' },
    body,
    note: 'dry-run — no network calls made',
  }, null, 2));
  process.exit(0);
}

const key = envVal('ARK_API_KEY') || envVal('SEEDANCE_API_KEY');
if (!key) die('no API key — set ARK_API_KEY (or SEEDANCE_API_KEY) in the environment or repo-root .env (use --dry-run to test offline)', 2);

const headers = { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Request with 429 exponential backoff (2.0 beta: ~2 QPS, max 3 concurrent tasks).
async function apiFetch(url, init, { label }) {
  const MAX_RETRIES = 5;
  for (let attempt = 0; ; attempt++) {
    let res;
    try {
      res = await fetch(url, init);
    } catch (e) {
      die(`network error on ${label}: ${e.message}`, 2);
    }
    if (res.status === 429) {
      if (attempt >= MAX_RETRIES) die(`rate limited (429) on ${label} after ${MAX_RETRIES} retries`, 2);
      const wait = Math.min(30000, 1000 * 2 ** attempt);
      console.error(`[seedance] 429 on ${label} — backing off ${wait / 1000}s (retry ${attempt + 1}/${MAX_RETRIES})`);
      await sleep(wait);
      continue;
    }
    const text = await res.text();
    let json;
    try { json = text ? JSON.parse(text) : {}; } catch { json = { _raw: text }; }
    if (!res.ok) die(`API ${res.status} on ${label}: ${text.slice(0, 500)}`, 2);
    return json;
  }
}

// 1) create task
const created = await apiFetch(createUrl, { method: 'POST', headers, body: JSON.stringify(body) }, { label: 'create' });
const taskId = created.id || created.task_id;
if (!taskId) die(`no task id in create response: ${JSON.stringify(created).slice(0, 500)}`, 2);
console.error(`[seedance] task ${taskId} submitted; polling every ${pollInterval}s…`);

// 2) poll — status enum: queued | running | cancelled | succeeded | failed | expired
const pollUrl = `${baseUrl}/contents/generations/tasks/${taskId}`;
const deadline = Date.now() + timeout * 1000;
let task = {};
while (Date.now() < deadline) {
  task = await apiFetch(pollUrl, { method: 'GET', headers }, { label: 'poll' });
  const status = (task.status || '').toLowerCase();
  if (status === 'succeeded') break;
  if (status === 'failed') {
    const err = task.error || {};
    die(`render failed — ${err.code || 'unknown'}: ${err.message || JSON.stringify(task).slice(0, 500)}`, 3);
  }
  if (status === 'cancelled' || status === 'expired') die(`render ${status} for task ${taskId}`, 3);
  await sleep(pollInterval * 1000);
}
if ((task.status || '').toLowerCase() !== 'succeeded') die(`timed out after ${timeout}s waiting on task ${taskId}`, 2);

// 3) download immediately — content.video_url EXPIRES IN 24 HOURS.
const videoUrl = task.content && task.content.video_url;
if (!videoUrl) die(`task succeeded but no content.video_url found: ${JSON.stringify(task).slice(0, 500)}`, 2);

const outPath = resolve(out);
mkdirSync(dirname(outPath), { recursive: true });
let dl;
try {
  dl = await fetch(videoUrl);
} catch (e) {
  die(`download failed from video_url: ${e.message}`, 2);
}
if (!dl.ok) die(`download failed — HTTP ${dl.status} from video_url`, 2);
await pipeline(Readable.fromWeb(dl.body), createWriteStream(outPath));
if (!existsSync(outPath) || statSync(outPath).size === 0) die(`downloaded file is empty: ${outPath}`, 2);

console.error(`[seedance] saved ${statSync(outPath).size} bytes`);
console.log(outPath);
