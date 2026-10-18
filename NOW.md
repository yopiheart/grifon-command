# NOW - the resume doc
**Stamped: 2026-10-18; Chromium screenshot-capture investigation**

## Active task and boundary
Checkout: F:/CodexWorktrees/8710/grifon-command.
Branch: codex/chromium-capture-fix; base origin/main 9e3b0996.
User requests reproduction before fixing Chromium screenshot flakiness,
preserving assertions/timeouts, with final CI verification.
Success: reproduce the native capture failure, address its demonstrated cause,
retain meaningful visual/behavior coverage, and pass relevant checks and CI.
Failure: retries, waits, removed rendering, weaker assertions or increased
timeouts conceal the original failure or regress the captured pixels.
Verification: unchanged original cases, controlled backend comparison,
pixel freshness/dimensions checks if changing transport, independent review,
build/unit/gates and the full original browser suite in hosted CI.
No merge/deploy requested for this branch. No paid/live switches or providers.

## Previous task completed
PR203 merged as main 9e3b099664a41fe85dbd8d0ac870dc520885926b.
Postmerge CI39087600268 passed44/44 jobs; 1,681 Vitest passes and32 existing
opt-in skips; 327 unique E2E cases,325 clean and2 screenshot retry passes.
Automatic Vercel deployment succeeded; unpaid public live smoke passed21/21
plus32 GET-only probes. Existing invite-only login blocks authenticated smoke.
No generation, billing, production mutation or paid-provider execution occurred.

## Reproduction evidence and investigation
Both retained failures are native Page.captureScreenshot errors after fonts
are ready: beta390 full-page capture, charcoal1280x900 viewport grain capture.
Beta repeated in hosted CI39086158186 and postmerge39087600268, shard7;
grain failed in postmerge shard8. Original attempts failed in553-919ms.
Retry traces capture during avatar/WebGL startup; rendering pressure is a
hypothesis, not an established cause. No original failure trace was retained.
Pinned Playwright1.61.0 uses Chromium/headless-shell149.0.7827.55 rev1228.
Exact Chromium source emits the error when surface readback returns an empty
image, before PNG encoding. CDP discards the underlying surface-copy error.
Playwright enables CDPScreenshotNewSurface; its upstream
PLAYWRIGHT_LEGACY_SCREENSHOT switch offers a controlled backend experiment.
No workaround is accepted without actual failing-versus-passing evidence.

Windows unchanged traced baseline passed20/20 first attempts (10 beta390,
10 grain). Actual bundled headless-shell uses SwiftShader. Native untraced
original shard7/8 reproduction is underway; source/config hashes unchanged.
Local evidence: .tmp/screenshot-capture-repro/.
Hosted original evidence: .tmp/postmerge-ci-39087600268/e2e-tooling/.
Temporary Linux CI diagnostic compares current/legacy capture backends using
the unchanged original shard7/8 commands; retains native results and failures.
No product code, screenshot assertions, timeouts, retries or dependencies edited.

## Remaining work
Obtain a real fresh capture failure, isolate the trigger with controlled A/B,
implement the smallest justified fix, retain original rendering and checks,
verify pixel validity/freshness and independent smoke/correctness review.
Run build, Vitest, applicable gates and full hosted CI on the final commit.
Keep draft PR/evidence current and do not merge without explicit instruction.
