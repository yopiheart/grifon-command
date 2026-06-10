// Server-side ElevenLabs upstream calls, shared by the batch voice
// consolidator (api/voice/consolidate.ts). Keeps ELEVEN_LABS_API_KEY
// server-only and returns raw MP3 buffers (NOT browser blob: URLs — the render
// path must be server-reachable).
//
// NOTE ON DUPLICATION: the model IDs and stability presets below intentionally
// mirror api/elevenlabs/text-to-speech.ts and speech-to-speech.ts. Those single
// handlers are reused as-is (not refactored) per the approved Phase 1 plan's
// "do not modify" contract, so these constants are duplicated here. If you tune
// the model ID or stability curve in one place, update the other to match.

import { normalizeTaglish } from '../../services/phoneticNormalizer.js';

export type StabilityMode = 'creative' | 'natural' | 'robust';

const TTS_MODEL_ID = 'eleven_v3';
const STS_MODEL_ID = 'eleven_multilingual_sts_v2';

export class ElevenLabsError extends Error {
  status: number;
  detail: string;
  constructor(status: number, detail: string) {
    super(`ELEVENLABS_${status}: ${detail}`);
    this.name = 'ElevenLabsError';
    this.status = status;
    this.detail = detail;
  }
}

const getApiKey = (): string => {
  const key = process.env.ELEVEN_LABS_API_KEY;
  if (!key) {
    throw new Error(
      'ELEVEN_LABS_NOT_CONFIGURED: set ELEVEN_LABS_API_KEY (server-side, no VITE_ prefix).'
    );
  }
  return key;
};

const stabilitySettings = (mode: StabilityMode) => {
  switch (mode) {
    case 'creative': return { stability: 0.30, similarity_boost: 0.70 };
    case 'robust':   return { stability: 0.75, similarity_boost: 0.85 };
    case 'natural':
    default:         return { stability: 0.50, similarity_boost: 0.75 };
  }
};

export async function synthesizeTts(
  voiceId: string,
  text: string,
  stabilityMode: StabilityMode
): Promise<Buffer> {
  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': getApiKey(),
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        // Taglish phonetic respelling — the batch consolidator is the path that
        // actually voices scene VO, and it bypasses the client's voiceService
        // (2026-06-10: "swabe" reached ElevenLabs raw and synthesized "swave"
        // even after the client-side wiring). Captions keep the original text;
        // only what the TTS engine hears changes.
        text: normalizeTaglish(text),
        model_id: TTS_MODEL_ID,
        voice_settings: stabilitySettings(stabilityMode),
      }),
    }
  );
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => upstream.statusText);
    throw new ElevenLabsError(upstream.status, detail);
  }
  return Buffer.from(await upstream.arrayBuffer());
}

export async function convertSts(
  voiceId: string,
  audio: Buffer,
  mime: string,
  stabilityMode: StabilityMode
): Promise<Buffer> {
  const ab = new ArrayBuffer(audio.byteLength);
  new Uint8Array(ab).set(audio);
  const blob = new Blob([ab], { type: mime });

  const formData = new FormData();
  formData.append('audio', blob, 'source.mp3');
  formData.append('model_id', STS_MODEL_ID);
  formData.append('voice_settings', JSON.stringify(stabilitySettings(stabilityMode)));

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/speech-to-speech/${encodeURIComponent(voiceId)}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': getApiKey(),
        Accept: 'audio/mpeg',
      },
      body: formData,
    }
  );
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => upstream.statusText);
    throw new ElevenLabsError(upstream.status, detail);
  }
  return Buffer.from(await upstream.arrayBuffer());
}
