import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Local-only finishing for the NOIR / 01 study. Pass an existing FFmpeg binary.
const ffmpeg = process.argv[2];
if (!ffmpeg) throw new Error('Usage: node tools/build_reveal_cut.mjs <ffmpeg executable>');
const output = resolve('assets/blender-reveal');
const frames = 144;
const fps = 24;
const recipes = [];
function run(args) {
  const result = spawnSync(ffmpeg, args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`FFmpeg failed (${result.status}): ${result.stderr}`);
  recipes.push(args);
  return result;
}
function checkSequence(directory) {
  const names = readdirSync(directory).filter(name => /^frame-\d{4}\.png$/.test(name));
  if (names.length !== frames) throw new Error(`${directory}: expected ${frames} frames, found ${names.length}`);
  for (let frame = 1; frame <= frames; frame++) {
    const name = `frame-${String(frame).padStart(4, '0')}.png`;
    const header = readFileSync(resolve(directory, name));
    if (header.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' ||
        header.readUInt32BE(16) !== 1280 || header.readUInt32BE(20) !== 720) {
      throw new Error(`${name}: expected a native 1280 x 720 PNG`);
    }
  }
}
mkdirSync(output, { recursive: true });
const shaded = resolve('.tmp/blender-reveal-frames');
const neutral = resolve('.tmp/blender-reveal-preview');
checkSequence(shaded);
checkSequence(neutral);
const film = resolve(output, 'noir-01-reveal.mp4');
const reference = resolve(output, 'camera-reference.mp4');
const imageInput = directory => ['-framerate', String(fps), '-start_number', '1', '-i', resolve(directory, 'frame-%04d.png')];
const codec = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
run(['-y', ...imageInput(shaded), '-i', resolve(output, 'sound.wav'), '-map', '0:v:0', '-map', '1:a:0',
  '-frames:v', String(frames), '-t', '6', ...codec, '-c:a', 'aac', '-b:a', '192k', film]);
run(['-y', ...imageInput(neutral), '-frames:v', String(frames), ...codec, '-an', reference]);
const decode = filename => {
  const result = run(['-v', 'error', '-i', filename, '-map', '0:v:0', '-f', 'framemd5', '-']);
  const records = result.stdout.split(/\r?\n/).filter(line => /^0,/.test(line)).map(line => line.split(',').map(value => value.trim()));
  if (records.length !== frames || !result.stdout.includes('#tb 0: 1/24') || !result.stdout.includes('#dimensions 0: 1280x720')) {
    throw new Error(`${filename}: decoded frame count, rate, or dimensions do not match the study`);
  }
  if (records.some((record, index) => Number(record[2]) !== index)) throw new Error(`${filename}: non-contiguous frame timestamps`);
  return { frames: records.length, fps, durationSeconds: records.length / fps, width: 1280, height: 720,
    uniqueDecodedFrames: new Set(records.map(record => record.at(-1))).size, decode: 'passed' };
};
const filmCheck = decode(film);
const referenceCheck = decode(reference);
const audioResult = run(['-hide_banner', '-i', film, '-vn', '-af', 'astats=metadata=0:reset=0', '-f', 'null', '-']);
const overall = audioResult.stderr.split('Overall').at(-1);
const audioPeakDbfs = Number(overall.match(/Peak level dB: ([\d.-]+)/)?.[1]);
if (!Number.isFinite(audioPeakDbfs) || audioPeakDbfs >= 0) throw new Error('Encoded audio has no measurable headroom');
const sha256 = filename => createHash('sha256').update(readFileSync(filename)).digest('hex');
const files = ['scene.blend', 'start.png', 'mid.png', 'hero.png', 'sound.wav', 'noir-01-reveal.mp4', 'camera-reference.mp4'];
const manifest = {
  study: 'NOIR / 01', scope: 'Local Blender camera and product study; AI motion transfer not tested',
  paidCalls: 0, film: filmCheck, cameraReference: referenceCheck,
  audio: { source: 'original deterministic synthesis', encodedPeakDbfs: audioPeakDbfs, clippingCheck: 'passed', subjectiveListening: 'pending' },
  sha256: Object.fromEntries(files.map(name => [name, sha256(resolve(output, name))])),
  recipe: { executable: 'FFmpeg (supplied locally)', commands: recipes.map(args => args.map(arg => arg.replaceAll(resolve('.'), '<workspace>'))) }
};
writeFileSync(resolve(output, 'delivery-verification.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ film: filmCheck, reference: referenceCheck, audioPeakDbfs, output }));
