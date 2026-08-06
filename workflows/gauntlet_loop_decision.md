# Gauntlet Loop — evaluation verdict (2026-08-06)

The "Gauntlet Loop" (Matt Shumer, viral on X 2026-08): give a lead agent a goal
plus **a real example of what great looks like**, let it split the work, and
give each piece a builder sub-agent and a *blind* critic sub-agent with a
mandate to pass only if the artifact beats the real-world reference. Karpathy's
adjacent thread (Opus 5, 1M tokens, ThreeJS render of the LotR opening) named
the weak link explicitly: LLMs *"can't easily audit their work because they
aren't able to efficiently and natively perceive videos or play games."*

**Verdict: adopt it, with one hard limit. The critic is reliable when the
quality gap is wide and is pure noise when the gap is narrow.** Use the loop as
an engine to climb toward the bar. Never use it to decide you have arrived.

> **Correction (Neil, 2026-08-06).** The first version of this doc said the
> critic failed outright. That conclusion came from a mis-specified test: it
> compared two of *our own* plates against each other, which is peer-vs-peer,
> not the work-vs-reference setup the Gauntlet Loop actually specifies. Neil
> caught it. Re-run against a real reference, the critic scored perfectly. The
> gradient below is the corrected result.

## What Grifon already has

- **Workflow layer:** [`pr_review_loop.md`](pr_review_loop.md) (builder ≠ reviewer),
  `gemini-eval`, `brand-check`, `/goal`, and this registry's [`loops.md`](loops.md)
  — which already states the governing rule: *a loop is only as good as its verifier.*
- **Product layer:** [`services/imageGateService.ts`](../services/imageGateService.ts),
  [`services/producerOrchestrator.ts`](../services/producerOrchestrator.ts),
  [`utils/imageChecks.ts`](../utils/imageChecks.ts) — generate → critic → automated
  reroll, shipped, with tests.
- **Benchmark corpus (the rare part):** 78 real ads in [`assets/ad-swipe/`](../assets/ad-swipe/)
  decoded across 1,373 lines of [`static_ad_swipe_file.md`](static_ad_swipe_file.md).
  That is the "actual Call of Duty" most people copying this loop do not have.

Every existing gate measures against **our own rules** (tuned ruleset, DESIGN.md).
The genuinely new idea is measuring against **a real artifact**.

## The calibration result (the reason to be careful)

[`tools/gauntlet_blind_ab.mjs`](../tools/gauntlet_blind_ab.mjs) runs forced-choice
pairwise judging with two controls the viral version omits: a **null test**
(same image in both slots — any deviation from 50/50 is pure slot preference)
and an **order flip** (every real pair judged A/B and B/A).

| Quality gap | Pair | Model | n | Slot-1 picks | Self-consistency |
| --- | --- | --- | --- | --- | --- |
| **None** (identical) | s2 vs s2 | 3.5-flash | 4 | **4/4 (100%)** | n/a |
| **None** (identical) | s2 vs s2 | 3.6-flash | 6 | **6/6 (100%)** | n/a |
| **Narrow** (two of our plates) | s2 vs s2a | 3.5-flash | 7 | **7/7 (100%)** | 4/7 (57%, ≈ coin flip) |
| **Wide** (our plate vs real ad) | s2 vs E19-gruns | 3.6-flash | 8 | **4/8 (50%)** | **8/8 (100%)** |

Read the table as a gradient, not a pass/fail.

**Narrow gap = the critic reads position, not quality.** At 100% slot-1 it is
answering a question about layout order. Worse, it *confabulates*: same pair,
same axis, opposite verdicts, both fluent.

> slot 1 = tank cover → *"The mystery of what is hidden beneath the heavy concrete lid creates stronger curiosity than a common household chore."*
> slot 1 = toilet → *"The dynamic action of pouring water into a toilet creates instant visual recognition and curiosity."*

**Wide gap = the critic is a real instrument.** Against E19 (a finished IG-story
ad: face, product, Q&A sticker, "61% off" offer) versus a bare copy-less b-roll
plate, position bias fell to exactly zero (4/8 slot-1) and agreement hit 8/8 on
the same image, naming the same cause every time (the native Q&A sticker
creating a curiosity gap). Content completely overwhelmed the slot effect.

**The critic is honest when allowed to be.** On the null tests it self-reported
`distinguishable: false` and `confidence: coin-flip` in **10/10** valid trials.
It knew. The forced choice made it guess anyway, and "only pass if it is better"
is a forced choice.

## The implication that matters

The loop's own stopping condition sits in its blind spot.

You start far from the bar, so the gap is wide, so the critic is accurate and
correctly says *worse, keep going*. Every iteration narrows the gap. By the time
you approach the reference, the gap is narrow, which is exactly where the
measurements above collapse into a coin flip. **The one judgement the loop
exists to make, "we have arrived", is the one it cannot make.**

The source article confirms this without noticing it: the game was *"still
improving when I stopped it"*, and termination is described as continuing
*"until the result reaches the bar (or, more likely, you decide it is ready)."*
The human closed the loop. The critic never did.

Same failure class as the 2026-07-29 artifact incident, where a headless-Chromium
screenshot gate passed a page Neil's phone rendered wrong: critic approval is
not reality, and it is least like reality precisely when the call is close.

## Rules for any Gauntlet-style gate here

1. **Randomize slot order every trial, and flip every real pair.** A single-order
   verdict is not evidence.
2. **Run the null test first.** Same image both slots. Publish the bias number
   as the error bar on every verdict from that critic.
3. **Let the critic abstain.** Keep `confidence` and a tie/`distinguishable`
   escape hatch, and discard `coin-flip` verdicts instead of counting them.
4. **Never point it at TUNED files** (`services/geminiService.ts`,
   `api/_lib/prompts.ts`). Hardest rule in the repo; `/goal` already forbids it.
5. **Always set a turn cap.** The source method explicitly has none ("still
   improving when I stopped it"). The `/goal` template requires one. Ours wins.
6. **Images only, for now.** Karpathy's stated weakness is real: the critic
   cannot natively perceive video. Judge the still plate, never the rendered ad.
7. **Market outranks the critic.** No blind verdict changes a spend rule; the
   ≥3-corroboration gate in [`ad_performance_ledger.md`](ad_performance_ledger.md)
   still governs.

8. **Use it to climb, never to stop.** Trust *"still worse than the reference"*.
   Do not trust *"now as good as the reference"* — that verdict is a coin flip
   by construction. A human eyeball closes the loop, or a market does.

## Status

- ✅ Harness built + calibration run (2026-08-06), 25 trials, three gap widths.
- ✅ **Directionally usable now, for wide-gap calls only.** Generated plate vs a
  swipe-file winner is a valid question to ask it today.
- ⛔ **Not wired into any gate**, and not to be used for fine distinctions
  (choosing between two of our own plates) until a config clears the null test.
- ▶ Next, if resumed: re-run the null with abstention allowed and slots
  randomized per trial, and measure where on the gap gradient reliability
  actually breaks. Then pilot as an *advisory* signal inside `gemini-eval`.
