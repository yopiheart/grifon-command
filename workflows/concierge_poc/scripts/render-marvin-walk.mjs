// Marvin BGC walking talking test — Lane A validated recipe: Veo 3.1 LITE + skill's
// proven EXPRESSION LOCK wording. Neil specs: locked face, eye contact, LEFT hand only
// moves, right (camera) hand rock-steady.
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

const plate = readFileSync(resolve(repo, '.tmp/concierge-poc/marvin-walk-bgc.png')).toString('base64');

const prompt = `"Buong ad na to, ginawa ng AI. Pati yung mukha ko." He speaks the Taglish line in an even, level, matter-of-fact conversational tone with a natural Filipino accent — stating a plain fact, not telling a joke, not amused. EXPRESSION LOCK, ABSOLUTE: his expression stays CONSTANT and calm for the entire video, identical to the input image in every frame; only his mouth, jaw, and lips move to form the words, plus natural blinks and slight head sway from walking; NO eyebrow, forehead, squint, smile, or expression changes of any kind. His face stays exactly as handsome and composed as the input image — no distortion, no warping, no changing facial features. His eyes hold steady direct contact with the lens for the entire clip. HAND RULE: his right arm holding the phone stays completely steady and LOCKED in position — the grip never shifts, the framing stays constant like a practiced vlogger's hold, only a smooth subtle natural walking sway in the image, no jitter, no shake. ONLY his free left hand moves, gesturing naturally at chest height in rhythm with his words. He walks at a relaxed steady pace along the BGC sidewalk; blurred pedestrians, planters, and glass buildings drift past behind him, exposure stable, flat overcast daylight unchanged. At frame 0 he is already mid-syllable and mid-stride, mouth forming the first word, eyes on the lens. Audio: his voice in sync with his lips, daytime city ambience, distant traffic. The clip ends mid-breath. Avoid laughing, giggling, smiling, smirking, expression changes, face warping, identity change, changing facial features, ugly distortion, deformation, morphing, melting, glitching, camera jitter, camera shake, right-hand movement, low quality, blurry, extra limbs, extra fingers, text, watermark, writing, letters, subtitles.`;

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
let operation = await ai.models.generateVideos({
  model: 'veo-3.1-lite-generate-preview',
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
writeFileSync(resolve(repo, '.tmp/concierge-poc/marvin-walk-bgc-veo.mp4'), Buffer.from(await res.arrayBuffer()));
console.log('saved marvin-walk-bgc-veo.mp4');
