// Gemini text proxy — dual-mode endpoint.
//
// Two body shapes are accepted:
//
//   1. **Flow mode** (server-side prompt registry, IP-protected):
//      `{ flow: '<id>', input: {...} }` — the prompt is looked up in
//      api/_lib/prompts.ts (server-only) so it never appears in the
//      client bundle or network request body.
//
//   2. **Legacy passthrough mode** (smaller flows, prompt still
//      client-built):
//      `{ model, contents, config? }` — forwarded verbatim to Gemini.
//
// The two modes are merged into one file because Vercel Hobby caps each
// deployment at 12 serverless functions; splitting flow.ts as its own
// endpoint pushed the count to 13. Migrating the crown-jewel prompts
// off the client doesn't require a separate endpoint — it just requires
// the prompts to live server-side, which they now do.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
import { getUserPlan } from '../_lib/userPlan.js';
import { consumeMonthly, type MeterUnit } from '../_lib/quota.js';
import {
  SAFETY_SETTINGS,
  cleanJson,
  MODEL_TEXT,
  MODEL_FAST,
  MARKETMIND_SYSTEM_INSTRUCTION,
  buildMarketMindParts,
  TEMU_CLASSIFIER_PROMPT,
  UGCPRO_CLASSIFIER_PROMPT,
  UGCPRO_SERVICE_CLASSIFIER_PROMPT,
  buildAdScriptPrompt,
  parseAdScriptResponse,
  hasApplicationVerb,
  type AdScriptInput,
  buildOfferOptimizerPrompt,
  parseOfferOptimizerResponse,
  buildInfluencerScriptPrompt,
  parseInfluencerScriptResponse,
  type InfluencerScriptFlowInput,
  buildStoryboardPrompt,
  parseStoryboardResponse,
  type StoryboardFlowInput,
  MarketResearchOutputSchema,
  AdScriptOutputSchema,
  OfferOptimizerOutputSchema,
  InfluencerScriptOutputSchema,
  StoryboardOutputSchema,
} from '../_lib/prompts.js';
import type { MarketResearchInput, OfferOptimizerInput } from '../../types.js';
import { logModelUsage } from '../_lib/modelCosts.js';
import { getRequestId, getRunId } from '../_lib/requestId.js';

const TEXT_LIMIT = 30;
const TEXT_WINDOW_SECONDS = 60;

let _ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  if (_ai) return _ai;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_NOT_CONFIGURED: set GEMINI_API_KEY (server-side, no VITE_ prefix).');
  _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
};

// ---------------------------------------------------------------------------
// FLOW_REGISTRY (server-side prompt mode)
// ---------------------------------------------------------------------------

type TemuSubType = 'ASMR' | 'Reaction' | 'Utility';

const classifyTemuProductServerSide = async (
  product: string,
  description: string,
  ai: GoogleGenAI,
  runId?: string
): Promise<TemuSubType> => {
  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: TEMU_CLASSIFIER_PROMPT(product, description),
  } as any);
  logModelUsage('flow:adscript:temu-classify', MODEL_FAST, (response as any).usageMetadata, runId);
  const text = response.text?.trim().toUpperCase() || 'REACTION';
  if (text.includes('ASMR')) return 'ASMR';
  if (text.includes('UTILITY')) return 'Utility';
  return 'Reaction';
};

type UgcProSubType = 'tryon' | 'unboxing' | 'demo' | 'transformation' | 'tutorial';

// Pure parse of the UGC Pro classifier's one-word reply. Exported for unit tests.
// Uppercase substring-match: each keyword maps to its sub-format; unrecognized
// replies fall through to the transformation default (the safe generalist arm).
// None of the five keywords is a substring of another (TRYON / UNBOXING / DEMO /
// TRANSFORMATION / TUTORIAL), so plain includes() checks can't collide.
export const parseUgcProClassifierResponse = (text: string): UgcProSubType => {
  const upper = (text ?? '').toUpperCase();
  if (upper.includes('TRYON')) return 'tryon';
  if (upper.includes('UNBOXING')) return 'unboxing';
  if (upper.includes('TUTORIAL')) return 'tutorial';
  if (upper.includes('DEMO')) return 'demo';
  if (upper.includes('TRANSFORMATION')) return 'transformation';
  return 'transformation';
};

