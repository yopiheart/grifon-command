import type { GenerateContentResponse } from "@google/genai";
import { BusinessInfo, Script, Scene, StoryboardResponse, VideoPrompt, MarketResearchInput, MarketResearchReport, OfferOptimizerInput, OfferOptimizerResult, VideoEditInput, OptimizedPromptResponse, CaptionHeadlineInput, DayContent, AdVariant, UplinkData, CinematicSpecConfig, VisualTheme, CinematicNarrativeScene, VideoModelType, InfluencerConfig, InfluencerStrategicInput, InfluencerScriptResponse } from '../types';
import { getSupabase } from './supabaseClient';

// Server proxy for text-class Gemini calls. Replaces direct getAi() at the
// transport layer only — prompts, schemas, and model IDs are unchanged.
// See workflows/gemini_proxy_slice.md for the migration plan.
const proxyGenerateContent = async (params: any): Promise<GenerateContentResponse> => {
  return proxyCall('/api/gemini/text', params);
};

const proxyGenerateImage = async (params: any): Promise<GenerateContentResponse> => {
  return proxyCall('/api/gemini/image', params);
};

// Shared in-flight refresh promise: when many proxy calls hit a 401 at once,
// dedupe to a single refreshSession round-trip instead of N concurrent ones.
let inFlightRefresh: Promise<string | null> | null = null;

const refreshAccessToken = async (): Promise<string | null> => {
  if (inFlightRefresh) return inFlightRefresh;
  const sb = getSupabase();
  inFlightRefresh = (async () => {
    try {
      const { data, error } = await sb.auth.refreshSession();
      if (error || !data.session?.access_token) return null;
      return data.session.access_token;
    } catch {
      return null;
    } finally {
      // Clear AFTER the awaiting callers see this promise resolve, so the next
      // 401 (post-refresh-window) starts a fresh refresh.
      setTimeout(() => { inFlightRefresh = null; }, 0);
    }
  })();
  return inFlightRefresh;
};

const proxyFetch = async (endpoint: string, params: any, token: string): Promise<Response> => {
  // Abort 5s before Vercel's hard 60s ceiling so the client surfaces a clear
  // PROXY_TIMEOUT instead of an opaque 504 from the platform.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);
  try {
    return await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      const timeoutErr: any = new Error('PROXY_TIMEOUT: request exceeded 55s ceiling');
      timeoutErr.status = 504;
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
};

const proxyCall = async <T = GenerateContentResponse>(endpoint: string, params: any): Promise<T> => {
  const sb = getSupabase();
  const { data: sessionData } = await sb.auth.getSession();
  let token = sessionData.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');

  let res = await proxyFetch(endpoint, params, token);

  // One-shot silent JWT refresh + retry on 401. If the refresh itself fails
  // (refresh token expired, network down), sign out so onAuthStateChange routes
  // the user back to the auth screen — wizard persistence row stays intact.
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (!newToken) {
      try { await sb.auth.signOut(); } catch { /* best-effort */ }
      throw new Error('NOT_AUTHENTICATED');
    }
    token = newToken;
    res = await proxyFetch(endpoint, params, token);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({} as any));
    if (res.status === 429) {
      const err: any = new Error(body?.detail ? `429: ${body.detail}` : 'RESOURCE_EXHAUSTED');
      err.status = 429;
      err.retry_after_seconds = body?.retry_after_seconds ?? 30;
      throw err;
    }
    const err: any = new Error(`PROXY_ERROR_${res.status}: ${body?.error ?? 'unknown'}${body?.detail ? ` — ${body.detail}` : ''}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return (await res.json()) as T;
};

type VideoPollResponse =
  | { done: false; operation: any }
  | { done: true; url: string; downloadUrl: string; mimeType: string }
  | { done: true; error: { message?: string; code?: string } };

const proxyGenerateVideo = (params: any): Promise<{ operation: any }> =>
  proxyCall<{ operation: any }>('/api/gemini/video', params);

const proxyPollVideoOperation = async (operation: any): Promise<VideoPollResponse> => {
  try {
    return await proxyCall<VideoPollResponse>('/api/gemini/video/poll', { operation });
  } catch (err: any) {
    if (err?.status === 502) {
      const code = err.body?.error;
      const status = err.body?.status;
      if (code === 'veo_download_failed') throw new Error(`VEO_DOWNLOAD_FAILED: ${status}`);
      if (code === 'storage_upload_failed') throw new Error(`STORAGE_UPLOAD_FAILED: ${status}`);
    }
    throw err;
  }
};

const textModel = 'gemini-3.1-flash-lite-preview';
const fastTextModel = 'gemini-3.1-flash-lite-preview'; 
const researchTextModel = 'gemini-3.1-pro-preview'; 
const avatarModel = 'gemini-3.1-flash-image-preview'; 
const sceneImageModel = 'gemini-3.1-flash-image-preview'; 

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const VIDEO_MODEL_SPECS: Record<VideoModelType, {
  durations: number[];
  resolutions: string[];
  aspectRatios: string[];
  supportsAudio: boolean;
  maxElements: number;
  requiresStartFrame: boolean;
}> = {
  'Kling_O1': {
    durations: [5, 10],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['9:16', '16:9', '1:1'],
    supportsAudio: false,
    maxElements: 7,
    requiresStartFrame: true,
  },
  'Kling_2.5_Turbo': {
    durations: [5, 10],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['9:16', '16:9', '1:1'],
    supportsAudio: false,
    maxElements: 5,
    requiresStartFrame: true,
  },
  'Kling_2.6': {
    durations: [5, 10, 15],
    resolutions: ['720p', '1080p', '2k'],
    aspectRatios: ['9:16', '16:9', '1:1', '4:5'],
    supportsAudio: true,
    maxElements: 5,
    requiresStartFrame: false,
  },
  'Veo_3.1_Fast': {
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'],
    aspectRatios: ['9:16', '16:9'],
    supportsAudio: true,
    maxElements: 3,
    requiresStartFrame: false,
  },
  'Veo_3.1_Quality': {
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'],
    aspectRatios: ['9:16', '16:9'],
    supportsAudio: true,
    maxElements: 3,
    requiresStartFrame: false,
  },
  'Veo_3.1_Lite': {
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['9:16', '16:9'],
    supportsAudio: true,
    maxElements: 0, // Lite does not support referenceImages per Google docs
    requiresStartFrame: false,
  }
};

// Maps the UI-facing engine names to actual backend model IDs.
// Kling variants are routed through Veo 3.1 (user chose Veo provider for Gate 1 P1).
const VEO_FAST = 'veo-3.1-fast-generate-preview';
const VEO_QUALITY = 'veo-3.1-generate-preview';
const VEO_LITE = 'veo-3.1-lite-generate-preview';

export const VIDEO_MODEL_ROUTING: Record<VideoModelType, { modelId: string; viaFallback: boolean }> = {
  'Veo_3.1_Fast':     { modelId: VEO_FAST,    viaFallback: false },
  'Veo_3.1_Quality':  { modelId: VEO_QUALITY, viaFallback: false },
  'Veo_3.1_Lite':     { modelId: VEO_LITE,    viaFallback: false },
  'Kling_O1':         { modelId: VEO_QUALITY, viaFallback: true },
  'Kling_2.5_Turbo':  { modelId: VEO_FAST,    viaFallback: true },
  'Kling_2.6':        { modelId: VEO_QUALITY, viaFallback: true },
};

export interface GeneratedVideoResult {
  url: string;
  downloadUrl: string;
  mimeType: string;
}

interface GenerateVideoOpts {
  signal?: AbortSignal;
  onStatus?: (status: string) => void;
}

const parseDataUrl = (dataUrl: string): { imageBytes: string; mimeType: string } => {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid image data URL');
  return { mimeType: match[1], imageBytes: match[2] };
};

export const generateVideo = async (
  config: { model: VideoModelType; prompt: string; duration: number; resolution: string; aspectRatio: string; audioEnabled: boolean; startFrame?: string; endFrame?: string },
  opts: GenerateVideoOpts = {}
): Promise<GeneratedVideoResult> => {
  const routing = VIDEO_MODEL_ROUTING[config.model];
  if (!routing) throw new Error(`UNSUPPORTED_MODEL: ${config.model}`);
  if (!config.prompt?.trim()) throw new Error('EMPTY_PROMPT');

  const params: any = {
    model: routing.modelId,
    prompt: config.prompt.trim(),
    config: {
      numberOfVideos: 1,
      aspectRatio: config.aspectRatio,
      resolution: config.resolution,
      durationSeconds: config.duration,
      // generateAudio omitted: @google/genai SDK rejects the field on the Gemini API backend
      // (even when false) — it's Vertex AI only. Re-add when migrating to Vertex.
    },
  };

  if (config.startFrame) {
    params.image = parseDataUrl(config.startFrame);
  }
  if (config.endFrame) {
    params.config.lastFrame = parseDataUrl(config.endFrame);
  }

  opts.onStatus?.('SUBMITTING_JOB');
  let { operation } = await proxyGenerateVideo(params);

  let result: VideoPollResponse;
  while (true) {
    if (opts.signal?.aborted) throw new Error('ABORTED');
    opts.onStatus?.('RENDERING');
    await delay(10000);
    result = await proxyPollVideoOperation(operation);
    if (result.done) break;
    operation = result.operation;
  }

  if ('error' in result) {
    if (result.error.code) throw new Error(result.error.code);
    throw new Error(`VEO_ERROR: ${result.error.message ?? 'Unknown Veo error'}`);
  }

  opts.onStatus?.('DOWNLOADING');
  return { url: result.url, downloadUrl: result.downloadUrl, mimeType: result.mimeType };
};

// CAMERA ANGLE SET — rebalanced 2026-05-08-late-late-evening for storyboard-variety + face-to-camera safety.
// Composition: 3 frontal-ish (positions 1, 2, 4), 3 side-ish but face-toward-camera (positions 3, 5, 6).
// Rotated linearly via `variationIndex % AVATAR_CAMERA_ANGLES.length` so consecutive scenes vary.
// All side-angle entries explicitly specify "face turned toward camera" so lip-sync survives downstream voicing.
const AVATAR_CAMERA_ANGLES = [
    "INTIMATE_CLOSE_UP: Framing neck up. Face fully toward camera. Focus: Eyes. Mandatory: Slight lens breathing and micro-handheld jitter.",
    "MEDIUM_FRONTAL: Chest-up, eye-level frontal angle. Face squarely toward camera. Subtle handheld sway. 50mm lens feel. Casual conversational vibe.",
    "SIDE_PROFILE_TALK: Body at 45-degree left angle BUT face/head turned toward camera so both eyes and mouth remain visible. Off-center composition. Mandatory: Imperceptible slow-creep dolly-in.",
    "WIDE_BUST_SHOT: Waist up, near-frontal angle. Face toward camera. Natural handheld sway. Background depth-of-field matches 85mm lens.",
    "HIGH_ANGLE_SELFIE: Camera above eye-level looking down at face. Relatable, casual handheld vlog vibe with consistent micro-jitter. Subject looks UP at camera (face fully toward camera).",
    "DYNAMIC_SHOULDER: Right side body profile with face turned back toward camera (3/4 view of face). Includes subtle parallactic shift against background. Both eyes visible."
];

const LIGHTING_TOKENS = {
  AUTHORITY: "3-point lighting, Godox SL60W with large softbox at 45-degrees, strong rim lighting on shoulders, Rembrandt shadow on cheek.",
  NEON_VLOG: "SmallRig RGB tube lights in background, vibrant accent colors, sharp digital highlights, high-energy mood.",
  NATURAL_STUDIO: "Soft window light simulation, neutral color temperature (5600K), airy and approachable, soft shadows.",
  DARK_MINIMALIST: "Moody Chiaroscuro lighting, deep blacks, single high-contrast key light, luxury cinematic feel."
};

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

const MRBEAST_THUMBNAIL_STYLE = `
**Aesthetic:** Hyper-Realistic High-End Commercial Photography.
- **Visual Rule:** Zero 3D-rendering, zero animation, zero cartoonish smoothing. 
- **Skin Texture:** Maintain 100% photographic skin detail, including pores, fine lines, and natural sheen. 
- **Lighting:** Sharp studio lighting with strong rim lights (backlighting) to make the subject pop. 
- **Camera:** shot on Sony A1, 35mm f1.4 lens, hyper-sharp focus on the subject.
- **Composition:** High-resolution composite. The subject in the foreground must look like a real human being standing in the scene.
- **Colors:** Vibrant and saturated, but grounded in real-world colors.
`;

const NO_TEXT_CONSTRAINT = `
**NEGATIVE CONSTRAINTS (CRITICAL):** 
- NO TEXT, NO TYPOGRAPHY, NO WORDS, NO LETTERS.
- NO WATERMARKS, NO LOGOS (unless explicitly provided in the photo), NO OVERLAYS.
- DO NOT ADD BRAND NAMES OR SLOGANS (e.g., Do not add 'AIR', 'NIKE', or 'LOGO').
- The image must be PURELY VISUAL.
`;

const NANO_BANANA_INSTRUCTION = `
You are the "Nano Banana Prompt Master" (VFX Edition).
Expert in High-Fidelity Image Inpainting and Object Integration.

### CORE EDITING PROTOCOLS:
1. **ROLE IDENTIFICATION:** Explicitly treat Image 1 as the "Pixel-Lock Base" and Image 2 as the "Reference Asset."
2. **CONTACT PHYSICS:** For swaps, describe how the subject's hand/fingers 'Occlude' (overlap) the object. Describe the grip strength and skin-to-surface contact.
3. **LUMEN MATCHING:** Match the direction, temperature (Kelvin), and intensity of the light in the base photo to the new object.
4. **MATERIAL INTEGRATION:** Describe how the new object's texture (clear plastic, condensation, steam) interacts with the environment.
5. **NO REDESCRIPTION:** Do NOT describe elements in the base photo that are not changing. Focus 100% on the intersection of the new asset and the original scene.

### SCENE ARCHITECT MODE (IF NO IMAGES PROVIDED):
- If no images are provided, act as a 'Scene Architect'. 
- Create a full, descriptive, photorealistic prompt from scratch based on the user's request. 
- Maintain the Global Consistency Rules (Ethnicity, Aspirational environment).
- vVibe: High-end professional photography.

Output Format: Return valid JSON.
{
  "purpose": "A technical VFX summary of the swap or architectural vision",
  "finalPrompt": "A physics-heavy technical description focusing on lighting, shadows, and composition",
  "notes": "Lens and depth-of-field matching tips"
}
`;

// Inlined string-enum values from @google/genai to keep the SDK out of the
// browser bundle. The proxy forwards these verbatim to the server SDK, which
// accepts them as the corresponding HarmCategory / HarmBlockThreshold values.
const SAFETY_SETTINGS = [
    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
];

const retryWithBackoff = async <T>(fn: () => Promise<T>, retries = 5, delayMs = 4000): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    const errorString = JSON.stringify(error);
    const msg = error?.message || '';
    
    const isQuota = 
        msg.includes('429') || 
        msg.includes('RESOURCE_EXHAUSTED') || 
        msg.includes('Quota exceeded') ||
        errorString.includes('429') || 
        errorString.includes('RESOURCE_EXHAUSTED') ||
        error?.status === 429 ||
        error?.status === 503 ||
        error?.error?.code === 429 ||
        error?.error?.status === 'RESOURCE_EXHAUSTED';

    if (retries > 0 && isQuota) {
      console.warn(`Quota hit (429). Retrying in ${delayMs}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return retryWithBackoff(fn, retries - 1, delayMs * 2);
    }
    throw error;
  }
};

