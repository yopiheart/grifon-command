// Test A v2: same tuned blocks, but explicit FIRST-PERSON front-camera close-up framing
// (v1 rendered a third-person view with the phone visible + too far).
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

const finalPromptText = `
    **CAST:** A Filipina woman in her mid-20s, an office employee on her break. Strictly **Filipino** (authentically Filipino face, build, and styling — never a foreign / Western / non-Filipino person). Smart-casual office attire.

    **CAMERA_MANDATORY (FIRST-PERSON FRONT CAMERA — CRITICAL):**
    - This image IS the view through her phone's front camera. The phone is NEVER visible in the image — you cannot see the device you are looking through.
    - HIGH_ANGLE_SELFIE CLOSE-UP: camera slightly above eye-level looking down at her face; she looks UP into the lens, face fully toward camera.
    - CLOSE framing: her face and upper body FILL the frame — from the top of her head down to her chest ONLY. No waist, no legs.
    - Her own extended arm enters the bottom corner of the frame with natural front-camera wide-angle distortion.
    - Vertical 9:16, imperfect candid framing slightly off-center.

    **Scene Prompt:** She is filming a walking selfie vlog of herself on a wide modern sidewalk in Bonifacio Global City on a bright afternoon, walking at a relaxed pace while talking to her audience, lips parted mid-word, her free left hand raised mid-gesture at chest height. Blurred modern glass buildings, planter strips with young trees, and blurred pedestrians behind her.
    ${REALISM_INSTRUCTION}
    ${NO_TEXT_CONSTRAINT}
    `;

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
const response = await ai.models.generateContent({
  model: 'gemini-3.1-flash-lite-image',
  contents: { parts: [{ text: finalPromptText }] },
  config: { imageConfig: { aspectRatio: '9:16', imageSize: '1K' } },
});
const part = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
if (!part?.inlineData) { console.error(JSON.stringify(response).slice(0, 2000)); throw new Error('No image'); }
writeFileSync(resolve(repo, '.tmp/concierge-poc/autocast-gemini-v2.png'), Buffer.from(part.inlineData.data, 'base64'));
console.log('saved autocast-gemini-v2.png');
