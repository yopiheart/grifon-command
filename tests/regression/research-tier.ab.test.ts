// A/B eval harness for the "research tier" Gemini calls.
//
// Grifon routes six non-crown-jewel flows through researchTextModel
// (gemini-3.6-flash after the Slice-2 flip; the premise-check flow stays pinned
// to gemini-3.5-flash via premiseCheckModel). This harness replays all six against
// BOTH a 3.5-flash arm (A) and a 3.6-flash arm (B) using identical, fixed inputs,
// then writes a side-by-side report a human / LLM grader can review. It does NOT
// decide a winner — asserts are structural only (each arm either errored or
// produced parseable output of the right shape). The interceptor treats both
// research-tier model IDs as swappable, so arm forcing keeps working post-flip.
//
// Skipped by default — opt in with `RUN_AB=1`. This keeps `npm test` from
// burning Gemini quota (12 live calls per run).
//
// Run:
//   RUN_AB=1 npx vitest run tests/regression/research-tier.ab.test.ts --reporter=verbose
//   (PowerShell: $env:RUN_AB='1'; npx vitest run tests/regression/research-tier.ab.test.ts --reporter=verbose)
//
// Modeled on tests/regression/script-gen.regression.test.ts — same manual .env
// parser, same supabaseClient mock, same Gemini-direct fetch stub (all six
// target calls use the LEGACY passthrough shape `{ model, contents, config }`,
// none use `flow`).
//
// Outputs (under .tmp/research-ab/):
//   - results.json — machine-readable per-flow-per-arm records.
//   - report.md    — human/LLM-readable side-by-side tables + output excerpts.

import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { GoogleGenAI } from '@google/genai';
// Plain server-side COGS helper (no client bundle coupling — safe to import here).
import { estimateTextCostUsd } from '../../api/_lib/modelCosts.js';

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
  // .env missing — the guard below throws with an explicit message.
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

// --- 3. Gemini-direct fetch stub + A/B model swap ------------------------
//
// Two URL classes flow through this stub:
//   1. /api/gemini/text — fired by services/geminiService.ts proxyCall. Intercept,
//      apply the A/B model swap, route to the @google/genai SDK directly.
//   2. https://generativelanguage.googleapis.com/... — fired by the SDK itself
//      (generateContent + the Files API upload/get below). Pass through to the
//      real fetch, or the SDK's own calls get recursively re-mocked and never
//      escape the process.

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const originalFetch = globalThis.fetch.bind(globalThis);

// Set by the test loop before each flow-arm. When set AND the client sent the
// research-tier model, the interceptor swaps to this model.
let currentTargetModel: string | null = null;

interface CallMetrics {
  model: string;
  latencyMs: number;
  usage: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    thoughtsTokenCount?: number;
    totalTokenCount?: number;
  };
  estUsd: number;
}
// Overwritten on every intercepted /api/gemini/text call; the test loop reads it
// after the flow function returns. On a retry, the LAST (successful) call wins.
let lastCall: CallMetrics | null = null;

