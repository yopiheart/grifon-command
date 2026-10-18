# NOW - the resume doc
**Stamped: 2026-10-18; PR204 merged, CI and live public smoke verified**

## Active task and authorization
Checkout: F:/CodexWorktrees/8710/grifon-command.
Branch: codex/chromium-capture-fix, fast-forwarded to merged main for checkpoint.
User requested merging PR204, checking CI, then unpaid live smoke.
https://github.com/yopiheart/grifon-command/pull/204
PR204 merged at2026-10-18T05:05:54Z:
ece79ac9b3809fca8659470747cecc113fe1e737.
Reviewed/tested PR head:294f348128eb14cf6880e34525d7e0712271033b.
Merge tree and tested head tree both44cdaeced7efafa7ea901a13128d2dee90669419.
No extra application changes were introduced by the merge.
No paid/live switches, generation, manual deployment or production-data mutation.

## Post-merge status
CI39099372159 passed on exact merge ece79ac9; all44 jobs succeeded,
including push-only main-status. Completed2026-10-18T05:36:23Z.
https://github.com/yopiheart/grifon-command/actions/runs/39099372159
All40 browser shards:327 cases,327 passing first attempts,0 retries/flakes/skips
or reporter errors. Independent audit confirms exact pre-merge identities,
expected statuses and shard membership;0 missing/extra/duplicate/unattempted cases.
Both formerly failing capture cases passed first attempt.
Post-merge Vitest:1,681 passed,32 existing opt-in skips; all other gates green.
Evidence: .tmp/postmerge-ci-39099372159/ (includes verify-job.log).
Automatic Vercel deployment completed successfully (GitHub commit status):
https://vercel.com/neilmaglayabusiness22-2085s-projects/grifon-command/E8SZ5tFVFkmYjW3fiM52fAN7uZjW

## Live public smoke after PR204
https://grifon.ai passed24 route/viewport checks: /, /pricing, /terms, /privacy,
/refund, /support, /login, /app at1280x720,375x667,390x844.
Headings rendered; no horizontal overflow or broken images observed. Navigation,
Back/Forward, FAQs and billing toggle worked. Guest /app redirects to sign-in.
No browser console warnings/errors observed. HTML and entry JS/CSS GETs were200.
No credentials/forms submitted, paid-plan buttons clicked, generation or checkout.
GitHub latest Production7150240826 and current main both identify ece79ac9.
Vercel connector403 and absent CLI limit direct alias-to-deployment inspection;
unique deployment URL returned a different document, so no byte-match claimed.
Authenticated/provider/billing flows untested. No public regression observed.
Evidence: .tmp/live-pr204-identity/browser-smoke.json and browser tool log.

## Pre-merge verification
Final CI39091878389 passed exact reviewed head294f3481:
43 successful jobs, expected push-only main-status skip.
All40 E2E shards:327 original cases,327 passing first attempts.
Independent set/multiset/per-shard audit:327 unique identities across30 files,
including28 nested-title cases; no missing/extra/duplicate/unattempted cases.
Zero retries, flakes, runtime skips or reporter errors.
Hosted Vitest:1,681 passed,32 existing paid/live opt-in skips.
Independent correctness review clean. Independent smoke6/6 original cases
across3 rounds,0 retries; valid390x844 beta and1280x900 grain PNGs.
Grain4.6135 > unchanged0.8; all normal browser defaults retained.
Final local build/PowerShell ASCII and ordinary full Vitest passed1,681+32skips.
Bundle leak, voice/eval sync, domain language, artifact anchors, design lint,
Codex contracts26, CI helper contracts17 and whitespace checks passed.
Earlier Windows anchor-fixture5000ms timeouts varied with local load; isolated9/9
and final full suite passed unchanged. Exact contention cause remains unproven.

## Fix and reproduction evidence
Playwright1.61.0 pins Chromium/headless-shell149.0.7827.55 rev1228.
Only browser change: omit --enable-features=CDPScreenshotNewSurface in
playwright.config.ts, selecting Chromium's default capture path.
Original tests, screenshot options, assertions, retries, timeouts, application
rendering and dependencies remain unchanged. Temporary diagnostic workflow removed.
This is a capture-backend workaround; exact upstream Viz trigger is unknown.
Revalidate the exact launch argument when upgrading Playwright/Chromium.

Baseline diagnostic CI39090468825 used50280861, with source/config identical
to pre-fix main9e3b0996. Original native shard7/8 commands reproduced:
- beta390 fullPage capture failed874ms after fonts; retry passed7,744ms.
- grain viewport capture failed865ms after fonts; retry passed17,287ms.
Current backend25 case executions/27 attempts/2 capture failures.
Default/legacy comparison42 completed cases/42 attempts/0 failures or retries.
No assertion failures. Further legacy loops hit unchanged15m job cap;
interrupted loops excluded. Native retries passed but diagnostic stayed red.
Both backends passed240 independent known-pixel/freshness/dimension captures,
including inactive two-tab/focus-emulation checks,0 network requests.
Windows original baseline20/20 passed; native7 had an unrelated Resume-click
retry pass. Another task's5173 server blocked local8 and was left untouched.
Evidence: .tmp/chromium-capture-ci/39090468825/ and final-39091878389/,
.tmp/screenshot-capture-repro/backend-pixels*.json,
.tmp/capture-fix-smoke/evidence.json. Only owned test processes were stopped.

## Remaining boundaries
PR204 is merged and post-merge verification is complete. No CI blockers or
regressions observed. PR204 records both full runs:654 browser case executions,
all first-attempt passes. This branch carries the documentation-only checkpoint;
no additional application/test code changed. Never cancel main CI.
PR203 is already merged9e3b0996; its old2 capture retries prompted this fix.
No paid generation/provider smoke is authorized. No application/test edits here.
