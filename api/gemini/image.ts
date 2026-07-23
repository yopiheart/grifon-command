import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { consumeMonthly } from '../_lib/quota.js';
import { logImageUsage } from '../_lib/modelCosts.js';
import { getRequestId, getRunId } from '../_lib/requestId.js';
import { gateImage } from '../_lib/imageGate.js';

const Body = z.object({
  model: z.string().min(1),
  contents: z.unknown(),
  config: z.unknown().optional(),
});

// Opt-in gate mode (P4): discriminated by the top-level `gateCheck` key. When
// present the handler runs the vision QA gate on a still instead of generating;
// when ABSENT the generate path below is byte-identical to pre-P4.
const GateBody = z.object({
  gateCheck: z.object({
    imageBase64: z.string().min(1),
    referenceImageBase64: z.string().optional(),
    expectedLabelText: z.string().optional(),
    referenceMode: z.string().default('none'),
    model: z.string().optional(),
  }),
});

const IMAGE_LIMIT = 15;
const IMAGE_WINDOW_SECONDS = 60;

let _ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  if (_ai) return _ai;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_NOT_CONFIGURED: set GEMINI_API_KEY (server-side, no VITE_ prefix).');
  _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rid = getRequestId(req);
  res.setHeader('x-request-id', rid);
  // P2: producer run correlator — undefined for non-run traffic (gates COGS run-event mirroring).
  const runId = getRunId(req);

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const authz = req.headers.authorization;
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'missing_bearer_token' });

  const user = await getUserFromAccessToken(token);
  if (!user) return res.status(401).json({ error: 'invalid_token' });

  // ── Gate mode (P4) ──────────────────────────────────────────────────────────
  // A cheap vision QA pass on a generated still. Rides the SAME auth → rate-limit
  // → images-quota metering as a generate (it IS an image call), then returns
  // { observations, verdict } with the verdict computed server-side. Flag-only +
  // fail-open: gateImage never throws — infra failure yields verdict.pass:true.
  if (req.body && typeof req.body === 'object' && 'gateCheck' in (req.body as Record<string, unknown>)) {
    const gate = GateBody.safeParse(req.body ?? {});
    if (!gate.success) {
      return res.status(400).json({ error: 'invalid_body', issues: gate.error.issues });
    }

    // Kill switch — ships DARK (mirrors SFX_V2_ENABLED / OMNI_STYLES_ENABLED). Both the server
    // flag IMAGE_GATE_ENABLED (unprefixed, .env) and the client flag VITE_IMAGE_GATE_ENABLED
    // (bundled, services/producerDeps.ts) must be 'true' to activate the gate. Stays OFF until
    // (1) the owner decides whether gate calls should draw down the monthly images meter (they
    // currently do — a gated 12-scene run can exhaust a Starter plan's 25 images/month) and
    // (2) a live smoke proves checkSceneImage passes real sceneImageModel output (thresholds are
    // so far only validated against synthetic headers). A disabled gate burns ZERO rate-limit/
    // quota — this returns BEFORE both meters. The client fail-open catch turns the 503 into a
    // silent skip.
    if (process.env.IMAGE_GATE_ENABLED !== 'true') {
      return res.status(503).json({ error: 'image_gate_disabled' });
    }

    const gateAllowed = await rateLimitCheck(`gemini:image:${user.id}`, IMAGE_LIMIT, IMAGE_WINDOW_SECONDS);
    if (!gateAllowed) {
      res.setHeader('Retry-After', String(IMAGE_WINDOW_SECONDS));
      return res.status(429).json({ error: 'rate_limited', scope: 'image', retry_after_seconds: IMAGE_WINDOW_SECONDS });
    }

    const gatePlan = await getUserPlan(user.id);
    const gateQuota = await consumeMonthly('images', user.id, gatePlan);
    if (!gateQuota.allowed) {
      return res.status(402).json({
        error: 'quota_exceeded',
        scope: 'images',
        used: gateQuota.used,
        limit: gateQuota.limit,
        remaining: 0,
        plan: gatePlan,
      });
    }

    const result = await gateImage(gate.data.gateCheck);
    logImageUsage('image_gate', gate.data.gateCheck.model ?? 'gemini-image-gate', 1, runId);
    return res.status(200).json(result);
  }

  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }

  const allowed = await rateLimitCheck(
    `gemini:image:${user.id}`,
    IMAGE_LIMIT,
    IMAGE_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(IMAGE_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: 'image',
      retry_after_seconds: IMAGE_WINDOW_SECONDS,
    });
  }

  // Monthly plan allowance (images). Every image generation counts, including
  // the 3-4 in a storyboard daisy-chain (per Neil 2026-05-31). Distinct from the
  // per-minute rate-limit above; raises the in-app upgrade wall via the 402
  // quota_exceeded contract proxyCall recognizes.
  const plan = await getUserPlan(user.id);
  const imageQuota = await consumeMonthly('images', user.id, plan);
  if (!imageQuota.allowed) {
    return res.status(402).json({
      error: 'quota_exceeded',
      scope: 'images',
      used: imageQuota.used,
      limit: imageQuota.limit,
      remaining: 0,
      plan,
    });
  }

  try {
    const ai = getAi();
    const response = await ai.models.generateContent(parsed.data as any);
    logImageUsage('image', parsed.data.model, 1, runId);

    return res.status(200).json({
      candidates: response.candidates ?? [],
      usageMetadata: (response as any).usageMetadata,
      promptFeedback: (response as any).promptFeedback,
    });
  } catch (err: any) {
    const msg = err?.message ?? 'unknown';
    const errStr = JSON.stringify(err ?? {});
    const isQuota =
      msg.includes('429') ||
      msg.includes('RESOURCE_EXHAUSTED') ||
      errStr.includes('RESOURCE_EXHAUSTED') ||
      err?.status === 429 ||
      err?.error?.code === 429 ||
      err?.error?.status === 'RESOURCE_EXHAUSTED';

    if (isQuota) {
      res.setHeader('Retry-After', '30');
      return res.status(429).json({ error: 'gemini_quota', detail: msg });
    }

    // Surface upstream model overload as 503 so the client's retryWithBackoff
    // (which already retries 429/503) picks it up instead of treating it as a
    // hard failure. Pattern matches Gemini's `{code: 503, status: "UNAVAILABLE"}`.
    const isUnavailable =
      msg.includes('UNAVAILABLE') ||
      errStr.includes('UNAVAILABLE') ||
      errStr.includes('"code":503') ||
      err?.status === 503 ||
      err?.error?.code === 503 ||
      err?.error?.status === 'UNAVAILABLE';

    if (isUnavailable) {
      res.setHeader('Retry-After', '5');
      return res.status(503).json({ error: 'gemini_unavailable', detail: msg });
    }

    console.error('[api/gemini/image] error:', { rid, msg });
    return res.status(502).json({ error: 'gemini_error', detail: msg });
  }
}
