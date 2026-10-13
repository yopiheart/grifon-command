import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';

// Local-only asset recipe. Native music and the isolated licensed SFX stay private.
const here = path.dirname(fileURLToPath(import.meta.url));
const plan = JSON.parse(fs.readFileSync(path.join(here, 'audio-fit-plan.json'), 'utf8'));
const ffmpeg = process.env.FFMPEG_PATH || 'C:/Users/ADMIN/Desktop/grifon-command/node_modules/ffmpeg-static/ffmpeg.exe';
const ffprobe = process.env.FFPROBE_PATH || 'C:/Users/ADMIN/Desktop/grifon-command/.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe';
const out = path.resolve(process.argv[2] || plan.outputRoot);
const { sampleRate: rate, sampleFrames: frames, channels } = plan.timeline;
fs.mkdirSync(out, { recursive: true });
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fileHash = (file) => hash(fs.readFileSync(file));
const gain = (db) => 10 ** (db / 20);
const at = (seconds) => Math.round(seconds * rate);
const run = (exe, args) => execFileSync(exe, args, { maxBuffer: 128 * 1024 * 1024, windowsHide: true });
const media = (args) => run(ffmpeg, ['-hide_banner', '-nostdin', '-y', ...args]);
const resolveInput = (input) => {
  const file = path.resolve(here, input.path);
  if (fileHash(file) !== input.sha256) throw new Error(`Input hash mismatch: ${path.basename(file)}`);
  return file;
};
const musicInput = resolveInput(plan.inputs.nativeMusic);
const sfxInput = resolveInput(plan.inputs.cleanSfx);
const pictureInput = resolveInput(plan.inputs.picture);
const decode = (file) => {
  const bytes = media(['-v', 'error', '-i', file, '-ar', String(rate), '-ac', String(channels), '-f', 'f32le', 'pipe:1']);
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.length / 4);
};
function writeWav(file, samples) {
  const pcm = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(channels, 22);
  h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * channels * 4, 28);
  h.writeUInt16LE(channels * 4, 32); h.writeUInt16LE(32, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  fs.writeFileSync(file, Buffer.concat([h, pcm]));
}
function loudness(file, name) {
  const result = spawnSync(ffmpeg, ['-hide_banner', '-nostdin', '-i', file, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', 'NUL'], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Loudness meter failed: ${name}: ${result.stderr}`);
  fs.writeFileSync(path.join(out, `${name}.loudness.log`), result.stderr);
  const match = result.stderr.match(/\{\s*"input_i"[\s\S]*?\}/);
  if (!match) throw new Error(`Missing loudness result: ${name}`);
  const parsed = JSON.parse(match[0]);
  return { integratedLufs: Number(parsed.input_i), truePeakDbtp: Number(parsed.input_tp), loudnessRangeLu: Number(parsed.input_lra) };
}
const native = decode(musicInput);
const originalSfx = decode(sfxInput);
if (originalSfx.length !== frames * channels) throw new Error('SFX timeline mismatch');
const music = new Float32Array(frames * channels);
for (const section of plan.sections) {
  const src = at(section.sourceStartSeconds), dst = at(section.targetStartSeconds), length = at(section.durationSeconds);
  if (src < 0 || src + length > native.length / channels || dst < 0 || dst + length > frames) throw new Error(`Section out of range: ${section.id}`);
  const fadeIn = at(section.fadeInSeconds), fadeOut = at(section.fadeOutSeconds);
  for (let i = 0; i < length; i++) {
    let envelope = gain(section.gainDb);
    if (fadeIn && i < fadeIn) envelope *= i / fadeIn;
    if (fadeOut && i >= length - fadeOut) envelope *= (length - 1 - i) / fadeOut;
    for (let c = 0; c < channels; c++) music[(dst + i) * channels + c] += native[(src + i) * channels + c] * envelope;
  }
}
const cuePlan = JSON.parse(fs.readFileSync(resolveInput(plan.inputs.existingCuePlan), 'utf8'));
const ducks = plan.musicOnlyDucking;
const cueTimes = cuePlan.cues.map(cue => ({ frame: cue.frame, seconds: cue.frame / plan.timeline.fps, depthDb: cue.frame === 1260 ? ducks.revealDepthDb : ducks.prominentFrames.includes(cue.frame) ? ducks.prominentCueDepthDb : ducks.allCueDepthDb }));
for (let i = 0; i < frames; i++) {
  const seconds = i / rate;
  let duckDb = 0;
  for (const cue of cueTimes) {
    const delta = seconds - cue.seconds;
    const shape = delta < -ducks.attackSeconds || delta > ducks.holdSeconds + ducks.releaseSeconds ? 0
      : delta < 0 ? (delta + ducks.attackSeconds) / ducks.attackSeconds
      : delta <= ducks.holdSeconds ? 1 : 1 - (delta - ducks.holdSeconds) / ducks.releaseSeconds;
    duckDb = Math.max(duckDb, cue.depthDb * shape);
  }
  let envelope = gain(plan.musicGainDb - duckDb);
  if (seconds >= plan.musicBreath.startSeconds && seconds < plan.musicBreath.endSeconds) envelope = 0;
  if (seconds >= plan.ending.fadeStartSeconds) envelope *= ((frames - 1 - i) / (frames - at(plan.ending.fadeStartSeconds))) ** 2;
  for (let c = 0; c < channels; c++) music[i * channels + c] *= envelope;
}
const sfx = Float32Array.from(originalSfx, sample => sample * gain(plan.sfxGainDb));
const preliminary = Float32Array.from(music, (sample, i) => sample + sfx[i]);
const preliminaryFile = path.join(out, 'preliminary-master-48k-f32.wav');
writeWav(preliminaryFile, preliminary);
const preliminaryMeter = loudness(preliminaryFile, 'preliminary-master');
const desiredGainDb = plan.master.targetIntegratedLufs - preliminaryMeter.integratedLufs;
const peakSafeGainDb = plan.master.maximumPcmTruePeakDbtp - preliminaryMeter.truePeakDbtp;
const masterGainDb = Math.min(desiredGainDb, peakSafeGainDb);
const masterGain = gain(masterGainDb);
for (let i = 0; i < music.length; i++) { music[i] *= masterGain; sfx[i] *= masterGain; }
const master = Float32Array.from(music, (sample, i) => sample + sfx[i]);
const files = {
  music: path.join(out, 'music-edited-48k-f32.wav'),
  sfx: path.join(out, 'sfx-mix-48k-f32.wav'),
  master: path.join(out, 'master-48k-f32.wav'),
  aac: path.join(out, 'master-48k.m4a'),
  video: path.join(out, 'grifon-orbital-launch-music-v2_5-v1.mp4')
};
writeWav(files.music, music); writeWav(files.sfx, sfx); writeWav(files.master, master);
media(['-v', 'error', '-i', files.master, '-c:a', 'aac', '-b:a', '320k', '-ar', String(rate), '-ac', String(channels), '-t', String(plan.timeline.durationSeconds), files.aac]);
media(['-v', 'error', '-i', pictureInput, '-i', files.aac, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-map_metadata', '-1', '-video_track_timescale', String(plan.timeline.fps), '-movflags', '+faststart', '-t', String(plan.timeline.durationSeconds), files.video]);
media(['-v', 'error', '-xerror', '-err_detect', 'explode', '-i', files.video, '-map', '0:v:0', '-map', '0:a:0', '-f', 'null', 'NUL']);
const packets = file => JSON.parse(run(ffprobe, ['-v', 'error', '-select_streams', 'v:0', '-show_packets', '-show_data_hash', 'sha256', '-show_entries', 'packet=pts,dts,duration,size,flags,data_hash', '-of', 'json', file])).packets;
const sourcePackets = packets(pictureInput), finalPackets = packets(files.video);
const picturePacketsMatch = JSON.stringify(sourcePackets) === JSON.stringify(finalPackets);
if (!picturePacketsMatch || finalPackets.length !== plan.timeline.videoFrames) throw new Error('Picture packet or timestamp mismatch');
const pcmMeter = loudness(files.master, 'master-pcm');
const encodedMeter = loudness(files.video, 'master-encoded');
if (Math.abs(encodedMeter.integratedLufs - plan.master.targetIntegratedLufs) > 1 || encodedMeter.truePeakDbtp > plan.master.maximumEncodedTruePeakDbtp) throw new Error('Encoded loudness outside target');
const probe = JSON.parse(run(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', files.video]));
const audioStream = probe.streams.find(stream => stream.codec_type === 'audio');
if (Number(audioStream.sample_rate) !== rate || audioStream.channels !== channels || Math.abs(Number(audioStream.duration) - plan.timeline.durationSeconds) > 0.001) throw new Error('Encoded audio timeline mismatch');
function stats(samples, fromSeconds, toSeconds) {
  const start = at(fromSeconds) * channels, end = Math.min(samples.length, at(toSeconds) * channels);
  let sum = 0, peak = 0, nonfinite = 0;
  for (let i = start; i < end; i++) { sum += samples[i] ** 2; peak = Math.max(peak, Math.abs(samples[i])); if (!Number.isFinite(samples[i])) nonfinite++; }
  return { rmsDbfs: 20 * Math.log10(Math.sqrt(sum / (end - start)) + 1e-12), peakDbfs: 20 * Math.log10(peak + 1e-12), nonfinite };
}
let maxSfxLinearError = 0;
for (let i = 0; i < sfx.length; i++) maxSfxLinearError = Math.max(maxSfxLinearError, Math.abs(sfx[i] - originalSfx[i] * gain(plan.sfxGainDb) * masterGain));
const receipt = {
  schemaVersion: 1, createdAt: new Date().toISOString(), status: 'TECHNICAL_PASS_LISTENING_PENDING',
  scope: 'Local finishing only; generation approval, provider usage and native download are recorded separately.',
  planSha256: fileHash(path.join(here, 'audio-fit-plan.json')), recipeSha256: fileHash(fileURLToPath(import.meta.url)),
  inputs: plan.inputs, providerCalls: 0, paidSpend: 0, nativeTempoPreserved: true,
  nativeDecodedSampleFrames: native.length / channels, target: plan.timeline,
  normalization: { preliminary: preliminaryMeter, desiredGainDb, peakSafeGainDb, appliedLinearGainDb: masterGainDb, pcm: pcmMeter, encoded: encodedMeter },
  sfx: { cues: cueTimes.length, gainDb: plan.sfxGainDb, contactPositionsUnchanged: true, maximumLinearSampleError: maxSfxLinearError, qualification: 'Only one positive linear stem gain and the common master gain; no SFX edits or time shifts.' },
  music: { breath: stats(music, 20.75, 21), preBreath: stats(music, 20.5, 20.75), reveal: stats(music, 21, 21.25), tail: stats(music, 23.1, 23.15), all: stats(music, 0, 23.15), fadeStartSeconds: 22.9 },
  picture: { sourceSha256: plan.inputs.picture.sha256, packets: finalPackets.length, everyPacketPayloadAndTimestampMatches: picturePacketsMatch, strictAudiovisualDecode: 'PASS' },
  output: Object.fromEntries(Object.entries(files).map(([key, file]) => [key, { path: file, bytes: fs.statSync(file).size, sha256: fileHash(file) }])),
  audioStream: { codec: audioStream.codec_name, sampleRate: Number(audioStream.sample_rate), channels: audioStream.channels, durationSeconds: Number(audioStream.duration) },
  listening: 'PENDING: no auditory judgment inferred from waveform, prompt, metadata or technical meters. User audiovisual playback and creative acceptance remain separate.'
};
if (receipt.music.breath.peakDbfs > -120 || receipt.music.all.nonfinite || receipt.sfx.cues !== 26) throw new Error('Stem timing or integrity failure');
fs.writeFileSync(path.join(here, 'mix-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
fs.writeFileSync(path.join(out, 'mix-receipt.json'), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify({ status: receipt.status, video: files.video, loudness: encodedMeter, frames: finalPackets.length, masterGainDb }, null, 2));
