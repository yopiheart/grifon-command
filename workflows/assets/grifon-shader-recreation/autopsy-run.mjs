import { GoogleGenAI } from '@google/genai';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';

const TASK_ROOT = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(TASK_ROOT, '../../..');
const PRIMARY_ROOT = process.env.GRIFON_TOOL_ROOT || 'C:/Users/ADMIN/Desktop/grifon-command';
const OUTPUT_ROOT = join(TASK_ROOT, 'reference/autopsy');
const SPEC_HASH = '4d082dc611b2fa349b327a5ef33732b16a08022a75bdcc48b1a6f77c5628e371';
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const save = (name, value, options) => writeFileSync(join(OUTPUT_ROOT, name), `${JSON.stringify(value, null, 2)}\n`, options);
const now = () => new Date().toISOString();

function check(condition, message) {
  if (!condition) throw new Error(message);
}

function canonicalParts(source) {
  const definitions = source.slice(source.indexOf('const ANALYSIS_PROMPT ='), source.indexOf('// Platform-page URLs'));
  const validator = source.slice(source.indexOf('function validateSpecificity('), source.indexOf('function parseArgs('));
  const loader = source.slice(source.indexOf('function loadEnvKey('), source.indexOf('function slugify('));
  check(definitions && validator && loader, 'Canonical extraction boundaries missing');
  return {
    ...runInNewContext(`${definitions}\n${validator}\n({ ANALYSIS_PROMPT, validateSpecificity });`, {}),
    loadKey: () => runInNewContext(`${loader}\nloadEnvKey('GEMINI_API_KEY');`, {
      process, readFileSync, join, REPO_ROOT: PRIMARY_ROOT,
    }),
    validatorSha256: sha256(validator),
  };
}

