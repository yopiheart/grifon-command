# Seedance 2.0 / 4K doctrine + engine routing

This file encodes how to prompt **Seedance 2.0** for Grifon ad prep, and which engine to use for what. Two authoritative sources, distilled below:
- **Dreamina Seedance 2.0 Series Prompt Guide** (ByteDance / BytePlus ModelArk) — the formula, constraints, and craft tips here are quoted from it.
- Neil's Higgsfield "Seedance 4K" brief — the 4K-native realism doctrine (10-bit, 21:9, micro-texture).

Live references (both BytePlus URLs 403 to automated fetch — open by hand to update):
https://docs.byteplus.com/en/docs/ModelArk/2222480 · https://seed.bytedance.com/en/seedance2_0 · https://higgsfield.ai/blog/Seedance-4k

## Seedance's role in Grifon (READ FIRST)

- **Seedance 2.0 = the 4K cinematic + b-roll engine for COMMERCIAL ADS.** Use it for hero product shots, cinematic commercial spots, b-roll, scroll-stoppers, transformations, and any visual/atmosphere layer. Unlocked at **Business tier**.
- **Seedance CANNOT make a Filipino/Tagalog talking avatar.** Its text/audio natively supports **English, Japanese, Indonesian, Spanish, Portuguese — not Tagalog.** It *does* generate audio+video (SFX, ambience, even non-Tagalog VO), just not Filipino speech. So **never route a spoken-Tagalog talking-head to Seedance.** Those go to the **in-app avatar pipeline** (Veo + ElevenLabs voice).
- **Image generation = ChatGPT Image 2 (GPT Image 2).** Generate first/last keyframes and any on-screen text with GPT Image 2, then feed them to Seedance as image-to-video. (Higgsfield's "Soul Cinema" is an optional alternative for stylized character/location plates, but GPT Image 2 is Grifon's default — it nails text rendering and precise layout.)

## Why GPT Image 2 for the frames (face restriction)

Seedance **restricts direct upload of raw, unverified human faces** — use generated/placeholder/anonymized portraits instead. This is exactly why the image step is GPT Image 2: you generate a non-real, on-brand face/scene with accurate text, then drive Seedance from it. Never plan a Seedance shot around uploading a real customer's face.

## The Seedance prompt formula (Dreamina)

```
Video Output = Subject/Character Details + Environment/Scene Style + Camera Movement + Temporal Action + Audio/Sonic Instructions
```

Seedance parses every prompt into two layers — cover both:
- **Spatial Layer (the frame):** subjects, clothing, background, product appearance, style.
- **Temporal Layer (the motion):** camera moves, expressions, action, physical force/weight, and the synchronized audio timeline.

Because Seedance **natively locks features from reference assets** (multimodal reference), you can hit high fidelity with a *simple* prompt when you supply a reference image/video — explicitly state **what to inherit** from the asset vs **what to generate** fresh.

### Three task modes
- **Multimodal Reference** — extract elements (subject, style, product silhouette, an ambient SFX) from uploaded assets to compile a new asset. Name which properties to inherit and which to generate.
- **Video Editing** — change part/all of an existing video. State **only what changes**; everything not mentioned stays unchanged by default.
- **Video Extension / Continuation** — continue a clip along time. Specify the next beat while ordering the model to maintain audio-video style, character, and environment continuity.

## Hard constraints & rules (Dreamina)

- **Brevity: keep the prompt under ~1000 words, key points first.** Long prompts fragment informational density — the model drops details and keeps only the salient points. For Seedance, prefer the **compact formula template** below over the dense 23-section block (that fuller vocabulary is still useful for *thinking through* a shot; deliver the trimmed version).
- **Image rules:** first-frame and last-frame images **can be identical** for cyclic/loop consistency; if first/last aspect ratios conflict, the **first frame takes precedence** and the last is auto-cropped.
- **Face restriction:** no raw real faces (see above).
- **Supported aspects** (from the 4K brief): **21:9** (ultra-wide cinematic), **16:9**, **9:16** (mobile ads), 1:1 for feed. Use **21:9 to stress-test** big environments/crowds — if it holds there, it holds anywhere.

## Craft tips that raise quality (Dreamina + 4K brief)

