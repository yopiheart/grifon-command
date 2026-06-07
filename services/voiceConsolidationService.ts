import type { ConsolidationScene, ConsolidationResult, StabilityMode } from '../types';
import { getSupabase } from './supabaseClient';

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
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => res.statusText);
    throw new Error(`VOICE_CONSOLIDATION_FAILED (${res.status}): ${detail}`);
  }
  const body = (await res.json()) as { results?: ConsolidationResult[] };
  return body.results ?? [];
};
