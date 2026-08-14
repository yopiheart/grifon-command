#!/usr/bin/env node
// branch_triage.mjs — the branch truth table.
//
// WHY THIS EXISTS
// ---------------
// CLAUDE.md warns three times, in three different sections, that a feature can be
// fully BUILT on a pushed feat/* branch while `main` and its planning doc both say
// "not started" — and records that the mistake recurred 3x on Expert Mode /
// Director's Cut. The SessionStart hook already prints the branch LIST for exactly
// that reason, and tools/artifacts/build-grifon-session.mjs renders the same list
// on the dashboard. Neither answers the question that actually prevents the
// mistake:
//
//     Is this branch's work already in main, or is it real unmerged work?
//
// A list of 29 refs cannot be read in a useful amount of time, so it gets skimmed,
// and skimming is what produced the mistake. This tool replaces the skim with a
// fixed-width truth table: one row per branch, one verdict per row, readable in
// seconds. That shape is deliberate (Boris Cherny's maintenance routines post a
// "repro and truth table" to every PR for the same reason) and it is the same
// lesson workflows/loops.md keeps relearning from the reader side: a verifier is
// only as good as how fast a human can read its output.
//
// READ-ONLY BY CONSTRUCTION. This tool never deletes a branch, never pushes, never
// checks anything out, never writes to the object store. `merge-tree --write-tree`
// writes a tree object to the odb and prints its oid; it does not move a ref, and
// unreferenced trees are reaped by gc. Every other command here is a query. The
// DELETE verdict is a RECOMMENDATION for Neil — deleting a remote branch is
// irreversible-ish and stays a human call.
//
// USAGE
//   node tools/branch_triage.mjs                 # all origin/* refs ahead of main
//   node tools/branch_triage.mjs --stale=45      # age threshold in days (default 45)
//   node tools/branch_triage.mjs --json          # machine-readable, for a routine
//   node tools/branch_triage.mjs --fetch         # git fetch --prune first (network)
//
// EXIT CODES
//   0  ran clean
//   1  a git command failed (nothing was changed; the repo is untouched)

import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const asJson = argv.includes('--json');
const doFetch = argv.includes('--fetch');
const STALE_DAYS = Number((argv.find(a => a.startsWith('--stale=')) || '--stale=45').split('=')[1]);

// TUNED files — CLAUDE.md forbids editing their prompt/schema content without
// explicit approval. A branch touching either can never get an automated verdict
// stronger than "a human reads this".
const TUNED = ['services/geminiService.ts', 'api/_lib/prompts.ts'];

const BASE = 'origin/main';

// A path is "doc churn" if merging it is an editorial call rather than an
// engineering one. workflows/ is included because it is markdown SOPs by
// definition (see the WAT framework: workflows/ = markdown, tools/ = code).
const isDoc = p => /\.(md|txt)$/i.test(p) || p.startsWith('workflows/');
const isCode = p => !isDoc(p);

function git(...args) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    windowsHide: true,
  }).trim();
}

// Some plumbing signals failure through the exit code (merge-tree returns non-zero
// on conflict, which is the ANSWER, not an error). This captures both halves.
function gitSoft(...args) {
  try {
    return { ok: true, out: git(...args) };
  } catch (e) {
    return { ok: false, out: String(e.stdout ?? '') + String(e.stderr ?? '') };
  }
}

function listBranches() {
  const raw = git(
    'for-each-ref',
    '--format=%(refname:short)%09%(committerdate:iso8601)%09%(authorname)',
    'refs/remotes/origin',
  );
  return raw
    .split('\n')
    .filter(Boolean)
    .map(line => {
      const [ref, date, author] = line.split('\t');
      return { ref, date, author };
    })
    .filter(b => b.ref !== BASE && !b.ref.endsWith('/HEAD'));
}

function daysSince(iso) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

// git cherry marks each commit on the branch:
//   '-' = an equivalent patch is ALREADY in main (cherry-picked, squashed, or
//         re-authored) — this is the signal a plain `rev-list --count` cannot see
//   '+' = genuinely absent from main
// A branch whose commits are all '-' is duplicate work, however scary its +N looks.
function cherryState(ref) {
  const r = gitSoft('cherry', BASE, ref);
  if (!r.ok) return { dup: 0, novel: 0, unknown: true };
  const lines = r.out.split('\n').filter(Boolean);
  return {
    dup: lines.filter(l => l.startsWith('-')).length,
    novel: lines.filter(l => l.startsWith('+')).length,
    unknown: false,
  };
}

