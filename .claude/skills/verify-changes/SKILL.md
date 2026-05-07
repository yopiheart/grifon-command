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

## What this skill does NOT cover

- Stochastic Gemini outputs (creative scripts, storyboards, images) — manual eyeballing still required
- Visual design fidelity — that's `DESIGN.md`'s job
- Pre-edit scope discipline (don't widen the blast radius) — that's `surgical-edit`'s job
