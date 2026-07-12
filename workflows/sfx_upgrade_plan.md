# SFX Upgrade Plan — variant rotation + diegetic cue layer ("the sound-design brain")

**Status: DESIGN GRILLED + PREMORTEMED 2026-07-12 — NOT approved for build.**
Build starts only when Neil green-lights Slice 0 below (this is the Gated
Proposal for a TUNED surface: `api/_lib/renderPresets.ts` + `renderFfmpeg.ts`).

## Problem (Neil, 2026-07-12)

The render pipeline's SFX are a static 10-sample bank with one palette per
preset — every ad sounds the same ("paulit-ulit"). Meanwhile the E8–E14 reel
batch proved **P13** (SFX-per-entrance discipline, 7/7 corroborated): pros sync
a hit to every graphic entrance and add diegetic hits on content mentions
(cash-register on the money line, E12 @3.5s). Video-model audio is NOT an
alternative: our pipeline already strips Omni/Veo audio and muxes ElevenLabs VO
— SFX can only come from the FFmpeg layer, where we control volume and timing.

## Decisions (grilled 2026-07-12, all Neil-picked)

1. **Scope:** product render pipeline first; ai-editor lab inherits the bank.
2. **Generation model:** pre-generated library — ONE budget-capped ElevenLabs
   sound-generation session, 4–6 variants per cue class, ear-tested, committed
   as static assets. Seeded per-ad rotation. NO live per-ad generation (no
   stochastic audio in client ads, no new audio QA gate needed).
3. **Cue brain:** rules-first — existing overlay-entrance triggers keep firing
   (now with variant rotation) + a curated keyword→cue table over the
   forced-aligned word timestamps. No new AI calls; table grows with swipe-file
   evidence.
4. **Mix:** auto rules only — per-cue-class gain (diegetic ~0.7, UI ticks ~0.5,
   transitions ~0.6), existing music ducking, hard hit-frequency cap. No user
   mixer.
5. **Tier:** all tiers, quietly. Omni Edit Styles stays the Business
   differentiator.

## Premortem (Neil's failure narrative, 2026-07-12) → design mitigations

> "Ung mga sound effects ay hindi tugma dun sa script or storyboard? Tapos
> hindi tama ung timing kung hindi LATE, minsan advance naman. Which is maganda
> ung ads pero dahil sa sound effects issue naging worst ung ads."

**FM1 — semantic mismatch (wrong sound for the script/storyboard):**
- **Precision over recall.** A missed cha-ching costs nothing; a wrong one
  ruins the ad. Triggers are whole-word, high-precision only: `₱` only when
  followed by digits, "% off" as a unit, standalone "sale"/"libre" — never
  substring matches, never inside URLs. No trigger fires within a negation
  window ("walang libre" → silent).
- **Register/preset gate.** Diegetic cues carry an allowed-preset field:
  testimonial/`clean` renders get the minimal palette ("restraint is the
  style" is already CLEAN's doctrine); playful cues (cha-ching) never fire on
  sincere registers — same principle as the CMO sincerity guard.
- **Storyboard-aware allowlist.** A cue class only fires when the EDL actually
  contains its visual counterpart (notification pop ONLY when a UI-card
  overlay renders; shutter ONLY on freeze/photo moments). The script alone
  can't summon a sound with no matching visual.
- **Caps: max 1 diegetic cue per scene, 2–3 per ad.** Under-doing survives;
  over-doing is FM1 at scale.

**FM2 — timing late or early:**
- **Transient-at-zero library QA (the #1 real-world cause of "late" SFX):**
  generated samples often carry silence padding before the hit. Curation step
  trims every sample so the transient lands at t=0, verified deterministically
  (ffmpeg silence/onset check, ≤10ms lead-in required) — a sample failing the
  check is patched or rejected before it ever enters the bank.
- **Anchor diegetic cues to the caption-chunk timestamps users SEE.** Karaoke
  captions and cues share one clock: if alignment drifts, both drift together
  (coherent), never against each other. Overlay-entrance cues stay EDL-exact
  (millisecond ffmpeg placement, already proven).
- **Constant-offset calibration in the LAB before the product build.** Free
  test renders, ear-test by Neil; the calibrated offset ships as a constant.
- **Unit-pinned placement.** Cue-time computation is a pure function of the
  EDL; vitest asserts cue times equal their anchor times. Regression-proof.

## Constraints surfaced by the grill (not in the original idea)

- **CLASSIC stays frozen.** `renderPresets.ts` doctrine: CLASSIC is
  byte-for-byte today's shipped look and can never drift. Rotation + diegetic
  cues apply to the other presets; CLASSIC adopts them only via its own
  explicit Neil approval.
- **Kill switch:** `SFX_V2_ENABLED` env flag; off = legacy static palette,
  same pattern as `OMNI_STYLES_ENABLED`.
- **Cross-customer fingerprint:** rotation is seeded by adId hash across ≥4
  variants/class so two customers' ads don't share one sonic signature.
- **Music-bed clash:** curate atonal/percussive variants first (whoosh, pop,
  click classes); tonal samples (dings) ear-tested WITH the music bed on, not
  solo.

## Prerequisites (before Slice 0)

1. **ElevenLabs tier check (BLOCKED on Neil):** our scoped API key lacks
   `user_read` (verified 2026-07-12 — subscription endpoint returns
   missing_permissions), so tier/cost/licensing for sound-generation must be
   checked in the ElevenLabs dashboard, or the key granted the
   sound-generation scope. **Fallback if tier-blocked or pricey:** CC0/royalty-
   free packs for the same shopping list — the design is source-agnostic.
2. **Shopping list** (what to generate/source): see "SFX bank — shopping list"
   in [omni_edit_presets.md](omni_edit_presets.md) — notification pop +
   cha-ching HIGH; typing, shutter, paper rustle MED; plus 4–6 variants of
   each existing generic class (whoosh, pop, ding, boom, riser, swish...).

## Slices (each Neil-gated)

- **Slice 0 — library session (lab, no product code).** ElevenLabs (or CC0)
  generation session under a stated budget cap; transient-at-zero QA; Neil
  ear-test WITH music bed; approved set committed to the repo. Acceptance:
  every sample passes onset ≤10ms; Neil verdict recorded per class.
- **Slice 1 — variant rotation (TUNED diff, code-executor).** SfxPalette maps
  cue class → variant pool; seeded pick per ad. CLASSIC untouched; kill
  switch in. Acceptance: same-preset renders of two ads produce different
  variant sequences; CLASSIC output byte-identical; build-gate + unit tests
  green.
- **Slice 2 — diegetic keyword layer (TUNED diff, code-executor).** Trigger
  table as data (word + cue class + allowed presets + gain); placement
  anchored to caption chunks; caps enforced. Acceptance: unit matrix over
  trigger/negation/URL/register cases; a lab calibration render Neil
  ear-approves; P13 marked `applied` in the swipe file.

## Resume trigger

Next session on this: check prerequisites → if tier OK, ask Neil for the
Slice-0 budget cap and run the library session in the lab.