const cleanJson = (text: string) => {
  if (!text) return "{}";
  let cleaned = text.replace(/```json\s*|```/g, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
     const lastBracket = cleaned.lastIndexOf(']');
     if (lastBracket !== -1) cleaned = cleaned.substring(firstBracket, lastBracket + 1);
  } else if (firstBrace !== -1) {
      const lastBrace = cleaned.lastIndexOf('}');
      if (lastBrace !== -1) cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  return cleaned;
};

export const generateVideoEditPlan = async (input: VideoEditInput): Promise<string> => {
    await delay(1000);
    const parts: any[] = [];
    const promptText = `
### Role: MrBeast-Style Content Strategist & AI Video Editor
You help creators make viral short-form and long-form videos by fusing the **MrBeast Formula** with **Sabri Suby’s Copywriting/Speaking Psychology**.

### YOUR TASK
Using the provided Script and Key Visuals (Screenshots):
1. Create a step-by-step EDITING PLAN.
2. Specify OVERLAY TEXT, FONT COLOR, TRANSITIONS, SFX, and BGM.
3. **CRITICAL:** Analyze the provided images. If they look low quality, dark, or boring compared to the script's energy, CALL IT OUT and suggest a better innovative approach.

### INPUT CONTEXT
**Script:**
${input.scriptText}

**User Instructions:**
${input.instructions || "None"}

### CORE FORMULA & RULES

**1. Opening Scene (The Hook - First 3s)**
- Visuals must be shocking, extreme, or curiosity-driven.
- Avatar must be present with dynamic camera movement (Zoom/Pan). NO static shots.
- Text Overlay: Only the most important hook words.
- **Hook Rule:** Generate a START FRAME and END FRAME prompt for the hook to guide motion tools (Veo 3). Start = hook, End = payoff.

**2. Thumbnail Rules**
- No text. Pure visual storytelling.
- High contrast, bold colors.
- Avatar with strong facial expression.

**3. Video Style & Pacing**
- Fast-paced, no fluff. Scene changes every few seconds.
- Visual storytelling must be clear even without sound.
- Emotional engagement: Shock, Laughter, Awe, FOMO.
- Aspect Ratio: Default to 9:16 (TikTok/Reels) unless specified.

**4. Editing Specifics**
- **Transitions:** Suggest flash, zoom, whip pan, particles.
- **Audio:** Suggest SFX (Whoosh, Glitch, Pop) and Background Music mood.
- **Writing (Sabri Suby):** 4th-grade reading level. Punchy sentences. No jargon. Answer "Why care? Why now?".
- **Speaking:** Eliminate filler words. Use downward inflection for authority.

### OUTPUT STRUCTURE (Reply exactly like this)

🎬 **Title Options (MrBeast-Style)**
[3 options: Short, Specific, Emotionally Loaded]

🖼️ **Thumbnail Concept**
[Visual story, colors, facial expression]

🎥 **Opening Scene (0:00-0:03)**
- **Visual Action:**
- **Overlay Text:**
- **Camera Move:**
- **SFX/Audio:**

✂️ **The Viral Editing Plan (Scene by Scene)**
[Breakdown the rest of the video. For each scene, specify:]
- **Visuals (Reference provided images):**
- **Overlay/Graphics:**
- **Transition to next:**
- **Sound Design:**

✅ **Formula Check**
[List which rules were applied and critique any weak points in the user's raw input]
    `;
    
    parts.push({ text: promptText });

    if (input.sceneImages && input.sceneImages.length > 0) {
        for (const base64Url of input.sceneImages) {
            const match = base64Url.match(/data:(image\/.+);base64,(.+)/);
            if (match) {
                parts.push({
                    inlineData: {
                        mimeType: match[1],
                        data: match[2]
                    }
                });
            }
        }
    }
    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: textModel,
        contents: { parts },
        config: {
            safetySettings: SAFETY_SETTINGS,
            thinkingConfig: { thinkingBudget: 4000 }
        }
    }));

    return response.text || "Video Edit Plan Generation Failed. Please try again.";
};

export const generateOfferOptimization = async (input: OfferOptimizerInput): Promise<OfferOptimizerResult> => {
    await delay(1000);
  const prompt = `
### Role: Zam Grifon Offer Strategist GPT
You fuse **Alex Hormozi's $100M Offers (Grand Slam Value Equation)**, **Sabri Suby's Godfather Offer**, **Cialdini's 7 Principles of Influence**, and **MrBeast's Viral Specificity** into a single offer-stack engine.

### YOUR GOAL
Build a 3-tier OFFER STACK so good only an idiot would say no. The user will feed each tier directly into a video ad pipeline (Director AI), so every field must be PRODUCTION-READY copy — not a worksheet, not a template, not bracketed placeholders.

### INPUT CONTEXT
Product: ${input.productName}
Current Price: ${input.currentPrice}
Target Audience: ${input.targetAudience}
Market Research Context: ${input.marketResearchText}
Language: ${input.language}

### THE HORMOZI VALUE EQUATION (apply to EVERY tier)
For each offer tier, you MUST reason through:
  Value = (Dream Outcome × Perceived Likelihood of Achievement) ÷ (Time Delay × Effort & Sacrifice)

You will articulate each variable in the \`hormoziLogic\` object per tier:
- dreamOutcome: The exact transformation the customer gets (visceral, specific).
- likelihood: WHY they will succeed with this (mechanism, proof, system — not generic confidence).
- timeDelay: How fast they see the result (be specific: "in 7 days", "first session", "by next payday").
- effort: What they DO NOT have to do (the friction you removed: no hours, no learning curve, no equipment, etc.).

A weak tier = vague Dream + low Likelihood + long Delay + high Effort. A Grand Slam tier = visceral Dream + ironclad Likelihood + fast Delay + near-zero Effort.

### MANDATORY HARD RULES
1. **NO PLACEHOLDERS.** Never output "[Price prediction]", "[Specific item]", "[Bracketed]", "TBD", "xxx", or "[your...]". Every field is real, final copy.
2. **CONCRETE ₱ PRICING.** Every \`actualPrice\`, \`totalValue\`, and \`valueStack[].value\` is a real Philippine peso amount (e.g., "₱1,997", "₱9,997"). No ranges, no "around X", no placeholders.
3. **CONCRETE SCARCITY.** Every \`scarcity\` field names a real number or window: "First 50 buyers only", "Closes Friday 11:59 PM", "Limited to 10 slots this month". No vague "limited time" without a number/date.
4. **MANDATORY GUARANTEE.** Every tier has a Risk Reversal in \`guarantee\`. Default to "Better-than-money-back": full refund + an extra ₱500 (or 2x their money) if no result by [specific time]. Make refusal feel insane.
5. **MECHANISM NAMING.** Every \`name\` is a proprietary-sounding mechanism, not a generic descriptor. ✅ "The 7-Day Niche Ladder", "The Bleeding-Neck Reset", "Operator Tier" / ❌ "Starter Pack", "Premium Bundle", "VIP".
6. **PITCH IS SHIPPABLE.** Every \`pitch\` is 1-2 sentences a Director AI script can read aloud verbatim. Punchy, specific, customer-facing.
7. **NO-BRAINER LOGIC.** Every \`noBrainerLogic\` references the anchor — quote the totalValue gap, the time saved, or the alternative cost (agency, freelancer, course). Specific numbers.
8. **CIALDINI LEVERS.** Across the stack, weave in Scarcity, Authority, Social Proof, Reciprocity, and Commitment naturally — don't list them, embed them in copy.
9. **VOICE.** ${input.language === 'Taglish' ? 'Use natural Filipino-English Taglish — conversational, punchy, Bryan/Olivia SMB tone. Use ₱ peso amounts. Avoid academic English.' : 'Use punchy, action-driven English at a 4th-5th grade reading level. Use ₱ peso amounts.'}

### THE 3-TIER OFFER STACK
You will build exactly three tiers in this order:

A) **Tripwire** — low-barrier first-purchase under ₱500 ideally. Goal: get them off the fence and onto the customer list. \`probability\` should be High.
B) **Core Offer** — the main profit driver. Stack 3-6 components in \`valueStack\` so \`totalValue\` is at LEAST 5x the \`actualPrice\`. This is the offer Director AI builds the ad around. \`probability\` should be High.
C) **High-Ticket** — VIP / Done-for-You / Bulk. Higher anchor, scarcer slots. \`probability\` is typically Low or Medium.

### THE DIRECTOR PAYLOAD (CRITICAL)
After the three tiers, fill \`directorPayload\` — this feeds straight into the Director AI wizard. Each field is the SHORTEST production copy that fits in a one-line wizard input:
- offer: A 1-2 sentence pitch synthesizing the Core Offer (what they get + the price + the no-brainer hook). Reads naturally inside an ad script. Example: "Get the 7-Day Niche Ladder system — 6 modules, 1-on-1 launch call, 90-day result guarantee — for ₱1,997 (was ₱9,997)."
- productName: Short product name string (max 6 words).
- targetAudience: One-line avatar (e.g., "Frustrated freelancers stuck under ₱40k/mo").
- mainBenefit: The #1 outcome in one line.
- painPoint: The bleeding-neck pain in one line.
- usp: The unique mechanism / contrarian truth in one line.

### ANALYSIS SECTION
Before outputting tiers, write a \`analysis\` paragraph (3-5 sentences) explaining your pricing logic: target FB Ads CPA, blended margin, why this stack out-converts the current ${input.currentPrice} price point.

### CONVERSION ASSETS
Fill \`conversionAssets\` with the supporting brand brief — brand name, services, target avatar, benefit, problem, pain point, differentiator (the mechanism), 3-5 features, and 3-5 hex codes for the brand palette.

### OUTPUT FORMAT
Return ONLY valid JSON matching this exact shape — no markdown, no commentary, no prefix:

{
  "analysis": "string (3-5 sentence pricing rationale)",
  "tripwire":   { "name": "string", "pitch": "string", "valueStack": [{"item":"string","value":"₱X,XXX"}], "totalValue": "₱X,XXX", "actualPrice": "₱XXX", "noBrainerLogic": "string", "scarcity": "string (concrete window/quantity)", "guarantee": "string (risk reversal)", "hormoziLogic": {"dreamOutcome":"string","likelihood":"string","timeDelay":"string","effort":"string"}, "probability": "High" },
  "coreOffer":  { /* same shape — 3-6 valueStack items, totalValue ≥ 5x actualPrice */ },
  "highTicket": { /* same shape — premium price, scarcer slots */ },
  "conversionAssets": {
    "brandName": "string",
    "productServiceList": ["string", ...],
    "target": "string",
    "achieveOrEliminate": "string",
    "mainBenefit": "string",
    "mainProblem": "string",
    "mainPainPoint": "string",
    "mainDifferentiator": "string",
    "mainFeatures": ["string", ...],
    "brandPalette": ["#XXXXXX", ...]
  },
  "directorPayload": {
    "offer": "string (1-2 sentences, ad-ready)",
    "productName": "string",
    "targetAudience": "string",
    "mainBenefit": "string",
    "painPoint": "string",
    "usp": "string"
  }
}

REQUIRED: Every string is final production copy. Every ₱ amount is real. Every scarcity has a number or date. Every tier has a guarantee. No placeholders anywhere.
  `;

  // TEMP: switched to textModel (gemini-3.1-flash-lite-preview) for cost/speed eval.
  // Revert to researchTextModel after evaluation.
  const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
    model: textModel,
    contents: { parts: [{ text: prompt }] },
    config: {
        responseMimeType: "application/json",
        safetySettings: SAFETY_SETTINGS
    }
  }));

  const rawText = response.text || "{}";
  return JSON.parse(cleanJson(rawText)) as OfferOptimizerResult;
};

/**
 * MarketMind — server-side prompt. The system instruction, OUTPUT TEMPLATE, and
 * builder live in api/_lib/prompts.ts (server-only) and execute in api/gemini/flow.ts.
 * The client never sees the prompt — sends only `{flow, input}` and receives the
 * parsed MarketResearchReport.
 */
