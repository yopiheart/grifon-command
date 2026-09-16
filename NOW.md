# NOW - the resume doc
**Stamped: 2026-09-16, approved service detector fix**

## Current state
Branch: `codex/script-failure-audit`, stacked on `codex/eval-fidelity` at 7cc03f88.
Dependency PR #136: https://github.com/yopiheart/grifon-command/pull/136
PR #136 is still open/draft; verify, e2e, artifacts and Vercel checks are green.
Follow-up draft PR #137: https://github.com/yopiheart/grifon-command/pull/137
Independent review and local verification passed. PR #137 now targets main so
the complete change receives cloud CI; the verification run is pending.
The only production-code change is the approved steam|vacuum| detector addition.
Prompt wording, schema, model, retry limits and transport settings are unchanged.
No paid run, Actions dispatch, production-data change, merge or production deploy.

## ▶ NEXT ACTION
The approved detector fix is complete, reviewed and verified in draft PR #137.
Review #136 then #137 in dependency order; keep both draft until user direction.
Check PR #137 cloud CI before the final merge decision. Explicit authorization
to merge to main and allow its automatic production deployment is still pending.
Content compliance (jargon/proof), retry cancellation and rule/input ambiguities
remain separate follow-ups in workflows/script_failure_audit_2026-09-16.md.
Another live run still needs an exact-input/cost spec; offline checks are not one.

## Completed in this follow-up
- Audited Sept. 6, 7 and 11 run logs/results. All 14 failed script tests timed out
  at 120 seconds; retry waits alone can total 124 seconds. Quota-warning text
  does not distinguish actual upstream 429 from every other retry trigger.
- Preserved 24 generated script blocks, 42 test statuses and source digests in
  workflows/evaluations/script-audit-2026-09-16.json. Only 22 script tests passed;
  two timed-out tests later printed outputs. Raw job logs remain ignored.
- Independent gemini-eval critic confirmed repeated English specification leakage
  and omitted proof differentiators. Detailed evidence/ranking is in
  workflows/script_failure_audit_2026-09-16.md.
- Found service prompt vs detector mismatch (steam/deep vacuum rejected), plus
  ambiguous noun detection, price-rule precedence and contradictory skincare input.
  Neil approved the exact detector diff with "GOGOGO"; it is now applied.
  The .proposed.patch filename is retained as the original approval record.
  Valid steam/vacuum service lines use one generation; posed intros still reroll.
- Reporter now names failed tests without assuming assertions were reached.
  JUnit XML captures actual errors and console output alongside retained JSON.
  Setup/skip/upload handling, schedule and live fixtures remain unchanged.

## Verification
New report checks first failed on original code: 4 red, then 20/20 green.
Independent Vitest smoke: timeout, assertion and synthetic provider error plus
pass/skip; expected exit 1. JSON lost timeout text, XML retained it and console
output; evidence assertions passed. No provider calls or secrets read by probe.
Detector regression: 3 valid service cases failed before the fix (2 calls vs 1).
Focused suite after fix: 65 passed, including 2 new posed-intro retry cases.
Final full suite: 1,401 passed, 32 gated skips, 113 files passed / 9 skipped.
First full run had one existing checkAnchors 5s timeout while checks ran together;
the file passed in isolation (9/9), then the unchanged full suite passed alone.
Build passed: 2,580 modules, main JS gzip 589.79 kB; existing size warnings remain.
Bundle-leak, voice-sync, domain, PS ASCII, artifact-anchor and check:codex passed
(26 Codex tests, 31 skill entrypoints). Generated snapshot EOL noise restored.
Independent correctness review: exact approved diff, no actionable findings.
Independent offline smoke: 45/45 passed, envDir:false, providers mocked; in-memory
removal of the fix reproduced all 3 failing service cases without disk edits.
Archive contents independently match raw sources. No UI change; live browser/API
generation is untested. Fake client/adapter/registry smoke verifies flow behavior,
not actual HTTP authentication, quota handling or live-provider output quality.

## Prior slice retained
PR #136 uses real FLOW_REGISTRY.adscript through the shared offline/live adapter,
with fake client auth and isolated telemetry. Original copied flow failed three
parity cases: transformation retry, Temu classification, resolved-format output.
Its prior full suite passed 1,394 tests; focused adapter/report checks passed 37.
HTTP auth/quota/schema ladder is outside that flow-level harness.
Sept. 14 run 34898931978 failed npm ci (ffmpeg-static HTTP 500); tests never ran.
Image camera drift remains documented in workflows/nightly_regression.md;
no copied tuned image blocks were changed.

## Other work remains separate
Website PR #129 is merged. Hero film remains paused at Neil's request (PR #134,
stacked on #132). Gemini migration PR #131 and ASMR fidelity PR #127 are drafts.
Use workflows/codex_desktop.md and Node 24/npm 11. Never commit secrets/session state.
