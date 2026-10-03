// A 375px-wide inspection of actual decoded film pixels, not browser QA.
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(here, '../../..');
const deps = [root, path.resolve(root, '..'), path.resolve(root, '../..'), path.resolve(root, '../../..')].find(dir => existsSync(path.join(dir, 'node_modules/sharp/package.json')));
const require = createRequire(path.join(deps, 'package.json')), sharp = require('sharp');
const times = ['6.84', '21.80', '27.80', '30.60'];
const items = await Promise.all(times.map(async (t, index) => ({ input: await sharp(path.join(root, '.tmp/grifon-motion-upgrade/encoded', `at-${t}.png`)).resize(375, 211).toBuffer(), left: 0, top: index * 223 })));
await sharp({ create: { width: 375, height: 880, channels: 3, background: '#09090B' } }).composite(items).png().toFile(path.join(here, 'qa/phone-film-frames.png'));
await writeFile(path.join(here, 'qa/phone-film-frames.json'), JSON.stringify({ width: 375, sampleTimes: times.map(Number), source: 'Actual decoded final MP4', purpose: 'Native film pixel readability at a small portrait-width display', notEstablished: ['Browser playback', 'Physical Android behavior', 'HTML preview page checks', 'Listening'] }, null, 2) + '\n');
console.log('Saved 375px-wide actual encoded film frames for independent pixel review.');
