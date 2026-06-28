---
name: cinematic-ad-prompt
description: Turn a rough ad idea into a finished, copy-paste-ready AI video generation prompt for Grifon commercial-ad prep — hyper-realistic cinematic shots tuned for Seedance 2.0 / 4K (BytePlus ModelArk API) and portable to Veo 3.1 and Kling. Dual mode — CINEMATIC (pure Hollywood-grade visual) and DIRECT-RESPONSE AD (adds first-3-second hook, offer, CTA, pain→desire, premium Taglish, mobile-first 9:16). Use whenever the user wants to write, draft, structure, improve, or expand a video prompt; mentions shots, cuts, multishot, oner, packshot, hero shot, b-roll, UGC, talking head, testimonial, before/after, HUD, speed-ramp, film burn, 10-bit color, 21:9, image-to-video, or references like image-handles / input-locked source video; asks for a "cinematic prompt", "ad shot", "Seedance/Veo/Kling prompt", or "turn this idea into a prompt for my ad"; or invokes it by name (cinematic-ad-prompt, "ad prompt builder", "Seedance prompt"). Trigger on partial asks like "make this into a proper prompt" or "write me a 9:16 hook video about X". The output is always a single ready-to-paste prompt block, not a description of one. NOT for editing the in-app TUNED video pipeline (services/geminiService.ts, api/_lib/prompts.ts — leave those alone), grading Grifon's own generated output (use gemini-eval), or autopsying a competitor's video (use viral-autopsy).
---

# Cinematic Direct-Response Ad Prompt Builder

This skill writes finished, copy-paste-ready prompts for AI video generation, built for **Grifon commercial-ad prep**: Neil designs hyper-real cinematic shots with Seedance 2.0 (or Veo/Kling) *before* building the finished ad in Grifon. The output is the prompt itself — a clean block pasted straight into a video model — never a meta-explanation of how a prompt could be written.

This is a Grifon-grade evolution of a Hollywood prompt builder: it keeps the proven cinematic engine and adds a **Seedance-4K technical layer** and a **direct-response selling layer** so the footage doesn't just look expensive — it sells to a Filipino SMB buyer.

## Scope and boundaries

