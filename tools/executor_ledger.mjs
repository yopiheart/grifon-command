#!/usr/bin/env node
/**
 * executor_ledger.mjs — which executor lane wrote which commit, and how often that lane
 * needed a follow-up fix.
 *
 * Why this exists: Grifon runs three executor lanes (`codex-sol` via the Codex CLI,
 * `code-executor` on Opus 5, and the main loop). `workflows/codex_executor_trial.md`
 * adopted the Sol lane on 3 logged tasks but recorded a caveat: the "on par or better"
 * verdicts were scored against the **Opus 4.8** baseline, and `code-executor` now runs
 * Opus 5. Watching whether the balance flips needs data, and until 2026-08-02 there was
 * none — nothing durable recorded which lane produced which diff, so the reopen-the-gate
 * decision would have run on memory. Memory does not survive the cafe-PC defreezer;
 * git does.
 *
 * The convention (see CLAUDE.md): the main loop stamps a trailer when it commits a
 * reviewed executor diff.
 *
 *     Executor: codex-sol | code-executor | main-loop
 *
 * The follow-up-fix rate is the quality proxy the trial actually needs: a lane whose
 * diffs get patched a few commits later by a `fix(`/`revert` touching the same files is
 * costing review burden, which is exactly the DROP criterion in the trial doc. It is a
 * signal, not a verdict — a low n means very little, and the repo's own ≥3-corroboration
 * bar applies here too.
 *
 * Usage:
 *   node tools/executor_ledger.mjs                     # whole history
 *   node tools/executor_ledger.mjs --since=2026-07-24  # since Opus 5 became the baseline
 *   node tools/executor_ledger.mjs --window=5          # follow-up lookahead (default 5)
 *   node tools/executor_ledger.mjs --json
 */

import { execFileSync } from 'node:child_process';

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const asJson = args.includes('--json');
const window = Number(arg('window', 5));
const since = arg('since', null);

const UNTAGGED = '(untagged)';
const REC = '\x01';
const SEP = '\x1f';

const gitArgs = ['log', '--numstat', `--format=${REC}%H${SEP}%s${SEP}%b${SEP}`];
if (since) gitArgs.push(`--since=${since}`);

let raw;
try {
  raw = execFileSync('git', gitArgs, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
} catch (err) {
  console.error(`executor_ledger: git log failed — ${err.message}`);
  process.exit(1);
}

// Newest-first. Index 0 is the most recent commit.
const commits = raw
  .split(REC)
  .filter((chunk) => chunk.trim())
  .map((chunk) => {
    const [sha = '', subject = '', body = '', stats = ''] = chunk.split(SEP);
    const files = [];
    let added = 0;
    let deleted = 0;
    for (const line of stats.split('\n')) {
      const m = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
      if (!m) continue;
      // Binary files report '-' for both counts.
      if (m[1] !== '-') added += Number(m[1]);
      if (m[2] !== '-') deleted += Number(m[2]);
      files.push(m[3]);
    }
    const trailer = body.match(/^[ \t]*Executor:[ \t]*([^\s].*?)[ \t]*$/im);
    return {
      sha: sha.trim().slice(0, 7),
      subject: subject.trim(),
      lane: trailer ? trailer[1].trim() : UNTAGGED,
      files,
      added,
      deleted,
    };
  });

if (!commits.length) {
  console.error('executor_ledger: no commits matched.');
  process.exit(1);
}

// A commit is "followed up" when a later commit (chronologically — i.e. a LOWER index in
// this newest-first list) within `window` is a fix/revert touching a file it also touched.
const isFixup = (c) => /^(fix|revert)\b|^Revert\b/i.test(c.subject);
for (let i = 0; i < commits.length; i++) {
  const c = commits[i];
  const own = new Set(c.files);
  c.followedUp = false;
  for (let j = Math.max(0, i - window); j < i; j++) {
    const later = commits[j];
    if (!isFixup(later)) continue;
    if (later.files.some((f) => own.has(f))) {
      c.followedUp = true;
      c.followedUpBy = `${later.sha} ${later.subject}`;
      break;
    }
  }
}

const lanes = new Map();
for (const c of commits) {
  if (!lanes.has(c.lane)) {
    lanes.set(c.lane, { lane: c.lane, commits: 0, added: 0, deleted: 0, files: 0, followedUp: 0, examples: [] });
  }
  const l = lanes.get(c.lane);
  l.commits++;
  l.added += c.added;
  l.deleted += c.deleted;
  l.files += c.files.length;
  if (c.followedUp) {
    l.followedUp++;
    if (l.examples.length < 3) l.examples.push(`${c.sha} ${c.subject}  ->  ${c.followedUpBy}`);
  }
}

const rows = [...lanes.values()].sort((a, b) => b.commits - a.commits);
const tagged = commits.filter((c) => c.lane !== UNTAGGED).length;

if (asJson) {
  console.log(JSON.stringify({ since, window, total: commits.length, tagged, lanes: rows }, null, 2));
  process.exit(0);
}

const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(0)}%` : '—');
const pad = (s, w) => String(s).padEnd(w);

console.log(`\nEXECUTOR LEDGER${since ? `  (since ${since})` : ''}`);
console.log(`${commits.length} commits scanned · ${tagged} carry an Executor trailer (${pct(tagged, commits.length)} coverage) · follow-up window ${window}\n`);
console.log(`${pad('LANE', 18)}${pad('COMMITS', 9)}${pad('FILES', 7)}${pad('+LINES', 9)}${pad('-LINES', 9)}FOLLOW-UP FIX`);
console.log('-'.repeat(70));
for (const r of rows) {
  console.log(
    pad(r.lane, 18) + pad(r.commits, 9) + pad(r.files, 7) + pad(`+${r.added}`, 9) + pad(`-${r.deleted}`, 9) +
    `${r.followedUp}/${r.commits} (${pct(r.followedUp, r.commits)})`
  );
}

if (tagged === 0) {
  console.log(`\nNo Executor trailers found yet — the convention starts at the next executor commit.`);
  console.log(`Stamp reviewed executor diffs with:  Executor: codex-sol | code-executor | main-loop`);
} else if (tagged < 6) {
  console.log(`\nOnly ${tagged} tagged commit(s). Below the repo's >=3-per-lane corroboration bar — read as anecdote, not signal.`);
}

const withExamples = rows.filter((r) => r.examples.length && r.lane !== UNTAGGED);
if (withExamples.length) {
  console.log('\nFOLLOW-UP FIXES (candidate review-burden signal):');
  for (const r of withExamples) {
    console.log(`  ${r.lane}:`);
    for (const e of r.examples) console.log(`    ${e}`);
  }
}
console.log('');