const classifyUgcProServerSide = async (
  product: string,
  description: string,
  ai: GoogleGenAI,
  runId?: string
): Promise<UgcProSubType> => {
  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: UGCPRO_CLASSIFIER_PROMPT(product, description),
  } as any);
  logModelUsage('flow:adscript:ugcpro-classify', MODEL_FAST, (response as any).usageMetadata, runId);
  return parseUgcProClassifierResponse(response.text ?? '');
};

// Slice 4 (A4): services-constrained sibling of the 5-way classifier. A SERVICE
// business can only answer TRANSFORMATION or TUTORIAL (try-on/unboxing/demo are
// product-only), so this uses the 2-way service prompt and mirrors the 5-way's
// default: an unrecognized reply falls through to 'transformation'.
const classifyUgcProServiceServerSide = async (
  product: string,
  description: string,
  ai: GoogleGenAI,
  runId?: string
): Promise<'transformation' | 'tutorial'> => {
  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: UGCPRO_SERVICE_CLASSIFIER_PROMPT(product, description),
  } as any);
  logModelUsage('flow:adscript:ugcpro-service-classify', MODEL_FAST, (response as any).usageMetadata, runId);
  return (response.text ?? '').toUpperCase().includes('TUTORIAL') ? 'tutorial' : 'transformation';
};

// Slice 4 (A4): resolve the UGC Pro sub-format, clamping the classifier dispatch by
// businessType BEFORE any Gemini call. Non-product verticals have fewer legal formats
// than the product 5-way, so they never over-call the classifier:
//   - realestate → exactly ONE legal answer ('tutorial') → NO Gemini call.
//   - service    → TWO legal answers; honor an explicit 'transformation'/'tutorial'
//                  pick, otherwise (Auto or an illegal product-only pick) run the
//                  2-way service classifier.
//   - product (or undefined) → EXACTLY the pre-Slice-4 behavior: honor any of the 5
//                  explicit picks, else the 5-way classifier on the Auto path.
// Exported for unit tests (the clamp is asserted with a spy `ai`).
export const resolveUgcProSubType = async (
  businessInfo: AdScriptInput['businessInfo'],
  ai: GoogleGenAI,
  runId?: string
): Promise<UgcProSubType> => {
  const chosen = businessInfo.ugcProFormat;
  const bt = businessInfo.businessType ?? 'product';
  if (bt === 'realestate') return 'tutorial';
  if (bt === 'service') {
    return chosen === 'transformation' || chosen === 'tutorial'
      ? chosen
      : classifyUgcProServiceServerSide(businessInfo.product, businessInfo.features, ai, runId);
  }
  if (
    chosen === 'tryon' ||
    chosen === 'unboxing' ||
    chosen === 'demo' ||
    chosen === 'transformation' ||
    chosen === 'tutorial'
  ) {
    return chosen;
  }
  return classifyUgcProServerSide(businessInfo.product, businessInfo.features, ai, runId);
};

type FlowHandler = (input: any, ai: GoogleGenAI, runId?: string) => Promise<unknown>;

