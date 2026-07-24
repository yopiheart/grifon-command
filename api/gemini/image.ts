import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { consumeMonthly } from '../_lib/quota.js';
import { logImageUsage } from '../_lib/modelCosts.js';
import { getRequestId, getRunId } from '../_lib/requestId.js';
import { gateImage, IMAGE_GATE_MODEL } from '../_lib/imageGate.js';

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
    // Per-scene idempotency key for the internal gate budget (transport/budget
    // metadata — NOT passed into gateImage, which is pure gate input).
    sceneIdx: z.number().int().min(0).max(23).optional(),
    // NOTE: the `model` field was REMOVED (2026-07-23 review finding) — an
    // authenticated client could otherwise route gate calls to arbitrary Gemini
    // models. The shipped client never sends it; zod's non-strict parse silently
    // strips any legacy sender. The IMAGE_GATE_MODEL env override is unaffected.
  }),
});

const IMAGE_LIMIT = 15;
const IMAGE_WINDOW_SECONDS = 60;

// Gate burst limit — DELIBERATELY its own bucket, not the generate bucket.
// Sharing `gemini:image:${user.id}` made the gate and the generation it judges
// compete for one 15/60s allowance: a gated N-scene run fires 2N calls (N generate
// + N gate) at pooled(K=3), so a 9-scene run needs ~18/min and overruns the cap.
// Two bad outcomes from that, both silent: the gate 429s on the LATER scenes (so
// gate-precision data is biased toward early scenes, exactly the measurement
// flag-ON exists to take), and — worse — gate calls can starve the GENERATE calls
// they follow, degrading the actual run. Sized strictly above the 15/60s generate
// ceiling so the gate can never be the bottleneck or the thief. Cost is NOT bounded
// here: the per-user 48/day budget below remains the real ceiling (~$0.002/call).
const GATE_BURST_LIMIT = 20;
const GATE_BURST_WINDOW_SECONDS = 60;

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
  // A cheap vision QA pass on a generated still. Rides the SAME auth → burst
  // rate-limit as a generate, then returns { observations, verdict } with the
  // verdict computed server-side. Flag-only + fail-open: gateImage never throws —
  // infra failure yields verdict.pass:true.
  if (req.body && typeof req.body === 'object' && 'gateCheck' in (req.body as Record<string, unknown>)) {
    const gate = GateBody.safeParse(req.body ?? {});
    if (!gate.success) {
      return res.status(400).json({ error: 'invalid_body', issues: gate.error.issues });
    }

    // Kill switch — ships DARK (mirrors SFX_V2_ENABLED / OMNI_STYLES_ENABLED). Both the server
    // flag IMAGE_GATE_ENABLED (unprefixed, .env) and the client flag VITE_IMAGE_GATE_ENABLED
    // (bundled, services/producerDeps.ts) must be 'true' to activate the gate. A disabled gate
    // burns ZERO rate-limit/budget — this returns BEFORE all meters. The client fail-open catch
    // turns the 503 into a silent skip.
    //
    // Metering decision — RESOLVED (2026-07-23, owner-approved): gate checks NO LONGER draw down
    // the customer 'images' meter (a gated 12-scene run ≈ a Starter plan's whole 25 images/month).
    // They ride an INTERNAL COGS budget instead: a per-user 48/day cap via rate_limit_check (not
    // dev-bypassed, fails open to the in-memory backstop, acceptable at ~$0.002/call) + a
    // per-(runId,sceneIdx) limit of 2/24h as idempotency. Remaining flag-ON condition: the live
    // smoke of checkSceneImage against real sceneImageModel output (thresholds so far validated
    // only against synthetic headers).
    if (process.env.IMAGE_GATE_ENABLED !== 'true') {
      return res.status(503).json({ error: 'image_gate_disabled' });
    }

    // Burst limit on its OWN key (see GATE_BURST_LIMIT) — the gate must never consume
    // the generate allowance for the images it is judging.
    const gateAllowed = await rateLimitCheck(`imgate:burst:${user.id}`, GATE_BURST_LIMIT, GATE_BURST_WINDOW_SECONDS);
    if (!gateAllowed) {
      res.setHeader('Retry-After', String(GATE_BURST_WINDOW_SECONDS));
      return res.status(429).json({ error: 'rate_limited', scope: 'image_gate', retry_after_seconds: GATE_BURST_WINDOW_SECONDS });
    }

    // PRIMARY bound: internal per-user daily gate budget (COGS, not the customer meter). This is
    // the real ceiling on how many gate calls one user can burn per day.
    const budgetOk = await rateLimitCheck(`imgate:user:${user.id}`, 48, 86400);
    if (!budgetOk) {
      res.setHeader('Retry-After', '3600');
      return res.status(429).json({ error: 'image_gate_budget', retry_after_seconds: 3600 });
    }

    // SECONDARY (idempotency only): cap re-checks of the same (run, scene) pair. runId is
    // CLIENT-CONTROLLED, so this key only lets a client burn its OWN daily budget faster — the
    // per-user key above is the real ceiling.
    if (runId && typeof gate.data.gateCheck.sceneIdx === 'number') {
      const sceneOk = await rateLimitCheck(`imgate:${runId}:${gate.data.gateCheck.sceneIdx}`, 2, 86400);
      if (!sceneOk) {
        res.setHeader('Retry-After', '3600');
        return res.status(429).json({ error: 'image_gate_scene_repeat', retry_after_seconds: 3600 });
      }
    }

    // sceneIdx is transport/budget metadata, not gate input — do NOT pass it into gateImage.
    const result = await gateImage({
      imageBase64: gate.data.gateCheck.imageBase64,
      referenceImageBase64: gate.data.gateCheck.referenceImageBase64,
      expectedLabelText: gate.data.gateCheck.expectedLabelText,
      referenceMode: gate.data.gateCheck.referenceMode,
    });
    // runId is client-controlled and unverified; user.id is the verified caller, so the
    // cogs row stays attributable even if x-run-id was forged (run_cogs groups by both).
    logImageUsage('image_gate', IMAGE_GATE_MODEL, 1, runId, user.id);
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
    logImageUsage('image', parsed.data.model, 1, runId, user.id);

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
