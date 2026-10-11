import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const TASK_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TASK_ROOT, '../../..');
const PRIMARY_ROOT = process.env.GRIFON_TOOL_ROOT || 'C:/Users/ADMIN/Desktop/grifon-command';
const OUTPUT_ROOT = join(TASK_ROOT, 'reference/audio-autopsy');
const SPEC_HASH = 'cc4104c83b9a5d1b55acfdaea0b302afa2e08926095fafd9271d257143aa5d7c';
const PROMPT_HASH = '5bbb7925a1f60fad306811bee33d41b9ccd14f7633d4958fa7a4253a6d82603b';
const TOOL_HASH = '04e3002f3583071de59b0050e5d83111b6f1a6acf176d2be0700fa0a51d93d30';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const now = () => new Date().toISOString();
const save = (name, value, options) => writeFileSync(join(OUTPUT_ROOT, name), `${JSON.stringify(value, null, 2)}\n`, options);

function check(condition, message) {
  if (!condition) throw new Error(message);
}

const confidence = z.enum(['high', 'medium', 'low']);
const text = z.string().trim().min(1);
const seconds = z.number().finite().nonnegative();
const tempo = z.number().finite().positive().nullable();
const interval = z.object({ start_s: seconds, end_s: seconds, confidence }).strict();
const resultSchema = z.object({
  reference: z.object({
    voice: z.object({ present: z.boolean().nullable(), transcript: text, confidence, evidence: text }).strict(),
    music: z.object({
      style: text, instruments_and_texture: z.array(text), tempo_bpm_estimate: tempo,
      tempo_confidence: confidence, tempo_is_estimate: z.literal(true),
      energy_and_changes: z.array(interval.extend({ observation: text })),
    }).strict(),
    foreground_events: z.array(interval.extend({ description: text, class: z.enum(['music percussion', 'separate effect', 'uncertain']), evidence: text })),
    silence_intervals: z.array(interval), uncertainties: z.array(text),
  }).strict(),
  candidates: z.array(z.object({
    id: z.enum(['B', 'C']), audible_style: text, tempo_bpm_estimate: tempo,
    closest_region_start_s: seconds.nullable(), closest_region_end_s: seconds.nullable(),
    match_to_A: text, confidence,
  }).strict()).length(2),
  recommendation: z.object({ choice: z.enum(['B', 'C', 'neither', 'uncertain']), reason: text, confidence }).strict(),
}).strict();

function validateResult(result, inputs) {
  const parsed = resultSchema.safeParse(result);
  if (!parsed.success) return parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
  const problems = [];
  const durations = Object.fromEntries(inputs.map((input) => [input.id, input.seconds]));
  const checkInterval = (start, end, duration, label) => {
    if (end < start) problems.push(`${label}: end precedes start`);
    if (start > duration || end > duration) problems.push(`${label}: interval exceeds ${duration} seconds`);
  };
  for (const field of ['energy_and_changes', 'foreground_events', 'silence_intervals']) {
    const rows = field === 'energy_and_changes' ? result.reference.music[field] : result.reference[field];
    rows.forEach((row, index) => checkInterval(row.start_s, row.end_s, durations.A, `reference.${field}[${index}]`));
  }
  if (new Set(result.candidates.map((candidate) => candidate.id)).size !== 2) problems.push('candidates: B and C must both appear once');
  for (const candidate of result.candidates) {
    const start = candidate.closest_region_start_s;
    const end = candidate.closest_region_end_s;
    if ((start === null) !== (end === null)) problems.push(`candidate ${candidate.id}: region endpoints must both be null or numeric`);
    if (start !== null && end !== null) checkInterval(start, end, durations[candidate.id], `candidate ${candidate.id}`);
  }
  return problems;
}

