# Saved script failure audit — September 16, 2026

Follow-up: [September 17 prompt-quality audit and exact proposals](prompt_quality_audit_2026-09-17.md)
scores the preserved outputs and tracks exact fixes. A+B+D were subsequently
approved and applied; C/E/F remain proposals. Evaluation implementation PRs
#136-#138 are merged; the implementation history below is retained.

The recent red runs do not establish a prompt regression. All 14 failed script
tests in the three sampled runs timed out at 120 seconds. Separately, review of
24 saved script outputs found recurring language and proof-content violations,
plus a production detector mismatch hidden by the old harness. This audit makes
no claim about every older nightly failure or current live output quality.

## Evidence and provenance

| UTC run date | Run | Script pass / fail | Saved outputs | EDL canary |
| --- | --- | --- | --- | --- |
| September 11 | [34644107954](https://github.com/yopiheart/grifon-command/actions/runs/34644107954) | 5 / 7 | 5 | passed |
| September 7 | [34161876539](https://github.com/yopiheart/grifon-command/actions/runs/34161876539) | 10 / 2 | 11 | passed |
| September 6 | [34056546118](https://github.com/yopiheart/grifon-command/actions/runs/34056546118) | 7 / 5 | 8 | passed |

The full-cap EDL probe was skipped in all three. The September 14
[run 34898931978](https://github.com/yopiheart/grifon-command/actions/runs/34898931978)
failed installing ffmpeg-static (HTTP 500); tests never ran.

[Preserved evidence](evaluations/script-audit-2026-09-16.json) includes all 24
script JSON blocks, test statuses, run SHAs and SHA-256 digests of the downloaded
results files. It excludes raw job logs and credentials. Scripts came from the
paired `=== LABEL ===` / `=== /LABEL ===` log markers, with timestamp prefixes,
CRLF and console color escapes removed. Failure messages were checked against
the Actions logs, since JSON retained only `STACK_TRACE_ERROR` creation stacks.
The digest refers to the downloaded original results.json, not this extraction.

The relevant production prompt, client service and historical harness have no
diff between the September 6 SHA and September 11 SHA. Nevertheless, all three
runs predate [PR #136](https://github.com/yopiheart/grifon-command/pull/136): the
historical harness omitted transformation retry, Temu classification and resolved
format output. There are no saved Temu cases here. All eight UGC outputs lack
`ugcProFormatResolved`, so they cannot validate Auto-to-storyboard routing.

## Highest-impact moves

### 1. Keep execution failures separate from content findings

The three logs contain 41, 15 and 26 quota/backoff warnings respectively. The
client's `retryWithBackoff` waits 4 + 8 + 16 + 32 + 64 = 124 seconds, before
provider latency and the initial one-second delay, while each script test allows
120 seconds. These budgets are incompatible with exhausting the retry schedule.
The warning says `Quota hit (429)`, but the branch also accepts status 503 and
several message patterns. The saved warning alone does not identify the exact
upstream status, quota dimension, billing condition or provider root cause.

Two failed tests later printed outputs: September 7 Bukidnon MrBeast and September
6 MalinisPH MrBeast. There are therefore 24 output blocks but only 22 passing
script tests. The timeout did not prevent those late completions; absence of a
cancellation boundary warrants a separate transport investigation. Increasing
the timeout alone would obscure the problem and can increase spend. No retry,
timeout, schedule, model or provider setting was changed in this slice.

**Implemented:** report failed *tests*, not inferred assertion failures; retain
the JSON summary and additionally save JUnit XML with actual error messages and
console output. Setup/skip/artifact reporting from PR #136 is preserved.

### 2. Fixed the demonstrated service application-detector mismatch

September 7 SofaFresh body[0]:
`Steam muna namin tapos deep vacuum para tanggal lahat.`

The service transformation prompt explicitly accepts `steam muna namin, tapos
deep vacuum` (`api/_lib/prompts.ts`, service beat 1). The supplied service features
include both operations. However, `APPLICATION_VERBS` omits both verbs, and
`FLOW_REGISTRY.adscript` applies this check to service transformation too. The
pre-fix production flow therefore rerolled a line that its own prompt accepts.
The historical copied harness concealed that additional call.

**Approved and applied September 16:** added only `steam|vacuum|` at the start of
`APPLICATION_VERBS`, after Neil approved the exact diff with "GOGOGO". The
[approved one-line diff](evaluations/service-application-verbs.proposed.patch)
is retained under its original proposal filename as the approval record; it is
already applied. No prompt wording, schema, model, retry limit or transport
setting changed. Three shared-adapter regression cases first failed (two calls
instead of one), then passed after the fix. Two additional posed-intro cases
preserve the existing single bounded retry, including when the intro names one
of the newly recognized tools.

The patch is intentionally narrower than a semantic action detector. September 7
Glaze UGC says `Tingnan mo, tatlong patak lang nitong Glaze PH.` The token `patak`
passes today despite not explicitly applying serum. Existing prompt examples
and tests also allow short fragments such as `dalawang spray lang`; changing
that boundary needs an agreed positive/negative example set. Do not delete noun
tokens indiscriminately or claim this patch resolves that ambiguity.

### 3. Measure language and missing-proof compliance before prompt rewriting

The independent `gemini-eval` critic found two recurring critical patterns:

- **English specification leakage.** September 11 Bukidnon Testimonial includes
  `Dahil single-origin beans ito, ramdam agad ang purong sarap nito.` and
  `Naka-resealable valve bag pa kaya laging sariwa kahit ipadala malayo.`
  September 7 also says `Naka-resealable bag ito...`. MalinisPH Testimonial repeats
  `Same-day booking` and `background-checked` on September 6 and 7. These are
  supplied facts, but the actual LANGUAGE_LOCK requires natural translation or
  omission of specification jargon; it explicitly allows `specialty kape` as
  the coffee simplification. Language is correctly wired as Taglish.
- **Missing differentiator in proof.** Both September 6 and 7 MalinisPH
  Testimonials and September 6 MalinisPH MrBeast omit the supplied separator:
  `Plant-based cleaning products, certified safe sa mga bata at pets`.
  Their proof mentions vetted cleaners or booking convenience instead. The
  Testimonial proof rule and MrBeast beat 5 explicitly require the separator.
  Other saved MalinisPH scripts include it, ruling out consistently missing input.

These are content failures even when structural tests pass. The next content
check should separately score jargon and meaning-preserving inclusion of the
supplied differentiator. Exact-string matching is unsuitable for translated
proof. Additional prompt emphasis has no demonstrated benefit yet; no arbitrary
prompt rewrite or new paid evaluator is included here.

### 4. Resolve conflicting inputs/rules before grading them as model defects

- Real-estate PRICE_RULE says supplied monthly terms should lead and appear once,
  but the assembled UGC prompt also contains absolute NO PRICE language and
  nonproduct CTA price restrictions. Both saved Amaia scripts omit `25k/month`.
  This is a precedence decision to clarify, not evidence of invented prices.
- The skincare fixture says `Inumin lang` for a topical dropper serum. Correct
  this contradictory test input in a separately reviewed fixture change before
  another paid comparison; do not tune the model to reproduce it.
- Glaze Testimonial scripts add nonstickiness or fast absorption, neither supplied
  by the features. The feature-filter rule and generic objection-killer request
  leave an ambiguity worth resolving. Hiraya's `viral` claim is also unsupported.
  These are provenance warnings, not proof of a universal anti-invention rule.

## What held, and what this audit cannot establish

All 24 outputs have both hooks. All eight UGC outputs have the intended body
count. The critic found no demographic-label leakage, invented scarcity, offer
leakage into hooks, or peso-price leakage. It found no clear manual-Tagalog
blacklist violation; pure Tagalog alone is not a defect. No model limitation was
established. These are observations about this sample, not universal guarantees.

The source-of-truth rules are the production code. The skill's blanket price
summary and fixed proof-scene numbers are stale in places; they must not override
the real-estate exception or actual formula definitions. Image camera-pool drift
remains the separate documented slice in [the nightly SOP](nightly_regression.md).

## Verification and handoff

The reporter's new checks failed against PR #136's original wording/flags
(four failures), then all 20 passed after the correction. An independent offline
Vitest probe exercised timeout, assertion error, synthetic provider error,
passing and skipped cases: expected exit 1, three failed / one passed / one
skipped. JSON lost the timeout message to `STACK_TRACE_ERROR`; XML retained the
real message and console output. Parsing/evidence assertions passed.

Before approval, the proposed regex was evaluated separately: the saved
service line and prompt exemplar fail the old detector and pass the proposal;
four product/negative/ambiguity controls retain their prior results. This is
limited regex evidence. After approval, the actual production flow was exercised
through the shared adapter with a fake Gemini client and isolated telemetry:
24 adapter, 21 storyboard/detector and 20 reporting tests passed (65 total).
This offline check does not exercise live provider behavior or HTTP auth/quota.
Build, full-suite and repository gate results are recorded in NOW.md and the PR.
The only production-code edit is the approved detector addition. No live provider
call, model migration, merge or production deployment was performed. PR #136
remains the dependency for this follow-up.
