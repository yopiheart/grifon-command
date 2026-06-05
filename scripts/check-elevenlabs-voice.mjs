// ElevenLabs voice pre-flight — run BEFORE a full Director smoke so the voice
// stage (Consolidate Voice → Render Final) can't ambush you after you've already
// burned Veo/Kling budget rendering scenes.
//
//   node scripts/check-elevenlabs-voice.mjs
//
// It mirrors api/_lib/elevenlabs.ts exactly: lists voices (auth check), runs one
// short TTS (hook/b-roll voice-over path) and one STS (talking-avatar voice-changer
// path, which is PLAN-GATED on ElevenLabs). Costs ~1 TTS + 1 STS credit. Reads
// ELEVEN_LABS_API_KEY from .env and NEVER prints it.
//
// Interpreting the result:
//   STS_AVAILABLE ✅  → voice stage is good to go.
//   TTS 401 payment_issue → settle the ElevenLabs invoice (billing, not code).
//   STS 401/403 (but TTS 200) → your plan does not include speech-to-speech;
//     talking avatars need a higher ElevenLabs tier (or add a TTS fallback).
//
// History: 2026-06-05 — first run caught an unpaid EL invoice that would have
// failed all 7 scenes mid-smoke. After payment: TTS+STS both 200.
import { readFileSync } from 'node:fs';

const env = readFileSync('.env', 'utf8');
const get = (k) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const KEY = get('ELEVEN_LABS_API_KEY');
if (!KEY) { console.log('RESULT: NO_KEY — ELEVEN_LABS_API_KEY missing from .env'); process.exit(0); }
console.log('KEY_LOADED len=' + KEY.length);

const base = 'https://api.elevenlabs.io';
const SS = { stability: 0.5, similarity_boost: 0.75 };

const vr = await fetch(base + '/v1/voices', { headers: { 'xi-api-key': KEY } });
console.log('VOICES_STATUS=' + vr.status);
if (!vr.ok) { console.log('VOICES_DETAIL=' + (await vr.text()).slice(0, 300)); process.exit(0); }
const vj = await vr.json();
const voiceId = vj?.voices?.[0]?.voice_id;
console.log('VOICES_COUNT=' + (vj?.voices?.length ?? 0) + ' USING=' + voiceId);
if (!voiceId) { console.log('RESULT: NO_VOICES — account has no voices to test with'); process.exit(0); }

const tr = await fetch(base + '/v1/text-to-speech/' + encodeURIComponent(voiceId), {
  method: 'POST',
  headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
  body: JSON.stringify({ text: 'Testing one two three.', model_id: 'eleven_v3', voice_settings: SS }),
});
console.log('TTS_STATUS=' + tr.status);
if (!tr.ok) { console.log('TTS_DETAIL=' + (await tr.text()).slice(0, 300)); }
const audio = tr.ok ? Buffer.from(await tr.arrayBuffer()) : null;
if (audio) console.log('TTS_OK bytes=' + audio.length);

if (audio) {
  const fd = new FormData();
  fd.append('audio', new Blob([audio], { type: 'audio/mpeg' }), 'source.mp3');
  fd.append('model_id', 'eleven_multilingual_sts_v2');
  fd.append('voice_settings', JSON.stringify(SS));
  const sr = await fetch(base + '/v1/speech-to-speech/' + encodeURIComponent(voiceId), {
    method: 'POST', headers: { 'xi-api-key': KEY, Accept: 'audio/mpeg' }, body: fd,
  });
  console.log('STS_STATUS=' + sr.status);
  const ct = sr.headers.get('content-type') || '';
  if (sr.ok && ct.includes('audio')) {
    const b = Buffer.from(await sr.arrayBuffer());
    console.log('STS_OK bytes=' + b.length);
    console.log('RESULT: STS_AVAILABLE ✅ — talking-avatar voice-changer will work on this plan');
  } else {
    console.log('STS_DETAIL=' + (await sr.text()).slice(0, 400));
    console.log('RESULT: STS_BLOCKED ❌ (status ' + sr.status + ') — see detail above');
  }
} else {
  console.log('RESULT: TTS_FAILED — settle the ElevenLabs invoice / fix the key first');
}
