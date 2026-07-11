// WEDGE GATE #1 — Veo identity-in-motion test (one-off, Neil-authorized 2026-07-11).
// Animates the regenerated gpt-image-2 reference-stacked still (c01) with a talking
// raw-ugc beat and saves the RAW/ungraded clip for identity judgment.
// Mirrors api/gemini/video.ts (generateVideos) + video/poll.ts (REST poll + uri download).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { GoogleGenAI } from '@google/genai';

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
const apiKey = env.GEMINI_API_KEY;
if (!apiKey) throw new Error('GEMINI_API_KEY missing from .env');

const MODEL = 'veo-3.1-fast-generate-preview';
const STILL = '.tmp/refstack/shootout/outputs/codex/c01-01.png';
const OUT_DIR = '.tmp/refstack/motion-gate';
const OUT = `${OUT_DIR}/c01-motion-01.mp4`;

const PROMPT =
  'A raw handheld smartphone selfie video, vertical. The woman keeps lying on the ' +
  'checkered pillow exactly as shown, holding the phone selfie-style. She talks ' +
  'casually to the camera in Taglish with a playful smirk: "Grabe besh, tatlong ' +
  'linggo ko na ginagamit ito... sobrang glow na ng skin ko, promise." Natural ' +
  'lip-sync, natural micro-expressions and small head movements, she keeps eye ' +
  'contact with the lens. Dim indoor lighting stays exactly as in the image, slight ' +
  'handheld shake, authentic skin texture with slight grain, one continuous take, ' +
  'no cuts, no zoom, raw and unedited look.';

const ai = new GoogleGenAI({ apiKey });
mkdirSync(OUT_DIR, { recursive: true });

console.log('[gate] submitting', MODEL);
let operation = await ai.models.generateVideos({
  model: MODEL,
  prompt: PROMPT,
  image: { imageBytes: readFileSync(STILL).toString('base64'), mimeType: 'image/png' },
  config: { aspectRatio: '9:16', personGeneration: 'allow_adult' },
});
console.log('[gate] operation:', operation?.name);

const started = Date.now();
let op = operation;
while (!op?.done) {
  if (Date.now() - started > 8 * 60_000) throw new Error('poll timeout after 8min');
  await new Promise((r) => setTimeout(r, 12_000));
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/${op.name}?key=${encodeURIComponent(apiKey)}`
  );
  if (!res.ok) throw new Error(`poll http ${res.status}: ${(await res.text()).slice(0, 300)}`);
  op = await res.json();
  console.log('[gate] polling...', op?.done ? 'DONE' : 'pending', Math.round((Date.now() - started) / 1000) + 's');
}
if (op.error) throw new Error('VEO error: ' + JSON.stringify(op.error).slice(0, 500));

const generated =
  op.response?.generateVideoResponse?.generatedSamples ??
  op.response?.generate_video_response?.generated_samples ??
  op.response?.generatedVideos ??
  op.response?.generated_videos;
const video = generated?.[0]?.video;
if (!video) throw new Error('VEO_NO_OUTPUT: ' + JSON.stringify(op.response ?? {}).slice(0, 500));

let buffer;
if (video.videoBytes ?? video.video_bytes) {
  buffer = Buffer.from(video.videoBytes ?? video.video_bytes, 'base64');
} else if (video.uri) {
  const sep = video.uri.includes('?') ? '&' : '?';
  const dl = await fetch(`${video.uri}${sep}key=${encodeURIComponent(apiKey)}`);
  if (!dl.ok) throw new Error(`download http ${dl.status}`);
  buffer = Buffer.from(await dl.arrayBuffer());
} else {
  throw new Error('VEO_EMPTY_VIDEO');
}
writeFileSync(OUT, buffer);
console.log('[gate] saved', OUT, Math.round(buffer.length / 1024) + 'KB');
