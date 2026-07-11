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

## Archival-DV register (2026-07-04, APPROVED by Neil — sits BELOW raw-ugc)

New bottom rung of the ladder, from the viral "shoot like a 2003 camcorder"
Seedance preset (aireresearches). Principle in its purest form: **the strongest
realism lever is not how good the camera is, but how correctly it's broken.**
Two approved variants, both anchored to the original ref (never chained):

- **Heavy tape** (`zam-dv-heavy-tape-sample.png`): full 2003 MiniDV — interlacing,
  chroma bleed, washed low-contrast color, camcorder OSD (REC + timestamp) as the
  ultimate trust cue. For nostalgia/vintage posts. **gpt-image-2 wins this variant
  decisively** — it renders true interlacing/compression; Nano Banana Pro outputs
  read as clean-digicam-with-fade.
- **Bright DV** (`zam-dv-selfie-high-APPROVED.png` — Neil-graded ~97%, best
  identity+realism of the whole system): DV *style only* — faded warm color, mild
  softness, fine analog noise — but bright, well-exposed, face clearly detailed.
  NO OSD. For selfies + talking-head content
  (`zam-dv-content-creator-corner/kapihan/azotea.png` — Filipino settings:
  tricycle outside the kapihan window, azotea laundry + antennas + monobloc).

Register pairing for content: **dark cinematic = authority/offer videos; bright
DV = lifestyle/relatable.** Same show, two moods.

Guardrails learned:
- **Era-accuracy check on heavy tape:** the model puts modern props in 2003
  frames (earbuds, branded coffee sleeves) — prompt "no modern accessories,
  era-correct props" and inspect. Comments sections catch anachronisms instantly.
- **OSD dates must match across a same-day set** (model invents different dates
  per frame unless pinned).
- **Hair drifts with era styling** — "early 2000s" pulls ponytails/longer hair;
  pin "hair EXACTLY as reference, do NOT lengthen/tie" when consistency matters.
- **Smile + angle change = ~5% identity drift** (session-consistent): straight-on
  neutral holds best; three-quarter mid-laugh drifts most. Curate accordingly.

## Head-to-head eval: gpt-image-2 vs Nano Banana 2 Lite (2026-07-04)

Ran Zam's 4 registers on `gemini-3.1-flash-lite-image` (Nano Banana 2 Lite) with
the exact same prompts + ref anchor as the gpt-image-2 set (harness:
`.tmp/scratch/nb2lite-registers.mjs` pattern — plain generateContent with
inline ref image + `responseModalities: [TEXT, IMAGE]`). Findings:

- **UGC realism: NB2-Lite matches or beats gpt-image-2** on raw-ugc — the
  2026-06-26 note "gpt-image-2 notably better than Gemini Flash Image" is
  OUTDATED for the lite/3.1 generation. Environment detail (window haze,
  clutter, skin shine) is production-grade.
- **Identity lock: gpt-image-2 still wins.** NB2-Lite restyles hair and slims
  the face as production rises (registers 3–4 drift to ~75–85%; gpt-image-2
  holds ~92–95% across the ladder).
- **Slop thesis replicated cross-model:** production ↑ = identity drift ↑ +
  realism ↓ on BOTH engines. The register taxonomy is model-independent.
- **Speed/cost:** ~4.5s and ~$0.10/image (already wired in the app) vs ~2min
  on the Codex bridge (dev-only).
- **Routing implication:** UGC registers are candidates for NB2-Lite in-product
  (pending identity tightening via the multi-ref angle set); identity-critical /
  anchored-avatar work stays on gpt-image-2 class until proven otherwise.

## Production Content Look — the 3-layer recipe (2026-07-03, APPROVED by Neil)

Validated end-to-end on Zam + Neil (gpt-image-2 edit mode, anchored to their ref
photos). This is the **owned-content register** — the Iman-Gadzhi-class premium
talking-head look for Grifon/Zam/Neil content. It sits between `polished-ugc` and
`cinematic` and is a different job from the ad registers. **All three layers are
mandatory; each one alone still reads as AI:**

