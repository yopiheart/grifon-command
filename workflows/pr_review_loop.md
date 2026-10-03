# Workflow: PR Review Loop (fresh-context critic)

## Codex desktop entry point

For Codex, follow AGENTS.md and the [desktop adapter](../.agents/skills/_shared/codex-runtime.md).
Use the available GitHub connector or authenticated CLI to read the current diff,
then give the task contract and diff to a fresh independent Codex agent. The main
loop resolves actionable findings and obtains a fresh review of relevant fixes;
it does not count its own review or an executor self-review as independent.
Keep findings local or in the authorized draft PR description unless the user
explicitly requests a posted comment. Merge and deployment require explicit requests.
The legacy Claude CI reviewer remains opt-in via ENABLE_LEGACY_CLAUDE_REVIEW.

### PR handoff

Use the [PR template](../.github/pull_request_template.md) for the handoff,
including when creating a PR with a connector or `gh --body-file` (those paths
can bypass GitHub's template). Scale the detail to the change; a small docs fix
can be three short paragraphs. This is author/reviewer guidance, not an automated
gate or merge approval. It does not replace any required checks.

- **Change:** explain the observable before/after and why it matters. Use a
  small diagram only when it reduces explanation; do not create a separate
  dashboard for every PR.
- **Proof:** identify the tested revision and any uncommitted changes. Link
  commands/results, CI and relevant screenshots/traces; label local-only files.
  Distinguish PASS, FAIL and NOT RUN, fixture-backed and live checks. Record the
  independent review's revision, verdict and unresolved findings. For each new
  defect regression, include evidence that it failed the original behavior.
  After changes, refresh affected checks/review; justify reuse of earlier evidence
  by identifying unchanged code, never silently call an earlier run current.
- **Risk and decision:** name affected flows, plausible failure, rollback and
  effects a revert cannot undo (charges, messages, lost data, migrations). State
  blockers and the next decision. Treat unknown risk as unknown. Test counts,
  small diffs and green CI cannot establish reversibility or authorize release.

Lead the chat handoff with the outcome, remaining blocker and next action in
Neil's language register; keep the repository PR body in English. The evidence
belongs in the PR, so Neil does not need to reconstruct the chat to assess it.

### Learn from a recurring finding

At closeout, consider whether a review finding or user correction exposes a
repeatable failure. If none does, stop; do not manufacture a lesson or a new gate.
Use the existing PR and `agent_lessons.md`, not a second resume document.

1. Identify the observed failure and its evidence. Prefer a code boundary that
   prevents it, then a targeted deterministic check, then narrowly scoped review
   guidance when it requires judgment. Search for an existing owner/check first.
2. Propose at most one prevention change per closeout. Implement it only within
   the authorized task and approval boundaries; otherwise record a concrete
   follow-up in the PR with the owning file and acceptance criterion. A proposal
   is not a shipped safeguard. Tuned content and paid tests keep their approvals.
3. If adding a check, prove it fails the original defect and passes the fix.
   Exercise the actual behavior, not a copied constant, source-text ordering or
   mocks that remove the failure. Static checks remain appropriate for static
   contracts such as import boundaries. Keep them scoped to avoid false alarms.
4. Link the prevention change and proof in the PR. Add/update `agent_lessons.md`
   only for reusable guidance that is not already recorded, pointing to the
   implementation/check when present. Keep the independent critic report-only;
   the builder fixes and the critic rechecks relevant changes.

The remaining procedure preserves the legacy Claude workflow. Its tool names,
reviewer allocation, CI assumptions, and posting steps do not configure Codex.

## Legacy Claude workflow

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
- The originating spec, if one exists (see Procedure step 2) — a `workflows/*.md` plan doc,
  the PR body, a kickoff message, or an approved plan file.

## Tools

- `mcp__github__pull_request_read` (method `get_diff`) — the diff to review.
- `code-review-graph` CLI (pip, pinned `2.3.7` + `tree-sitter-language-pack==0.13.0`) — blast-radius
  scoping for the critic (Procedure step 3). CLI only — do NOT register its MCP server (30 tools of
  passive context load; violates the context-hygiene doctrine). Validated against Grep ground truth
  2026-07-20 (3/3 known-answer tests, incl. the `generateVideo` vs `generateVideoPrompts` prefix
  trap from [gemini_proxy_slice.md](gemini_proxy_slice.md)).
- `Agent` tool with `subagent_type: general-purpose` — the fresh critic.
- `mcp__github__add_issue_comment` — post the findings summary. (The `code-review` skill with
  `--comment` is the in-session alternative.)
- TUNED reference: [../services/CLAUDE.md](../services/CLAUDE.md) Hard Rules, `CLAUDE.md` TUNED-file
  guardrail, [../.claude/skills/surgical-edit/](../.claude/skills/surgical-edit/).

## Procedure

1. **Fetch the diff.** `pull_request_read` → `get_diff` for the PR head. If the diff is empty or
   huge (>~1500 changed lines), note that in the comment and let step 3's blast-radius output set
   the review order.
2. **Locate the originating spec.** Find what this change was *supposed* to build: the
   `workflows/*.md` plan doc it executes, the PR body/description, the kickoff message, or the
   approved plan file. Pass it to the critic verbatim (the spec is not your build rationale — it
   predates the build, so it doesn't reintroduce self-grading bias). If no spec exists, say
   "no spec located" in the posted comment and skip the spec axis.
3. **Compute the blast radius (graph, not Grep).** Give the critic a structural map of what the
   diff can break, so scoping is mechanical instead of guesswork:
   ```bash
   code-review-graph build   # fresh graph first — a stale graph is the stale-diff trap in disguise (~10s)
   code-review-graph impact --files <changed files...> --depth 1
   code-review-graph query callers_of "<abs path>::<fn>"   # per changed exported function, as needed
   ```
   Hand the critic the impact output (affected files/functions, with `importers_of` results for
   test coverage) alongside the diff. **Always `--depth 1`** — depth 2 explodes through `App.tsx`
   (validated: 3 files at depth 1 → 229 at depth 2 for the same change). On a huge diff
   (>~1500 lines), the impact list *replaces* the old "highest-risk files first" heuristic as the
   review order. If the CLI is missing (fresh sandbox / post-defreezer), `pip install
   code-review-graph tree-sitter-language-pack==0.13.0` and rebuild; if that fails, fall back to
   the old heuristic and say so in the posted comment.
4. **Spawn a fresh critic — builder ≠ reviewer.** Use the `Agent` tool, `subagent_type:
   general-purpose`, **blind to your build rationale** (don't paste your own justifications — that
   re-introduces the self-grading bias). Mirror the handoff shape already used in
   [../.claude/skills/brand-check/SKILL.md](../.claude/skills/brand-check/SKILL.md),
   [../.claude/skills/gemini-eval/SKILL.md](../.claude/skills/gemini-eval/SKILL.md), and
   [../.claude/skills/straw-man-audit/SKILL.md](../.claude/skills/straw-man-audit/SKILL.md).
   Give it the diff plus high-recall instructions along **two axes, reported under separate
   headings — do not merge or re-rank across axes** (adapted from Matt Pocock's two-axis
   `code-review` skill, evaluated 2026-07-08):

   **Axis 1 — Standards** (priority order):
   - **Correctness bugs** (logic errors, null/undefined, off-by-one, broken state transitions, async
     races) — highest priority.
   - **Security / fail-open** (auth bypass, rate-limit/quota fail-open, secret or crown-jewel leak
     into the client bundle, PayMongo webhook) — pair with `straw-man-audit` if the diff touches
     `api/` or `api/_lib/`.
   - **Reuse / simplification** (duplicated logic, primitives that already exist in
     `components/ui/`, dead code).
   - **Code-smell baseline** (Fowler's *Refactoring*): mysterious name, duplicated code, feature
     envy, data clumps, primitive obsession, repeated switches, shotgun surgery, divergent change,
     speculative generality, message chains, middle man, refused bequest. **A documented repo
     standard always wins over the baseline** — `DESIGN.md`, `services/CLAUDE.md` Hard Rules, and
     `surgical-edit`'s deliberate minimalism suppress any smell they endorse (e.g. don't flag
     "speculative generality" gaps in code that is minimal *because* surgical-edit forbids
     just-in-case abstractions).

   **Axis 2 — Spec fidelity** (only when step 2 found a spec): does the diff build what the spec
   specified, or a plausible neighbor of it? Check every stated requirement landed, nothing
   load-bearing got silently deferred, and scope wasn't quietly reinterpreted. This axis exists
   because spec drift is a proven live failure class here — `agent_lessons.md` 2026-06-23
   ("One-Shot ≠ a stripped-down wizard") and 2026-05-19 ("the deferred piece was the point of the
   feature").

   The critic is **report-only** — it does NOT edit. It returns findings ranked Critical / Major /
   Minor with `file:line` references, Standards and Spec findings under separate headings.
5. **Apply the TUNED carve-out.** Tag any finding whose fix would touch tuned content —
   `services/geminiService.ts` (prompts, schemas, model IDs, safety rules), `api/_lib/prompts.ts`
   (crown-jewel prompts), or `api/_lib/` signatures/RPC names — as **"⚠️ REQUIRES NEIL — do not
   auto-apply."** Escalate; never auto-fix or auto-approve tuned diffs (`CLAUDE.md` TUNED-file
   guardrail; `agent_lessons.md` 2026-05-09). This list is intentionally **broader** than the
   `CLAUDE.md` `/goal` guardrail (which scopes to prompt/schema content only) — it mirrors the
   fuller `services/CLAUDE.md` Hard Rules.
6. **Post the findings** as a single PR comment via `add_issue_comment`: Standards and Spec
   sections kept separate, grouped by severity within each, each finding with `file:line` and a
   one-line fix suggestion, TUNED items clearly flagged.
7. **Act within the babysit rules** (the PR-babysit loop — [loops.md](loops.md) Tier 5):
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
   or migration touchpoints (flag these the same way as step 5 of the Procedure).
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
- **Sol advisory lens (gated trial, 2026-07-28).** If the diff is Claude-authored AND high-risk
  (`api/_lib/`, auth/billing/quota, render plumbing), optionally run the Sol advisory review per
  [sol_advisory_review_trial.md](sol_advisory_review_trial.md) alongside step 4's critic —
  advisory-only, Claude judges every finding, skip freely if Codex CLI is absent or Sol quota is
  needed for the executor lane.
- **Blast-radius step is a gated trial (adopted 2026-07-20).** Run it on the next 2–3 PRs and
  compare critic quality/scoping with prior reviews (same ≥3-corroboration bar as the Swipe File)
  before writing `scripts/restore-code-review-graph.ps1` or considering the tool's no-LLM GitHub
  Action / filtered MCP server (ranked moves #2–4 in the 2026-07-20 evaluation). Known caveats from
  validation: file-level `tests_for` returns 0 — use `importers_of` and filter `tests/` paths;
  JSX/prop-flow edges are invisible to the call graph, so treat the impact list as a floor, not a
  ceiling; React wiring still needs the critic's own read of the diff.