const fetchMock = vi.fn(async (url: any, init: any = {}) => {
  const urlStr =
    typeof url === 'string'
      ? url
      : (url?.url as string | undefined) ?? (url?.toString?.() as string | undefined) ?? '';

  if (urlStr.includes('/api/gemini/text')) {
    if (!ai) {
      throw new Error('research-tier.ab: GEMINI_API_KEY missing from .env');
    }
    const body = JSON.parse(init.body as string);

    // A/B swap. The target flows send the legacy passthrough shape
    // `{ model, contents, config }` on a research-tier model. After the Slice-2
    // flip, production routes those flows through gemini-3.6-flash, while the
    // premise-check flow stays pinned to gemini-3.5-flash (premiseCheckModel) —
    // both are swappable so arm forcing keeps re-testing every flow on either arm.
    let effModel: string = body.model;
    let config: any = body.config;
    if (
      (body.model === 'gemini-3.5-flash' || body.model === 'gemini-3.6-flash') &&
      currentTargetModel
    ) {
      effModel = currentTargetModel;
      // Google deprecated thinking_budget on the newer models; the approved
      // mapping is thinkingLevel:'medium'. Map symmetrically so either arm gets a
      // config the effective target accepts. Only the EDL flow sets thinking.
      if (
        currentTargetModel === 'gemini-3.6-flash' &&
        config?.thinkingConfig?.thinkingBudget != null
      ) {
        config = { ...config, thinkingConfig: { thinkingLevel: 'medium' } };
      } else if (
        currentTargetModel === 'gemini-3.5-flash' &&
        config?.thinkingConfig?.thinkingLevel != null
      ) {
        config = { ...config, thinkingConfig: { thinkingBudget: 4000 } };
      }
    }

    const t0 = performance.now();
    const r: any = await ai.models.generateContent({
      model: effModel,
      contents: body.contents,
      config,
    } as any);
    const latencyMs = performance.now() - t0;

    const usage = (r.usageMetadata ?? {}) as CallMetrics['usage'];
    lastCall = {
      model: effModel,
      latencyMs,
      usage: {
        promptTokenCount: usage.promptTokenCount,
        candidatesTokenCount: usage.candidatesTokenCount,
        thoughtsTokenCount: usage.thoughtsTokenCount,
        totalTokenCount: usage.totalTokenCount,
      },
      estUsd: estimateTextCostUsd(effModel, usage),
    };

    return new Response(
      JSON.stringify({
        text: r.text ?? '',
        candidates: r.candidates ?? [],
        usageMetadata: r.usageMetadata,
        promptFeedback: r.promptFeedback,
      })
    );
  }

  // Pass through — SDK's own Google calls (generateContent + Files API).
  return originalFetch(url, init);
});
vi.stubGlobal('fetch', fetchMock);

// --- 4. Import the units under test (after stubs) ------------------------

const {
  generateEditDecisionList,
  generatePremiseCheck,
  optimizeImagePrompt,
  analyzeProductSignature,
  generateCinematicThemes,
  generateCinematicNarrative,
} = await import('../../services/geminiService.js');

// --- 5. Fixed inputs (identical across both arms) ------------------------

// Bukidnon Brew premise-check input. productDescription composed verbatim from
// the bukidnon fixture fields in script-gen.regression.test.ts (~lines 311-325);
// priceOffer mirrors the offer paired with Bukidnon Brew in that file.
const PREMISE_INPUT = {
  productName: 'Bukidnon Brew Arabica Beans',
  productDescription:
    '250g single-origin Bukidnon highland coffee beans, medium roast, resealable valve bag. ' +
    'For OFW wives in Pinas sending pasalubong-style care packages to husbands abroad. ' +
    'Wakes up energized in Saudi, feels closer to pamilya every morning, sweldo stretches ' +
    'further than Saudi cafe runs. The 3 AM worry: hindi makatulog kasi 5 years na siya sa ' +
    'abroad. Direct sa farmer sa Bukidnon, hindi blend ng kung anu-ano. Single-origin, medium ' +
    'roast, resealable valve bag, 250g, ships internationally.',
  priceOffer: 'First 50 customers, free shipping + recipe ebook',
  brandName: 'Bukidnon Brew',
  isLocalService: false,
};

const IMAGE_USER_REQUEST =
  'Make the product the hero on a clean kitchen counter with morning light, keep the label readable';

// Fixed cinematic theme — literal, NOT generated, so both arms see identical input.
const FIXED_THEME = {
  id: 'theme-0',
  name: 'Highland Dawn',
  vibe: 'misty mountain sunrise, artisanal warmth',
  texturePrompt: 'volcanic soil, burlap, rising steam',
  colorPalette: 'deep browns, amber gold, morning mist white',
};

const CINEMATIC_PRODUCT = 'Bukidnon Brew Arabica Coffee Beans';
const CINEMATIC_CONCEPT = 'the first pour of morning';
const HARDWARE_SPECS = { camera: 'ARRI Alexa Mini', lens: 'Cooke S4', focalLength: '50mm' };