- **Audio-visual alignment (millisecond sync).** State *when* a sound hits relative to a visual change: *"at the moment the glass shatters, a crisp layered shockwave SFX accompanies it."*
- **Define weight & force** to engage the physics solver. Write *"heavy stomping footsteps kicking up dust"*, not *"man walking"*; *"thick honey pours with viscous weight and stretches before impact"*, not *"honey falls."*
- **4K is a necessity, not cosmetic.** Native 4K changes the model's grasp of 3D space, depth, and physical boundaries — 1080p melts crowds/warps objects and burns credits on rerolls. Generate 4K from the start for hero/realism shots.
- **Micro-texture breaks the synthetic glaze.** Name skin pores, splitting ice, fabric weave, condensation, eye fibers — the detail that reads as real at 4K.
- **10-bit color, "High" bitrate = no banding.** 8-bit (~16M colors) bands in gradients (smoke, haze, sky, soft falloff, bokeh); 10-bit (>1B colors) blends seamlessly. Specify it in TECHNICAL, especially for any shot with smoke/haze/gradients.
- **Drive physics from an image.** For believable mass/momentum/weight, prefer image-to-video (GPT Image 2 frame → Seedance) over text-to-video.
- **Zero-hardware VFX.** Seedance can apply VFX to uploaded footage without green screen (native masking) — name the anchor object, the new element, and its light/contact-shadow/wet-film interaction; combine with the INPUT LOCK clause in `structure.md`.

## Model selection matrix (Dreamina)

- **Seedance 2.0 (Standard)** — cinematic-grade quality, intricate emotion, fine detail, premium brand consistency. Default for hero/brand shots.
- **Seedance 2.0 Fast / Mini** — when speed, API concurrency, or cost beat extreme cinematic grading. Good for volume b-roll / quick variants.

## Compact Seedance prompt template (deliver this shape)

Keep it tight — formula order, key points first, well under 1000 words:

```
[STYLE one-liner: 4K photoreal commercial, grade/mood, NOT 3D/game.]
SUBJECT/FRAME (Spatial): [subject + product appearance + clothing/background + style]. [If using a reference: inherit X from @image_1 — generate Y.]
ENVIRONMENT/STYLE: [location, light world, color accent]. 10-bit color, no banding.
CAMERA: [one or two named moves — macro push-in, snap-rack, slow dolly].
TEMPORAL ACTION (Motion): [what changes over time, with WEIGHT & FORCE verbs]. Physics: [mass, contact shadows, surface tension].
AUDIO/SONIC: [diegetic SFX synced to the key visual beat — "at [event], [sound]"]. [VO only if EN/JA/ID/ES/PT; NO Tagalog speech.]
TECH: native 4K, 10-bit, "High" bitrate, [aspect], [length]. No real faces (use GPT Image 2 keyframe). [Model: Standard | Fast/Mini.]
```

---

## Engine routing (the decision)

A prompt tuned for one engine does **not** auto-port (see `agent_lessons.md` 2026-05-19 — Veo formulas don't auto-work on Kling). Sample 2–3× before trusting a re-route; audit which phrases are decorative vs load-bearing and whether a negative phrase suppresses the new engine's intended behavior.

| Need | Engine | Notes |
|---|---|---|
| 4K cinematic commercial, b-roll, product hero, scroll-stopper, before/after, non-Tagalog audio | **Seedance 2.0** (Higgsfield/ModelArk) | The default for visuals. Business tier. Formula + brevity above. No real faces, no Tagalog speech. |
| First/last keyframes, on-screen text, anonymized faces | **GPT Image 2** | Feeds Seedance/Kling as image-to-video. |
| **Filipino/Tagalog talking avatar** (UGC, testimonial, founder) | **In-app avatar pipeline** (Veo + ElevenLabs) | NOT Seedance. This is Grifon's existing product feature; this skill writes the *shot* but the Filipino voice/avatar is the app's job. |
| Image-to-video with explicit start→end frame interpolation | **Kling** | Strong i2v; supply first (and optional last) frame + bridge motion + a negative prompt. |

### In-app talking pipeline — Veo profile (for the shot prompt only)
When writing a talking-head *shot* for the app (Filipino or other):
- **Frame-0 rule:** speaker ALREADY mid-syllable at 0:00 — mouth moving, first word forming, eyes engaged. NO establishing pose. Lead with the dialogue in quotes.
- One gentle camera move (slow dolly/push-in) starting with the first syllable; forbid handheld shake, rack focus, lens breathing on talking shots.
- End-clean: last frame = next syllable/breath; append "avoid cross-dissolve, double-exposure, ghosting, or fade in the final second."
- The Filipino *voice* and avatar identity are handled by the in-app pipeline (ElevenLabs + the avatar system), not by the prompt.

### Kling profile
- Provide a clear first (and optional last) frame; describe the **bridge motion** between them.
- Supply a **negative prompt**: "avoid low quality, blurry, distorted, deformation, morphing, melting, glitching, extra limbs, text, watermark, subtitles, cross-dissolve, ghosting, fade-out; final second holds clean and fully opaque."
- Concrete motion vocabulary (slow dolly-out, gentle push-in, lateral tracking pan); avoid handheld/rack focus on product shots.

## Quick TECHNICAL block to paste (Seedance)

```
TECH: native 4K, 10-bit color, "High" bitrate (no banding), [24fps], [aspect], [length]. No real faces (GPT Image 2 keyframe). Audio synced to the key beat. Model: [Standard | Fast/Mini].
```
