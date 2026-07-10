---
name: codex-executor
description: Delegate a mechanical, spec-tight implementation brief to GPT 5.6 Sol via the OpenAI Codex CLI — the second executor lane beside the code-executor subagent. Use when an approved plan is MECHANICAL (api/ handlers, type plumbing, refactors with clear acceptance criteria, test writing) and the brief is unambiguous. Do NOT use for UI-heavy or design-touching work (DESIGN.md surfaces), ambiguous briefs, or anything near TUNED files — those stay with code-executor (Opus 4.8). NEVER use Codex/Sol as the checker or reviewer of any diff — checking stays with the Claude main loop. ONLY works where the Codex CLI is installed and logged in (the cafe PC), NOT in the locked web sandbox.
---

This skill is the **GPT 5.6 Sol executor lane** (decided 2026-07-10): a bridge that hands a full implementation brief to the OpenAI Codex CLI, then enforces Grifon's guardrails post-hoc. Same bridge pattern as `codex-image`; billed to the ChatGPT plan via `codex login`, so execution tokens don't draw on the Claude Max 5x pool at all.

**⚠ GATED TRIAL** until `workflows/codex_executor_trial.md` records 3–5 reviewed tasks and an adopt/drop decision. Until then, using this lane requires Neil's per-task OK.

## Lane routing (who executes what)

| Brief | Executor |
|---|---|
| Mechanical, spec-tight: api/ handlers, type plumbing, refactors with acceptance criteria, test writing | **This skill** (Sol via Codex) |
| UI-heavy, DESIGN.md surfaces, ambiguous briefs, anything near TUNED files | `code-executor` subagent (Opus 4.8) |
| Fallback when this skill exits 10/11/12 | `code-executor` subagent (Opus 4.8), same brief |
| Checking / reviewing ANY diff | Claude main loop — **never Sol** (builder ≠ reviewer, see `workflows/pr_review_loop.md`) |

## Prerequisites (one-time per machine)

Identical to `codex-image`: a paid ChatGPT plan, `npm i -g @openai/codex`, `codex login`. On the cafe PCs re-arm after a reboot with `scripts/restore-codex.ps1`. Does **not** work in the Claude Code web sandbox.

## How to use it

1. **Write the brief to an in-repo file** (e.g. `.tmp/brief-<slug>.md`). Codex has NO conversation context — same rule as `code-executor`: the brief must contain the plan (or plan-file path), the files in scope, and acceptance criteria.
2. **Working tree must be clean** (tracked files) — the wrapper diffs against HEAD to isolate Codex's work, and refuses to start otherwise.
3. Run:

```bash
node .claude/skills/codex-executor/execute.mjs --brief .tmp/brief-<slug>.md [--model <sol-model-id>] [--self-review]
```

- `--model` — optional Codex model override. Set this to the GPT 5.6 Sol model id once confirmed in `codex exec --help` / OpenAI docs; omitted, Codex uses its CLI default.
- `--self-review` — runs Sol's devil's-advocate second pass over its own diff (dead handlers, unwired UI, unmet acceptance criteria) before the wrapper verifies. Recommended for anything with a UI edge; it's the brief's "multi-pass refinement" pattern and it's cheap (ChatGPT-plan tokens).

4. **Review the diff in the main loop** (Claude), exactly as with a `code-executor` report. The wrapper never commits.

## What the wrapper enforces (Codex doesn't know Grifon's rules — the wrapper does)

- **TUNED-file guardrail:** ANY diff to `services/geminiService.ts` or `api/_lib/prompts.ts` → saved to `.tmp/codex-executor-tuned-flagged.patch`, reverted, exit 2. Distinguishing transport-only from tuned-content mechanically isn't reliable, so the rule is conservative; the main loop may deliberately re-apply a transport-only patch, and tuned-content changes go to Neil.
- **Verification:** `npm run build` + `npx vitest run` must pass (exit 3 on failure, diff left in tree).
- **Sandbox:** Codex always runs `--full-auto` (workspace-write sandbox); never bypassed.

## Exit codes → what to do

| Code | Meaning | Action |
|---|---|---|
| 0 | Diff ready, build + tests green | Main loop reviews, then commits |
| 2 | TUNED-file guardrail tripped | Review remaining diff; tuned patch → Neil |
| 3 | Build or tests failed | Re-brief Codex with the failure, or fall back to `code-executor` |
| 10 / 11 | Codex missing / not logged in | Re-arm (`scripts/restore-codex.ps1`) or fall back to `code-executor` |
| 12 | **Sol quota / plan limit hit** | **Automatic-fallback SOP: dispatch the SAME brief to `code-executor` (Opus 4.8). No re-planning needed.** |

There is no harness-level auto-switch (hooks can't change models); this exit-code contract IS the fallback mechanism — deterministic at the dispatch layer.

## After every trial-phase run

Log the task in `workflows/codex_executor_trial.md`: brief, diff size, wall-clock, review findings (esp. anything a `code-executor` run wouldn't have shipped). The trial gate decides whether this lane becomes the default for mechanical briefs.

## Scope

Dev-time executor lane for the agent pipeline — not wired into the Grifon product, and unrelated to the product's server-side AI (see `workflows/concierge_director_plan.md`).
