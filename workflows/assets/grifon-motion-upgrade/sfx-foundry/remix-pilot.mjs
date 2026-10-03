// Offline SFX-only pilot. No provider, credential, download or application calls.
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
const CUES = path.join(HERE, 'film-cues.json');
const TIMING = path.resolve(HERE, '../voiceover/qa/phrase-timing.json');
const MANIFEST = path.join(HERE, 'pilot/manifest.json');
const CUES_SHA = '11bf38d19e647a7ff6bc7e93308945473bad06f347e468944fee1ff7c0cf0960';
const TIMING_SHA = 'dbad94bae8cdd0af5503e3bc74d3add4cfb9e7cc3189048f989919eefe62b816';
const MANIFEST_SHA = '5f387db62052a77fa20a6a94eaa6b82bc23e1802702be0ecdc8944c02da8827b';
const LOCAL = path.join(REPO, '.tmp/grifon-sfx-pilot');
const QA = path.join(HERE, 'qa');
const SR = 48000, CHANNELS = 2, DURATION = 32.9;
const FRAMES = Math.round(SR * DURATION), VALUES = FRAMES * CHANNELS;
const TAIL_START = 32.7;
const FIT_PEAK_LIMIT = 2 / 8388608; // Two PCM24 LSBs, including float decode rounding.
const SAMPLE_HEADROOM = 10 ** (-1.8 / 20);
const REQUIRED_CHECKS = ['lockedSpecAndInputsUnchanged', 'pilotSourcesUnchanged', 'oldReleasesUnchanged', 'originalMasterConstantGainFit', 'finiteSampleSafeSums', 'onlySfxDeltaAdded', 'voiceRmsAboveSfxInEveryPhrase', 'newLayersDuckedAtExactPhraseWindows', 'fullStrictDecode', 'picturePayloadIdentical', 'counted987Frames', 'formatAndTiming', 'encodedLoudness', 'silentBlackTail', 'faststart'];
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const sha = file => hash(fs.readFileSync(file));
const assert = (pass, message) => { if (!pass) throw new Error(message); };
const round = value => Number(value.toFixed(9));
const db = value => round(20 * Math.log10(Math.max(value, 1e-12)));
const linear = value => 10 ** (value / 20);
const pcmBytes = samples => Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));

function verifyHash(file, expected, label) {
  assert(fs.existsSync(file), `Missing offline input: ${label}`);
  assert(sha(file) === expected, `Changed locked input: ${label}`);
}

