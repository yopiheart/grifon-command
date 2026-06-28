# Worked Examples — Grifon ad prompts (copy-paste)

Complete prompts to pattern-match against. Each notes **mode / engine / aspect / length** on its first line. Templates, not the only shapes — adapt freely. Products shown are placeholders (coffee, serum, app); swap in the real reference.

**Engine reminder (see `seedance-4k.md`):** **Seedance 2.0** renders the cinematic/b-roll/product/visual examples (#1, #4, #5, #7) in 4K (Business tier) — it **can't speak Tagalog** and **blocks real-face uploads**, so any person comes from a **GPT Image 2** keyframe. **Filipino spoken** examples (#2, #3, #6) route to the **in-app/Veo** avatar pipeline, not Seedance. Seedance prompts stay **under ~1000 words, formula-first** (`Subject/Frame + Environment + Camera + Temporal Action + Audio`); the dense section layout below is fine as long as it stays tight — #7 shows the compact formula shape.

---

## 1) Product hero — coffee bag (CINEMATIC · Seedance 2.0 4K · 16:9 · 12s)

```
STYLE: 4K photorealistic editorial coffee commercial, cinematic and moody, deep black crush, single warm amber accent world, fine grain, anamorphic. NOT 3D render, NOT game engine.
SCENE CONTEXT: 12s product film, 3 hard macro cuts resolving on a hero packshot. 16:9.
ACTIVE REFERENCES: @image_1 — the coffee bag, front label facing camera, logo and color 100% match the reference and stay razor-sharp. Image-to-video: drive physics from this frame.
FORMAT MODE: Timed multishot, HARD CUTs on action. Camera never cuts on its own.
LIGHTING: low-key, single warm key at ~3200K raking from frame-left, soft amber rim, volumetric steam catching light. Deep shadow fills the negative space.
COLOR: 60 near-black / 30 roasted brown / 10 amber accent. 10-bit, no banding in the steam.
CAMERA: macro probe-lens. Cut 1 crash-zoom into beans; Cut 2 snap-rack focus across the label; Cut 3 slow dolly-in on the packshot.
MATERIAL/SURFACES: oily bean sheen, paper-matte bag texture, micro condensation on a cup, steam wisps.
PHYSICS: beans tumble with real weight and contact shadows; steam rises and curls under air currents; no floating props.
COMPOSITION: three-layer depth — foreground beans, midground bag, background soft bokeh. Motion from frame one.
ACTION / SHOT BREAKDOWN:
SHOT 1 (0:00–0:04) — macro crash-zoom: roasted beans cascade into frame and settle with weight, oil catching the amber key. Hard cut.
SHOT 2 (0:04–0:08) — snap-rack focus tracking left across the bag: front label resolves tack-sharp, steam drifts past. Hard cut.
SHOT 3 (0:08–0:12) — slow dolly-in, packshot: bag stands in the left third, gold-dust particle drift in the dark negative space, micro-bounce settle, hold clean to the last frame.
TECHNICAL: native 4K, 10-bit, "High" bitrate, 24fps, 180° shutter, no jitter/aliasing. 16:9. 12s.
AUDIO: NO MUSIC. SFX ONLY — bean rattle, soft pour, a low ambient bass drone.
CONSTRAINTS: 16:9; label/logo/color locked to @image_1 and sharp; front of bag faces camera; no slow-motion; final second holds opaque.
POSITIVE LOCKS: bag label reads exactly as @image_1; bean color and bag color do not shift; one packshot, one hold.
```

---

## 2) UGC spokesperson — skincare serum (DIRECT-RESPONSE AD · In-app/Veo, Filipino talking — NOT Seedance · 9:16 · 10s)

```
STYLE: authentic UGC, handheld phone realism, natural window light, real skin texture with visible pores, slightly imperfect framing. Photoreal — NOT glossy, NOT studio, NOT CGI.
SCENE CONTEXT: 10s mobile selfie ad, one continuous talking shot. 9:16, subject in top two-thirds, bottom 20% caption-safe.
ACTIVE REFERENCES: @image_1 — the serum bottle, green, label 100% matches and stays sharp when held to camera.
FORMAT MODE: ONE CONTINUOUS TAKE, no cuts.
SUBJECT: a relatable Filipina creator (late 20s–30s, "Olivia/Bryan peer", not a model) talking straight to lens, holding the serum.
HOOK FRAME (0:00): she is ALREADY mid-sentence (Veo Frame-0: mouth in motion, first word forming) — named-pain hook: "Puro tagong pimple, di mo alam kung bakit?" Quick, direct, no intro.
CAMERA: phone at arm's length, locked with organic micro-tremor; one gentle push-in starting on the first syllable. No rack focus, no shake beyond natural hold.
ACTING: warm, conviction, natural micro-pauses; she glances at the bottle then back to lens.
ACTION / BEATS (oner): 0:00–0:03 hook line mid-delivery, holds bottle up. 0:03–0:07 quick swipe of serum on cheek, "Ito lang ginagamit ko gabi-gabi." 0:07–0:10 turns face to show fresh skin, lands CTA: "Try it — link's below."
CTA / END CARD: spoken "Try It Free" energy; product in hand; no price on screen.
TECHNICAL: 4K, 10-bit, "High" bitrate, 24fps. 9:16. 10s. End on next breath, not a neutral pose; avoid cross-dissolve, ghosting, fade in final second.
AUDIO: one spoken line in premium Taglish, light room tone, NO music bed.
CONSTRAINTS: 9:16; one register (Taglish) held throughout; opening words ≤2 English to keep the Filipino accent; serum label locked to @image_1; no fabricated results; no price.
POSITIVE LOCKS: same person throughout; serum stays green; one CTA.
```

---

## 3) Testimonial talking-head — coaching/service (DIRECT-RESPONSE AD · In-app/Veo, Filipino talking — NOT Seedance · 9:16 · 12s)

```
STYLE: warm credible testimonial, real customer in a real home/café, lightly polished. Photoreal, NOT studio glam.
SCENE CONTEXT: 12s talking-head, one shot. 9:16, caption-safe bottom.
FORMAT MODE: ONE CONTINUOUS TAKE, no cuts.
SUBJECT: an anonymous real-seeming small-business owner (Bryan archetype), seated, mug nearby.
HOOK FRAME (0:00): mid-delivery on the surprising line — "Honestly, akala ko scam 'to…" (Veo Frame-0, mouth already moving). No intro, no name card.
CAMERA: seated medium close-up, very gentle dolly-in over the line; soft practical key from a window frame-right.
ACTING: candid, slightly self-deprecating, believable; one beat of a relieved smile.
ACTION / BEATS: 0:00–0:04 surprising line. 0:04–0:08 the specific change ("first week, may dalawang client ako"). 0:08–0:12 attributes it to the tool, soft CTA glance to camera.
CTA / END CARD: soft spoken invite ("Subukan mo, free naman mag-start"); no badge, no price.
TECHNICAL: 4K, 10-bit, "High" bitrate, 24fps. 9:16. 12s. Clean end on a breath; no fade/ghosting in final second.
AUDIO: one Taglish spoken line, faint room tone, NO music.
CONSTRAINTS: 9:16; one register; outcome stays plausible/generic — NO on-screen earnings claim, NO fake reviewer badge; no price.
POSITIVE LOCKS: same person; honest framing; one CTA.
```

---

## 4) Before / after transformation — cluttered vs clean workflow (DIRECT-RESPONSE AD · Kling i2v · 9:16 · 8s)

```
STYLE: honest relatable transformation, photoreal, two clearly-different states of the same desk/screen. Single match-cut.
SCENE CONTEXT: 8s, BEFORE → one match-cut → AFTER. 9:16, identical framing both states so the change reads instantly.
ACTIVE REFERENCES: @image_1 — BEFORE frame (cluttered desk, 12 browser tabs, sticky notes). @image_2 — AFTER frame (same desk, one clean Grifon dashboard). Both 100% match; Kling start-frame → end-frame interpolation.
FORMAT MODE: Timed, ONE hard match-cut at 0:04. Camera does not cut otherwise.
HOOK FRAME (0:00): open ON the BEFORE pain — hands gripping head over the cluttered desk, already in motion; on-screen energy of "Gabi na, di pa tapos sa content?"
CAMERA: locked identical frame on both states; gentle push-in on the AFTER.
PHYSICS: papers and clutter settle with weight; screen glow lights the face; correct contact shadows.
ACTION / BEATS: 0:00–0:04 BEFORE, the overwhelm, hands-up. HARD MATCH-CUT — 0:04–0:08 AFTER, same desk now calm, one clean dashboard, relieved exhale; CTA card resolves.
CTA / END CARD: "Try It Free" lockup, gold on near-black; product on screen; no price.
TECHNICAL: 4K, 10-bit, "High" bitrate, 24fps. 9:16. 8s. Negative prompt: avoid morphing, melting, glitching, extra limbs, watermark, subtitles, ghosting, fade-out; final second holds clean and opaque.
AUDIO: NO MUSIC. SFX — cluttered ambience drops to a calm tone on the cut.
CONSTRAINTS: 9:16; same desk/person both states; transformation believable, NO fabricated numbers; one match-cut only; no price.
POSITIVE LOCKS: identical framing before/after; one CTA; brand lockup on-brand (gold/zinc).
```

---

## 5) Scroll-stopper hook b-roll — satisfying macro (DIRECT-RESPONSE AD · Seedance 2.0 4K · 9:16 · 4s)

```
STYLE: hyper-real 4K macro scroll-stopper, micro-texture forward, single satisfying physical event. Photoreal — NOT 3D, NOT game.
SCENE CONTEXT: 4s pure pattern-interrupt b-roll (caption/VO added later by grifon-cmo). 9:16.
FORMAT MODE: ONE CONTINUOUS TAKE, no cuts.
HOOK FRAME (0:00): the event is ALREADY in motion at frame 0 — a thick golden honey-pour mid-fall toward a surface (or your product's signature physical moment). No empty lead-in.
CAMERA: fast macro push-in following the pour; ends in a tight hold on the impact bloom.
MATERIAL/SURFACES: viscous sheen, surface tension, micro-bubbles, light refracting through the stream.
PHYSICS: real viscosity and mass — the pour stretches, lands, and blooms with weight; droplets bead; correct contact shadows. Drive from an image for accurate fluid behavior.
COMPOSITION: subject center / top two-thirds, bottom 20% clean for captions. Three-layer depth via shallow DOF.
ACTION / BEATS: 0:00–0:02 pour falls and stretches; 0:02–0:04 impact bloom ripples outward, holds clean.
TECHNICAL: native 4K, 10-bit, "High" bitrate, 24fps, no banding in the highlights. 9:16. 4s.
AUDIO: NO MUSIC. SFX — one crisp diegetic pour/impact; silence around it.
CONSTRAINTS: 9:16; no text on screen (added later); no slow-motion; final second holds opaque.
POSITIVE LOCKS: one event, one clean hold.
```
Hand-off: bring this to `grifon-cmo` for the overlay hook + CTA, or stitch it as the 0–4s opener of a longer ad.

---

## 6) Founder-to-camera — authority/story (DIRECT-RESPONSE AD · In-app/Veo, Filipino talking — NOT Seedance · 9:16 · 12s)

```
STYLE: intimate authentic founder shot, real workspace, warm practical light, lightly cinematic. Photoreal.
SCENE CONTEXT: 12s, one talking shot. 9:16, caption-safe bottom.
FORMAT MODE: ONE CONTINUOUS TAKE, no cuts.
SUBJECT: the founder (relatable, not suited-up) speaking one honest contrarian line to camera in their office.
HOOK FRAME (0:00): mid-delivery contrarian hook (Veo Frame-0, mouth moving) — "Stop paying ₱30K agencies na parang client #47 ka lang." Turning from work to lens.
CAMERA: medium shot, gentle handheld breathe; one slow push-in on the key line.
ACTING: conviction, eye contact, a micro-pause before the promise.
ACTION / BEATS: 0:00–0:04 contrarian hook. 0:04–0:08 the "why" (built this so SMBs make ads that actually convert). 0:08–0:12 the promise + invite CTA.
CTA / END CARD: spoken "Try It Free"; clean gold-on-zinc lockup; no price.
TECHNICAL: 4K, 10-bit, "High" bitrate, 24fps. 9:16. 12s. Clean end on a breath; no fade/ghosting final second.
AUDIO: one spoken line (premium Taglish), light room tone, NO music.
CONSTRAINTS: 9:16; one register; addresses Bryan; outcome-before-feature; no price; honest claims only.
POSITIVE LOCKS: same person; one CTA; on-brand lockup.
```

---

## 7) GPT Image 2 keyframe → compact Seedance shot — energy drink (CINEMATIC · GPT Image 2 + Seedance 2.0 4K · 9:16 · 6s)

The two-step Seedance workflow: generate the first frame with GPT Image 2 (accurate label/text, no real faces), then drive a short 4K Seedance shot from it using the **compact formula** (under ~1000 words, formula-first, weight & force, audio synced).

**Step A — GPT Image 2 (first frame):**
```
A photoreal 9:16 product hero still: a frost-covered matte-black energy-drink can centered on wet slate, condensation beading, single cold-blue rim light against deep near-black, shallow depth of field, premium editorial commercial look, 4K detail. The can label reads exactly "VOLT" in clean bold type, razor-sharp and correctly spelled. No people, no hands, no real faces. Leave the bottom 20% clean for captions.
```

**Step B — Seedance 2.0 (image-to-video from the frame above):**
```
STYLE: 4K photoreal energy-drink commercial, cold-blue accent, deep black crush. NOT 3D, NOT game.
SUBJECT/FRAME (Spatial): the frost-covered "VOLT" can from the first frame — inherit can, label (reads exactly "VOLT", sharp), lighting and grade 100%; generate motion only.
ENVIRONMENT/STYLE: wet slate, cold-blue rim, deep negative space. 10-bit color, no banding in the haze.
CAMERA: slow macro push-in, slight orbit to camera-right.
TEMPORAL ACTION (Motion): condensation droplets slide down with real weight and surface tension; a thin vapor curl rises and drifts; one droplet falls and beads on the slate with a small settle. No floating; correct contact shadows.
AUDIO/SONIC: faint cold hiss + low bass drone; at the moment the droplet hits the slate, a crisp tick SFX. No music. No speech.
TECH: native 4K, 10-bit, "High" bitrate, 24fps. 9:16. 6s. No real faces. Model: Standard.
CONSTRAINTS: 9:16; label reads exactly "VOLT" and stays sharp; can color/finish locked; bottom 20% caption-safe; no slow-motion; final second holds opaque.
```
Note how the Seedance block is short, follows the formula order, names weight & force, syncs the SFX to a visual beat, and relies on the GPT Image 2 frame instead of any real-face upload.

---

### Using these
1. Copy the closest example, swap the product/reference/hook, keep the section order.
2. Re-run the discipline checklist (`structure.md`) + the DR pre-flight (`direct-response.md`).
3. Pick the engine per `seedance-4k.md`: Filipino spoken → in-app/Veo (NOT Seedance); cinematic/b-roll/product/realism → Seedance 2.0 4K; explicit start→end i2v → Kling; first/last frame + text + faces → GPT Image 2.
4. Need the full campaign/script? Hand the shot to `grifon-cmo`. Need it brand-locked as a finished asset? `grifon-creative-director`.
