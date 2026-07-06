# Omni Edit Presets — the editing-style preset registry

**What this is:** the compounding database of named editing-style presets for the
**Gemini Omni Flash + FFmpeg hybrid pipeline** (roadmap #18 Layer 2). Each preset is a
tuned Omni prompt template + the FFmpeg deterministic layer it composes with. Maintained
by the [`ai-editor` skill](../.claude/skills/ai-editor/SKILL.md); consumed by
`tools/omni_edit.py preset <id>`. Validated presets are the **data** that later ships
into the product render pipeline (future `api/gemini/omni-video.ts` + `scene.omniMoves[]`
routing — a separate code-executor build, gated behind Neil's green-light). This feeds
roadmap **#11** (sellable named Edit Styles).

**Disambiguation:** "Omni Flash" = Google `gemini-omni-flash-preview` (video EDIT model,
Interactions API, ~$0.10/sec). NOT Kling O1 (`Kling_O1`, the 2-frame morph hook model)
and NOT the product's "AI Editor" screen (`components/EditVideo.tsx`).

**These presets do NOT replace the FFmpeg render presets** (`classic/impact/hype/clean`
in `api/_lib/renderPresets.ts`, TUNED). Those are the deterministic layer every Omni
preset composes with, and the free/Pro-tier styles. Retirement/demotion only via a
future bake-off with evidence (Neil decision 2026-07-06).

## Lifecycle

`draft` → `poc_validated` → `neil_approved` → `product_shipped` (or `rejected`)

- **draft** — template written, no paid run yet.
- **poc_validated** — ≥1 validation round passed: requested move executed as directed +
  believability parity vs raw control + text/label integrity.
- **neil_approved** — Neil eyeballed the actual mp4s; date + verbatim verdict recorded.
- **product_shipped** — ported into the product via a Gated Proposal (code-executor);
  row gains a code pointer.
- **rejected** — disqualifying evidence recorded so the failure is never blindly retried.

**A `poc_validated`/`neil_approved` status NEVER implies per-output safety** — label/text
integrity is stochastic (PoC Test 2 wordmark-perfect vs Sample 5 gibberish on the same
class of edit). The believability + label eval gate runs on EVERY output, every time.

## Preset Index

| ID | Name | Target | Status | Est. cost/run | Evidence |
|---|---|---|---|---|---|
| `felt-zoom-punchin-v1` | Felt Zoom Punch-In | talking | poc_validated | 5s ≈ $0.50 | #18 Sample 4 + Neil easing fix 2026-07-05 |
| `dolly-zoom-v1` | Dolly Zoom | b-roll | neil_approved | 4s ≈ $0.38 | #18 Sample 5 + Neil verdict 2026-07-05 |
| `display-text-pop-v1` | Directed Display Text Pop | mixed | neil_approved | 5s ≈ $0.50 | #18 Sample 6 + Neil verdict 2026-07-05 |
| `angle-switch-v1` | Camera Angle Switch | talking | draft (round 1 CONTAMINATED — retest on clean raw) | 6s ≈ $0.60 | Neil caught source contamination 2026-07-06 |
| `premium-reel-v1` | Premium Reel (johnsavage talking-head) | talking | draft (round 1 mixed on contaminated source — v2 = pixel-lock) | 6s ≈ $0.60/attempt | johnsavage PDF (appendix A) + round 1 2026-07-06 |
| `paper-collage-v1` | Paper Collage (johnsavage paper style) | talking | draft | 5s ≈ $0.50/attempt | johnsavage PDF (appendix B) |
| `vox-explainer-v1` | VOX Editorial Explainer | talking | draft | 5s ≈ $0.50/attempt | johnsavage PDF (appendix C) |
| `rack-focus-v0` | Rack Focus | b-roll | rejected | — | #18 round 1: move failed to execute |
| `talking-bg-swap-v0` | Talking-Scene BG Swap/Relight | talking | rejected | — | #18 round 1 Tests 3-4: degrades believability |

## Gated Proposals

> Only presets at `neil_approved` with the product-integration prerequisites met may
> appear here. The ai-editor skill NEVER applies these — each proposal maps the preset
> onto the concrete code shape (proxy + routing + tier gate) and ends `Status: with Neil`.

*(none yet — product integration is out of scope until Neil merges `feat/omni-edit-poc`
and green-lights the proxy build)*

---

## Presets

### premium-reel-v1 — Premium Reel (johnsavage talking-head)

Adapted from johnsavage's "Google Omni Premium Reel" workflow (verbatim source:
Appendix A). Adaptation deltas, each traceable to PoC evidence:

- **Stripped** the subtitle-generation paragraph — FFmpeg owns captions (word-accurate,
  face-clear band). Transcript stays in the prompt as anti-garble CONTEXT only.
- **Stripped** the sound-design paragraph — Omni audio is discarded in our pipeline;
  FFmpeg owns SFX/music/VO mux (lip-sync = ElevenLabs VO over source pixels).
- **Replaced** "do not alter the subject's appearance / skin tone" opener with the
  PoC-validated neutral phrasing — identity-preservation legalese trips the safety
  filter (blocked pre-generation, #18 round 1).
- **Replaced** free-pick keyword emphasis with an exact-spelling `emphasis_words` list —
  Omni renders directed text letter-perfect but garbles/invents incidental text
  (Sample 6 vs Test 1).
- **Added** Neil's easing language (Sample 4 "blink" complaint, 2026-07-05).
- **Parameterized** the shirt-logo color paragraph into brand slots.

```yaml
id: premium-reel-v1
name: Premium Reel (johnsavage talking-head)
target: talking
status: draft
origin: premium_talking_head_reel_editing_prompt_with_examples.pdf +
  google_omni_premium_reel_workflow.pdf (verbatim in Appendix A);
  PoC priors — roadmap #18 Sample 4 (reframes PASS), Sample 6 (directed
  text PASS), Neil easing verdict 2026-07-05
model: gemini-omni-flash-preview
max_passes: 1
slots:
  transcript: required          # verbatim spoken words — anti-garble context only
  emphasis_words: required      # exact-spelling list; the ONLY Omni-rendered text
  brand_primary_hex: required   # e.g. "#FFCC00" Grifon Gold
  brand_secondary_hexes: optional
  font_ref_image: optional      # uploaded alongside the video
  aspect_ratio: default 9:16
prompt_template: |
  Transform this raw talking-head video into a premium, viral-quality social
  media reel with high-retention editing, cinematic motion graphics, and
  modern creator-style visuals. Keep everything else exactly as filmed —
  the same hand motion and gestures as the uploaded video.

  The spoken content (for context only — do NOT add subtitles or captions;
  they are added later in post): "{{transcript}}"

  Typography is the centerpiece, but only for these exact words, spelled
  exactly as written: {{emphasis_words}}. When the speaker says one of them,
  create a huge cinematic text moment: bold editorial typography, oversized
  words as design elements, layered compositions where key phrases appear
  behind the speaker, partially masked by the subject, creating depth and a
  premium 3D look — kinetic, motion-tracked, with scale animation, shadows,
  lighting effects, and subtle motion. Do not render any other text anywhere
  in the frame.

  Color style: build the typography and graphic palette around the footage's
  existing colors, with {{brand_primary_hex}} as the primary accent
  {{#brand_secondary_hexes}}blending toward {{brand_secondary_hexes}}
  {{/brand_secondary_hexes}}; bright white with a soft glow for supporting
  elements. Text colors must feel naturally integrated into the scene.

  Add dynamic punch-ins and reframes synced to sentence emphasis — every
  zoom must be a smooth fast zoom with visible easing; the viewer should
  FEEL the camera travel in and out; no instant jump-cut reframes. Add
  relevant motion graphics, icons, callouts, and visual metaphors that
  support the spoken content. Improve color grading, contrast, exposure,
  and subject separation for cinematic polish.

  Maintain meaningful visual changes every few seconds to maximize
  retention. The final output should feel like a premium reel edited by a
  top-tier content agency. {{#font_ref_image}}Match the typography
  aesthetic to the attached font style reference.{{/font_ref_image}}
ffmpeg_layer:
  before: [dead-air trim (pay only for kept seconds)]
  after: [upscale 720p->1080p, word-accurate caption burn, price/offer text,
          ElevenLabs VO mux over Omni-stripped audio, music bed + ducking,
          SFX hits, end card, loudness master]
constraints:
  - talking target - ONE pass, reframe-class edits only, never bg-swap/relight
  - iterate via re-roll from raw with merged prompt, never refine
  - never feed captioned renders
  - no identity-preservation legalese anywhere in filled slots
validation:
  gate: blind analyze_video.py vs raw control (real-human + lip-sync parity);
        render_audit.mjs vision read on any directed text/labels
  rounds:
    - date: 2026-07-06
      clip: raw_talking 5.4s (Elena at desk, viral-editor-2 demo left half 4.4-9.8s)
      control_baseline: real-human, perfect lip-sync (high confidence)
      cost_usd: 0.54
      machine_verdict: |
        GATE FAIL on believability: likely-ai (medium) — "robotic TTS voice,
        stiff movements, unnatural lip-sync". Background REPAINTED (sticky-note
        wall not in source) = the person/scene re-render class. BUT the style
        mechanics all executed: "ARAW-ARAW" letter-perfect in layered white +
        #FFCC00 gold, speech-matched motion graphics (clock/lamp/work icons),
        visible push-ins. Analyzer also read word-by-word caption behavior
        (55% height, 1s swap) — possibly the kinetic moments, possibly invented
        captions; re-check on v2.
      neil_verdict: |
        "I love the overlay text design + it understands what the user is
        explaining — ARAW ARAW SA OPISINA tapos biglang may motion graphics /
        animation emoji. Perfect. Napansin ko lang: ung ARAW-ARAW overlay sa
        simula ay dalawa, white at GOLD — sinadya ba?" (2026-07-06)
        [Answer: semi-intended — the template's "layered compositions with
        foreground and background typography" language invites the doubled
        white/gold treatment; it matches the johnsavage aesthetic. Pin to a
        single instance in v2 if unwanted.]
      status_effect: |
        stays draft. NOTE: same contaminated source as angle-switch round 1
        (burned DERMA-TESTED caption + baked zoom) — the unrequested
        word-by-word captions were likely SEEDED by the existing caption.
        v2 on the clean raw asset = keep typography/graphics language, ADD
        hard reuse-source-pixels constraint ("reuse the original footage
        pixels; do not repaint, relight, or redraw the background or the
        speaker"), re-check caption behavior on text-free source.
      output: .tmp/omni-poc/edits/premium-reel-v1-141939.mp4 (wiped on reboot)
evidence: [roadmap #18 Sample 4, Sample 6, refine-chain test, Neil eyeball 2026-07-05]
cost_estimate_usd_per_run: "duration_s x 0.10 (5s test clip ~ $0.50/attempt)"
```

### premium-reel-v2 — Premium Reel with pixel lock

v1 round 1 (contaminated source) proved the style mechanics (letter-perfect
directed text, brand-color layered typography, speech-matched motion graphics)
but Omni repainted the background. v2 keeps v1's language and adds a hard
**reuse-source-pixels constraint**; also softens "color grading" (a repaint
invitation). The white/gold doubled word treatment stays (Neil liked the
design; layered typography is the style's signature).

```yaml
id: premium-reel-v2
name: Premium Reel (pixel-locked)
target: talking
status: draft
origin: premium-reel-v1 + round-1 2026-07-06 background-repaint fix
model: gemini-omni-flash-preview
max_passes: 1
slots:
  transcript: required
  emphasis_words: required
  brand_primary_hex: required
  brand_secondary_hexes: optional
  font_ref_image: optional
  aspect_ratio: default 9:16
prompt_template: |
  Edit this talking-head video with cinematic motion graphics and premium
  typography, added as layers over the original footage. Keep everything
  else exactly as filmed, including the room and background.

  Text rendering: render only these exact words, spelled exactly as written:
  {{emphasis_words}}. When the speaker says them, show the words in bold
  editorial typography — oversized, layered foreground and background type
  with depth and a premium 3D look, kinetic and motion-tracked, with scale
  animation, soft shadows, and subtle motion. Do not render any other text
  anywhere in the frame. Do not add subtitles or captions.

  Color: build the type and graphics palette around the footage's existing
  colors, with {{brand_primary_hex}} as the primary accent
  {{#brand_secondary_hexes}}blending toward {{brand_secondary_hexes}}
  {{/brand_secondary_hexes}}; bright white with a soft glow for supporting
  elements, naturally integrated into the scene.

  Camera: add dynamic punch-ins and reframes synced to sentence emphasis —
  every zoom is a smooth fast zoom with visible easing, natural smartphone
  zoom feel; the viewer should FEEL the camera travel in and out; no instant
  jump-cut reframes.

  Graphics: add small motion graphics, icons, and callouts that illustrate
  what is being said, layered over the original footage, timed to the
  speech. A visual change every couple of seconds.

  The spoken content (for timing context only): "{{transcript}}"
  {{#font_ref_image}}Match the typography aesthetic to the attached font
  style reference.{{/font_ref_image}}
ffmpeg_layer:
  before: [dead-air trim]
  after: [upscale 720p->1080p, word-accurate caption burn, price/offer text,
          ElevenLabs VO mux over Omni-stripped audio, music bed + ducking,
          SFX hits, end card, loudness master]
constraints:
  - talking target - ONE pass, reframe-class edits only, never bg-swap/relight
  - iterate via re-roll from raw with merged prompt, never refine
  - never feed captioned renders (verify with frame strip FIRST)
  - no identity-preservation legalese anywhere in filled slots
validation:
  gate: blind analyze_video.py vs raw control (real-human + lip-sync parity);
        render_audit.mjs vision read on directed text; BACKGROUND-UNCHANGED
        check vs source frames
  rounds:
    - date: 2026-07-06 (round 0 — SAFETY-FILTER BLOCK SAGA, $0 billed)
      clip: workflows/assets/omni-poc/best-sample-raw-talking.mp4
      cost_usd: 0.00 (all blocks pre-generation, unbilled)
      machine_verdict: |
        5 consecutive "harmful content" blocks across: v2 original, v2 minus
        face/speaker words, v2 minimal-preservation, v1 EXACT template (which
        PASSED on the Elena clip same day), v2 with innocuous emphasis word.
        Meanwhile angle-switch-v1 PASSED on the SAME clip + SAME transcript.
        Conclusion: the trigger is the premium typography/graphics prompt
        body × THIS clip (or preview-filter flakiness) — NOT the pixel-lock
        language, NOT the emphasis words, NOT preservation phrasing alone.
        GUARDRAIL-6 REFINEMENT: filter blocks are prompt×video interactions;
        a template that passed on one clip can block on another. Blocks are
        free — but bisect with a plan, then park.
      neil_verdict: informed same session
      status_effect: |
        stays draft. THEORY REVISED 2026-07-06 (2nd pass): a re-encoded copy
        (crf 20 + 0.04s trim, new byte fingerprint) ALSO blocked -> not a
        fingerprint flag. Full matrix: since the streak began, EVERY prompt
        on the Bukidnon clip blocks (incl. angle-v2 which passed on Elena
        minutes later); every prompt on Elena passes. Best hypothesis: the
        CLIP CONTENT is a drug false positive — man holding a bag of ground
        brown substance + audio "libreng drip bag" ("drip bag" + baggie
        visuals); angle-v1's single 14:57 pass = borderline-filter luck.
        Re-encoding cannot fix semantics. Unblock path: a different clean
        raw clip (different subject/audio). Template kept at the
        concise-directive variant (still preferred: marketing-manipulation
        vocab stripped).
      output: none (never generated)
evidence: ["premium-reel-v1 round 1 2026-07-06 (mechanics proven, bg repaint)", "round 0 block saga 2026-07-06"]
cost_estimate_usd_per_run: "6s ~ $0.60"
```

### felt-zoom-punchin-v1 — Felt Zoom Punch-In

The IG-creator retention edit from #18 round 2 (Sample 4: real-human, perfect lip-sync,
same grade as raw control) with Neil's easing fix baked in (his 2026-07-05 verdict:
Sample 4's zooms read as a "blink", not a felt camera move).

```yaml
id: felt-zoom-punchin-v1
name: Felt Zoom Punch-In
target: talking
status: poc_validated   # Sample 4 passed the gate; easing variant awaits Neil eyeball
origin: "#18 round 2 Sample 4 (IG-creator retention edit on raw talking)"
model: gemini-omni-flash-preview
max_passes: 1
slots:
  transcript: required
  aspect_ratio: default 9:16
prompt_template: |
  Edit this raw talking-head clip for maximum retention on Shorts and Reels.
  Add quick punch-in and punch-out reframes synced to sentence emphasis —
  every zoom must be a smooth fast zoom with visible easing; the viewer
  should FEEL the camera travel in and out; no instant jump-cut reframes.
  Where the speech references a concrete object or idea, add ONE subtle
  speech-matched motion graphic. Keep everything else exactly as filmed —
  the same hand motion, gestures, and audio as the uploaded video. Do not
  render any text anywhere in the frame.

  The spoken content (for sync context only): "{{transcript}}"
ffmpeg_layer:
  before: [dead-air trim]
  after: [upscale 720p->1080p, caption burn, VO mux, music, SFX, loudness]
constraints:
  - ONE pass; never refine (refine-chain test - mouth warp at gen 2)
  - reframe-class only; never bg-swap/relight
  - pacing cuts stay EDL/FFmpeg (Omni cannot shorten clips - 5.05s -> 5.18s)
validation:
  gate: blind analyze_video.py vs raw control; move-executed check
  rounds:
    - date: 2026-07-05
      clip: raw talking 5.05s (viral-editor-2 demo left half)
      cost: ~$0.50
      machine_verdict: real-human, perfect lip-sync (high confidence) — parity with raw control
      neil_verdict: "zooms too fast — reads as a blink straight to the face, not a felt camera move" → easing language added to template (v1 = post-fix; the eased variant itself not yet generated)
      output: .tmp/omni-poc/edits/ (wiped by defreezer — regenerate to view)
evidence: ["#18 round 2 Sample 4", "Neil eyeball 2026-07-05", "refine-chain test"]
cost_estimate_usd_per_run: "5s ~ $0.50"
```

### dolly-zoom-v1 — Dolly Zoom

```yaml
id: dolly-zoom-v1
name: Dolly Zoom
target: b-roll
status: neil_approved
origin: "#18 round 2 Sample 5 (raw serum-bottle b-roll)"
model: gemini-omni-flash-preview
max_passes: 3   # b-roll may refine-chain (no face to degrade); label gate per pass
slots:
  subject_desc: required   # what the shot contains, so the move anchors correctly
  aspect_ratio: default 9:16
prompt_template: |
  Apply a dolly zoom to this product b-roll clip: a strong continuous push
  toward {{subject_desc}} while the background perspective stretches — the
  classic vertigo effect. Smooth, natural camera physics with visible
  easing. Keep the product and all of its label text exactly as filmed; do
  not render any new text anywhere in the frame.
ffmpeg_layer:
  before: [dead-air trim]
  after: [upscale 720p->1080p, caption burn, VO/music mux, loudness]
constraints:
  - label/wordmark integrity is SCALE-DEPENDENT - zoom past what the source
    resolution resolves and fine print hallucinates into gibberish (Sample 5).
    Keep source >=720p for label-bearing products, or frame the move to avoid
    magnifying fine print.
  - render_audit.mjs vision read on labels REQUIRED per output
validation:
  gate: label/wordmark vision read; move-executed check
  rounds:
    - date: 2026-07-05
      clip: raw serum-bottle b-roll 3.75s
      cost: ~$0.38
      machine_verdict: "strong continuous push executed; big wordmark perfect; fine-print label text hallucinated once magnified past 540x960 source resolution"
      neil_verdict: "approved — beautiful, consistent, nothing broken"
      output: .tmp/omni-poc/edits/ (wiped)
evidence: ["#18 round 2 Sample 5", "Neil eyeball 2026-07-05"]
cost_estimate_usd_per_run: "4s ~ $0.38"
```

### display-text-pop-v1 — Directed Display Text Pop

```yaml
id: display-text-pop-v1
name: Directed Display Text Pop
target: mixed
status: neil_approved
origin: "#18 round 2 Sample 6 (SOBRANG SULIT explicit text render)"
model: gemini-omni-flash-preview
max_passes: 1
slots:
  display_words: required   # exact-spelling; stylistic display words ONLY
  anchor_moment: required   # when/where the text pops (e.g. "as the speaker says X")
  aspect_ratio: default 9:16
prompt_template: |
  Add a display text moment to this clip: render the words
  "{{display_words}}" — spell it exactly as written — in clean bold
  sans-serif with a drop shadow, popping in {{anchor_moment}} with a snappy
  scale-in animation. The text must read clearly against the footage. Keep
  everything else exactly as filmed. Do not render any other text anywhere
  in the frame.
ffmpeg_layer:
  before: [dead-air trim]
  after: [upscale, caption burn (captions remain FFmpeg), VO/music, loudness]
constraints:
  - STYLISTIC display words only. Critical text (PHP prices, offers, captions,
    end-card) stays FFmpeg - deterministic and exact.
  - Omni garbles text it PRESERVES or INVENTS incidentally; it renders
    EXPLICITLY DIRECTED text accurately. Always use "spell it exactly as
    written" phrasing.
validation:
  gate: render_audit.mjs vision read must match display_words letter-for-letter
  rounds:
    - date: 2026-07-05
      clip: raw clip, round 2 Sample 6
      cost: ~$0.50
      machine_verdict: "letter-perfect render, clean bold sans-serif + drop shadow + pop-in, exactly as directed"
      neil_verdict: "approved — animation + drop-shadow readability both good"
      output: .tmp/omni-poc/edits/ (wiped)
evidence: ["#18 round 2 Sample 6", "Neil eyeball 2026-07-05"]
cost_estimate_usd_per_run: "5s ~ $0.50"
```

### paper-collage-v1 — Paper Collage (johnsavage paper style)

Adapted from Appendix B. **Different eval class than realism presets:** this preset
deliberately RESTYLES the whole frame (subject cut out as a paper-collage piece), so
the real-human believability gate does not apply — the gates are **lip-sync
preservation, speech↔typography sync, and directed-text integrity**. "Plastic skin"
is not a failure here; the whole frame is paper. Still ONE pass (mouth timing must
survive the restyle) and still stylized-vs-sincere: the CMO sincerity guard applies —
never offer this look on Testimonial-style scripts.

Adaptation deltas: stripped the paper-SFX line (Omni audio is discarded; FFmpeg owns
SFX — note: no paper SFX in our `assets/sfx/` bank yet, candidate gap); the kinetic
words come from the exact transcript (directed-text rule — but a full transcript is a
large garble surface: the letter-perfect vision-read gate is mandatory, and the
fallback variant is emphasis-words-only).

```yaml
id: paper-collage-v1
name: Paper Collage (johnsavage paper style)
target: talking
status: draft
origin: google_omni_paper_style_workflow.pdf (verbatim in Appendix B)
model: gemini-omni-flash-preview
max_passes: 1
slots:
  transcript: required        # drives the word-by-word kinetic typography sync
  palette: default "red, acid yellow, black"   # brandable: e.g. "Grifon gold #FFCC00, white, black"
  aspect_ratio: default 9:16
prompt_template: |
  Edit this video, keep my movements and timing the same but restyle the
  whole video as a bold mixed-media collage with stop-motion animation feel
  and collage/paper style transitions. Cut me out as a high-contrast collage
  piece with a rough paper-cutout edge around me, over a background of bold
  flat colors ({{palette}}) with crumpled paper textures, newspaper scraps
  and halftone dots. Also make sure there are zoom ins, zoom outs, different
  angles so the video is more dynamic — every zoom with visible easing.

  Add aggressive kinetic typography, massive bold words popping up one by
  one exactly in sync with my speech, accent words highlighted on colored
  tape. The titles and text must match the spoken audio perfectly, spelled
  exactly as written in the spoken text below. Do not invent any other text.

  Add collage stickers, hand-drawn doodles, arrows and flat emoji with drop
  shadows. Visual effects: subtle camera shake, glitch and chromatic
  aberration, choppy 12fps stop-motion movement. My voice and original
  audio stay exactly as in the source.

  audio spoken text: "{{transcript}}"
ffmpeg_layer:
  before: [dead-air trim]
  after: [upscale 720p->1080p, price/offer text (kinetic words are Omni;
          PHP/critical text stays FFmpeg), VO mux, music, SFX, loudness]
constraints:
  - ONE pass (lip/mouth timing must survive the restyle)
  - stylized look - EXEMPT from real-human believability gate; gates are
    lip-sync + speech/typography sync + letter-perfect text vision read
  - sincerity guard - never offer on testimonial-style scripts
  - full-transcript typography is a large garble surface; fallback variant
    = emphasis words only
validation:
  gate: lip-sync parity vs raw control (analyze_video.py); render_audit.mjs
        vision read - every rendered word must match the transcript
  rounds: []
evidence: ["Appendix B (johnsavage, untested on our footage)"]
cost_estimate_usd_per_run: "5s ~ $0.50"
```

### vox-explainer-v1 — VOX Editorial Explainer

Adapted from Appendix C. Closest johnsavage style to our validated reframe-class:
face stays real and unaltered, graphics live AROUND the speaker (title cards, maps,
clippings, screenshots), signature first-second reframe drops the speaker lower to
open title space. Strong fit for Grifon explainer ads and Neil's own content.

Adaptation deltas: dropped "remove echo from the audio" (our audio is stripped; VO
muxes over); topic grounding via a `topic_link` slot — **open validation question:**
the Flow UI may browse the link, the API may treat it as text-only context; round 1
must check whether graphics are actually grounded or hallucinated. Explicitly
anti-subtitle by design — our FFmpeg captions stay OFF for this style (or minimal),
matching the source aesthetic.

```yaml
id: vox-explainer-v1
name: VOX Editorial Explainer
target: talking
status: draft
origin: Google_Omni_VOX_Style_Workflow.pdf (verbatim in Appendix C)
model: gemini-omni-flash-preview
max_passes: 1
slots:
  topic_context: required     # the topic link AND/OR a short factual brief pasted
                              # inline (API may not browse URLs - see open question)
  title_text: required        # exact-spelling main title for the opening card
  aspect_ratio: default 9:16
prompt_template: |
  Recreate this filmed talking-head video in a VOX-inspired tactile
  documentary motion-graphics style. Do not add subtitles or word-for-word
  captions. Use only occasional short title cards, labels, visual callouts,
  maps, article clippings, search pages, diagrams, screenshots,
  archival-style inserts, and data visuals when they help explain the topic.
  Keep the talking face as it is, dont alter it.

  Use this source material for all visuals, so every graphic, map, headline,
  chart, article clipping, icon, and insert makes sense for the topic:
  {{topic_context}}

  In the first second, reframe the shot so the speaker moves lower in the
  frame, leaving clear space above. In that upper space, introduce the main
  title — spelled exactly as written: "{{title_text}}" — with a clean
  VOX-style motion graphic. Make it feel like the frame opens up into an
  explainer layout.

  Visual style: tactile editorial documentary, warm off-white paper
  backgrounds, subtle grid lines, roughened edges, halftone newspaper
  texture, slight grain, light leaks, chromatic aberration, soft vignette,
  analog imperfections, paper cutout collage, maps, screenshots, archival
  inserts, and smooth camera moves across layered source material.

  Motion style: frequent hard cuts, quick inserts, paper/card slide-ins,
  masked reveals, zooms into screenshots, map moves, article highlights,
  arrows and callouts, parallax between layers, and occasional choppy
  posterized animation like hand-made motion graphics. Every 1.5 to 2
  seconds, introduce a visual change: cut, zoom, insert, overlay, camera
  move, texture shift, map, article, diagram, or archival-style visual. Do
  not let the talking-head shot stay unchanged for too long.

  Keep the video polished, journalistic, intelligent, and editorial. Make
  screens feel like screens, paper feel like paper, and all graphics feel
  slightly analog rather than perfectly digital.
ffmpeg_layer:
  before: [dead-air trim]
  after: [upscale 720p->1080p, VO mux, music, loudness; captions OFF or
          minimal by design (anti-subtitle style); PHP/offer text still
          FFmpeg if present]
constraints:
  - ONE pass; face unaltered (source instruction aligns with our talking rule)
  - inserted "screenshots"/"articles" contain incidental text Omni will
    invent - treat all insert text as decorative; any factual/brand text
    must be directed exact-spelling or FFmpeg
  - open question - does topic grounding work via API prompt text, or only
    via the Flow UI link attachment? Round 1 checks.
validation:
  gate: blind believability vs raw control (face stays real here, unlike
        paper-collage); title_text letter-perfect vision read; grounding
        sanity check on inserts
  rounds: []
evidence: ["Appendix C (johnsavage, untested on our footage)"]
cost_estimate_usd_per_run: "5s ~ $0.50"
```

### angle-switch-v1 — Camera Angle Switch (PENDING TEST — round 1 shakedown)

Neil's explicit next test (2026-07-05). **Open question this settles:** johnsavage's
Premium Reel prompt asks Omni to "change camera angles, from high angles and low angles,
from left and right" on a talking head — but our #18 round 1 found person re-rendering
degrades believability. Angle switching necessarily re-renders the person from a new
viewpoint. Either johnsavage's reels tolerate a believability drop we won't accept for
client ads, or the one-pass raw-input path preserves it. Test before trusting.

```yaml
id: angle-switch-v1
name: Camera Angle Switch
target: talking
status: draft   # round-1 rejection RESCINDED — test was contaminated, see rounds
origin: "Neil eyeball verdict #2, 2026-07-05 ('wants CAMERA ANGLE SWITCH tested next');
  johnsavage premium-reel prompt (contradicts #18 round 1 person-re-render finding)"
model: gemini-omni-flash-preview
max_passes: 1
slots:
  transcript: required
  aspect_ratio: default 9:16
prompt_template: |
  Edit this raw talking-head clip: at natural sentence boundaries, cut to a
  different camera angle of the same scene — alternate between a slightly
  higher angle, a slightly lower angle, and gentle left/right offsets, as
  if filmed multi-cam. The speaker, wardrobe, lighting, background, voice,
  and lip movement stay exactly as filmed. Every angle change lands on a
  sentence boundary, synced to the speech rhythm. No zooms, no text, no
  other effects.

  The spoken content (for sync context only): "{{transcript}}"
ffmpeg_layer:
  before: [dead-air trim]
  after: [upscale, caption burn, VO mux, music, loudness]
constraints:
  - ONE pass max (talking rule)
  - HIGH-RISK preset - angle change re-renders the person; the believability
    gate is the whole test. If it fails at parity, record rejected and stop.
validation:
  gate: blind analyze_video.py vs raw control - must hold real-human +
        lip-sync parity through the angle cuts; move-executed check
  rounds:
    - date: 2026-07-06
      clip: raw_talking 5.4s (Elena at desk, viral-editor-2 demo left half 4.4-9.8s)
      control_baseline: real-human, perfect lip-sync (high confidence)
      cost_usd: 0.54
      machine_verdict: |
        DOUBLE FAIL. (1) Move did not execute: continuous push-in, ZERO angle
        cuts (frame strip + analyzer "static frame"). (2) Believability:
        likely-ai (HIGH confidence) — "plastic skin texture, stiff posture,
        lip-sync mismatch at 0:01-0:04". (3) Bonus violation: invented a
        garbled yellow caption "AUCA-SI ELENA" despite the no-text
        instruction. Confirms the #18 round-1 person-re-render prior OVER the
        johnsavage camera-angle claim, on our footage.
      neil_verdict: |
        "The video we used has an overlay text edited already + a slow zoom-in
        baked by the Veo prompt — we shouldn't use a video that is already
        edited with overlay text and camera movement... the AI changed the
        overlay text from DERMA-TESTED to AUCA SI ELENA." (2026-07-06)
      status_effect: |
        ROUND INVALIDATED — Neil caught a source contamination the prep missed:
        the "raw" demo-left-half clip had a burned DERMA-TESTED caption AND a
        baked continuous zoom (frame-strip confirmed). This violated guardrail
        4 (never feed captioned renders); the AUCA-SI ELENA garble is the known
        caption-REWRITE class, and the baked zoom confounds the move-executed
        check. Rejection RESCINDED -> back to draft. Retest on the clean
        committed raw asset (workflows/assets/omni-poc/best-sample-raw-talking
        .mp4, baseline: real-human/high, static medium shot). The #18
        person-re-render believability risk REMAINS the open question.
      output: .tmp/omni-poc/edits/angle-switch-v1-141756.mp4 (wiped on reboot)
    - date: 2026-07-06 (round 2 — CLEAN retest)
      clip: workflows/assets/omni-poc/best-sample-raw-talking.mp4 (5.92s,
        baseline real-human/high, static shot, no burned text)
      cost_usd: 0.59
      machine_verdict: |
        Believability PARITY: real-human (high confidence) — the #18
        person-re-render fear did NOT materialize on clean source. Zero
        invented text (captions: none). BUT the move did NOT execute:
        analyzer reads "static medium shot", 10-frame strip shows identical
        framing throughout — no high/low/left/right cuts, micro-reframes at
        most. Same non-execution as the contaminated round, now uncontaminated.
      neil_verdict: pending eyeball
      status_effect: |
        stays draft. Two consecutive move-non-executions (template phrasing:
        "cut to a different camera angle at sentence boundaries"). ONE
        optional retry justified with johnsavage's literal phrasing ("also
        change camera angles, from high angles and low angles, from left and
        right") before declaring rejected (move-unsupported). Key positive:
        editing a clean talking clip holds believability — the risk class is
        narrower than feared.
      output: .tmp/omni-poc/edits/angle-switch-v1-145750.mp4 (wiped on reboot)
evidence: ["round 1 2026-07-06 CONTAMINATED (this file)", "round 2 2026-07-06 clean retest", "#18 round 1 person-re-render prior"]
cost_estimate_usd_per_run: "5s ~ $0.50"
```

### angle-switch-v2 — Camera Angle Switch (concrete-destination phrasing)

v1 failed to execute twice with abstract phrasing. v2 per the official prompt
guide (deepmind.google/models/gemini-omni/prompt-guide, Neil 2026-07-06):
specify CONCRETE destination shots ("Change the camera angle to be over the
violinist's shoulder") + johnsavage's literal high/low/left/right line.

```yaml
id: angle-switch-v2
name: Camera Angle Switch (concrete destinations)
target: talking
status: draft
origin: angle-switch-v1 rounds 1-2 non-execution + official Omni prompt guide
model: gemini-omni-flash-preview
max_passes: 1
slots:
  transcript: required
  cut1_line: required   # spoken words where the first angle change lands
  cut2_line: required   # spoken words where the second angle change lands
  aspect_ratio: default 9:16
prompt_template: |
  Edit this talking-head video. Also change camera angles, from high angles
  and low angles, from left and right, like a multi-cam edit.

  Start on the original medium shot. When he says "{{cut1_line}}", change
  the camera angle to a slightly lower angle from his left side, medium
  close-up. When he says "{{cut2_line}}", change the camera angle to a
  close-up from his right side, slightly above eye level. Each angle change
  is a hard cut landing exactly on those words.

  The speaker, wardrobe, lighting, background, voice, and lip movement stay
  exactly as filmed. No zooms, no text, no other effects.

  The spoken content (for sync context only): "{{transcript}}"
ffmpeg_layer:
  before: [dead-air trim]
  after: [upscale, caption burn, VO mux, music, loudness]
constraints:
  - ONE pass max (talking rule)
  - believability gate must hold through the angle cuts (v1 round 2 proved
    clean-source editing holds parity - the open question is the cuts)
validation:
  gate: blind analyze_video.py vs raw control; move-executed check via frame strip
  rounds:
    - date: 2026-07-06 (round 1a — clean clip, BLOCKED)
      clip: workflows/assets/omni-poc/best-sample-raw-talking.mp4
      cost_usd: 0.00 (pre-generation block, unbilled)
      machine_verdict: |
        Safety-filter block on the SAME clip where angle-switch-v1 passed 40
        min earlier -> confirms the block CASCADE: after repeated blocks,
        Google fingerprint-flags the uploaded FILE and blocks it regardless
        of prompt. Prompts are innocent.
    - date: 2026-07-06 (round 1b — UNAUTHORIZED clip substitution, logged in
        agent_lessons; Neil had banned the Elena clip and was not asked)
      clip: .tmp/omni-poc/raw_talking.mp4 (Elena — CONTAMINATED source,
        believability unreadable; move-execution data only)
      cost_usd: 0.54
      machine_verdict: |
        Concrete-destination phrasing produced framing CUTS (medium ->
        close-up jumps at roughly the requested lines — better than v1's
        nothing) but ZERO true angle changes: face stays frontal, no
        high/low/left/right perspective shift. Combined with v1 rounds:
        3 attempts, 2 phrasing strategies incl. official-guide style ->
        CAPABILITY LIMIT, not a prompt problem. Omni edit reuses source
        pixels for people (why believability holds); it reframes in 2D but
        will not synthesize a new 3D viewpoint of a real person.
      neil_verdict: |
        "The last angle switching working already — original camera angle
        then switch to the side angle then switch back to the original
        angle. Yes its working now." (2026-07-06) — OVERRULES the frame-strip
        read (150px thumbnails missed the perspective shift; eyeball wins,
        that's why the protocol has this step). Also: cuts executed even
        though the source carried a baked zoom.
      status_effect: |
        MOVE EXECUTED confirmed by Neil -> v2 is the working template
        (concrete destination shots did it). NOT yet poc_validated: the
        believability-parity check must re-run on a CLEAN clip (this source
        was contaminated). Next clean run completes the gate.
      output: .tmp/omni-poc/edits/angle-switch-v2-151816.mp4 (wiped on reboot)
evidence: ["v1 rounds 1-2 (non-execution)", "official prompt guide: concrete destination shots", "round 1b: 2D reframe yes, 3D viewpoint no"]
cost_estimate_usd_per_run: "6s ~ $0.60"
```

### rack-focus-v0 — Rack Focus (REJECTED)

```yaml
id: rack-focus-v0
name: Rack Focus
target: b-roll
status: rejected
origin: "#18 round 1 (the marquee FFmpeg-impossible move)"
model: gemini-omni-flash-preview
rejection: |
  Round 1: the rack-focus prompt did not produce a focus pull on first
  attempt. #18 verdict: "run 1-2 refine iterations before finalizing" —
  so rejection is PROVISIONAL: retry is allowed, but only as a deliberate
  refine-chain experiment on b-roll within budget, not a blind re-roll.
evidence: ["#18 round 1 edit-arm PoC"]
```

### talking-bg-swap-v0 — Talking-Scene Background Swap/Relight (REJECTED)

```yaml
id: talking-bg-swap-v0
name: Talking-Scene BG Swap/Relight
target: talking
status: rejected
origin: "#18 round 1 Tests 3-4"
rejection: |
  HARD rejection — do not retry. "Background-only" edits on talking scenes
  re-render the person even when told not to: plastic skin / "pasted"
  subject, both high confidence, on OUR footage. Background text also
  garbled ("COFEE"). Talking scenes are reframe-class only, forever, until
  a new model generation passes a fresh bake-and-leap test (roadmap
  Bake-and-Leap registry).
evidence: ["#18 round 1 Tests 3-4", "Higgsfield-demo prior contradicted on our footage"]
```

---

## Appendix — verbatim source workflows (johnsavage)

### A. Google Omni Premium Reel (extracted 2026-07-06, text-layer PDFs)

Sources: `google_omni_premium_reel_workflow.pdf` (3 pp) +
`premium_talking_head_reel_editing_prompt_with_examples.pdf` (6 pp, sibling variant).
Single-pass workflow: raw talking-head + this one prompt (+ optional font style
reference image) into Google Omni. Author's warning: *"include your full captions in
the prompt, because sometimes the video will generate something wrong!"*

Main prompt, verbatim (premium_reel variant; the sibling adds a subtitle-accuracy
paragraph and a color-grading paragraph and omits the camera-angle line):

> Transform this raw talking-head video into a premium, viral-quality social media reel
> with high-retention editing, cinematic motion graphics, and modern creator-style
> visuals. Keep the original speaker, original audio, and original shirt color
> completely unchanged -- do not alter, recolor, or modify the subject's appearance,
> clothing, or skin tone in any way. Preserve the exact video footage as-is and only
> add editing layers on top.
>
> also change camera angles, from high angles and low angles, from left and right
>
> Caption design should be a major visual element, not simple subtitles. Use bold
> cinematic typography where important words become oversized design elements on
> screen. Create layered text compositions with foreground and background typography.
> Key phrases can appear behind the speaker, partially masked by the subject, creating
> depth and a premium 3D look.
>
> Typography Style: Large editorial fonts, luxury cinematic typography, mixed font
> weights, layered text compositions, kinetic typography, motion-tracked text, depth
> and parallax effects, premium 3D text treatments.
>
> Color Style: Extract colors directly from the video footage and build the entire
> typography and graphic palette around the scene. Use mainly bright white with a glow
> effect color. Also use the yellow tones visible on the shirt logo as the primary
> accent color. Build yellow-based gradients blending with orange, red, burgundy, dark
> cherry, and warm highlights. All text colors must feel naturally integrated into the
> video's existing color palette. Important keywords should have unique gradient
> treatments and premium glow effects that complement -- not clash with -- the actual
> footage colors.
>
> Whenever the speaker makes a strong point, create huge cinematic text moments, let
> key words dominate the screen, use layered typography behind the speaker, add scale
> animations, depth, shadows, lighting effects, and subtle motion.
>
> Add dynamic zoom-ins, punch-ins, reframing, speed ramps, motion blur transitions,
> and seamless camera movement. Add relevant B-roll, graphics, UI animations, visual
> metaphors, icons, callouts, motion graphics, and overlay effects to support the
> spoken content visually.
>
> Add professional sound design including whooshes, impacts, swipes, clicks, risers,
> transition sounds, and subtle cinematic audio enhancement -- all synced to the
> original spoken audio.
>
> Maintain fast pacing with meaningful visual changes every few seconds to maximize
> retention.
>
> The final output should feel like a premium reel edited by a top-tier content
> agency, with typography and captions acting as a central visual storytelling
> element. I am also sharing a font style reference -- match the typography aesthetic
> to that reference.
>
> Make sure to follow the same hand motion and gesture as uploaded video, audio and
> lipsync also remain similar to raw video.

**Why we adapted rather than adopted:** the identity-preservation opener is safety-filter
bait on our account (#18 round 1 block); sound design + subtitles conflict with our
FFmpeg/ElevenLabs ownership of audio + captions; free-pick "important keywords" is the
incidental-text garble class (Test 1); camera-angle switching contradicts our round-1
person-re-render finding (→ `angle-switch-v1` tests it in isolation).

### B. Google Omni Paper-Style Workflow (transcribed 2026-07-06 via poppler render)

Source: `google_omni_paper_style_workflow.pdf` (4 tall pages, image-only). Pipeline:
2 steps, all inside Google Flow (labs.google/fx/tools/flow) with the **Omni Flash**
model — upload clip + "Add to Prompt", paste the prompt, generate. Single pass, no
external editor. Author's twice-repeated warning: *"use your full captions in the
prompt so Google Omni can line up the big paper-style titles with your spoken words"*;
also *"The cleaner the source clip, the cleaner the paper-cutout result."* Target look:
red + acid yellow + black, paper textures, newspaper scraps, halftone dots.

Main prompt, verbatim (placeholder syntax exactly `[INSERT YOUR CAPTIONS]`):

> "Edit this video, keep my movements and timing the same but restyle the whole video
> as a bold mixed-media collage with stop-motion animation feel and collage/paper
> style transitions. Cut me out as a high-contrast collage piece with a rough
> paper-cutout edge around me, over a background of bold flat colors (red, acid
> yellow, black) with crumpled paper textures, newspaper scraps and halftone dots.
> also make sure there are zoom ins, zoom outs, different angles so the video is more
> dynamic
>
> Add aggressive kinetic typography, massive bold words popping up one by one exactly
> in sync with my speech, accent words highlighted on colored tape. The spoken words
> are, in order. the titles and text should match the spoken audio perfectly.
>
> Add collage stickers, hand-drawn doodles, arrows and flat emoji with drop shadows.
> Visual effects: subtle camera shake, glitch and chromatic aberration, choppy 12fps
> stop-motion movement. My voice and original audio stay exactly as in the source.
>
> Also include, paper sound sfx that matches the transitions and title and video
> movements
>
> audio spoken text: "[INSERT YOUR CAPTIONS]""

**Why adapted:** paper SFX stripped (Omni audio discarded; FFmpeg owns SFX — no paper
SFX in `assets/sfx/` yet, candidate gap); kinetic words bound to exact transcript +
"do not invent any other text" (garble class); palette parameterized for branding;
easing language added to the zooms. → `paper-collage-v1`.

### C. Google Omni VOX-Style Workflow (transcribed 2026-07-06 via poppler render)

Source: `Google_Omni_VOX_Style_Workflow.pdf` (4 tall pages, image-only). Built on
Google Flow (https://labs.google/fx/tools/flow), **Omni Flash** model. Same 2-step
pipeline, PLUS a unique input: a **topic link (URL)** provided alongside the prompt as
factual grounding for the maps/clippings/diagrams/screenshots. Author's "Important
constraints": *"Do not add word-for-word subtitles. Keep the face unchanged. Remove
echo from the audio. Reframe the first second so the title space opens above the
speaker."* Pacing rule: a visual change every 1.5–2s.

Main prompt, verbatim (no placeholder token — the variable input is the attached link):

> "Recreate this filmed talking-head video in a VOX-inspired tactile documentary
> motion-graphics style. Do not add subtitles or word-for-word captions. Use only
> occasional short title cards, labels, visual callouts, maps, article clippings,
> search pages, diagrams, screenshots, archival-style inserts, and data visuals when
> they help explain the topic. keep the talking face as it is, dont alter it. remove
> echo from the audio.
>
> Use the information from the link I provide as the source material for all visuals,
> so every graphic, map, headline, chart, article clipping, icon, and insert makes
> sense for the topic.
>
> In the first second, reframe the shot so I move or drop lower in the frame, leaving
> clear space above me. In that upper space, introduce the main title, key visual, or
> topic information with a clean VOX-style motion graphic. Make it feel like the frame
> opens up into an explainer layout.
>
> Visual style: tactile editorial documentary, warm off-white paper backgrounds,
> subtle grid lines, roughened edges, halftone newspaper texture, slight grain, light
> leaks, chromatic aberration, soft vignette, analog imperfections, paper cutout
> collage, maps, screenshots, archival inserts, and smooth camera moves across layered
> source material.
>
> Motion style: frequent hard cuts, quick inserts, paper/card slide-ins, masked
> reveals, zooms into screenshots, map moves, article highlights, arrows and callouts,
> parallax between layers, and occasional choppy posterized animation like hand-made
> motion graphics. Every 1.5 to 2 seconds, introduce a visual change: cut, zoom,
> insert, overlay, camera move, texture shift, map, article, diagram, or
> archival-style visual. Do not let the talking-head shot stay unchanged for too long.
>
> Keep the video polished, journalistic, intelligent, and editorial. Make screens feel
> like screens, paper feel like paper, and all graphics feel slightly analog rather
> than perfectly digital."

**Why adapted:** echo-removal dropped (our audio is stripped, VO muxes over); link
grounding moved into a `topic_context` slot with an open API-vs-Flow-UI question;
main title made exact-spelling directed text. → `vox-explainer-v1`.

### Re-render note (defreezer)

The paper/VOX PDFs are image-only; reading them requires poppler, which the defreezer
wipes. Re-arm command (also in `workflows/session_reminders.md`):

```
curl -sL -o poppler.zip https://github.com/oschwartz10612/poppler-windows/releases/download/v26.02.0-0/Release-26.02.0-0.zip
unzip -q poppler.zip -d poppler   # then poppler/poppler-*/Library/bin/pdftoppm.exe -png -r 100 <pdf> out/pg
```
