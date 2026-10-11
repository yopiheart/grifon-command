// Local authored sound plans. Recordings, decoded sources and masters stay in private project caches.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const SELF = fileURLToPath(import.meta.url);
const REPO = path.resolve(path.dirname(SELF), '../..');
const SR = 48000;
const hashBytes = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => hashBytes(fs.readFileSync(file));
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const fail = message => { throw Error(message); };
const gain = db => 10 ** (db / 20);
const db = value => value > 0 ? 20 * Math.log10(value) : null;
const finite = value => Number.isFinite(value);
const lerp = (a, b, ratio) => a + (b - a) * ratio;
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
const binding = (file, root) => ({ file: path.relative(root, file).replaceAll('\\', '/'), bytes: fs.statSync(file).size, sha256: hash(file) });
const local = (root, relative) => {
  if (typeof relative !== 'string' || !relative || path.isAbsolute(relative) || /^[a-z]+:/i.test(relative)) fail('Expected a project-relative local file');
  const result = path.resolve(root, relative);
  if (!result.startsWith(path.resolve(root) + path.sep)) fail('Local file escapes its root');
  if (fs.existsSync(result) && fs.realpathSync(result) !== result) fail('Local file aliases or links are unsupported');
  return result;
};
const bytesToFloats = bytes => {
  if (bytes.length % 4) fail('Malformed floating-point PCM');
  const result = new Float32Array(bytes.length / 4);
  for (let index = 0; index < result.length; index++) result[index] = bytes.readFloatLE(index * 4);
  return result;
};

export const frameToSample = (frame, plan) => Math.round(frame * plan.fpsDenominator / plan.fpsNumerator * SR);
export const quietTail = (row, maximumDbfs) => row.rmsDbfs === null ? row.peakDbfs === null : finite(row.rmsDbfs) && row.rmsDbfs < maximumDbfs;

export function audioCacheDirectory(project, relative, create = false) {
  const target = local(project, relative), parts = path.relative(project, target).split(path.sep);
  let directory = project;
  for (const part of parts) {
    directory = path.join(directory, part);
    if (!fs.existsSync(directory)) {
      if (!create) return target;
      fs.mkdirSync(directory);
    }
    const info = fs.lstatSync(directory);
    if (!info.isDirectory() || info.isSymbolicLink() || fs.realpathSync(directory) !== directory) fail('Audio cache directory has a link, alias or escape');
  }
  return target;
}

