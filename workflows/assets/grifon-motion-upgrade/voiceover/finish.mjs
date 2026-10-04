// Local finishing only. This file has no provider calls or credentials.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../../../..');
const LOCAL = path.join(REPO, '.tmp/grifon-english-vo-v02');
const QA = path.join(HERE, 'qa');
const SPEC_PATH = path.join(HERE, 'test-spec.json');
const SPEC_SHA = '4d5b7d40849026e8d3eb21cf4706c460f17857179be1ccf9bb40785eb0ec28c9';
const SR = 48000, CHANNELS = 2;
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const sha = file => hash(fs.readFileSync(file));
const assert = (pass, message) => { if (!pass) throw new Error(message); };
const round = value => Number(value.toFixed(6));
const db = value => round(20 * Math.log10(Math.max(value, 1e-12)));
assert(sha(SPEC_PATH) === SPEC_SHA, 'Approved immutable spec changed');
const spec = JSON.parse(fs.readFileSync(SPEC_PATH, 'utf8'));
const PRIMARY = spec.assets.approvedPremaster.path.split('/workflows/')[0];
const FF = path.join(PRIMARY, 'node_modules/ffmpeg-static/ffmpeg.exe');
const PROBE = path.join(PRIMARY, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const duration = spec.editing.duration;
const count = Math.round(SR * duration);
const picture = path.resolve(HERE, spec.assets.picture.path);
const output = path.resolve(HERE, '../grifon-full-upgrade-english-vo-1080p.mp4');
const candidate = path.join(LOCAL, 'candidate-grifon-full-upgrade-english-vo-1080p.mp4');
const take = path.join(LOCAL, 'take.mp3');
const alignPath = path.join(LOCAL, 'alignment.json');
fs.mkdirSync(QA, { recursive: true });

function run(binary, args, input) {
  const result = spawnSync(binary, args, { input, maxBuffer: 160 * 1024 * 1024, windowsHide: true });
  if (result.error) throw new Error(`Local subprocess failed: ${result.error.code}`);
  if (result.status !== 0) throw new Error(`${path.basename(binary)} exit ${result.status}: ${result.stderr.toString().slice(-6000)}`);
  return result;
}
function ff(args, input) { return run(FF, ['-hide_banner', '-y', ...args.map(String)], input); }
function probe(file) {
  return JSON.parse(run(PROBE, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]).stdout);
}
function decode(file, filters) {
  const args = ['-v', 'error', '-i', file, '-vn'];
  if (filters) args.push('-af', filters);
  const bytes = ff([...args, '-ar', SR, '-ac', CHANNELS, '-f', 'f32le', 'pipe:1']).stdout;
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
function pcmBuffer(samples) { return Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength); }
function writeFloatWav(file, samples) {
  const header = Buffer.alloc(44), data = pcmBuffer(samples);
  header.write('RIFF', 0); header.writeUInt32LE(data.length + 36, 4); header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16); header.writeUInt16LE(3, 20); header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SR, 24); header.writeUInt32LE(SR * CHANNELS * 4, 28);
  header.writeUInt16LE(CHANNELS * 4, 32); header.writeUInt16LE(32, 34);
  header.write('data', 36); header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(file, Buffer.concat([header, data]));
}
function stats(samples, begin = 0, end = samples.length / CHANNELS / SR) {
  let peak = 0, square = 0, n = 0;
  for (let i = Math.max(0, Math.round(begin * SR)) * CHANNELS; i < Math.min(samples.length, Math.round(end * SR) * CHANNELS); i++) {
    assert(Number.isFinite(samples[i]), 'Non-finite audio sample');
    peak = Math.max(peak, Math.abs(samples[i])); square += samples[i] ** 2; n++;
  }
  return { peakDbfs: db(peak), rmsDbfs: db(Math.sqrt(square / Math.max(n, 1))), sampleValues: n };
}
function measure(file) {
  const result = ff(['-i', file, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-']);
  const json = result.stderr.toString().match(/\{\s*"input_i"[\s\S]*?\}/g);
  assert(json?.length, 'Loudness measurement missing');
  return JSON.parse(json.at(-1));
}
function inspectAlignment(alignment, label) {
  const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment ?? {};
  assert(Array.isArray(characters) && Array.isArray(starts) && Array.isArray(ends), `${label} arrays missing`);
  assert(characters.length === spec.request.text.length && starts.length === characters.length && ends.length === characters.length, `${label} arrays have unequal/wrong lengths`);
  assert(characters.join('') === spec.request.text, `${label} does not match the exact tagged input`);
  for (let i = 0; i < characters.length; i++) {
    assert(typeof characters[i] === 'string' && characters[i].length === 1, `${label} invalid character ${i}`);
    assert(Number.isFinite(starts[i]) && Number.isFinite(ends[i]) && starts[i] >= 0 && ends[i] >= starts[i], `${label} invalid timestamp ${i}`);
    if (i) assert(starts[i] >= starts[i - 1] && ends[i] >= ends[i - 1], `${label} non-monotonic timestamp ${i}`);
  }
  return { label, exactInputMatch: true, arrayLength: characters.length, endSeconds: ends.at(-1) };
}

const ledger = JSON.parse(fs.readFileSync(path.join(LOCAL, 'single-attempt.json'), 'utf8'));
assert(ledger.specSha256 === SPEC_SHA && ledger.textSha256 === hash(spec.request.text), 'Single-attempt ledger input mismatch');
assert(ledger.attemptCount === 1 && ledger.state === 'AUDIO_RETURNED_LOCAL_EDIT_READY', 'Expected the one completed take');
assert(ledger.voiceId === spec.casting.voiceId && ledger.model === spec.request.model_id, 'Ledger casting/model mismatch');
assert(ledger.estimatedCredits <= spec.budget.maxCredits && ledger.maximumCredits === 500, 'Credit cap mismatch');
assert(sha(take) === ledger.audioSha256, 'Raw take changed');
for (const name of ['picture', 'approvedPremaster', 'approvedSfxStem']) {
  const asset = spec.assets[name];
  assert(sha(name === 'picture' ? picture : asset.path) === asset.sha256, `${name} differs from the approved asset`);
}
assert(spec.editing.sampleRate === SR && spec.editing.channels === CHANNELS && duration === 32.9, 'Unexpected finish format');
assert(spec.editing.maxPitchPreservingTempo === 1.12 && spec.editing.musicDuckDb === -6, 'Unexpected approved editing parameters');
assert(spec.editing.duckAttackSeconds === .1 && spec.editing.duckReleaseSeconds === .24, 'Unexpected duck envelope');
const alignmentData = JSON.parse(fs.readFileSync(alignPath, 'utf8'));
const alignmentChecks = [inspectAlignment(alignmentData.alignment, 'raw'), inspectAlignment(alignmentData.normalizedAlignment, 'normalized')];
const alignment = alignmentData.alignment;
assert(spec.editing.segments.length === 11, 'Expected eleven phrases');
for (const segment of spec.editing.segments) {
  const { characterStart: begin, characterEndExclusive: end } = segment;
  assert(Number.isInteger(begin) && Number.isInteger(end) && end > begin, `Invalid phrase character range: ${segment.id}`);
  assert(spec.request.text.slice(begin, end).trim() === segment.text, `Phrase text mismatch: ${segment.id}`);
  assert(segment.targetStart >= 0 && segment.latestEnd > segment.targetStart && segment.latestEnd < 31.96, `Invalid phrase window: ${segment.id}`);
}

// Measured low-energy boundaries include pre-consonant and release handles.
// Alignment punctuation/tag durations are estimates; they do not identify safe waveform cuts.
const edits = {
  opening: { begin: .120, end: 1.190, tempo: 1.12 },
  launch: { begin: 1.460, end: 2.705, tempo: 1 },
  story: { begin: 2.830, end: 4.075, tempo: 1 },
  grow: { begin: 4.235, end: 5.865, tempo: 1.115 },
  problem: { begin: 6.105, end: 8.060, tempo: 1 },
  pivot: { begin: 8.160, end: 9.198, tempo: 1.12 },
  introduce: { begin: 9.375, end: 10.575, tempo: 1 },
  conversation: { begin: 10.580, end: 13.110, tempo: 1 },
  direction: { begin: 13.105, end: 15.620, tempo: 1 },
  workflow: { begin: 15.645, end: 17.980, tempo: 1.12, remove: [[16.350, 16.390], [17.010, 17.030]] },
  brand: { begin: 18.225, end: 19.630, tempo: 1 },
};
const raw = decode(take);
const rawSeconds = raw.length / CHANNELS / SR;
// Timestamp duration can include trailing estimated punctuation beyond decoded PCM.
assert(alignmentChecks.every(item => item.endSeconds <= rawSeconds + .1), 'Alignment exceeds audio by more than trailing punctuation tolerance');
const voice = new Float32Array(count * CHANNELS);
const timing = [], waveform = [];
for (const segment of spec.editing.segments) {
  const edit = edits[segment.id];
  assert(edit && edit.tempo >= 1 && edit.tempo <= spec.editing.maxPitchPreservingTempo, `Tempo outside cap: ${segment.id}`);
  assert(edit.begin >= 0 && edit.end <= rawSeconds, `Trim outside decoded take: ${segment.id}`);
  const ranges = [], removals = [];
  let cursor = edit.begin;
  for (const [begin, end] of edit.remove ?? []) {
    assert(begin > cursor && end > begin && end < edit.end, 'Invalid internal pause cut');
    const levels = stats(raw, begin, end);
    assert(levels.peakDbfs <= -55 && levels.rmsDbfs <= -60, `Pause cut contains substantial energy: ${segment.id}`);
    ranges.push([cursor, begin]); cursor = end;
    removals.push({ sourceStart: begin, sourceEnd: end, seconds: round(end - begin), ...levels });
  }
  ranges.push([cursor, edit.end]);
  const trimmedLength = ranges.reduce((sum, [begin, end]) => sum + Math.round(end * SR) - Math.round(begin * SR), 0);
  const trimmed = new Float32Array(trimmedLength * CHANNELS);
  let offset = 0;
  for (const [begin, end] of ranges) {
    const values = raw.slice(Math.round(begin * SR) * CHANNELS, Math.round(end * SR) * CHANNELS);
    // Two-millisecond edge fades act only at the measured low-energy boundaries.
    const edgeFrames = Math.round(.002 * SR);
    for (let frame = 0; frame < edgeFrames; frame++) for (let channel = 0; channel < CHANNELS; channel++) {
      values[frame * CHANNELS + channel] *= frame / edgeFrames;
      values[values.length - CHANNELS * (frame + 1) + channel] *= frame / edgeFrames;
    }
    trimmed.set(values, offset); offset += values.length;
  }
  const sourceWav = path.join(LOCAL, `phrase-${segment.id}-source.wav`);
  writeFloatWav(sourceWav, trimmed);
  // Light voice-only compression and phrase gain matching keep quiet delivery above the bed.
  // Pitch, cadence and within-phrase contour remain; music and SFX are excluded.
  const processed = decode(sourceWav, `${edit.tempo === 1 ? '' : `atempo=${edit.tempo},`}acompressor=threshold=0.05:ratio=2.5:attack=5:release=80`);
  const processedRms = stats(processed).rmsDbfs;
  const voiceGainDb = -19 - processedRms;
  const voiceGain = 10 ** (voiceGainDb / 20);
  for (let i = 0; i < processed.length; i++) processed[i] *= voiceGain;
  const actualSeconds = processed.length / CHANNELS / SR;
  const startFrame = Math.round(segment.targetStart * SR);
  const finishSeconds = (startFrame + processed.length / CHANNELS) / SR;
  assert(finishSeconds <= segment.latestEnd + 1 / SR, `Timing failed ${segment.id}: ends ${finishSeconds}, window ${segment.latestEnd}`);
  voice.set(processed, startFrame * CHANNELS);
  const alignedWords = [...segment.text.matchAll(/[A-Za-z]+(?:'[A-Za-z]+)?/g)].map(match => {
    const i = segment.characterStart + match.index;
    return { word: match[0], estimatedSourceStart: alignment.character_start_times_seconds[i], estimatedSourceEnd: alignment.character_end_times_seconds[i + match[0].length - 1] };
  });
  timing.push({ id: segment.id, text: segment.text, sourceStart: edit.begin, sourceEnd: edit.end,
    removedInternalPauseSeconds: round(removals.reduce((sum, item) => sum + item.seconds, 0)), removals,
    retainedSourceSeconds: round(trimmedLength / SR), pitchPreservingTempo: edit.tempo,
    voiceOnlyLevelMatching: { targetRmsDbfs: -19, appliedGainDb: round(voiceGainDb), compressor: { threshold: .05, ratio: 2.5, attackMs: 5, releaseMs: 80 }, method: 'Light voice-only compression then phrase gain matching; music/SFX excluded' },
    targetStart: segment.targetStart, latestEnd: segment.latestEnd,
    actualStart: startFrame / SR, actualEnd: round(finishSeconds), actualOutputSeconds: round(actualSeconds),
    estimatedWords: alignedWords, sourceEdgeLevels: { first5ms: stats(raw, edit.begin, edit.begin + .005), last5ms: stats(raw, edit.end - .005, edit.end) },
    timingPass: true, wordIntegrity: 'Low-energy trim handles retained; semantic completeness and pronunciation require human audition.' });
  for (let at = edit.begin; at < edit.end; at += .005) waveform.push({ phrase: segment.id, sourceSeconds: round(at), ...stats(raw, at, Math.min(at + .005, edit.end)) });
  writeFloatWav(path.join(LOCAL, `phrase-${segment.id}-finished.wav`), processed);
  console.log(`${segment.id}: ${actualSeconds.toFixed(4)}s at ${edit.tempo}, ${segment.targetStart.toFixed(3)}-${finishSeconds.toFixed(4)}s`);
}
writeFloatWav(path.join(LOCAL, 'voice-positioned.wav'), voice);
fs.writeFileSync(path.join(QA, 'phrase-timing.json'), JSON.stringify({ specSha256: SPEC_SHA, rawDecodedSeconds: rawSeconds,
  alignment: alignmentChecks, timestampCaveat: 'Raw and normalized characters match all 306 input characters including emotion tags. Estimated punctuation/tag timing drifts from waveform energy; safe edit boundaries are measured separately.',
  phrases: timing, humanAudition: 'PENDING' }, null, 2) + '\n');
fs.writeFileSync(path.join(QA, 'source-waveform.json'), JSON.stringify({ sampleRate: SR, binSeconds: .005,
  evidence: 'Peak and RMS describe energy only. These measurements cannot identify words, prove emotion tags were not spoken, or prove pronunciation.', bins: waveform }, null, 2) + '\n');

const mix = decode(spec.assets.approvedPremaster.path), sfxInput = decode(spec.assets.approvedSfxStem.path);
assert(mix.length === count * CHANNELS && sfxInput.length === mix.length, 'Approved stems do not cover the full picture');
const sfx = new Float32Array(mix.length), music = new Float32Array(mix.length), ducked = new Float32Array(mix.length), combined = new Float32Array(mix.length);
// Independently prepare the expected contribution from the untouched approved SFX source.
const expectedSfx = sfxInput.slice();
for (let frame = Math.round(31.96 * SR); frame < count; frame++) {
  const time = frame / SR;
  const approvedFade = time >= 32.61 ? 0 : .5 + .5 * Math.cos(Math.PI * (time - 31.96) / .65);
  for (let channel = 0; channel < CHANNELS; channel++) expectedSfx[frame * CHANNELS + channel] *= approvedFade;
}
const envelope = new Float32Array(count), duckGain = 10 ** (spec.editing.musicDuckDb / 20);
let maxReconstructionError = 0, maxSfxDifference = 0;
for (let frame = 0; frame < count; frame++) {
  const t = frame / SR;
  // Exactly the approved v08 common tail fade, applied to the SFX contribution before subtraction.
  const fade = t < 31.96 ? 1 : t >= 32.61 ? 0 : .5 + .5 * Math.cos(Math.PI * (t - 31.96) / .65);
  let duck = 1;
  for (const phrase of timing) {
    const start = phrase.actualStart, end = phrase.actualEnd;
    if (t >= start - spec.editing.duckAttackSeconds && t < end + spec.editing.duckReleaseSeconds) {
      const progress = t < start ? (t - start + spec.editing.duckAttackSeconds) / spec.editing.duckAttackSeconds : t > end ? 1 - (t - end) / spec.editing.duckReleaseSeconds : 1;
      duck = Math.min(duck, 1 + (duckGain - 1) * (.5 - .5 * Math.cos(Math.PI * progress)));
    }
  }
  envelope[frame] = duck;
  for (let channel = 0; channel < CHANNELS; channel++) {
    const i = frame * CHANNELS + channel;
    sfx[i] = sfxInput[i] * fade;
    music[i] = mix[i] - sfx[i];
    maxReconstructionError = Math.max(maxReconstructionError, Math.abs(music[i] + sfx[i] - mix[i]));
    maxSfxDifference = Math.max(maxSfxDifference, Math.abs(sfx[i] - expectedSfx[i]));
    ducked[i] = music[i] * duck;
    combined[i] = ducked[i] + sfx[i] + voice[i];
  }
}
assert(maxReconstructionError < 1e-7 && maxSfxDifference < 1e-7, 'Stem reconstruction/SFX preservation failed');
const pre = path.join(LOCAL, 'mix-premaster.wav');
writeFloatWav(path.join(LOCAL, 'sfx-preserved.wav'), sfx);
writeFloatWav(path.join(LOCAL, 'music-recovered.wav'), music);
writeFloatWav(path.join(LOCAL, 'music-ducked.wav'), ducked);
writeFloatWav(pre, combined);
const premasterLoudness = measure(pre);
const master = path.join(LOCAL, 'mix-master.wav');
const masterFilter = `loudnorm=I=-16:TP=-1.5:LRA=9:linear=true:measured_I=${premasterLoudness.input_i}:measured_TP=${premasterLoudness.input_tp}:measured_LRA=${premasterLoudness.input_lra}:measured_thresh=${premasterLoudness.input_thresh}:offset=${premasterLoudness.target_offset}:print_format=json`;
const masterResult = ff(['-i', pre, '-af', masterFilter, '-ar', SR, '-c:a', 'pcm_s24le', master]);
const mastering = JSON.parse(masterResult.stderr.toString().match(/\{\s*"input_i"[\s\S]*?\}/g).at(-1));
assert(mastering.normalization_type === 'linear', 'Common mastering must remain a constant gain after local voice leveling');
ff(['-v', 'error', '-i', picture, '-i', master, '-map', '0:v:0', '-map', '1:a:0', '-t', duration,
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', SR, '-ac', CHANNELS, '-movflags', '+faststart', candidate]);
const loudness = measure(candidate), metadata = probe(candidate);
const video = metadata.streams.find(stream => stream.codec_type === 'video');
const audio = metadata.streams.find(stream => stream.codec_type === 'audio');
assert(metadata.streams.length === 2 && video && audio, 'Expected one picture and one new audio stream');
assert(video.codec_name === 'h264' && video.width === 1920 && video.height === 1080 && video.pix_fmt === 'yuv420p', 'Picture format failed');
assert(video.avg_frame_rate === '30/1' && Number(video.nb_frames) === 987 && Math.abs(Number(video.duration) - duration) < .0001, 'Picture timing failed');
assert(audio.codec_name === 'aac' && Number(audio.sample_rate) === SR && audio.channels === CHANNELS, 'Audio format failed');
assert(Math.abs(Number(metadata.format.duration) - duration) < .0001, 'Export duration failed');
assert(Math.abs(Number(loudness.input_i) + 16) <= 1 && Number(loudness.input_tp) <= -1, 'Encoded loudness gate failed');
ff(['-v', 'error', '-xerror', '-err_detect', 'explode', '-i', candidate, '-f', 'null', '-']);
const videoHash = file => ff(['-v', 'error', '-i', file, '-map', '0:v:0', '-c', 'copy', '-f', 'hash', '-hash', 'sha256', '-']).stdout.toString().trim();
const originalPayloadHash = videoHash(picture), exportedPayloadHash = videoHash(candidate);
assert(originalPayloadHash === exportedPayloadHash, 'Approved H264 payload changed');
const encoded = decode(candidate), tail = stats(encoded, 32.7, duration);
assert(tail.peakDbfs <= -80, 'Final black-tail audio is not silent');
const blackFrames = ff(['-v', 'error', '-ss', '32.7', '-i', candidate, '-an', '-pix_fmt', 'rgb24', '-f', 'rawvideo', 'pipe:1']).stdout;
assert(blackFrames.length === 1920 * 1080 * 3 * 6 && blackFrames.every(value => value === 0), 'Final six picture frames are not exactly black');
const fileBytes = fs.readFileSync(candidate), boxes = [];
for (let at = 0; at + 8 <= fileBytes.length;) {
  const size = fileBytes.readUInt32BE(at), kind = fileBytes.toString('ascii', at + 4, at + 8);
  assert(size >= 8 && at + size <= fileBytes.length, 'Unexpected MP4 top-level box');
  boxes.push({ kind, offset: at, size }); at += size;
}
assert(boxes.find(box => box.kind === 'moov')?.offset < boxes.find(box => box.kind === 'mdat')?.offset, 'MP4 is not faststart');
const phraseLevels = timing.map(phrase => {
  const voiceLevels = stats(voice, phrase.actualStart, phrase.actualEnd), musicLevels = stats(ducked, phrase.actualStart, phrase.actualEnd);
  const margin = round(voiceLevels.rmsDbfs - musicLevels.rmsDbfs);
  assert(margin >= 5, `Voice RMS is less than 5dB above ducked music: ${phrase.id}`);
  return { id: phrase.id, voice: voiceLevels, recoveredMusic: stats(music, phrase.actualStart, phrase.actualEnd), duckedMusic: musicLevels,
    voiceOverDuckedMusicMarginDb: margin, sfx: stats(sfx, phrase.actualStart, phrase.actualEnd), mix: stats(encoded, phrase.actualStart, phrase.actualEnd) };
});
for (const name of ['picture', 'approvedPremaster', 'approvedSfxStem']) assert(sha(name === 'picture' ? picture : spec.assets[name].path) === spec.assets[name].sha256, `Approved asset modified during finish: ${name}`);
assert(sha(SPEC_PATH) === SPEC_SHA, 'Approved immutable spec changed during finish');
metadata.format.filename = output;
const report = {
  specSha256: SPEC_SHA, output: path.basename(output), outputSha256: sha(candidate), bytes: fileBytes.length,
  sourceHashes: { take: sha(take), alignment: sha(alignPath), picture: sha(picture), approvedPremaster: sha(spec.assets.approvedPremaster.path), approvedSfxStem: sha(spec.assets.approvedSfxStem.path) },
  requestEvidence: { synthesisRequests: ledger.attemptCount, estimatedCredits: ledger.estimatedCredits, actualCredits: null, providerUsageVerified: false, additionalProviderCalls: 0 },
  alignment: alignmentChecks, rawDecodedSeconds: rawSeconds, duration, sampleRate: SR, channels: CHANNELS,
  phrases: timing, loudness, premasterLoudness, mastering,
  musicDuck: { db: spec.editing.musicDuckDb, attackSeconds: spec.editing.duckAttackSeconds, releaseSeconds: spec.editing.duckReleaseSeconds,
    curve: 'Cosine ramp; full -6dB from phrase start through phrase end; smallest overlapping gain used', minimumGain: envelope.reduce((minimum, value) => Math.min(minimum, value), 1),
    maxReconstructionError, maxSfxDifference, sfxBeforeMasterSha256: hash(pcmBuffer(sfx)), originalSfxWithApprovedFadeSha256: hash(pcmBuffer(expectedSfx)) },
  phraseLevels, videoPayload: { original: originalPayloadHash, exported: exportedPayloadHash, equal: true }, metadata, mp4Boxes: boxes,
  blackTail: { start: 32.7, frames: 6, exactlyBlack: true, ...tail },
  checks: { immutableSpec: true, exactInputAndArrays: true, oneConsumedTake: true, phraseWindows: true, tempoCap: true,
    musicOnlyDucking: true, voiceRmsAtLeast5DbAboveMusic: true, commonMasterLinearGain: true, sfxSamplesTimingsAndEnvelopePreservedBeforeCommonMaster: true, fullStrictDecode: true,
    picturePayloadIdentical: true, formatAndTiming: true, encodedLoudness: true, silentBlackTail: true, faststart: true },
  status: 'TECHNICAL_PASS_HUMAN_AUDITION_PENDING',
  limitations: ['Waveform energy and alignment cannot establish semantic completeness, delivery quality, unspoken emotion tags, GRIFF-on pronunciation, or separate A/I. Human audition is required.',
    'SFX sample/envelope preservation is verified before common mastering and AAC encoding. Common mastering/codec processing necessarily changes final encoded samples.',
    'Character timestamps include tagged input and estimated punctuation beyond decoded duration; measured energy boundaries were used for local cuts.',
    'Actual credit debit and remaining account balance are unknown; no additional provider calls were made.'],
};
if (process.argv.includes('--preserve-release')) assert(fs.existsSync(output) && sha(candidate) === sha(output), 'Candidate differs from the frozen release; left for review without promotion');
promoteVerifiedCandidate(candidate, output, path.join(QA, 'finish-report.json'), report);
console.log(JSON.stringify({ status: report.status, output: report.output, bytes: report.bytes, lufs: loudness.input_i, truePeak: loudness.input_tp, payloadIdentical: true }));

function promoteVerifiedCandidate(candidatePath, releasePath, reportPath, verifiedReport) {
  assert(verifiedReport.status === 'TECHNICAL_PASS_HUMAN_AUDITION_PENDING' &&
    Object.values(verifiedReport.checks).every(value => value === true), 'Candidate has not passed every gate');
  assert(sha(candidatePath) === verifiedReport.outputSha256, 'Candidate changed after verification');
  const candidateReport = `${candidatePath}.report.json`;
  fs.writeFileSync(candidateReport, JSON.stringify(verifiedReport, null, 2) + '\n');
  // Same-volume rename atomically replaces the release only after every candidate gate passed.
  if (fs.existsSync(releasePath) && sha(releasePath) === verifiedReport.outputSha256) {
    fs.unlinkSync(candidatePath); // Identical rerun leaves the verified release file untouched.
  } else {
    fs.renameSync(candidatePath, releasePath);
  }
  fs.renameSync(candidateReport, reportPath);
}
