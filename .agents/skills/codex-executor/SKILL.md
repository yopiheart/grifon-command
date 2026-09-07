---
name: codex-executor
description: Delegate a mechanical, spec-tight implementation brief to GPT 5.6 Sol via the Codex CLI — the second executor lane beside the code-executor subagent. Use only for unambiguous MECHANICAL briefs (api/ handlers, type plumbing, spec'd refactors, test writing). NOT for UI/DESIGN.md work, ambiguous briefs, or anything near TUNED files (those stay with code-executor), and NEVER as the checker/reviewer of any diff — review stays in the Codex main loop. Requires Codex CLI installed + logged in (cafe PC only, not the web sandbox).
---

For Codex tool execution, read [the desktop adapter](../_shared/codex-runtime.md) before following the workflow below.

This is the optional local CLI executor lane. In Codex desktop, prefer the `code-executor` subagent with the same complete brief. The historical trial is recorded in `workflows/codex_executor_trial.md`; it does not establish current model availability or a separate quota pool.

## Lane routing (who executes what)

| Brief | Executor |
|---|---|
| Mechanical, spec-tight: api/ handlers, type plumbing, refactors with acceptance criteria, test writing | **This skill** (optional Codex CLI) |
| UI-heavy, DESIGN.md surfaces, ambiguous briefs, anything near TUNED files | `code-executor` subagent (inherits the selected model) |
| Fallback when this skill exits 10/11/12 | `code-executor` subagent (inherits the selected model), same brief |
| Checking / reviewing ANY diff | Codex main loop — **never the same builder** (builder ≠ reviewer, see `workflows/pr_review_loop.md`) |

## Prerequisites (one-time per machine)

A runnable local Codex CLI with authenticated access. Use `scripts/restore-codex.ps1` when setup is needed; verify CLI help and login status without reading auth files. Desktop sign-in and CLI availability are separate checks.

## How to use it

1. **Write the brief to an in-repo file** (e.g. `.tmp/brief-<slug>.md`). Codex has NO conversation context — same rule as `code-executor`: the brief must contain the plan (or plan-file path), the files in scope, and acceptance criteria.
2. **Working tree must be clean** (tracked files) — the wrapper diffs against HEAD to isolate Codex's work, and refuses to start otherwise.
3. Run:

```bash
node .agents/skills/codex-executor/execute.mjs --brief .tmp/brief-<slug>.md [--model <sol-model-id>] [--self-review]
```

- `--model` — optional Codex model override. Omit to inherit the CLI default; set it only when the user explicitly requests a supported model.
- `--self-review` — runs Sol's devil's-advocate second pass over its own diff (dead handlers, unwired UI, unmet acceptance criteria) before the wrapper verifies. Recommended for anything with a UI edge; it's the brief's "multi-pass refinement" pattern and it's cheap (ChatGPT-plan tokens).

4. **Review the diff in the main loop** (Codex), exactly as with a `code-executor` report. The wrapper never commits. When the main loop commits the reviewed diff, it stamps `Executor: codex-sol` as a git trailer (AGENTS.md convention) — that trailer is the only durable record of which lane wrote what, and it's what `node tools/executor_ledger.mjs` reads to keep the reopenable gate below scorable against the Opus 5 baseline.

## What the wrapper enforces (Codex doesn't know Grifon's rules — the wrapper does)

- **TUNED-file guardrail:** ANY diff to `services/geminiService.ts` or `api/_lib/prompts.ts` → saved to `.tmp/codex-executor-tuned-flagged.patch`, left for main-loop review, exit 2. Distinguishing transport-only from tuned-content mechanically isn't reliable, so the rule is conservative; the main loop must inspect the preserved diff, and tuned-content changes go to Neil.
- **Verification:** `npm run build` + `npx vitest run` must pass (exit 3 on failure, diff left in tree).
- **Sandbox:** Codex always runs `--sandbox workspace-write` (workspace-write sandbox); never bypassed.

## Exit codes → what to do

| Code | Meaning | Action |
|---|---|---|
| 0 | Diff ready, build + tests green | Main loop reviews, then commits |
| 2 | TUNED-file guardrail tripped | Review remaining diff; tuned patch → Neil |
| 3 | Build or tests failed | Re-brief Codex with the failure, or fall back to `code-executor` |
| 10 / 11 | Codex missing / not logged in | Re-arm (`scripts/restore-codex.ps1`) or fall back to `code-executor` |
| 12 | **Sol quota / plan limit hit** | **Automatic-fallback SOP: dispatch the SAME brief to `code-executor` (inherits the selected model). No re-planning needed.** |

There is no harness-level auto-switch (hooks can't change models); this exit-code contract IS the fallback mechanism — deterministic at the dispatch layer.

## After every run

Log notable outcomes in `workflows/codex_executor_trial.md`, including actual executor model when known, verification and independent review findings. A historical executor name is not proof of which model ran today.

## Scope

Dev-time executor lane for the agent pipeline — not wired into the Grifon product, and unrelated to the product's server-side AI (see `workflows/concierge_director_plan.md`).
