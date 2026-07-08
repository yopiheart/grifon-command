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

- [x] **P9 reached 3 corroborations (2026-06-26).** E6 (authority/gastro VSL) did
  NOT corroborate (→ new candidate P10); **E7 (IM8 GLP-1 kinetic VSL) did** — Neil
  accepted it as #3 (kernel match). The `vsl` preset is now a **Gated Proposal**
  (see below). Lesson banked: P9 is a *kinetic* edit grammar, not "any long-running
  supplement ad." Ad Recon + free fbcdn download + render_audit verification all
  proven this session.
- [x] **Build Believability DNA — CAPTURE half (2026-06-26).** `analyze_video.py`
  now emits a `believability` block (6 dims + `observed_register` +
  `source_realism_verdict`, soft-captured, qualitative+confidence); the entry
  template carries a Believability table + register/authenticity line; Step 3c
  cross-checks the visual register; the P11+ family + AI-tells catalog are seeded
  (above); the source guardrail is in the skill. No tuned-prompt change.
  - [ ] **APPLY half still frozen** (spec `believability_dna.md` Next-steps 3–4):
    establish the avatar **identity-lock baseline + consistency**, then per-fragment
    **Gated Proposals** through the ≥3-`real-human` + manual-A/B-on-Veo loop. Surface
    B/C cues never touch a tuned prompt until that loop closes.
- [ ] **Decide the `vsl` Gated Proposal** (below): tuned `IMPACT` variant vs a 5th
  preset, and the ROTATION pool. Then build under `surgical-edit` + `verify-changes`
  (TUNED file `api/_lib/renderPresets.ts`). Separately design the structural kernel
  (solo number word-cards as an EDL overlay; title-card product slam) — gated.
- [ ] **`find_winning_ads.py` enhancement:** parse `asset_age_days` from the
  captured fbcdn video URL's `efg` param as a second longevity signal (the
  displayed "Started running" date resets on edit; the date filter + asset age
  are both more trustworthy).
- [ ] When the `vsl` preset ships, unpark roadmap item #11 (client-facing
  preset picker) — see `workflows/post_beta_roadmap.md`.
- [ ] When Slice 3/4 renderer work lands, re-autopsy our own FINAL_RENDER
  output and compare against baseline entry E0 to measure the gap closed.
- [ ] **Validator blind spot (found 2026-07-08, Higgsfield batch):** all 6
  sub-20s format demos failed `analyze_video.py`'s specificity gate solely on
  `why_it_works >= 3` (twice each; every other field was timestamped and
  specific). Proposal for Neil: relax to `>= 2` when `duration_s < 20`, in
  `tools/analyze_video.py`'s validator (plain tool, not tuned — but gate the
  change since it guards swipe-file quality).

## Active Format Evidence Hunt (opened 2026-07-08)

Neil's pre-launch decision (plan `by-the-way-fable-precious-hellman`, approved
2026-07-08): candidate **scripting formats** are NOT built on guesses — each must
graduate through this file's standard ≥3-corroboration gate before any
`scriptType` branch is proposed for the TUNED `api/_lib/prompts.ts`
(`buildAdScriptPrompt` + `buildStoryboardPrompt` skeleton). Neil collects the
videos (TikTok/FB; `ad-recon` can mine Meta Ad Library); each goes through
`/viral-autopsy` for an evidence-bound entry. Hunt priorities:

1. **Walking / authority UGC** (extends **P10**, currently 1/3 — closest to
   threshold). Wanted: 2+ more real viral examples — credentialed-expert or
   talking-while-walking UGC in services/practitioner niches. At ≥3 → Gated
   Proposal for a first-class format branch.
2. **Before/After transformation** (0 logged). Wanted: 3+ examples —
   cleaning/derma/fitness/renovation. Product plumbing already exists (the
   `before`/`after` servicePhotos slots + venue-slot routing), so the eventual
   proposal is script-formula + storyboard-skeleton only.

Deliberately NOT hunted yet (Neil, 2026-07-08): unboxing/POV promotion (already
live as Temu sub-types), tutorial/how-to (zero scaffolding, weakest evidence),
Food/Fashion dedicated verticals (see `post_beta_roadmap.md` #19–20 resume
triggers). P9 `vsl` stays a separate queued decision (below).

## Competitor Format Intel — Higgsfield UGC format demos (2026-07-08)

**Provenance:** 6 format demos Neil pulled from Higgsfield — the formats they
productized for users AFTER doing their own "what UGC style keeps going viral
on TikTok for product/fashion" research. Secondhand market signal: a funded
competitor's bets on which formats convert.

**Classification rules for this section (stricter than Entries):**
- These are DEMOS, not proven winners (no views/longevity) → they do **NOT**
  increment Pattern Index counts. They seed hunt targets only.
