import type { SupabaseClient } from '@supabase/supabase-js';
import type { FinalRenderStatus } from '../../types.js';

// Status tracking for the async final-render job. We use a JSON sidecar object
// in the gemini-videos bucket (same idiom as api/gemini/video/poll.ts's
// .meta.json) instead of a new DB table — no migration, and it rides the
// existing cleanup cron's 48h reaping.

export const RENDER_BUCKET = 'gemini-videos';

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

export async function writeSidecar(
  admin: SupabaseClient,
  key: string,
  body: RenderSidecar
): Promise<void> {
  const buf = Buffer.from(JSON.stringify(body), 'utf-8');
  const { error } = await admin.storage.from(RENDER_BUCKET).upload(key, buf, {
    contentType: 'application/json',
    cacheControl: 'no-store',
    upsert: true,
  });
  if (error) {
    console.error('[renderJob] sidecar write failed:', key, error.message);
  }
}

export async function readSidecar(
  admin: SupabaseClient,
  key: string
): Promise<RenderSidecar | null> {
  const { data, error } = await admin.storage.from(RENDER_BUCKET).download(key);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as RenderSidecar;
  } catch {
    return null;
  }
}
