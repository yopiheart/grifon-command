// Direct Veo render of the Scene-1 plate with the Taglish hook baked in as dialogue.
// Mirrors the app's generateVideo submit params (Veo_3.1_Fast lane) and polls to completion.
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

const plate = readFileSync(resolve(repo, '.tmp/concierge-poc/scene1-zam-v2.png')).toString('base64');

const prompt = `"Buong ad na to, ginawa ng AI. Pati yung mukha ko." She delivers the line in casual, warm, confident spoken Taglish (Filipino-English mix) with a natural Filipina accent. A subtle, slow push-in on a 35mm lens toward her begins exactly with her first syllable. At frame 0 she is ALREADY mid-syllable — mouth actively forming the first word, eyes locked on the lens, no establishing pose and no pre-speech beat. Performance and micro-expressions: a knowing half-smile builds through the first sentence, a slight eyebrow raise and small head tilt land on "Pati yung mukha ko", natural blinks, relaxed shoulders. She stays seated at her bedroom desk with both hands resting near the mug; the cluttered creator-corner background stays completely stable, natural morning window light from her left unchanged. Audio landscape: her voice in sync with her lips, quiet bedroom room tone, faint distant street ambience. The clip ends on her next breath, not a resolved pause. Avoid low quality, blurry, distorted, deformation, morphing, melting, glitching, extra limbs, text, watermark, writing, letters, subtitles.`;

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
const buf = Buffer.from(await res.arrayBuffer());
const out = resolve(repo, '.tmp/concierge-poc/scene1-v2-veo.mp4');
writeFileSync(out, buf);
console.log('saved', out, buf.length, 'bytes');