export function validateAudioPlan(plan, timeline) {
  if (!plan || plan.schemaVersion !== 1 || plan.sampleRate !== SR || plan.channels !== 2 || !Number.isSafeInteger(plan.sampleFrames) || plan.sampleFrames <= 0 || plan.sampleFrames > SR * 180) fail('Invalid stereo 48 kHz audio plan');
  if (![plan.videoFrames, plan.fpsNumerator, plan.fpsDenominator].every(value => Number.isSafeInteger(value) && value > 0) || timeline.frames !== plan.videoFrames || timeline.sampleFrames !== plan.sampleFrames || timeline.fpsNumerator !== plan.fpsNumerator || timeline.fpsDenominator !== plan.fpsDenominator || plan.sampleFrames < frameToSample(plan.videoFrames, plan)) fail('Audio plan and project timeline differ');
  if (!plan.rights || !['mixed-video', 'private-review'].includes(plan.rights.usage) || plan.rights.rawRedistribution !== false) fail('Audio plan needs explicit rights metadata and no raw redistribution');
  if (plan.providerCalls && plan.providerCalls !== 0 || plan.newSpendUsd && plan.newSpendUsd !== 0) fail('This adapter only supports existing local audio');
  const frame = value => Number.isInteger(value) && value >= 0 && value < plan.videoFrames;
  if (!Array.isArray(plan.cues) || !plan.cues.length) fail('Authored cue definitions are required; use audioPlan:null for an explicitly silent project');
  if (!plan.trim || typeof plan.trim !== 'object') fail('Invalid source trim map');
  for (const [name, trim] of Object.entries(plan.trim)) if (!/^[a-z0-9_-]+$/i.test(name) || !Array.isArray(trim) || trim.length !== 2 || !trim.every(finite) || trim[0] < 0 || trim[1] <= trim[0]) fail('Invalid source trim');
  const ids = new Set();
  for (const cue of plan.cues) {
    if (!cue || typeof cue.id !== 'string' || !/^[a-z0-9_-]+$/i.test(cue.id) || ids.has(cue.id) || !frame(cue.frame) || !Array.isArray(cue.layers) || !cue.layers.length) fail('Invalid or duplicate authored cue');
    ids.add(cue.id);
    for (const layer of cue.layers) if (!layer || !(layer.source === 'sub' || Object.hasOwn(plan.trim, layer.source)) || !finite(layer.rate) || layer.rate < .5 || layer.rate > 2 || !finite(layer.gainDb) || layer.gainDb < -60 || layer.gainDb > -3 || !Array.isArray(layer.pan) || layer.pan.length !== 2 || layer.pan.some(value => !finite(value) || Math.abs(value) > 1) || layer.reverse !== undefined && typeof layer.reverse !== 'boolean') fail('Invalid cue layer');
  }
  const prep = plan.sfxPreparation;
  if (!prep || ![prep.highpassHz, prep.lowpassHz, prep.endTaperMilliseconds].every(finite) || prep.highpassHz <= 0 || prep.lowpassHz <= prep.highpassHz || prep.lowpassHz >= SR / 2 || prep.endTaperMilliseconds <= 0) fail('Invalid SFX preparation');
  if (plan.music !== null && (!plan.music || typeof plan.music.file !== 'string' || !/^[a-f0-9]{64}$/.test(plan.music.sha256) || !Number.isSafeInteger(plan.music.bytes) || plan.music.bytes <= 0 || plan.music.playbackRate !== 1 || ![plan.music.sourceInSeconds, plan.music.sourceOutSeconds, plan.music.gainDb].every(finite) || plan.music.sourceInSeconds < 0 || Math.abs(plan.music.sourceOutSeconds - plan.music.sourceInSeconds - plan.sampleFrames / SR) > 1 / SR)) fail('Music must bind a continuous local source region at 1x');
  if (!Array.isArray(plan.musicShape) || !plan.musicShape.length || plan.musicShape[0][0] !== 0 || plan.musicShape.some((row, index, rows) => !Array.isArray(row) || row.length !== 2 || !frame(row[0]) || !finite(row[1]) || row[1] > 0 || row[1] < -60 || index && row[0] <= rows[index - 1][0])) fail('Invalid music shape');
  const fades = plan.fades;
  if (!fades || !finite(fades.openingSeconds) || fades.openingSeconds <= 0 || fades.openingSeconds >= plan.sampleFrames / SR || !frame(fades.endStartFrame) || frameToSample(fades.endStartFrame, plan) >= plan.sampleFrames - 1 || fades.endSample !== plan.sampleFrames || fades.endCurve !== 'quadratic') fail('Invalid opening or ending fade');
  const duck = plan.ducking;
  if (!duck || ![duck.attackSeconds, duck.holdSeconds, duck.releaseSeconds, duck.depthDb].every(finite) || duck.attackSeconds <= 0 || duck.releaseSeconds <= 0 || duck.holdSeconds < 0 || duck.depthDb < 0 || duck.depthDb > 30 || !Array.isArray(duck.frames) || duck.frames.some(value => !plan.cues.some(cue => cue.frame === value)) || !Array.isArray(duck.gaps) || duck.gaps.some(gap => !frame(gap.startFrame) || !frame(gap.endFrame) || gap.endFrame <= gap.startFrame || ![gap.depthDb, gap.attackSeconds, gap.releaseSeconds].every(finite) || gap.depthDb < 0 || gap.depthDb > 60 || gap.attackSeconds <= 0 || gap.releaseSeconds <= 0)) fail('Invalid cue ducking');
  if (plan.musicHeadroom && (!['attackSeconds', 'holdSeconds', 'releaseSeconds'].every(key => finite(plan.musicHeadroom[key]) && plan.musicHeadroom[key] > 0) || !Array.isArray(plan.musicHeadroom.measuredTransientSampleAndDepthDb) || plan.musicHeadroom.measuredTransientSampleAndDepthDb.some(row => !Array.isArray(row) || row.length !== 2 || !Number.isInteger(row[0]) || row[0] < 0 || row[0] >= plan.sampleFrames || !finite(row[1]) || row[1] <= 0 || row[1] > 12))) fail('Invalid explicit music headroom envelope');
  const sub = plan.subImpact;
  if (!sub || !['durationSeconds', 'frequencyStartHz', 'frequencyEndHz', 'attackSeconds', 'decaySeconds', 'endTaperSeconds', 'phaseRadians'].every(key => finite(sub[key])) || sub.durationSeconds <= 0 || sub.durationSeconds > 2 || sub.frequencyStartHz <= 0 || sub.frequencyEndHz <= 0 || Math.max(sub.frequencyStartHz, sub.frequencyEndHz) >= SR / 2 || sub.attackSeconds <= 0 || sub.decaySeconds <= 0 || sub.endTaperSeconds <= 0 || sub.frequencySweepSeconds !== undefined && (!finite(sub.frequencySweepSeconds) || sub.frequencySweepSeconds <= 0)) fail('Invalid self-authored sub impact');
  const master = plan.mastering;
  if (!master || !['targetIntegratedLufs', 'maximumMasterTruePeakDbtp', 'minimumEncodedLufs', 'maximumEncodedLufs', 'maximumEncodedTruePeakDbtp'].every(key => finite(master[key])) || master.minimumEncodedLufs >= master.maximumEncodedLufs || master.targetIntegratedLufs < master.minimumEncodedLufs || master.targetIntegratedLufs > master.maximumEncodedLufs || master.maximumMasterTruePeakDbtp > master.maximumEncodedTruePeakDbtp || master.maximumEncodedTruePeakDbtp >= 0 || !/^\d+k$/.test(master.aacBitrate)) fail('Invalid encoded mastering contract');
  return plan;
}

function pulseDuck(t, start, end, depth, attack, release) {
  if (t < start - attack || t > end + release) return 0;
  if (t < start) return depth * (.5 - .5 * Math.cos(Math.PI * (t - start + attack) / attack));
  if (t <= end) return depth;
  return depth * (.5 + .5 * Math.cos(Math.PI * (t - end) / release));
}

export function pcmStats(pcm, first, last) {
  if (first < 0 || last <= first || last * 2 > pcm.length) fail('Invalid PCM measurement window');
  let l2 = 0, r2 = 0, mono2 = 0, peak = 0, nonfinite = 0;
  for (let sample = first; sample < last; sample++) {
    const l = pcm[sample * 2], r = pcm[sample * 2 + 1];
    if (!finite(l) || !finite(r)) nonfinite++;
    l2 += l * l; r2 += r * r; mono2 += ((l + r) * .5) ** 2;
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
  }
  const energy = (l2 + r2) / ((last - first) * 2);
  return { rmsDbfs: db(Math.sqrt(energy)), peakDbfs: db(peak), peak, nonfinite, monoFoldEnergyRatio: energy > 0 ? mono2 / (last - first) / energy : null };
}

