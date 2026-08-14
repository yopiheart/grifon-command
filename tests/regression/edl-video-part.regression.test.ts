// THE CANARY: does an EDL request carrying exactly ONE video part come back 200?
//
// This is the assertion whose absence let the EDL go blind for two weeks. On
// 2026-08-14 the isolation was: same model, same endpoint, same second — ZERO
// video parts returns 200, exactly ONE returns 429 RESOURCE_EXHAUSTED, because
// we were passing the R2 object URL as fileData.fileUri and Gemini only accepts
// URIs minted by its own Files API. Nothing in CI could see that: every unit
// test mocks the proxy. This test calls the real model with a real key.
//
// Skipped by default — opt in with RUN_REGRESSION=1, same gate as the other
// live regressions, so `npm test` never burns quota.
//
// Run:
//   RUN_REGRESSION=1 npx vitest run tests/regression/edl-video-part.regression.test.ts --reporter=verbose
//   (PowerShell: $env:RUN_REGRESSION='1'; npx vitest run tests/regression/edl-video-part.regression.test.ts --reporter=verbose)
//
// How it mirrors production:
//   - /api/gemini/files/upload is stubbed to do exactly what the real handler
//     does after its download step: ai.files.upload(file) → poll files.get until
//     it leaves PROCESSING → return { uri, name }. The fixture is a local MP4
//     instead of an R2 presign, so this tests the Gemini contract, not R2.
//   - /api/gemini/text is stubbed to the SDK, so the prompt, the parts array and
//     the model ID are the real ones from services/geminiService.ts.
//
// Asserts:
//   - EXACTLY ONE fileData part reached the wire, and its fileUri is a files/* URI.
//   - The call did not 429 / throw (that is the regression).
//   - The EDL parsed and carries one scene.
//
// Cost: one Files API upload (free) + one EDL generation (~$0.01).
// Next step per workflows/edl_files_api_plan.md: wire into the Tier 3 nightly loop.

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
  // .env missing — the guard below reports it.
}

// --- 2. Mock supabaseClient so proxyCall passes the auth guard -----------

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));

// --- 3. Proxy stubs: files/upload + text, both onto the real SDK ---------

const SHOULD_RUN = !!process.env.RUN_REGRESSION;
const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const originalFetch = globalThis.fetch.bind(globalThis);

const FIXTURE = resolve(process.cwd(), 'tests/fixtures/sample-batch/before_after-run1-complete-raw.mp4');

// Every fileData part that reached /api/gemini/text, across all attempts.
let videoPartsOnWire: any[] = [];
let edlHttpStatus: number | null = null;

const fetchMock = vi.fn(async (url: any, init: any = {}) => {
  const urlStr = typeof url === 'string' ? url : (url?.url ?? url?.toString?.() ?? '');

  // Mirrors api/gemini/files/upload.ts, minus the R2 download.
  if (urlStr.includes('/api/gemini/files/upload')) {
    if (!ai) throw new Error('edl-video-part: GEMINI_API_KEY missing from .env');
    let file: any = await ai.files.upload({ file: FIXTURE, config: { mimeType: 'video/mp4' } });
    const deadline = Date.now() + 120_000;
    while (file?.state === 'PROCESSING') {
      if (Date.now() > deadline) throw new Error('Files API upload timed out (>120s)');
      await new Promise((r) => setTimeout(r, 3000));
      file = await ai.files.get({ name: file.name });
    }
    if (file?.state === 'FAILED' || !file?.uri) throw new Error('Files API upload FAILED');
    return new Response(JSON.stringify({ uri: file.uri, name: file.name }));
  }

  if (urlStr.includes('/api/gemini/text')) {
    if (!ai) throw new Error('edl-video-part: GEMINI_API_KEY missing from .env');
    const body = JSON.parse(init.body as string);
    videoPartsOnWire = (body.contents?.parts ?? []).filter((p: any) => p.fileData);
    try {
      const r: any = await ai.models.generateContent({
        model: body.model,
        contents: body.contents,
        config: body.config,
      } as any);
      edlHttpStatus = 200;
      return new Response(
        JSON.stringify({
          text: r.text ?? '',
          candidates: r.candidates ?? [],
          usageMetadata: r.usageMetadata,
          promptFeedback: r.promptFeedback,
        }),
      );
    } catch (e: any) {
      // Surface the upstream status so a 429 fails loudly instead of being
      // retried into an opaque timeout by retryWithBackoff.
      edlHttpStatus = e?.status ?? e?.code ?? -1;
      throw e;
    }
  }

  // Pass through — the SDK's own Google calls.
  return originalFetch(url, init);
});
vi.stubGlobal('fetch', fetchMock);

// --- 4. Import the unit under test (after the stubs) ---------------------

const { generateEditDecisionList } = await import('../../services/geminiService.js');

// --- 5. The canary --------------------------------------------------------

describe.skipIf(!SHOULD_RUN)('EDL live — one attached video part', () => {
  it(
    'returns 200 (not 429) with exactly ONE Files-API video part attached',
    async () => {
      expect(apiKey, 'GEMINI_API_KEY missing from .env').toBeTruthy();

      const edl = await generateEditDecisionList({
        sceneBatch: [
          {
            sceneIdx: 0,
            scriptLine: 'Wait until you see this.',
            renderedUrl: 'https://example.com/scene0.mp4', // uploaded via the stub above
            type: 'talking' as const,
          },
        ],
        audioOverlays: [],
        aspectRatio: '9:16' as const,
        targetPlatform: 'tiktok' as const,
        finalScript: 'Wait until you see this.',
      } as any);

      // The regression itself: one video part on the wire, and a 200 behind it.
      expect(videoPartsOnWire.length).toBe(1);
      expect(videoPartsOnWire[0].fileData.fileUri).toMatch(/^(files\/|https:\/\/generativelanguage\.)/);
      expect(edlHttpStatus).toBe(200);

      // And the model actually answered with a usable EDL.
      expect(Array.isArray(edl.scenes)).toBe(true);
      expect(edl.scenes.length).toBe(1);
    },
    300_000,
  );
});
