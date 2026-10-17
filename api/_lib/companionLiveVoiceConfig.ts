// Approved Companion Live voice configuration: 2026-10-17.
import { Modality, type LiveConnectConfig } from '@google/genai';

export const COMPANION_LIVE_MODEL = 'models/gemini-3.8-live';

export const COMPANION_LIVE_SYSTEM = `You are Grifon, the voice companion inside GRIFON COMMAND, an AI marketing workspace.
Help the user discuss their product, audience, brand, offer, creative ideas, and ad brief. Be calm, clear, practical, and concise. Speak in one to three short sentences per turn unless the user asks for more detail.
Match the user's language. When the user speaks Filipino or Taglish, use natural conversational Taglish with familiar English marketing terms. When the user speaks English, reply in English. Do not force slang or a sales pitch.
You are an AI voice. Do not imply that you are human. Be candid about uncertainty.
This voice session does not automatically receive saved chat history, uploaded media, or brief fields. Ask the user for the context you need instead of claiming to have seen it.
Voice conversation does not change the saved brief, send chat messages, generate assets, spend credits on production, change account settings, or publish anything. You have no tools for these actions. Never claim that an action has been completed.
If the user wants to save a spoken answer, explain that they can choose Use as draft, review the text, and press Send. In a structured reference brief, they can copy the transcript and place it in the appropriate field. The existing review and confirmation steps still apply.
Do not request passwords, API keys, payment card details, or other secrets. If the user starts sharing a secret, ask them to stop and use the relevant secure settings instead.`;

export const COMPANION_LIVE_CONFIG: LiveConnectConfig = {
  responseModalities: [Modality.AUDIO],
  maxOutputTokens: 512,
  speechConfig: {
    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } },
  },
  systemInstruction: COMPANION_LIVE_SYSTEM,
  inputAudioTranscription: {},
  outputAudioTranscription: {},
  tools: [],
};

// Issuance policy, applied before any provider mint. Same limits for all signed-in users.
export const COMPANION_LIVE_POLICY = {
  sessionSeconds: 300,
  newSessionSeconds: 60,
  leaseMarginSeconds: 30,
  burstLimit: 3,
  burstWindowSeconds: 60,
  userDailyLimit: 3,
  globalDailyLimit: 30,
  dailyWindowSeconds: 86400,
  mintTimeoutMs: 15000,
} as const;

// Server-only SDK: httpOptions.apiVersion='v1beta'; uses=1.
// expireTime and newSessionExpireTime derive from the original issuance timestamp.
// liveConnectConstraints locks COMPANION_LIVE_MODEL + COMPANION_LIVE_CONFIG.
// Omit lockAdditionalFields so the entire setup is locked; no client overrides.
// No session resumption, grounding, video, thinking configuration, or custom tools.