export function composePcm(plan, prepared, musicSource = null) {
  const N = plan.sampleFrames, seconds = frame => frame * plan.fpsDenominator / plan.fpsNumerator;
  if (plan.music && (!musicSource || musicSource.length !== N * 2)) fail('Music region does not cover the complete plan');
  const music = new Float32Array(N * 2), effects = new Float32Array(N * 2), master = new Float32Array(N * 2);
  const endStart = frameToSample(plan.fades.endStartFrame, plan);
  const fade = sample => Math.max(0, Math.min(1, sample / (plan.fades.openingSeconds * SR)) * (sample >= endStart ? ((N - 1 - sample) / (N - 1 - endStart)) ** 2 : 1));
  const shape = frame => {
    const points = plan.musicShape;
    for (let index = 1; index < points.length; index++) if (frame <= points[index][0]) return lerp(points[index - 1][1], points[index][1], (frame - points[index - 1][0]) / (points[index][0] - points[index - 1][0]));
    return points.at(-1)[1];
  };
  const duckEnvelope = [];
  for (let sample = 0; plan.music && sample < N; sample++) {
    const t = sample / SR, frame = t * plan.fpsNumerator / plan.fpsDenominator;
    let duck = 0, headroom = 0;
    for (const contact of plan.ducking.frames) duck = Math.max(duck, pulseDuck(t, seconds(contact), seconds(contact) + plan.ducking.holdSeconds, plan.ducking.depthDb, plan.ducking.attackSeconds, plan.ducking.releaseSeconds));
    for (const gap of plan.ducking.gaps) duck = Math.max(duck, pulseDuck(t, seconds(gap.startFrame), seconds(gap.endFrame), gap.depthDb, gap.attackSeconds, gap.releaseSeconds));
    for (const [center, depth] of plan.musicHeadroom?.measuredTransientSampleAndDepthDb || []) headroom = Math.max(headroom, pulseDuck(t, center / SR, center / SR + plan.musicHeadroom.holdSeconds, depth, plan.musicHeadroom.attackSeconds, plan.musicHeadroom.releaseSeconds));
    const volume = gain(plan.music.gainDb + shape(frame) - duck - headroom) * fade(sample);
    music[sample * 2] = musicSource[sample * 2] * volume; music[sample * 2 + 1] = musicSource[sample * 2 + 1] * volume;
    if (sample % 480 === 0) duckEnvelope.push({ sample, duckDb: duck, headroomDb: headroom, totalMusicGain: volume });
  }
  const sub = new Float64Array(Math.round(plan.subImpact.durationSeconds * SR));
  let phase = plan.subImpact.phaseRadians, subPeak = 0;
  for (let sample = 0; sample < sub.length; sample++) {
    const t = sample / SR, frequency = lerp(plan.subImpact.frequencyStartHz, plan.subImpact.frequencyEndHz, Math.min(1, t / (plan.subImpact.frequencySweepSeconds || .12)));
    phase += 2 * Math.PI * frequency / SR;
    sub[sample] = Math.sin(phase) * Math.sin(Math.min(1, t / plan.subImpact.attackSeconds) * Math.PI / 2) ** 2 * Math.exp(-t / plan.subImpact.decaySeconds) * Math.sin(Math.min(1, (sub.length - 1 - sample) / (plan.subImpact.endTaperSeconds * SR)) * Math.PI / 2) ** 2;
    subPeak = Math.max(subPeak, Math.abs(sub[sample]));
  }
  if (!(subPeak > 0)) fail('Self-authored sub impact is empty');
  for (let sample = 0; sample < sub.length; sample++) sub[sample] /= subPeak;
  const sources = { ...prepared, sub }, cues = [];
  for (const cue of plan.cues) {
    const contactSample = frameToSample(cue.frame, plan), layers = [];
    for (const layer of cue.layers) {
      const original = sources[layer.source];
      if (!original || original.length < 2) fail(`Missing prepared cue source: ${layer.source}`);
      const count = Math.floor((original.length - 1) / layer.rate) + 1, stereo = new Float64Array(count * 2);
      let peak = 0, peakSample = 0;
      for (let sample = 0; sample < count; sample++) {
        let at = sample * layer.rate; if (layer.reverse) at = original.length - 1 - at;
        const first = Math.floor(at), value = lerp(original[first], original[Math.min(first + 1, original.length - 1)], at - first);
        const taper = Math.sin(Math.min(1, sample / (.002 * SR)) * Math.PI / 2) ** 2 * Math.sin(Math.min(1, (count - 1 - sample) / (plan.sfxPreparation.endTaperMilliseconds / 1000 * SR)) * Math.PI / 2) ** 2;
        const angle = (lerp(layer.pan[0], layer.pan[1], sample / (count - 1)) + 1) * Math.PI / 4;
        stereo[sample * 2] = value * taper * Math.cos(angle); stereo[sample * 2 + 1] = value * taper * Math.sin(angle);
        const energy = Math.max(Math.abs(stereo[sample * 2]), Math.abs(stereo[sample * 2 + 1]));
        if (energy > peak) { peak = energy; peakSample = sample; }
      }
      const startSample = contactSample - peakSample;
      if (!(peak > 0)) fail(`Empty cue layer: ${cue.id}`);
      if (startSample < 0 || startSample + count > N) fail(`Cue support is outside the timeline: ${cue.id}`);
      const scale = gain(layer.gainDb) / peak;
      for (let sample = 0; sample < count; sample++) for (let channel = 0; channel < 2; channel++) effects[(startSample + sample) * 2 + channel] += stereo[sample * 2 + channel] * scale * fade(startSample + sample);
      layers.push({ ...layer, startSample, endSample: startSample + count, localStrongestSample: peakSample, contactSample: startSample + peakSample, contactErrorSamples: 0, contactQuantizationErrorSamples: contactSample - cue.frame * plan.fpsDenominator / plan.fpsNumerator * SR });
    }
    cues.push({ id: cue.id, role: cue.role, frame: cue.frame, contactSample, layers });
  }
  for (let index = 0; index < master.length; index++) master[index] = music[index] + effects[index];
  const stats = pcmStats(master, 0, N), sfxStats = pcmStats(effects, 0, N);
  if (stats.nonfinite || stats.peak >= 1 || stats.monoFoldEnergyRatio < .35 || sfxStats.monoFoldEnergyRatio < .8) fail('Premix is nonfinite, clipped or cancels excessively in mono');
  return { master, music, effects, cues, duckEnvelope, stats };
}