export const generateMarketResearch = async (input: MarketResearchInput): Promise<MarketResearchReport> => {
  await delay(1000);
  return retryWithBackoff(() => proxyCall<MarketResearchReport>('/api/gemini/flow', { flow: 'marketmind', input }));
};

const classifyTemuProduct = async (product: string, description: string): Promise<'ASMR' | 'Reaction' | 'Utility'> => {
   const prompt = `
    Analyze this product for a Temu/Viral Haul video strategy.
    Product: "${product}"
    Description: "${description}"

    Classify into ONE of these 3 types based on this technical report:
    1. **ASMR:** Clocks, organizers, keyboards, satisfying textures, gadgets with clicks/snaps. Focus: "Clean Core".
    2. **Reaction:** Pets, cute items, weird gifts, shocking value, toys. Focus: "Kawaii Chaos".
    3. **Utility:** Problem solvers, duo filler gadgets, cleaning tools, car accessories. Focus: "Real Home".

    Output ONLY one word: ASMR, Reaction, or Utility.
    `;
    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: fastTextModel,
        contents: prompt
    }));

    const text = response.text?.trim().toUpperCase() || 'REACTION';
    if (text.includes('ASMR')) return 'ASMR';
    if (text.includes('UTILITY')) return 'Utility';
    return 'Reaction';
};

export const generateAdScript = async (
    businessInfo: BusinessInfo,
    brandName: string,
    language: 'English' | 'Taglish',
    offer: string = '',
    chosenAngleBrief: string = ''
): Promise<Script> => {
    await delay(1000); 
  
  const isTestimonial = businessInfo.scriptType === 'Testimonial';
  const isTemu = businessInfo.scriptType === 'Temu';

  const COMMON_RULES = `
  **CORE CONSTRAINTS (MANDATORY):**
  - **NO PRICE:** Under no circumstances mention price or offer pricing. Maintain a curiosity gap.
  - **FEATURE FILTER:** Pick ONLY the top 1-2 most viral/compelling features from the provided list: "${businessInfo.features}". Omit everything else.
  - **LOGIC LOCK:** Use Brand Name "${brandName}" EXACTLY. Product mentions can be shortened naturally — say "this kape", "ito", "${brandName}", or descriptive shorthand. Do NOT recite the full SKU/product name verbatim ("${businessInfo.product}"); that reads like a product page, not an ad.
  - **READING LEVEL:** 4th-5th Grade. Simple, punchy, visceral storytelling.
  - **AUDIENCE REGISTER:** Tune vocabulary, idiom, and mental pictures to match this person: "${businessInfo.audience}".
    - HOW you talk = word choice, slang weight, cultural references, the WORLD they live in. Speak from inside that world.
    - WHAT you say stays the same — script structure, hooks, and beats don't change.
    - NEVER name the audience by label. "Para sa mga OFW dads na nasa abroad..." reads as marketing copy. "Sa loob ng 5 years na pagiging malayo sa pamilya..." reads as the speaker.
    - Use the audience's WORLD as your vocabulary:
      • OFW audience → "balikbayan box", "video call", "uwi", "pasalubong", "pamilya sa atin"
      • Filipino mom audience → "yaya", "school baon", "halaga ng bigas", "kape after the kids leave"
      • Corporate audience → "deadline", "boss", "sweldo", "weekend lang nakakapahinga"
    - Visual payoff / Result beats land in the audience's WORLD too. OFW reunion at NAIA, not generic "happy moment". Mom's school dropoff on time, not generic "calm morning". Corporate Friday 6PM logout, not generic "free time". Cialdini Liking — Bryan needs to SEE himself in the result.

  **LANGUAGE LOCK (${language}):**
  - If TAGLISH: every hook, body line, and CTA MUST be in Taglish. Sound like a real Filipino vlog, not a manual.
    English is allowed ONLY for:
      (a) Brand names — proper nouns like "${brandName}" stay English.
      (b) Prices and numbers — "₱650", "P22 vs P180", "30 days".
      (c) Universal CTAs — "Tap here", "Click below", "Link sa bio".
    English is FORBIDDEN for product-spec terms. Translate to natural Taglish or OMIT:
      "single-origin medium roast" → "specialty kape" or drop it (visuals carry it)
      "cafe-quality goodness"      → "parang barista ang lasa" or drop it
      "delivered to your doorstep" → "padala sa bahay"
      "premium packaging"          → "mukhang sosyal" or drop it
    If you cannot find natural Taglish for a technical term, OMIT IT. Visuals carry technical specs; copy carries emotion.
  - If ENGLISH: stay 4th-5th grade English. No Taglish slips. No "po", "naman", "talaga", "lasa".
  - NEVER mix registers inside one line. A Taglish line stays Taglish; an English line stays English.

  **TIMING & SLIDE EFFECT:**
  - **HOOK:** Strictly 3 seconds max (approx. 5-8 words).
  - **BODY LINES:** Strictly 3-5 seconds max per line.
  - **WORD COUNT:** Strictly 7-12 words per line (The Sabri Suby "Slide").
  `;

  const DIRECTOR_CRITIQUE_INSTRUCTION = `
  **DIRECTOR_CRITIQUE_PROTOCOL:**
  Include a field "strategicAudit" in your JSON response.
  Act as a World-Class Creative Director.
  1. Explain why those specific 1-2 features were chosen for virality.
  2. Explain how the 7-12 word pacing creates the "Slide" effect for retention.
  `;

  const USER_CHOSEN_ANGLE_BLOCK = chosenAngleBrief ? `
  **USER_CHOSEN_ANGLE (from MarketMind report — Bryan picked this direction):**
  Build the entire script (hooks, body, CTA) to reinforce this single angle. Do NOT introduce competing angles. Do NOT ignore this brief.
  ${chosenAngleBrief}
  ` : '';

  let prompt = '';

  if (isTemu) {
    const subType = await classifyTemuProduct(businessInfo.product, businessInfo.features);
    prompt = `
      Role: Viral TikTok Scriptwriter & Direct Response Expert.
      Strategy: Temu / Viral Haul (${subType} Style).
      Product: "${businessInfo.product}"
      Brand: "${brandName}"
      
      ${COMMON_RULES}

      **TEMU SUB-TYPE RULES (${subType}):**
      ${subType === 'ASMR' ? '- Focus: "Unbox with me...". Satisfying audio cues.' : ''}
      ${subType === 'Reaction' ? '- Focus: "I can\'t believe I got this...". Shock value.' : ''}
      ${subType === 'Utility' ? '- Focus: POV Problem Solving. "TikTok made me buy it".' : ''}

      ${DIRECTOR_CRITIQUE_INSTRUCTION}
      ${USER_CHOSEN_ANGLE_BLOCK}
      Format: Return valid JSON: { "hook1": [...], "hook2": [...], "body": [...], "strategicAudit": "..." }
    `;
  } else if (isTestimonial) {
    prompt = `
      Role: Senior Direct Response Copywriter.
      Strategy: High-Converting Testimonial.
      Product: "${businessInfo.product}"
      Brand: "${brandName}"
      
      ${COMMON_RULES}

      **TESTIMONIAL STRUCTURE:**
      0. **Hook (3s/5-8 words):** Shock or extreme curiosity. PROVIDE 2 VARIATIONS — both 5-8 words, both curiosity-driven pattern interrupts. REQUIRED: hook1 and hook2 arrays in the JSON output MUST be populated; do not skip this beat.
      1. **Intro:** REQUIRED: Beat 1 MUST open with "Ako si [Filipino first name]," (e.g., "Ako si Elena," / "Ako si Mark," / "Ako si Tin,") — followed by life context that implicitly identifies the audience "${businessInfo.audience}" and the wound's first hint as an open loop into beat 2. The introduction is a STORY-OPENER, not a label. NEVER write "Ako si [Name], OFW dad, 5 years sa Saudi" — that's a name tag and is BANNED. NEVER name the audience demographically; the persona's wound carries the recognition. If the model would skip the name, generate a culturally-fitting Filipino first name (e.g., Maria, Cristina, Jenny, Mark, JP, Miggy, Tin, Elena, Nena, Kaye) and use it. (See INTRO PATTERN EXAMPLES below.)
      2. **Before Story:** Agitate the 'Main Problem': "${businessInfo.painPoint}".
      3. **Discovery:** Speaker introduces the hero "${brandName}'s ${businessInfo.product}" with a COMPLETE verb construction. NEVER drop the verb — verbless fragments break the line. PATTERN: "Hanggang sa [verb-phrase] [hero-product]" or "Pero simula nung [verb + na/ko/tong] [hero-product]". Examples: "Hanggang sa natikman ko itong ${brandName}." / "Pero simula nung na-try ko tong ${brandName}." / "Buti na lang, sinubukan ko ang ${brandName}." BANNED: "Pero simula nung ${brandName}" alone (verbless fragment).
      4. **Transformation:** The shift from Pain Point ("${businessInfo.painPoint}") to Result ("${businessInfo.benefit}").
      5. **Proof:** Highlight the 1-2 selected features. Stack comparative differentiation: "Marami akong na-try na ibang [category], pero ito lang ang gumana sa akin kasi ${businessInfo.separator}." This is where the differentiator earns its keep. If separator is empty, fall back to: "Highlight the 1-2 selected features."
      6. **Objection Killer:** Solve the common doubt.
      7. **CTA:** Ad-native call-to-action with WARM recommendation tone (not direct-sell). Inject offer STRUCTURE (scarcity + value adds + urgency) from "${offer}", NEVER the bare price.

         BANNED CTA PHRASES (organic-IG patterns, not for paid ads):
         - "link sa bio" / "link in bio"  → use "click below" / "i-click below" / "tap below"
         - "DM us" / "DM kayo" alone     → use "message us" / "send message"

         REQUIRED IN OUTPUT: at least ONE scarcity word (e.g., "first 50", "limited", "today only") AND ALL value-adds named in "${offer}" must appear verbatim or near-verbatim. Do NOT drop value-adds. Example pattern (warm tone): "Click below — first 50 may free shipping at libreng recipe ebook." If offer is empty, fall back to: "Click below para subukan."

      **INTRO PATTERN EXAMPLES** (for beat 1 — adapt content to audience, do not copy literally):
      - OFW audience → "Ako si Mark. 5 years na akong nasa Saudi para mabuhay yung pamilya — pero may isang bagay na halos natalo ako."
      - Filipino mom audience → "Ako si Tin, single mom ng dalawang bata. Akala ko kaya ko na lahat — until one Sunday morning..."
      - Corporate audience → "Ako si JP. Nine-to-nine sa Makati, pinagkakitaan ko sarili ko — pero may isang gabi na napaisip ako: 'para saan pa lahat ng ito?'"

      ${DIRECTOR_CRITIQUE_INSTRUCTION}
      ${USER_CHOSEN_ANGLE_BLOCK}
      Format: Return valid JSON: { "hook1": [...], "hook2": [...], "body": [...], "strategicAudit": "..." }
    `;
  } else {
    prompt = `
        Role: Senior Direct Response Copywriter. 
        Strategy: MrBeast Viral Flow.
        Product: "${businessInfo.product}"
        Brand: "${brandName}"
        
        ${COMMON_RULES}

        **MRBEAST STRUCTURE:**
        1. **Hook (3s/5-8 words):** Curiosity-driven pattern interrupt. PROVIDE 2 VARIATIONS — both 5-8 words. REQUIRED: hook1 and hook2 arrays in the JSON output MUST be populated; do not skip. Hook stays curiosity-gap-pure — no offer, no differentiator. NEVER use demographic labels in the hook ("for OFWs", "sa mga moms", "para sa OFW", "for Filipino dads" — all banned). Curiosity comes from the situation/visual, not the audience tag.
        2. **Identity:** Relatable audience statement (5-10 words). Direct address to the audience using "ka", "mo", "tayo", or "kayo" — name a scene from their life they immediately recognize. Reference their world (work, home, daily struggle, environment). NEVER name them by demographic label ("para sa mga OFW", "sa mga moms" — banned). Audience: "${businessInfo.audience}". (See IDENTITY PATTERN EXAMPLES below.)
        3. **Struggles:** Deep dive into "${businessInfo.painPoint}".
        4. **Discovery:** Introducing "${brandName}'s ${businessInfo.product}".
        5. **Result + Proof:** Visual payoff based on "${businessInfo.benefit}". Stack proof: "Hindi tulad ng iba — kami ${businessInfo.separator}." This is the "why believe?" slot. NEVER in the hook (kills curiosity); NEVER in the CTA (offer owns that). If separator is empty, fall back to: "Visual payoff based on benefit."
        6. **CTA:** High-energy ad-native call-to-action. Inject offer STRUCTURE (scarcity + value adds + urgency) from "${offer}", NEVER the bare price.

           BANNED CTA PHRASES (organic-IG patterns, not for paid ads):
           - "link sa bio" / "link in bio"  → use "click below" / "i-click below" / "tap below"
           - "DM us" / "DM kayo" alone     → use "message us" / "send message"

           REQUIRED IN OUTPUT: at least ONE scarcity word (e.g., "first 50", "limited slots", "today only") AND ALL value-adds named in "${offer}" must appear verbatim or near-verbatim. Do NOT drop value-adds — softening = failure. Example pattern: "I-click below — first 50 lang may free shipping at libreng recipe ebook." If offer is empty, fall back to: "I-click below ngayon."

        **IDENTITY PATTERN EXAMPLES** (for beat 2 — adapt to audience, do not copy literally):
        - OFW family audience → "Tuwing umagang malayo sa pamilya, kape ang nag-aalala sa'yo."
        - Filipino mom audience → "Bago pumasok ang mga bata, isang kape lang ang oras mo."
        - Corporate audience → "Bago mag-9AM call, bago mag-deadline, kailangan mo ng panlaban."

        ${DIRECTOR_CRITIQUE_INSTRUCTION}
        ${USER_CHOSEN_ANGLE_BLOCK}
        Format: Return ONLY valid JSON: { "hook1": [...], "hook2": [...], "body": [...], "strategicAudit": "..." }
    `;
  }

  const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
    model: textModel, 
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      safetySettings: SAFETY_SETTINGS,
      thinkingConfig: { thinkingBudget: 4000 }
    }
  }));

  const rawText = response.text || "{}";
  const cleanedText = cleanJson(rawText);
  
  try {
      const json = JSON.parse(cleanedText);
      return {
          hook1: Array.isArray(json.hook1) ? json.hook1 : [],
          hook2: Array.isArray(json.hook2) ? json.hook2 : [],
          body: Array.isArray(json.body) ? json.body : [],
          strategicAudit: json.strategicAudit || ""
      };
  } catch (e) {
      console.error("Failed to parse script JSON", e);
      throw new Error("Failed to generate a valid script structure. Please try again.");
  }
};

