# Gauntlet Loop — evaluation verdict (2026-08-06)

The "Gauntlet Loop" (Matt Shumer, viral on X 2026-08): give a lead agent a goal
plus **a real example of what great looks like**, let it split the work, and
give each piece a builder sub-agent and a *blind* critic sub-agent with a
mandate to pass only if the artifact beats the real-world reference. Karpathy's
adjacent thread (Opus 5, 1M tokens, ThreeJS render of the LotR opening) named
the weak link explicitly: LLMs *"can't easily audit their work because they
aren't able to efficiently and natively perceive videos or play games."*

**Verdict: adopt the reference-bar idea, reject the critic as specified.**
Grifon already runs builder≠critic loops in two places; what it lacks is a
real-world bar. But before any critic is allowed to gate work, it must be
calibrated — and ours failed calibration outright.

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

| Run | Model | Trials | Slot-1 picks | Result |
| --- | --- | --- | --- | --- |
| Null (identical images) | gemini-3.5-flash | 4 valid | **4/4 (100%)** | 50 pts off 50/50 |
| Real pair (2 different plates) | gemini-3.5-flash | 7 valid | **7/7 (100%)** | self-consistency 4/7 (57%, ≈ coin flip) |
| Null (identical images) | gemini-3.6-flash | 6 valid | **6/6 (100%)** | 50 pts off 50/50 |

**21 trials, 100% slot-1, across two model generations.** Content moved the
verdict not at all. The critic is reading *position*, not quality.

The damning detail is the reasoning. Same pair, same axis, opposite verdicts,
both fluent:

> slot 1 = tank cover → *"The mystery of what is hidden beneath the heavy concrete lid creates stronger curiosity than a common household chore."*
> slot 1 = toilet → *"The dynamic action of pouring water into a toilet creates instant visual recognition and curiosity."*

It is confabulating a justification for a decision it already made on position.
A Gauntlet Loop that puts the reference in a fixed slot therefore returns a
**deterministic** answer uncorrelated with quality, dressed in specific prose.
This is the same failure class as the 2026-07-29 artifact incident, where a
headless-Chromium screenshot gate passed a page Neil's phone rendered wrong:
critic approval is not reality.

**The critic was honest when allowed to be.** On the null test it self-reported
`distinguishable: false` and `confidence: coin-flip` in **10/10** valid trials.
The bias is manufactured by the *forced choice* — which is exactly what
"only pass if it is better" instructs. The instrument is not broken; the
protocol breaks it.

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

## Status

- ✅ Harness built + calibration run (2026-08-06). Findings above.
- ⛔ **Not wired into any gate.** Do not use this critic to pass/fail work until
  a configuration clears the null test.
- ▶ Next, if resumed: re-run the null with abstention allowed and randomized
  slots; if bias drops under ~10 points, pilot Move 1 (generated plate vs
  swipe-file winner, same persuasion-lever family) as an *advisory* signal only.
