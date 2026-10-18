# NOW - the resume doc
**Stamped: 2026-10-18; Chromium screenshot-capture fix**

## Active task and boundary
Checkout: F:/CodexWorktrees/8710/grifon-command.
Branch: codex/chromium-capture-fix; base origin/main 9e3b0996; draft PR204.
https://github.com/yopiheart/grifon-command/pull/204
User requests reproduction before fixing Chromium capture flakiness,
preserving assertions/timeouts, with final CI verification.
Success: reproduce the native failure, address its demonstrated capture path,
retain visual/behavior coverage, and pass relevant checks and final CI.
Failure: added retries/waits, removed rendering, weaker assertions or increased
limits conceal the failure or regress pixels.
Verification: original cases, controlled backend comparison, fresh-pixel checks,
independent correctness/smoke critics and full original hosted suite.
No merge/deploy requested. No paid/live switches, generation or production data.

## Previous task completed
PR203 merged as main 9e3b099664a41fe85dbd8d0ac870dc520885926b.
Postmerge CI39087600268 passed44/44 jobs; 1,681 Vitest passes and32 existing
opt-in skips;327 E2E cases,325 clean and2 screenshot retry passes.
Automatic Vercel deployment succeeded. Unpaid public live smoke21/21 plus32
GET-only probes passed. Existing invite-only login blocks authenticated smoke.

## Reproduction before the fix
Diagnostic head50280861 changed only NOW and a temporary CI workflow.
Tests, browser config, assertions and limits were identical to main.
Fresh Ubuntu CI39090468825 repeated original native shard7/8 commands:
https://github.com/yopiheart/grifon-command/actions/runs/39090468825
- Current/7 loop1: beta390 afterEach fullPage capture failed874ms after fonts;
  retry passed7,744ms.9 cases/10 attempts.
- Current/8 loop2: grain viewport capture failed865ms after fonts;
  retry passed17,287ms. Two loops:16 cases/17 attempts.
- Legacy/7:2 completed loops,18 cases/18 attempts,0 failures/retries.
- Legacy/8:3 completed loops,24 cases/24 attempts,0 failures/retries.
No assertion failures. Current native exits0 after retries; diagnostic stayed
red to preserve first-attempt capture errors. Legacy remaining loops reached
the existing15m job cap and were interrupted; excluded from these counts.
Four planned loops exceeded the budget; no job/test limit was raised.
Local evidence: .tmp/chromium-capture-ci/39090468825/.
Windows original traced targets20/20 passed; native7 had8 clean passes plus1
unrelated Resume-click retry pass. Local8 blocked by another task's5173 server,
left untouched. Source/config hashes were unchanged during baseline.

## Fix and safety checks
Playwright1.61.0 pins Chromium/headless-shell149.0.7827.55 rev1228.
Exact Chromium source emits this error for empty surface readback before PNG
encoding; CDP does not disclose the underlying Viz failure.
playwright.config.ts now omits only Playwright's opt-in
--enable-features=CDPScreenshotNewSurface argument, selecting the same Chromium
default capture path as the successful upstream legacy-switch experiment.
Temporary diagnostic workflow removed. All original tests, screenshots,
options, assertions, retries, timeouts, app rendering and dependencies retained.
This is a capture-backend workaround; the precise upstream Viz trigger is unknown.
Both backends passed240 known-pixel/dimension/freshness captures, including
inactive two-tab/focus-emulation checks, zero network requests.
Evidence: .tmp/screenshot-capture-repro/backend-pixels*.json.
Independent correctness review found no actionable issues and confirmed exact
launch-argument equivalence to the experiment. Fresh independent smoke passed
6/6 original cases across3 rounds,0 retries. Beta PNG390x844; grain1280x900,
meanAdjacentDifference4.6135 > unchanged0.8; all normal browser defaults retained.
Evidence: .tmp/capture-fix-smoke/evidence.json. Owned browsers/server stopped.

## Checks and remaining work
Build/PowerShell ASCII, bundle leak, voice/eval sync, domain language, artifact
anchors, design lint, Codex contracts26, CI helper contracts17 and whitespace pass.
Earlier Windows full Vitest hit unchanged anchor5000ms limits:
3 failures concurrent build,4 default standalone,3 with1 worker.
Isolated anchor9/9 passed under original limits. Independent diagnosis found
finite local Git/Node fixture work, no logic defect/network/provider calls.
Variable machine/process/filesystem contention is plausible, not proven.
Final normal npm test passed1,681 with32 existing gated skips in43.96s.
All anchor cases passed unchanged; no limit, assertion or scheduling edit.
Redundant ordinary baseline CI39090468744 was cancelled to free A/B capacity;
not a verification pass. Final full CI is required on the actual fix.
Final build and ordinary full unit suite passed after the fix.
Hosted final verification and every native attempt will be recorded in PR204's
Verification section, including exact code/run IDs and remaining blockers.
Next: inspect the latest required PR204 checks and resolve actual failures.
Do not merge without explicit instruction.
