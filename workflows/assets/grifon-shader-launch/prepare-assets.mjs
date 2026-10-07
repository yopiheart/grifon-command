// Local byte-for-byte recovery only. No downloads, credentials or provider calls.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const PRIMARY = path.resolve(process.env.GRIFON_TOOL_ROOT || ROOT);
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'asset-provenance.json'), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const audioRoot = path.join(HERE, 'assets/audio');
const roots = [ROOT, PRIMARY, path.join(PRIMARY, '.tmp/worktrees/grifon-motion-depth')];
const receipt = [];
for (const asset of manifest.files) {
  const destination = path.resolve(HERE, asset.path);
  if (!destination.startsWith(audioRoot + path.sep)) throw Error('Unexpected local audio destination');
  if (fs.existsSync(destination)) {
    if (fs.lstatSync(destination).isSymbolicLink() || hash(destination) !== asset.sha256) throw Error(`Existing audio differs: ${asset.path}`);
    receipt.push({ id: asset.id, path: asset.path, bytes: fs.statSync(destination).size, sha256: asset.sha256, verified: true });
    continue;
  }
  const source = roots.map(root => path.resolve(root, asset.source)).find(file => fs.existsSync(file));
  if (!source) throw Error(`Recorded local source missing: ${asset.source}. Recover from the private machine archive; no provider call is authorized.`);
  if (fs.lstatSync(source).isSymbolicLink() || hash(source) !== asset.sha256) throw Error(`Recorded source differs: ${asset.id}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
  if (hash(destination) !== asset.sha256) throw Error(`Copied audio differs: ${asset.id}`);
  receipt.push({ id: asset.id, path: asset.path, bytes: fs.statSync(destination).size, sha256: asset.sha256, verified: true });
}
fs.mkdirSync(path.join(HERE, 'qa'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'qa/audio-source-recovery.json'), JSON.stringify({ schemaVersion: 1, rights: 'PRIVATE REVIEW ONLY: selected ElevenLabs sources predate paid subscription.', files: receipt, verification: 'Every ignored local source matches its prior source-register SHA256.', providerCalls: 0, paidSpendUsd: 0 }, null, 2) + '\n');
console.log(`PASS: ${receipt.length} local audio source hashes verified; zero network/provider calls.`);
