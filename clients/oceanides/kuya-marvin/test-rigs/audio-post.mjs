#!/usr/bin/env node
// Audio post for Kuya Marvin clips — ElevenLabs direct (bypasses app proxy):
//   STS: palitan ang Veo synthetic voice ng totoong Marvin clone, preserved timing/lip-sync
//   TTS: linya papunta sa clone voice (para sa VO-over-still at end-card attribution)
// Usage (repo root):
//   node .../audio-post.mjs sts --in <clip.mp4> --out <clip-sts.mp4>
//   node .../audio-post.mjs tts --text "<linya>" --out <vo.mp3>
// Voice: Kuya Marvin clone (see voice-sample-script.md). Needs ELEVEN_LABS_API_KEY sa .env
// at ffmpeg sa PATH.
import { readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^"|"$/g, '');
}
const key = process.env.ELEVEN_LABS_API_KEY;
if (!key) throw new Error('ELEVEN_LABS_API_KEY missing in .env');

const VOICE_ID = 'jL41fXY8JXGEarmJ5g3f'; // Kuya Marvin clone (2026-07-22)
const STS_MODEL = 'eleven_multilingual_sts_v2';
const TTS_MODEL = 'eleven_multilingual_v2';
const [mode, ...rest] = process.argv.slice(2);
const arg = (name) => { const i = rest.indexOf(name); return i >= 0 ? rest[i + 1] : undefined; };

// robust (0.75) = pinaka-consistent identity hold (mirrors api/_lib/elevenlabs.ts).
// natural (0.50) = mas buhay ang prosody — ito ang KM-003+ default para sa STS
// (skill PACING & ENERGY Fix 4; ang boses ang nagdadala ng energy dahil naka-lock
// ang mukha ni Veo). Override via --stability.
const STABILITY_PRESETS = { robust: 0.75, natural: 0.5, creative: 0.3 };
const stabArg = arg('--stability') || 'robust';
const stability = STABILITY_PRESETS[stabArg] ?? Number(stabArg);
if (!Number.isFinite(stability)) throw new Error(`--stability must be robust|natural|creative or a number, got: ${stabArg}`);
const VOICE_SETTINGS = { stability, similarity_boost: 0.85 };

if (mode === 'sts') {
  const inPath = arg('--in');
  const outPath = arg('--out');
  if (!inPath || !existsSync(inPath)) throw new Error(`--in not found: ${inPath}`);
  if (!outPath) throw new Error('--out required');
  mkdirSync(path.dirname(outPath), { recursive: true });

  const tmpSrc = outPath + '.src.mp3';
  const tmpDst = outPath + '.sts.mp3';
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', inPath, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', tmpSrc]);

  const form = new FormData();
  form.append('audio', new Blob([readFileSync(tmpSrc)], { type: 'audio/mpeg' }), 'source.mp3');
  form.append('model_id', STS_MODEL);
  form.append('voice_settings', JSON.stringify(VOICE_SETTINGS));
  const r = await fetch(`https://api.elevenlabs.io/v1/speech-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, Accept: 'audio/mpeg' },
    body: form,
  });
  if (!r.ok) throw new Error(`STS ${r.status}: ${(await r.text()).slice(0, 500)}`);
  writeFileSync(tmpDst, Buffer.from(await r.arrayBuffer()));

  // remux: original video pixels, cloned audio (timing preserved by STS)
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', inPath, '-i', tmpDst,
    '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest', outPath]);
  rmSync(tmpSrc); rmSync(tmpDst);
  console.log(`[audio-post] ✓ STS ${inPath} -> ${outPath}`);
} else if (mode === 'tts') {
  const text = arg('--text');
  const outPath = arg('--out');
  if (!text) throw new Error('--text required');
  if (!outPath) throw new Error('--out required');
  mkdirSync(path.dirname(outPath), { recursive: true });
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: TTS_MODEL, voice_settings: VOICE_SETTINGS }),
  });
  if (!r.ok) throw new Error(`TTS ${r.status}: ${(await r.text()).slice(0, 500)}`);
  writeFileSync(outPath, Buffer.from(await r.arrayBuffer()));
  console.log(`[audio-post] ✓ TTS "${text.slice(0, 40)}..." -> ${outPath}`);
} else {
  throw new Error('mode must be sts | tts');
}
