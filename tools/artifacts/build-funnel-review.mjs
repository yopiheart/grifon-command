#!/usr/bin/env node
// Rebuild the "Grifon Funnel Review" artifact page from committed sources.
//
// The page is pure text (no derived image assets), so the build is a verified
// copy: template in, standalone twin out at artifacts/grifon-funnel-review.html
// (the committed share mechanism — see CLAUDE.md → Artifact Reporting). Kept as
// a script anyway so every artifact follows one regeneration pattern and a
// future session can rebuild + redeploy without archaeology.
//
// Usage:  node tools/artifacts/build-funnel-review.mjs [--out <path>]
// Then:   publish the emitted HTML with the Artifact tool. If a URL for this
//         artifact is already registered in CLAUDE.md, pass it as `url` so the
//         page REDEPLOYS in place instead of minting a new URL.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TPL = join(REPO_ROOT, 'tools', 'artifacts', 'grifon-funnel-review.tpl.html');

const outFlag = process.argv.indexOf('--out');
const OUT = outFlag !== -1 && process.argv[outFlag + 1]
  ? resolve(process.argv[outFlag + 1])
  : join(REPO_ROOT, 'artifacts', 'grifon-funnel-review.html');

const html = readFileSync(TPL, 'utf8');

// Sanity gates: a truncated template must never ship silently.
const required = ['<title>', 'class="ground"', 'class="grain"', 'class="sig"', '</script>'];
const missing = required.filter((token) => !html.includes(token));
if (missing.length) {
  console.error(`BUILD_FAILED: template missing ${missing.join(', ')}`);
  process.exit(1);
}
if (/background-clip:\s*text/i.test(html)) {
  console.error('BUILD_FAILED: background-clip:text is banned in artifacts (Android WebView mispaints it)');
  process.exit(1);
}

writeFileSync(OUT, html, 'utf8');
console.log(`wrote ${OUT} (${Math.round(html.length / 1024)}KB)`);