- **This skill is for external prep only.** It writes prompts a human pastes into the Seedance 2.0 API / Veo / Kling (and Codex CLI for the image step). It does **NOT** edit Grifon's in-app generation pipeline. The TUNED files `services/geminiService.ts`, `api/_lib/prompts.ts`, `api/_lib/renderPresets.ts`, and `types.ts` are off-limits — never touch them from this skill.
- **Adjacent skills (hand off, don't duplicate):** `grifon-cmo` owns the actual script/offer/funnel copy; `grifon-creative-director` owns finished-asset visual + preset lock; `viral-autopsy` analyzes competitor videos and feeds patterns. This skill turns an idea into a *shot prompt* and briefs those skills when copy or visual-lock is the real need.
- **Single shot vs full commercial:** this skill writes ONE shot (a hero shot, hook, b-roll, short ad). For a **multi-scene commercial** — a full script/treatment broken into a numbered, continuity-locked shotlist with an HTML production checklist — hand off to **`seedance-shotlist-director`**. Trigger words: "shotlist", "break this script into prompts", "5-scene ad", "storyboard this into Seedance prompts".
- **Lock assets first:** before prompting any video, build/freeze the character, product, and location references — see **`references/asset-prep.md`** (3-panel character sheets, multi-angle product sheets, 3/4 location plates, single-variable testing). Better assets beat longer prompts.

## Engine stack (know this before routing — see `references/seedance-4k.md`)

- **Seedance 2.0 = the 4K cinematic + b-roll engine for commercial ads** (hero product, cinematic spots, b-roll, scroll-stoppers, transformations). Unlocked at **Business tier**. It natively makes audio+video but **cannot speak Filipino/Tagalog** (supports EN/JA/ID/ES/PT only), and **blocks raw real-face uploads**.
- **Codex CLI (`gpt-image-2`) = the image step.** Generate asset sheets + first/last keyframes + on-screen text via the **`codex-image`** skill (billed to the ChatGPT plan, local-only), then feed Seedance/Kling as image-to-video.
- **Filipino/Tagalog talking avatars → the in-app avatar pipeline** (Veo + ElevenLabs voice), NOT Seedance. This skill still writes the talking *shot*, but the Filipino voice/identity is the app's job.
- **Kling** = image-to-video with explicit start→end frame interpolation.

## The 5 non-negotiable principles

Every prompt this skill produces obeys these, regardless of mode or style:

1. **Motion from frame one.** No static establishing holds. Camera and at least one element are already moving in the first second. For ads this matters double — a dead first frame loses the scroll.
2. **Three-layer depth.** Foreground, midground, background all populated; a human/character figure gives scale to anything large.
3. **Locked references.** When the user supplies a reference (`@image_1`, `<<<video_1>>>`, a product), the prompt states it matches 100%, names exactly what is preserved, and — for video composites — that nothing is re-graded, re-timed, or re-framed. See `references/structure.md` → Reference locking.
4. **Real physics and practical light.** Mass, gravity, inertia, contact shadows, surface tension, light from sources in the scene. No floating props, no flat light. For believable mass/momentum, prefer **image-to-video** (see `references/seedance-4k.md`).
5. **Safe by construction.** Write the scene so it never *needs* prohibited content. Load `references/content-policy.md` for any scene with conflict, creatures, crowds, destruction, weapons, or minors.

## Mode selector — pick one before writing

| Mode | Use when | What it adds on top of the cinematic engine |
|---|---|---|
| **CINEMATIC** | Pure visual: hero product shot, b-roll, scroll-stopper, cinematic reel, VFX test. No spoken sell. | Nothing extra — the Hollywood engine only. Default **16:9** (or 21:9 to stress-test). |
| **DIRECT-RESPONSE AD** | The shot must *sell*: UGC spokesperson, testimonial, founder-to-camera, offer/CTA spot. | A **HOOK FRAME** (first-3-second pattern interrupt), an optional spoken line, an offer/CTA beat, premium-Taglish register, and **9:16 mobile-first** by default. See `references/direct-response.md`. |

If the user is ambiguous, infer from the request and state the assumption in one line. A "hero shot" with no sell → CINEMATIC. Anything mentioning a hook, offer, CTA, audience, or platform → DIRECT-RESPONSE AD.

## Workflow

1. **Pick the mode** (above) and the **style/format** (see Quick format selector below; recipes in `references/styles.md`).
2. **Lock duration, aspect ratio, and target engine.** Oner (one unbroken take) vs multishot (hard cuts at stated times). Default length 15s; default aspect 16:9 for CINEMATIC, 9:16 for DIRECT-RESPONSE AD. Pick the engine from `references/seedance-4k.md`: **Seedance 2.0** for cinematic/b-roll/product/visual (the default, Business tier) — but **never for spoken Tagalog**; **in-app/Veo** for Filipino talking heads; **Kling** for explicit start→end image-to-video; **Codex (gpt-image-2)** for the first/last keyframe + on-screen text.
   - **Seedance prompts follow a formula and a brevity rule:** `Subject/Frame (Spatial) + Environment/Style + Camera + Temporal Action (with weight & force) + Audio/Sonic`, kept **under ~1000 words, key points first**. Use the compact template in `references/seedance-4k.md` for delivery; use the fuller 23-section vocabulary in `structure.md` only to *think through* the shot. Seedance also blocks real-face uploads — plan around a Codex (gpt-image-2) keyframe.
3. **For DIRECT-RESPONSE AD only:** lock the hook angle (named pain / curiosity gap / contrarian claim), the offer/CTA beat, and the language register *first* — per `references/direct-response.md`. Hand the *finished selling copy* to `grifon-cmo` if the user wants the script polished; this skill writes the shot, not the campaign.
4. **Load the relevant reference file(s)** before writing:
   - `references/structure.md` — the universal section vocabulary, ordering, and how to assemble a prompt. **Read this first, always.**
   - `references/styles.md` — per-style recipes (live-action, 3D animated, game, gameplay, FPV oner, product/commercial, VFX composite, kaiju, + Grifon ad styles).
   - `references/seedance-4k.md` — Seedance 2.0/4K technical doctrine and the Veo/Kling portability profiles.
   - `references/direct-response.md` — hook/offer/CTA, Taglish, platform/aspect presets (DR mode).
   - `references/content-policy.md` — safe-construction rules (any risk surface).
   - `references/asset-prep.md` — Step 1 asset-locking (character/product/location sheets) + Step 3 iteration discipline (granular choreography, micro-splicing). Lock assets before prompting.
   - `references/examples.md` — full worked Grifon ad prompts to pattern-match against.
5. **Write the prompt** following the chosen template and the output standard below.
6. **Deliver the prompt block directly** as one clean fenced block, with a one-line note on mode / engine / aspect / length and any assumption made. No padding.

## Output formatting standard

- Lead with a **STYLE line** (comma-separated descriptors or a `Style:` sentence), then the structured sections in canonical order (`references/structure.md`), then the shot-by-shot breakdown, then constraints/audio.
- **Shot/section breakdowns** carry explicit timecodes (`Shot 2 (0:05–0:10)`) for multishot; oners use beat timestamps inside one continuous paragraph (`0:04–0:05 — the jolt`).
- Mark cuts explicitly: `HARD CUT —` between sections, or `one take no cuts` for a oner.
- Put **AUDIO** near the end. Default `NO MUSIC. SFX ONLY — diegetic sound throughout.` unless the user wants score or spoken VO (DR mode often carries one spoken line).
- End multi-element prompts with **CONSTRAINTS** and/or **POSITIVE LOCKS** restating aspect ratio, reference fidelity, product/logo/color locks, and single-occurrence effects.
- State **aspect ratio and total length** every time.
- **DR mode** additionally appends a short **HOOK** line (the first-3s beat + any on-screen/spoken line) and a **CTA / END CARD** beat. Default 9:16.
- Keep prose dense and directive. No filler, no "the viewer feels", no marketing adjectives that don't change the render.

## Quick format selector

| User says… | Mode | Format | Engine | Key reference |
|---|---|---|---|---|
| "cinematic", "hero shot", "epic", live-action | CINEMATIC | Live-action cinematic, oner or multishot | Seedance | styles.md → Live-action |
| "product", "packshot", "ad for my product" | either | Product/commercial spot, macro cuts, packshot resolve | Seedance (Codex (gpt-image-2) frame) | styles.md → Product |
| "before and after", "transformation" | DIRECT-RESPONSE AD | Before/after | Seedance or Kling (i2v) | styles.md → Before/After |
| "scroll-stopper", "hook b-roll", "first 3 seconds" | DIRECT-RESPONSE AD | Scroll-stopper hook b-roll | Seedance | styles.md → Scroll-stopper |
| "UGC", "creator-style", "talking to camera selling" (Filipino) | DIRECT-RESPONSE AD | UGC spokesperson, 9:16 | **In-app/Veo** (not Seedance — Tagalog) | styles.md → UGC + direct-response.md |
| "testimonial", "talking head", "review" (Filipino) | DIRECT-RESPONSE AD | Testimonial talking-head | **In-app/Veo** (not Seedance — Tagalog) | styles.md → Testimonial |
| "founder", "me explaining", "story to camera" (Filipino) | DIRECT-RESPONSE AD | Founder-to-camera | **In-app/Veo** (not Seedance — Tagalog) | styles.md → Founder |
| "cartoon", "animated", "Pixar", talking creatures | CINEMATIC | 3D animated feature, multishot, dialogue | Seedance (EN/JA/ID/ES/PT only) | styles.md → Animated |
| "game", "HUD", "boss", third-person | CINEMATIC | Game-engine cutscene, persistent HUD | Seedance | styles.md → Game cutscene |
| "racing game", "gameplay" | CINEMATIC | Gameplay footage, locked rig, live HUD | Seedance | styles.md → Gameplay |
| "oner", "one take", "FPV", "POV" | either | Single continuous shot, beat timestamps | Seedance | styles.md → FPV/Oner |
| "add X to my clip", "make the creature come out of" | CINEMATIC | VFX composite on source video, input-locked | Seedance (native masking) | styles.md → VFX composite |
| "kaiju", "monster", "titan" | CINEMATIC | Creature/kaiju cinematic, original design | Seedance | styles.md → Kaiju |

**Tagalog rule:** Seedance can't speak Filipino/Tagalog. If the ad needs a Filipino *spoken* line, route the talking shot to the in-app/Veo pipeline; Seedance still carries any cinematic/b-roll/visual layer of the same campaign.

When nothing fits cleanly, compose from `structure.md` directly — the section vocabulary is universal.

## Hand-offs (state these when relevant)

- **→ `grifon-cmo`** when the user needs the actual selling *script/offer/funnel*, not just the shot. This skill writes one spoken line max; CMO writes the campaign.
- **→ `grifon-creative-director`** when the goal is a finished, brand-locked asset (preset, DESIGN.md compliance) rather than a generation prompt.
- **← `viral-autopsy`** when a competitor video is the source of inspiration — autopsy it first, then bring the extracted pattern here to turn into a reusable shot prompt.