export const describeImage = async (base64Data: string, mimeType: string): Promise<string> => {
    await delay(1000);
    const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
    };
    const textPart = {
        text: `Briefly describe the person in this image for prompting. Focus on gender, ethnicity, hair, and vibe. Example: "Young woman with long black hair, smiling."`,
    };
    const descriptionResponse: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: textModel,
        contents: { parts: [imagePart, textPart] },
        config: { 
          safetySettings: SAFETY_SETTINGS,
          thinkingConfig: { thinkingBudget: 4000 }
        }
    }));

    return descriptionResponse.text || "";
};

export const describeBusinessAsset = async (base64Data: string, mimeType: string): Promise<string> => {
    await delay(1000);
    const imagePart = {
        inlineData: {
          mimeType,
          data: base64Data,
        },
    };
    const textPart = {
        text: `Analyze this image. It could be a product, a service location ( daylight a salon/spa), or a specific service action.
        - **Identify:** Is it a product, a room, or a person performing a service?
        - **Visuals:** Colors, lighting, atmosphere.
        - **Vibe:** Relaxing, professional, energetic?
        Keep it to 2 sentences.`,
    };
    const descriptionResponse: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: textModel,
        contents: { parts: [imagePart, textPart] },
        config: { 
          safetySettings: SAFETY_SETTINGS,
          thinkingConfig: { thinkingBudget: 4000 }
        }
    }));

    return descriptionResponse.text || "";
};

export const generateAvatarImage = async (
    audience: string, 
    gender: 'Male' | 'Female' | 'Any', 
    ageRange: string, 
    ethnicity: string, 
    aspectRatio: '9:16' | '16:9',
    imageQuality: '1K' | '2K',
    brandColors: string[]
): Promise<{ url: string; description: string; }> => {
  await delay(1000);
  
  let subjectDescription = `a ${ethnicity}`;
  if (gender !== 'Any') {
    subjectDescription += ` ${gender.toLowerCase()}`;
  }
  subjectDescription += ' character';
  if (ageRange) {
    subjectDescription += ` around ${ageRange} years old`;
  }

  let localizationInstruction = "";
  if (ethnicity) {
      localizationInstruction = `
      **CRITICAL SETTING:** 
      - Background must be a **Modern, Middle-Class, Clean** environment consistent with ${ethnicity} market aesthetics.
      - **Good:** Modern condo, bright clean office, nice minimalist cafe, well-lit living room.
      - **Bad:** Wooden shacks, unpainted walls, messy streets, dark/gritty areas.
      - Vibe: Aspirational but authentically local to the target market.
      `;
  }

  const brandColorInstruction = brandColors.length > 0 ? `Incorporate these brand colors subtly into the wardrobe or background: ${brandColors.join(', ')}.` : '';

  const prompt = `
    **Subject:** Photorealistic close-up headshot of ${subjectDescription}.
    **Target Audience Context:** "${audience}".
    ${brandColorInstruction}

    **SMART CASTING DIRECTOR LOGIC:**
    - **Age Anchor:** Use the provided age range of ${ageRange} as the primary anchor for bone structure and skin elasticity. DO NOT allow skin conditions ( daylight Melasma, Acne, or Pigmentation) to force the subject into looking older than the requested range.
    - **Professional Retouch Layer:** Maintain firm skin, clear eye-whites, and a vibrant presence appropriate for ${ageRange}.
    - **Commercial Reality:** If a skin condition is implied by the product context, render the condition accurately but keep the subject's overall appearance 'Aspirational' and 'Commercial-Ready'.
    - **Lighting Protocol:** Always use 'Commercial Beauty Lighting' (diffused, soft, high-key) to ensure the subject look relatable and premium for a marketing agency client.

    **Visuals:**
    - Background: Blurred natural environment. ${localizationInstruction}
    - Style: High-end UGC, shot on iPhone 15 Pro, 35mm lens.
    - Vibe: Friendly, authentic, approachable, "Girl/Guy next door".
    ${REALISM_INSTRUCTION}

    **NEGATIVE CONSTRAINTS (FORBIDDEN):** 
    - NO exaggerated wrinkles, NO heavy sagging, NO grey hair (unless age is 55+).
    - NO dull or 'leathery' skin textures.
    - Avoid making the subject look daylight a 'grandparent' unless the age range is 60+.
    - NO TEXT, NO WATERMARKS, NO LOGOS, NO TYPOGRAPHY, NO OVERLAYS.
    - NO STUDIO BACKGROUNDS.
  `;

  const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateImage({
    model: avatarModel,
    contents: { parts: [{ text: prompt }] },
    config: {
      imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: imageQuality 
      },
    },
  }));

  let base64ImageBytes = null;
  if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
              base64ImageBytes = part.inlineData.data;
              break;
          }
      }
  }

  if (base64ImageBytes) {
    const mimeType = 'image/png';
    const imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
    const description = await describeImage(base64ImageBytes, mimeType);
    return { url: imageUrl, description };
  }

  throw new Error("Avatar image generation failed");
};

export const generateInfluencerAvatar = async (config: InfluencerConfig): Promise<{ url: string; description: string }> => {
  await delay(1000);
  const parts: any[] = [];
  
  // --- GEAR_LOCK PROTOCOL ---
  const HARDWARE_MAP: Record<string, string> = {
    IPHONE_15_PRO: "Candid mobile photography, high sharpness, deep depth of field, 24mm wide angle.",
    SONY_A7IV: "Professional mirrorless photography, full-frame sensor texture, natural skin tones, sharp 33MP detail.",
    RED_KOMODO: "Cinematic raw footage, high dynamic range, global shutter look, expensive film grade.",
    '35MM_VLOG': "Wide f/1.4 aperture, social media storytelling angle, blurry but visible background.",
    '50MM_PRIME': "Nifty-fifty perspective, matches human eye, high-end commercial framing.",
    '85MM_CINEMATIC': "Telephoto compression, extreme creamy bokeh, shallow depth of field (f/1.8), focuses 100% on the subject."
  };

  const cameraTokens = HARDWARE_MAP[config.camera] || "";
  const lensTokens = (config.camera !== 'IPHONE_15_PRO' && config.lens) ? HARDWARE_MAP[config.lens] : "";
  const gearLockTokens = `${cameraTokens} ${lensTokens}`.trim();

  let envPrompt = "";
  if (config.environment === 'OUTDOOR') envPrompt = "Subject in an OUTDOOR setting: A high-end, modern city street at golden hour, blurred traffic lights and architectural bokeh.";
  else if (config.environment === 'OFFICE') envPrompt = "Subject in an OFFICE setting: A clean minimalist luxury home office, designer furniture, soft window lighting.";
  else if (config.environment === 'INDOOR') envPrompt = "Subject in an INDOOR setting: A stylish, well-lit modern living room with premium interior design aesthetics.";
  else if (config.environment === 'MATCH_UPLOAD') envPrompt = "Subject in a setting that strictly preserves the background elements from Reference Image 1 exactly.";

  const lightingInstructions = `
  **NEURAL_LIGHTING_ENGINE:**
  Rendered with ${config.lightingPreset} hardware setup:
  ${LIGHTING_TOKENS[config.lightingPreset]}
  Ensure the 'Rim Light' (backlight) is high-intensity to separate the subject from the background. Match the Kelvin temperature of the hair highlights to the key light on the face.
  Apply the Brand Color ${config.brandColor} to the rim lighting and subtle accents. Ensure background practical lights (neon tubes/glows) also match this color.
  `;

  let prompt = `
    ${gearLockTokens}
    ### Role: High-Fidelity Neural Sculptor (Influencer Forge)
    Task: Create a world-class digital influencer persona.

    **SUBJECT_DNA:**
    - Identity: Subject is a ${config.gender} of ${config.ethnicity} descent, ${config.ageRange} years old.
    - Performance: Looking directly into the lens, confident and approachable expression.
    - Wardrobe: Wearing a ${config.wardrobe} outfit. The fabric and style should look high-end and modern.

    **ENVIRONMENT_MAP:**
    ${envPrompt}

    **LIGHTING_PRESET:**
    ${lightingInstructions}

    **REALISM_PROTOCOL:**
    - 100% Photographic skin detail (pores, micro-lines, natural oils).
    - No CGI, no 3D-rendering feel, no smoothing.
    - Sub-surface scattering on skin.
    - Perfect eye-reflections (catchlights).

    ${config.sourceType === 'UPLOAD' ? `
    **IDENTITY_LOCK & NEURAL RELIGHTING (MANDATORY):**
    - RE-PHOTOGRAPH the subject from Reference Image 1 using the following hardware specs: ${gearLockTokens}. 
    - Ignore the camera and lighting artifacts from the original upload.
    - Maintain 100% facial identity and bone structure from Reference Image 1. 
    ${config.environment === 'MATCH_UPLOAD' ? '- STRICTLY preserve the background elements of Reference Image 1.' : '- Transform the environment based on the ENVIRONMENT_MAP while keeping the face identical.'}
    - RE-RENDER the subject using the selected hardware and lighting: ${LIGHTING_TOKENS[config.lightingPreset]}.
    - PRO RELIGHTING: Keep the person's face from the upload, but CHANGE their clothes to the selected ${config.wardrobe} and CHANGE the lighting color to match brand color ${config.brandColor}.
    ` : ''}

    ${NO_TEXT_CONSTRAINT}
    ${REALISM_INSTRUCTION}
  `;

  if (config.sourceType === 'UPLOAD' && config.uploadedPhoto) {
    const match = config.uploadedPhoto.match(/data:(image\/.+);base64,(.+)/);
    if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
  }

  parts.push({ text: prompt });

  const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateImage({
    model: avatarModel,
    contents: { parts },
    config: {
      imageConfig: { 
        // Note: Standardize to 3:4 if 4:5 is requested as it's the closest supported API ratio
        aspectRatio: config.aspectRatio === '4:5' ? '3:4' : config.aspectRatio, 
        imageSize: config.quality 
      },
    },
  }));

  let base64ImageBytes = null;
  if (response.candidates?.[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
          if (part.inlineData && part.inlineData.data) {
              base64ImageBytes = part.inlineData.data;
              break;
          }
      }
  }

  if (base64ImageBytes) {
    const mimeType = 'image/png';
    const imageUrl = `data:${mimeType};base64,${base64ImageBytes}`;
    const description = await describeImage(base64ImageBytes, mimeType);
    return { url: imageUrl, description };
  }

  throw new Error("Influencer generation failed");
};

/**
 * @deprecated Use the structured `MarketResearchReport` returned by `generateMarketResearch` directly.
 * This re-parses a legacy markdown-string MarketMind report into structured fields via a second
 * Gemini call. Kept only as a fallback for users with pre-upgrade reports cached in localStorage.
 * Remove after 2 weeks of stable runs (target: 2026-05-23).
 */
export const parseMarketResearchFile = async (text: string): Promise<InfluencerStrategicInput> => {
  const prompt = `
    Analyze this market research text and autonomously extract the core strategic inputs for a direct response script.
    
    RESEARCH TEXT:
    "${text}"
    
    Map the findings into these keys:
    - subject: The main niche/topic.
    - offer: The transformation or product being sold.
    - dreamCustomer: Detailed avatar profile.
    - bleedingNeck: The #1 urgent daily frustration.
    - deepFear: The underlying emotional anxiety.
    - magicGenie: The instant result they wish for.
    - rawEvidence: Proof points or data mentioned.
    - contrarianTruth: A surprising or unique angle that attacks the status quo.

    Return ONLY a valid JSON object matching the InfluencerStrategicInput schema.
  `;
  const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
    model: fastTextModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  }));
  return JSON.parse(cleanJson(response.text || "{}"));
};

/**
 * FIXED: Canonical definition for generateInfluencerScript.
 * Refactored to force CCC Structure.
 */
