# Zam master reference rebuild — 3 eye-level options (2026-07-27/28)

**Why:** Zam sent a real photo, Neil did not approve it (pangit). Decision: stop
waiting for her to send a good shot — **rebuild the reference ourselves** from the
saved anchors, and use the AI-generated frame as Zam's working reference image for
content + ads (must still read 99% real).

## How these were made

Dual-anchor `gpt-image-2` **edit mode** via the `codex-image` bridge — built on her
actual pixels, not text-gen. Both anchors passed on every call:

- Image 1 (identity): `../generate-zam-images/assets/zam-face-reference.jpg`
- Image 2 (body integration): `../generate-zam-images/assets/zam-approved-scene-reference.png`

```bash
node .claude/skills/codex-image/generate.mjs \
  --out .tmp/zam-master/<name>.png --size 1024x1536 \
  --edit workflows/believability-samples/generate-zam-images/assets/zam-face-reference.jpg \
  --edit workflows/believability-samples/generate-zam-images/assets/zam-approved-scene-reference.png \
  --prompt "<see below>"
```

Blueprint followed: [`../generate-zam-images/references/prompt-blueprint.md`](../generate-zam-images/references/prompt-blueprint.md).
All three are **strict eye level** (lens at her eye height — no selfie tilt, no low angle),
1024x1536 vertical, no text/logos.

## The 3 options

| File | Register | Use |
|---|---|---|
| ~~`opt-A-raw-ugc.png`~~ | Raw UGC — friend-taken, home interior, window light, waist-up | **DELETED 2026-07-28 (Neil: hindi pasado).** Recipe text below stays reusable. |
| ~~`opt-B-outdoor-candid.png`~~ | Outdoor candid — Manila sidewalk, overcast, mid-step turn-back | **DELETED 2026-07-28 (Neil: hindi pasado).** Recipe text below stays reusable. |
| `opt-C-presenter.png` | Presenter — seated, home content corner, talking-to-camera, chest-up | Ads / the future avatar plate + Veo talking-head anchor |

