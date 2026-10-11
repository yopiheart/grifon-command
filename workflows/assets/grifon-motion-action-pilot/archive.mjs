// Private machine recovery, including ignored licensed inputs; never a public artifact.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const PRIMARY = path.resolve(process.env.GRIFON_TOOL_ROOT || ROOT.split(`${path.sep}.tmp${path.sep}worktrees${path.sep}`)[0]);
const require = createRequire(path.join(PRIMARY, 'package.json'));
const JSZip = require('jszip');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function inventory(directory, prefix = '') {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const relative = prefix + entry.name;
    if (entry.name === '.tmp' || relative === 'qa/recovery-archive.json') return [];
    if (entry.isSymbolicLink()) throw Error(`Recovery inventory refuses a symbolic link: ${relative}`);
    if (entry.isDirectory()) return inventory(path.join(directory, entry.name), relative + '/');
    const bytes = fs.readFileSync(path.join(directory, entry.name));
    return [{ path: relative, bytes: bytes.length, sha256: hash(bytes), content: bytes }];
  });
}
const files = inventory(HERE);
if (!files.some(file => file.path === 'assets/audio/digital-clouds.mp3') || !files.some(file => file.path === 'mix-master.wav')) throw Error('Private recovery archive requires ignored raw audio and master stem');
const sourceInventory = files.map(({ content, ...metadata }) => metadata);
const inventorySha256 = hash(Buffer.from(JSON.stringify(sourceInventory)));
const zip = new JSZip();
for (const file of files) zip.file(file.path, file.content, { date: new Date('2026-10-08T00:00:00Z'), createFolders: false });
const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 3 } });
const destination = path.join(PRIMARY, '.tools/grifon-motion-archives');
fs.mkdirSync(destination, { recursive: true });
const filename = `grifon-motion-action-pilot-${new Date().toISOString().slice(0, 10)}-${inventorySha256.slice(0, 12)}-${crypto.randomUUID().slice(0, 8)}.zip`;
const output = path.join(destination, filename);
fs.writeFileSync(output, bytes, { flag: 'wx' });
const persisted = fs.readFileSync(output);
if (!persisted.equals(bytes)) throw Error('Persisted ZIP bytes differ');
const reopened = await JSZip.loadAsync(persisted, { checkCRC32: true });
const entries = Object.values(reopened.files).filter(entry => !entry.dir);
if (entries.length !== files.length) throw Error('Recovery ZIP entry count differs');
for (const file of files) {
  const entry = reopened.file(file.path);
  if (!entry) throw Error(`Recovery ZIP missing ${file.path}`);
  const decoded = await entry.async('nodebuffer');
  if (decoded.length !== file.bytes || hash(decoded) !== file.sha256 || !decoded.equals(file.content)) throw Error(`Recovery ZIP decoded bytes differ: ${file.path}`);
}
const receipt = { purpose: 'PRIVATE MACHINE RECOVERY ONLY, NOT FOR DISTRIBUTION', filename, bytes: persisted.length, sha256: hash(persisted), entryCount: files.length, sourceInventorySha256: inventorySha256, inventory: sourceInventory, verification: 'Every decoded ZIP entry length, SHA-256 and byte content matched its local source; CRC32 checked.', ignoredAudioIncluded: true, providerCalls: 0, paidSpendUsd: 0 };
fs.mkdirSync(path.join(HERE, 'qa'), { recursive: true });
fs.writeFileSync(path.join(HERE, 'qa/recovery-archive.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(`PASS: private recovery ZIP ${filename}, ${files.length} entries verified byte-for-byte.`);