export const generateInfluencerScript = async (
  config: InfluencerConfig,
  input: InfluencerStrategicInput,
  dayNumber: number = 1,
  seriesContext: string = ""
): Promise<InfluencerScriptResponse> => {
  const game = config.monetizationGame || 'B2B_AUTHORITY';
  
  // --- CCC_FRAMEWORK MAPPING ---
  const CONTENT_STRATEGY = {
    'MEDIA_GAME': { 
      type: "Story", 
      focus: "Climax Start / Emotional High-Stakes",
      rule: "Start at the most painful or exciting moment. No 'Once upon a time'."
    },
    'COMMODITY_VIBE': { 
      type: "Demonstration", 
      focus: "Result First / Visual Speed",
      rule: "Show the perfect outcome in Scene 1. Skip the setup."
    },
    'PRODUCT_EDUCATION': { 
      type: "Tutorial", 
      focus: "The Gap Strategy",
      rule: "State the Pain vs. the Dream. Bridge it in 3 fast steps."
    },
    'B2B_AUTHORITY': { 
      type: "Educational", 
      focus: "Negative Hook / Pattern Interrupt",
      rule: "Start by challenging a common belief. Use: 'Your [Topic] is failing because...'"
    }
  };

  const strategy = CONTENT_STRATEGY[game] || CONTENT_STRATEGY['B2B_AUTHORITY'];

  const prompt = `
### ROLE: MASTER VIRAL SCRIPTWRITER (CCC FRAMEWORK)
Your goal is to create a script that is 20% shorter than average to maximize completion rates.

### THE STRATEGY: ${strategy.type}
- FOCUS: ${strategy.focus}
- CORE RULE: ${strategy.rule}
- DAY NUMBER: ${dayNumber}
- SERIES CONTEXT: ${seriesContext}

### STRATEGIC BLUEPRINT (THE INTEL):
- SUBJECT: ${input.subject}
- OFFER: ${input.offer}
- DREAM_AVATAR: ${input.dreamCustomer}
- BLEEDING_NECK: ${input.bleedingNeck} (Use for the Pain)
- MAGIC_GENIE: ${input.magicGenie} (Use for the Dream)
- RAW_EVIDENCE: ${input.rawEvidence} (The Proof)
- CONTRARIAN_TRUTH: ${input.contrarianTruth} (The Hook)

### WRITING STRICTURES (NON-NEGOTIABLE):
1. HOOK (Line 1): Negative/Pattern Interrupt. Strictly 3s / 5-8 words. No "Hi guys".
2. BRIDGE (Line 2): Risk Reversal. Answer "Why should I trust you?" or "What happens if I stop watching?".
3. THE SLIDE (Lines 3-8): CCC Progression (Connection, Content, Call-to-Action). 7-12 words per line.
4. LANGUAGE: ${config.language === 'TAGLISH' ? 'Conversational Taglish (Kanto-Style / Street Smart).' : config.language === 'FILIPINO' ? 'Natural Filipino / Tagalog (Kanto-Style / Street Smart).' : 'Direct Response English (4th Grade Level).'}
5. IMPACT WORDS: Use (Stupid, Killing, Cheat-code, Secret, Warning, Truth).
6. NO JARGON: Clear beats clever.

### SCRIPT STRUCTURE (8 LINES):
1. HOOK: Negative/Pattern Interrupt (Challenge a belief or show a shocking result).
2. BRIDGE: Risk Reversal / The Hook's Payoff.
3. CONNECTION: Relate to the ${input.dreamCustomer}'s struggle.
4. CONTENT_1: First step of the 'Secret Sauce'.
5. CONTENT_2: Second step / Inject ${input.rawEvidence}.
6. CONTENT_3: The outcome / ${input.magicGenie}.
7. CALL_TO_ACTION: Immediate action. "Do this one thing right now."
8. THE EXIT: Soft CTA linking to ${input.offer}.

### DIRECTOR_CRITIQUE_PROTOCOL:
Explain why this script flow creates the "Slide" effect for ${input.dreamCustomer}.
Provide a "daySummary" (max 20 words) for the mission log.

Return valid JSON: { "hook": "...", "body": ["line1", "line2", ...], "strategicAudit": "...", "daySummary": "..." }
  `;

  const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
    model: textModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      safetySettings: SAFETY_SETTINGS,
      thinkingConfig: { thinkingBudget: 4000 }
    }
  }));

  return JSON.parse(cleanJson(response.text || "{}"));
};

/**
 * FIXED: Canonical definition for generateInfluencerStoryboard.
 */
export const generateInfluencerStoryboard = async (
  config: InfluencerConfig,
  script: InfluencerScriptResponse
): Promise<{ scenes: Scene[]; directorNote: string }> => {
  const fullLines = [script.hook, ...script.body];
  
  const prompt = `
### Role: Visual Director (30/70 Rhythm Engine)
Task: Generate an 8-scene visual storyboard.

**VISUAL RHYTHM PROTOCOL (MANDATORY):**
- **30/70 RULE:** Exactly 30% of scenes MUST be "Talking Head" (Avatar). 70% MUST be "Visual Aids" (B-roll, product close-ups, graphs, icons).
- **PACING:** 1.5s - 2.0s scene changes.
- **CONSECUTIVE RULE:** Max 2 consecutive "Talking Head" scenes.
- **CAMERA DYNAMICS:** Cycle through these angles:
  1. ${AVATAR_CAMERA_ANGLES[0]}
  2. ${AVATAR_CAMERA_ANGLES[1]}
  3. ${AVATAR_CAMERA_ANGLES[2]}
  4. ${AVATAR_CAMERA_ANGLES[4]}
  
**CONFIG:**
- Monetization Game: ${config.monetizationGame}
- Format: ${config.format}

**SCRIPT LINES:**
${fullLines.map((l, i) => `${i+1}. ${l}`).join('\n')}

**OUTPUT SCHEMA:**
Return JSON: { "scenes": [{ "scriptLine": "...", "sceneDescription": "Detailed visual description", "referenceImage": "avatar" | "product" | "none" }], "directorNote": "..." }
  `;

  const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
    model: textModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      safetySettings: SAFETY_SETTINGS,
      thinkingConfig: { thinkingBudget: 4000 }
    }
  }));

  return JSON.parse(cleanJson(response.text || "{}"));
};

export const generateStoryboard = async (
    script: string[], 
    avatarDescription: string, 
    businessInfo: BusinessInfo,
    ethnicity: string,
    language: 'English' | 'Taglish'
): Promise<StoryboardResponse> => {
    const fullScript = script.join('\n');
    const productDesc = businessInfo.productImageDescription || 'N/A';
    const isTemu = businessInfo.scriptType === 'Temu';
    
    let strategyInstructions = "";

    const DIRECTOR_CRITIQUE_INSTRUCTION = `
    **DIRECTOR_CRITIQUE_PROTOCOL:**
    Include a field "strategicAudit" in your JSON response. 
    Act as a World-Class Creative Director. honestly critique the user's business inputs based on Sabri Suby's $100M Copy rules. 
    Explain WHY this specific storyboard sequence and visual framing is strategically superior for conversion. 
    Explain why specific B-Roll choices were made over talking heads.
    `;

    if (isTemu) {
        strategyInstructions = `
        **STRATEGY: TEMU / VIRAL HAUL (RAPID CUTS)**
        **CRITICAL RULE:** DO NOT describe a "sequence" or "montage" in a single scene. You MUST break every action into a separate scene.
        
        **REQUIRED SCENE BREAKDOWN (Aim for 6-9 Scenes):**
        1. **SCENE 1 (THE HOOK):** Visual Trigger / Pattern Interrupt (Start/End Frames).
        2. **SCENE 2 (UNBOXING):** Close up of hands tearing package or opening box. (1.5s)
        3. **SCENE 3 (REVEAL):** Pulling the item out. (1.5s)
        4. **SCENE 4 (ASSEMBLY/ACTION):** Clicking parts together or applying product. (1.5s)
        5. **SCENE 5 (USAGE):** The product in action. (2s)
        6. **SCENE 6 (PAYOFF):** The final satisfying result. (2s)
        7. **SCENE 7 (VIBE CHECK/REACTION):** Aesthetic shot or Avatar reaction.
        8. **SCENE 8 (CTA):** "Link in bio" / "Yellow Basket" overlay.

        **VISUAL STYLE:**
        - ${ethnicity} Context.
        - High-key lighting, fast motion, handheld feel.
        - Focus on HANDS and OBJECTS for scenes 2-6.
        `;
    } else {
        strategyInstructions = `
        **STRATEGY: NARRATIVE RETENTION RHYTHOR**
        1. **SCENE 1 (THE HOOK):** Visual Metaphor/Pattern Interrupt (Start/End Frames).
        2. **SCENE 2 (THE CONNECTION):** **MUST be "Avatar Talking"** (Bridge the hook).
        3. **MIDDLE SCENES:** Alternate between **Product B-Roll** and **Avatar Talking**.
        4. **FINAL SCENE (CTA):** Product Shot or Avatar pointing.
        `;
    }

    const prompt = `
      You are an Expert Viral Video Strategist.
      Task: Create a detailed frame-by-frame storyboard JSON.

      **VISUAL PURITY RULE:**
      "The \`sceneDescription\` and \`imagePrompt\` MUST describe the physical scene only.
      - **FORBIDDEN:** Do not include instructions daylight 'Show text overlay', 'Text on screen says...', or 'Phone screen showing 50%'.
      - Text belongs in the Audio/Script, NEVER in the image generation prompt."

      **STILL_FRAME_RULE:**
      The fields \`imagePrompt\`, \`startFramePrompt\`, and \`endFramePrompt\` are rendered as STILL IMAGES. They MUST be static compositions, NOT motion-verb prose.

      FORBIDDEN motion verbs (the still cannot render motion):
      - "pulling away", "moving toward", "flowing", "shaking", "rotating", "spinning", "running", "pouring"
      - Any verb that describes WHAT IS HAPPENING during a moment of motion.

      REQUIRED — describe the static end-state, the frozen instant:
      - WRONG: "A hand pulling away from the sink, coffee splattering."
      - RIGHT: "A hand visible mid-frame above the sink, palm facing away, frozen in air, coffee droplets caught suspended around it, freeze-frame composition."

      Motion lives in \`transitionEffect\` (e.g., "Explosion Reveal", "Character Morph") — that field describes the MOTION between two stills. The frame prompts describe two STILL moments. Frames = stills. Transitions = motion.

      **APPEARANCE_LOCK_RULE (when scene's referenceImage='avatar'):**
      The \`imagePrompt\`, \`startFramePrompt\`, and \`endFramePrompt\` MUST NOT describe the avatar's physical appearance. Identity is preserved by an upstream LOCK; redescribing it creates conflicts and corrupts the render.

      FORBIDDEN in avatar-scene prompts:
      - Wardrobe/clothing ("wearing a linen shirt", "in a denim jacket")
      - Hair ("with dark brown hair", "her ponytail")
      - Body type ("petite", "athletic build")
      - Face/skin descriptors ("with bright eyes", "her warm smile", "her face glowing")
      - Ethnicity/age descriptors ("Southeast Asian woman", "young Filipina")

      REQUIRED in avatar-scene prompts (describe ONLY these):
      - Action ("looking down", "gesturing", "sipping", "tapping the phone screen")
      - Expression ("brow furrowed", "eyes wide in surprise", "lips parted in confusion")
      - Gaze direction ("looking at the camera", "looking down at the mug")
      - Hand position + held props ("holding an empty mug", "hands on the counter")
      - Body pose ("standing", "sitting at the dining table", "leaning against the counter")
      - Spot within residence ("at the kitchen counter", "by the front door")
      - Lighting/mood for that spot ("warm afternoon light", "soft window light")

      WRONG: "A friendly Southeast Asian woman with dark brown hair, wearing a casual linen shirt, sitting at a modern Filipino home dining table, acting surprised while looking at a smartphone, warm sunlight hitting her face."
      CORRECT: "Sitting at the dining table, eyes wide in surprise, looking at a smartphone, warm afternoon sunlight from the window."

      **PACING RULE:**
      "You MAY have up to **2 consecutive** 'Avatar Talking' scenes.
      You **MUST NOT** have 3 consecutive 'Avatar Talking' scenes.
      If you have 2 Avatars in a row, the 3rd scene **MUST** be a 'Product B-Roll', 'Reaction', or 'Visual Metaphor'."

      **CONTEXT:**
      - **Type:** ${businessInfo.scriptType} Style
      - **Target Audience:** ${ethnicity} market.
      - **Language:** ${language}
      - **Character:** ${avatarDescription}
      - **Product:** ${businessInfo.product} (${productDesc})

      ${strategyInstructions}
      ${DIRECTOR_CRITIQUE_INSTRUCTION}

      **CINEMATIC VARIETY:** When creating Talking Avatar scenes, explicitly describe a different physical action for each (e.g., 'walking while talking', 'sitting at a desk', 'holding a phone', 'gesturing with both hands'). This ensures the background and pose change even if the face stays consistent.

      **HOOK LOGIC (SCENE 1):**
      - Prioritize Visual Metaphors: focusing on objects, hands, environment, or abstract triggers instead of a full person visual. 
      - The goal is to maximize curiosity and pattern-interrupt. Show a full person ONLY if the script explicitly requires it.

      **VIRAL VFX MENU (FOR SCENE 1 ONLY):**
      Select the BEST VFX style for the hook:
      1. **Explosion Reveal**
      2. **Character Morph**
      3. **Teleport / Snap Cut**
      4. **Object Materialization**
      5. **Invisible Effect**
      6. **Chaos Burst**

      **VISUAL AUTHENTICITY RULE:**
      - All scene descriptions MUST imply a high-quality, relatable location for a **${ethnicity}** audience.
      - Avoid poverty/gritty vibes. Focus on aspirational settings consistent with the target market.

      **BAG_ORIENTATION_RULE (REQUIRED for any scene where the product bag/package appears, whether held by avatar or shown as B-roll):**
      The FRONT of the bag (the side bearing the product label, branding, or wordmark) MUST face the camera. The avatar's hand MAY occlude part of the bag's front (naturalistic and acceptable). The BACK of the bag facing camera, or the bag held with branding turned away from camera, is BANNED — the brand mark must remain visible enough to be recognized in a 3-second scrub. For product-only B-roll (no avatar in frame), the bag must be centered with the front fully visible. Whenever the imagePrompt or startFramePrompt/endFramePrompt mentions the bag/package/product, append "front of bag/label facing camera" to the description.

      **OUTPUT SCHEMA (CRITICAL):**
      Return a valid JSON Object with keys "scenes" (Array) and "strategicAudit" (String).
      
      - IF SCENE 1 (HOOK):
      {
        "scriptLine": "...",
        "sceneDescription": "...",
        "referenceImage": "none",
        "startFramePrompt": "Static composition of the FIRST FROZEN FRAME — describe the world-state at moment 1 as a still photograph. No motion verbs (see STILL_FRAME_RULE).",
        "endFramePrompt": "Static composition of the FINAL FROZEN FRAME — describe the world-state at moment 2 as a still photograph. No motion verbs (see STILL_FRAME_RULE).",
        "transitionEffect": "Name of the VFX that animates between the two stills (the only field where motion lives)."
      }

      - IF SCENE 2 onwards:
      {
        "scriptLine": "...",
        "sceneDescription": "...",
        "referenceImage": "avatar" | "product",
        "imagePrompt": "Description of the single image"
      }
      
      **Script:**
      ${fullScript}
    `;
    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
      model: fastTextModel,
      contents: prompt,
      config: {
        // Use standard JSON response for storyboard generation
        responseMimeType: "application/json",
        safetySettings: SAFETY_SETTINGS
      },
    }));
    
    const jsonText = cleanJson(response.text || "{}");
    try {
        const result = JSON.parse(jsonText);
        return {
            scenes: Array.isArray(result.scenes) ? result.scenes : [],
            strategicAudit: result.strategicAudit || ""
        };
    } catch (e) {
        console.error("JSON Parse Error in Storyboard:", e, "Raw Text:", response.text);
        throw new Error("Failed to generate a valid script structure. Please try again.");
    }
};

