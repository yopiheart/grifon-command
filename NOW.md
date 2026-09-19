# NOW - the resume doc
**Stamped: 2026-09-19, One-Shot recovery implementation**

## Current state
Branch: `codex/oneshot-recovery`, based on main `5d1b583c`.
Draft PR #146: https://github.com/yopiheart/grifon-command/pull/146.
Implementation commit: `c08d6039`, pushed to GitHub.
Neil approved the recovery-on-return implementation and draft PR delivery.
No deployment or merge is authorized.

## Changes
- App restoration preserves a saved script formula before the formula-change
  effect runs, preventing restored scripts and storyboard assets from being wiped.
- Producer saved-run fetch failures retain the active run reference and show
  Retry/Back. Retry loads the same run; a genuine missing run still returns to launch.
- Local Vite API middleware handles aborted request bodies. The real page-close
  test exposed an unhandled ECONNRESET that killed the development server.
- Added 18 real-app browser recovery cases across 375px and 1280px viewports:
  draft/upload persistence, interrupted default-engine work, dashboard plan
  recovery, Producer approval gates, recorded-job polling, retry and stale runs.
  Stateful network fixtures preserve checkpoint/job state across browser reloads.
- Stabilized an existing landing test by polling painted canvas bounds. Its race
  reproduced on unchanged main (1 failed / 2 passed); product landing is untouched.

## Evidence
- Producer recovery regression failed on original launch-screen fallback, then passed.
- Saved Testimonial plan regression failed with missing script/scenes on original
  restoration, then passed. Default-engine interruption closes the actual page
  after script persistence while the next image request remains pending.
- Request-abort unit tests: original 2 failed / 1 passed; fixed 3 passed.
- Focused browser suites: Producer 12/12, default engine 6/6 passed.
- Independent 390px browser smoke passed; Retry/Back are reachable, saved work
  restores without submissions, no overflow or page errors.
- Independent correctness review: no remaining actionable findings. Independent
  visual brand review: 44/50, zero critical issues or nits at both target sizes.
- Final build passed, including PowerShell ASCII. Existing bundle-size and
  Browserslist warnings remain.
- Full unit suite: 114 files / 1,404 tests passed; 9 files / 32 opt-in tests skipped.
- Bundle-leak, voice-sync, domain-language, artifact-anchor, design lint and
  check:codex (26 tests) passed. Paid/live switches stayed unset.
- Final combined browser suite: 74/74 passed (2 workers, 2.8 minutes).
  Initial run was 73/74; the baseline landing race is fixed and independently
  reviewed. Focused landing repetitions passed 6/6 across both viewports.
- Local logs/screenshots: `.tmp/oneshot-recovery/` (ignored).

## Recovery boundaries
This proves recovery when the customer returns, not an always-running workflow.
Already submitted provider jobs may continue outside the browser; the browser
must reopen for Producer to reload, poll recorded handles and advance its stages.
Storyboard approval and First Cut remain customer gates.
The default engine preserves partial results without automatic continuation:
partial work opens through One-Shot Resume; completed plans open from Dashboard.
Some late Producer checkpoints and completed plans are seeded and explicitly
labeled; job submit/record/reload/poll and default interruption execute real app
paths against simulated responses. Request counts do not certify live provider
billing, database concurrency, media quality or a fully closed-browser pipeline.
No real generation, production writes, tuned prompt/model/default changes,
billing changes, engine-selection changes, deployment or merge occurred.

## Next action
Implementation and local verification are complete; draft PR is open. GitHub CI
is pending. Review CI before any separately authorized merge or deployment.
