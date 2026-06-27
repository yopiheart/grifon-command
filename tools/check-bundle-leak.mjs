#!/usr/bin/env node
// Crown-jewel bundle-leak guard.
//
// The 5 highest-IP prompts were moved server-side (api/_lib/prompts.ts) on
// 2026-05-09 so they never ship in the public client bundle. A careless
// refactor that re-imports them client-side would silently re-expose the moat.
// This guard greps the built client JS for distinctive fragments of those
// prompts and fails if ANY appear.
//
// Patterns are the canonical list from services/CLAUDE.md ("Verification
// command") — keep the two in sync. Run AFTER `npm run build` (needs dist/).
//
// Usage: node tools/check-bundle-leak.mjs   (exit 1 if any leak, else 0)

import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Distinctive, server-only prompt fragments. Baseline in the client bundle is
// 0 for every one of these (verified 2026-06-17). If you intentionally add one
// to client-facing copy, move it OUT of this list — don't weaken the guard.
const CROWN_JEWEL_MARKERS = [
  'MarketMind by Zam',
  'DIRECTOR_CRITIQUE_PROTOCOL',
  'COMMON_RULES',
  'MRBEAST STRUCTURE',
  'TESTIMONIAL STRUCTURE',
  'SERVICES TESTIMONIAL 6-BEAT',
  'REAL ESTATE WALKTHROUGH 6-BEAT',
  'PHILIPPINE GROUND-TRUTH REALISM',
  'TEMU SUB-TYPE',
  'Godfather Offer',
  'Grand Slam',
  'Tripwire',
  'CCC FRAMEWORK',
  'STILL_FRAME_RULE',
  'APPEARANCE_LOCK_RULE',
  'BAG_ORIENTATION_RULE',
  'VIRAL VFX MENU',
];

const DIST = 'dist';

if (!existsSync(DIST)) {
  console.error(`[bundle-leak] ${DIST}/ not found — run \`npm run build\` first.`);
  process.exit(1);
}

/** Recursively collect every .js file under a directory. */
function jsFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...jsFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const files = jsFiles(DIST);
if (files.length === 0) {
  console.error(`[bundle-leak] no .js files under ${DIST}/ — did the build emit a bundle?`);
  process.exit(1);
}

const leaks = [];
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const marker of CROWN_JEWEL_MARKERS) {
    if (text.includes(marker)) leaks.push({ file, marker });
  }
}

if (leaks.length > 0) {
  console.error(
    `[bundle-leak] FAIL — crown-jewel prompt content leaked into the client bundle:`
  );
  for (const { file, marker } of leaks) {
    console.error(`  • "${marker}"  →  ${file}`);
  }
  console.error(
    `\nThese prompts must stay server-side (api/_lib/prompts.ts). A client import\n` +
      `re-exposes the moat. Remove the client-side reference, then rebuild.`
  );
  process.exit(1);
}

console.log(
  `[bundle-leak] OK — scanned ${files.length} bundle file(s), 0 crown-jewel markers found.`
);
