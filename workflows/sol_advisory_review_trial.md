# Workflow: Sol Advisory Review — Gated Trial

**Status:** OPEN (0 of ~3 qualifying diffs) — approved by Neil 2026-07-28.
**Origin:** The codex-plugin-cc HOLD (agent_lessons 2026-07-20) resume trigger fired when the
codex-executor trial closed ADOPT (2026-07-24). Decision: **DROP the plugin, steal the pattern** —
its only high-value feature (cross-model adversarial review of Claude-authored diffs at zero
Claude quota) is replicated through the Codex CLI bridge we already own. The plugin itself is
logged DROP — never revisit (its other features were hard-rejected: Stop-hook review gate =
runaway-loop risk, `/codex:transfer` = transcript exfil to an OpenAI thread; and its transport
lacks every load-bearing wrapper guardrail).

## Doctrine (amended 2026-07-28, Neil-approved)

> **Sol never reviews Sol's diffs** (builder ≠ reviewer — unchanged). On **Claude-authored**
> high-risk diffs, Sol may run as an **advisory-only second lens**: it reports findings, the
> Claude main loop remains the deciding reviewer, and Sol never gets a veto, an approve, or an
> edit. TUNED judgments stay with Claude + Neil exclusively.

## When it fires (and when it doesn't)

Fire ONLY when ALL of:
1. The diff is **Claude-authored** (main loop or `code-executor`) — never a Sol/codex-executor diff.
2. The diff is **high-risk**: touches `api/_lib/`, auth/billing/quota paths (PayMongo webhook,
   `supabaseAdmin`, rate-limit RPCs), or render-pipeline plumbing (`renderFfmpeg.ts`).
3. The Codex CLI is present + logged in (cafe PC; wrapper exit 10/11 → skip the lens, note it, move on).

Do NOT fire on: routine UI diffs, docs, config, or every PR by default — the Sol allowance is
shared with the executor lane (exit 12 = limit hit); starving the executor to fund advisory
reviews is backwards. Skipping the lens is always safe — it is additive, never load-bearing.

## Procedure

1. Produce the diff file: `git diff <base>...<head> > .tmp/advisory-diff.patch` (fresh — stale-diff
   trap applies here too, see [pr_review_loop.md](pr_review_loop.md)).
2. Run Sol **read-only** via the Codex CLI (first run: add a thin `review.mjs` beside
   `.claude/skills/codex-executor/execute.mjs` — read-only sandbox, no write access, ~30 lines;
   shake it down on the first qualifying diff rather than pre-building untested):
   `codex exec --sandbox read-only "<review prompt + patch path>"`.
   Review prompt: adversarial, high-recall, correctness + security + fail-open focus; report-only;
   findings as `file:line` + one-line claim. Explicitly instruct: no rewrites, no patches.
3. Claude main loop judges every Sol finding against the code (Sol's known failure modes — dead
   handlers, unwired UI, confident-but-wrong paths — are exactly what the judge filters). Verified
   findings merge into the normal review output; TUNED-adjacent findings get the standard
   "⚠️ REQUIRES NEIL" tag.
4. Log one line per run in the Trial Ledger below: date, diff, # Sol findings, # verified,
   **# verified findings the Claude review had missed** (the only number that matters).

## Pass / kill gate (same bar as every adoption)

After ~3 qualifying diffs:
- **ADOPT** if Sol's lens caught ≥1 real, Claude-missed finding across the trial → promote the
  procedure into [pr_review_loop.md](pr_review_loop.md) as a standing optional step + write the
  restore-script line if any install state needs re-arming.
- **KILL without sentiment** if it produced only noise or duplicates — remove the
  pr_review_loop pointer, mark this doc CLOSED-KILLED, and strike the doctrine amendment.

## Trial Ledger

| # | Date | Diff / PR | Sol findings | Verified | Claude-missed |
|---|------|-----------|--------------|----------|----------------|
| — | — | — | — | — | — |
