import type { GenerateContentResponse } from "@google/genai";
import { BusinessInfo, Script, Scene, StoryboardResponse, VideoPrompt, MarketResearchInput, MarketResearchReport, OfferOptimizerInput, OfferOptimizerResult, VideoEditInput, OptimizedPromptResponse, CaptionHeadlineInput, DayContent, AdVariant, UplinkData, CinematicSpecConfig, VisualTheme, CinematicNarrativeScene, VideoModelType, InfluencerConfig, InfluencerStrategicInput, InfluencerScriptResponse } from '../types';
import { getSupabase } from './supabaseClient';
import { startJob, endJob, type JobKind } from './activeJobsService';
import { saveActiveJob, clearActiveJob } from './activeJobStore';

export interface ProxyCallOpts {
  jobLabel?: string;
  jobKind?: JobKind;
  jobId?: string;
  jobDetail?: string;
}

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

const proxyCall = async <T = GenerateContentResponse>(endpoint: string, params: any, opts?: ProxyCallOpts): Promise<T> => {
  const sb = getSupabase();
  const { data: sessionData } = await sb.auth.getSession();
  let token = sessionData.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');

  // Optional: surface this call as an active job on the dashboard.
  // Callers opt in by passing opts.jobLabel; fast text calls leave it off
  // so the panel only fires for genuinely long operations.
  let trackedJobId: string | null = null;
  if (opts?.jobLabel) {
    trackedJobId = opts.jobId ?? `proxy:${endpoint}:${Math.random().toString(36).slice(2, 8)}`;
    startJob({
      id: trackedJobId,
      label: opts.jobLabel,
      kind: opts.jobKind ?? 'generic',
      detail: opts.jobDetail,
    });
  }

  try {
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
  } finally {
    if (trackedJobId) endJob(trackedJobId);
  }
};

type VideoPollResponse =
  | { done: false; operation: any }
  | { done: true; url: string; downloadUrl: string; mimeType: string }
  | { done: true; error: { message?: string; code?: string } };

