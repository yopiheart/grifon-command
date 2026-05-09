// Server-side flow endpoint. Each registered flow looks up its prompt from
// api/_lib/prompts.ts (server-only) and calls Gemini. The client never sees
// the prompt — only sends `{flow, input}` and receives the parsed response.
//
// Mirrors api/gemini/text.ts auth/rate-limit/error pattern. Add new flows by
// extending FLOW_REGISTRY below and the Body schema's flow enum.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { getUserFromAccessToken } from '../_lib/supabaseAdmin.js';
import { rateLimitCheck } from '../_lib/rateLimit.js';
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
} from '../_lib/prompts.js';
import type { MarketResearchInput } from '../../types';

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
  const text = response.text?.trim().toUpperCase() || 'REACTION';
  if (text.includes('ASMR')) return 'ASMR';
  if (text.includes('UTILITY')) return 'Utility';
  return 'Reaction';
};

const FLOW_LIMIT = 30;
const FLOW_WINDOW_SECONDS = 60;

let _ai: GoogleGenAI | null = null;
const getAi = (): GoogleGenAI => {
  if (_ai) return _ai;
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_NOT_CONFIGURED: set GEMINI_API_KEY (server-side, no VITE_ prefix).');
  _ai = new GoogleGenAI({ apiKey: key });
  return _ai;
};

// ---------------------------------------------------------------------------
// FLOW_REGISTRY
// ---------------------------------------------------------------------------
// Each entry assembles the Gemini call from the flow's prompt + input, then
// post-processes the response. Adding a new flow:
//   1. Add prompt strings/builders to api/_lib/prompts.ts
//   2. Add a new entry below
//   3. Add the flow id to the Body z.enum
//   4. Refactor the matching client-side function in services/geminiService.ts

type FlowHandler = (input: any, ai: GoogleGenAI) => Promise<unknown>;

const FLOW_REGISTRY: Record<string, FlowHandler> = {
  marketmind: async (input: MarketResearchInput, ai) => {
    const parts = buildMarketMindParts(input);
    // TEMPORARY (per Neil 2026-05-09): downgraded from MODEL_RESEARCH (3.1 Pro)
    // to Flash Lite to control API cost during early ramp. REVERT when budget
    // allows by changing `MODEL_TEXT` back to `MODEL_RESEARCH` (and update the
    // import above).
    // Note: googleSearch tool still works on Flash Lite. JSON via prompt +
    // cleanJson() post-processing — same robustness as other JSON flows.
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
    return JSON.parse(cleanJson(rawText));
  },

  adscript: async (input: AdScriptInput, ai) => {
    // Temu sub-type is a server-side internal call — keeps Temu logic atomic
    // and avoids round-tripping through the client just to classify.
    let temuSubType: TemuSubType | undefined;
    if (input.businessInfo.scriptType === 'Temu') {
      temuSubType = await classifyTemuProductServerSide(
        input.businessInfo.product,
        input.businessInfo.features,
        ai
      );
    }

    const prompt = buildAdScriptPrompt(input, temuSubType);
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
    return parseAdScriptResponse(rawText);
  },
};

const Body = z.object({
  flow: z.enum(['marketmind', 'adscript']),
  input: z.unknown(),
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

  const parsed = Body.safeParse(req.body ?? {});
  if (!parsed.success) {
    return res.status(400).json({ error: 'invalid_body', issues: parsed.error.issues });
  }

  const { flow, input } = parsed.data;

  const allowed = await rateLimitCheck(
    `gemini:flow:${flow}:${user.id}`,
    FLOW_LIMIT,
    FLOW_WINDOW_SECONDS
  );
  if (!allowed) {
    res.setHeader('Retry-After', String(FLOW_WINDOW_SECONDS));
    return res.status(429).json({
      error: 'rate_limited',
      scope: `flow:${flow}`,
      retry_after_seconds: FLOW_WINDOW_SECONDS,
    });
  }

  const handlerFn = FLOW_REGISTRY[flow];
  if (!handlerFn) {
    return res.status(400).json({ error: 'unknown_flow', flow });
  }

  try {
    const ai = getAi();
    const result = await handlerFn(input, ai);
    return res.status(200).json(result);
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

    console.error(`[api/gemini/flow:${flow}] error:`, msg);
    return res.status(502).json({ error: 'gemini_error', detail: msg });
  }
}