// Conflict detection with zero working-tree impact. --write-tree exits non-zero and
// lists conflicted paths when the merge would not be clean.
function mergeState(ref) {
  const r = gitSoft('merge-tree', '--write-tree', '--name-only', BASE, ref);
  if (r.ok) return { clean: true, conflicts: [] };
  const conflicts = r.out
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !/^[0-9a-f]{40}$/.test(l) && !/^(CONFLICT|Auto-merging|warning:|error:)/i.test(l));
  return { clean: false, conflicts };
}

function filesChanged(ref) {
  const r = gitSoft('diff', '--name-only', `${BASE}...${ref}`);
  return r.ok ? r.out.split('\n').filter(Boolean) : [];
}

// Lines present on the branch that are absent from main RIGHT NOW (two-dot diff,
// main -> branch: '+' means the branch has it and main does not).
//
// This exists because `git cherry` alone over-claims. On 2026-08-15 all four
// cherry-equivalent branches ALSO carried branch-only lines. Every one turned out
// to be a SUPERSEDED older form — main had refactored past it (the regression
// test's inline generateContent call became a helper; grill-me's description was
// rewritten) — so nothing was actually lost. But the tool cannot prove "older
// form" from patch data, and a bare DELETE verdict would have been asking the
// reader to trust a claim the table never showed. So: zero unique lines earns
// DELETE, and any unique lines earn SUPERSEDED plus the command to eyeball them.
// Never let a verdict outrun its evidence.
function uniqueLines(ref, paths) {
  // Scoped to the files the branch actually touched. Diffing the whole tree is
  // both slower and wrong for this question: main's unrelated churn is not
  // "branch-only work".
  if (!paths || !paths.length) return 0;
  const r = gitSoft('diff', '--numstat', BASE, ref, '--', ...paths);
  if (!r.ok) return null;
  let added = 0;
  for (const line of r.out.split('\n').filter(Boolean)) {
    const [a] = line.split('\t');
    if (a !== '-') added += Number(a) || 0;
  }
  return added;
}

function subjectOf(ref) {
  const r = gitSoft('log', '-1', '--format=%s', ref);
  return r.ok ? r.out : '';
}

function verdictFor(b) {
  // Order matters: each rung assumes the ones above it were ruled out.
  if (!b.novel && b.dup) {
    return b.uniq
      ? { code: 'SUPERSEDED', why: `work is in main; ${b.uniq} branch-only line(s) to eyeball first` }
      : { code: 'DELETE', why: 'every commit in main AND zero branch-only lines' };
  }
  if (b.unknown) return { code: 'INSPECT', why: 'git cherry could not compare (unrelated history?)' };
  if (b.touchesTuned) return { code: 'TUNED', why: 'touches a TUNED file — human approval required' };
  if (!b.clean) {
    // The distinction that makes this pile tractable. Measured 2026-08-15 across
    // all 29 branches: the top conflict sources are CLAUDE.md (11),
    // post_beta_roadmap.md (7) and agent_lessons.md (6) — files EVERY session
    // appends to. Actual code collisions were App.tsx (3) and Step5Storyboard.tsx
    // (2). So "20 conflicts" massively overstates the work: most are doc churn,
    // where the resolution is "keep both paragraphs", not a real merge.
    return b.conflictsAreDocsOnly
      ? { code: 'CONFLICT-DOC', why: `${b.conflicts.length} path(s), all doc churn — usually "keep both"` }
      : { code: 'CONFLICT-CODE', why: `code conflict: ${b.conflicts.filter(isCode).join(', ')}` };
  }
  if (b.docsOnly) return { code: 'MERGE-DOCS', why: 'clean + docs/markdown only — lowest-risk merge' };
  if (b.ageDays > STALE_DAYS) return { code: 'STALE', why: `clean but ${b.ageDays}d old — re-verify before merging` };
  return { code: 'MERGE', why: 'clean merge, real code changes' };
}

function pad(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n - 1) + '…' : s.padEnd(n);
}
function padL(s, n) {
  s = String(s);
  return s.length > n ? s.slice(0, n) : s.padStart(n);
}

// ------------------------------------------------------------------ main
if (doFetch) {
  process.stderr.write('fetching origin (network)...\n');
  git('fetch', '--prune', 'origin');
}