const proxyGenerateVideo = (params: any): Promise<{ operation: any }> => {
  // Phase 4a diagnostic: stamp a client requestId so server-side :submit: logs
  // can be correlated with this :proxy: line. If one user click produces two
  // :proxy: lines, we see two distinct requestIds and can root-cause the race.
  const requestId =
    globalThis.crypto?.randomUUID?.() ??
    `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const enriched = { ...params, requestId };
  console.log('[grifon:gv:proxy]', {
    t: Date.now(),
    model: params?.model,
    resolution: params?.config?.resolution,
    duration: params?.config?.durationSeconds,
    requestId,
  });
  return proxyCall<{ operation: any }>('/api/gemini/video', enriched, {
    jobLabel: 'Submitting video render',
    jobKind: 'video',
    jobDetail: 'Reaching the render farm…',
  });
};

interface VideoRenderMetadata {
  prompt?: string;
  sceneIdx?: number;
  model?: VideoModelType;
  aspectRatio?: string;
  duration?: number;
}

const proxyPollVideoOperation = async (
  operation: any,
  metadata?: VideoRenderMetadata
): Promise<VideoPollResponse> => {
  try {
    return await proxyCall<VideoPollResponse>('/api/gemini/video/poll', { operation, metadata });
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

// Veo 3.1 resolution↔duration constraints are PER-MODEL and PER-RESOLUTION on the
// Gemini API surface. Lite hard-locks 1080p to 8s (confirmed via real API error).
// Fast/Quality are permissive at 1080p (verified empirically — graceful fallback if
// not). 4k is conservative (8s only) until we verify. Vertex AI migration (Phase 5+)
// unlocks shorter durations at 1080p across all variants AND native audio + 4k.
export const VIDEO_MODEL_SPECS: Record<VideoModelType, {
  durations: number[];
  resolutions: string[];
  aspectRatios: string[];
  /** Per-resolution duration whitelist. UI greys out invalid combos. */
  durationsByResolution: Record<string, number[]>;
  supportsAudio: boolean;
  maxElements: number;
  requiresStartFrame: boolean;
  /** True when the engine is surfaced in the UI but disabled (no backend integration yet). */
  locked: boolean;
  /** Short capability tagline shown in the model picker. */
  tagline: string;
  /** Display label for the model picker (engine name as users see it). */
  displayName: string;
}> = {
  'Veo_3.1_Fast': {
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'],
    aspectRatios: ['9:16', '16:9'],
    durationsByResolution: {
      '720p': [4, 6, 8],
      '1080p': [4, 6, 8],
      '4k': [8],
    },
    supportsAudio: false, // Vertex-only; Gemini API strips generateAudio. UI hides the toggle.
    maxElements: 3,
    requiresStartFrame: false,
    locked: false,
    displayName: 'Veo 3.1 Fast',
    tagline: 'Fast ads — quickest turnaround',
  },
  'Veo_3.1_Quality': {
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p', '4k'],
    aspectRatios: ['9:16', '16:9'],
    durationsByResolution: {
      '720p': [4, 6, 8],
      '1080p': [4, 6, 8],
      '4k': [8],
    },
    supportsAudio: false,
    maxElements: 3,
    requiresStartFrame: false,
    locked: false,
    displayName: 'Veo 3.1 Quality',
    tagline: 'Hollywood-grade ads — slower, sharper',
  },
  'Veo_3.1_Lite': {
    durations: [4, 6, 8],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['9:16', '16:9'],
    durationsByResolution: {
      '720p': [4, 6, 8],
      '1080p': [8], // HARD CONSTRAINT — Veo 3.1 Lite forces 8s at 1080p (Gemini API).
    },
    supportsAudio: false,
    maxElements: 0,
    requiresStartFrame: false,
    locked: false,
    displayName: 'Veo 3.1 Lite',
    tagline: 'Budget ads — lowest cost',
  },
  'Kling_3_0': {
    durations: [5, 10],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['9:16', '16:9', '1:1'],
    durationsByResolution: {
      '720p': [5, 10],
      '1080p': [5, 10],
    },
    supportsAudio: false,
    maxElements: 0,
    requiresStartFrame: false,
    locked: true,
    displayName: 'Kling 3.0',
    tagline: 'Cinematic B-roll — BETA, coming after integration',
  },
  'Seedance_2_0_Fast': {
    durations: [5, 10],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['9:16', '16:9', '1:1'],
    durationsByResolution: {
      '720p': [5, 10],
      '1080p': [5, 10],
    },
    supportsAudio: false,
    maxElements: 0,
    requiresStartFrame: false,
    locked: true,
    displayName: 'Seedance 2.0 Fast',
    tagline: 'Trend-driven motion — BETA, coming after integration',
  },
  'Seedance_2_0_Quality': {
    durations: [5, 10],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['9:16', '16:9', '1:1'],
    durationsByResolution: {
      '720p': [5, 10],
      '1080p': [5, 10],
    },
    supportsAudio: false,
    maxElements: 0,
    requiresStartFrame: false,
    locked: true,
    displayName: 'Seedance 2.0 Quality',
    tagline: 'Trend-driven motion, sharper — BETA, coming after integration',
  },
};

const VEO_FAST = 'veo-3.1-fast-generate-preview';
const VEO_QUALITY = 'veo-3.1-generate-preview';
const VEO_LITE = 'veo-3.1-lite-generate-preview';

// Locked engines have null modelId — generateVideo() throws MODEL_LOCKED before touching the proxy.
export const VIDEO_MODEL_ROUTING: Record<VideoModelType, { modelId: string | null; viaFallback: boolean }> = {
  'Veo_3.1_Fast':         { modelId: VEO_FAST,    viaFallback: false },
  'Veo_3.1_Quality':      { modelId: VEO_QUALITY, viaFallback: false },
  'Veo_3.1_Lite':         { modelId: VEO_LITE,    viaFallback: false },
  'Kling_3_0':            { modelId: null,        viaFallback: false },
  'Seedance_2_0_Fast':    { modelId: null,        viaFallback: false },
  'Seedance_2_0_Quality': { modelId: null,        viaFallback: false },
};

export interface GeneratedVideoResult {
  url: string;
  downloadUrl: string;
  mimeType: string;
}

/**
 * Returns the valid duration set for a given (model, resolution) combo on the
 * Gemini API surface. Falls back to the model's full `durations` array if the
 * resolution isn't mapped — graceful when new resolutions are added.
 */
export const getValidDurations = (model: VideoModelType, resolution: string): number[] => {
  const spec = VIDEO_MODEL_SPECS[model];
  return spec?.durationsByResolution?.[resolution] ?? spec?.durations ?? [4, 6, 8];
};

/**
 * Suggests the shortest valid duration that fits a scene's script line.
 * Heuristic: ~2.5 wps for Taglish direct-response + 0.8s opening/closing
 * beat, then snap UP to the nearest valid duration. Snapping up (not nearest)
 * prevents truncation; pacing-flexibility users can still click DOWN manually.
 *
 * Pre-empts dead-air at render time so the downstream AI editor has nothing
 * to trim when stitching scenes into a fast-paced ad cut.
 */
export const suggestDurationForScript = (
  scriptLine: string,
  model: VideoModelType,
  resolution: string
): number => {
  const valid = getValidDurations(model, resolution);
  if (valid.length === 0) return 8;
  const words = scriptLine.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return valid[0];
  // Calibrated against MrBeast SCENE 02 smoke test 2026-05-11: 9-word
  // Taglish script actually rendered at ~4s end-to-end (Veo natural pace
  // for Taglish is ~2.5 wps; the +0.8s buffer over-predicted to 6s).
  // Tightening buffer to 0.3s — just enough for one breath/syllable
  // landing. Truncation risk acceptable; manual override is one click.
  const target = words / 2.5 + 0.3;
  const sorted = [...valid].sort((a, b) => a - b);
  return sorted.find((d) => d >= target) ?? sorted[sorted.length - 1];
};

interface GenerateVideoOpts {
  signal?: AbortSignal;
  onStatus?: (status: string) => void;
  /** Extra context persisted alongside the rendered video for the library view. */
  metadata?: { sceneIdx?: number };
  /** Supabase user ID. When present, generateVideo persists the in-flight
   * operation to IndexedDB so the client can resume polling after a tab
   * close / browser restart / PC reboot. Phase 4d resilience. */
  userId?: string;
}

const parseDataUrl = (dataUrl: string): { imageBytes: string; mimeType: string } => {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid image data URL');
  return { mimeType: match[1], imageBytes: match[2] };
};

/**
 * Poll a Veo operation to completion. Extracted from generateVideo so the
 * Phase 4d resume path can reuse it without re-submitting the job. Return
 * type is narrowed to the `done: true` variants so callers can branch on
 * success vs error without re-narrowing.
 */
type DoneVideoPollResponse = Extract<VideoPollResponse, { done: true }>;

const pollUntilDone = async (
  initialOperation: any,
  metadata: VideoRenderMetadata,
  opts: GenerateVideoOpts = {}
): Promise<DoneVideoPollResponse> => {
  let operation = initialOperation;
  while (true) {
    if (opts.signal?.aborted) throw new Error('ABORTED');
    opts.onStatus?.('RENDERING');
    await delay(10000);
    const result = await proxyPollVideoOperation(operation, metadata);
    if (result.done) return result;
    operation = result.operation;
  }
};

export const generateVideo = async (
  config: { model: VideoModelType; prompt: string; duration: number; resolution: string; aspectRatio: string; audioEnabled: boolean; startFrame?: string; endFrame?: string },
  opts: GenerateVideoOpts = {}
): Promise<GeneratedVideoResult> => {
  const routing = VIDEO_MODEL_ROUTING[config.model];
  if (!routing) throw new Error(`UNSUPPORTED_MODEL: ${config.model}`);
  if (!routing.modelId) throw new Error(`MODEL_LOCKED: ${config.model} is not yet integrated`);
  if (!config.prompt?.trim()) throw new Error('EMPTY_PROMPT');

  // Pre-flight: warn early if the (model, resolution, duration) combo violates a known constraint.
  // Doesn't block the submit (Veo may have changed) — just throws a clear error message.
  const validDurations = getValidDurations(config.model, config.resolution);
  if (!validDurations.includes(config.duration)) {
    throw new Error(
      `INVALID_COMBO: ${VIDEO_MODEL_SPECS[config.model].displayName} at ${config.resolution} only supports ${validDurations.join('/')}s. Got ${config.duration}s.`
    );
  }

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
  const { operation: initialOperation } = await proxyGenerateVideo(params);

  const renderMetadata: VideoRenderMetadata = {
    prompt: config.prompt.trim(),
    sceneIdx: opts.metadata?.sceneIdx,
    model: config.model,
    aspectRatio: config.aspectRatio,
    duration: config.duration,
  };

  // Phase 4d: persist this in-flight job to IndexedDB so that if the tab
  // closes / browser restarts / PC reboots before the poll loop completes,
  // GenerateVideo can resume polling on next mount. Only persist when we know
  // the userId (the active job index is keyed by user).
  const jobId =
    globalThis.crypto?.randomUUID?.() ??
    `job-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  let persisted = false;
  if (opts.userId) {
    await saveActiveJob({
      jobId,
      userId: opts.userId,
      operation: initialOperation,
      prompt: config.prompt.trim(),
      sceneIdx: opts.metadata?.sceneIdx,
      model: config.model,
      aspectRatio: config.aspectRatio,
      duration: config.duration,
      resolution: config.resolution,
      submittedAt: Date.now(),
    });
    persisted = true;
  }

  let result: VideoPollResponse;
  try {
    result = await pollUntilDone(initialOperation, renderMetadata, opts);
  } catch (err) {
    // On abort, leave the IndexedDB entry — user may come back. On other
    // failures, clear it so we don't pointlessly retry a known-bad job.
    if (persisted && (err as any)?.message !== 'ABORTED') {
      await clearActiveJob(jobId);
    }
    throw err;
  }

  if ('error' in result) {
    if (persisted) await clearActiveJob(jobId);
    if (result.error.code) throw new Error(result.error.code);
    throw new Error(`VEO_ERROR: ${result.error.message ?? 'Unknown Veo error'}`);
  }

  if (persisted) await clearActiveJob(jobId);

  opts.onStatus?.('DOWNLOADING');
  return { url: result.url, downloadUrl: result.downloadUrl, mimeType: result.mimeType };
};

