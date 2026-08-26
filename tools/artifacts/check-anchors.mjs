#!/usr/bin/env node
/**
 * check-anchors.mjs - rebuild every anchor-based artifact and fail if a committed
 * twin moved. Run by `npm run check:artifact-anchors`, and by the `artifacts` job
 * in .github/workflows/ci.yml on every PR (loops.md Tier 0d).
 *
 * WHY A SCRIPT AND NOT A ONE-LINER IN package.json
 * ------------------------------------------------
 * The one-liner it replaces was
 *
 *     node tools/artifacts/build-eli5-image-gate.mjs && git diff --exit-code artifacts/...
 *
 * and it had a bug that made the most important run the one that lied. Bare
 * `git diff` compares the INDEX against the WORKING TREE. The builder writes the
 * twin before the diff runs, so once the twin is staged the rebuild reproduces the
 * staged bytes and the check exits 0 no matter what moved.
 *
 * Reproduced 2026-08-26: insert a line above `if (deps.checkSceneImage) {`, run the
 * check (exit 1, correct), `git add` the rewritten twin, run it again -> exit 0. A
 * dev doing `git add -A` then re-running as a pre-commit sanity pass gets a green
 * light on a citation that silently changed. That is the exact outcome Tier 0d
 * exists to prevent.
 *
 * So the comparison here is against HEAD, which sees staged changes too.
 *
 * The second reason for a file: package.json cannot carry a comment, and the
 * registry below needs one. `check:artifact-anchors` reads as repo-wide but covers
 * only what is listed here, so the list and the rule for joining it live together.
 */

import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..');

/**
 * Every anchor-based artifact. To add one:
 *
 *   1. COMMIT THE TWIN in the same change. An untracked twin used to diff clean and
 *      print "unchanged" forever; there is now a tracked-check below that fails loudly
 *      instead, but the twin still has to exist in HEAD for any of this to mean anything.
 *   2. ⛔ It must need NO npm dependencies and NO git history.
 *
 * That is not style, it is what keeps this job able to gate every PR: the CI job
 * runs no `npm ci` and uses a default shallow checkout. A builder needing `sharp`
 * or funnel fonts (build-gb-001-brief.mjs) would fail here on a missing dependency
 * and redden unrelated PRs. A builder reading git history (an earlier draft of the
 * eli5 one stamped a `git log` date) would need fetch-depth: 0 on a ~1.5 GB repo
 * AND would fire on any commit to a cited file, not just a moved call site.
 * Both traps are written up in loops.md Tier 0d.
 */
const ANCHORED = [
  { builder: 'build-eli5-image-gate.mjs', twin: 'artifacts/eli5-image-gate.html' },
];

let failed = false;

