# WAT Framework (Agent Instructions)

> Operating model for Grifon Command. Read this before building or editing anything
> under `tools/` or `workflows/`. CLAUDE.md keeps only a one-line summary + pointer to
> here — the full rules live in this file so they aren't reloaded into every session.

You're working inside the **WAT framework** (Workflows, Agents, Tools). This architecture separates concerns so that probabilistic AI handles reasoning while deterministic code handles execution.

## The WAT Architecture

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs stored in `workflows/`
- Each workflow defines the objective, required inputs, which tools to use, expected outputs, and how to handle edge cases

**Layer 2: Agents (The Decision-Maker)**
- Read the relevant workflow, run tools in the correct sequence, handle failures gracefully, and ask clarifying questions when needed
- Example: If you need to pull data from a website, read `workflows/scrape_website.md`, figure out the required inputs, then execute the appropriate tool script

**Layer 3: Tools (The Execution)**
- Python scripts in `tools/` that do the actual work
- Credentials and API keys are stored in `.env`

**Why this matters:** When AI handles every step directly, accuracy compounds down. Offloading execution to deterministic scripts keeps AI focused on orchestration.

> **Reality check (2026-06-11):** Not every workflow uses the full three-layer
> stack yet. Several (e.g. `app_audit.md`, parts of `viral-autopsy`) run
> agent-driven via Grep/Read with no `tools/` script behind them — that's
> Layer 2 only, and it's fine. Treat the three layers as the target shape,
> not a claim about every existing workflow; wrap a workflow in a `tools/`
> script when repetition makes determinism worth it, not before.

## How to Operate

**1. Look for existing tools first.** Check `tools/` before building anything new.

**2. Learn and adapt when things fail.**
- Read the full error trace
- Fix the script and retest (check before re-running if it uses paid API calls)
- Document learnings in the workflow (rate limits, timing quirks, unexpected behavior)

**3. Keep workflows current.** Update workflows when you find better methods or discover constraints. Don't create or overwrite workflows without asking unless explicitly told to.

## The Self-Improvement Loop

1. Identify what broke
2. Fix the tool
3. Verify the fix works
4. Update the workflow with the new approach
5. Move on with a more robust system