/**
 * Refactored with strict Human-Off gates and Lumen Syncing.
 */
export const generateSceneImage = async (
    prompt: string, 
    aspectRatio: '9:16' | '16:9' | '1:1' | '4:5' | '3:4', 
    imageQuality: '1K' | '2K',
    references: { avatarUrl?: string; productUrl?: string } = {},
    ethnicity: string = 'Global',
    brandColors: string[] = [],
    scriptType: string = 'MrBeast',
    productDescription?: string,
    productName?: string,
    variationIndex: number = 0,
    referenceImageMode: 'avatar' | 'product' | 'none' = 'none'
): Promise<string> => {
    
    await delay(2500);

    const sanitizedPrompt = prompt.length > 400 ? prompt.substring(0, 400) : prompt;
    const imageConfig: any = { aspectRatio, imageSize: imageQuality };
    
    const parts: any[] = [];

    if (references.avatarUrl) {
        const match = references.avatarUrl.match(/data:(image\/.+);base64,(.+)/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }

    if (references.productUrl) {
        const match = references.productUrl.match(/data:(image\/.+);base64,(.+)/);
        if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }

    // --- FORGE_STUDIO_v6.0_GATES ---
    let consistencyRules = "";
    if (referenceImageMode === 'avatar') {
        consistencyRules = `
        **IDENTITY_LOCK + ENVIRONMENT_SYNC:**
        1. **LOCKED (preserve from Reference Image 1, NEVER change across scenes — non-negotiable):** face, skin tone, bone structure, **hair styling** (color AND style — if Reference Image 1 shows hair tied up in a bun or ponytail, render it tied up in EVERY scene; do NOT let it down. If Reference Image 1 shows hair down/loose, do NOT tie it up in any scene. Hair styling drift between scenes is BANNED), wardrobe (color, cut, fabric — same blouse/top across scenes), body type. Scene-driven action MAY change pose/expression, but MUST NOT change hair styling, wardrobe, or body type.
        2. **VARIES (driven by the Scene Prompt, AUTHORITATIVE over IDENTITY_LOCK):** facial expression, gaze direction, body pose, hand position, and held props (mug, phone, etc.). IDENTITY_LOCK does NOT override scene-driven expressions, gestures, or actions. If the Scene Prompt says "looking down with brow furrowed, holding an empty mug," render exactly that — do not inherit the reference's smile or grip.
        2b. **FACE_TO_CAMERA (REQUIRED whenever the scene carries a script line the avatar speaks aloud):** Camera angle CAN vary (frontal, 3/4, side body, over-shoulder) for cinematic variety per CAMERA_MANDATORY. BUT the avatar's face/head MUST be oriented toward camera enough that BOTH eyes and the mouth are clearly visible — required for downstream lip sync. Side body angle with face turned toward camera = ALLOWED. Eyes-closed, looking-down-at-mug, looking-at-own-pointing-finger, full-side-profile-with-face-away = BANNED for talking scenes. For non-speaking B-roll (avatar performs an action without voice-over), free creative direction.
        3. **CAMERA:** angle, distance, and framing follow the CAMERA_MANDATORY block below.
        4. **ENVIRONMENT (FLEXIBLE):** Same residence/setting as Reference Image 1 (e.g., the same home interior). The avatar may be in different spots within that residence (kitchen counter → dining table → living room couch) per the Scene Prompt, but never in an unrelated location (no offices, no cafes, no streets).
        5. **ETHNICITY:** Strictly **${ethnicity}**.
        `;
    } else if (referenceImageMode === 'product' && references.productUrl) {
        consistencyRules = `
        **PRODUCT_IDENTITY_LOCK:**
        1. **IDENTITY:** Reproduce the product from Reference Image 1 EXACTLY — same packaging shape, same colors, same label position, same proportions, same materials/finish (matte vs glossy). Do NOT redesign, restyle, or substitute the product with a similar-looking product.
        2. **NO_LOGO_HALLUCINATION:** Do NOT add brand logos, brand names, text, label graphics, badges, or stickers that are not visibly present in Reference Image 1. If the reference shows a plain bag, render a plain bag. Inventing brand marks is FORBIDDEN.
        3. **ANATOMICAL_LOCK:** If the prompt requires hands or fingers, render exactly TWO hands with FIVE fingers each. No extra limbs, no extra fingers, no partial hands, no third hand entering frame. "A pair of hands" means exactly two hands.
        4. **NO HUMAN FACES:** Do NOT render faces, full bodies, or recognizable people. Hands are allowed only when the prompt explicitly requires them (per rule 3).
        5. **LUMEN_SYNC:** Use the lighting temperature and color profile from Reference Image 1. Match the warmth/coolness of its highlights.
        6. **SUBJECT:** Focus on the product described in the prompt; the product from Reference Image 1 is the hero.
        `;
    } else {
        consistencyRules = `
        **STRICT_NEGATIVE (VISUAL AIDS):**
        1. **NO HUMANS:** NO faces, NO skin, NO hands, NO fingers. NO anatomical parts.
        2. **LUMEN_SYNC:** Match the Kelvin temperature of the hair highlights from Reference Image 1 to the rim-lights and highlights of this scene. Use the same color profile.
        3. **SUBJECT:** Focus purely on the object or environment described in the prompt.
        `;
    }

    // 1. RE-INSERT THE CAMERA LOGIC
    const randomAngle = AVATAR_CAMERA_ANGLES[variationIndex % AVATAR_CAMERA_ANGLES.length];
    const cameraMandatory = `
    **CAMERA_MANDATORY:** You MUST strictly follow this framing: ${randomAngle}. 
    - Do NOT default to a standard medium shot. 
    - Change the distance of the camera (Close-up vs Wide) as instructed.
    `;

    // 2. WARDROBE: locked from Reference Image 1 by IDENTITY_LOCK rule 1.
    // WARDROBE_LOGIC variation removed — was conflicting with identity preservation across scenes.
    const wardrobeInstruction = "";

    // 3. KEEP YOUR NEW PRODUCT CONTEXT
    const productContext = (productName || productDescription)
      ? `\n**PRODUCT_IDENTITY_CORE:**\n- NAME: ${productName || 'N/A'}\n- DESCRIPTION: ${productDescription || 'N/A'}`
      : "";

    const realismProtocol = scriptType === 'Cinematic' ? REALISM_INSTRUCTION_CINEMATIC : REALISM_INSTRUCTION_UGC;
    const brandColorInstruction = brandColors.length > 0 ? `\n**BRAND COLORS:** Incorporate these colors subtly: ${brandColors.join(', ')}` : '';

    // 4. COMBINE EVERYTHING INTO THE FINAL PROMPT
    const finalPromptText = `
    ${consistencyRules}
    ${cameraMandatory}
    ${wardrobeInstruction}
    ${productContext}
    ${brandColorInstruction}
    **Scene Prompt:** ${sanitizedPrompt}
    ${realismProtocol} 
    ${NO_TEXT_CONSTRAINT}
    `;

    parts.push({ text: finalPromptText });

    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateImage({
        model: sceneImageModel,
        contents: { parts },
        config: { 
            imageConfig: { ...imageConfig, aspectRatio: aspectRatio === '4:5' ? '3:4' : aspectRatio } 
        },
    }));

    const resultPart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
    if (resultPart?.inlineData) return `data:${resultPart.inlineData.mimeType};base64,${resultPart.inlineData.data}`;
    
    throw new Error("Consistent image generation failed.");
};

export const generateThumbnail = async (
    script: string[],
    avatarDescription: string,
    businessInfo: BusinessInfo,
    aspectRatio: '9:16' | '16:9',
    avatarUrl: string,
    imageQuality: '1K' | '2K',
    brandColors: string[] = []
): Promise<string> => {
    await delay(3000); 
    
    const ratioInstruction = aspectRatio === '9:16' ? "Vertical 9:16." : "Wide 16:9.";
    
    const hasProductImage = businessInfo.productImageUrls && businessInfo.productImageUrls.length > 0;
    const pDesc = businessInfo.productImageDescription || businessInfo.product || "the product";

    const parts: any[] = [];
    const match = avatarUrl.match(/data:(image\/.+);base64,(.+)/);
    if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
    }

    if (hasProductImage) {
        const pUrl = businessInfo.productImageUrls![0];
        const pMatch = pUrl.match(/data:(image\/.+);base64,(.+)/);
        if (pMatch) {
            parts.push({ inlineData: { mimeType: pMatch[1], data: pMatch[2] } });
        }
    }

    const brandColorPrompt = brandColors.length > 0 ? `**Brand Colors (Apply to background or elements):** ${brandColors.join(', ')}` : "";

    const prompt = `
    **Task:** Create a Viral YouTube/TikTok Thumbnail (MrBeast Photography Style).
    **AESTHETIC:** ${MRBEAST_THUMBNAIL_STYLE}
    **SCRIPT CONTEXT:** ${script.join(' ')}
    **AVATAR CONTEXT:** ${avatarDescription}

    **SUBJECT & ACTION:**
    - **Identity:** Use Reference 1 (the avatar face) as a RAW PHOTOGRAPH. Maintain her exact facial features and skin texture.
    - **Performance:** Character is showing an extreme, high-energy facial expression (Shock/Surprise/Joy). 
    - **Interaction:** Character is holding or interacting with the product: "${pDesc}" (Reference 2).
    
    **SCENE DESIGN:**
    - **Background:** High-contrast, clean environment.
    - **Context:** A clear visual metaphor showing the result of using "${businessInfo.product}".
    - **Visual Purity:** NO TEXT, NO LOGOS, NO WATERMARKS.
    
    ${ratioInstruction}
    ${brandColorPrompt}
    ${NO_TEXT_CONSTRAINT}
    `;

    parts.push({ text: prompt });

    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateImage({
        model: sceneImageModel,
        contents: { parts },
        config: { 
            imageConfig: { aspectRatio, imageSize: imageQuality }
        },
    }));

    let responseBase64 = null;
    let responseMime = null;
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                responseBase64 = part.inlineData.data;
                responseMime = part.inlineData.mimeType;
                break;
            }
        }
    }

    if (responseBase64 && responseMime) {
        return `data:${responseMime};base64,${responseBase64}`;
    }
    throw new Error("Thumbnail generation failed");
};

