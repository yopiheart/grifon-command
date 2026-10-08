import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import ffmpegPath from 'ffmpeg-static';

// Free, fixed local export proof. Never calls a provider or uploads media.
// The accepted source is immutable; this does not reactivate its consumed paid spec.
const root = fileURLToPath(new URL('../', import.meta.url));
const source = join(root, 'assets/vivo-x80-ugc/seedance20-raw.mp4');
const expectedHash = 'bea75a9f599e4a785a83f6cfb9cb5b4794cdf2599567712d60b4d43d4673fcd8';
const work = join(root, '.tmp/ad-recon-milestone2/native-audio');
const inputUrl = 'https://offline.grifon.invalid/accepted-vivo.mp4';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };
const ff = args => spawnSync(ffmpegPath, ['-hide_banner', ...args], {
  maxBuffer: 64 * 1024 * 1024, windowsHide: true,
});

function probe(path) {
  const result = ff(['-i', path]);
  requireValue(result.status === 1, 'Media probe did not return the expected no-output exit.');
  const info = result.stderr.toString('utf8');
  const time = /Duration:\s*(\d+):(\d+):(\d+\.\d+)/.exec(info);
  const size = /Video:.*?\b(\d{3,5})x(\d{3,5})\b/.exec(info);
  requireValue(time && size && /Audio:/.test(info), 'Video, duration or audio stream is missing.');
  return { durationSec: Number(time[1]) * 3600 + Number(time[2]) * 60 + Number(time[3]),
    width: Number(size[1]), height: Number(size[2]) };
}

function pcm(path) {
  const result = ff(['-i', path, '-map', '0:a:0', '-ac', '1', '-ar', '16000', '-f', 'f32le', '-']);
  requireValue(result.status === 0 && result.stdout.length > 0, 'Audio decode failed.');
  const bytes = result.stdout;
  return Float32Array.from({ length: bytes.length / 4 }, (_, i) => bytes.readFloatLE(i * 4));
}

function compareAudio(original, exported) {
  let sourcePower = 0, outputPower = 0;
  for (const sample of original) sourcePower += sample * sample;
  for (const sample of exported) outputPower += sample * sample;
  // AAC and resampling can shift decoded samples slightly. Compare the actual
  // waveform over a bounded +/-4ms lag; allow normal master gain changes.
  let best = { correlation: -1, lagSamples: 0 };
  for (let lag = -64; lag <= 64; lag++) {
    let cross = 0, a2 = 0, b2 = 0;
    for (let i = 1600; i < Math.min(original.length, exported.length) - 1600; i += 4) {
      const a = original[i], b = exported[i + lag];
      cross += a * b; a2 += a * a; b2 += b * b;
    }
    const correlation = a2 && b2 ? cross / Math.sqrt(a2 * b2) : 0;
    if (correlation > best.correlation) best = { correlation, lagSamples: lag };
  }
  return { sourceRms: Math.sqrt(sourcePower / original.length),
    outputRms: Math.sqrt(outputPower / exported.length), ...best };
}

async function main() {
  requireValue(process.argv.length === 2, 'This fixed offline proof accepts no input substitutions.');
  for (const name of ['RUN_REGRESSION', 'RUN_BURNIN', 'RUN_IMAGE_GATE_SMOKE',
    'MID_GAP_TRIM_ENABLED', 'SCENE_GRADE_ENABLED', 'SFX_V2_ENABLED']) {
    requireValue(!process.env[name], `${name} must be unset for the fixed proof.`);
  }
  const bytes = readFileSync(source);
  requireValue(sha(bytes) === expectedHash, 'Accepted Vivo source SHA-256 changed.');
  mkdirSync(work, { recursive: true });
  const modulePath = join(work, 'renderer.mjs');
  const bundled = await build({
    stdin: { contents: "export { renderFinalVideo } from './api/_lib/renderFfmpeg.ts';\nexport { NONE } from './api/_lib/renderPresets.ts';",
      resolveDir: root, loader: 'ts' },
    bundle: true, packages: 'external', format: 'esm', platform: 'node', write: false, logLevel: 'silent',
  });
  writeFileSync(modulePath, bundled.outputFiles[0].text);
  const { renderFinalVideo, NONE } = await import(pathToFileURL(modulePath).href);
  const originalFetch = globalThis.fetch;
  let localMediaReads = 0;
  globalThis.fetch = async (url, options) => {
    requireValue(String(url) === inputUrl && (!options?.method || options.method === 'GET'),
      'Unexpected network operation blocked by offline proof.');
    localMediaReads++;
    return new Response(bytes, { headers: { 'Content-Type': 'video/mp4' } });
  };
  let rendered;
  try {
    rendered = await renderFinalVideo([{ sceneIdx: 0, videoUrl: inputUrl,
      audioPolicy: 'preserve', keepFullClip: true }], '9:16', undefined, NONE);
  } finally { globalThis.fetch = originalFetch; }
  const output = join(work, 'grifon-vivo-native-audio.mp4');
  writeFileSync(output, rendered.buffer);
  const sourceMedia = probe(source), outputMedia = probe(output);
  const audio = compareAudio(pcm(source), pcm(output));
  const checks = {
    unchangedAcceptedSource: sha(readFileSync(source)) === expectedHash,
    outputDimensions: outputMedia.width === 1080 && outputMedia.height === 1920,
    visualDurationPreserved: Math.abs(outputMedia.durationSec - sourceMedia.durationSec) < 0.1,
    nativeAudioAudible: audio.outputRms > 0.005,
    nativeWaveformPreserved: audio.correlation > 0.9,
    singleLocalRead: localMediaReads === 1,
  };
  const receipt = { status: Object.values(checks).every(Boolean) ? 'PASS' : 'FAIL',
    checkedAt: new Date().toISOString(), purpose: 'Local native-audio export of previously accepted Vivo clip',
    scope: 'Real renderer/media proof; no live producer, competitor evidence, or independent listening verdict',
    source: { path: 'assets/vivo-x80-ugc/seedance20-raw.mp4', sha256: expectedHash, ...sourceMedia },
    output: { path: '.tmp/ad-recon-milestone2/native-audio/grifon-vivo-native-audio.mp4',
      sha256: sha(rendered.buffer), bytes: rendered.buffer.length, ...outputMedia },
    rendererSha256: sha(readFileSync(join(root, 'api/_lib/renderFfmpeg.ts'))),
    export: { audioPolicy: 'preserve', preset: 'none', music: false, addedOverlays: false },
    audio, checks, newPaidCalls: 0, uploads: 0, realNetworkCalls: 0 };
  writeFileSync(join(work, 'verification.json'), JSON.stringify(receipt, null, 2) + '\n');
  console.log(JSON.stringify(receipt, null, 2));
  requireValue(receipt.status === 'PASS', 'Native-audio proof failed; see verification.json.');
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
