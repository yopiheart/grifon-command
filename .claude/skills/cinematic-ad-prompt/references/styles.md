# Style Recipes

Each recipe lists the distinguishing ingredients of that style. Build on top of the universal sections in `structure.md`. Recipes are starting points — combine and deviate freely. The first block is the **Hollywood cinematic** set (use mostly in CINEMATIC mode); the second block is the **Grifon direct-response ad** set (use in DIRECT-RESPONSE AD mode, with `direct-response.md`).

---

# Part 1 — Hollywood cinematic styles

## Live-action cinematic (epic / dramatic)
**Look:** 8K/4K photoreal, anamorphic widescreen, 35mm film quality, fine grain, professional grade, steadicam fluidity. Photoreal, NOT 3D/game.
**Camera:** orbiting/chasing as a second flyer or ground presence; whip-pans; handheld shake on impacts.
**Structure:** oner OR multishot. Epic scale wants crushing scale contrast — tiny figures vs vast subjects.
**Signature:** a "hook" event (a second giant creature, a near-collision) triggers one held slow-mo beat, then snaps back into a dive/chase.
**Lighting:** one warm accent in a cold world (amber bioluminescence in slate-blue storm) reads beautifully.
**Audio:** diegetic; roars, wind, thunder; slow-mo drops to muffled vacuum + heartbeat, snaps back with a sonic whoosh.

## 3D animated feature (Pixar-quality, with dialogue)
**Look:** vibrant glossy CGI, Pixar-quality stylized animation, subsurface-scattered fur/skin, expressive cartoon performance, dappled daylight, lush saturated palette, DOF mastery.
**Structure:** multishot montage — explicitly "Don't use one camera angle or single cut". 6 shots / 15s is the proven shape.
**Characters:** goofy, expressive, concrete designs. A tiny background character in foreground ferns adds depth and comedy.
**Dialogue:** each shot can carry a spoken line in quotes with the delivery described ("bursting with excitement he says:"). Short and characterful.
**Camera per shot:** vary deliberately — push-in, close-up, wide, tracking, insert, wide. Name the move each time.
**Comedy beat:** land a visual gag and a sheepish button line.

## Game-engine cutscene (third-person, persistent HUD)
**Look:** AAA video-game cinematic, Unreal Engine 5 real-time render, Lumen GI, Nanite micro-geometry, screen-space reflections. Hyperreal but unmistakably GAME-RENDERED — NOT live-action, NOT film.
**Camera:** virtual game-cinematic camera, third-person over-the-shoulder, 180° shutter motion blur, game-cutscene DOF.
**Structure:** multishot, hard cuts, 3 shots / 15s typical. Default NO slow-mo; speed-ramp only on the one or two big beats.
**HUD LAYER — the defining feature.** Flat 2D screen-space UI in a locked accent hex, screen-PINNED on every shot (does NOT parallax; numbers may tick, layout locked). Enumerate every element with exact text/position — compass bar, minimap, quest log, level/XP/HP/stamina bars, hotbar, ammo + currency, diegetic `[E] PROMPT`. Boss bar fades in on the reveal.
**Constraints:** HUD legible/consistent in EVERY shot; contact shadows on debris; creature scale locked; NO eye glow.

## Gameplay footage (arcade, locked rig, live HUD)
**Look:** AAA arcade gameplay (Forza/NFS). Hyper-saturated, glossy, high-contrast real-time render, crisp pinned UI. Gameplay, NOT a film plate.
**Camera:** classic third-person chase-cam, rock-steady, locked to the vehicle; ultra-wide; heavy speed-blur on the world, subject razor-sharp. No handheld, no chase-breaking cuts.
**Structure:** multishot but pure gameplay cam, 3 shots / 15s. NO slow-motion — constant full speed.
**HUD:** live racing UI pinned to screen — RPM gauge, climbing speedometer, gear number, BOOST bar, mini-map with hazards, lap timer, position. Flat on screen, never in the 3D world.

