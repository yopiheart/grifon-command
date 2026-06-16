import type { MusicComposeRequest, MusicComposeResponse } from '../types';
import { getSupabase } from './supabaseClient';

// Client wrapper for the generative music-bed pre-step (api/music/compose).
// Called by the AI Editor BEFORE the final render: it returns a bedUrl that gets
// passed into renderFinalVideo's `music.bedUrl`. Deliberately SOFT-FAILS — any
// error (flag off → 503, not-in-plan → 403, rate/quota → 429, upstream → 502)
// resolves to null so the caller renders with the tuned static bed instead. The
// perk degrades, it never blocks the render.

const getAccessToken = async (): Promise<string> => {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');
  return token;
};

/** Compose (or reuse a cached) music bed. Returns null on any failure so the
 * render falls back to the static bed — never throws to the render flow. */
export const composeMusicBed = async (
  req: MusicComposeRequest
): Promise<MusicComposeResponse | null> => {
  try {
    const token = await getAccessToken();
    const res = await fetch('/api/music/compose', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(req),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<MusicComposeResponse>;
    if (typeof data?.bedUrl !== 'string' || !data.bedUrl) return null;
    return { bedUrl: data.bedUrl, cached: data.cached === true };
  } catch {
    return null;
  }
};
