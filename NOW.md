# NOW - the resume doc
**Stamped: 2026-10-18; post-merge CI and live smoke passed**

## Active task and boundary
Checkout: F:/CodexWorktrees/8710/grifon-command.
Checkpoint branch: codex/deep-test-audit; merged main revision 9e3b0996.
Tested PR head 007fd04a; implementation revision ba754d38. Merged PR203:
https://github.com/yopiheart/grifon-command/pull/203
Audit unused legacy code and test relevance; remove only proven obsolete paths,
fix false-green test behavior, preserve meaningful coverage.
Neil explicitly authorized merge; PR203 merged on 2026-10-18 at 01:44:52 UTC.
Main's merge tree exactly matches the tested PR head. Vercel's automatic build
was accepted after account recovery; no manual deployment was requested.
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
Review reuse confirmed at unchanged head007fd04a immediately before merge.
Hosted CI39086158186 attempt2:43 jobs PASS, including all40 browser shards.
Hosted Vitest PASS1681,32 existing opt-in skips. Native browser reports match
all327 unique discovered cases:325 first-pass,2 passed on unchanged retry;
zero missing/duplicate/extra/skipped/unexecuted browser cases.
Retries: Settings sign-in actionability15s timeout (mechanism unproven), and
Chromium afterEach screenshot protocol failure after beta assertions passed.
Public telemetry lacks dummy-backend admin credentials as expected. One local
image-handler auth log appeared during recovery teardown; isolated repeat PASS1
without that log. Missing mock ruled out; close-before-abort race is unproven.
No provider execution; paid/live switches remain unset.
Post-merge main CI39087600268 attempt1 PASS44/44 including main-status.
Hosted Vitest PASS1681,32 existing skips;40 timing reports cover all327 unique
cases exactly once:325 first-pass,2 passed unchanged retries after Chromium
screenshot capture failures. No exhausted/missing/duplicate/skipped browser cases.
Live https://grifon.ai smoke PASS21/21 at1280x900,375x667,390x844:
home/pricing/legal/login/app entry, navigation and Annual Starter intent.
Runtime/console/HTTP/asset errors0; generation/payment/mutation attempts0.
Read-only GET probes PASS32:7 method405 guards,23 PNG examples,2 MP4 previews.
No functional regression found in tested paths. Existing invite-only gate keeps
normal authentication/dashboard flows NOT RUN; no pass/code/storage bypass.

## Remaining boundaries and next action
Paid-provider suites need an approved exact test spec; opt-in real-render suites
remain unrun under tests/AGENTS.md. Offline helper checks do not prove a render.
Unused auth wrappers need focused session compatibility verification before
removal. Test-only tuned script guardrails/generation helpers need exact-diff
approval. Preserve the historical icon wrappers until the legacy instruction
discrepancy is resolved. No failures were skipped or assertions weakened.
GitHub Actions budget restored; no gates waived. PR203 is merged and attached.
Automatic Vercel build for9e3b0996 was accepted; final status is in PR203.
Post-merge CI and live smoke evidence are recorded in PR203 and local .tmp/.
No implementation remains for PR203.
Keep this final resume checkpoint on the existing audit branch; it does not
change production code or require another product merge.
