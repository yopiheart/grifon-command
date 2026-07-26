#!/usr/bin/env node
// Production Veo 3.1 talking-clip renderer (Kuya Marvin Lane A / ads) — the
// generalized sibling of veo-motion-test.mjs: same Gate-1-proven recipe
// (lite model, 9:16 1080p 8s, EXPRESSION LOCK, raw-ugc), pero ang linya at
// setting ay arguments na. Direct Gemini API (bypasses app auth/quota).
// Usage (repo root):
//   node clients/oceanides/kuya-marvin/test-rigs/veo-produce.mjs \
//     --image <plate.png> --out <out.mp4> --line "<Taglish dialogue>" \
//     [--setting "<framing/location sentence>"] [--model veo-3.1-lite-generate-preview] \
//     [--formula optionb]
//
// --formula optionb (KM-003+) builds the prompt from the app's tuned Director AI
// OPTION B talking-scene formula (services/geminiService.ts ~L2491): dialogue
// first, FRAME 0 mid-syllable rule, ONE gentle push-in starting on the first
// syllable (no handheld), END-CLEAN tail. Fixes the KM-002 pacing drag Neil
// flagged (Veo stretched dialogue to fill 8s). Marvin delta vs the app formula:
// EXPRESSION LOCK stays — identity is our law, emotion is carried by the voice.
// Default (no flag) = the KM-002 Gate-1 recipe, untouched.
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
if (!dialogue) throw new Error('--line required (the exact Taglish sentence he speaks)');
mkdirSync(path.dirname(outPath), { recursive: true });

const FORMULA = (arg('--formula') || 'km002').toLowerCase();

// Shared across both formulas — identity is the law of this lane.
const EXPRESSION_LOCK =
  'EXPRESSION LOCK — CRITICAL: his facial expression stays CONSTANT and calm for the entire video, identical to the input image in every frame. Only his mouth, jaw, and lips move to articulate the words, plus natural eye blinks and very slight natural head sway. NO eyebrow raises, NO forehead wrinkling or furrowing, NO squinting, NO smiling wider, NO frowning, NO expression changes of any kind — the eyes, eyebrows, forehead, nose, and cheeks keep the exact same relaxed set from the first frame to the last. Mouth movement precisely synced to the Taglish words.';

const RAW_LOOK =
  'Raw ungraded look: authentic smartphone front-camera video, natural warm tan Filipino skin tone with slight color saturation exactly as the input image, no color grading, no cinematic look, no beauty filter, no captions, no text overlays.';

