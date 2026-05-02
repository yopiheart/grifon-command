# Workflow: Fix a Broken Feature

**Objective:** Take one item from the audit punch list and ship a working fix.

Use this when the operator picks a specific broken/incomplete feature and says "fix this."

## Required Inputs

- Feature name (module + specific behavior) — e.g. "GenerateVideo — submit button doesn't call the API"
- Expected behavior (what "fixed" looks like)
- Priority (P0/P1/P2/P3) — governs how much polish to add

## Tools

- `npm run dev` — local preview server
- Browser (agent opens http://localhost:5173 and validates interactively if possible)
- Grep / Read / Edit for code work

## Procedure

1. **Reproduce.** Run `npm run dev`, navigate to the feature, confirm the exact failure mode.
2. **Locate.** Grep for the component/service. Read the relevant file. Identify the specific lines that need to change.
3. **Plan the change.** Before editing, describe to the operator in 1-3 sentences what you'll change and why. Wait for a go/no-go if the change crosses modules.
4. **Edit.** Smallest correct change. No refactors outside the bug unless the operator asked.
5. **Verify.**
   - Type check: `npx tsc --noEmit`
   - Build: `npm run build`
   - Manual UI test in browser for the exact reported flow
   - Check at least one adjacent flow didn't regress
6. **Update the audit.** Remove the fixed item from `.tmp/app_audit.md` (or re-run `workflows/app_audit.md` if many items changed).
7. **Report back.** One sentence: what changed, where (`file:line`), what to test.

## Output

- Code changes in the repo
- Short summary to operator with test steps

## Edge Cases / Learnings

- If the fix touches `services/geminiService.ts`, triple-check you haven't broken other modules that share the same function. That file is fan-in heavy.
- If the fix requires a new env var, update both `.env.example` and flag the operator to add the real value to `.env`.
- Never commit to fixing it in one shot if the root cause is "whole subsystem missing" (e.g., Supabase auth). Escalate — that's its own workflow.
- If a dev server is already running, reuse it instead of starting a new one.
