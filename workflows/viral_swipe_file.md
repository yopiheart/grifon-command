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
| P1 | Caption churn is the engine of perceived pace, not cut rate — 1–3 word chunks swap every 0.4–0.6s while shots hold 4–7s | 5 (all refs, 2026-06-10) | applied — drives Slice 4 word-pop/chunk sizing |
| P2 | Caption treatment: outline+shadow, never a background box; gold/yellow or white; emphasis via solo-word card or two-tone | 5 | applied — renderPresets caption styles |
| P3 | Nobody morphs, ever — product reveals are hard cuts, title-card slams, or in-hand-from-frame-1; whip-pan blur masks big changes | 6 (+E6) | proposed — hook blob fix (TUNED, gated; see edit_style_research §6) |
| P4 | Always be zooming: 3–6%/s push on every static shot, alternating direction; punch-ins reserved for pivots/CTA | 4 | applied — preset camera defaults; **contradicted by E3 (stunt UGC) + E6 (authority talking-head)** — static wins when subject/credibility carries it |
| P5 | Zero dead air: VO fills ≥99% of timeline; at most ONE deliberate ≤0.5s pause right before the payoff | 6 (+E6) | observed |
| P6 | Proof is graphic, not spoken — pills, chips, dashboards, numerals popped on screen | 3 | observed; **E6 contradicts** (data spoken in VO, not popped) |
| P7 | Text on frame 1 — hook caption already on screen when the video starts | 5 (+E6) | applied — hook text delay → 0 (Slice 3) |
| P8 | Strobe/flash bookends (1–3 frames) open and close short-form edits — cheap scroll-stop + clean out | 2 | observed (below threshold) |
| P9 | **VSL grammar (composite, preset candidate `vsl`)**: 5–6s shots, white ExtraBold Italic 1–3 word captions w/ hard pop, solo word-cards for key numbers, invisible match-cuts/whip-pans, title-card product slam ~40–45%, always-zooming 3–6%/s, ONE deliberate pre-payoff pause | 2 (E4, E5) | observed (still below threshold — **E6 did NOT corroborate**: IM8 authority-UGC is message-similar but edit-DNA-different. P9 needs a genuine *kinetic* VSL, not any long-running VSL) |
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