export const FLOW_REGISTRY: Record<string, FlowHandler> = {
  marketmind: async (input: MarketResearchInput, ai, runId?: string) => {
    const parts = buildMarketMindParts(input);
    // TEMPORARY (per Neil 2026-05-09): downgraded from MODEL_RESEARCH (3.1 Pro)
    // to Flash Lite to control API cost during early ramp. REVERT when budget
    // allows by changing `MODEL_TEXT` back to `MODEL_RESEARCH`.
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: { parts },
      config: {
        systemInstruction: MARKETMIND_SYSTEM_INSTRUCTION,
        tools: [{ googleSearch: {} }],
        safetySettings: SAFETY_SETTINGS,
      },
    } as any);
    const rawText = response.text || '{}';
    logModelUsage('flow:marketmind', MODEL_TEXT, (response as any).usageMetadata, runId);
    return JSON.parse(cleanJson(rawText));
  },

  adscript: async (input: AdScriptInput, ai, runId?: string) => {
    let temuSubType: TemuSubType | undefined;
    if (input.businessInfo.scriptType === 'Temu') {
      temuSubType = await classifyTemuProductServerSide(
        input.businessInfo.product,
        input.businessInfo.features,
        ai,
        runId
      );
    }
    let ugcProSubType: UgcProSubType | undefined;
    if (input.businessInfo.scriptType === 'UGCPro') {
      // A4: businessType-clamped dispatch — realestate forces 'tutorial' (no Gemini
      // call), service honors only its 2 legal picks / else the 2-way classifier,
      // product keeps the pre-Slice-4 5-way behavior. See resolveUgcProSubType.
      ugcProSubType = await resolveUgcProSubType(input.businessInfo, ai, runId);
    }
    const prompt = buildAdScriptPrompt(input, temuSubType, ugcProSubType);
    // Single-shot generate + parse. Extracted so the hook-starvation retry and the
    // transformation verb-reroll below can re-run the identical call without
    // duplicating config.
    const generateAndParse = async (flowTag: string) => {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          safetySettings: SAFETY_SETTINGS,
          thinkingConfig: { thinkingBudget: 4000 },
        },
      } as any);
      logModelUsage(flowTag, MODEL_TEXT, (response as any).usageMetadata, runId);
      return parseAdScriptResponse(response.text || '{}');
    };

    let script = await generateAndParse('flow:adscript');

    // Hook starvation (issue #59): Gemini stochastically returns empty hook
    // arrays, TESTIMONIAL-heavy. Regenerate once INSIDE this already-metered
    // request (one workflow unit — see the one-generation-one-workflow rule at
    // the consumeMonthly block). If the regeneration itself fails, keep the
    // first parsed result rather than discarding it.
    if (!(script?.hook1?.length && script?.hook2?.length)) {
      console.warn('[adscript] empty hook1/hook2 — regenerating once (hook starvation, #59)');
      try {
        script = await generateAndParse('flow:adscript:hook-retry');
      } catch {
        // keep the first parsed result
      }
    }

    // TRANSFORMATION beat-1 (body[0]) must be a working application line, not a posed
    // product intro. Prompt instructions alone failed 4/4 in the Slice-1 eval loop, so
    // detect + re-roll ONCE (Neil's choice: never regex-rewrite the model's line). If
    // body is empty or body[0] isn't a string, skip — never crash.
    if (
      input.businessInfo.scriptType === 'UGCPro' &&
      ugcProSubType === 'transformation' &&
      typeof script.body?.[0] === 'string' &&
      !hasApplicationVerb(script.body[0])
    ) {
      script = await generateAndParse('flow:adscript:verb-reroll');
    }

    // Thread the resolved UGC Pro sub-format back to the client (only for UGCPro runs)
    // so the storyboard prompt can read businessInfo.ugcProFormat even on the 'Auto'
    // path. Transport/plumbing only — the prompt text is untouched.
    return input.businessInfo.scriptType === 'UGCPro'
      ? { ...script, ugcProFormatResolved: ugcProSubType }
      : script;
  },

  'offer-optimizer': async (input: OfferOptimizerInput, ai, runId?: string) => {
    const prompt = buildOfferOptimizerPrompt(input);
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: { parts: [{ text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        safetySettings: SAFETY_SETTINGS,
      },
    } as any);
    const rawText = response.text || '{}';
    logModelUsage('flow:offer-optimizer', MODEL_TEXT, (response as any).usageMetadata, runId);
    return parseOfferOptimizerResponse(rawText);
  },

  'influencer-script': async (input: InfluencerScriptFlowInput, ai, runId?: string) => {
    const prompt = buildInfluencerScriptPrompt(input);
    const response = await ai.models.generateContent({
      model: MODEL_TEXT,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        safetySettings: SAFETY_SETTINGS,
        thinkingConfig: { thinkingBudget: 4000 },
      },
    } as any);
    logModelUsage('flow:influencer-script', MODEL_TEXT, (response as any).usageMetadata, runId);
    return parseInfluencerScriptResponse(response.text || '{}');
  },

  storyboard: async (input: StoryboardFlowInput, ai, runId?: string) => {
    const prompt = buildStoryboardPrompt(input);
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        safetySettings: SAFETY_SETTINGS,
      },
    } as any);
    logModelUsage('flow:storyboard', MODEL_FAST, (response as any).usageMetadata, runId);
    return parseStoryboardResponse(response.text || '{}');
  },
};

