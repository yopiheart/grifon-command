// Exercise the actual old and corrected tail-gate blocks with real decoded media.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const QA = path.join(HERE, 'qa');
const PRIVATE = path.join(HERE, '.tmp/audio-final-black-tail-controls-v1');
const FFMPEG = 'C:/Users/ADMIN/Desktop/grifon-command/node_modules/ffmpeg-static/ffmpeg.exe';
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const currentPath = path.join(QA, 'audio-final-verify.mjs');
const oldPath = path.join(QA, 'audio-final-gray-failure-v1/audio-final-verify.mjs');
const current = fs.readFileSync(currentPath, 'utf8'), old = fs.readFileSync(oldPath, 'utf8');
if (digest(fs.readFileSync(currentPath)) !== '38d5fd8cd77f9879a7e3de17f303eb06dec124eb482b81d8ac64aa0b9d4fdc85' || digest(fs.readFileSync(oldPath)) !== '74bce54ea6ea5f9dafda3705e8ab44245ed6f64528b988789f057f47e37b7d98') throw Error('Verifier hashes differ');
const partition = text => {
  const start = text.indexOf('const tail = ff('), end = text.indexOf('const expectedVideoDuration =');
  if (start < 0 || end <= start) throw Error('Actual tail-gate boundaries missing');
  return { prefix: text.slice(0, start), block: text.slice(start, end), suffix: text.slice(end) };
};
const original = partition(old), corrected = partition(current);
if (original.prefix !== corrected.prefix || original.suffix !== corrected.suffix || !corrected.block.includes('tailFrames === 79 && maximumTailComponent <= 2')) throw Error('Changes extend beyond the tail format/measurement block or widen the gate');
const receiptBytes = fs.readFileSync(path.join(QA, 'audio-final-verification.json'));
const receipt = JSON.parse(receiptBytes);
const preserved = ['audio-final-gray-failure-v1/audio-final-verify.mjs', 'audio-final-gray-failure-v1/audio-final-verification.json', 'audio-final-gray-failure-v1/audio-final-packets.json', 'audio-final-gray-failure-v1/proof.json'];
const binding = () => {
  const result = Object.fromEntries(Object.entries(receipt.before).map(([key, item]) => {
    const bytes = fs.readFileSync(path.join(HERE, item.file));
    return [key, { file: item.file, bytes: bytes.length, sha256: digest(bytes) }];
  }));
  for (const relative of ['audio-final-verify.mjs', 'audio-final-verification.json', ...preserved]) {
    const bytes = fs.readFileSync(path.join(QA, relative));
    result[`qa/${relative}`] = { file: `qa/${relative}`, bytes: bytes.length, sha256: digest(bytes) };
  }
  return result;
};
const before = binding();
for (const [key, value] of Object.entries(receipt.before)) if (JSON.stringify(value) !== JSON.stringify(before[key])) throw Error('Frozen input changed before controls');
if (fs.existsSync(PRIVATE)) throw Error('Refusing to overwrite a prior private control run');
fs.mkdirSync(PRIVATE);
const commands = [];
const ff = (args, binary = true) => {
  const argv = ['-nostdin', '-hide_banner', ...args];
  const result = spawnSync(FFMPEG, argv, { encoding: binary ? null : 'utf8', maxBuffer: 8 * 1024 * 1024, timeout: 60000 });
  commands.push({ executable: FFMPEG, args: argv, pid: result.pid, exitCode: result.status });
  if (result.status !== 0) throw Error(`FFmpeg failed (${result.status}): ${result.stderr.toString()}`);
  return result;
};
const cases = [];
const evaluate = (name, block, film, expectedPass) => {
  let captured;
  vm.runInNewContext(block, { ff, path, HERE: '', files: { film }, digest, check: (checkName, passes, details) => { captured = { name, actualGate: checkName, status: passes ? 'PASS' : 'FAIL', expectedStatus: expectedPass ? 'PASS' : 'FAIL', expectedOutcomeMatched: passes === expectedPass, ...details }; } }, { timeout: 10000 });
  if (!captured) throw Error('Actual gate did not execute');
  cases.push(captured);
};
const film = path.join(HERE, receipt.before.film.file);
evaluate('original-gray-fails-actual-RGB-black-film', original.block, film, false);
evaluate('corrected-RGB-passes-same-frozen-film', corrected.block, film, true);
const fixtures = [];
for (const item of [{ id: 'black-79', color: 'black', frames: 932, expectedPass: true }, { id: 'white-nonblack-79', color: 'white', frames: 932, expectedPass: false }, { id: 'black-78', color: 'black', frames: 931, expectedPass: false }, { id: 'black-80', color: 'black', frames: 933, expectedPass: false }]) {
  const file = path.join(PRIVATE, `${item.id}.mp4`);
  ff(['-v', 'error', '-n', '-f', 'lavfi', '-i', `color=c=${item.color}:s=64x36:r=30000/1001`, '-frames:v', String(item.frames), '-c:v', 'libx264', '-threads', '1', '-crf', '18', '-pix_fmt', 'yuv420p', '-an', file]);
  const bytes = fs.readFileSync(file);
  fixtures.push({ ...item, file: path.relative(HERE, file).replaceAll('\\', '/'), bytes: bytes.length, sha256: digest(bytes), audioStreams: 0 });
  evaluate(item.id, corrected.block, file, item.expectedPass);
}
const packetBytes = fs.readFileSync(path.join(QA, 'audio-final-gray-failure-v1/audio-final-packets.json'));
const packets = JSON.parse(packetBytes);
const packetKeys = new Set(['codec_type', 'stream_index', 'pts', 'pts_time', 'dts', 'dts_time', 'duration', 'duration_time', 'size', 'pos', 'flags', 'side_data_list', 'data_hash']);
const summariesValid = ['masterPayloads', 'finalPayloads'].every(key => packets[key].length === 1461 && packets[key].every(item => Object.keys(item).sort().join(',') === 'dataHash,index,size' && Number.isInteger(item.index) && Number.isInteger(item.size) && /^SHA256:[a-f0-9]{64}$/.test(item.dataHash)));
const boundariesValid = ['masterFirstPacket', 'masterFinalPacket', 'filmFirstPacket', 'filmFinalPacket'].every(key => Object.keys(packets[key]).every(field => packetKeys.has(field)) && /^SHA256:[a-f0-9]{64}$/.test(packets[key].data_hash));
const metadataOnly = summariesValid && boundariesValid && Object.keys(packets).sort().join(',') === 'filmFinalPacket,filmFirstPacket,filmSha256,finalPayloads,masterFinalPacket,masterFirstPacket,masterPayloads,masterSha256';
const after = binding();
const stable = JSON.stringify(before) === JSON.stringify(after);
const passed = cases.every(item => item.expectedOutcomeMatched) && stable && metadataOnly;
const report = { status: passed ? 'PASS' : 'FAIL', completedAt: new Date().toISOString(), frozenFilmSha256: receipt.frozenFilmSha256, correctedGateReceiptSha256: digest(receiptBytes), originalHelperSha256: digest(fs.readFileSync(oldPath)), correctedHelperSha256: digest(fs.readFileSync(currentPath)), scopeCheck: { outsideTailBlockByteIdentical: true, componentToleranceUnchanged: 2, requiredTailFramesUnchanged: 79, resolutionUnchanged: [64, 36], applicationOrMediaEdits: 0 }, before, after, allBindingsStable: stable, cases, fixtures, commands, publicPreservedPackets: { file: 'qa/audio-final-gray-failure-v1/audio-final-packets.json', bytes: packetBytes.length, sha256: digest(packetBytes), containsMetadataAndHashesOnly: metadataOnly, rawAacOrPcm: false }, sonicReview: 'SONIC_UNVERIFIED; direct hearing unavailable.', providerCalls: 0, newSpendUsd: 0, scriptSha256: digest(fs.readFileSync(fileURLToPath(import.meta.url))) };
fs.writeFileSync(path.join(QA, 'audio-final-black-tail-controls.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: report.status, receiptSha256: digest(fs.readFileSync(path.join(QA, 'audio-final-black-tail-controls.json'))), cases, allBindingsStable: stable, preservedPacketMetadataOnly: metadataOnly }, null, 2));
if (!passed) process.exitCode = 1;
