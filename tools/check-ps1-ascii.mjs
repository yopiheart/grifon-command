#!/usr/bin/env node
// Fail the build if any scripts/*.ps1 contains a non-ASCII byte.
//
// WHY THIS EXISTS (2026-08-16). `cafe-start.ps1` shipped with em dashes inside
// quoted strings. It parsed clean on PowerShell 7.4.6, which is what it was
// tested on. On Neil's cafe PC it did not run at all:
//
//   Warn "'code' not on PATH a€" open VS Code by hand at $repoPath"
//   The string is missing the terminator: ".
//
// Windows PowerShell 5.1 reads a BOM-less .ps1 as Windows-1252, not UTF-8. An
// em dash is E2 80 94 in UTF-8, and 0x94 decodes to a RIGHT DOUBLE QUOTE in
// 1252. Inside a quoted string that closes it early, and every brace after it
// fails to match, so the whole file dies with a cascade of parse errors.
//
// A BOM would also fix it, but pure ASCII is the stronger guarantee: it is
// correct under every encoding a shop PC might pick, and it is the same rule
// `finalize()` in tools/artifacts/_gates.mjs already enforces on artifact twins
// for exactly the same class of reason.
//
// Comments are NOT exempt. A mojibaked comment happens to be harmless today
// because `#` runs to end of line, but that is luck, not a property worth
// relying on, and it makes the file unreadable on the machine that matters.

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'scripts';
const NON_ASCII = /[^\x00-\x7F]/;

// The suggestions that actually come up. Anything else gets a generic hint.
const SUGGEST = {
  '—': '-', '–': '-', '‘': "'", '’': "'",
  '“': '"', '”': '"', '…': '...', '·': '-',
  '→': '->', '▶': '(match it with a regex, not a literal)',
  '─': '-', '×': 'x', '⚠': '!', '✓': 'OK', '✔': 'OK',
};

let failed = 0;

for (const name of readdirSync(DIR).filter((f) => f.endsWith('.ps1')).sort()) {
  const path = join(DIR, name);
  const lines = readFileSync(path, 'utf8').split('\n');

  lines.forEach((line, i) => {
    if (!NON_ASCII.test(line)) return;
    const bad = [...new Set([...line].filter((ch) => ch.charCodeAt(0) > 127))];
    failed++;
    console.error(`${path}:${i + 1}`);
    console.error(`  ${line.trim()}`);
    for (const ch of bad) {
      const cp = 'U+' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
      const fix = SUGGEST[ch] ?? 'replace with an ASCII equivalent';
      console.error(`  ${cp} -> ${fix}`);
    }
    console.error('');
  });
}

if (failed) {
  console.error(`FAIL: ${failed} line(s) in ${DIR}/*.ps1 are not pure ASCII.`);
  console.error('Windows PowerShell 5.1 reads these files as Windows-1252, so a');
  console.error('multi-byte character mojibakes and can terminate a string early.');
  console.error('That takes the whole script down, on the one machine it exists for.');
  process.exit(1);
}

console.log('OK: every scripts/*.ps1 is pure ASCII.');
