---
name: verify-changes
description: Run the verification loop after editing code in this repo. Define success criteria first, then loop until all checks pass. Use after any edit to api/, services/, components/, or App.tsx, and before reporting a task as complete.
---

Before declaring any task complete, run the loop below. Do not stop after step 1 — a clean type-check is necessary, not sufficient.

## 1. Define success
Write down in plain English what "working" looks like for this specific change. One or two sentences. If you can't write it, you don't understand the task yet — go back and grill the user.

## 2. Run the verifier
- `npm run build` (tsc + vite production build)
- `npm run test` if tests exist that cover the touched area

If either fails, fix the root cause and re-run. Do not bypass with `// @ts-ignore` or skipped tests unless the user explicitly approves it.

## 3. Smoke-check the affected flow
- `npm run dev`
- Click through the specific user flow your change touches
- For API changes: hit the endpoint via the dashboard module that uses it (don't just trust unit tests for transport/auth)

## 4. Loop until verified
If any step fails, fix and restart from step 2. Only declare done when all three pass.

## What this skill does NOT cover
- Stochastic Gemini outputs (creative scripts, storyboards, images) — these are not strictly verifiable; manual eyeballing is still required for those
- Visual design fidelity — that's DESIGN.md's job