const rows = [];
for (const b of listBranches()) {
  const ahead = Number(git('rev-list', '--count', `${BASE}..${b.ref}`));
  if (!ahead) continue; // fully merged the ordinary way; nothing to triage

  const cherry = cherryState(b.ref);
  const merge = mergeState(b.ref);
  const files = filesChanged(b.ref);
  const codeFiles = files.filter(isCode);

  const row = {
    ref: b.ref.replace(/^origin\//, ''),
    ageDays: daysSince(b.date),
    ahead,
    dup: cherry.dup,
    novel: cherry.novel,
    unknown: cherry.unknown,
    clean: merge.clean,
    conflicts: merge.conflicts,
    // Lazy on purpose: a whole-tree numstat against 29 refs blew a 120s budget on
    // 2026-08-15. The number only changes a verdict for cherry-equivalent branches,
    // so it is computed for those rows and nothing else.
    uniq: cherry.dup && !cherry.novel ? (uniqueLines(b.ref, files) ?? 0) : 0,
    conflictsAreDocsOnly: merge.conflicts.length > 0 && merge.conflicts.every(isDoc),
    files: files.length,
    docsOnly: files.length > 0 && codeFiles.length === 0,
    touchesTuned: files.some(f => TUNED.includes(f)),
    subject: subjectOf(b.ref),
  };
  row.verdict = verdictFor(row);
  rows.push(row);
}

rows.sort((a, b) => {
  const rank = {
    DELETE: 0, SUPERSEDED: 1, TUNED: 2, 'CONFLICT-CODE': 3, 'CONFLICT-DOC': 4,
    MERGE: 5, 'MERGE-DOCS': 6, STALE: 7, INSPECT: 8,
  };
  return (rank[a.verdict.code] - rank[b.verdict.code]) || (a.ageDays - b.ageDays);
});

if (asJson) {
  console.log(JSON.stringify({ base: BASE, staleDays: STALE_DAYS, generated: new Date().toISOString(), rows }, null, 2));
  process.exit(0);
}

const tally = rows.reduce((m, r) => ((m[r.verdict.code] = (m[r.verdict.code] || 0) + 1), m), {});
const headline = Object.entries(tally).map(([k, v]) => `${v} ${k}`).join(' / ') || 'nothing ahead of main';

console.log('');
console.log(`[BRANCH TRIAGE] ${rows.length} ahead of ${BASE} — ${headline}`);
console.log(`stale threshold ${STALE_DAYS}d · read-only · DELETE is a recommendation, not an action`);
console.log('');
console.log(
  pad('BRANCH', 40) + padL('AGE', 5) + padL('+N', 5) + padL('DUP', 5) +
  padL('NEW', 5) + padL('UNIQ', 6) + '  ' + pad('MERGE', 12) + pad('VERDICT', 15) + 'WHY',
);
console.log('-'.repeat(140));
for (const r of rows) {
  console.log(
    pad(r.ref, 40) +
    padL(r.ageDays + 'd', 5) +
    padL('+' + r.ahead, 5) +
    padL(r.dup || '·', 5) +
    padL(r.novel || '·', 5) +
    padL(r.uniq || '·', 6) + '  ' +
    pad(r.clean ? 'clean' : `${r.conflicts.length} conflict`, 12) +
    pad(r.verdict.code, 15) +
    r.verdict.why,
  );
}
console.log('');
console.log('DUP = commits already equivalent in main · NEW = commits main lacks');
console.log('UNIQ = lines the branch has that main does not (a SUPERSEDED row needs these eyeballed)');
console.log('');

// The DELETE list is the payoff: these are branches whose work is already in main,
// so nothing is lost by removing them. Printed as a paste-ready command, NOT run.
const dead = rows.filter(r => r.verdict.code === 'DELETE');
if (dead.length) {
  console.log(`${dead.length} branch(es) carry NO work missing from main, proven twice over. Paste-ready (Neil's call):`);
  console.log(`  git push origin ${dead.map(d => '--delete ' + d.ref).join(' ')}`);
  console.log('');
}

const superseded = rows.filter(r => r.verdict.code === 'SUPERSEDED');
if (superseded.length) {
  console.log(`${superseded.length} branch(es) are cherry-equivalent to main but still hold branch-only lines.`);
  console.log('Almost always an older form main has refactored past. Confirm, THEN reuse the delete command above:');
  for (const s of superseded) {
    console.log(`  git diff ${BASE} origin/${s.ref}   # ${s.uniq} line(s) — ${s.subject}`);
  }
  console.log('');
}
const tuned = rows.filter(r => r.verdict.code === 'TUNED');
if (tuned.length) {
  console.log(`⚠ ${tuned.length} branch(es) touch a TUNED file — never merge without explicit approval:`);
  for (const t of tuned) console.log(`  ${t.ref}  — ${t.subject}`);
  console.log('');
}
