// Veo render: BGC walking selfie-vlog scene, ONE locked facial expression (Neil rule 2026-07-21),
// energy in hand gestures + walking rhythm only. Same submit shape as render-scene1-v2.mjs.
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

const prompt = `"Buong ad na to, ginawa ng AI. Pati yung mukha ko." She delivers the line in casual, warm, confident spoken Taglish (Filipino-English mix) with a natural Filipina accent while walking. Front-camera selfie vlog: she holds the phone in her own extended right arm while walking at a relaxed pace along the BGC sidewalk; the camera keeps a smooth, subtle, natural walking sway — no jitter, no shake, no whip movements, framing stays on her head and shoulders. At frame 0 she is ALREADY mid-syllable and mid-stride — mouth actively forming the first word, eyes locked on the lens, no establishing pose. CRITICAL FACIAL DISCIPLINE: her facial expression stays EXACTLY ONE steady, calm, confident neutral-warm state for the ENTIRE clip — no smile changes, no eyebrow raises, no head tilts, no squinting, no surprise, no reaction beats of any kind; ONLY her mouth moves to form the words, plus natural blinks. Her face, bone structure, and features stay perfectly identical to the start frame from first frame to last. All expressiveness lives in her free left hand, which gestures naturally at chest height punctuating her words, and in her relaxed walking rhythm. The BGC street moves past naturally behind her — blurred pedestrians, planters, glass buildings — with stable exposure. Audio landscape: her voice in sync with her lips, daytime city ambience, distant traffic hum, faint footsteps. The clip ends on her next breath, not a resolved pause. Avoid low quality, blurry, distorted, deformation, morphing, melting, glitching, face warping, identity change, changing facial features, extra limbs, extra fingers, text, watermark, writing, letters, subtitles.`;

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
  console.log('polling... done =', operation.done);
}

if (operation.error) throw new Error('VEO_ERROR: ' + JSON.stringify(operation.error));
const vid = operation.response?.generatedVideos?.[0]?.video;
if (!vid?.uri) throw new Error('No video URI in response: ' + JSON.stringify(operation.response).slice(0, 1500));

const sep = vid.uri.includes('?') ? '&' : '?';
const res = await fetch(`${vid.uri}${sep}key=${env.GEMINI_API_KEY}`);
if (!res.ok) throw new Error(`download failed: ${res.status}`);
writeFileSync(resolve(repo, '.tmp/concierge-poc/scene-walk-bgc-veo.mp4'), Buffer.from(await res.arrayBuffer()));
console.log('saved scene-walk-bgc-veo.mp4');
