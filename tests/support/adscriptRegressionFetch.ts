import { vi } from 'vitest';
import type { GoogleGenAI } from '@google/genai';
import { FLOW_REGISTRY } from '../../api/gemini/text.js';

// Evaluation shares production generation, but must never persist COGS or run events.
// Keep this boundary in the shared adapter so live credentials cannot enable writes.
vi.mock('../../api/_lib/modelCosts.js', () => ({ logModelUsage: vi.fn() }));

// Auth, rate limiting, quota and the HTTP schema ladder remain outside this harness.
export function createAdscriptRegressionFetch(
  ai: GoogleGenAI | null,
  originalFetch: typeof fetch
): typeof fetch {
  return async (url: any, init: any = {}) => {
    const urlStr =
      typeof url === 'string'
        ? url
        : ((url?.url as string | undefined) ?? (url?.toString?.() as string | undefined) ?? '');

    if (urlStr.includes('/api/gemini/text')) {
      if (!ai) {
        throw new Error('script-gen.regression: GEMINI_API_KEY missing from .env');
      }
      const body = JSON.parse(init.body as string);

      if (body.flow === 'adscript') {
        const result = await FLOW_REGISTRY.adscript(body.input, ai);
        return { ok: true, status: 200, json: async () => result } as Response;
      }
      if (body.flow) {
        throw new Error(
          `script-gen.regression: flow '${body.flow}' not supported by this mock (v1 covers adscript only)`
        );
      }

      // Legacy passthrough mode — client-built `{ model, contents, config }`.
      const result = await ai.models.generateContent({
        model: body.model,
        contents: body.contents,
        config: body.config,
      });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          text: result.text ?? '',
          candidates: result.candidates ?? [],
          usageMetadata: (result as any).usageMetadata,
          promptFeedback: (result as any).promptFeedback,
        }),
      } as any;
    }

    // Pass through to real fetch (Gemini SDK calling Google's API, etc.)
    return originalFetch(url, init);
  };
}