- Provenance is an AI-video vendor → source-authenticity forced to
  `likely-ai (vendor demo)` and **excluded from believability corroboration**,
  even though Gemini verdicted all 6 `real-human` (conf med-high). That
  mismatch is itself a data point: Higgsfield's believability passes our
  detector (natural micro-expressions, skin texture, hand physics, lip-sync,
  lived-in backgrounds — see per-demo notes).
- All 6 hit the analyzer's `GENERIC_OUTPUT` gate on `why_it_works >= 3` even
  after the one retry — a **validator blind spot for sub-20s demos** (the
  analyses are timestamped and specific; a 15s stripped demo genuinely has ~2
  claims). Recorded here by design; see Pending Actions.

| # | Slug | Format family | Product | Dur/shots | Hook (verbatim) | Beats | Reveal | CTA |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| H1 | 4dcc2a50 | **Fashion try-on transformation** | striped set + tights | 15s / 5 (med 2.5s) | "Okay, I had to try this set. Watch this." | Setup → Reveal → Styling escalation → Verdict | in-frame @0s | none |
| H2 | 5d920c0b | **UGC talking-head demo** (Hook-Demonstrate-CTA) | snack | 13s / 4 (med 3.3s) | "I need to warn you these little guys are dangerously addictive." | Hook → Demo → CTA | in-frame @0s | spoken @10s, holds |
| H3 | 673f69ef | **ASMR unboxing (mic-check open)** | tech + dock | 15.6s / 1 (!) | "Okay, mic check, one, two. Just listen to the taps." | Hook → Reveal → Demo → CTA | unboxing @3s | spoken @12s ("tell me and I'll do it next") |
| H4 | 809b9092 | **Haul unbox → try-on → fit-proof** | gym set | 15s / 5 (med 3.2s) | "My gym set just landed, let's open it." | Hook → Unboxing → Try-on → Squat test → Verdict | unboxing @3s | none |
| H5 | 9f4320b6 | **POV handheld product demo** | phone case | 15.8s / 3 (med 4.8s) | "Wait. Wait, look at this." | Hook → Demo (shake/rustle) → Outro | in-frame @0s | none (3s dead-air outro) |
| H6 | 9f8bc173 | **Overhead aesthetic ASMR unboxing** | jewelry | 16s / 2 | *(no VO — pure ASMR taps/clicks)* | Hook (taps) → Reveal → Showcase | unboxing @3s | none |

**Shared DNA (6/6):** 13–16s · **ZERO captions** · no/minimal music · 1–5 shots
· phone-native (tripod-static or handheld-drift) · product visible ≤3s (4/6 at
0s) · conversational spoken hook ≤2s · `polished-ugc` register (H5 `raw-ugc`) ·
sensory proof beat (squat test H4, taps H3/H6, shake-rustle H5, styling
contrast H1) · natural lighting + lived-in backgrounds.

**Contradiction note (demo-class, not pattern-driving):** caption-less across
the board contradicts P1/P2/P7 (caption churn / text-on-frame-1) — Higgsfield's
product/fashion UGC bets on spoken hooks + tactile audio instead. Gemini itself
flagged the missing captions as the top weakness on 5/6 (silent scrollers).
Plausible synthesis: OUR pipeline can have both (Higgsfield performance grammar
+ Grifon caption system) — that combination is exactly what the hunt should
test against real winners.

**Hunt implications (updates the Active Format Evidence Hunt above):**
- H1/H4 (try-on transformation, fit-proof) → strengthens **Priority 2
  (before/after)**'s fashion flank; real-winner corroboration should include
  try-on transformations, not just cleaning/derma.
- H3/H6 (ASMR unboxing) + H5 (POV demo) → competitor-validated versions of the
  Temu sub-types; when Neil is ready to hunt unboxing/POV promotion, start from
  these skeletons.
- H2 (talking-head demo) → nearest to our existing Testimonial; lowest
  novelty.
