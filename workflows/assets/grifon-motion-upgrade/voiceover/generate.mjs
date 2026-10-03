// Default is an offline input check. --generate requires exact human-approved spec.
// Never run --generate until Neil approves the exact request and credit cap.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../..');
const work = path.join(repo, '.tmp/grifon-english-vo-v02');
const bytes = readFileSync(path.join(here, 'test-spec.json'));
const spec = JSON.parse(bytes);
const hash = data => createHash('sha256').update(data).digest('hex');
const specHash = hash(bytes);
const text = spec.request.text;
const generation = process.argv.includes('--generate');
const suppliedHash = process.argv[process.argv.indexOf('--approved-spec') + 1];
function fail(message) { throw new Error(message); }
function validateAlignment(result) {
  const candidates = [result.alignment, result.normalized_alignment, result.normalizedAlignment].filter(Boolean);
  for (const a of candidates) {
    const chars = a.characters, starts = a.character_start_times_seconds, ends = a.character_end_times_seconds;
    if (!Array.isArray(chars) || !chars.length || !Array.isArray(starts) || !Array.isArray(ends) || chars.length !== starts.length || chars.length !== ends.length) continue;
    const transcript = chars.join('');
    const mode = transcript === text ? 'raw-tagged' : transcript === spec.spokenText ? 'spoken-only' : null;
    if (!mode) continue;
    const valid = chars.every((c, i) => typeof c === 'string' && c.length === 1 && Number.isFinite(starts[i]) && Number.isFinite(ends[i]) && starts[i] >= 0 && ends[i] >= starts[i] && ends[i] < 3600 && (!i || starts[i] >= starts[i - 1]));
    if (valid) return { mode, characters: chars.length, finalTimestamp: ends.at(-1), phraseMapping: 'Finisher must resolve each spoken phrase in this verified transcript; never reuse raw offsets on spoken-only alignment.' };
  }
  fail('Returned alignment is empty, inconsistent, nonfinite or does not match approved raw/spoken text. No retry; inspect the saved take.');
}
function validate() {
  if (spec.id !== 'grifon-full-upgrade-english-vo-v02' || spec.casting.voiceId !== 'CkDT8SVS21XIVk5BcuDe' || spec.casting.category !== 'professional' || spec.request.model_id !== 'eleven_v4') fail('Unexpected project, Aira casting or model.');
  if (spec.endpoint !== `/v1/text-to-speech/${spec.casting.voiceId}/with-timestamps?output_format=mp3_44100_128`) fail('Endpoint differs from the exact selected voice.');
  if (spec.budget.maxSynthesisRequests !== 1 || text.length !== spec.budget.exactCharacters || spec.budget.observedModelCreditMultiplier !== 1 || spec.budget.observedVoiceCreditMultiplier !== 1 || text.length > spec.budget.maxCredits || spec.budget.maxCredits !== 500) fail('Budget or exact-input mismatch.');
  if (spec.request.voice_settings.stability !== .5 || spec.request.voice_settings.similarity_boost !== .75) fail('Voice settings differ from proposed Natural take.');
  if (spec.editing.segments.map(s => s.inputText).join('\n') !== text || spec.editing.segments.map(s => s.text).join('\n') !== spec.spokenText) fail('Timeline differs from exact tagged/spoken text.');
  let lastEnd = 0;
  for (const s of spec.editing.segments) {
    if (text.slice(s.characterStart, s.characterEndExclusive) !== s.text || s.targetStart < lastEnd || s.latestEnd <= s.targetStart || s.latestEnd >= 31.96) fail('Invalid phrase offsets/windows.');
    lastEnd = s.latestEnd;
  }
  for (const asset of Object.values(spec.assets)) {
    const file = path.resolve(here, asset.path);
    if (!existsSync(file) || hash(readFileSync(file)) !== asset.sha256) fail('An exact approved input asset is missing or changed.');
  }
}
async function main() {
  validate();
  if (!generation) {
    const takeAlignment = existsSync(path.join(work, 'alignment.json')) ? validateAlignment(JSON.parse(readFileSync(path.join(work, 'alignment.json'), 'utf8'))) : null;
    console.log(JSON.stringify({ mode: 'OFFLINE_CHECK_NO_PROVIDER_CALLS', pass: true, specSha256: specHash, exactCharacters: text.length, estimatedCredits: text.length, maximumCredits: 500, phrases: spec.editing.segments.length, takeAlignment }));
    return;
  }
  if (!process.argv.includes('--approved-spec') || suppliedHash !== specHash) fail('Generation denied: supply the exact spec SHA only after human approval.');
  const key = process.env.ELEVEN_LABS_API_KEY;
  if (!key) fail('Existing credential unavailable; no provider call.');
  mkdirSync(work, { recursive: true });
  const ledgerFile = path.join(work, 'single-attempt.json');
  if (existsSync(ledgerFile)) fail('The one-request ledger already exists. No retries; inspect the previous outcome.');
  async function get(endpoint) {
    let response;
    try { response = await fetch(`https://api.elevenlabs.io${endpoint}`, { headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(30000) }); }
    catch { fail('Read-only provider preflight unavailable; no synthesis attempted.'); }
    if (!response.ok) fail(`Read-only preflight returned HTTP ${response.status}; no synthesis attempted, response body omitted.`);
    return response.json();
  }
  const [models, catalog] = await Promise.all([
    get('/v1/models'), get(`/v1/shared-voices?search=Aira%20Confident%20News%20Reporter&page_size=100&include_custom_rates=true`),
  ]);
  const model = models.find(m => m.model_id === spec.request.model_id);
  const voice = catalog.voices?.find(v => v.voice_id === spec.casting.voiceId && v.category === 'professional' && v.name === 'Aira - Confident News Reporter');
  if (!voice || voice.rate !== 1 || !model?.can_do_text_to_speech || model.token_cost_factor !== 1 || model.model_rates?.character_cost_multiplier !== 1 || model.model_rates?.cost_discount_multiplier !== 1) fail('Exact Aira/model/credit rate differs from approval; no synthesis attempted.');
  const ledger = { specSha256: specHash, textSha256: hash(text), voiceId: spec.casting.voiceId, model: spec.request.model_id, attemptCount: 1, maximumCredits: 500, estimatedCredits: text.length, actualCredits: null, accountBalance: 'unavailable', state: 'CONSUMED_OUTCOME_UNKNOWN', startedAt: new Date().toISOString() };
  // Exclusive creation prevents duplicate requests, including concurrent processes.
  writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + '\n', { flag: 'wx' });
  console.log(`Sending the single approved take (${text.length} characters); no automatic retries.`);
  let response;
  try {
    response = await fetch(`https://api.elevenlabs.io${spec.endpoint}`, {
      method: 'POST', headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify(spec.request), signal: AbortSignal.timeout(120000),
    });
  } catch { fail('Synthesis outcome unknown. The single attempt remains consumed; do not retry.'); }
  ledger.httpStatus = response.status;
  if (!response.ok) {
    ledger.state = 'PROVIDER_HTTP_FAILURE_NO_RETRY';
    writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + '\n');
    fail(`Synthesis returned HTTP ${response.status}; upstream body omitted. Attempt consumed, no retry.`);
  }
  let result;
  try { result = await response.json(); }
  catch { fail('Synthesis response was not usable JSON. Attempt consumed; upstream content omitted, no retry.'); }
  if (!result.audio_base64) fail('Provider response missing audio; attempt consumed.');
  const audio = Buffer.from(result.audio_base64, 'base64');
  writeFileSync(path.join(work, 'take.mp3'), audio, { flag: 'wx' });
  writeFileSync(path.join(work, 'alignment.json'), JSON.stringify({ alignment: result.alignment || null, normalizedAlignment: result.normalized_alignment || null }, null, 2) + '\n', { flag: 'wx' });
  const alignmentValidation = validateAlignment(result);
  ledger.state = 'AUDIO_RETURNED_LOCAL_EDIT_READY';
  ledger.audioSha256 = hash(audio);
  ledger.completedAt = new Date().toISOString();
  writeFileSync(ledgerFile, JSON.stringify(ledger, null, 2) + '\n');
  writeFileSync(path.join(here, 'generation-evidence.json'), JSON.stringify({ specSha256: specHash, state: ledger.state, synthesisRequests: 1, exactCharacters: text.length, estimatedCredits: text.length, actualCredits: null, providerUsageVerified: false, audioSha256: ledger.audioSha256, alignmentValidation, voiceId: ledger.voiceId, model: ledger.model, completedAt: ledger.completedAt, retries: 0, note: 'No provider usage header or account balance is asserted. Local raw take and attempt ledger are ignored, not committed.' }, null, 2) + '\n');
  console.log('One take saved with timestamps. Local timing/mix and human audition still required.');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