for (const { builder, twin } of ANCHORED) {
  process.stdout.write(`\n${builder}\n`);
  try {
    execFileSync(process.execPath, [resolve(HERE, builder)], { cwd: ROOT, stdio: 'inherit' });
  } catch {
    // Do NOT attribute this to the anchors. The builder throws for at least four
    // non-anchor reasons too: a finalize() gate throw (non-ASCII inside <style>, a
    // missing `required` substring, a surviving __TOKEN__, a banned CSS property), a
    // missing/renamed builder, a syntax error, or ENOENT on a cited source file.
    // Saying "an anchor is gone" would send someone to reread producerOrchestrator.ts
    // for a call site that never moved -- the same confident-answer-narrower-than-the-
    // evidence bug the diff handler below was rewritten to remove. It survived here
    // until the PR #118 reviewer spotted the inconsistency between the two branches.
    // stdio:'inherit' above already printed the builder's real error; point at it.
    console.error(`\n  The builder for ${twin} FAILED - its own error is printed above.`);
    console.error('  If it names a missing or ambiguous ANCHOR, reread the code before');
    console.error('  re-anchoring: the page may describe behaviour that no longer exists.');
    failed = true;
    continue;
  }

  // TRACKED first. `git diff HEAD` cannot see a path that is absent from HEAD, so an
  // UNTRACKED twin diffs clean and prints "unchanged" - the same false green as the
  // staged-twin bug one step further out. Live trap for the next ANCHORED entry: commit
  // the builder, forget `git add artifacts/foo.html`, and CI reports an anchored artifact
  // with no committed twin at all, quietly breaking the twin rule in CLAUDE.md.
  // Confirmed 2026-08-26: untracked file present -> `git diff HEAD --exit-code` exits 0,
  // `git ls-files --error-unmatch` exits 1. Found by the PR #118 reviewer.
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', '--', twin], { cwd: ROOT, stdio: 'pipe' });
  } catch (err) {
    // Same rule as the diff below: let git say why. `ls-files` fails BOTH for an
    // untracked path and for "not a git repository", and telling someone to run
    // `git add` when the real problem is a missing .git is just a different confident
    // wrong answer. Measured 2026-08-26 - that is exactly what the first draft did.
    // ENOENT first: a spawn failure (no `git` on PATH) has no stderr at all, and the
    // `|| !stderr` fallback below would have called that "NOT TRACKED - run git add",
    // for a problem git cannot fix because git is not there. Deciding by absence is the
    // exact habit the diff handler further down was rewritten to drop; this branch was
    // still doing it. Caught by the PR #118 reviewer.
    if (err?.code === 'ENOENT') {
      console.error('\n  git is not on PATH - this check needs it.');
      console.error(`  Nothing has been determined about ${twin}.`);
      failed = true;
      continue;
    }
    const stderr = String(err?.stderr ?? '').trim();
    if (/did not match any file/i.test(stderr) || !stderr) {
      console.error(`\n  ${twin} is NOT TRACKED by git.`);
      console.error('  An anchored artifact must have its twin committed, or this check is blind');
      console.error(`  to it forever. Run: git add ${twin}`);
    } else {
      console.error(`\n  git said: ${stderr}`);
      console.error(`  Could not determine whether ${twin} is tracked. This is a git failure,`);
      console.error('  not a verdict about the artifact.');
    }
    failed = true;
    continue;
  }

  // SPARSE-EXCLUDED twin = this check cannot work, and must say so instead of guessing.
  // workflows/cafe_session.md's lite clone excludes /artifacts, and that lite clone IS the
  // standard cafe-PC setup - i.e. the machine Neil actually runs this on. There the twin
  // is tracked (so the check above passes) but carries skip-worktree, while the builder
  // mkdir+writeFile's it into the excluded directory anyway. `git diff HEAD` then either
  // ignores the entry (prints "unchanged" - a false green, the very thing this file exists
  // to kill) or reports it as changed when nothing moved. Neither answer is true, so refuse
  // to answer. Found by the PR #118 reviewer.
  try {
    const flags = execFileSync('git', ['ls-files', '-v', '--', twin], { cwd: ROOT, encoding: 'utf8' });
    // `git ls-files -v` tags: UPPERCASE `S` = skip-worktree (what sparse-checkout sets),
    // lowercase = assume-unchanged. Both mean git is ignoring worktree changes at this
    // path, so both must refuse. A first draft matched only lowercase and therefore did
    // NOT fire on the sparse case it was written for - it printed "unchanged", the false
    // green, and only the test caught it.
    if (/^[Sa-z]/.test(flags.trim())) {
      console.error(`\n  ${twin} is SPARSE-EXCLUDED from this checkout (git flag "${flags.trim()[0]}").`);
      console.error('  This check cannot tell you anything here - it would either false-green or');
      console.error('  cry wolf. Add the path and rerun:');
      console.error('      git sparse-checkout add artifacts');
      failed = true;
      continue;
    }
  } catch { /* non-fatal: the tracked-check above already covers the real failures */ }

  // HEAD, not the index. See the header - `git diff` alone goes green on a staged twin.
  try {
    execFileSync('git', ['diff', 'HEAD', '--exit-code', '--', twin], { cwd: ROOT, stdio: 'pipe' });
    console.log(`  ${twin} unchanged`);
  } catch (err) {
    // Three different things land here, and printing the wrong one is the failure this
    // whole file exists to prevent. Decide by POSITIVE signal, never by absence.
    //
    // The exit code cannot decide it. Measured 2026-08-26: a real difference exits 1,
    // but so does running outside a repo ("error: Could not access 'HEAD'"), while a bad
    // revision exits 128.
    //
    // Neither can "is stderr empty". An earlier draft used that, and it was asymmetric:
    // any git advice line (core.safecrlf=warn on a cafe PC, a hint:) on a GENUINE drift
    // would have flipped the verdict to "git failure, go debug git" and sent the operator
    // away from the page that actually moved. err.stdout carries the diff under
    // stdio:'pipe', so ask for the thing you mean.
    const stderr = String(err?.stderr ?? '').trim();
    const diff = String(err?.stdout ?? '').trim();

    // NEW artifact, staged but not yet in HEAD. `git diff HEAD` reports the whole file as
    // an addition, which an earlier draft announced as "a cited call site moved" -- on
    // exactly the workflow the registry comment above prescribes (add the entry, stage the
    // twin, run this as a pre-commit sanity pass). Nothing moved; the artifact is new.
    // Not a failure: the twin is staged and about to be committed, and CI cannot reach this
    // branch anyway (its checkout IS a commit, so an uncommitted twin fails the tracked
    // check above instead).
    let inHead = true;
    try {
      execFileSync('git', ['cat-file', '-e', `HEAD:${twin}`], { cwd: ROOT, stdio: 'pipe' });
    } catch { inHead = false; }

    if (!inHead) {
      console.log(`  ${twin} is NEW (staged, not yet in HEAD) - nothing to compare against.`);
      console.log('  Commit it; CI compares against HEAD from then on.');
    } else if (diff) {
      // Deliberately NOT "a cited call site moved". The rebuild diffs against HEAD, so
      // ANY input change reddens it - the template, this script, or _gates.mjs - and
      // hardcoding the anchor story sends a typo-fixer off to audit producerOrchestrator.ts.
      // Same shape as the bugs above: a confident answer narrower than the evidence.
      console.error(`\n  ${twin} DIFFERS from HEAD after rebuild.`);
      console.error('  Either a cited call site moved, or the template/builder changed.');
      console.error('  Check which - if a citation moved, reread the page against the new code.');
      console.error('  Then commit the rebuilt twin AND redeploy the published artifact');
      console.error('  (see the CI failure hint).');
      failed = true;
    } else {
      console.error(`\n  git said: ${stderr || '(no output)'}`);
      console.error(`  Could not compare ${twin} against HEAD. Fix that before reading anything`);
      console.error('  into it - this is a git failure, not a verdict about the artifact.');
      failed = true;
    }
  }
}

if (failed) {
  console.error('\ncheck:artifact-anchors FAILED\n');
  process.exit(1);
}
console.log('\ncheck:artifact-anchors ok\n');
