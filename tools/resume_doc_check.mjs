#!/usr/bin/env node
// resume_doc_check.mjs — the retrieval verifier (companion to librarian_sweep.mjs).
//
// The failure class this guards (agent_lessons 2026-08-01): the repo's LIBRARY was
// always fine — 120+ workflow docs, 25k lines. RETRIEVAL was what rotted. A doc that
// answered both "what's outstanding" and "what do I do next" grew dated CURRENT/PREVIOUS
// blocks until the live content sat *below* a "this file is two weeks stale" warning,
// and three separate files each claimed to be "the single resume doc". A fresh session
// then spent its first and smartest tokens chasing pointers instead of working.
//
// NOW.md fixed that once. This tool is why it stays fixed: the rule is a verifier, not
// a prose convention nobody re-reads (CLAUDE.md: "prefer encoding the lesson as a
// verifier over prose"). librarian_sweep asks "did a merge make a doc lie?"; this asks
// "can a fresh session still find its next action in one hop?"
//
// Checks:
//   1. NOW.md exists, is one screen, and has a parseable stamp + a ▶ NEXT ACTION section
//      (the SessionStart hook greps for that heading — if it moves, the hook silently
//      prints nothing, which is the worst failure mode: a gate that looks armed).
//   2. NOW.md is not BEHIND the work — stamp vs. last commit date, plus anchor-commit drift.
//   3. NOW.md has not regrown append-rot (CURRENT/PREVIOUS blocks). It is overwritten, never
//      appended — that growth pattern is precisely what killed the last resume doc.
//   4. NOW.md is the SOLE claimant — no other doc asserts primacy as "the resume doc".
//
// Usage:
//   node tools/resume_doc_check.mjs            # advisory, always exits 0
//   node tools/resume_doc_check.mjs --strict   # exits 1 on any FAIL (for hooks / CI)
//   node tools/resume_doc_check.mjs --quiet    # print only FAIL/WARN lines

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const argv = process.argv.slice(2);
const STRICT = argv.includes('--strict');
const QUIET = argv.includes('--quiet');

const MAX_LINES = 90;        // "one screen" — generous; NOW.md sits ~76
const STALE_AFTER_DAYS = 5;  // NOW.md's own freshness contract

