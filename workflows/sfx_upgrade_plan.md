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

1. **ElevenLabs tier check — CLEARED 2026-07-12 (Neil, dashboard screenshot):**
   Starter plan ($6/mo) includes **Sound Effects: 150 generations/mo included,
   $0.04/generation beyond** (Creator 605 gens / same $0.04, for reference).
   Neil enabled the sound-effects scope on the API key same day. Library
   session fits comfortably inside ONE month's included allowance (~60–100
   generations for the full shopping list at 4–6 variants/class; re-roll
   headroom to ~150 still $0). Two cautions carried into Slice 0:
   (a) the SAME account powers customer VO (TTS) — run the session early in a
   billing cycle and watch the meter so SFX never starves production TTS;
   (b) Starter's card lists "Commercial License for Speech and Music" — one-
   line confirm that sound-effects output is commercial-licensed on Starter
   before any generated sample ships in a client ad (fallback unchanged: CC0
   packs).
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

## Slice 0 session log — RUN 2026-07-13, awaiting Neil ear-test

Generation session executed per the armed kickoff (Neil approval 2026-07-12).
Tool: [tools/sfx_library_session.mjs](../tools/sfx_library_session.mjs) (Node +
repo `ffmpeg-static` — cafe PC had no Python/ffmpeg; same defreezer reasoning
as render_qa.mjs). Lab output: [assets/sfx-lab/](../assets/sfx-lab/) — see its
README for the ear-test procedure.

- **Spend: 81 generations of 150 included** (hard stop 200 never approached).
  76 planned (15 classes × 4–6 variants; money-rustle skipped, LOW) + 5
  re-rolls of near-silent duds. The scoped API key lacks `user_read`, so the
  dashboard meter could NOT be read programmatically — counter lives in
  `assets/sfx-lab/session-state.json`; **Neil: eyeball the ElevenLabs
  dashboard to confirm ~81 SFX gens + healthy TTS credit before month-end.**
- **QA (transient-at-zero, ≤10ms decoded onset): 74/76 slots passed** —
  53 clean, 21 auto-trimmed (sample-accurate `atrim`; the first `-ss`-based
  trim missed by 13–30ms due to MP3 frame granularity — fixed in-tool).
  2 rejected: snap-v1/v2 generated near-silence (max −40…−55 dBFS) even after
  a boosted re-roll — ElevenLabs quirk with "finger snap" + tight/bright
  modifiers. snap still has 4 survivors = rotation minimum met.
- **Pre-flight (b) CLEARED:** ElevenLabs paid plans (Starter+) include a
  commercial license for generated SFX used inside your own projects/ads;
  only resale as a standalone sample library is prohibited (help-center +
  pricing pages, checked 2026-07-13). Samples ship only muxed inside rendered
  Grifon ads — licensed use.
- **19 audition mixes** in `assets/sfx-lab/audition/`: every class over the
  mrbeast bed; tonal classes (ding, sparkle, notification, chaching) ALSO over
  the testimonial bed (music-bed-clash constraint). Variants at t=1s,3s,5s…

### Round 2–3 (same day): harshness triage after Neil's "masakit sa tenga"

Neil flagged piercing samples in the round-1 auditions. Built the machine
ear-test: [tools/sfx_harshness_check.mjs](../tools/sfx_harshness_check.mjs) —
deterministic ffmpeg metrics (max level, clipping, >4kHz / >7kHz energy
ratios) + a Gemini audio pass per class, **majority-voted over 3 runs**
(single-run Gemini ear verdicts flip-flop badly on identical files — same
stochastic-judgment problem gemini-eval exists for; only corroborated
verdicts are actionable, and by round 3 the votes hit their noise floor, so
machine pruning STOPPED there by design).

- **Pruned 31 total** (in `rejected/`, paid artifacts kept): 9 piercing
  round-1 samples (all generated BEFORE the anti-shrill prompt suffix —
  the suffix fixed the failure mode), 13 majority-confirmed round-2 drops,
  wrong-sound whooshes across three prompt rewordings, and misc dull/quiet.
- **Final spend: 108 of 150 included generations.** Final bank: **68 samples**,
  every class ≥4 variants except snap.
- **Generator quirks learned** (recorded in the tool): 450-char prompt cap;
  "finger snap" → near-silence 5× across 3 phrasings; "whoosh" phrasing →
  bubbles/pops 9 of 12 rolls; bright bell dings trend piercing (ding capped
  at its 4 clean survivors).
- **CC0 fallback list (plan's designated fallback): snap** (2 survivors,
  below the 4-variant rotation minimum) — source 2+ CC0 finger snaps before
  Slice 1, or ship snap with 2 variants + CLASSIC's static sample.
- **Contested samples** — machine votes churned on these; Neil should listen
  with extra attention: ding-v3, ding-v4, riser-v2, swish-v2, glitch-v4,
  snap-v4, whoosh-v5, and chaching-v3/v4/v5/v6 (the chaching question is
  curation, not quality: mechanical register foley vs. bell-chime "money
  sound" — pick the family that reads "cha-ching" on first listen).

**Slice 0 acceptance remaining:** Neil ear-test → verdict per class ("in/out"
per variant, target ≥4 in per class) recorded here → approved set is the
input to Slice 1 (variant rotation, TUNED diff via code-executor).

**Paste-ready kickoff for the ear-test session:**

> Open workflows/sfx_upgrade_plan.md Slice-0 session log. I've listened to the
> audition mixes in assets/sfx-lab/audition/. Verdicts: [class: variants
> in/out…]. Record them in the log, prune the bank to the approved set, and
> line up Slice 1.
