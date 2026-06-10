// Taglish phonetic respelling for Veo/Kling TTS.
// Source: Gemini 3.5 video audit (2026-05-26, Session M Bug catalog).
// Western TTS engines tokenize Taglish words with English phonetics, producing
// "Bah-go" Western emphasis, hyphen-parsed "Is click", and dragged syllables.
// Respelling each token lets the same TTS produce natural Filipino cadence.

const TAGLISH_PHONETIC_MAP: Array<[RegExp, string]> = [
  [/\bI-click\b/gi, 'Ee-click'],
  [/\bBago\b/gi, 'Bah-goh'],
  [/\blang\b/gi, 'lahng'],
  [/\bmukha\b/gi, 'moo-khah'],
  [/\bmabilisang\b/gi, 'mah-beh-lee-sahng'],
  // 2026-06-10 final-render review: TTS read "swabe" with an English long-a
  // ("swave"). Respell to force the Filipino sah-WAH-beh cadence.
  [/\bswabe\b/gi, 'swah-beh'],
];

export const normalizeTaglish = (text: string): string => {
  let result = text;
  for (const [pattern, replacement] of TAGLISH_PHONETIC_MAP) {
    result = result.replace(pattern, replacement);
  }
  return result;
};
