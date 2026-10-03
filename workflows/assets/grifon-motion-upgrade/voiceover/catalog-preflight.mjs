// Read-only stock-voice/model/credit preflight. No synthesis, uploads or spend.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const key = process.env.ELEVEN_LABS_API_KEY;
if (!key) { console.error('Existing ElevenLabs credential unavailable. No calls made.'); process.exit(1); }
async function get(endpoint) {
  let response;
  try { response = await fetch(`https://api.elevenlabs.io${endpoint}`, { headers: { 'xi-api-key': key }, signal: AbortSignal.timeout(30000) }); }
  catch { throw new Error(`Read-only ${endpoint.split('?')[0]} request unavailable; no generation.`); }
  if (!response.ok) throw new Error(`Read-only ${endpoint.split('?')[0]} returned HTTP ${response.status}; body omitted.`);
  return response.json();
}
try {
  const results = await Promise.allSettled([
    get('/v2/voices?voice_type=default&category=premade&page_size=100&include_custom_rates=false'),
    get('/v1/models'), get('/v1/user/subscription'),
  ]);
  const read = index => results[index].status === 'fulfilled' ? results[index].value : null;
  const [catalog, models, subscription] = [read(0), read(1), read(2)];
  const safeVoices = (catalog?.voices || []).filter(v => v.category === 'premade').map(v => ({
    voiceId: v.voice_id, name: v.name, category: v.category,
    labels: Object.fromEntries(Object.entries(v.labels || {}).filter(([key]) => ['accent', 'gender', 'language', 'age', 'description', 'use_case'].includes(key))),
  }));
  const model = models?.find(m => m.model_id === 'eleven_v3');
  const safe = {
    mode: 'READ_ONLY_NO_GENERATION', recordedAt: new Date().toISOString(),
    voices: safeVoices, hasMore: catalog?.has_more ?? null,
    model: model ? { id: model.model_id, canDoTextToSpeech: model.can_do_text_to_speech, tokenCostFactor: model.token_cost_factor ?? null, modelRates: model.model_rates ?? null, maxCharactersPerRequest: model.max_characters_request_subscribed_user ?? null } : null,
    subscription: subscription ? {
      tier: subscription.tier, status: subscription.status,
      usedCredits: subscription.character_count, limitCredits: subscription.character_limit,
      remainingCredits: Number.isFinite(subscription.character_limit) && Number.isFinite(subscription.character_count) ? Math.max(0, subscription.character_limit - subscription.character_count) : null,
      usageBillingEnabled: subscription.max_credit_limit_extension !== undefined ? subscription.max_credit_limit_extension !== 0 : null,
    } : null,
    errors: results.filter(r => r.status === 'rejected').map(r => r.reason.message),
    secretValuesSaved: false, customVoicesSaved: false,
  };
  await mkdir(here, { recursive: true });
  await writeFile(path.join(here, 'catalog-preflight.json'), JSON.stringify(safe, null, 2) + '\n');
  console.log(JSON.stringify(safe));
  if (safe.errors.length) process.exitCode = 1;
} catch { console.error('Read-only preflight did not complete; details omitted. No generation.'); process.exitCode = 1; }
