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

// --- 5. Shared assertion helper -----------------------------------------
//
// Every regression test runs the same shape check + audit-print pipeline.
// Centralizing keeps 8+ tests below readable.

interface BusinessInfoFixture {
  product: string;
  audience: string;
  benefit: string;
  painPoint: string;
  separator: string;
  features: string;
  productImageUrls: any[];
  brandColors: string;
}

async function runScript(
  fixture: BusinessInfoFixture,
  scriptType: 'MrBeast' | 'Testimonial',
  brand: string,
  offer: string,
  label: string
) {
  const result = await generateAdScript(
    { ...fixture, scriptType } as any,
    brand,
    'Taglish',
    offer
  );

  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify(result, null, 2));
  console.log(`=== /${label} ===\n`);

  expect(result.hook1).toBeDefined();
  expect(result.hook2).toBeDefined();
  expect(Array.isArray(result.hook1)).toBe(true);
  expect(Array.isArray(result.hook2)).toBe(true);
  expect((result.hook1 as string[]).length).toBeGreaterThan(0);
  expect((result.hook2 as string[]).length).toBeGreaterThan(0);
  expect(Array.isArray(result.body)).toBe(true);
  expect((result.body as string[]).length).toBeGreaterThanOrEqual(5);
  expect(typeof result.strategicAudit).toBe('string');

  return result;
}

// --- 6. Test fixtures ----------------------------------------------------
//
// Post Step 2 consolidation (2026-05-08): goal + problem fields dropped
// from BusinessInfo. benefit (Dream Result) and painPoint (3 AM Worry)
// now carry the deeper-layer outcome / pain content for both formulas.
//
// Stress-test fixtures (Service / Skincare / Gym) are intentionally
// NOT OFW-coffee-shaped — they probe whether the prompt's hardcoded
// example archetypes (OFW family / Filipino mom / Corporate) generalize
// to other Filipino-SMB product categories or whether the model copies
// the closest archetype literally.

// Bukidnon Brew — original baseline (OFW-wife buyer audience)
const bukidnonFixture: BusinessInfoFixture = {
  product:
    '250g single-origin Bukidnon highland coffee beans, medium roast, resealable valve bag',
  audience:
    'OFW wives in Pinas sending pasalubong-style care packages to husbands abroad',
  benefit:
    'Wakes up energized in Saudi, feels closer to pamilya every morning, sweldo stretches further than Saudi cafe runs',
  painPoint:
    '3 AM, hindi makatulog kasi 5 years na siya sa abroad — naiisip na lang kung kayang-kaya pa magtagal',
  separator: 'Direct sa farmer sa Bukidnon, hindi blend ng kung anu-ano',
  features:
    'Single-origin · medium roast · resealable valve bag · 250g · ships internationally',
  productImageUrls: [],
  brandColors: '',
};

// Stress test 1 — Service business (cleaning, BGC professionals)
const cleaningFixture: BusinessInfoFixture = {
  product: 'Eco-friendly home cleaning service in Metro Manila',
  audience: "Working professionals 28-40 in Makati/BGC who haven't cleaned in 3 weeks",
  benefit:
    'May 4 hours back every weekend, Saturday morning hindi na vacuum-vacuum, may oras for hobbies and family',
  painPoint:
    '3 AM Sunday, hindi makatulog kasi tinatakbo na sa isip ang dapat i-deep clean bago dumating ang bisita on Tuesday',
  separator: 'Plant-based cleaning products, certified safe sa mga bata at pets',
  features:
    'Same-day booking · 2-hour to 5-hour sessions · 100% satisfaction guarantee · Background-checked cleaners',
  productImageUrls: [],
  brandColors: '',
};

// Stress test 2 — Skincare (adult acne, Filipino millennial women)
const skincareFixture: BusinessInfoFixture = {
  product: 'Niacinamide + Tea Tree serum for adult acne, 30ml dropper',
  audience:
    'Filipino millennial women 25-35 dealing with adult acne na hindi nawawala kahit P5K worth of products',
  benefit:
    'Walang acne sa morning meeting, kayang mag-sukat ng makeup nang hindi kasama ang acne, mas confident sa Zoom calls',
  painPoint:
    '3 AM, naka-mirror pa rin pagkatapos ng kape niya, hinahanap kung saan kaya nagkakapimples na naman bukas',
  separator:
    'Inumin lang at may visible results sa 14 days, hindi P10K facial sessions',
  features:
    'Niacinamide 5% · Tea Tree · Hyaluronic acid · Fragrance-free · 30ml lasts 60 days',
  productImageUrls: [],
  brandColors: '',
};