// Two product data-URLs shared by optimizeImagePrompt + analyzeProductSignature.
function toDataUrl(relPath: string): string {
  const buf = readFileSync(resolve(process.cwd(), relPath));
  return `data:image/jpeg;base64,${buf.toString('base64')}`;
}
let imageDataUrls: string[] = [];

// EDL scene-batch base (from tests/unit/edit-decision-list.test.ts ~lines 202-217),
// adapted: audioOverlays: [] (the audio path fetches blob URLs — skipped here).
const EDL_SCENE_LINES = [
  { sceneIdx: 0, scriptLine: 'Wait until you see this!', type: 'talking' as const },
  { sceneIdx: 1, scriptLine: 'Three secrets nobody told you.', type: 'b-roll' as const },
  { sceneIdx: 2, scriptLine: 'This one changes everything.', type: 'cinematic' as const },
  { sceneIdx: 3, scriptLine: 'Tap to grab yours now.', type: 'talking' as const },
];
const EDL_FINAL_SCRIPT =
  'Wait until you see this! Three secrets nobody told you. This one changes everything. Tap to grab yours now.';

// Populated by beforeAll via the Files API. Empty → prompt-only fallback.
let videoUris: (string | undefined)[] = [];
let videoPartsIncluded = false;

function buildEdlInput() {
  const uris =
    videoPartsIncluded && videoUris.length > 0
      ? videoUris
      : [undefined, undefined];
  return {
    sceneBatch: EDL_SCENE_LINES.map((s, i) => ({
      ...s,
      // Two uploaded files cycled across four scenes; Files API URIs are exactly
      // what the service's fileData part accepts.
      renderedUrl: uris[i % uris.length],
    })),
    audioOverlays: [] as { sceneIdx: number; audioUrl: string }[],
    aspectRatio: '9:16' as const,
    targetPlatform: 'tiktok' as const,
    finalScript: EDL_FINAL_SCRIPT,
  };
}

// --- 6. Report accumulation ----------------------------------------------

interface ResultRecord {
  flow: string;
  arm: 'A' | 'B';
  model: string;
  latencyMs: number | null;
  usage: CallMetrics['usage'];
  estUsd: number | null;
  parsedOk: boolean;
  outputSummary: string;
  output: unknown;
  error?: string;
}
const results: ResultRecord[] = [];

async function runArm(
  flow: string,
  arm: 'A' | 'B',
  fn: () => Promise<unknown>,
  validate: (out: any) => boolean
): Promise<ResultRecord> {
  currentTargetModel = arm === 'A' ? 'gemini-3.5-flash' : 'gemini-3.6-flash';
  lastCall = null;
  let record: ResultRecord;
  try {
    const output = await fn();
    const summarySrc = typeof output === 'string' ? output : JSON.stringify(output);
    record = {
      flow,
      arm,
      model: lastCall?.model ?? currentTargetModel,
      latencyMs: lastCall?.latencyMs ?? null,
      usage: lastCall?.usage ?? {},
      estUsd: lastCall?.estUsd ?? null,
      parsedOk: !!validate(output),
      outputSummary: (summarySrc ?? '').slice(0, 400),
      output,
    };
  } catch (e: any) {
    record = {
      flow,
      arm,
      model: lastCall?.model ?? currentTargetModel,
      latencyMs: lastCall?.latencyMs ?? null,
      usage: lastCall?.usage ?? {},
      estUsd: lastCall?.estUsd ?? null,
      parsedOk: false,
      outputSummary: '',
      output: null,
      error: e?.message ? String(e.message) : String(e),
    };
  } finally {
    currentTargetModel = null;
  }
  results.push(record);
  return record;
}

// Every flow-arm record must either have errored or produced parseable output of
// the expected shape. Structural only — never assert quality or that B beats A.
function assertRecord(rec: ResultRecord) {
  expect(rec.error != null || rec.parsedOk === true).toBe(true);
}

