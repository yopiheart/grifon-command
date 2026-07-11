# Rubric backtest — Gemini-flash identity scores vs blind judges (2026-07-11)

**Deliverable 3 of the wedge blockers (Grill 2). Verdict: the premortem was
right — a numeric score threshold on gemini-3.5-flash is NOT a safe auto-QA
gate. The gate design below replaces it. Raw data:
`rubric-backtest-data.json` (this folder).**

## Protocol

- Sample: 29 of the 279 triplets — the 8 lowest + 8 highest Gemini identity
  scores + 13 spread across the 65–85 decision band.
- Ground truth: 3 fresh-context blind judges (Fable-class, builder≠grader SOP),
  each judging MODEL.jpeg vs ~10 outputs with a casual-viewer, feature-anchored,
  adversarial prompt. No judge saw Gemini's scores or any analysis file.
- Compared: Gemini `identity_consistency.score_pct` (the ingest grader) vs
  blind identity score + PASS/FAIL verdict.

## Results (n=29)

| Metric | Value | Read |
|---|---|---|
| Correlation (Gemini vs blind score) | **0.41** | weak — the number is noise-heavy |
| MAE / bias | 7.1 / −1.8 | small average error, but… |
| Gemini range vs blind range | 64–86 vs **56–90** | Gemini is range-compressed: it never says "different person" (min 64) while blind judges confidently do (56, FAIL) |

Floor sweep (auto-QA = pass if Gemini ≥ floor, truth = blind verdict):

| Floor | Accuracy | False PASS (ships wrong face) | False BLOCK (wastes a retry) |
|---|---|---|---|
| 60 | 90% | **3** | 0 |
| 65 | 86% | **3** | 1 |
| 70 | 72% | **2** | 6 |
| **75 (the Grill-2 provisional)** | **62%** | **2** | 9 |
| 80 | 48% | 0 | 15 |

**The killer example: t011 — Gemini 78 (above the provisional 75 floor), blind
verdict FAIL ("slimmer sculpted face, pointier chin, older" — a different
person).** At floor 75 the auto-QA ships t011 to a paying Business user. No
floor exists with zero false passes short of 80, and floor 80 false-blocks
half of everything (the range compression means good and bad outputs overlap
in the 70s).

Worst score disagreements (|Δ| ≥ 11): t121 (84 vs 68), t257 (68 vs 82), t045
(70 vs 84), t088 (76 vs 90), t011 (78 vs 65 FAIL), t194 (68 vs 80), t111
(65 vs 76), t006 (75 vs 86). Pattern: Gemini punishes pose/angle difficulty
(profile, foreshortening, glasses) and misses actual geometry drift.

## Consequence — auto-QA gate design v1 (replaces the score-floor idea)

1. **Binary adversarial verdict, not a score.** The production QA judge gets
   the calibrated blind-judge prompt (casual-viewer framing, feature-anchored,
   "would a friend say this is a different person — name the feature",
   re-look at the reference between comparisons). The Fable-class judges'
   verdicts were crisp and feature-grounded; the percentage was the unreliable
   part. Scores are kept as telemetry only — never as the gate.
2. **Tuned for zero false passes.** Error costs are asymmetric: a false block
   costs one retry (~₱2); a false pass ships the wrong face to a paying user.
   Any FAIL or UNSURE → auto-retry (N=2 per Grill-2 Q4).
3. **Escalation panel.** If all retries flag: 3 cheap judges vote, 2-of-3
   decides; still failing → surface to the user as "regenerate scene" instead
   of silently delivering (never ship a flagged face).
4. **AI-tells auto-fail checklist** rides along regardless of identity verdict:
   four-point star ghost (crop, Surface-A), gibberish/mirrored glyphs,
   broken jewelry/eyewear mechanics, over-brightened dark scene.
5. **Judge model is a deployment knob.** The backtest ground truth came from
   Fable-class judges; production should A/B gemini-3.5-flash-with-the-new-
   prompt vs a stronger tier on the same 29 before locking cost. The prompt
   shape is the proven part; the cheapest model that reproduces the blind
   verdicts wins.

## Caveats (honest)

- Ground truth = Fable-class blind judges, not real humans; Neil's eye stays
  the final authority. n=29, deliberately boundary-skewed (accuracy numbers
  are for THIS hard band, not the full set — full-set accuracy would be
  higher since most of the 279 are easy passes).
- The 3 human-FAIL cases (t246, t270, t011) all came from flash-lite
  generations (the brother's lane). gpt-image-2 (the wedge lane) held ≥82
  identity in 5/6 shootout cases — the gate will fire far less often there.