/**
 * Phase 4d — resume polling for a job that was in flight when the client
 * disconnected. Called by GenerateVideo on mount for each entry in the
 * activeJobStore. Returns the final result so the caller can refresh the
 * library + toast success. The IndexedDB entry is cleared on both success
 * and terminal failure (caller is responsible for clearing the entry —
 * exposed for symmetry with manual retry flows).
 */
export const resumeVideoOperation = async (
  job: { operation: any; prompt: string; sceneIdx?: number; model: VideoModelType; aspectRatio: string; duration: number },
  opts: GenerateVideoOpts = {}
): Promise<GeneratedVideoResult> => {
  const metadata: VideoRenderMetadata = {
    prompt: job.prompt,
    sceneIdx: job.sceneIdx,
    model: job.model,
    aspectRatio: job.aspectRatio,
    duration: job.duration,
  };
  const result = await pollUntilDone(job.operation, metadata, opts);
  if ('error' in result) {
    if (result.error.code) throw new Error(result.error.code);
    throw new Error(`VEO_ERROR: ${result.error.message ?? 'Unknown Veo error'}`);
  }
  return { url: result.url, downloadUrl: result.downloadUrl, mimeType: result.mimeType };
};

import type { VideoLibraryItem } from '../types';

/**
 * Lists the authenticated user's persisted video renders (Phase 2 library).
 * Each item carries its prompt + render context (sceneIdx, model, aspect, duration)
 * via the JSON sidecar written by api/gemini/video/poll.ts on successful upload.
 * Signed URLs in the response are valid for 24h (same as the poll endpoint TTL).
 */
