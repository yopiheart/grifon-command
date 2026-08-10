// Fill voiceWords in .tmp/restitch.json using real ElevenLabs forced alignment.
//
//   node scripts/fill-restitch-alignment.mjs
//
// WHY THIS EXISTS
// The re-stitch harness note is explicit: WITHOUT voiceWords it falls back to the
// silencedetect path (`anchor: "silence"`) and CANNOT exercise the speech anchor —
// which is the whole of what #91 (trim to VO end) and #94.1 (overlay on speech
// onset) consume. So a re-stitch without this step verifies nothing about either
// fix while looking like it passed.
//
// Mirrors api/_lib/elevenlabs.ts forcedAlignment() exactly: same endpoint, same
// multipart shape, same filter (drop non-numeric spans and pure-space tokens), so
// the harness receives what production would have produced.
//
// COST: not literally ₱0 — forced alignment bills ElevenLabs credits — but it is
// 9 short voice clips against a ~₱550 paid re-render. Prints per-scene status so a
// partial failure is visible instead of silently degrading to estimates (#96).
//
// SECRETS: reads ELEVEN_LABS_API_KEY from .env, never prints it, never prints a
// presigned media URL.
import { readFileSync, writeFileSync } from 'node:fs';

const env = readFileSync('.env', 'utf8');
const get = (k) => { const m = env.match(new RegExp('^' + k + '=(.*)$', 'm')); return m ? m[1].trim() : ''; };
const KEY = get('ELEVEN_LABS_API_KEY');
if (!KEY) { console.log('RESULT: NO_KEY — ELEVEN_LABS_API_KEY missing from .env'); process.exit(0); }

const spec = JSON.parse(readFileSync('.tmp/restitch.json', 'utf8'));
let ok = 0, skipped = 0, failed = 0;

for (const sc of spec.scenes) {
  const label = `scene ${sc.sceneIdx}`;
  if (!sc.audioUrl || !sc.scriptLine) {
    console.log(`${label}: SKIP (no ${!sc.audioUrl ? 'audio' : 'scriptLine'})`);
    skipped++;
    continue;
  }

  const ar = await fetch(sc.audioUrl);
  if (!ar.ok) { console.log(`${label}: AUDIO_FETCH ${ar.status}`); failed++; continue; }
  const bytes = new Uint8Array(await ar.arrayBuffer());

  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: 'audio/mpeg' }), 'vo.mp3');
  fd.append('text', sc.scriptLine);

  const r = await fetch('https://api.elevenlabs.io/v1/forced-alignment', {
    method: 'POST',
    headers: { 'xi-api-key': KEY },
    body: fd,
  });
  if (!r.ok) {
    console.log(`${label}: ALIGN ${r.status} ${(await r.text()).slice(0, 140)}`);
    failed++;
    continue;
  }
  const json = await r.json();
  const words = (Array.isArray(json?.words) ? json.words : [])
    .filter((w) => typeof w?.start === 'number' && typeof w?.end === 'number')
    .map((w) => ({ text: String(w.text ?? ''), start: w.start, end: w.end }))
    .filter((w) => w.text.trim().length > 0);

  if (!words.length) { console.log(`${label}: EMPTY_ALIGNMENT`); failed++; continue; }
  sc.voiceWords = words;
  const first = words[0], last = words[words.length - 1];
  console.log(`${label}: OK words=${words.length} onset=${first.start.toFixed(2)}s vo_end=${last.end.toFixed(2)}s audio_kb=${Math.round(bytes.length / 1024)}`);
  ok++;
}

writeFileSync('.tmp/restitch.json', JSON.stringify(spec, null, 2));
console.log(`\nALIGNED=${ok}  SKIPPED=${skipped}  FAILED=${failed}`);
console.log('');
if (ok === spec.scenes.length) {
  console.log("RESULT: READY — run:  $env:RUN_RESTITCH='1'; npx vitest run tests/integration/restitch-real.test.ts");
} else if (ok === 0) {
  console.log('RESULT: NO_ALIGNMENT — every scene failed. Re-run scripts/check-elevenlabs-alignment.mjs; if that says SCOPED_OUT this is issue #96 and the harness cannot verify #91/#94.1.');
} else {
  console.log('RESULT: PARTIAL — ' + ok + '/' + spec.scenes.length + ' aligned. Scenes without voiceWords fall back to silencedetect and prove nothing about #91/#94.1; read the per-scene lines above before trusting the run.');
}
