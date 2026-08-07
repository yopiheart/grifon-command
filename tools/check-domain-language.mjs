#!/usr/bin/env node
// Ubiquitous-language drift guard.
//
// UBIQUITOUS_LANGUAGE.md declares hard domain disjoints — "Influencer ≠ Avatar. Two different
// concepts in two different modules; do not unify them" and "use Storyboard only for the wizard
// concept; use Cinematic Relay for the Cinematic Spec Studio output". Until now the ONLY thing
// enforcing them was an agent remembering to read a 202-line doc at session start. That is the
// probabilistic layer checking the probabilistic layer, and the doc's own "Flagged ambiguities"
// section exists because the drift already happened.
//
// This is the deterministic half. It encodes ONLY rules that are (a) stated in the doc as a hard
// disjoint, not a stylistic preference, and (b) verified to have real hits — a guard that fires on
// correct code gets ignored, and an ignored guard is worse than none.
//
// DELIBERATELY NOT ENCODED: the cross-module label rules (painPoint / marketPainPoint /
// bleedingNeck, audience / targetDemographic / dreamCustomer). Measured 2026-08-08 — every one of
// those labels already sits only in its canonical module, and the handful of cross-reads are
// legitimate projection plumbing (oneShotIntake mapping a report into wizard fields). A rule with
// no true positives is a false-positive generator. Revisit only if real drift appears.
//
// Tier: WARNING by default (exit 0) — same posture as funnels/*/scripts/lint-voice.mjs, which
// stayed advisory until Neil read the hits and decided which were true violations. Promote with
// --strict (exit 1) once the current hits are resolved, then wire into prebuild/CI.
//
// Usage:
//   node tools/check-domain-language.mjs            # report, always exit 0
//   node tools/check-domain-language.mjs --strict   # exit 1 if any violation
//
// Suppress a single verified-OK line with a trailing:  // domain-lint-ok: <reason>

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const STRICT = process.argv.includes('--strict');

const SCAN_DIRS = ['components', 'services', 'utils', 'api'];
const SCAN_EXT = /\.(ts|tsx)$/;
const SKIP_DIR = new Set(['node_modules', 'dist', '.git', '_fable5-recovered']);

/** Field names owned by an EXTERNAL shape (a report/provider payload), not by our naming. */
const EXTERNAL_FIELDS = [
  // MarketResearchReport.winningAvatar — the market-research domain's term for the ideal customer
  // profile. Unrelated to the wizard's on-camera Avatar; renaming it would break the report shape.
  'winningAvatar',
];

const rules = [
  {
    id: 'influencer-avatar-compound',
    doc: 'UBIQUITOUS_LANGUAGE.md → Flagged ambiguities → "Avatar" is overloaded',
    scope: () => true,
    // An identifier that fuses both concepts, e.g. generateInfluencerAvatar.
    pattern: /\b\w*Influencer[A-Za-z]*Avatar\w*\b|\b\w*Avatar[A-Za-z]*Influencer\w*\b/g,
    message: (hit) =>
      `"${hit}" fuses Influencer and Avatar into one identifier — the doc calls these two different concepts in two different modules. Prefer an Influencer-only name (e.g. generateInfluencerPersona).`,
  },
  {
    id: 'avatar-in-influencer-forge',
    doc: 'UBIQUITOUS_LANGUAGE.md → "never use \'Avatar\' inside Influencer Forge code, prompts, or UI copy — say Influencer"',
    scope: (file) => /InfluencerForge/.test(file),
    pattern: /\b\w*[Aa]vatar\w*\b/g,
    message: (hit) =>
      `"${hit}" uses Avatar vocabulary inside Influencer Forge — say Influencer / persona instead.`,
  },
  {
    id: 'storyboard-in-cinematic-studio',
    doc: 'UBIQUITOUS_LANGUAGE.md → "Use Storyboard only for the wizard concept; use Cinematic Relay for the Cinematic Spec Studio output"',
    scope: (file) => /CinematicSpecStudio/.test(file),
    pattern: /\b\w*[Ss]toryboard\w*\b/g,
    message: (hit) =>
      `"${hit}" calls a Cinematic Spec Studio output a Storyboard — that concept is the Cinematic Relay.`,
  },
];

/** Recursively collect scannable source files. */
const walk = (dir, out = []) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SCAN_EXT.test(name)) out.push(full);
  }
  return out;
};

const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
const findings = [];

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join('/');
  const applicable = rules.filter((r) => r.scope(rel));
  if (applicable.length === 0) continue;

  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes('domain-lint-ok:')) return;
    for (const rule of applicable) {
      for (const m of line.matchAll(rule.pattern)) {
        const hit = m[0];
        if (EXTERNAL_FIELDS.includes(hit)) continue;
        // The compound rule already reports fused identifiers — don't double-count them.
        if (rule.id === 'avatar-in-influencer-forge' && /Influencer/.test(hit)) continue;
        findings.push({ file: rel, line: i + 1, rule, hit, text: line.trim() });
      }
    }
  });
}

const label = STRICT ? 'FAIL' : 'WARN';

if (findings.length === 0) {
  console.log(`[domain-language] OK — scanned ${files.length} file(s), 0 drift hits.`);
  process.exit(0);
}

console.log(
  `[domain-language] ${label} — ${findings.length} drift hit(s) across ${files.length} scanned file(s):\n`
);

const byRule = new Map();
for (const f of findings) {
  if (!byRule.has(f.rule.id)) byRule.set(f.rule.id, []);
  byRule.get(f.rule.id).push(f);
}

for (const [id, hits] of byRule) {
  const { doc } = hits[0].rule;
  console.log(`  ${id}  (${hits.length})`);
  console.log(`    ${doc}`);
  for (const h of hits) {
    console.log(`    • ${h.file}:${h.line}  ${h.rule.message(h.hit)}`);
  }
  console.log('');
}

console.log(
  `Fix the name, or mark a verified-OK line with a trailing "// domain-lint-ok: <reason>".\n` +
    (STRICT
      ? ''
      : `Advisory tier — exit 0. Run with --strict once these are resolved to make drift a hard failure.`)
);

process.exit(STRICT ? 1 : 0);
