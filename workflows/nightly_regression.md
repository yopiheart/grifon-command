# Nightly Regression — SOP

The Tier 3 loop from [loops.md](loops.md), armed. A cloud-scheduled GitHub
Action runs the live Gemini ad-script regression every night and surfaces any
regression as a GitHub Issue. It is the first Grifon loop that *discovers its
own work and runs while Neil sleeps* — the missing piece from the Loop
Engineering evaluation (see [post_beta_roadmap.md](post_beta_roadmap.md) #1).

It runs in the **cloud**, on purpose: local `/loop` needs the machine on and
dies with the cafe-PC defreezer; a GitHub Actions `schedule` runs on a fresh
clone with the machine off.

## Trigger

- **Scheduled:** `cron '0 18 * * *'` — 18:00 UTC ≈ 02:00 PHT (overnight, Manila).
- **Manual:** `workflow_dispatch` (Actions tab → "Nightly Regression" → Run).
- Workflow: [.github/workflows/nightly-regression.yml](../.github/workflows/nightly-regression.yml).
- The schedule only fires on **`main`**. A manual branch dispatch is a paid
  operation and requires the approved exact-input/cost test spec first.

## Golden inputs

The existing suite [tests/regression/script-gen.regression.test.ts](../tests/regression/script-gen.regression.test.ts),
gated by `RUN_REGRESSION=1`. Its baseline is four brand briefs × two formulas:

| Brand | Category | Formulas |
|---|---|---|
| Bukidnon Brew | Coffee (OFW-wife baseline) | MrBeast, Testimonial |
| MalinisPH | Cleaning service | MrBeast, Testimonial |
| Glaze PH | Skincare (adult acne) | MrBeast, Testimonial |
| BulkPH Coach | Online gym coaching | MrBeast, Testimonial |

The three non-coffee briefs are deliberate stress tests — they probe whether the
prompt's hardcoded archetypes generalize beyond the OFW-coffee shape.

The current suite also includes four UGC Pro cases: fashion Try-On, skincare
Transformation, service Before & After, and real-estate Tutorial (12 script
cases total). The workflow also runs the one-video EDL attachment canary;
`RUN_EDL_FULL_CAP` stays unset. Fixtures and assertions are unchanged by the
September 2026 fidelity fix.

The script harness retains the client `generateAdScript` call and fake-auth
fetch boundary, then invokes the real server `FLOW_REGISTRY.adscript` through
the shared test adapter. Classification, retries, parsing, and resolved-format
metadata therefore follow production. Telemetry is mocked so evaluation cannot
write production data. This does not test real authentication, rate limits,
quotas, or the complete HTTP handler.

## Success criteria (the "say no")

v1's check is the suite's **deterministic-invariant assertions** — stable across
Gemini's stochastic output, no LLM judgment needed:

- `hook1` / `hook2` present, arrays, non-empty (the hook-starvation guard from
  commits `5357780` / `651a993`).
- `body` is an array of **≥ 5 lines** for baseline formulas, **≥ 3** for the
  four UGC Pro cases.
- `strategicAudit` is a string.

A run passes when the selected suites finish successfully with recorded
results. These structural assertions do not establish creative quality.

## Failure output (persistence)

1. **Step summary** — distinguishes setup failure (names the step; tests did
   not run), failed tests (lists the names), incomplete execution evidence,
   missing-key skip, and successful execution. Cancellation has no quality verdict.
2. **GitHub Issue** — opened for setup, test, execution, or artifact-upload
   failure, label `regression`, with the failure class and date in the title.
   Successful and missing-key-skipped runs do not create failure issues.
3. **Artifact** — `nightly-regression-results` contains Vitest JSON and JUnit XML when
   produced. The report links it only after successful upload returns an artifact
   id (30-day retention). Otherwise use the Actions log; an empty upload does not
   prove an artifact exists.

Vitest JSON's `assertionResults` entries represent whole tests, including timeouts
and thrown provider errors. They do not prove an assertion was reached. In the
saved September runs, `failureMessages` contained only `STACK_TRACE_ERROR` and
the test creation stack, while the Actions log showed the real timeout message.
The additional `results.xml` preserves error messages and captured console output
without adding provider calls. If execution is killed before reporters finish,
either file can still be absent; use the run log and report incomplete evidence.

See the [saved-output audit](script_failure_audit_2026-09-16.md) for the 14 timeout
failures, separate content findings, and an exact detector proposal. A later
printed script does not retroactively turn a timed-out test into a pass.

For example, [run 34898931978](https://github.com/yopiheart/grifon-command/actions/runs/34898931978)
on September 14 failed during `npm ci`: the `ffmpeg-static` binary download
returned HTTP 500. Gemini tests were skipped. Its old generic issue is not
evidence of a script-generation defect. A failed EDL test name likewise does not
by itself establish a production incident or authorize changing tuned settings.

Neil triages from the issue. **Human-review door:** the loop only *reads*
generation output — it never commits, edits a tuned prompt, or merges. Any fix
that would touch `services/geminiService.ts` or `api/_lib/prompts.ts` is TUNED —
escalate, never auto-apply (same flag-don't-apply rule as
[pr_review_loop.md](pr_review_loop.md)).

## Cost boundaries

The fixture set is fixed, but classifiers and production retries add provider
calls; one case is not necessarily one generation. Restoring transformation
retry parity can increase evaluation calls relative to the old broken mirror.
The earlier eight-call/$0.08 estimate is obsolete. Recalculate the exact-input
budget before an approved live verification; no paid run is authorized by a
passing offline test. `timeout-minutes: 20` bounds wall time, not dollars.
`concurrency` prevents overlapping workflow runs.

## Image-evaluation audit (September 16, 2026)

The two tools below are separate experiments, not part of the nightly suites.
Their saved historical results remain evidence about their original inputs;
they must not be presented as current-production comparisons without checking
the assembled requests against current code.

- `tools/eval_scene_image_models.mjs` still has four `AVATAR_CAMERA_ANGLES`,
  including `HIGH_ANGLE_SELFIE`; production has three after the approved July 25
  removal. This changes modulo-based angle selection too. Its replicated image
  assembly is not a live import of production.
- `tools/eval_realism_formula.mjs` calls its copied arm "current" but also
  reconstructs prompts independently. Matching individual constants alone cannot
  establish complete request parity.
- Static comparison found `REALISM_INSTRUCTION` and `SAFETY_SETTINGS` equal in
  both tools; `REALISM_INSTRUCTION_UGC` also matches in the model tool. The compared
  `NO_TEXT_CONSTRAINT` difference is trailing whitespace only, not a semantic rule
  change. Do not classify every textual mismatch as a quality defect.

No image prompts, models, assets, or generations were changed by this slice.
Any resynchronization of copied tuned content requires its exact diff for Neil's
approval. Historical experiments must retain their original input provenance.

## Prerequisite

`GEMINI_API_KEY` must exist as a repo Actions secret (Settings → Secrets and
variables → Actions). This is the *first* secret in CI — `ci.yml` is deliberately
secret-free; this workflow is the one place a real key is needed. Until it's set,
runs **skip cleanly** (green, with a `::warning::` + step-summary note) rather than
failing — so merging before the secret is added does not spawn nightly false-alarm
issues. The moment the secret exists, the next run tests for real.

## Kill switch

Disable "Nightly Regression" in the repo's Actions settings, or delete
[.github/workflows/nightly-regression.yml](../.github/workflows/nightly-regression.yml).

## Increment roadmap

- **v1 (this):** adscript suite, deterministic invariants, GitHub Issue channel.
- **Increment 2:** add a Step 5 storyboard regression test (STILL_FRAME /
  IDENTITY_LOCK invariants) to the same loop — the spec's original v1 module,
  highest regression history.
- **Move 2:** an LLM harsh-critic that *verifies by acting* (semantic judgment,
  watches/re-runs output). Requires `ANTHROPIC_API_KEY` in CI → run
  `straw-man-audit` on that exposure surface first, add hard token caps.
  - **Cross-model by design:** Gemini authors, **Claude judges** — an
    *independent* model is the whole reason it stays valuable. This is NOT
    same-model self-grading (which matured base models make redundant); a
    generator grading its own output is the anti-pattern, a different model
    checking it is not. Reuse the `gemini-eval` ruleset as the judge's rubric.
  - **Resume trigger:** build this when EITHER (a) a prompt-tuning sprint starts
    on `services/geminiService.ts` / `api/_lib/prompts.ts` (frequent tuned-prompt
    edits are exactly what deterministic invariants can't catch — structurally
    valid but strategically bad output slips through), OR (b) active users cross
    a threshold where a bad-but-valid script reaching a customer actually costs
    us. Pre-launch, low volume → the cost of *not* having it is low, so it stays
    parked. Don't spend a launch-readiness slot on it before the trigger fires.
- **Bake-and-Leap:** the inverse verdict ("did a blocked, model-capped feature
  finally cross the threshold?") — same harness, opposite sign. Still parked;
  resume per [post_beta_roadmap.md](post_beta_roadmap.md) #1.
- **Dedup / Discord webhook:** one issue per failing night is fine for v1; issue
  dedup and a Discord channel are v2.
