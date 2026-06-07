// THROWAWAY — Phase 0 decision-gate spike for workflows/render_pipeline_voice_10.md
//
// Proves whether ffmpeg-static can do the #10 final-render job (trim + concat,
// re-encode) inside a wall-time budget. Faithfully mirrors the Phase 2 pipeline:
//   - Veo/Kling scene MP4s render SILENT  -> synthetic silent 1080x1920 video
//   - ElevenLabs voice is a separate MP3  -> synthetic mp3 (tone, shorter than
//     the video so the "dead-air tail" the feature trims is simulated)
//   - per scene: trim video to speech-end length, mux the MP3, normalize
//     (fps/scale/sar/sample-rate, H.264/AAC)
//   - concat via the concat FILTER with re-encode (NOT the demuxer) to avoid
//     A/V drift (premortem #5)
//
// Measures, for both a 2-scene and a 5-7 scene batch: render wall-time and
// output size. Runs all-cores AND single-thread (-threads 1) as a conservative
// proxy for a Vercel function's ~1 vCPU. NOT a deployed endpoint and NOT under
// api/ (would become a live Vercel function); a script reproduces the exact
// ffmpeg invocations a function would issue. Disposable: writes to .tmp/.
//
// Run:  node scripts/ffmpeg-spike.mjs
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { performance } from 'node:perf_hooks';
import ffmpegPath from 'ffmpeg-static';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const TMP = join(ROOT, '.tmp', 'ffmpeg-spike');

const W = 1080, H = 1920, FPS = 30, SRC_DUR = 6, TRIM = 4; // 6s render, trim to 4s speech-end
const PRESET = 'veryfast'; // server-throughput default; 'medium' would be slower/higher-quality
const CRF = '20';

function run(args, label) {
  const t0 = performance.now();
  const r = spawnSync(ffmpegPath, ['-hide_banner', '-loglevel', 'error', ...args], {
    encoding: 'utf8', maxBuffer: 1 << 26,
  });
  const ms = performance.now() - t0;
  if (r.status !== 0) {
    console.error(`\n[ffmpeg FAILED] ${label}\n`, r.stderr || r.error);
    process.exit(1);
  }
  return ms;
}

function mb(bytes) { return (bytes / (1024 * 1024)); }

// --- generate the "already rendered" assets (NOT counted in render time) ----
function genAssets(n) {
  for (let i = 0; i < n; i++) {
    // silent scene video (mirrors a silent Veo/Kling MP4)
    run([
      '-y', '-f', 'lavfi', '-i', `testsrc2=size=${W}x${H}:rate=${FPS}:duration=${SRC_DUR}`,
      '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p',
      join(TMP, `scene_${i}.mp4`),
    ], `gen scene ${i}`);
    // separate voice MP3, shorter than the video (the tail is dead air to trim)
    run([
      '-y', '-f', 'lavfi', '-i', `sine=frequency=${260 + i * 20}:duration=${TRIM}`,
      '-c:a', 'libmp3lame', '-q:a', '4',
      join(TMP, `voice_${i}.mp3`),
    ], `gen voice ${i}`);
  }
}

// --- the actual render pipeline (THIS is what we time) ----------------------
// Pass A: per-scene trim-to-speech-end + mux MP3 + normalize.
// Pass B: concat-filter re-encode of all muxed scenes.
function render(n, threads) {
  const tArgs = threads ? ['-threads', String(threads)] : [];
  let total = 0;
  const muxed = [];
  for (let i = 0; i < n; i++) {
    const out = join(TMP, `muxed_${threads || 0}_${i}.mp4`);
    muxed.push(out);
    total += run([
      ...tArgs,
      '-y', '-i', join(TMP, `scene_${i}.mp4`), '-i', join(TMP, `voice_${i}.mp3`),
      '-t', String(TRIM),
      '-filter_complex',
      `[0:v]fps=${FPS},scale=${W}:${H}:force_original_aspect_ratio=decrease,` +
        `pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,setsar=1[v]`,
      '-map', '[v]', '-map', '1:a',
      '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF,
      '-c:a', 'aac', '-ar', '48000', '-ac', '2', '-shortest', out,
    ], `trim+mux scene ${i} (threads=${threads || 'all'})`);
  }
  const inputs = muxed.flatMap((m) => ['-i', m]);
  const streams = muxed.map((_, i) => `[${i}:v][${i}:a]`).join('');
  const finalOut = join(TMP, `final_${threads || 0}_n${n}.mp4`);
  total += run([
    ...tArgs, '-y', ...inputs,
    '-filter_complex', `${streams}concat=n=${n}:v=1:a=1[v][a]`,
    '-map', '[v]', '-map', '[a]',
    '-c:v', 'libx264', '-preset', PRESET, '-crf', CRF,
    '-c:a', 'aac', '-ar', '48000', finalOut,
  ], `concat n=${n} (threads=${threads || 'all'})`);
  return { ms: total, bytes: statSync(finalOut).size };
}

// ---------------------------------------------------------------------------
console.log('ffmpeg-static binary :', ffmpegPath);
console.log('format               :', `${W}x${H} @ ${FPS}fps, trim ${SRC_DUR}s -> ${TRIM}s/scene, libx264 -preset ${PRESET} -crf ${CRF}, AAC 48k`);
console.log('');

if (existsSync(TMP)) rmSync(TMP, { recursive: true, force: true });
mkdirSync(TMP, { recursive: true });

const MAX_N = 7; // generate enough for the largest batch once
genAssets(MAX_N);

const results = [];
for (const n of [2, 5, 7]) {
  for (const threads of [0, 1]) { // 0 = all cores, 1 = Vercel ~1 vCPU proxy
    const { ms, bytes } = render(n, threads);
    results.push({ n, threads: threads || 'all', sec: ms / 1000, mb: mb(bytes) });
    console.log(
      `scenes=${n}  threads=${(threads || 'all').toString().padEnd(3)}  ` +
      `wall=${(ms / 1000).toFixed(1).padStart(5)}s  out=${mb(bytes).toFixed(1).padStart(5)} MB`
    );
  }
}

console.log('\n--- machine ---');
console.log('cpu logical cores    :', (await import('node:os')).cpus().length);
console.log('\nRAW JSON:\n' + JSON.stringify(results, null, 2));
