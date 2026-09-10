import { readFileSync, writeFileSync } from 'node:fs';
import { finalize } from './_gates.mjs';

const template = new URL('./hero-sweep-review.tpl.html', import.meta.url);
const output = new URL('../../artifacts/hero-sweep-review.html', import.meta.url);
writeFileSync(output, finalize(readFileSync(template, 'utf8'), {
  label: 'hero-sweep-review', required: ['<title>', 'class="ground"', 'id="replay"', 'id="scrub"'],
}));
console.log('Built artifacts/hero-sweep-review.html from committed template.');
