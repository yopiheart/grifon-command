#!/usr/bin/env node
/**
 * Generate sample music beds via ElevenLabs Music for a quick listen test.
 *
 * Node port of tools/smoke_music_bed.py — the cafe PC has no Python, so this is
 * the runnable version (see workflows/this_week_plan.md step 2). It calls the
 * SAME ElevenLabs Music endpoint the server uses (api/music/compose.ts →
 * composeMusic), so what you hear here is what the render would duck under the VO.
 *
 * Usage (PowerShell):
 *   $env:ELEVEN_LABS_API_KEY='sk_...'; node tools/smoke_music_bed.mjs
 * Usage (bash):
 *   ELEVEN_LABS_API_KEY=sk_... node tools/smoke_music_bed.mjs
 *
 * Output:
 *   .tmp/smoke-music-mrbeast.mp3
 *   .tmp/smoke-music-temu.mp3
 *   .tmp/smoke-music-testimonial.mp3
 *
 * Then listen and compare each against the tuned static bed in
 * api/_lib/assets/music/<style>.mp3 before flipping GRIFON_MUSIC_GEN_ENABLED on.
 *
 * Stdlib only (global fetch, node:fs) — no npm install, matches the tools/ convention.
 */

import { mkdir, writeFile } from 'node:fs/promises';

// KEEP IN SYNC with MUSIC_STYLE_PROMPTS in api/_lib/musicPrompts.ts (that file is
// the source of truth; this is a listen aid). If you tune a prompt there, mirror
// it here before re-running the test.
const NO_VOCALS =
  ' Purely instrumental — absolutely NO vocals of any kind: no singing, no human ' +
  'voice, no spoken words, no rapping, no choir, no "ooh"/"aah" vocal pads, and no ' +
  'vocal samples or chops anywhere. Music and instruments only, with no vocal intro ' +
  '— instrumental from the very first second to the last.';

const PROMPTS = {
  mrbeast:
    'High-energy instrumental hype background music for a fast-paced social ad. ' +
    'Driving electronic drums, punchy bass, rising tension, ~120 BPM, modern and ' +
    'exciting. Keep the midrange clean and the dynamics steady so a spoken ' +
    'voiceover sits clearly on top.' + NO_VOCALS,
  temu:
    'Upbeat, playful instrumental background music for a bright value-for-money ' +
    'product ad. Bouncy plucks, light percussion, optimistic and catchy, ~110 BPM. ' +
    'Light and unobtrusive with a consistent energy so a spoken voiceover stays ' +
    'the focus.' + NO_VOCALS,
  testimonial:
    'Warm, sincere instrumental background music for a trustworthy testimonial ad. ' +
    'Soft piano or warm pads, gentle pulse, understated and emotional, ~90 BPM. ' +
    'Low and supportive, leaving plenty of headroom for a calm spoken voiceover.' +
    NO_VOCALS,
};

const MUSIC_LENGTH_MS = 30_000; // ~30s sample
const ENDPOINT = 'https://api.elevenlabs.io/v1/music';
const OUT_DIR = '.tmp';

async function compose(apiKey, prompt) {
  const resp = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: MUSIC_LENGTH_MS,
      force_instrumental: true,
      output_format: 'mp3_44100_128',
    }),
  });
  if (!resp.ok) {
    const detail = (await resp.text()).slice(0, 300);
    throw new Error(`HTTP ${resp.status} — ${detail}`);
  }
  return Buffer.from(await resp.arrayBuffer());
}

async function main() {
  const apiKey = process.env.ELEVEN_LABS_API_KEY;
  if (!apiKey) {
    console.error('ERROR: set ELEVEN_LABS_API_KEY in your environment first.');
    console.error("  $env:ELEVEN_LABS_API_KEY='sk_...'; node tools/smoke_music_bed.mjs");
    return 1;
  }

  await mkdir(OUT_DIR, { recursive: true });
  let failures = 0;
  for (const [style, prompt] of Object.entries(PROMPTS)) {
    const out = `${OUT_DIR}/smoke-music-${style}.mp3`;
    console.log(`[${style}] generating ${MUSIC_LENGTH_MS / 1000}s bed …`);
    try {
      const audio = await compose(apiKey, prompt);
      await writeFile(out, audio);
      console.log(`[${style}] wrote ${out}  (${audio.length.toLocaleString()} bytes)`);
    } catch (err) {
      console.error(`[${style}] FAILED: ${err.message}`);
      failures += 1;
    }
  }

  if (failures) {
    console.error(`\n${failures} of ${Object.keys(PROMPTS).length} beds failed.`);
    return 1;
  }
  console.log(
    `\nDone. Listen to the beds in ${OUT_DIR}/ and compare against ` +
      'api/_lib/assets/music/<style>.mp3.'
  );
  return 0;
}

process.exit(await main());
