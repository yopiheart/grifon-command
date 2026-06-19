// Hook Lab service (engagement Phase 3) — generates surreal, scroll-stopping
// opening-hook variants and renders their frames.
//
// ADDITIVE BY DESIGN: this rides the same /api/gemini/text passthrough +
// /api/gemini/image proxy that generateVideoPrompts / generateSceneImage use,
// but it imports NONE of geminiService's module-private internals and builds a
// NET-NEW prompt (the surreal art direction lives in config/surrealHookSpec.ts).
// The 5 crown-jewel flows, tuned model IDs, and types.ts fields are untouched.

import { getSupabase } from './supabaseClient';
import { triggerQuotaWall } from './quotaWallStore';
import type { MeterUnit } from '../hooks/useQuota';
import type { PlanId } from '../utils/planGate';
import {
  HOOK_TEXT_MODEL,
  HOOK_IMAGE_MODEL,
  HOOK_VARIANT_COUNT,
  SURREAL_HOOK_SPEC,
} from '../config/surrealHookSpec';

export interface HookLabInput {
  /** Short product / brand description the hooks are for. */
  product: string;
  /** Optional extra context (audience, pain, benefit) to sharpen the hooks. */
  context?: string;
  /** Voice of the hook line, e.g. 'Taglish' | 'English'. */
  language?: string;
}

export interface HookVariant {
  id: string;
  /** The spoken/overlaid opening line — the first ~1.5s of the ad. */
  hookLine: string;
  /** One-sentence description of the surreal visual idea. */
  surrealConcept: string;
  /** The image-generation prompt for the surreal hook frame. */
  imagePrompt: string;
}

// --- Local transport ---------------------------------------------------------
// Mirrors geminiService's proxy contract (auth → POST → 402 quota wall) WITHOUT
// importing its private helpers, so this additive feature touches zero tuned
// code. Transport is explicitly "fair game" per services/CLAUDE.md.
const callProxy = async <T>(endpoint: string, params: unknown): Promise<T> => {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);
  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(params),
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      const e: any = new Error('PROXY_TIMEOUT: request exceeded 55s ceiling');
      e.status = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!res.ok) {
    const body: any = await res.json().catch(() => ({}));
    if (res.status === 402 && body?.error === 'quota_exceeded') {
      triggerQuotaWall({
        scope: body.scope as MeterUnit,
        plan: (body.plan as PlanId) ?? 'free',
        used: Number(body.used) || 0,
        limit: Number(body.limit) || 0,
      });
    }
    const e: any = new Error(`PROXY_ERROR_${res.status}: ${body?.error ?? 'unknown'}`);
    e.status = res.status;
    e.body = body;
    throw e;
  }
  return (await res.json()) as T;
};

// --- Parsing -----------------------------------------------------------------

/** Strip ```json fences a model sometimes wraps JSON in. */
const stripFence = (raw: string): string =>
  raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

const randomId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `hook_${Math.random().toString(36).slice(2, 10)}`;

/** Coerce a raw model object into a HookVariant, defending against missing fields. */
export const toHookVariant = (raw: any): HookVariant => ({
  id: randomId(),
  hookLine: String(raw?.hookLine ?? raw?.hook ?? '').trim(),
  surrealConcept: String(raw?.surrealConcept ?? raw?.concept ?? '').trim(),
  imagePrompt: String(raw?.imagePrompt ?? raw?.prompt ?? '').trim(),
});

/** Parse the model's JSON into clean, usable HookVariants (drops empties). */
export const parseHookVariants = (rawText: string): HookVariant[] => {
  let parsed: any;
  try {
    parsed = JSON.parse(stripFence(rawText));
  } catch {
    return [];
  }
  const arr = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.variants)
      ? parsed.variants
      : [];
  return arr
    .map(toHookVariant)
    .filter((v: HookVariant) => Boolean(v.hookLine) && Boolean(v.imagePrompt));
};

// --- Generation --------------------------------------------------------------

const buildConceptPrompt = (input: HookLabInput): string =>
  `
You are a viral short-form ad director. Produce ${HOOK_VARIANT_COUNT} DISTINCT
surreal opening hooks (the first ~1.5 seconds) for this product — each pairing a
scroll-stopping line with a surreal visual idea.

PRODUCT: ${input.product}
${input.context ? `CONTEXT: ${input.context}` : ''}
HOOK LINE LANGUAGE: ${input.language || 'Taglish (premium, natural Filipino-English mix)'}

${SURREAL_HOOK_SPEC}

For each hook return:
- "hookLine": the opening line (max ~12 words, pattern-interrupt, no hashtags).
- "surrealConcept": one sentence describing the impossible/dreamlike visual.
- "imagePrompt": a vivid image-generation prompt for that surreal frame, applying
  the ART DIRECTION above (dark cinematic, single gold accent, product truthful,
  NO on-image text).

Return ONLY a JSON array of ${HOOK_VARIANT_COUNT} objects with exactly those three
string fields. No prose, no markdown.
`.trim();

/** Generate N surreal hook concepts (text only — cheap, not metered). */
export const generateSurrealHooks = async (input: HookLabInput): Promise<HookVariant[]> => {
  const resp = await callProxy<{ text?: string }>('/api/gemini/text', {
    model: HOOK_TEXT_MODEL,
    contents: { parts: [{ text: buildConceptPrompt(input) }] },
    config: { responseMimeType: 'application/json' },
  });
  const variants = parseHookVariants(resp.text ?? '');
  if (variants.length === 0) throw new Error('HOOK_GENERATION_EMPTY');
  return variants;
};

const buildFramePrompt = (variant: HookVariant): string =>
  `
${SURREAL_HOOK_SPEC}

SURREAL HOOK FRAME TO RENDER:
${variant.imagePrompt}

(Concept: ${variant.surrealConcept})
Vertical 9:16 social-ad frame. Single focal point. Absolutely no text on the image.
`.trim();

/** Render the surreal frame for one variant (metered against the images quota). */
export const generateHookFrame = async (variant: HookVariant): Promise<string> => {
  const resp = await callProxy<{ candidates?: any[] }>('/api/gemini/image', {
    model: HOOK_IMAGE_MODEL,
    contents: { parts: [{ text: buildFramePrompt(variant) }] },
    config: { imageConfig: { aspectRatio: '9:16', imageSize: '1K' } },
  });
  const part = resp.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData);
  if (part?.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
  throw new Error('HOOK_FRAME_EMPTY');
};
