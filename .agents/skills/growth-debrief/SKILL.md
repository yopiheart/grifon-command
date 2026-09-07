---
name: growth-debrief
description: Read the Data-Driven Growth Loop's collected data (ad_performance + events funnel + feedback) and write a ranked, evidence-bound "why it won / why it failed" debrief, then route winners into the viral-autopsy/grifon-cmo loop as GATED proposals. Use when Neil asks to "debrief the ads", "why did this ad win/lose", "what's working in our funnel", "which creative is fatiguing", "run a growth debrief", "review ad performance", does a weekly/periodic growth review, or right after tools/meta_insights_pull.py ingests fresh Meta metrics. INGEST-ONLY — never publishes, pauses, or spends; never edits a TUNED prompt. NOT for analyzing an external swipe video (that's viral-autopsy) or grading Grifon's own generated output against its rules (that's gemini-eval).
disable-model-invocation: true
---

For Codex tool execution, read [the desktop adapter](../_shared/codex-runtime.md) before following the workflow below.

This is the **read/diagnose half** of the ingest-only growth loop
(`workflows/growth_loop.md`, Phase 2b). Phases 0/2a *collect* the data; this skill
*interprets* it. It plays the **media-buyer** Neil named — the persona that reads
frequency / ROAS-decay / hook-hold / CVR and says *why* a creative sold or stalled —
then hands strategy/copy to `grifon-cmo` and visuals to `grifon-creative-director`.
It owns no spend decisions: it proposes, Neil ships.

The deterministic math (per-creative rollups, funnel step-down, NPS) is done by
`tools/growth_debrief_pull.py`; this skill owns the **judgment** on top of it
(the WAT split: tool = math, skill = read). Findings compound in a committed
**debrief log** so they survive the cafe-PC defreezer.

## Hard guardrails (read first)

1. **Ingest-only.** This skill **never** publishes, pauses, scales, or sets budget
   on an ad. It reads results and *proposes* the next move. Neil executes in Meta.
2. **NEVER edit `services/geminiService.ts` or `api/_lib/prompts.ts`** (or any
   TUNED-tagged content) off a debrief. A finding that implies a tuned-prompt or
   preset change becomes a **Gated Proposal** in `workflows/viral_swipe_file.md`,
   addressed to Neil (see `agent_lessons.md` 2026-05-09 — no autonomous tuned diffs).
3. **The 3-corroboration rule carries through.** A winning-creative pattern may only
   be *proposed* for adoption once **≥3 independent corroborations** back it (ad
   results count as corroboration alongside swipe-file videos). One winning ad is an
   anecdote — record it, don't generalize it.
4. **Data volume gates every verdict.** A creative below the minimum-data floor
   (§ thresholds) is `INCONCLUSIVE`, never a "winner" or "loser." Crowning a winner
   on 200 impressions rots the loop. Say "not enough data yet" out loud.
