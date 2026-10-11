// Local music-only candidate. Raw music and every working audio file stay ignored.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PRIMARY = path.resolve(process.env.GRIFON_TOOL_ROOT || 'C:/Users/ADMIN/Desktop/grifon-command');
const ffmpeg = path.join(PRIMARY, 'node_modules/ffmpeg-static/ffmpeg.exe');
const ffprobe = path.join(PRIMARY, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const specFile = path.join(HERE, 'audio.json');
const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
const out = name => path.join(HERE, 'assets/audio', name);
const qa = name => path.join(HERE, 'qa', `audio-${name}`);
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const samples = seconds => Math.round(seconds * spec.sampleRate);
const duration = spec.sampleFrames / spec.sampleRate;
const source = path.resolve(PRIMARY, spec.music.source);
const sourceStart = samples(spec.music.sourceInSeconds);
const previewFrames = samples(spec.previewVideoFrames * spec.videoFpsDenominator / spec.videoFpsNumerator);
const fades = spec.fades.map(fade => ({ ...fade, startSample: samples(fade.startSeconds), endSample: samples(fade.endSeconds) }));
const mode = process.argv[2] || '--build';
if (!['--build', '--verify'].includes(mode) || process.argv.length > 3) throw Error('Use audio-mix.mjs [--build|--verify]');
if (spec.schemaVersion !== 1 || spec.sampleRate !== 48000 || spec.channels !== 2 || spec.sampleFrames !== 1495040 || spec.music.playbackRate !== 1 || spec.cues.length || spec.providerCalls !== 0 || spec.newSpendUsd !== 0) throw Error('Candidate must remain the fixed continuous, free, music-only recipe');
if (!source.startsWith(PRIMARY + path.sep) || fs.lstatSync(source).isSymbolicLink() || fs.statSync(source).size !== spec.music.bytes || hash(source) !== spec.music.sha256) throw Error('Clean music input differs from registered source');
if (!Number.isFinite(spec.music.gainDb) || !Number.isFinite(spec.music.sourceInSeconds) || spec.music.sourceInSeconds < 0) throw Error('Invalid music offset/gain');
if (fades.length !== 2 || fades[0].type !== 'in' || fades[0].curve !== 'tri' || fades[0].startSample !== 0 || fades[1].type !== 'out' || fades[1].curve !== 'qua' || fades[1].endSample !== spec.sampleFrames || fades.some(fade => !Number.isInteger(fade.startSample) || !Number.isInteger(fade.endSample) || fade.startSample < 0 || fade.endSample <= fade.startSample || fade.endSample > spec.sampleFrames) || fades[0].endSample >= fades[1].startSample) throw Error('Invalid authored fades');
fs.mkdirSync(out(''), { recursive: true });
fs.mkdirSync(path.dirname(qa('verification.json')), { recursive: true });

function run(tool, args, binary = false) {
  const result = spawnSync(tool, ['-hide_banner', ...args], { encoding: binary ? null : 'utf8', maxBuffer: 96 * 1024 * 1024, timeout: 60000 });
  if (result.status !== 0) throw Error(`Media command failed (${result.status}): ${result.stderr?.toString().slice(-2000)}`);
  return binary ? result.stdout : result.stderr;
}
const ff = (args, binary = false) => run(ffmpeg, ['-nostdin', ...args], binary);
const probe = file => {
  const result = spawnSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], { encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) throw Error(`FFprobe failed (${result.status}): ${result.stderr}`);
  return JSON.parse(result.stdout);
};
const loudness = stderr => JSON.parse(stderr.slice(stderr.lastIndexOf('{'), stderr.lastIndexOf('}') + 1));
const n = spec.normalization;
const meterFilter = `loudnorm=I=${n.integratedLufs}:TP=${n.masterTruePeakDbtp}:LRA=${n.loudnessRangeLu}:print_format=json`;
const meter = file => loudness(ff(['-i', file, '-af', meterFilter, '-f', 'null', '-']));
const decode = file => ff(['-v', 'error', '-xerror', '-i', file, '-map', '0:a:0', '-af', `aresample=${spec.sampleRate},aformat=channel_layouts=stereo`, '-c:a', 'pcm_f32le', '-f', 'f32le', 'pipe:1'], true);
const sourceProbe = probe(source);
if (sourceProbe.streams.length !== 1 || sourceProbe.streams[0].codec_type !== 'audio' || Number(sourceProbe.format.duration) < spec.music.sourceInSeconds + duration) throw Error('Music source cannot supply the continuous full region');

