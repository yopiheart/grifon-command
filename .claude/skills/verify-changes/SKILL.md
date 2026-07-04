---
name: verify-changes
description: Validate code changes in two phases — a 3-line contract (success / failure / verification) BEFORE editing, then build + test + smoke loop AFTER. Use before any non-trivial edit to api/, services/, components/, or App.tsx, and before reporting a task complete.
---

Two phases. **Phase 1 (the contract) is non-negotiable for any non-trivial edit** — without it, Phase 2 has no fixed standard to check against and you'll drift toward "it builds, ship it" instead of "it does what was asked."

## Phase 1 — Write the contract (BEFORE you edit)

Before touching code, state these three lines in plain English:

1. **Success looks like:** the observable behavior that proves the change works
2. **Failure looks like:** the regression or edge case that would mean the change broke something else
3. **Verification:** the specific command, test, or click sequence that confirms #1 and rules out #2

If you can't write all three, you don't understand the task yet — go back and grill the user (see `grill-me` skill). Write the contract as part of your response so the user can correct it *before* any code lands. The contract is the spec Phase 2 runs against.

Tests-from-goals corollary: when the verification mechanism is a new test, write the test against what the feature *should* do, not against the implementation you're about to write. Tests written after implementation just confirm decisions — they don't catch bugs.

## Phase 2 — Run the verification loop (AFTER you edit)

1. **`npm run build`** (tsc + vite production build). Fix root causes — do not bypass with `// @ts-ignore` unless the user explicitly approves it.
2. **`npm run test`** if tests cover the touched area. Same rule: fix root causes, do not skip tests.
3. **Smoke-check the affected flow** via `npm run dev`. Click through the specific user flow your change touches. For API changes, hit the endpoint via the dashboard module that uses it — don't just trust unit tests for transport/auth.
4. **Loop until verified.** If any step fails, fix and restart from step 1. Only declare done when all three pass **and** the Phase 1 contract is satisfied.

A clean type-check is necessary, not sufficient.

**Separate critic for the subjective step.** Steps 1–2 are objective — exit codes, already gated by the build-gate Stop hook and `/goal`, so there is no self-grading risk there. Step 3 (smoke) and the "is the Phase 1 contract actually satisfied" call in step 4 are *judgment*, and judging your own change is the self-grading trap. For non-trivial work, hand the Phase 1 contract plus the change to a fresh `general-purpose` sub-agent and let it run the smoke flow and return the pass/fail verdict against the contract — the builder fixes, the critic re-verifies. See the "Run as a separate critic" section in `brand-check` for the spawn pattern (fresh context, blind to the builder's rationale, report-only).

**Adversarial diff review (correctness, not just behavior).** The smoke critic above checks *does it do what the contract says* — it doesn't hunt for correctness bugs the contract never anticipated. Before declaring non-trivial work done, also run `/code-review` on the diff: it reviews the current changes for bugs in a fresh subagent context, so the model that wrote the code isn't the one grading it. This is the project-code analogue of what `gemini-eval` / `brand-check` do for *model output* — a fresh pair of eyes on the artifact you just produced. Treat findings the way the best-practices doc advises: fix what affects correctness or the stated contract, and don't over-engineer chasing every speculative flag.

**Leading-words trace check (cheap, do it inline).** Grifon's skills steer with dense leitmotifs — *surgical edit*, *vertical slice*, *single source of truth*, *TUNED files*, *outcome before feature*. Steering only worked if the model speaks those words back to itself: scan your own reasoning trace for this change and confirm the leitmotif that governs the edit actually showed up. A `services/geminiService.ts` / `api/_lib/prompts.ts` touch should have *TUNED files* in the trace; a new module should have *vertical slice*; a one-line fix that started sprawling should have *surgical edit*. If the governing leading word never appears, the instruction didn't land — re-read the owning skill before declaring done, rather than trusting you "knew" the rule. The term echoing in the trace is the cheapest proof the steering took.

## Goal-compatible contract (when paired with `/goal`)

When the work spans many turns and you're driving it with [`/goal`](https://code.claude.com/docs/en/goal), the Phase 1 contract IS the goal condition — written so the blind evaluator can judge it from the transcript alone.

Translate the three lines into a single condition: **end state + stated check + constraint + turn cap**.

Example — refactoring a wizard step:

> *"`Step3AdScript.tsx` no longer imports from `legacy/` AND `npm run build` exits 0 AND `npm test` exits 0 AND the project Stop-hook reports the build-gate clean, with no edits to `services/geminiService.ts` or `api/_lib/prompts.ts`, OR stop after 20 turns."*

Why this shape works:
- **End state** is a grep-able fact Claude can demonstrate (`grep -r 'legacy/' Step3AdScript.tsx` returns empty).
- **Stated check** names the exit codes the evaluator can see in the transcript.
- **Constraint** locks the TUNED files so the evaluator cannot greenlight prompt drift.
- **Turn cap** bounds token spend per the CLAUDE.md "Goal-driven execution" convention.

If you can't compress all three Phase 1 lines into a single transcript-verifiable condition, the task is too large or too vague for `/goal` — break it into smaller goals or drive it by hand.

## What this skill does NOT cover

- Stochastic Gemini outputs (creative scripts, storyboards, images) — manual eyeballing still required
- Visual design fidelity — that's `DESIGN.md`'s job
- Pre-edit scope discipline (don't widen the blast radius) — that's `surgical-edit`'s job
