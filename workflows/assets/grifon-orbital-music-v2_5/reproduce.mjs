import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

// Execute the immutable accepted recipe only in a new, isolated local tree.
const here = fs.realpathSync(path.dirname(fileURLToPath(import.meta.url)));
const sourceRoot = fs.realpathSync(path.resolve(here, '../../..'));
const hash = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const inside = (root, file) => {
  const relative = path.relative(root, file);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
};
if (process.argv.length !== 3) throw new Error('Usage: node reproduce.mjs <fresh destination outside this repository>');
const requested = path.resolve(process.argv[2]);
if (fs.lstatSync(requested, { throwIfNoEntry: false })) throw new Error('Destination already exists; choose a fresh directory');
const parent = fs.realpathSync(path.dirname(requested));
const destination = path.join(parent, path.basename(requested));
if (inside(sourceRoot, destination)) throw new Error('Destination must be outside the original repository');

const acceptanceFile = path.join(here, 'acceptance-v2.json');
const acceptance = JSON.parse(fs.readFileSync(acceptanceFile, 'utf8'));
if (acceptance.status !== 'CREATIVELY_ACCEPTED_BY_USER' || !acceptance.boundEvidence?.length) throw new Error('Missing accepted checkpoint');
const checked = new Map([[acceptanceFile, hash(acceptanceFile)]]);
const verify = (file, expected) => {
  const actual = hash(file);
  if (actual !== expected) throw new Error(`Hash mismatch: ${path.basename(file)}`);
  checked.set(file, expected);
  return file;
};
for (const evidence of acceptance.boundEvidence) verify(path.resolve(here, evidence.file), evidence.sha256);
verify(path.resolve(here, acceptance.video.file), acceptance.video.sha256);
for (const required of ['mix-continuous.mjs', 'continuous-fit-plan.json', 'continuous-mix-receipt.json']) {
  if (!acceptance.boundEvidence.some(evidence => evidence.file === required)) throw new Error(`Unbound accepted source: ${required}`);
}
const plan = JSON.parse(fs.readFileSync(path.join(here, 'continuous-fit-plan.json'), 'utf8'));
const inputs = Object.values(plan.inputs).map(input => ({ ...input, source: verify(path.resolve(here, input.path), input.sha256) }));
const stageHere = path.join(destination, 'workflows/assets/grifon-orbital-music-v2_5');
for (const input of inputs) {
  if (!path.isAbsolute(input.path) && !inside(destination, path.resolve(stageHere, input.path))) throw new Error('Relative input escapes isolated destination');
}
// Non-recursive creation refuses a destination created concurrently after preflight.
fs.mkdirSync(destination);
fs.mkdirSync(stageHere, { recursive: true });
for (const name of ['mix-continuous.mjs', 'continuous-fit-plan.json']) {
  fs.copyFileSync(path.join(here, name), path.join(stageHere, name), fs.constants.COPYFILE_EXCL);
}
for (const input of inputs.filter(input => !path.isAbsolute(input.path))) {
  const target = path.resolve(stageHere, input.path);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(input.source, target, fs.constants.COPYFILE_EXCL);
}
const output = path.join(destination, 'output');
try {
  const result = spawnSync(process.execPath, [path.join(stageHere, 'mix-continuous.mjs'), output], { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024, windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Isolated recipe failed: ${result.error?.message || result.stderr}`);
  const receiptFile = path.join(output, 'continuous-mix-receipt.json');
  const receipt = JSON.parse(fs.readFileSync(receiptFile, 'utf8'));
  const reproduced = receipt.output.video.path;
  if (!inside(output, path.resolve(reproduced))) throw new Error('Reproduced video escaped isolated output');
  const videoHash = hash(reproduced);
  if (videoHash !== acceptance.video.sha256) throw new Error('Reproduced video differs from accepted film');
  for (const [file, expected] of checked) verify(file, expected);
  const evidence = {
    schemaVersion: 1, status: 'BYTE_EXACT_REPRODUCTION_SOURCE_UNCHANGED', createdAt: new Date().toISOString(),
    sourceAcceptanceSha256: checked.get(acceptanceFile), acceptedVideoSha256: acceptance.video.sha256,
    reproducedVideo: { path: reproduced, sha256: videoHash },
    freshMixReceipt: { path: receiptFile, sha256: hash(receiptFile) },
    acceptedBindingsUnchanged: true, checkedSourceFiles: checked.size,
    recipeAndPlanCopiedUnchanged: true, isolatedTree: destination, providerCalls: 0, paidSpend: 0
  };
  fs.writeFileSync(path.join(destination, 'reproduction-receipt.json'), `${JSON.stringify(evidence, null, 2)}\n`, { flag: 'wx' });
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  for (const [file, expected] of checked) verify(file, expected);
}
