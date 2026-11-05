# NOW - the resume doc
**Stamped: 2026-11-05; evidence-led review workflow and recovery investigation**

## Active task and boundaries
Checkout: F:/CodexWorktrees/47bd/grifon-command.
Branch: codex/evidence-led-review, based on main 7c422cd7 (PR205 merged).
Draft PR225: https://github.com/yopiheart/grifon-command/pull/225
Reviewed change afdbb3d6 is pushed and verified in the remote PR head.
Neil approved proceeding after the X-post/codebase evaluation: tighten review
instructions and investigate provider-submission recovery. No runtime changes,
generation tuning, paid/provider calls, production writes, merge or deployment.
PR201 live voice remains paused; no new Android microphone or release claim.
Chat-release evidence remains in PR205 and its commits. Its deployment
status has not been rechecked in this session; do not reuse its old pending work.

## Changes
Codex and legacy Claude straw-man-audit now require evidence instead of a false
hostile premise. Current per-instance rate-limit fallback and transactional,
fail-closed finished-ad metering replace stale blanket fail-open descriptions.
Review workflow and both verify-changes skills allow one fresh reviewer to cover
smoke, correctness and relevant security; findings need a concrete path/impact,
unverified concerns stay separate, and fixes receive scoped independent rechecks.
Required independent review and existing tuned/paid/release approvals remain.
workflows/provider-submission-recovery.md records the actual claim -> submit ->
record gap, existing evidence, limitations and the next isolated integration slice.
Repeated lost handle writes can repeat upstream submissions despite credit dedupe.
A late old-attempt record after reclaim is a hypothesis requiring a boundary test.

## Verification
PASS: npm.cmd run check:codex (34 skills, 0 reference errors; 26 contracts).
PASS: npm.cmd run test -- tests/producerOrchestrator.test.ts
  tests/unit/finishedAdAtomic.test.ts (119 tests, 2 files).
Initial unit startup hit a sandbox cache-write denial via reused node_modules;
the same command passed with the required cache permission. No test was skipped.
Dependencies reuse the existing desktop install with identical package-lock hash.
PASS: paired old/new skill source evaluations, 2 scopes and 6 expectations each.
Both versions passed; this does not demonstrate token savings or better recall.
PASS: resume-doc strict check, diff whitespace check and audit-skill parity.
PASS: independent review of this workflow/skill/investigation diff, 0 findings.
Reviewer checked source claims, scope, parity, gates and whitespace against
7c422cd7 plus the uncommitted changes; final handoff pointers follow that review.
Evidence workspace: .tmp/review-workflow (local-only, ignored).
Full application build/unit/browser runs and live DB/provider tests are NOT RUN:
this change edits workflow documentation/skills only. No runtime fix is claimed.

## ▶ NEXT ACTION
Review draft PR225 and its hosted checks; no merge or deployment is authorized.
The next engineering slice is an isolated actual scene/API persistence harness
from workflows/provider-submission-recovery.md, before selecting a runtime fix.
