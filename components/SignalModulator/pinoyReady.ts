// Curated stock voices recommended for ad voiceover work.
//
// ElevenLabs' stock catalog has zero voices tagged Tagalog (`tl`) and zero
// Filipino-accent voices — every stock voice is American/British/Australian
// English. So this list is NOT "Pinoy-ready" in the literal sense; it's a
// quality-curated subset of stock voices selected by use_case + age + gender
// balance, chosen to read well for ad creators. The genuine Filipino
// localization story is the user's own cloned voices (Voice Cloning tab).
//
// Picks balance 4 female / 4 male, all American accent (avoids the
// regional-accent dissonance of British/Australian voices for PH market),
// across young / middle_aged / old, biased toward `social_media`,
// `conversational`, and `advertisement` use_cases.
//
// To revise: keep the list tight (5–10). Order = display order (best first).
export interface RecommendedVoice {
  id: string;
  /** Friendly display name — what the user sees instead of the raw voice id. */
  name: string;
  gender: 'female' | 'male';
  /** One-word vibe for the picker label, e.g. "Sarah — professional". */
  vibe: string;
}

/**
 * Friendly metadata for the curated voices, in display order (best first).
 * Lets pickers show a human "Name — vibe" label instead of an ElevenLabs id.
 */
export const RECOMMENDED_VOICES: RecommendedVoice[] = [
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Sarah', gender: 'female', vibe: 'professional' },
  { id: 'TX3LPaxmHKxFdv7VOQHJ', name: 'Liam', gender: 'male', vibe: 'confident' },
  { id: 'FGY2WhTYpPnrIDTdsKH5', name: 'Laura', gender: 'female', vibe: 'sassy' },
  { id: 'bIHbv24MWmeRgasZH58o', name: 'Will', gender: 'male', vibe: 'chill' },
  { id: 'cgSgspJ2msm6clMCkdW9', name: 'Jessica', gender: 'female', vibe: 'cute' },
  { id: 'nPczCjzI2devNBz1zQrb', name: 'Brian', gender: 'male', vibe: 'classy' },
  { id: 'hpp4J3VqNfWAUOO0d1Us', name: 'Bella', gender: 'female', vibe: 'warm' },
  { id: 'pqHfZKP75CvOlQylNhV4', name: 'Bill', gender: 'male', vibe: 'crisp' },
];

export const RECOMMENDED_VOICE_IDS: string[] = RECOMMENDED_VOICES.map((v) => v.id);
