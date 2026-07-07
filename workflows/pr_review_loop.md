# Workflow: PR Review Loop (fresh-context critic)

**Objective:** Before a PR merges, get a high-recall code review from a *fresh* sub-agent — never
the agent that wrote the code. A builder cannot reliably self-critique; "fresh eyes" catch what the
author is blind to.

Use this whenever a PR is open and this session is babysitting it (Tier 5 of
[loops.md](loops.md) — `subscribe_pr_activity`), or right after you open a PR yourself.

This is the **lightweight, no-secret** form: the review runs *in-session* via a sub-agent. There is
no GitHub Action running Claude and no `ANTHROPIC_API_KEY` in CI (deferred — see Edge Cases).

## Required Inputs

- PR number + repo (`owner/repo`).
- The PR head diff (fetch fresh each run — don't review a stale diff).

## Tools

- `mcp__github__pull_request_read` (method `get_diff`) — the diff to review.
- `Agent` tool with `subagent_type: general-purpose` — the fresh critic.
- `mcp__github__add_issue_comment` — post the findings summary. (The `code-review` skill with
  `--comment` is the in-session alternative.)
- TUNED reference: [../services/CLAUDE.md](../services/CLAUDE.md) Hard Rules, `CLAUDE.md` TUNED-file
  guardrail, [../.claude/skills/surgical-edit/](../.claude/skills/surgical-edit/).

## Procedure

1. **Fetch the diff.** `pull_request_read` → `get_diff` for the PR head. If the diff is empty or
   huge (>~1500 changed lines), note that in the comment and review the highest-risk files first.
2. **Spawn a fresh critic — builder ≠ reviewer.** Use the `Agent` tool, `subagent_type:
   general-purpose`, **blind to your build rationale** (don't paste your own justifications — that
   re-introduces the self-grading bias). Mirror the handoff shape already used in
   [../.claude/skills/brand-check/SKILL.md](../.claude/skills/brand-check/SKILL.md),
   [../.claude/skills/gemini-eval/SKILL.md](../.claude/skills/gemini-eval/SKILL.md), and
   [../.claude/skills/straw-man-audit/SKILL.md](../.claude/skills/straw-man-audit/SKILL.md).
   Give it the diff plus high-recall instructions, in this priority order:
   - **Correctness bugs** (logic errors, null/undefined, off-by-one, broken state transitions, async
     races) — highest priority.
   - **Security / fail-open** (auth bypass, rate-limit/quota fail-open, secret or crown-jewel leak
     into the client bundle, PayMongo webhook) — pair with `straw-man-audit` if the diff touches
     `api/` or `api/_lib/`.
   - **Reuse / simplification** (duplicated logic, primitives that already exist in
     `components/ui/`, dead code).
   The critic is **report-only** — it does NOT edit. It returns findings ranked Critical / Major /
   Minor with `file:line` references.
3. **Apply the TUNED carve-out.** Tag any finding whose fix would touch tuned content —
   `services/geminiService.ts` (prompts, schemas, model IDs, safety rules), `api/_lib/prompts.ts`
   (crown-jewel prompts), or `api/_lib/` signatures/RPC names — as **"⚠️ REQUIRES NEIL — do not
   auto-apply."** Escalate; never auto-fix or auto-approve tuned diffs (`CLAUDE.md` TUNED-file
   guardrail; `agent_lessons.md` 2026-05-09). This list is intentionally **broader** than the
   `CLAUDE.md` `/goal` guardrail (which scopes to prompt/schema content only) — it mirrors the
   fuller `services/CLAUDE.md` Hard Rules.
4. **Post the findings** as a single PR comment via `add_issue_comment`: grouped by severity, each
   with `file:line` and a one-line fix suggestion, TUNED items clearly flagged.
5. **Act within the babysit rules** (the PR-babysit loop — [loops.md](loops.md) Tier 5):
   - Apply only **small, clearly-correct, non-TUNED** fixes, then push.
   - Anything ambiguous, architectural, or TUNED → comment + ask Neil.
   - Re-run this whole loop on each significant new push to the PR.

## Output

- One PR comment with ranked findings (TUNED items flagged for Neil).
- Optionally, a fix commit for small non-TUNED issues.
- No merge decision is made by the critic — green CI + Neil's call still gate the merge.

## Gatekeeper summary (opt-in, big merges only)

For large feature-branch merges, Neil can request a **gatekeeper summary** ("gatekeeper
summary for PR #X"). This is a comprehension aid for the human gate, not a new automated
gate — it never merges, approves, or blocks anything, and it is NOT part of the default
loop above. Only produce one when Neil asks.

Build a self-contained HTML report (via the Artifact tool; on a cafe PC without it, a
markdown file works) with three parts:

1. **Intuition summary** — what changed and *why*, per module/file group, written for a
   reader on a phone who hasn't seen the diff. Lead with the user-visible behavior change.
2. **Risk map** — what could break, which flows to watch post-merge, and any TUNED-file
   or migration touchpoints (flag these the same way as step 3 of the Procedure).
3. **Self-check quiz** — 3–5 questions at the bottom probing whether the reader could
   predict the change's behavior (answers hidden behind `<details>` toggles). Neil merges
   only once the answers hold no surprises.

## Edge Cases / Learnings

- **Don't let the critic merge or approve.** It is report-only by design. Merge stays a human/green-CI
  gate (Tier 0b CI + Neil).
- **Stale diff trap.** Re-fetch `get_diff` every run; reviewing an out-of-date diff posts misleading
  findings.
- **Token hygiene.** The critic dies with its sub-agent — its context (the full diff) does not
  pollute the main session. That's the point; it's the same reason `smoke-tester` and the other
  critics are sub-agents.
- **Full-auto is deferred.** A GitHub Action that runs Claude on every PR open (no human in the
  loop) needs an `ANTHROPIC_API_KEY` secret in CI. Adding a CI secret is a security-surface change —
  route it through `straw-man-audit` first, and get Neil's explicit go.