## FPV / POV oner (single continuous take)
**Look:** single continuous shot, one take no cuts, cinematic FPV/POV oner, 4K ultra-detailed, photoreal macro, anamorphic, fluid drone/quadcopter flight.
**Camera:** the camera IS a flying/first-person presence. POV: clean human vision, NO helmet/HUD, hands at bottom of frame, organic micro-tremor. FPV drone: dives into texture, brushes close against surfaces, never stops, never pulls up or back.
**Structure:** ONE unbroken paragraph, beats by timestamp. Only speed change is a named jolt/strike → slow-mo (240fps) → snap back to real-time (24fps). State the fps numbers.
**Audio:** diegetic; during slow-mo ambient wind drops to muffled vacuum + amplified rhythmic sound, then a sonic whoosh as reality snaps back.

## Product / commercial spot
**Look:** 8K/4K photorealistic editorial commercial, cinematic and moody, deep black crush, per-character/per-section color worlds.
**Structure:** multishot, many short sections (8–10), HARD match-cuts on action. Often one named transition (a FILM BURN) and otherwise all hard cuts. Resolves on a HERO PACKSHOT.
**Sections:** intercut human interaction with the product + rapid macro product montage (0.3s cuts, strobe flash on each). Each character gets their own color/light world.
**Product lock:** products match the reference arrangement exactly; logos read exactly as named and stay sharp; product colors locked. Restate in POSITIVE LOCKS.
**Packshot:** product in one third, clean dark negative space in the rest, slow dolly-in, particle drift (gold dust), micro-bounce settle, hold.
**Physics:** surface tension on drops, cream spreads with weight, droplets bead, dust falls under gravity, correct contact shadows.

## VFX composite on a source video (input-locked)
**Look:** 8K/4K cinematic, photorealistic — NO 3D render, NO game engine. Practical creature-FX realism: pore-level wet translucent dermis, visible capillaries, slick film. Composition and grade INHERITED from `<<<video_1>>>`.
**Core rule — INPUT LOCK:** the entire source clip is preserved UNCHANGED. List every plate element (desk, devices, lighting, figures, grade, the exact handheld move with framing/focal length/shake/timing). Do NOT re-grade, re-time, smooth, or re-frame. ONLY additions are the new element + the light it casts + contact shadows + any wet film + the host object's slight reaction.
**Camera:** INHERIT the source camera exactly. The added element is parallax-locked to its anchor plane; correct occlusion. Native auto-masking (no green screen) — describe the anchor object the model masks against.
**Constraints:** match source duration exactly; NO slow-motion; NO eye glow; no CG/game look; scale anchored to a real object in the plate.

## Kaiju / creature cinematic (original design)
**Look:** 8K/4K photoreal, anamorphic, original-creature blockbuster grade, fine grain, hyperdetailed.
**Structure:** sequence of cuts (often 6), may use OPTICS per-cut. Slow-motion on one beat only (the breach). Motion accelerating from stillness into combat.
**Character design:** ORIGINAL, not based on any franchise — describe hide, eye, fins, tentacles, mantle concretely.
**Continuity — critical:** the SAME creature/eye/environment across all cuts; the detail that opens CUT 1 (a closed eye) is the exact one zoomed in CUT 2. State this and tell the model not to lose it.
**Containment rule:** keep action within a believable envelope (the fight STAYS at the sea surface — breach, dive, grapple, submerge, but NEVER fly into the air).
**Physics:** true mass and fluid dynamics — breach displaces a wall of water, dive collapses water inward, droplets cling to the lens.

---

# Part 2 — Grifon direct-response ad styles

All DR styles default to **9:16 mobile-first**, keep the subject/action in the top two-thirds (caption-safe zone at the bottom), open on a **HOOK FRAME** at 0:00, and resolve on a **CTA / END CARD**. Pull hook angle, register, and CTA rules from `direct-response.md`. Keep one spoken line max — hand fuller scripts to `grifon-cmo`.

