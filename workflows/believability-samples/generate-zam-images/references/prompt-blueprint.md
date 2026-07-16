# Zam prompt blueprint

Use this as scaffolding, not as text that must be copied in full.

## Input roles

- Image 1: primary raw Zam identity reference.
- Image 2: approved natural body-integration reference.
- Image 3, when supplied: scene, pose, outfit, or style reference only.

## Core prompt

```text
Create a completely new photorealistic image.

Identity: Depict Zam as the same recognizable adult Filipina woman from Images 1 and 2. Preserve her face shape, forehead, dark-brown almond eyes, natural brows, nose, lips, jawline, warm natural skin tone, and short layered black hair. Allow natural changes from expression, head angle, lens, and scene lighting.

Scene: <expand the user's short scene description into a concrete place, action, and story beat>.

Camera: <aspect ratio, distance, lens, framing, angle, and who took the photo>. Keep believable smartphone distortion and imperfect UGC framing.

Pose: <natural body angle, gaze, hands, and action>. Avoid a centered ID-photo pose unless requested.

Wardrobe and props: <infer scene-appropriate clothing and only useful objects>.

Environment: <specific background details that make the location believable without stealing focus>.

Lighting: <real source light>. Apply it consistently to face, hair, neck, body, clothes, and props.

Integration: Render Zam's head, neck, shoulders, torso, and body as one coherent person. Use correct adult head-to-body scale, natural jaw-to-neck transition, soft chin shadow, realistic shoulder slope, hair strands overlapping ears and neck, and matching skin tone, pores, focus, grain, and compression across face and body.

Image character: Authentic smartphone exposure, natural pores, real hair strands, fabric folds, mild sensor noise, subtle compression, and no commercial over-polish.

Avoid: face-swap or Photoshop appearance, pasted or floating head, oversized head, hard jaw cutout, mismatched face/body color, different sharpness on the face, rigid passport expression, generic influencer face, beauty-filter skin, excessive HDR, cinematic grading, studio lighting, warped anatomy, extra fingers, duplicate objects, garbled focal text, and watermark.
```

## Philippines sports block

Use only for national-team or sports-fan scenes unless requested elsewhere.

```text
Zam represents the Philippines. Use blue, red, white, and yellow accurately. A Philippines-inspired fan jersey may use royal blue, red-white trim, a small yellow sun-and-three-stars emblem, and short readable text "PILIPINAS". Philippine flag face paint uses blue above red, a white triangle at the inner side, and a small yellow sun. Avoid imagery from any other country.
```

## Raw realism controls

Choose a few controls that fit the scene:

- mixed practical light rather than perfect key light
- slight sensor noise and phone compression
- mild wide-angle distortion
- tiny exposure imbalance or motion blur
- believable sweat or shine only when the setting calls for it
- background clutter with natural depth
- small imperfections in hair, makeup, clothing, or framing

Do not add every imperfection at once.

## Aspect-ratio handling

Prompt for the requested ratio and leave enough space around Zam for cropping. After generation, inspect the pixel dimensions. Use `scripts/crop_to_ratio.py` whenever the rendered ratio differs. Prefer a focus point near Zam's upper torso (`focus-y` around `0.45` to `0.50`) for full-body vertical images; adjust only when the composition clearly needs it.

## Failure corrections

### Pasted-head look

Regenerate from scratch. Make the head turn or tilt naturally, loosen the expression, let hair cross the neck and collar, match flash and grain across the whole body, and reduce identity-lock wording.

### Identity drift

Reassert the stable facial traits and both anchor roles. Remove style references that compete with identity. Keep makeup and facial reshaping minimal.

### AI-polished look

Replace cinematic language with a named real light source, camera distance, casual framing, sensor noise, compression, and ordinary environmental details.

### Bad hands or props

Simplify the action and reduce the number of held objects. Use one targeted edit only when the rest of the image is strong.