export function makeAudioKey(input) {
  const { planSha256, timeline, sources, registerSha256, producerSha256, runtime } = input;
  return hashBytes(JSON.stringify({ planSha256, timeline, sources, registerSha256, producerSha256, runtime }));
}

export function readVerifiedCache(folder, expectedKey) {
  if (!fs.existsSync(folder)) return null;
  if (fs.lstatSync(folder).isSymbolicLink() || fs.realpathSync(folder) !== path.resolve(folder)) fail('Cache directory has a link or alias');
  const receipt = json(local(folder, 'receipt.json'));
  if (receipt.schemaVersion !== 1 || receipt.key !== expectedKey || !['TECHNICAL_AUDIO_PASS_LISTENING_PENDING', 'STREAM_COPY_PASS', 'SOURCE_PREPARATION_PASS'].includes(receipt.status) || !Array.isArray(receipt.outputs) || !receipt.outputs.length) fail('Cache receipt key or status differs');
  for (const row of receipt.outputs) {
    const file = local(folder, row.file);
    if (!fs.existsSync(file) || fs.statSync(file).size !== row.bytes || hash(file) !== row.sha256) fail(`Retained cache bytes are corrupt: ${row.file}`);
  }
  return receipt;
}

function runtime(options) {
  const require = createRequire(import.meta.url), ffmpeg = path.resolve(options.ffmpeg || require('ffmpeg-static'));
  const dependencyRoot = path.dirname(path.dirname(path.dirname(ffmpeg)));
  const probeName = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  const candidates = [options.ffprobe, path.join(REPO, '.tools/media-runtime/node_modules/ffprobe-static/bin', process.platform, process.arch, probeName), path.join(dependencyRoot, '.tools/media-runtime/node_modules/ffprobe-static/bin', process.platform, process.arch, probeName)].filter(Boolean);
  const ffprobe = candidates.find(file => fs.existsSync(file));
  if (!fs.existsSync(ffmpeg) || !ffprobe) fail('Installed local FFmpeg/FFprobe is required; pass --ffmpeg/--ffprobe if elsewhere');
  return { ffmpeg, ffprobe: path.resolve(ffprobe), hashes: { ffmpeg: hash(ffmpeg), ffprobe: hash(ffprobe), node: process.version, platform: process.platform, arch: process.arch } };
}

