// Private local recovery only. Explicit film files; no accounts, ledgers or network.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const PRIMARY = 'C:/Users/ADMIN/Desktop/grifon-command';
const JSZip = createRequire(path.join(PRIMARY, 'package.json'))('jszip');
const RECEIPT = path.join(HERE, 'qa/approved-archive.json');
const DEST = path.join(PRIMARY, '.tools/grifon-motion-archives/approved-2026-10-04-9529b122.zip');
const prefix = 'workflows/assets/grifon-motion-upgrade/';
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (p, message) => { if (!p) throw Error(message); };
const readJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
function repoFile(relative) {
  const p = path.resolve(ROOT, relative);
  assert(!path.isAbsolute(relative) && !relative.split(/[\\/]/).includes('..') && p.startsWith(ROOT + path.sep), 'Input outside project');
  assert(fs.realpathSync(p).toLowerCase().startsWith(fs.realpathSync(ROOT).toLowerCase() + path.sep), 'Input alias outside project');
  return p;
}
async function verify(receipt) {
  assert(receipt.archive.path === DEST, 'Unexpected archive location');
  const bytes = fs.readFileSync(DEST);
  assert(hash(bytes) === receipt.archive.sha256, 'Archive bytes changed');
  const zip = await JSZip.loadAsync(bytes, { checkCRC32: true });
  const names = Object.keys(zip.files).filter(n => !zip.files[n].dir);
  assert(names.length === receipt.entries.length, 'Archive entry count changed');
  for (const item of receipt.entries) {
    const entry = zip.file(item.entry); assert(entry, `Missing archive entry: ${item.entry}`);
    const b = await entry.async('nodebuffer');
    assert(b.length === item.bytes && hash(b) === item.sha256, `Archive entry changed: ${item.entry}`);
  }
  return { status: 'VERIFIED', files: names.length, archive: DEST, bytes: bytes.length, sha256: receipt.archive.sha256, providerCalls: 0 };
}
async function main() {
  const args = process.argv.slice(2);
  assert(args.length === 0 || args.length === 1 && args[0] === '--create', 'Use no arguments to verify, or --create once');
  if (!args.length) { console.log(JSON.stringify(await verify(readJson(RECEIPT)))); return; }
  assert(!fs.existsSync(DEST) && !fs.existsSync(RECEIPT), 'Archive/receipt already exists; preserve it and use default verification');
  const approval = readJson(path.join(HERE, 'approval.json'));
  const selection = readJson(path.join(HERE, 'sfx-elevenlabs/selected-review-manifest.json'));
  const report = readJson(path.join(HERE, 'sfx-elevenlabs/qa/replacement-report.json'));
  const source = readJson(path.join(HERE, 'source-manifest.json'));
  const checks = [
    { path: approval.artifact.path, sha256: approval.artifact.sha256 },
    ...selection.assets,
    ...Object.values(report.preservedInputs),
    ...Object.entries(source.sources).map(([p, sha256]) => ({ path: prefix + p, sha256 })),
    { path: prefix + 'index.html', sha256: source.output.sha256 },
  ];
  for (const item of checks) assert(hash(fs.readFileSync(repoFile(item.path))) === item.sha256, `Locked source mismatch: ${item.path}`);
  const paths = [...new Set([
    ...checks.map(c => c.path), source.spec.baseline,
    'workflows/grifon_motion_production.md',
    ...['approval.json','archive-approved.mjs','README.md','build.mjs','render.mjs','verify-source.mjs','checkpoint.mjs','source-manifest.json','voiceover/qa/phrase-timing.json',
      'sfx-elevenlabs/README.md','sfx-elevenlabs/replace.mjs','sfx-elevenlabs/select-review.mjs','sfx-elevenlabs/selected-review-manifest.json',
      'sfx-elevenlabs/cue-plan.json','sfx-elevenlabs/history-candidates.json','sfx-elevenlabs/qa/replacement-report.json'].map(p => prefix + p),
  ])].sort();
  const zip = new JSZip(), entries = [];
  for (const relative of paths) {
    assert(!/(?:^|\/)(?:\.env|credentials|token|authorization|single-attempt)(?:[./-]|$)/i.test(relative), 'Account/authorization input forbidden');
    const b = fs.readFileSync(repoFile(relative));
    const entry = 'repo/' + relative.replaceAll('\\', '/');
    zip.file(entry, b, { date: new Date('2026-10-04T00:00:00Z'), createFolders: false });
    entries.push({ entry, bytes: b.length, sha256: hash(b) });
  }
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  fs.mkdirSync(path.dirname(DEST), { recursive: true });
  fs.writeFileSync(DEST, bytes, { flag: 'wx' });
  const receipt = { status: 'PRIVATE_LOCAL_RECOVERY', date: '2026-10-04', acceptedVideoSha256: approval.artifact.sha256,
    archive: { path: DEST, bytes: bytes.length, sha256: hash(bytes) }, entries,
    scope: 'This film only. Source, accepted media, selected native SFX and exact local stems. No credentials, account sessions or paid approval ledgers.',
    restore: 'Verify archive, then restore repo/ entries to matching paths in an isolated checkout; never overwrite conflicting files. Existing Node/FFmpeg runtimes are external prerequisites.',
    rights: 'Private recovery, not licensed asset redistribution or off-device cloud backup.' };
  const result = await verify(receipt);
  fs.writeFileSync(RECEIPT, JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
