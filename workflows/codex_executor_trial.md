# Codex-Executor (GPT 5.6 Sol lane) — Trial Gate

**Status: OPEN — 0 of 3–5 trial tasks logged. The Sol lane is NOT the default executor until this gate closes with an ADOPT decision.**

## Why this gate exists

The Sol lane (`.claude/skills/codex-executor/`) was added 2026-07-10 off the back of a **single-source** benchmark brief (GPT 5.6 Sol vs Fable 5, n≈3 agentic builds) — below the repo's ≥3-corroboration bar (same standard as the Swipe File / Ad Performance Ledger). So it ships as a gated trial: run 3–5 real mechanical briefs through it, review each diff in the main loop as usual, log findings here, then decide.

The brief's claimed failure modes to watch for specifically: **broken/unwired UI components, dead event handlers, visually bare output, skipped styling** — the reasons the lane is restricted to mechanical, spec-tight briefs in the first place.

## Adopt / drop criteria

**ADOPT** (Sol becomes the default lane for mechanical briefs) if, across ≥3 logged tasks:
- No review finding a typical `code-executor` run would not also have produced (judged by the main-loop reviewer per task), AND
- Build + tests green on first or second attempt each time, AND
- No TUNED-file guardrail trips that indicate Codex ignoring the in-prompt rules.

**DROP** (delete the skill, revert the CLAUDE.md routing rule) if:
- ≥2 tasks ship a broken-behavior finding (dead handler, unwired UI, unmet acceptance criterion) that survives `--self-review`, OR
- The review burden on the main loop visibly exceeds what the quota separation saves.

Either way: record the decision + date below, update the CLAUDE.md model-allocation bullet, and close this gate.

## Trial log

| # | Date | Brief (path/slug) | Diff size (files/±lines) | Wall-clock | Self-review used? | Build/tests | Main-loop review findings | Verdict vs code-executor baseline |
|---|------|-------------------|--------------------------|-----------|-------------------|-------------|---------------------------|-----------------------------------|
| 1 | | | | | | | | |
| 2 | | | | | | | | |
| 3 | | | | | | | | |

## Decision

_(pending — fill after ≥3 logged tasks)_
