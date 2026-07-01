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
- ⚠️ The schedule only fires once the workflow is on **`main`** (GitHub runs
  schedules from the default branch only). Test on a branch via `workflow_dispatch`.

## Golden inputs (v1: adscript)

The existing suite [tests/regression/script-gen.regression.test.ts](../tests/regression/script-gen.regression.test.ts),
gated by `RUN_REGRESSION=1`. Four brand briefs × two formulas (8 generations):

| Brand | Category | Formulas |
|---|---|---|
| Bukidnon Brew | Coffee (OFW-wife baseline) | MrBeast, Testimonial |
| MalinisPH | Cleaning service | MrBeast, Testimonial |
| Glaze PH | Skincare (adult acne) | MrBeast, Testimonial |
| BulkPH Coach | Online gym coaching | MrBeast, Testimonial |

The three non-coffee briefs are deliberate stress tests — they probe whether the
prompt's hardcoded archetypes generalize beyond the OFW-coffee shape.

## Success criteria (the "say no")

v1's check is the suite's **deterministic-invariant assertions** — stable across
Gemini's stochastic output, no LLM judgment needed:

- `hook1` / `hook2` present, arrays, non-empty (the hook-starvation guard from
  commits `5357780` / `651a993`).
- `body` is an array of **≥ 5 lines**.
- `strategicAudit` is a string.

A run PASSES when all 8 generations satisfy every assertion. Any failure = the
loop says "no".

## Failure output (persistence)

1. **GitHub Issue** — opened automatically on failure, label `regression`, title
   `Nightly regression FAILED — <date>`, body lists the failed checks + run link.
2. **Artifact** — `nightly-regression-results` (the vitest JSON + log) attached to
   every run, pass or fail, 30-day retention.

Neil triages from the issue. **Human-review door:** the loop only *reads*
generation output — it never commits, edits a tuned prompt, or merges. Any fix
that would touch `services/geminiService.ts` or `api/_lib/prompts.ts` is TUNED —
escalate, never auto-apply (same flag-don't-apply rule as
[pr_review_loop.md](pr_review_loop.md)).

## Cost cap

Fixed 8-test suite, no parallel fan-out, no retries → ≈$0.08/night of Gemini
(`gemini-3.1-flash-lite`). `timeout-minutes: 20` is the circuit breaker so a hung
call can't spin the job overnight. `concurrency` prevents overlapping runs.

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