**Engine routing (see `seedance-4k.md`):** the *visual* DR styles — **product hero, before/after, scroll-stopper** — render on **Seedance 2.0** (4K, Business tier; no real faces — use a Codex (gpt-image-2) keyframe; audio synced; weight & force in the motion). The *Filipino spoken* DR styles — **UGC spokesperson, testimonial, founder-to-camera** — are **NOT Seedance** (it can't speak Tagalog); they go to the **in-app/Veo** avatar pipeline. This skill still writes the talking *shot*; the Filipino voice/identity is the app's job. (Seedance *can* speak EN/JA/ID/ES/PT if a non-Tagalog VO is ever wanted.)

## UGC spokesperson (creator-style, selling to camera)
**Engine:** in-app/Veo (Filipino spoken) — NOT Seedance.
**Look:** authentic raw-to-polished UGC — handheld phone realism, natural window light, slightly imperfect framing, real skin texture (NOT glossy/CGI, NOT studio-perfect). Photoreal.
**Subject:** one relatable creator/spokesperson (Bryan/Olivia archetype — see `direct-response.md`) talking straight to lens, holding/using the product.
**Camera:** mostly locked phone-at-arms-length with organic micro-tremor; one gentle push-in on the hook line. Avoid Hollywood moves — this must read as a real person, not a commercial.
**Hook frame (0:00):** the spokesperson already mid-sentence on a named pain or curiosity gap; or a quick visual disruptor (product slammed on table, hands-up "stop scrolling" gesture). Frame-0 = mouth already moving (Veo Frame-0 rule, see `seedance-4k.md`).
**Beat arc:** hook → quick demo/use of product → one-line proof of outcome → CTA.
**Audio:** one spoken line (premium Taglish or English per register), light room tone, NO music bed unless asked.

## Testimonial / talking-head (review-style)
**Engine:** in-app/Veo (Filipino spoken) — NOT Seedance.
**Look:** warm, credible, lightly polished — a real customer in a real space (home, shop, café). Photoreal, NOT studio glam.
**Subject:** one person recounting a result, product visible nearby or in hand. Original/anonymous person; no fake reviewer badges (see `content-policy.md`).
**Camera:** seated medium close-up, very gentle dolly-in over the line; soft practical key from a window.
**Hook frame (0:00):** open on the most surprising line mid-delivery ("I almost didn't try this…"), not an intro.
**Beat arc:** surprising line → the specific change → product as the reason → soft CTA.
**Constraint:** outcome stays plausible/generic; no on-screen clinical or earnings claim.

## Product hero / packshot for SMB
**Engine:** Seedance 2.0 (4K, Business tier), image-to-video from a Codex (gpt-image-2) keyframe (no real faces; accurate label/text). Audio synced to the key beat; weight & force in the motion ("serum beads and rolls with viscous weight", not "serum drips").
**Look:** 4K editorial commercial, premium but grounded for an SMB product (food, supplement, skincare, gadget, apparel). Deep but not pretentious; one accent color world from the packaging.
**Structure:** short oner or 3 fast macro cuts resolving on the hero packshot. Image-to-video from a real product photo for accurate label/physics.
**Camera:** macro probe-lens, snap-rack focus, slow dolly-in on the packshot; particle drift; micro-bounce settle.
**Product lock:** label/logo/color match the reference 100% and stay sharp (POSITIVE LOCKS). Front of pack faces camera.
**Physics:** real surface behavior (steam off coffee, serum bead, fabric weight, condensation), correct contact shadows.
**CTA:** clean end card or product-in-hand; one action; no price.

## Founder-to-camera (story / authority)
**Engine:** in-app/Veo (Filipino spoken) — NOT Seedance.
**Look:** intimate, authentic, slightly cinematic — the founder in their actual workspace. Photoreal, warm practical light.
**Subject:** the founder speaking one honest line to camera (origin, mission, or a contrarian claim). Authority via realness, not a suit-and-studio.
**Camera:** medium shot, gentle handheld breathe, one slow push-in on the key line.
**Hook frame (0:00):** a contrarian/curiosity line already mid-delivery, or a quick environmental disruptor (founder turning to camera from work).
**Beat arc:** contrarian hook → the "why" → the offer's promise → invite CTA.

## Before / after transformation
**Engine:** Seedance 2.0, or Kling for explicit start→end frame interpolation (Codex (gpt-image-2) keyframes; no real faces). Sync the cut to a beat ("clutter ambience drops to a calm tone on the match-cut").
**Look:** honest, relatable, two clearly-different states of the same subject/space/product. Photoreal.
**Structure:** a single match-cut or wipe between BEFORE and AFTER (state it happens once), or split-screen oner. Keep it plausible — no fabricated clinical result.
**Camera:** identical framing on both states so the change reads instantly; gentle push-in on the AFTER.
**Hook frame (0:00):** open ON the BEFORE pain state, already in motion, with the disruptor question.
**Beat arc:** before (pain) → the turn → after (outcome) → CTA.
**Constraint:** transformation must be believable and the same subject; no fake numbers (see `content-policy.md`).

## Scroll-stopper hook b-roll (no face)
**Engine:** Seedance 2.0 (4K). Lean on weight & force ("thick honey pours with viscous weight and stretches before impact") and audio-visual sync (the SFX hits exactly on the physical event). Often image-to-video from a Codex (gpt-image-2) frame.
**Look:** hyper-real 4K macro / kinetic b-roll designed purely to stop the thumb in the first second. Photoreal, micro-texture forward.
**Structure:** a 3–6s oner or 2 hard cuts; the *whole clip* is the hook (often pairs with a CMO voiceover or caption added later).
**Camera:** crash-zoom or fast macro push into a satisfying physical event (pour, crack, bloom, slam, ignition) with real physics.
**Use:** the visual disruptor that opens a longer ad, or a standalone pattern-interrupt. Hand the caption/VO to `grifon-cmo`.
**Audio:** punchy diegetic SFX on the event; silence around it reads premium.

---

# Part 3 — Motion design (graphic / kinetic — NOT photoreal)

A distinct format from the live-action styles above: **animated brand graphics** — logo reveals, kinetic typography, brand stings, animated explainers, product-launch energy. The look is **graphic, designed, and kinetic — explicitly NOT photoreal** (no pore-level skin, no live-action grade). It uses its **own style prefix** (bold typography, clean vector/3D, a locked brand color system, motion blur/freeze, kinetic energy) — do not apply the photoreal Seedance doctrine here. Engine: **Seedance 2.0** animates from a **Codex (gpt-image-2)** logo / keyframe / storyboard. No real faces; audio = SFX/score, no spoken Tagalog. Every motion ad ends on a **logo-lock**.

**Pick the energy (classicMD vs highMD):**
- **classicMD — smooth & elegant** (digital products, brand promos, service presentations, logo reveals, atmospheric). Smooth transitions, elegant typography, cinematic camera moves, restrained palette. The logo can open, close, or both.
- **highMD — hyper / kinetic** (physical products, tech/launch, sports, music, fashion drops). Fast cuts, extreme camera speed, aggressive match-cuts, peak-action freeze frames (frozen splash, shattered glass, material stretch), neon/contrast, CGI energy. **No realistic humans — use silhouettes, chrome figures, or 3D abstract shapes.**

**Logo-lock (mandatory outro).** End on a static hold of the brand name/logo, proportional to length: **~1s for 5s · ~2s for 10s · ~2–3s for 15s.** Build it into the prompt explicitly (a hard stop for highMD; an elegant settle for classicMD).

**Structure.** 6 / 8 / 9 beats (opening → build → climax → resolution → logo-lock). Each beat: camera position, subject/typography state, motion blur or freeze. For previz, generate **one storyboard grid sheet** (single Codex image, N labelled panels — see `asset-prep.md`) before rendering.

**Compact Seedance prompt shape (motion design):**
```
STYLE: [classicMD smooth motion design | highMD high-intensity kinetic motion], graphic/animated — NOT photoreal, NOT live-action. Brand color system: [colors].
SUBJECT/FRAME: [logo / wordmark / product silhouette]; inherit the locked logo from @image_1 100%.
MOTION (beats): [beat-by-beat — e.g. "wordmark assembles letter by letter, light sweep, camera push"]; [classic: elegant transitions | hyper: aggressive match-cuts + freeze frames]. Weight & force on every move.
AUDIO: SFX/score synced to the beats; impact hit on the logo-lock. No speech.
LOGO-LOCK: final [~1–3s] static hold on "[brand]" wordmark, clean.
TECH: native 4K, 10-bit, [aspect], [duration]. No real faces. Model: Standard.
```

---

## Composing a new style
If the request matches nothing above, build from `structure.md` directly:
1. Pick the render look and state what it is (and is NOT).
2. Choose mode (CINEMATIC vs DIRECT-RESPONSE AD), then oner vs multishot.
3. Decide the camera language and one signature move.
4. Populate three depth layers and a scale figure.
5. Lock any reference and the product.
6. Add physics + practical light + audio.
7. For DR: add the HOOK FRAME and CTA beats.
8. Run the discipline checklist. The section vocabulary carries any genre.
