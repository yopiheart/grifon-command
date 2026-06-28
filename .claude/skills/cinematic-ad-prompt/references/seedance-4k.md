# Seedance 2.0 / 4K technical doctrine + engine portability

This file encodes the technical wins that make AI footage read as *real* on Seedance 2.0 (4K), and how to port a prompt to Veo 3.1 or Kling. The Seedance specifics are distilled from Neil's source brief ("Seedance 4K Just Made AI Filmmaking Look Ultra Realistic", Higgsfield). Exact aspect-ratio / duration / parameter values should be re-verified against the live docs when accessible:
- BytePlus ModelArk prompt guide: https://docs.byteplus.com/en/docs/ModelArk/2222480
- Seedance 2.0 overview: https://seed.bytedance.com/en/seedance2_0
- Higgsfield Seedance 4K blog: https://higgsfield.ai/blog/Seedance-4k

(Both BytePlus URLs return 403 to automated fetch; pull them by hand or via a browser when updating this file.)

## The 4K-native doctrine (why resolution is not cosmetic)

Native 4K isn't just sharper edges — it changes the model's grasp of **3D space, depth maps, and physical boundaries**. Treat 4K as a *necessity*, not a style choice:

- **1080p is legacy.** Generating at 1080p burns credits on rerolls (crowd-melting, object warping, spatial deterioration) and inflates editing hours. For hero/realism shots, generate 4K from the start.
- **Micro-texture breaks the synthetic glaze.** 4K renders skin pores, splitting ice, eye fibers, fabric weave, condensation — the micro-detail that signals "real" to the eye. Always name the micro-texture in MATERIAL / SURFACES.
- **Ultra-wide stress test.** 21:9 exposes architectural layout failure and crowd pixelation; if a complex background holds in 21:9, it holds anywhere. Use 21:9 to validate big environment shots.

## 10-bit color pipeline (no banding)

8-bit ≈ 16 million colors and produces visible **banding/stepping** in gradients (smoke, haze, skies, soft light falloff). 10-bit delivers **over a billion colors** for seamless blends.

- In TECHNICAL, specify **10-bit color** and export at **"High" bitrate**.
- Especially load-bearing on any shot with smoke, haze, fog, gradient skies, bokeh, or soft studio falloff — i.e. most premium product and cinematic shots.

## True physics — drive it from an image

For believable **mass, momentum, depth, and physical weight** (action, gaming, product impacts, pours, fabric), prefer an **image-to-video** pipeline over text-to-video: feed a strong first frame and let the model calculate physics forward. Name the physical event concretely (compresses, displaces, settles with inertia, beads under surface tension).

## Zero-hardware VFX (native auto-masking)

Seedance can apply VFX to real uploaded footage **without green screen or manual tracking** — drop in the source clip + a descriptive prompt and rely on native masking to replace/overlay elements (e.g. cyber or reptile textures on a device). When using this:
- Describe the **anchor object** the model masks against, the new element, and its light/contact-shadow/wet-film interaction.
- Combine with the INPUT LOCK clause from `structure.md` so the plate stays unchanged.

## Companion image models (for the first frame / keyframes)

Seedance is image-to-video friendly — choose the image generator by need:
- **Soul Cinema** — characters, keyframes, environment/locations. Dramatic cinematic default look; credit-efficient (reported ~8 batches per credit). Default for hero characters and location plates.
- **GPT Image 2** — when the generation needs **accurate text rendering** (logos, packaging copy, on-screen words), **precise motion control**, or **structured storyboards**. Use for any shot where readable text or exact layout matters.

## Aspect ratios & length (Seedance / Higgsfield)

- Aspects in active use in the source: **21:9** (ultra-wide cinematic stress test), **16:9** (standard cinematic), **9:16** (mobile / DR ads). 1:1 for feed where needed.
- Keep individual generations short (the source works in tight clips and stitches); the brief gives no reliable max-duration or per-frame render-time figure — **do not invent one**. Validate length against the live tool.

## Engine portability profiles

A prompt tuned for one engine does **not** auto-port (see `agent_lessons.md` 2026-05-19: formulas tuned for Veo don't auto-work on Kling). Before trusting a re-route, sample the new engine's output 2–3× and audit which phrases are decorative vs load-bearing, and whether a negative phrase suppresses the new engine's intended behavior.

### Seedance 2.0 (Higgsfield) — DEFAULT for realism/cinematic
- Lead with 4K + 10-bit + the micro-texture. Use image-to-video for physics. Use 21:9 to validate, deliver in the target aspect.
- Strong at hyper-real texture, ultra-wide crowds, native VFX masking, broadcast text (via GPT Image 2 keyframes).

### Veo 3.1 — DEFAULT for spoken delivery / dialogue
- **Frame-0 rule:** the speaker is ALREADY mid-syllable at 0:00 — mouth in motion, first word forming, eyes engaged. NO establishing pose, NO pre-speech beat. Lead the prompt with the dialogue in quotes.
- Camera minimal and smooth: one gentle move (slow dolly-in/push-in) starting with the first syllable. Forbid handheld shake, rack focus, lens breathing on talking shots.
- End-clean: last frame = next syllable/breath, not a post-speech neutral. Append "avoid cross-dissolve, double-exposure, ghosting, or fade in final second."
- Use for UGC spokesperson, testimonial, founder-to-camera (the talking DR styles).

### Kling — DEFAULT for image-to-video with start/end frames
- Strong at image2video and start-frame → end-frame interpolation. Provide a clear first (and optional last) frame; describe the **bridge motion** between them.
- Supply a **negative prompt** ("avoid low quality, blurry, distorted, deformation, morphing, melting, glitching, extra limbs, text, watermark, subtitles, cross-dissolve, ghosting, fade-out; final second holds clean and fully opaque").
- Use a concrete motion vocabulary (slow dolly-out, gentle push-in, lateral tracking pan); avoid handheld/rack focus on product shots. Good for product hero, before/after, scroll-stopper b-roll.

## Quick TECHNICAL block to paste

```
TECHNICAL: native 4K, 10-bit color, "High" bitrate (no banding), [24fps | 240fps on the named slow-mo beat only], 180° shutter motion blur, no jitter, no aliasing. [Aspect]. [Total length].
```