// ---------------------------------------------------------------------------
// Flow-output schema ladder (P1: truth at the boundaries)
// ---------------------------------------------------------------------------
//
// Each flow's parsed output is checked against a permissive zod schema describing
// what downstream ACTUALLY consumes (defined next to each parser in _lib/prompts.ts).
// On a schema miss we resend the EXACT same request ONCE (verbatim — no repair
// hint appended to the tuned prompt), then re-check. Second miss → the handler
// returns a structured 422 instead of shipping unusable JSON downstream (the old
// 502 path only fired on a JSON.parse throw, never on structurally-wrong output).
//
// The regen is one re-invocation of the flow handler — "the exact same request"
// (same flow + same input). For adscript this keeps the existing hook-starvation +
// verb regens intact and runs the schema check AFTER them.

type FlowName = 'marketmind' | 'adscript' | 'offer-optimizer' | 'influencer-script' | 'storyboard';

const FLOW_OUTPUT_SCHEMAS: Record<FlowName, z.ZodTypeAny> = {
  marketmind: MarketResearchOutputSchema,
  adscript: AdScriptOutputSchema,
  'offer-optimizer': OfferOptimizerOutputSchema,
  'influencer-script': InfluencerScriptOutputSchema,
  storyboard: StoryboardOutputSchema,
};

export type FlowLadderResult =
  | { ok: true; result: unknown }
  | { ok: false; issues: { path: (string | number)[]; message: string }[] };

// Run a flow through the coerce→regen-once ladder. The parsed handler output is
// returned UNCHANGED on success (schema is a gate, not a transformer — byte-identical
// behavior on today's valid outputs). Exported so the ladder is unit-testable at the
// flow-dispatch seam (mock ai.models.generateContent), no HTTP plumbing required.
export const runFlowWithSchema = async (
  flow: FlowName,
  input: unknown,
  ai: GoogleGenAI,
  runId?: string
): Promise<FlowLadderResult> => {
  const handlerFn = FLOW_REGISTRY[flow];
  const schema = FLOW_OUTPUT_SCHEMAS[flow];

  // The regen ladder now also absorbs a parse-throw (unparseable JSON from Gemini →
  // JSON.parse throw inside the flow parser), which used to bypass the ladder and 502.
  // Budget is unchanged: max 2 handler invocations total. A SyntaxError on the FIRST
  // call spends the regen (the second is the final one); any OTHER first-call error
  // (Gemini 429/503 quota/infra) propagates immediately — never a burn-doubling regen.
  let regenUsed = false;
  let result: unknown;
  try {
    result = await handlerFn(input, ai, runId);
  } catch (err) {
    if (!(err instanceof SyntaxError)) throw err;
    console.warn(`[flow:${flow}] output parse-threw (unparseable JSON) — regenerating once (verbatim)`);
    regenUsed = true;
    // Final invocation — any throw here propagates (502 path, budget spent).
    result = await handlerFn(input, ai, runId);
  }
  let check = schema.safeParse(result);
  if (check.success) return { ok: true, result };

  // If the regen was already spent absorbing a parse-throw, don't invoke a third time —
  // return the structured 422 on the second call's schema miss.
  if (!regenUsed) {
    // ONE verbatim regeneration — resend the exact same request.
    console.warn(`[flow:${flow}] output failed schema — regenerating once (verbatim)`);
    result = await handlerFn(input, ai, runId);
    check = schema.safeParse(result);
    if (check.success) return { ok: true, result };
  }

  return {
    ok: false,
    issues: check.error.issues.map((i) => ({
      // zod paths can carry symbols; coerce to a JSON-serializable form for the 422 body.
      path: i.path.map((p) => (typeof p === 'symbol' ? String(p) : p)),
      message: i.message,
    })),
  };
};

// ---------------------------------------------------------------------------
// Body schemas — discriminated by presence of `flow` field
// ---------------------------------------------------------------------------

