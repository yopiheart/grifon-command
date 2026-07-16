---
name: generate-zam-images
description: Generate identity-consistent, photorealistic images of Zam from short scene descriptions using bundled face and approved full-body references. Use when the user asks to place Zam in a scene, generate Zam UGC or lifestyle photos, keep the same Zam character across images, create Zam variants, or make a multi-image Zam batch; handle automatic prompt expansion, Philippines defaults for national-team contexts, anti-AI quality control, parallel rendering, and user-accessible delivery.
---

# Generate Zam Images

Turn a short scene idea into a finished image of Zam. Do not make the user write a production prompt.

## Resolve the anchors

Resolve the directory containing this `SKILL.md`, then use these bundled files in this order:

1. `assets/zam-face-reference.jpg` — primary raw identity reference.
2. `assets/zam-approved-scene-reference.png` — approved reference for natural face, head, neck, shoulder, and body integration.

Pass both files to the built-in image-generation tool for every new Zam image. Label their roles in the prompt. An attached user image may be a third scene, pose, outfit, or style reference; never let it replace Zam's identity anchors unless the user explicitly asks.

## Expand a short request

Accept inputs as brief as `Zam sa BGC rooftop at night` or `Zam sa airport, candid`.

Use these defaults unless the user overrides them:

- Count: one image.
- Format: vertical 9:16.
- Medium: ultra-realistic smartphone UGC photo.
- Subject: Zam, an adult Filipina woman.
- Hair: short, straight, black, shoulder-length layered hair.
- Makeup: minimal and natural.
- Camera: a believable recent smartphone lens with mild distortion and imperfect framing.
- Texture: real pores, hair strands, fabric folds, phone grain, and compression.
- Wardrobe and props: infer from the scene; do not force a football outfit into unrelated scenes.
- Text and logos: omit unless requested. Keep requested text short and verbatim.
- National-team context: make Zam represent the Philippines unless the user names another country.

Do not ask follow-up questions when these defaults can safely fill the gaps. Ask only when a missing choice would materially change the result.

## Build the prompt

Read `references/prompt-blueprint.md` and use only the sections relevant to the request.

Always make identity natural rather than rigid:

- Preserve Zam's recognizable trait cluster while allowing scene-specific expression, head angle, lens, and lighting.
- Render the full head, neck, shoulders, torso, and body as one coherent person from the start.
- Match skin tone, texture, sharpness, grain, and light across face and body.
- Add natural jaw-to-neck transition, chin shadow, shoulder slope, and hair overlap around ears and neck.
- Keep adult head-to-body scale believable.

Never over-lock a centered, front-facing face. That produces a pasted-head or face-swap look.

## Generate and inspect

Use the built-in image-generation tool. Do not substitute HTML, SVG, or a text-only prompt.

Verify the actual pixel dimensions after generation. The renderer may ignore a requested aspect ratio. If the ratio is wrong, run:

```bash
python3 <skill-dir>/scripts/crop_to_ratio.py \
  --input <generated-image> \
  --output <final-image> \
  --ratio <W:H> \
  --focus-x 0.5 \
  --focus-y 0.48
```

Choose the focus point around Zam's face and torso. If an exact crop would cut off a required body part or prop, regenerate once with more framing space, then crop. Deliver only the ratio-correct final.

Check the output before accepting it:

1. Zam is recognizable without looking pasted onto the body.
2. Head size, neck, shoulders, torso, and pose form one natural person.
3. Face and body share the same lighting, skin tone, focus, and grain.
4. Hands, fingers, limbs, reflections, and props are anatomically coherent.
5. The location feels real and supports the requested story.
6. Flags, colors, and short requested text are correct.
7. The image looks like a real smartphone capture, not a polished AI render.
8. The final pixel ratio matches the requested ratio.

If identity integration fails, regenerate from scratch with a looser expression and pose. Do not edit the failed pasted-head image. If only one local detail is wrong, make one targeted edit.

## Run a multi-image batch

When the user requests two or more distinct images, use parallel subagents when available unless the images depend on one another.

1. Create one shared identity-and-style block from the bundled anchors.
2. Give each worker one bounded scene and the same shared block.
3. Use one image-generation call per scene.
4. Wait for every worker and count the outputs.
5. Inspect each image for likeness and integration.
6. Copy every accepted output into the conversation workspace with stable descriptive names.

For a tightly matched sequence, use the approved bundled scene reference as the common body-integration anchor. If the user approves a newer image as the master, add it as an optional third reference for that batch.

Parallel workers may return paths that are not visible to the user. Never treat a subagent completion message as delivery.

## Deliver the actual files

For one image, surface the built-in image output directly.

For a batch:

- Save every accepted image as a persistent user-facing file in one batch.
- Present each image separately with its scene name.
- Do not rely on scratch-only paths, collapsed previews, or paths under `/root/.codex/generated_images`.
- Verify that the number of visible/downloadable files equals the number promised.
- Create a ZIP only when the user explicitly asks for a bundle or download-all file.
- Do not say the batch is delivered until the actual files are available to the user.

## Examples

- `Zam sa crowded LRT, pauwi, candid flash photo.`
- `Zam walking in BGC at night, naka-black dress, 4:5.`
- `Four images of Zam: airport, café, stadium, and hotel. Same outfit. Run them in parallel.`
- `Use this attached photo only as the pose reference. Keep Zam's identity.`
