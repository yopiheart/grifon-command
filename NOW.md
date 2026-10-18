# NOW - the resume doc
**Stamped: 2026-10-18; deep test audit**

## Active task and boundary
Checkout: F:/CodexWorktrees/8710/grifon-command.
Branch: codex/deep-test-audit; base origin/main d79bd602.
Audit unused legacy code and test relevance; remove only proven obsolete paths,
fix false-green test behavior, preserve meaningful coverage.
Keep a draft PR for review. No merge or deployment requested for this work.
PR202 is already merged in the base. PR201 live voice remains paused;
do not run paid voice calls or implement the proposed Grok provider.

## Changes and removal evidence
Removed 13 runtime/test-unreferenced feature modules (1,368 lines):
- DirectorOneShot: sole App caller replaced by OneShotAd in 4fe61ae4.
- glossyGoldButton: both checkout callers replaced by GoldButton in 46cf803c.
- AdMontagePhone, ProofGallery, StackReplace, RoiMetrics, Aurora,
  ExitIntentModal/useExitIntent and UrgencyBar: last callers retired by
  landing redesign 21005a23 (Aurora dashboard replaced earlier in b36c1757).
- MessengerFloat and RecentActivityToast: last callers removed in 46cf803c.
- QuotaMeter: dashboard replaced it with real quota reporting in 8c1b3d32.
AST/static/dynamic-import tracing and repository searches found no callers.
All 38 API shared libraries retain non-test consumers.
Preserved Fable archive, live RunningScreen.fable5, previews, generic Gemini
LegacyBody, saved-session recovery, reusable primitives and curated records.
No existing tests, assertions, tuned content, dependencies or lockfile removed.

Fixed exact process-flag opt-in before credential loading in four regression
harnesses; disabled runs neither read .env nor initialize the provider SDK.
Fixed boot checks hiding app errors and accepting unrelated legal-page content.
Fixed burn-in PSNR failures masquerading as visible differences; burn-in/demo
fixture guards permit only their own local server, retaining real SSRF elsewhere.

## Verification
Baseline Vitest: PASS 1,616; 32 existing opt-in skips.
Final Vitest: PASS 1,681; same 32 skips; 65 new assertions.
Machine comparison confirms zero missing tests or changed original outcomes.
Negative controls: boot RED6/GREEN8, live startup RED22/GREEN24,
PSNR RED15/GREEN20; fixture guard plus real SSRF checks PASS28.
Build/PowerShell ASCII, bundle leak, voice/eval parity, domain language,
artifact anchors, design lint and diff whitespace checks PASS.
Codex contracts PASS26; legacy permission harness PASS25;
CI input/timing helper tests PASS17; E2E input guard PASS109 inputs.
Affected browser smoke PASS68/68 across eight specs at mobile/desktop widths.
Both legal-page checks reject a nonempty unrelated page (expected exit1).
Independent correctness review clean; deletion-only brand review BRAND_PASS.
Local dummy-backend telemetry/interruption logs need no provider credentials;
paid/live switches remain unset.

## Remaining boundaries and next action
Paid-provider suites need an approved exact test spec; opt-in real-render suites
remain unrun under tests/AGENTS.md. Offline helper checks do not prove a render.
Unused auth wrappers need focused session compatibility verification before
removal. Test-only tuned script guardrails/generation helpers need exact-diff
approval. Preserve the historical icon wrappers until the legacy instruction
discrepancy is resolved. No failures were skipped or assertions weakened.
Local gates are complete. Commit, push and attach the draft PR for review;
hosted CI remains a separate gate before any merge decision.