- JSONs: `.tmp/viral-intel/*.json` (disposable — this section stands alone).

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
| P9 | **VSL grammar — KERNEL (preset candidate `vsl`)**: white 1–3 word word-pop captions churning sub-0.5s, **solo word-cards for key numbers/nutrients**, whip-pan/match cuts, title-card product slam, post-zoom (from generation), zero dead air, text-on-frame-1. *Variable (studio/length-specific, do not bake):* 5–6s vs ~2.4s shots, reveal 40–45% vs ~62%, the single pre-payoff pause, ExtraBold-Italic vs ALL-CAPS. | 3 (E4, E5, **E7**) | **proposed** (Neil accepted E7 as #3, 2026-06-26 — kernel cross-confirmed across 2 studios + long-form & short formats) → see Gated Proposals |
| P10 | **Authority/practitioner talking-head UGC**: credentialed expert (scrubs/title-card on frame 1) → problem → solution → CTA; plain white sentence-case captions, hard cuts, *static* camera, ingredient/data points spoken in VO not popped | 1 (E6) | observed (new candidate) |

### P11+ — Believability family (capture live 2026-06-26; see `believability_dna.md`)

What makes a *human subject* read as real and trustworthy (vs "AI slop") —
performance, voice delivery, lighting, camera/lens, image realism, lip-sync — plus
the **realism register** (`raw-ugc` / `polished-ugc` / `cinematic`). Distinct from
the Edit-DNA patterns above (P1–P10) because each cue is **surface-tagged**:

- **A** = renderer/presets (post-production) — normal review, **zero slop risk**.
- **B** = Veo 3.1 video prompt — **FROZEN** behind the ≥3 + manual-A/B loop.
- **C** = ElevenLabs TTS (cinematic/narrator-VO only) — **FROZEN**, same loop.

**Gating rules for this family** (stricter than P1–P10): a candidate corroborates
**only** from `real-human` (`source_realism_verdict`) sources — `likely-ai` winners
are excluded and instead feed the **AI-tells / avoid** catalog below. Real P11,
P12… rows are created the first time a `real-human` autopsy surfaces a recurring
believability cue (same lifecycle as P1–P10); Surface B/C rows can reach
`proposed` only via `believability_dna.md`'s validation loop, never a bare ≥3.

*(No rows yet — seeded empty on purpose; the first `real-human` autopsy populates them.)*

## Gated Proposals

*Tuned-prompt / preset proposals awaiting Neil. Only patterns with ≥3
corroborations may appear here. The viral-autopsy skill never applies these.*

- **P3 → hook construction (TUNED):** add a "hard-cut reveal" hook variant
  alongside the metaphor-morph hook (end scene on the cut; product b-roll scene
  follows), killing the morph dependency. Evidence: 5/5 references, plus
  baseline blob severity 8/10. Full design: `edit_style_research.md` §5–6.
  Status: with Neil.

- **P9 → new `vsl` Edit Style Preset (TUNED — `api/_lib/renderPresets.ts`).**
  Evidence: 3 corroborations (E4, E5 One Peak long-form VSLs; E7 IM8 GLP-1 kinetic
  VSL) — kernel cross-confirmed across 2 studios + 2 formats. **Proposed, never
  applied — for Neil. The kernel maps cleanly onto the existing `RenderPreset`
  shape; it's close to `IMPACT`+`HYPE`, so the cheapest path may be a tuned
  `IMPACT` variant rather than a 5th preset.** Concrete starting values:

  | Field | Proposed `vsl` value | Why (kernel evidence) | Closest existing |
  | --- | --- | --- | --- |
  | `caption.fontFile` | `Anton-Regular` or `Montserrat-ExtraBold` | white ExtraBold/condensed caps (E4/E5 Italic, E7 ALL-CAPS — case is the *variable* axis, weight is the constant) | IMPACT (Anton) |
  | `caption.chunkAnim` | `word-pop` | 1–3 word pop, sub-0.5s churn (E7 swap ~0.4s, verified) | HYPE |
  | `caption.boxAlpha` / `borderWFrac` | `0` / `~0.08` | outline, never box (P2) | IMPACT |
  | `caption.fillColor` / `highlightColor` | `white` / accent on numbers | color-shift emphasis on key numerals (E7) | IMPACT |
  | `transition.kind` / `everyN` / `halfDurSec` | `whip` / `2` / `~0.05` | whip-pan/match cuts on alternating cuts (E4/E5/E7) | HYPE |
  | `hook.layout` / `reveal` | `title-stack` / `slam` | text-on-frame-1, punchy reveal (P7) | IMPACT |
  | `sfx.maxWhoosh` | `~4` | whoosh hits on cuts (E7) | HYPE |
  | `camera.*` | **leave `intensity: 0`** | ⚠️ P9's "always-zoom" comes from **generation**, NOT the renderer — adding renderer zoom contradicts the locked pulse-guard (Neil 2026-06-10). Do NOT bake. | all presets |
  | `ROTATION` pool | Neil's call (DR/`temu`? new `vsl` script style?) | VSL is long-form direct-response, distinct from mrbeast/testimonial | — |

  **NOT in this preset (separate, also gated):** the *structural* kernel —
  **solo word-cards for key numbers/nutrients** (needs a new EDL overlay variant,
  not a caption-style field), the **title-card product slam** at a mid-point, and
  the **educational runway / one pre-payoff pause** — these are storyboard/EDL +
  prompt concerns (`prompts.ts` / EDL), to be designed under `surgical-edit` +
  `verify-changes`, never as an autopsy side effect.
  Status: with Neil.

## AI-tells / avoid (anti-pattern catalog)

*The inverse of the Believability family: cues that made a `likely-ai`-verdicted
source read **fake**. These winners are excluded from believability corroboration
(they may be long-running but they're slop) — what makes *theirs* fake is exactly
what to avoid in *ours*. Populated as `likely-ai` `source_realism_verdict`s accrue;
each entry cites the autopsy + the specific tell (skin/hands/teeth/eye artifact,
lip-sync drift, impossible lighting, plastic over-clean texture).*

*(Empty — seeded on purpose; the first `likely-ai` autopsy populates it.)*

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
