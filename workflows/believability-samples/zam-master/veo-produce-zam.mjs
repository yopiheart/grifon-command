#!/usr/bin/env node
// Zam Veo 3.1 talking/motion-test renderer — adapted from the Gate-1-proven
// clients/oceanides/kuya-marvin/test-rigs/veo-produce.mjs (KM-002 recipe):
// same lite model, 9:16 1080p 8s, EXPRESSION LOCK, raw-ugc look — pronouns and
// default setting adapted for Zam. Direct Gemini API (bypasses app auth/quota).
// Usage (repo root):
//   node workflows/believability-samples/zam-master/veo-produce-zam.mjs \
//     --image <plate.png> --out <out.mp4> --line "<Taglish dialogue>" \
//     [--setting "<framing/location sentence>"] [--model veo-3.1-lite-generate-preview]
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
const outPath = arg('--out');
const dialogue = arg('--line');
if (!imagePath || !existsSync(imagePath)) throw new Error(`--image not found: ${imagePath}`);
if (!outPath) throw new Error('--out required');
if (!dialogue) throw new Error('--line required (the exact Taglish sentence she speaks)');
mkdirSync(path.dirname(outPath), { recursive: true });

const EXPRESSION_LOCK =
  'EXPRESSION LOCK — CRITICAL: her facial expression stays CONSTANT and calm for the entire video, identical to the input image in every frame. Only her mouth, jaw, and lips move to articulate the words, plus natural eye blinks and very slight natural head sway. NO eyebrow raises, NO forehead wrinkling or furrowing, NO squinting, NO smiling wider, NO frowning, NO expression changes of any kind — the eyes, eyebrows, forehead, nose, and cheeks keep the exact same relaxed set from the first frame to the last. Mouth movement precisely synced to the Taglish words.';

const RAW_LOOK =
  'Raw ungraded look: authentic smartphone video, natural warm light-tan Filipina skin tone with real pores and texture exactly as the input image, no color grading beyond what the input image already has, no beauty filter, no captions, no text overlays.';

const SETTING = arg('--setting') ||
  'Setting and framing stay exactly as the input image: a waist-up shot of her leaning a forearm on the concrete terrace rail at dusk, holding an iced coffee cup, the dusk sky and city rooftops behind her. Keep this exact framing for the whole video. The camera is LOCKED and static — no camera moves, no zoom, no cuts, no handheld shake.';

const PROMPT = [
  'The woman from the input image — keep her face, hairstyle and identity exactly as shown — talks directly to the camera in a vertical phone video.',
  `She speaks relaxed and warm, in natural conversational Taglish (Filipino mixed with English) with an authentic Filipina accent — never an American accent. She says: "${dialogue}"`,
  'Pace: she speaks the full line at a brisk, natural conversational clip and finishes it well within the shot — never slow, never drawn out, never stretching or padding syllables to fill time.',
  EXPRESSION_LOCK,
  'BACKGROUND LOCK — CRITICAL: the background is IDENTICAL to the input image in every single frame — the same rooftops, sky, water tank and rail in the same positions. Nothing in the background changes, drifts, is replaced, appears, or disappears. Her hands stay where they are in the input image — no gestures.',
  SETTING,
  'Ambient audio: quiet rooftop at dusk — faint distant city hum, a light breeze. Her voice is close and clear, phone-mic quality.',
  RAW_LOOK,
  'END-CLEAN RULE: the final second holds the live shot clean and fully opaque to the last frame. Avoid cross-dissolve, double-exposure, ghosting, or fade in the final second. Avoid low quality, blurry, distorted, deformation, morphing, melting, glitching, extra limbs, text, watermark, writing, letters, subtitles.',
].join(' ');

const ai = new GoogleGenAI({ apiKey: key });
const imageBytes = readFileSync(imagePath).toString('base64');
const mimeType = imagePath.toLowerCase().match(/\.jpe?g$/) ? 'image/jpeg' : 'image/png';

const MODEL = arg('--model') || 'veo-3.1-lite-generate-preview';
console.log(`[veo-zam] submitting: ${MODEL}, 9:16, 1080p, 8s, image=${imagePath}`);
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
  console.log(`[veo-zam] polling... ${Math.round((Date.now() - t0) / 1000)}s`);
}

if (operation.error) throw new Error(`Veo error: ${JSON.stringify(operation.error)}`);
const video = operation.response?.generatedVideos?.[0]?.video;
if (!video) throw new Error(`No video in response: ${JSON.stringify(operation.response ?? {}).slice(0, 2000)}`);

await ai.files.download({ file: video, downloadPath: outPath });
if (!existsSync(outPath) && video.videoBytes) writeFileSync(outPath, Buffer.from(video.videoBytes, 'base64'));
if (!existsSync(outPath)) throw new Error('download produced no file');
console.log(`[veo-zam] ✓ saved ${outPath} in ${Math.round((Date.now() - t0) / 1000)}s`);
