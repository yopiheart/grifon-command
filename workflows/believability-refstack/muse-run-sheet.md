# Meta Muse run sheet — reference-stack shootout (lane 3, manual)

Neil runs these by hand at https://www.meta.ai/ — Muse is the third lane in the
3-model shootout (gemini + codex are automated). **Blind protocol:** save the
outputs with the exact names below; do NOT rename by model — the `anonymize` step
shuffles all three lanes into A/B/C so no judge (including you) knows which model
made which image until `tally` unblinds.

Preferred mode is TWO separate reference attachments (person + style). If meta.ai
only accepts a single attachment, use the composite fallback noted per case and
tick the "mode used" box so the verdict records how each case was produced.

## c01 (from triplet t067)
*best-in-set 86%; dark low-light lying-down selfie (hard lighting)*

**Two-reference mode (preferred):**
- Upload image 1 (the PERSON): `.tmp/refstack/shootout-refs/model.jpeg`
- Upload image 2 (the STYLE): `.tmp/refstack/shootout-refs/c01-style.jpeg`
- Paste this prompt:
  > First image = the person. Second image = the scene/style. Recreate the second image's scene (lighting, skin, pose, camera angle, background, text overlays) but the person MUST be the woman from the first image — her exact face and hair. Do not keep the face of the person in the second image. A candid, low-light smartphone selfie of the woman from Reference Image 1 (the PERSON) lying down on a green and yellow checkered pillow. She has a playful, skeptical expression, winking one eye with a subtle smirk. her exact hair from Reference Image 1, authentic skin texture with slight grain, dim indoor lighting. High-quality social media aesthetic, raw and unedited look.

**Composite fallback (if meta.ai takes only one attachment):**
- Upload the single panel: `.tmp/refstack/shootout/composite/c01.png`
  (make it first with: `node tools/shootout_refstack.mjs composite --only c01`)
- Paste this prompt:
  > The input image is a two-panel reference sheet. LEFT panel = the PERSON (identity ground truth). RIGHT panel = the SCENE/STYLE. Recreate the right panel's scene — lighting, skin rendering, posing, camera angle, background, any text overlays — but the person in the output MUST be the woman from the LEFT panel: her exact face, facial geometry, and hair. Do NOT keep the face of the person in the right panel; she is replaced. Generate ONE single new photograph — do NOT reproduce the two-panel layout. A candid, low-light smartphone selfie of the woman from Reference Image 1 (the PERSON) lying down on a green and yellow checkered pillow. She has a playful, skeptical expression, winking one eye with a subtle smirk. her exact hair from Reference Image 1, authentic skin texture with slight grain, dim indoor lighting. High-quality social media aesthetic, raw and unedited look.

**Save as:** `.tmp/refstack/shootout/outputs/muse/c01-muse-01.png`

**Mode used:**  ☐ two-ref   ☐ composite

---

## c02 (from triplet t216)
*mirror-selfie winner 85% (top fragment)*

**Two-reference mode (preferred):**
- Upload image 1 (the PERSON): `.tmp/refstack/shootout-refs/model.jpeg`
- Upload image 2 (the STYLE): `.tmp/refstack/shootout-refs/c02-style.jpg`
- Paste this prompt:
  > First image = the person. Second image = the scene/style. Recreate the second image's scene (lighting, skin, pose, camera angle, background, text overlays) but the person MUST be the woman from the first image — her exact face and hair. Do not keep the face of the person in the second image. A photorealistic mirror selfie of the woman from Reference Image 1 (the PERSON) with her exact hair from Reference Image 1, smiling gently. She is wearing a black sleeveless crop top with an asymmetrical shoulder cutout and a red bull graphic on the front, plus a black waistband with white text. She wears black pants with a black belt. She is holding a light purple smartphone in front of her. The background is a washroom with white marble-patterned wall tiles and a blue informational poster reflected in the mirror behind her

**Composite fallback (if meta.ai takes only one attachment):**
- Upload the single panel: `.tmp/refstack/shootout/composite/c02.png`
  (make it first with: `node tools/shootout_refstack.mjs composite --only c02`)
- Paste this prompt:
  > The input image is a two-panel reference sheet. LEFT panel = the PERSON (identity ground truth). RIGHT panel = the SCENE/STYLE. Recreate the right panel's scene — lighting, skin rendering, posing, camera angle, background, any text overlays — but the person in the output MUST be the woman from the LEFT panel: her exact face, facial geometry, and hair. Do NOT keep the face of the person in the right panel; she is replaced. Generate ONE single new photograph — do NOT reproduce the two-panel layout. A photorealistic mirror selfie of the woman from Reference Image 1 (the PERSON) with her exact hair from Reference Image 1, smiling gently. She is wearing a black sleeveless crop top with an asymmetrical shoulder cutout and a red bull graphic on the front, plus a black waistband with white text. She wears black pants with a black belt. She is holding a light purple smartphone in front of her. The background is a washroom with white marble-patterned wall tiles and a blue informational poster reflected in the mirror behind her

