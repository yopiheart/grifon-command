// COGS telemetry for Grifon's AI generation calls.
//
// Server-only (lives in api/_lib, never reaches the client bundle). Phase 1 of
// the cost-aware-routing plan: quantify where generation spend actually goes so
// any model-routing decision is data-driven rather than vibes-driven. See
// workflows/cogs_analysis.md for the methodology and the resulting decision.
//
// ⚠️ Text rates are billing-grade as of 2026-07-22 (verified against the live
// Google pricing page, https://ai.google.dev/gemini-api/docs/pricing, standard
// tier). The image and video rows remain ORDER-OF-MAGNITUDE ESTIMATES — confirm
// those against the live provider pages before treating them as billing-grade.
// The RELATIVE ratios that drive the routing decision (text << image << video)
// hold regardless of the exact cents.

export interface UsageMetadata {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  thoughtsTokenCount?: number;
  totalTokenCount?: number;
}

type TextPrice = { kind: 'text'; inputPerMTok: number; outputPerMTok: number };
type ImagePrice = { kind: 'image'; perImage: number };
type VideoPrice = { kind: 'video'; perSecondUsd: number };

// USD per 1M tokens. Text rows are billing-grade (see header warning); the image
// and video rows remain estimates. Keyed by the model IDs Grifon uses (mirrors
// api/_lib/prompts.ts MODEL_* and services/geminiService.ts). The Omni key mirrors
// OMNI_MODEL_ID's default in api/gemini/omni-video.ts; the ~$0.10/sec figure
// matches the editing lab's observed pricing (workflows/omni_edit_presets.md).
const MODEL_PRICES: Record<string, TextPrice | ImagePrice | VideoPrice> = {
  'gemini-3.1-flash-lite': { kind: 'text', inputPerMTok: 0.25, outputPerMTok: 1.5 },
  'gemini-3.5-flash': { kind: 'text', inputPerMTok: 1.5, outputPerMTok: 9.0 },
  'gemini-3.6-flash': { kind: 'text', inputPerMTok: 1.5, outputPerMTok: 7.5 },
  'gemini-3.5-flash-lite': { kind: 'text', inputPerMTok: 0.3, outputPerMTok: 2.5 },
  'gemini-3.1-flash-image-preview': { kind: 'image', perImage: 0.04 },
  'gemini-omni-flash-preview': { kind: 'video', perSecondUsd: 0.1 },
};

const DEFAULT_TEXT_PRICE: TextPrice = { kind: 'text', inputPerMTok: 0.25, outputPerMTok: 1.5 };
const DEFAULT_PER_IMAGE = 0.04;
const DEFAULT_PER_SECOND = 0.1;

export function estimateTextCostUsd(model: string, usage?: UsageMetadata): number {
  const price = MODEL_PRICES[model];
  const p = price && price.kind === 'text' ? price : DEFAULT_TEXT_PRICE;
  const inTok = usage?.promptTokenCount ?? 0;
  // Google bills thinking (thoughts) tokens at the output rate — the pricing page
  // states the output price includes thinking tokens. Missing counts read as 0.
  const outTok = (usage?.candidatesTokenCount ?? 0) + (usage?.thoughtsTokenCount ?? 0);
  return (inTok / 1e6) * p.inputPerMTok + (outTok / 1e6) * p.outputPerMTok;
}

export function estimateImageCostUsd(model: string, images = 1): number {
  const price = MODEL_PRICES[model];
  const perImage = price && price.kind === 'image' ? price.perImage : DEFAULT_PER_IMAGE;
  return perImage * images;
}

export function estimateVideoCostUsd(model: string, seconds = 0): number {
  const price = MODEL_PRICES[model];
  const perSecond = price && price.kind === 'video' ? price.perSecondUsd : DEFAULT_PER_SECOND;
  return perSecond * seconds;
}

// Structured one-line log for beta-traffic COGS monitoring. Fire-and-forget:
// logging must NEVER break a generation request, so everything is wrapped.
export function logModelUsage(label: string, model: string, usage?: UsageMetadata): void {
  try {
    console.log(
      JSON.stringify({
        tag: 'cogs',
        kind: 'text',
        label,
        model,
        inputTokens: usage?.promptTokenCount ?? null,
        outputTokens: usage?.candidatesTokenCount ?? null,
        thoughtsTokens: usage?.thoughtsTokenCount ?? null,
        totalTokens: usage?.totalTokenCount ?? null,
        estUsd: Number(estimateTextCostUsd(model, usage).toFixed(6)),
      })
    );
  } catch {
    /* never throw from telemetry */
  }
}

export function logImageUsage(label: string, model: string, images = 1): void {
  try {
    console.log(
      JSON.stringify({
        tag: 'cogs',
        kind: 'image',
        label,
        model,
        images,
        estUsd: Number(estimateImageCostUsd(model, images).toFixed(6)),
      })
    );
  } catch {
    /* never throw from telemetry */
  }
}

export function logVideoUsage(label: string, model: string, seconds = 0): void {
  try {
    console.log(
      JSON.stringify({
        tag: 'cogs',
        kind: 'video',
        label,
        model,
        seconds,
        estUsd: Number(estimateVideoCostUsd(model, seconds).toFixed(6)),
      })
    );
  } catch {
    /* never throw from telemetry */
  }
}