export const generateVideoPrompts = async (storyboard: Scene[], businessInfo: BusinessInfo): Promise<VideoPrompt[]> => {
    await delay(1000);
    const scriptType = businessInfo.scriptType;
    const productName = businessInfo.product;
    const productDesc = businessInfo.productImageDescription || businessInfo.product || 'N/A';
    
    const storyboardText = storyboard.map((s, i) => 
        `Scene ${i + 1} [${!!s.startFramePrompt ? "TYPE: HOOK/VISUAL-EFFECT" : "TYPE: STANDARD"}]:\nScript: "${s.scriptLine}"\nDescription: ${s.sceneDescription}\nFocus: ${s.referenceImage}\nPrompt: ${s.imagePrompt || s.startFramePrompt}`
    ).join('\n\n');

    let additionalInstructions = "";
    if (scriptType === 'Temu') {
        additionalInstructions = `
        **TEMU / VIRAL HAUL AUDIO RULES (CRITICAL):**
        - **Audio Cues:** You MUST inject specific SFX cues based on the action.
        - **SFX Menu:** "Plastic Crinkle", "Magnetic Thud", "Ratchet Click", "Fast Pop Music", "Whoosh".
        - **Style:** Fast, Satisfying, ASMR-adjacent.
        `;
    }

    if (scriptType === 'Cinematic') {
        additionalInstructions = `
        **STRATEGY: CINEMATIC SPEC (IDENTITY & COLOR LOCK)**
        **TARGET_PRODUCT:** "${productName}"
        **PRODUCT_TRAITS:** ${productDesc}

        **STRICT IDENTITY RULES:**
        1. **NAME_LOCK:** Under no circumstances call the product anything other than "${productName}". 
           - **FORBIDDEN:** Do not use "vehicle", "tech device", "unit", "monolith", or "orb" unless it is one. 
        2. **COLOR_STABILITY:** Replicate colors from assets. Do NOT invent colors (e.g., Gold, Chrome, Neon) unless they appear in the description or image metadata.
        3. **MATERIAL_INTEGRITY:** If it is leather, it stays leather. If it is mesh, it stays mesh.

        **VFX TRANSITION PROTOCOL (KLING O1/v2.6):**
        - Keep prompts punchy and physics-based. 
        - Use commands daylight: "Macro texture morphs into ${productName}", "Kinetic landing", "Aggressive speed-ramp".
        - No flowery adjectives daylight "Ethereal", "Coalescing", "Celestial".
        `;
    }

    const prompt = `
      Role: Cinematic Video Director (Director Mode).
      Task: Generate video prompts.

      **INPUT STORYBOARD:**
      ${storyboardText}

      ** IDENTITY LOCK:**
      Product: "${productName}"
      Description: "${productDesc}"

      ** TYPE ASSIGNMENT RULES:**
      1. **IF scriptType is "Cinematic":** ALWAYS use type "cinematic".
      2. **OTHERWISE:**
         - SCENE 1 (THE HOOK) IS ALWAYS "b-roll". 
         - SCENE 2+: If description implies Avatar speaking -> "talking", else "b-roll".

      ${additionalInstructions}

      **GENERATION RULES BY TYPE:**

      **OPTION A: IF TYPE IS "b-roll" (Use for SCENE 1 & Visuals):**
         - **MODEL LOGIC:**
           - **IF SCENE 1 (HOOK):** Use **[Model: Kling O1]**. Describe the *morphing/transition* from the Start Frame to the End Frame. **NO AUDIO PROMPT.**
           - **IF REGULAR B-ROLL:** Use **[Model: Kling v2.6]**. Focus on action. **AUDIO REQUIRED** (SFX + Background Music, NO SPEECH).
         - **IDENTITY RULE:** Refer to the product only as "${productName}".
         - **CAMERA DYNAMICS** (Pick ONE randomly):
           - "Zoom -5, Tilt Up" | "Zoom +7" | "Horizontal +4, Roll -2" | "Zoom -5, Vertical +3"
         - **NEGATIVE PROMPT:** "low quality, blurry, distorted, deformation, morphing, melting, glitching, ugly, extra limbs, text, watermark, writing, letters, subtitles."
         - **OUTPUT FORMAT (Strict):**
           \`\`\`text
           [Model: Kling O1/v2.6]
           VISUAL: <Punchy action description of ${productName}>
           CAMERA: <Camera Dynamic>
           AUDIO: <SFX + Music description or "None">
           NEGATIVE: <Negative Prompt>
           \`\`\`

      **OPTION B: IF TYPE IS "talking" (Use for Avatar Scenes 2+):**
         - **MODEL:** Veo 3.1
         - **Start with Direct Dialogue:** Lead with the script line in quotes. 
         - **IDENTITY RULE:** If character mentions product, they say "${productName}".
         - **Performance & Micro-expressions:** Describe facial tension, eye movement, and mouth shapes.
         - **Cinematic Grammar:** Use specific lenses (35mm, 85mm) and camera physics (dolly-in, parallactic shift, rack focus). MANDATORY: Apply realistic lens breathing to the focus pulls and ensure constant pixel movement (e.g., subtle handheld micro-movements or imperceptible slow-creep zoom). NO STATIC SHOTS.
         - **Audio Landscape:** Define the sync-sound environment (SFX: distant room tone, Ambient: low electrical hum).
         - **First & Last Frame Logic:** Explicitly state the starting composition and the resolve state.
         - **OUTPUT FORMAT:** A single, cohesive cinematic paragraph starting with the dialogue in quotes. Seamlessly blend performance details, camera physics, lighting atmosphere, and frame logic into a natural narrative flow. DO NOT use bracketed headers or labels daylight [Subject Performance] or [Camera Motion/Lens].

      **OPTION C: IF TYPE IS "cinematic" (Use for Cinematic Spec Studio Relay):**
         - **MODEL:** Kling O1 (Standard / Frames Mode)
         - **IDENTITY LOCK (CRITICAL):** The product is a "${productName}". Never call it a "vehicle" or "device".
         - **PROMPT STRUCTURE:** A cohesive technical paragraph for the Kling O1 model. Seamlessly describe the bridge command between frames (e.g., macro texture morphing), the technical upload map requirements for anchor frames, and the camera movement. DO NOT use headers daylight INSTRUCTIONS:, PROMPT:, or CAMERA:.
         
      **OUTPUT JSON ARRAY:**
      [{ "scriptLine": "...", "type": "b-roll" | "talking" | "cinematic", "prompt": "..." }]
    `;
    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: fastTextModel, 
        contents: prompt,
        config: {
          // Use standard JSON response for prompt generation
          responseMimeType: "application/json",
          safetySettings: SAFETY_SETTINGS
        },
      }));
    
    const prompts = JSON.parse(cleanJson(response.text || "[]"));
    return prompts;
};

export const optimizeImagePrompt = async (userRequest: string, imageBase64s: string[]): Promise<OptimizedPromptResponse> => {
    await delay(1000);
    const parts: any[] = [];
    
    if (imageBase64s && imageBase64s.length > 0) {
      imageBase64s.forEach((img, index) => {
          const match = img.match(/data:(image\/.+);base64,(.+)/);
          if (match) {
              parts.push({ text: `[ASSET ${index + 1}: ${index === 0 ? 'BASE IMAGE' : 'REFERENCE'}]` });
              parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
          }
      });
    }

    parts.push({ text: `USER REQUEST: "${userRequest}"` });

    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: researchTextModel, 
        contents: { parts },
        config: {
            systemInstruction: NANO_BANANA_INSTRUCTION, 
            responseMimeType: "application/json",
            safetySettings: SAFETY_SETTINGS
        }
    }));

    return JSON.parse(cleanJson(response.text || "{}")) as OptimizedPromptResponse;
};

export const executeStudioCommand = async (
    optimizedPrompt: string, 
    sourceImages: string[], 
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:5' | '3:4',
    ethnicity: string = 'Global'
): Promise<string> => {
    await delay(2000);
    const parts: any[] = [];
    
    const isCinematic = /cinematic|luxury|high-end|anamorphic|studio/i.test(optimizedPrompt);
    const realismProtocol = isCinematic 
        ? REALISM_INSTRUCTION_CINEMATIC 
        : REALISM_INSTRUCTION_UGC;

    if (sourceImages && sourceImages.length > 0) {
        for (const img of sourceImages) {
            const match = img.match(/data:(image\/.+);base64,(.+)/);
            if (match) parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
    }
    
    parts.push({ text: optimizedPrompt });

    const systemInstruction = sourceImages.length > 0 
      ? `### Role: High-Fidelity VFX Compositor (Studio Mode)
${realismProtocol}
1. **PIXEL-LOCK BASE:** Maintain 100% identity of the person and environment from IMAGE 1. Only modify the specific target area.
2. **FINGER OCCLUSION (CRITICAL):** The subject's hand from IMAGE 1 must overlap the new object. The object must be "layered" behind the fingers to ensure it looks held, not floating.
3. **LUMEN & KELVIN SYNC:** Detect the primary light source in IMAGE 1. Apply that exact temperature and angle to the new asset.
4. **MATERIAL PHYSICS:** Adapt specularity and refraction based on the asset type (e.g., clear plastic, metallic sheen, or matte glass).
5. **BRAND INTEGRATION:** If the reference asset contains a logo or text, render it precisely on the surface of the object in the final scene, following the 3D curvature of the object.
6. **CONTACT SHADOWS:** Generate realistic contact shadows where the subject's skin touches the new asset.`
      : `### Role: Master Scene Creator (Creation Mode)
${realismProtocol}
1. **VISUAL FIDELITY:** Create a hyper-realistic photograph. 
2. **ETHNICITY_LOCK:** Any humans generated MUST be ${ethnicity}.
3. **ASPIRATIONAL_VIBE:** Ensure the environment is high-end, clean, and professional. 
4. **NO_ARTIFICIAL_LOOK:** No CGI, no 3D-rendering feel, no smoothing. Photographic textures only.`;

    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateImage({
        model: sceneImageModel,
        contents: { parts },
        config: { 
            imageConfig: { aspectRatio: aspectRatio === '4:5' ? '3:4' : aspectRatio, imageSize: "1K" },
            safetySettings: SAFETY_SETTINGS,
            systemInstruction
        },
    }));

    let b64 = null;
    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) { b64 = part.inlineData.data; break; }
        }
    }
    if (b64) return `data:image/png;base64,${b64}`;
    throw new Error("Studio execution failed.");
};

export const generateCaptionAndHeadline = async (input: CaptionHeadlineInput): Promise<string> => {
    await delay(1000);
    const parts: any[] = [];

    for (const adFile of input.adFiles) {
        const match = adFile.match(/data:(.+);base64,(.+)/);
        if (match) {
            parts.push({
                inlineData: {
                    mimeType: match[1],
                    data: match[2]
                }
            });
        }
    }

    parts.push({ text: `MARKET RESEARCH DATA: ${input.marketResearchText}` });

    const promptText = `
### Role: Expert Ad Copywriter & Visual Analyst
**TASK:** 
1. Watch/Analyze the attached ${input.adFileType} assets carefully. 
2. Use the Market Research provided.
3. Write 3 variations of Facebook Ad Copy (Headline + Caption).

**VISION PROTOCOL:**
Before writing, analyze the visual: What is the emotional energy? What is the product? Is there a human face? Match the "Story" part of the copy to what is actually happening in the video/images.

**WRITING RULES:**
- Structure: Hook (MrBeast curiosity style), Story (relatable), Offer (compelling).
- Headline: 2-7 words, emotionally loaded.
- Formatting: DOUBLE SPACE EVERY SINGLE SENTENCE.
- Language: ${input.language} (Default: Taglish).
- Triggers: Apply Cialdini's Principles (Scarcity/Authority).
- Tone: Sabri Suby $100M style (4th Grade reading level).

**OUTPUT:**
Provide 3 responses. Each must have a "Success Probability Score" (e.g., "Success Probability Score: 92%") based on how well the visual matches the hook.
    `;
    
    parts.push({ text: promptText });

    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: textModel,
        contents: { parts },
        config: {
            safetySettings: SAFETY_SETTINGS,
            thinkingConfig: { thinkingBudget: 4000 }
        }
    }));

    return response.text || "Failed to generate copy.";
};

export const generateContentCalendar = async (data: UplinkData): Promise<DayContent[]> => {
    await delay(1000);
    const prompt = `
### Role: Expert Social Media Content Strategist
Task: Generate a 7-day Organic Content Calendar for "${data.brandIdentityName}".

TACTICAL INTELLIGENCE:
Brand: ${data.brandIdentityName}
Inventory: ${data.inventoryList}
Primary Demographic: ${data.targetDemographic} (${data.ageRange}, ${data.ethnicityProfile})
Core Benefit: ${data.primaryBenefit}
Problem Solved: ${data.problemSolved}
Market Pain Point: ${data.marketPainPoint}
UVP: ${data.uvp}
Brand Colors: ${data.hexCodes}

RULES:
- Return a valid JSON array of 7 objects.
- NO symbols daylight dashes or colons in the text content.
- Caption Language: ${data.language}.
- imagePrompt: Technical visual description. Focus on lighting, ${data.ethnicityProfile} aesthetic, and ${data.aspectRatio} composition.

JSON STRUCTURE:
{
  "day": number,
  "title": "Short catchy title",
  "imagePrompt": "Detailed visual description for an image generator",
  "caption": "Full post caption with emojis",
  "emotionVibe": "e.g., Relatable, High-Energy",
  "logoPlacement": "Description of where to place brand logo",
  "productPlacement": "How the product should be positioned"
}
    `;

    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: textModel,
        contents: prompt,
        config: {
            // Use standard JSON response for calendar generation
            responseMimeType: "application/json",
            safetySettings: SAFETY_SETTINGS
        }
    }));

    return JSON.parse(cleanJson(response.text || "[]"));
};

export const generateAdCreatives = async (data: UplinkData): Promise<AdVariant[]> => {
    await delay(1000);
    const prompt = `
### Role: Direct Response Creative Director
Task: Generate 2 high-conversion Image Ad variants for "${data.brandIdentityName}".

TACTICAL INTELLIGENCE:
Brand: ${data.brandIdentityName}
Original Price: ${data.originalPrice} | Offer Price: ${data.offerPrice}
Demographic: ${data.targetDemographic} (${data.ageRange}, ${data.ethnicityProfile})
Main Benefit: ${data.primaryBenefit}
Market Pain Point: ${data.marketPainPoint}
Unique Value Proposition: ${data.uvp}
Key Features: ${data.keyFeatures}
Brand Colors: ${data.hexCodes}

TEMPLATES TO CHOOSE FROM:
1. "Press Clip" (Looks daylight a news snippet)
2. "Benefit Anatomy" (Labels pointing to product features)
3. "Split-Screen" (Before/After or Problem/Solution)

CRITICAL VISUAL RULE:
- If a device (phone/laptop) is shown, the SCREEN MUST FACE THE VIEWER directly.

JSON STRUCTURE:
{
  "id": number,
  "templateType": "Press Clip" | "Benefit Anatomy" | "Split-Screen",
  "headline": "Short punchy headline",
  "imagePrompt": "Detailed technical prompt for image gen. Include wardrobe, lighting, ${data.ethnicityProfile} characters, and ${data.aspectRatio} layout.",
  "caption": "Primary ad copy text in ${data.language}",
  "hookLogic": "Brief explanation of the psychological trigger used"
}
    `;

    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: textModel,
        contents: prompt,
        config: {
            // Use standard JSON response for creatives generation
            responseMimeType: "application/json",
            safetySettings: SAFETY_SETTINGS
        }
    }));

    return JSON.parse(cleanJson(response.text || "[]"));
};

