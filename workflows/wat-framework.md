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

## How to Operate

**1. Look for existing tools first.** Check `tools/` before building anything new.

**2. Learn and adapt when things fail.**
- Read the full error trace
- Fix the script and retest (check before re-running if it uses paid API calls)
- Document learnings in the workflow (rate limits, timing quirks, unexpected behavior)

**3. Keep workflows current.** Update workflows when you find better methods or discover constraints. Don't create or overwrite workflows without asking unless explicitly told to.

## Third-Party Skill/Tool Vetting (pre-install scan gate)

Before installing any THIRD-PARTY skill package, SKILL.md, or agent-facing tool (a community
skill, an external zip like the marvin-avatar source, anything from `npx skills add ...`), scan
it with **SkillSpector** (nvidia/skillspector — adopted 2026-07-20, see the agent_lessons.md
decision log of that date):

```powershell
.\scripts\restore-python.ps1   # on-demand only — never in SessionStart
python -m pip install "skillspector @ git+https://github.com/NVIDIA/skillspector.git@<pinned SHA — see agent_lessons 2026-07-20>"
skillspector scan <target> --no-llm --format json --output .tmp/skillspector-<name>.json
```

Rules:
- **Static-only (`--no-llm`), Claude judges the JSON inline.** The tool's LLM stage stays off
  (no extra keys/quota); the main loop reads the report and filters false positives itself —
  same "review stays in the Claude main loop" doctrine as PR review.
- **HIGH/CRITICAL or DO_NOT_INSTALL → stop and show Neil the findings verbatim.** Advisory,
  not auto-blocking — Neil stays the approver, exactly as today.
- **Calibrate for false positives:** regex can't see negation ("Never bypass safety gates"
  scores as a jailbreak) and flags subprocess/env access regardless of intent. Judge findings
  in context; a high score on a capability-heavy but legitimate skill is expected.
- **Scope honestly:** this covers skill packages only — NOT the npm/CLI supply chain pulled by
  `restore-*.ps1`, unpinned runtime pip deps in `tools/`, or untrusted runtime content
  (videos/images). It also cannot inspect images or binaries inside a package.
- **No restore script, no CI, no MCP mode** until the gate has fired on ≥3 real adoption
  events (same corroboration bar as code-review-graph). If it fires ~never, retire this
  section.

## Decomposing Build Work: Vertical-Slice Rules

CLAUDE.md already mandates "vertical slices over horizontal layers"; these rules make a slice
well-formed. Apply them whenever a plan doc breaks work into slices, phases, or a priority stack
(adapted from Matt Pocock's `to-tickets` skill, evaluated 2026-07-08):

1. **Complete path through every layer.** A slice cuts narrow but whole — types + service call +
   UI + state through one feature. Never "all types first, then all services."
2. **Independently verifiable.** Each finished slice is demoable/checkable on its own (build-gate
   pass, a test, or a smoke) — not "makes sense only once the next slice lands."
3. **Sized to a single context window.** If a slice can't plausibly be planned, built, and
   verified inside one session's ~100k-token smart zone, split it. This is the context-hygiene
   doctrine turned into a decomposition rule.
4. **Explicit blocking edges.** Every slice states what it's blocked by ("Slice 2 blocked by
   Slice 0 landing"). Order by dependency, not by convenience.
5. **Wide refactors use expand–contract.** Add the new path alongside the old, migrate callers,
   then remove — CI stays green at every intermediate commit (matters here because the defreezer
   means any session can be the last one before a wipe).

The build-slices list in `concierge_director_plan.md` §10 is the house example of this shape.

## The Self-Improvement Loop

1. Identify what broke
2. Fix the tool
3. Verify the fix works
4. Update the workflow with the new approach
5. Move on with a more robust system