**STATUS: ✅ Option C (presenter) APPROVED — Neil, 2026-07-28 (remote session).**
`opt-C-presenter.png` is the new Zam master reference. It is registered as the
optional third anchor in `generate-zam-images/SKILL.md` (per its own rule: "If the
user approves a newer image as the master, add it as an optional third reference").
Options A and B were kept briefly as unapproved registers, then **deleted 2026-07-28
(Neil: hindi pasado)** — their scene-recipe text below remains reusable; images
recoverable from git history.

### Shared prompt spine (reused in all 3)

> IDENTITY: the same recognizable adult Filipina woman in the two inputs (Image 1 =
> raw face/identity anchor, Image 2 = approved body-integration anchor). Preserve her
> face shape, high forehead, dark-brown almond eyes, natural full brows, straight nose,
> soft full lips, softly rounded jawline, warm light-tan skin, and her black
> shoulder-length layered hair with slightly wispy ends. Allow natural variation from
> expression, head angle, lens and light.
>
> CAMERA: strict EYE LEVEL — lens exactly at her eye height, horizon through her eyes,
> no downward selfie tilt and no low angle.
>
> INTEGRATION: head, neck, shoulders, torso and arms are ONE coherent person from the
> start. Correct adult head-to-body scale, natural jaw-to-neck transition, soft chin
> shadow, realistic collarbone and shoulder slope, hair strands overlapping ears and
> collar, identical skin tone, pore texture, sharpness, grain and compression across
> face, neck and hands.
>
> IMAGE CHARACTER: authentic uncorrected phone exposure, visible pores and fine facial
> hair, individual flyaway strands, real fabric texture, mild sensor noise and JPEG
> compression, one small framing imperfection.
>
> AVOID: face-swap or pasted floating head, oversized head, hard jaw cutout, mismatched
> face-vs-body colour or sharpness, rigid passport expression, generic influencer face,
> beauty-filter smoothing, HDR, cinematic grading, studio lighting, warped anatomy,
> extra fingers, text, logos, watermark.

Per-option deltas (scene / pose / wardrobe / light):

- **A — raw UGC:** standing, body 15° off camera, small closed-mouth almost-smile, one
  hand holding opposite forearm. Cream ribbed knit zip sweater over white tee, small
  silver chain. Ordinary Filipino home interior — off-white scuffed wall, edge of grey
  sofa + folded blanket lower-left, outlet and cable behind. Soft late-afternoon window
  daylight from camera-left. Bare-face / almost no makeup.
- **B — outdoor candid:** caught mid-step on a sidewalk, turning her head back as if
  someone said her name, hand on a canvas tote strap. Oversized white cotton shirt,
  sleeves pushed up, dark jeans. Metro Manila street — cracked pavement, tangled overhead
  wires, jeepney + motorbikes soft behind, sari-sari storefront far background. Bright
  overcast midday, no hard shadow. Light everyday makeup.
- **C — presenter:** seated on a wooden chair, torso 20° off axis with face back to lens,
  lips parted mid-sentence, direct warm eye contact. Sage-green ribbed knit top, small
  gold studs. Home content corner — plain warm-grey wall, sliver of wooden shelf + plant
  leaf blurred far right. Soft window daylight 45° camera-left, **no ring-light look**.
  Clean natural makeup, skin still reads as skin.

## Dusk register — the "polished ads pero 99% real" brief (DECODED 2026-07-28)

Neil's brief: *"feeling maganda rin to for ads/content, parang pasok sya sa polished ads
pero make sure 99% real parin sya."* The Google Doc reference
(`https://docs.google.com/document/d/1rjRBiqYyVmbafUaCYejMmA9LtvfqoE02lGSW6V58ozk/mobilebasic`)
was fetched via the Drive connector on 2026-07-28. Banked verbatim so no session ever
needs the link again:

> **Dusk Effect Prompt** (Image Model: Nano Banana Pro)
>
> Ultra-realistic clouds at dusk, with no visible sun, just a natural sky gradient from
> golden yellow and soft orange on the horizon to pink, lavender, and deep blue overhead.
> Keep the sky about 20% darker while keeping the people and foreground well-lit with
> natural lighting and details. Add soft atmospheric haze, cinematic HDR, smooth tonal
> transitions, rich natural green tones, subtle blooms, DSLR quality, premium landscape
> photography, 8K, photorealistic, natural look without AI.

**Register decode:** premium dusk-light DSLR photography wrapped around a real-looking
Zam. The polish lives in the SKY and the light (gradient dusk sky, ~20% darker than the
subject, haze, subtle bloom, smooth tonals); the 99%-real lives in the SUBJECT (pores,
flyaways, real fabric, no beauty-filter smoothing, no over-HDR on skin). That split is
the whole trick — cinematic language is scoped to the environment, never the face.

## The 3 dusk options (D/E/F) — GENERATED 2026-07-28 (cafe PC), verdict below

⚠ Needs the cafe PC (codex-image = Codex CLI; remote sandbox exits 10). Run all three,
then Neil eyeballs against the Dusk Effect reference + `../believability_dna.md`.

**Triple anchors on every call** — the approved master is now the third reference:

```bash
node .claude/skills/codex-image/generate.mjs \
  --out .tmp/zam-dusk/<name>.png --size 1024x1536 \
  --edit workflows/believability-samples/generate-zam-images/assets/zam-face-reference.jpg \
  --edit workflows/believability-samples/generate-zam-images/assets/zam-approved-scene-reference.png \
  --edit workflows/believability-samples/zam-master/opt-C-presenter.png \
  --prompt "<per-option prompt below>"
```

### Shared dusk prompt spine (all 3)

> IDENTITY: the same recognizable adult Filipina woman in the three inputs (Image 1 =
> raw face/identity anchor, Image 2 = approved body-integration anchor, Image 3 =
> approved presenter master). Preserve her face shape, high forehead, dark-brown almond
> eyes, natural full brows, straight nose, soft full lips, softly rounded jawline, warm
> light-tan skin, and her black shoulder-length layered hair with slightly wispy ends.
> Allow natural variation from expression, head angle, lens and light.
>
> CAMERA: strict EYE LEVEL — lens exactly at her eye height, horizon through her eyes,
> no downward selfie tilt and no low angle. Premium DSLR quality, shallow depth of
> field, clean sharp focus on her eyes.
>
> DUSK LIGHT: ultra-realistic dusk sky with no visible sun — natural gradient from
> golden yellow and soft orange at the horizon to pink, lavender and deep blue overhead.
> Keep the sky about 20% darker while Zam and the foreground stay well-lit with natural
> ambient dusk light. Soft atmospheric haze, subtle bloom on distant lights, smooth
> tonal transitions across the sky. The cinematic polish applies to the SKY and
> environment ONLY.
>
> INTEGRATION: head, neck, shoulders, torso and arms are ONE coherent person from the
> start. Correct adult head-to-body scale, natural jaw-to-neck transition, soft chin
> shadow, realistic collarbone and shoulder slope, hair strands overlapping ears and
> collar, identical skin tone, pore texture, sharpness, grain and compression across
> face, neck and hands.
>
> SUBJECT CHARACTER: her skin stays 99% real — visible pores, fine facial hair,
> individual flyaway strands lifted by evening breeze, real fabric texture and folds,
> faint natural film grain. Polished-ad light, untouched skin.
>
> AVOID: face-swap or pasted floating head, oversized head, hard jaw cutout, mismatched
> face-vs-body colour or sharpness, rigid passport expression, generic influencer face,
> beauty-filter smoothing, HDR on the skin, studio lighting, ring-light catchlights,
> visible sun or lens flare on the face, warped anatomy, extra fingers, text, logos,
> watermark.

### Per-option deltas

- **D — dusk street portrait (`opt-D-dusk-street.png`):** standing on a Metro Manila
  street at dusk, body 20° off camera, relaxed confident almost-smile, one thumb hooked
  in a small crossbody bag strap. Shops and streetlights just starting to glow warm
  behind her, soft bokeh, tangled overhead wires silhouetted against the gradient sky,
  distant jeepney tail-lights as subtle bloom points. Rust-orange knit top, dark jeans.
  Light everyday makeup.
- **E — dusk lifestyle (`opt-E-dusk-terrace.png`):** leaning a forearm on a plain
  concrete balcony/terrace rail, half-turned to the camera mid-laugh, holding an iced
  coffee cup low. Fading golden horizon behind the rail, city rooftops and a few early
  lights dissolving into haze, warm horizon rim light on her hair edge, cooler lavender
  fill from above. Oversized soft white shirt, sleeves pushed up. Bare-face / minimal
  makeup.
- **F — dusk presenter, the ads plate (`opt-F-dusk-presenter.png`):** chest-up,
  talking-to-camera with lips parted mid-sentence and direct warm eye contact, seated
  on a rooftop/terrace stool, torso 15° off axis with face back to lens — same
  presenter energy as the approved Option C master but against the dusk sky. Gradient
  dusk sky fills the background with thin ultra-realistic clouds, one or two far
  rooftop silhouettes low in frame, soft ambient dusk as the key light (NO ring light,
  no artificial fill). Sage-green ribbed knit top, small gold studs. Clean natural
  makeup, skin still reads as skin.

## Dusk run 1 verdict (Neil eyeball, 2026-07-28) — and the REAL preset decode

- **F — dusk presenter: ✅ APPROVED.** Banked as `opt-F-dusk-presenter.png` in this
  folder. It survived because its framing is nearly identical to the approved Option C
  master — the model had almost nothing to invent.
- **D — dusk street / E — dusk terrace: ❌ REJECTED.** Neil: Zam does not look like she
  is really there; the face reads as pasted on ("parang kinabit lang"), worst on E.

**Register decode v2 — the lesson (bank this):** Neil's before/after sample of the
original Dusk Effect preset shows it applied to a REAL photograph — same person, same
pose, same board, pixel-identical subject; only the sky and light change. **The Dusk
Effect prompt is an EDIT PASS over an existing believable photo, not a text-to-scene
generation register.** Generating the whole dusk scene from scratch (run 1's D/E)
forces the model to invent subject + scene + dusk grade at once, and integration
collapses — exactly the pasted-face failure. The fix is a **two-step pipeline**:

1. **Base:** a believable image in the PROVEN daylight raw register (an approved
   zam-master option, or a fresh triple-anchor generation using the original A/B/C
   spine — overcast daylight, phone-exposure image character).
2. **Relight:** single-`--edit` pass on that base with the dusk prompt, subject
   HARD-LOCKED ("do not change the woman in any way — change ONLY sky, ambient light
   and background environment").

Run 2 (same session): `opt-D2-dusk-street-relight.png` = dusk relight directly on
`opt-B-outdoor-candid.png`; `opt-E2` = fresh daylight terrace base
(`opt-E2-terrace-daylight-base.png`) → dusk relight (`opt-E2-dusk-terrace-relight.png`).

**Run 2 verdict (Neil, 2026-07-28): D2 ❌ rejected + deleted** (along with its opt-B
base and opt-A — hindi pasado). The two-step relight pipeline itself is NOT
invalidated — D2's base (opt-B) was itself rejected, so the relight inherited a bad
base. Next D attempt should start from a NEW believable daylight street base Neil
approves first. **E2 pair: no verdict yet** — still in `.tmp/zam-dusk/`, awaiting
eyeball; bank or delete next session (defreezer wipes `.tmp/`).

## OPEN / NEXT SESSION

1. ~~Neil picks A / B / C~~ → **DONE: Option C approved 2026-07-28.**
2. ~~Generate D / E / F on the cafe PC~~ → **DONE 2026-07-28: F approved + banked;
   D/E rejected (pasted-face) → redone via the two-step relight pipeline above; D2/E2
   awaiting Neil's eyeball.**
3. The real make-or-break is still **ONE Veo 3.1 motion + lip-sync test on the Option C
   master, rendered RAW/ungraded** (see [`../ZAM-AVATAR-NOTES.md`](../ZAM-AVATAR-NOTES.md)
   next-steps §3 and the Surface-A raw-first rule in [`../believability_dna.md`](../believability_dna.md)).
   Stills are not an avatar until identity holds in motion.

## Cost note

Each image = a full `codex exec` agentic session (~2 min, ~34k tokens) billed to the
ChatGPT plan, not Claude quota. 3 in parallel took ~8 min wall-clock.
