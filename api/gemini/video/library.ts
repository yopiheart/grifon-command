import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUserFromAccessToken, getSupabaseAdmin } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';

const LIBRARY_LIMIT = 30;
const LIBRARY_WINDOW_SECONDS = 60;
const SIGNED_URL_TTL_SECONDS = 86400;
const BUCKET = 'gemini-videos';
// Egress fix (2026-06-13): cap the gallery at 30 (matches the UI list limit).
// Each render now has up to 3 objects in the listing — .mp4 + .meta.json + .jpg
// poster — so request 4x headroom when listing so 30 mp4s always come back.
const MAX_ITEMS = 30;

interface LibraryItem {
  path: string;
  url: string;
  downloadUrl: string;
  posterUrl?: string;
  mimeType: string;
  prompt: string;
  sceneIdx?: number;
  model?: string;
  aspectRatio?: string;
  duration?: number;
  createdAt: string;
  sizeBytes?: number;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  const allowed = await rateLimitCheck(
    `gemini:video-library:${user.id}`,
    LIBRARY_LIMIT,
    LIBRARY_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(LIBRARY_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'video-library',
      retry_after_seconds: LIBRARY_WINDOW_SECONDS,
    });
  }

  const admin = getSupabaseAdmin();

  const listResult = await admin.storage.from(BUCKET).list(user.id, {
    limit: MAX_ITEMS * 4, // headroom: each render has up to .mp4 + .meta.json + .jpg
    sortBy: { column: 'created_at', order: 'desc' },
  });
  if (listResult.error) {
    console.error('[api/gemini/video/library] list failed:', listResult.error.message);
    return res.status(502).json({ error: 'list_failed', detail: listResult.error.message });
  }

  const entries = listResult.data ?? [];
  const videoEntries = entries
    .filter((e) => e.name.endsWith('.mp4'))
    .slice(0, MAX_ITEMS);
  const sidecarNames = new Set(entries.filter((e) => e.name.endsWith('.meta.json')).map((e) => e.name));
  const posterNames = new Set(entries.filter((e) => e.name.endsWith('.jpg')).map((e) => e.name));

  const items = await Promise.all(
    videoEntries.map(async (entry): Promise<LibraryItem | null> => {
      const path = `${user.id}/${entry.name}`;
      const sidecarName = `${entry.name}.meta.json`;
      const sidecarPath = `${user.id}/${sidecarName}`;

      let metadata: {
        prompt?: string;
        sceneIdx?: number;
        model?: string;
        aspectRatio?: string;
        duration?: number;
        createdAt?: string;
        mimeType?: string;
      } = {};

      if (sidecarNames.has(sidecarName)) {
        try {
          const dl = await admin.storage.from(BUCKET).download(sidecarPath);
          if (!dl.error && dl.data) {
            const text = await dl.data.text();
            metadata = JSON.parse(text);
          }
        } catch (err: any) {
          console.warn(
            '[api/gemini/video/library] sidecar read failed (non-fatal):',
            sidecarName,
            err?.message
          );
        }
      }

      const posterName = `${entry.name}.jpg`;
      const hasPoster = posterNames.has(posterName);
      const [playSign, dlSign, posterSign] = await Promise.all([
        admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS),
        admin.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL_SECONDS, {
          download: 'grifon-video.mp4',
        }),
        hasPoster
          ? admin.storage.from(BUCKET).createSignedUrl(`${user.id}/${posterName}`, SIGNED_URL_TTL_SECONDS)
          : Promise.resolve(null),
      ]);

      if (playSign.error || !playSign.data?.signedUrl || dlSign.error || !dlSign.data?.signedUrl) {
        console.warn(
          '[api/gemini/video/library] sign failed (skipping item):',
          playSign.error?.message ?? dlSign.error?.message
        );
        return null;
      }

      const sizeBytes =
        typeof (entry as any).metadata?.size === 'number'
          ? (entry as any).metadata.size
          : undefined;

      return {
        path,
        url: playSign.data.signedUrl,
        downloadUrl: dlSign.data.signedUrl,
        posterUrl: posterSign && !posterSign.error ? posterSign.data?.signedUrl : undefined,
        mimeType: metadata.mimeType ?? 'video/mp4',
        prompt: metadata.prompt ?? '',
        sceneIdx: metadata.sceneIdx,
        model: metadata.model,
        aspectRatio: metadata.aspectRatio,
        duration: metadata.duration,
        createdAt: metadata.createdAt ?? (entry as any).created_at ?? new Date().toISOString(),
        sizeBytes,
      };
    })
  );

  const hydrated = items.filter((i): i is LibraryItem => i !== null);
  return res.status(200).json({ items: hydrated });
}
