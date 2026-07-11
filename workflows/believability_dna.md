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

## Head-to-head eval: reference-stacked shootout — flash-lite multi-ref vs gpt-image-2 composite vs Meta Muse (2026-07-11)

Protocol: 6 cases from the brother's set (registers spread + hard-identity c04 +
hard-style c05), same person-swap prompts per lane, seeded blind anonymize,
judged by (1) Gemini 3.5-flash rubric and (2) an independent blind Claude judge;
Neil's unblinded product eye concurred. Harness: `tools/shootout_refstack.mjs`;
raw scores: shootout `tally-combined.json` (regenerable from committed
shootout-cases.json).

| Lane | Identity (J1/J2 avg) | Style (J1/J2) | Believability (J2) | Blind case wins |
|---|---|---|---|---|
| **gpt-image-2 (composite --edit)** | **77 / 88** | 74 / 75 | 74 | **6/6** |
| gemini-3.1-flash-lite (2-ref) | 62 / 44 | **80 / 89** | **82** | 0/6 |
| Meta Muse (manual, n=3) | 79 / 70 | 80 / 78 | 73 | 0/6 |

### Findings

1. **Identity binding is the technique's fault line, and it splits the models.**
   flash-lite renders the most believable UGC *image* (style 89, believability
   82) but keeps the STYLE ref's face outright in 2-3 of 6 cases (identity 15-38)
   — with two attached refs, scene-locked generation drags the scene's person
   along. gpt-image-2 never lost the person (identity ≥82 in 5/6) but
   consistently over-cleans: brighter, smoother, more composed than a raw
   source. **For an avatar/presenter pipeline identity is gating → gpt-image-2
   wins despite the lower raw-style scores.**
