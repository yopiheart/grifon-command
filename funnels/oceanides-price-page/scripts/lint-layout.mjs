#!/usr/bin/env node
/**
 * lint-layout.mjs — fails the build when a section drifts off the page's rail.
 *
 * WHY THIS EXISTS
 * Neil, 2026-07-30: "Ung before & after headline/text hindi na igitna eto lang ang
 * naiiba. Please sana matandaan mo lahat ng to. Dapat aligned yan bro."
 *
 * The cause was invisible in any single file. BeforeAfter rendered inside
 * `width="shell"` (72rem) while every other content section used `width="prose"`
 * (46rem), so its left edge sat 208px further out. Nothing looks wrong when you
 * read one component. It only shows when you scroll the whole page and the text
 * jumps sideways. Two sections were also centred while the rest were left.
 *
 * A left rail is not a preference here, it is the brand: clients/oceanides/DESIGN.md
 * is a matte PRINT world, and print sets body copy on one rail. A centred column
 * reads as a slide deck.
 *
 * So the rail is enforced, not remembered. Same reason lint-voice.mjs exists.
 *
 * THE RULE
 *   - Content sections: width="prose", heading left-aligned. No exceptions.
 *   - Full-bleed BANDS may use the wide shell, because they are strips rather
 *     than reading columns: the hero, the proof strip, the footer.
 *   - The hero is the ONE centred moment (Neil asked for it, Apple as the ref).
 *     Everything after it settles onto the rail.
 *
 * Run: node scripts/lint-layout.mjs   (auto-runs on `npm run build`)
 */

import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SECTIONS = resolve(HERE, '..', 'src', 'sections');

/** Bands, not reading columns. These are allowed to span the wide shell. */
const BANDS = new Set(['Hero.tsx', 'SocialProofBar.tsx', 'ComplianceFooter.tsx']);

/** Only the hero centres its content. */
const MAY_CENTRE = new Set(['Hero.tsx', 'SocialProofBar.tsx', 'ComplianceFooter.tsx']);

/** Sections the config never renders — the template ships more than we use. */
const UNUSED = new Set([
  'BonusStack.tsx',
  'CaseStudyMetrics.tsx',
  'TestimonialWall.tsx',
  'CtaBlock.tsx',
  'HeroOptin.tsx',
  'LeadForm.tsx',
  'registry.ts',
]);

const files = (await readdir(SECTIONS)).filter((f) => /\.tsx$/.test(f) && !UNUSED.has(f));
const hits = [];

for (const file of files) {
  const src = await readFile(join(SECTIONS, file), 'utf8');
  const usesShell = /<SectionShell(?![^>]*width=)/.test(src) || /width="shell"/.test(src);
  const centres = /align="center"/.test(src);

  if (usesShell && !BANDS.has(file)) {
    hits.push({
      file,
      what: 'nasa malapad na shell, hindi sa prose rail',
      fix: 'idagdag ang width="prose" sa <SectionShell>',
      why: '208px ang layo ng gilid nya kaysa sa ibang section',
    });
  }
  if (centres && !MAY_CENTRE.has(file)) {
    hits.push({
      file,
      what: 'naka-gitna ang heading',
      fix: 'tanggalin ang align="center"',
      why: 'ang hero lang ang naka-gitna, ang iba ay nasa kaliwang rail',
    });
  }

  // A <SectionHeading> wrapped in a padded box drifts off the rail even when the
  // shell width is right. ObjectionReversal did exactly this: an amber left-rule
  // box with `pl-5` around the whole section pushed its heading 22px right of
  // every other heading. Invisible in the file, obvious when scrolling.
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    if (!/<(div|section|article)[^>]*\b(pl-|px-|ml-|mx-)/.test(line)) return;
    const window = lines.slice(i + 1, i + 4).join('\n');
    if (/<SectionHeading/.test(window)) {
      hits.push({
        file,
        what: `may padding ang nakabalot sa heading (linya ${i + 1})`,
        fix: 'ilabas ang <SectionHeading> sa padded na box, ang body na lang ang balutin',
        why: 'lumilihis ang heading sa rail kahit tama ang lapad ng section',
      });
    }
  });
}

if (hits.length === 0) {
  console.log(`layout ok — ${files.length} section, isang rail`);
  process.exit(0);
}

console.error(`\n✗ LAYOUT LINT — ${hits.length} nahuli\n`);
for (const h of hits) {
  console.error(`  src/sections/${h.file}`);
  console.error(`    ${h.what}`);
  console.error(`    ${h.why}`);
  console.error(`    ayos: ${h.fix}\n`);
}
process.exit(1);
