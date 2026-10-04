import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Deterministic local finishing only: no APIs, downloads, copied music or secrets.
const ffmpeg = process.argv[2];
const mode = process.argv[3] ?? 'all';
if (!ffmpeg || !['all', 'sheet'].includes(mode)) {
  throw new Error('Usage: node tools/build_vivo_x80_cut.mjs <existing FFmpeg executable> [all|sheet]');
}
const output = resolve('assets/vivo-x80-previz');
const source = resolve('.tmp/vivo-x80-previz-frames');
const manifest = JSON.parse(readFileSync(resolve(output, 'shot-manifest.json'), 'utf8'));
const font = 'C\\:/Windows/Fonts/arial.ttf';
const commands = [];
function run(args) {
  const result = spawnSync(ffmpeg, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`FFmpeg failed (${result.status}): ${result.stderr}`);
  commands.push(args);
  return result;
}
const draw = (text, x, y, size = 20) => `drawtext=fontfile='${font}':text='${text}':x=${x}:y=${y}:fontsize=${size}:fontcolor=white`;
const beatLabels = ['OWNER SETS PHONE DOWN', 'FRIEND PICKS IT UP', 'A CURIOUS GLANCE', 'UNREGISTERED THUMB',
  'OWNER GLANCES BACK', 'OFFER / TRANSFER ELIDED', 'REGISTERED THUMB', 'OWNER PRESENTS BACK', 'CLOUD WINDOW DETAIL'];
const sheetFilters = manifest.shots.map((shot, index) => {
  const time = `${shot.startSeconds.toFixed(2)} - ${shot.endSeconds.toFixed(2)}s`;
  return `[${index}:v]scale=240:427,pad=260:547:10:10:color=0x16181a,${draw(`${shot.number}  ${shot.title}`, 10, 447, 13)},${draw(`${time} / ${shot.lensMm}mm`, 10, 469, 13)},${draw(shot.movement.toUpperCase(), 10, 491, 11)},${draw(beatLabels[index], 10, 513, 11)}[s${index}]`;
});
const layouts = manifest.shots.map((_, index) => `${(index % 3) * 260}_${Math.floor(index / 3) * 547}`).join('|');
const sheet = resolve(output, 'storyboard.png');
run(['-y', ...manifest.shots.flatMap(shot => ['-i', resolve(output, `shot-${String(shot.number).padStart(2, '0')}.png`)]),
  '-filter_complex', `${sheetFilters.join(';')};${manifest.shots.map((_, i) => `[s${i}]`).join('')}xstack=inputs=9:layout=${layouts}[sheet]`,
  '-map', '[sheet]', '-frames:v', '1', sheet]);
if (mode === 'sheet') {
  console.log(JSON.stringify({ storyboard: sheet, paidCalls: 0 }));
  process.exit(0);
}
const names = readdirSync(source).filter(name => /^frame-\d{4}\.png$/.test(name));
if (names.length !== 360) throw new Error(`Expected 360 source frames; got ${names.length}`);
for (let frame = 1; frame <= 360; frame++) {
  const bytes = readFileSync(resolve(source, `frame-${String(frame).padStart(4, '0')}.png`));
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || bytes.readUInt32BE(16) !== 480 || bytes.readUInt32BE(20) !== 854) {
    throw new Error(`Frame ${frame} is not the required 480x854 PNG`);
  }
}
const sampleRate = 48000;
const pcm = new Int16Array(sampleRate * 15);
function tone(at, length, hz, volume) {
  const start = Math.round(at * sampleRate);
  const count = Math.round(length * sampleRate);
  for (let i = 0; i < count && start + i < pcm.length; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin(Math.PI * i / count) ** 2 * Math.exp(-t * 12);
    const value = Math.sin(2 * Math.PI * hz * t) + .20 * Math.sin(2 * Math.PI * hz * 2 * t);
    pcm[start + i] = Math.max(-32767, Math.min(32767, pcm[start + i] + Math.round(value * envelope * volume * 32767)));
  }
}
for (let beat = 0; beat < 30; beat++) tone(.20 + beat * .5, .095, beat % 4 === 0 ? 150 : 360, .065);
for (const shot of manifest.shots.slice(1)) tone(shot.startSeconds, .09, 650, .095);
tone(5.16, .19, 115, .22);
tone(10.32, .16, 880, .18);
tone(10.47, .20, 1320, .13);
tone(13.3, .35, 440, .14);
const wav = Buffer.alloc(44 + pcm.byteLength);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
wav.writeUInt32LE(pcm.byteLength, 40);
for (let i = 0; i < pcm.length; i++) wav.writeInt16LE(pcm[i], 44 + i * 2);
writeFileSync(resolve(output, 'preview-sound.wav'), wav);
const guide = resolve(output, 'camera-guide.mp4');
const preview = resolve(output, 'preview.mp4');
const codec = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
run(['-y', '-framerate', '24', '-start_number', '1', '-i', resolve(source, 'frame-%04d.png'),
  '-frames:v', '360', ...codec, '-an', guide]);