1. **Cinematic environment with real gear in frame** — slat wall, practical lamps,
   mic boom overlapping the subject's shoulder. Visible production hardware =
   proof of a real room.
2. **Subject relit BY the scene** — never "keep face unchanged" (that preserves
   the source photo's lighting and produces the pasted-on composite tell). Prompt
   "same identity, but relit": color spill on skin, rim light, catchlights from
   the practicals, exposure keyed to the room.
3. **Uniform video-capture rendering** — the layer that kills the "AI face on a
   nice background" mismatch. Slight video softness (not razor sharp), fine
   luminance noise across the WHOLE frame including skin, subtle H.264 character,
   slight motion blur on gesturing hands, video-sensor highlight rolloff. Face
   and background must share ONE capture quality.

Reference template prompt: the one behind
`believability-samples/neil-content-gold-podcast-videoframe-APPROVED.png`.

### Hard rules learned 2026-07-03

- **Relight-by-scene rule:** identity language ("keep unchanged") must be scoped
  to facial geometry/features only — lighting must be explicitly granted to the
  scene. Teaching pair: `zam-pair-composite-tell-flat.png` (fail) vs
  `zam-pair-composite-tell-relit.png` (fix).
- **No chained edits (generation loss):** never edit a generated image of a face
  to make a variant — the face morphs a little every pass (caught by Neil on the
  tarpaulin revisions). Every variant regenerates from the ORIGINAL ref photo.
  Applies to the whole avatar pipeline, including future Veo start frames.
- **Uniform capture quality:** a photo-crisp face in a cinematic scene reads AI
  even with perfect relighting. Teaching pair:
  `neil-pair-capture-mismatch-photo.png` (layers 1–2 only) vs
  `neil-content-gold-podcast-videoframe-APPROVED.png` (all 3 layers).
- **Makeup stays mild:** evened tone, defined brows, blush, lip tint — with pores
  and texture explicitly preserved. Heavy glam + smoothing collapses into the
  register-3b/4K slop look (`zam-register-3b-cinematic-4k.png`).
- **Brand-as-light:** DESIGN.md tokens never go on content literally; Grifon Gold
  enters as the amber accent light (gold podcast wall), and as caption/lower-third
  color in post. Zam + Neil share the same lighting language = one show family.

## Next steps

1. Build the **capture schema** (analyze_video.py `believability` block +
   `source_realism_verdict`). Safe — no tuned-prompt change.
2. Add "Believability & Source-Authenticity" rows to the viral-autopsy entry
   template; seed the P11+ pattern family (surface-tagged).
3. Establish the **avatar baseline + consistency** (identity-lock) before any
   fragment A/B.
4. Only then: per-fragment **Gated Proposals** through the validation loop.

---

## Reference-Stacked Realism — dual-ref technique (2026-07-11, status: OBSERVED — candidate, NOT approved)

Source: Neil's brother's 279-generation Gemini 3.1 flash-lite-image set, ingested
2026-07-11 (manifest + full stats: `workflows/believability-refstack/manifest.json`
+ `aggregate.json`; per-triplet analyses regenerable from the manifest via
`tools/analyze_image_set.py`). One MODEL ref (identity ground truth) + one STYLE
ref per group (a real UGC selfie whose lighting/skin/pose/camera/background is
the target) + a short prompt → one generation. **Pins the register with PIXELS
instead of prompt fragments** — a cross-register lever, not a new ladder rung.

Dataset: 63 style sources × ~4.5 attempts each. 277/279 style refs graded
`real-human` (corroboration-eligible), 0 `likely-ai`. Register split of outputs:
149 raw-ugc / 129 polished-ugc / 1 production-content-look — this is a raw-UGC
realism set through and through.

### Measured (Gemini 3.5-flash grading, evidence-bound, n=279)

| Metric | Avg |
|---|---|
| Style replication overall | **74.2%** (best 86%, worst 35%) |
| — lighting | 72.6% · skin 72.0% · posing 75.4% · camera 75.4% · background 76.4% |
| Identity consistency vs MODEL ref | **77.3%** (drift concentrates in hair color) |

### The recipe (as observed in PROMPT.docx — the brother's own workflow)

1. **Describe-then-edit:** feed the STYLE ref to Gemini first — *"describe me
   this (source) image in full detail tapos ibigay mo yung mismong image prompt
   para ma-recreate ko."*
2. **Identity-swap the description:** edit the returned prompt so every
   identity attribute points at the MODEL ref via placeholders — `(woman in
   image)`, `(same hair in image)` — while keeping the scene language verbatim.
3. **Generate with both refs attached** (model ref + style ref + edited prompt).
4. **Iterate ~4-5 attempts per source** and keep the best (the 12-point spread
   between best and worst attempt of the same source is normal variance).

### What the style ref transfers WITHOUT prompt language (n=279 synthesis)

- Overall color temperature and dominant lighting tone
- Scene composition, camera position, subject placement
- Hair color/texture/length carry-over

### What still NEEDS prompt language

- Specific clothing items, fabrics, patterns
- Complex hand poses and physical interactions
- Background props/clutter specifics; fine accessories and eyewear

### Prompt-fragment candidates (real-human corroborations; ≥3 = proposal-eligible)

| Fragment / move | n | Avg overall when present (vs 74.2 base) | Read |
|---|---|---|---|
| `mirror selfie` | 22 | **78.1** (+4.2) | biggest lift in the set — camera occlusion + domestic bg do believability work for free |
| `analog film self-portrait` (+ harsh direct flash) | 4 | **81.3** | film grain/flash masks digital artifacts — CONSISTENT with the Archival-DV thesis (break the camera correctly) |
| `natural skin texture` | 28 | 75.4 (+1.2) | mild but real; contrast with ↓ |
| anchored pose language (e.g. "both hands framing her cheeks") | 5 | 80.0 | anchoring hands prevents anatomical slop |
| `8k resolution` | 69 | 74.4 (+0.2) | **no lift** — generic quality words are dead weight |
| `highly detailed skin texture` | 32 | 74.2 (+0.0) | **no lift** — over-specification confirmed useless, matches the anti-slop thesis |

### AI-tells / anti-pattern catalog (feeds the avoid list)

- **Four-pointed-star watermark ghost** (bottom corner) — the #1 recurring tell
  across the set; visible in the 86% winner too. Any production use must crop or
  clean it (Surface A, ffmpeg — zero slop risk).
- Gibberish/mirrored text on background posters — outputs replicate text overlay
  POSITIONS from the style ref but corrupt the glyphs.
- Simplified jewelry/eyewear mechanics (chain links, glasses temple-arm joints).
- **Over-brightening vs source** — outputs consistently render brighter/cleaner
  than a genuinely dark style ref (lighting is the weakest dimension at 72.6%);
  murky low-light needs explicit prompt defense.

### Sample index (`workflows/believability-samples/refstack/`)

- `refstack-model-ref.jpeg` — the MODEL identity ref used across all 279.
- `refstack-t067-winner-86pct.jpg` — best in set (source 22: dark wink selfie →
  analog-flash rendition; scene, pose, overlay-text position all carried).
- `refstack-t216-winner-85pct.jpg`, `refstack-t022-winner-83pct.jpg` — mirror-
  selfie winners (the top fragment at work).
- STYLE sources are NOT committed: they are other people's real selfies used as
  pattern references. They live in the Drive drop / `.tmp/refstack/raw/SOURCE/`.
  **Trust line:** style refs are register ground truth only — an output must
  never keep a real third party's identity; identity always comes from a
  consented MODEL ref.

### Approval-loop status

**NOT approved.** Pending: (1) the 3-model shootout (flash-lite multi-ref vs
gpt-image-2 composite vs Meta Muse manual) on 6 cases drawn from this set;
(2) manual A/B on the real avatar pipeline; (3) Neil's eye. Fragments clearing
≥3 real-human corroborations above enter `viral_swipe_file.md` P11+ as Gated
Proposals only after the shootout corroborates them. No TUNED file is touched
by any of this.
