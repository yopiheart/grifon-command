// Native-audio assessment. Default is offline; paid requests require saved human approval.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url)), REPO = path.resolve(HERE, '../../../..');
const PRIMARY = 'C:/Users/ADMIN/Desktop/grifon-command';
const FF = path.join(PRIMARY, 'node_modules/ffmpeg-static/ffmpeg.exe');
const ORIGINAL_SPEC = path.join(HERE, 'paid-spec.json'), SPEC = path.join(HERE, 'paid-spec-revised.json'), CATALOG = path.join(HERE, 'history-candidates.json'), CUES = path.join(HERE, 'cue-plan.json');
const ORIGINAL_SPEC_SHA = '26eb8ef67ced35afc04f958705859da04f8f6b96c3eba24b5cd47ca00bfe4807';
const SPEC_SHA = 'c7f9c8f0eac1ece2585ae031c4005657184467d397c208ee27a6cf7d108affeb';
const PRIOR_PENCIL_SHA = '40926a2f699e30c4b34f8d5a10245218dc5e25094f614b3ae16fac297f996fff';
const PRIOR_CARD_SHA = '655c8e903f600fcf0a1d3adfc0bc2a7a505c4b994286e2d156d30c026f2c8744';
const REPEAT_KEY = 'family-card-pop-manual-repeat-1';
const CATALOG_SHA = '9a074cb1957d0beaff469a1dff6575e49c7a7c6cbaa4d884eab5b3fe8eb5366a';
const CUES_SHA = '5e27af2b916188d10a3cbe2179cc270ccfaee6f148e73990ad2bc3763ca8ddd0';
const REFERENCE_PCM_SHA = '425f08ad8ad98382ea76f123a3359590d679f19ca9b69cbb7526d4940d7ad91d';
const LOCAL = path.join(REPO, '.tmp/grifon-elevenlabs-assessment');
const LIVE_LEDGER = path.join(PRIMARY, '.tmp/grifon-elevenlabs-assessment', ORIGINAL_SPEC_SHA);
const MODEL = 'gemini-3.5-flash', INPUT_LIMIT = 8192, OUTPUT_LIMIT = 2048, MAX_CALLS = 14, USD_CAP = .50;
const INPUT_RATE = 1.5, OUTPUT_RATE = 9, INLINE_LIMIT = 20 * 1024 * 1024;
const RESERVED_USD = (INPUT_LIMIT * INPUT_RATE + OUTPUT_LIMIT * OUTPUT_RATE) / 1e6;
const HTTP = { timeout: 60000, retryOptions: { attempts: 1 } };
const FINAL_GATES = ['manifestAndSourcesUnchanged', 'frozenMusicAndVoiceUnchanged', 'oldReleasesUnchanged', 'onlyMusicVoiceAndSelectedNewSfx', 'fixedMusicVoiceMasterGain', 'finiteSamples', 'voiceRmsAboveNewSfx', 'newSfxPhraseDucking', 'strictDecode', 'identicalH264', 'counted987Frames', 'formatAndDuration', 'encodedLoudnessAndTruePeak', 'silentBlackTail', 'faststart'];
const FAMILY_MAP = {
  pencil: ['pencil-outline'], 'card-pop': ['card-arrival', 'completion-tick'], 'orb-inward': ['orb-focus'],
  'reverse-air': ['inward-reverse'], 'laptop-contact': ['product-settle'], 'phone-contact': ['product-settle'],
  'camera-contact': ['product-settle'], 'rotation-air': ['rotation'], 'paper-swipe': ['screen-sweep'],
  keyboard: ['keyboard'], 'lens-focus': ['lens-focus'], 'logo-resolve': ['logo-resolve'],
};
const HISTORY_FAMILIES = Object.keys(FAMILY_MAP).filter(family => !['keyboard', 'lens-focus', 'logo-resolve'].includes(family));
const assert = (pass, message) => { if (!pass) throw new Error(message); };
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const sha = file => hash(fs.readFileSync(file));
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const relative = file => path.relative(REPO, file).replaceAll('\\', '/');
const now = () => new Date().toISOString();

