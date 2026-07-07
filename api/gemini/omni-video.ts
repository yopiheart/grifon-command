import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GoogleGenAI, FileState } from '@google/genai';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { peekOmniAllowance } from '../_lib/quota.js';
import { putMedia } from '../_lib/mediaStore.js';
import { looksBlocked } from '../_lib/omniGate.js';
import {
  OMNI_PRESETS,
  isApprovedOmniPresetId,
  fillPromptTemplate,
  OmniMissingSlotsError,
  OMNI_MAX_CLIP_SECONDS,
  OMNI_MAX_CALLS_PER_AD,
  type OmniPreset,
} from '../_lib/omniPresets.js';

// api/gemini/omni-video.ts — FIRE endpoint for the Gemini Omni Flash edit pass
// (Slice 1: server-only, dev-flagged). Copies the api/kling/omni-video.ts proxy
// envelope (auth → rate-limit → budget → plan gate → forward) and replicates
// the Files-API-upload + interactions.create mechanics from tools/omni_edit.py.
//
// Interactions surface: RAW REST (POST /v1beta/interactions). The installed
// @google/genai (1.46) DOES expose client.interactions, but its typed shapes
// (input: Array<Content>, outputs[]) diverge from the proven PoC REST shapes
// (input parts {type:'document'|'text'}, output_video/steps[]) in
// tools/omni_edit.py. We use the SDK only for the well-typed Files API
// (files.upload/files.get) and hit the interactions REST endpoint directly with
// x-goog-api-key, exactly as the PoC probe does.

const GENAI_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const OMNI_MODEL_ID = process.env.OMNI_MODEL_ID || 'gemini-omni-flash-preview';

const OMNI_LIMIT = 8;
const OMNI_WINDOW_SECONDS = 600;
const AD_BUDGET_WINDOW_SECONDS = 86400; // 24h
const FILE_ACTIVE_DEADLINE_MS = 5 * 60 * 1000; // 5 min

const Body = z.object({
  presetId: z.string().min(1),
  slots: z.record(z.string(), z.string()),
  videoUrl: z
    .string()
    .url()
    .refine((u) => u.startsWith('https://'), 'videoUrl must be an https URL'),
  aspectRatio: z.enum(['9:16', '16:9']).optional().default('9:16'),
  estimatedDurationSec: z.number().positive(),
  finishedAdId: z.string().min(1),
  sceneIdx: z.number().int().nonnegative(),
  requestId: z.string().optional(),
});

let _ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  if (_ai) return _ai;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_NOT_CONFIGURED: set GEMINI_API_KEY (server-side, no VITE_ prefix).');
  _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
};

// Safety-filter classification (`looksBlocked`) is shared from omniGate.ts —
// a block is NOT a server error; the client runs the fallback ladder.