async function main() {
  const specBytes = readFileSync(join(TASK_ROOT, 'autopsy.spec.json'));
  check(sha256(specBytes) === SPEC_HASH, 'Approved spec hash changed');
  const spec = JSON.parse(specBytes);
  const videoPath = join(TASK_ROOT, spec.input.file);
  const toolPath = join(REPO_ROOT, 'tools/analyze_video.mjs');
  const toolBytes = readFileSync(toolPath);
  check(sha256(toolBytes) === spec.analyzer.promptSourceSha256, 'Canonical analyzer hash changed');
  check(statSync(videoPath).size === spec.input.bytes && sha256(readFileSync(videoPath)) === spec.input.sha256, 'Approved input changed');
  check(spec.analyzer.model === 'gemini-3.5-flash' && spec.analyzer.temperature === 0.2 && spec.analyzer.responseMimeType === 'application/json', 'Approved analyzer configuration changed');
  check(spec.analyzer.proposedRunOnlyCostBound.maxOutputTokens === 16384 && spec.analyzer.proposedRunOnlyTransportBound.httpOptions.retryOptions.attempts === 1, 'Approved bounds changed');
  check(spec.budget.maxGenerateContentAttempts === 1 && spec.budget.retries === 0 && spec.budget.maxPaidUsd === 0.25 && spec.budget.maxInputTokens === 60000, 'Approved budget changed');
  const { ANALYSIS_PROMPT, validateSpecificity, loadKey, validatorSha256 } = canonicalParts(toolBytes.toString('utf8'));
  const generationConfig = {
    responseMimeType: spec.analyzer.responseMimeType,
    temperature: spec.analyzer.temperature,
    maxOutputTokens: spec.analyzer.proposedRunOnlyCostBound.maxOutputTokens,
  };
  const inspect = {
    specSha256: SPEC_HASH,
    inputSha256: spec.input.sha256,
    canonicalToolSha256: spec.analyzer.promptSourceSha256,
    promptSha256: sha256(ANALYSIS_PROMPT),
    validatorSha256,
    generationConfig,
    httpOptions: spec.analyzer.proposedRunOnlyTransportBound.httpOptions,
    maximumTokenCostUsd: (60000 * 1.5 + 16384 * 9) / 1e6,
  };
  if (!process.argv.includes('--execute-approved')) {
    console.log(JSON.stringify({ status: 'OFFLINE_INSPECTION_PASS', ...inspect }, null, 2));
    return;
  }

  mkdirSync(OUTPUT_ROOT, { recursive: true });
  check(!existsSync(join(OUTPUT_ROOT, 'attempt-ledger.json')), 'Existing attempt ledger: this approval cannot be replayed');
  const ledger = {
    status: 'PREFLIGHT', startedAt: now(), generationAttempts: 0,
    userApproval: 'Approve one autopsy, max US$0.25', ...inspect,
    pricingEvidence: { url: 'https://ai.google.dev/gemini-api/docs/pricing', checkedDate: '2026-10-08', inputUsdPerMillion: 1.5, outputIncludingThinkingUsdPerMillion: 9 },
    outputCapEvidence: { url: 'https://ai.google.dev/gemini-api/docs/generate-content/thinking#token-limits-and-max_output_tokens', checkedDate: '2026-10-08', claim: 'The response token maximum includes thought tokens; infrastructure enforces a hard combined cutoff.' },
    transportEvidence: { sdk: '@google/genai 1.46.0', declaration: 'HttpRetryOptions.attempts: maximum number of attempts, including the original request; 0 or 1 means no retries.', implementation: 'dist/node/index.mjs apiCall uses retries: attempts - 1' },
  };
  save('attempt-ledger.json', ledger, { flag: 'wx' });
  const persist = () => save('attempt-ledger.json', ledger);
  const apiKey = loadKey();
  ledger.credentialPresent = Boolean(apiKey);
  ledger.credentialChannel = process.env.GEMINI_API_KEY ? 'Inherited process environment' : 'Existing canonical private loader, primary repository local configuration, no values exposed or copied';
  persist();
  check(apiKey, 'Authorized credential unavailable');
  const ai = new GoogleGenAI({ apiKey, httpOptions: spec.analyzer.proposedRunOnlyTransportBound.httpOptions });
  try {
    const model = await ai.models.get({ model: spec.analyzer.model });
    check(model.name === `models/${spec.analyzer.model}` && model.outputTokenLimit >= generationConfig.maxOutputTokens, 'Approved model unavailable or cap unsupported');
    save('model-preflight.json', { checkedAt: now(), name: model.name, inputTokenLimit: model.inputTokenLimit, outputTokenLimit: model.outputTokenLimit, supportedActions: model.supportedActions });
    console.error('[preflight] Model and combined output cap verified; uploading exact source with native audio.');
    let uploaded = await ai.files.upload({ file: videoPath, config: { mimeType: 'video/mp4' } });
    const deadline = Date.now() + 300000;
    while (uploaded.state === 'PROCESSING') {
      check(Date.now() < deadline, 'Upload processing timeout; no generation attempted');
      await new Promise((done) => setTimeout(done, 4000));
      uploaded = await ai.files.get({ name: uploaded.name });
    }
    check(uploaded.state === 'ACTIVE' && uploaded.uri, 'Upload failed; no generation attempted');
    save('upload-receipt.json', { checkedAt: now(), name: uploaded.name, state: uploaded.state, mimeType: uploaded.mimeType, sizeBytes: uploaded.sizeBytes, sourceSha256: spec.input.sha256, nativeAudioPreserved: true });
    const contents = [{ fileData: { fileUri: uploaded.uri, mimeType: 'video/mp4' } }, { text: ANALYSIS_PROMPT }];
    const count = await ai.models.countTokens({ model: spec.analyzer.model, contents });
    check(Number.isInteger(count.totalTokens) && count.totalTokens > 0 && count.totalTokens <= spec.budget.maxInputTokens, 'Exact input token preflight failed');
    const worstCaseUsd = (count.totalTokens * spec.budget.inputPriceUsdPerMillion + generationConfig.maxOutputTokens * spec.budget.outputIncludingThinkingPriceUsdPerMillion) / 1e6;
    check(worstCaseUsd <= spec.budget.maxPaidUsd, 'Input plus maximum output exceeds approved cost');
    ledger.inputTokenCount = count.totalTokens;
    ledger.worstCaseUsd = worstCaseUsd;
    save('request-receipt.json', { ...inspect, model: spec.analyzer.model, sourceUrl: spec.sourceUrl, nativeAudioPreserved: true, contentsDescription: 'Exact uploaded MP4 fileData followed by unchanged canonical ANALYSIS_PROMPT', countTokens: count.totalTokens, worstCaseUsd, countCompletedAt: now(), noAdditionalToolsOrAuditCalls: true });
    ledger.status = 'GENERATION_ATTEMPT_RESERVED';
    ledger.generationAttempts = 1;
    ledger.generationAttemptReservedAt = now();
    persist();
    console.error(`[analyze] One attempt reserved; input=${count.totalTokens} tokens, maximum cost=$${worstCaseUsd.toFixed(6)}.`);
    const response = await ai.models.generateContent({ model: spec.analyzer.model, contents, config: generationConfig });
    const usage = response.usageMetadata;
    save('raw-response.json', { candidates: response.candidates, usageMetadata: usage, modelVersion: response.modelVersion, responseId: response.responseId, promptFeedback: response.promptFeedback });
    writeFileSync(join(OUTPUT_ROOT, 'raw-analysis.txt'), response.text || '', 'utf8');
    check(usage && Number.isInteger(usage.promptTokenCount) && Number.isInteger(usage.totalTokenCount), 'Completed response missing verifiable usage metadata');
    const billedOutputTokens = usage.totalTokenCount - usage.promptTokenCount;
    const reportedCandidateTokens = usage.candidatesTokenCount || 0;
    const reportedThoughtTokens = usage.thoughtsTokenCount || 0;
    const costUsd = (usage.promptTokenCount * 1.5 + billedOutputTokens * 9) / 1e6;
    save('usage-cost-receipt.json', { completedAt: now(), generationAttempts: 1, usageMetadata: usage, billedOutputTokens, reportedCandidateTokens, reportedThoughtTokens, costUsd, pricingBasis: 'Standard paid-tier token estimate; invoice not inspected', ceilingUsd: spec.budget.maxPaidUsd, nativeAudioSupplied: true });
    check(billedOutputTokens >= 0 && billedOutputTokens === reportedCandidateTokens + reportedThoughtTokens && billedOutputTokens <= 16384 && usage.promptTokenCount <= 60000 && costUsd <= 0.25, 'Completed usage failed budget/cap reconciliation');
    let analysisText = (response.text || '').trim();
    if (analysisText.startsWith('```')) analysisText = analysisText.replace(/^```[a-z]*\s*|\s*```$/g, '');
    const analysis = JSON.parse(analysisText);
    const specificityProblems = validateSpecificity(analysis);
    save('analysis.json', { meta: { source_ref: spec.sourceUrl, local_file: spec.input.file, niche: spec.analyzer.niche, source: spec.analyzer.source, model: spec.analyzer.model, analyzed_at: now(), source_sha256: spec.input.sha256, audio_findings_status: 'Machine-analysis hypothesis; direct human hearing and frame-indexed cross-check pending' }, analysis });
    save('specificity-result.json', { status: specificityProblems.length ? 'FAIL_GENERIC_OUTPUT' : 'PASS', canonicalValidatorSha256: validatorSha256, problems: specificityProblems, whyItWorksCount: analysis.why_it_works?.length || 0, noRetryAuthorized: true });
    ledger.status = specificityProblems.length ? 'COMPLETED_GENERIC_OUTPUT' : 'COMPLETED_SPECIFICITY_PASS';
    ledger.completedAt = now();
    ledger.costUsd = costUsd;
    persist();
    console.log(JSON.stringify({ status: ledger.status, generationAttempts: 1, inputTokens: usage.promptTokenCount, outputIncludingThinkingTokens: billedOutputTokens, costUsd, specificityProblems, evidenceDirectory: OUTPUT_ROOT }, null, 2));
    if (specificityProblems.length) process.exitCode = 3;
  } catch (error) {
    ledger.status = ledger.generationAttempts ? 'ATTEMPT_FAILED_OR_RESULT_UNCERTAIN_NO_RETRY' : 'PREFLIGHT_BLOCKED_NO_GENERATION';
    ledger.failureAt = now();
    ledger.errorName = error?.name || 'Error';
    ledger.httpStatus = typeof error?.status === 'number' ? error.status : null;
    ledger.noRetry = true;
    persist();
    console.error(JSON.stringify({ status: ledger.status, errorName: ledger.errorName, httpStatus: ledger.httpStatus, generationAttempts: ledger.generationAttempts, evidenceDirectory: OUTPUT_ROOT }));
    process.exitCode = 2;
  }
}

main().catch(() => {
  console.error('LOCAL_PREFLIGHT_BLOCKED: approved input/configuration or credential check failed; no automatic retry.');
  process.exitCode = 1;
});
