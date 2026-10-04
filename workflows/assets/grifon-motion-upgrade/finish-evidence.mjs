// Inspect actual encoded film frames, separate from editable source snapshots.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../..');
const deps = [root, path.resolve(root, '..'), path.resolve(root, '../..'), path.resolve(root, '../../..')].find(dir => existsSync(path.join(dir, 'node_modules/ffmpeg-static/ffmpeg.exe')));
const require = createRequire(path.join(deps, 'package.json')), sharp = require('sharp');
const ffmpeg = path.join(deps, 'node_modules/ffmpeg-static/ffmpeg.exe');
const scratch = path.join(root, '.tmp/grifon-motion-upgrade/encoded');
await mkdir(scratch, { recursive: true });
const file = path.join(here, 'grifon-full-upgrade-1080p.mp4');
const times = [.6, 1.7, 3.7, 4.7, 6.6, 7.8, 9.7, 11.4, 13.5, 15.4, 19.4, 21.8, 24.4, 27.8, 30.6];
const details = [3.82, 6.84, 9.80, 14.27, 22.48, 25.30, 28.87, 32.70];
const images = new Map(), comparisons = [];
for (const t of [...times, ...details]) {
  const out = path.join(scratch, `at-${t.toFixed(2)}.png`);
  const result = spawnSync(ffmpeg, ['-hide_banner', '-y', '-ss', String(t), '-i', file, '-frames:v', '1', out], { cwd: root, encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error(`Encoded frame ${t}: ${result.error || result.stderr}`);
  const png = await readFile(out); images.set(t, png);
  if (times.includes(t)) {
    const source = path.join(root, `.tmp/grifon-motion-upgrade/source-check/at-${t}.png`);
    if (!existsSync(source)) throw new Error('Actual source inspection must precede encoded verification.');
    const [before, after] = await Promise.all([sharp(source).removeAlpha().raw().toBuffer(), sharp(png).removeAlpha().raw().toBuffer()]);
    if (before.length !== after.length) throw new Error('Encoded frame dimensions differ from source.');
    let sum = 0; for (let i = 0; i < before.length; i++) sum += Math.abs(before[i] - after[i]);
    const meanAbsoluteChannelError = sum / before.length;
    if (meanAbsoluteChannelError > 12) throw new Error(`Encoded frame ${t} does not match its authored beat: mean error ${meanAbsoluteChannelError}`);
    comparisons.push({ seconds: t, meanAbsoluteChannelError, tolerance: 12 });
  }
}
const items = await Promise.all(times.map(async (t, index) => ({ input: await sharp(images.get(t)).resize(480, 270).toBuffer(), left: (index % 4) * 480, top: Math.floor(index / 4) * 270 })));
await sharp({ create: { width: 1920, height: 1080, channels: 3, background: '#09090B' } }).composite(items).jpeg({ quality: 90 }).toFile(path.join(here, 'qa/final-film-sheet.jpg'));
await sharp(images.get(3.7)).jpeg({ quality: 92 }).toFile(path.join(here, 'poster.jpg'));
const bytes = await readFile(file);
const tail = await sharp(images.get(32.70)).removeAlpha().raw().toBuffer();
const tailMaxChannel = tail.reduce((max, channel) => Math.max(max, channel), 0);
if (tailMaxChannel > 5) throw new Error(`Expected final black tail, maximum encoded channel ${tailMaxChannel}.`);
await writeFile(path.join(here, 'qa/encoded-frames.json'), JSON.stringify({ status: 'PASS', film: path.basename(file), sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length, sampleTimes: times, detailTimes: details, sourcePixelComparisons: comparisons, blackTail: { time: 32.7, maxChannel: tailMaxChannel, threshold: 5 }, limitations: ['Samples do not measure every possible visual collision', 'No subjective listening claim', 'Offline encoded video inspection; no browser-origin preview check'] }, null, 2) + '\n');
console.log('PASS: 15 actual encoded story frames match source; final frame sheet and poster saved.');