function validatorSelfCheck(inputs) {
  const sample = {
    reference: {
      voice: { present: null, transcript: 'UNKNOWN', confidence: 'low', evidence: 'Uncertain' },
      music: { style: 'Uncertain', instruments_and_texture: [], tempo_bpm_estimate: null, tempo_confidence: 'low', tempo_is_estimate: true, energy_and_changes: [] },
      foreground_events: [], silence_intervals: [], uncertainties: ['Uncertain'],
    },
    candidates: ['B', 'C'].map((id) => ({ id, audible_style: 'Uncertain', tempo_bpm_estimate: null, closest_region_start_s: null, closest_region_end_s: null, match_to_A: 'Uncertain', confidence: 'low' })),
    recommendation: { choice: 'neither', reason: 'Insufficient evidence', confidence: 'low' },
  };
  check(validateResult(sample, inputs).length === 0, 'Validator rejects legitimate uncertain/neither result');
  const mutations = [
    (value) => { delete value.reference.music; },
    (value) => { value.reference.music.tempo_is_estimate = false; },
    (value) => { value.reference.foreground_events.push({ start_s: '0.06', end_s: 1, description: 'Unknown', class: 'uncertain', confidence: 'low', evidence: 'Unknown' }); },
    (value) => { value.reference.silence_intervals.push({ start_s: 1, end_s: 0, confidence: 'low' }); },
    (value) => { value.reference.silence_intervals.push({ start_s: 0, end_s: inputs[0].seconds + 0.01, confidence: 'low' }); },
    (value) => { value.candidates[1].id = 'B'; },
    (value) => { value.candidates[0].closest_region_start_s = 0; },
    (value) => { value.candidates[1].closest_region_start_s = 0; value.candidates[1].closest_region_end_s = inputs[2].seconds + 1; },
    (value) => { value.recommendation.choice = 'forced'; },
  ];
  mutations.forEach((mutate, index) => {
    const changed = structuredClone(sample);
    mutate(changed);
    check(validateResult(changed, inputs).length > 0, `Validator accepted invalid fixture ${index}`);
  });
  return { acceptedUncertainNeither: true, rejectedInvalidFixtures: mutations.length };
}

