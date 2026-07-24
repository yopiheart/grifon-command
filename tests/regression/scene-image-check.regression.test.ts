// LIVE smoke: does the REAL sceneImageModel output pass the REAL checkSceneImage?
//
// This is the last remaining P4 flag-ON condition (services/producerDeps.ts gateDepsFor:
// "a live smoke proves checkSceneImage passes real sceneImageModel output — thresholds so
// far validated only against synthetic headers"). checkSceneImage HARD-FLAGS a scene and
// drives the only automated reroll in P4, so a false positive here would flag real scenes
// and burn real reroll spend the moment IMAGE_GATE_ENABLED flips on.
//
// The thresholds under test (utils/imageChecks.ts):
//   - aspect within ±2% of the requested ratio
//   - short side >= 704px
//   - header decodable as PNG / JPEG / GIF / WebP
// All three were only ever exercised against hand-built synthetic headers. This file is
// the empirical answer: it generates a real still per aspect and measures what the model
// actually returns.
//
// Skipped by default — opt in with `RUN_IMAGE_GATE_SMOKE=1`, mirroring the RUN_REGRESSION
// convention in script-gen.regression.test.ts so `npm test` never burns image quota.
//
// Run:
//   RUN_IMAGE_GATE_SMOKE=1 npx vitest run tests/regression/scene-image-check.regression.test.ts --reporter=verbose
//   (PowerShell: $env:RUN_IMAGE_GATE_SMOKE='1'; npx vitest run tests/regression/scene-image-check.regression.test.ts --reporter=verbose)
//
// Fidelity: calls the REAL generateSceneImage (real tuned prompt, real imageConfig) and the
// REAL checkSceneImage. Only the /api/gemini/image HOP is replaced — the stub below mirrors
// api/gemini/image.ts's generate branch exactly, which is a pure pass-through
// (`ai.models.generateContent(parsed.data)`), so the request that reaches Gemini is
// byte-identical to production. Auth/rate-limit/quota are the only things bypassed.
//
// Cost: 3 images on gemini-3.1-flash-lite-image (~$0.04 each estimated) = ~$0.12 per run.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi } from 'vitest';
import { GoogleGenAI } from '@google/genai';

// --- 1. Load .env manually (no dotenv dep) -------------------------------

const envPath = resolve(process.cwd(), '.env');
try {
  const envText = readFileSync(envPath, 'utf8');
  for (const rawLine of envText.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let val = line.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  // .env missing — the guard below turns this into an explicit failure
}

// --- 2. Mock supabaseClient so proxyCall passes its auth guard -----------

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'test-token' } } }),
    },
  }),
}));

// --- 3. Route /api/gemini/image straight to the SDK ----------------------
//
// Mirrors api/gemini/image.ts's generate branch: it forwards the parsed body
// verbatim to ai.models.generateContent and returns {candidates, usageMetadata,
// promptFeedback}. Calls the SDK itself makes to googleapis.com pass through to the
// real fetch — otherwise the SDK's own fetch gets recursively re-mocked.

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const originalFetch = globalThis.fetch.bind(globalThis);

const fetchMock = vi.fn(async (url: any, init: any = {}) => {
  const urlStr =
    typeof url === 'string'
      ? url
      : (url?.url as string | undefined) ?? (url?.toString?.() as string | undefined) ?? '';

  if (urlStr.includes('/api/gemini/image')) {
    if (!ai) throw new Error('GEMINI_API_KEY missing from .env');
    const body = JSON.parse(init?.body ?? '{}');
    const response = await ai.models.generateContent(body as any);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        candidates: (response as any).candidates ?? [],
        usageMetadata: (response as any).usageMetadata,
        promptFeedback: (response as any).promptFeedback,
      }),
    } as any;
  }

  return originalFetch(url, init);
});

vi.stubGlobal('fetch', fetchMock);

// Imported AFTER the mocks above are registered.
const { generateSceneImage } = await import('../../services/geminiService.js');
const { checkSceneImage } = await import('../../utils/imageChecks.js');

const RUN = process.env.RUN_IMAGE_GATE_SMOKE === '1';
const ASPECTS = ['9:16', '16:9', '1:1'] as const;

// A deliberately plain scene: this test measures GEOMETRY, not content. Nothing here
// should trip a safety filter or depend on reference images (referenceImageMode 'none').
const SCENE_PROMPT =
  'A simple ceramic coffee mug resting on a plain wooden table near a window, soft daylight.';

describe.skipIf(!RUN)('LIVE: real sceneImageModel output vs real checkSceneImage', () => {
  it('has a GEMINI_API_KEY', () => {
    expect(apiKey, 'GEMINI_API_KEY missing from .env').toBeTruthy();
  });

  for (const aspect of ASPECTS) {
    it(
      `passes the deterministic check at ${aspect}`,
      async () => {
        const dataUrl = await generateSceneImage(
          SCENE_PROMPT,
          aspect,
          '1K',
          {},              // no reference images
          'Global',
          [],              // no brand colors
          'MrBeast',
          undefined,
          undefined,
          0,
          'none'
        );

        const result = await checkSceneImage(dataUrl, aspect);
        const ratio = result.width / result.height;
        const target = aspect === '9:16' ? 9 / 16 : aspect === '16:9' ? 16 / 9 : 1;
        const driftPct = ((ratio - target) / target) * 100;

        // The actual deliverable — the measured geometry, so the ±2% / 704px thresholds
        // can be audited against reality rather than against synthetic headers.
        console.log(
          `[image-gate-smoke] ${aspect}: ${result.width}x${result.height} ` +
            `ratio=${ratio.toFixed(4)} target=${target.toFixed(4)} ` +
            `drift=${driftPct.toFixed(2)}% shortSide=${Math.min(result.width, result.height)} ` +
            `ok=${result.ok}${result.reason ? ` reason=${result.reason}` : ''}`
        );

        expect(result.reason, `checkSceneImage rejected a real ${aspect} still`).toBeUndefined();
        expect(result.ok).toBe(true);
      },
      180_000 // real generation + the 2500ms in-function delay
    );
  }
});
