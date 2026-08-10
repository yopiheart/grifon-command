// ElevenLabs forced-alignment TOKENIZATION probe — the question code-reading cannot answer.
//
//   node scripts/check-alignment-numerals.mjs
//
// WHY THIS EXISTS
// api/_lib/drawPlan.ts:voiceChunkWindows maps caption chunks onto aligner words
// PROPORTIONALLY: scale = words.length / total, where `total` counts words in the
// SCRIPT and `words.length` counts what the aligner returned. That arithmetic is
// only correct if the two tokenizations agree.
//
// They agree on ordinary words. The open question is a digit. If the script says
// "₱149" (one token) and the aligner returns the spoken expansion
// ("one","hundred","forty","nine","pesos" — five), the scale inflates and EVERY
// CHUNK AFTER THE PRICE drifts off the mouth. Not a dropped word: a desynced line,
// on the most load-bearing sentence in an ad.
//
// The ElevenLabs forced-alignment reference documents neither tokenization nor text
// normalization (checked 2026-08-10), so this can only be settled empirically.
//
// The blast radius grew on 2026-08-09: the lead-in cut (voiceLeadIn.ts), the
// trim-to-speech-end, the caption windows AND the SFX anchors now all key off
// alignment. Before that day only caption timing did.
//
// COST: one short TTS call + one forced-alignment call. Cents, but not zero —
// unlike scripts/check-elevenlabs-alignment.mjs, which is a free permission probe.
// Run it once and record the verdict in workflows/format_sample_readiness.md;
// do not re-run it casually.
//
// Never prints the key (same rule as the sibling probes).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const env = readFileSync('.env', 'utf8');
const get = (k) => {
  const m = env.match(new RegExp('^' + k + '=(.*)$', 'm'));
  return m ? m[1].trim() : '';
};
const KEY = get('ELEVEN_LABS_API_KEY');
if (!KEY) { console.log('RESULT: NO_KEY — ELEVEN_LABS_API_KEY missing from .env'); process.exit(0); }
console.log('KEY_LOADED len=' + KEY.length);

const base = 'https://api.elevenlabs.io';
// Mirrors api/_lib/elevenlabs.ts TTS_MODEL_ID so the probe matches production.
const TTS_MODEL_ID = 'eleven_v3';

// Three shapes in one line, so one paid call answers all of them:
//   "₱149"    — currency symbol + digits, the case that actually matters
//   "8"       — a bare digit (the #94.2 case)
//   "30 days" — a plain quantity
const LINE = 'Only ₱149 today. 8 hours lang, 30 days na warranty.';
const scriptTokens = LINE.split(/\s+/).filter(Boolean);
console.log('SCRIPT_LINE=' + LINE);
console.log('SCRIPT_TOKEN_COUNT=' + scriptTokens.length);

// 1. A voice to speak it. Any voice answers the tokenization question.
const vr = await fetch(base + '/v1/voices', { headers: { 'xi-api-key': KEY } });
if (!vr.ok) {
  console.log('RESULT: VOICES_FAILED status=' + vr.status + ' — cannot pick a voice, aborting before any paid call.');
  process.exit(0);
}
const voices = (await vr.json())?.voices ?? [];
const voiceId = voices[0]?.voice_id;
if (!voiceId) { console.log('RESULT: NO_VOICES — the key sees no voices, aborting.'); process.exit(0); }
console.log('VOICE_ID=' + voiceId + ' (' + (voices[0]?.name ?? '?') + ')');

// 2. PAID CALL #1 — synthesize.
const tr = await fetch(base + '/v1/text-to-speech/' + encodeURIComponent(voiceId), {
  method: 'POST',
  headers: { 'xi-api-key': KEY, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
  body: JSON.stringify({ text: LINE, model_id: TTS_MODEL_ID, voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
});
if (!tr.ok) {
  console.log('RESULT: TTS_FAILED status=' + tr.status + ' detail=' + (await tr.text()).slice(0, 300));
  process.exit(0);
}
const mp3 = Buffer.from(await tr.arrayBuffer());
console.log('TTS_OK bytes=' + mp3.length);

// 3. PAID CALL #2 — align the SAME text against that audio, exactly as
//    api/voice/consolidate.ts:127 does.
const fd = new FormData();
const ab = new ArrayBuffer(mp3.byteLength);
new Uint8Array(ab).set(mp3);
fd.append('file', new Blob([ab], { type: 'audio/mpeg' }), 'probe.mp3');
fd.append('text', LINE);

const ar = await fetch(base + '/v1/forced-alignment', {
  method: 'POST', headers: { 'xi-api-key': KEY }, body: fd,
});
if (!ar.ok) {
  console.log('RESULT: ALIGNMENT_FAILED status=' + ar.status + ' detail=' + (await ar.text()).slice(0, 300));
  process.exit(0);
}
const json = await ar.json();
const words = (Array.isArray(json?.words) ? json.words : [])
  .map((w) => ({ text: String(w?.text ?? ''), start: w?.start, end: w?.end }))
  .filter((w) => w.text.trim().length > 0); // same filter as api/_lib/elevenlabs.ts

try {
  mkdirSync('.tmp', { recursive: true });
  writeFileSync('.tmp/alignment-numeral-probe.json', JSON.stringify(json, null, 2), 'utf8');
  console.log('RAW_SAVED=.tmp/alignment-numeral-probe.json (defreezer-mortal — the verdict below is the durable record)');
} catch {}

console.log('');
console.log('ALIGNER_TOKEN_COUNT=' + words.length);
console.log('ALIGNER_TOKENS=' + JSON.stringify(words.map((w) => w.text)));
console.log('');

// The verdict. A verbatim tokenizer returns the script's own tokens; an expanding
// one turns "₱149" into several. Detect by looking for the expansion directly
// rather than by count alone, so punctuation splitting cannot fake either answer.
const flat = words.map((w) => w.text.toLowerCase().replace(/[^a-z0-9₱]/g, ''));
const keptDigits = flat.some((t) => /149/.test(t));
const expanded = ['hundred', 'forty', 'nine', 'pesos', 'eight', 'thirty'].filter((w) => flat.includes(w));

if (keptDigits && !expanded.length) {
  console.log('RESULT: VERBATIM — the aligner returns the SCRIPT\'s tokens ("149" survived, no spoken expansion).');
  console.log('        voiceChunkWindows\' proportional mapping is SOUND. No fix needed. Do not "fix" it.');
} else if (expanded.length) {
  console.log('RESULT: EXPANDED — the aligner returned spoken forms: ' + JSON.stringify(expanded));
  console.log('        voiceChunkWindows (drawPlan.ts:334) IS drifting: one price token inflates');
  console.log('        `scale` and every chunk after it desyncs. Fix = count SPOKEN tokens when mapping.');
  console.log('        Blast radius also covers the lead-in cut, the end trim and the SFX anchors.');
} else {
  console.log('RESULT: INCONCLUSIVE — neither the digits nor a known expansion appeared.');
  console.log('        Read ALIGNER_TOKENS above and decide by eye; do not assume either way.');
}
console.log('');
console.log('COUNT_DELTA=' + (words.length - scriptTokens.length) + ' (aligner minus script; 0 means the tokenizations agree)');