async function main() {
  const specBytes = readFileSync(join(TASK_ROOT, 'audio-autopsy.spec.json'));
  const promptBytes = readFileSync(join(TASK_ROOT, 'audio-autopsy-prompt.txt'));
  const toolBytes = readFileSync(join(REPO_ROOT, 'tools/analyze_video.mjs'));
  check(sha256(specBytes) === SPEC_HASH && sha256(promptBytes) === PROMPT_HASH && sha256(toolBytes) === TOOL_HASH, 'Approved spec, prompt or canonical loader changed');
  const spec = JSON.parse(specBytes);
  check(spec.analyzer.model === 'gemini-3.5-flash' && spec.analyzer.temperature === 0.2 && spec.analyzer.responseMimeType === 'application/json' && spec.analyzer.maxOutputTokens === 8192 && spec.analyzer.httpOptions.retryOptions.attempts === 1, 'Approved analyzer bounds changed');
  check(spec.budget.maxInputTokens === 12000 && spec.budget.maxAdditionalPaidUsd === 0.1 && spec.budget.maxGenerateContentAttempts === 1 && spec.budget.retries === 0, 'Approved budget changed');
  check(spec.inputs.map((input) => input.id).join('') === 'ABC', 'Approved input order changed');
  const inputs = spec.inputs.map((input) => {
    const filePath = isAbsolute(input.file) ? input.file : join(TASK_ROOT, input.file);
    check(statSync(filePath).size === input.bytes && sha256(readFileSync(filePath)) === input.sha256, `Approved input ${input.id} changed`);
    const probe = JSON.parse(execFileSync(join(PRIMARY_ROOT, '.tools/media-runtime/node_modules/ffprobe-static/bin/win32/x64/ffprobe.exe'), ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,codec_name,sample_rate,channels', '-of', 'json', filePath], { encoding: 'utf8' }));
    check(probe.streams.length === 1 && probe.streams[0].codec_type === 'audio' && Math.abs(Number(probe.format.duration) - input.seconds) < 0.001, `Approved input ${input.id} duration/stream mismatch`);
    return { ...input, filePath, measuredContainerSeconds: Number(probe.format.duration), codec: probe.streams[0].codec_name };
  });
  const inspection = { specSha256: SPEC_HASH, promptSha256: PROMPT_HASH, canonicalLoaderToolSha256: TOOL_HASH, inputs: inputs.map(({ filePath, ...input }) => input), validatorSelfCheck: validatorSelfCheck(inputs), generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 8192 }, httpOptions: spec.analyzer.httpOptions, maximumAdditionalTokenCostUsd: 0.091728 };
  if (process.argv.includes('--validate-saved')) {
    const result = JSON.parse(readFileSync(join(OUTPUT_ROOT, 'raw-analysis.txt'), 'utf8'));
    const problems = validateResult(result, inputs);
    console.log(JSON.stringify({ status: problems.length ? 'FAIL' : 'STRUCTURE_TIMING_PASS', problems, validatorSelfCheck: inspection.validatorSelfCheck }, null, 2));
    if (problems.length) process.exitCode = 3;
    return;
  }
  if (!process.argv.includes('--execute-approved')) {
    console.log(JSON.stringify({ status: 'OFFLINE_INSPECTION_PASS', ...inspection }, null, 2));
    return;
  }

  mkdirSync(OUTPUT_ROOT, { recursive: true });
  check(!existsSync(join(OUTPUT_ROOT, 'attempt-ledger.json')), 'Existing ledger: approval cannot be replayed');
  const ledger = { status: 'PREFLIGHT', startedAt: now(), userApproval: 'Approve focused audio test, max additional US$0.10', generationAttempts: 0, ...inspection };
  save('attempt-ledger.json', ledger, { flag: 'wx' });
  const persist = () => save('attempt-ledger.json', ledger);
  try {
    const source = toolBytes.toString('utf8');
    const loader = source.slice(source.indexOf('function loadEnvKey('), source.indexOf('function slugify('));
    const apiKey = runInNewContext(`${loader}\nloadEnvKey('GEMINI_API_KEY');`, { process, readFileSync, join, REPO_ROOT: PRIMARY_ROOT });
    ledger.credentialPresent = Boolean(apiKey);
    ledger.credentialChannel = 'Existing canonical private loader; environment/primary local configuration; no values exposed or copied';
    persist();
    check(apiKey, 'Authorized credential unavailable');
    const ai = new GoogleGenAI({ apiKey, httpOptions: spec.analyzer.httpOptions });
    const model = await ai.models.get({ model: spec.analyzer.model });
    check(model.name === `models/${spec.analyzer.model}` && model.outputTokenLimit >= 8192, 'Approved model/cap unsupported');
    save('model-and-mime-preflight.json', { checkedAt: now(), name: model.name, inputTokenLimit: model.inputTokenLimit, outputTokenLimit: model.outputTokenLimit, supportedActions: model.supportedActions, audioMp4Documentation: 'https://firebase.google.com/docs/ai-logic/input-file-requirements#supported-mime-types_2', multipleAudioFilesDocumentation: 'https://ai.google.dev/gemini-api/docs/generate-content/audio#technical-details-about-audio', combinedOutputCapDocumentation: 'https://ai.google.dev/gemini-api/docs/generate-content/thinking#token-limits-and-max_output_tokens', pricingDocumentation: spec.budget.pricingSource, checkedDate: '2026-10-08', note: 'Firebase cited for MIME support only; this run uses the direct Generate Content API, whose guide permits multiple audio files. Exact upload/count preflight also required.' });
    const contents = [];
    const uploads = [];
    for (const input of inputs) {
      console.error(`[upload] Exact approved audio ${input.id}, ${input.bytes} bytes.`);
      let uploaded = await ai.files.upload({ file: input.filePath, config: { mimeType: input.mimeType } });
      const deadline = Date.now() + 300000;
      while (uploaded.state === 'PROCESSING') {
        check(Date.now() < deadline, `Audio ${input.id} processing timeout`);
        await new Promise((done) => setTimeout(done, 4000));
        uploaded = await ai.files.get({ name: uploaded.name });
      }
      check(uploaded.state === 'ACTIVE' && uploaded.uri && uploaded.mimeType === input.mimeType, `Audio ${input.id} upload/MIME failed`);
      uploads.push({ id: input.id, name: uploaded.name, state: uploaded.state, mimeType: uploaded.mimeType, sizeBytes: uploaded.sizeBytes, inputSha256: input.sha256 });
      save('upload-receipts.json', uploads);
      contents.push({ text: `Audio ${input.id}` }, { fileData: { fileUri: uploaded.uri, mimeType: input.mimeType } });
    }
    contents.push({ text: promptBytes.toString('utf8') });
    const count = await ai.models.countTokens({ model: spec.analyzer.model, contents });
    check(Number.isInteger(count.totalTokens) && count.totalTokens > 0 && count.totalTokens <= 12000, 'Exact request token preflight failed');
    const worstCaseAdditionalUsd = (count.totalTokens * 1.5 + 8192 * 9) / 1e6;
    check(worstCaseAdditionalUsd <= 0.1, 'Approved additional cost exceeded');
    save('request-receipt.json', { ...inspection, model: spec.analyzer.model, contentsOrder: ['Audio A', 'A fileData audio/mp4', 'Audio B', 'B fileData audio/mpeg', 'Audio C', 'C fileData audio/mpeg', 'Exact approved prompt bytes as UTF-8 text'], countTokens: count.totalTokens, worstCaseAdditionalUsd, maximumCombinedEstimatedUsd: spec.budget.priorRunEstimatedUsd + worstCaseAdditionalUsd, noExtraAnalysisInstructions: true, noVideoFrames: true, checkedAt: now() });
    ledger.inputTokenCount = count.totalTokens;
    ledger.worstCaseAdditionalUsd = worstCaseAdditionalUsd;
    ledger.status = 'GENERATION_ATTEMPT_RESERVED';
    ledger.generationAttempts = 1;
    ledger.generationAttemptReservedAt = now();
    persist();
    console.error(`[analyze] One new audio-only attempt reserved; input=${count.totalTokens}, maximum additional=$${worstCaseAdditionalUsd.toFixed(6)}.`);
    const response = await ai.models.generateContent({ model: spec.analyzer.model, contents, config: inspection.generationConfig });
    const usage = response.usageMetadata;
    save('raw-response.json', { candidates: response.candidates, usageMetadata: usage, modelVersion: response.modelVersion, responseId: response.responseId, promptFeedback: response.promptFeedback });
    writeFileSync(join(OUTPUT_ROOT, 'raw-analysis.txt'), response.text || '', 'utf8');
    check(usage && Number.isInteger(usage.promptTokenCount) && Number.isInteger(usage.totalTokenCount), 'Missing verifiable usage metadata');
    const outputIncludingThinkingTokens = usage.totalTokenCount - usage.promptTokenCount;
    const additionalCostUsd = (usage.promptTokenCount * 1.5 + outputIncludingThinkingTokens * 9) / 1e6;
    const combinedEstimatedUsd = spec.budget.priorRunEstimatedUsd + additionalCostUsd;
    const audioModality = usage.promptTokensDetails?.find((item) => item.modality === 'AUDIO');
    save('usage-cost-receipt.json', { completedAt: now(), generationAttempts: 1, usageMetadata: usage, outputIncludingThinkingTokens, additionalCostUsd, priorRunEstimatedUsd: spec.budget.priorRunEstimatedUsd, combinedEstimatedUsd, audioModalityPresent: Boolean(audioModality?.tokenCount > 0), additionalCeilingUsd: 0.1, pricingBasis: 'Standard paid-tier token estimate; invoice not inspected', noHumanHearingClaim: true });
    check(outputIncludingThinkingTokens === (usage.candidatesTokenCount || 0) + (usage.thoughtsTokenCount || 0) && outputIncludingThinkingTokens >= 0 && outputIncludingThinkingTokens <= 8192 && usage.promptTokenCount <= 12000 && additionalCostUsd <= 0.1, 'Usage/budget reconciliation failed');
    const result = JSON.parse(response.text || '');
    const problems = validateResult(result, inputs);
    if (!(audioModality?.tokenCount > 0)) problems.push('Usage metadata has no AUDIO input modality');
    save('analysis.json', { meta: { sourceUrl: spec.sourceUrl, analyzedAt: now(), inputs: inspection.inputs, promptSha256: PROMPT_HASH, model: spec.analyzer.model, observationsStatus: 'Machine hypotheses; waveform and independent review pending; no direct human hearing or rights approval' }, analysis: result });
    save('validation-result.json', { status: problems.length ? 'FAIL' : 'STRUCTURE_TIMING_AUDIO_MODALITY_PASS', problems, validatorSelfCheck: inspection.validatorSelfCheck, semanticAudioCrossCheck: 'PENDING_MAIN_TASK', independentReview: 'PENDING_MAIN_TASK', noRetryAuthorized: true });
    ledger.status = problems.length ? 'COMPLETED_VALIDATION_FAIL' : 'COMPLETED_STRUCTURE_TIMING_AUDIO_MODALITY_PASS';
    ledger.completedAt = now();
    ledger.additionalCostUsd = additionalCostUsd;
    ledger.combinedEstimatedUsd = combinedEstimatedUsd;
    persist();
    console.log(JSON.stringify({ status: ledger.status, generationAttempts: 1, additionalCostUsd, combinedEstimatedUsd, audioModalityPresent: Boolean(audioModality?.tokenCount > 0), problems, evidenceDirectory: OUTPUT_ROOT }, null, 2));
    if (problems.length) process.exitCode = 3;
  } catch (error) {
    ledger.status = ledger.generationAttempts ? 'ATTEMPT_FAILED_OR_RESULT_UNCERTAIN_NO_RETRY' : 'PREFLIGHT_BLOCKED_NO_GENERATION';
    ledger.failureAt = now();
    ledger.errorName = error?.name || 'Error';
    ledger.httpStatus = typeof error?.status === 'number' ? error.status : null;
    ledger.localFailure = error?.constructor === Error ? error.message : null;
    persist();
    console.error(JSON.stringify({ status: ledger.status, generationAttempts: ledger.generationAttempts, errorName: ledger.errorName, httpStatus: ledger.httpStatus, localFailure: ledger.localFailure }));
    process.exitCode = 2;
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'LOCAL_PREFLIGHT_BLOCKED', localFailure: error?.constructor === Error ? error.message : null, noRetry: true }));
  process.exitCode = 1;
});
