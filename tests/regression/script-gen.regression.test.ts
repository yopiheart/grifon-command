// Live regression tests for generateAdScript.
//
// Unlike tests/unit/geminiService.schemas.test.ts, this file does NOT mock
// the Gemini response — it calls the real model with a real GEMINI_API_KEY
// and prints the generated script JSON so a human (or CMO agent) can audit
// it. Replaces the manual "open the wizard, fill 8 fields, click generate,
// screenshot the script" loop.
//
// Skipped by default — opt in with `RUN_REGRESSION=1`. This prevents
// `npm test` from accidentally burning Gemini quota in CI or watch mode.
//
// Run:
//   RUN_REGRESSION=1 npx vitest run tests/regression/script-gen.regression.test.ts --reporter=verbose
//   (PowerShell: $env:RUN_REGRESSION='1'; npx vitest run tests/regression/script-gen.regression.test.ts --reporter=verbose)
//
// What it does:
//   1. Loads GEMINI_API_KEY from .env (no dotenv dep — manual parser).
//   2. Mocks ../../services/supabaseClient so proxyCall passes the
//      access_token guard with a fake "test-token".
//   3. Stubs global fetch to recognize calls to /api/gemini/text and
//      route them straight to the @google/genai SDK using GEMINI_API_KEY.
//      Same code path as production geminiService.ts — same prompt
//      construction, same response parsing.
//   4. Calls generateAdScript with the Bukidnon Brew + OFW-wife test
//      fixtures for both MrBeast and TESTIMONIAL formulas. Prints the
//      full script JSON (hooks, body, strategicAudit) for human review.
//
// What it asserts (light, structural):
//   - hook1 / hook2 / body arrays exist and are non-empty (Hook starvation
//     guard — 5357780 / 651a993).
//   - strategicAudit string exists.
//   - body has at least 5 lines (sanity check on completeness).
//
// What it does NOT assert:
//   - Content quality. That's the human / CMO agent reviewing console output.
//
// Cost: each test = one Gemini text generation call (~$0.001-0.01 depending
// on model + prompt length). Two tests per run = ~$0.02 max. Cheap enough
// to run on every prompt-tuning iteration.

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
  // .env missing — tests will fail with explicit guard below
}

// --- 2. Mock supabaseClient so proxyCall passes auth ---------------------

vi.mock('../../services/supabaseClient', () => ({
  getSupabase: () => ({
    auth: {
      getSession: async () => ({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  }),
}));

// --- 3. Build the Gemini-direct fetch stub -------------------------------
//
// Two URL classes flow through this stub:
//   1. /api/gemini/text   — fired by services/geminiService.ts proxyCall.
//      Intercept and route to the @google/genai SDK directly using the
//      key from .env, bypassing the Vercel proxy + Supabase auth.
//   2. https://generativelanguage.googleapis.com/...  — fired by the
//      @google/genai SDK itself when we call ai.models.generateContent
//      from inside this stub. Pass through to the real fetch — otherwise
//      the SDK's own fetch gets recursively re-mocked and the Gemini
//      call never escapes the test process.

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const originalFetch = globalThis.fetch.bind(globalThis);

const fetchMock = vi.fn(async (url: any, init: any = {}) => {
  const urlStr =
    typeof url === 'string'
      ? url
      : (url?.url as string | undefined) ?? (url?.toString?.() as string | undefined) ?? '';

  if (urlStr.includes('/api/gemini/text')) {
    if (!ai) {
      throw new Error('script-gen.regression: GEMINI_API_KEY missing from .env');
    }
    const body = JSON.parse(init.body as string);
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
});
vi.stubGlobal('fetch', fetchMock);

// --- 4. Import the unit under test (after stubs) -------------------------

const { generateAdScript } = await import('../../services/geminiService');

// --- 5. Test fixtures (Bukidnon Brew + OFW-wife buyer audience) ----------

const baseBusinessInfo = {
  product:
    '250g single-origin Bukidnon highland coffee beans, medium roast, resealable valve bag',
  audience:
    'OFW wives in Pinas sending pasalubong-style care packages to husbands abroad',
  goal: 'Wakes up at 5 AM Saudi time with kape that tastes like Pinas, less homesick mornings',
  benefit:
    'Feels closer to pamilya every morning, more focus at work, sweldo stretches further than Saudi cafe runs',
  problem:
    'Saudi instant coffee is bland and reminds them they are far from home',
  painPoint:
    '5 years away from family — every Saudi morning is another reminder of what they are missing',
  separator: 'Direct sa farmer sa Bukidnon, hindi blend ng kung anu-ano',
  features:
    'Single-origin · medium roast · resealable valve bag · 250g · ships internationally',
  productImageUrls: [],
  brandColors: '',
};

const TEST_BRAND = 'Bukidnon Brew';
const TEST_OFFER = 'First 50 customers, free shipping + recipe ebook';

// --- 6. Tests ------------------------------------------------------------

describe.skipIf(!process.env.RUN_REGRESSION)('Script Generation Regression', () => {
  it(
    'MrBeast — Bukidnon Brew + OFW-wife audience',
    async () => {
      const result = await generateAdScript(
        { ...baseBusinessInfo, scriptType: 'MrBeast' } as any,
        TEST_BRAND,
        'Taglish',
        TEST_OFFER
      );

      console.log('\n=================== MrBeast ===================');
      console.log(JSON.stringify(result, null, 2));
      console.log('=================== /MrBeast ==================\n');

      expect(result.hook1).toBeDefined();
      expect(result.hook2).toBeDefined();
      expect(Array.isArray(result.hook1)).toBe(true);
      expect(Array.isArray(result.hook2)).toBe(true);
      expect((result.hook1 as string[]).length).toBeGreaterThan(0);
      expect((result.hook2 as string[]).length).toBeGreaterThan(0);
      expect(Array.isArray(result.body)).toBe(true);
      expect((result.body as string[]).length).toBeGreaterThanOrEqual(5);
      expect(typeof result.strategicAudit).toBe('string');
    },
    90_000
  );

  it(
    'TESTIMONIAL — Bukidnon Brew + OFW-wife audience',
    async () => {
      const result = await generateAdScript(
        { ...baseBusinessInfo, scriptType: 'Testimonial' } as any,
        TEST_BRAND,
        'Taglish',
        TEST_OFFER
      );

      console.log('\n================== TESTIMONIAL ==================');
      console.log(JSON.stringify(result, null, 2));
      console.log('================== /TESTIMONIAL =================\n');

      expect(result.hook1).toBeDefined();
      expect(result.hook2).toBeDefined();
      expect(Array.isArray(result.hook1)).toBe(true);
      expect(Array.isArray(result.hook2)).toBe(true);
      expect((result.hook1 as string[]).length).toBeGreaterThan(0);
      expect((result.hook2 as string[]).length).toBeGreaterThan(0);
      expect(Array.isArray(result.body)).toBe(true);
      expect((result.body as string[]).length).toBeGreaterThanOrEqual(5);
      expect(typeof result.strategicAudit).toBe('string');
    },
    90_000
  );
});