**Save as:** `.tmp/refstack/shootout/outputs/muse/c02-muse-01.png`

**Mode used:**  ☐ two-ref   ☐ composite

---

## c03 (from triplet t203)
*polished-ugc 82%; cafe scene w/ neon sign + pastry case*

**Two-reference mode (preferred):**
- Upload image 1 (the PERSON): `.tmp/refstack/shootout-refs/model.jpeg`
- Upload image 2 (the STYLE): `.tmp/refstack/shootout-refs/c03-style.jpg`
- Paste this prompt:
  > First image = the person. Second image = the scene/style. Recreate the second image's scene (lighting, skin, pose, camera angle, background, text overlays) but the person MUST be the woman from the first image — her exact face and hair. Do not keep the face of the person in the second image. A high-quality photorealistic portrait of the woman from Reference Image 1 (the PERSON) with her exact hair from Reference Image 1. She is leaning her cheek on her hand in a casual, relaxed pose, looking directly at the camera with a gentle expression. She is wearing a lavender ribbed tank top and a black wristband. The setting is a cozy aesthetic cafe with a textured gray concrete wall, a glass pastry display case in the blurred background, and a rattan pendant light. Soft natural indoor lighting, cinematic bokeh, 8k resolution, highly detailed skin texture

**Composite fallback (if meta.ai takes only one attachment):**
- Upload the single panel: `.tmp/refstack/shootout/composite/c03.png`
  (make it first with: `node tools/shootout_refstack.mjs composite --only c03`)
- Paste this prompt:
  > The input image is a two-panel reference sheet. LEFT panel = the PERSON (identity ground truth). RIGHT panel = the SCENE/STYLE. Recreate the right panel's scene — lighting, skin rendering, posing, camera angle, background, any text overlays — but the person in the output MUST be the woman from the LEFT panel: her exact face, facial geometry, and hair. Do NOT keep the face of the person in the right panel; she is replaced. Generate ONE single new photograph — do NOT reproduce the two-panel layout. A high-quality photorealistic portrait of the woman from Reference Image 1 (the PERSON) with her exact hair from Reference Image 1. She is leaning her cheek on her hand in a casual, relaxed pose, looking directly at the camera with a gentle expression. She is wearing a lavender ribbed tank top and a black wristband. The setting is a cozy aesthetic cafe with a textured gray concrete wall, a glass pastry display case in the blurred background, and a rattan pendant light. Soft natural indoor lighting, cinematic bokeh, 8k resolution, highly detailed skin texture

**Save as:** `.tmp/refstack/shootout/outputs/muse/c03-muse-01.png`

**Mode used:**  ☐ two-ref   ☐ composite

---

## c04 (from triplet t018)
*HARD IDENTITY: three-quarter angle looking away, outdoor*

**Two-reference mode (preferred):**
- Upload image 1 (the PERSON): `.tmp/refstack/shootout-refs/model.jpeg`
- Upload image 2 (the STYLE): `.tmp/refstack/shootout-refs/c04-style.jpg`
- Paste this prompt:
  > First image = the person. Second image = the scene/style. Recreate the second image's scene (lighting, skin, pose, camera angle, background, text overlays) but the person MUST be the woman from the first image — her exact face and hair. Do not keep the face of the person in the second image. Highly detailed photo of the young woman from Reference Image 1 (the PERSON) her exact hair from Reference Image 1 smiling and looking right, seated on a unique curved wooden slatted bench at a beach resort. Wearing a white lace corset bustier top with spaghetti straps and high-waisted light-wash wide-leg denim jeans. A single white plumeria flower tucked behind her right ear. Positioned against a rugged, craggy rock wall feature covered in lush tropical plants. Raised wooden boardwalk and open-air thatched structures are in the background under bright, warm natural daylight. Candid, 35mm.

**Composite fallback (if meta.ai takes only one attachment):**
- Upload the single panel: `.tmp/refstack/shootout/composite/c04.png`
  (make it first with: `node tools/shootout_refstack.mjs composite --only c04`)
- Paste this prompt:
  > The input image is a two-panel reference sheet. LEFT panel = the PERSON (identity ground truth). RIGHT panel = the SCENE/STYLE. Recreate the right panel's scene — lighting, skin rendering, posing, camera angle, background, any text overlays — but the person in the output MUST be the woman from the LEFT panel: her exact face, facial geometry, and hair. Do NOT keep the face of the person in the right panel; she is replaced. Generate ONE single new photograph — do NOT reproduce the two-panel layout. Highly detailed photo of the young woman from Reference Image 1 (the PERSON) her exact hair from Reference Image 1 smiling and looking right, seated on a unique curved wooden slatted bench at a beach resort. Wearing a white lace corset bustier top with spaghetti straps and high-waisted light-wash wide-leg denim jeans. A single white plumeria flower tucked behind her right ear. Positioned against a rugged, craggy rock wall feature covered in lush tropical plants. Raised wooden boardwalk and open-air thatched structures are in the background under bright, warm natural daylight. Candid, 35mm.

