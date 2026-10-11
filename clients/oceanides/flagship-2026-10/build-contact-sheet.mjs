import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { posts } from './posts.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
if (args.length && (args.length !== 2 || args[0] !== '--runtime-root' || !args[1])) throw new Error('Usage: node build-contact-sheet.mjs [--runtime-root <existing-checkout>]');
const require = createRequire(args[1] ? resolve(args[1], 'package.json') : import.meta.url);
const sharp = require('sharp');
for (const [filename, selected] of [['contact-sheet.png', posts], ['contact-sheet-new.png', posts.filter(post => Number(post.id) > 6)]]) {
  if (!selected.length) continue;
  const tiles = await Promise.all(selected.map(async (post, index) => ({
    input: await sharp(resolve(here, 'out', `${post.slug}.png`)).resize(360, 450).toBuffer(),
    left: (index % 3) * 380,
    top: Math.floor(index / 3) * 470,
  })));
  await sharp({ create: { width: 1140, height: Math.ceil(selected.length / 3) * 470, channels: 3, background: '#DFE8F5' } })
    .composite(tiles).png().toFile(resolve(here, filename));
  console.log(`Built ${filename}: ${selected.length} designs at feed width`);
}
