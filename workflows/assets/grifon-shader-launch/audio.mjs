// Fresh private review mix from clean music + immutable existing selected SFX.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { cueManifest } from '../grifon-motion-action-pilot/action-spec.mjs';
import { validateLaunchSpec } from './launch-contract.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const PRIMARY = path.resolve(process.env.GRIFON_TOOL_ROOT || ROOT);
const ffmpeg = path.join(PRIMARY, 'node_modules/ffmpeg-static/ffmpeg.exe');
const SR = 48000;
// Native AAC can overshoot the PCM ceiling; use measured encoder headroom.
const MASTER_TRUE_PEAK = -3;
const specFile = path.join(HERE, 'launch.json');
const spec = validateLaunchSpec(JSON.parse(fs.readFileSync(specFile, 'utf8')));
const manifest = cueManifest(spec);
const provenance = JSON.parse(fs.readFileSync(path.join(HERE, 'asset-provenance.json'), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const output = name => path.join(HERE, name);
const sample = seconds => Math.round(seconds * SR);
const totalFrames = sample(spec.duration);
fs.mkdirSync(output('qa'), { recursive: true });
function run(args) {
  const result = spawnSync(ffmpeg, ['-nostdin', '-hide_banner', ...args], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 60000 });
  if (result.status !== 0) throw Error(`FFmpeg failed (${result.status}): ${result.stderr?.slice(-2000)}`);
  return result.stderr;
}
function readWave(file) {
  const bytes = fs.readFileSync(file);
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WAVE') throw Error(`Expected RIFF WAVE: ${file}`);
  let fmt, data;
  for (let at = 12; at + 8 <= bytes.length;) {
    const length = bytes.readUInt32LE(at + 4), kind = bytes.toString('ascii', at, at + 4);
    if (at + 8 + length > bytes.length) throw Error(`Truncated WAVE chunk: ${file}`);
    if (kind === 'fmt ') fmt = bytes.subarray(at + 8, at + 8 + length);
    if (kind === 'data') data = bytes.subarray(at + 8, at + 8 + length);
    at += 8 + length + (length % 2);
  }
  if (!fmt || !data) throw Error(`Missing WAVE audio: ${file}`);
  const encoding = fmt.readUInt16LE(0) === 0xfffe ? fmt.readUInt16LE(24) : fmt.readUInt16LE(0);
  const channels = fmt.readUInt16LE(2), rate = fmt.readUInt32LE(4), bits = fmt.readUInt16LE(14);
  if (encoding !== 1 || channels !== 2 || rate !== SR || ![16, 24].includes(bits)) throw Error(`Unsupported WAVE source/stem format: ${file}`);
  const bytesPerSample = bits / 8, frames = data.length / (bytesPerSample * channels);
  if (!Number.isInteger(frames)) throw Error(`Partial WAVE sample: ${file}`);
  return { bytes: bytes.length, channels, sampleRate: rate, bits, frames, data, value: index => bits === 16 ? data.readInt16LE(index * 2) / 32768 : data.readIntLE(index * 3, 3) / 8388608 };
}
function windowRms(wave, first, last) {
  let sum = 0;
  const begin = Math.max(0, first), end = Math.min(wave.frames, last);
  for (let frame = begin; frame < end; frame++) sum += wave.value(frame * 2) ** 2 + wave.value(frame * 2 + 1) ** 2;
  return Math.sqrt(sum / ((end - begin) * 2));
}
const db = value => value > 0 ? 20 * Math.log10(value) : null;
const sourceEvidence = [];
const registered = new Map();
for (const entry of provenance.files) {
  const file = path.resolve(HERE, entry.path);
  if (!file.startsWith(output('assets/audio') + path.sep) || fs.lstatSync(file).isSymbolicLink() || hash(file) !== entry.sha256) throw Error(`Unverified audio source: ${entry.id}`);
  registered.set(entry.id, { ...entry, file });
  const evidence = { id: entry.id, asset: entry.path, bytes: fs.statSync(file).size, sha256: entry.sha256 };
  if (entry.id !== 'digital-clouds') {
    const wave = readWave(file);
    if (wave.bits !== 16) throw Error(`Selected recording format changed: ${entry.id}`);
    let peak = 0, peakFrame = 0, maxRms = 0, maxRmsFrame = 0;
    for (let frame = 0; frame < wave.frames; frame++) {
      const value = Math.max(Math.abs(wave.value(frame * 2)), Math.abs(wave.value(frame * 2 + 1)));
      if (value > peak) { peak = value; peakFrame = frame; }
    }
    for (let frame = 0; frame + sample(.02) <= wave.frames; frame += sample(.002)) {
      const rms = windowRms(wave, frame, frame + sample(.02));
      if (rms > maxRms) { maxRms = rms; maxRmsFrame = frame; }
    }
    Object.assign(evidence, { frames: wave.frames, duration: wave.frames / SR, channels: wave.channels, sampleRate: SR, peakDbfs: db(peak), peakSampleAt: peakFrame / SR, strongest20msWindowStart: maxRmsFrame / SR, strongest20msRmsDbfs: db(maxRms), retainedNativeContact: entry.nativeContact, nativeContact20msRmsDbfs: db(windowRms(wave, sample(entry.nativeContact) - sample(.01), sample(entry.nativeContact) + sample(.01))), contactEvidence: 'Native contact retained from the existing selected source register; waveform measurements are factual and are not listening evidence.' });
    registered.get(entry.id).wave = wave;
  }
  sourceEvidence.push(evidence);
}
const music = spec.audio.music;
if (path.resolve(HERE, music.asset) !== registered.get('digital-clouds').file || ![music.sourceIn, music.gainDb, music.fadeIn, music.fadeOut].every(Number.isFinite) || music.sourceIn < 0 || music.fadeIn <= 0 || music.fadeOut <= 0 || music.fadeIn + music.fadeOut >= spec.duration) throw Error('Invalid clean-music trim/gain/envelope');
const assetIds = Object.keys(spec.audio.assets);
for (const id of assetIds) if (!registered.has(id) || path.resolve(HERE, spec.audio.assets[id]) !== registered.get(id).file) throw Error(`Cue asset does not bind to immutable source register: ${id}`);
const cues = manifest.cues.map(cue => {
  const entry = registered.get(cue.assetId);
  if (sample(cue.sourceContact) !== sample(entry.nativeContact)) throw Error(`Cue changed native contact: ${cue.id}`);
  const sourceInSample = sample(cue.sourceIn), sourceOutSample = sample(cue.sourceOut), nativeContactSample = sample(cue.sourceContact);
  const timelineContactSample = sample(cue.timelineContact);
  const startSample = timelineContactSample - nativeContactSample + sourceInSample;
  if (sourceOutSample > entry.wave.frames || sourceInSample < 0 || startSample < 0 || startSample + sourceOutSample - sourceInSample > totalFrames) throw Error(`Cue escapes native source or film: ${cue.id}`);
  if (Math.abs(startSample / SR - cue.start) > 1 / SR) throw Error(`Cue manifest/sample delay differs: ${cue.id}`);
  const rms = windowRms(entry.wave, sourceInSample, sourceOutSample);
  return { ...cue, sourceInSample, sourceOutSample, nativeContactSample, startSample, timelineContactSample, placedContactSample: startSample + nativeContactSample - sourceInSample, alignmentErrorSamples: startSample + nativeContactSample - sourceInSample - timelineContactSample, trimmedRmsDbfs: db(rms), trimmedRmsAfterGainDbfs: db(rms) + cue.gainDb };
});
if (!cues.length) throw Error('Launch soundtrack requires purposeful contact cues');
run(['-y', '-i', registered.get('digital-clouds').file, '-af', `atrim=start=${music.sourceIn}:duration=${spec.duration},asetpts=PTS-STARTPTS,aresample=${SR},aformat=channel_layouts=stereo,volume=${music.gainDb}dB,afade=t=in:st=0:d=${music.fadeIn},afade=t=out:st=${spec.duration - music.fadeOut}:d=${music.fadeOut}`, '-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s24le', output('music-stem.wav')]);
const filters = cues.map((cue, index) => {
  const duration = (cue.sourceOutSample - cue.sourceInSample) / SR;
  const tail = Math.min(.01, duration / 4);
  return `[${assetIds.indexOf(cue.assetId)}:a]atrim=start_sample=${cue.sourceInSample}:end_sample=${cue.sourceOutSample},asetpts=PTS-STARTPTS,volume=${cue.gainDb}dB,afade=t=out:st=${duration - tail}:d=${tail},adelay=${cue.startSample}S:all=1[c${index}]`;
});
filters.push(`${cues.map((_, index) => `[c${index}]`).join('')}amix=inputs=${cues.length}:duration=longest:normalize=0,apad=whole_len=${totalFrames},atrim=end_sample=${totalFrames}[sfx]`);
run(['-y', ...assetIds.flatMap(id => ['-i', registered.get(id).file]), '-filter_complex', filters.join(';'), '-map', '[sfx]', '-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s24le', output('sfx-stem.wav')]);
run(['-y', '-i', output('music-stem.wav'), '-i', output('sfx-stem.wav'), '-filter_complex', '[0:a][1:a]amix=inputs=2:normalize=0:duration=longest[mix]', '-map', '[mix]', '-c:a', 'pcm_f32le', output('mix-premaster.wav')]);
const loudnormJson = stderr => JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
const firstPass = loudnormJson(run(['-i', output('mix-premaster.wav'), '-af', `loudnorm=I=-16:TP=${MASTER_TRUE_PEAK}:LRA=9:print_format=json`, '-f', 'null', '-']));
const loudnorm = `loudnorm=I=-16:TP=${MASTER_TRUE_PEAK}:LRA=9:measured_I=${firstPass.input_i}:measured_TP=${firstPass.input_tp}:measured_LRA=${firstPass.input_lra}:measured_thresh=${firstPass.input_thresh}:offset=${firstPass.target_offset}:linear=true:print_format=json,aresample=${SR}`;
const secondPass = loudnormJson(run(['-y', '-i', output('mix-premaster.wav'), '-af', loudnorm, '-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s24le', output('mix-master.wav')]));
const masterMeter = loudnormJson(run(['-i', output('mix-master.wav'), '-af', 'loudnorm=I=-16:TP=-1.8:LRA=9:print_format=json', '-f', 'null', '-']));
if (Math.abs(Number(masterMeter.input_i) + 16) > .5 || Number(masterMeter.input_tp) > -1.5) throw Error('Master loudness/true peak outside contract');
fs.mkdirSync(output('.tmp'), { recursive: true });
const aacPreview = output('.tmp/audio-192k-preview.m4a');
run(['-y', '-i', output('mix-master.wav'), '-ar', String(SR), '-ac', '2', '-c:a', 'aac', '-b:a', '192k', aacPreview]);
run(['-v', 'error', '-xerror', '-i', aacPreview, '-f', 'null', '-']);
const aacMeter = loudnormJson(run(['-i', aacPreview, '-af', 'loudnorm=I=-16:TP=-1.8:LRA=9:print_format=json', '-f', 'null', '-']));
if (Math.abs(Number(aacMeter.input_i) + 16) > .5 || Number(aacMeter.input_tp) > -1.5) throw Error('AAC preview loudness/true peak outside contract');
const stems = ['music-stem.wav', 'sfx-stem.wav', 'mix-master.wav'].map(file => {
  const wave = readWave(output(file));
  if (wave.frames !== totalFrames) throw Error(`Stem frame count differs: ${file}`);
  return { file, bytes: fs.statSync(output(file)).size, sha256: hash(output(file)), frames: wave.frames, duration: wave.frames / SR, sampleRate: SR, channels: wave.channels, bits: wave.bits, first20msRmsDbfs: db(windowRms(wave, 0, sample(.02))), final20msRmsDbfs: db(windowRms(wave, totalFrames - sample(.02), totalFrames)) };
});
fs.writeFileSync(output('qa/audio-source-waveforms.json'), JSON.stringify({ sourceRegisterSha256: hash(output('asset-provenance.json')), sourceEvidence, auditoryQa: 'PENDING: waveform metrics are not direct hearing.' }, null, 2) + '\n');
fs.writeFileSync(output('qa/audio-cue-manifest.json'), JSON.stringify({ ...manifest, specSha256: hash(specFile), sampleRate: SR, totalFrames, cues }, null, 2) + '\n');
fs.writeFileSync(output('qa/audio.json'), JSON.stringify({ status: 'TECHNICAL_PASS_AUDITORY_QA_PENDING', specSha256: hash(specFile), duration: spec.duration, sampleRate: SR, channels: 2, purpose: 'Clean Digital Clouds plus a restrained newly positioned mix of existing selected SFX; no VO or old mixed-master input.', sources: sourceEvidence.map(({ id, asset, bytes, sha256 }) => ({ id, asset, bytes, sha256 })), normalization: { targetIntegratedLufs: -16, targetMasterTruePeakDbtp: MASTER_TRUE_PEAK, encodedTruePeakLimitDbtp: -1.5, firstPass, secondPass, measuredMaster: masterMeter }, stems, cueCount: cues.length, maximumContactErrorSamples: Math.max(...cues.map(cue => Math.abs(cue.alignmentErrorSamples))), aacPreview: { file: '.tmp/audio-192k-preview.m4a', bytes: fs.statSync(aacPreview).size, sha256: hash(aacPreview), codec: 'AAC', bitrate: '192k', strictDecode: 'PASS', measured: aacMeter }, encodedAacQa: 'AAC-only preview passed; finished MP4 AAC must also be measured against its exact output hash.', auditoryQa: 'PENDING: direct listening and musical taste are not established by timing/level checks.', rights: manifest.rights, providerCalls: 0, paidSpendUsd: 0 }, null, 2) + '\n');
console.log(`PASS: ${cues.length} contact-aligned cues, ${totalFrames} sample frames per stem, master ${masterMeter.input_i} LUFS / ${masterMeter.input_tp} dBTP; zero provider calls.`);
