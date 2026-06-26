# Viral Swipe File

The compounding database behind the `viral-autopsy` skill: every analyzed
social video/ad gets an evidence-bound entry here, patterns accumulate in the
index, and nothing graduates to a proposal without ≥3 corroborating videos.
Read top-to-bottom at the start of every autopsy run. Maintained by
`.claude/skills/viral-autopsy/` via `tools/analyze_video.py`.

Founding data ported from `workflows/edit_style_research.md` (2026-06-10 ffmpeg
autopsy of 6 videos — full Edit DNA table and synthesis live there; entries
below are condensed pointers, not replacements).

## Pending Actions

- [ ] **Find P9's 3rd corroboration — needs a genuine *kinetic* VSL.** Ad Recon's
  first live run (2026-06-26, IM8 Health) autopsied the authority/gastro VSL → **E6**,
  which did NOT corroborate P9 (message-similar, edit-DNA-different; spawned new
  candidate **P10**). Lesson: P9 is a kinetic edit grammar, not "any long-running
  supplement ad." Next candidates: IM8's date-filtered genuine winner **"GLP-1 /
  Daily Essentials PRO"** (`1019504114362909`, ~38d) — autopsy to test if it's
  kinetic; or recon a DR brand known for fast-cut VSLs (One Peak-style). Ad Recon
  + free fbcdn download now both proven (`spy_intel.md`).
- [ ] **`find_winning_ads.py` enhancement:** parse `asset_age_days` from the
  captured fbcdn video URL's `efg` param as a second longevity signal (the
  displayed "Started running" date resets on edit; the date filter + asset age
  are both more trustworthy).
- [ ] When the `vsl` preset ships, unpark roadmap item #11 (client-facing
  preset picker) — see `workflows/post_beta_roadmap.md`.
- [ ] When Slice 3/4 renderer work lands, re-autopsy our own FINAL_RENDER
  output and compare against baseline entry E0 to measure the gap closed.

## Pattern Index

Status: `observed` (counting) → `proposed` (≥3 corroborations, in Gated
Proposals or applied discussion) → `applied` (shipped in Grifon).

| ID | Pattern | Corroborations | Status |
| --- | --- | --- | --- |
| P1 | Caption churn is the engine of perceived pace, not cut rate — 1–3 word chunks swap every 0.4–0.6s while shots hold 4–7s | 6 (+E7) | applied — drives Slice 4 word-pop/chunk sizing |
| P2 | Caption treatment: outline+shadow, never a background box; gold/yellow or white; emphasis via solo-word card or two-tone | 5 | applied — renderPresets caption styles |
| P3 | Nobody morphs, ever — product reveals are hard cuts, title-card slams, or in-hand-from-frame-1; whip-pan blur masks big changes | 7 (+E6,E7) | proposed — hook blob fix (TUNED, gated; see edit_style_research §6) |
| P4 | Always be zooming: 3–6%/s push on every static shot, alternating direction; punch-ins reserved for pivots/CTA | 4 | applied — preset camera defaults; **contradicted by E3 (stunt UGC) + E6 (authority talking-head)** — static wins when subject/credibility carries it |
| P5 | Zero dead air: VO fills ≥99% of timeline; at most ONE deliberate ≤0.5s pause right before the payoff | 7 (+E6,E7) | observed |
| P6 | Proof is graphic, not spoken — pills, chips, dashboards, numerals popped on screen | 4 (+E7) | observed; E6 contradicts (data spoken, not popped); E7 confirms (stat + nutrient word-cards) |
| P7 | Text on frame 1 — hook caption already on screen when the video starts | 6 (+E6,E7) | applied — hook text delay → 0 (Slice 3) |
| P8 | Strobe/flash bookends (1–3 frames) open and close short-form edits — cheap scroll-stop + clean out | 2 | observed (below threshold) |
| P9 | **VSL grammar (composite, preset candidate `vsl`)**: 5–6s shots, white ExtraBold Italic 1–3 word captions w/ hard pop, solo word-cards for key numbers, invisible match-cuts/whip-pans, title-card product slam ~40–45%, always-zooming 3–6%/s, ONE deliberate pre-payoff pause | 2 + **E7 candidate** | **at threshold — Neil's call.** E6 (authority-UGC) did NOT corroborate; **E7 (kinetic GLP-1 VSL) hits P9's distinctive *kernel*** (1–3w word-pop captions, solo number/word-cards, whip-pans, title-card product slam, post-zoom, zero dead air, text-on-frame-1) but diverges on E4/E5-specific specs (shots ~2.4s not 5–6s; reveal ~62% not 40–45%; no pre-payoff pause; ALL-CAPS not Italic). If accepted as #3 → draft the kernel-based `vsl` Gated Proposal (specs marked variable). |
| P10 | **Authority/practitioner talking-head UGC**: credentialed expert (scrubs/title-card on frame 1) → problem → solution → CTA; plain white sentence-case captions, hard cuts, *static* camera, ingredient/data points spoken in VO not popped | 1 (E6) | observed (new candidate) |

