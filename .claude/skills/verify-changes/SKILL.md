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

## Repo-specific verification rules (promoted from agent_lessons.md)

Each of these bit us at least twice before being promoted here (Tier 4, [workflows/loops.md](../../../workflows/loops.md)). Full post-mortems: [agent_lessons.md](../../../agent_lessons.md) / [workflows/agent_lessons_archive.md](../../../workflows/agent_lessons_archive.md).

- **Verify at the output boundary, not an intermediate one.** A utility that crosses module boundaries needs `grep -rn` for every call site, plus the question: does the value reach the *external system* (Veo, the rendered MP4, the browser) or just the next internal stage? Then test the **side effect** (the real Veo audio, the rendered frame), not the data transformation. (2026-05-26 ×2)
- **Sample model compliance with any new prompt classification/labeling rule in-vivo (2–3 runs) before merging.** A rule the model ignores is a no-op that looks shipped. Sample the upstream generator's actual vocabulary before anchoring a classifier on phrases it may never produce. When the downstream effect is deterministic and compliance is unreliable, anchor it in code, not the prompt. (2026-05-26, 2026-05-29)
- **Assert motion inside the motion window.** For any animation/transition/render check, first locate WHERE the motion happens, then extract frames densely inside that window — never inherit a sampling grid from a subject that moved at a different speed; a resolved-state frame proves nothing. (2026-05-22, 2026-06-08)
- **Triage "your change broke X" before fixing it.** `git diff` — does the change touch the failing path at all? Then classify: upstream (console 502/timeout → provider, retry), stochastic (regenerate; a clean second sample disproves a regression), or real code regression. (2026-05-13, 2026-05-29)

## What this skill does NOT cover

- Stochastic Gemini outputs (creative scripts, storyboards, images) — manual eyeballing still required
- Visual design fidelity — that's `DESIGN.md`'s job
- Pre-edit scope discipline (don't widen the blast radius) — that's `surgical-edit`'s job