let PROMPT;
if (FORMULA === 'optionb') {
  const SETTING = arg('--setting') ||
    'Setting and framing stay exactly as the input image: a VERY CLOSE arm\'s-length front-camera selfie — his face fills most of the frame from just above his head to his upper chest, direct eye contact, background exactly as shown. Keep this exact close framing for the whole video, no cuts, the camera never pulls back.';
  PROMPT = [
    // Option B rule: lead with the dialogue in quotes.
    `"${dialogue}" — the man from the input image, keep his face, hairstyle and identity exactly as shown, says this straight down the lens in a vertical phone selfie video.`,
    'FRAME 0 RULE — CRITICAL: he is ALREADY mid-syllable when the clip opens — mouth in motion, the first word actively forming, eyes already engaged with the lens. NO establishing pose, NO pre-speech beat, NO settling in, NO initially resting. The first frame IS the action. The clip ends on the next breath, NOT on a post-speech resolve-state with a closed mouth.',
    // PACE ONLY — no emotional-affect words. The clip's tone comes from the
    // ElevenLabs clone in the STS pass downstream; all Veo has to get right is
    // lip-motion SPEED. KM-003 s1 roll 1 proved that "warm, upbeat, excited
    // kuya" here fights EXPRESSION LOCK and buys a teeth-baring grin the plate
    // never had. Energy is carried by the VOICE (skill: PACING & ENERGY).
    'Pace: he speaks the full line at a brisk, natural conversational clip and finishes it well within the shot — never slow, never drawn out, never stretching or padding syllables to fill time. Natural conversational Taglish (Filipino mixed with English) with an authentic Filipino accent — never an American accent.',
    EXPRESSION_LOCK,
    'NO SMILE: he does NOT smile, grin, or bare his teeth at any point. His mouth opens ONLY as far as the words require and returns to the exact neutral set of the input image between syllables. No cheek-raising, no lip-corner lift, no laughing expression.',
    'Camera: ONE gentle move only — a slow, smooth push-in toward him that BEGINS ON THE FIRST SYLLABLE and runs evenly through the line. No handheld shake, no jitter, no counter-roll, no lens breathing, no rack or pull focus, no parallax or background-reveal shifts. Err toward calm over dynamic.',
    'BACKGROUND LOCK — CRITICAL: the background is IDENTICAL to the input image in every single frame — the same structures, the same vehicles, the same walls and foliage in the same positions. Nothing in the background changes, drifts, is replaced, appears, or disappears. The camera does not orbit, pan, or reveal any part of the scene that is not already visible in the input image. He also keeps his hands down and out of frame — no gestures, no pointing, no raised fingers.',
    SETTING,
    'Audio landscape: quiet residential street sync sound — faint distant traffic, a light breeze. His voice is close and clear, phone-mic quality.',
    RAW_LOOK,
    'END-CLEAN RULE: the final second holds the live shot clean and fully opaque to the last frame. Avoid cross-dissolve, double-exposure, ghosting, or fade in the final second. Avoid low quality, blurry, distorted, deformation, morphing, melting, glitching, extra limbs, text, watermark, writing, letters, subtitles.',
  ].join(' ');
} else {
  const SETTING = arg('--setting') ||
    'Setting and framing stay exactly as the input image: a VERY CLOSE arm\'s-length front-camera selfie — his face fills most of the frame from just above his head to his upper chest, direct eye contact. Keep this exact close framing for the whole video. No camera moves other than handheld micro-shake, no zoom, no cuts, the camera never pulls back.';
  PROMPT = [
    'The man from the input image — keep his face, hairstyle and identity exactly as shown — talks directly to the camera in a vertical handheld phone selfie video, arm extended, slight natural handheld shake.',
    `He speaks calm and direct, like a knowledgeable neighbor, in natural conversational Taglish (Filipino mixed with English) with an authentic Filipino accent — never an American accent. He says: "${dialogue}"`,
    EXPRESSION_LOCK,
    SETTING,
    'Ambient audio: quiet residential street — faint distant traffic, a light breeze. His voice is close and clear, phone-mic quality.',
    RAW_LOOK,
  ].join(' ');
}

const ai = new GoogleGenAI({ apiKey: key });
const imageBytes = readFileSync(imagePath).toString('base64');
const mimeType = imagePath.toLowerCase().match(/\.jpe?g$/) ? 'image/jpeg' : 'image/png';

const MODEL = arg('--model') || 'veo-3.1-lite-generate-preview';
console.log(`[veo-produce] submitting: ${MODEL}, 9:16, 1080p, 8s, formula=${FORMULA}, image=${imagePath}`);
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
  console.log(`[veo-produce] polling... ${Math.round((Date.now() - t0) / 1000)}s`);
}

if (operation.error) throw new Error(`Veo error: ${JSON.stringify(operation.error)}`);
const video = operation.response?.generatedVideos?.[0]?.video;
if (!video) throw new Error(`No video in response: ${JSON.stringify(operation.response ?? {}).slice(0, 2000)}`);

await ai.files.download({ file: video, downloadPath: outPath });
if (!existsSync(outPath) && video.videoBytes) writeFileSync(outPath, Buffer.from(video.videoBytes, 'base64'));
if (!existsSync(outPath)) throw new Error('download produced no file');
console.log(`[veo-produce] ✓ saved ${outPath} in ${Math.round((Date.now() - t0) / 1000)}s`);
