# Pegasus vs Gemini Face-off (opened 2026-07-27)

Neil's directive: TwelveLabs claims their models read video better than anyone
("Pegasus 1.5 over Gemini 3.1 Pro on Multimodal Prompting, +13.1%" — homepage,
2026-07-27; **no public methodology found on their research page**). Confirm or
refute that claim **on our own workload** (viral-autopsy Edit-DNA analysis)
before believing it. Child of [twelvelabs_decision.md](twelvelabs_decision.md) —
its standing verdict (Pegasus is search-only; `analyze_video.py` stays the tuned
analyzer) holds until this face-off produces contrary evidence through the gate
below.

## Lanes

| Lane | System | Transport | Notes |
| --- | --- | --- | --- |
| **G** | Gemini `gemini-3.5-flash` (production analyzer default) | `tools/faceoff_ask.py` — Files API upload once, one `generate_content` per question | We test OUR production config, not TwelveLabs' benchmark target (Gemini 3.1 Pro). A Pro-model rerun is an optional Round 3. |
| **T** | Pegasus 1.5 via Jockey MCP | one `jockey_query` per question against `grifon-swipe-file` (`ks_019f94e4-8be3-70a1-98cb-bab72db8056e`) | Jockey adds an agent layer over Pegasus — this is a *production-systems* comparison, deliberately not lab-pure. |

**Fairness rules:** identical question text verbatim to both lanes · one
question per call · questions NEVER contain ground-truth values · both lanes run
same-day on the same source file.

## Referee (ground truth)

Documented deterministic evidence only, all pre-registered in
[viral_swipe_file.md](viral_swipe_file.md) / [twelvelabs_decision.md](twelvelabs_decision.md):
`render_audit.mjs` ffmpeg cut timing + still-frame OCR, and (for E8–E14)
smoke-tester frame verification. Questions without deterministic GT are marked
*qualitative* and scored leniently. **Neither model is ever the referee.**

## Scoring

Per question: **2** correct within tolerance · **1** partial (right phenomenon,
wrong/incomplete numbers) · **0** wrong · **−1** confident hallucination
(asserts something not in the video). Tolerances: timestamps ±1s (long-take
bounds ±2s) · duration ±10% · shot count ±2 or ±10% · median shot length ±1s.

## Corpus

- **Round 1 (this session): OP2** — One Peak "Format Finder" kinetic VSL, 168s,
  Ad Library id 779064774935809. Chosen because its GT is the freshest
  (ffmpeg-verified 2026-07-25) and BOTH lanes have a documented prior miss on it
  (Gemini: shot count + `holds_to_final_frame`; Jockey: proof-metrics
  interpretation) — neither lane is favored.
- **Round 2 candidates** (GT documented, re-downloadable): E7 (fb ad
  1019504114362909), E6 (fb ad 847677991322874 — may have stopped running), E9
  (IG `DHgVUG3x5YV`), E13 (IG `DHnbKjUJ89o` — the CGI-insert miss), E14 (IG
  `DChxOtHPDQQ` — 25 shots, 11 SFX hits). TEMU batch E15–E18 is NOT
  re-downloadable (source URLs were never recorded in the entries — lesson:
  record source URLs in every future entry).
- Round-2 fb-ad availability risk: Ad Library pulls only work while the ad runs.

## Round 1 question bank (OP2) — GT pre-registered

