// Take 2 — hardened STEADY-FACE prompt (Neil: take 1 laughed). Changes: facial lock
// immediately after dialogue, zero smile-adjacent adjectives, delivery = flat statement
// of fact, explicit no-laugh/no-smile, negatives include laughing/giggling/smirking.
import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
  readFileSync(resolve(repo, '.env'), 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing in .env');

const plate = readFileSync(resolve(repo, '.tmp/concierge-poc/scene-walk-bgc-zam.png')).toString('base64');

const prompt = `"Buong ad na to, ginawa ng AI. Pati yung mukha ko." FACIAL LOCK, ABSOLUTE AND NON-NEGOTIABLE: her face holds ONE fixed, composed, matter-of-fact expression for every single frame of this clip. She does NOT laugh. She does NOT giggle. She does NOT smile at any point. She does NOT smirk. Her expression never brightens, never softens, never reacts. No eyebrow movement, no head tilts, no squinting, no widening eyes. ONLY her mouth articulates the words, plus ordinary blinks. Her face, bone structure, and features remain perfectly identical to the start frame from first frame to last frame. She speaks the Taglish line in an even, level, matter-of-fact tone — stating a plain fact, not telling a joke, not amused, not performing. Natural Filipina accent, conversational volume. She is walking at a relaxed steady pace along the BGC sidewalk filming herself with the phone in her own extended right arm; the front camera keeps a smooth, subtle walking sway — no jitter, no shake — framing locked on her head and shoulders. At frame 0 she is already mid-syllable and mid-stride, mouth forming the first word, eyes on the lens. Her free left hand gestures at chest height in rhythm with her words — the hands carry all the expressiveness, never the face. Blurred pedestrians, planters, and glass buildings pass behind her with stable exposure. Audio: her voice in sync with her lips, daytime city ambience, distant traffic. The clip ends mid-breath. Avoid laughing, giggling, smiling, smirking, expression changes, face warping, identity change, changing facial features, deformation, morphing, melting, glitching, low quality, blurry, distorted, extra limbs, extra fingers, text, watermark, writing, letters, subtitles.`;

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
let operation = await ai.models.generateVideos({
  model: 'veo-3.1-fast-generate-preview',
  prompt,
  image: { imageBytes: plate, mimeType: 'image/png' },
  config: { numberOfVideos: 1, aspectRatio: '9:16', resolution: '720p', durationSeconds: 6 },
});
console.log('submitted', operation.name);

while (!operation.done) {
  await new Promise(r => setTimeout(r, 8000));
  operation = await ai.operations.getVideosOperation({ operation });
  console.log('polling...');
}

if (operation.error) throw new Error('VEO_ERROR: ' + JSON.stringify(operation.error));
const vid = operation.response?.generatedVideos?.[0]?.video;
if (!vid?.uri) throw new Error('No video URI: ' + JSON.stringify(operation.response).slice(0, 1500));
const sep = vid.uri.includes('?') ? '&' : '?';
const res = await fetch(`${vid.uri}${sep}key=${env.GEMINI_API_KEY}`);
if (!res.ok) throw new Error(`download failed: ${res.status}`);
writeFileSync(resolve(repo, '.tmp/concierge-poc/scene-walk-bgc-veo-take2.mp4'), Buffer.from(await res.arrayBuffer()));
console.log('saved scene-walk-bgc-veo-take2.mp4');
