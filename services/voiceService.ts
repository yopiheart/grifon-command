import {
  TtsRequest,
  VoiceChangerRequest,
  CloneVoiceRequest,
  CloneVoiceResponse,
  VoiceLibrary,
} from '../types';
import { getSupabase } from './supabaseClient';

const getAccessToken = async (): Promise<string> => {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('NOT_AUTHENTICATED');
  return token;
};

const postForAudio = async (
  endpoint: string,
  body: Record<string, unknown>,
  failurePrefix: string
): Promise<string> => {
  const token = await getAccessToken();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => response.statusText);
    throw new Error(`${failurePrefix} (${response.status}): ${detail}`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
};

export const synthesizeSpeech = async (req: TtsRequest): Promise<string> =>
  postForAudio('/api/elevenlabs/text-to-speech', { ...req }, 'TTS_SYNTHESIS_FAILED');

export const convertSpeech = async (req: VoiceChangerRequest): Promise<string> => {
  if (!req.sourceFile) throw new Error('STS_MISSING_SOURCE');
  return postForAudio('/api/elevenlabs/speech-to-speech', { ...req }, 'STS_CONVERSION_FAILED');
};

const EMPTY_LIBRARY: VoiceLibrary = { stockVoices: [], myVoices: [], libraryVoices: [], quotaUsed: 0, quotaMax: 1 };

export const fetchVoices = async (): Promise<VoiceLibrary> => {
  try {
    const token = await getAccessToken();
    const response = await fetch('/api/elevenlabs/voices', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return EMPTY_LIBRARY;
    const data = await response.json();
    return {
      stockVoices: Array.isArray(data?.stockVoices) ? data.stockVoices : [],
      myVoices: Array.isArray(data?.myVoices) ? data.myVoices : [],
      libraryVoices: Array.isArray(data?.libraryVoices) ? data.libraryVoices : [],
      quotaUsed: typeof data?.quotaUsed === 'number' ? data.quotaUsed : 0,
      quotaMax: typeof data?.quotaMax === 'number' ? data.quotaMax : 1,
    };
  } catch {
    return EMPTY_LIBRARY;
  }
};

export const cloneVoice = async (req: CloneVoiceRequest): Promise<CloneVoiceResponse> => {
  const token = await getAccessToken();
  const response = await fetch('/api/elevenlabs/voices/clone', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(req),
  });
  const data = await response.json().catch(() => ({} as any));
  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : `CLONE_FAILED (${response.status})`;
    const err = new Error(message) as Error & { code?: string; status?: number };
    err.code = typeof data?.error === 'string' ? data.error : 'unknown_error';
    err.status = response.status;
    throw err;
  }
  return { voice_id: data.voice_id, voice_name: data.voice_name };
};

export const deleteVoice = async (voiceId: string): Promise<void> => {
  const token = await getAccessToken();
  const response = await fetch(`/api/elevenlabs/voices/${encodeURIComponent(voiceId)}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({} as any));
    const message = typeof data?.message === 'string' ? data.message : `DELETE_FAILED (${response.status})`;
    const err = new Error(message) as Error & { code?: string; status?: number };
    err.code = typeof data?.error === 'string' ? data.error : 'unknown_error';
    err.status = response.status;
    throw err;
  }
};