// Derive the QA-gate expectations from the filled slots, by preset. The poll
// endpoint reads this sidecar to run api/_lib/omniGate.ts against the output.
//   premium-reel-v2     → emphasis_words (comma-split, letter-perfect)
//   display-text-pop-v1 → display_words (whole phrase)
//   vox-explainer-v1    → title_text (whole phrase)
//   dolly-zoom-v1       → [] (no directed text; label pixels are frozen)
// expectPerson tracks the preset's scene target (talking presets carry a face).
export function deriveGateExpectations(
  preset: OmniPreset,
  slots: Record<string, string>
): { directedWords: string[]; expectPerson: boolean; forbiddenWords: string[] } {
  let directedWords: string[] = [];
  if (preset.id === 'premium-reel-v2') {
    directedWords = (slots.emphasis_words ?? '')
      .split(',')
      .map((w) => w.trim())
      .filter(Boolean);
  } else if (preset.id === 'display-text-pop-v1') {
    const v = (slots.display_words ?? '').trim();
    directedWords = v ? [v] : [];
  } else if (preset.id === 'vox-explainer-v1') {
    const v = (slots.title_text ?? '').trim();
    directedWords = v ? [v] : [];
  }
  // Instruction-only slot values must never render as on-screen text. Live
  // catch (Neil eyeball 2026-07-06, run 2): Omni rendered the literal
  // "#FFCC00" from the color-accent instruction as typography, 3x on one
  // scene. The hex-pattern check in judgeGate is the general net; listing the
  // actual slot values here also catches non-hex phrasings.
  const forbiddenWords = [slots.brand_primary_hex, slots.brand_secondary_hexes]
    .map((v) => (v ?? '').trim())
    .filter(Boolean);
  // Style-brand leak: the template's style descriptor rendered as text. Live
  // catch (Neil eyeball 2026-07-07, Slice-3 smoke): the vox template says
  // "VOX-inspired / VOX-style" as DIRECTION only, but Omni drew the literal
  // Vox masthead above the title — an undirected third-party trademark in a
  // customer ad. Gate matching is case-insensitive substring, so also guard:
  // never forbid a token the user's own directed text legitimately contains
  // (e.g. a brand named "Voxel").
  if (preset.id === 'vox-explainer-v1') forbiddenWords.push('vox');
  const directedLower = directedWords.map((w) => w.toLowerCase());
  const safeForbidden = forbiddenWords.filter(
    (f) => !directedLower.some((d) => d.includes(f.toLowerCase()))
  );
  return { directedWords, expectPerson: preset.target === 'talking', forbiddenWords: safeForbidden };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  // 1. Kill switch — off = picker hides / "temporarily unavailable"; ads still
  //    ship FFmpeg-only. (Premortem mitigation #2: preview-model rug-pull.)
  if (process.env.OMNI_STYLES_ENABLED !== 'true') {
    return res.status(503).json({ error: 'omni_styles_disabled' });
  }

  // 2. Auth.
  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  // 3. Body.
  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }
  const {
    presetId,
    slots,
    videoUrl,
    aspectRatio,
    estimatedDurationSec,
    finishedAdId,
    sceneIdx,
    requestId,
  } = parsed.data;

  // Only the four approved presets are valid (OMNI_PRESETS contains exactly
  // those neil_approved rows — unknown/rejected/draft ids are refused here).
  if (!isApprovedOmniPresetId(presetId)) {
    return res.status(400).json({ error: 'invalid_preset', presetId });
  }
  const preset = OMNI_PRESETS[presetId];

  // 4. Per-clip second cap.
  if (estimatedDurationSec > OMNI_MAX_CLIP_SECONDS) {
    return res.status(400).json({
      error: 'omni_clip_too_long',
      maxSeconds: OMNI_MAX_CLIP_SECONDS,
      estimatedDurationSec,
    });
  }

  // 5. Burst rate-limit (parallel scene fire pool). Dev-unmetered bypass mirrors
  //    the Veo/Kling proxies — NEVER set GRIFON_DEV_UNMETERED_VIDEO on Vercel.
  const devUnmetered = process.env.GRIFON_DEV_UNMETERED_VIDEO === 'true';
  const rateAllowed =
    devUnmetered || (await rateLimitCheck(`gemini:omni:${user.id}`, OMNI_LIMIT, OMNI_WINDOW_SECONDS));
  if (!rateAllowed) {
    res.setHeader('Retry-After', String(OMNI_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'omni',
      retry_after_seconds: OMNI_WINDOW_SECONDS,
    });
  }

  // 6. Hard per-ad call budget (COGS guard). NOT dev-bypassed — this is the cost
  //    wall (scenes × (initial + retry)); regenerations must respect it.
  const budgetOk = await rateLimitCheck(
    `omni:ad:${user.id}:${finishedAdId}`,
    OMNI_MAX_CALLS_PER_AD,
    AD_BUDGET_WINDOW_SECONDS
  );
  if (!budgetOk) {
    return res.status(402).json({
      error: 'omni_budget_exhausted',
      maxCalls: OMNI_MAX_CALLS_PER_AD,
      finishedAdId,
    });
  }

  // 7. Server plan gate — Business tier only (client gate is nav-level; the
  //    proxy is the real wall).
  const plan = await getUserPlan(user.id);
  if (plan !== 'business') {
    return res.status(402).json({ error: 'quota_exceeded', reason: 'business_required', plan });
  }

  // 7b. Omni-ad allowance wall (PEEK only — the charge is deferred to the
  //     completion endpoint api/gemini/omni-video/consume.ts). A zero-allowance
  //     user can't start the paid pass. Re-rolls of an already-charged ad pass
  //     via the marker. Dev-unmetered flags bypass inside peekOmniAllowance.
  const gate = await peekOmniAllowance(user.id, plan, finishedAdId);
  if (!gate.allowed) {
    return res.status(402).json({
      error: 'omni_quota_exceeded',
      reason: 'omni_allowance_exhausted',
      used: gate.used,
      limit: gate.limit,
      credits: gate.credits,
    });
  }

  // 8. Assemble the prompt (throws OmniMissingSlotsError → 400).
  let prompt: string;
  try {
    prompt = fillPromptTemplate(preset, slots);
  } catch (err: any) {
    if (err instanceof OmniMissingSlotsError) {
      return res.status(400).json({ error: 'omni_missing_slots', missingSlots: err.missingSlots });
    }
    return res.status(400).json({ error: 'omni_bad_slots', detail: err?.message ?? 'unknown' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[api/gemini/omni-video] GEMINI_API_KEY not set');
    return res.status(502).json({ error: 'gemini_error', detail: 'GEMINI_NOT_CONFIGURED' });
  }

  console.log('[grifon:omni:submit]', {
    t: Date.now(),
    userId: user.id,
    presetId,
    model: OMNI_MODEL_ID,
    aspect: aspectRatio,
    estSec: estimatedDurationSec,
    sceneIdx,
    finishedAdId,
    requestId,
  });

  // 9. Download the scene clip → /tmp → Files API upload → wait ACTIVE.
  let tmpDir: string | null = null;
  let videoUri: string;
  try {
    const dl = await fetch(videoUrl);
    if (!dl.ok) {
      console.error('[api/gemini/omni-video] scene clip download failed:', dl.status);
      return res.status(502).json({ error: 'omni_source_download_failed', status: dl.status });
    }
    const buf = Buffer.from(await dl.arrayBuffer());

    tmpDir = mkdtempSync(join(tmpdir(), 'grifon-omni-'));
    const clipPath = join(tmpDir, 'scene.mp4');
    writeFileSync(clipPath, buf);

    const ai = getAi();
    let uploaded = await ai.files.upload({ file: clipPath, config: { mimeType: 'video/mp4' } });
    const deadline = Date.now() + FILE_ACTIVE_DEADLINE_MS;
    while (uploaded.state === FileState.PROCESSING) {
      if (Date.now() > deadline) {
        return res.status(502).json({ error: 'omni_upload_timeout' });
      }
      await new Promise((r) => setTimeout(r, 4000));
      uploaded = await ai.files.get({ name: uploaded.name as string });
    }
    if (uploaded.state === FileState.FAILED || !uploaded.uri) {
      return res.status(502).json({ error: 'omni_upload_failed' });
    }
    videoUri = uploaded.uri;
  } catch (err: any) {
    console.error('[api/gemini/omni-video] upload error:', err?.message);
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

  // 10. Create the edit interaction (raw REST — PoC-proven request shape).
  //     background:true so create returns an interaction id to poll instead of
  //     blocking the serverless function for the full render.
  const createBody = {
    model: OMNI_MODEL_ID,
    background: true,
    input: [
      { type: 'document', uri: videoUri },
      { type: 'text', text: prompt },
    ],
    response_format: { type: 'video', aspect_ratio: aspectRatio },
  };

  let status = 0;
  let text = '';
  let json: any = null;
  try {
    const upstream = await fetch(`${GENAI_BASE}/interactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(createBody),
    });
    status = upstream.status;
    text = await upstream.text();
    try {
      json = JSON.parse(text);
    } catch {
      /* leave null */
    }
  } catch (err: any) {
    console.error('[api/gemini/omni-video] interactions fetch error:', err?.message);
    return res.status(502).json({ error: 'gemini_error', detail: err?.message ?? 'fetch_failed' });
  }

  // Success: HTTP 2xx + an interaction id, and the interaction did not come back
  // already failed/blocked.
  const interactionId: string | undefined = json?.id ?? json?.name;
  const createStatus: string | undefined = json?.status;

  if (status >= 200 && status < 300 && interactionId) {
    if (createStatus === 'failed' || createStatus === 'blocked' || createStatus === 'cancelled') {
      if (looksBlocked(text)) {
        return res.status(200).json({ error: 'omni_blocked' });
      }
      return res.status(502).json({ error: 'gemini_error', detail: `interaction_${createStatus}` });
    }

    // Write the QA-gate sidecar so poll knows what to check for THIS output.
    // Non-fatal: a missing sidecar makes the gate fail open (never blocks paid
    // output). Lives one level deep (${uid}/omni-meta/) — reaped by the cron.
    try {
      const { directedWords, expectPerson, forbiddenWords } = deriveGateExpectations(preset, slots);
      const sidecar = { presetId, directedWords, expectPerson, forbiddenWords, sceneIdx, finishedAdId };
      const put = await putMedia(
        `${user.id}/omni-meta/${interactionId}.json`,
        Buffer.from(JSON.stringify(sidecar), 'utf-8'),
        'application/json',
        { cacheControl: '3600', upsert: true }
      );
      if (put.error) {
        console.warn('[api/gemini/omni-video] gate sidecar write failed (non-fatal):', put.error);
      }
    } catch (err: any) {
      console.warn('[api/gemini/omni-video] gate sidecar write threw (non-fatal):', err?.message);
    }

    return res.status(202).json({ interactionId });
  }

  // Safety-filter block (pre-generation, unbilled) → distinct code, HTTP 200 so
  // the client runs the fallback ladder rather than a transient retry.
  if (looksBlocked(text)) {
    return res.status(200).json({ error: 'omni_blocked' });
  }

  // Quota / rate exhaustion → gemini_quota.
  const isQuota =
    status === 429 || /resource_exhausted/i.test(text) || json?.error?.status === 'RESOURCE_EXHAUSTED';
  if (isQuota) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'gemini_quota', detail: json?.error?.message ?? text.slice(0, 300) });
  }

  console.error('[api/gemini/omni-video] interactions create failed:', status, text.slice(0, 500));
  return res.status(502).json({
    error: 'gemini_error',
    detail: json?.error?.message ?? `upstream_${status}: ${text.slice(0, 200)}`,
  });
}