function mediaTools(installed) {
  const commands = [];
  const run = (tool, args, binary = false) => {
    const result = spawnSync(tool, args, { encoding: binary ? null : 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 60000 });
    commands.push({ tool: path.basename(tool), args, exitCode: result.status });
    if (result.status !== 0) fail(`${path.basename(tool)} failed (${result.status}): ${result.stderr?.toString().slice(-2000)}`);
    return { stdout: result.stdout, stderr: result.stderr.toString() };
  };
  const ff = (args, binary = false) => run(installed.ffmpeg, ['-nostdin', '-hide_banner', ...args], binary);
  const decode = (file, filter) => ff(['-v', 'error', '-xerror', '-i', file, '-map', '0:a:0', ...(filter ? ['-af', filter] : []), '-ar', String(SR), '-ac', '2', '-f', 'f32le', 'pipe:1'], true).stdout;
  const probe = file => JSON.parse(run(installed.ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-show_data_hash', 'sha256', '-of', 'json', file]).stdout);
  const packets = (file, selector) => JSON.parse(run(installed.ffprobe, ['-v', 'error', '-select_streams', selector, '-show_packets', '-show_data_hash', 'sha256', '-of', 'json', file]).stdout).packets;
  const meter = (file, plan) => {
    const text = ff(['-i', file, '-map', '0:a:0', '-af', `loudnorm=I=${plan.mastering.targetIntegratedLufs}:TP=${plan.mastering.maximumMasterTruePeakDbtp}:LRA=14:print_format=json`, '-f', 'null', '-']).stderr;
    return JSON.parse(text.slice(text.lastIndexOf('{'), text.lastIndexOf('}') + 1));
  };
  return { ff, decode, probe, packets, meter, commands };
}

function inputs(options) {
  const project = fs.realpathSync(path.resolve(options.project)), jobFile = local(project, 'job.json'), job = json(jobFile);
  if (job.schemaVersion !== 1 || !job.timeline || !(job.audioPlan === null || typeof job.audioPlan === 'string')) fail('Invalid local project audio contract');
  if (job.audioPlan === null) return { project, job, silence: true };
  const planFile = local(project, job.audioPlan), plan = validateAudioPlan(json(planFile), job.timeline), installed = runtime(options);
  const sourceRoot = options.sourceRoot ? fs.realpathSync(path.resolve(options.sourceRoot)) : null;
  const usedFiles = [...new Set([...(plan.music ? [plan.music.file] : []), ...plan.cues.flatMap(cue => cue.layers.filter(layer => layer.source !== 'sub').map(layer => `${layer.source}.wav`))])].sort();
  if (usedFiles.length && !sourceRoot) fail('Supply --source-root for the existing local licensed recordings');
  const registerFile = options.register ? path.resolve(options.register) : plan.sourceRegister ? local(project, plan.sourceRegister) : null;
  if (usedFiles.length && (!registerFile || !fs.existsSync(registerFile))) fail('A local source register with rights metadata is required');
  const register = registerFile ? json(registerFile) : { files: [] };
  if (!Array.isArray(register.files)) fail('Invalid local source register');
  const sources = usedFiles.map(file => {
    const row = register.files.find(item => item.file === file), source = local(sourceRoot, file);
    if (!row || typeof row.license !== 'string' || !row.license.trim() || !/^[a-f0-9]{64}$/.test(row.sha256) || !Number.isSafeInteger(row.bytes) || !fs.existsSync(source) || fs.statSync(source).size !== row.bytes || hash(source) !== row.sha256) fail(`Registered source bytes or rights metadata differ: ${file}`);
    if (/elevenlabs/i.test([row.provider, row.license, row.usage, file].join(' ')) && plan.rights.usage !== 'private-review') fail('Legacy ElevenLabs recordings require explicit private-review rights');
    if (plan.music?.file === file && (plan.music.bytes !== row.bytes || plan.music.sha256 !== row.sha256)) fail('Music binding differs from the registered source');
    return { file, bytes: row.bytes, sha256: row.sha256, license: row.license };
  });
  const producerSha256 = hash(SELF), planSha256 = hash(planFile), registerSha256 = registerFile ? hash(registerFile) : null;
  const input = { planSha256, timeline: job.timeline, sources, registerSha256, producerSha256, runtime: installed.hashes };
  return { project, job, plan, planFile, sourceRoot, registerFile, installed, input, key: makeAudioKey(input), options };
}

export function readPreparedPcm(file, kind) {
  const bytes = fs.readFileSync(file);
  if (kind === 'effect') {
    if (bytes.length % 8) fail('Malformed prepared mono PCM');
    return new Float64Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  }
  return bytesToFloats(bytes);
}

function prepareSource(context, file, kind, trim, tools) {
  const source = context.input.sources.find(row => row.file === file), filter = kind === 'effect' ? `highpass=f=${context.plan.sfxPreparation.highpassHz},lowpass=f=${context.plan.sfxPreparation.lowpassHz}` : null;
  const key = hashBytes(JSON.stringify({ source, kind, trim, filter, producer: context.input.producerSha256, runtime: context.input.runtime }));
  const folder = audioCacheDirectory(context.project, `.cache/audio-sources/${key}`), retained = readVerifiedCache(folder, key);
  if (retained) {
    const pcm = readPreparedPcm(path.join(folder, kind === 'effect' ? 'prepared.f64le' : 'prepared.f32le'), kind);
    return { pcm, key, cacheHit: true };
  }
  audioCacheDirectory(context.project, `.cache/audio-sources/${key}`, true);
  const decoded = tools.decode(local(context.sourceRoot, file), filter), first = Math.round(trim[0] * SR), last = Math.round(trim[1] * SR);
  if (last * 8 > decoded.length || last <= first) fail(`Source trim exceeds its decoded recording: ${file}`);
  let pcm, filename;
  if (kind === 'music') { pcm = bytesToFloats(decoded.subarray(first * 8, last * 8)); filename = 'prepared.f32le'; }
  else {
    pcm = new Float64Array(last - first); let peak = 0;
    for (let index = 0; index < pcm.length; index++) { pcm[index] = (decoded.readFloatLE((first + index) * 8) + decoded.readFloatLE((first + index) * 8 + 4)) * .5; peak = Math.max(peak, Math.abs(pcm[index])); }
    if (!(peak > 0)) fail(`Empty SFX source: ${file}`);
    for (let index = 0; index < pcm.length; index++) pcm[index] /= peak;
    filename = 'prepared.f64le';
  }
  const output = path.join(folder, filename);
  fs.writeFileSync(output, Buffer.from(pcm.buffer), { flag: 'wx' });
  writeJson(path.join(folder, 'receipt.json'), { schemaVersion: 1, key, status: 'SOURCE_PREPARATION_PASS', source, firstSample: first, lastSample: last, filter, outputs: [binding(output, folder)] });
  return { pcm, key, cacheHit: false };
}

const current = context => ({ schemaVersion: 1, key: context.key, sourceRoot: context.sourceRoot, register: context.registerFile, ffmpeg: context.installed.ffmpeg, ffprobe: context.installed.ffprobe });
function setCurrent(context) {
  const file = path.join(audioCacheDirectory(context.project, '.cache/audio', true), 'current.json');
  if (fs.existsSync(file)) local(context.project, '.cache/audio/current.json');
  const temporary = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(current(context), null, 2) + '\n', { flag: 'wx' });
  fs.renameSync(temporary, file);
}

export function readCurrentAudio(project) {
  const root = fs.realpathSync(path.resolve(project)), job = json(local(root, 'job.json'));
  if (job.audioPlan === null) return null;
  const pointer = path.join(audioCacheDirectory(root, '.cache/audio'), 'current.json');
  if (!fs.existsSync(pointer)) return null;
  local(root, '.cache/audio/current.json');
  const saved = json(pointer), context = inputs({ project: root, ...saved });
  if (saved.key !== context.key) fail('Current audio is stale; run audio mix for this plan');
  const folder = audioCacheDirectory(root, `.cache/audio/${context.key}`), receipt = readVerifiedCache(folder, context.key);
  if (!receipt || !receipt.outputs.some(row => row.file === 'master.m4a') || !receipt.outputs.some(row => row.file === 'master.wav')) fail('Current audio master is missing');
  return { path: path.join(folder, 'master.m4a'), pcmPath: path.join(folder, 'master.wav'), sha256: receipt.outputs.find(row => row.file === 'master.m4a').sha256, key: context.key, receipt };
}

export function mixAudio(options) {
  const started = performance.now(), context = inputs(options);
  if (context.silence) return { status: 'EXPLICIT_SILENCE', cacheHit: false, providerCalls: 0, paidSpendUsd: 0, elapsedMs: performance.now() - started };
  const folder = audioCacheDirectory(context.project, `.cache/audio/${context.key}`), existing = readVerifiedCache(folder, context.key);
  if (existing) { setCurrent(context); return { ...readCurrentAudio(context.project), cacheHit: true, elapsedMs: performance.now() - started }; }
  audioCacheDirectory(context.project, `.cache/audio/${context.key}`, true);
  const tools = mediaTools(context.installed), preparations = [], prepared = {};
  let music = null;
  if (context.plan.music) {
    const first = Math.round(context.plan.music.sourceInSeconds * SR) / SR;
    const result = prepareSource(context, context.plan.music.file, 'music', [first, first + context.plan.sampleFrames / SR], tools);
    music = result.pcm; preparations.push({ file: context.plan.music.file, key: result.key, cacheHit: result.cacheHit });
  }
  const effectNames = [...new Set(context.plan.cues.flatMap(cue => cue.layers.filter(layer => layer.source !== 'sub').map(layer => layer.source)))];
  for (const name of effectNames) {
    const result = prepareSource(context, `${name}.wav`, 'effect', context.plan.trim[name], tools);
    prepared[name] = result.pcm; preparations.push({ file: `${name}.wav`, key: result.key, cacheHit: result.cacheHit });
  }
  const mixed = composePcm(context.plan, prepared, music), raw = path.join(folder, 'premaster.f32le'), premaster = path.join(folder, 'premaster.wav');
  fs.writeFileSync(raw, Buffer.from(mixed.master.buffer), { flag: 'wx' });
  tools.ff(['-v', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', raw, '-c:a', 'pcm_f32le', premaster]);
  const firstPass = tools.meter(premaster, context.plan), master = context.plan.mastering;
  const normalizationDb = Math.min(master.targetIntegratedLufs - Number(firstPass.input_i), master.maximumMasterTruePeakDbtp - Number(firstPass.input_tp));
  if (!finite(normalizationDb) || Number(firstPass.input_i) + normalizationDb < master.minimumEncodedLufs + .1) fail('Single linear master cannot satisfy loudness and headroom; author the mix plan');
  const normalized = new Float32Array(mixed.master.length), scale = gain(normalizationDb);
  for (let index = 0; index < normalized.length; index++) normalized[index] = mixed.master[index] * scale;
  const masterRaw = path.join(folder, 'master.f32le'), masterWave = path.join(folder, 'master.wav'), masterAac = path.join(folder, 'master.m4a');
  fs.writeFileSync(masterRaw, Buffer.from(normalized.buffer), { flag: 'wx' });
  tools.ff(['-v', 'error', '-f', 'f32le', '-ar', String(SR), '-ac', '2', '-i', masterRaw, '-c:a', 'pcm_s24le', masterWave]);
  tools.ff(['-v', 'error', '-i', masterWave, '-c:a', 'aac', '-b:a', master.aacBitrate, '-movflags', '+faststart', masterAac]);
  const encodedBytes = tools.decode(masterAac), decoded = bytesToFloats(encodedBytes), decodedWave = bytesToFloats(tools.decode(masterWave));
  const N = context.plan.sampleFrames, encodedFrames = decoded.length / 2;
  if (decodedWave.length !== N * 2 || encodedFrames < N || encodedFrames >= N + 1024) fail('Encoded AAC padding or PCM duration differs');
  let maximumMasterLinearError = 0;
  for (let index = 0; index < decodedWave.length; index++) maximumMasterLinearError = Math.max(maximumMasterLinearError, Math.abs(decodedWave[index] - normalized[index]));
  const levels = tools.meter(masterAac, context.plan), samples = pcmStats(decoded, 0, encodedFrames);
  const tail = pcmStats(decoded, Math.max(0, N - 960), encodedFrames);
  if (!finite(Number(levels.input_i)) || !finite(Number(levels.input_tp)) || Number(levels.input_i) < master.minimumEncodedLufs || Number(levels.input_i) > master.maximumEncodedLufs || Number(levels.input_tp) > master.maximumEncodedTruePeakDbtp || samples.nonfinite || samples.peak >= 1 || samples.monoFoldEnergyRatio < .35 || maximumMasterLinearError > 4 / 8388608 || !quietTail(tail, -70)) fail('Encoded levels, samples, mono fold or ending fade fail the plan');
  const audio = tools.probe(masterAac).streams;
  if (audio.length !== 1 || audio[0].codec_name !== 'aac' || audio[0].sample_rate !== '48000' || audio[0].channels !== 2) fail('Encoded master stream differs');
  if (inputs(options).key !== context.key) fail('Plan, source bytes, producer or runtime changed during mixing');
  const outputs = [masterWave, masterAac].map(file => binding(file, folder));
  const receipt = { schemaVersion: 1, key: context.key, status: 'TECHNICAL_AUDIO_PASS_LISTENING_PENDING', input: context.input, rights: context.plan.rights, outputs, sampleFrames: N, decodedAacFrames: encodedFrames, decodedAacPcmSha256: hashBytes(encodedBytes), maximumMasterLinearError, normalizationDb, levels, samples, tail, cues: mixed.cues, duckEnvelope10ms: mixed.duckEnvelope, preparations, commands: tools.commands, providerCalls: 0, paidSpendUsd: 0, listening: 'Human listening pending; measured technical integrity does not grade musical fit.', elapsedMs: performance.now() - started };
  writeJson(path.join(folder, 'receipt.json'), receipt); setCurrent(context);
  return { ...readCurrentAudio(context.project), cacheHit: false, elapsedMs: performance.now() - started };
}

export function assertCopiedPackets(before, after, label) {
  const fields = ['pts', 'dts', 'duration', 'size', 'flags', 'data_hash'];
  if (!Array.isArray(before) || !before.length || before.length !== after?.length || before.some((packet, index) => fields.some(key => packet[key] !== after[index][key]) || JSON.stringify(packet.side_data_list) !== JSON.stringify(after[index].side_data_list))) fail(`${label} stream payload, timestamps or priming changed after copy`);
}

export function checkedAudioWindow(receipt, plan, videoBinding, stream) {
  const window = receipt?.window, media = receipt?.media;
  if (receipt?.schemaVersion !== 1 || !window || !media || receipt.timeline?.fpsNumerator !== plan.fpsNumerator || receipt.timeline?.fpsDenominator !== plan.fpsDenominator || receipt.timeline?.frames !== plan.videoFrames || receipt.timeline?.sampleFrames !== plan.sampleFrames || !Number.isInteger(window.from) || !Number.isInteger(window.frames) || window.from < 0 || window.frames <= 0 || window.from + window.frames > plan.videoFrames || media.sha256 !== videoBinding.sha256 || media.bytes !== videoBinding.bytes || media.frames !== window.frames || media.width !== window.width || media.height !== window.height || stream.width !== window.width || stream.height !== window.height || Number(stream.nb_read_frames) !== window.frames || stream.avg_frame_rate !== media.fps || media.strictDecode !== 'PASS') fail('Verified visual window differs from the actual clip or audio timeline');
  return { fromFrame: window.from, frameCount: window.frames, startSample: frameToSample(window.from, plan), endSample: frameToSample(window.from + window.frames, plan) };
}

export function muxCopyArguments(video, audio, output, sourceTimeBase) {
  const match = /^1\/([1-9]\d*)$/.exec(sourceTimeBase || ''), timescale = match ? Number(match[1]) : null;
  if (!Number.isSafeInteger(timescale) || timescale > 2147483647) fail('Video track needs an exact integer native timescale');
  return ['-v', 'error', '-i', video, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-video_track_timescale', String(timescale), '-movflags', '+faststart', output];
}

export async function muxAudio(options) {
  const started = performance.now(), context = inputs(options), video = fs.realpathSync(path.resolve(options.video));
  if (context.silence) return { status: 'EXPLICIT_SILENCE', path: video, cacheHit: false, elapsedMs: performance.now() - started };
  const tools = mediaTools(context.installed), sourceSha256 = hash(video), sourceMetadata = tools.probe(video), sourceVideo = sourceMetadata.streams.find(stream => stream.codec_type === 'video');
  const ratio = sourceVideo?.avg_frame_rate?.split('/').map(Number);
  if (!sourceVideo || !ratio || Math.abs(ratio[0] / ratio[1] - context.plan.fpsNumerator / context.plan.fpsDenominator) > 1e-8) fail('Video does not match the authored rational frame rate');
  let window = null, visualReceiptSha256 = null;
  if (options.visualReceipt) {
    const { verifyVisualReceipt } = await import('./visual.mjs');
    const verified = await verifyVisualReceipt({ project: context.project, receiptPath: path.resolve(options.visualReceipt) });
    if (fs.realpathSync(verified.path) !== video) fail('Visual receipt binds a different video file');
    window = checkedAudioWindow(verified, context.plan, { bytes: fs.statSync(video).size, sha256: sourceSha256 }, sourceVideo);
    visualReceiptSha256 = hash(verified.receiptPath);
  } else if (Number(sourceVideo.nb_read_frames) !== context.plan.videoFrames) fail('Partial video needs a verified --visual-receipt; complete timeline frame count differs');
  const audio = mixAudio(options);
  const cropped = window && (window.fromFrame !== 0 || window.frameCount !== context.plan.videoFrames);
  const key = hashBytes(JSON.stringify({ video: sourceSha256, audio: audio.sha256, window, visualReceiptSha256, producer: context.input.producerSha256, runtime: context.input.runtime }));
  const folder = audioCacheDirectory(context.project, `.cache/mux/${key}`), existing = readVerifiedCache(folder, key);
  if (existing) return { path: path.join(folder, 'film.mp4'), sha256: existing.outputs.find(row => row.file === 'film.mp4').sha256, key, receipt: existing, cacheHit: true, audioCacheHit: audio.cacheHit, elapsedMs: performance.now() - started };
  audioCacheDirectory(context.project, `.cache/mux/${key}`, true);
  let aacPath = audio.path, decodedAacPcmSha256 = audio.receipt.decodedAacPcmSha256, windowAudio = null;
  if (cropped) {
    const pcm = tools.decode(audio.pcmPath), expected = pcm.subarray(window.startSample * 8, window.endSample * 8), wave = path.join(folder, 'window.wav');
    tools.ff(['-v', 'error', '-i', audio.pcmPath, '-af', `atrim=start_sample=${window.startSample}:end_sample=${window.endSample},asetpts=PTS-STARTPTS`, '-c:a', 'pcm_s24le', wave]);
    if (!tools.decode(wave).equals(expected)) fail('Window PCM does not equal the exact native-frame sample slice');
    aacPath = path.join(folder, 'window.m4a');
    tools.ff(['-v', 'error', '-i', wave, '-c:a', 'aac', '-b:a', context.plan.mastering.aacBitrate, '-movflags', '+faststart', aacPath]);
    const decoded = tools.decode(aacPath), frames = decoded.length / 8, samples = pcmStats(bytesToFloats(decoded), 0, frames), logicalFrames = window.endSample - window.startSample;
    const levels = tools.meter(aacPath, context.plan);
    if (frames < logicalFrames || frames >= logicalFrames + 1024 || samples.nonfinite || samples.peak >= 1 || samples.monoFoldEnergyRatio !== null && samples.monoFoldEnergyRatio < .35 || samples.peak > 0 && (!finite(Number(levels.input_tp)) || Number(levels.input_tp) > context.plan.mastering.maximumEncodedTruePeakDbtp)) fail('Window AAC padding, finite samples, peak or mono integrity failed');
    decodedAacPcmSha256 = hashBytes(decoded);
    const cues = audio.receipt.cues.map(cue => ({ id: cue.id, frame: cue.frame, shiftedContactSample: cue.contactSample - window.startSample, contactInsideWindow: cue.contactSample >= window.startSample && cue.contactSample < window.endSample, layers: cue.layers.filter(layer => layer.endSample > window.startSample && layer.startSample < window.endSample).map(layer => ({ source: layer.source, shiftedStartSample: Math.max(layer.startSample, window.startSample) - window.startSample, shiftedEndSample: Math.min(layer.endSample, window.endSample) - window.startSample, croppedHeadSamples: Math.max(0, window.startSample - layer.startSample), croppedTailSamples: Math.max(0, layer.endSample - window.endSample) })) })).filter(cue => cue.layers.length);
    windowAudio = { ...window, pcmSliceSha256: hashBytes(expected), logicalSampleFrames: logicalFrames, decodedAacFrames: frames, decodedAacPcmSha256, levels, samples, cues, method: 'Exact native-frame sample slice of verified PCM master, reset PTS to zero, separately encoded AAC. Whole-film AAC bytes are not copied into this window; local loudness is descriptive, not a whole-film loudness gate.' };
  }
  const output = path.join(folder, 'film.mp4');
  tools.ff(muxCopyArguments(video, aacPath, output, sourceVideo.time_base));
  tools.ff(['-v', 'error', '-xerror', '-i', output, '-f', 'null', '-']);
  const metadata = tools.probe(output), outputVideo = metadata.streams.find(stream => stream.codec_type === 'video'), outputAudio = metadata.streams.find(stream => stream.codec_type === 'audio');
  const videoPackets = tools.packets(video, 'v:0');
  assertCopiedPackets(videoPackets, tools.packets(output, 'v:0'), 'Video');
  assertCopiedPackets(tools.packets(aacPath, 'a:0'), tools.packets(output, 'a:0'), 'AAC');
  if (metadata.streams.length !== 2 || sourceVideo.extradata_hash !== outputVideo?.extradata_hash || sourceVideo.time_base !== outputVideo.time_base || tools.probe(aacPath).streams[0].extradata_hash !== outputAudio?.extradata_hash) fail('Copied stream extradata or time base differs');
  const decoded = tools.decode(output);
  if (!decoded.equals(tools.decode(aacPath)) || hashBytes(decoded) !== decodedAacPcmSha256 || hash(video) !== sourceSha256 || inputs(options).key !== context.key || options.visualReceipt && hash(path.resolve(options.visualReceipt)) !== visualReceiptSha256) fail('Mux changed audio PCM or source bindings');
  const [timeNumerator, timeDenominator] = sourceVideo.time_base.split('/').map(Number);
  const nativeVideoDuration = (Math.max(...videoPackets.map(packet => packet.pts + packet.duration)) - Math.min(...videoPackets.map(packet => packet.pts))) * timeNumerator / timeDenominator;
  const outputs = [output, ...(cropped ? [aacPath, path.join(folder, 'window.wav')] : [])].map(file => binding(file, folder));
  const receipt = { schemaVersion: 1, key, status: 'STREAM_COPY_PASS', sourceSha256, audioKey: audio.key, audioSha256: audio.sha256, outputs, videoPacketsVerified: videoPackets.length, visualReceiptSha256, windowAudio, nativeVideoDuration, decodedAudioDuration: decoded.length / 8 / SR, decodedAudioSha256: hashBytes(decoded), metadata, commands: tools.commands, providerCalls: 0, paidSpendUsd: 0, elapsedMs: performance.now() - started };
  writeJson(path.join(folder, 'receipt.json'), receipt);
  return { path: output, sha256: receipt.outputs[0].sha256, key, receipt, cacheHit: false, audioCacheHit: audio.cacheHit, elapsedMs: performance.now() - started };
}

export async function runAudioCli(args) {
  const mode = args[0], options = {};
  if (!['mix', 'mux'].includes(mode)) fail('Use audio.mjs mix|mux --project PATH [--source-root PATH] [--register PATH] [--video PATH]');
  const names = { '--project': 'project', '--source-root': 'sourceRoot', '--register': 'register', '--video': 'video', '--visual-receipt': 'visualReceipt', '--ffmpeg': 'ffmpeg', '--ffprobe': 'ffprobe' };
  for (let index = 1; index < args.length; index += 2) {
    const name = names[args[index]];
    if (!name || !args[index + 1] || args[index + 1].startsWith('--') || Object.hasOwn(options, name)) fail(`Invalid audio option: ${args[index]}`);
    options[name] = args[index + 1];
  }
  if (!options.project || mode === 'mux' && !options.video) fail('Project and mux video paths are required');
  const result = mode === 'mux' ? await muxAudio(options) : mixAudio(options);
  console.log(JSON.stringify({ status: result.status || result.receipt.status, path: result.path, sha256: result.sha256, key: result.key, cacheHit: result.cacheHit, audioCacheHit: result.audioCacheHit, elapsedMs: result.elapsedMs, providerCalls: 0, paidSpendUsd: 0 }));
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === SELF) {
  try { await runAudioCli(process.argv.slice(2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
