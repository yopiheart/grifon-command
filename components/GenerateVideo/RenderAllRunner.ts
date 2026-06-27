import type { VideoGenConfig, VideoModelType, VideoPrompt } from '../../types';
import { generateVideo, GeneratedVideoResult } from '../../services/geminiService';

export type SceneStatus = 'ready' | 'queued' | 'rendering' | 'done' | 'failed';

export interface RenderJob {
  sceneIdx: number;
  prompt: string;
  startFrame?: string;
  /** Per-scene end-frame override. Mirrors startFrame routing — without this,
   * RENDER ALL dropped each scene's endFrameImageUrl on the floor, so the
   * b-roll Scene 1 morph from start → end collapsed in queued renders even
   * though single-scene UI honored it. */
  endFrame?: string;
  /** Per-scene duration override. When present, runQueue passes this to
   * generateVideo instead of the queue-level opts.config.duration. Lets
   * RENDER ALL honor each scene's smart-duration math (words/2.5 + 0.3s)
   * instead of locking every clip to a single global value. */
  duration?: number;
  /** Per-scene model override. Session B auto-routes b-roll/cinematic scenes
   * to Kling_3_0 and talking scenes to Veo_3.1_Lite via autoRouteModelForType.
   * Falls back to opts.config.model when absent (single-model batch path). */
  model?: VideoModelType;
}

/**
 * Session B auto-routing: pick the right engine for a scene's type.
 * - hook (scene 0, b-roll) → Kling O1 Omni (Session D — drama-focused morph)
 * - talking                → Veo (handles speaking avatars best, native audio path on Vertex)
 * - b-roll                 → Kling 3.0 (cleaner motion-from-still, native image_tail morph)
 * - cinematic              → Kling 3.0 (best transitions / VFX morphs)
 *
 * Per-scene override (Session C) still wins; this is the default for new jobs.
 * The `fallback` parameter preserves the user's global model picker as the
 * answer when the scene's type isn't one of the known three. `sceneIdx`
 * lets the hook scene (always scene 0 by wizard convention) route to Omni
 * while regular b-roll stays on V3.
 */
export const autoRouteModelForType = (
  type: VideoPrompt['type'],
  fallback: VideoModelType,
  sceneIdx?: number
): VideoModelType => {
  if (sceneIdx === 0 && type === 'b-roll') return 'Kling_O1';
  if (type === 'talking') return 'Veo_3.1_Lite';
  if (type === 'b-roll') return 'Kling_3_0';
  if (type === 'cinematic') return 'Kling_3_0';
  return fallback;
};

export type QueueEvent =
  | { type: 'status'; sceneIdx: number; status: SceneStatus; result?: GeneratedVideoResult; error?: string }
  | { type: 'rate-limited'; retryAfterSec: number }
  | { type: 'resumed' }
  | { type: 'complete' };

export interface RunQueueOpts {
  config: Omit<VideoGenConfig, 'prompt' | 'startFrame' | 'endFrame' | 'elements'>;
  signal: AbortSignal;
  onEvent: (evt: QueueEvent) => void;
  /** Phase 4d — when present, each in-flight render persists to IndexedDB
   * so it can be resumed if the client disconnects mid-poll. */
  userId?: string;
  /** Per-finished-ad metering id (Slice 3) — shared by every scene in this
   * queue so the whole Render All costs ONE video_ad credit, not one-per-scene. */
  finishedAdId?: string;
}

const RATE_LIMIT_WINDOW_SEC = 3600;

const waitFor = (ms: number, signal: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error('ABORTED'));
    };
    if (signal.aborted) {
      clearTimeout(timer);
      reject(new Error('ABORTED'));
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
  });

export async function runQueue(jobs: RenderJob[], opts: RunQueueOpts): Promise<void> {
  for (let i = 0; i < jobs.length; i++) {
    if (opts.signal.aborted) return;
    const job = jobs[i];

    opts.onEvent({ type: 'status', sceneIdx: job.sceneIdx, status: 'rendering' });

    try {
      const result = await generateVideo(
        {
          ...opts.config,
          model: job.model ?? opts.config.model,
          prompt: job.prompt,
          startFrame: job.startFrame,
          endFrame: job.endFrame,
          duration: job.duration ?? opts.config.duration,
        } as VideoGenConfig,
        {
          signal: opts.signal,
          metadata: { sceneIdx: job.sceneIdx },
          userId: opts.userId,
          finishedAdId: opts.finishedAdId,
        }
      );
      opts.onEvent({ type: 'status', sceneIdx: job.sceneIdx, status: 'done', result });
    } catch (e: any) {
      const msg: string = e?.message ?? 'Unknown error';
      if (msg === 'ABORTED') return;

      const isRateLimit =
        msg.includes('rate_limit') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.includes('429') ||
        msg.includes('gemini_quota');

      if (isRateLimit) {
        for (let j = i; j < jobs.length; j++) {
          opts.onEvent({ type: 'status', sceneIdx: jobs[j].sceneIdx, status: 'queued' });
        }
        opts.onEvent({ type: 'rate-limited', retryAfterSec: RATE_LIMIT_WINDOW_SEC });

        try {
          await waitFor(RATE_LIMIT_WINDOW_SEC * 1000, opts.signal);
        } catch {
          return;
        }

        opts.onEvent({ type: 'resumed' });
        i--;
        continue;
      }

      opts.onEvent({ type: 'status', sceneIdx: job.sceneIdx, status: 'failed', error: msg });
    }
  }

  if (!opts.signal.aborted) {
    opts.onEvent({ type: 'complete' });
  }
}

export async function urlToDataUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FRAME_FETCH_FAILED: ${res.status}`);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('FRAME_READ_FAILED'));
    reader.readAsDataURL(blob);
  });
}
