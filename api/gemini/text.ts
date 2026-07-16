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
  buildAdScriptPrompt,
  parseAdScriptResponse,
  type AdScriptInput,
  buildOfferOptimizerPrompt,
  parseOfferOptimizerResponse,
  buildInfluencerScriptPrompt,
  parseInfluencerScriptResponse,
  type InfluencerScriptFlowInput,
  buildStoryboardPrompt,
  parseStoryboardResponse,
  type StoryboardFlowInput,
} from '../_lib/prompts.js';
import type { MarketResearchInput, OfferOptimizerInput } from '../../types.js';
import { logModelUsage } from '../_lib/modelCosts.js';

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
  ai: GoogleGenAI
): Promise<TemuSubType> => {
  const response = await ai.models.generateContent({
    model: MODEL_FAST,
    contents: TEMU_CLASSIFIER_PROMPT(product, description),
  } as any);
  logModelUsage('flow:adscript:temu-classify', MODEL_FAST, (response as any).usageMetadata);
  const text = response.text?.trim().toUpperCase() || 'REACTION';
  if (text.includes('ASMR')) return 'ASMR';
  if (text.includes('UTILITY')) return 'Utility';
  return 'Reaction';
};

type FlowHandler = (input: any, ai: GoogleGenAI) => Promise<unknown>;

export const FLOW_REGISTRY: Record<string, FlowHandler> = {
  marketmind: async (input: MarketResearchInput, ai) => {
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
    logModelUsage('flow:marketmind', MODEL_TEXT, (response as any).usageMetadata);
    return JSON.parse(cleanJson(rawText));
  },

  adscript: async (input: AdScriptInput, ai) => {
    let temuSubType: TemuSubType | undefined;
    if (input.businessInfo.scriptType === 'Temu') {
      temuSubType = await classifyTemuProductServerSide(
        input.businessInfo.product,
        input.businessInfo.features,
        ai
      );
    }
    const prompt = buildAdScriptPrompt(input, temuSubType);
    const generate = async () => {
      const response = await ai.models.generateContent({
        model: MODEL_TEXT,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          safetySettings: SAFETY_SETTINGS,
          thinkingConfig: { thinkingBudget: 4000 },
        },
      } as any);
      const rawText = response.text || '{}';
      logModelUsage('flow:adscript', MODEL_TEXT, (response as any).usageMetadata);
      return parseAdScriptResponse(rawText);
    };
    const script = await generate();
    if (script?.hook1?.length && script?.hook2?.length) return script;
    // Hook starvation (issue #59): Gemini stochastically returns empty hook
    // arrays, TESTIMONIAL-heavy. Regenerate once INSIDE this already-metered
    // request (one workflow unit — see the one-generation-one-workflow rule at
    // the consumeMonthly block). If the regeneration itself fails, return the
    // first parsed result rather than discarding it.
    console.warn('[adscript] empty hook1/hook2 — regenerating once (hook starvation, #59)');
    try {
      return await generate();
    } catch {
      return script;
    }
  },

  'offer-optimizer': async (input: OfferOptimizerInput, ai) => {
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
    logModelUsage('flow:offer-optimizer', MODEL_TEXT, (response as any).usageMetadata);
    return parseOfferOptimizerResponse(rawText);
  },

  'influencer-script': async (input: InfluencerScriptFlowInput, ai) => {
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
    logModelUsage('flow:influencer-script', MODEL_TEXT, (response as any).usageMetadata);
    return parseInfluencerScriptResponse(response.text || '{}');
  },

  storyboard: async (input: StoryboardFlowInput, ai) => {
    const prompt = buildStoryboardPrompt(input);
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        safetySettings: SAFETY_SETTINGS,
      },
    } as any);
    logModelUsage('flow:storyboard', MODEL_FAST, (response as any).usageMetadata);
    return parseStoryboardResponse(response.text || '{}');
  },
};

// ---------------------------------------------------------------------------
// Body schemas — discriminated by presence of `flow` field
// ---------------------------------------------------------------------------

const FlowBody = z.object({
  flow: z.enum(['marketmind', 'adscript', 'offer-optimizer', 'influencer-script', 'storyboard']),
  input: z.unknown(),
});

const LegacyBody = z.object({
  model: z.string().min(1),
  contents: z.unknown(),
  config: z.unknown().optional(),
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
      const result = await handlerFn(parsed.data.input, ai);
      return res.status(200).json(result);
    }

    // Legacy passthrough mode — client-built prompt.
    const parsed = LegacyBody.safeParse(rawBody);
    if (!parsed.success) {
      return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
    }
    const response = await ai.models.generateContent(parsed.data as any);
    logModelUsage('legacy', parsed.data.model, (response as any).usageMetadata);
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

    console.error('[api/gemini/text] error:', msg);
    return res.status(502).json({ error: 'gemini_error', detail: msg });
  }
}
