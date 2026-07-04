#!/usr/bin/env node
// Side-by-side scene-image model eval harness.
//
// Purpose: generate the SAME tuned scene-image prompts against two Gemini image
// models — `gemini-3.1-flash-image-preview` (current, "preview") and
// `gemini-3.1-flash-lite-image` (candidate, "lite") — writing paired PNGs + a
// manifest so a human / gemini-eval can grade identity lock, camera adherence,
// product fidelity, person-leak, and Filipino-cast-lock regressions BEFORE a
// model swap. Read-only w.r.t. the app: this file never touches geminiService.ts.
//
// Node, not Python: the cafe-PC defreezer wipes Python; Node ships built-in
// fetch (>=18) + fs/promises. No new npm dependencies — direct REST to the
// generativelanguage endpoint, mirroring api/gemini/image.ts transport.
//
// Usage:
//   node tools/eval_scene_image_models.mjs --dry-run          # print plans, no API calls
//   node tools/eval_scene_image_models.mjs                    # run all 7 cases x both models
//   node tools/eval_scene_image_models.mjs --only 03-product-hero
//   node tools/eval_scene_image_models.mjs --models preview   # one model only
//
// Output: .tmp/model-eval/<caseId>-<preview|lite>.png + .tmp/model-eval/manifest.json
// Secrets: GEMINI_API_KEY from environment or repo-root .env.
//
// ============================================================================
// COPIES of TUNED prompt blocks from services/geminiService.ts for eval-input
// parity only — source of truth is geminiService.ts; do not edit there based on
// this file. If a block below drifts from geminiService.ts the eval is invalid;
// re-sync from geminiService.ts before trusting a run.
// ============================================================================

import { readFile, writeFile, mkdir, copyFile, access } from 'node:fs/promises';
import { resolve, dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(REPO_ROOT, '.tmp', 'model-eval');
const FIXTURE_DIR = join(OUT_DIR, 'fixtures');

// --- Model IDs (candidate swap targets; NOT the app's tuned sceneImageModel const) ---
const MODEL_IDS = {
  preview: 'gemini-3.1-flash-image-preview',
  lite: 'gemini-3.1-flash-lite-image',
};
const LITE_FALLBACK = 'gemini-3.1-flash-lite-image-preview';
const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const CALL_TIMEOUT_MS = 55_000;

// ---------------------------------------------------------------------------
// VERBATIM COPIES from services/geminiService.ts (lines ~818-912, 2476-2484).
// ---------------------------------------------------------------------------

// AVATAR_CAMERA_ANGLES (geminiService.ts ~L818)
const AVATAR_CAMERA_ANGLES = [
    "INTIMATE_CLOSE_UP: Framing neck up. Face fully toward camera. Focus: Eyes. Steady, locked framing.",
    "MEDIUM_FRONTAL: Chest-up, eye-level frontal angle. Face squarely toward camera. Steady tripod-style framing. 50mm lens feel. Casual conversational vibe.",
    "WIDE_BUST_SHOT: Waist up, near-frontal angle. Face toward camera. Steady framing. Background depth-of-field matches 85mm lens.",
    "HIGH_ANGLE_SELFIE: Camera above eye-level looking down at face. Relatable, casual vlog vibe, steady framing. Subject looks UP at camera (face fully toward camera)."
];

// REALISM_INSTRUCTION / REALISM_INSTRUCTION_UGC (geminiService.ts ~L832)
const REALISM_INSTRUCTION = `
**Master Aesthetic Style (Aspirational UGC)**

**Primary Directive:** Create a realistic "User Generated Content" (UGC) look that feels relatable but high-quality.
**CORE RULE:** The content must look like it was shot on a phone by a real person, but in a nice environment.

**UGC Core Specs:**
- **Camera:** iPhone 15 Pro or 35mm candid aesthetic (f1.8, ISO 200).
- **Lighting:** Natural indoor/outdoor or soft window light. Bright and airy.
- **Vibe:** Relatable, human-first, imperfect, but CLEAN.
- **Backgrounds:** Must be tidy, aesthetically pleasing, and distraction-free.
- **Colors:** Use natural, life-like colors. Bright/Pastel tones preferred over dark/gritty tones.

**STRICT NEGATIVE:** Do NOT render any camera interface elements, shutter buttons, recording timers, or phone UI. The output must be a CLEAN photographic image only.
`;
const REALISM_INSTRUCTION_UGC = REALISM_INSTRUCTION;

// REALISM_INSTRUCTION_CINEMATIC (geminiService.ts ~L850)
const REALISM_INSTRUCTION_CINEMATIC = `
**Master Aesthetic Style (Hollywood Cinematic Spec Ad)**
- **Primary Directive:** High-end commercial product showcase.
- **Visuals:** 8K Unreal Engine 5 render style, Ray-traced reflections, Sub-surface scattering.
- **Lighting:** High-contrast Chiaroscuro lighting. MANDATORY RIM LIGHTING to create 3D silhouettes. No flat lighting.
- **Optics:** Anamorphic bokeh, lens breathing, anamorphic lens flares, shallow depth of field (f/1.2).
- **STRICT NEGATIVE:** NO FACES, NO HUMANS, NO HANDS, NO FINGERS, NO SKIN. The product is the sole protagonist.
- **ENVIRONMENT:** Pristine, atmospheric, and physically grounded. Use volumetric fog and micro-particulates.
- **MOMENTUM:** Maintain a consistent Global Motion Vector (e.g., all motion flows Left-to-Right).
`;

// NO_TEXT_CONSTRAINT (geminiService.ts ~L871)
const NO_TEXT_CONSTRAINT = `
**NEGATIVE CONSTRAINTS (CRITICAL):**
- NO TEXT, NO TYPOGRAPHY, NO WORDS, NO LETTERS.
- NO WATERMARKS, NO LOGOS (unless explicitly provided in the photo), NO OVERLAYS.
- DO NOT ADD BRAND NAMES OR SLOGANS (e.g., Do not add 'AIR', 'NIKE', or 'LOGO').
- The image must be PURELY VISUAL.
`;

// SAFETY_SETTINGS (geminiService.ts ~L907) — string-enum values forwarded verbatim.
const SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
];

