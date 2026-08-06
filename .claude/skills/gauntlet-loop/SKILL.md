---
name: gauntlet-loop
description: Run a bounded builder-critic quality loop against a real external reference — for creative, UI, pages, copy, or any artifact whose quality is inspectable. Use on "run a gauntlet", "loop until it beats X", "make this as good as <real thing>", or when grading our work against a named competitor/benchmark. NOT for tuned prompt content (services/geminiService.ts, api/_lib/prompts.ts) and NOT for video (the critic is structurally blind to it).
disable-model-invocation: true
---

Grifon's port of the "Gauntlet Loop" (Shumer, viral 2026-08). The full evaluation,
with every measurement behind the rules below, is
[`workflows/gauntlet_loop_decision.md`](../../../workflows/gauntlet_loop_decision.md).
Read it before changing anything here.

**The one-line version:** the bar is not the hard part, the axis is.

## STEP 0 — Name the axis. Never skip this.

Before choosing a reference, before generating anything, answer: **what is the
one thing this artifact must do?**

This is not ceremony. It was measured. Seven images, one model, one critic, three
runs, **only the question changed**:

| | ATTENTION (stop a scroll) | TRUST (would you let them work on your property) |
| --- | --- | --- |
| Gruns poop-emoji meme | **1st**, 65 | **7th**, 18 |
| Marvin before/after card | 5th, 58 | **1st**, 68 |

A 47-point collapse from swapping the question. Worse, the attention axis spread
the whole field by only 10 points (55–65) while trust spread it by 50 (18–68) —
so a wrong axis does not fail loudly, it fails *flat*, returning confident,
well-evidenced, near-identical scores that lead somewhere you did not want to go.

Ask: is the bottleneck attention, trust, clarity, or conversion? Check
[`ad_performance_ledger.md`](../../../workflows/ad_performance_ledger.md) — if a
campaign already produced volume but no orders, attention is **not** the axis.

## STEP 1 — Pick a bar that passes three tests

1. It names a **specific** thing, not a vibe.
2. The critic can actually **open** it (file path, URL, swipe-file ID).
3. It permits a **direct comparison** on the axis from Step 0.

If the critic cannot open it, it is not a bar. Never claim a reference was beaten
if it was never inspected. Grifon owns 78 decoded ads in
[`assets/ad-swipe/`](../../../assets/ad-swipe/) — prefer those over inventing one.

⚠️ A swipe-file "winner" won on *some* axis. Confirm it is *your* axis before
copying it, or you will import the wrong strengths.

## STEP 2 — Grade with calibrated bands, not forced choice

Default to **single-image rubric scoring**, not pairwise:

```
node tools/gauntlet_rubric.mjs --axis <name> --runs 3 <img> [<img> ...]
```

One image at a time has no slots, so position bias cannot occur. Pairwise
forced-choice measured **21/21 slot-1 picks, including on identical images** —
and the critic honestly self-reported `coin-flip` in 10/10 of those. The
instrument is fine; forced choice breaks it, and "only pass if better" *is* a
forced choice. This is also the Kart Royale fix: they dropped "side by side,
blind" for calibrated bands and got an honest 62/100.

Blind A/B ([`tools/gauntlet_blind_ab.mjs`](../../../tools/gauntlet_blind_ab.mjs))
is valid **only at wide gaps**, and always order-flipped. Run `--null` first and
publish the bias number as the error bar.

## STEP 3 — Build, bounded

- Image generation goes through **`codex-image`** (ChatGPT plan, zero Gemini and
  zero Claude quota). Gemini budget is frequently flagged in `NOW.md`.
- Builders never grade their own work. Critics get clean context: goal, bar,
  constraints, artifact, method. Never the builder's reasoning.
- Return the **single biggest gap**, not a list of twenty. Lists scatter the next
  round.
- Parallel agents only for genuinely independent parts. One owner for coupled
  work (a single composition, a shared design system), then one integration pass.

## STEP 4 — STOP (mandatory; the source method has no such line)

Every run states its stop condition up front. Whichever comes first:

- a **turn / generation / spend cap** (e.g. 6 images), **or**
- Neil approves, **or**
- gains go immaterial.

⛔ **Never stop on "the critic says we beat it."** That is the one judgement the
critic cannot make: as you approach the bar the gap narrows, and narrow gaps are
where it collapses to coin-flip. Shumer's own run was *"still improving when I
stopped it"* — the human closed the loop. Reference runs took **1h19m and 2h+**
precisely because nothing capped them.

## Hard limits

- ⛔ **TUNED files are out of scope.** `services/geminiService.ts`,
  `api/_lib/prompts.ts`. `/goal` already forbids this; so does this skill.
- ⛔ **Not for video.** Screenshot critics found *zero* gameplay bugs in the Kart
  Royale run: "structurally blind to everything a still frame cannot show."
  Karpathy names the same limit. Judge the still plate, never the render.
- ⛔ **Never report a visual verdict as a business result.** Live CTR, CPA, orders
  and the ≥3-corroboration gate remain the only real proof.
- Don't run a Gauntlet for trivial work. Recommend it only when quality is
  inspectable, iteration has value, and the gain justifies the spend — then ask
  before a long run.
