# Believability DNA — spec (viral-autopsy extension)

**Status:** specced + empirically grounded 2026-06-26 (grill-me + premortem + live
3-register Codex test). Not yet built. Build the *capture* half first (safe); the
*apply* half is frozen behind a validation loop (below).

## Why this exists

`viral-autopsy` today captures **Edit DNA** — cuts, captions, camera, pace —
which feeds the **renderer/presets**. It does NOT capture what makes a human
subject feel **real and trustworthy**: the cues that decide whether our AI
avatars read as authentic or as "AI slop." **Believability DNA** extends the
autopsy to capture those cues from winning UGC/ads and route them to the surface
that can actually execute them. The goal is avatars that look like **real
people** (trust) — explicitly NOT "produced/cinematic," which reads as ad/AI.

## The 3 control surfaces (a cue is only useful if routed to the surface that can execute it)

The avatar pipeline: **Veo 3.1 generates the talking avatar with native synced
audio**; **ElevenLabs speech-to-speech then re-timbres** it to ONE consistent
brand voice (preserving delivery + lip-sync); our ffmpeg renderer burns captions/
graphics on top. So a captured cue has three possible destinations:

| Surface | Controls | Slop risk |
| --- | --- | --- |
| **A. Renderer / presets** (our ffmpeg, post-production) | titles, motion graphics, caption design, fonts, hyperframes | **none** — AI never sees these |
| **B. Veo 3.1 video prompt** (dominant) | visual performance (body/energy/eye-contact/gesture/affect), camera, lens, lighting, image realism, **+ voice delivery for `talking` scenes** | the risk bucket |
| **C. ElevenLabs TTS** | voice delivery only for `cinematic`/narrator-VO scenes | low |

**Routing rule:** a voice-delivery cue → `talking` scene = **Veo prompt** (B);
`cinematic` scene = **TTS** (C). For `talking` scenes ElevenLabs is only a fixed
re-timbre (consistency), NOT a delivery lever.

## The 6 believability dimensions + reading engine

| # | Dimension | Best engine |
| --- | --- | --- |
| 1 | Performance — energy, eye-contact-to-lens, gesture, emotion arc, authenticity cues | video-watch + frames |
| 2 | Voice delivery — tone, pace, emphasis, pauses | audio |
| 3 | Lighting | still frames (`render_audit`) |
| 4 | Camera / lens | still frames |
| 5 | Image realism — skin texture, imperfections, lived-in background, real props | still frames |
| 6 | Lip-sync fidelity — mouth↔audio match | frames + audio sync |

Surface-A (Edit DNA) additions captured alongside: overlay titles, motion
graphics, caption design, fonts, hyperframes. **Zero slop risk** — capture freely.

## Realism registers (3 — fixed curated fragment each)

The autopsy classifies each ad into ONE register + records the raw cues as
evidence, but only ever emits the register's **fixed curated prompt fragment** to
Veo — never a raw technical spec dump. (Over-specification is what produces slop.)

1. **`raw-ugc`** — phone selfie, available light, handheld drift, natural
   unretouched skin, lived-in background. **← winner for trust.**
2. **`polished-ugc`** — creator-grade, ring light, steady, clean-but-real.
3. **`cinematic`** — premium/studio (the Cinematic Spec Studio vocab belongs
   here); reads as "an ad" — use only when the archetype calls for it.

**Principle (validated 2026-06-26): more production ≠ more real.** The cinematic
register reads as ad/AI; raw-ugc reads as a real human.

### Resolution / imperfection principle

Resolution and realism are different axes. Authentic phone-UGC carries softness,
grain, slight focus imperfection — those ARE the trust signals. Do **not** chase
4K / over-sharpen / skin-smoothing for UGC avatars: naive upscaling strips the
imperfections and reads plastic/AI. Delivery is **1080×1920 vertical** (platforms
compress hard anyway). **Preserve imperfection at delivery resolution > add
clarity.** (Clarity/4K is only "right" for the cinematic register — the one that
reads as an ad.)

## Surface-A LUT / color preset (UGC finishing) — and the raw-first rule (2026-06-26, Neil)

A color LUT is a **Surface-A** lever (post-production ffmpeg, zero slop risk — the
AI never sees it). It helps believability **only in the right direction**:

