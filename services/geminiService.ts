import type { GenerateContentResponse } from "@google/genai";
import { BusinessInfo, Script, Scene, StoryboardResponse, VideoPrompt, MarketResearchInput, MarketResearchReport, OfferOptimizerInput, OfferOptimizerResult, VideoEditInput, OptimizedPromptResponse, CaptionHeadlineInput, DayContent, AdVariant, BatchHeadline, UplinkData, CinematicSpecConfig, VisualTheme, CinematicNarrativeScene, VideoModelType, InfluencerConfig, InfluencerStrategicInput, InfluencerScriptResponse, EditDecisionInput, EditDecisionList, SfxBankId, PremiseCheckInput, PremiseCheckResult, PremiseAlternative } from '../types';
import { getSupabase } from './supabaseClient';
import { getActiveRunId } from './runTelemetry';
import { startJob, endJob, type JobKind } from './activeJobsService';
import { saveActiveJob, clearActiveJob } from './activeJobStore';
import { triggerQuotaWall } from './quotaWallStore';
import type { MeterUnit } from '../hooks/useQuota';
import type { PlanId } from '../utils/planGate';

/**
 * Thrown when a metered generation hits the user's monthly plan allowance
 * (server returns HTTP 402 `quota_exceeded`). Distinct from a transient 429:
 * retryWithBackoff must NOT retry this — it only clears with an upgrade. The
 * quota-wall modal is published as a side effect before this throws so callers
 * just need to stop their spinners.
 */
export class QuotaExceededError extends Error {
  status = 402 as const;
  scope: MeterUnit;
  constructor(scope: MeterUnit) {
    super(`QUOTA_EXCEEDED: ${scope}`);
    this.name = 'QuotaExceededError';
    this.scope = scope;
  }
}

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

// Mints a Gemini Files API URI for ONE media URL and returns it. Gemini's
// fileData contract only accepts URIs it minted itself (see
// EDL_MAX_ATTACHED_VIDEOS), and the client can neither hold the server key nor
// import @google/genai — so the download+upload runs in
// api/gemini/files/upload.ts and this is the thin transport wrapper. Callers
// fan out one call per clip; each upload then gets its own function budget.
const proxyUploadFile = async (url: string): Promise<string> => {
  const { uri } = await proxyCall<{ uri: string; name?: string }>('/api/gemini/files/upload', { url });
  if (!uri) throw new Error('FILES_UPLOAD_NO_URI: proxy returned no files/* uri');
  return uri;
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
  // P2 observability: stamp a fresh per-call trace id, and — during a producer run —
  // the active run id, so the server can join per-call COGS/node events to the run.
  const requestId =
    globalThis.crypto?.randomUUID?.() ??
    `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const activeRunId = getActiveRunId();
  try {
    return await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'x-request-id': requestId,
        ...(activeRunId ? { 'x-run-id': activeRunId } : {}),
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
      // Monthly plan allowance exhausted → raise the upgrade wall (side effect)
      // and throw a non-retryable typed error. Distinct from 429 below, which
      // retryWithBackoff retries; a 402 only clears with an upgrade.
      if (res.status === 402 && body?.error === 'quota_exceeded') {
        triggerQuotaWall({
          scope: body.scope as MeterUnit,
          plan: (body.plan as PlanId) ?? 'free',
          used: Number(body.used) || 0,
          limit: Number(body.limit) || 0,
        });
        throw new QuotaExceededError(body.scope as MeterUnit);
      }
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

// Phase 2a smoke (2026-05-18) confirmed: Kling V3 accepts RAW base64 (no
// `data:image/jpeg;base64,` prefix) for `image` / `image_tail`. Sending the
// full data URL fails with code 1201 "File is not in a valid base64 format".
const stripDataUrlPrefix = (s: string): string => s.replace(/^data:[^;]+;base64,/, '');

interface KlingSubmitBody {
  model_name: string;
  image: string;
  image_tail?: string;
  prompt: string;
  duration: string;          // STRING per Kling API (verified Phase 1 smoke)
  mode: 'std' | 'pro';
  aspect_ratio: string;
  cfg_scale?: number;
  finishedAdId?: string;     // per-finished-ad metering id (Slice 3)
}

interface KlingOperation {
  task_id: string;
  task_status: string;
  model_name?: string;
  created_at?: number;
}

const proxyGenerateKlingVideo = (
  body: KlingSubmitBody
): Promise<{ operation: KlingOperation }> => {
  const requestId =
    globalThis.crypto?.randomUUID?.() ??
    `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  console.log('[grifon:gv:kling:proxy]', {
    t: Date.now(),
    model: body.model_name,
    duration: body.duration,
    mode: body.mode,
    aspect: body.aspect_ratio,
    hasTail: !!body.image_tail,
    requestId,
  });
  return proxyCall<{ operation: KlingOperation }>(
    '/api/kling/video',
    { ...body, requestId },
    { jobLabel: 'Submitting Kling render', jobKind: 'video', jobDetail: 'Reaching klingai.com…' }
  );
};

// Kling Omni (kling-video-o1) lives on a different upstream surface than V3
// image2video. Different endpoint (/v1/videos/omni-video), different body
// shape (image_list array of tagged frames, not flat image + image_tail
// strings). Auth + JWT + rate-limit pool are shared with V3.
interface KlingOmniSubmitBody {
  model_name: string;
  image_list: Array<{ image_url: string; type?: 'first_frame' | 'end_frame' }>;
  prompt: string;
  negative_prompt?: string;
  duration: string;
  mode: 'std' | 'pro' | '4k';
  aspect_ratio?: string;
  cfg_scale?: number;
  sound: 'on' | 'off';
  finishedAdId?: string;     // per-finished-ad metering id (Slice 3)
}

