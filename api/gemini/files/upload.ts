import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GoogleGenAI, FileState } from '@google/genai';
import { getUserFromAccessToken } from '../../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../../_lib/rateLimit.js';
import { assertSafeMediaUrl } from '../../_lib/ssrfGuard.js';

// api/gemini/files/upload.ts — mint a Gemini Files API URI for ONE media URL.
//
// Why this endpoint exists: Gemini's fileData.fileUri contract only accepts URIs
// minted by its own Files API. We were passing the R2 object URL straight through
// and it answered a request carrying even ONE of them with 429 RESOURCE_EXHAUSTED
// (isolated live 2026-08-14 — see workflows/edl_files_api_plan.md), which is why
// the EDL shipped blind. This mints the supported URI.
//
// ONE clip per request, by design: the caller fans out N parallel calls so each
// upload gets its own function budget. The EDL request itself runs through
// api/gemini/text.ts, pinned to 60s — ten serial uploads could never fit there.
//
// Upload mechanics copied from api/gemini/omni-video.ts (download → /tmp →
// files.upload → poll files.get until not PROCESSING → rmSync in finally). The
// ONE number that is deliberately NOT copied is the ACTIVE deadline: see below.

const Body = z.object({ url: z.string().url() });

const FILES_LIMIT = 30;
const FILES_WINDOW_SECONDS = 60;

// NOT omni-video's 5 minutes. This function is pinned to maxDuration 60 in
// vercel.json, so a 5-minute deadline could never fire — the platform would kill
// the function first and the caller would get an opaque timeout instead of our
// JSON error. 45s leaves headroom for the download + the response.
const FILE_ACTIVE_DEADLINE_MS = 45_000;
const POLL_INTERVAL_MS = 2000;

let _ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  if (_ai) return _ai;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_NOT_CONFIGURED: set GEMINI_API_KEY (server-side, no VITE_ prefix).');
  _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // 1. Auth.
  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  // 2. Body.
  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const { url } = parsed.data;

  // 3. Rate limit. The budget has to absorb a whole EDL fan-out at once (a
  //    10-scene run fires 10 in parallel) plus a re-run, or the cap would
  //    silently blind scenes that had nothing wrong with them.
  const rateAllowed = await rateLimitCheck(`gemini:files:${user.id}`, FILES_LIMIT, FILES_WINDOW_SECONDS);
  if (!rateAllowed) {
    res.setHeader('Retry-After', String(FILES_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'files',
      retry_after_seconds: FILES_WINDOW_SECONDS,
    });
  }

  try {
    assertSafeMediaUrl(url);
  } catch (err: any) {
    return res.status(400).json({ error: 'unsafe_url', detail: err?.message ?? 'blocked' });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('[api/gemini/files/upload] GEMINI_API_KEY not set');
    return res.status(502).json({ error: 'gemini_error', detail: 'GEMINI_NOT_CONFIGURED' });
  }

  // 4. Download → /tmp → Files API upload → wait until it leaves PROCESSING.
  let tmpDir: string | null = null;
  try {
    const dl = await fetch(url);
    if (!dl.ok) {
      console.error('[api/gemini/files/upload] source download failed:', dl.status);
      return res.status(502).json({ error: 'files_source_download_failed', status: dl.status });
    }
    const buf = Buffer.from(await dl.arrayBuffer());
    // Trust the source's content-type only when it is a concrete media type. R2
    // hands back binary/octet-stream often enough, and uploading a scene clip
    // under that mime would store a file Gemini can't read while the caller's
    // fileData part still says video/mp4. Default matches omni-video.ts.
    const declared = dl.headers.get('content-type')?.split(';')[0]?.trim().toLowerCase() ?? '';
    const mimeType = /^(video|audio|image)\/.+/.test(declared) ? declared : 'video/mp4';

    tmpDir = mkdtempSync(join(tmpdir(), 'grifon-files-'));
    const clipPath = join(tmpDir, 'media');
    writeFileSync(clipPath, buf);

    const ai = getAi();
    let uploaded = await ai.files.upload({ file: clipPath, config: { mimeType } });
    const deadline = Date.now() + FILE_ACTIVE_DEADLINE_MS;
    while (uploaded.state === FileState.PROCESSING) {
      if (Date.now() > deadline) {
        return res.status(502).json({ error: 'files_upload_timeout' });
      }
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
      uploaded = await ai.files.get({ name: uploaded.name as string });
    }
    if (uploaded.state === FileState.FAILED || !uploaded.uri) {
      return res.status(502).json({ error: 'files_upload_failed' });
    }
    return res.status(200).json({ uri: uploaded.uri, name: uploaded.name });
  } catch (err: any) {
    console.error('[api/gemini/files/upload] upload error:', err?.message);
    return res.status(502).json({ error: 'gemini_error', detail: err?.message ?? 'upload_failed' });
  } finally {
    if (tmpDir) {
      try {
        rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        /* best-effort cleanup */
      }
    }
  }
}