- **UGC LUT (use):** flat-ish contrast, mild desaturation, subtle warm/cool phone-
  camera cast, a hint of sensor noise/compression. This *adds imperfection* — the
  LUT form of "preserve imperfection at delivery resolution." ≈ +5% realism.
- **Cinematic/filmic LUT (avoid for UGC):** teal-orange, crushed blacks, "graded."
  Pushes toward the `cinematic` register → reads as **an ad**. Wrong for raw-ugc.

**A LUT cannot fix motion.** What makes AI video read as fake is **temporal**
(identity flicker/morph between frames, lip-sync drift, uncanny micro-expression,
hand/background warp) — color sits on top and hides none of it. A nice grade on
fundamentally-AI motion reads as *polished fake* = more uncanny, not less.

**Sequencing rule:** test the **raw, ungraded** Veo render FIRST. A LUT during
evaluation masks the exact artifacts we're judging — we need the avatar *naked in
motion* to get an honest verdict. Only after motion is proven do we bolt on the
UGC LUT + captions/B-roll as finishing. (Captions/motion-graphics, also Surface-A,
do *more* for perceived realism than a LUT — real UGC always has them, and they
distract the eye from micro-artifacts. Also: keep shots **short** — Veo artifacts
compound over duration; fast cuts are native UGC anyway.) **LUT is step 3, not step 1.**

## AI-slop source guardrail (premortem failure-mode 1)

A 30-day winner might **itself be AI slop**. Copying it wholesale amplifies slop.

- New autopsy field **`source_realism_verdict`**: `real-human | likely-ai | mixed`
  (+ evidence).
- Believability proposals may **only** draw corroboration from `real-human`
  sources. A long-running but AI-looking ad is **excluded** from the count.
- `likely-ai` sources are **not wasted** — they feed a separate **"AI-tells /
  avoid" anti-pattern catalog** (what makes *theirs* fake = what to avoid in ours).
- Principle: **longevity qualifies a candidate; human-authenticity qualifies a
  *believability* source.** Grifon's editorial judgment overrides "it ran 30
  days" — we are the experts at AI ads, so we follow what we know is right.

## Validation loop (anti-slop keystone)

A believability cue becomes a tuned generation-prompt change ONLY after:

1. **≥3 corroborations** across `real-human` autopsied winners → candidate
   register fragment = **Gated Proposal** (same gate as P9).
2. **Manual A/B at proposal review**: render ONE fixed **reference scene** twice
   (baseline vs. with-fragment) on our **actual Veo/Gemini pipeline**.
3. Grade both with **`render_qa.mjs`** (generative slop + lip-sync/caption lag) +
   Neil's eye.
4. Keep ONLY if it **measurably lowers slop / holds lip-sync** (more real, not
   less). If worse → reject + record as a contradiction (just as valuable).

Manual + gated (≈2 Veo renders per candidate). **Step zero:** establish our own
avatar **baseline + consistency** (identity-lock) before any fragment A/B — the
Codex test produced 3 *different* people across separate generations, so
cross-generation consistency is a live, unsolved risk.

## Build plan: capture-all now, apply staged by risk

- **Capture (safe, build first):** extend `tools/analyze_video.py`'s
  `ANALYSIS_PROMPT` with one `believability` block (all 6 dims + observed register
  + `source_realism_verdict`). Cheap; compounds from the next autopsy. No tuned-
  prompt change. `render_audit.mjs` frame-vision cross-checks the visual register
  (Step 3c).
- **Apply (staged):** surface-A (post-production) findings → presets via normal
  review. Surface-B/C (generation-prompt) findings **frozen** behind the ≥3 + A/B
  loop.
- **Patterns:** new **P11+ "Believability" family**, each tagged with its target
  surface (A/B/C), same gating as P9.
- **Hard guardrail:** never propose anything that breaks the **Veo-native-audio +
  STS** path for `talking` scenes — lip-sync is the trust signal; TTS-on-silent-
  video would desync the mouth.

## Empirical proof (2026-06-26)