// VFX-compositor systemInstruction (executeStudioCommand sourceImages>0 branch,
// geminiService.ts ~L2477). realismProtocol is interpolated per that function.
const buildStudioSystemInstruction = (realismProtocol) => `### Role: High-Fidelity VFX Compositor (Studio Mode)
${realismProtocol}
1. **PIXEL-LOCK BASE:** Maintain 100% identity of the person and environment from IMAGE 1. Only modify the specific target area.
2. **FINGER OCCLUSION (CRITICAL):** The subject's hand from IMAGE 1 must overlap the new object. The object must be "layered" behind the fingers to ensure it looks held, not floating.
3. **LUMEN & KELVIN SYNC:** Detect the primary light source in IMAGE 1. Apply that exact temperature and angle to the new asset.
4. **MATERIAL PHYSICS:** Adapt specularity and refraction based on the asset type (e.g., clear plastic, metallic sheen, or matte glass).
5. **BRAND INTEGRATION:** If the reference asset contains a logo or text, render it precisely on the surface of the object in the final scene, following the 3D curvature of the object.
6. **CONTACT SHADOWS:** Generate realistic contact shadows where the subject's skin touches the new asset.`;

// consistencyRules per referenceImageMode (generateSceneImage, geminiService.ts ~L2053).
// Copied verbatim including original in-function indentation for input parity.
const buildConsistencyRules = (referenceImageMode, ethnicity, scriptType, hasAvatar, hasProduct) => {
    if (referenceImageMode === 'avatar') {
        return `
        **IDENTITY_LOCK + ENVIRONMENT_SYNC:**
        1. **LOCKED (preserve from Reference Image 1, NEVER change across scenes — non-negotiable):** face, skin tone, bone structure, **hair styling** (color AND style — if Reference Image 1 shows hair tied up in a bun or ponytail, render it tied up in EVERY scene; do NOT let it down. If Reference Image 1 shows hair down/loose, do NOT tie it up in any scene. Hair styling drift between scenes is BANNED), wardrobe (color, cut, fabric — same blouse/top across scenes), body type. Scene-driven action MAY change pose/expression, but MUST NOT change hair styling, wardrobe, or body type.
        2. **VARIES (driven by the Scene Prompt, AUTHORITATIVE over IDENTITY_LOCK):** facial expression, gaze direction, body pose, hand position, and held props (mug, phone, etc.). IDENTITY_LOCK does NOT override scene-driven expressions, gestures, or actions. If the Scene Prompt says "looking down with brow furrowed, holding an empty mug," render exactly that — do not inherit the reference's smile or grip.
        2b. **FACE_TO_CAMERA (REQUIRED whenever the scene carries a script line the avatar speaks aloud):** Camera angle CAN vary (frontal, 3/4, side body, over-shoulder) for cinematic variety per CAMERA_MANDATORY. BUT the avatar's face/head MUST be oriented toward camera enough that BOTH eyes and the mouth are clearly visible — required for downstream lip sync. Side body angle with face turned toward camera = ALLOWED. Eyes-closed, looking-down-at-mug, looking-at-own-pointing-finger, full-side-profile-with-face-away = BANNED for talking scenes. For non-speaking B-roll (avatar performs an action without voice-over), free creative direction.
        3. **CAMERA:** angle, distance, and framing follow the CAMERA_MANDATORY block below.
        4. **ENVIRONMENT (FLEXIBLE):** ${scriptType === 'RealEstate'
          ? 'The setting is the PROPERTY being toured (the listing / development) — the agent may move room to room (entrance → sala → kitchen → bedroom → balcony) or stand at the facade per the Scene Prompt. Render a believable Philippine property true-to-tier (never glamorize a modest unit into a luxury one), and never an unrelated location (no malls, no offices, no random streets).'
          : 'Same residence/setting as Reference Image 1 (e.g., the same home interior). The avatar may be in different spots within that residence (kitchen counter → dining table → living room couch) per the Scene Prompt, but never in an unrelated location (no offices, no cafes, no streets).'}
        5. **ETHNICITY:** Strictly **${ethnicity}**.
        6. **NO_UNSOLICITED_PRODUCT:** Do NOT place the brand's product, packaging, bags, bottles, boxes, or ANY branded/labeled props in the scene unless the Scene Prompt explicitly names them. This frame has no product reference photo — any label you render would be an invented fake, the single worst brand-trust failure. Generic unbranded props (plain mug, plain laptop) are fine. When in doubt, leave the surface empty.
        `;
    } else if (referenceImageMode === 'product' && hasProduct) {
        return `
        **PRODUCT_IDENTITY_LOCK:**
        1. **IDENTITY:** Reproduce the product from Reference Image 1 EXACTLY — same packaging shape, same colors, same label position, same proportions, same materials/finish (matte vs glossy). Do NOT redesign, restyle, or substitute the product with a similar-looking product.
        2. **VISUAL_GROUND_TRUTH_PRIORITY (overrides text metadata):** Reference Image 1 is the VISUAL GROUND TRUTH for the product. Do NOT infer visual properties (color, jar shape, label design, finish, fill level, packaging material) from the product NAME or DESCRIPTION text fields below. If text says "Ube-Calamansi Marmalade" but Reference Image 1 shows a red/strawberry-jam jar with a pink label, render the RED/strawberry jar exactly as photographed — do NOT render a purple ube jar. Text metadata controls ONLY: wordmark text language, product category confirmation, and the words appearing on the label. IMAGE wins every visual tie.
        3. **NO_LOGO_HALLUCINATION:** PRESERVE the uploaded product label EXACTLY — every wordmark, illustration, color block, and panel that appears in Reference Image 1 must match in this scene. Do not invent NEW labels, do not blank or simplify the existing label, do not substitute a generic kraft or plain surface. Naturalistic composition (partial hand occlusion, angled view, partial visibility from camera framing) is acceptable as long as the VISIBLE portions of the label match the reference photo content.
        4. **ANATOMICAL_LOCK:** Render ONLY the number of hands the action needs — one hand pouring/holding the product = exactly ONE hand; a two-handed action = exactly TWO. Five fingers each. NEVER add an extra, third, phantom, or duplicate hand to "complete a pair", and never a disembodied hand entering frame. Anatomy matches the action, not a fixed count.
        5. **NO HUMAN FACES / NO INVENTED PEOPLE (reference override):** Do NOT render faces, full bodies, or recognizable people. If Reference Image 1 shows a hand, arm, or person holding or presenting the product, treat that human as NON-CANONICAL: ignore and exclude them — reproduce ONLY the product object and its setting, and NEVER extrapolate, complete, or invent a face/body/model from the partial person in the reference photo. A hand may appear ONLY if THIS scene's prompt explicitly calls for one (per rule 4); otherwise the frame contains NO human at all.
        6. **LUMEN_SYNC:** Use the lighting temperature and color profile from Reference Image 1. Match the warmth/coolness of its highlights.
        7. **SUBJECT:** Focus on the product described in the prompt; the product from Reference Image 1 is the hero.
        `;
    } else if (referenceImageMode === 'both' && hasAvatar && hasProduct) {
        return `
        **DUAL_REFERENCE_LOCK (avatar + product):**

        **FROM AVATAR (Reference Image 1 — character/identity):**
        1. **LOCKED (preserve from Reference Image 1):** face, skin tone, bone structure, hair styling (color AND style — never change between scenes), wardrobe (color, cut, fabric), body type.
        2. **VARIES (driven by Scene Prompt):** facial expression, gaze direction, body pose, hand position.
        2b. **FACE_TO_CAMERA (REQUIRED when the avatar speaks the script line):** both eyes + mouth visible. Side body OK; face-away BANNED for talking scenes.
        3. **CAMERA:** angle, distance, framing per CAMERA_MANDATORY block.
        4. **ENVIRONMENT:** same residence/setting as Reference Image 1 (avatar's home).
        5. **ETHNICITY:** Strictly **${ethnicity}**.

        **FROM PRODUCT (Reference Image 2 — product/label):**
        6. **PRODUCT IDENTITY:** Reproduce the product from Reference Image 2 EXACTLY — same packaging shape, same colors, same label position, same proportions, same materials/finish. Do NOT redesign or substitute the product.
        7. **NO_LOGO_HALLUCINATION:** PRESERVE the uploaded product label EXACTLY — every wordmark, illustration, color block, and panel that appears in Reference Image 2 must match in this scene. Do not invent NEW labels, do not blank or simplify the existing label, do not substitute a generic kraft or plain surface. Naturalistic composition (partial hand occlusion, angled view, partial visibility from camera framing) is acceptable as long as the VISIBLE portions of the label match the reference photo content.
        8. **VISUAL_GROUND_TRUTH_PRIORITY — PRODUCT (overrides text metadata):** Reference Image 2 (product photo) is VISUAL GROUND TRUTH for the product. Do NOT infer product visual properties (color, shape, label design, finish) from the product NAME or DESCRIPTION text. If the photo and the name disagree, the photo wins. Text controls only the wordmark/variant text on the label, not the visual appearance of the jar/container.
        9. **ANATOMICAL_LOCK:** Render ONLY the number of hands the action needs — one hand holding the product = exactly ONE hand; a two-handed action = exactly TWO. Five fingers each. NEVER add an extra, third, phantom, or duplicate hand to "complete a pair", and never a disembodied hand entering frame. Anatomy matches the action, not a fixed count.

        **LIGHTING (DUAL_LUMEN_SYNC):**
        - Scene lighting prioritizes the avatar's environment (Reference Image 1) — the scene IS in the avatar's home, so use that warm/natural light profile for the overall image.
        - Product label colors are preserved as PRINTED on Reference Image 2 — do not relight the label with studio lighting; let it sit naturally in the avatar's environmental light.
        `;
    } else if (referenceImageMode === 'venue' && hasProduct) {
        return `
        **PLACE_IDENTITY_LOCK (Reference Image 1 = the business's REAL place/result photo):**
        1. **IDENTITY:** Reproduce the REAL place from Reference Image 1 — same layout, furniture/
           fixtures, decor, materials, signage/logo text, and color palette. This is the ACTUAL business
           the viewer will visit; it MUST be recognizably the SAME place, not a look-alike or invention.
           If Reference Image 1 is a building exterior/facade, reproduce its distinguishing structure
           exactly — floor count, facade material, window/balcony pattern, roofline, and signage — never
           substitute a generic modern look-alike.
        2. **CAMERA_FREEDOM (authoritative over a static copy):** Compose a genuinely NEW cinematic
           viewpoint — change camera angle, distance, framing, and crop to fit the scene; do NOT flatly
           reproduce the reference photo's framing. It must stay the SAME place (same distinguishing
           architecture, fixtures, signage, and palette) seen from a new angle, NEVER a different or
           invented location.
        3. **TIER_TRUTH:** Match the real tier shown in Reference Image 1. NEVER upgrade or glamorize —
           forbidden: "high-end", "luxury", "premium", "upscale", "5-star", "resort", "modern minimalist".
           A modest place stays modest.
        4. **PEOPLE ALLOWED (unlike product mode):** A Filipino customer or staff member MAY appear IF the
           Scene Prompt calls for a person — strictly ${ethnicity} (authentically Filipino, not glamorized).
           If the Scene Prompt names no person, render the place alone; do NOT invent crowds.
        5. **NO_LOGO_HALLUCINATION:** Preserve the real signage/branding visible in Reference Image 1
           exactly; never invent or substitute a new logo.
        6. **LUMEN_SYNC:** Keep the lighting character (warmth/coolness) of Reference Image 1.
        7. **CINEMATIC_GRADE (enhance, don't fabricate):** Render with a clean, consistent cinematic
           grade — even exposure, gentle filmic contrast, natural color — so scenes cut together as one
           ad. You MAY lift a muddy or underexposed phone-shot capture, but NEVER change the real tier,
           materials, or palette (TIER_TRUTH holds); LUMEN_SYNC's warmth/coolness still anchors to
           Reference Image 1.
        `;
    } else if (referenceImageMode === 'avatar_venue' && hasAvatar && hasProduct) {
        return `
        **AGENT_IN_PROPERTY (Reference Image 1 = the AGENT; Reference Image 2 = the REAL property room):**
        1. **IDENTITY (Reference Image 1, LOCKED across scenes — non-negotiable):** preserve face, skin tone, bone structure, hair styling (color AND style), wardrobe (color, cut, fabric — the SAME outfit every scene), body type. Scene action MAY change pose/expression/gesture, but NEVER identity or wardrobe.
        1b. **FACE_TO_CAMERA (required whenever the agent speaks the line):** both eyes AND mouth clearly visible for lip-sync. Camera angle can vary (frontal, 3/4, side body) but the face stays toward camera. Eyes-closed / full-side-profile-face-away = BANNED for talking scenes.
        2. **ENVIRONMENT (Reference Image 2 = PLACE_IDENTITY_LOCK):** Place the agent AT this exact real place — if Reference Image 2 is a room INTERIOR, she is INSIDE it; if it is the building EXTERIOR / facade, she stands IN FRONT OF it. Reproduce the SAME layout/structure, furniture/fixtures, materials, palette, and signage as Reference Image 2 — the SAME actual place, NOT a look-alike and NOT an invented one. **CAMERA_FREEDOM:** compose a genuinely NEW cinematic angle, distance, and framing for the beat — do NOT flatly reproduce the reference photo's framing — while keeping it recognizably the SAME place (same distinguishing structure, fixtures, signage, palette), never an invented one.
        3. **TIER_TRUTH:** match the real tier of Reference Image 2 — NEVER upgrade or glamorize. Forbidden: "luxury", "high-end", "premium", "upscale", "5-star", "resort", "modern minimalist". A modest unit stays modest.
        4. **ETHNICITY:** the agent is strictly ${ethnicity} (authentically Filipino, not glamorized).
        5. **NO_UNSOLICITED_PRODUCT:** do NOT add branded packaging, boxes, or invented props — this is a property walkthrough, not a product ad.
        6. **AVATAR_RELIGHT (anti-composite):** Light the agent WITH the room — match the direction, color temperature, and intensity of Reference Image 2's environmental light on her face and wardrobe, with contact shadows where she meets the floor/furniture. She must look PHOTOGRAPHED in the room, not pasted on top of it. Preserve her IDENTITY from rule 1 — relight, never restyle.
        7. **CINEMATIC_GRADE:** Apply one consistent, clean cinematic grade across scenes (even exposure, gentle filmic contrast, natural color) so the walkthrough cuts together. You MAY enhance muddy phone-shot capture quality, but NEVER upgrade the real tier (TIER_TRUTH holds).
        `;
    }
    return `
        **STRICT_NEGATIVE (VISUAL AIDS):**
        1. **NO HUMANS:** NO faces, NO skin, NO hands, NO fingers. NO anatomical parts.
        2. **LUMEN_SYNC:** Match the Kelvin temperature of the hair highlights from Reference Image 1 to the rim-lights and highlights of this scene. Use the same color profile.
        3. **SUBJECT:** Focus purely on the object or environment described in the prompt.
        `;
};