if (mode === '--build') {
  const filter = [`aresample=${spec.sampleRate}`, 'aformat=channel_layouts=stereo', `atrim=start_sample=${sourceStart}:end_sample=${sourceStart + spec.sampleFrames}`, 'asetpts=PTS-STARTPTS', `volume=${spec.music.gainDb}dB`, ...fades.map(fade => `afade=t=${fade.type}:ss=${fade.startSample}:ns=${fade.endSample - fade.startSample}:curve=${fade.curve}`)].join(',');
  ff(['-y', '-i', source, '-af', filter, '-ar', String(spec.sampleRate), '-ac', '2', '-c:a', 'pcm_f32le', out('music-premaster.wav')]);
  const firstPass = meter(out('music-premaster.wav'));
  const normalization = `loudnorm=I=${n.integratedLufs}:TP=${n.masterTruePeakDbtp}:LRA=${n.loudnessRangeLu}:measured_I=${firstPass.input_i}:measured_TP=${firstPass.input_tp}:measured_LRA=${firstPass.input_lra}:measured_thresh=${firstPass.input_thresh}:offset=${firstPass.target_offset}:linear=true:print_format=json,aresample=${spec.sampleRate},atrim=end_sample=${spec.sampleFrames}`;
  const secondPass = loudness(ff(['-y', '-i', out('music-premaster.wav'), '-af', normalization, '-ar', String(spec.sampleRate), '-ac', '2', '-c:a', 'pcm_s24le', out('mix-master.wav')]));
  ff(['-y', '-i', out('mix-master.wav'), '-ar', String(spec.sampleRate), '-ac', '2', '-c:a', 'aac', '-b:a', n.aacBitrate, '-movflags', '+faststart', out('mix-master.m4a')]);
  ff(['-y', '-i', out('mix-master.wav'), '-af', `atrim=end_sample=${previewFrames},asetpts=PTS-STARTPTS`, '-c:a', 'pcm_s24le', out('opening-preview.wav')]);
  ff(['-y', '-i', out('opening-preview.wav'), '-c:a', 'aac', '-b:a', n.aacBitrate, '-movflags', '+faststart', out('opening-preview.m4a')]);
  fs.writeFileSync(qa('normalization.json'), JSON.stringify({ recipeSha256: hash(specFile), scriptSha256: hash(fileURLToPath(import.meta.url)), filter, firstPass, secondPass, providerCalls: 0, newSpendUsd: 0 }, null, 2) + '\n');
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
    at += 8 + length + length % 2;
  }
  if (!fmt || !data) throw Error(`Missing WAVE chunks: ${file}`);
  const encoding = fmt.readUInt16LE(0) === 0xfffe ? fmt.readUInt16LE(24) : fmt.readUInt16LE(0);
  const channels = fmt.readUInt16LE(2), rate = fmt.readUInt32LE(4), bits = fmt.readUInt16LE(14);
  if (channels !== 2 || rate !== spec.sampleRate || !(encoding === 1 && bits === 24 || encoding === 3 && bits === 32)) throw Error(`Unexpected WAVE format: ${file}`);
  const frames = data.length / (channels * bits / 8);
  if (!Number.isInteger(frames)) throw Error(`Partial PCM frame: ${file}`);
  return { frames, data, value: index => encoding === 3 ? data.readFloatLE(index * 4) : data.readIntLE(index * 3, 3) / 8388608 };
}
const db = value => value > 0 ? 20 * Math.log10(value) : null;
function waveStats(file, expectedFrames) {
  ff(['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
  const wave = readWave(file);
  if (wave.frames !== expectedFrames) throw Error(`PCM length differs: ${file}`);
  const rms = (first, last) => {
    let total = 0;
    for (let at = first * 2; at < last * 2; at++) total += wave.value(at) ** 2;
    return db(Math.sqrt(total / ((last - first) * 2)));
  };
  const firstPeak = Math.max(Math.abs(wave.value(0)), Math.abs(wave.value(1)));
  const lastPeak = Math.max(Math.abs(wave.value((wave.frames - 1) * 2)), Math.abs(wave.value((wave.frames - 1) * 2 + 1)));
  return { file: path.relative(HERE, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file), sampleFrames: wave.frames, durationSeconds: wave.frames / spec.sampleRate, probe: probe(file), strictDecode: 'PASS', firstFramePeakDbfs: db(firstPeak), finalFramePeakDbfs: db(lastPeak), first20msRmsDbfs: rms(0, samples(.02)), final20msRmsDbfs: rms(wave.frames - samples(.02), wave.frames), final350msRmsDbfs: rms(wave.frames - samples(.35), wave.frames) };
}
const premaster = readWave(out('music-premaster.wav'));
const original = decode(source);
if (premaster.frames !== spec.sampleFrames || original.length / 8 < sourceStart + spec.sampleFrames) throw Error('Truncated premaster/source region');
let maximumEnvelopeError = 0;
const baseGain = 10 ** (spec.music.gainDb / 20);
for (let frame = 0; frame < spec.sampleFrames; frame++) {
  let gain = baseGain;
  if (frame < fades[0].endSample) gain *= frame / fades[0].endSample;
  if (frame >= fades[1].startSample) gain *= ((fades[1].endSample - frame) / (fades[1].endSample - fades[1].startSample)) ** 2;
  for (let channel = 0; channel < 2; channel++) maximumEnvelopeError = Math.max(maximumEnvelopeError, Math.abs(premaster.value(frame * 2 + channel) - original.readFloatLE(((sourceStart + frame) * 2 + channel) * 4) * gain));
}
if (maximumEnvelopeError > 1e-6) throw Error(`Music placement/fade differs from the source by ${maximumEnvelopeError}`);
const master = readWave(out('mix-master.wav'));
const preview = readWave(out('opening-preview.wav'));
if (!master.data.subarray(0, preview.data.length).equals(preview.data)) throw Error('Opening preview differs from the master prefix');
let musicEnergy = 0, crossEnergy = 0;
for (let index = 0; index < spec.sampleFrames * 2; index++) {
  const input = premaster.value(index);
  musicEnergy += input * input;
  crossEnergy += input * master.value(index);
}
const normalizationGain = crossEnergy / musicEnergy;
let maximumLinearGainError = 0;
for (let index = 0; index < spec.sampleFrames * 2; index++) maximumLinearGainError = Math.max(maximumLinearGainError, Math.abs(master.value(index) - premaster.value(index) * normalizationGain));
if (!Number.isFinite(normalizationGain) || normalizationGain <= 0 || maximumLinearGainError > 4 / 8388608) throw Error(`Master gain changes the music dynamics: ${maximumLinearGainError}`);
const pcm = ['music-premaster.wav', 'mix-master.wav', 'opening-preview.wav'].map(file => waveStats(out(file), file.startsWith('opening') ? previewFrames : spec.sampleFrames));
if ([pcm[1].firstFramePeakDbfs, pcm[1].finalFramePeakDbfs].some(value => value !== null && value > -120) || pcm[1].final20msRmsDbfs > -70 || pcm[1].final350msRmsDbfs > -40) throw Error('Master endpoints/tail are not smoothly quiet');
const measuredMaster = meter(out('mix-master.wav'));
if (Math.abs(Number(measuredMaster.input_i) - n.integratedLufs) > n.loudnessToleranceLu || Number(measuredMaster.input_tp) > n.maximumEncodedTruePeakDbtp) throw Error('PCM loudness/true peak outside contract');
const aac = ['mix-master.m4a', 'opening-preview.m4a'].map(file => {
  const current = out(file), metadata = probe(current), expectedFrames = file.startsWith('opening') ? previewFrames : spec.sampleFrames;
  const stream = metadata.streams[0];
  ff(['-v', 'error', '-xerror', '-i', current, '-f', 'null', '-']);
  if (metadata.streams.length !== 1 || stream.codec_name !== 'aac' || Number(stream.sample_rate) !== spec.sampleRate || stream.channels !== 2 || Math.abs(Number(stream.duration) - expectedFrames / spec.sampleRate) > .001) throw Error(`AAC stream/probed duration outside contract: ${file}`);
  return { file: `assets/audio/${file}`, bytes: fs.statSync(current).size, sha256: hash(current), probe: metadata, strictDecode: 'PASS', decodedSampleFrames: decode(current).length / 8, logicalDurationToleranceSeconds: .001, measured: meter(current) };
});
if (Math.abs(Number(aac[0].measured.input_i) - n.integratedLufs) > n.loudnessToleranceLu || aac.some(item => Number(item.measured.input_tp) > n.maximumEncodedTruePeakDbtp)) throw Error('Encoded AAC loudness/true peak outside contract');
if (hash(source) !== spec.music.sha256) throw Error('Registered source changed during the mix');
const normalization = JSON.parse(fs.readFileSync(qa('normalization.json'), 'utf8'));
if (normalization.recipeSha256 !== hash(specFile) || normalization.scriptSha256 !== hash(fileURLToPath(import.meta.url))) throw Error('Normalization receipt does not bind to current recipe/script');
if (normalization.secondPass.normalization_type !== 'linear') throw Error('Normalization compressed broad music dynamics');
const receipt = { status: 'TECHNICAL_PASS_SONIC_UNVERIFIED', recipeSha256: hash(specFile), scriptSha256: hash(fileURLToPath(import.meta.url)), source: { file: spec.music.source, bytes: spec.music.bytes, sha256: spec.music.sha256, sourceProbe, hashPreserved: true }, continuousRegion: { sourceStartSampleAt48k: sourceStart, sourceInSeconds: sourceStart / spec.sampleRate, sourceOutSeconds: (sourceStart + spec.sampleFrames) / spec.sampleRate, playbackRate: 1, spliceCount: 0, referenceAudioInputs: 0, voiceInputs: 0, sfxCues: 0 }, fades, normalization: { target: n, measuredMaster, firstPass: normalization.firstPass, secondPass: normalization.secondPass }, pcm, aac, checks: { maximumPremasterEnvelopeError: maximumEnvelopeError, everyPremasterSampleComparedToContinuousCleanInput: true, openingPcmExactlyMatchesMasterPrefix: true, previewAudioFrames: previewFrames, previewAudioMinusVideoSeconds: previewFrames / spec.sampleRate - spec.previewVideoFrames * spec.videoFpsDenominator / spec.videoFpsNumerator, masterEndpointPeaksBelowMinus120Dbfs: true, normalizationLinear: true, measuredConstantGainDb: db(normalizationGain), maximumMasterLinearGainError: maximumLinearGainError, allowedMasterGainError24BitSteps: 4 }, sonicReview: 'UNVERIFIED: no direct hearing, accepted transcript, exact-track identity or musical-quality judgement. Technical metrics do not pass sonic fidelity.', delivery: 'All raw/working/standalone audio stays ignored and private. No film mux or delivered audio-only remix.', providerCalls: 0, newSpendUsd: 0 };
fs.writeFileSync(qa('verification.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(`PASS: ${spec.sampleFrames} stereo PCM frames, ${measuredMaster.input_i} LUFS / ${measuredMaster.input_tp} dBTP; AAC ${aac[0].measured.input_i} LUFS / ${aac[0].measured.input_tp} dBTP. Sonic fidelity unverified; cost $0.`);
