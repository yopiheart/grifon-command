// A/B eval harness for the "research tier" Gemini calls.
//
// Grifon routes six non-crown-jewel flows through researchTextModel
// (gemini-3.6-flash after the Slice-2 flip; the premise-check flow stays pinned
// to gemini-3.5-flash via premiseCheckModel). This harness replays all six against
// an INCUMBENT arm (A) and a CANDIDATE arm (B) using identical, fixed inputs, then
// writes a side-by-side report a human / LLM grader can review. It does NOT decide
// a winner — asserts are structural only (each arm either errored or produced
// parseable output of the right shape). The interceptor treats every research-tier
// model ID as swappable, so arm forcing keeps working post-flip.
//
// Arms default to A=gemini-3.6-flash (production today) and B=gemini-3.7-flash
// (the 2026-08 candidate), and are overridable via AB_ARM_A / AB_ARM_B — no code
// edit needed to evaluate the next model. See workflows/gemini37_adoption.md.
//
// Skipped by default — opt in with `RUN_AB=1`. This keeps `npm test` from
// burning Gemini quota (12 live calls per run, ~$0.25).
//
// Run:
//   RUN_AB=1 npx vitest run tests/regression/research-tier.ab.test.ts --reporter=verbose
//   (PowerShell: $env:RUN_AB='1'; npx vitest run tests/regression/research-tier.ab.test.ts --reporter=verbose)
//   Override arms:  $env:AB_ARM_B='gemini-4.0-flash'
//   Premise only:   ... --reporter=verbose -t generatePremiseCheck
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

// --- 3a. Arm configuration ------------------------------------------------
//
// Arms are ENV-CONFIGURABLE so a new candidate model needs zero edits here. This
// harness has now been pointed at three different candidates (3.6 in 2026-07,
// 3.7 in 2026-08); each migration previously meant touching four hardcoded
// literals, which is exactly the kind of edit that goes stale silently.
//
//   AB_ARM_A — the incumbent (default: whatever production runs today)
//   AB_ARM_B — the candidate
//
// Defaults track production: arm A is researchTextModel's CURRENT value, arm B
// is the model under evaluation. Keep ARM_A in sync with
// services/geminiService.ts researchTextModel after any approved flip.
const ARM_A = process.env.AB_ARM_A || 'gemini-3.6-flash';
const ARM_B = process.env.AB_ARM_B || 'gemini-3.7-flash';

// Every model ID that a research-tier flow might legitimately send. The
// interceptor only swaps when the client sent one of these, so arm forcing keeps
// working across flips (production sends 3.6 today, 3.5 for the pinned premise
// check). ADD A NEW ID HERE when researchTextModel/premiseCheckModel changes.
const RESEARCH_TIER_MODELS = new Set([
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-3.7-flash',
]);

// Which thinking dialect each model speaks. Google moved from a numeric
// `thinkingBudget` to a categorical `thinkingLevel` on the 3.6+ generation; the
// approved equivalent for Grifon's budget of 4000 is 'medium' (see
// workflows/gemini36_adoption.md Slice 2, validated live).
//
// ⚠️ 3.7 additionally REJECTS thinkingLevel:'minimal' with an API validation
// error — LOW is its floor. Grifon uses 'medium' everywhere, so this is inert
// today, but the mapping must never emit 'minimal' for a 3.7+ target.
const THINKING_LEVEL_MODELS = new Set(['gemini-3.6-flash', 'gemini-3.7-flash']);
const EQUIVALENT_THINKING_BUDGET = 4000;
const EQUIVALENT_THINKING_LEVEL = 'medium';

/**
 * Rewrite a thinkingConfig into the dialect `targetModel` accepts, leaving every
 * other config key untouched. Returns the config unchanged when there is no
 * thinkingConfig (only the EDL flow sets one).
 */
