// Explicit final private machine recovery, including ignored licensed audio.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../../..');
const PRIMARY = path.resolve(process.env.GRIFON_TOOL_ROOT || ROOT);
const require = createRequire(path.join(PRIMARY, 'package.json'));
const JSZip = require('jszip');
const ffprobe = path.join(PRIMARY, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
if (!process.argv.includes('--create')) throw Error('Final recovery requires explicit --create after finished outputs/player/QA are ready.');
const provenance = JSON.parse(fs.readFileSync(path.join(HERE, 'asset-provenance.json'), 'utf8'));
for (const entry of provenance.files) {
  const source = path.resolve(HERE, entry.path);
  if (!source.startsWith(path.join(HERE, 'assets/audio') + path.sep) || fs.lstatSync(source).isSymbolicLink() || hash(fs.readFileSync(source)) !== entry.sha256) throw Error(`Recovery refuses changed raw input: ${entry.id}`);
}
const spec = JSON.parse(fs.readFileSync(path.join(HERE, 'launch.json'), 'utf8'));
const audio = JSON.parse(fs.readFileSync(path.join(HERE, 'qa/audio.json'), 'utf8'));
if (audio.specSha256 !== hash(fs.readFileSync(path.join(HERE, 'launch.json')))) throw Error('Audio QA does not bind to finished specification');
for (const stem of audio.stems) {
  const bytes = fs.readFileSync(path.join(HERE, stem.file));
  if (bytes.length !== stem.bytes || hash(bytes) !== stem.sha256) throw Error(`Recovery refuses changed stem: ${stem.file}`);
}
const finishedMedia = ['landscape.mp4', 'portrait.mp4'].map((file, index) => {
  const source = path.join(HERE, file), bytes = fs.readFileSync(source);
  const result = spawnSync(ffprobe, ['-v', 'error', '-count_frames', '-show_streams', '-show_format', '-of', 'json', source], { encoding: 'utf8', timeout: 30000 });
  if (result.status !== 0) throw Error(`Finished media probe failed: ${file}`);
  const probe = JSON.parse(result.stdout), video = probe.streams.find(stream => stream.codec_type === 'video'), sound = probe.streams.find(stream => stream.codec_type === 'audio');
  const width = index === 0 ? 1920 : 1080, height = index === 0 ? 1080 : 1920;
  if (!video || video.codec_name !== 'h264' || video.width !== width || video.height !== height || video.r_frame_rate !== '30/1' || Number(video.nb_read_frames) !== spec.duration * spec.fps || Number(probe.format.duration) !== spec.duration || !sound || sound.codec_name !== 'aac' || Number(sound.sample_rate) !== 48000 || sound.channels !== 2) throw Error(`Incomplete finished export: ${file}`);
  if (index === 1 && bytes.length > 12000000) throw Error('Portrait attachment exceeds 12 MB');
  return { file, bytes: bytes.length, sha256: hash(bytes), width, height, frames: Number(video.nb_read_frames), duration: Number(probe.format.duration) };
});
function inventory(directory, prefix) {
  return fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(entry => {
    const relative = prefix + entry.name;
    if (entry.name === '.tmp' || relative.endsWith('/qa/recovery-archive.json')) return [];
    if (entry.isSymbolicLink()) throw Error(`Recovery inventory refuses symbolic link: ${relative}`);
    if (entry.isDirectory()) return inventory(path.join(directory, entry.name), relative + '/');
    const content = fs.readFileSync(path.join(directory, entry.name));
    return [{ path: relative, bytes: content.length, sha256: hash(content), content }];
  });
}
const prefix = 'workflows/assets/grifon-shader-launch/';
const files = inventory(HERE, prefix);
const artifact = 'artifacts/grifon-shader-launch.html';
const builders = fs.readdirSync(path.join(ROOT, 'tools/artifacts')).filter(file => file.includes('grifon-shader-launch') && file.endsWith('.mjs')).map(file => 'tools/artifacts/' + file);
if (builders.length !== 1) throw Error('Exactly one finished launch artifact builder required');
for (const relative of [artifact, ...builders, '.gitattributes', 'tools/artifacts/_gates.mjs', 'workflows/assets/grifon-motion-action-pilot/action-spec.mjs', 'workflows/assets/grifon-motion-action-pilot/verify-player.mjs', 'workflows/grifon_shader_launch_brief.md']) {
  const source = path.join(ROOT, relative);
  if (fs.lstatSync(source).isSymbolicLink()) throw Error(`Recovery refuses symbolic link: ${relative}`);
  const content = fs.readFileSync(source);
  files.push({ path: relative, bytes: content.length, sha256: hash(content), content });
}
if (!files.some(file => file.path === prefix + 'mix-master.wav') || !files.some(file => file.path === prefix + 'music-stem.wav') || !files.some(file => file.path === prefix + 'sfx-stem.wav')) throw Error('Private recovery requires separate ignored stems and final master');
files.sort((a, b) => a.path.localeCompare(b.path));
const sourceInventory = files.map(({ content, ...metadata }) => metadata);
const inventorySha256 = hash(Buffer.from(JSON.stringify(sourceInventory)));
const zip = new JSZip();
for (const file of files) zip.file(file.path, file.content, { date: new Date('2026-10-08T00:00:00Z'), createFolders: false });
const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 3 } });
const destination = path.join(PRIMARY, '.tools/grifon-motion-archives');
fs.mkdirSync(destination, { recursive: true });
const filename = `grifon-shader-launch-2026-10-08-${inventorySha256.slice(0, 12)}-${crypto.randomUUID().slice(0, 8)}.zip`;
const output = path.join(destination, filename);
fs.writeFileSync(output, bytes, { flag: 'wx' });
const persisted = fs.readFileSync(output);
if (!persisted.equals(bytes)) throw Error('Persisted recovery ZIP differs');
const reopened = await JSZip.loadAsync(persisted, { checkCRC32: true });
const entries = Object.values(reopened.files).filter(entry => !entry.dir);
if (entries.length !== files.length) throw Error('Recovery ZIP entry count differs');
for (const file of files) {
  const entry = reopened.file(file.path);
  if (!entry) throw Error(`Recovery ZIP missing ${file.path}`);
  const decoded = await entry.async('nodebuffer');
  if (decoded.length !== file.bytes || hash(decoded) !== file.sha256 || !decoded.equals(file.content)) throw Error(`Recovery ZIP decoded bytes differ: ${file.path}`);
}
const receipt = { purpose: 'PRIVATE MACHINE RECOVERY ONLY, NOT FOR DISTRIBUTION', absolutePath: output, filename, bytes: persisted.length, sha256: hash(persisted), entryCount: files.length, sourceInventorySha256: inventorySha256, inventory: sourceInventory, finishedMedia, verification: 'Every decoded ZIP entry length, SHA256 and byte content matched its local source; CRC32 checked.', ignoredAudioIncluded: true, scope: 'New film sources, finished exports, QA, standalone artifact and its builder/gates; shared action contract and brief. Existing pinned tools remain available from GRIFON_TOOL_ROOT.', providerCalls: 0, paidSpendUsd: 0 };
fs.writeFileSync(path.join(HERE, 'qa/recovery-archive.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log(`PASS: private recovery ZIP ${filename}, ${files.length} entries verified byte-for-byte.`);
