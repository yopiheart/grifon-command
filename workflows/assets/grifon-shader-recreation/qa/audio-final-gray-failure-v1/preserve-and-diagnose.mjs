// Preserve the original failed gate and demonstrate its gray-conversion defect.
// Read-only media diagnostics. This does not replace or modify the audio gate.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(import.meta.url);
const OUT = path.dirname(script);
const HERE = path.resolve(OUT, '../..');
const FFMPEG = 'C:/Users/ADMIN/Desktop/grifon-command/node_modules/ffmpeg-static/ffmpeg.exe';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const readBytes = relative => fs.readFileSync(path.join(HERE, relative));
const failedReceiptBytes = readBytes('qa/audio-final-verification.json');
const failedReceipt = JSON.parse(failedReceiptBytes);
const expectedFilm = '15cbddf056015c6ab16986fb5a22abd71ec03fb8c8b3b0903efcd6de1cbd37ce';
const expectedHelper = '74bce54ea6ea5f9dafda3705e8ab44245ed6f64528b988789f057f47e37b7d98';
const expectedReceipt = '442423b851ce9abe0c7bc802e3d2b3b2c6fc64028df5ddd19b3b7695dee6dbc3';
if (hash(failedReceiptBytes) !== expectedReceipt || failedReceipt.frozenFilmSha256 !== expectedFilm || hash(readBytes('qa/audio-final-verify.mjs')) !== expectedHelper) throw Error('Original failed inputs no longer match');
const binding = () => Object.fromEntries(Object.entries(failedReceipt.before).map(([key, item]) => {
  const bytes = readBytes(item.file);
  return [key, { file: item.file, bytes: bytes.length, sha256: hash(bytes) }];
}));
const before = binding();
if (JSON.stringify(before) !== JSON.stringify(failedReceipt.before)) throw Error('Frozen inputs changed before diagnosis');
const copies = ['qa/audio-final-verify.mjs', 'qa/audio-final-verification.json', 'qa/audio-final-packets.json', 'qa/audio-final-plan.json'];
const variants = [
  { id: 'scale-then-gray-default', suffix: 'scale=64:36,format=gray', pixelFormat: 'gray', channels: 1 },
  { id: 'scale-then-rgb-default', suffix: 'scale=64:36,format=rgb24', pixelFormat: 'rgb24', channels: 3 },
  { id: 'rgb-before-scale', suffix: 'format=rgb24,scale=64:36', pixelFormat: 'rgb24', channels: 3 },
  { id: 'scale-gray-explicit-full', suffix: 'scale=64:36:out_range=full,format=gray', pixelFormat: 'gray', channels: 1 }
];
for (const name of [...copies.map(value => path.basename(value)), ...variants.map(item => `${item.id}.raw`), 'proof.json']) {
  if (fs.existsSync(path.join(OUT, name))) throw Error(`Refusing to overwrite ${name}`);
}
const preserved = [];
for (const source of copies) {
  const destination = path.join(OUT, path.basename(source));
  fs.copyFileSync(path.join(HERE, source), destination, fs.constants.COPYFILE_EXCL);
  const original = readBytes(source), copy = fs.readFileSync(destination);
  if (!original.equals(copy)) throw Error('Preserved copy differs');
  preserved.push({ source, preservedFile: path.basename(source), bytes: copy.length, sha256: hash(copy), byteIdentical: true });
}
const results = [];
for (const variant of variants) {
  const filter = "select='gte(n,853)'," + variant.suffix;
  const args = ['-nostdin', '-hide_banner', '-v', 'error', '-xerror', '-i', path.join(HERE, failedReceipt.before.film.file), '-map', '0:v:0', '-vf', filter, '-fps_mode', 'passthrough', '-f', 'rawvideo', 'pipe:1'];
  const result = spawnSync(FFMPEG, args, { maxBuffer: 8 * 1024 * 1024, timeout: 60000 });
  if (result.status !== 0) throw Error(`Diagnostic failed (${result.status}): ${result.stderr.toString()}`);
  let minimum = 255, maximum = 0, sum = 0;
  for (const value of result.stdout) { minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); sum += value; }
  const rawFile = `${variant.id}.raw`;
  fs.writeFileSync(path.join(OUT, rawFile), result.stdout, { flag: 'wx' });
  results.push({ ...variant, executable: FFMPEG, args, filter, exitCode: result.status, rawFile, bytes: result.stdout.length, sha256: hash(result.stdout), width: 64, height: 36, firstFrame: 853, lastFrame: 931, frames: result.stdout.length / (64 * 36 * variant.channels), minimum, maximum, mean: sum / result.stdout.length });
}
const after = binding();
const stable = JSON.stringify(before) === JSON.stringify(after);
const rgb = results.filter(item => item.pixelFormat === 'rgb24');
const gray = results.filter(item => item.pixelFormat === 'gray');
const proven = stable && rgb.every(item => item.frames === 79 && item.maximum === 0) && gray.every(item => item.frames === 79 && item.maximum === 7);
const proof = {
  status: proven ? 'GRAY_CONVERSION_FALSE_FAILURE_DEMONSTRATED' : 'DIAGNOSTIC_FAIL',
  completedAt: new Date().toISOString(),
  originalCommand: `node workflows/assets/grifon-shader-recreation/qa/audio-final-verify.mjs --frozen ${expectedFilm}`,
  originalExitCode: 1,
  originalGateStatus: failedReceipt.status,
  helperSha256: expectedHelper,
  failedReceiptSha256: expectedReceipt,
  filmSha256: expectedFilm,
  producerReceiptSha256: before.producerReceipt.sha256,
  originalGateBefore: failedReceipt.before,
  originalGateAfter: failedReceipt.after,
  diagnosticBefore: before,
  diagnosticAfter: after,
  allEightFrozenInputsStable: stable,
  preserved,
  results,
  scriptSha256: hash(fs.readFileSync(script)),
  mediaEdits: 0,
  helperEdits: 0,
  providerCalls: 0,
  newSpendUsd: 0,
  sonicReview: 'SONIC_UNVERIFIED. Direct hearing unavailable. No soundtrack/SFX identity or sonic-similarity claim.',
  conclusion: 'The original gray-tail failure is preserved. Exact RGB-black tail evidence identifies a verifier conversion defect; it is not a changed threshold, changed film or replacement overall gate.'
};
fs.writeFileSync(path.join(OUT, 'proof.json'), JSON.stringify(proof, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ status: proof.status, proofSha256: hash(fs.readFileSync(path.join(OUT, 'proof.json'))), allEightFrozenInputsStable: stable, preserved: preserved.length, results: results.map(item => ({ id: item.id, frames: item.frames, minimum: item.minimum, maximum: item.maximum, mean: item.mean, sha256: item.sha256 })) }, null, 2));
if (!proven) process.exitCode = 1;
