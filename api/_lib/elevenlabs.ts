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
        // Raw Taglish verbatim — phonetic respelling removed 2026-06-13 (Neil:
        // respellings like "moo-khah" read worse than the engine's own
        // pronunciation; the adscript opening-language rule handles accent
        // detection at the root). See agent_lessons.md 2026-06-13.
        text,
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

/** Word-level timings from ElevenLabs forced alignment: the produced MP3 plus
 * the script line it speaks → measured word start/end times. Works for BOTH
 * voice paths (TTS and STS — STS has no synthesis-time timestamps at all).
 * Throws ElevenLabsError on upstream failure; callers treat alignment as
 * best-effort and fall back to caption-timing estimates. */
export async function forcedAlignment(
  audio: Buffer,
  text: string
): Promise<Array<{ text: string; start: number; end: number }>> {
  const ab = new ArrayBuffer(audio.byteLength);
  new Uint8Array(ab).set(audio);
  const formData = new FormData();
  formData.append('file', new Blob([ab], { type: 'audio/mpeg' }), 'vo.mp3');
  formData.append('text', text);

  const upstream = await fetch('https://api.elevenlabs.io/v1/forced-alignment', {
    method: 'POST',
    headers: { 'xi-api-key': getApiKey() },
    body: formData,
  });
  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => upstream.statusText);
    throw new ElevenLabsError(upstream.status, detail);
  }
  const json: any = await upstream.json();
  const words = Array.isArray(json?.words) ? json.words : [];
  return words
    .filter((w: any) => typeof w?.start === 'number' && typeof w?.end === 'number')
    .map((w: any) => ({ text: String(w.text ?? ''), start: w.start, end: w.end }))
    .filter((w: { text: string }) => w.text.trim().length > 0); // drop pure-space tokens
}

// ElevenLabs Music compose (https://api.elevenlabs.io/v1/music). Generates an
// instrumental background bed from a text prompt, returned as raw MP3 bytes
// (server-reachable, like synthesizeTts). force_instrumental guarantees no
// vocals so the bed ducks cleanly under the VO; the prompt ALSO states
// "instrumental, no vocals" belt-and-suspanders. music_length_ms is clamped to
// the API's 3s–600s window by the caller. Commercial use is cleared on paid
// ElevenLabs plans (Starter+).
const MUSIC_MIN_MS = 3_000;
const MUSIC_MAX_MS = 600_000;

export async function composeMusic(prompt: string, lengthMs: number): Promise<Buffer> {
  const clamped = Math.round(Math.min(MUSIC_MAX_MS, Math.max(MUSIC_MIN_MS, lengthMs)));
  const upstream = await fetch('https://api.elevenlabs.io/v1/music', {
    method: 'POST',
    headers: {
      'xi-api-key': getApiKey(),
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      prompt,
      music_length_ms: clamped,
      force_instrumental: true,
      output_format: 'mp3_44100_128',
    }),
  });
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
