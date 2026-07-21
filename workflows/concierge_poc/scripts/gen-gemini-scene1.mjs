// Disposable comparison harness: replicate the app's TUNED Director AI scene-image
// payload (referenceImageMode='avatar') verbatim against gemini-3.1-flash-lite-image.
// Prompt blocks are copied byte-for-byte from services/geminiService.ts — DO NOT EDIT them here.
import { GoogleGenAI } from '@google/genai';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
  readFileSync(resolve(repo, '.env'), 'utf8').split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()])
);
if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY missing in .env');

const avatarB64 = readFileSync(resolve(repo, 'workflows/believability-samples/generate-zam-images/assets/zam-face-reference.jpg')).toString('base64');

const ethnicity = 'Filipino';

const consistencyRules = `
        **IDENTITY_LOCK + ENVIRONMENT_SYNC:**
        1. **LOCKED (preserve from Reference Image 1, NEVER change across scenes — non-negotiable):** face, skin tone, bone structure, **hair styling** (color AND style — if Reference Image 1 shows hair tied up in a bun or ponytail, render it tied up in EVERY scene; do NOT let it down. If Reference Image 1 shows hair down/loose, do NOT tie it up in any scene. Hair styling drift between scenes is BANNED), wardrobe (color, cut, fabric — same blouse/top across scenes), body type. Scene-driven action MAY change pose/expression, but MUST NOT change hair styling, wardrobe, or body type.
        2. **VARIES (driven by the Scene Prompt, AUTHORITATIVE over IDENTITY_LOCK):** facial expression, gaze direction, body pose, hand position, and held props (mug, phone, etc.). IDENTITY_LOCK does NOT override scene-driven expressions, gestures, or actions. If the Scene Prompt says "looking down with brow furrowed, holding an empty mug," render exactly that — do not inherit the reference's smile or grip.
        2b. **FACE_TO_CAMERA (REQUIRED whenever the scene carries a script line the avatar speaks aloud):** Camera angle CAN vary (frontal, 3/4, side body, over-shoulder) for cinematic variety per CAMERA_MANDATORY. BUT the avatar's face/head MUST be oriented toward camera enough that BOTH eyes and the mouth are clearly visible — required for downstream lip sync. Side body angle with face turned toward camera = ALLOWED. Eyes-closed, looking-down-at-mug, looking-at-own-pointing-finger, full-side-profile-with-face-away = BANNED for talking scenes. For non-speaking B-roll (avatar performs an action without voice-over), free creative direction.
        3. **CAMERA:** angle, distance, and framing follow the CAMERA_MANDATORY block below.
        4. **ENVIRONMENT (FLEXIBLE):** Same residence/setting as Reference Image 1 (e.g., the same home interior). The avatar may be in different spots within that residence (kitchen counter → dining table → living room couch) per the Scene Prompt, but never in an unrelated location (no offices, no cafes, no streets).
        5. **ETHNICITY:** Strictly **${ethnicity}**.
        6. **NO_UNSOLICITED_PRODUCT:** Do NOT place the brand's product, packaging, bags, bottles, boxes, or ANY branded/labeled props in the scene unless the Scene Prompt explicitly names them. This frame has no product reference photo — any label you render would be an invented fake, the single worst brand-trust failure. Generic unbranded props (plain mug, plain laptop) are fine. When in doubt, leave the surface empty.
        `;

const cameraMandatory = `
    **CAMERA_MANDATORY (overrides IDENTITY_LOCK's default-frontal preference):**
    You MUST render this exact framing: MEDIUM_FRONTAL: Chest-up, eye-level frontal angle. Face squarely toward camera. Steady tripod-style framing. 50mm lens feel. Casual conversational vibe.
    - The DISTANCE (close-up vs medium vs wide) and ELEVATION (eye-level vs above-eye selfie) are MANDATORY — do NOT collapse to a standard chest-up frontal medium shot.
    - If the Scene Prompt describes an action (gesturing, pointing, holding, looking down at a phone), execute that action AT this framing — do NOT shift the camera to a default flattering portrait angle to accommodate the action.
    `;

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

const NO_TEXT_CONSTRAINT = `
**NEGATIVE CONSTRAINTS (CRITICAL):**
- NO TEXT, NO TYPOGRAPHY, NO WORDS, NO LETTERS.
- NO WATERMARKS, NO LOGOS (unless explicitly provided in the photo), NO OVERLAYS.
- DO NOT ADD BRAND NAMES OR SLOGANS (e.g., Do not add 'AIR', 'NIKE', or 'LOGO').
- The image must be PURELY VISUAL.
`;

const scenePrompt = 'She sits at her small home desk in her bedroom, facing the camera directly with a soft, warm, about-to-share-a-secret expression, lips just parting as she begins to speak to her audience. Both hands rest casually near a plain mug on the desk. Morning window light from her left. She is recording a casual talking video for social media.';

const finalPromptText = `
    ${consistencyRules}

    ${cameraMandatory}



    **Scene Prompt:** ${scenePrompt}
    ${REALISM_INSTRUCTION}
    ${NO_TEXT_CONSTRAINT}
    `;

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-lite-image',
  contents: { parts: [
    { inlineData: { mimeType: 'image/jpeg', data: avatarB64 } },
    { text: finalPromptText },
  ]},
  config: { imageConfig: { aspectRatio: '9:16', imageSize: '1K' } },
});

const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
if (!part?.inlineData) {
  console.error(JSON.stringify(response, null, 2).slice(0, 3000));
  throw new Error('No image in response');
}
const out = resolve(repo, '.tmp/concierge-poc/scene1-zam-gemini.png');
writeFileSync(out, Buffer.from(part.inlineData.data, 'base64'));
console.log('saved', out);
