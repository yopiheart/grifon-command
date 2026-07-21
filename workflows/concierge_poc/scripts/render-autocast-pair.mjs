// Head-to-head: two Veo 3.1 Lite walking-selfie renders (Test A = Gemini plate,
// Test B = World Cup plate). Emotions ALLOWED (full-AI UGC, no character to protect).
// Left hand gestures; right/camera hand locked; same line for comparison.
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

const prompt = `"Buong ad na to, ginawa ng AI. Pati yung mukha ko." She speaks the Taglish line in a natural, engaging, conversational tone with a natural Filipina accent, talking to her vlog audience while walking. Natural facial expressions are allowed and welcome — she can smile, react, and emote freely while talking, like a real vlogger. Her eyes stay in contact with the lens. HAND RULE: her arm holding the phone stays completely steady and LOCKED — the grip never shifts, the framing stays constant like a practiced vlogger's hold, only a smooth subtle natural walking sway, no jitter, no shake. ONLY her free left hand moves, gesturing naturally at chest height in rhythm with her words. She walks at a relaxed steady pace along the BGC sidewalk; blurred buildings, planters, and pedestrians drift past behind her with stable exposure and unchanged daylight. At frame 0 she is already mid-syllable and mid-stride, mouth forming the first word, eyes on the lens. Audio: her voice in sync with her lips, daytime city ambience, distant traffic. The clip ends mid-breath. Avoid face warping, identity change, deformation, morphing, melting, glitching, camera jitter, camera shake, low quality, blurry, distorted, extra limbs, extra fingers, text, watermark, writing, letters, subtitles.`;

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

async function render(plateFile, outFile) {
  const plate = readFileSync(resolve(repo, '.tmp/concierge-poc', plateFile)).toString('base64');
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-lite-generate-preview',
    prompt,
    image: { imageBytes: plate, mimeType: 'image/png' },
    config: { numberOfVideos: 1, aspectRatio: '9:16', resolution: '720p', durationSeconds: 6 },
  });
  console.log(outFile, 'submitted', operation.name);
  while (!operation.done) {
    await new Promise(r => setTimeout(r, 8000));
    operation = await ai.operations.getVideosOperation({ operation });
  }
  if (operation.error) throw new Error('VEO_ERROR ' + outFile + ': ' + JSON.stringify(operation.error));
  const vid = operation.response?.generatedVideos?.[0]?.video;
  if (!vid?.uri) throw new Error('No URI ' + outFile);
  const sep = vid.uri.includes('?') ? '&' : '?';
  const res = await fetch(`${vid.uri}${sep}key=${env.GEMINI_API_KEY}`);
  if (!res.ok) throw new Error(`download failed ${outFile}: ${res.status}`);
  writeFileSync(resolve(repo, '.tmp/concierge-poc', outFile), Buffer.from(await res.arrayBuffer()));
  console.log('saved', outFile);
}

await Promise.all([
  render('autocast-gemini-v2.png', 'autocast-gemini-veo.mp4'),
  render('autocast-worldcup.png', 'autocast-worldcup-veo.mp4'),
]);
console.log('both done');
