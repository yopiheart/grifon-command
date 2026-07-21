// STS voice-swap: ElevenLabs Voice Changer on the Veo clip (keeps words + timing,
// swaps timbre to Zam's cloned voice), then mux back with -c:v copy (lip-sync preserved).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
  readFileSync(resolve(repo, '.env'), 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
if (!env.ELEVEN_LABS_API_KEY) throw new Error('ELEVEN_LABS_API_KEY missing in .env');

const VOICE_ID = '7zOl6q4ddocCWzFMrbcr'; // Zam's cloned voice (PoC findings doc)
const src = resolve(repo, '.tmp/concierge-poc/scene-walk-bgc-veo.mp4');

const form = new FormData();
form.append('audio', new Blob([readFileSync(src)], { type: 'video/mp4' }), 'scene-walk-bgc-veo.mp4');
form.append('model_id', 'eleven_multilingual_sts_v2');
form.append('voice_settings', JSON.stringify({ stability: 0.50, similarity_boost: 0.75 }));

const res = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
  method: 'POST',
  headers: { 'xi-api-key': env.ELEVEN_LABS_API_KEY },
  body: form,
});
if (!res.ok) throw new Error(`STS failed: ${res.status} ${await res.text()}`);
const mp3 = resolve(repo, '.tmp/concierge-poc/scene-walk-bgc-zam-voice.mp3');
writeFileSync(mp3, Buffer.from(await res.arrayBuffer()));
console.log('STS saved', mp3);

const ffmpeg = resolve(repo, 'node_modules', 'ffmpeg-static', 'ffmpeg.exe');
const out = resolve(repo, '.tmp/concierge-poc/scene-walk-bgc-final.mp4');
execFileSync(ffmpeg, ['-y', '-i', src, '-i', mp3, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-shortest', out], { stdio: 'inherit' });
console.log('final saved', out);