function mapThinkingConfig(targetModel: string, config: any): any {
  const thinking = config?.thinkingConfig;
  if (!thinking) return config;
  const wantsLevel = THINKING_LEVEL_MODELS.has(targetModel);
  if (wantsLevel && thinking.thinkingBudget != null) {
    return { ...config, thinkingConfig: { thinkingLevel: EQUIVALENT_THINKING_LEVEL } };
  }
  if (!wantsLevel && thinking.thinkingLevel != null) {
    return { ...config, thinkingConfig: { thinkingBudget: EQUIVALENT_THINKING_BUDGET } };
  }
  return config;
}

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
  // GROUND TRUTH: how many fileData (video) parts were actually in the request
  // body we sent upstream — counted from the wire, never inferred from whether
  // beforeAll's upload looked like it worked. 0 on the EDL arm means that arm ran
  // BLIND and its output is not comparable to a sighted one.
  videoPartsSent: number;
}
// Overwritten on every intercepted /api/gemini/text call; the test loop reads it
// after the flow function returns. On a retry, the LAST (successful) call wins.
let lastCall: CallMetrics | null = null;

/** Count fileData parts in an outgoing request body. Shape-tolerant: flows send
 *  either `{ parts: [...] }` or a bare array, and most send no media at all. */
function countVideoParts(contents: any): number {
  const parts = Array.isArray(contents) ? contents : contents?.parts;
  if (!Array.isArray(parts)) return 0;
  return parts.filter((p: any) => p?.fileData?.fileUri).length;
}