**Save as:** `.tmp/refstack/shootout/outputs/muse/c04-muse-01.png`

**Mode used:**  ☐ two-ref   ☐ composite

---

## c05 (from triplet t276)
*HARD STYLE: cluttered domestic bg + teeth smile*

**Two-reference mode (preferred):**
- Upload image 1 (the PERSON): `.tmp/refstack/shootout-refs/model.jpeg`
- Upload image 2 (the STYLE): `.tmp/refstack/shootout-refs/c05-style.jpg`
- Paste this prompt:
  > First image = the person. Second image = the scene/style. Recreate the second image's scene (lighting, skin, pose, camera angle, background, text overlays) but the person MUST be the woman from the first image — her exact face and hair. Do not keep the face of the person in the second image. A candid, close-up photo of the woman from Reference Image 1 (the PERSON) with her exact hair from Reference Image 1, wearing a terracotta orange square-neck top, smiling genuinely at the camera and making a 'V' peace sign with her right hand in a slightly messy domestic indoor setting with hanging clothes and kitchenware.

**Composite fallback (if meta.ai takes only one attachment):**
- Upload the single panel: `.tmp/refstack/shootout/composite/c05.png`
  (make it first with: `node tools/shootout_refstack.mjs composite --only c05`)
- Paste this prompt:
  > The input image is a two-panel reference sheet. LEFT panel = the PERSON (identity ground truth). RIGHT panel = the SCENE/STYLE. Recreate the right panel's scene — lighting, skin rendering, posing, camera angle, background, any text overlays — but the person in the output MUST be the woman from the LEFT panel: her exact face, facial geometry, and hair. Do NOT keep the face of the person in the right panel; she is replaced. Generate ONE single new photograph — do NOT reproduce the two-panel layout. A candid, close-up photo of the woman from Reference Image 1 (the PERSON) with her exact hair from Reference Image 1, wearing a terracotta orange square-neck top, smiling genuinely at the camera and making a 'V' peace sign with her right hand in a slightly messy domestic indoor setting with hanging clothes and kitchenware.

**Save as:** `.tmp/refstack/shootout/outputs/muse/c05-muse-01.png`

**Mode used:**  ☐ two-ref   ☐ composite

---

## c06 (from triplet t121)
*night residential street, wink (dark outdoor)*

**Two-reference mode (preferred):**
- Upload image 1 (the PERSON): `.tmp/refstack/shootout-refs/model.jpeg`
- Upload image 2 (the STYLE): `.tmp/refstack/shootout-refs/c06-style.jpeg`
- Paste this prompt:
  > First image = the person. Second image = the scene/style. Recreate the second image's scene (lighting, skin, pose, camera angle, background, text overlays) but the person MUST be the woman from the first image — her exact face and hair. Do not keep the face of the person in the second image. A high-quality, realistic selfie of the woman from Reference Image 1 (the PERSON) winking at the camera with a playful smirk. She has her exact hair from Reference Image 1, and is wearing winged eyeliner and pink lipstick. She is wearing a grey spaghetti-strap tank top. The setting is an outdoor residential street at night, with soft bokeh from distant street lights in the background. Natural skin texture, low-light photography, cinematic soft lighting, 8k resolution, highly detailed

**Composite fallback (if meta.ai takes only one attachment):**
- Upload the single panel: `.tmp/refstack/shootout/composite/c06.png`
  (make it first with: `node tools/shootout_refstack.mjs composite --only c06`)
- Paste this prompt:
  > The input image is a two-panel reference sheet. LEFT panel = the PERSON (identity ground truth). RIGHT panel = the SCENE/STYLE. Recreate the right panel's scene — lighting, skin rendering, posing, camera angle, background, any text overlays — but the person in the output MUST be the woman from the LEFT panel: her exact face, facial geometry, and hair. Do NOT keep the face of the person in the right panel; she is replaced. Generate ONE single new photograph — do NOT reproduce the two-panel layout. A high-quality, realistic selfie of the woman from Reference Image 1 (the PERSON) winking at the camera with a playful smirk. She has her exact hair from Reference Image 1, and is wearing winged eyeliner and pink lipstick. She is wearing a grey spaghetti-strap tank top. The setting is an outdoor residential street at night, with soft bokeh from distant street lights in the background. Natural skin texture, low-light photography, cinematic soft lighting, 8k resolution, highly detailed

**Save as:** `.tmp/refstack/shootout/outputs/muse/c06-muse-01.png`

**Mode used:**  ☐ two-ref   ☐ composite

---
