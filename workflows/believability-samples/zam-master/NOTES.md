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
| `opt-A-raw-ugc.png` | Raw UGC — friend-taken, home interior, window light, waist-up | Highest-trust / organic content. The `believability_dna.md` trust winner register. |
| `opt-B-outdoor-candid.png` | Outdoor candid — Manila sidewalk, overcast, mid-step turn-back | Lifestyle content, story-beat ads |
| `opt-C-presenter.png` | Presenter — seated, home content corner, talking-to-camera, chest-up | Ads / the future avatar plate + Veo talking-head anchor |

**STATUS: awaiting Neil's eyeball.** None approved yet. Whichever he picks becomes
the new master and should be added as a third anchor for future Zam generations
(per `generate-zam-images/SKILL.md` — "If the user approves a newer image as the
master, add it as an optional third reference").

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

## OPEN / NEXT SESSION

1. **Neil picks A / B / C** (or rejects all → regenerate with notes).
2. **PENDING REQUEST — not yet started:** Neil asked for **3 MORE options** matching the
   reference in this Google Doc:
   `https://docs.google.com/document/d/1rjRBiqYyVmbafUaCYejMmA9LtvfqoE02lGSW6V58ozk/mobilebasic`
   Brief: *"feeling maganda rin to for ads/content, parang pasok sya sa polished ads pero
   make sure 99% real parin sya."* → **polished-ads register, but still 99% real.** The
   doc was NOT fetched before the session ended — open it first, decode the look, then
   generate 3 at the same eye level + dual-anchor discipline.
3. Once a master is approved: the real make-or-break is still **ONE Veo 3.1 motion +
   lip-sync test, rendered RAW/ungraded** (see [`../ZAM-AVATAR-NOTES.md`](../ZAM-AVATAR-NOTES.md)
   next-steps §3 and the Surface-A raw-first rule in [`../believability_dna.md`](../believability_dna.md)).
   Stills are not an avatar until identity holds in motion.

## Cost note

Each image = a full `codex exec` agentic session (~2 min, ~34k tokens) billed to the
ChatGPT plan, not Claude quota. 3 in parallel took ~8 min wall-clock.
