// ElevenLabs forced-alignment permission probe — the $0 answer to issue #96.
//
//   node scripts/check-elevenlabs-alignment.mjs
//
// WHY THIS EXISTS
// api/voice/consolidate.ts treats forced alignment as best-effort and swallows the
// failure in a console.warn. A 401 "missing the permission forced_alignment" is
// therefore indistinguishable from a genuine alignment miss, and neither reaches
// anyone. If the key is scoped that way, TWO things are silently true:
//   1. FinalRenderScene.voiceWords is never produced, so the speech-anchor fix
//      (4a7bd7b + 8090420) is INERT in production and a paid smoke would read as
//      "the fix failed" when the real cause is a permission checkbox.
//   2. Every caption in the product has been running on the even-spread estimate
//      instead of measured timings — a standing, unnoticed quality loss.
//
// COST: ₱0. The probe deliberately sends a request that CANNOT run an alignment:
// an empty audio body. The permission check happens before validation, so
//   401/403 → the key lacks forced_alignment (the #96 condition)
//   400/422 → the key HAS the permission and the request was merely rejected
// Either way no alignment is billed. Never prints the key (same rule as
// scripts/check-elevenlabs-voice.mjs).
//
// SCOPE: this reads the LOCAL .env only. The Vercel production key can be scoped
// differently and CANNOT be observed from here — that one is a dashboard check.
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

// 1. Baseline: does the key authenticate at all?
const vr = await fetch(base + '/v1/voices', { headers: { 'xi-api-key': KEY } });
console.log('VOICES_STATUS=' + vr.status);

// 2. The actual question. Empty file = nothing to align = nothing to bill.
const fd = new FormData();
fd.append('file', new Blob([new Uint8Array(0)], { type: 'audio/mpeg' }), 'probe.mp3');
fd.append('text', 'probe');

const ar = await fetch(base + '/v1/forced-alignment', {
  method: 'POST',
  headers: { 'xi-api-key': KEY },
  body: fd,
});
const detail = (await ar.text()).slice(0, 400);
console.log('ALIGNMENT_STATUS=' + ar.status);
console.log('ALIGNMENT_DETAIL=' + detail);

const missingPerm = /missing the permission|forced_alignment/i.test(detail);

console.log('');
if (ar.status === 401 || ar.status === 403) {
  console.log(missingPerm
    ? 'RESULT: SCOPED_OUT — the key authenticates but lacks forced_alignment. This is the #96 condition: captions are running on the even-spread estimate and voiceWords is never produced. Fix in the ElevenLabs dashboard (grant forced_alignment to this key), then re-run.'
    : 'RESULT: UNAUTHORIZED — 401/403 without the permission message. Check whether the key is valid at all (VOICES_STATUS above).');
} else if (ar.status === 400 || ar.status === 422) {
  console.log('RESULT: PERMISSION_OK — the request got past auth and failed validation on the empty file, which is exactly what this probe wants. The key HAS forced_alignment. If alignment is still failing in a render, the cause is downstream, not the key scope.');
} else if (ar.ok) {
  console.log('RESULT: PERMISSION_OK (unexpected 2xx on an empty file — the key clearly has the permission, but check the response above).');
} else {
  console.log('RESULT: INCONCLUSIVE — status ' + ar.status + '. Read ALIGNMENT_DETAIL above; do not assume either way.');
}
console.log('');
console.log('NOTE: this covered the LOCAL key only. The Vercel production key is a separate secret and must be checked in the ElevenLabs dashboard before the next paid render (issue #96).');