## Gated Proposals

*Tuned-prompt / preset proposals awaiting Neil. Only patterns with ≥3
corroborations may appear here. The viral-autopsy skill never applies these.*

- **P3 → hook construction (TUNED):** add a "hard-cut reveal" hook variant
  alongside the metaphor-morph hook (end scene on the cut; product b-roll scene
  follows), killing the morph dependency. Evidence: 5/5 references, plus
  baseline blob severity 8/10. Full design: `edit_style_research.md` §5–6.
  Status: with Neil.

## Entries

### 2026-06-10 — E0 BASELINE: CURRENT EDIT.mp4 (our renderer, skincare PH)
**Why autopsied:** own-output baseline to measure references against.
**Format:** hook→bridge→alternating b-roll/talking→CTA, 35.8s, 8 shots (avg 4.48s, none under 3.8s)
Hook blob 1.8–3.4s (severity 8/10, product illegible until 3.4s); 4 captions in
36s; zero edit grammar (7 bare hard cuts, flat loudness); zero camera motion
outside 2 push-ins; CTA vanishes 3s before end. Full autopsy:
`edit_style_research.md` §1. **So What:** the entire Slice 3/4 + Phase D punch
list. **Patterns:** violates P1–P8 (that's the point).

### 2026-06-10 — E1 "5 Websites" (Neil-picked viral ref, tech/listicle)
58.7s, median shot ~4.7s + chapter cards every ~9s; pace from window-content
swaps every 1.5–3s + caption churn; gold ALL-CAPS outline+shadow captions,
chunk pop w/ scale overshoot; black chapter cards + open/close strobe; ±5–8%
drift, ONE zoom-punch at CTA; 0 silences. Details: `edit_style_research.md` §2.
**Patterns:** P1, P2, P4, P5, P8.

### 2026-06-10 — E2 "Don't get this wrong" (Neil-picked viral ref, talking-head)
28.1s, ~4.7s shots; caption churn every 0.4–0.6s in two layers (yellow karaoke
chunks + accumulating headline); strobe bookends + jump punch-in; constant
3–5%/s zoom-in per talking-head shot; 0 silences; maps 1:1 onto our storyboard
grammar. **Patterns:** P1, P2, P4, P5, P7, P8.

### 2026-06-10 — E3 Lowe's plane UGC (Neil-picked viral ref, stunt UGC)
19.4s, ~4.8s shots, locked-off camera; pace from live stunt escalation, not
edit; product **in hand from frame 1, zero transition**; white sentence-case
1–2 word captions, instant swap; pops on sticker pop-ins; 0 silences.
Contradiction note: wins with static camera (P4 contradiction — stunts carry
their own motion). **Patterns:** P1 (partial), P3, P5, P7; contradicts P4.

### 2026-06-10 — E4 FB Ad 1 VSL (One Peak Creative "Format Finder", PH, by impressions)
204s, 5.5s shots; invisible match-cuts + badge pop-ins; white ExtraBold Italic
1–3 word captions, pop w/ scale punch, **solo 1-word cards for key numbers**;
title-card product slam at 41% + phone mockup; always zooming 3–6%/s
push/pull; ONE deliberate pre-payoff pause in 204s. **Patterns:** P1, P2, P3,
P4, P5, P6, P7.

### 2026-06-10 — E5 FB Ad 2 VSL (One Peak Creative, PH, by impressions)
219s, 5.5s shots; whip-pans + mid-sentence location jump-cuts; white ExtraBold
Italic 1–3 word captions, hard pop, solo word cards; title-card slam at 45% +
phone mockup; never static (handheld + punch-ins); loudness-maxed, ONE
pre-payoff pause. **Patterns:** P1, P2, P3, P4, P5, P6, P7.

### 2026-06-26 — E6 IM8 gastroenterologist VSL (fb-ad-library, supplements)
**Why autopsied:** Ad Recon's **first live run** (`spy_intel.md`). IM8 Health's #2
most-scaled video ad (top of the impressions sort, `view_all_page_id=345914995276546`);
displayed "Started running" Jun 9 (17d) but the fbcdn URL's `asset_age_days=52`
— the creative has been in rotation ~52 days (date resets on edit). Picked to
test the handoff hypothesis that an IM8 authority-testimonial would push **P9**.
· **File:** `.tmp/viral-intel/im8-gastro-847677991322874.json` (disposable)
**Format:** Authority Hook→Problem→Solution→CTA talking-head UGC, 39s, 9 shots (median 3.0s; one 15.2s static tail)

| Hook | Pace driver | Captions | Edit grammar | Camera | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- |
| "As a practicing gastroenterologist, I know" — text on frame 1 @0.0s, bold-claim authority (scrubs + title card) | b-roll content swaps (5 cuts / 13s) vs slow talking-head — **not** caption churn | white + black-outline, **sentence case, 3–6 words**, instant swap ~1.5s, **no emphasis** | light-leak flash @1.0s, otherwise **all hard cuts**; ambient synth pad; **0 silences** | **handheld static**, minor shake (no zoom) | @10.5s (27%), **hard cut** | @25s pinned overlay, holds to final frame |

**Why it works (timestamped):**
1. Immediate authority — scrubs + "gastroenterologist" title card within @1.0s (high)
2. Clear product demo — 9.6s open/pour/shake/present sequence @14.2s (high)
3. Specific ingredient data — "3g prebiotic soluble fibre", "90+ ingredients" @30s, but **spoken in VO, not graphic word-cards** (medium)

**Weaknesses:** the 15.2s static talking-head tail around the CTA risks drop-off before the offer lands.

**So What for Grifon:**
- Authority-credential cold-open (credential title card on frame 1) → target: `grifon-cmo` hook template (a Bryan/Olivia "as a [credential]…" variant) — a **message** pattern, not a renderer change.
- Plain sentence captions + hard cuts + **static** camera win here → **evidence the kinetic P9 grammar is not universal**; do NOT cargo-cult zoom/word-pop onto authority-UGC. → none (record-only; would be TUNED/gated anyway).
- `asset_age_days` embedded in the fbcdn video URL is a **truer longevity signal** than the displayed "Started running" date → target: `tools/find_winning_ads.py` enhancement (parse `asset_age_days` from the captured video URL as the longevity field).
**Patterns:** corroborates **P3** (hard-cut reveal, no morph), **P5** (zero dead air), **P7** (text on frame 1); partial **P2** (white outline, no box — but no emphasis mechanic); **contradicts P4** (wins with a static camera — 2nd P4 contradiction after E3, and this one is a talking-head, not a stunt); **does NOT corroborate P9** (edit-DNA mismatch on every axis — message-similar ≠ grammar-similar). New candidate: **P10**.
**Verified (2026-06-26):** cross-checked with `tools/render_audit.mjs` (ffmpeg ground-truth timing + still-frame OCR). Gemini's numbers held within tolerance — duration 39.0 vs ffmpeg 38.15s; shots 9 vs ~7–8; longest 15.2 vs 14.4s; captions 3–6w/1.5s vs observed 2–4w/~1–2s; transcript matched verbatim across two independent reads + the burned captions. Single pass missed only the pinned `USE CODE "DRALAN"` overlay + white CTA band + karaoke-build captions (called "instant swap") — none change the P9 verdict.

### 2026-06-26 — E7 IM8 "GLP-1 / Daily Essentials PRO" VSL (fb-ad-library, supplements)
**Why autopsied:** Ad Recon's first **date-filtered genuine winner** — IM8's own
ad that cleared the `start_date[max]` longevity gate (displayed May 19 = 38d;
fbcdn `asset_age_days=44`). Picked to re-test **P9** on a *proven* long-runner
after E6 (authority-UGC) missed. · **File:** `.tmp/viral-intel/im8-glp1-1019504114362909.json` (disposable)
**Format:** kinetic VSL, hook-problem-agitate-solve (educational), 62s, ~20 shots (ffmpeg; median ~2.4s) — a fast TikTok-native VSL vs E4/E5's 200s+ long-form.

| Hook | Pace driver | Captions | Edit grammar | Camera | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- |
| "Three stages people go through on GLP-1" — text on frame 1 @0.4s, curiosity gap | sub-second caption churn + ~2.4s cuts + content swaps | **1–3 word ALL-CAPS, white+red, ~0.4–0.8s swap**, color-shift emphasis, **solo word-cards** (`ENERGY`,`FATIGUE`,`10 BILLION`,`[16+]`, nutrient cards `Mg/B12/CoQ10/Zn`) | whip-zoom @4.8s, slide, cross-dissolve, **whoosh SFX hits**; synth bed; **0 silences** | static + post digital zooms/pans | **title-card slam** "I·M·8 Daily Ultimate Essentials" @~38.5s (~62%) | end card @~60s + clinical stats + money-back |

**Why it works (timestamped):**
1. Targeted curiosity hook — names "GLP-1" + warns of "Stage 3" in first 3s (high)
2. Rhythmic kinetic pacing — ~20 cuts + sub-second caption churn over 62s prevents drop-off (high)
3. Value-first structure — ~38s (62%) of physiology education before the pitch (high)
4. Graphic proof — "95% felt an energy boost", "85% better digestion" stat cards near the close (medium)

**Weaknesses:** late product reveal (~62%) risks pre-pitch drop-off; the long education runway is the bet.

**So What for Grifon:**
- This is the **kinetic VSL grammar** P9 describes, corroborated by a 3rd independent video (different studio, shorter format) → strengthens the `vsl` preset case. → target: `renderPresets.ts` `vsl` candidate (TUNED/gated — Gated Proposal).
- Solo word-cards for numbers/nutrients + sub-0.5s caption churn → the word-pop/chunk engine Slice 4 already targets (P1/P6); confirms it generalizes to VSLs.
- `grifon-cmo`: the "3 stages / Stage 3 is where it costs you" agitation + GLP-1 audience-naming is a reusable hook structure.
**Patterns:** corroborates **P1** (sub-0.5s caption churn), **P3** (title-card/hard-cut reveal, no morph), **P5** (zero dead air), **P6** (graphic proof + word-cards), **P7** (text on frame 1); **P9 kernel** — hits the *distinctive* P9 elements (1–3w word-pop captions, **solo word-cards for numbers**, whip-pans, title-card product slam, post-zoom) but diverges on the E4/E5-specific specs (shots ~2.4s not 5–6s; reveal ~62% not 40–45%; no pre-payoff pause; ALL-CAPS not Italic).
**Verified (2026-06-26):** `render_audit.mjs` — duration 62.0 vs ffmpeg 62.21s; shots 24 vs ffmpeg ~20; median 2.0 vs ~2.4s; caption swap 0.4s confirmed (new caption nearly every 0.5s frame); solo word-cards + title-card slam confirmed off frames; transcript matched verbatim. Reads trustworthy.
