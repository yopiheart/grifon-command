// Local replacement only. Generation, downloads and provider access are separate.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../../..');
const PRIMARY = 'C:/Users/ADMIN/Desktop/grifon-command';
const FF = path.join(PRIMARY, 'node_modules/ffmpeg-static/ffmpeg.exe');
const PROBE = path.join(PRIMARY, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const LOCAL = path.join(REPO, '.tmp/grifon-elevenlabs-replacement');
const REPORT = path.join(HERE, 'qa/replacement-report.json');
const FIXTURES = path.join(REPO, '.tmp/grifon-elevenlabs-mixer-fixtures');
const SR = 48000, CHANNELS = 2, DURATION = 32.9, FRAMES = 1579200;
const MASTER_GAIN = 1.0752266011723428;
const TAIL_START = 32.7, SAMPLE_LIMIT = 10 ** (-1.8 / 20);
const PROTECTED = {
  music: { path: '.tmp/grifon-english-vo-v02/music-ducked.wav', sha256: '115b8f535a2d51ea9db4114d4a9fcac3fe738f157cf9e32bb7068ed10c5c28fa' },
  voice: { path: '.tmp/grifon-english-vo-v02/voice-positioned.wav', sha256: '54bcb035d532ef4c9f42a3a4ef9a6321af5382d75a2c4663a963dd8bc36934f7' },
  picture: { path: 'workflows/assets/grifon-motion-upgrade/grifon-full-upgrade-english-vo-1080p.mp4', sha256: 'b11bb7c7f572c249b20cb2e767c57b737c947145876f5b3df569be45e944f067' },
  timing: { path: 'workflows/assets/grifon-motion-upgrade/voiceover/qa/phrase-timing.json', sha256: 'dbad94bae8cdd0af5503e3bc74d3add4cfb9e7cc3189048f989919eefe62b816' },
};
const FORBIDDEN_HASHES = new Set([
  PROTECTED.music.sha256, PROTECTED.voice.sha256,
  '545d4a5baa994bf705af8ea047518d75723cc0f77febdc46f87065b71b9cdac0',
  'c75644338a93d8a8515da331f84d1efd47e8a723bf1e02d673273d5ad273f8cc',
  'e2b7780084349926c516ad8b0b27e484cf7826cde08b411528452f460716f230',
  // Released procedural pilot bytes remain forbidden even if renamed elsewhere.
  '295b837e9ad91ca2cd388794f89e3fb7e05b4798fbf2713d2eb186656863f502',
  '3170fe702ead4db67b9f09e4a7e8bf3fe584b7f97df494c4fb50cd8fb422e949',
  '5ce676b73431a253a059bf3ea866bd48f1026654426804615d4a4fbc86a3da9a',
  '61693fd9d434bd2d49cbc87f1211e6e42554e107b82ff9fdcede7e2d1d467617',
  '103f6e89b72eeed4506e8954b68cac2307d51b82b099e2a37acf4cbe8b540fcd',
  'a6918aee5b2acb1e580485993b085f18a3a908ae089d5b4f4ea0e8497a8a70dc',
  'f1101bbf6a2fe2d34d9736b55c4b7594b2de5f8e3325da45952812cbdd4a0af8',
  '25b1df09cdd7a50de33b6024c03f4daaf6e051c29cb703cb14dc7507f8429bad',
]);
const REQUIRED_GATES = ['manifestAndSourcesUnchanged', 'frozenMusicAndVoiceUnchanged', 'oldReleasesUnchanged', 'onlyMusicVoiceAndSelectedNewSfx', 'fixedMusicVoiceMasterGain', 'finiteSamples', 'voiceRmsAboveNewSfx', 'newSfxPhraseDucking', 'strictDecode', 'identicalH264', 'counted987Frames', 'formatAndDuration', 'encodedLoudnessAndTruePeak', 'silentBlackTail', 'faststart'];
const assert = (pass, message) => { if (!pass) throw new Error(message); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sha = file => hash(fs.readFileSync(file));
const round = value => Number(value.toFixed(9));
const db = value => round(20 * Math.log10(Math.max(value, 1e-12)));
const gain = dbValue => 10 ** (dbValue / 20);
const cosine = progress => .5 - .5 * Math.cos(Math.PI * Math.max(0, Math.min(1, progress)));
const frame = seconds => Math.round(seconds * SR);
const relative = file => path.relative(REPO, file).replaceAll('\\', '/');

function verify(file, expected, label) {
  assert(fs.existsSync(file), `Missing local input: ${label}`);
  assert(sha(file) === expected, `Changed locked input: ${label}`);
}

function localPath(value) {
  assert(typeof value === 'string' && value.length && !path.isAbsolute(value) && !/^[a-z]+:/i.test(value) && !value.split(/[\\/]/).includes('..'), 'Paths must be repo-relative and remain in the workspace');
  const resolved = path.resolve(REPO, value);
  assert(resolved.toLowerCase().startsWith(`${REPO}${path.sep}`.toLowerCase()), 'Path escaped workspace');
  assert(physicalPath(resolved).toLowerCase().startsWith(`${physicalPath(REPO)}${path.sep}`.toLowerCase()), 'Resolved path escaped workspace through an alias');
  return resolved;
}

function physicalPath(file) {
  const suffix = []; let existing = path.resolve(file);
  for (;;) {
    try { fs.lstatSync(existing); break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    suffix.unshift(path.basename(existing));
    const parent = path.dirname(existing); assert(parent !== existing, 'No existing path ancestor'); existing = parent;
  }
  return path.resolve(fs.realpathSync.native(existing), ...suffix);
}

function inputLocationAllowed(file) {
  const resolved = physicalPath(file).toLowerCase(), staging = physicalPath(LOCAL).toLowerCase();
  assert(resolved !== staging && !resolved.startsWith(`${staging}${path.sep}`), 'Reserved staging paths cannot be inputs');
  assert(resolved !== physicalPath(REPORT).toLowerCase(), 'Reserved QA report path cannot be a manifest/input');
}

function reserveWrites(targets, snapshot) {
  const inputs = new Set(snapshot.map(item => physicalPath(item.file).toLowerCase()));
  for (const target of targets) {
    const physical = physicalPath(target);
    assert(physical.toLowerCase() === path.resolve(target).toLowerCase(), 'Write targets cannot use symlink/junction aliases');
    assert(physical.toLowerCase().startsWith(`${physicalPath(REPO)}${path.sep}`.toLowerCase()) && !inputs.has(physical.toLowerCase()), 'Write target would overwrite an input/protected release');
    if (fs.existsSync(target) && fs.lstatSync(target).isFile()) assert(fs.lstatSync(target).nlink === 1, 'Write target cannot be hard-linked to another file');
  }
}

function sourceAllowed(asset) {
  assert(asset && typeof asset.id === 'string' && asset.id.length && /^[a-f0-9]{64}$/.test(asset.sha256), 'Asset needs an id and exact SHA256');
  assert(typeof asset.sourceLabel === 'string' && asset.sourceLabel.trim().length > 0, 'Every asset needs an explicit source label');
  const file = localPath(asset.path), normal = `${relative(file)}/${relative(physicalPath(file))}`.toLowerCase();
  inputLocationAllowed(file);
  assert(['.wav', '.mp3', '.opus'].includes(path.extname(file).toLowerCase()), 'Selected sources must be native WAV, MP3 or Opus audio');
  assert(!normal.includes('/sfx-foundry/') && !normal.includes('/grifon-reference-full/') && !normal.includes('/grifon-english-vo-v02/') && !/(?:^|\/)(?:sfx|mix|score|music|voice)-(?:preserved|premaster|master|stem|ducked|recovered|positioned)(?:\.|-)/.test(normal), 'Legacy SFX, pilot, music/voice or master assets cannot be selected as new SFX');
  assert(!FORBIDDEN_HASHES.has(asset.sha256), 'A protected/old audio asset hash cannot be selected as new SFX');
  return file;
}

function run(binary, args) {
  const result = spawnSync(binary, args.map(String), { maxBuffer: 180 * 1024 * 1024, windowsHide: true });
  if (result.error) throw new Error(`Local subprocess failed: ${result.error.code}`);
  assert(result.status === 0, `${path.basename(binary)} exit ${result.status}: ${result.stderr.toString().slice(-5000)}`);
  return result;
}
const ff = args => {
  const localArgs = [];
  for (const arg of args) { if (arg === '-i') localArgs.push('-protocol_whitelist', 'file,pipe'); localArgs.push(arg); }
  return run(FF, ['-hide_banner', '-y', ...localArgs]);
};
const probe = file => JSON.parse(run(PROBE, ['-v', 'error', '-protocol_whitelist', 'file,pipe', '-f', 'mov', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]).stdout);

function decodeNew(file) {
  const container = { '.wav': 'wav', '.mp3': 'mp3', '.opus': 'ogg', '.mp4': 'mov' }[path.extname(file).toLowerCase()];
  assert(container, 'Unsupported native source container');
  const bytes = ff(['-v', 'error', '-xerror', '-err_detect', 'explode', '-f', container, '-i', file, '-map', '0:a:0', '-vn', '-ar', SR, '-ac', CHANNELS, '-f', 'f32le', 'pipe:1']).stdout;
  assert(bytes.length > 0 && bytes.length % 8 === 0 && bytes.length <= SR * CHANNELS * 4 * 120, 'New source decoded to invalid or excessive audio length');
  const samples = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert(samples.every(Number.isFinite), 'New source contains non-finite samples');
  return samples;
}

function frozenFloatWav(file) {
  // Read the existing float32 PCM directly: no resampling or filters on music/VO.
  const bytes = fs.readFileSync(file);
  assert(bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE', 'Frozen stem is not a WAV');
  let fmt, data;
  for (let at = 12; at + 8 <= bytes.length;) {
    const length = bytes.readUInt32LE(at + 4), kind = bytes.toString('ascii', at, at + 4);
    assert(at + 8 + length <= bytes.length, 'Truncated frozen WAV chunk');
    if (kind === 'fmt ') fmt = at + 8;
    if (kind === 'data') data = { at: at + 8, length };
    at += 8 + length + length % 2;
  }
  assert(fmt && data && bytes.readUInt16LE(fmt) === 3 && bytes.readUInt16LE(fmt + 2) === CHANNELS && bytes.readUInt32LE(fmt + 4) === SR && bytes.readUInt16LE(fmt + 14) === 32 && data.length === FRAMES * CHANNELS * 4, 'Frozen stem format/timing changed');
  const samples = new Float32Array(FRAMES * CHANNELS);
  for (let i = 0; i < samples.length; i++) samples[i] = bytes.readFloatLE(data.at + i * 4);
  assert(samples.every(Number.isFinite), 'Frozen stem contains non-finite samples');
  assert(samples.subarray(frame(TAIL_START) * CHANNELS).every(value => value === 0), 'Frozen stem final .2 seconds is not silent');
  return samples;
}

function stats(samples, start = 0, end = DURATION, factor = 1) {
  let peak = 0, square = 0, count = 0;
  for (let i = frame(start) * CHANNELS; i < Math.min(samples.length, frame(end) * CHANNELS); i++) {
    const value = samples[i] * factor;
    assert(Number.isFinite(value), 'Non-finite measured sample');
    peak = Math.max(peak, Math.abs(value)); square += value * value; count++;
  }
  const rms = Math.sqrt(square / Math.max(1, count));
  return { peakDbfs: db(peak), rmsDbfs: db(rms), rms, sampleValues: count };
}

function validateManifest(file) {
  inputLocationAllowed(file);
  assert(fs.existsSync(file), 'An existing explicit selected-source manifest is required');
  const manifestHash = sha(file), manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert(manifest.schemaVersion === 1 && manifest.mode === 'new-only-sfx-replacement', 'Unexpected manifest schema/mode');
  assert(Array.isArray(manifest.assets) && manifest.assets.length > 0 && Array.isArray(manifest.cues) && manifest.cues.length > 0, 'Missing selected assets/cues');
  assert(new Set(manifest.assets.map(asset => asset.id)).size === manifest.assets.length && new Set(manifest.cues.map(cue => cue.id)).size === manifest.cues.length, 'Duplicate asset/cue id');
  const assets = manifest.assets.map(asset => { const source = sourceAllowed(asset); verify(source, asset.sha256, asset.id); return { ...asset, file: source }; });
  for (const cue of manifest.cues) {
    assert(typeof cue.id === 'string' && cue.id.length && assets.some(asset => asset.id === cue.assetId), 'Cue id/assetId invalid');
    for (const key of ['sourceInSeconds', 'sourceOutSeconds', 'startSeconds', 'sourceContactSeconds', 'timelineContactSeconds', 'gainDb']) assert(Number.isFinite(cue[key]), `Cue ${cue.id} missing/invalid ${key}`);
    assert(cue.sourceInSeconds >= 0 && cue.sourceOutSeconds > cue.sourceInSeconds && cue.startSeconds >= 0 && cue.sourceContactSeconds >= cue.sourceInSeconds && cue.sourceContactSeconds < cue.sourceOutSeconds, `Cue ${cue.id} trim/contact invalid`);
    assert(frame(cue.startSeconds) + frame(cue.sourceContactSeconds) - frame(cue.sourceInSeconds) === frame(cue.timelineContactSeconds), `Cue ${cue.id} contact is not aligned at sample precision`);
    assert(frame(cue.startSeconds) + frame(cue.sourceOutSeconds) - frame(cue.sourceInSeconds) <= frame(TAIL_START), `Cue ${cue.id} reaches the silent tail`);
    assert(cue.pan === undefined || Number.isFinite(cue.pan) && cue.pan >= -1 && cue.pan <= 1, `Cue ${cue.id} pan must be between -1 and 1`);
  }
  const output = localPath(manifest.output), artifactDir = path.resolve(HERE, '..');
  assert(path.dirname(output).toLowerCase() === artifactDir.toLowerCase() && path.basename(output).startsWith('grifon-full-upgrade-') && output.toLowerCase().endsWith('.mp4'), 'Output must be a new named Grifon MP4 in the artifact directory');
  assert(!assets.some(asset => asset.file.toLowerCase() === output.toLowerCase()) && !Object.values(PROTECTED).some(input => localPath(input.path).toLowerCase() === output.toLowerCase()), 'Output would overwrite a protected input');
  assert(physicalPath(output).toLowerCase() === output.toLowerCase(), 'Release output cannot use symlink/junction aliases');
  const releases = fs.readdirSync(artifactDir).filter(name => name.toLowerCase().endsWith('.mp4')).map(name => { const release = path.join(artifactDir, name); return { file: release, sha256: sha(release) }; });
  const protectedInputs = Object.fromEntries(Object.entries(PROTECTED).map(([name, input]) => { const protectedFile = localPath(input.path); verify(protectedFile, input.sha256, name); return [name, { file: protectedFile, sha256: input.sha256 }]; }));
  const timing = JSON.parse(fs.readFileSync(protectedInputs.timing.file, 'utf8'));
  assert(timing.phrases.length === 11 && timing.phrases.every(phrase => Number.isFinite(phrase.actualStart) && Number.isFinite(phrase.actualEnd) && phrase.actualStart >= 0 && phrase.actualEnd > phrase.actualStart && phrase.actualEnd < TAIL_START), 'Frozen phrase windows invalid');
  assert(fs.existsSync(FF) && fs.existsSync(PROBE), 'Existing local FFmpeg/ffprobe required');
  const snapshot = [{ file, sha256: manifestHash }, ...assets.map(asset => ({ file: asset.file, sha256: asset.sha256 })), ...Object.values(protectedInputs), ...releases];
  reserveWrites([REPORT], snapshot);
  return { manifest, manifestHash, manifestFile: file, assets, output, releases, protectedInputs, phrases: timing.phrases, snapshot };
}

function unchanged(snapshot) { for (const item of snapshot) verify(item.file, item.sha256, relative(item.file)); }

function duck(time, phrases) {
  let value = 1;
  for (const phrase of phrases) {
    if (time < phrase.actualStart - .06 || time >= phrase.actualEnd + .12) continue;
    const progress = time < phrase.actualStart ? (time - phrase.actualStart + .06) / .06 : time > phrase.actualEnd ? 1 - (time - phrase.actualEnd) / .12 : 1;
    value = Math.min(value, 1 + (gain(-7) - 1) * cosine(progress));
  }
  return value;
}

function newSfx(context, decoded) {
  const result = new Float64Array(FRAMES * CHANNELS), cueEvidence = [];
  for (const cue of context.manifest.cues) {
    const input = decoded[cue.assetId], begin = frame(cue.sourceInSeconds), end = frame(cue.sourceOutSeconds), start = frame(cue.startSeconds);
    assert(end * CHANNELS <= input.length, `Cue ${cue.id} trim exceeds decoded source`);
    const length = end - begin, edge = Math.min(frame(.003), Math.floor(length / 4));
    assert(length >= 4 && edge > 0, `Cue ${cue.id} is too short for safe edges`);
    const pan = cue.pan ?? 0, left = pan > 0 ? Math.cos(pan * Math.PI / 2) : 1, right = pan < 0 ? Math.cos(-pan * Math.PI / 2) : 1;
    for (let localFrame = 0; localFrame < length; localFrame++) {
      const envelope = gain(cue.gainDb) * cosine(Math.min(localFrame / edge, (length - 1 - localFrame) / edge, 1)) * duck((start + localFrame) / SR, context.phrases);
      for (let channel = 0; channel < CHANNELS; channel++) {
        const index = (start + localFrame) * CHANNELS + channel;
        result[index] += input[(begin + localFrame) * CHANNELS + channel] * envelope * (channel === 0 ? left : right);
        assert(Number.isFinite(result[index]), 'New SFX sum became non-finite');
      }
    }
    cueEvidence.push({ ...cue, trimFrames: length, placedStart: start / SR, placedEnd: (start + length) / SR, placedContact: (start + frame(cue.sourceContactSeconds) - begin) / SR, edgeFadeSeconds: edge / SR, stereoBalance: { left, right } });
  }
  assert(result.subarray(frame(TAIL_START) * CHANNELS).every(value => value === 0), 'New SFX reaches silent tail');
  return { samples: result, cueEvidence };
}

function baseContributions(music, voice) {
  const base = new Float64Array(music.length);
  assert(music.length === voice.length, 'Music/voice length mismatch');
  for (let i = 0; i < base.length; i++) { base[i] = music[i] * MASTER_GAIN + voice[i] * MASTER_GAIN; assert(Number.isFinite(base[i]), 'Base became non-finite'); }
  return base;
}

function headroomScale(base, sfx) {
  let scale = 1;
  for (let i = 0; i < base.length; i++) {
    assert(Math.abs(base[i]) <= SAMPLE_LIMIT, 'Frozen music/VO alone exceeds reserved sample headroom');
    const change = sfx[i] * MASTER_GAIN;
    if (change > 0) scale = Math.min(scale, (SAMPLE_LIMIT - base[i]) / change);
    else if (change < 0) scale = Math.min(scale, (SAMPLE_LIMIT + base[i]) / -change);
  }
  assert(Number.isFinite(scale) && scale >= 0, 'Invalid new-SFX headroom factor');
  return Math.min(1, scale);
}

function sumOnlyNew(base, sfx, scale) {
  const result = new Float32Array(base.length);
  let maximumFloatRounding = 0;
  for (let i = 0; i < result.length; i++) {
    const expected = base[i] + sfx[i] * MASTER_GAIN * scale;
    result[i] = expected;
    assert(Number.isFinite(result[i]), 'Replacement mix became non-finite');
    maximumFloatRounding = Math.max(maximumFloatRounding, Math.abs(result[i] - expected));
  }
  return { samples: result, maximumFloatRounding };
}

function writeWav(file, samples) {
  const data = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength), header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(data.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(3, 20); header.writeUInt16LE(CHANNELS, 22); header.writeUInt32LE(SR, 24);
  header.writeUInt32LE(SR * CHANNELS * 4, 28); header.writeUInt16LE(8, 32); header.writeUInt16LE(32, 34); header.write('data', 36); header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

function measure(file) {
  const output = ff(['-i', file, '-vn', '-af', 'loudnorm=I=-16:TP=-1:LRA=9:print_format=json', '-f', 'null', '-']).stderr.toString();
  const matches = output.match(/\{\s*"input_i"[\s\S]*?\}/g);
  assert(matches?.length, 'Missing loudness meter output');
  const result = JSON.parse(matches.at(-1));
  const integratedLufs = Number(result.input_i), truePeakDbtp = Number(result.input_tp);
  assert(Number.isFinite(integratedLufs) && Number.isFinite(truePeakDbtp), 'Invalid loudness meter result');
  return { integratedLufs, truePeakDbtp, rangeLu: Number(result.input_lra), method: 'FFmpeg loudnorm input meter to null only; no normalization applied' };
}

function boxes(file) {
  const bytes = fs.readFileSync(file), result = [];
  for (let at = 0; at < bytes.length;) {
    assert(at + 8 <= bytes.length, 'Truncated MP4 box');
    let size = bytes.readUInt32BE(at), minimum = 8;
    if (size === 1) { assert(at + 16 <= bytes.length, 'Truncated extended MP4 box'); size = Number(bytes.readBigUInt64BE(at + 8)); minimum = 16; }
    if (size === 0) size = bytes.length - at;
    assert(Number.isSafeInteger(size) && size >= minimum && at + size <= bytes.length, 'Invalid MP4 box');
    result.push({ kind: bytes.toString('ascii', at + 4, at + 8), offset: at, size }); at += size;
  }
  assert(result.find(box => box.kind === 'moov')?.offset < result.find(box => box.kind === 'mdat')?.offset, 'Candidate is not faststart');
  return result;
}

function inspect(candidate, picture, loudness) {
  const metadata = probe(candidate), video = metadata.streams.find(stream => stream.codec_type === 'video'), audio = metadata.streams.find(stream => stream.codec_type === 'audio');
  assert(metadata.streams.length === 2 && video && audio, 'Expected exactly one picture and one audio stream');
  assert(video.codec_name === 'h264' && video.width === 1920 && video.height === 1080 && video.pix_fmt === 'yuv420p' && video.avg_frame_rate === '30/1', 'Picture format failed');
  assert(Number(video.nb_frames) === 987 && Number(video.nb_read_frames) === 987 && Math.abs(Number(video.duration) - DURATION) < .0001 && Math.abs(Number(metadata.format.duration) - DURATION) < .0001, 'Picture frame count/duration failed');
  assert(audio.codec_name === 'aac' && Number(audio.sample_rate) === SR && audio.channels === CHANNELS, 'Audio format failed');
  assert(Math.abs(loudness.integratedLufs + 16) <= 1 && loudness.truePeakDbtp <= -1, 'Encoded loudness/true-peak gate failed');
  ff(['-v', 'error', '-xerror', '-err_detect', 'explode', '-i', candidate, '-f', 'null', '-']);
  const payload = file => ff(['-v', 'error', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).stdout.toString().trim();
  const original = payload(picture), exported = payload(candidate);
  assert(original === exported, 'Locked H264 payload changed');
  const tail = stats(decodeNew(candidate), TAIL_START, DURATION);
  assert(tail.peakDbfs <= -80, 'Final .2 seconds is not silent');
  const black = ff(['-v', 'error', '-ss', TAIL_START, '-i', candidate, '-an', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']).stdout;
  assert(black.length === 1920 * 1080 * 3 * 6 && black.every(value => value === 0), 'Final six frames are not exactly black');
  return { metadata, videoPayload: { original, exported, equal: true }, blackTail: { start: TAIL_START, frames: 6, exactlyBlack: true, ...tail }, mp4Boxes: boxes(candidate) };
}

function promote(candidate, output, reportFile, report, snapshot) {
  assert(report.status === 'TECHNICAL_PASS_AUDITORY_QA_PENDING' && Object.keys(report.gates ?? {}).length === REQUIRED_GATES.length && REQUIRED_GATES.every(name => report.gates[name] === true), 'Candidate has not passed the exact required gates');
  unchanged(snapshot);
  reserveWrites([reportFile], snapshot);
  assert(physicalPath(output).toLowerCase() === path.resolve(output).toLowerCase(), 'Release output cannot use symlink/junction aliases');
  verify(candidate, report.outputSha256, 'candidate after verification');
  if (fs.existsSync(output)) assert(sha(output) === report.outputSha256, 'Refusing to overwrite an existing different release');
  else fs.copyFileSync(candidate, output, fs.constants.COPYFILE_EXCL);
  verify(output, report.outputSha256, 'new released output');
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  const reportStage = fs.mkdtempSync(path.join(LOCAL, 'report-')), pendingReport = path.join(reportStage, 'verified-report.json');
  reserveWrites([pendingReport, reportFile], snapshot);
  fs.writeFileSync(pendingReport, JSON.stringify(report, null, 2) + '\n');
  fs.renameSync(pendingReport, reportFile);
}

function render(context) {
  assert(context.manifest.fixture !== true, 'Synthetic/temporary fixtures cannot be rendered or promoted as a release');
  assert(physicalPath(LOCAL).toLowerCase() === LOCAL.toLowerCase(), 'Staging directory cannot use a symlink/junction alias');
  fs.mkdirSync(LOCAL, { recursive: true });
  const music = frozenFloatWav(context.protectedInputs.music.file), voice = frozenFloatWav(context.protectedInputs.voice.file);
  const decoded = Object.fromEntries(context.assets.map(asset => [asset.id, decodeNew(asset.file)]));
  const designed = newSfx(context, decoded), base = baseContributions(music, voice);
  let scale = headroomScale(base, designed.samples), combined, loudness;
  const staging = fs.mkdtempSync(path.join(LOCAL, 'render-'));
  const mixFile = path.join(staging, 'candidate-new-only-mix.wav'), candidate = path.join(staging, 'candidate-new-only-sfx.mp4'), attempts = [];
  reserveWrites([mixFile, candidate, REPORT], context.snapshot);
  for (let attempt = 0; attempt < 30; attempt++) {
    combined = sumOnlyNew(base, designed.samples, scale);
    writeWav(mixFile, combined.samples);
    ff(['-v', 'error', '-i', context.protectedInputs.picture.file, '-i', mixFile, '-map', '0:v:0', '-map', '1:a:0', '-t', DURATION, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', SR, '-ac', CHANNELS, '-movflags', '+faststart', candidate]);
    loudness = measure(candidate); attempts.push({ attempt: attempt + 1, newSfxOnlyScale: scale, ...loudness });
    if (loudness.truePeakDbtp <= -1) break;
    assert(attempt < 29, 'New-SFX-only headroom scaling could not pass encoded true peak; candidate retained');
    scale *= .9;
  }
  const phrases = context.phrases.map(phrase => {
    const voiceLevels = stats(voice, phrase.actualStart, phrase.actualEnd, MASTER_GAIN), sfxLevels = stats(designed.samples, phrase.actualStart, phrase.actualEnd, MASTER_GAIN * scale);
    const margin = round(voiceLevels.rmsDbfs - sfxLevels.rmsDbfs);
    assert(margin > 0, `Voice average energy is not above new SFX during ${phrase.id}; adjust only selected new cue gains`);
    return { id: phrase.id, start: phrase.actualStart, end: phrase.actualEnd, voice: voiceLevels, newSfx: sfxLevels, voiceOverNewSfxRmsMarginDb: margin, approvedMusic: stats(music, phrase.actualStart, phrase.actualEnd, MASTER_GAIN) };
  });
  assert(combined.samples.subarray(frame(TAIL_START) * CHANNELS).every(value => value === 0), 'PCM tail is not exactly zero');
  const inspection = inspect(candidate, context.protectedInputs.picture.file, loudness);
  unchanged(context.snapshot);
  inspection.metadata.format.filename = relative(context.output);
  const report = {
    status: 'TECHNICAL_PASS_AUDITORY_QA_PENDING', output: relative(context.output), outputSha256: sha(candidate), bytes: fs.statSync(candidate).size,
    manifestSha256: context.manifestHash, mode: 'new-only-sfx-replacement', duration: DURATION, sampleRate: SR, channels: CHANNELS,
    equation: 'music-ducked × fixed master gain + voice-positioned × fixed master gain + selected new SFX × fixed master gain × new-SFX-only headroom scale',
    fixedMasterGain: MASTER_GAIN, fixedMasterGainDb: db(MASTER_GAIN), newSfxOnlyScale: scale, newSfxOnlyScaleDb: db(scale), maximumFloat32SumRounding: combined.maximumFloatRounding,
    sourceAssets: context.assets.map(asset => ({ id: asset.id, path: relative(asset.file), sha256: asset.sha256, sourceLabel: asset.sourceLabel, rawBytesPreserved: true, decodedSeconds: decoded[asset.id].length / CHANNELS / SR })),
    preservedInputs: Object.fromEntries(Object.entries(context.protectedInputs).map(([name, input]) => [name, { path: relative(input.file), sha256: input.sha256, unchanged: true }])),
    preservedReleases: context.releases.map(release => ({ path: relative(release.file), sha256: release.sha256, unchanged: true })),
    cues: designed.cueEvidence, phraseLevels: phrases, ducking: { appliesOnlyTo: 'selected new SFX', db: -7, attackSeconds: .06, releaseSeconds: .12, curve: 'Cosine; exact frozen actualStart/actualEnd, minimum overlapping gain' },
    headroom: { reservedPcmPeakDbfs: db(SAMPLE_LIMIT), attempts }, loudness, pcmLevels: { approvedMusicVoiceBase: stats(base), replacementMix: stats(combined.samples) },
    ...inspection, gates: Object.fromEntries(REQUIRED_GATES.map(name => [name, true])),
    operations: { providerCalls: 0, downloads: 0, generationCalls: 0, voiceSynthesisCalls: 0, networkCalls: 0 },
    auditoryQa: 'PENDING: full-film supported hearing route, headphones/phone/mono, source selection, contact fit and clarity',
    limitations: ['The original mixed master, premaster, preserved old SFX and procedural pilot do not enter this mix.', 'Unchanged native files and fixed PCM contributions preserve music/VO level and timing structurally. AAC composite encoding does not preserve exact separated voice/music samples.', 'Peak/RMS and decode gates do not establish listening quality or validate ElevenLabs provenance beyond the supplied source labels and locked bytes.'],
  };
  promote(candidate, context.output, REPORT, report, context.snapshot);
  console.log(JSON.stringify({ status: report.status, output: report.output, outputSha256: report.outputSha256, lufs: loudness.integratedLufs, truePeakDbtp: loudness.truePeakDbtp, newSfxOnlyScale: scale }));
}

function selfTest() {
  assert(physicalPath(FIXTURES).toLowerCase() === FIXTURES.toLowerCase(), 'Fixture directory cannot use an alias');
  fs.mkdirSync(FIXTURES, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(FIXTURES, 'TEMPORARY-NONRELEASE-fixture-'));
  const expectFailure = (operation, message) => { let failed = false; try { operation(); } catch (error) { failed = error.message.includes(message); } assert(failed, `Guard failed to reject: ${message}`); };
  const asset = { id: 'fixture', path: '.tmp/TEMPORARY-FIXTURE.wav', sha256: 'a'.repeat(64), sourceLabel: 'TEMPORARY SYNTHETIC FIXTURE; NOT ELEVENLABS; NEVER RELEASE' };
  expectFailure(() => sourceAllowed({ ...asset, path: 'workflows/assets/grifon-motion-upgrade/sfx-foundry/pilot/product-weight.wav' }), 'Legacy SFX');
  expectFailure(() => sourceAllowed({ ...asset, sha256: PROTECTED.music.sha256 }), 'protected/old');
  expectFailure(() => sourceAllowed({ ...asset, sha256: '3170fe702ead4db67b9f09e4a7e8bf3fe584b7f97df494c4fb50cd8fb422e949' }), 'protected/old');
  expectFailure(() => sourceAllowed({ ...asset, path: '../outside.wav' }), 'remain in the workspace');
  expectFailure(() => sourceAllowed({ ...asset, path: '.tmp/grifon-elevenlabs-replacement/candidate-new-only-mix.wav' }), 'Reserved staging');
  expectFailure(() => validateManifest(REPORT), 'Reserved QA report');
  expectFailure(() => render({ manifest: { fixture: true } }), 'cannot be rendered');
  const locked = path.join(fixture, 'locked-source.txt'), candidate = path.join(fixture, 'candidate-NONMEDIA.txt'), output = path.join(fixture, 'existing-release-NONMEDIA.txt'), reportFile = path.join(fixture, 'report.json');
  fs.writeFileSync(locked, 'fixture source'); const snapshot = [{ file: locked, sha256: sha(locked) }];
  fs.appendFileSync(locked, ' changed'); expectFailure(() => unchanged(snapshot), 'Changed locked input');
  fs.writeFileSync(locked, 'fixture source'); fs.writeFileSync(candidate, 'fixture candidate'); fs.writeFileSync(output, 'existing immutable fixture');
  const releaseHash = sha(output), gates = Object.fromEntries(REQUIRED_GATES.map(name => [name, true]));
  const report = { status: 'TECHNICAL_PASS_AUDITORY_QA_PENDING', gates, outputSha256: sha(candidate) };
  fs.appendFileSync(candidate, ' changed'); expectFailure(() => promote(candidate, output, reportFile, report, snapshot), 'Changed locked input');
  fs.writeFileSync(candidate, 'fixture candidate');
  const missing = { ...gates }; delete missing.strictDecode;
  expectFailure(() => promote(candidate, output, reportFile, { ...report, gates: missing }, snapshot), 'exact required gates');
  expectFailure(() => promote(candidate, output, reportFile, { ...report, gates: {} }, snapshot), 'exact required gates');
  expectFailure(() => promote(candidate, output, reportFile, { ...report, gates: { ...gates, strictDecode: false } }, snapshot), 'exact required gates');
  expectFailure(() => promote(candidate, output, reportFile, report, snapshot), 'Refusing to overwrite');
  assert(sha(output) === releaseHash && !fs.existsSync(reportFile), 'Failing guards modified fixture release/report');
  expectFailure(() => reserveWrites([locked], snapshot), 'overwrite an input');
  const music = new Float32Array([.1, .2, -.1, -.2]), voice = new Float32Array([.2, .1, -.2, -.1]), fresh = new Float64Array([.01, -.01, .02, -.02]);
  const base = baseContributions(music, voice), combined = sumOnlyNew(base, fresh, .5);
  for (let i = 0; i < music.length; i++) assert(Math.abs(combined.samples[i] - (music[i] * MASTER_GAIN + voice[i] * MASTER_GAIN + fresh[i] * MASTER_GAIN * .5)) <= 3e-8, 'Replacement algebra changed frozen contributions');
  const waveform = path.join(fixture, 'TEMPORARY-SYNTHETIC-NOT-ELEVENLABS.wav'), manifestFile = path.join(fixture, 'TEMPORARY-selected.json');
  writeWav(waveform, new Float32Array(2400));
  const manifest = { schemaVersion: 1, mode: 'new-only-sfx-replacement', fixture: true, output: 'workflows/assets/grifon-motion-upgrade/grifon-full-upgrade-TEMPORARY-NONRELEASE-fixture.mp4', assets: [{ ...asset, path: relative(waveform), sha256: sha(waveform) }], cues: [{ id: 'fixture-cue', assetId: 'fixture', sourceInSeconds: 0, sourceOutSeconds: .01, startSeconds: 1, sourceContactSeconds: 0, timelineContactSeconds: 1, gainDb: -20, pan: 0 }] };
  const saveManifest = value => fs.writeFileSync(manifestFile, JSON.stringify(value));
  saveManifest(manifest); const dryContext = validateManifest(manifestFile);
  assert(dryContext.manifest.fixture === true && !fs.existsSync(dryContext.output), 'Fixture dry run created media');
  expectFailure(() => render(dryContext), 'cannot be rendered');
  saveManifest({ ...manifest, cues: [{ ...manifest.cues[0], timelineContactSeconds: 1 + 1 / SR }] });
  expectFailure(() => validateManifest(manifestFile), 'sample precision');
  saveManifest({ ...manifest, output: PROTECTED.picture.path });
  expectFailure(() => validateManifest(manifestFile), 'protected input');
  saveManifest(manifest);
  console.log(JSON.stringify({ status: 'TEMPORARY_FIXTURE_CONTROLS_PASS_NO_MEDIA_RELEASE', legacyAndProtectedAssetsRejected: true, changedSourceAndCandidateRejected: true, missingEmptyFailedGatesRejected: true, reservedWriteTargetsRejected: true, dryRunFixtureManifestValidated: true, wrongContactRejected: true, protectedOutputRejected: true, existingReleasePreserved: true, fixtureReleaseForbidden: true, fixedMusicVoicePlusNewOnlyAlgebra: true, fixture: relative(fixture), providerCalls: 0 }));
}

function main() {
  const args = process.argv.slice(2); let manifestFile;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--manifest') { assert(args[i + 1] && !args[i + 1].startsWith('--'), '--manifest requires a path'); manifestFile = path.resolve(args[++i]); }
    else assert(['--render', '--self-test', '--help'].includes(args[i]), `Unsupported option: ${args[i]}`);
  }
  if (args.includes('--help')) { console.log('Default: --manifest <selected.json> validates locked local bytes/spec only. --render adds local new-only mix/mux with gated promotion. --self-test uses clearly labeled ignored nonrelease fixtures; no provider calls.'); return; }
  if (args.includes('--self-test')) { assert(!args.includes('--render'), 'Fixture controls cannot be combined with release rendering'); selfTest(); if (!manifestFile) return; }
  assert(manifestFile, 'Provide --manifest <selected.json>; no implicit source selection or generation');
  const context = validateManifest(manifestFile);
  if (args.includes('--render')) render(context);
  else console.log(JSON.stringify({ status: 'DRY_RUN_LOCAL_MANIFEST_VALID', rendering: false, assets: context.assets.length, cues: context.manifest.cues.length, manifestSha256: context.manifestHash, output: relative(context.output), fixedMusicVoiceMasterGain: MASTER_GAIN, operations: { providerCalls: 0, downloads: 0, generationCalls: 0 }, auditoryQa: 'PENDING' }));
}

try { main(); } catch (error) { console.error(`Replacement stopped: ${error.message}`); process.exitCode = 1; }
