# Session F — Test Substrate (Bukidnon Brew beans → latte)

The **fixed** start/end image pair for the Session F Omni effect sweep. One pair
feeds all effect renders so the **only variable is the `transitionEffect`**.
Committed so the defreezer can't wipe it and any future re-verification session
uses the identical substrate.

| Frame | File | Role | Anchor |
|---|---|---|---|
| Start | `substrate-start-beans.jpg` | Omni `image_list[0]` / `first_frame` | centered warm-brown circular bean cluster |
| End | `substrate-end-latte.jpg` | Omni `image_list[1]` / `end_frame` | centered warm-brown crema disc (rosetta latte art) |

## Reproduction recipe

- **Model:** `gemini-3.1-flash-image-preview` (same model as `generateSceneImage`)
- **Config:** `{ imageConfig: { aspectRatio: '9:16', imageSize: '1K' } }`
- **API:** `GoogleGenAI.models.generateContent` called directly with `GEMINI_API_KEY`
  (image generation is upstream of Session F's scope — no app pipeline needed).
- Generator script: `.tmp/sf-substrate-gen.mjs` (disposable; this doc is the durable record).

**Start prompt (verbatim):**

> Macro still photograph, vertical 9:16 framing. A dense centered pile of glossy
> dark-roast coffee beans fills the frame, oily-surfaced, warm chocolate-brown
> tones, soft natural side light from the left, shallow depth of field with the
> front beans sharp. The bean mass forms a rounded centered cluster. No text, no
> logos, no labels, no hands, no cup, no people. Photorealistic, high detail,
> neutral background.

**End prompt (verbatim):**

> Still photograph, vertical 9:16 framing. A single white ceramic cup viewed from
> a high three-quarter angle, filled to the brim with a creamy latte showing a
> clean symmetrical rosetta latte-art pattern in the warm-brown crema. Soft
> natural side light from the left, shallow depth of field. The circular crema
> surface sits centered in the frame. No text, no logos, no labels, no hands, no
> coffee beans, no people. Photorealistic, high detail, neutral background.

## Known substrate characteristic (not a defect)

The start frame is a tight macro (beans fill the frame); the end frame carries
environment (wooden table, window light, cloth). This macro-hook → environmental-
payoff asymmetry mirrors how real storyboard hook frames look. The per-effect
rubrics account for it — effects are graded on whether the *transition* reads,
not on frame-to-frame compositional identity.