export const analyzeProductSignature = async (images: string[]): Promise<string> => {
    const parts: any[] = images.map((img) => {
        const match = img.match(/data:(image\/.+);base64,(.+)/);
        return match ? { inlineData: { mimeType: match[1], data: match[2] } } : null;
    }).filter(Boolean);

    if (parts.length === 0) return "high-end commercial product";

    parts.push({ text: `Analyze these product images. Extract the 'Ground Truth' for high-fidelity rendering:
    1. Exact Hex colors (Primary, Accent).
    2. Specific Materials (e.g., brushed aluminum, frosted glass, matte carbon fiber).
    3. Geometric signatures (e.g., sharp chamfered edges, organic curves).
    Return a concise 2-sentence 'Product Signature' for an image generator.` });

    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: researchTextModel,
        contents: { parts }
    }));

    return response.text || "luxury commercial product";
};

export const generateCinematicThemes = async (productName: string): Promise<VisualTheme[]> => {
  const prompt = `
    Role: Visionary Creative Director.
    Product: "${productName}"
    Task: Generate 3 unique "Visual Worlds" for a high-end cinematic product ad.
    
    Each theme must have:
    - name: Catchy 1-2 word name (e.g., "Obsidian Pulse").
    - vibe: Detailed atmospheric description.
    - texturePrompt: Description of a macro texture metaphor (e.g., "Swirling molten lava", "Brushed titanium cooling").
    - colorPalette: List of hex-adjacent colors.
    
    Return a JSON array of 3 themes.
  `;
  const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
    model: researchTextModel,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      safetySettings: SAFETY_SETTINGS
    }
  }));

  const themes = JSON.parse(cleanJson(response.text || "[]"));
  return themes.map((t: any, i: number) => ({ ...t, id: `theme-${i}` }));
};

export const generateDaisyChainScenes = async (
  productImages: string[], 
  theme: VisualTheme, 
  aspectRatio: '9:16' | '16:9'
): Promise<Scene[]> => {
  
  // Setup the relay loop
  const gearStyle = "Shot on RED V-RAPTOR, 35mm anamorphic lens, 8k photographic resolution, professional commercial lighting, lens breathing, anamorphic bokeh, Parallactic camera shift.";
  const identityRule = "**IDENTITY LOCK:** Use the reference images to lock the materials and design, but **FREELY ROTATE** the object in 3D space. It must look daylight the same object filmed from different camera positions (Side -> Front -> Top).";

  const anchorBUrl = productImages[0];
  const actionRefUrl = productImages[2] || productImages[3] || productImages[1] || anchorBUrl;
  const heroRefUrl = productImages[1] || productImages[4] || productImages[0];

  const metaphorPrompt = `${gearStyle}. 100% Abstract Macro Texture of ${theme.texturePrompt}. PURE TEXTURE, NO PRODUCTS, NO PEOPLE. Matches lighting and color palette: ${theme.colorPalette}.`;
  const actionPrompt = `${gearStyle}. Dynamic 3/4 perspective shift. The product from Reference B is soaring and tumbling through frame at a 45-degree tilt in a ${theme.vibe} environment. High velocity motion blur, aggressive perspective shift, parallactic camera shift. Match the shape of Reference Image 2 exactly. ${identityRule}`;
  const heroPrompt = `${gearStyle}. Cinematic top-down detail shot. A dramatic 360-degree orbit. The product from Reference B decelerates into a pristine ${theme.name} studio landing shot. Stable camera orbit, professional 3D lighting, 8k textures. Match the angle of Reference Image 2 exactly. ${identityRule}`;

  // 2. Generation Relay
  const imageA = await generateSceneImage(metaphorPrompt, aspectRatio, '1K', { productUrl: anchorBUrl }, 'Global', [], 'Cinematic');
  await delay(2000);
  
  const imageC = await generateSceneImage(actionPrompt, aspectRatio, '1K', { productUrl: actionRefUrl }, 'Global', [], 'Cinematic');
  await delay(2000);

  const imageD = await generateSceneImage(heroPrompt, aspectRatio, '1K', { productUrl: heroRefUrl }, 'Global', [], 'Cinematic');

  return [
    { 
      scriptLine: "[MORPHING_TRANSITION]", 
      sceneDescription: `Seamless transition from ${theme.name} texture to ${theme.vibe} anchor.`,
      imageUrl: imageA,
      endFrameImageUrl: anchorBUrl,
      chainRole: 'Metaphor_A',
      referenceImage: 'none'
    },
    { 
      scriptLine: "[ACTION_SEQUENCE]", 
      sceneDescription: `Product erupts into motion through the ${theme.name} world.`,
      imageUrl: anchorBUrl,
      endFrameImageUrl: imageC,
      chainRole: 'Anchor_B',
      referenceImage: 'product'
    },
    { 
      scriptLine: "[HERO_LANDING]", 
      sceneDescription: `Final pristine reveal in the ${theme.name} studio.`,
      imageUrl: imageC,
      endFrameImageUrl: imageD,
      chainRole: 'Action_C',
      referenceImage: 'product'
    }
  ];
};

export const generateCinematicNarrative = async (
    product: string, 
    theme: VisualTheme, 
    concept: string,
    hardwareSpecs: { camera: string; lens: string; focalLength: string }
): Promise<CinematicNarrativeScene[]> => {
    const prompt = `
      Role: World-Class Cinematic Director (High-End Spec Ads).
      Product: "${product}"
      Visual Theme: ${theme.name} (${theme.texturePrompt})
      Core Concept: "${concept}"
      Hardware: ${hardwareSpecs.camera} with ${hardwareSpecs.lens} (${hardwareSpecs.focalLength})

      Task: Generate a VISCERAL, HEAVY-PHYSICS 6-scene sequential narrative blueprint for a professional spec ad.
      
      ### TASK: GENERATE DIRECTOR'S NARRATIVE DRAFT (v6.0 - THE STORY RELAY)

      **LEXICON CONSTRAINTS:**
      - FORBIDDEN: "Hand", "Finger", "Human", "Data", "Kaleidoscopic", "Fractal", "Interface", "Cyber", "Computer", "Running", "Biological", "Pair", "Camera", "Lens", "Tripod".
      - MANDATORY: "Inertia", "Molecular Tension", "Chiaroscuro", "Anamorphic", "Momentum", "Collision", "Materialization", "Kinetic Propulsion", "Solo Unit", "Monolithic", "Vibration", "Displacement".

      **PHASE-BY-PHASE RELAY (v6.0):**
      1. PHASE 01 (MATERIAL): The Texture DNA. Extreme Macro indistinguishable detail. Pure material abstraction (e.g. Spiderwebs for mesh). establish visual shaders.
      2. PHASE 02 (FORCE): Kinetic Tension. The material from Scene 1 reacts to energy. An abstract geometric form made of the Material DNA rises or displaces. NO HARDWARE/CAMERAS. 
      3. PHASE 03 (FORM): THE BRIDGE. First revelation of product DNA. Interpolate from Abstract Force into the Solo Monolithic product silhouette. Hybrid background (Metaphor + Action Environment).
      4. PHASE 04 (PROPULSION): High-Speed Odyssey. The single unit slices through atmosphere with Kinetic Propulsion and invisible energy aura.
      5. PHASE 05 (POWER): The Hero Landing. The unit impacts a concrete podium with massive force. Settle with heavy inertia. Dust/Debris/Aura matching Scene 4.
      6. PHASE 06 (IDENTITY): THE PHYSICAL BRAND. Hard-Cut. Logo isolated, 3D depth, Chiaroscuro. etched into product material DNA. Zero human presence.

      ### TONE:
      Technical, visceral, and cinematic. You are the Director using the specified gear, not filming it.

      Return a JSON array of 6 objects:
      {
        "phase": "Phase Name",
        "action": "A punchy description focusing on physics, displacement, and inertia (max 25 words).",
        "emotion": "The visceral impact (e.g., Tension, Release, Gravitas)"
      }
    `;

    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: researchTextModel,
        contents: prompt,
        config: {
          // Response schema is implied by prompt instructions
          responseMimeType: "application/json",
          safetySettings: SAFETY_SETTINGS
        },
    }));

    return JSON.parse(cleanJson(response.text || "[]"));
};

/**
 * Selective Regeneration Logic:
 * re-generates a single phase with a randomized "Visual Seed" instruction
 * while maintaining global hardware and thematic context.
 */
export const generateSinglePhase = async (
    index: number,
    config: CinematicSpecConfig,
    narrative: CinematicNarrativeScene[]
): Promise<string> => {
    const sceneNarrative = narrative[index];
    
    // Quality Injection Protocol
    let qualityInjection = "";
    if (config.resolution === '4K') {
        qualityInjection = "Extreme high-fidelity textures, 8k resolution, photorealistic rendering, hyper-detailed micro-particles, zero compression artifacts.";
    } else if (config.resolution === '2K') {
        qualityInjection = "Hyper-detailed studio render, high dynamic range, crisp sharp textures.";
    } else {
        qualityInjection = "High quality, standard cinematic render.";
    }

    const gearStyle = `${config.camera} camera, ${config.lens} lens, ${config.focalLength} focal length, 8K Unreal Engine 5 render style, ${qualityInjection} Anamorphic lens flares, Lens breathing, High-contrast Chiaroscuro lighting, Sub-surface scattering, Ray-traced reflections.`;
    const lightingRule = "MANDATORY RIM LIGHTING. High-contrast Chiaroscuro silhouette. No flat lighting. Anamorphic lens characteristics.";
    const kineticRule = "NO STATIC SHOTS. High kinetic energy, consistent Global Motion Vector (Momentum flows Left-to-Right). Focus on Inertia.";
    const gearNegative = "STRICT NEGATIVE: NO camera lenses, NO camera bodies, NO film equipment, NO tripods, NO movie sets, NO photographers, NO studio lights visible in frame. The subject is NOT a camera. ";
    
    const subjectNegative = config.subjectFilter === 'product' 
        ? "STRICT NEGATIVE: NO legs, NO feet, NO socks, NO skin, NO humans, NO ankles, NO person, NO body parts, NO pair, NO two shoes. "
        : "NEGATIVE: NO movie sets, NO film crew. ";

    // Selective Regeneration Rule
    const seedInstruction = `\n**SELECTIVE_REGENERATION_PROTOCOL:** Provide a different artistic interpretation of this specific action. Maintain identical lighting and gear, but generate a new visual variation. Random seed shift applied.`;

    let currentRef: { productUrl?: string } | undefined = undefined;
    let prompt = `${gearStyle}. STORYLINE: ${sceneNarrative.action}. EMOTIONAL_TONE: ${sceneNarrative.emotion}. ${lightingRule} ${kineticRule} ${gearNegative} ${subjectNegative} ${seedInstruction}`;

    // Guided Logic Sync (Matches V6 Relay)
    if (index === 0 || index === 1) {
        prompt += `\n**REF_RULE:** DNA abstract material. Context: Use exact Slot 4 properties. FORBIDDEN to show hardware.`;
    } else if (index === 2) {
        prompt += `\n**REF_RULE:** FORM/REVEAL. Profile reveal from Slot 1.`;
        currentRef = { productUrl: config.sideAsset };
    } else if (index === 3) {
        prompt += `\n**REF_RULE:** PROPULSION. High momentum. Match Slot 2.`;
        currentRef = { productUrl: config.frontAsset };
    } else if (index === 4) {
        prompt += `\n**REF_RULE:** LANDING. Heavy inertia settle. Match Slot 3.`;
        currentRef = { productUrl: config.heroAsset };
    } else if (index === 5) {
        prompt += `\n**REF_RULE:** IDENTITY_ISOLATION. Logo etched macro. Use Slot 5.`;
        currentRef = { productUrl: config.logoAsset };
    }

    return await generateSceneImage(
        prompt, 
        config.aspectRatio, 
        '1K', // Preview always 1K
        currentRef, 
        'Global', 
        [], 
        'Cinematic',
        undefined,
        undefined,
        Math.floor(Math.random() * 100) // Random variation index
    );
};

export const generateCinematicSpec = async (
    config: CinematicSpecConfig,
    narrative: CinematicNarrativeScene[],
    onFrame?: (images: Record<string, string>) => void
): Promise<Scene[]> => {
    const types = ['macro_tease', 'atmospheric_hook', 'kinetic_morph', 'flight_action', 'hero_landing', 'the_mark'] as const;
    const images: Record<string, string> = {};

    for (let i = 0; i < types.length; i++) {
        images[types[i]] = await generateSinglePhase(i, config, narrative);
        if (onFrame) onFrame({ ...images });
        await delay(2000); 
    }

    return [
        { scriptLine: "[PHASE_01: MATERIAL]", sceneDescription: narrative[0].action, imageUrl: images.macro_tease, endFrameImageUrl: images.atmospheric_hook, chainRole: 'Metaphor_A' },
        { scriptLine: "[PHASE_02: FORCE]", sceneDescription: narrative[1].action, imageUrl: images.atmospheric_hook, endFrameImageUrl: images.kinetic_morph, chainRole: 'Anchor_B' },
        { scriptLine: "[PHASE_03: FORM]", sceneDescription: narrative[2].action, imageUrl: images.kinetic_morph, endFrameImageUrl: images.flight_action, chainRole: 'Action_C' },
        { scriptLine: "[PHASE_04: PROPULSION]", sceneDescription: narrative[3].action, imageUrl: images.flight_action, endFrameImageUrl: images.hero_landing, chainRole: 'Hero_D' },
        { scriptLine: "[PHASE_05: POWER]", sceneDescription: narrative[4].action, imageUrl: images.hero_landing, endFrameImageUrl: images.the_mark, chainRole: 'Hero_D' },
        { scriptLine: "[PHASE_06: IDENTITY]", sceneDescription: narrative[5].action, imageUrl: images.the_mark, endFrameImageUrl: images.the_mark, chainRole: 'Hero_D' }
    ];
};