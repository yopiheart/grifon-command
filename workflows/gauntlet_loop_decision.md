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

## First real run — Kuya Marvin static cards vs the swipe file (2026-08-06)

Subject: `clients/oceanides/kuya-marvin/organic/cards/post3-senyales-card.png`
(Marvin crouching, blue sky, white headline card *"Apat na senyales na malapit
nang mapuno ang septic tank nyo"*, yellow CTA button). Axis: *stop a distracted
person mid-scroll*. All runs gemini-3.6-flash, 8 trials, order-flipped.

| Opponent | What it is | Result | Slot bias | Agreement |
| --- | --- | --- | --- | --- |
| E18 cursor | minimalist grey SaaS, no face, no offer | **we win 8–0** | none (4/8) | 100% |
| E31 im8-health | polished DTC body-transformation ad | **tie** | 100% slot-1 | 50% |
| E19 gruns | IG-story Q&A sticker screenshot | **lose 0–8** | none (4/8) | 100% |
| E29 gruns | doll + poop-emoji belly meme | **lose 0–8** | none (4/8) | 100% |
| E25 gruns | bare feet under bed sheets, "perimenopause" | **lose 0–8** | none (4/8) | 100% |

(`post2-beforeafter.png` also lost 0–8 to E19 on the same settings.)

**The tie is a real reading, not a failure.** Against E31 the critic collapsed to
100% slot-1 with 50% agreement, which is the exact signature the null test
produced on *identical* images. Read inversely, the coin-flip signature is the
instrument saying "I cannot separate these" — i.e. our card is at that ad's level.

**A stated prediction failed, which is the useful part.** Before running the last
two, the call was: lose to E29 (native meme format), tie E25 (polished designed
ad), on a native-vs-designed theory. E29 was right. **E25 was wrong — we lost
0–8.** So the axis is not native-vs-designed and not production craft.

Reading the winners' stated reasons together, the actual axis is **pattern
interrupt**: "absurd graphic", "high visual contrast", "provocative visual
pattern interrupt", "curiosity gap". Every ad that beat us jars the eye. The two
we did not lose to (Cursor, IM8) are calm. Our card is calm, tidy and tasteful —
a composed man, blue sky, clean typography. **Tasteful is what loses here.**

⚠️ **Do not act on this yet, for two reasons.**
1. **Wrong axis for the actual bottleneck.** This measured scroll-stopping.
   KM-003 delivered ~100 messages at ₱12.85 and **1 order**
   ([`ad_performance_ledger.md`](ad_performance_ledger.md)). Attention was not
   the constraint; conversion was. A more jarring creative buys more of what
   Neil already had enough of.
2. **One brand of reference.** Four of five opponents are Gruns. That is one
   advertiser's house style, not the world's best. The ≥3-corroboration bar
   wants distinct brands before this becomes a template implication.

## The axis experiment — the finding that reframes everything above (2026-08-06)

A YouTube breakdown of the method supplied the missing rule: *"If you don't start
with a really good minimum viable design or product, the gauntlet loop will just
optimize towards probably the wrong thing."* That is testable, so it was tested.

[`tools/gauntlet_rubric.mjs`](../tools/gauntlet_rubric.mjs) grades **one image at
a time** against calibrated bands (the Kart Royale fix — no slots, so position
bias cannot occur), with an explicit anti-generosity clause. Same 7 images, same
model, same critic, 3 runs each. **Only the axis changed.**

| Rank | ATTENTION (stop a scroll) | | TRUST (would you let them do work on your property) | |
| --- | --- | ---: | --- | ---: |
| 1 | E29 gruns (poop-emoji meme) | 65 | **post2-beforeafter (ours)** | **68** |
| 2 | E18 cursor | 62 | E18 cursor | 68 |
| 3 | E31 im8-health | 60 | **post3-senyales (ours)** | **63** |
| 4 | **post3-senyales (ours)** | 58 | E25 gruns | 45 |
| 5 | **post2-beforeafter (ours)** | 58 | E31 im8-health | 45 |
| 6 | E19 gruns | 58 | E19 gruns | 35 |
| 7 | E25 gruns | 55 | E29 gruns (poop-emoji meme) | **18** |

**The ranking nearly inverts.** E29 goes from first to last, dropping 47 points.
Our before/after card goes from fifth to first. Nothing about the images changed.

**Spread is the second finding.** ATTENTION separates the field by 10 points
(55–65); TRUST separates it by 50 (18–68). The attention axis barely
discriminates at all.

**That retroactively explains the pairwise result.** The 100%-slot-1 collapse
recorded earlier was not the critic malfunctioning. On the attention axis these
images are genuinely within a few points of each other, so there was nothing to
separate and the critic fell back on position. **The gap was narrow because the
axis was wrong.** Pick an axis that discriminates and the same critic produces a
50-point spread with specific, routable evidence.

**The business implication is the sharp one.** Marvin's cards score 63 and 68 on
trust, beating every ad in the swipe file except Cursor (tied). The swipe-file
winners score 18–45, and the critic names why: *"juvenile meme humour destroys
any sense of professional credibility"* (E29), *"makes it look like a deceptive
weight-loss gimmick"* (E31), *"makes the business behind it look like a"*
low-credibility operator (E19). KM-003's bottleneck was conversion, not
attention. **Copying the swipe file would have optimised the wrong axis and made
the ads worse at the job they actually need to do.**

The corrected rule for this repo: **the bar is not the hard part — the axis is.**
A Gauntlet pointed at a wrong-but-plausible axis returns confident, precise,
well-evidenced answers that lead somewhere you did not want to go.

## Porting the prompt style (the part that actually went viral)

**First, "one-shot" is not what happened.** One prompt, yes. But per Karpathy's
own account of the equivalent run: ~2 hours, ~1M tokens, ~$10, 5,500 lines, and
his words for the result were *"kind of janky"* and *"it messed up a few times."*
The prompt set a direction; the harness and the budget did the work. Anyone
adopting this because it looked like a single cheap shot is adopting a
misreading.

Decomposed, the viral prompt is seven moves. Only two of them carry weight here.

| # | Move | Verdict for Grifon |
| --- | --- | --- |
| 1 | Names a real external benchmark ("at the level of the most recent Call of Duty") | **steal** |
| 2 | States the goal, never the implementation | **steal (narrow)** |
| 3 | Decompose and fan out | already have (`code-executor`) |
| 4 | Separate harsh critic | already have (`pr_review_loop`, builder ≠ reviewer) |
| 5 | Blind side-by-side vs the benchmark | already measured above — good wide, coin-flip narrow |
| 6 | "Don't stop until utterly perfect", no turn cap | **reject** |
| 7 | Intensity words ("utterly", "wowed", "ultracode") | noise |

On (6): this is the budget furnace CLAUDE.md's context-hygiene section exists to
prevent, and the calibration above shows the critic cannot signal completion
anyway. On (7): "ultracode" is not a documented harness feature (the real one is
`ultrathink`, which buys thinking length); treat these as spend multipliers.

On (1), the steal is concrete. Grifon briefs currently say *"follow DESIGN.md"* —
an internal rule. The Gauntlet form points at a real artifact instead, and this
repo owns 78 of them in [`assets/ad-swipe/`](../assets/ad-swipe/). *"As strong as
E19"* is inspectable; *"make it good"* is not.

On (2), the caveat matters: heavy specs are correct for code near TUNED files
(that is what `surgical-edit` protects). But for **new design and creative** work,
over-specifying caps the output at the brief-writer's imagination. Loosen there
only.

### Do not build a skill for this

There are ~20 skills already; another one adds passive context load and
mis-fire risk for something that is not a skill at all — it is a way of writing
a brief. Two small wirings instead:

- Add a `BENCHMARK:` line to briefs sent to `code-executor` / `codex-executor`.
- Add "compare against the named real artifact, not only the rule" to
  `brand-check` and `gemini-eval`.

### Brief template (Grifon-safe port)

```
BENCHMARK: <a real, inspectable artifact — file path, URL, or swipe-file ID>
GOAL:      <the end state, not the implementation>
DECOMPOSE: <pieces that can each be improved independently>
CRITIC:    fresh context, compare against BENCHMARK, run both slot orders
STOP:      <turn cap> OR the build-gate pass message, whichever comes first
OUT OF SCOPE: TUNED files (services/geminiService.ts, api/_lib/prompts.ts)
```

The `STOP` line is the one addition to Shumer's structure. Its absence is why
that run took two hours and ten dollars, and the calibration above is why the
critic can never supply it.

## Status

- ✅ Harness built + calibration run (2026-08-06), 25 trials, three gap widths.
- ✅ **Directionally usable now, for wide-gap calls only.** Generated plate vs a
  swipe-file winner is a valid question to ask it today.
- ⛔ **Not wired into any gate**, and not to be used for fine distinctions
  (choosing between two of our own plates) until a config clears the null test.
- ▶ Next, if resumed: re-run the null with abstention allowed and slots
  randomized per trial, and measure where on the gap gradient reliability
  actually breaks. Then pilot as an *advisory* signal inside `gemini-eval`.