const FlowBody = z.object({
  flow: z.enum(['marketmind', 'adscript', 'offer-optimizer', 'influencer-script', 'storyboard']),
  input: z.unknown(),
});

// Pin the legacy forwarder to Grifon's approved text models. Without this an
// authenticated client could request arbitrary/expensive models. 3.6-flash and
// 3.5-flash-lite are pre-approved for upcoming model-adoption slices. A model
// outside this set fails safeParse and takes the existing invalid_body 400 path.
export const LegacyBody = z.object({
  model: z.enum([
    'gemini-3.1-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash-lite',
  ]),
  contents: z.unknown(),
  config: z.unknown().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rid = getRequestId(req);
  res.setHeader('x-request-id', rid);
  // P2: producer run correlator — undefined for non-run traffic, so COGS run-event
  // mirroring stays gated to producer runs (getRunId returns undefined without x-run-id).
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

  const rawBody: any = req.body ?? {};
  const isFlowMode = typeof rawBody === 'object' && rawBody !== null && typeof rawBody.flow === 'string';

  // Rate limit (single budget across both modes — same API quota).
  const allowed = await rateLimitCheck(
    `gemini:text:${user.id}`,
    TEXT_LIMIT,
    TEXT_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(TEXT_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: isFlowMode ? `flow:${rawBody.flow}` : 'text',
      retry_after_seconds: TEXT_WINDOW_SECONDS,
    });
  }

  // Monthly plan allowance. Distinct from the per-minute rate-limit above: this
  // counts toward the user's tier cap and, when hit, raises the in-app upgrade
  // wall via the 402 quota_exceeded contract that proxyCall recognizes. Consumes
  // a slot before forwarding (same atomic pre-forward model as rate_limit_check).
  //   - marketmind flow -> reports
  //   - adscript flow    -> workflows (one ad-script generation = one workflow,
  //     regenerations included, per Neil 2026-05-31)
  //   - legacy meterUnit:'captions' -> captions (the caption call opts in via a
  //     body hint so the shared legacy text endpoint meters ONLY captions, not
  //     avatar/thumbnail/classifier/parse helpers). zod strips the hint from the
  //     legacy body before it reaches Gemini.
  let meterUnit: MeterUnit | null = null;
  if (isFlowMode) {
    if (rawBody.flow === 'marketmind') meterUnit = 'reports';
    else if (rawBody.flow === 'adscript') meterUnit = 'workflows';
  } else if (rawBody.meterUnit === 'captions') {
    meterUnit = 'captions';
  }
  if (meterUnit) {
    const plan = await getUserPlan(user.id);
    const quota = await consumeMonthly(meterUnit, user.id, plan);
    if (!quota.allowed) {
      return res.status(402).json({
        error: 'quota_exceeded',
        scope: meterUnit,
        used: quota.used,
        limit: quota.limit,
        remaining: 0,
        plan,
      });
    }
  }

  try {
    const ai = getAi();

    if (isFlowMode) {
      // Flow mode — server-side prompt registry.
      const parsed = FlowBody.safeParse(rawBody);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
      }
      const handlerFn = FLOW_REGISTRY[parsed.data.flow];
      if (!handlerFn) {
        return res.status(400).json({ error: 'unknown_flow', flow: parsed.data.flow });
      }
      const ladder = await runFlowWithSchema(parsed.data.flow, parsed.data.input, ai, runId);
      if (!ladder.ok) {
        return res.status(422).json({
          error: 'flow_output_invalid',
          flow: parsed.data.flow,
          issues: ladder.issues,
        });
      }
      return res.status(200).json(ladder.result);
    }

    // Legacy passthrough mode — client-built prompt.
    const parsed = LegacyBody.safeParse(rawBody);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const response = await ai.models.generateContent(parsed.data as any);
    logModelUsage('legacy', parsed.data.model, (response as any).usageMetadata, runId);
    return res.status(200).json({
      text: response.text ?? '',
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

    console.error('[api/gemini/text] error:', { rid, msg });
    return res.status(502).json({ error: 'gemini_error', detail: msg });
  }
}
