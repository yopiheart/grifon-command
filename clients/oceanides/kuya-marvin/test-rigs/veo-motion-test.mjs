#!/usr/bin/env node
// ONE Veo 3.1 talking test for Gate 1 (Kuya Marvin) — dev-time script, direct
// Gemini API (bypasses app auth/quota; same GEMINI_API_KEY the api/ proxies use).
// Model: veo-3.1-lite per Neil (matipid). Dialogue: Taglish per Neil.
// Usage (repo root): node .tmp/veo-motion-test.mjs --image <still.png> --out <out.mp4>
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { GoogleGenAI } from '@google/genai';

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const key = process.env.GEMINI_API_KEY;
if (!key) throw new Error('GEMINI_API_KEY missing in .env');

const argv = process.argv.slice(2);
const arg = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
const imagePath = arg('--image');
const outPath = arg('--out') || 'clients/oceanides/kuya-marvin/motion-test/marvin-veo-test-1.mp4';
if (!imagePath || !existsSync(imagePath)) throw new Error(`--image not found: ${imagePath}`);
mkdirSync(path.dirname(outPath), { recursive: true });

const PROMPT = [
  'The man from the input image — keep his face, hairstyle and identity exactly as shown — talks directly to the camera in a vertical handheld phone selfie video, arm extended, slight natural handheld shake.',
  'He speaks calm and direct, like a knowledgeable neighbor giving a friendly warning, in natural conversational Taglish (Filipino mixed with English) with an authentic Filipino accent — never an American accent. He says: "Guys, huwag n\'yong buhusan ng muriatic acid \'yung baradong inodoro ha — seryoso ako. Kapag paulit-ulit \'yung bara, malamang full na \'yung septic tank n\'yo."',
  'EXPRESSION LOCK — CRITICAL: his facial expression stays CONSTANT and calm for the entire video, identical to the input image in every frame. Only his mouth, jaw, and lips move to articulate the words, plus natural eye blinks and very slight natural head sway. NO eyebrow raises, NO forehead wrinkling or furrowing, NO squinting, NO smiling wider, NO frowning, NO expression changes of any kind — the eyes, eyebrows, forehead, nose, and cheeks keep the exact same relaxed set from the first frame to the last. Mouth movement precisely synced to the Taglish words.',
  arg('--setting') || 'Setting and framing stay exactly as the input image: a VERY CLOSE arm\'s-length front-camera selfie — his face fills most of the frame from just above his head to his upper chest, direct eye contact — standing in front of the blue tank of a septic vacuum truck under a flat overcast sky. Keep this exact close framing for the whole video. No camera moves other than handheld micro-shake, no zoom, no cuts, the camera never pulls back.',
  'Ambient audio: quiet street by the truck — faint distant traffic, a light breeze. His voice is close and clear, phone-mic quality.',
  'Raw ungraded look: authentic smartphone front-camera video, natural warm tan Filipino skin tone with slight color saturation exactly as the input image, no color grading, no cinematic look, no beauty filter, no captions, no text overlays.',
].join(' ');

const ai = new GoogleGenAI({ apiKey: key });
const imageBytes = readFileSync(imagePath).toString('base64');
const mimeType = imagePath.toLowerCase().match(/\.jpe?g$/) ? 'image/jpeg' : 'image/png';

const MODEL = arg('--model') || 'veo-3.1-lite-generate-preview';
console.log(`[veo-test] submitting: ${MODEL}, 9:16, 1080p, 8s, image=${imagePath}`);
let operation = await ai.models.generateVideos({
  model: MODEL,
  prompt: PROMPT,
  image: { imageBytes, mimeType },
  config: { aspectRatio: '9:16', resolution: '1080p', durationSeconds: 8 },
});

const t0 = Date.now();
while (!operation.done) {
  await new Promise((r) => setTimeout(r, 15000));
  operation = await ai.operations.getVideosOperation({ operation });
  console.log(`[veo-test] polling... ${Math.round((Date.now() - t0) / 1000)}s`);
}

if (operation.error) throw new Error(`Veo error: ${JSON.stringify(operation.error)}`);
const video = operation.response?.generatedVideos?.[0]?.video;
if (!video) throw new Error(`No video in response: ${JSON.stringify(operation.response ?? {}).slice(0, 2000)}`);

await ai.files.download({ file: video, downloadPath: outPath });
if (!existsSync(outPath) && video.videoBytes) writeFileSync(outPath, Buffer.from(video.videoBytes, 'base64'));
if (!existsSync(outPath)) throw new Error('download produced no file');
console.log(`[veo-test] ✓ saved ${outPath} in ${Math.round((Date.now() - t0) / 1000)}s`);