const proxyGenerateKlingOmniVideo = (
  body: KlingOmniSubmitBody
): Promise<{ operation: KlingOperation }> => {
  const requestId =
    globalThis.crypto?.randomUUID?.() ??
    `req-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  console.log('[grifon:gv:kling-omni:proxy]', {
    t: Date.now(),
    model: body.model_name,
    duration: body.duration,
    mode: body.mode,
    sound: body.sound,
    aspect: body.aspect_ratio,
    frames: body.image_list.length,
    requestId,
  });
  return proxyCall<{ operation: KlingOperation }>(
    '/api/kling/omni-video',
    { ...body, requestId },
    { jobLabel: 'Submitting Kling Omni render', jobKind: 'video', jobDetail: 'Reaching klingai.com (Omni)…' }
  );
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
  // Dispatch on apiSurface derived from metadata.model. Falls back to /gemini
  // for back-compat with persisted jobs that pre-date metadata.model.
  const apiSurface = metadata?.model ? VIDEO_MODEL_ROUTING[metadata.model]?.apiSurface : 'gemini';
  const endpoint =
    apiSurface === 'kling-omni-video'
      ? '/api/kling/omni-video/poll'
      : apiSurface === 'kling-image2video'
        ? '/api/kling/video/poll'
        : '/api/gemini/video/poll';
  try {
    return await proxyCall<VideoPollResponse>(endpoint, { operation, metadata });
  } catch (err: any) {
    if (err?.status === 502) {
      const code = err.body?.error;
      const status = err.body?.status;
      if (code === 'veo_download_failed') throw new Error(`VEO_DOWNLOAD_FAILED: ${status}`);
      if (code === 'kling_download_failed') throw new Error(`KLING_DOWNLOAD_FAILED: ${status}`);
      if (code === 'storage_upload_failed') throw new Error(`STORAGE_UPLOAD_FAILED: ${status}`);
    }
    throw err;
  }
};

const textModel = 'gemini-3.1-flash-lite';
const fastTextModel = 'gemini-3.1-flash-lite';
const researchTextModel = 'gemini-3.6-flash';
const premiseCheckModel = 'gemini-3.5-flash'; // premise check stays pinned: googleSearch-grounding + JSON-in-prompt flaked 1/6 on 3.6 (see workflows/gemini36_adoption.md)
const avatarModel = 'gemini-3.1-flash-image-preview'; 
const sceneImageModel = 'gemini-3.1-flash-lite-image';
const thumbnailModel = 'gemini-3.1-flash-image-preview';

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
    locked: false,
    displayName: 'Kling 3.0',
    tagline: 'Cinematic B-roll — morph mode',
  },
  'Kling_O1': {
    durations: [5, 10],
    resolutions: ['720p', '1080p'],
    aspectRatios: ['9:16', '16:9', '1:1'],
    durationsByResolution: {
      '720p': [5, 10],
      '1080p': [5, 10],
    },
    supportsAudio: false,
    maxElements: 0,
    requiresStartFrame: true,
    locked: false,
    displayName: 'Kling O1 (Omni)',
    tagline: 'Hook drama — Omni morph',
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
const KLING_V3 = 'kling-v3';
const KLING_O1 = 'kling-video-o1';

// Locked engines have null modelId — generateVideo() throws MODEL_LOCKED before touching the proxy.
// `apiSurface` discriminates which backend proxy to dispatch to. Replaced the
// coarser `provider: 'gemini' | 'kling'` field in Session D so the dispatcher
// can split within Kling (V3 image2video vs O1 omni-video) without per-call
// string matching on model name.
export const VIDEO_MODEL_ROUTING: Record<VideoModelType, { modelId: string | null; viaFallback: boolean; apiSurface: 'gemini' | 'kling-image2video' | 'kling-omni-video' }> = {
  'Veo_3.1_Fast':         { modelId: VEO_FAST,    viaFallback: false, apiSurface: 'gemini'            },
  'Veo_3.1_Quality':      { modelId: VEO_QUALITY, viaFallback: false, apiSurface: 'gemini'            },
  'Veo_3.1_Lite':         { modelId: VEO_LITE,    viaFallback: false, apiSurface: 'gemini'            },
  'Kling_3_0':            { modelId: KLING_V3,    viaFallback: false, apiSurface: 'kling-image2video' },
  'Kling_O1':             { modelId: KLING_O1,    viaFallback: false, apiSurface: 'kling-omni-video'  },
  'Seedance_2_0_Fast':    { modelId: null,        viaFallback: false, apiSurface: 'gemini'            },
  'Seedance_2_0_Quality': { modelId: null,        viaFallback: false, apiSurface: 'gemini'            },
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
  // Calibrated 2026-05-26 (Session N) against Curology 7-scene smoke:
  // 2026-05-11 had tightened the buffer to 0.3s based on a 9-word
  // English-cadence MrBeast script. Session M revealed that tightening
  // truncates real Taglish skincare scripts ("suffocate" in Scene 4 cut
  // mid-syllable at 4s) because Taglish syllable density is heavier than
  // English direct-response. Reverted to 0.8s — trades ~1-2s overshoot
  // per scene for ZERO truncations. Dead air is downstream-trimmable by
  // the AI Editor; truncation is not.
  const target = words / 2.5 + 0.8;
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
  /** Stable id for the finished ad this render belongs to. When present, the
   * server meters ONE video_ad credit per finishedAdId (Slice 3) — all scenes
   * of one Render All share it, so the ad costs one credit, not one-per-scene. */
  finishedAdId?: string;
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

/**
 * Serializable provider job handle returned by submitVideo — the poll target that survives
 * a checkpoint round-trip (e.g. stored in producer_scenes.job_handle). Carries the render
 * context resumeVideoOperation needs to poll to completion without re-submitting (re-spending).
 */
export interface VideoJobHandle {
  operation: any;
  prompt: string;
  sceneIdx?: number;
  model: VideoModelType;
  aspectRatio: string;
  duration: number;
}

/**
 * Submit a video render WITHOUT polling — returns the serializable provider job handle so a
 * caller can record it before the long poll and resume by polling that same handle after a
 * crash (instead of re-submitting / re-spending). This is the SUBMIT half of the fire-then-poll
 * pair; poll with resumeVideoOperation(handle). generateVideo composes submit + poll below, so
 * both the single-shot wizard path and the split producer fan-out share ONE transport path.
 */
export const submitVideo = async (
  config: { model: VideoModelType; prompt: string; duration: number; resolution: string; aspectRatio: string; audioEnabled: boolean; startFrame?: string; endFrame?: string },
  opts: GenerateVideoOpts = {}
): Promise<VideoJobHandle> => {
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

  opts.onStatus?.('SUBMITTING_JOB');
  let initialOperation: any;

  if (routing.apiSurface === 'kling-omni-video') {
    // Kling Omni (kling-video-o1) — used for the hook scene. Morph requires
    // BOTH first_frame and end_frame entries in image_list; sending only
    // first_frame degrades to camera-motion on a single image (zoom, not
    // morph). Session D Hotfix wires endFrame through when present.
    if (!config.startFrame) {
      throw new Error(`KLING_REQUIRES_START_FRAME: ${VIDEO_MODEL_SPECS[config.model].displayName} needs a start frame (storyboard image)`);
    }
    const imageList: Array<{ image_url: string; type?: 'first_frame' | 'end_frame' }> = [
      { image_url: stripDataUrlPrefix(config.startFrame), type: 'first_frame' },
    ];
    if (config.endFrame) {
      imageList.push({ image_url: stripDataUrlPrefix(config.endFrame), type: 'end_frame' });
    }
    const omniResult = await proxyGenerateKlingOmniVideo({
      model_name: routing.modelId,
      image_list: imageList,
      prompt: config.prompt.trim(),
      duration: String(config.duration),
      mode: 'std',
      aspect_ratio: config.aspectRatio,
      sound: 'off', // SignalModulator owns voiceover; Omni audio would be discarded.
      finishedAdId: opts.finishedAdId,
    });
    initialOperation = omniResult.operation;
  } else if (routing.apiSurface === 'kling-image2video') {
    // Kling V3 image2video requires a start frame. UI gating should prevent
    // this from happening, but throw clearly if a Kling render is dispatched
    // without one.
    if (!config.startFrame) {
      throw new Error(`KLING_REQUIRES_START_FRAME: ${VIDEO_MODEL_SPECS[config.model].displayName} needs a start frame (storyboard image)`);
    }
    const klingResult = await proxyGenerateKlingVideo({
      model_name: routing.modelId,
      image: stripDataUrlPrefix(config.startFrame),
      ...(config.endFrame ? { image_tail: stripDataUrlPrefix(config.endFrame) } : {}),
      prompt: config.prompt.trim(),
      duration: String(config.duration),
      mode: 'std', // Session B default; per-scene mode picker is Session C.
      aspect_ratio: config.aspectRatio,
      cfg_scale: 0.5,
      finishedAdId: opts.finishedAdId,
    });
    initialOperation = klingResult.operation;
  } else {
    const params: any = {
      model: routing.modelId,
      prompt: config.prompt.trim(),
      finishedAdId: opts.finishedAdId,
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

    let proxyResult;
    try {
      proxyResult = await proxyGenerateVideo(params);
    } catch (err: any) {
      // Veo 3.1 Lite rejects startFrame+endFrame morph mode with 400 INVALID_ARGUMENT.
      // Fall back to single-frame render so the scene still produces a usable clip.
      const isMorphRejection = params.config?.lastFrame && (err?.status === 400 || /"code":\s*400|INVALID_ARGUMENT/.test(err?.message ?? ''));
      if (isMorphRejection) {
        console.warn('[grifon:gv:morph-fallback] Veo rejected startFrame+endFrame, retrying without endFrame');
        delete params.config.lastFrame;
        proxyResult = await proxyGenerateVideo(params);
        console.warn('[grifon:gv:morph-fallback] Fallback render succeeded');
      } else {
        throw err;
      }
    }
    initialOperation = proxyResult.operation;
  }

  return {
    operation: initialOperation,
    prompt: config.prompt.trim(),
    sceneIdx: opts.metadata?.sceneIdx,
    model: config.model,
    aspectRatio: config.aspectRatio,
    duration: config.duration,
  };
};

/**
 * Submit + poll a video render to completion (the single-shot path used by the wizard's
 * RENDER ALL queue). Composes submitVideo (transport) with pollUntilDone, and keeps the
 * Phase 4d IndexedDB resume behavior so a tab-close mid-poll can be resumed on next mount.
 */
export const generateVideo = async (
  config: { model: VideoModelType; prompt: string; duration: number; resolution: string; aspectRatio: string; audioEnabled: boolean; startFrame?: string; endFrame?: string },
  opts: GenerateVideoOpts = {}
): Promise<GeneratedVideoResult> => {
  const handle = await submitVideo(config, opts);
  const initialOperation = handle.operation;

  const renderMetadata: VideoRenderMetadata = {
    prompt: handle.prompt,
    sceneIdx: handle.sceneIdx,
    model: handle.model,
    aspectRatio: handle.aspectRatio,
    duration: handle.duration,
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
// Framings the model reliably renders. Rotated via `variationIndex % AVATAR_CAMERA_ANGLES.length`
// so consecutive scenes get different framings. SIDE_PROFILE_TALK and DYNAMIC_SHOULDER were dropped
// because the model silently collapsed them to a frontal portrait when IDENTITY_LOCK was firing.
//
// HIGH_ANGLE_SELFIE dropped 2026-07-25 (Neil-approved) for the SAME collapse behaviour, now with
// live evidence. Its "Subject looks UP at camera" fought the very common product-holding action,
// a conflict first recorded in the 2026-07-05 model eval ("HIGH_ANGLE_SELFIE 'looks UP'
// self-contradicts looking-down scene actions") and never acted on. In the 2026-07-25 flag-ON run
// BOTH scenes that landed on this slot (idx 3 and idx 7) rendered as plain medium shots per the
// image gate's own compositionNotes — and both carried the run's only two defects: an avatar
// looking DOWN at the bottle on a speaking scene (banned by FACE_TO_CAMERA, and a lip-sync +
// identity-drift risk once the still becomes a video first frame) and a hallucinated extra hand.
// n=2, so this is a cheap reversible cut, not a proven law — restore it behind an eval if a
// non-conflicting 4th framing is ever wanted (a LOW_ANGLE or OVER_SHOULDER that commands no gaze).
const AVATAR_CAMERA_ANGLES = [
    "INTIMATE_CLOSE_UP: Framing neck up. Face fully toward camera. Focus: Eyes. Steady, locked framing.",
    "MEDIUM_FRONTAL: Chest-up, eye-level frontal angle. Face squarely toward camera. Steady tripod-style framing. 50mm lens feel. Casual conversational vibe.",
    "WIDE_BUST_SHOT: Waist up, near-frontal angle. Face toward camera. Steady framing. Background depth-of-field matches 85mm lens."
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

// Extract the JSON payload from a model reply that may be fenced or wrapped in prose.
//
// ⚠️ MIRRORED in api/_lib/prompts.ts — change both together.
//
// The historical version chose object-vs-array purely by which delimiter appeared
// FIRST. That breaks on googleSearch-GROUNDED replies, which routinely open with a
// citation marker: `Based on search results [1], here is the analysis:\n{...}`. The
// leading `[` selected the array branch, which then sliced from that `[` to the last
// `]` and produced garbage. Reproduced 2026-08-15; it is the root cause of the
// premise-check "empty shell" (1-in-6 on BOTH 3.5-flash and 3.7-flash — never a model
// defect) and it can hard-throw `marketmind`, which parses with no try/catch
// (api/gemini/text.ts:204). See workflows/gemini37_adoption.md Slice 2.
//
// STRICTLY WIDENING, by construction: the historically-preferred branch is still tried
// FIRST and returned unchanged whenever it parses, so every input that works today
// returns the byte-identical string. The other branch is consulted only when the
// preferred one does NOT parse — i.e. only in cases that are broken today.
const cleanJson = (text: string) => {
  if (!text) return "{}";
  const cleaned = text.replace(/```json\s*|```/g, '').trim();

  const sliceBetween = (open: string, close: string): string | null => {
    const start = cleaned.indexOf(open);
    if (start === -1) return null;
    const end = cleaned.lastIndexOf(close);
    if (end === -1 || end < start) return null;
    return cleaned.substring(start, end + 1);
  };
  const parses = (s: string | null): s is string => {
    if (s === null) return false;
    try { JSON.parse(s); return true; } catch { return false; }
  };

  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  // The original branch choice, preserved exactly.
  const arrayFirst = firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace);
  const preferred = arrayFirst ? sliceBetween('[', ']') : sliceBetween('{', '}');
  const fallback = arrayFirst ? sliceBetween('{', '}') : sliceBetween('[', ']');

  if (parses(preferred)) return preferred;
  if (parses(fallback)) return fallback;
  return preferred ?? cleaned;
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
 * Curated SFX bank for the Remotion AI Editor — Phase 1.
 *
 * Paper-only in Phase 1: the EDL references these IDs, but the actual SFX
 * audio files don't ship until Phase 2 when Remotion needs them. Keeping the
 * vocabulary closed prevents the AI brain from inventing IDs the editor
 * can't fulfil downstream.
 */
export const SFX_BANK: readonly SfxBankId[] = [
  'whoosh', 'glitch', 'pop', 'ding', 'riser',
  'drop', 'snap', 'swish', 'boom', 'sparkle',
] as const;

/**
 * Per-request ceiling on attached scene videos in the EDL call.
 *
 * WHY THE CAP EXISTS (root cause, 2026-08-14): we used to pass the R2 object
 * URL straight through as `fileData.fileUri`, but Gemini's contract only
 * accepts URIs minted by its own Files API. It tolerated arbitrary HTTPS URLs
 * until 2026-07-31 and stopped some time before 2026-08-13. Isolated live
 * against production: the SAME model, endpoint and second returns 200 with
 * zero video parts and 429 RESOURCE_EXHAUSTED with exactly ONE — so it was
 * never request size, never scene count, never project quota (every quota row
 * read 0% on a paid tier 3 account). The cap shipped at 0 for one day, which
 * kept the pipeline alive but blind: every scene rode in as videoAttached:no.
 *
 * SHIPPED DESIGN: each eligible scene video is uploaded to the Files API
 * through api/gemini/files/upload.ts (one clip per request, fanned out in
 * parallel from the videoParts block below) and the returned `files/*` URI is
 * what goes on the wire. Files API retention is 48h, so the upload happens
 * fresh at EDL time — URIs are never persisted, or a run parked past 48h would
 * resume with a dead one.
 *
 * WHY 10 (Neil, 2026-08-14). This shipped at 8 for a few hours on a reason that
 * was WRONG: the comment claimed 8 was a payload-size knob. It is not. A
 * `fileData.fileUri` is a POINTER — Gemini fetches the object itself — so the
 * request body does not grow with the video count at all. (The base64
 * `inlineData` audio overlays are what grow; those are uncapped and separate.)
 * The real ceiling is how much VIDEO the model will process per call, and we
 * have never measured it. With no measurement behind it, 8 bought nothing and
 * cost something concrete: a 10-scene ad is our normal shape, and 8 left scenes
 * 8 and 9 permanently and silently blind on every single one. If the mechanism
 * is broken it is broken at ONE video, so a lower cap was never protection.
 *
 * 10 covers a normal run end to end. Raise it further only against a real run,
 * not a guess — and note the 429 was NEVER about count (capping to 8 still
 * 429'd while 9 had worked twice, which is what falsified that theory).
 *
 * Scenes past the cap — and any scene whose upload fails — still ride in the
 * prompt as videoAttached:no, the branch the tuned prompt already has, with its
 * own timing rule (scriptLine.length / 18, clamped 3-8s). So the EDL always
 * returns one entry per scene and the render keeps all its sources.
 *
 * NOT fixed by this: R2 presign expiry. We still fetch from R2 at upload time,
 * so an expired presign now fails at our own 502 instead of inside Gemini.
 */
const EDL_MAX_ATTACHED_VIDEOS = 10;

/**
 * Picks which sceneBatch entries are ELIGIBLE to have their video attached to
 * the EDL request. Returns sceneBatch INDEXES (not sceneIdx values), so both
 * the prompt's per-scene `videoAttached` line and the fileData parts can be
 * derived from one index space. Eligibility is not attachment: a selected
 * scene whose Files API upload fails is dropped from BOTH by the fan-out in
 * generateEditDecisionList, which owns the no-drift invariant.
 *
 * Deterministic by design — same input ⇒ same set — because the degrade retry
 * re-issues with the SAME media parts. At or under the cap every rendered scene
 * is attached (unchanged behavior); over it, the FIRST and LAST rendered scenes
 * always survive (hook + close) and the remaining slots go to the earliest
 * rendered scenes in order. Transport concern, not creative.
 *
 * The cap is an upper bound the result NEVER exceeds, including at 0 and 1.
 * The hook/close pair is seeded only when there is room for it, otherwise a
 * cap of 0 would still return two videos and a cap of 1 would return two.
 */
export const selectEdlVideoAttachIndexes = (
  sceneBatch: readonly { renderedUrl?: string }[],
  cap: number = EDL_MAX_ATTACHED_VIDEOS,
): Set<number> => {
  if (cap <= 0) return new Set();
  const eligible: number[] = [];
  sceneBatch.forEach((s, i) => { if (s.renderedUrl) eligible.push(i); });
  if (eligible.length <= cap) return new Set(eligible);
  const picked = new Set<number>([eligible[0]]);
  if (cap > 1) picked.add(eligible[eligible.length - 1]);
  for (const i of eligible) {
    if (picked.size >= cap) break;
    picked.add(i);
  }
  return picked;
};

/**
 * Remotion AI Editor brain — Phase 1 half (b).
 *
 * Multimodal call into `researchTextModel` that produces a machine-actionable
 * Edit Decision List from a Scene Pipeline batch (rendered MP4s + STS/TTS
 * audio overlays + final script). Output is consumed verbatim by Phase 2's
 * Remotion Lambda executor.
 *
 * The prompt body is TUNED — approved by Neil on 2026-05-23 after
 * `grifon-cmo` review (style-aware: MrBeast / Temu / Testimonial), see
 * the plan file `resume-the-grifon-command-polymorphic-kurzweil.md` for the
 * canonical reference. Do not edit the prompt content without explicit
 * Neil sign-off (services/CLAUDE.md hard rules + agent_lessons.md
 * 2026-05-09).
 *
 * Input attachment contract (parts array order is load-bearing):
 *   [0] text prompt
 *   [1..N]   per-scene video fileData parts (mimeType video/mp4, fileUri = a
 *            Gemini Files API `files/*` URI minted at call time), in
 *            input.sceneBatch order — the prompt's "Scene 1 of N" numbering
 *            matches this order. Capped at EDL_MAX_ATTACHED_VIDEOS; scenes
 *            past the cap — and scenes whose upload failed — are still listed
 *            in the prompt, as videoAttached:no.
 *   [N+1..]  per-scene audio overlay fileData parts (mimeType audio/mpeg),
 *            in input.audioOverlays order
 */
export const generateEditDecisionList = async (input: EditDecisionInput): Promise<EditDecisionList> => {
  // Which scenes are ELIGIBLE for attachment (sceneBatch INDEXES, not sceneIdx).
  // Computed ONCE from `input` — never from `eff` — so the degrade retry below
  // attaches exactly the same media as attempt 1.
  const eligibleIdx = selectEdlVideoAttachIndexes(input.sceneBatch);

  // Which scenes ACTUALLY got a files/* URI. Filled by the upload fan-out in the
  // media-parts block below, which runs BEFORE any prompt is built (buildPromptText
  // reads this set lazily, and callEdl is only reached after the fan-out settles).
  //
  // 🔴 INVARIANT: this is the ONE source of truth for both the per-scene
  // `videoAttached` line and the fileData parts. Eligibility alone must never
  // reach the prompt — an upload that rejected has to read `videoAttached: no` and
  // contribute no part, or the model is told to watch a video that isn't there.
  const attachedIdx = new Set<number>();

  // The prompt build is parameterized so the degrade lane (below) can re-issue the
  // SAME tuned skeleton with the script-text values swapped for neutral stubs. `eff`
  // is the effective input for THIS attempt: attempt 1 passes `input` verbatim; the
  // stubbed retry passes a shallow clone whose finalScript / scriptLine fields are
  // replaced. The template text stays byte-identical (TUNED) — the only change is
  // the interpolation identifier: input.* → eff.*.
  const buildPromptText = (eff: EditDecisionInput): string => {
  const sceneLines = eff.sceneBatch.map((s, i) => {
    const hasAudio = eff.audioOverlays.some((a) => a.sceneIdx === s.sceneIdx);
    const transitionHint = eff.storyboard?.[i]?.transitionEffect
      ? `\n  storyboardTransitionSignal: ${eff.storyboard[i].transitionEffect}`
      : '';
    return `
- Scene ${i + 1} of ${eff.sceneBatch.length}
  sceneIdx: ${s.sceneIdx}
  type: ${s.type}                   // talking | b-roll | cinematic
  scriptLine: "${s.scriptLine}"
  videoAttached: ${attachedIdx.has(i) ? 'yes (see fileData part)' : 'no'}
  audioOverlayAttached: ${hasAudio ? 'yes (separate fileData part)' : 'no'}${transitionHint}`;
  }).join('');

  const brandLine = eff.brandContext
    ? `**Brand:** ${eff.brandContext.brandName} — voice tone: ${eff.brandContext.voiceTone}`
    : '';

  return `
### ROLE

You are a Filipino direct-response video editor. You build ads that convert
for Filipino SMB owners selling to Filipino and Filipino-diaspora consumers,
plus global e-com operators. Your toolbox: the MrBeast Formula (3-second
hook, dynamic camera, curiosity loops, fast cuts, payoff CTA), Sabri Suby's
$100M Copywriting System (4th-grade reading, "why care / why now,"
consumption-precedes-conversion), and Cialdini's 7 Principles (Scarcity,
Urgency, Authority, Social Proof, Reciprocity, Commitment, Liking — applied
ONLY when the script gives you real anchors, NEVER invented). You produce a
machine-actionable Edit Decision List (EDL) — NOT a prose plan — that the
Remotion executor will consume verbatim downstream.

### YOUR TASK

Inspect the provided scene videos and audio overlays in their input order.
Each numbered scene below maps to one entry in the input sceneBatch.

Output exactly ONE JSON object matching the EditDecisionList schema declared
in the responseSchema config. No prose, no markdown, no code fences, no
commentary outside the JSON.

### INPUT CONTEXT

**Final ad script (full, in order):**
${eff.finalScript}

**Target platform:** ${eff.targetPlatform}    // tiktok | reels | shorts | youtube
**Aspect ratio:** ${eff.aspectRatio}          // 9:16 | 16:9 | 1:1
${brandLine}

**Scenes (in playback order):**
${sceneLines}

Each scene's video file is attached as a separate part (mimeType video/mp4).
Each scene's audio overlay (when present) is attached as a separate part
(mimeType audio/mpeg).

### FORMULA & RULES

---

**0a. SCRIPT STYLE DETECTION (do this FIRST)**

Detect which of the three Grifon ad styles the finalScript follows. The
style drives downstream rule choices. Record the detected style in
meta.scriptStyleDetected.

- **MRBEAST** — curiosity-led hook, transformation arc, mixed talking +
  b-roll, high energy throughout. Indicators: hook line poses a question or
  contrarian claim ("Wait for it", "Tignan mo 'to", "You won't believe"),
  scene types mix talking + b-roll roughly 40/60, script ends with a bold
  CTA + curiosity payoff.
- **TEMU** — scarcity/urgency-led, product-reveal heavy, b-roll dominant,
  SFX-stacked. Indicators: hook uses urgency or stock language ("Mauubos
  na!", "Last day!", "Grabe sa mura!"), most scenes are b-roll (product
  shots, variants, before/after), CTA is hard-sell with real-stock or
  real-deadline anchor.
- **TESTIMONIAL** — first-person speaker, sincerity over energy, talking-
  head dominant, Authority + Social Proof anchored. Indicators: hook
  follows "Ako si [name]" / "Dati ako..." / "Hi, I'm..." pattern, majority
  (>70%) of scenes are talking type, script is one continuous personal
  story, CTA is invitation ("Itry mo rin", "You can do it too").

If the signals conflict, pick the style that matches the FIRST scene's
script line and scene type. Output the detected style verbatim in
meta.scriptStyleDetected as one of: "mrbeast" | "temu" | "testimonial".

---

**0b. LANGUAGE MATCH (Cialdini: Liking)**

- Detect the language of the input finalScript: English, Taglish (mixed
  Filipino + English), or Filipino.
- ALL overlayText.text values MUST be in the same language as the script.
  Taglish script → Taglish overlays. English script → English overlays.
  Filipino script → Filipino overlays.
- Hook overlay examples by language:
  - English: "WAIT FOR IT", "YOU WON'T BELIEVE", "GAME CHANGER", "LAST 50"
  - Taglish: "TIGNAN MO 'TO", "GRABE 'TO", "PARA 'TO SA'YO", "MAUUBOS NA"
  - Filipino: "PANOORIN MO", "HULING ARAW NA"
- Punchline CTA examples by language:
  - English: "GET YOURS NOW", "TAP TO TRY", "ORDER TODAY", "DON'T MISS OUT"
  - Taglish: "ORDER NA!", "GRAB MO NA", "ITRY MO NA", "MAG-MESSAGE NA"
  - Filipino: "BILHIN MO NA", "ITRY MO NA"
- If the script's language is ambiguous (single brand name only, no full
  sentences), default to the brandContext.voiceTone signal. If still
  ambiguous, default to English.

---

**1. Scene 1 — The Hook (3-second curiosity window)**

- transitionIn: OMIT (no transition into the opening shot).
- cameraEffect: "zoom-in" OR "zoom-out" — NEVER "none" on the hook EXCEPT
  in TESTIMONIAL style (see below).
- overlayText: exactly one entry, style="hook", position="center", text ≤ 5
  words, high-energy ALL-CAPS or sentence-case, language matches the
  script (Rule 0b).
- sfxCues: one cue anchored at 0 — see style-specific defaults below.

Style-specific hook rules:

- **MRBEAST style hook:** Curiosity lever DEFAULT. Hook overlay opens an
  unanswered question or contrarian claim. SFX default: "whoosh" or
  "riser". Camera: "zoom-in" preferred for product reveals.
- **TEMU style hook:** Scarcity/Urgency lever DEFAULT — but ONLY if the
  script gave a real anchor (real stock count, real deadline). Examples:
  "LAST 50 LEFT", "MAUUBOS NA", "TODAY ONLY". If no real anchor, fall back
  to Curiosity. SFX default: "drop" or "boom". Camera: "zoom-in" with
  punchy entry.
- **TESTIMONIAL style hook:** Authority + Social Proof lever DEFAULT.
  Hook overlay leads with the speaker's identity or transformation
  ("AKO SI [NAME]", "5 YEARS AGO...", "DATI BLEMISH NOW SMOOTH"). Camera
  effect: "none" (preserve sincerity) or gentle "pan". SFX optional —
  testimonials lose credibility with heavy SFX; if used, "ding" only.

If the script gives you no real anchor for Social Proof / Authority /
Scarcity, default to Curiosity regardless of style. Do NOT invent numbers,
credentials, or deadlines — that is a hard fail.

notes for hook scene: name the Cialdini lever used and the script evidence
that justified it.

---

**2. Talking-head scenes (type="talking")**

- The source audio is lipsync-preserving (STS or TTS overlay) — DO NOT
  cover the user's face with full-screen overlays.
- cameraEffect: "none" (preferred — preserves facial read) or "pan"
  (subtle). NEVER "shake", "zoom-out", or "zoom-in" mid-talk.
- transitionIn.type: "cut", durationSec: 0 — protects lipsync continuity.
- sfxCues: OMIT unless beat-aligned with a script emphasis.

Style-specific overlay rules for talking scenes:

- **MRBEAST style:** overlay OMIT, OR one small style="callout"
  positioned "top" highlighting the key word from the line.
- **TEMU style:** overlay OMIT (Temu ads rarely have talking scenes; if
  present, keep them clean).
- **TESTIMONIAL style:** overlay MANDATORY — one style="subtitle",
  position="bottom", containing the script line VERBATIM (or trimmed to
  fit ≤ 40 characters per scene). Subtitles are non-negotiable in
  testimonials because they add Authority (caption credibility), Liking
  (accessibility for sound-off viewers), and Social Proof (the
  testimonial is itself proof). If the line is longer than 40 chars, use
  multiple overlayText entries with sequential startSec/endSec covering
  the scene.

---

**3. B-roll scenes (type="b-roll")**

- Free to use energetic transitions: "whip", "flash", "particles".
- cameraEffect: "pan", "zoom-in", "zoom-out", or "shake".
- overlayText: one entry, style="callout", position="top", text ≤ 24
  characters, 4th-grade reading level, language matches the script.

Prefer callouts that carry a Cialdini lever sourced from the script:
Social Proof ("5K MOMS LOVE IT"), Authority ("DERMA-TESTED"), or Scarcity
("LIMITED RUN"). Pure descriptive callouts ("NEW FORMULA") are fine if no
lever is available — but NEVER invent levers the script doesn't support.

Style-specific B-roll rules:

- **MRBEAST style:** moderate SFX — one "pop", "snap", or "swish" per
  cut. Mix transitions across the scene order.
- **TEMU style:** heavy SFX — stack "pop" + "ding" + "drop" liberally
  across the b-roll arc. Use "whip" or "flash" transitions for every
  product reveal. Callouts can be aggressive: "P50% OFF!" only if real,
  otherwise "BAGO!", "VIRAL!", "TOPSELLER!" (Social Proof anchored).
- **TESTIMONIAL style:** B-roll is rare. If present, keep callouts
  Authority-anchored ("BEFORE", "AFTER", "DAY 30") with "ding" SFX only,
  "pan" or "zoom-in" camera, "cut" transition. Energy stays sincere, not
  punchy.

---

**4. Cinematic scenes (type="cinematic")**

- Dramatic transitions: "flash" or "particles".
- cameraEffect: "zoom-in" or "shake" for impact.
- overlayText: optional, style="callout" only.
- sfxCues: "boom", "drop", or "riser" anchored at the dramatic beat.

Cinematic scenes are style-agnostic — they serve product hero moments
across all three styles. Keep them sparse: one per ad maximum.

---

**5. Final scene — The Close (last in order)**

- overlayText: exactly one entry, style="punchline", position="bottom",
  text ≤ 4 words, language matches the script.
- The punchline is the CTA + an optional Cialdini Scarcity/Urgency lever
  IF AND ONLY IF the script gave a real one.
- sfxCues: one "ding" or "boom" for emphasis, anchored ≤ 0.3s into the
  scene.
- cameraEffect: "zoom-in" or "none".

Style-specific close rules:

- **MRBEAST style:** punchline is a bold CTA with curiosity payoff.
  Examples (by language):
  - English: "GET YOURS NOW", "TAP TO TRY", "LINK BELOW"
  - Taglish: "ORDER NA!", "GRAB MO NA", "TAP MO 'TO"
  SFX: "ding".
- **TEMU style:** punchline is a HARD CTA with urgency anchor — only if
  real. Examples:
  - English: "LAST 50 LEFT", "BEFORE 11PM", "ORDER NOW"
  - Taglish: "MAUUBOS NA!", "ORDER AGAD", "DALI NA"
  SFX: "boom".
- **TESTIMONIAL style:** punchline is an INVITATION, not a hard sell.
  The speaker invites the viewer to follow their result.
  - English: "TRY IT TOO", "YOU CAN TOO", "MESSAGE ME"
  - Taglish: "ITRY MO RIN", "KAYA MO 'TO", "MAG-MESSAGE KA"
  SFX: "ding" only, low intensity. Camera: "none" or gentle "zoom-in" on
  the speaker's face for emotional close.

notes for close scene: name the Cialdini lever used (or "Curiosity payoff
only — no real scarcity in script").

---

**6. Global pacing**

- Each scene's keepSegments describes a single segment from 0 to the
  natural script-line duration (~scriptLine.length / 18 seconds, clamped
  between 3 and 8 seconds). If the attached video is clearly longer than
  the script needs, trim with keepSegments. If it matches, use the full
  duration.
- voiceOffsetSec: 0 unless the audio overlay clearly leads or trails the
  video — almost always 0.

Style-specific pacing nudge:

- **MRBEAST style:** scenes can be 3–6s (fast cuts).
- **TEMU style:** scenes can be 2.5–5s (faster, snappier).
- **TESTIMONIAL style:** scenes can be 4–8s (slower, lets the speaker
  breathe).

---

**7. Writing (Sabri Suby + Cialdini)**

- ALL overlay text at 4th–5th grade reading level. No jargon. Short.
  Answer the silent viewer question: "Why care? Why believe? Why now?"
- Hook overlays open curiosity loops or land a Cialdini lever (Social
  Proof, Authority, Scarcity) sourced from the script.
- Punchline overlays drive action and may carry a real urgency anchor.
- Consumption precedes conversion: if a viewer can't read the overlay in
  the time it's on screen, rewrite it shorter.
- Liking principle: language match is non-negotiable (Rule 0b).
- HARD GUARDRAIL: never invent stats, credentials, time limits, or
  testimonials. If the script doesn't supply it, you don't get to use it.

---

### CLOSED VOCABULARIES — DO NOT INVENT VALUES

The Remotion executor will throw on any string outside these lists. If a
directive in this prompt cannot be honored within these vocabularies, pick
the nearest valid value. Never emit anything else.

- SfxBankId:        whoosh | glitch | pop | ding | riser | drop | snap | swish | boom | sparkle
- TransitionType:   cut | flash | whip | zoom | particles
- CameraEffect:     zoom-in | zoom-out | pan | shake | none
- OverlayStyle:     hook | callout | subtitle | punchline
- OverlayPosition:  top | center | bottom
- EditTargetPlatform: tiktok | reels | shorts | youtube
- formulaApplied:   subset of ["mrbeast", "sabri-suby", "cialdini"]
- scriptStyleDetected: "mrbeast" | "temu" | "testimonial"

### ABSOLUTE CONSTRAINTS

- Emit ONE scene entry per input.sceneBatch entry, in the SAME order, with
  identical sceneIdx values.
- sourceVideoUrl, sourceAudioUrl must echo the input values exactly — do
  not re-derive, do not alter.
- meta.aspectRatio and meta.targetPlatform must equal the input's
  aspectRatio and targetPlatform exactly.
- meta.scriptStyleDetected MUST be set per Rule 0a.
- meta.totalDurationSec = sum of all keepSegments durations + all
  transitionIn.durationSec values across scenes.
- meta.hookStrategy: one short sentence (max 120 chars) naming the hook
  edit choice and why (e.g. "Cold-open on the product reveal to force a
  curiosity gap in the first second.").
- meta.formulaApplied: the formulas actually applied in this edit, as an
  array drawn ONLY from: "mrbeast", "sabri-suby", "cialdini".
- No fields outside the EditDecisionList schema.
- formulaCheck.rulesApplied lists rules from THIS prompt that you honored
  (e.g. "Hook in first 3s with dynamic camera", "4th-grade overlays",
  "Language match: Taglish", "Style: testimonial — subtitles mandatory").
- formulaCheck.weaknessesFlagged calls out input limitations that
  constrained the edit (e.g. "Scene 3 video looks underexposed", "Hook
  script line too long for 3-second window", "No real scarcity anchor in
  script — fell back to curiosity on close") — empty array if none.
- globalSfxPicks: up to 5 distinct SfxBankId values used in the EDL, in
  order of prominence.
- notes for each scene MUST name the Cialdini lever applied (if any) and
  the script evidence that justified it. Format: "Lever: Social Proof.
  Anchor: '5,000 sold' from script line 4." If no lever was applied,
  write "Lever: none — curiosity loop only."
- Output strict JSON — no prose, markdown, comments, or code fences.
`;
  };

  // Media parts are identical across attempts — build them ONCE. The degrade retry
  // (below) reuses the same video fileData + audio inlineData arrays; re-fetching
  // the blob: audio URLs would be pure waste (they live in browser memory only).
  //
  // Every attached scene needs a Gemini-MINTED files/* URI — the R2 object URL is
  // not a URI Gemini accepts (see EDL_MAX_ATTACHED_VIDEOS). Fan the uploads out in
  // parallel, one clip per request, so each gets its own 60s function budget;
  // serial uploads inside this 60s-pinned EDL call are impossible, not just tight.
  //
  // allSettled, never all: a clip that fails to upload degrades THAT scene to
  // today's exact behavior (videoAttached:no) and never fails the edit. Partial
  // eyes beat no eyes, so there is no all-or-nothing gate here.
  //
  // Ascending sceneBatch order is load-bearing (the parts-order contract above):
  // selectEdlVideoAttachIndexes seeds first+last before filling, so its Set
  // iterates out of order — sort before fanning out.
  const eligible = [...eligibleIdx].sort((a, b) => a - b);
  const uploads = await Promise.allSettled(
    eligible.map((i) => proxyUploadFile(input.sceneBatch[i].renderedUrl as string)),
  );
  const videoParts: any[] = [];
  uploads.forEach((result, n) => {
    const i = eligible[n];
    if (result.status === 'fulfilled') {
      // Both sides of the invariant, written together — the only place either moves.
      attachedIdx.add(i);
      videoParts.push({ fileData: { fileUri: result.value, mimeType: 'video/mp4' } });
    } else {
      console.warn(
        `[edl] scene index ${i} video upload failed — that scene goes in as videoAttached:no:`,
        result.reason?.message ?? result.reason,
      );
    }
  });
  // ElevenLabs TTS returns blob: URLs (browser memory only); Gemini's File API
  // rejects those. Fetch the blob, base64-encode, push as inlineData. Transport
  // concern, not creative — fair game per services/CLAUDE.md.
  const audioParts: any[] = [];
  for (const audio of input.audioOverlays) {
    if (!audio.audioUrl) continue;
    const blob = await fetch(audio.audioUrl).then((r) => r.blob());
    const buf = await blob.arrayBuffer();
    const b64 = btoa(String.fromCharCode(...new Uint8Array(buf)));
    audioParts.push({ inlineData: { mimeType: 'audio/mpeg', data: b64 } });
  }

  // One attempt = build the prompt text for `eff`, prepend it to the shared media
  // parts (text first, then videos, then audios — the load-bearing order), and call
  // the model with the identical model + config every time.
  const callEdl = (eff: EditDecisionInput) => retryWithBackoff(() => proxyGenerateContent({
    model: researchTextModel,
    contents: { parts: [{ text: buildPromptText(eff) }, ...videoParts, ...audioParts] },
    config: {
      responseMimeType: 'application/json',
      safetySettings: SAFETY_SETTINGS,
      thinkingConfig: { thinkingLevel: 'medium' },
    } as any,
  }));

  // Evidence for the next live run: how many scenes had a video, how many the cap
  // selected, and how many survived the upload fan-out. selected > attached means
  // uploads failed (see the per-scene warn above), not that the cap bit.
  console.info(
    '[edl] video attachments —',
    'eligible:', input.sceneBatch.filter((s) => s.renderedUrl).length,
    'selected:', eligible.length,
    'attached:', videoParts.length,
    'cap:', EDL_MAX_ATTACHED_VIDEOS,
  );

  let response: GenerateContentResponse = await callEdl(input);

  // Empty-response guard: an empty/whitespace-only model reply is a TRANSPORT
  // failure (block, MAX_TOKENS, etc.), not a malformed draft. The old
  // `response.text || '{}'` fallback silently coerced it to '{}' and then
  // misdiagnosed it as EDL_MALFORMED (2026-07-23 canary: 4/4 live runs returned
  // zero output tokens — inputTokens === totalTokens, outputTokens null — and
  // the mask hid the real cause). Surface promptFeedback/finishReason so the
  // next live retry has billing-grade evidence. Transport concern, not creative.
  //
  // Script-stub degrade lane (2026-07-24 F2 bisect): Gemini deterministically
  // blocks EDL requests whose prompt text carries a first-person testimonial ad
  // script (blockReason PROHIBITED_CONTENT, zero output tokens) under its
  // fabricated-testimonial policy. The bisect proved the block fires on the
  // script-as-ad TEXT, not the attached media. Validated-live fix: on a block,
  // re-issue the SAME tuned skeleton ONCE with the script fields replaced by
  // neutral stubs — the model then reads the spoken lines from the attached voice
  // audio and returns a correct EDL. A non-block empty (MAX_TOKENS etc.) is NOT
  // retried — no spend on a failure the stub cannot fix.
  if (!response.text || !response.text.trim()) {
    const blockReason = (response as any).promptFeedback?.blockReason;
    const wasBlocked = !!blockReason && blockReason !== 'none';
    if (wasBlocked) {
      console.warn(
        `[edl] prompt blocked (${blockReason}) — retrying with script-stubbed prompt (degrade lane, 2026-07-24 F2)`,
      );
      const stubLines = input.sceneBatch.map((_, i) => `(see attached scene ${i + 1} audio for the spoken line)`);
      const stubbed: EditDecisionInput = {
        ...input,
        finalScript: stubLines.join(' '),
        sceneBatch: input.sceneBatch.map((s, i) => ({ ...s, scriptLine: stubLines[i] })),
      };
      response = await callEdl(stubbed);
    }
    // Re-evaluate after the (possible) degrade retry. Still empty ⇒ surface the
    // block-grade diagnostics with THIS response's reasons. When the degrade lane
    // ran and still came back empty, tag the thrown message so live triage knows
    // the stub path was already exhausted.
    if (!response.text || !response.text.trim()) {
      const finishReason = response.candidates?.[0]?.finishReason;
      const finalBlockReason = (response as any).promptFeedback?.blockReason;
      console.warn(
        '[edl] empty model response',
        'finishReason:', finishReason ?? 'none',
        'blockReason:', finalBlockReason ?? 'none',
        'promptFeedback:', JSON.stringify((response as any).promptFeedback ?? null),
      );
      throw new Error(
        `EDL_EMPTY_RESPONSE: model returned no text (finishReason: ${finishReason ?? 'none'}, blockReason: ${finalBlockReason ?? 'none'}) — retry the edit.${wasBlocked ? ' (degraded retry also blocked)' : ''}`,
      );
    }
  }

  const raw = response.text;
  const parsed = JSON.parse(cleanJson(raw)) as EditDecisionList;

  // Shape guarantee: this call has responseMimeType json but NO responseSchema,
  // so the model occasionally drifts shape (2026-06-10 live smoke: a draft with
  // no scenes array crashed the Edit module; a draft with overlayText as a single
  // OBJECT + sfxCues missing anchorSec got zod-rejected by /api/render/final as
  // FINAL_RENDER_START_FAILED 400). Throwing here surfaces the module's normal
  // error state instead of a component crash. Transport concern, not creative.
  // EDL_MALFORMED now means ONLY "parsed JSON has the wrong shape" — an empty
  // model response is thrown separately above as EDL_EMPTY_RESPONSE, carrying
  // promptFeedback/finishReason (2026-07-23 canary: 4/4 zero-output-token
  // responses were masked by the old `|| '{}'` fallback).
  if (!Array.isArray(parsed.scenes) || parsed.scenes.length === 0) {
    throw new Error('EDL_MALFORMED: model returned no scenes array — re-draft the EDL.');
  }

  // Defensive passthrough: the model occasionally substitutes long Supabase
  // signed URLs with shortened placeholders ("scene_0.mp4"). Overwrite the
  // input-echoing fields verbatim so Remotion always receives the real
  // sources. Transport concern, not creative — fair game per services/CLAUDE.md.
  const audioBySceneIdx = new Map(input.audioOverlays.map((a) => [a.sceneIdx, a.audioUrl]));
  if (parsed.scenes.length === input.sceneBatch.length) {
    parsed.scenes = parsed.scenes.map((scene, i) => ({
      ...scene,
      sceneIdx: input.sceneBatch[i].sceneIdx,
      sourceVideoUrl: input.sceneBatch[i].renderedUrl ?? '',
      sourceAudioUrl: audioBySceneIdx.get(input.sceneBatch[i].sceneIdx) ?? '',
    }));
  }

  // Closed SFX vocabulary — mirrors the legacy SfxBankId zod enum in
  // api/render/final.ts. A hallucinated sfxId (cue OR globalSfxPick) would 400
  // the whole FINAL_RENDER at zod, so normalize + drop anything outside the bank.
  const SFX_BANK_IDS = ['whoosh', 'glitch', 'pop', 'ding', 'riser', 'drop', 'snap', 'swish', 'boom', 'sparkle'];

  // Mechanical coercion to the render contract (api/render/final.ts zod schema):
  // overlayText single-object → 1-element array, text clamped to the 120-char cap,
  // sfx cues without a numeric anchorSec (or an out-of-bank sfxId) dropped
  // (decorative — never fail a render over them), keepSegments always an array.
  parsed.scenes = parsed.scenes.map((scene: any) => ({
    ...scene,
    // zod's .optional() accepts a missing key but rejects null — a "transitionIn":
    // null (observed 3.6 emission variance, 2026-07-22) would 400 the FINAL_RENDER.
    // undefined serializes away in the request body.
    transitionIn: scene.transitionIn ?? undefined,
    keepSegments: Array.isArray(scene.keepSegments) ? scene.keepSegments : [],
    overlayText: scene.overlayText == null
      ? undefined
      : (Array.isArray(scene.overlayText) ? scene.overlayText : [scene.overlayText])
          .filter((o: any) => o && typeof o.text === 'string')
          .map((o: any) => ({ ...o, text: o.text.slice(0, 120) })),
    sfxCues: Array.isArray(scene.sfxCues)
      ? scene.sfxCues
          .map((c: any) => (c && typeof c.sfxId === 'string' ? { ...c, sfxId: c.sfxId.toLowerCase().trim() } : c))
          .filter((c: any) => c && typeof c.anchorSec === 'number' && SFX_BANK_IDS.includes(c.sfxId))
      : undefined,
  }));

  parsed.meta = {
    ...(parsed.meta ?? ({} as EditDecisionList['meta'])),
    aspectRatio: input.aspectRatio,
    targetPlatform: input.targetPlatform,
  };
  // hookStrategy / formulaApplied are the new meta fields (2026-07-22). The model
  // sometimes emits formulaApplied at the top level instead of under meta (3.6
  // slot drift), so lift it in when meta lacks it, then filter to the closed
  // formula vocabulary. hookStrategy is coerced to a trimmed, length-capped string.
  const FORMULA_SET = ['mrbeast', 'sabri-suby', 'cialdini'];
  if (!Array.isArray(parsed.meta.formulaApplied) && Array.isArray((parsed as any).formulaApplied)) {
    parsed.meta.formulaApplied = (parsed as any).formulaApplied;
  }
  parsed.meta.formulaApplied = Array.isArray(parsed.meta.formulaApplied)
    ? parsed.meta.formulaApplied
        .map((f: any) => (typeof f === 'string' ? f.toLowerCase().trim() : f))
        .filter((f: any) => FORMULA_SET.includes(f))
    : [];
  parsed.meta.hookStrategy = typeof parsed.meta.hookStrategy === 'string'
    ? parsed.meta.hookStrategy.trim().slice(0, 160)
    : '';
  // Remaining top-level fields the UI reads unconditionally — same drift class
  // (a draft without formulaCheck crashed the module on .rulesApplied,
  // 2026-06-10 retest). Default every one of them.
  parsed.formulaCheck = {
    rulesApplied: Array.isArray(parsed.formulaCheck?.rulesApplied) ? parsed.formulaCheck.rulesApplied : [],
    weaknessesFlagged: Array.isArray(parsed.formulaCheck?.weaknessesFlagged) ? parsed.formulaCheck.weaknessesFlagged : [],
  };
  parsed.globalSfxPicks = Array.isArray(parsed.globalSfxPicks)
    ? parsed.globalSfxPicks
        .map((s: any) => (typeof s === 'string' ? s.toLowerCase().trim() : s))
        .filter((s: any) => SFX_BANK_IDS.includes(s))
    : [];
  return parsed;
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

// ---------------------------------------------------------------------------
// Premise Check (assumption gate) — NON-crown-jewel, client-side prompt.
// Runs BEFORE generateMarketResearch to pressure-test the founder's premise
// (who the customer really is + why they buy) with googleSearch-grounded
// alternatives. Rides the GENERIC /api/gemini/text legacy passthrough, NOT the
// marketmind flow — so it never touches any tuned/crown-jewel prompt. Advisory
// only: the confirmed premise is appended to productDescription by the caller.
// googleSearch grounding is incompatible with responseMimeType:json, so (like
// the marketmind handler) we instruct JSON in the prompt and parse via cleanJson.
// ---------------------------------------------------------------------------
const buildPremiseCheckPrompt = (input: PremiseCheckInput): string => `
You are a skeptical senior direct-response strategist running a 30-second "premise check"
for a Filipino SMB before they pay for deep market research. Your job is NOT to agree with
them — it is to catch a WRONG assumption about who the customer really is and why they buy.

PRODUCT / SERVICE: ${input.productName}
DESCRIPTION (the founder's own words): ${input.productDescription}
PRICE / CURRENT OFFER: ${input.priceOffer || 'not stated'}
${input.brandName ? `BRAND: ${input.brandName}` : ''}
${input.isLocalService ? `LOCAL SERVICE based in: ${input.businessAddress || 'location not stated'}` : ''}

Use web search to ground yourself in how THIS kind of product/niche actually sells in the
Philippines (real buyer complaints, the words customers use, competitor angles). Do not invent.

Return ONLY a JSON object — no markdown, no commentary — in EXACTLY this shape:
{
  "impliedPremise": "1-2 sentences: the customer + the buying reason the founder's description seems to ASSUME",
  "alternatives": [
    {
      "targetRead": "a DIFFERENT plausible 'who it is really for'",
      "coreReason": "the real reason THAT person buys or hesitates (often emotional, not price)",
      "rationale": "why this is plausible, grounded in real niche signal"
    }
  ],
  "questions": ["1-2 short laddering questions that force the founder to test their premise"]
}

Rules:
- Provide 2 or 3 alternatives, each genuinely different from the implied premise and from each other.
- At least one alternative MUST challenge the assumption that price / cheapness is the driver.
- Keep every field tight (max ~30 words). Natural Taglish is fine where it fits the niche.
- Output JSON only.
`;

export const parsePremiseCheckResponse = (raw: string): PremiseCheckResult => {
  let parsed: any = {};
  try { parsed = JSON.parse(cleanJson(raw)); } catch { parsed = {}; }
  const alternatives: PremiseAlternative[] = Array.isArray(parsed?.alternatives)
    ? parsed.alternatives
        .slice(0, 3)
        .map((a: any) => ({
          targetRead: typeof a?.targetRead === 'string' ? a.targetRead : '',
          coreReason: typeof a?.coreReason === 'string' ? a.coreReason : '',
          rationale: typeof a?.rationale === 'string' ? a.rationale : '',
        }))
        .filter((a: PremiseAlternative) => a.targetRead || a.coreReason)
    : [];
  const questions: string[] = Array.isArray(parsed?.questions)
    ? parsed.questions.filter((q: any) => typeof q === 'string' && q.trim()).slice(0, 2)
    : [];
  return {
    impliedPremise: typeof parsed?.impliedPremise === 'string' ? parsed.impliedPremise : '',
    alternatives,
    questions,
  };
};

export const generatePremiseCheck = async (input: PremiseCheckInput): Promise<PremiseCheckResult> => {
  // The gate is advisory — the caller falls through to research on any failure, so
  // it must fail fast rather than pin the loading overlay under rate-limiting. Tight
  // retry budget: 1 retry, 2s base delay, 0 timeout retries (vs the render defaults).
  const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
    model: premiseCheckModel,
    contents: { parts: [{ text: buildPremiseCheckPrompt(input) }] },
    config: {
      tools: [{ googleSearch: {} }],
      safetySettings: SAFETY_SETTINGS,
    },
  }), 1, 2000, 0);
  return parsePremiseCheckResponse(response.text || '{}');
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
    chosenAngleBrief: string = '',
    contrarianTruth: string = ''
): Promise<Script> => {
  await delay(1000);
  return retryWithBackoff(() => proxyCall<Script>('/api/gemini/text', {
    flow: 'adscript',
    input: { businessInfo, brandName, language, offer, chosenAngleBrief, contrarianTruth },
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
        text: `Analyze this image. It could be a product, a service location (like a salon/spa), or a specific service action.
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
    brandColors: string[],
    scriptType?: string
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

  // RealEstate (#13): the generated avatar is the AGENT on camera. Dress them as a trustworthy
  // Filipino broker — the ID lanyard is the PH legitimacy cue. NOT a Western suit (intimidating),
  // NOT pambahay (reads as uninvolved homeowner). Uploaded avatars keep their real outfit (identity
  // lock), so this only shapes the GENERATED fallback.
  const wardrobeInstruction = scriptType === 'RealEstate'
    ? `\n    **WARDROBE (real-estate agent):** Dress the subject as an approachable, trustworthy Filipino real-estate agent — a clean, neat polo or smart blouse with a simple ID LANYARD around the neck (the legitimacy cue). NOT a formal Western business suit or blazer, and NOT casual house clothes / pambahay. Smart-casual, professional, friendly.`
    : '';

  const prompt = `
    **Subject:** Photorealistic close-up headshot of ${subjectDescription}.
    **Target Audience Context:** "${audience}".
    ${brandColorInstruction}
    ${wardrobeInstruction}

    **SMART CASTING DIRECTOR LOGIC:**
    - **Age Anchor:** Use the provided age range of ${ageRange} as the primary anchor for bone structure and skin elasticity. DO NOT allow skin conditions (like Melasma, Acne, or Pigmentation) to force the subject into looking older than the requested range.
    - **Professional Retouch Layer:** Maintain firm skin, clear eye-whites, and a vibrant presence appropriate for ${ageRange}.
    - **Brand Promise Made Visual (CRITICAL):** The avatar models the IDEAL post-purchase customer — what the brand promises to deliver, NOT the customer's current pain. For skincare: render clear, healthy, even-toned skin. For weight-loss: render the goal physique. For hair-care: render healthy hair. The script's wound language carries the pain; the avatar carries the promise. Ignore aversive-state descriptors in the target-audience context (e.g., "oily", "acne-prone", "pimply", "uneven", "dull", "overweight", "thinning") — those describe the customer's CURRENT problem, not the rendered subject.
    - **Lighting Protocol:** Always use 'Commercial Beauty Lighting' (diffused, soft, high-key) to ensure the subject look relatable and premium for a marketing agency client.

    **Visuals:**
    - Background: Blurred natural environment. ${localizationInstruction}
    - Style: High-end UGC, shot on iPhone 15 Pro, 35mm lens.
    - Vibe: Friendly, authentic, approachable, "Girl/Guy next door".
    ${REALISM_INSTRUCTION}

    **NEGATIVE CONSTRAINTS (FORBIDDEN):** 
    - NO exaggerated wrinkles, NO heavy sagging, NO grey hair (unless age is 55+).
    - NO dull or 'leathery' skin textures.
    - Avoid making the subject look like a 'grandparent' unless the age range is 60+.
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

// Renamed 2026-08-10 from `generateInfluencerAvatar`. // domain-lint-ok: names the
// old identifier on purpose, so a future session can grep the rename.
// UBIQUITOUS_LANGUAGE.md:239 is explicit — never use the wizard's person-word inside
// Influencer Forge code — and the old name fused two modules' concepts in one
// identifier. NOT `...Persona`, which is what `check:domain` suggests: the glossary
// lists that word as an avoid-term for Influencer too, so the swap would trade one
// violation for another. Prompt content below is untouched; this is a rename, not a
// tuning change.
export const generateInfluencer = async (config: InfluencerConfig): Promise<{ url: string; description: string }> => {
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
${AVATAR_CAMERA_ANGLES.map((a, i) => `  ${i + 1}. ${a}`).join('\n')}
  
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
    referenceImageMode: 'avatar' | 'product' | 'both' | 'none' | 'venue' | 'avatar_venue' = 'none'
): Promise<string> => {
    
    await delay(2500);

    const sanitizedPrompt = prompt.length > 400 ? prompt.substring(0, 400) : prompt;
    // sceneImageModel (gemini-3.1-flash-lite-image) is 1K-only — clamp a '2K' request down to '1K'.
    const imageConfig: any = { aspectRatio, imageSize: imageQuality === '2K' ? '1K' : imageQuality };
    
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
    // `&& references.avatarUrl` added 2026-07-25 (Neil-approved). This was the ONE branch of the
    // five below with no guard on its own reference, and the asymmetry was load-bearing: with the
    // avatar missing (input.avatar.url does not survive a checkpoint — see producer_runs.avatar_url)
    // this branch still ran, but no avatar part had been pushed, so "Reference Image 1" silently
    // resolved to the PRODUCT photo. IDENTITY_LOCK then tried to preserve a bottle's face and hair
    // — no person rendered — and rule 6's "This frame has no product reference photo … leave the
    // surface empty" was obeyed faithfully, producing a BLANK label. Guarded, it falls through to
    // STRICT_NEGATIVE, which is at least honest about having no human reference. Prompt text
    // itself is unchanged.
    if (referenceImageMode === 'avatar' && references.avatarUrl) {
        consistencyRules = `
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
    } else if (referenceImageMode === 'product' && references.productUrl) {
        consistencyRules = `
        **PRODUCT_IDENTITY_LOCK:**
        1. **IDENTITY:** Reproduce the product from Reference Image 1 EXACTLY — same packaging shape, same colors, same label position, same proportions, same materials/finish (matte vs glossy). Do NOT redesign, restyle, or substitute the product with a similar-looking product.
        2. **VISUAL_GROUND_TRUTH_PRIORITY (overrides text metadata):** Reference Image 1 is the VISUAL GROUND TRUTH for the product. Do NOT infer visual properties (color, jar shape, label design, finish, fill level, packaging material) from the product NAME or DESCRIPTION text fields below. If text says "Ube-Calamansi Marmalade" but Reference Image 1 shows a red/strawberry-jam jar with a pink label, render the RED/strawberry jar exactly as photographed — do NOT render a purple ube jar. Text metadata controls ONLY: wordmark text language, product category confirmation, and the words appearing on the label. IMAGE wins every visual tie.
        3. **NO_LOGO_HALLUCINATION:** PRESERVE the uploaded product label EXACTLY — every wordmark, illustration, color block, and panel that appears in Reference Image 1 must match in this scene. Do not invent NEW labels, do not blank or simplify the existing label, do not substitute a generic kraft or plain surface. Naturalistic composition (partial hand occlusion, angled view, partial visibility from camera framing) is acceptable as long as the VISIBLE portions of the label match the reference photo content.
        4. **ANATOMICAL_LOCK:** Render ONLY the number of hands the action needs — one hand pouring/holding the product = exactly ONE hand; a two-handed action = exactly TWO. Five fingers each. NEVER add an extra, third, phantom, or duplicate hand to "complete a pair", and never a disembodied hand entering frame. Anatomy matches the action, not a fixed count.
        5. **NO HUMAN FACES / NO INVENTED PEOPLE (reference override):** Do NOT render faces, full bodies, or recognizable people. If Reference Image 1 shows a hand, arm, or person holding or presenting the product, treat that human as NON-CANONICAL: ignore and exclude them — reproduce ONLY the product object and its setting, and NEVER extrapolate, complete, or invent a face/body/model from the partial person in the reference photo. A hand may appear ONLY if THIS scene's prompt explicitly calls for one (per rule 4); otherwise the frame contains NO human at all.
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
        9. **ANATOMICAL_LOCK:** Render ONLY the number of hands the action needs — one hand holding the product = exactly ONE hand; a two-handed action = exactly TWO. Five fingers each. NEVER add an extra, third, phantom, or duplicate hand to "complete a pair", and never a disembodied hand entering frame. Anatomy matches the action, not a fixed count.

        **LIGHTING (DUAL_LUMEN_SYNC):**
        - Scene lighting prioritizes the avatar's environment (Reference Image 1) — the scene IS in the avatar's home, so use that warm/natural light profile for the overall image.
        - Product label colors are preserved as PRINTED on Reference Image 2 — do not relight the label with studio lighting; let it sit naturally in the avatar's environmental light.
        `;
    } else if (referenceImageMode === 'venue' && references.productUrl) {
        consistencyRules = `
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
    } else if (referenceImageMode === 'avatar_venue' && references.avatarUrl && references.productUrl) {
        // RealEstate avatar-in-property: the AGENT (Ref 1) stands INSIDE the user's REAL room (Ref 2).
        // Combines avatar IDENTITY_LOCK with the venue PLACE_IDENTITY_LOCK + CAMERA_FREEDOM.
        consistencyRules = `
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
    } else {
        consistencyRules = `
        **STRICT_NEGATIVE (VISUAL AIDS):**
        1. **NO HUMANS:** NO faces, NO skin, NO hands, NO fingers. NO anatomical parts.
        2. **LUMEN_SYNC:** Match the Kelvin temperature of the hair highlights from Reference Image 1 to the rim-lights and highlights of this scene. Use the same color profile.
        3. **SUBJECT:** Focus purely on the object or environment described in the prompt.
        `;
    }

    // 1. RE-INSERT THE CAMERA LOGIC
    // AVATAR_CAMERA_ANGLES describe a HUMAN subject ("face fully toward camera", "focus: eyes").
    // Only inject them when a human belongs in frame (avatar/both). In product/none modes the
    // mandatory face demand contradicts the NO-HUMAN rules and pulls the person from the hero
    // reference photo into frame (2026-06-10 validation render: hook end-frame person leak —
    // the 627ccb2 rule-5 text fix alone couldn't beat a MUST-render-a-face instruction).
    const humanSubjectInFrame = referenceImageMode === 'avatar' || referenceImageMode === 'both' || referenceImageMode === 'avatar_venue';
    const randomAngle = AVATAR_CAMERA_ANGLES[variationIndex % AVATAR_CAMERA_ANGLES.length];
    const cameraMandatory = humanSubjectInFrame ? `
    **CAMERA_MANDATORY (overrides IDENTITY_LOCK's default-frontal preference):**
    You MUST render this exact framing: ${randomAngle}.
    - The DISTANCE (close-up vs medium vs wide) and ELEVATION (eye-level vs above-eye selfie) are MANDATORY — do NOT collapse to a standard chest-up frontal medium shot.
    - If the Scene Prompt describes an action (gesturing, pointing, holding, looking down at a phone), execute that action AT this framing — do NOT shift the camera to a default flattering portrait angle to accommodate the action.
    ` : "";

    // 2. WARDROBE: locked from Reference Image 1 by IDENTITY_LOCK rule 1.
    // WARDROBE_LOGIC variation removed — was conflicting with identity preservation across scenes.
    const wardrobeInstruction = "";

    // 3. KEEP YOUR NEW PRODUCT CONTEXT
    // Only when this frame carries a product reference photo. In avatar/none frames the
    // name+description text is hallucination bait — with no photo to copy, the model
    // decorates the scene with an invented lookalike package (2026-06-10 validation
    // render: fake orange carton on the Scene-2 desk). Product scenes are tagged
    // 'product'/'both' by the narrative generator and carry the hero photo.
    const carriesProductRef = referenceImageMode === 'product' || referenceImageMode === 'both';
    const productContext = (carriesProductRef && (productName || productDescription))
      ? `\n**PRODUCT_IDENTITY_CORE:**\n- NAME: ${productName || 'N/A'}\n- DESCRIPTION: ${productDescription || 'N/A'}`
      : "";

    const realismProtocol = scriptType === 'Cinematic' ? REALISM_INSTRUCTION_CINEMATIC : REALISM_INSTRUCTION_UGC;
    const brandColorInstruction = brandColors.length > 0 ? `\n**BRAND COLORS:** Incorporate these colors subtly: ${brandColors.join(', ')}` : '';

    // Services / RealEstate scenes can place a Filipino CUSTOMER / staff / agent in non-avatar b-roll
    // (e.g. the problem-hook, an agent at the facade). The non-avatar render modes inject NO ethnicity
    // → the model defaulted to a foreign/Western person (Naya smoke 2026-06-21). Scoped to Services +
    // RealEstate so the product / MrBeast / Testimonial / Temu / Cinematic paths stay byte-identical.
    const serviceCastLock = (scriptType === 'Services' || scriptType === 'RealEstate')
      ? `\n**FILIPINO_CAST_LOCK:** This is a Philippine business. Any human who appears — customer, staff, agent, bystander, or even just hands — MUST be Filipino${ethnicity && !ethnicity.startsWith('Global') ? ` (${ethnicity})` : ''} (authentically Filipino face, build, and styling). NEVER render a foreign / Western / non-Filipino person.`
      : "";

    // 4. COMBINE EVERYTHING INTO THE FINAL PROMPT
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
        model: thumbnailModel,
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
    
    const storyboardText = storyboard.map((s, i) => {
        const typeTag = !!s.startFramePrompt ? "TYPE: HOOK/VISUAL-EFFECT" : "TYPE: STANDARD";
        const transitionLine = s.transitionEffect ? `\nTransitionEffect: ${s.transitionEffect}` : '';
        return `Scene ${i + 1} [${typeTag}]:\nScript: "${s.scriptLine.replace(/[–—]/g, ', ')}"\nDescription: ${s.sceneDescription}\nFocus: ${s.referenceImage}\nPrompt: ${s.imagePrompt || s.startFramePrompt}${transitionLine}`;
    }).join('\n\n');

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

        **VFX TRANSITION PROTOCOL (KLING 3.0):**
        - Keep prompts punchy and physics-based. 
        - Use commands like: "Macro texture morphs into ${productName}", "Kinetic landing", "Aggressive speed-ramp".
        - No flowery adjectives like "Ethereal", "Coalescing", "Celestial".
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
         - SCENE 2+: Decide by lens engagement + script delivery context.
            - **MOUTH-OBSTRUCTION OVERRIDE (decide this FIRST):** If the description shows the avatar's
              mouth covered or occupied by the product or an action — drinking, sipping, mid-sip, taking a
              sip, eating, biting, applying product to lips/mouth/face, or a bottle/cup/hand at the mouth —
              classify "b-roll" REGARDLESS of lens engagement or script line. Lip-sync would morph the face
              through the obstruction; the voice-over carries the line.
            - **"talking"** when BOTH: (a) description shows the avatar ORIENTED TO THE LENS ("looking at camera", "smiling at camera", "facing the camera", "looking into the lens", "to camera") AND (b) the script line is a direct verbal delivery — a CTA ("click below", "tap below", "visit", "message us", "DM us"), a testimonial line ("I tried...", "Ako si...", "Iba ang..."), or a direct first-person claim the avatar naturally speaks to camera.
            - **"b-roll"** when either signal is missing, OR when the description shows: thoughtful expression / touching cheek / hands near mouth / mirror reflection without lens contact / looking off-camera / pure product shot without avatar. Voice-over carries the script; the avatar's mouth need not be in sync.

      ${additionalInstructions}

      **GENERATION RULES BY TYPE:**

      **OPTION A-HOOK: IF TYPE IS "b-roll" AND THIS IS SCENE 1 (THE HOOK):**
         - **IDENTITY RULE:** Refer to the product only as "${productName}".
         - **OPEN WITH THE ANCHOR TRANSFORMATION (MANDATORY):** Name the shared anchor explicitly — its color AND silhouette (e.g., "the brown dome of coffee grounds"). Open the prose with that anchor's transformation in physics-first language; the transformation is the verb and it is DECISIVE: the start texture holds its form, then rapidly compresses/crystallizes into the fully-formed product. Use fast decisive verbs ("compresses into", "crystallizes into", "snaps into"). NEVER a slow continuous blend, and NEVER describe any intermediate amorphous state (no blob, mass, shapeless or half-formed stage). Example: "The brown dome of wet coffee grounds compresses and crystallizes into the amber glass bottle of [product]." NOT "Slow dolly-out reveals [start]."
         - **USE THE STORYBOARD'S TRANSITION EFFECT:** When TransitionEffect is provided, the prompt MUST describe a transformation consistent with it. Kling Omni interpolates a gradual anchor-bridged transformation between Start Frame and End Frame — that is the only motion it delivers — so translate every effect into that form. For Character Morph: in-flight texture/material transformation across the anchor element. For Object Materialization: anchor element resolves from amorphous into the target subject. For Explosion Reveal: kinetic dispersion of the start subject flying outward, revealing the end subject clean. For Teleport / Snap Cut and Invisible Effect: render a fast, clean anchor morph — Omni cannot produce an instant cut or a hidden masked cut, so do NOT write "instant", "snap", "hard cut", "teleport", "seamless", or "hidden cut" language. For Chaos Burst: render an Explosion-Reveal-style kinetic dispersion — do NOT write "chaotic" or "mayhem" language Omni cannot resolve into a clean end frame. Translate the TransitionEffect label into anchor-bridge prose; do not invent a different transition.
         - **PUNCHY PHYSICS-BASED LANGUAGE:** "Macro texture of [A] compresses into [B]", "Kinetic compression of [A] into [B]", "Aggressive speed-ramp outward as [X] snaps into [Y]". Avoid flowery adjectives ("Ethereal", "Coalescing", "Celestial").
         - **NEGATIVE PHRASE (HOOK-SCOPED):** Append as comma-separated tail — "Avoid low quality, blurry, distorted, glitching, extra limbs, text, watermark, writing, letters, subtitles." (morphing/melting/deformation are intentionally OMITTED because Scene 1 IS the morph.)
         - **CAMERA MOTION (required, subtle, serves the morph):** A camera move runs through the FULL clip duration — pick one: "slow dolly-out following the transformation", "gentle push-in toward the anchor". STATIC SHOTS ARE FORBIDDEN.
         - **OUTPUT FORMAT:** Single cohesive cinematic paragraph. Open with anchor transformation, weave in the camera motion, end with the negative phrase. NO bracketed labels.

      **OPTION A-REGULAR: IF TYPE IS "b-roll" AND THIS IS NOT SCENE 1 (Scene 2+ visuals):**
         - **IDENTITY RULE:** Refer to the product only as "${productName}".
         - **CAMERA PHYSICS (minimal, smooth — open the prose with this):**
           - "slow dolly-out with a gentle upward tilt" | "slow macro push-in" | "smooth, slow lateral tracking pan"
         - **MOTION CONTINUITY:** The chosen GENTLE camera move runs smoothly through the clip. No handheld shake, jitter, counter-roll, parallactic/background-reveal shifts, or rack/pull focus. Keep the background stable. Err toward calm, smooth motion over dynamic.
         - **REGULAR B-ROLL DIRECTIVE:** Focus on the product's action.
         - **NEGATIVE PHRASE:** Append at the end as a comma-separated tail — "Avoid low quality, blurry, distorted, deformation, morphing, melting, glitching, extra limbs, text, watermark, writing, letters, subtitles, cross-dissolve, double-exposure, ghosting, fade-out. The final second holds the shot clean and fully opaque to the last frame."
         - **OUTPUT FORMAT:** A single cohesive cinematic paragraph. NO bracketed labels, NO [Model:] tag, NO VISUAL:/CAMERA:/AUDIO:/NEGATIVE: headers — those are stale routing markers from a manual copy-paste workflow. Open with the visual action, weave in the camera physics, end with the audio direction and the negative phrase as natural prose.

      **OPTION B: IF TYPE IS "talking" (Use for Avatar Scenes 2+):**
         - **MODEL:** Veo 3.1
         - **FRAME 0 RULE (CRITICAL):** The avatar is ALREADY mid-syllable when the clip opens — mouth in motion, first word of the dialogue actively forming, eyes already engaged with the lens. NO establishing pose, NO pre-speech beat, NO "settling in," NO "initially resting." The first frame IS the action. The clip ends on the next breath, not on a resolve-state pause.
         - **Start with Direct Dialogue:** Lead with the script line in quotes.
         - **IDENTITY RULE:** If character mentions product, they say "${productName}".
         - **Performance & Micro-expressions:** Describe facial tension, eye movement, and mouth shapes — all already in motion at frame 0.
         - **Cinematic Grammar (minimal, smooth motion):** Open the prose with the camera physics directive. Use specific lenses (35mm, 85mm) and pick ONE GENTLE camera move per scene: a slow dolly-in or a subtle push-in toward the subject. Do NOT use parallactic/background-reveal shifts, handheld movement, camera shake, jitter, lens breathing, or rack/pull focus — they read as blur or a changing background and break the clean talking-head look. Keep the background stable. CAMERA MOVE BEGINS WITH THE FIRST SYLLABLE — never before — so the slow move happens DURING dialogue. Keep it subtle and smooth on all durations; avoid fully frozen frames, but err toward calm over dynamic.
         - **Audio Landscape:** Define the sync-sound environment (SFX: distant room tone, Ambient: low electrical hum).
         - **First & Last Frame Logic:** Starting frame = avatar mid-syllable forming the opening word, mouth shape unambiguous. Last frame = next syllable or natural breath, NOT a post-speech resolve-state with a closed mouth and neutral expression.
         - **END-CLEAN RULE:** The clip's final second holds the live shot clean and fully opaque — no cross-dissolve, no double-exposure, no ghosting, no fade-out, no transition-anticipation effect of any kind (the cut is handled downstream by the editor). Append to the prose tail: "Avoid cross-dissolve, double-exposure, ghosting, or fade in the final second."
         - **OUTPUT FORMAT:** A single, cohesive cinematic paragraph starting with the dialogue in quotes. Seamlessly blend performance details, camera physics, lighting atmosphere, and frame logic into a natural narrative flow. DO NOT use bracketed headers or labels like [Subject Performance] or [Camera Motion/Lens].

      **OPTION C: IF TYPE IS "cinematic" (Use for Cinematic Spec Studio Relay):**
         - **MODEL:** Kling 3.0 (Frames Mode)
         - **IDENTITY LOCK (CRITICAL):** The product is a "${productName}". Never call it a "vehicle" or "device".
         - **PROMPT STRUCTURE:** A cohesive technical paragraph for the Kling 3.0 model. Seamlessly describe the bridge command between frames (e.g., macro texture morphing), the technical upload map requirements for anchor frames, and the camera movement. DO NOT use headers like INSTRUCTIONS:, PROMPT:, or CAMERA:.
         
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
- NO symbols like dashes or colons in the text content.
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
    const productPrompt = `
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
Brand Palette (reference only): ${data.hexCodes}

TEMPLATES TO CHOOSE FROM:
1. "Press Clip" (Looks like a news snippet)
2. "Benefit Anatomy" (Labels pointing to product features)
3. "Split-Screen" (Before/After or Problem/Solution)

CRITICAL VISUAL RULES:
- If a device (phone/laptop) is shown, the SCREEN MUST FACE THE VIEWER directly.
- The "imagePrompt" must describe the brand palette in PLAIN WORDS (e.g. "deep forest green and warm white"), NEVER as hex codes. Do NOT put any "#" hex value, price, or literal text into the imagePrompt — the image model renders text unreliably (NO_TEXT_CONSTRAINT); on-image copy is composited separately.

JSON STRUCTURE:
{
  "id": number,
  "templateType": "Press Clip" | "Benefit Anatomy" | "Split-Screen",
  "headline": "Short punchy headline",
  "imagePrompt": "Detailed technical prompt for image gen. Include wardrobe, lighting, ${data.ethnicityProfile} characters, ${data.aspectRatio} layout, and the brand palette described in plain words (no hex codes, no embedded text).",
  "caption": "Primary ad copy text in ${data.language}",
  "hookLogic": "Brief explanation of the psychological trigger used"
}
    `;

    // GP-2 "Niche Callout" family (text-composited; see workflows/static_ad_swipe_file.md).
    // Self-identification pattern-interrupt — the niche + qualifier carry the ad.
    const calloutPrompt = `
### Role: Direct Response Strategist — Niche Callout Ads
Task: Generate 3 "Niche Callout" image-ad variants for "${data.brandIdentityName}". Each ad self-selects ONE hyper-specific buyer and offers a value-first asset.

INTELLIGENCE:
Brand: ${data.brandIdentityName}
Audience: ${data.targetDemographic} (${data.ageRange})
Main Benefit: ${data.primaryBenefit}
Market Pain Point: ${data.marketPainPoint}
Unique Value Proposition: ${data.uvp}
Products / Services offered: ${data.inventoryList}
Language: ${data.language}

PATTERN (Sabri Suby dream-buyer callout):
"If you run a [NICHE] [QUALIFIER?], we built [VALUE-FIRST OFFER] for you."
- niche = ONE specific, named buyer segment — VARY it across the 3 variants.
- qualifier = a REAL proof-of-fit (size / revenue / situation) ONLY IF grounded in the Audience above. If none is known, OMIT it entirely ("If you run a [niche], we built …"). NEVER invent a number.
- leadMagnet = a REAL value-first offer grounded in the Benefit / Products / UVP (a free guide, audit, sample, trial, or the core offer reframed as the reason to act). NEVER name a freebie that may not exist; when unsure, use the real core offer/benefit.

TRUST GUARDRAIL: no fake scarcity, no invented stats, no fake testimonials. Every qualifier must be plausibly real for ${data.brandIdentityName}.

Return a JSON array of 3 objects:
{
  "id": number,
  "templateType": "Niche Callout",
  "headline": "the full callout sentence",
  "caption": "Primary ad copy text in ${data.language}",
  "hookLogic": "the psychological trigger (specificity / self-identification)",
  "imagePrompt": "",
  "composition": { "niche": "...", "qualifier": "...", "leadMagnet": "..." }
}
    `;

    // GP-1 "SaaS Offer / Upsell" family (text-composited over a dark premium lane;
    // see workflows/static_ad_swipe_file.md). Warm-retarget upgrade creatives.
    const saasPrompt = `
### Role: Direct Response Strategist — SaaS Upsell Ads
Task: Generate 3 warm-retarget upsell ad variants for "${data.brandIdentityName}" — ONE of each template below. The viewer already knows the brand (free / engaged user); drive the upgrade. Outcome-framed, NEVER feature-listed.

INTELLIGENCE:
Brand: ${data.brandIdentityName}
Audience: ${data.targetDemographic} (${data.ageRange})
Main Benefit: ${data.primaryBenefit}
Pain Point: ${data.marketPainPoint}
UVP: ${data.uvp}
Key Inclusions: ${data.keyFeatures}
Offer Price: ${data.offerPrice} (was ${data.originalPrice})
Language: ${data.language}

TRUST GUARDRAIL: no fake scarcity, no fake testimonials, no invented numbers. A guarantee must be a real, honored policy. No "unlimited" promises.

HEADLINE RULE: EVERY object MUST have a non-empty "headline" — it is the largest line on the ad. Never leave it blank; never return only a brand name.

Return a JSON array of EXACTLY 3 objects, ONE per templateType:

1) "Guarantee Hero" — a risk-reversal headline (the dream outcome fused to a real guarantee).
   headline: "<the risk-reversal hero line — REQUIRED, e.g. 'First ad live in 24h or your month is free.'>"
   composition: { "guarantee": "<the real reversal, restated briefly>", "ctaLabel": "<2-4 word CTA>", "badge": "<short offer/guarantee badge>" }

2) "Ticket Compare" — anchor the current (free/lower) tier against the target tier.
   headline: "<short directive — REQUIRED, e.g. CHOOSE YOUR LEVEL>"
   composition: { "tiers": [ {"name":"Free","lines":["<2-3 plain limits>"],"highlight":false}, {"name":"<target tier>","lines":["<3-4 outcome lines>"],"highlight":true} ], "ctaLabel": "<CTA>" }

3) "Offer Stack Checklist" — a guarantee headline + a what-you-GET list.
   headline: "<the guarantee line — REQUIRED>"
   composition: { "bullets": ["<outcome 1>","<outcome 2>","<outcome 3>","<outcome 4>"], "guarantee": "<penny-back tag>", "ctaLabel": "<CTA>" }

Every object MUST also include: "id" (number), "templateType" (exact string above), a non-empty "headline" (per the HEADLINE RULE), "caption" (primary ad copy in ${data.language}), "hookLogic" (the persuasion lever), "imagePrompt": "".
    `;

    const prompt = data.family === 'callout' ? calloutPrompt
      : data.family === 'saas-offer' ? saasPrompt
      : productPrompt;

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

// Batch Creative Fan-Out — ONE text call returns `count` distinct headline
// angles. The hero image and the actual creatives are produced elsewhere (one
// AI image + N local Canvas composites), so this is the only AI text cost of a
// whole 100-creative batch.
export const generateBatchHeadlines = async (data: UplinkData, count: number): Promise<BatchHeadline[]> => {
    const n = Math.max(1, Math.min(count, 150));
    const prompt = `
### Role: Direct-Response Copy Machine
Task: Generate ${n} DISTINCT ad-creative text variants for "${data.brandIdentityName}". Each is a different scroll-stopping angle on the SAME product hero image.

TACTICAL INTELLIGENCE:
Brand: ${data.brandIdentityName}
Offer: ${data.originalPrice} -> ${data.offerPrice}
Audience: ${data.targetDemographic} (${data.ageRange}, ${data.ethnicityProfile})
Main Benefit: ${data.primaryBenefit}
Pain Point: ${data.marketPainPoint}
UVP: ${data.uvp}
Key Features: ${data.keyFeatures}

RULES:
- Output language: ${data.language}.
- Each "headline" is ≤6 words, punchy, no period.
- Each "subhead" is ≤10 words — an offer, proof, or benefit.
- Each "badge" is 1-3 words for a corner flag (a feature or hook, e.g. "8-IN-1", "FAST RELIEF").
- Every variant must use a GENUINELY different angle: pain, dream outcome, curiosity, social proof, urgency, contrarian, feature spotlight, price, identity, FOMO. Cycle through them — do not repeat the same idea.
- No two headlines may be near-duplicates.

Return a JSON array of exactly ${n} objects:
{ "headline": string, "subhead": string, "badge": string, "angle": string }
    `;

    const response: GenerateContentResponse = await retryWithBackoff(() => proxyGenerateContent({
        model: textModel,
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            safetySettings: SAFETY_SETTINGS
        }
    }));

    const parsed = JSON.parse(cleanJson(response.text || "[]"));
    return Array.isArray(parsed) ? parsed.slice(0, n) : [];
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
  return themes.map((t: any, i: number) => ({
    ...t,
    id: `theme-${i}`,
    // The tuned prompt asks for a list of colors; VisualTheme.colorPalette is typed
    // string and Step3AdScript.tsx .split(',')s it. Coerce array → CSV to avoid a
    // live TypeError when the model returns an array.
    colorPalette: Array.isArray(t.colorPalette) ? t.colorPalette.join(', ') : String(t.colorPalette ?? ''),
  }));
};

export const generateDaisyChainScenes = async (
  productImages: string[], 
  theme: VisualTheme, 
  aspectRatio: '9:16' | '16:9'
): Promise<Scene[]> => {
  
  // Setup the relay loop
  const gearStyle = "Shot on RED V-RAPTOR, 35mm anamorphic lens, 8k photographic resolution, professional commercial lighting, lens breathing, anamorphic bokeh, Parallactic camera shift.";
  const identityRule = "**IDENTITY LOCK:** Use the reference images to lock the materials and design, but **FREELY ROTATE** the object in 3D space. It must look like the same object filmed from different camera positions (Side -> Front -> Top).";

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