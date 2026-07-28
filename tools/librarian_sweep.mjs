#!/usr/bin/env node
// librarian_sweep.mjs — post-merge stale-doc sweep (the "librarian" verifier).
//
// The failure class this guards (agent_lessons 2026-06-27, recurred 3x on Expert Mode):
// a feature ships on a branch, the branch merges, but planning docs still say
// "not started" / "pending" and later mislead a fresh session. This tool is the
// deterministic half — it scans the doc corpus for lines that (a) mention terms
// derived from the merge's changed files/subject AND (b) carry a staleness marker.
// The agent (latent half) judges each hit and updates or tombstones the doc line.
//
// Usage:
//   node tools/librarian_sweep.mjs                    # sweep latest merge commit on HEAD
//   node tools/librarian_sweep.mjs --merge <sha>      # sweep a specific merge commit
//   node tools/librarian_sweep.mjs --range A..B       # sweep an arbitrary diff range
//   node tools/librarian_sweep.mjs --terms foo,bar    # add extra search terms
//
// Advisory only: always exits 0. Run after every merge to main, judge the hits, fix docs.

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

function git(...args) {
  return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim();
}

// ---- args ----
const argv = process.argv.slice(2);
function argVal(flag) {
  const i = argv.indexOf(flag);
  return i >= 0 ? argv[i + 1] : null;
}

let range = argVal('--range');
let subject = '';
if (!range) {
  const merge = argVal('--merge') || git('log', '--merges', '-1', '--format=%H');
  if (!merge) {
    console.log('librarian_sweep: no merge commit found and no --range given. Nothing to sweep.');
    process.exit(0);
  }
  range = `${merge}^1..${merge}`;
  subject = git('log', '-1', '--format=%s', merge);
}

// ---- derive search terms from changed files + merge subject ----
const STOPWORDS = new Set([
  'main', 'merge', 'branch', 'docs', 'index', 'test', 'tests', 'types', 'utils',
  'into', 'from', 'with', 'chore', 'feat', 'wip', 'claude', 'remote', 'tracking',
  'origin', 'pull', 'request', 'readme', 'skill', 'skills', 'workflows', 'components',
  'services', 'grifon', 'update', 'session', 'sessions',
  // generic repo vocabulary — matches everywhere, signals nothing
  'agent', 'agents', 'lessons', 'review', 'reviews', 'loop', 'loops', 'trial',
  'plan', 'plans', 'file', 'files', 'mode', 'video', 'image', 'script', 'scripts',
  'handoff', 'workflow', 'check', 'setup', 'spec', 'guide', 'notes', 'fixes',
]);

const changedFiles = git('diff', '--name-only', ...range.split('..').filter(Boolean))
  .split('\n').filter(Boolean);

const terms = new Set();
function addTokens(str) {
  // whole slug (e.g. "sol_advisory_review_trial") + individual tokens >= 4 chars
  const slug = str.toLowerCase().replace(/\.[a-z]+$/, '');
  if (slug.length >= 6 && !slug.includes(' ') && !STOPWORDS.has(slug)) terms.add(slug);
  for (const tok of slug.split(/[^a-z0-9]+/)) {
    if (tok.length >= 5 && !STOPWORDS.has(tok)) terms.add(tok);
  }
}
for (const f of changedFiles) addTokens(basename(f));
if (subject) addTokens(subject);
for (const extra of (argVal('--terms') || '').split(',').filter(Boolean)) {
  terms.add(extra.trim().toLowerCase());
}

if (terms.size === 0) {
  console.log(`librarian_sweep: no usable terms derived from ${range}. Nothing to sweep.`);
  process.exit(0);
}

// ---- corpus: the docs that can go stale ----
const corpus = ['CLAUDE.md', 'agent_lessons.md', 'UBIQUITOUS_LANGUAGE.md', 'DESIGN.md'];
for (const f of readdirSync(join(ROOT, 'workflows'))) {
  // handoff_* and *archive* are historical records — "pending" is correct as of their
  // date and must not be rewritten; only living planning docs can go stale.
  if (f.endsWith('.md') && !f.startsWith('handoff_') && !f.includes('archive')) {
    corpus.push(`workflows/${f}`);
  }
}
// git emits forward-slash paths; keep corpus paths forward-slash too so this Set matches
const freshlyTouched = new Set(changedFiles); // changed in the merge => fresh by definition

const STALE = /not (yet )?(started|built|shipped|wired|live)|unbuilt|pending|planned|parked|blocked|in flight|resume (trigger|state)|next session|to be built|\bTODO\b|\bWIP\b|\bHELD\b/i;

// ---- scan ----
const priority = []; // term + stale marker on the same line
const mentions = new Map(); // doc -> mention count (term only)

for (const doc of corpus) {
  if (freshlyTouched.has(doc)) continue;
  let lines;
  try {
    lines = readFileSync(join(ROOT, doc), 'utf8').split('\n');
  } catch {
    continue;
  }
  lines.forEach((line, i) => {
    const low = line.toLowerCase();
    const hit = [...terms].find((t) => low.includes(t));
    if (!hit) return;
    mentions.set(doc, (mentions.get(doc) || 0) + 1);
    if (STALE.test(line)) {
      priority.push({ doc, line: i + 1, term: hit, text: line.trim().slice(0, 160) });
    }
  });
}

// ---- report ----
console.log(`librarian_sweep — range ${range}`);
if (subject) console.log(`merge subject: ${subject}`);
console.log(`terms: ${[...terms].join(', ')}\n`);

if (priority.length) {
  console.log(`PRIORITY (${priority.length}) — feature term + staleness marker on the same line. Judge each: still true, or obsoleted by this merge?`);
  for (const p of priority.slice(0, 40)) {
    console.log(`  ${p.doc}:${p.line}  [${p.term}]  ${p.text}`);
  }
  if (priority.length > 40) console.log(`  ...and ${priority.length - 40} more (truncated)`);
} else {
  console.log('PRIORITY: none — no stale-marked lines mention this merge\'s terms.');
}

const mentioned = [...mentions.entries()].sort((a, b) => b[1] - a[1]);
if (mentioned.length) {
  console.log(`\nContext (docs mentioning these terms at all — skim if the merge changed their subject matter):`);
  for (const [doc, n] of mentioned.slice(0, 15)) console.log(`  ${doc}  (${n} lines)`);
}

console.log('\nNext: the agent judges PRIORITY hits and updates/tombstones stale doc lines. Advisory — exit 0.');
