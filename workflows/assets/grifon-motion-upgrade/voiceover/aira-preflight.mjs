// User-requested Aira + v4 discovery. Read-only GETs; no uploads or synthesis.
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const key = process.env.ELEVEN_LABS_API_KEY;
if (!key) { console.error('Existing credential unavailable; no requests.'); process.exit(1); }
async function get(endpoint) {
  let response;
  try { response = await fetch(`https://api.elevenlabs.io${endpoint}`, { headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(30000) }); }
  catch { throw new Error(`Read-only ${endpoint.split('?')[0]} unavailable; no generation.`); }
  if (!response.ok) throw new Error(`Read-only ${endpoint.split('?')[0]} HTTP${response.status}; response body omitted.`);
  return response.json();
}
function safeVoice(v, source) {
  return {
    voiceId: v.voice_id, name: v.name, source, category: v.category,
    labels: Object.fromEntries(Object.entries(v.labels || {}).filter(([k]) => ['accent', 'gender', 'language', 'age', 'description', 'use_case'].includes(k))),
    description: v.description ?? null, language: v.language ?? null, accent: v.accent ?? null,
    gender: v.gender ?? null, useCase: v.use_case ?? null,
    rate: v.rate ?? null,
    verifiedLanguages: (v.verified_languages || []).map(l => ({ language: l.language, modelId: l.model_id, accent: l.accent, locale: l.locale })),
    publicOwnerId: source === 'public-library' ? v.public_owner_id ?? null : null,
    freeUsersAllowed: source === 'public-library' ? v.free_users_allowed ?? null : null,
  };
}
const endpoints = ['/v1/models', '/v1/voices/CkDT8SVS21XIVk5BcuDe', '/v1/shared-voices?search=Aira%20Confident%20News%20Reporter&page_size=100&include_custom_rates=true'];
const results = await Promise.allSettled(endpoints.map(get));
const read = i => results[i].status === 'fulfilled' ? results[i].value : null;
const models = (read(0) || []).filter(m => m.model_id === 'eleven_v4').map(m => ({ id: m.model_id, canDoTextToSpeech: m.can_do_text_to_speech, tokenCostFactor: m.token_cost_factor ?? null, modelRates: m.model_rates ?? null, maxCharactersPerRequest: m.max_characters_request_subscribed_user ?? null, languages: (m.languages || []).filter(l => ['en', 'fil'].includes(l.language_id)).map(l => ({ code: l.language_id, name: l.name })) }));
const exact = v => v?.voice_id === 'CkDT8SVS21XIVk5BcuDe' && v?.name === 'Aira - Confident News Reporter';
const selected = exact(read(1)) ? read(1) : null;
const voices = [ ...(selected ? [safeVoice(selected, 'account')] : []), ...(read(2)?.voices || []).filter(exact).map(v => safeVoice(v, 'public-library')) ];
const safe = { mode: 'READ_ONLY_NO_GENERATION', recordedAt: new Date().toISOString(), models, voices, selectedVoiceSharing: selected?.sharing ? { status: selected.sharing.status ?? null, rate: selected.sharing.rate ?? null, financialRewardsEnabled: selected.sharing.financial_rewards_enabled ?? null, enabledInLibrary: selected.sharing.enabled_in_library ?? null, disableAtUnix: selected.sharing.disable_at_unix ?? null, category: selected.sharing.category ?? null } : null, fineTuningStates: selected?.fine_tuning?.state ?? null, libraryHasMore: read(2)?.has_more ?? null, errors: results.filter(r => r.status === 'rejected').map(r => r.reason.message), generationRequests: 0 };
await writeFile(path.join(here, 'aira-preflight.json'), JSON.stringify(safe, null, 2) + '\n');
console.log(JSON.stringify(safe));
if (safe.errors.length) process.exitCode = 1;