| # | Dimension | Question (verbatim to both lanes) | Ground truth (source) |
| --- | --- | --- | --- |
| Q1 | Cut timing | How long is this video, how many distinct shots (separated by cuts) does it contain, and what is the approximate median shot length? | 167.68s · 25 shots (24 cuts) · median ~5.5s (ffmpeg 2026-07-25) |
| Q2 | Transcript | What is the exact verbatim opening line of the video, and at what timestamp does it start? | "Let me describe a person and you tell me if this is you." @0:00 (verified entry) |
| Q3 | Retrieval | What is the name of the product being sold, and at what timestamp is it first named? | "Format Finder" @~0:46–0:47 (verified entry) |
| Q4 | Temporal/CTA | At what timestamp does the call-to-action occur? Does the CTA hold until the final frame — what actually happens at the very end of the video? | CTA @2:29 (149s); does NOT hold — ending is a P.S. joke (frame-verified; Gemini's documented miss, Jockey's documented win) |
| Q5 | Long take | What is the single longest continuous shot (no cuts)? Give its start and end timestamps and explain what maintains the pacing during it. | 29.4s walking take @11.3–40.7s; captions churning + walking motion carry pace (ffmpeg; Gemini's documented soft-read miss) |
| Q6 | On-screen text | Describe the on-screen caption system: how many words per caption chunk, how fast captions swap, the text color/styling, and any emphasis mechanic. | 1–3 words · ~0.4s swap · white with gold emphasis words · drop shadow (frame-verified) |
| Q7 | Proof metrics | What specific numeric proof of success or results does the ad present, and at what timestamps? | 17M views @~1:22 and 400k @~1:35; distractor = hook pain-metrics 1,000/500/200 @0:08–0:11 (Jockey's documented miss) |
| Q8 | Structure (qualitative) | Outline the ad's persuasion structure phase by phase with approximate timestamps. | PAS → epiphany → proof → objections → CTA (verified entry; lenient scoring) |

Max score 16 per lane.

## Verdict gates (pre-registered before running)

- **T beats G by ≥25% of max score (≥4 pts) across ≥2 rounds** → open a Gated
  Proposal in `viral_swipe_file.md`: add Pegasus as a *second-opinion lane* in
  viral-autopsy Step 3 (flag disagreements for the render_audit pass). NEVER an
  auto-replace of `analyze_video.py` (tuned file; Neil's gate).
- **Parity (±3 pts) or G wins** → `twelvelabs_decision.md` verdict stands
  unchanged; vault stays search/recall-only; log the result there and here.
- **Either way:** `render_audit.mjs` remains the mandatory referee for Pattern
  Index corroborations — deterministic > model, always (this face-off cannot
  weaken that rule, only decide which model gets a hypothesis-grade voice).

## Results

### Round 1 — OP2, 2026-07-27 · **Gemini 13/16 · Pegasus/Jockey 11/16 → parity band, standing verdict HOLDS**

| # | Dimension | Lane G (gemini-3.5-flash) | Lane T (Pegasus via Jockey) |
| --- | --- | --- | --- |
| Q1 | Cut timing | **1** — duration 2:48 ✅, median 5s ✅, but 30 shots (GT 25, outside tolerance) | **1** — duration 2:47 ✅, but **14 shots / 12s median** (GT 25 / 5.5s — way off, and self-contradicts: calls 12s medians "brisk") |
| Q2 | Transcript | **2** — verbatim exact @0:00 | **2** — verbatim exact @0:00 |
| Q3 | Retrieval | **2** — Format Finder @0:46 | **2** — Format Finder @0:47 |
| Q4 | Temporal/CTA | **2** — @2:29, "does not hold," describes the reply-to-a-voice-note / "Okay, bye" wave ending correctly | **1** — @2:29 ✅ but claims the CTA "does carry through to the end" (GT: it doesn't — P.S.-joke outro) |
| Q5 | Long take | **0** — picks an 18s couch shot @0:45–1:03 (GT: 29.4s walking take @11.3–40.7s); even contradicts its own Q1 shot list | **0** — picks "the final 18s shot" @2:29–2:47 (contains cuts per ffmpeg; same GT miss) |
| Q6 | On-screen text | **2** — 1–3 words, word-synced swap, white + drop shadow, yellow/gold emphasis | **2** — 1–4 words, 0.5–1s swap (GT ~0.4s, close), white + shadow, yellow/green emphasis |
| Q7 | Proof metrics | **2** — 17M @1:21–1:25 + 400k @1:32–1:37, no distractor confusion | **2** — 17.7M + 20k followers @1:22–1:25, 400k @1:33–1:37, correctly separates the 160k-students credibility claim |
| Q8 | Structure | **2** — 8 phases incl. puzzle-metaphor objection handling, car-metaphor risk reversal, CTA | **1** — decent arc but misses the objection-handling and risk-reversal/CTA phases entirely (labels 2:14–2:47 "lifestyle aspiration") |

**Reading (Round 1, n=1 — treat as directional):**

1. **TwelveLabs' "+13.1% over Gemini" claim did NOT reproduce on our workload.**
   Gemini won by 2 points. Worse for the claim: **cut-level temporal precision —
   the exact axis TwelveLabs markets ("continuous temporal reasoning vs frame
   sampling") — is where Pegasus lost hardest** (14 shots/12s median vs GT
   25/5.5s; Gemini's 30/5s was much closer).
2. **Both lanes failed the long-take question (Q5)** — neither found the 29.4s
   walking take that ffmpeg trivially finds. Empirical confirmation of the
   standing doctrine: **`render_audit.mjs` stays the mandatory referee;
   deterministic > model, always.**
3. **Run-to-run instability in BOTH systems, in both directions vs the 2026-07-25
   documented answers:** Gemini *fixed* its `holds_to_final_frame` miss and its
   28-shot/1.5s-median soft read; Jockey *regressed* on its CTA win (had the
   P.S.-joke read right on 7/25, now says CTA holds) and *fixed* its
   proof-metrics miss. Single runs are noisy — any future verdict change needs
   the ≥2-rounds gate, and ideally repeated runs.
4. **Where Pegasus/Jockey matched Gemini:** retrieval-flavored questions
   (Q2/Q3/Q6/Q7 — verbatim lines, timestamps of named moments, on-screen text).
   Consistent with the twelvelabs_decision verdict: it's a *search/recall*
   system for us, not an analyzer.
5. Lane-fairness caveat: Jockey answers from its *index* (Marengo segmentation),
   Gemini from the raw 55MB file — the Q1 shot-count gap may be an indexing
   artifact rather than raw Pegasus ability. Doesn't change the practical
   conclusion (we'd consume Pegasus through Jockey anyway).
6. Ops datapoint: **Jockey free plan limits queries to 5/min** (hit mid-run;
   resets per minute). Fine for autopsy assist, annoying for batch evals.

**Round 1 outcome per the pre-registered gates: parity (±3) → the
[twelvelabs_decision.md](twelvelabs_decision.md) verdict stands unchanged**
(vault = search/recall accelerator; `analyze_video.py` stays the analyzer; no
Gated Proposal opened). Round 2 (E7 + E9/E13/E14) is optional — worth running
only if Neil still wants the claim stress-tested at n>1; the burden of proof is
on the "+13.1%" claim now, and Round 1 points the other way.

Raw answer files: `.tmp/faceoff/lane-g.json` + Jockey transcripts (disposable —
this section stands alone).

**Artifacts (phone-readable reports, survive the defreezer):** two renderings
of the same verified data — redeploy to the SAME URLs (pass as the Artifact
tool's `url` param) when Round 2 results land:
- **NOIR** (standing default treatment):
  `https://claude.ai/code/artifact/fd0b3457-a171-4865-b460-8baf6e55a523`
- **God Mode 2050** (gold-hologram command-deck variant, Neil-requested option
  2026-07-27): `https://claude.ai/code/artifact/00ff8be9-8c00-4624-9e54-ff2088db2343`