// --- 7. Report writers ---------------------------------------------------

function fmt(n: number | null | undefined, digits = 0): string {
  if (n == null || Number.isNaN(n)) return '—';
  return n.toFixed(digits);
}

function writeReports() {
  const outDir = resolve(process.cwd(), '.tmp/research-ab');
  mkdirSync(outDir, { recursive: true });

  writeFileSync(
    resolve(outDir, 'results.json'),
    JSON.stringify(
      { ranAt: new Date().toISOString(), videoPartsIncluded, results },
      null,
      2
    )
  );

  const flowOrder = [...new Set(results.map((r) => r.flow))];
  const lines: string[] = [];
  lines.push('# Research-Tier A/B Eval');
  lines.push('');
  lines.push(`Ran at: ${new Date().toISOString()}`);
  lines.push('');
  lines.push(`- Arm A: \`gemini-3.5-flash\` (current)`);
  lines.push(`- Arm B: \`gemini-3.6-flash\` (candidate)`);
  lines.push(`- EDL video parts included: **${videoPartsIncluded}**`);
  lines.push('');

  for (const flow of flowOrder) {
    const rows = results.filter((r) => r.flow === flow);
    lines.push(`## ${flow}`);
    lines.push('');
    lines.push('| Arm | Model | Latency (ms) | Prompt tok | Output tok | Thoughts tok | Total tok | Est USD | parsedOk | Error |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|');
    for (const r of rows) {
      lines.push(
        `| ${r.arm} | ${r.model} | ${fmt(r.latencyMs)} | ${fmt(r.usage.promptTokenCount)} | ` +
          `${fmt(r.usage.candidatesTokenCount)} | ${fmt(r.usage.thoughtsTokenCount)} | ` +
          `${fmt(r.usage.totalTokenCount)} | ${r.estUsd != null ? fmt(r.estUsd, 6) : '—'} | ` +
          `${r.parsedOk} | ${r.error ? r.error.replace(/\|/g, '\\|').slice(0, 120) : ''} |`
      );
    }
    lines.push('');
    for (const r of rows) {
      lines.push(`### ${flow} — Arm ${r.arm} output excerpt`);
      lines.push('');
      lines.push('```');
      lines.push((r.outputSummary || r.error || '(no output)').slice(0, 400));
      lines.push('```');
      lines.push('');
    }
  }

  writeFileSync(resolve(outDir, 'report.md'), lines.join('\n'));
}

// --- 8. Setup: images + Files API video upload ---------------------------

const SHOULD_RUN = !!process.env.RUN_AB;

beforeAll(async () => {
  if (!SHOULD_RUN) return;
  imageDataUrls = [
    toDataUrl('assets/ad-swipe/E19-gruns.jpg'),
    toDataUrl('assets/ad-swipe/E20-gruns.jpg'),
  ];

  if (!ai) return;
  const videoPaths = [
    resolve(process.cwd(), 'tests/fixtures/sample-batch/before_after-run1-complete-raw.mp4'),
    resolve(process.cwd(), 'tests/fixtures/sample-batch/before_after-run1-scene2fail-raw.mp4'),
  ];
  try {
    const uploaded: string[] = [];
    for (const p of videoPaths) {
      let file: any = await ai.files.upload({ file: p });
      const deadline = Date.now() + 120_000;
      while (file?.state && file.state !== 'ACTIVE') {
        if (file.state === 'FAILED') throw new Error(`Files API upload FAILED for ${p}`);
        if (Date.now() > deadline) throw new Error(`Files API upload timed out (>120s) for ${p}`);
        await new Promise((r) => setTimeout(r, 3000));
        file = await ai.files.get({ name: file.name });
      }
      if (!file?.uri) throw new Error(`Files API returned no uri for ${p}`);
      uploaded.push(file.uri);
    }
    videoUris = uploaded;
    videoPartsIncluded = true;
  } catch (e) {
    // Non-fatal: fall back to prompt-only EDL rather than aborting the eval.
    // eslint-disable-next-line no-console
    console.warn('research-tier.ab: video upload failed, EDL runs prompt-only —', (e as any)?.message ?? e);
    videoUris = [];
    videoPartsIncluded = false;
  }
}, 300_000);