const fetchMock = vi.fn(async (url: any, init: any = {}) => {
  const urlStr =
    typeof url === 'string'
      ? url
      : (url?.url as string | undefined) ?? (url?.toString?.() as string | undefined) ?? '';

  // --- Files-API upload seam -------------------------------------------
  //
  // Since a841f69 the EDL re-uploads every renderedUrl through
  // /api/gemini/files/upload to mint a Gemini files/* URI. This harness has no
  // server for that route, so without this stub EVERY scene's upload rejects,
  // allSettled degrades them all, and the EDL arm silently runs PROMPT-ONLY —
  // while the report still printed videoPartsIncluded: true. A wrong A/B result
  // that looks right (recorded as follow-up #1 in workflows/edl_files_api_plan.md).
  //
  // The echo below is honest, not a fake: beforeAll already did the REAL upload
  // against the live Files API and set each renderedUrl to the minted files/* URI.
  // This only bypasses a proxy hop that doesn't exist in-process — the URI the
  // model receives is genuinely the uploaded one. Deliberately NOT fixed by
  // teaching proxyUploadFile to pass through files/ URLs: that would mask real
  // upload failures in production to make a test pass.
  if (urlStr.includes('/api/gemini/files/upload')) {
    const { url: srcUrl } = JSON.parse(init.body as string);
    // What production returns is `uploaded.uri` from the SDK
    // (api/gemini/files/upload.ts:126), which is the FULL
    // https://generativelanguage.googleapis.com/v1beta/files/<id> URL — not a
    // bare `files/<id>`. beforeAll stores that same value as renderedUrl, so
    // accept both spellings and reject anything that is not a Files API URI.
    const isFilesUri =
      typeof srcUrl === 'string' &&
      (srcUrl.startsWith('files/') || /\/v1beta\/files\/[^/]+$/.test(srcUrl));
    if (!isFilesUri) {
      // Anything else means beforeAll's upload didn't happen — fail loudly rather
      // than degrade into a prompt-only run wearing a "video attached" label.
      throw new Error(
        `research-tier.ab: expected a pre-minted Files API URI as renderedUrl, got "${srcUrl}". ` +
          'The EDL arm would have run blind. Check the beforeAll Files API upload.'
      );
    }
    return new Response(JSON.stringify({ uri: srcUrl }));
  }

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
    if (RESEARCH_TIER_MODELS.has(body.model) && currentTargetModel) {
      effModel = currentTargetModel;
      // Map the thinking dialect to whatever the effective target accepts, so
      // either arm gets a config it won't reject. Only the EDL flow sets one.
      config = mapThinkingConfig(currentTargetModel, config);
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
      videoPartsSent: countVideoParts(body.contents),
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
  /** Ground truth from the wire — see CallMetrics.videoPartsSent. */
  videoPartsSent: number | null;
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
  currentTargetModel = arm === 'A' ? ARM_A : ARM_B;
  lastCall = null;
  let record: ResultRecord;
  try {
    const output = await fn();
    // Snapshot through an explicit ASSERTION (not an annotation — a `const` just
    // inherits the narrowed initializer type, so `const x: T | null = lastCall`
    // does NOT work here; verified). `lastCall = null` above narrows the
    // module-level binding to `null` for the rest of this function — TS control
    // flow can't see the fetch mock reassigning it — so reading `lastCall?.x`
    // directly resolves to `never`. Harmless at runtime (esbuild strips types),
    // but it made this file impossible to typecheck. `tests/` is excluded from
    // tsconfig, which is why nobody noticed.
    const call = lastCall as CallMetrics | null;
    const summarySrc = typeof output === 'string' ? output : JSON.stringify(output);
    record = {
      flow,
      arm,
      model: call?.model ?? currentTargetModel,
      latencyMs: call?.latencyMs ?? null,
      usage: call?.usage ?? {},
      estUsd: call?.estUsd ?? null,
      videoPartsSent: call?.videoPartsSent ?? null,
      parsedOk: !!validate(output),
      outputSummary: (summarySrc ?? '').slice(0, 400),
      output,
    };
  } catch (e: any) {
    const call = lastCall as CallMetrics | null;
    record = {
      flow,
      arm,
      model: call?.model ?? currentTargetModel,
      latencyMs: call?.latencyMs ?? null,
      usage: call?.usage ?? {},
      estUsd: call?.estUsd ?? null,
      videoPartsSent: call?.videoPartsSent ?? null,
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
  lines.push(`- Arm A: \`${ARM_A}\` (incumbent)`);
  lines.push(`- Arm B: \`${ARM_B}\` (candidate)`);
  // Ground truth, counted off the wire — NOT the beforeAll upload flag. Before
  // this was measured, a fully-degraded prompt-only EDL run still reported
  // "videoPartsIncluded: true" (edl_files_api_plan.md follow-up #1).
  const maxVideoParts = results.reduce((m, r) => Math.max(m, r.videoPartsSent ?? 0), 0);
  lines.push(`- Files API upload in beforeAll succeeded: **${videoPartsIncluded}**`);
  lines.push(`- Video parts ACTUALLY sent upstream (max across calls): **${maxVideoParts}**`);
  if (videoPartsIncluded && maxVideoParts === 0) {
    lines.push('');
    lines.push(
      '> ⛔ **THIS RESULT IS NOT TRUSTWORTHY.** The upload succeeded but zero video parts ' +
        'reached the model, so the EDL arm ran BLIND. Do not grade the EDL rows.'
    );
  }
  lines.push('');

  for (const flow of flowOrder) {
    const rows = results.filter((r) => r.flow === flow);
    lines.push(`## ${flow}`);
    lines.push('');
    lines.push('| Arm | Model | Latency (ms) | Prompt tok | Output tok | Thoughts tok | Total tok | Est USD | Video parts | parsedOk | Error |');
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|');
    for (const r of rows) {
      lines.push(
        `| ${r.arm} | ${r.model} | ${fmt(r.latencyMs)} | ${fmt(r.usage.promptTokenCount)} | ` +
          `${fmt(r.usage.candidatesTokenCount)} | ${fmt(r.usage.thoughtsTokenCount)} | ` +
          `${fmt(r.usage.totalTokenCount)} | ${r.estUsd != null ? fmt(r.estUsd, 6) : '—'} | ` +
          `${r.videoPartsSent ?? '—'} | ` +
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

// Title is built from the live arm constants — a hardcoded one printed
// "3.5-flash vs 3.6-flash" through a run that actually exercised 3.6 vs 3.7.
describe.skipIf(!SHOULD_RUN)(`Research-tier A/B (${ARM_A} vs ${ARM_B})`, () => {
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