function git(...args) {
  try {
    return execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

const fails = [];
const warns = [];
const passes = [];
const infos = []; // never actionable — shown in full output only, so --quiet stays silent
                  // when healthy. A verifier that prints unactionable noise every session
                  // trains everyone to ignore it, which is how the last convention died.
const fail = (m) => fails.push(m);
const warn = (m) => warns.push(m);
const pass = (m) => passes.push(m);
const info = (m) => infos.push(m);

// ── 1. NOW.md exists + is structurally sound ─────────────────────────────────
const NOW_PATH = join(ROOT, 'NOW.md');
if (!existsSync(NOW_PATH)) {
  fail('NOW.md is MISSING. It is the single resume doc — rebuild it from `git log --oneline -15` + open issues before starting work.');
  report();
}

const nowRaw = readFileSync(NOW_PATH, 'utf8');
const nowLines = nowRaw.split('\n');

if (nowLines.length > MAX_LINES) {
  fail(`NOW.md is ${nowLines.length} lines (max ${MAX_LINES}). It is a one-screen pointer, not a ledger — move detail into the workflow docs it links to.`);
} else {
  pass(`NOW.md is ${nowLines.length} lines (within the ${MAX_LINES}-line one-screen budget).`);
}

if (!/^## ▶ NEXT ACTION/m.test(nowRaw)) {
  fail('NOW.md has no `## ▶ NEXT ACTION` heading — the SessionStart hook greps for that exact string and will silently print nothing without it (an armed-looking gate that does nothing).');
} else {
  pass('NOW.md has its `## ▶ NEXT ACTION` section (the SessionStart hook can find it).');
}

// ── 2. Freshness: stamp + anchor drift ───────────────────────────────────────
const stampMatch = nowRaw.match(/^\*\*Stamped:\s*(\d{4}-\d{2}-\d{2})/m);
if (!stampMatch) {
  fail('NOW.md has no parseable `**Stamped: YYYY-MM-DD**` line — the freshness contract and the SessionStart staleness warning both depend on it.');
} else {
  const stamp = stampMatch[1];
  const lastCommitDate = git('log', '-1', '--format=%cs');
  const ageDays = Math.floor((Date.now() - Date.parse(`${stamp}T00:00:00Z`)) / 86_400_000);

  if (lastCommitDate && lastCommitDate > stamp) {
    const behind = git('rev-list', '--count', 'HEAD', `--after=${stamp}T23:59:59`);
    fail(`NOW.md is BEHIND THE WORK — stamped ${stamp}, but the newest commit is ${lastCommitDate}${behind ? ` (${behind} commit(s) since)` : ''}. Rewriting NOW.md is the last action of any session that changed the state of the work.`);
  } else if (ageDays > STALE_AFTER_DAYS) {
    warn(`NOW.md is ${ageDays} days old (contract: ${STALE_AFTER_DAYS}). No commits since, so it may still be true — but re-verify against \`git log\` before trusting it.`);
  } else {
    pass(`NOW.md stamp ${stamp} is current with the last commit (${lastCommitDate || 'n/a'}).`);
  }

  const anchor = (nowRaw.match(/Anchor commit:\s*`?([0-9a-f]{7,40})`?/i) || [])[1];
  if (anchor) {
    const known = git('cat-file', '-t', anchor) === 'commit';
    if (!known) {
      warn(`NOW.md names anchor commit ${anchor}, which this clone does not have. Re-anchor it to a commit on main.`);
    } else {
      const drift = git('rev-list', '--count', `${anchor}..HEAD`);
      if (drift && Number(drift) > 0) {
        warn(`NOW.md's anchor commit ${anchor} is ${drift} commit(s) behind HEAD — re-stamp when you rewrite it.`);
      } else {
        pass(`NOW.md's anchor commit ${anchor} is current with HEAD.`);
      }
    }
  }
}

// ── 3. Append-rot: NOW.md must be overwritten, never appended ────────────────
const ROT = /^\s*>?\s*\*{0,2}\s*(?:⏭\s*)?(CURRENT|PREVIOUS|SUPERSEDED)\b/i;
const rotHits = nowLines
  .map((l, i) => ({ n: i + 1, l }))
  .filter(({ l }) => ROT.test(l));
if (rotHits.length) {
  fail(`NOW.md has regrown dated append-blocks at line(s) ${rotHits.map((h) => h.n).join(', ')} (${rotHits[0].l.trim().slice(0, 60)}...). Overwrite it — history is \`git log\`'s job. This growth pattern is exactly what killed the previous resume doc.`);
} else {
  pass('NOW.md has no CURRENT/PREVIOUS append-rot (still overwrite-only).');
}

// ── 4. Sole claimant ─────────────────────────────────────────────────────────
// Primacy claims only. A SCOPED claim — "the resume doc FOR the build session" — is
// legitimate and must not fire: a verifier that cries wolf gets ignored, which is how the
// last convention died. So STRONG wording (an explicit uniqueness word) always counts,
// while WEAK wording counts only when nothing scopes it to one workstream.
const STRONG = /(single resume doc|the live resume doc|the only resume doc)/i;
const WEAK = /(the resume doc is|is the resume doc)/i;
const SCOPED = /resume doc for\b/i;
const isPrimacyClaim = (line) => STRONG.test(line) || (WEAK.test(line) && !SCOPED.test(line));
// A file that announces its own supersession up top cannot be a competing claimant;
// its dated inner blocks are history, reported as WARN rather than FAIL.
const EXEMPT = /superseded|no longer the resume doc|not the resume doc|scoreboard, not the resume/i;

const corpus = ['CLAUDE.md', 'agent_lessons.md', 'README.md'];
const wdir = join(ROOT, 'workflows');
if (existsSync(wdir)) {
  for (const f of readdirSync(wdir)) {
    if (f.endsWith('.md') && !f.includes('archive')) corpus.push(`workflows/${f}`);
  }
}

let claimants = 0;
for (const doc of corpus) {
  let lines;
  try {
    lines = readFileSync(join(ROOT, doc), 'utf8').split('\n');
  } catch {
    continue;
  }
  const exempt = EXEMPT.test(lines.slice(0, 15).join('\n'));
  lines.forEach((line, i) => {
    if (!isPrimacyClaim(line)) return;
    if (/NOW\.md/i.test(line)) return; // points AT the real resume doc — correct
    const where = `${doc}:${i + 1}  ${line.trim().slice(0, 100)}`;
    if (exempt) {
      info(`Historical resume-doc claim inside a superseded/scoreboard doc (history, not a competing pointer): ${where}`);
    } else {
      claimants++;
      fail(`COMPETING RESUME-DOC CLAIM — ${where}\n      Only NOW.md may claim primacy. Mark this file superseded, or point the line at NOW.md.`);
    }
  });
}
if (!claimants) pass('NOW.md is the sole resume-doc claimant (no competing primacy claims).');

report();

// ── report ───────────────────────────────────────────────────────────────────
function report() {
  if (!QUIET) {
    console.log('resume_doc_check — can a fresh session find its next action in one hop?\n');
    for (const p of passes) console.log(`  PASS  ${p}`);
    if (infos.length) {
      console.log('');
      for (const i of infos) console.log(`  info  ${i}`);
    }
    if ((passes.length || infos.length) && (warns.length || fails.length)) console.log('');
  }
  for (const w of warns) console.log(`  WARN  ${w}`);
  for (const f of fails) console.log(`  FAIL  ${f}`);

  if (fails.length) {
    console.log(`\n${fails.length} FAIL(ed) check(s). Fix NOW.md (overwrite, never append), then re-run.`);
    process.exit(STRICT ? 1 : 0);
  }
  if (!QUIET) console.log(`\nAll checks passed${warns.length ? ` (${warns.length} warning(s))` : ''}. Retrieval is one hop.`);
  process.exit(0);
}
