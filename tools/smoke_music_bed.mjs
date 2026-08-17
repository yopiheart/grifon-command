#!/usr/bin/env node
/**
 * Generate sample ElevenLabs music beds for the listen gate that stands between
 * today's static beds and `GRIFON_MUSIC_GEN_ENABLED=true`.
 *
 * WHY THIS EXISTS BESIDE tools/smoke_music_bed.py:
 *  1. The Python tool hand-copies the prompts and says so in its own header
 *     ("KEEP IN SYNC with MUSIC_STYLE_PROMPTS ... mirror it here before
 *     re-running"). This one IMPORTS api/_lib/musicPrompts.ts, so it cannot
 *     drift from what the server actually sends.
 *  2. It covers all FOUR styles. The Python tool does two, and the missing pair
 *     includes `ugcpro` — the style with NO static bed of its own (it aliases to
 *     testimonial.mp3), which is precisely why several presets sound alike today.
 *
 * The API key is read from .env by Vite's loadEnv and passed straight to the
 * request. It is never printed — the script reports only whether a key was found.
 *
 * Usage:
 *   npx vite-node tools/smoke_music_bed.mjs             # all four styles
 *   npx vite-node tools/smoke_music_bed.mjs ugcpro temu # just these
 *
 * Output: .tmp/music-gate/<style>.mp3, beside a copy of the tuned static bed
 * (or its alias) so the A/B is one folder, not two.
 *
 * Cost: one ElevenLabs Music generation per style, ~30s each.
 */
import { mkdirSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';
import { MUSIC_STYLE_PROMPTS } from '../api/_lib/musicPrompts.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, '.tmp', 'music-gate');
const STATIC_DIR = join(ROOT, 'api', '_lib', 'assets', 'music');
const ENDPOINT = 'https://api.elevenlabs.io/v1/music';
const LENGTH_MS = 30_000;

// Mirrors MUSIC_BED_ALIAS in renderFfmpeg.ts: a style with no own <style>.mp3
// borrows a sibling bed. Kept here so the A/B folder shows what actually plays.
const STATIC_ALIAS = { ugcpro: 'testimonial' };

const env = loadEnv('development', ROOT, '');
const apiKey = env.ELEVEN_LABS_API_KEY || process.env.ELEVEN_LABS_API_KEY;
console.log(`ELEVEN_LABS_API_KEY found: ${apiKey ? 'yes' : 'NO'}`);
if (!apiKey) {
  console.error('Set ELEVEN_LABS_API_KEY in .env (the value is never printed).');
  process.exit(1);
}

const styles = process.argv.slice(2).length
  ? process.argv.slice(2)
  : Object.keys(MUSIC_STYLE_PROMPTS);

mkdirSync(OUT_DIR, { recursive: true });
let failures = 0;

for (const style of styles) {
  const prompt = MUSIC_STYLE_PROMPTS[style];
  if (!prompt) {
    console.error(`  ! unknown style '${style}' — known: ${Object.keys(MUSIC_STYLE_PROMPTS).join(', ')}`);
    failures++;
    continue;
  }

  // Park the matching static bed next to the generated one so the comparison is
  // a single folder. `ugcpro` copies testimonial.mp3 under an alias-marked name,
  // which is itself the thing to notice.
  const ownStatic = join(STATIC_DIR, `${style}.mp3`);
  if (existsSync(ownStatic)) {
    copyFileSync(ownStatic, join(OUT_DIR, `${style}--STATIC.mp3`));
  } else if (STATIC_ALIAS[style]) {
    const alias = join(STATIC_DIR, `${STATIC_ALIAS[style]}.mp3`);
    if (existsSync(alias)) {
      copyFileSync(alias, join(OUT_DIR, `${style}--STATIC-ALIASED-TO-${STATIC_ALIAS[style]}.mp3`));
    }
  }

  process.stdout.write(`  ${style.padEnd(12)} generating ${LENGTH_MS / 1000}s bed ... `);
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        prompt,
        music_length_ms: LENGTH_MS,
        force_instrumental: true,
        output_format: 'mp3_44100_128',
      }),
    });
    if (!res.ok) {
      const detail = (await res.text()).slice(0, 300);
      console.log(`FAILED HTTP ${res.status}`);
      console.error(`     ${detail}`);
      failures++;
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const out = join(OUT_DIR, `${style}--GENERATED.mp3`);
    writeFileSync(out, buf);
    console.log(`${buf.length.toLocaleString()} bytes`);
  } catch (err) {
    console.log(`FAILED ${err?.message ?? err}`);
    failures++;
  }
}

console.log(`\nOutput: ${OUT_DIR}`);
console.log('Each style has a --GENERATED and a --STATIC file. Listen bar: INVISIBLE > impressive.');
console.log('The bed must disappear under a voiceover, and must NOT open on singing or any vocal.');
if (failures) {
  console.error(`\n${failures} of ${styles.length} failed.`);
  process.exit(1);
}
