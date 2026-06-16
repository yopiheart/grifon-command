import type { FinalRenderStatus } from '../../types.js';
import { putMedia, downloadMediaText } from './mediaStore.js';

// Status tracking for the async final-render job. We use a JSON sidecar object
// in the media store (same idiom as api/gemini/video/poll.ts's .meta.json)
// instead of a new DB table — no migration, and it rides the existing cleanup
// cron's 48h reaping.

export const statusKey = (userId: string, jobId: string) => `${userId}/final/${jobId}.status.json`;
export const finalKey = (userId: string, jobId: string) => `${userId}/final/${jobId}.mp4`;

// Generated music bed — cached per AD, keyed by the render's deterministic seed
// (rotationSeed = hash of sorted scene videoUrls) + style. The same ad re-renders
// reuse this object (no regen, no extra credits), preserving the "same ad renders
// identically" contract. Stored in the same bucket so the cleanup cron reaps it.
export const musicBedKey = (userId: string, seed: string, style: string) =>
  `${userId}/music/${seed}-${style}.mp3`;

export interface RenderSidecar {
  status: FinalRenderStatus;
  url?: string;
  downloadUrl?: string;
  error?: string;
  updatedAt: string;
}

export async function writeSidecar(key: string, body: RenderSidecar): Promise<void> {
  const buf = Buffer.from(JSON.stringify(body), 'utf-8');
  const { error } = await putMedia(key, buf, 'application/json', {
    cacheControl: 'no-store',
    upsert: true,
  });
  if (error) {
    console.error('[renderJob] sidecar write failed:', key, error);
  }
}

export async function readSidecar(key: string): Promise<RenderSidecar | null> {
  const { text, error } = await downloadMediaText(key);
  if (error || !text) return null;
  try {
    return JSON.parse(text) as RenderSidecar;
  } catch {
    return null;
  }
}