afterAll(() => {
  if (!SHOULD_RUN) return;
  writeReports();
});

// --- 9. The six flows — arm A then arm B, sequential ---------------------

describe.skipIf(!SHOULD_RUN)('Research-tier A/B (gemini-3.5-flash vs gemini-3.6-flash)', () => {
  it(
    'generateEditDecisionList',
    async () => {
      const validate = (out: any) => Array.isArray(out?.scenes) && out.scenes.length > 0;
      const a = await runArm('generateEditDecisionList', 'A', () => generateEditDecisionList(buildEdlInput() as any), validate);
      const b = await runArm('generateEditDecisionList', 'B', () => generateEditDecisionList(buildEdlInput() as any), validate);
      assertRecord(a);
      assertRecord(b);
    },
    300_000
  );

  it(
    'generatePremiseCheck',
    async () => {
      const validate = (out: any) => typeof out?.impliedPremise === 'string' && out.impliedPremise.length > 0;
      const a = await runArm('generatePremiseCheck', 'A', () => generatePremiseCheck(PREMISE_INPUT as any), validate);
      const b = await runArm('generatePremiseCheck', 'B', () => generatePremiseCheck(PREMISE_INPUT as any), validate);
      assertRecord(a);
      assertRecord(b);
    },
    300_000
  );

  it(
    'optimizeImagePrompt',
    async () => {
      const validate = (out: any) => typeof out?.finalPrompt === 'string' && out.finalPrompt.length > 0;
      const a = await runArm('optimizeImagePrompt', 'A', () => optimizeImagePrompt(IMAGE_USER_REQUEST, imageDataUrls), validate);
      const b = await runArm('optimizeImagePrompt', 'B', () => optimizeImagePrompt(IMAGE_USER_REQUEST, imageDataUrls), validate);
      assertRecord(a);
      assertRecord(b);
    },
    300_000
  );

  it(
    'analyzeProductSignature',
    async () => {
      const validate = (out: any) => typeof out === 'string' && out.trim().length > 0;
      const a = await runArm('analyzeProductSignature', 'A', () => analyzeProductSignature(imageDataUrls), validate);
      const b = await runArm('analyzeProductSignature', 'B', () => analyzeProductSignature(imageDataUrls), validate);
      assertRecord(a);
      assertRecord(b);
    },
    300_000
  );

  it(
    'generateCinematicThemes',
    async () => {
      const validate = (out: any) =>
        Array.isArray(out) && out.length >= 1 && out.every((t: any) => t?.name && t?.vibe);
      const a = await runArm('generateCinematicThemes', 'A', () => generateCinematicThemes(CINEMATIC_PRODUCT), validate);
      const b = await runArm('generateCinematicThemes', 'B', () => generateCinematicThemes(CINEMATIC_PRODUCT), validate);
      assertRecord(a);
      assertRecord(b);
    },
    300_000
  );

  it(
    'generateCinematicNarrative',
    async () => {
      const validate = (out: any) =>
        Array.isArray(out) &&
        out.length >= 1 &&
        out.every((s: any) => s?.phase && s?.action && s?.emotion);
      const a = await runArm(
        'generateCinematicNarrative',
        'A',
        () => generateCinematicNarrative(CINEMATIC_PRODUCT, FIXED_THEME, CINEMATIC_CONCEPT, HARDWARE_SPECS),
        validate
      );
      const b = await runArm(
        'generateCinematicNarrative',
        'B',
        () => generateCinematicNarrative(CINEMATIC_PRODUCT, FIXED_THEME, CINEMATIC_CONCEPT, HARDWARE_SPECS),
        validate
      );
      assertRecord(a);
      assertRecord(b);
    },
    300_000
  );
});
