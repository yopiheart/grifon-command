// services/imageGateService.ts — thin CLIENT caller for the scene-image QA gate (P4).
//
// Posts a still to the EXISTING /api/gemini/image handler in its opt-in gate mode
// (body `{ gateCheck: {...} }`) so the gate rides the image endpoint's auth +
// rate-limit + images-quota metering like any other image call (a cheap vision
// call, billed as one — no unmetered path). The server extracts observations and
// computes the verdict; this client never sees the prompt/judge (it MUST NOT
// import api/_lib/imageGate.ts — that would leak the eval prompt into the bundle).
//
// The verdict/observation SHAPES are duplicated here on purpose: the server file
// stays out of the client bundle, and the orchestrator imports these types
// type-only. Best-effort transport — a network/auth failure throws so the
// orchestrator's own try/catch skips the gate (fail-open); the SERVER also fails
// open (verdict.pass:true) on any infra error, so a reachable-but-degraded gate
// still returns a pass.

import { getSupabase } from './supabaseClient';
import { getActiveRunId } from './runTelemetry';

export interface ImageGateObservations {
  personPresent: boolean;
  personMatchesReference: boolean | null;
  productLabelText: string | null;
  labelLegible: boolean | null;
  compositionNotes: string;
}

export interface ImageGateVerdict {
  pass: boolean;
  flags: string[];
  compositionNotes?: string;
  reason?: string;
}

export interface ImageGateResult {
  observations: ImageGateObservations | null;
  verdict: ImageGateVerdict;
}

export interface ImageGateCheckParams {
  /** The generated scene still (base64 / data URL). */
  imageBase64: string;
  /** The locked avatar reference, sent only for identity-bearing scenes. */
  referenceImageBase64?: string;
  /** The product name the label should read, sent only for product-bearing scenes. */
  expectedLabelText?: string;
  /** The scene's reference-image mode (drives the server-side judge). */
  referenceMode: string;
}

/**
 * Call the image-endpoint gate mode and return the server-computed
 * `{ observations, verdict }`. The verdict is computed SERVER-side so a client
 * can't skew keep-vs-flag. Throws on transport/auth failure (the orchestrator
 * catches and skips — fail-open). Aborts 5s before Vercel's 60s ceiling.
 */
export async function imageGateCheck(params: ImageGateCheckParams): Promise<ImageGateResult> {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 55000);
  const activeRunId = getActiveRunId();
  try {
    const res = await fetch('/api/gemini/image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(activeRunId ? { 'x-run-id': activeRunId } : {}),
      },
      body: JSON.stringify({ gateCheck: params }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({} as any));
      throw new Error(`IMAGE_GATE_${res.status}: ${body?.error ?? 'unknown'}`);
    }
    return (await res.json()) as ImageGateResult;
  } finally {
    clearTimeout(timeoutId);
  }
}