// Stress test 3 — Gym/fitness (online powerbuilding coaching)
const gymFixture: BusinessInfoFixture = {
  product:
    '12-week online powerbuilding coaching program for Filipino gym goers',
  audience:
    'Pinoy gym bros 25-30 stuck at the same weight for 2 years, naka-3-month plateau na',
  benefit:
    'Naka-add ng 10 kgs sa bench in 12 weeks, sa wakas kayang mag-deadlift double bodyweight, may abs na visible kahit Christmas season',
  painPoint:
    '3 AM gym dreams habang nasa Friday night drink, naka-3 years na nagym pero halos same lang ang itsura sa salamin',
  separator:
    'Customized program kada 2 weeks, hindi cookie-cutter PDF, may video form check',
  features:
    '12-week program · Custom macros · Form check videos · Weekly check-ins · Free supplement guide',
  productImageUrls: [],
  brandColors: '',
};

// --- 7. Tests ------------------------------------------------------------

const SHOULD_RUN = !!process.env.RUN_REGRESSION;

describe.skipIf(!SHOULD_RUN)('Baseline — Bukidnon Brew + OFW-wife audience', () => {
  it(
    'MrBeast',
    async () => {
      await runScript(
        bukidnonFixture,
        'MrBeast',
        'Bukidnon Brew',
        'First 50 customers, free shipping + recipe ebook',
        'BUKIDNON BREW — MrBeast'
      );
    },
    90_000
  );

  it(
    'TESTIMONIAL',
    async () => {
      await runScript(
        bukidnonFixture,
        'Testimonial',
        'Bukidnon Brew',
        'First 50 customers, free shipping + recipe ebook',
        'BUKIDNON BREW — TESTIMONIAL'
      );
    },
    90_000
  );
});

describe.skipIf(!SHOULD_RUN)('Stress Test — Service Business (Cleaning, BGC)', () => {
  it(
    'MrBeast',
    async () => {
      await runScript(
        cleaningFixture,
        'MrBeast',
        'MalinisPH',
        'First 20 customers get 50% off first cleaning + free deep clean upgrade',
        'MALINISPH — MrBeast'
      );
    },
    90_000
  );

  it(
    'TESTIMONIAL',
    async () => {
      await runScript(
        cleaningFixture,
        'Testimonial',
        'MalinisPH',
        'First 20 customers get 50% off first cleaning + free deep clean upgrade',
        'MALINISPH — TESTIMONIAL'
      );
    },
    90_000
  );
});

describe.skipIf(!SHOULD_RUN)('Stress Test — Skincare (Adult Acne)', () => {
  it(
    'MrBeast',
    async () => {
      await runScript(
        skincareFixture,
        'MrBeast',
        'Glaze PH',
        'First 100 buyers get free dermatologist consultation + skincare assessment',
        'GLAZE PH — MrBeast'
      );
    },
    90_000
  );

  it(
    'TESTIMONIAL',
    async () => {
      await runScript(
        skincareFixture,
        'Testimonial',
        'Glaze PH',
        'First 100 buyers get free dermatologist consultation + skincare assessment',
        'GLAZE PH — TESTIMONIAL'
      );
    },
    90_000
  );
});

describe.skipIf(!SHOULD_RUN)('Stress Test — Gym/Fitness (Online Coaching)', () => {
  it(
    'MrBeast',
    async () => {
      await runScript(
        gymFixture,
        'MrBeast',
        'BulkPH Coach',
        'First 30 sign-ups get 25% off + free 1-week meal plan',
        'BULKPH COACH — MrBeast'
      );
    },
    90_000
  );

  it(
    'TESTIMONIAL',
    async () => {
      await runScript(
        gymFixture,
        'Testimonial',
        'BulkPH Coach',
        'First 30 sign-ups get 25% off + free 1-week meal plan',
        'BULKPH COACH — TESTIMONIAL'
      );
    },
    90_000
  );
});