function physical(file) {
  const suffix = []; let existing = path.resolve(file);
  for (;;) {
    try { fs.lstatSync(existing); break; } catch (error) { if (error.code !== 'ENOENT') throw error; }
    suffix.unshift(path.basename(existing)); const parent = path.dirname(existing); assert(parent !== existing, 'No existing path ancestor'); existing = parent;
  }
  return path.resolve(fs.realpathSync.native(existing), ...suffix);
}
function local(value) {
  assert(typeof value === 'string' && value.length && !path.isAbsolute(value) && !/^[a-z]+:/i.test(value) && !value.split(/[\\/]/).includes('..'), 'Use a repo-relative local input path');
  const file = path.resolve(REPO, value);
  assert(physical(file).toLowerCase().startsWith(`${physical(REPO)}${path.sep}`.toLowerCase()), 'Input path escaped workspace');
  assert(!/(?:^|[\\/])(?:\.env(?:\.|$)|credentials?|secrets?|sessions?|tokens?)(?:[.\\/]|$)/i.test(value), 'Credential/session inputs are forbidden');
  return file;
}
function verify(file, expected, label) { assert(fs.existsSync(file), `Missing offline input: ${label}`); assert(sha(file) === expected, `Changed protected input: ${label}`); }
function unchanged(snapshot) { for (const item of snapshot) verify(item.file, item.sha256, relative(item.file)); }
function runtimeDirectory(dir, root = REPO) {
  assert(physical(dir).toLowerCase() === path.resolve(dir).toLowerCase() && physical(dir).toLowerCase().startsWith(`${physical(root)}${path.sep}`.toLowerCase()), 'Runtime writes cannot use aliases or leave workspace');
  fs.mkdirSync(dir, { recursive: true });
}
function atomicJson(file, value) {
  if (fs.existsSync(file)) assert(fs.lstatSync(file).isFile() && fs.lstatSync(file).nlink === 1 && physical(file).toLowerCase() === file.toLowerCase(), 'Ledger/report target is aliased or hard-linked');
  const pending = `${file}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(pending, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); fs.renameSync(pending, file);
}
function wavInfo(file) {
  const bytes = fs.readFileSync(file); assert(bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WAVE', 'Expected native PCM WAV');
  let fmt, data;
  for (let at = 12; at + 8 <= bytes.length;) {
    const size = bytes.readUInt32LE(at + 4), kind = bytes.toString('ascii', at, at + 4); assert(at + 8 + size <= bytes.length, 'Truncated WAV');
    if (kind === 'fmt ') fmt = at + 8; if (kind === 'data') data = size; at += 8 + size + size % 2;
  }
  assert(fmt && data, 'WAV lacks format/data');
  const channels = bytes.readUInt16LE(fmt + 2), sampleRate = bytes.readUInt32LE(fmt + 4), bits = bytes.readUInt16LE(fmt + 14);
  assert(bytes.readUInt16LE(fmt) === 1 && channels === 2 && sampleRate === 48000 && bits === 16, 'Assessment WAV must be PCM16 stereo48k');
  return { bytes: bytes.length, channels, sampleRate, bits, durationSeconds: data / (sampleRate * channels * bits / 8) };
}

function offlineContext() {
  verify(ORIGINAL_SPEC, ORIGINAL_SPEC_SHA, 'original approved spec');
  verify(SPEC, SPEC_SHA, 'immutable paid-spec'); verify(CATALOG, CATALOG_SHA, 'immutable History catalog'); verify(CUES, CUES_SHA, 'immutable cue plan');
  const spec = readJson(SPEC), catalog = readJson(CATALOG), cues = readJson(CUES), assessment = spec.audioAssessment;
  assert(assessment.model === MODEL && assessment.thinkingLevel === 'LOW' && assessment.maximumModelCalls === MAX_CALLS && assessment.inputTokenLimitPerCall === INPUT_LIMIT && assessment.maxOutputTokensPerCall === OUTPUT_LIMIT && assessment.hardUsdCap === USD_CAP && assessment.automaticRetries === false, 'Approved model/caps/retry contract changed');
  assert(assessment.tools.length === 0 && assessment.responseMimeType === 'application/json' && assessment.rateEvidence.usdPerMillionInputTokens === INPUT_RATE && assessment.rateEvidence.usdPerMillionOutputTokensIncludingThinking === OUTPUT_RATE, 'Approved tools/output/rates changed');
  assert(spec.protectedAssets.candidateCatalog.sha256 === CATALOG_SHA && spec.protectedAssets.cuePlan.sha256 === CUES_SHA && catalog.candidates.length === 36, 'Protected catalogs do not match spec');
  const original = readJson(ORIGINAL_SPEC), revision = spec.revision;
  assert(JSON.stringify(spec.protectedAssets) === JSON.stringify(original.protectedAssets) && JSON.stringify(spec.generation) === JSON.stringify(original.generation) && assessment.comparisonPrompt === original.audioAssessment.comparisonPrompt && assessment.finalPrompt === original.audioAssessment.finalPrompt, 'Revision changed protected assets or tuned prompts/generation settings');
  assert(revision.previousApprovedSpecSha256 === ORIGINAL_SPEC_SHA && revision.canonicalLedgerSpecSha256 === ORIGINAL_SPEC_SHA && revision.carriedGeneratedAssessments === 2 && revision.carriedReservedUsd === .06144 && revision.carriedActualUsd === .039258 && revision.maximumAdditionalGeneratedAssessments === 12 && revision.manualRepeat.newKey === REPEAT_KEY && revision.manualRepeat.maximumAttempts === 1, 'Revision carry-forward/manual repeat contract changed');
  const snapshot = [{ file: ORIGINAL_SPEC, sha256: ORIGINAL_SPEC_SHA }, { file: SPEC, sha256: SPEC_SHA }, { file: CATALOG, sha256: CATALOG_SHA }, { file: CUES, sha256: CUES_SHA }];
  const priorRecords = [];
  for (const prior of revision.priorAttempts) {
    const attemptFile = path.join(LIVE_LEDGER, `attempt-${prior.key}.json`), resultFile = path.join(LIVE_LEDGER, `result-${prior.key}.json`);
    verify(attemptFile, prior.attemptSha256, 'preserved prior attempt'); verify(resultFile, prior.resultSha256, 'preserved prior result');
    const record = readJson(attemptFile); assert(record.generationCalls === 1 && record.reservedUsd === RESERVED_USD && record.actualUsd === prior.actualUsd && record.usage?.known === true && record.resultSha256 === prior.resultSha256, 'Prior usage/reservation no longer known');
    priorRecords.push(record); snapshot.push({ file: attemptFile, sha256: prior.attemptSha256 }, { file: resultFile, sha256: prior.resultSha256 });
  }
  assert(priorRecords.length === 2 && Math.abs(priorRecords.reduce((sum, record) => sum + record.actualUsd, 0) - .039258) < 1e-12, 'Prior counters/spend missing');
  for (const [name, asset] of Object.entries(spec.protectedAssets)) if (asset?.path && asset.sha256) { const file = local(asset.path); verify(file, asset.sha256, name); snapshot.push({ file, sha256: asset.sha256 }); }
  const families = [...HISTORY_FAMILIES];
  assert(new Set(catalog.candidates.map(candidate => candidate.family)).size === families.length, 'Unexpected History family count');
  for (const family of families) {
    const rows = catalog.candidates.filter(candidate => candidate.family === family).sort((a, b) => a.candidate - b.candidate);
    assert(rows.length === 4 && rows.every((row, index) => row.candidate === index + 1 && row.prompt === rows[0].prompt), `Family ${family} does not have exact four matching-prompt candidates`);
    for (const row of rows) { const file = local(row.path); verify(file, row.sha256, row.id); const info = wavInfo(file); assert(info.bytes === row.bytes && Math.abs(info.durationSeconds - row.durationSeconds) < 1 / 48000, `Native candidate metadata changed: ${row.id}`); snapshot.push({ file, sha256: row.sha256 }); }
  }
  return { spec, catalog, cues, families, snapshot, priorRecords };
}

function addGeneratedCatalog(context, options) {
  if (!options.generated) { assert(!options.generatedSha, '--generated-catalog-sha requires --generated-catalog'); return; }
  assert(/^[a-f0-9]{64}$/.test(options.generatedSha ?? ''), 'Generated native catalog needs an explicit SHA lock');
  const file = local(options.generated); verify(file, options.generatedSha, 'approved generated catalog');
  const catalog = readJson(file), generation = context.spec.generation;
  assert(catalog.schemaVersion === 1 && catalog.mode === 'approved-generated-sfx' && catalog.approvedSpecSha256 === SPEC_SHA && catalog.cuePlanSha256 === CUES_SHA, 'Generated catalog spec/cue provenance differs');
  assert(Array.isArray(catalog.actions) && catalog.actions.length > 0 && catalog.actions.length <= generation.maximumGenerationActions && Array.isArray(catalog.candidates), 'Generated action/candidate limits invalid');
  assert(new Set(catalog.actions.map(action => action.family)).size === catalog.actions.length, 'One UI Generate action per exact optional family');
  assert(new Set(catalog.candidates.map(row => row.sha256)).size === catalog.candidates.length && new Set(catalog.candidates.map(row => physical(local(row.path)).toLowerCase())).size === catalog.candidates.length, 'Generated candidates must have distinct native paths and bytes');
  let quoted = 0, charged = 0, previousBalance;
  for (const action of catalog.actions) {
    const prompt = generation.prompts.find(row => row.id === action.family);
    assert(prompt && action.prompt === prompt.text && action.outcome === 'COMPLETE' && Number.isFinite(Date.parse(action.generatedAt)), 'Generated family/prompt/outcome is not exactly approved');
    assert(action.settings && Object.keys(action.settings).length === Object.keys(generation.settings).length && Object.entries(generation.settings).every(([key, value]) => action.settings[key] === value), 'Generated UI settings differ from exact approval');
    assert([action.quotedCredits, action.startingCreditBalance, action.endingCreditBalance].every(value => Number.isFinite(value) && value >= 0) && action.quotedCredits > 0 && action.startingCreditBalance >= action.endingCreditBalance, 'Missing/unknown generated credit evidence');
    assert(previousBalance === undefined || action.startingCreditBalance === previousBalance, 'Generation credit ledger has an unexplained gap');
    const spent = action.startingCreditBalance - action.endingCreditBalance; assert(spent > 0 && spent <= action.quotedCredits, 'Unknown or above-quote generated credit outcome');
    quoted += action.quotedCredits; charged += spent; previousBalance = action.endingCreditBalance;
    assert(quoted <= generation.hardCreditCap && charged <= generation.hardCreditCap, '250-credit generation cap exceeded');
    const rows = catalog.candidates.filter(row => row.family === action.family).sort((a, b) => a.candidate - b.candidate);
    assert(rows.length === 4 && rows.every((row, index) => row.candidate === index + 1 && row.prompt === prompt.text && row.sourceLabel === 'ElevenLabsWebsiteSoundEffects'), 'Generated family requires four native numbered exact-prompt sources');
    for (const row of rows) {
      const asset = local(row.path); verify(asset, row.sha256, row.id); const info = wavInfo(asset);
      assert(info.bytes === row.bytes && Math.abs(info.durationSeconds - row.durationSeconds) < 1 / 48000, 'Generated native PCM metadata differs');
      assert(!context.catalog.candidates.some(existing => existing.id === row.id || existing.sha256 === row.sha256), 'Generated candidate duplicates protected History bytes/IDs');
      context.snapshot.push({ file: asset, sha256: row.sha256 });
    }
  }
  assert(catalog.candidates.length === catalog.actions.length * 4 && new Set(catalog.candidates.map(row => row.id)).size === catalog.candidates.length && catalog.candidates.every(row => catalog.actions.some(action => action.family === row.family)), 'Generated catalog contains unapproved extras/duplicate IDs');
  context.snapshot.push({ file, sha256: options.generatedSha });
  context.generated = { file, sha256: options.generatedSha, quotedCredits: quoted, chargedCredits: charged, families: catalog.actions.map(action => action.family) };
  context.catalog.candidates.push(...catalog.candidates); context.families.push(...context.generated.families);
}

function audioCache(context, final) {
  const source = final ? final.mp4 : local(context.spec.protectedAssets.reference.path), sourceHash = sha(source);
  const key = final ? `final-${sourceHash}-${final.manifestHash}` : `reference-${sourceHash}`;
  return { source, sourceHash, wav: path.join(LOCAL, `${key}.wav`), meta: path.join(LOCAL, `${key}.json`), final };
}
function cachedAudio(cache) {
  assert(fs.existsSync(cache.wav) && fs.existsSync(cache.meta), 'Audio cache unprepared; run --prepare-audio explicitly before assessment');
  const metadata = readJson(cache.meta);
  assert(metadata.sourceSha256 === cache.sourceHash && metadata.selectedManifestSha256 === (cache.final?.manifestHash ?? null), 'Prepared audio source/manifest changed');
  verify(cache.source, metadata.sourceSha256, 'prepared audio source'); verify(cache.wav, metadata.wavSha256, 'prepared PCM audio');
  if (!cache.final) assert(metadata.wavSha256 === REFERENCE_PCM_SHA, 'Prepared reference PCM differs from the frozen local decode');
  wavInfo(cache.wav); return { ...metadata, file: cache.wav };
}
function prepareAudio(cache) {
  if (fs.existsSync(cache.wav) || fs.existsSync(cache.meta)) return cachedAudio(cache);
  runtimeDirectory(LOCAL); assert(fs.existsSync(FF), 'Installed local FFmpeg missing');
  const staging = fs.mkdtempSync(path.join(LOCAL, 'decode-')), candidate = path.join(staging, 'decoded.wav');
  const result = spawnSync(FF, ['-hide_banner', '-v', 'error', '-xerror', '-err_detect', 'explode', '-protocol_whitelist', 'file,pipe', '-f', 'mov', '-i', cache.source, '-map', '0:a:0', '-vn', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', candidate], { windowsHide: true, maxBuffer: 1024 * 1024 });
  assert(!result.error && result.status === 0, 'Local PCM decode failed; no upload performed');
  const info = wavInfo(candidate), metadata = { source: relative(cache.source), sourceSha256: cache.sourceHash, wavSha256: sha(candidate), selectedManifestSha256: cache.final?.manifestHash ?? null, recipe: 'FFmpeg mov/local file,pipe → PCM16 stereo48k WAV', ...info };
  verify(cache.source, cache.sourceHash, 'source after offline decode');
  fs.copyFileSync(candidate, cache.wav, fs.constants.COPYFILE_EXCL); fs.writeFileSync(cache.meta, JSON.stringify(metadata, null, 2) + '\n', { flag: 'wx' });
  return cachedAudio(cache);
}

function finalInputs(context, options) {
  if (!options.final) return null;
  assert(options.selected, '--final requires --selected-manifest');
  const mp4 = local(options.final), manifestFile = local(options.selected), manifestHash = sha(manifestFile), manifest = readJson(manifestFile);
  const reportFile = path.join(HERE, 'qa/replacement-report.json'); assert(fs.existsSync(reportFile), 'Final assessment requires actual replace.mjs media report');
  const report = readJson(reportFile), sourceHash = sha(mp4);
  assert(manifest.mode === 'new-only-sfx-replacement' && local(manifest.output) === mp4 && report.mode === manifest.mode && report.manifestSha256 === manifestHash && report.outputSha256 === sourceHash, 'Final mix/selected manifest does not match replacement evidence');
  assert(report.status === 'TECHNICAL_PASS_AUDITORY_QA_PENDING' && Object.keys(report.gates ?? {}).length === FINAL_GATES.length && FINAL_GATES.every(name => report.gates[name] === true), 'Final mix has not passed exact replacement gates');
  assert(report.fixedMasterGain === context.spec.protectedAssets.masterContributionGain && report.videoPayload?.equal === true, 'Final mix changed protected contribution/picture');
  for (const asset of manifest.assets) { assert(context.catalog.candidates.some(candidate => candidate.sha256 === asset.sha256), 'Final manifest contains a source outside the exact approved History catalog'); const file = local(asset.path); verify(file, asset.sha256, asset.id); context.snapshot.push({ file, sha256: asset.sha256 }); }
  context.snapshot.push({ file: mp4, sha256: sourceHash }, { file: manifestFile, sha256: manifestHash }, { file: reportFile, sha256: sha(reportFile) });
  return { mp4, manifest, manifestFile, manifestHash, sourceHash };
}

function requestFor(context, options, reference, finalAudio, final) {
  const assets = [{ role: 'reference', file: reference.file, sha256: reference.wavSha256 }];
  let parts, key, brief;
  if (final) {
    key = 'final'; brief = { finalMp4Sha256: final.sourceHash, selectedManifestSha256: final.manifestHash, selectedCueManifest: final.manifest };
    assets.push({ role: 'final-mix', file: finalAudio.file, sha256: finalAudio.wavSha256 });
    parts = [{ text: context.spec.audioAssessment.finalPrompt }, { text: JSON.stringify(brief) }];
  } else {
    const family = options.family; assert(FAMILY_MAP[family] && context.families.includes(family), 'Choose one exact available approved family with --family'); key = options.manualRepeat ? REPEAT_KEY : `family-${family}`;
    const candidates = context.catalog.candidates.filter(candidate => candidate.family === family).sort((a, b) => a.candidate - b.candidate);
    const cueFamilies = FAMILY_MAP[family];
    brief = { familyId: family, positiveSoundDescription: candidates[0].prompt, cuePlanSha256: CUES_SHA, cueFamilies, correspondingMotionCues: context.cues.motionCues.filter(cue => cueFamilies.includes(cue.family) || cue.families?.some(value => cueFamilies.includes(value))) };
    if (context.generated?.families.includes(family)) brief.generatedCatalog = { sha256: context.generated.sha256, quotedCredits: context.generated.quotedCredits, chargedCredits: context.generated.chargedCredits, settings: context.spec.generation.settings };
    assert(brief.correspondingMotionCues.length > 0, 'Family lacks corresponding deterministic cue brief');
    parts = [{ text: context.spec.audioAssessment.comparisonPrompt }, { text: JSON.stringify(brief) }];
    assets.push(...candidates.map(candidate => ({ role: `candidate-${candidate.candidate}`, file: local(candidate.path), sha256: candidate.sha256, label: { id: candidate.id, candidate: candidate.candidate, sourceLabel: candidate.sourceLabel, positivePrompt: candidate.prompt } })));
  }
  for (const asset of assets) { verify(asset.file, asset.sha256, asset.role); parts.push({ text: JSON.stringify(asset.label ?? { role: asset.role }) }, { inlineData: { mimeType: 'audio/wav', data: fs.readFileSync(asset.file).toString('base64') } }); }
  const request = { model: MODEL, contents: [{ role: 'user', parts }], config: { maxOutputTokens: OUTPUT_LIMIT, thinkingConfig: { thinkingLevel: 'LOW' }, responseMimeType: 'application/json', tools: [], httpOptions: HTTP } };
  const bytes = Buffer.byteLength(JSON.stringify(request)); assert(bytes <= INLINE_LIMIT, 'Inline request exceeds 20 MiB; no silent file upload allowed');
  return { key, manualRepeat: options.manualRepeat === true, request, requestSha256: hash(JSON.stringify(request)), inlineRequestBytes: bytes, brief, assets: assets.map(asset => ({ role: asset.role, path: relative(asset.file), sha256: asset.sha256 })), snapshot: assets.map(asset => ({ file: asset.file, sha256: asset.sha256 })) };
}

function validateNote(note, approvedSha, expectedSpec = SPEC_SHA, expectedCues = CUES_SHA) {
  assert(approvedSha === expectedSpec, 'CLI approved SHA differs from the immutable spec');
  assert(note?.status === 'HUMAN_APPROVED' && note.source === 'direct-user-message' && note.audioAssessment === true && typeof note.quote === 'string' && note.quote.trim().length >= 6 && Number.isFinite(Date.parse(note.recordedAt)), 'A separately saved direct human authorization note is required; a CLI flag is not approval');
  assert(note.approvedSpecSha256 === expectedSpec && note.cuePlanSha256 === expectedCues, 'Authorization note spec/cue hashes do not match');
  assert(['existing-only', 'existing-plus-generation'].includes(note.mode), 'Authorization must distinguish existing-only from generation permission');
}

function knownPriorTruncation(record) {
  return record.key === 'family-card-pop' && record.recordFileSha256 === PRIOR_CARD_SHA && record.specSha256 === ORIGINAL_SPEC_SHA && record.generationCalls === 1 && record.usage?.known === true && record.actualUsd === .0213165 && record.reservedUsd === RESERVED_USD && record.resultSha256 === '39bb28ef9b53807563932e6e6a30e3bc83b6394fece114d53257396ab7abd385';
}
function checkBudget(records, additional = RESERVED_USD) {
  assert(records.length < MAX_CALLS, '14-assessment cap reached');
  assert(!records.some(record => record.state === 'PROVIDER_CONTRACT_VIOLATION'), 'Provider usage contract violated; reconciliation required');
  assert(records.every(record => record.state === 'RESULT_RECORDED' || knownPriorTruncation(record)), 'Unresolved or usage-unknown assessment; reconciliation required before any further call');
  assert(records.every(record => Number.isFinite(record.reservedUsd) && record.reservedUsd >= 0), 'Corrupt reservation ledger; stop');
  assert(records.reduce((sum, record) => sum + record.reservedUsd, 0) + additional <= USD_CAP + 1e-12, '$0.50 assessment cap would be exceeded');
}
function reserveAttempt(dir, plan, authorizationHash, mock = false) {
  assert(mock || path.resolve(dir).toLowerCase() === LIVE_LEDGER.toLowerCase(), 'Live assessment requires the canonical per-spec ledger');
  runtimeDirectory(dir, mock ? REPO : PRIMARY); const lock = path.join(dir, 'reservation.lock'); let lockHandle;
  try { lockHandle = fs.openSync(lock, 'wx'); } catch { throw new Error('Exclusive reservation lock exists; no retry or call'); }
  try {
    const file = path.join(dir, `attempt-${plan.key}.json`);
    assert(!fs.existsSync(file), 'This family/final assessment already has an attempt; no retry');
    const records = fs.readdirSync(dir).filter(name => /^attempt-.*\.json$/.test(name)).map(name => { const input = path.join(dir, name); return { ...readJson(input), recordFileSha256: sha(input) }; });
    if (!mock) {
      assert(records.some(record => record.key === 'family-pencil' && record.recordFileSha256 === PRIOR_PENCIL_SHA) && records.some(knownPriorTruncation), 'Canonical ledger lost either prior paid attempt');
      assert(plan.key !== 'family-pencil' && plan.key !== 'family-card-pop', 'Original pencil is reused; card-pop needs the explicit manual-repeat key');
      assert(plan.key !== REPEAT_KEY || plan.manualRepeat === true, 'Manual card-pop repeat flag required');
    }
    checkBudget(records);
    const record = { specSha256: SPEC_SHA, canonicalLedgerSpecSha256: ORIGINAL_SPEC_SHA, cuePlanSha256: CUES_SHA, authorizationNoteSha256: authorizationHash, key: plan.key, manualRepeat: plan.manualRepeat === true, state: 'RESERVED_OUTCOME_UNKNOWN', reservedAt: now(), reservedUsd: RESERVED_USD, reservedInputTokens: INPUT_LIMIT, reservedOutputTokensIncludingThinking: OUTPUT_LIMIT, model: MODEL, thinkingLevel: 'LOW', requestSha256: plan.requestSha256, inlineRequestBytes: plan.inlineRequestBytes, assets: plan.assets, mockOnly: mock, countTokensCalls: 0, generationCalls: 0, actualUsd: null };
    fs.writeFileSync(file, JSON.stringify(record, null, 2) + '\n', { flag: 'wx' }); return { file, record };
  } finally { fs.closeSync(lockHandle); fs.unlinkSync(lock); }
}
function usageCost(usage) {
  const input = usage?.promptTokenCount, output = usage?.candidatesTokenCount, thinking = usage?.thoughtsTokenCount ?? 0;
  if (![input, output, thinking].every(value => Number.isInteger(value) && value >= 0)) return { known: false, actualUsd: null };
  return { known: true, inputTokens: input, candidateTokens: output, thinkingTokens: thinking, billedOutputTokens: output + thinking, actualUsd: (input * INPUT_RATE + (output + thinking) * OUTPUT_RATE) / 1e6 };
}
function safeErrorDetails(error, phase) {
  const names = new Set(['ApiError', 'Error', 'TypeError', 'SyntaxError', 'AbortError', 'TimeoutError']);
  const codes = new Set(['INVALID_ARGUMENT', 'FAILED_PRECONDITION', 'RESOURCE_EXHAUSTED', 'UNAUTHENTICATED', 'PERMISSION_DENIED', 'NOT_FOUND', 'INTERNAL', 'UNAVAILABLE', 'DEADLINE_EXCEEDED', 'CANCELLED', 'ABORTED', 'OUT_OF_RANGE', 'DATA_LOSS', 'ALREADY_EXISTS', 'UNKNOWN', 'ENOTFOUND', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EAI_AGAIN', 'UND_ERR_CONNECT_TIMEOUT', 'UND_ERR_HEADERS_TIMEOUT', 'UND_ERR_SOCKET', 'ABORT_ERR']);
  const read = (value, key) => { try { return value?.[key]; } catch { return undefined; } };
  const classified = [];
  for (let value = error, depth = 0; value && depth < 3; value = read(value, 'cause'), depth++) {
    const name = read(value, 'name'), status = read(value, 'status') ?? read(value, 'statusCode'), code = read(value, 'code');
    classified.push({ name: names.has(name) ? name : 'UnclassifiedError', httpStatus: Number.isInteger(status) && status >= 100 && status <= 599 ? status : null, code: codes.has(code) ? code : null });
  }
  return { phase, causeChain: classified };
}
async function oneAttempt(client, dir, plan, snapshot, authorizationHash, mock = false) {
  const attempt = reserveAttempt(dir, plan, authorizationHash, mock), record = attempt.record;
  const save = () => atomicJson(attempt.file, record);
  let phase = 'INPUT_REHASH';
  try {
    unchanged(snapshot); unchanged(plan.snapshot ?? []);
    record.countTokensCalls = 1; record.state = 'COUNT_TOKENS_OUTCOME_UNKNOWN'; save();
    phase = 'COUNT_TOKENS';
    const count = await client.models.countTokens({ model: MODEL, contents: plan.request.contents, config: { httpOptions: HTTP } });
    phase = 'COUNT_TOKENS_VALIDATE';
    assert(Number.isInteger(count.totalTokens) && count.totalTokens >= 0 && count.totalTokens <= INPUT_LIMIT, 'Input token preflight invalid or exceeds 8192');
    phase = 'INPUT_REHASH_BEFORE_GENERATION';
    record.countedInputTokens = count.totalTokens; unchanged(snapshot); unchanged(plan.snapshot ?? []);
    record.generationCalls = 1; record.state = 'GENERATION_OUTCOME_UNKNOWN'; save();
    phase = 'GENERATE_CONTENT';
    const response = await client.models.generateContent(plan.request);
    phase = 'USAGE_VALIDATE';
    record.usage = usageCost(response.usageMetadata); record.actualUsd = record.usage.actualUsd;
    if (!record.usage.known) { record.state = 'RESULT_RECORDED_USAGE_UNKNOWN'; save(); throw new Error('Provider usage unknown; stop for reconciliation'); }
    if (record.usage.inputTokens > INPUT_LIMIT || record.usage.billedOutputTokens > OUTPUT_LIMIT || record.actualUsd > RESERVED_USD + 1e-12) { record.state = 'PROVIDER_CONTRACT_VIOLATION'; save(); throw new Error('Provider token/cost contract violated; stop'); }
    phase = 'RESPONSE_TEXT'; const text = response.text;
    assert(typeof text === 'string' && text.length && !response.functionCalls?.length, 'Assessment did not return JSON text only');
    const resultFile = path.join(dir, `result-${plan.key}.json`); fs.writeFileSync(resultFile, text + '\n', { flag: 'wx' }); record.resultSha256 = sha(resultFile);
    phase = 'RESPONSE_JSON'; const result = JSON.parse(text);
    if (plan.key !== 'final') assert(result.familyId === plan.brief.familyId && Array.isArray(result.candidates) && result.candidates.length === 4 && result.candidates.every((candidate, index) => candidate.number === index + 1) && (result.bestCandidate === null || result.bestCandidate === 'unsuitable' || [1, 2, 3, 4].includes(result.bestCandidate)), 'Comparison JSON does not identify the exact four candidates/family');
    else assert(typeof result.verdict === 'string' && Array.isArray(result.concerns), 'Final assessment JSON shape invalid');
    phase = 'INPUT_REHASH_AFTER_GENERATION'; unchanged(snapshot); unchanged(plan.snapshot ?? []);
    record.state = 'RESULT_RECORDED'; record.completedAt = now(); save();
    return { key: plan.key, state: record.state, resultFile: relative(resultFile), resultSha256: record.resultSha256, usage: record.usage, reservedUsd: record.reservedUsd, generationCalls: record.generationCalls, countTokensCalls: record.countTokensCalls };
  } catch (error) {
    record.safeError = safeErrorDetails(error, phase);
    if (!['PROVIDER_CONTRACT_VIOLATION', 'RESULT_RECORDED_USAGE_UNKNOWN'].includes(record.state)) record.state = 'ATTEMPT_CONSUMED_OUTCOME_UNKNOWN_OR_REJECTED';
    record.stoppedAt = now(); save(); throw new Error('Assessment stopped; this attempt and full reservation remain consumed. No retry/fallback was made.');
  }
}

async function assess(context, options, plan) {
  assert(options.authorization, '--assess requires a separately saved human authorization note');
  const noteFile = local(options.authorization); assert(noteFile.toLowerCase().endsWith('.json'), 'Authorization note must be an explicit local JSON record');
  assert(fs.existsSync(noteFile), 'Saved human authorization note is missing'); const note = readJson(noteFile);
  validateNote(note, options.approved); assert(!context.generated || note.mode === 'existing-plus-generation', 'Generated assessment needs human generation permission'); const authorizationHash = sha(noteFile);
  const snapshot = [...context.snapshot, { file: noteFile, sha256: authorizationHash }]; unchanged(snapshot);
  // The sole environment value this runner reads; never written or printed.
  const apiKey = process.env.GEMINI_API_KEY; assert(typeof apiKey === 'string' && apiKey.length > 0, 'Process GEMINI_API_KEY is absent; no provider call made');
  const { GoogleGenAI } = await import(pathToFileURL(path.join(PRIMARY, 'node_modules/@google/genai/dist/node/index.mjs')).href);
  const client = new GoogleGenAI({ apiKey, vertexai: false, httpOptions: HTTP });
  const result = await oneAttempt(client, LIVE_LEDGER, plan, snapshot, authorizationHash);
  console.log(JSON.stringify({ ...result, auditoryLimit: 'Machine audio is mono-combined/downsampled; spatial/full-band/user-taste review remains human.', automaticRetries: 0, fallbackCalls: 0 }));
}

async function selfTest() {
  runtimeDirectory(LOCAL); const dir = fs.mkdtempSync(path.join(LOCAL, 'MOCK-NONLIVE-fixture-'));
  const expectFail = async (operation, includes) => { let failed = false; try { await operation(); } catch (error) { failed = error.message.includes(includes); } assert(failed, `Mock control did not reject: ${includes}`); };
  const note = { status: 'HUMAN_APPROVED', source: 'direct-user-message', audioAssessment: true, quote: 'MOCK ONLY, not a real approval', recordedAt: now(), approvedSpecSha256: '0'.repeat(64), cuePlanSha256: '1'.repeat(64), mode: 'existing-only' };
  validateNote(note, '0'.repeat(64), '0'.repeat(64), '1'.repeat(64));
  await expectFail(() => validateNote(null, SPEC_SHA), 'authorization note'); await expectFail(() => validateNote(note, SPEC_SHA), 'hashes do not match');
  await expectFail(() => validateNote({ ...note, mode: 'unspecified' }, '0'.repeat(64), '0'.repeat(64), '1'.repeat(64)), 'distinguish');
  await expectFail(() => validateNote({ ...note, approvedSpecSha256: ORIGINAL_SPEC_SHA, cuePlanSha256: CUES_SHA }, SPEC_SHA), 'hashes do not match');
  await expectFail(() => checkBudget(Array.from({ length: 14 }, () => ({ reservedUsd: RESERVED_USD }))), '14-assessment');
  await expectFail(() => checkBudget([{ reservedUsd: .49, state: 'RESULT_RECORDED' }]), '$0.50');
  const priorCard = { ...readJson(path.join(LIVE_LEDGER, 'attempt-family-card-pop.json')), recordFileSha256: PRIOR_CARD_SHA }, priorPencil = readJson(path.join(LIVE_LEDGER, 'attempt-family-pencil.json'));
  checkBudget([priorPencil, priorCard]); assert(knownPriorTruncation(priorCard), 'Exact approved known truncation was not carried');
  await expectFail(() => checkBudget([{ ...priorCard, recordFileSha256: '0'.repeat(64) }]), 'reconciliation required');
  const fullKnown = [...[priorPencil, priorCard], ...Array.from({ length: 11 }, () => ({ reservedUsd: RESERVED_USD, state: 'RESULT_RECORDED' }))]; checkBudget(fullKnown);
  assert(Math.abs((fullKnown.length + 1) * RESERVED_USD - .43008) < 1e-12, 'Original reservations not carried into the 14-call ceiling');
  await expectFail(() => optionsFrom(['--family', 'orb-inward', '--manual-repeat-card-pop']), 'only for card-pop');
  const protectedFixture = path.join(dir, 'protected-NONMEDIA.txt'); fs.writeFileSync(protectedFixture, 'unchanged'); const expected = sha(protectedFixture); fs.appendFileSync(protectedFixture, ' changed'); await expectFail(() => verify(protectedFixture, expected, 'fixture'), 'Changed protected input');
  const plan = { key: 'family-mock', requestSha256: '2'.repeat(64), inlineRequestBytes: 1, assets: [], snapshot: [], brief: { familyId: 'mock' }, request: { model: MODEL, contents: [], config: { maxOutputTokens: OUTPUT_LIMIT, responseMimeType: 'application/json', tools: [], httpOptions: HTTP } } };
  let counts = 0, generations = 0;
  const client = { models: { countTokens: async () => { counts++; return { totalTokens: 1 }; }, generateContent: async () => { generations++; throw new Error('MOCK transport failure'); } } };
  await expectFail(() => oneAttempt(client, dir, plan, [], '3'.repeat(64), true), 'attempt and full reservation');
  await expectFail(() => oneAttempt(client, dir, plan, [], '3'.repeat(64), true), 'already has an attempt'); assert(counts === 1 && generations === 1, 'A retry occurred');
  await expectFail(() => oneAttempt(client, dir, { ...plan, key: 'family-other' }, [], '3'.repeat(64), true), 'reconciliation required'); assert(counts === 1 && generations === 1, 'Unknown outcome allowed another family');
  const diagnosticDir = path.join(dir, 'safe-api-error'), secretSentinel = 'MOCK_SECRET_SENTINEL_NEVER_SAVE';
  const apiError = Object.assign(new Error(secretSentinel), { name: 'ApiError', status: 503, code: 'UNAVAILABLE', cause: Object.assign(new Error(secretSentinel), { code: 'ECONNRESET' }) });
  for (const field of ['message', 'headers', 'body', 'url']) Object.defineProperty(apiError, field, { get() { throw new Error('Forbidden error field read'); } });
  let diagnosticCalls = 0;
  const diagnosticClient = { models: { countTokens: async () => ({ totalTokens: 1 }), generateContent: async () => { diagnosticCalls++; throw apiError; } } };
  await expectFail(() => oneAttempt(diagnosticClient, diagnosticDir, plan, [], '3'.repeat(64), true), 'attempt and full reservation');
  const diagnosticRecord = readJson(path.join(diagnosticDir, 'attempt-family-mock.json'));
  assert(diagnosticRecord.safeError.phase === 'GENERATE_CONTENT' && diagnosticRecord.safeError.causeChain[0].name === 'ApiError' && diagnosticRecord.safeError.causeChain[0].httpStatus === 503 && diagnosticRecord.safeError.causeChain[0].code === 'UNAVAILABLE' && diagnosticRecord.safeError.causeChain[1].code === 'ECONNRESET', 'Useful safe API diagnostics lost');
  assert(!JSON.stringify(diagnosticRecord).includes(secretSentinel), 'Error diagnostics leaked a raw secret/message');
  await expectFail(() => oneAttempt(diagnosticClient, diagnosticDir, plan, [], '3'.repeat(64), true), 'already has an attempt'); assert(diagnosticCalls === 1, 'API failure retried');
  const overflowDir = path.join(dir, 'overflow');
  const overflow = { models: { countTokens: async () => ({ totalTokens: 8193 }), generateContent: async () => { throw new Error('Must not generate'); } } };
  await expectFail(() => oneAttempt(overflow, overflowDir, { ...plan, key: 'family-overflow' }, [], '3'.repeat(64), true), 'attempt and full reservation');
  assert(readJson(path.join(overflowDir, 'attempt-family-overflow.json')).generationCalls === 0, 'Token overflow generated a response');
  const usageDir = path.join(dir, 'usage-unknown'), unknownUsage = { models: { countTokens: async () => ({ totalTokens: 1 }), generateContent: async () => ({ text: '{}' }) } };
  await expectFail(() => oneAttempt(unknownUsage, usageDir, plan, [], '3'.repeat(64), true), 'attempt and full reservation');
  const unknownRecord = readJson(path.join(usageDir, 'attempt-family-mock.json')); assert(unknownRecord.state === 'RESULT_RECORDED_USAGE_UNKNOWN', 'Unknown usage returned success'); await expectFail(() => checkBudget([unknownRecord]), 'reconciliation required');
  const violationDir = path.join(dir, 'over-cap-invalid-json'), violation = { models: { countTokens: async () => ({ totalTokens: 1 }), generateContent: async () => ({ text: 'INVALID JSON', usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 2049 } }) } };
  await expectFail(() => oneAttempt(violation, violationDir, plan, [], '3'.repeat(64), true), 'attempt and full reservation');
  const violationRecord = readJson(path.join(violationDir, 'attempt-family-mock.json')); assert(violationRecord.state === 'PROVIDER_CONTRACT_VIOLATION', 'Parsing hid a provider contract violation'); await expectFail(() => checkBudget([violationRecord]), 'Provider usage contract');
  const repeatDir = path.join(dir, 'one-manual-repeat');
  const repeatPlan = { ...plan, key: REPEAT_KEY, manualRepeat: true };
  let repeatCalls = 0;
  const complete = { models: { countTokens: async () => ({ totalTokens: 1 }), generateContent: async () => { repeatCalls++; return { text: JSON.stringify({ familyId: 'mock', candidates: [1, 2, 3, 4].map(number => ({ number })), bestCandidate: 1 }), usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, thoughtsTokenCount: 1 } }; } } };
  await oneAttempt(complete, repeatDir, repeatPlan, [], '3'.repeat(64), true);
  await expectFail(() => oneAttempt(complete, repeatDir, repeatPlan, [], '3'.repeat(64), true), 'already has an attempt'); assert(repeatCalls === 1, 'Second manual repeat occurred');
  assert(usageCost({ promptTokenCount: 10, candidatesTokenCount: 20, thoughtsTokenCount: 30 }).billedOutputTokens === 50, 'Thinking cost omitted');
  console.log(JSON.stringify({ status: 'OFFLINE_MOCK_CONTRACT_PASS', mockOnly: true, providerCalls: 0, approvalHashModeRefusals: true, budgetAndTokenRefusals: true, changedInputRefusal: true, oneConsumedAttemptNoRetry: true, thinkingCostIncluded: true, fixture: relative(dir) }));
}

function optionsFrom(args) {
  const options = {};
  for (let index = 0; index < args.length; index++) {
    const flag = args[index];
    if (flag === '--manual-repeat-card-pop') options.manualRepeat = true;
    else if (flag === '--reuse-pencil') options.reusePencil = true;
    else if (['--assess', '--prepare-audio', '--self-test', '--help'].includes(flag)) options[flag.slice(2)] = true;
    else { const key = { '--family': 'family', '--final': 'final', '--selected-manifest': 'selected', '--approved-spec': 'approved', '--authorization': 'authorization', '--generated-catalog': 'generated', '--generated-catalog-sha': 'generatedSha' }[flag]; assert(key && args[index + 1] && !args[index + 1].startsWith('--'), 'Unknown option or missing argument'); options[key] = args[++index]; }
  }
  assert(!(options.assess && (options['prepare-audio'] || options['self-test'] || options.reusePencil)) && !(options.family && options.final), 'Live, preparation, mock and family/final modes cannot be combined');
  assert(!options.manualRepeat || options.family === 'card-pop', 'Manual-repeat flag is only for card-pop'); return options;
}
async function main() {
  const options = optionsFrom(process.argv.slice(2));
  if (options.help) { console.log('Default: offline revised-spec, protected-input and original-paid-ledger validation/plan. --reuse-pencil: saved verdict, no call. --prepare-audio: local PCM cache. --assess --family <id> OR --final <repo-relative.mp4> --selected-manifest <repo-relative.json>, plus fresh --approved-spec <SHA> --authorization <repo-relative.json>. card-pop requires --manual-repeat-card-pop exactly once. Optional native --generated-catalog <json> --generated-catalog-sha <SHA> accepts only the three approved UI families. --self-test: mocks only. No generation/download implementation.'); return; }
  if (options['self-test']) { await selfTest(); return; }
  const context = offlineContext(); addGeneratedCatalog(context, options);
  if (options.reusePencil) { unchanged(context.snapshot); console.log(JSON.stringify({ status: 'REUSED_ORIGINAL_PENCIL_NO_CALL', result: path.join(LIVE_LEDGER, 'result-family-pencil.json'), sha256: context.spec.revision.priorAttempts[0].resultSha256, generationCalls: 0, providerCalls: 0 })); return; }
  const final = finalInputs(context, options), referenceCache = audioCache(context, null), finalCache = final ? audioCache(context, final) : null;
  if (options['prepare-audio']) { const reference = prepareAudio(referenceCache), finalAudio = finalCache ? prepareAudio(finalCache) : null; unchanged(context.snapshot); console.log(JSON.stringify({ status: 'OFFLINE_PCM_PREPARED_NO_UPLOAD', referenceSha256: reference.wavSha256, referenceSeconds: reference.durationSeconds, finalSha256: finalAudio?.wavSha256 ?? null, providerCalls: 0 })); return; }
  if (!options.assess) {
    let plan;
    if (options.family || final) plan = requestFor(context, options, cachedAudio(referenceCache), finalCache ? cachedAudio(finalCache) : null, final);
    unchanged(context.snapshot); console.log(JSON.stringify({ status: 'OFFLINE_INPUTS_AND_PLAN_VALID', approval: 'FRESH_REVISED_HUMAN_NOTE_REQUIRED_FOR_LIVE', specSha256: SPEC_SHA, cuePlanSha256: CUES_SHA, canonicalLedgerSpecSha256: ORIGINAL_SPEC_SHA, carriedGenerationCalls: 2, carriedReservedUsd: .06144, carriedActualUsd: .039258, nativeCandidates: context.catalog.candidates.length, families: context.families, familyToCueMapping: FAMILY_MAP, referencePrepared: fs.existsSync(referenceCache.meta) && fs.existsSync(referenceCache.wav), requestKey: plan?.key, requestSha256: plan?.requestSha256, inlineRequestBytes: plan?.inlineRequestBytes, requestAssets: plan?.assets, correspondingCueCount: plan?.brief.correspondingMotionCues?.length, thinkingLevel: 'LOW', providerCalls: 0, generationCalls: 0, maximumPerAttemptUsd: RESERVED_USD, maximum14AttemptUsd: MAX_CALLS * RESERVED_USD, selectedFinal: Boolean(final), supportedScope: 'Nine immutable History families, three exact optional generated families, and one final new-only mix; pencil verdict reused, one explicit card-pop repeat.' })); return;
  }
  // Approval is checked before reading a key, constructing SDK client or reserving an attempt.
  assert(options.authorization, '--assess requires a separately saved human authorization note');
  const noteFile = local(options.authorization); assert(fs.existsSync(noteFile), 'Saved human authorization note is missing'); const note = readJson(noteFile); validateNote(note, options.approved); assert(!context.generated || note.mode === 'existing-plus-generation', 'Generated assessment needs human generation permission');
  assert(options.family !== 'pencil', 'Reuse the complete original pencil verdict; no reassessment allowed');
  assert(options.family !== 'card-pop' || options.manualRepeat, 'card-pop requires an explicit manual-repeat flag under fresh revised approval');
  const reference = cachedAudio(referenceCache), finalAudio = finalCache ? cachedAudio(finalCache) : null;
  const plan = requestFor(context, options, reference, finalAudio, final);
  plan.manualRepeat = options.manualRepeat === true;
  await assess(context, options, plan);
}

try { await main(); } catch (error) { console.error(`Audio assessment stopped: ${error.message}`); process.exitCode = 1; }
