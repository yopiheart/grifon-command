// Apply the REAL lead-in cut to an existing restitch spec, so the change can be
// heard before anyone pays for a render.
//
//   npx tsx scripts/apply-leadin-to-restitch.ts
//
// It imports the same planLeadInCut / trimLeadIn / shiftWords that
// api/voice/consolidate.ts calls, so what you hear is what production will do.
// Downloads each scene's VO, trims it, writes it to .tmp/ as a bare filename
// (the harness serves those over its own local server), and shifts the words to
// match. Re-run the harness afterwards and diff against the previous output.
//
// SECRETS: touches no keys. The spec's presigned URLs are read, never printed.
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { planLeadInCut, trimLeadIn, shiftWords, type AlignedWord } from '../api/_lib/voiceLeadIn.js';

const TMP = join(process.cwd(), '.tmp');
const SPEC = join(TMP, 'restitch.json');
const spec = JSON.parse(readFileSync(SPEC, 'utf8'));

let cutScenes = 0;
let totalCut = 0;

for (const sc of spec.scenes) {
  const words: AlignedWord[] | undefined = sc.voiceWords;
  const cut = planLeadInCut(words);
  if (!sc.audioUrl) { console.log(`scene ${sc.sceneIdx}: no audio, skipped`); continue; }

  const r = await fetch(sc.audioUrl);
  if (!r.ok) { console.log(`scene ${sc.sceneIdx}: audio fetch ${r.status}, left as-is`); continue; }
  const original = Buffer.from(await r.arrayBuffer());

  const trimmed = cut > 0 ? await trimLeadIn(original, cut) : original;
  const name = `leadin-scene-${sc.sceneIdx}.mp3`;
  writeFileSync(join(TMP, name), trimmed);

  sc.audioUrl = name; // bare filename → harness serves it from .tmp
  if (cut > 0 && words) {
    sc.voiceWords = shiftWords(words, cut);
    cutScenes++;
    totalCut += cut;
    console.log(`scene ${sc.sceneIdx}: CUT ${cut.toFixed(2)}s  onset ${words[0].start.toFixed(2)} -> ${sc.voiceWords[0].start.toFixed(2)}`);
  } else {
    console.log(`scene ${sc.sceneIdx}: kept (onset ${words?.[0]?.start?.toFixed(2) ?? 'n/a'}s is a breath, not dead air)`);
  }
}

writeFileSync(SPEC, JSON.stringify(spec, null, 2));
console.log(`\nSCENES_CUT=${cutScenes}/${spec.scenes.length}  TOTAL_REMOVED=${totalCut.toFixed(2)}s`);
console.log("\nNext:  $env:RUN_RESTITCH='1'; npx vitest run tests/integration/restitch-real.test.ts");
