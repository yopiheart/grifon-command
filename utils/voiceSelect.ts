// Gender-aware default-voice selection for the render pipeline.
//
// The avatar's gender steers which voice the AI Editor / Scene Pipeline
// preselects, but only WITHIN each existing priority tier (Filipino library →
// my voices → recommended stock → stock) — gender never promotes a lower tier
// above a higher one, and the user's manual pick is never overridden.

import type { Avatar } from '../types';

export type AvatarVoiceGender = 'Male' | 'Female';

const FEMALE_WORDS = /\b(woman|female|girl|lady|babae)\b/i;
const MALE_WORDS = /\b(man|male|boy|guy|gentleman|lalaki)\b/i;

/**
 * Explicit Step 4 gender pick wins; uploaded avatars (and resumed drafts that
 * predate the gender field) fall back to the Gemini describeImage text, which
 * is prompted to lead with gender ("Young woman with long black hair, ...").
 * Ambiguous or missing → undefined (callers keep today's default).
 */
export function inferAvatarGender(
  avatar: Pick<Avatar, 'gender' | 'description'> | null | undefined
): AvatarVoiceGender | undefined {
  if (!avatar) return undefined;
  if (avatar.gender === 'Male' || avatar.gender === 'Female') return avatar.gender;
  const desc = avatar.description ?? '';
  const female = FEMALE_WORDS.test(desc);
  const male = MALE_WORDS.test(desc);
  if (female && !male) return 'Female';
  if (male && !female) return 'Male';
  return undefined;
}

interface GenderTaggedVoice {
  voice_id: string;
  // StockVoice carries labels.gender; LibraryVoice/UserVoice carry gender in
  // the curated description ("Female, 30s · Polished brand voiceover").
  labels?: { gender?: string; [k: string]: unknown };
  description?: string;
}

const matchesGender = (voice: GenderTaggedVoice, gender: AvatarVoiceGender): boolean => {
  const tag = voice.labels?.gender;
  if (tag) return tag.toLowerCase() === gender.toLowerCase();
  const re = gender === 'Female' ? /\bfemale\b/i : /\bmale\b/i;
  return re.test(voice.description ?? '');
};

/** First gender-matching voice in display order, else undefined. */
export function preferGenderVoice<T extends GenderTaggedVoice>(
  voices: T[],
  gender: AvatarVoiceGender | undefined
): T | undefined {
  if (!gender) return undefined;
  return voices.find((v) => matchesGender(v, gender));
}
