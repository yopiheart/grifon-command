import type { ConsolidationScene, ConsolidationResult, StabilityMode } from '../types';
import { getSupabase } from './supabaseClient';
import { unknownGenerationOutcome } from './generationTransportError';

// Client coordinator for server-side voice consolidation (Phase 1 endpoint
// api/voice/consolidate). Returns per-scene PERSISTED (signed, non-blob) MP3
// URLs that the final-render executor can reach. Talking scenes are routed to
// the voice-changer (STS) server-side to preserve lip-sync; b-roll/hook to TTS.

const getAccessToken = async (): Promise<string> => {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');
  return token;
};

export const consolidateVoices = async (
  scenes: ConsolidationScene[],
  voiceId: string,
  stabilityMode: StabilityMode = 'robust'
): Promise<ConsolidationResult[]> => {
  const token = await getAccessToken();
  const res = await fetch('/api/voice/consolidate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ scenes, voiceId, stabilityMode }),
  }).catch(error => { throw unknownGenerationOutcome(error); });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    const error = new Error(`VOICE_CONSOLIDATION_FAILED (${res.status}): ${detail}`);
    throw res.status >= 500 ? unknownGenerationOutcome(error) : error;
  }
  const body = (await res.json().catch(error => { throw unknownGenerationOutcome(error); })) as { results?: ConsolidationResult[] };
  if (!Array.isArray(body?.results) || scenes.some(scene => !body.results!.some(result => result?.sceneIdx === scene.sceneIdx
    && ((typeof result.audioUrl === 'string' && !!result.audioUrl.trim())
      || (result.audioUrl === null && (result.skipped === true || (typeof result.error === 'string' && !!result.error.trim()))))))) {
    throw unknownGenerationOutcome(new Error('VOICE_CONSOLIDATION_INCOMPLETE_RESPONSE'));
  }
  return body.results;
};