2. **The brother's `(woman in image)` placeholder is not portable.** It works in
   a single-attachment chat flow; against two refs it binds to the wrong image.
   All lanes needed the explicit person-swap framing (recreate Image 2's scene;
   the person MUST be the woman from Image 1; do NOT keep Image 2's face) —
   committed in the three lane prefixes.
3. **Meta Muse refused 3/6 cases** ("that's a direct face swap … which I can't
   do") and generation is slow/manual — dropped from consideration (Neil,
   2026-07-11). The refusals stand as evidence that consented-likeness flows
   need provider-policy diligence.
4. **Slop thesis holds cross-model:** gpt-image-2's losses were all
   over-production (DSLR sharpness, catalog clothing, beauty-filter skin in
   dark scenes) — the exact "more production ≠ more real" failure the register
   ladder predicts. A Surface-A UGC LUT pass is the designed counter.

### Routing implication → Gated Proposal (Business tier, NOT approved yet)

- **Business tier**: presenter/character upload (user's own consented face) →
  reference-stacked generation on **gpt-image-2** (composite + person-swap
  framing), Business-only unlock. Auto mode scenes relight the SAME uploaded
  identity per scene — solves cross-scene consistency that prompt-only cannot.
- **Creator/Pro: unchanged** (gemini-3.1-flash-lite TUNED pipeline untouched) —
  the quality gap is the upgrade motive.
- Before any code: (a) production = paid OpenAI Images API (the $0 Codex bridge
  is dev-only; per-image cost must be priced into Business margins, latency is
  seconds-vs-minutes better than the bridge); (b) consent checkbox + likeness
  ToS language in the presenter-upload flow (Phase-3 consent infra exists);
  (c) production style-ref library must be Grifon-owned/licensed scenes (the
  brother's set was pattern-reference only — trust line); (d) OpenAI likeness-
  policy diligence. Implementation would touch TUNED `services/geminiService.ts`
  routing — **its own Gated Proposal through the validation loop.**

## Register auto-routing per format/niche (2026-07-11 — mapping APPROVED by Neil; implementation GATED)

Neil's product direction after the formula battle (random-Filipina 3v3, all on
gpt-image-2): **per-register formula routing** — the winner depends on the rung.
Neil's eyeball verdicts: raw-ugc → reference-stacked (new formula) wins ("the
brother's formula, 100% realistic"); polished-ugc → text-fragment (old formula)
wins; cinematic → the original register-3 fragment wins. Pattern: **the lower
the register on the realism ladder, the more reference-stacking matters** — raw
realism is pixels, not adjectives; produced looks are describable in text.

**Gemini register test (same identity ref + style refs, flash-lite): NEGATIVE —
identity did not hold (Neil eyeball, 2026-07-11).** Consistent with the shootout
identity collapse. Creator/Pro (gemini-3.1-flash-lite TUNED pipeline) stays
untouched; auto-routing is Business-tier / gpt-image-2 only.

### Format → register defaults (APPROVED by Neil 2026-07-11 — conversion logic, not aesthetics)

| Format / niche | Default register | Formula | Principle |
|---|---|---|---|
| Before & After, testimonial, UGC review (products) | raw-ugc | reference-stacked | Social Proof — must read as a real customer, not an ad |
| Food (casual) | raw-ugc | reference-stacked | authenticity = crave |
| Fashion/beauty creator-style, coaching, e-com lifestyle | polished-ugc | text fragment | Liking — aspirational-but-attainable creator look |
| Real estate | **split by scene role:** presenter = polished-ugc, property b-roll = cinematic | mixed | person = trust; property = dream outcome |
| High-ticket offer/authority | cinematic (dark) + bright-DV lifestyle proof | text fragment | the approved dark-authority / bright-relatable pairing |

Rules riding with the mapping: (1) routing unit is **scene role**, not just
niche; (2) **default, never lock** — one-tap override; (3) no register jargon in
UI — outcome labels ("Totoong-customer look" / "Creator look" / "Premium TV
look"); (4) v1 ships as a deterministic config lookup table (no AI picker);
measure via the growth loop, iterate. Implementation touches TUNED generation
paths → remains inside the Business-tier Gated Proposal above; the mapping
CONTENT is approved, the CODE change is not yet.

## Grill 2 — Business-tier wedge: decisions, research, premortem (2026-07-11, session 2)

Continuation grill on the Gated Proposal above. Q1 (deliverable shape) was
already answered by the proposal itself; Q2–Q5 resolved below. **Decisions are
Neil's; the premortem is agent-narrated (Neil: "di ko alam") — Neil owes a
reaction pass, esp. the NEW Q6 at the bottom.**

### Decisions (Neil, 2026-07-11)

- **Q2 — style-ref library (prereq c): SHOOT YOUR OWN.** Shot-list derived from
  the winning fragments (mirror selfie, analog direct-flash, domestic clutter,
  low-light bedroom, cafe), executed as real phone selfies by released faces
  (Zam, the brother's model, Neil) in real PH settings, ~20–30 per register.
  User-supplied style refs = deferred add-on behind an "I own this photo"
  attestation gate. Stock (reads produced) and synthetic refs (slop-copying-
  slop) are rejected outright.
- **Q3 — AI-disclosure stance: DISCLOSE-AND-STILL-WIN, as product doctrine.**
  Watermarks/metadata stay intact; Meta AI-disclosure ticked where required;
  the moat is *feels real in the scroll*, not undetectable. Fighting detection
  is off the table (platform-policy violation + risks CLIENT ad accounts).
  Star-ghost **crop** remains allowed — artifact cleanup, not evasion (SynthID
  survives it). Doctrine goes into Business-tier UI copy eventually.
- **Q4 — identity-QA gate: HYBRID, split by pipeline stage.** Presenter
  *establishment* (one-time canonical look) = variant picker, 3–4 takes, user
  picks (ownership moment, bounded cost). Per-scene generation = silent auto-QA
  loop: Gemini-flash rubric grade → identity floor ~75 (from shootout:
  gpt-image-2 held ≥82 in 5/6) → auto-retry N=2 → deliver best. First-take-only
  ("user-pays regenerate") rejected — exposes the quality lottery on a tier
  whose pitch is consistency.
- **Q5 — v1 scope: ONE-FORMAT WEDGE — Before & After / testimonial.**
  Reference-stacked S1/S3 is the cure for the sample-batch spec's finding #7
  (S3 after-reveal identity drift, `feat/niche-coverage-cheap-fixes`); B&A is
  where identity failure is most catastrophic (same-person proof IS the
  format) and the eval harness for it already exists. Full-table launch and
  standalone-photoshoot-module-first both rejected.

### Exit research (agent, 2026-07-11 — prereqs a + d)

- **(a) Pricing:** gpt-image-2 API ≈ **$0.015 (low) / $0.03 (medium) per
  image** (output tokens $8/1M; developers.openai.com/api/docs/pricing,
  2026-07-11). Even at medium quality × variant-picker ×4 + N=2 retries ×
  6 scenes, image spend per ad ≈ **single-digit pesos** — retry economics are
  NOT a margin threat. High-quality tier unverified; confirm before pricing
  the Business tier.
- **(d) Likeness policy:** API docs expose a `moderation` param (`auto`
  default / `low`) and no categorical real-people ban; ToS requires consent
  for real-person likeness (which our flow captures). **Existence proof: the
  6/6 shootout ran this exact person-swap flow through gpt-image-2 today.**
  Risk grade: MEDIUM — the present flow works; the risk is future tightening
  or automated flagging at scale (Meta Muse's 3/6 refusals are the cautionary
  tale). Mitigation: ship behind a feature flag (`GRIFON_REFSTACK_ENABLED`,
  same pattern as voice cloning / music gen) with graceful degrade to the
  prompt-only pipeline.

### Premortem — "Oct 2026, the wedge failed catastrophically" (agent-narrated)

1. **It died in MOTION.** The entire evidence base (279 ingest + shootout) is
   STILLS. The product is video: Veo animates the reference-stacked frame and
   identity flickers/morphs — "polished fake," worse than prompt-only. The Zam
   notes already called this the make-or-break. **Mitigation → WEDGE GATE #1:
   one Veo identity-in-motion test on a reference-stacked frame BEFORE any
   build. Raw/ungraded per the LUT rule. If motion fails, the wedge pivots to
   stills surfaces (thumbnails, image ads) — cheaper truth, same technique.**
2. **The wedge format is the most legally fraught one we could have picked.**
   A synthetic person *testifying to a transformation that never happened to
   anyone* = deceptive-practices territory (Meta misleading-content + PH
   consumer protection + skincare/derma claims), and disclosure doesn't cure a
   fabricated RESULT — it only cures a synthetic FACE. See Q6 below.
3. **Provider rug-pull.** OpenAI tightens likeness policy / flags face-swap-
   shaped traffic at scale; the feature dies mid-campaign for paying clients.
   Mitigation: the feature flag + graceful degrade above; never market the
   capability as guaranteed.
4. **Grader miscalibration.** Auto-QA said 77+, humans saw "ibang tao." The
   Gemini-flash judge scored flash-lite identity 62 where the blind Claude
   judge said 44 — the graders DISAGREE at exactly the failure boundary.
   Mitigation: **backtest the rubric against the brother's own keep/discard
   picks on the 279 set (we have his keeps — free ground truth) before
   trusting it in production.** This also bottles the real secret sauce — his
   eye — into the rubric, instead of losing it when he moves on.
5. **The photoshoot never happened.** Solo operator + cafe PCs: the Q2a shoot
   kept slipping, the library stayed empty, the wedge stayed blocked on a
   weekend of selfies. Mitigation: the shoot is a SCHEDULED deliverable with a
   date and an owner, not "one weekend soon"; wedge build does not start until
   ≥20 raw-ugc refs exist.
6. **Consent theater.** The checkbox existed; users uploaded girlfriends /
   exes / celebrities anyway. One viral "ginawa akong AI ad nang walang
   paalam" lands on GRIFON's brand, not the uploader's. Mitigation:
   abuse-report path + ToS indemnity at v1; likeness-match screening =
   roadmap.
7. **Economics** — retired by the pricing research above (image spend is
   pesos). Watch only the high-quality tier + Veo costs, not stills.
8. **Nobody came.** Business tier had too few users to justify the months;
   core launch work stalled meanwhile. Mitigation: the wedge is TIMEBOXED —
   define the success gate (N Business conversions / M wedge ads run) at
   build kickoff; expansion of the routing table waits for the gate.
9. **The thesis had a shelf life.** By Oct, audiences learned the tells /
   labels bred scroll-blindness; "feels real" stopped converting. Mitigation:
   the register thesis is MEASURABLE — growth-loop MER per register; if
   raw-ugc's edge decays, the routing table re-routes. No faith required.

### Q6 — B&A truth rule (DECIDED by Neil, 2026-07-11)

When a Business user runs a B&A ad with a synthetic presenter, **whose
transformation is being shown?** Options: **(i)** presenter NARRATES a real
customer's result — user-supplied real before/after photos, synthetic
presenter never embodies the transformation (claims stay true; cleanest
legally; but breaks the current S1/S3 same-person skeleton); **(ii)**
presenter embodies it only when the uploaded before/after ARE real photos of
the same consented person (the presenter-coherence rule from the sample-batch
spec, made mandatory); **(iii)** fully synthetic before/after allowed with an
"AI depiction, results simulated" disclosure. Agent recommendation: **(ii) as
default, (i) as the escape hatch; (iii) never** — a simulated derma result
with a disclaimer is still a fabricated health claim in spirit, and it is the
exact thing regulators screenshot.

**DECISION (Neil, 2026-07-11): (ii) default, (i) escape hatch, (iii) never.**
Implications for the wedge build: (ii) promotes the sample-batch spec's
presenter-coherence rule from eval guidance to a MANDATORY product gate — the
B&A flow must verify the uploaded before/after and the presenter are the same
consented person before reference-stacked S1/S3 runs; (i) needs a narrator-mode
storyboard variant (presenter never embodies the transformation → the S1/S3
same-person skeleton gets a sibling, its own TUNED touch inside the Gated
Proposal); (iii) is a hard product refusal, not a settings toggle.

**GRILL 2 COMPLETE (2026-07-11).** All questions resolved, premortem folded.
The Gated Proposal is ready for Neil's approve/reject once deliverables 1–3
below (motion gate, style-ref shoot, rubric backtest) report back.

### WEDGE GATE #1 result — Veo identity-in-motion (2026-07-11): **PASS — GATE CLOSED**

**Neil eyeball verdict (2026-07-11, same session): CONFIRMED, emphatic** — "from
image to video still looks real"; called the reference-stacked raw-ugc register
the first image-to-video result that reads REAL. All three verdicts (agent
frames, render_qa watch+listen, Neil's eye) now concur. n=1 caveat stands: the
rubric backtest (deliverable 3) is what turns one great clip into a QA gate.

Run (Neil-authorized GO, same session): shootout outputs were dead in `.tmp`, so
the winning-lane still was **regenerated for $0** — c01 composite via
`tools/shootout_refstack.mjs composite` → codex gpt-image-2 (`c01-01.png`,
identity match to MODEL confirmed by agent eyeball) — then animated ONCE on
**`veo-3.1-fast-generate-preview`** (the production preset tier) with a talking
raw-ugc Taglish beat, image-to-video, raw/ungraded per the LUT rule. 8s @
720x1280 24fps with **native audio**, rendered in 50s. Harness:
`tools/veo_motion_gate.mjs` (committed).

Verdicts, builder≠grader:
- **Agent frame audit** (0.2/1.5/3/4.5/6/7.5s): same person end-to-end — brows,
  lips, earring, heart-pendant necklace all stable; natural blink + genuine
  smile; NO morph/flicker in sampled frames. Mild face-rounding/softening at
  ~6s (Veo beauty-bias, consistent with the known over-cleaning drift) — within
  the "casual viewer won't clock it" band.
- **`render_qa.mjs` (gemini-3.5-flash watch+listen):** "identity, skin texture,
  lighting, and jewelry remain highly stable and realistic throughout"; Taglish
  VO natural/native accent; lip-sync natural; overall B. Only real defect: an
  abrupt pose-jump at ~1s (wink pose → speech onset).
  Report: `workflows/believability-refstack/motion-gate-qa.json`.

Evidence committed: `believability-samples/refstack/motion-gate-c01-input.png`
(the animated still) + `motion-gate-c01.mp4` (the raw clip — Neil: watch WITH
sound; lip-sync + voice register are ear checks).

New SOP notes from the run: (1) **CLEAN PLATE RULE** — stills fed to Veo must
carry NO baked caption overlay (the c01 caption was baked in; Veo faded it out
mid-clip; captions are Surface-A, burned post-render). (2) The ~1s pose-jump
argues for animating from a NEUTRAL-pose take, not an expression-peak take —
fold into the auto-QA/variant-picker spec. (3) Veo native audio nailed the
Taglish register unprompted — the voice half of the avatar pipeline needs less
defense than feared at this register.

**Gate consequence: the wedge build is UNBLOCKED on motion** once Neil's
eye/ear confirms. Remaining blockers: style-ref shoot (≥20 refs) + rubric
backtest.

### Deliverables queue (next sessions)

1. ~~Veo identity-in-motion gate test~~ **PASS + Neil-CONFIRMED 2026-07-11 —
   GATE CLOSED.** See WEDGE GATE #1 result above.
2. Style-ref shot-list doc + scheduled shoot date (blocks build).
3. Auto-QA rubric spec + backtest vs the brother's 279-set keeps (fold in the
   clean-plate + neutral-pose rules from the gate run).
4. ~~Q6 decision (Neil)~~ DONE 2026-07-11 — (ii)/(i)/never; see above.
5. Consent-checkbox placement spec (Phase-3 infra reuse) + ToS likeness copy.
6. Confirm gpt-image-2 high-quality-tier pricing before Business price is set.
