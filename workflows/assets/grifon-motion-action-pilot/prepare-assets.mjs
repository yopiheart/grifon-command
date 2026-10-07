// Reuse local recorded sources; never download, install or call a provider.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const PRIMARY = path.resolve(process.env.GRIFON_TOOL_ROOT || ROOT.split(`${path.sep}.tmp${path.sep}worktrees${path.sep}`)[0]);
const manifest = JSON.parse(fs.readFileSync(path.join(HERE, 'asset-provenance.json'), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const asset of manifest.files) {
  const destination = path.resolve(HERE, asset.path);
  if (!destination.startsWith(path.join(HERE, 'assets/audio') + path.sep)) throw Error('Unexpected local audio destination');
  if (fs.existsSync(destination)) {
    if (hash(destination) !== asset.sha256) throw Error(`Existing audio hash differs: ${asset.path}`);
    continue;
  }
  const source = [ROOT, PRIMARY].map(root => path.resolve(root, asset.source)).find(file => fs.existsSync(file));
  if (!source) throw Error(`Recorded local source missing: ${asset.source}. Restore from the private machine archive; no provider call is authorized.`);
  if (hash(source) !== asset.sha256) throw Error(`Recorded source hash differs: ${asset.source}`);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}
console.log(`PASS: ${manifest.files.length} local audio source hashes verified; no network/provider calls.`);