const slates = ['drawbox=x=0:y=0:w=480:h=36:color=0x16181a@0.85:t=fill',
  draw('VIVO X80 / MY TURN / 3D STORYBOARD', 18, 12, 12),
  'drawbox=x=0:y=782:w=480:h=72:color=0x16181a@0.93:t=fill'];
for (const shot of manifest.shots) {
  const enable = `:enable='gte(n,${shot.firstFrame - 1})*lte(n,${shot.lastFrame - 1})'`;
  slates.push(draw(`${String(shot.number).padStart(2, '0')} / ${shot.title}`, 18, 796, 18) + enable);
  slates.push(draw(`${shot.lensMm}mm - ${shot.movement.toUpperCase()}`, 18, 825, 12) + enable);
}
run(['-y', '-i', guide, '-i', resolve(output, 'preview-sound.wav'), '-vf', slates.join(','),
  '-map', '0:v:0', '-map', '1:a:0', '-frames:v', '360', '-t', '15', ...codec, '-c:a', 'aac', '-b:a', '128k', preview]);
function decode(file) {
  const result = run(['-v', 'error', '-i', file, '-map', '0:v:0', '-f', 'framemd5', '-']);
  const records = result.stdout.split(/\r?\n/).filter(line => /^0,/.test(line)).map(line => line.split(',').map(value => value.trim()));
  if (records.length !== 360 || !result.stdout.includes('#tb 0: 1/24') || !result.stdout.includes('#dimensions 0: 480x854')) {
    throw new Error(`${file}: frame count, fps or dimensions mismatch`);
  }
  if (records.some((record, index) => Number(record[2]) !== index)) throw new Error(`${file}: non-contiguous decoded frame timestamps`);
  const unique = new Set(records.map(record => record.at(-1))).size;
  if (unique < 350) throw new Error(`${file}: unexpected frozen/duplicate frames (${unique} distinct)`);
  return { frames: 360, fps: 24, durationSeconds: 15, width: 480, height: 854, uniqueDecodedFrames: unique, fullDecode: 'passed',
    authoredCuts: manifest.shots.slice(1).map(shot => ({ firstFrame: shot.firstFrame, timeSeconds: shot.startSeconds,
      previousDecodedMd5: records[shot.firstFrame - 2].at(-1), currentDecodedMd5: records[shot.firstFrame - 1].at(-1) })) };
}
const guideCheck = decode(guide);
const previewCheck = decode(preview);
const audio = run(['-hide_banner', '-i', preview, '-vn', '-af', 'astats=metadata=0:reset=0', '-f', 'null', '-']);
const overall = audio.stderr.split('Overall').at(-1);
const peak = Number(overall.match(/Peak level dB: ([\d.-]+)/)?.[1]);
if (!Number.isFinite(peak) || peak >= 0) throw new Error('Preview audio must have measurable unclipped headroom');
const qa = resolve(output, 'qa');
mkdirSync(qa, { recursive: true });
for (const shot of manifest.shots) {
  for (const frame of [shot.firstFrame, shot.lastFrame]) {
    const number = String(frame).padStart(4, '0');
    copyFileSync(resolve(source, `frame-${number}.png`), resolve(qa, `shot-${String(shot.number).padStart(2, '0')}-frame-${number}.png`));
  }
}
const selected = manifest.shots.flatMap(shot => [shot.firstFrame - 1, shot.lastFrame - 1]);
run(['-y', '-i', guide, '-vf', `select='${selected.map(n => `eq(n,${n})`).join('+')}',scale=160:285,tile=2x9`,
  '-frames:v', '1', resolve(qa, 'encoded-boundaries.png')]);
const files = ['scene.blend', 'shot-manifest.json', 'camera-guide.mp4', 'preview.mp4', 'storyboard.png', 'preview-sound.wav',
  ...manifest.shots.map(shot => `shot-${String(shot.number).padStart(2, '0')}.png`)];
const sha256 = Object.fromEntries(files.map(name => [name, createHash('sha256').update(readFileSync(resolve(output, name))).digest('hex')]));
writeFileSync(resolve(output, 'delivery-verification.json'), JSON.stringify({ study: manifest.study, paidCalls: 0,
  scope: 'Local clay story/camera blocking, not an AI-generated finished commercial.', renderer: manifest.renderer,
  cameraGuide: { ...guideCheck, audio: 'none', burnedText: 'none' }, preview: { ...previewCheck, slates: 'shot title, lens and movement' },
  audio: { source: 'original deterministic pulse and touch accents', encodedPeakDbfs: peak, clipping: 'passed', subjectiveListening: 'pending' },
  cutEvidence: 'Actual decoded before/after hashes plus an encoded first/last frame contact sheet; authored timing is not claimed as source-ad timing.',
  sha256, recipes: commands.map(args => args.map(arg => arg.replaceAll(resolve('.'), '<workspace>'))) }, null, 2) + '\n');
console.log(JSON.stringify({ cameraGuide: guideCheck, preview: previewCheck, audioPeakDbfs: peak, storyboard: sheet, paidCalls: 0 }));
