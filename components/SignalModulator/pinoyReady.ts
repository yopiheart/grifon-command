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
export const RECOMMENDED_VOICE_IDS: string[] = [
  'EXAVITQu4vr4xnSDxMaL', // Sarah — female, young, professional (entertainment_tv)
  'TX3LPaxmHKxFdv7VOQHJ', // Liam — male, young, confident (social_media)
  'FGY2WhTYpPnrIDTdsKH5', // Laura — female, young, sassy (social_media)
  'bIHbv24MWmeRgasZH58o', // Will — male, young, chill (conversational)
  'cgSgspJ2msm6clMCkdW9', // Jessica — female, young, cute (conversational)
  'nPczCjzI2devNBz1zQrb', // Brian — male, middle_aged, classy (social_media)
  'hpp4J3VqNfWAUOO0d1Us', // Bella — female, middle_aged, professional
  'pqHfZKP75CvOlQylNhV4', // Bill — male, old, crisp (advertisement)
];
