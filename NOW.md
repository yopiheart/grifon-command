# NOW - the resume doc
**Stamped: 2026-10-03, recovery release verification**

## Current state
PR146 recovery fixes merged into main on October 1 as `72b2600c637811e36c34bc3f6b057a904900c671`.
Production deployment 6784795003 and main CI 36864824524 succeeded.
PR150 remains draft, targets main, and contains verification tooling only:
https://github.com/yopiheart/grifon-command/pull/150.
Neil authorized testing and verification, not a PR150 merge.
No application, tuned prompt/model, engine-default, or billing changes this turn.

## Fresh verification - October 3
- Exact clean PR150 implementation `b611c521`: all 18 recovery browser cases
  passed at 375px and 1280px; runner and Playwright exit codes 0.
- Independent smoke assessment PASS; screenshots and evidence inspected.
- Focused recoveryVerification and viteApiAbort unit tests: 13/13, exit 0.
- Full GitHub CI 37091478215 succeeded for `5fb925df`, an empty retry commit
  with the exact same tree as `b611c521`. Verify, e2e and artifacts passed.
- Prior negative control proved original saved-run error behavior fails both
  viewport regressions. No application code has changed since that proof.
- Existing independent diff review remains applicable to the unchanged code.
- Live grifon.ai initially returned 402 DEPLOYMENT_DISABLED; the first fresh
  preview retry was blocked. Neil resolved payment during this session.
- After payment, live homepage/app returned 200 and authenticated dashboard
  and One-Shot launch rendered in the actual browser.
- Entered a disposable Recovery QA draft, reloaded, reopened One-Shot, and
  selected Resume: offer, brand and price were restored in the consumer screen.
- Closed the app tab and opened a new one: signed-in state and draft survived;
  Resume restored the same fields at desktop width 1280. Mobile-sized live
  viewport measured 319px; exact 375px coverage is in the automated suite.
- No horizontal overflow in the inspected live mobile/desktop views.
- No Generate, research, rerender or paid media operation was requested.
- No saved completed plan existed in this browser; live completed-plan and
  Producer recorded-job restoration were not exercised against real accounts.
  Their automated coverage uses simulated auth/provider/persistence responses.

## Evidence
Isolated checkout: C:/Users/ADMIN/.codex/worktrees/recovery-closeout/grifon-command.
Fresh report: `.tmp/recovery-verification/2026-10-03T02-57-25-082Z-xyNdwN/summary.md`.
Report links JSON, screenshots and traces for all nine flows at both widths.
The source checkout remained clean during the independent run.
Only this resume document changes after those checks.
Latest preview/CI status and browser findings are recorded in PR150's description.

## Recovery boundaries
Recovery means returning to saved work in the same browser storage context.
Default-engine partial work does not automatically continue. Producer resumes
polling recorded jobs after reopening; Storyboard and First Cut remain gates.
Provider jobs can continue externally while the browser is closed, but the
complete pipeline and notifications still require separate architecture work.
Request counts are not proof of live billing, database concurrency or quality.
Final-render retry may start another final render; scene-job recovery is distinct.
The disposable text-only Recovery QA draft is left in the test browser.
No real saved customer work was edited or removed.

## ▶ NEXT ACTION
Fresh PR150 preview retry after payment is next; do not rely on earlier blocked
statuses or successful build metadata as proof of current live availability.
PR150 is not merged. A live paid-provider run is outside this no-spend check.
No new production deployment or hosting-setting changes were performed.

## Unrelated work retained
Main shared checkout is used by another session; no branch switch or file edits
were made there. Oceanides work and untracked media/attachments are untouched.
Motion PR143 -> PR144 -> PR149 remains on its own branches.
