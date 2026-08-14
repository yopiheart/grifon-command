# Branch Triage — reading the unmerged pile in seconds

**Tool:** [`tools/branch_triage.mjs`](../tools/branch_triage.mjs) · read-only · ~7s over 29 branches
**Run it:** `node tools/branch_triage.mjs` (add `--json` to feed a routine, `--fetch` to refresh refs first)

## Why this exists

CLAUDE.md warns three times that a feature can be fully BUILT on a pushed branch
while `main` and its planning doc both say "not started", and records the mistake
recurring **3x** on Expert Mode / Director's Cut. Two things already print the
branch **list** — the SessionStart hook and
[`tools/artifacts/build-grifon-session.mjs`](../tools/artifacts/build-grifon-session.mjs) —
and neither answers the question that actually prevents the mistake: **is this
branch's work already in `main`?**

A list of 29 refs gets skimmed. Skimming is what caused the mistake. This replaces
the skim with a truth table: one row per branch, one verdict per row.

## The verdicts

| Verdict | Means | Next step |
|---|---|---|
| `DELETE` | every commit equivalent in `main` **and** zero branch-only lines | paste-ready delete command is printed |
| `SUPERSEDED` | work is in `main`, but the branch still holds N unique lines | eyeball the printed `git diff`, then delete |
| `TUNED` | touches `services/geminiService.ts` or `api/_lib/prompts.ts` | never merge without Neil's explicit approval |
| `CONFLICT-CODE` | real code collision | a genuine rebase |
| `CONFLICT-DOC` | collides only on doc churn | usually "keep both paragraphs" |
| `MERGE` / `MERGE-DOCS` | clean | merge |
| `STALE` | clean but older than `--stale` (default 45d) | re-verify the premise before merging |

`DUP` = commits already equivalent in `main`. `NEW` = commits `main` lacks.
`UNIQ` = lines the branch has that `main` does not.

## Two things the tool CANNOT do, and one of them already burned us

1. **It compares code, not problems.** [`agent_lessons.md`](../agent_lessons.md)
   2026-06-27: render fixes were re-ported from an old branch that `main` had
   **already fixed by different earlier code**. Caught by Neil, PR #25 closed
   unmerged. Every automated signal here would have said `CONFLICT-CODE`, i.e.
   "real work, rebase it." **Before merging any branch, grep `main` for the bug
   story / symptom, not the function names.** The tool narrows the pile; it does
   not make the merge decision.
2. **`SUPERSEDED` is a judgement it hands back to you.** `git cherry` says the
   patch is equivalent; it cannot say whether the leftover unique lines are an
   older form or lost work. That is why the verdict is not `DELETE`.

## Snapshot — 2026-08-15 (29 branches)

`1 DELETE / 3 SUPERSEDED / 2 TUNED / 8 CONFLICT-CODE / 12 CONFLICT-DOC / 1 MERGE-DOCS / 2 STALE`

**The finding that makes the pile tractable:** the top conflict sources are
`CLAUDE.md` (11), `workflows/post_beta_roadmap.md` (7) and `agent_lessons.md` (6)
— files every session appends to. Real code collisions were only `App.tsx` (3)
and `components/Step5Storyboard.tsx` (2). So "20 branches conflict" overstated
the work by more than half: **12 of them are doc churn.**

Also found: `docs/agent-lesson-branch-triage` (48d) is a branch carrying the
2026-06-27 lesson above, still unmerged. Merging it would put rule 1 into
`agent_lessons.md` where it belongs.

## Re-run trigger

At the start of any session that is about to declare a feature unbuilt, before any
branch cleanup, and any time the SessionStart hook's "UNMERGED WORK IN FLIGHT"
list has grown. Not scheduled — a routine here would produce a report nobody asked
for, which the Tier 6 ground rule in [`loops.md`](loops.md) calls quota burn.