function run(binary, args, input) {
  const result = spawnSync(binary, args.map(String), { input, maxBuffer: 180 * 1024 * 1024, windowsHide: true });
  if (result.error) throw new Error(`Local subprocess failed: ${result.error.code}`);
  assert(result.status === 0, `${path.basename(binary)} exit ${result.status}: ${result.stderr.toString().slice(-5000)}`);
  return result;
}
const ff = (args, input) => run(FF, ['-hide_banner', '-y', ...args], input);
const probe = file => JSON.parse(run(PROBE, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', file]).stdout);

function decode(file) {
  const bytes = ff(['-v', 'error', '-i', file, '-vn', '-ar', SR, '-ac', CHANNELS, '-f', 'f32le', 'pipe:1']).stdout;
  assert(bytes.length % 8 === 0, 'Decoded audio has incomplete stereo frames');
  const samples = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
  assert(samples.every(Number.isFinite), 'Decoded audio contains non-finite samples');
  return samples;
}

function writeFloatWav(file, samples) {
  const data = pcmBytes(samples), header = Buffer.alloc(44);
  header.write('RIFF', 0); header.writeUInt32LE(data.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(3, 20); header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * CHANNELS * 4, 28);
  header.writeUInt16LE(CHANNELS * 4, 32); header.writeUInt16LE(32, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}

function stats(samples, start = 0, end = samples.length / CHANNELS / SR, gain = 1) {
  let peak = 0, square = 0, count = 0;
  for (let i = Math.max(0, Math.round(start * SR)) * CHANNELS; i < Math.min(samples.length, Math.round(end * SR) * CHANNELS); i++) {
    const sample = samples[i] * gain;
    assert(Number.isFinite(sample), 'Non-finite sample in measurement');
    peak = Math.max(peak, Math.abs(sample)); square += sample * sample; count++;
  }
  return { peakDbfs: db(peak), rmsDbfs: db(Math.sqrt(square / Math.max(1, count))), sampleValues: count };
}

function measure(file) {
  // Meter only: the filtered signal goes to null and is never used as a mix.
  const result = ff(['-i', file, '-vn', '-af', 'loudnorm=I=-16:TP=-1:LRA=9:print_format=json', '-f', 'null', '-']);
  const matches = result.stderr.toString().match(/\{\s*"input_i"[\s\S]*?\}/g);
  assert(matches?.length, 'Missing loudness meter result');
  const measured = JSON.parse(matches.at(-1));
  assert(Number.isFinite(Number(measured.input_i)) && Number.isFinite(Number(measured.input_tp)), 'Invalid loudness measurement');
  return { integratedLufs: Number(measured.input_i), truePeakDbtp: Number(measured.input_tp), rangeLu: Number(measured.input_lra), method: 'FFmpeg loudnorm input meter only; no normalization applied' };
}

function validateInputs() {
  verifyHash(CUES, CUES_SHA, 'film-cues.json');
  verifyHash(TIMING, TIMING_SHA, 'existing phrase-timing.json');
  verifyHash(MANIFEST, MANIFEST_SHA, 'final original pilot manifest');
  const cues = json(CUES), timing = json(TIMING), manifest = json(MANIFEST);
  assert(cues.duration === DURATION && cues.sampleRate === SR, 'Unexpected locked mix format');
  assert(cues.voiceProtection.newLayerDuckDb === -7 && cues.voiceProtection.attackSeconds === .06 && cues.voiceProtection.releaseSeconds === .12, 'Voice protection changed');
  assert(cues.placements.length === 14 && cues.existingSfxReductions.length === 13, 'Unexpected cue count');
  const expectedIds = ['hero-sweep', 'product-weight', 'pivot-suction', 'sphere-reveal', 'card-snap', 'workflow-punch', 'micro-select', 'logo-resolve'];
  assert(manifest.sounds?.length === 8 && manifest.sounds.every(sound => expectedIds.includes(sound.id)) && new Set(manifest.sounds.map(sound => sound.id)).size === 8, 'Expected exactly eight original pilot sounds');
  assert(manifest.format.sampleRateHz === SR && manifest.format.channels === CHANNELS && manifest.format.bitsPerSample === 24, 'Pilot format changed');
  assert(manifest.provenance.networkCalls === 0 && manifest.provenance.paidAiCalls === 0 && manifest.provenance.inputSamples.length === 0, 'Pilot is not entirely original local DSP');
  const inputs = Object.fromEntries(Object.entries(cues.lockedInputs).map(([name, asset]) => {
    assert(!path.isAbsolute(asset.path) && !asset.path.includes('..'), `Unsafe input path: ${name}`);
    const file = path.resolve(REPO, asset.path);
    verifyHash(file, asset.sha256, name);
    return [name, { file, sha256: asset.sha256 }];
  }));
  assert(Object.keys(inputs).sort().join(',') === 'master,music,oldSfx,picture,premaster,voice', 'Unexpected locked inputs');
  for (const sound of manifest.sounds) {
    assert(sound.file === `${sound.id}.wav`, `Unexpected pilot filename: ${sound.id}`);
    assert(Number.isFinite(sound.durationSeconds) && sound.durationSeconds > 0 && Number.isFinite(sound.syncSeconds) && sound.syncSeconds >= 0 && sound.syncSeconds < sound.durationSeconds, `Invalid sound timing: ${sound.id}`);
    assert(sound.syncSample === Math.round(sound.syncSeconds * SR), `Invalid anchor sample: ${sound.id}`);
    const file = path.join(HERE, 'pilot', sound.file);
    verifyHash(file, sound.sha256, sound.id);
    assert(fs.statSync(file).size === sound.bytes && sound.measurements.qcPass === true, `Pilot QC/bytes mismatch: ${sound.id}`);
  }
  for (const placement of cues.placements) {
    const sound = manifest.sounds.find(item => item.id === placement.sound);
    assert(sound && Number.isFinite(placement.gainDb), 'Invalid design placement');
    assert(Number.isFinite(placement.start) !== Number.isFinite(placement.syncAt), 'Placement must have exactly one start/syncAt');
    const start = placement.start ?? placement.syncAt - sound.syncSeconds;
    assert(start >= 0 && start + sound.durationSeconds < TAIL_START, `Placement exceeds safe timeline: ${placement.sound}`);
  }
  assert(timing.phrases.length === 11, 'Expected eleven existing voice phrases');
  for (const phrase of timing.phrases) assert(Number.isFinite(phrase.actualStart) && Number.isFinite(phrase.actualEnd) && phrase.actualEnd > phrase.actualStart && phrase.actualEnd < TAIL_START, `Invalid phrase: ${phrase.id}`);
  for (const reduction of cues.existingSfxReductions) assert(reduction.start >= 0 && reduction.end > reduction.start && reduction.end < TAIL_START && reduction.gainDb < 0, 'Invalid old SFX reduction');
  for (const window of cues.comparisonWindows) assert(window.start >= 0 && window.end > window.start && window.end < TAIL_START, 'Invalid comparison window');
  assert(cues.output === 'workflows/assets/grifon-motion-upgrade/grifon-full-upgrade-sfx-pilot-1080p.mp4', 'Output is not the new named pilot');
  assert(fs.existsSync(FF) && fs.existsSync(PROBE), 'Installed local FFmpeg/ffprobe missing');
  const output = path.resolve(REPO, cues.output);
  const snapshot = [{ file: CUES, sha256: CUES_SHA }, { file: TIMING, sha256: TIMING_SHA }, { file: MANIFEST, sha256: sha(MANIFEST) }, ...Object.values(inputs),
    ...manifest.sounds.map(sound => ({ file: path.join(HERE, 'pilot', sound.file), sha256: sound.sha256 }))];
  // Protect every existing released MP4 in this artifact directory, including the pilot on reruns.
  const releases = fs.readdirSync(path.dirname(output)).filter(file => file.endsWith('.mp4')).map(file => {
    const full = path.join(path.dirname(output), file);
    return { file: full, sha256: sha(full) };
  });
  snapshot.push(...releases);
  return { cues, timing, manifest, inputs, output, snapshot, releases };
}

function unchanged(snapshot) {
  for (const input of snapshot) verifyHash(input.file, input.sha256, path.relative(REPO, input.file));
}

function fitMaster(premaster, master) {
  let xx = 0, xy = 0, yy = 0;
  for (let i = 0; i < VALUES; i++) { xx += premaster[i] ** 2; xy += premaster[i] * master[i]; yy += master[i] ** 2; }
  assert(xx > 0 && yy > 0, 'Silent original mix cannot establish master gain');
  const gain = xy / xx;
  let square = 0, peak = 0, mean = 0;
  for (let i = 0; i < VALUES; i++) {
    const error = master[i] - premaster[i] * gain;
    square += error * error; peak = Math.max(peak, Math.abs(error)); mean += error;
  }
  const rms = Math.sqrt(square / VALUES), correlation = xy / Math.sqrt(xx * yy);
  assert(gain > 0 && Number.isFinite(gain) && peak <= FIT_PEAK_LIMIT && correlation > .999999999, 'Original master is not a sufficiently close constant-gain fit');
  return { method: 'Least-squares zero-intercept master = gain × premaster over every decoded sample', gain, gainDb: db(gain), residualRms: rms, residualRmsDbfs: db(rms), maximumAbsoluteResidual: peak, residualMean: mean / VALUES, correlation, allowedPeakResidual: FIT_PEAK_LIMIT, suitableConstantGainFit: true };
}

function cosine(progress) { return .5 - .5 * Math.cos(Math.PI * Math.max(0, Math.min(1, progress))); }

function phraseDuck(t, phrases, settings) {
  let gain = 1;
  for (const phrase of phrases) {
    const start = phrase.actualStart, end = phrase.actualEnd, attack = settings.attackSeconds, release = settings.releaseSeconds;
    if (t < start - attack || t >= end + release) continue;
    const progress = t < start ? (t - start + attack) / attack : t > end ? 1 - (t - end) / release : 1;
    gain = Math.min(gain, 1 + (linear(settings.newLayerDuckDb) - 1) * cosine(progress));
  }
  return gain;
}

function oldSfxGain(t, reductions) {
  let gain = 1;
  for (const reduction of reductions) {
    if (t < reduction.start || t >= reduction.end) continue;
    const edge = Math.min(.02, (reduction.end - reduction.start) / 4);
    const progress = Math.min((t - reduction.start) / edge, (reduction.end - t) / edge, 1);
    gain = Math.min(gain, 1 + (linear(reduction.gainDb) - 1) * cosine(progress));
  }
  return gain;
}

function buildSfx(context, oldSfx) {
  const { cues, manifest, timing } = context;
  const originals = Object.fromEntries(manifest.sounds.map(sound => {
    const samples = decode(path.join(HERE, 'pilot', sound.file));
    assert(samples.length === Math.round(sound.durationSeconds * SR) * CHANNELS, `Pilot duration changed: ${sound.id}`);
    return [sound.id, samples];
  }));
  const newLayers = new Float64Array(VALUES), editedOld = new Float32Array(VALUES), delta = new Float64Array(VALUES);
  const placements = [];
  for (const placement of cues.placements) {
    const sound = manifest.sounds.find(item => item.id === placement.sound), samples = originals[placement.sound];
    const startFrame = Math.round((placement.start ?? placement.syncAt - sound.syncSeconds) * SR);
    const gain = linear(placement.gainDb), sampleFrames = samples.length / CHANNELS;
    const edgeFrames = Math.min(Math.round(.003 * SR), Math.floor(sampleFrames / 4));
    for (let frame = 0; frame < sampleFrames; frame++) {
      const edge = Math.min(frame / edgeFrames, (sampleFrames - 1 - frame) / edgeFrames, 1);
      const envelope = gain * cosine(edge) * phraseDuck((startFrame + frame) / SR, timing.phrases, cues.voiceProtection);
      for (let channel = 0; channel < CHANNELS; channel++) {
        const index = (startFrame + frame) * CHANNELS + channel;
        newLayers[index] += samples[frame * CHANNELS + channel] * envelope;
        assert(Number.isFinite(newLayers[index]), 'Layer sum became non-finite');
      }
    }
    placements.push({ ...placement, sourceSha256: sound.sha256, fileStart: startFrame / SR, fileEnd: (startFrame + sampleFrames) / SR, anchorAt: (startFrame + sound.syncSample) / SR });
  }
  for (let frame = 0; frame < FRAMES; frame++) {
    const gain = oldSfxGain(frame / SR, cues.existingSfxReductions);
    for (let channel = 0; channel < CHANNELS; channel++) {
      const i = frame * CHANNELS + channel;
      editedOld[i] = oldSfx[i] * gain;
      delta[i] = editedOld[i] + newLayers[i] - oldSfx[i];
      assert(Number.isFinite(delta[i]), 'SFX difference became non-finite');
    }
  }
  return { newLayers, editedOld, delta, placements };
}

function maximumDeltaScale(master, delta, masterGain) {
  let scale = 1;
  for (let i = 0; i < VALUES; i++) {
    assert(Math.abs(master[i]) <= SAMPLE_HEADROOM, 'Original master alone exceeds reserved sample headroom');
    const change = delta[i] * masterGain;
    if (change > 0) scale = Math.min(scale, (SAMPLE_HEADROOM - master[i]) / change);
    else if (change < 0) scale = Math.min(scale, (SAMPLE_HEADROOM + master[i]) / -change);
  }
  assert(Number.isFinite(scale) && scale >= 0, 'Invalid SFX-only headroom factor');
  return Math.min(1, scale);
}

function sumMix(master, delta, masterGain, scale) {
  const mix = new Float32Array(VALUES);
  let maximumSumRounding = 0, changedOutsideSfxDelta = 0;
  for (let i = 0; i < VALUES; i++) {
    const expected = master[i] + delta[i] * masterGain * scale;
    mix[i] = expected;
    assert(Number.isFinite(mix[i]), 'Final sum became non-finite');
    maximumSumRounding = Math.max(maximumSumRounding, Math.abs(mix[i] - expected));
    if (delta[i] === 0 && mix[i] !== master[i]) changedOutsideSfxDelta++;
  }
  // Original master already has a digitally silent tail; do not fade music or voice again.
  const tailValue = Math.round(TAIL_START * SR) * CHANNELS;
  assert(master.subarray(tailValue).every(value => value === 0), 'Approved master tail is not already silent');
  assert(delta.subarray(tailValue).every(value => value === 0), 'New SFX reaches the final .2 seconds');
  mix.fill(0, tailValue);
  assert(changedOutsideSfxDelta === 0, 'Master samples changed outside the SFX delta');
  return { mix, maximumSumRounding, changedOutsideSfxDelta };
}

function compareWindows(oldSfx, revisedSfx, windows, gain) {
  return windows.map(window => {
    const bins = samples => {
      const result = [];
      for (let frame = Math.round(window.start * SR); frame < Math.round(window.end * SR); frame += 240) {
        let square = 0, values = 0;
        const end = Math.min(frame + 240, Math.round(window.end * SR));
        for (let i = frame * CHANNELS; i < end * CHANNELS; i++) { square += (samples[i] * gain) ** 2; values++; }
        result.push({ seconds: (end - frame) / SR, rms: Math.sqrt(square / values) });
      }
      return result;
    };
    const oldBins = bins(oldSfx), newBins = bins(revisedSfx);
    const threshold = Math.max(...oldBins.map(bin => bin.rms), ...newBins.map(bin => bin.rms)) * linear(-24);
    const body = values => round(values.reduce((seconds, bin) => seconds + (bin.rms > threshold ? bin.seconds : 0), 0));
    return { ...window, old: { ...stats(oldSfx, window.start, window.end, gain), bodyDurationSeconds: body(oldBins) }, revised: { ...stats(revisedSfx, window.start, window.end, gain), bodyDurationSeconds: body(newBins) }, bodyMeasurement: { binSeconds: .005, sharedRmsThresholdDbfs: db(threshold), definition: 'Total 5ms-bin duration exceeding 24dB below the higher old/revised peak bin RMS; signal-energy proxy only' } };
  });
}

function mp4Boxes(file) {
  const bytes = fs.readFileSync(file), boxes = [];
  for (let at = 0; at < bytes.length;) {
    assert(at + 8 <= bytes.length, 'Truncated MP4 top-level box');
    let size = bytes.readUInt32BE(at), headerSize = 8;
    if (size === 1) { assert(at + 16 <= bytes.length, 'Truncated extended MP4 box'); size = Number(bytes.readBigUInt64BE(at + 8)); headerSize = 16; }
    if (size === 0) size = bytes.length - at;
    assert(Number.isSafeInteger(size) && size >= headerSize && at + size <= bytes.length, 'Invalid MP4 box length');
    boxes.push({ kind: bytes.toString('ascii', at + 4, at + 8), offset: at, size }); at += size;
  }
  assert(boxes.find(box => box.kind === 'moov')?.offset < boxes.find(box => box.kind === 'mdat')?.offset, 'Candidate is not faststart');
  return boxes;
}

function inspectCandidate(candidate, picture, measured) {
  const metadata = probe(candidate), video = metadata.streams.find(stream => stream.codec_type === 'video'), audio = metadata.streams.find(stream => stream.codec_type === 'audio');
  assert(metadata.streams.length === 2 && video && audio, 'Candidate needs exactly one video and one audio stream');
  assert(video.codec_name === 'h264' && video.width === 1920 && video.height === 1080 && video.pix_fmt === 'yuv420p', 'Candidate picture format failed');
  assert(video.avg_frame_rate === '30/1' && Number(video.nb_frames) === 987 && Number(video.nb_read_frames) === 987 && Math.abs(Number(video.duration) - DURATION) < .0001, 'Candidate picture timing failed');
  assert(audio.codec_name === 'aac' && Number(audio.sample_rate) === SR && audio.channels === CHANNELS, 'Candidate audio format failed');
  assert(Math.abs(Number(metadata.format.duration) - DURATION) < .0001, 'Candidate duration failed');
  assert(Math.abs(measured.integratedLufs + 16) <= 1 && measured.truePeakDbtp <= -1, 'Candidate encoded loudness failed');
  ff(['-v', 'error', '-xerror', '-err_detect', 'explode', '-i', candidate, '-f', 'null', '-']);
  const videoHash = file => ff(['-v', 'error', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).stdout.toString().trim();
  const original = videoHash(picture), exported = videoHash(candidate);
  assert(original === exported, 'Candidate changed the locked H264 payload');
  const encoded = decode(candidate), tail = stats(encoded, TAIL_START, DURATION);
  assert(tail.peakDbfs <= -80, 'Candidate final .2 seconds is not silent');
  const black = ff(['-v', 'error', '-ss', TAIL_START, '-i', candidate, '-an', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']).stdout;
  assert(black.length === 1920 * 1080 * 3 * 6 && black.every(value => value === 0), 'Candidate final six frames are not exactly black');
  return { metadata, videoPayload: { original, exported, equal: true }, blackTail: { start: TAIL_START, exactlyBlack: true, frames: 6, ...tail }, boxes: mp4Boxes(candidate) };
}

function promoteVerifiedCandidate(candidate, output, reportFile, report) {
  assert(report.status === 'TECHNICAL_PASS_SFX_AUDITION_PENDING' && Object.keys(report.checks ?? {}).length === REQUIRED_CHECKS.length && REQUIRED_CHECKS.every(name => report.checks[name] === true), 'Candidate has not passed every gate');
  verifyHash(candidate, report.outputSha256, 'candidate after verification');
  if (fs.existsSync(output)) assert(sha(output) === report.outputSha256, 'Refusing to overwrite a previously released pilot');
  // COPYFILE_EXCL also protects against a new release arriving between existence check and copy.
  else fs.copyFileSync(candidate, output, fs.constants.COPYFILE_EXCL);
  verifyHash(output, report.outputSha256, 'promoted output');
  fs.mkdirSync(path.dirname(reportFile), { recursive: true });
  const pendingReport = path.join(LOCAL, 'verified-remix-report.json');
  fs.writeFileSync(pendingReport, JSON.stringify(report, null, 2) + '\n');
  fs.copyFileSync(pendingReport, reportFile);
}

function selfTestGuards() {
  fs.mkdirSync(LOCAL, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(LOCAL, 'guard-fixture-'));
  const locked = path.join(fixture, 'changed-cues.json'), candidate = path.join(fixture, 'candidate.mp4'), release = path.join(fixture, 'release.mp4');
  const expectFail = (action, message) => { let failed = false; try { action(); } catch (error) { failed = error.message.includes(message); } assert(failed, `Guard failed to reject: ${message}`); };
  fs.copyFileSync(CUES, locked); fs.appendFileSync(locked, '\n');
  expectFail(() => verifyHash(locked, CUES_SHA, 'fixture cue'), 'Changed locked input');
  fs.writeFileSync(candidate, 'verified fixture');
  const completeChecks = Object.fromEntries(REQUIRED_CHECKS.map(name => [name, true]));
  const report = { status: 'TECHNICAL_PASS_SFX_AUDITION_PENDING', checks: completeChecks, outputSha256: sha(candidate) };
  fs.appendFileSync(candidate, ' changed after inspection');
  expectFail(() => promoteVerifiedCandidate(candidate, release, path.join(fixture, 'report.json'), report), 'Changed locked input');
  assert(!fs.existsSync(release), 'Changed candidate was promoted');
  fs.writeFileSync(candidate, 'verified fixture'); fs.writeFileSync(release, 'existing immutable release');
  const releaseHash = sha(release);
  const failedChecks = { ...completeChecks, fullStrictDecode: false }, missingChecks = { ...completeChecks };
  delete missingChecks.fullStrictDecode;
  expectFail(() => promoteVerifiedCandidate(candidate, release, path.join(fixture, 'report.json'), { ...report, checks: failedChecks }), 'has not passed every gate');
  expectFail(() => promoteVerifiedCandidate(candidate, release, path.join(fixture, 'report.json'), { ...report, checks: missingChecks }), 'has not passed every gate');
  expectFail(() => promoteVerifiedCandidate(candidate, release, path.join(fixture, 'report.json'), { ...report, checks: {} }), 'has not passed every gate');
  expectFail(() => promoteVerifiedCandidate(candidate, release, path.join(fixture, 'report.json'), report), 'Refusing to overwrite');
  assert(sha(release) === releaseHash, 'Existing release was changed by a failing guard');
  return { changedInputRejected: true, changedCandidateRejected: true, failedGateRejected: true, missingGateRejected: true, emptyGatesRejected: true, existingReleasePreserved: true, fixture: path.relative(REPO, fixture) };
}

function render(context, guardTests) {
  fs.mkdirSync(LOCAL, { recursive: true });
  const { cues, timing, manifest, inputs, output, snapshot, releases } = context;
  const decoded = Object.fromEntries(['master', 'premaster', 'oldSfx', 'voice', 'music'].map(name => {
    const samples = decode(inputs[name].file);
    assert(samples.length === VALUES, `Locked ${name} does not cover exactly 32.9 seconds`);
    return [name, samples];
  }));
  const fit = fitMaster(decoded.premaster, decoded.master), design = buildSfx(context, decoded.oldSfx);
  let scale = maximumDeltaScale(decoded.master, design.delta, fit.gain), addition, measured;
  const mixFile = path.join(LOCAL, 'candidate-sfx-only-mix.wav'), candidate = path.join(LOCAL, 'candidate-grifon-full-upgrade-sfx-pilot-1080p.mp4');
  const attempts = [];
  // Reduce only the SFX difference if AAC reconstruction consumes reserved headroom.
  for (let attempt = 0; attempt < 30; attempt++) {
    addition = sumMix(decoded.master, design.delta, fit.gain, scale);
    writeFloatWav(mixFile, addition.mix);
    ff(['-v', 'error', '-i', inputs.picture.file, '-i', mixFile, '-map', '0:v:0', '-map', '1:a:0', '-t', DURATION, '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', SR, '-ac', CHANNELS, '-movflags', '+faststart', candidate]);
    measured = measure(candidate);
    attempts.push({ attempt: attempt + 1, sfxDeltaScale: scale, ...measured });
    if (measured.truePeakDbtp <= -1) break;
    assert(attempt < 29, 'SFX-only scaling could not satisfy encoded true peak; candidate retained without promotion');
    scale *= .9;
  }
  const revisedSfx = new Float64Array(VALUES);
  for (let i = 0; i < VALUES; i++) revisedSfx[i] = decoded.oldSfx[i] + design.delta[i] * scale;
  const phraseLevels = timing.phrases.map(phrase => {
    const voice = stats(decoded.voice, phrase.actualStart, phrase.actualEnd, fit.gain), sfx = stats(revisedSfx, phrase.actualStart, phrase.actualEnd, fit.gain);
    const margin = round(voice.rmsDbfs - sfx.rmsDbfs);
    assert(margin > 0, `Voice is not above SFX average energy during phrase: ${phrase.id}`);
    return { id: phrase.id, start: phrase.actualStart, end: phrase.actualEnd, voice, revisedSfx: sfx, voiceOverSfxRmsMarginDb: margin, approvedMusic: stats(decoded.music, phrase.actualStart, phrase.actualEnd, fit.gain) };
  });
  const inspection = inspectCandidate(candidate, inputs.picture.file, measured);
  unchanged(snapshot);
  inspection.metadata.format.filename = path.relative(REPO, output).replaceAll('\\', '/');
  const report = {
    status: 'TECHNICAL_PASS_SFX_AUDITION_PENDING', output: path.relative(REPO, output).replaceAll('\\', '/'), outputSha256: sha(candidate), bytes: fs.statSync(candidate).size,
    specSha256: CUES_SHA, phraseTimingSha256: TIMING_SHA, pilotManifestSha256: sha(MANIFEST), duration: DURATION, sampleRate: SR, channels: CHANNELS,
    method: 'Untouched approved master plus (reduced original SFX + ducked layered originals − original SFX) × fitted original master gain × SFX-only headroom factor. No full-mix loudness normalization, compression, EQ or VO synthesis.',
    originalMasterFit: fit, sfxDeltaScale: scale, sfxDeltaScaleDb: db(scale), headroom: { reservedSamplePeakDbfs: db(SAMPLE_HEADROOM), encodingAttempts: attempts },
    preservedInputs: Object.fromEntries(Object.entries(inputs).map(([name, input]) => [name, { path: path.relative(REPO, input.file).replaceAll('\\', '/'), sha256: input.sha256, unchanged: true }])),
    preservedReleases: releases.map(item => ({ path: path.relative(REPO, item.file).replaceAll('\\', '/'), sha256: item.sha256, unchanged: true })),
    preservationMeasurement: { musicAndVoiceFilesUntouched: true, originalMasterSamplesOutsideDeltaUnchanged: addition.changedOutsideSfxDelta === 0, changedSamplesOutsideSfxDelta: addition.changedOutsideSfxDelta, maximumFloat32SumRounding: addition.maximumSumRounding, noSeparateVoiceOrMusicGainOrTimingChange: true },
    newLayerDuck: { ...cues.voiceProtection, source: '../voiceover/qa/phrase-timing.json', timing: 'Exact actualStart/actualEnd; full −7dB during each existing phrase, cosine attack/release, minimum overlapping gain', appliesTo: 'new original layers only' },
    oldSfxReductions: { placements: cues.existingSfxReductions, ramp: '20ms cosine edge ramps inside each reduction, capped at one quarter of short windows; minimum overlapping gain' },
    placements: design.placements, pilotSources: manifest.sounds.map(sound => ({ id: sound.id, sha256: sound.sha256, durationSeconds: sound.durationSeconds, syncSeconds: sound.syncSeconds })),
    phraseLevels, comparisonWindows: compareWindows(decoded.oldSfx, revisedSfx, cues.comparisonWindows, fit.gain),
    loudness: measured, originalPcmMaster: stats(decoded.master), revisedPcmMaster: stats(addition.mix),
    videoPayload: inspection.videoPayload, metadata: inspection.metadata, mp4Boxes: inspection.boxes, blackTail: inspection.blackTail,
    guardTests,
    checks: { lockedSpecAndInputsUnchanged: true, pilotSourcesUnchanged: true, oldReleasesUnchanged: true, originalMasterConstantGainFit: true, finiteSampleSafeSums: true, onlySfxDeltaAdded: true, voiceRmsAboveSfxInEveryPhrase: true, newLayersDuckedAtExactPhraseWindows: true, fullStrictDecode: true, picturePayloadIdentical: true, counted987Frames: true, formatAndTiming: true, encodedLoudness: true, silentBlackTail: true, faststart: true },
    humanAcceptance: { approvedMusic: 'USER_APPROVED_QUALITY_FROZEN', approvedVoice: 'USER_APPROVED_QUALITY_FROZEN', redesignedSfx: 'PENDING_HEADPHONES_AND_PHYSICAL_PHONE_SPEAKER_AUDITION' },
    limits: ['File hashes, PCM algebra and phrase RMS margins establish structural preservation and energy balance; they cannot establish exact separated VO samples inside a newly encoded composite AAC track.', 'No listening-quality or premium/AAA/equivalence claim is made. New SFX action fit, clarity, material weight, mono and physical phone translation require human audition.', 'The eight original pilot effects do not complete the proposed 24-sound library.'],
    operations: { providerCalls: 0, downloads: 0, paidCalls: 0, voiceSynthesisCalls: 0, networkCalls: 0 },
  };
  unchanged(snapshot);
  promoteVerifiedCandidate(candidate, output, path.join(QA, 'remix-report.json'), report);
  console.log(JSON.stringify({ status: report.status, output: report.output, outputSha256: report.outputSha256, lufs: measured.integratedLufs, truePeakDbtp: measured.truePeakDbtp, originalMasterGainDb: fit.gainDb, sfxDeltaScale: scale, picturePayloadIdentical: true }));
}

function main() {
  const args = process.argv.slice(2);
  assert(args.every(arg => ['--render', '--self-test', '--help'].includes(arg)), 'Only --render, --self-test and --help are supported');
  if (args.includes('--help')) { console.log('Default: validate locked offline inputs/spec only. --self-test: exercise changed-input/candidate/release guards in ignored fixtures. --render: deterministic local SFX-only mix and gated new-pilot promotion.'); return; }
  const context = validateInputs();
  const guardTests = args.includes('--self-test') ? selfTestGuards() : null;
  if (args.includes('--render')) render(context, guardTests);
  else console.log(JSON.stringify({ status: 'OFFLINE_INPUTS_VALID', rendering: false, lockedInputs: Object.keys(context.inputs), pilotSounds: context.manifest.sounds.length, designPlacements: context.cues.placements.length, guardTests, next: 'Run --render for local deterministic SFX-only mix/mux' }));
}

try { main(); } catch (error) { console.error(`SFX pilot stopped: ${error.message}`); process.exitCode = 1; }