Codex `gpt-image-2` (1024×1536) generated the same UGC subject across all 3
registers. `raw-ugc` read most authentically human (skin texture, messy kitchen,
selfie framing); `cinematic` read as a produced ad; a pushed "8K ultra-clarity"
cinematic variant read even *more* like a polished commercial — confirming
**clarity is the cinematic register's tool and it destroys UGC trust.** Validates
the taxonomy + the "production ≠ trust" thesis from both ends.

**Reference samples (committed, do not delete):** `workflows/believability-samples/`
— `register-1-raw-ugc.png` (trust winner), `register-2-polished-ugc.png`,
`register-3-cinematic.png`, `register-3b-cinematic-4k-clarity.png` (the "looks
like an ad" extreme).

**Caveat:** gpt-image-2 stills ≠ the production Veo/Gemini stack — the *direction*
is proven, the exact register *fragments* still need the real A/B-on-Veo
validation before they touch a tuned prompt.

## Still-image raw-ugc scaffold (decoded 2026-07-16, World Cup pack)

**Provenance:** "This is AI — World Cup Edition" prompt pack (iklipseworld.com,
19 prompts). Neil generated from it and verified the outputs read as **real
phone captures** ("Zam's 98% avatar") — on stills, prompt-only, **zero
reference image**. This is a fully-worked field implementation of the
`raw-ugc` register for **still images** (our `avatarModel` / scene-image
surface), extending the register work beyond Veo video.

**Corroboration status:** counts as corroboration **#2** for the raw-ugc
register (after the 2026-06-26 Codex 3-register test). One more `real-human`-
grade corroboration completes the ≥3 gate for the Gated Proposal below.
Companion test pack: [believability-samples/ugc-photoreal-prompt-pack.md](believability-samples/ugc-photoreal-prompt-pack.md).

### The 8-block anatomy (subject changes, scaffold never does)

All 19 prompts stack the same blocks in roughly this order:

1. **Capture-device framing first** — "Ultra-realistic **vertical smartphone**
   photo / selfie / flash photo / mirror selfie." The image is described as
   *an artifact of a device*, not a scene. Shot-type variants observed:
   arm's-length front-cam selfie, friend-following-behind, high-overhead
   selfie, shot-from-below crowd shot, mirror selfie with phone covering a
   frame edge, seated candid, side-profile not-posing.
2. **Named social context** — "UGC," "candid photo taken by a friend,"
   "social-media-ready," "**not a studio fashion shoot**." Tells the model
   which *distribution* of photos to sample from.
3. **Camera physics & optics** — mild wide-angle distortion, extended selfie
   arm visible/cropped at frame edge, sharp subject vs softly blurred
   background, direct flash + darker noisy background, slight motion blur on
   moving objects, "natural low-light grain."
4. **Skin & fabric micro-texture** — realistic pores, visible hair strands,
   natural shine on face/shoulders, "not overly retouched," fabric folds /
   wrinkles / knot tension, condensation on a cup.
5. **Deliberate *authored* imperfection** — "slightly imperfect face paint,"
   "messy bun with loose strands," "imperfect real-life framing," "a small
   piece of litter on one seat," "another fan's legs partially visible at the
   frame edge." Imperfections are *specified*, not left to chance. This is
   the core trick — and the prompt-level form of our own "preserve
   imperfection" principle above.
6. **Dense environmental storytelling** — 5–10 concrete props with spatial
   placement (seat-row numbers painted on stairs, LED route sign, wayfinding
   "sections 117–118"), background people present but "softly blurred."
7. **Lighting named by physical source** — "real night stadium floodlights,"
   "phone flash mixed with ambient night lights," "overhead fluorescent train
   lights," "hotel lamp + window daylight." Never abstract ("moody," "soft").
8. **The anti-AI ban tail** — "no HDR, no sepia, no artificial cinematic
   grading, no studio lighting, no beauty filter, no over-polished." Kills
   the default AI sheen.

**Craft constants:** vertical 9:16; ONE continuous ~250–350-word paragraph;
adult subjects; emotion always specified; hands always occupied (cup, flag,
phone, food); in-image text constrained ("no clearly readable text" /
"without warped text" — same philosophy as our `NO_TEXT_CONSTRAINT`).

### Why no reference image is needed (and its limit)

Realism comes from describing the **capture context** (device, optics, social
situation, authored flaws), not from copying a real photo — so identity comes
free *per image*. The limit: **cross-generation identity consistency remains
unsolved** (the Step-zero caveat above — the Codex test produced 3 different
people). For a recurring persona (Zam, Influencer Forge) the scaffold and the
IDENTITY_LOCK reference-image path **combine**: reference image pins *who*,
scaffold pins *how real it feels*. For one-off testimonial/social-proof
stills, scaffold alone suffices — that's the edge over reference-image-only
formulas.

### Recorded tension: `generateAvatarImage` pushes the opposite direction

The live wizard avatar prompt (`services/geminiService.ts` ~1733–1757, TUNED)
specifies a "Professional Retouch Layer" and "Commercial Beauty Lighting
(diffused, soft, high-key)" and forbids imperfection — i.e. it *actively
removes* the trust signals this scaffold (and this whole doc) says to keep.
Do NOT "fix" it in place: it may be intentional for the aspirational-UGC
wizard look. The resolution is a **separate selectable register** (below),
A/B'd against it, with the winner decided at proposal review.

### Gated Proposal (DRAFT — do not apply; unlocks per validation loop)

- **New constant `REALISM_INSTRUCTION_RAW_UGC`** alongside the existing style
  constants (`services/geminiService.ts` ~833–870, TUNED). Fixed curated
  fragment distilled from blocks 1–4 + 8 ONLY — blocks 5–7 (authored
  imperfection, environment, lighting source) are **per-scene content** the
  scene/avatar prompt builders supply, not fragment material. Draft fragment:

  > "Ultra-realistic vertical smartphone photo, candid UGC style, as if
  > taken by a real person on their phone — not a studio shoot, not an ad.
  > Mild wide-angle phone distortion, sharp subject, slightly softer
  > background, natural low-light grain where dim. Realistic skin: visible
  > pores, natural shine, stray hair strands, not retouched. Real fabric
  > folds and wrinkles. Imperfect real-life framing. No HDR, no cinematic
  > grading, no studio lighting, no beauty filter, no over-polishing."

- **Wiring points (documented, not edited):** register switch in
  `generateSceneImage` (~line 2184 — currently binary
  `REALISM_INSTRUCTION_CINEMATIC` vs `REALISM_INSTRUCTION_UGC`); append-point
  in `generateAvatarImage` (~1749) and `generateInfluencerAvatar` (~1855) as
  an opt-in **third register**, never a silent replacement.
- **Unlock condition:** 3rd `real-human` corroboration + manual A/B on the
  real Gemini pipeline (baseline vs with-fragment, `render_qa.mjs` + Neil's
  eye) per the validation loop above. Business-tier register selection rides
  the Concierge plan later — no product-tier work in this proposal.

## Model notes (2026-06-26 observations — eval, don't assume)

- **gpt-image-2 (Codex) realism appears notably better than Gemini 3.1 Flash
  Image** (our production hero/scene image model). If true, the realism
  *bottleneck* is the **model**, not just the prompt — meaning a key believability
  lever is **model choice**, parallel to the register fragments. **Action: a head-
  to-head realism eval** (same subject + register, gpt-image-2 vs Gemini Flash
  Image) before assuming prompt directives alone close the gap. Constraint:
  codex-image is dev-only (billed to a ChatGPT plan, not wired into the product);
  a product swap would need the OpenAI image API (pay-per-image) or another route
  — a real cost/integration decision, not a free swap.
- **Seedance 4K (cinematic register).** Seedance's new 4K settings reportedly look
  "absolutely real" and are trending — a candidate model specifically for the
  **`cinematic`** register (premium brand-ad archetype), where clarity is wanted.
  Registers may therefore be **model-routed**, not just prompt-routed: `raw-ugc`/
  `polished-ugc` → the most authentic-imperfection model; `cinematic` → Seedance-
  class 4K. Evaluate when the cinematic register comes up.

## Next steps

1. Build the **capture schema** (analyze_video.py `believability` block +
   `source_realism_verdict`). Safe — no tuned-prompt change.
2. Add "Believability & Source-Authenticity" rows to the viral-autopsy entry
   template; seed the P11+ pattern family (surface-tagged).
3. Establish the **avatar baseline + consistency** (identity-lock) before any
   fragment A/B.
4. Only then: per-fragment **Gated Proposals** through the validation loop.