5. **Thresholds are heuristics to tune, not law.** The bands below are starting
   points (precedent: the `quota.ts` "revisit when real telemetry contradicts the
   model" note). Rank creatives *relative to each other in this window* first;
   absolute bands are tie-breakers and sanity checks.

## Procedure

### Step 0 — Open the debrief log + skim the swipe-file patterns

- Read `workflows/growth_debriefs.md` — review the last debrief's **Watch list**
  (what to re-check this run) and any open routes.
- Skim the **Pattern Index** in `workflows/viral_swipe_file.md` so a winning
  creative can *corroborate* an existing pattern (P1–P9…) instead of rediscovering
  it — this is how ad results feed the 3-corroboration counter.

### Step 1 — Pull the data

```bash
# No creds / no Python-live data yet → verify against the committed fixture:
python tools/growth_debrief_pull.py --fixture tools/fixtures/growth_debrief_sample.json

# Live (Supabase service role in .env; after a meta_insights_pull.py ingest):
python tools/growth_debrief_pull.py --days 30
python tools/growth_debrief_pull.py --days 7 --out .tmp/growth/debrief_input.json
```

The tool emits one consolidated JSON: `ad_performance.by_creative` (per-creative
rollups + derived rates), `funnel` (event step-down + checkout-abandon), and
`feedback` (NPS + free-text). It is read-only and never logs secrets. Exit `1
SECRETS_NOT_CONFIGURED` (live, no `.env`) → fall back to `--fixture`. The cafe PC
may have no Python (a known pending item) — if `python`/`py` is missing, install
Python 3.10+ first, or do the read via the Supabase MCP `execute_sql` against the
same three tables and shape the numbers by hand.

### Step 2 — Read it against the metrics taxonomy (the media-buyer pass)

For **each creative** in `by_creative`, walk the funnel of the ad itself and name
*where* it won or broke. Map the numbers to the taxonomy in `growth_loop.md`:

| Stage | Field(s) | Reads as |
| --- | --- | --- |
| **Hook** — stop the scroll | `hook_rate_pct` (3s ÷ impressions) | low → thumbnail/first-frame/first-line problem |
| **Hold** — keep watching | `hold_rate_pct` (thruplay ÷ 3s) | low → middle sags; pace/edit-grammar problem |
| **Click** — create interest | `ctr_pct`, `cpc` | low w/ good hold → CTA/offer-clarity problem |
| **Convert** — make the sale | `cvr_click_pct`, `roas`, `cpa` | low w/ good CTR → landing page / offer / price problem |
| **Fatigue** — when to kill | `frequency_max`, ROAS trend across `days_active` | rising freq + decaying ROAS → refresh creative |

Then read the **shared funnel** (`funnel.funnel_steps`, `checkout_abandon`): the
biggest step-down is the app's #1 leak (e.g. InitiateCheckout→Purchase abandon).
And the **voice of the user** (`feedback`): NPS band + recurring free-text themes —
a detractor theme that matches a funnel leak is a high-confidence "what to fix."

Diagnose **why**, don't just restate the number. "ROAS 0.67 at frequency 4.85 over
1 day → not a creative miss, it's **fatigue**: same audience seen it ~5×, refresh
before judging the concept" is a debrief. "ROAS is low" is not.

### Step 3 — Rank and classify

Sort creatives into: **Winners** (scale candidates), **Losers** (kill/rework),
**Fatiguing** (was winning, decaying — refresh), **Inconclusive** (below the data
floor). Pick the single **biggest lever** for the window (one creative to scale,
one funnel leak to fix). Spot-check 2–3 of your own claims against the raw rollup
numbers before writing — internal contradictions get flagged, not transcribed.

### Step 4 — Write the debrief entry

Append to `workflows/growth_debriefs.md` using the **entry template** there. Every
entry needs the **So What** (the one lever) and a **Watch list** (what next run
must re-check — fatiguing creatives, an unproven winner needing more spend).

### Step 5 — Route the findings (gated)

- **Winning creative → learn from it.** If a Grifon-tagged winner (`creative_id`)
  exists, offer to run `viral-autopsy` on that exact rendered video to extract its
  Edit DNA, and increment the matching `viral_swipe_file.md` Pattern Index counter.
  Cross the 3-corroboration line → a **Gated Proposal** (never auto-applied).
- **Winning angle/offer → remix.** Hand the winning hook/offer to `grifon-cmo` for
  the next creative brief; visuals to `grifon-creative-director`. Cite the evidence
  ("ROAS 9.3× at hold 43%"), never vibes.
- **Funnel leak / feedback theme → fix queue.** Add a ranked item to
  `workflows/app_audit.md` (e.g. "checkout abandon 25% — investigate PayMongo step").
- **TUNED implication → Gated Proposal only**, addressed to Neil. Stop there.

### Step 6 — Commit

Cafe-PC rule: uncommitted work dies with the reboot. Commit the debrief-log update
immediately (`growth-debrief: add <date> debrief`). `.tmp/` artifacts are
disposable; the entry must stand alone without them.

## Thresholds (starting heuristics — tune as real data arrives)

Defaults, not law (guardrail 5). Single-tenant PH ecom assumptions:

- **Minimum data floor (per creative, before any win/lose verdict):** ≥ ~1,000
  impressions **and** ≥ ~3 days active **or** ≥ 1 purchase. Below → `INCONCLUSIVE`.
- **ROAS:** `< 1.0` losing money · `1.0–2.0` marginal · `≥ 3.0` strong scale
  candidate (context-dependent on AOV/margin — ask Neil his break-even ROAS once;
  record it).
- **Frequency:** `> 3.0` watch for fatigue · `> 4.0` refresh the creative; pair
  with a ROAS/CPM trend across `days_active` before calling it.
- **Hook rate (3s ÷ impressions):** low relative to the window's other creatives →
  first-frame problem. Rank relative; no universal cutoff.
- **Hold rate (thruplay ÷ 3s):** higher is better; a creative with strong hook but
  weak hold is a middle/pacing problem (often a `viral-autopsy` Edit-DNA question).
- **Checkout abandon (`InitiateCheckout` w/o `Purchase`):** any sustained rate is a
  funnel-fix item; the biggest single step-down outranks small leaks.

## Classification

- `WIN` — above the data floor; strong ROAS/CVR; a scale candidate. → swipe-file +
  CMO routing.
- `LOSE` — above the data floor; weak ROAS *not* explained by fatigue; rework/kill.
- `FATIGUING` — was winning; rising frequency + decaying ROAS → refresh, don't kill
  the concept.
- `INCONCLUSIVE` — below the data floor. Record and **watch**; never route as a
  proposal.

## Out of scope / wrong tool

- **Analyzing an external swipe video** (TikTok/FB-ad link) → `viral-autopsy`.
- **Grading Grifon's own generated ad against its rules** → `gemini-eval`
  (compliance) / `brand-check` (DESIGN.md).
- **Applying a tuned-prompt or preset change** → separate task, `surgical-edit` +
  `verify-changes`, only after Neil approves the Gated Proposal.
- **Publishing / pausing / budgeting an ad** → Neil, in Meta. This skill never does.
- **Building this into an in-app analytics dashboard** → a post-beta idea; belongs
  in `workflows/post_beta_roadmap.md`, not scope creep here.
