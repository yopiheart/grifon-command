// Independent final-mux measurements; run only after root supplies the frozen film hash.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QA = path.join(HERE, 'qa');
const PRIMARY = process.env.GRIFON_TOOL_ROOT || 'C:/Users/ADMIN/Desktop/grifon-command';
const FFMPEG = path.join(PRIMARY, 'node_modules/ffmpeg-static/ffmpeg.exe');
const FFPROBE = path.join(PRIMARY, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const approvedMaster = '0358a2223f2bfe2c5a73aa60e07d99a8ca7b97746507f967c08d18edaa44b523';
const frozenFilm = process.argv[3];
if (process.argv[2] !== '--frozen' || process.argv.length !== 4 || !/^[a-f0-9]{64}$/.test(frozenFilm || '')) throw Error('Wait for the producer freeze announcement, then use --frozen <exact film SHA256>');
const startedAt = new Date().toISOString();
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const files = {
  film: 'grifon-recreation-landscape-provisional.mp4',
  aacMaster: 'assets/audio/mix-master.m4a',
  pcmMaster: 'assets/audio/mix-master.wav',
  recipe: 'audio.json',
  audioReceipt: 'qa/audio-verification.json',
  producerReceipt: 'qa/full-media.json',
  fullSpec: 'full.json',
  referenceProbe: 'reference/source-probe.json'
};
const binding = () => Object.fromEntries(Object.entries(files).map(([key, name]) => {
  const bytes = fs.readFileSync(path.join(HERE, name));
  return [key, { file: name, bytes: bytes.length, sha256: digest(bytes) }];
}));
const before = binding();
if (before.film.sha256 !== frozenFilm || before.aacMaster.sha256 !== approvedMaster) throw Error('Frozen film or approved AAC master hash differs');
const read = key => JSON.parse(fs.readFileSync(path.join(HERE, files[key]), 'utf8'));
const recipe = read('recipe'), audioReceipt = read('audioReceipt'), producerReceipt = read('producerReceipt'), fullSpec = read('fullSpec'), referenceProbe = read('referenceProbe');
const checks = [];
const check = (name, passes, details) => checks.push({ name, status: passes ? 'PASS' : 'FAIL', ...details });
check('producer-film-binding', producerReceipt.file === files.film && producerReceipt.sha256 === before.film.sha256 && producerReceipt.bytes === before.film.bytes, { recordedFile: producerReceipt.file, recordedSha256: producerReceipt.sha256, recordedBytes: producerReceipt.bytes });
check('clean-audio-recipe-binding', audioReceipt.recipeSha256 === before.recipe.sha256 && audioReceipt.aac.find(item => item.file === files.aacMaster)?.sha256 === approvedMaster && audioReceipt.pcm.find(item => item.file === files.pcmMaster)?.sha256 === before.pcmMaster.sha256 && fullSpec.audio.sha256 === approvedMaster && fullSpec.audio.file === files.aacMaster && recipe.music.sha256 === '71cd4ea39edcc7532672bd97311abadfd318d00e7a828310a88b4f57fad9cd48' && recipe.cues.length === 0 && recipe.music.playbackRate === 1, { fullSpecAudio: fullSpec.audio, inputSourceSha256: recipe.music.sha256, provenance: 'Bound to the earlier every-sample clean Digital Clouds placement receipt. Original reference AAC is not a verifier or export input.' });

function run(exe, args, binary = false) {
  const result = spawnSync(exe, args, { encoding: binary ? null : 'utf8', maxBuffer: 96 * 1024 * 1024, timeout: 60000 });
  if (result.status !== 0) throw Error(`${path.basename(exe)} failed (${result.status}): ${result.stderr?.toString().slice(-3000)}`);
  return { stdout: result.stdout, stderr: result.stderr };
}
const ff = (args, binary = false) => run(FFMPEG, ['-nostdin', '-hide_banner', ...args], binary);
const probe = name => JSON.parse(run(FFPROBE, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-show_data_hash', 'sha256', '-of', 'json', path.join(HERE, name)]).stdout);
const packets = name => JSON.parse(run(FFPROBE, ['-v', 'error', '-select_streams', 'a:0', '-show_packets', '-show_data_hash', 'sha256', '-of', 'json', path.join(HERE, name)]).stdout).packets;
const decode = name => ff(['-v', 'error', '-xerror', '-i', path.join(HERE, name), '-map', '0:a:0', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_f32le', '-f', 'f32le', 'pipe:1'], true).stdout;
const meter = name => {
  const text = ff(['-i', path.join(HERE, name), '-map', '0:a:0', '-af', 'loudnorm=I=-16.45:TP=-3:LRA=11:print_format=json', '-f', 'null', '-']).stderr;
  return JSON.parse(text.slice(text.lastIndexOf('{'), text.lastIndexOf('}') + 1));
};
const filmProbe = probe(files.film), masterProbe = probe(files.aacMaster);
const video = filmProbe.streams.find(stream => stream.codec_type === 'video');
const audio = filmProbe.streams.filter(stream => stream.codec_type === 'audio');
check('native-video-contract', video?.width === 1920 && video?.height === 1080 && Number(video?.nb_read_frames) === 932 && video?.avg_frame_rate === '30000/1001' && video?.r_frame_rate === '30000/1001', { width: video?.width, height: video?.height, frames: video?.nb_read_frames, averageFps: video?.avg_frame_rate, declaredFps: video?.r_frame_rate });
check('single-stereo-aac-stream', filmProbe.streams.length === 2 && audio.length === 1 && audio[0].codec_name === 'aac' && Number(audio[0].sample_rate) === 48000 && audio[0].channels === 2, { totalStreams: filmProbe.streams.length, audioStream: audio[0] });
ff(['-v', 'error', '-xerror', '-i', path.join(HERE, files.film), '-f', 'null', '-']);
check('whole-film-strict-decode', true, { exitCode: 0 });

const originalPackets = packets(files.aacMaster), finalPackets = packets(files.film);
const packetMismatches = [];
for (let index = 0; index < Math.max(originalPackets.length, finalPackets.length); index++) {
  const a = originalPackets[index], b = finalPackets[index];
  if (!a || !b || a.size !== b.size || a.data_hash !== b.data_hash) packetMismatches.push(index);
}
const payloadList = rows => rows.map((packet, index) => ({ index, size: Number(packet.size), dataHash: packet.data_hash }));
const adts = name => ff(['-v', 'error', '-i', path.join(HERE, name), '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', 'pipe:1'], true).stdout;
const originalAdts = adts(files.aacMaster), finalAdts = adts(files.film);
check('aac-payload-identical', originalPackets.length > 0 && packetMismatches.length === 0 && originalAdts.equals(finalAdts), { originalPacketCount: originalPackets.length, finalPacketCount: finalPackets.length, mismatchIndices: packetMismatches, originalNormalizedAdtsSha256: digest(originalAdts), finalNormalizedAdtsSha256: digest(finalAdts), originalNormalizedAdtsBytes: originalAdts.length, finalNormalizedAdtsBytes: finalAdts.length });

const originalPcm = decode(files.aacMaster), finalPcm = decode(files.film), frames = finalPcm.length / 8, originalFrames = originalPcm.length / 8;
if (!Number.isInteger(frames) || !Number.isInteger(originalFrames)) throw Error('Decoder returned a partial stereo float32 frame');
const commonSamples = Math.min(originalPcm.length, finalPcm.length) / 4;
let originalSum = 0, finalSum = 0, originalSquare = 0, finalSquare = 0, cross = 0, errorSquare = 0, maximumError = 0;
for (let index = 0; index < commonSamples; index++) {
  const a = originalPcm.readFloatLE(index * 4), b = finalPcm.readFloatLE(index * 4), error = b - a;
  originalSum += a; finalSum += b; originalSquare += a * a; finalSquare += b * b; cross += a * b;
  errorSquare += error * error; maximumError = Math.max(maximumError, Math.abs(error));
}
const denominator = Math.sqrt((originalSquare - originalSum ** 2 / commonSamples) * (finalSquare - finalSum ** 2 / commonSamples));
const correlation = (cross - originalSum * finalSum / commonSamples) / denominator;
check('decoded-pcm-identity', finalPcm.equals(originalPcm) && frames === 1495040, { decodedFrames: frames, originalDecodedFrames: originalFrames, differenceFrames: frames - originalFrames, durationSeconds: frames / 48000, originalDecodedPcmSha256: digest(originalPcm), finalDecodedPcmSha256: digest(finalPcm), commonPrefixEqual: finalPcm.subarray(0, commonSamples * 4).equals(originalPcm.subarray(0, commonSamples * 4)), correlationAtZeroLag: correlation, maximumAbsoluteSampleError: maximumError, differenceRms: Math.sqrt(errorSquare / commonSamples), containerEditDifferences: finalPcm.equals(originalPcm) ? 'NONE' : 'Recorded as a failed identity gate; no alignment repair or concealed trimming.' });
const measured = meter(files.film), originalMeasured = meter(files.aacMaster);
check('encoded-levels', Math.abs(Number(measured.input_i) + 16) <= .5 && Number(measured.input_tp) <= -1.5 && measured.input_i === originalMeasured.input_i && measured.input_tp === originalMeasured.input_tp && measured.input_lra === originalMeasured.input_lra, { integratedLufs: Number(measured.input_i), truePeakDbtp: Number(measured.input_tp), loudnessRangeLu: Number(measured.input_lra), masterMeasurements: originalMeasured, finalMeasurements: measured });
const db = value => value > 0 ? 20 * Math.log10(value) : null;
const rms = (start, end) => {
  const first = Math.max(0, Math.round(start * 48000)), last = Math.min(frames, Math.round(end * 48000));
  let energy = 0, peak = 0;
  for (let at = first * 2; at < last * 2; at++) {
    const value = finalPcm.readFloatLE(at * 4);
    energy += value * value; peak = Math.max(peak, Math.abs(value));
  }
  return { startSample: first, endSample: last, startSeconds: first / 48000, endSeconds: last / 48000, rmsDbfs: db(Math.sqrt(energy / ((last - first) * 2))), peakDbfs: db(peak) };
};
const decodedDuration = frames / 48000;
const fadeMeasurements = [rms(27.8278, 28.8278), rms(28.8278, 29.8278), rms(29.8278, 30.8278), rms(decodedDuration - .35, decodedDuration), rms(decodedDuration - .02, decodedDuration)];
const last350 = fadeMeasurements.at(-2), last20 = fadeMeasurements.at(-1);
check('encoded-ending-fade', last350.rmsDbfs !== null && last350.rmsDbfs < -40 && last20.rmsDbfs !== null && last20.rmsDbfs < -70, { authoredFade: recipe.fades.find(fade => fade.type === 'out'), measuredWindows: fadeMeasurements, interpretation: 'Encoded energy measurements only; no heard tail or SFX identity claim.' });

const tail = ff(['-v', 'error', '-xerror', '-i', path.join(HERE, files.film), '-map', '0:v:0', '-vf', "select='gte(n,853)',scale=64:36,format=gray", '-fps_mode', 'passthrough', '-f', 'rawvideo', 'pipe:1'], true).stdout;
const tailFrameBytes = 64 * 36, tailFrames = tail.length / tailFrameBytes;
let maximumTailLuma = 0, totalTailLuma = 0;
for (const value of tail) { maximumTailLuma = Math.max(maximumTailLuma, value); totalTailLuma += value; }
check('black-video-tail', tailFrames === 79 && maximumTailLuma <= 2, { firstVideoFrame: 853, finalVideoFrame: 931, decodedTailFrames: tailFrames, measurementResolution: [64, 36], grayMaximum: maximumTailLuma, grayMean: totalTailLuma / tail.length, decodedTailGraySha256: digest(tail) });
const expectedVideoDuration = 932 * 1001 / 30000;
const referenceVideo = referenceProbe.streams.find(stream => stream.codec_type === 'video'), referenceAudio = referenceProbe.streams.find(stream => stream.codec_type === 'audio');
const referenceGap = Number(referenceAudio.duration) - Number(referenceVideo.duration);
const decodedGap = decodedDuration - Number(video.duration), logicalGap = Number(audio[0].duration) - Number(video.duration);
check('native-audio-video-tail-gap', Math.abs(Number(video.duration) - expectedVideoDuration) < .000001 && Math.abs(decodedGap - referenceGap) < .000001 && Math.abs(logicalGap - referenceGap) < .001, { expectedVideoDurationSeconds: expectedVideoDuration, probedVideoDurationSeconds: Number(video.duration), decodedAudioDurationSeconds: decodedDuration, probedAudioDurationSeconds: Number(audio[0].duration), containerDurationSeconds: Number(filmProbe.format.duration), originalMeasuredGapSeconds: referenceGap, decodedAudioMinusVideoSeconds: decodedGap, logicalAudioMinusVideoSeconds: logicalGap, heldFrame: 'The final 79 decoded video frames are black. Audio extends about 49ms after the video stream ends, as in the native reference. Actual player display behavior is a separate browser check.' });
const after = binding();
check('all-frozen-inputs-stable', JSON.stringify(before) === JSON.stringify(after), { before, after });
const status = checks.every(item => item.status === 'PASS') ? 'TECHNICAL_AUDIO_PASS_SONIC_UNVERIFIED' : 'TECHNICAL_AUDIO_FAIL_SONIC_UNVERIFIED';
const receipt = { status, startedAt, completedAt: new Date().toISOString(), frozenFilmSha256: frozenFilm, verifierSha256: digest(fs.readFileSync(fileURLToPath(import.meta.url))), before, after, checks, probes: { film: filmProbe, master: masterProbe }, producerReceipt, sourceProof: { acceptedAacMaster: approvedMaster, previousCleanInputReceiptSha256: before.audioReceipt.sha256, originalReferenceAudioRead: false, claim: 'Every final AAC packet matches the registered clean master; there is exactly one audio stream. This establishes this mux uses that master rather than native reference AAC.' }, sonicReview: 'UNVERIFIED: direct hearing is unsupported. No soundtrack identity, instrument/vocal/SFX classification, perceived quality or reference-similarity pass follows from these technical measurements.', providerCalls: 0, newSpendUsd: 0 };
fs.writeFileSync(path.join(QA, 'audio-final-packets.json'), JSON.stringify({ masterPayloads: payloadList(originalPackets), finalPayloads: payloadList(finalPackets), masterFirstPacket: originalPackets[0], masterFinalPacket: originalPackets.at(-1), filmFirstPacket: finalPackets[0], filmFinalPacket: finalPackets.at(-1), filmSha256: frozenFilm, masterSha256: approvedMaster }, null, 2) + '\n');
fs.writeFileSync(path.join(QA, 'audio-final-verification.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(`${status}: ${frames} stereo 48k frames; ${measured.input_i} LUFS / ${measured.input_tp} dBTP; ${finalPackets.length} AAC packets; ${checks.filter(item => item.status === 'FAIL').length} failed checks; spend $0.`);
if (status.includes('_FAIL_')) process.exitCode = 1;