export const listVideoLibrary = async (): Promise<VideoLibraryItem[]> => {
  const res = await proxyCall<{ items: VideoLibraryItem[] }>('/api/gemini/video/library', {});
  return res.items ?? [];
};

/**
 * Phase 4h.2 — Delete one library entry (mp4 + sidecar) via server endpoint.
 * Replaces direct client-side Supabase Storage `remove()` calls that silently
 * failed on RLS denial. The server endpoint uses the service role and verifies
 * user ownership via the path prefix before deleting.
 */
export const deleteVideoLibraryItem = async (path: string): Promise<void> => {
  await proxyCall<{ deleted: true }>('/api/gemini/video/delete', { path });
};

// CAMERA ANGLE SET — rebalanced 2026-05-08-late-late-evening for storyboard-variety + face-to-camera safety.
// 4 framings the model reliably renders. Rotated via `variationIndex % AVATAR_CAMERA_ANGLES.length`
// so consecutive scenes get different framings. SIDE_PROFILE_TALK and DYNAMIC_SHOULDER were dropped
// because the model silently collapsed them to a frontal portrait when IDENTITY_LOCK was firing.
const AVATAR_CAMERA_ANGLES = [
    "INTIMATE_CLOSE_UP: Framing neck up. Face fully toward camera. Focus: Eyes. Mandatory: Slight lens breathing and micro-handheld jitter.",
    "MEDIUM_FRONTAL: Chest-up, eye-level frontal angle. Face squarely toward camera. Subtle handheld sway. 50mm lens feel. Casual conversational vibe.",
    "WIDE_BUST_SHOT: Waist up, near-frontal angle. Face toward camera. Natural handheld sway. Background depth-of-field matches 85mm lens.",
    "HIGH_ANGLE_SELFIE: Camera above eye-level looking down at face. Relatable, casual handheld vlog vibe with consistent micro-jitter. Subject looks UP at camera (face fully toward camera)."
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

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  retries = 5,
  delayMs = 4000,
  timeoutRetriesLeft = 2,
): Promise<T> => {
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

    const isTimeout =
        error?.status === 504 ||
        msg.includes('PROXY_TIMEOUT');

    if (retries > 0 && isQuota) {
      console.warn(`Quota hit (429). Retrying in ${delayMs}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return retryWithBackoff(fn, retries - 1, delayMs * 2, timeoutRetriesLeft);
    }
    // Timeout retries get a separate budget (default 2) — each retry costs another
    // 55s of wall-clock under the worst case, so unbounded timeout retries would
    // stack to many minutes per scene. Quota budget stays untouched.
    if (timeoutRetriesLeft > 0 && isTimeout) {
      console.warn(`Proxy timeout (504). Retrying in ${delayMs}ms... (${timeoutRetriesLeft} timeout retries left)`);
      await new Promise(resolve => setTimeout(resolve, delayMs));
      return retryWithBackoff(fn, retries, delayMs, timeoutRetriesLeft - 1);
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

/**
 * Offer Optimizer (Hormozi Grand Slam stack) — server-side prompt. Full Hormozi
 * Value Equation reasoning, 3-tier stack template, directorPayload contract, and
 * Cialdini lever weaving live in api/_lib/prompts.ts. Client never sees the prompt.
 */
export const generateOfferOptimization = async (input: OfferOptimizerInput): Promise<OfferOptimizerResult> => {
  await delay(1000);
  return retryWithBackoff(() => proxyCall<OfferOptimizerResult>('/api/gemini/text', { flow: 'offer-optimizer', input }));
};

/**
 * MarketMind — server-side prompt. The system instruction, OUTPUT TEMPLATE, and
 * builder live in api/_lib/prompts.ts (server-only) and execute in api/gemini/flow.ts.
 * The client never sees the prompt — sends only `{flow, input}` and receives the
 * parsed MarketResearchReport.
 */
export const generateMarketResearch = async (input: MarketResearchInput): Promise<MarketResearchReport> => {
  await delay(1000);
  return retryWithBackoff(() => proxyCall<MarketResearchReport>('/api/gemini/text', { flow: 'marketmind', input }));
};

/**
 * Director AI script generator — server-side prompt. The full prompt assembly
 * (COMMON_RULES, DIRECTOR_CRITIQUE_INSTRUCTION, USER_CHOSEN_ANGLE_BLOCK, all 3
 * script-type variants, Temu sub-type classifier) lives in api/_lib/prompts.ts
 * + api/gemini/flow.ts. Client never sees the prompt — sends only
 * `{flow: 'adscript', input}` and receives the parsed Script.
 */
export const generateAdScript = async (
    businessInfo: BusinessInfo,
    brandName: string,
    language: 'English' | 'Taglish',
    offer: string = '',
    chosenAngleBrief: string = ''
): Promise<Script> => {
  await delay(1000);
  return retryWithBackoff(() => proxyCall<Script>('/api/gemini/text', {
    flow: 'adscript',
    input: { businessInfo, brandName, language, offer, chosenAngleBrief },
  }));
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
/**
 * Influencer Forge script generator — server-side prompt. CCC framework,
 * monetization-game routing, and CONTENT_STRATEGY mapping live in
 * api/_lib/prompts.ts. Client never sees the prompt.
 */
export const generateInfluencerScript = async (
  config: InfluencerConfig,
  input: InfluencerStrategicInput,
  dayNumber: number = 1,
  seriesContext: string = ""
): Promise<InfluencerScriptResponse> => {
  return retryWithBackoff(() => proxyCall<InfluencerScriptResponse>('/api/gemini/text', {
    flow: 'influencer-script',
    input: { config, input, dayNumber, seriesContext },
  }));
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
  4. ${AVATAR_CAMERA_ANGLES[3]}
  
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

/**
 * Wizard storyboard generator — server-side prompt. Cinematic relay,
 * STILL_FRAME_RULE, APPEARANCE_LOCK_RULE, BAG_ORIENTATION_RULE, Temu/MrBeast
 * strategy branches, and DIRECTOR_CRITIQUE all live in api/_lib/prompts.ts.
 * Client never sees the prompt.
 */
export const generateStoryboard = async (
    script: string[],
    avatarDescription: string,
    businessInfo: BusinessInfo,
    ethnicity: string,
    language: 'English' | 'Taglish'
): Promise<StoryboardResponse> => {
  return retryWithBackoff(() => proxyCall<StoryboardResponse>('/api/gemini/text', {
    flow: 'storyboard',
    input: { script, avatarDescription, businessInfo, ethnicity, language },
  }));
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
    referenceImageMode: 'avatar' | 'product' | 'both' | 'none' = 'none'
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
        2. **VISUAL_GROUND_TRUTH_PRIORITY (overrides text metadata):** Reference Image 1 is the VISUAL GROUND TRUTH for the product. Do NOT infer visual properties (color, jar shape, label design, finish, fill level, packaging material) from the product NAME or DESCRIPTION text fields below. If text says "Ube-Calamansi Marmalade" but Reference Image 1 shows a red/strawberry-jam jar with a pink label, render the RED/strawberry jar exactly as photographed — do NOT render a purple ube jar. Text metadata controls ONLY: wordmark text language, product category confirmation, and the words appearing on the label. IMAGE wins every visual tie.
        3. **NO_LOGO_HALLUCINATION:** PRESERVE the uploaded product label EXACTLY — every wordmark, illustration, color block, and panel that appears in Reference Image 1 must match in this scene. Do not invent NEW labels, do not blank or simplify the existing label, do not substitute a generic kraft or plain surface. Naturalistic composition (partial hand occlusion, angled view, partial visibility from camera framing) is acceptable as long as the VISIBLE portions of the label match the reference photo content.
        4. **ANATOMICAL_LOCK:** If the prompt requires hands or fingers, render exactly TWO hands with FIVE fingers each. No extra limbs, no extra fingers, no partial hands, no third hand entering frame. "A pair of hands" means exactly two hands.
        5. **NO HUMAN FACES:** Do NOT render faces, full bodies, or recognizable people. Hands are allowed only when the prompt explicitly requires them (per rule 4).
        6. **LUMEN_SYNC:** Use the lighting temperature and color profile from Reference Image 1. Match the warmth/coolness of its highlights.
        7. **SUBJECT:** Focus on the product described in the prompt; the product from Reference Image 1 is the hero.
        `;
    } else if (referenceImageMode === 'both' && references.avatarUrl && references.productUrl) {
        consistencyRules = `
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
        9. **ANATOMICAL_LOCK:** If the prompt requires hands holding the product, render exactly TWO hands with FIVE fingers each. No extra limbs, no extra fingers, no partial hands.

        **LIGHTING (DUAL_LUMEN_SYNC):**
        - Scene lighting prioritizes the avatar's environment (Reference Image 1) — the scene IS in the avatar's home, so use that warm/natural light profile for the overall image.
        - Product label colors are preserved as PRINTED on Reference Image 2 — do not relight the label with studio lighting; let it sit naturally in the avatar's environmental light.
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
    **CAMERA_MANDATORY (overrides IDENTITY_LOCK's default-frontal preference):**
    You MUST render this exact framing: ${randomAngle}.
    - The DISTANCE (close-up vs medium vs wide) and ELEVATION (eye-level vs above-eye selfie) are MANDATORY — do NOT collapse to a standard chest-up frontal medium shot.
    - If the Scene Prompt describes an action (gesturing, pointing, holding, looking down at a phone), execute that action AT this framing — do NOT shift the camera to a default flattering portrait angle to accommodate the action.
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
         - **IDENTITY RULE:** Refer to the product only as "${productName}".
         - **CAMERA PHYSICS (MANDATORY — open the prose with this, never static):**
           - "slow dolly-out with upward tilt revealing scale" | "aggressive macro push-in" | "smooth lateral tracking pan with subtle counter-roll" | "slow dolly-out with gentle crane lift"
         - **MOTION CONTINUITY:** The chosen camera move runs through the FULL clip duration. Camera position at frame 0 and final frame MUST be visibly different — STATIC SHOTS ARE FORBIDDEN.
         - **SCENE 1 (HOOK) DIRECTIVE:** Describe a morphing/transition from the Start Frame to the End Frame. Skip audio direction.
         - **REGULAR B-ROLL DIRECTIVE:** Focus on the product's action. Include short audio direction (SFX + background music register, NO SPEECH) at the end.
         - **NEGATIVE PHRASE:** Append at the end as a comma-separated tail — "Avoid low quality, blurry, distorted, deformation, morphing, melting, glitching, extra limbs, text, watermark, writing, letters, subtitles."
         - **OUTPUT FORMAT:** A single cohesive cinematic paragraph. NO bracketed labels, NO [Model:] tag, NO VISUAL:/CAMERA:/AUDIO:/NEGATIVE: headers — those are stale routing markers from a manual copy-paste workflow. Open with the visual action, weave in the camera physics, end with the audio direction and the negative phrase as natural prose.

      **OPTION B: IF TYPE IS "talking" (Use for Avatar Scenes 2+):**
         - **MODEL:** Veo 3.1
         - **FRAME 0 RULE (CRITICAL):** The avatar is ALREADY mid-syllable when the clip opens — mouth in motion, first word of the dialogue actively forming, eyes already engaged with the lens. NO establishing pose, NO pre-speech beat, NO "settling in," NO "initially resting." The first frame IS the action. The clip ends on the next breath, not on a resolve-state pause.
         - **Start with Direct Dialogue:** Lead with the script line in quotes.
         - **IDENTITY RULE:** If character mentions product, they say "${productName}".
         - **Performance & Micro-expressions:** Describe facial tension, eye movement, and mouth shapes — all already in motion at frame 0.
         - **Cinematic Grammar (CAMERA MOTION IS MANDATORY — never static):** Open the prose with the camera physics directive. Use specific lenses (35mm, 85mm) and pick ONE camera move per scene: dolly-in (intimacy/escalation), parallactic shift (reveal/payoff), rack focus (emphasis), or aggressive handheld (urgency). The camera position at frame 0 and the final frame MUST be visibly different — the viewer should feel motion at any moment. CAMERA MOVE BEGINS WITH THE FIRST SYLLABLE — never before — so movement happens DURING dialogue. On 4s clips: modest but visible (not subtle). On 6–8s clips: pronounced. Apply realistic lens breathing on focus pulls. STATIC SHOTS ARE FORBIDDEN.
         - **Audio Landscape:** Define the sync-sound environment (SFX: distant room tone, Ambient: low electrical hum).
         - **First & Last Frame Logic:** Starting frame = avatar mid-syllable forming the opening word, mouth shape unambiguous. Last frame = next syllable or natural breath, NOT a post-speech resolve-state with a closed mouth and neutral expression.
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