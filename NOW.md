# NOW - the resume doc
**Stamped: 2026-09-17, approved A+B+D prompt fixes applied**

## Current state
Branch: `codex/prompt-quality-audit`, based on main `87546343`.
Draft PR #139: https://github.com/yopiheart/grifon-command/pull/139
Neil explicitly approved A+B+D as written after reviewing the linked exact patches.
Applied five prompt-line replacements in `api/_lib/prompts.ts` and three fixture
replacements in `tests/regression/script-gen.regression.test.ts`.
A clarifies language handling; B preserves required differentiator proof; D corrects
contradictory topical-serum and pre-selling condo inputs.
C/E/F, models, schemas, safety settings, generation knobs and retries are unchanged.
The original proposed patches and saved 24-output corpus are unchanged.

## ▶ NEXT ACTION
Review the implemented A+B+D change in draft PR #139 for a separately requested
merge. No merge or production deployment is authorized by the prompt approval.
A live quality comparison still requires its own exact-input/evidence/max-cost spec.
Price precedence (C), factual-source policy (E) and beat mapping (F) remain
unapproved proposals. Do not repeat A+B+D approval or implementation.
Full audit and implementation evidence: `workflows/prompt_quality_audit_2026-09-17.md`.

## Verification
`node workflows/evaluations/check-prompt-proposals.mjs --approved` first failed on
original source, then passed: actual files equal exactly approved A+B+D after
line-ending normalization. All six proposal files match approval commit `7e619a61`.
Historical C/E/F candidate checks are in-memory only, not shipped changes.
Focused tests: 70 passed. Full suite: 1,401 passed, 32 gated skips,
113 files passed / 9 skipped. Paid/live flags remained unset.
Build passed: 2,580 modules, main JS gzip 589.79 kB; existing size/Browserslist warnings.
Bundle-leak, voice-sync, domain, PS ASCII and artifact-anchor checks passed.
Independent correctness review: no actionable findings; A+B+D reverse checks pass.
Independent offline smoke: 29/29 passed, including 28 real-flow/fake-provider
combinations across Testimonial, MrBeast and all five product UGC formats,
both languages and empty/nonempty separators, plus exact D fixture source check.
Original-prompt negative control: 28 expected failures. Env loading disabled,
telemetry mocked, network blocked; model/safety/thinking settings unchanged.
This proves source/assembly/plumbing, not live quality or HTTP auth/quota behavior.
No browser generation or paid comparison was run. Generated snapshot EOL noise restored.

## Remaining findings
The audit scored 24 saved outputs, representing 22 passing script tests and two
late outputs after timeout. Three complete differentiator omissions; language
leakage, partial proof, unsupported claims and rule/input conflicts are documented.
One Glaze UGC reveal exceeds its local 3-8-word limit; no new retry was added.
Offline smoke additionally found existing `ipahid` detector omission:
`Ipahid ko ito sa mukha.` causes two identical fake-provider generation requests.
Do not expand the approved detector diff without a separate exact-diff decision.
Noun-fragment tolerance and English action exemplars remain explicit policy boundaries.
Cancellation/124s backoff vs 120s timeout remains a separate transport follow-up.
Image-evaluation camera-copy drift remains in `workflows/nightly_regression.md`.
PRs #136-#138 are merged and complete; do not redo their evaluation fixes.
Hero film remains paused (PR #134, stacked on #132). Gemini migration #131 and
ASMR fidelity #127 remain separate. No paid run or production-data mutation here.
