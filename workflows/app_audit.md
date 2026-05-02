# Workflow: App Audit

**Objective:** Produce a current, prioritized punch list of what's broken, stubbed, or risky in the GRIFON COMMAND React app.

Use this when:
- Starting a new sprint and we need to know the lay of the land
- Before a launch / demo to catch regressions
- After a big refactor to make sure nothing regressed

## Required Inputs

None. The audit reads the repo directly.

## Tools

No dedicated script yet. This is executed by the agent using Grep/Glob/Read across:
- `App.tsx` — module wiring, auth, hardcoded values
- `components/**.tsx` — UI modules, stubs, placeholders
- `services/**.ts` — API integrations
- `package.json` — dependency health
- `fix_mobile.js` — signals about unresolved mobile issues

(Future: if this runs often, wrap it in `tools/audit_app.py` that greps and emits JSON.)

## Procedure

1. **Module inventory.** Read `App.tsx` routing. For each registered module, mark: BUILT / PARTIAL / STUB.
2. **Placeholder scan.** Grep for `PlaceholderTool`, `coming soon`, `not implemented`, `TODO`, `FIXME`, `HACK`, `XXX`.
3. **Service health.** Open `services/geminiService.ts` and any other services. Flag: swallowed errors, mock returns, hardcoded keys, model IDs that might be deprecated.
4. **Auth review.** `App.tsx` currently uses an email allowlist + plaintext password. This is a **BLOCKER**. Confirm each audit whether it still exists.
5. **Hardcoded values.** Grep for emails, passwords, URLs, API endpoints, test data that should be env-driven.
6. **Accessibility pass.** Check forms for labels, buttons for aria attributes, images for alt text.
7. **Mobile check.** Look at any component that references fixed widths / absolute positioning / off-screen overflow.

## Output

Write the punch list to `.tmp/app_audit.md` with this structure:

```
# GRIFON App Audit — YYYY-MM-DD

## Top Blockers (P0)
- ...

## High (P1)
- ...

## Medium (P2)
- ...

## Low (P3)
- ...

## Module Status
| Module | Status | Notes |
| ...    | BUILT  | ...   |
```

Each entry: one sentence + `file:line` reference + severity tag.

## Edge Cases / Learnings

- `PlaceholderTool` is imported in `App.tsx` but may not be rendered for every module — check actual render logic, not just imports.
- `services/geminiService.ts` is large (~87KB). Don't try to read the whole thing at once; Grep for the specific patterns (error handling, model IDs, API key refs).
- Don't flag a module as STUB just because it has TODOs inside — check whether the primary action path works end-to-end.