// generateSceneImage final-prompt assembly (geminiService.ts ~L2037-2206), replicated.
// `references` is { avatarUrl?, productUrl? } data-URL strings, exactly as the source.
const buildScenePlan = (args, references) => {
    const {
        prompt, aspectRatio, imageQuality, ethnicity, brandColors, scriptType,
        productDescription, productName, variationIndex, referenceImageMode,
    } = args;

    const sanitizedPrompt = prompt.length > 400 ? prompt.substring(0, 400) : prompt;
    const imageConfig = { aspectRatio, imageSize: imageQuality };

    const parts = [];
    if (references.avatarUrl) {
        const match = references.avatarUrl.match(/data:(image\/.+);base64,(.+)/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    if (references.productUrl) {
        const match = references.productUrl.match(/data:(image\/.+);base64,(.+)/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }

    const hasAvatar = !!references.avatarUrl;
    const hasProduct = !!references.productUrl;
    const consistencyRules = buildConsistencyRules(referenceImageMode, ethnicity, scriptType, hasAvatar, hasProduct);

    const humanSubjectInFrame = referenceImageMode === 'avatar' || referenceImageMode === 'both' || referenceImageMode === 'avatar_venue';
    const randomAngle = AVATAR_CAMERA_ANGLES[variationIndex % AVATAR_CAMERA_ANGLES.length];
    const cameraMandatory = humanSubjectInFrame ? `
    **CAMERA_MANDATORY (overrides IDENTITY_LOCK's default-frontal preference):**
    You MUST render this exact framing: ${randomAngle}.
    - The DISTANCE (close-up vs medium vs wide) and ELEVATION (eye-level vs above-eye selfie) are MANDATORY — do NOT collapse to a standard chest-up frontal medium shot.
    - If the Scene Prompt describes an action (gesturing, pointing, holding, looking down at a phone), execute that action AT this framing — do NOT shift the camera to a default flattering portrait angle to accommodate the action.
    ` : "";

    const wardrobeInstruction = "";

    const carriesProductRef = referenceImageMode === 'product' || referenceImageMode === 'both';
    const productContext = (carriesProductRef && (productName || productDescription))
      ? `\n**PRODUCT_IDENTITY_CORE:**\n- NAME: ${productName || 'N/A'}\n- DESCRIPTION: ${productDescription || 'N/A'}`
      : "";

    const realismProtocol = scriptType === 'Cinematic' ? REALISM_INSTRUCTION_CINEMATIC : REALISM_INSTRUCTION_UGC;
    const brandColorInstruction = brandColors.length > 0 ? `\n**BRAND COLORS:** Incorporate these colors subtly: ${brandColors.join(', ')}` : '';

    const serviceCastLock = (scriptType === 'Services' || scriptType === 'RealEstate')
      ? `\n**FILIPINO_CAST_LOCK:** This is a Philippine business. Any human who appears — customer, staff, agent, bystander, or even just hands — MUST be Filipino${ethnicity && !ethnicity.startsWith('Global') ? ` (${ethnicity})` : ''} (authentically Filipino face, build, and styling). NEVER render a foreign / Western / non-Filipino person.`
      : "";

    const finalPromptText = `
    ${consistencyRules}
    ${serviceCastLock}
    ${cameraMandatory}
    ${wardrobeInstruction}
    ${productContext}
    ${brandColorInstruction}
    **Scene Prompt:** ${sanitizedPrompt}
    ${realismProtocol}
    ${NO_TEXT_CONSTRAINT}
    `;

    parts.push({ text: finalPromptText });

    // imageConfig aspectRatio quirk from geminiService.ts (4:5 → 3:4).
    const effectiveAspect = aspectRatio === '4:5' ? '3:4' : aspectRatio;
    return { parts, promptText: finalPromptText, imageConfig, effectiveAspect, systemInstruction: null };
};

// executeStudioCommand assembly (geminiService.ts ~L2460-2490), replicated for case 07.
const buildStudioPlan = (optimizedPrompt, sourceDataUrls, aspectRatio, imageQuality) => {
    const parts = [];
    for (const img of sourceDataUrls) {
        const match = img.match(/data:(image\/.+);base64,(.+)/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }
    parts.push({ text: optimizedPrompt });

    // Spec pins REALISM_INSTRUCTION_UGC for the studio pair (the "Place the product..."
    // prompt does not trip the /cinematic|luxury|high-end|anamorphic|studio/i test).
    const systemInstruction = buildStudioSystemInstruction(REALISM_INSTRUCTION_UGC);
    const effectiveAspect = aspectRatio === '4:5' ? '3:4' : aspectRatio;
    return { parts, promptText: optimizedPrompt, imageConfig: { aspectRatio, imageSize: imageQuality }, effectiveAspect, systemInstruction };
};

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const AVATAR_FIXTURE_PROMPT = "Photorealistic close-up headshot of a friendly Filipina woman in her late 20s, warm smile, hair tied in a low ponytail, plain sage-green blouse, blurred modern Filipino home interior background, soft natural window light. High-end UGC, shot on iPhone 15 Pro, 35mm lens. NO TEXT, NO WATERMARKS, NO LOGOS.";

// 1x1 transparent PNG — placeholder so --dry-run can assemble parts + count them
// without generating the real avatar fixture (which costs an API call).
const PLACEHOLDER_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const mimeForExt = (p) => {
    const e = extname(p).toLowerCase();
    if (e === '.jpg' || e === '.jpeg') return 'image/jpeg';
    return 'image/png';
};

const exists = async (p) => { try { await access(p); return true; } catch { return false; } };

const fileToDataUrl = async (p) => {
    const buf = await readFile(p);
    return `data:${mimeForExt(p)};base64,${buf.toString('base64')}`;
};

async function ensureFixtures({ dryRun, apiKey }) {
    await mkdir(FIXTURE_DIR, { recursive: true });

    const productPath = join(FIXTURE_DIR, 'product.png');
    const venuePath = join(FIXTURE_DIR, 'venue.png');
    const avatarPath = join(FIXTURE_DIR, 'avatar.png');

    // Local copies — no API, safe in dry-run.
    if (!(await exists(productPath))) {
        await copyFile(join(REPO_ROOT, 'public', 'examples', 'ex-product-handheld.png'), productPath);
        console.log('[fixture] copied product.png <- public/examples/ex-product-handheld.png');
    }
    if (!(await exists(venuePath))) {
        await copyFile(join(REPO_ROOT, 'public', 'examples', 'services-venue-clear.png'), venuePath);
        console.log('[fixture] copied venue.png <- public/examples/services-venue-clear.png');
    }

    let avatarDataUrl;
    if (await exists(avatarPath)) {
        avatarDataUrl = await fileToDataUrl(avatarPath);
    } else if (dryRun) {
        avatarDataUrl = `data:image/png;base64,${PLACEHOLDER_PNG_B64}`;
        console.log('[fixture] avatar.png MISSING — using 1x1 placeholder (dry-run only; real run will generate it)');
    } else {
        console.log('[fixture] avatar.png missing — generating once via preview model...');
        const plan = { parts: [{ text: AVATAR_FIXTURE_PROMPT }], systemInstruction: null, effectiveAspect: '9:16' };
        const { imageB64, modelId } = await callGeminiWithFallback('preview', plan, '1K', apiKey);
        if (!imageB64) throw new Error('avatar fixture generation returned no image');
        await writeFile(avatarPath, Buffer.from(imageB64, 'base64'));
        console.log(`[fixture] generated avatar.png via ${modelId}`);
        avatarDataUrl = `data:image/png;base64,${imageB64}`;
    }

    return {
        avatar: avatarDataUrl,
        product: await fileToDataUrl(productPath),
        venue: await fileToDataUrl(venuePath),
    };
}

// ---------------------------------------------------------------------------
// Cases
// ---------------------------------------------------------------------------

const COMMON = { aspectRatio: '9:16', imageQuality: '1K', ethnicity: 'Filipino (Tagalog)', brandColors: [] };

function buildCases(fx) {
    return [
        {
            id: '01-avatar-talking',
            gradingNotes: 'Identity lock + CAMERA_MANDATORY (MEDIUM_FRONTAL, vi=1). Face to camera for lip-sync. No invented product/label.',
            plan: buildScenePlan({
                ...COMMON, scriptType: 'MrBeast', variationIndex: 1, referenceImageMode: 'avatar',
                prompt: 'She leans on the kitchen counter speaking straight to camera with excited wide eyes, gesturing with one open hand, mid-sentence pitching her morning coffee upgrade.',
            }, { avatarUrl: fx.avatar }),
        },
        {
            id: '02-avatar-action',
            gradingNotes: 'Identity lock + CAMERA_MANDATORY (HIGH_ANGLE_SELFIE, vi=3). Scene VARIES (looking down, disappointed) must override the reference smile.',
            plan: buildScenePlan({
                ...COMMON, scriptType: 'MrBeast', variationIndex: 3, referenceImageMode: 'avatar',
                prompt: 'Looking down with brow furrowed at an empty plain white mug in her hand, disappointed and tired, dim early-morning kitchen light.',
            }, { avatarUrl: fx.avatar }),
        },
        {
            id: '03-product-hero',
            gradingNotes: 'PRODUCT_IDENTITY_LOCK + NO_LOGO_HALLUCINATION. MUST contain NO human — the reference shows a hand; rule 5 excludes it.',
            plan: buildScenePlan({
                ...COMMON, scriptType: 'Temu', variationIndex: 0, referenceImageMode: 'product',
                productName: 'Sample Product', productDescription: 'the packaged product exactly as photographed in the reference',
                prompt: 'Macro product hero shot standing on a rustic wooden kitchen counter, golden morning sunlight raking across the label, gentle steam curling behind.',
            }, { productUrl: fx.product }),
        },
        {
            id: '04-both',
            gradingNotes: 'DUAL_REFERENCE_LOCK. Avatar identity + product label fidelity together, CAMERA_MANDATORY (WIDE_BUST_SHOT, vi=2).',
            plan: buildScenePlan({
                ...COMMON, scriptType: 'MrBeast', variationIndex: 2, referenceImageMode: 'both',
                productName: 'Sample Product', productDescription: 'the packaged product exactly as photographed in the reference',
                prompt: 'She holds the product up beside her face at chest height, label facing camera, proud grin, kitchen background.',
            }, { avatarUrl: fx.avatar, productUrl: fx.product }),
        },
        {
            id: '05-none-broll',
            gradingNotes: 'STRICT_NEGATIVE (no refs). NO humans, no hands. Pure b-roll object shot.',
            plan: buildScenePlan({
                ...COMMON, scriptType: 'MrBeast', variationIndex: 0, referenceImageMode: 'none',
                prompt: 'Steam rising from a freshly poured cup of coffee on a wooden table, extreme close-up, golden hour light through a window.',
            }, {}),
        },
        {
            id: '06-venue-services',
            gradingNotes: 'PLACE_IDENTITY_LOCK + FILIPINO_CAST_LOCK. Any humans MUST be Filipino; place must match the reference (venue passed as productUrl — mirrors the venue-mode quirk).',
            plan: buildScenePlan({
                ...COMMON, scriptType: 'Services', variationIndex: 0, referenceImageMode: 'venue',
                prompt: 'A customer chats with a staff member at the counter, natural candid mid-transaction moment, welcoming atmosphere.',
            }, { productUrl: fx.venue }),
        },
        {
            id: '07-studio-pixel-lock',
            gradingNotes: 'executeStudioCommand VFX-compositor: pixel-lock base (avatar) + insert product into her right hand. Finger occlusion + contact shadows; face/pose/lighting/background otherwise identical.',
            plan: buildStudioPlan(
                'Place the product from the second reference image into her right hand, held at chest height with the label facing camera. Keep her face, pose, lighting and background otherwise identical.',
                [fx.avatar, fx.product], '9:16', '1K',
            ),
        },
    ];
}

// ---------------------------------------------------------------------------
// REST transport (mirrors api/gemini/image.ts: generateContent w/ imageConfig,
// systemInstruction, safetySettings). Direct v1beta call, no SDK.
// ---------------------------------------------------------------------------

async function callGeminiOnce(modelId, plan, imageSize, apiKey) {
    const body = {
        contents: [{ parts: plan.parts }],
        generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: { aspectRatio: plan.effectiveAspect, imageSize },
        },
        safetySettings: SAFETY_SETTINGS,
    };
    if (plan.systemInstruction) {
        body.systemInstruction = { parts: [{ text: plan.systemInstruction }] };
    }

    const url = `${API_BASE}/${modelId}:generateContent?key=${apiKey}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), CALL_TIMEOUT_MS);
    let res;
    try {
        res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: ctrl.signal,
        });
    } finally {
        clearTimeout(timer);
    }

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    if (!res.ok) {
        const err = new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);
        err.status = res.status;
        err.body = json;
        throw err;
    }

    const parts = json?.candidates?.[0]?.content?.parts ?? [];
    let imageB64 = null;
    let textPart = null;
    for (const p of parts) {
        if (p.inlineData?.data && !imageB64) imageB64 = p.inlineData.data;
        if (p.text && !textPart) textPart = p.text;
    }
    return { imageB64, textPart };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Retry 429/5xx with backoff (3 attempts, 2s/8s).
async function callGeminiRetry(modelId, plan, imageSize, apiKey) {
    const backoffs = [2000, 8000];
    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
        try {
            return await callGeminiOnce(modelId, plan, imageSize, apiKey);
        } catch (e) {
            lastErr = e;
            const retryable = e.status === 429 || (e.status >= 500 && e.status < 600) || e.name === 'AbortError';
            if (!retryable || attempt === 2) throw e;
            const wait = backoffs[attempt] ?? 8000;
            console.log(`  [retry] ${modelId} attempt ${attempt + 1} failed (${e.status ?? e.name}); waiting ${wait}ms`);
            await sleep(wait);
        }
    }
    throw lastErr;
}

const isNotFound = (e) => e?.status === 404 ||
    /NOT_FOUND/i.test(JSON.stringify(e?.body ?? '')) ||
    /NOT_FOUND|not found/i.test(e?.message ?? '');

// For lite: try primary id, on 404/NOT_FOUND retry once with the -preview fallback.
async function callGeminiWithFallback(modelKey, plan, imageSize, apiKey) {
    const primary = MODEL_IDS[modelKey];
    try {
        const out = await callGeminiRetry(primary, plan, imageSize, apiKey);
        return { ...out, modelId: primary };
    } catch (e) {
        if (modelKey === 'lite' && isNotFound(e)) {
            console.log(`  [fallback] ${primary} not found — retrying with ${LITE_FALLBACK}`);
            const out = await callGeminiRetry(LITE_FALLBACK, plan, imageSize, apiKey);
            return { ...out, modelId: LITE_FALLBACK };
        }
        throw e;
    }
}

// ---------------------------------------------------------------------------
// .env parse (tolerate quotes/CRLF)
// ---------------------------------------------------------------------------

async function loadEnvKey(name) {
    if (process.env[name]) return process.env[name];
    try {
        const envText = await readFile(join(REPO_ROOT, '.env'), 'utf8');
        for (const line of envText.split(/\r?\n/)) {
            const t = line.trim();
            if (t.startsWith(`${name}=`)) return t.slice(name.length + 1).trim().replace(/^['"]|['"]$/g, '');
        }
    } catch { /* no .env */ }
    return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function parseArgs(argv) {
    const args = argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const onlyIdx = args.indexOf('--only');
    const only = onlyIdx >= 0 ? args[onlyIdx + 1] : null;
    const modelsIdx = args.indexOf('--models');
    const models = modelsIdx >= 0
        ? args[modelsIdx + 1].split(',').map((s) => s.trim()).filter(Boolean)
        : ['preview', 'lite'];
    for (const m of models) {
        if (!MODEL_IDS[m]) { console.error(`Unknown model key "${m}" (valid: preview, lite)`); process.exit(1); }
    }
    return { dryRun, only, models };
}

async function main() {
    const { dryRun, only, models } = parseArgs(process.argv);

    const apiKey = await loadEnvKey('GEMINI_API_KEY');
    if (!dryRun && !apiKey) {
        console.error('GEMINI_API_KEY not found (env or .env). Use --dry-run to plan without a key.');
        process.exit(2);
    }

    await mkdir(OUT_DIR, { recursive: true });
    const fx = await ensureFixtures({ dryRun, apiKey });
    const allCases = buildCases(fx);
    const cases = only ? allCases.filter((c) => c.id === only) : allCases;
    if (only && cases.length === 0) {
        console.error(`--only "${only}" matched no case. Valid ids: ${allCases.map((c) => c.id).join(', ')}`);
        process.exit(1);
    }

    console.log(`\n=== scene-image model eval ${dryRun ? '(DRY RUN — no API calls)' : ''} ===`);
    console.log(`models: ${models.join(', ')} | cases: ${cases.length}\n`);

    const manifest = {
        run: {
            timestamp: new Date().toISOString(),
            dryRun,
            models: models.map((m) => ({ key: m, requestedId: MODEL_IDS[m] })),
        },
        cases: {},
    };
    const latencyByModel = Object.fromEntries(models.map((m) => [m, []]));
    let totalCalls = 0, totalOk = 0, totalFail = 0;

    for (const c of cases) {
        const partCount = c.plan.parts.length;
        const promptChars = c.plan.promptText.length;
        manifest.cases[c.id] = { gradingNotes: c.gradingNotes, promptChars, partCount, results: {} };

        for (const modelKey of models) {
            totalCalls++;
            if (dryRun) {
                console.log(`--- [DRY] case ${c.id} | model ${modelKey} (${MODEL_IDS[modelKey]}) | parts=${partCount} | promptChars=${promptChars}`);
                if (c.plan.systemInstruction) {
                    console.log('  systemInstruction:\n' + c.plan.systemInstruction.split('\n').map((l) => '    ' + l).join('\n'));
                }
                console.log('  prompt text:\n' + c.plan.promptText.split('\n').map((l) => '    ' + l).join('\n'));
                console.log('');
                manifest.cases[c.id].results[modelKey] = { planned: true };
                continue;
            }

            const outFile = join(OUT_DIR, `${c.id}-${modelKey}.png`);
            const t0 = Date.now();
            try {
                const { imageB64, textPart, modelId } = await callGeminiWithFallback(modelKey, c.plan, c.plan.imageConfig.imageSize, apiKey);
                const latencyMs = Date.now() - t0;
                latencyByModel[modelKey].push(latencyMs);
                if (imageB64) {
                    await writeFile(outFile, Buffer.from(imageB64, 'base64'));
                    totalOk++;
                    console.log(`  [ok]   ${c.id} | ${modelKey} (${modelId}) | ${latencyMs}ms -> ${outFile}`);
                    manifest.cases[c.id].results[modelKey] = { file: `${c.id}-${modelKey}.png`, modelId, latencyMs, promptChars };
                } else {
                    totalFail++;
                    console.log(`  [nofx] ${c.id} | ${modelKey} (${modelId}) | ${latencyMs}ms | no image part`);
                    manifest.cases[c.id].results[modelKey] = { file: null, modelId, latencyMs, promptChars, error: 'no_image_part', textPart: textPart ?? null };
                }
            } catch (e) {
                const latencyMs = Date.now() - t0;
                totalFail++;
                console.log(`  [err]  ${c.id} | ${modelKey} | ${latencyMs}ms | ${e.message}`);
                manifest.cases[c.id].results[modelKey] = { file: null, modelId: MODEL_IDS[modelKey], latencyMs, promptChars, error: e.message };
            }
        }
    }

    const avgLatency = {};
    for (const m of models) {
        const arr = latencyByModel[m];
        avgLatency[m] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
    }
    manifest.run.summary = { totalCalls, totalOk, totalFail, avgLatencyMs: avgLatency };

    await writeFile(join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));

    console.log('\n=== summary ===');
    console.log(`cases: ${cases.length} | calls: ${totalCalls} | ok: ${totalOk} | fail: ${totalFail}`);
    if (!dryRun) {
        console.log('model      | avg latency');
        console.log('-----------|------------');
        for (const m of models) {
            console.log(`${m.padEnd(10)} | ${avgLatency[m] == null ? 'n/a' : avgLatency[m] + 'ms'}`);
        }
    }
    console.log(`manifest: ${join(OUT_DIR, 'manifest.json')}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
