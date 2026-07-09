/**
 * ASMR render defaults (UGC Pro, Slice 3).
 *
 * ASMR is an audio-led format — the whisper + product taps ARE the audio. So an
 * ASMR run seeds the captions toggle OFF (burned-in subtitles fight the whispered
 * register). An explicit picker value always wins; only the unset default flips on
 * the ASMR flag. Both stay user-flippable after seeding — this only picks the
 * starting position. Shared by EditVideo (AI Editor) and GenerateVideo (pipeline).
 */
export const seedCaptionsEnabled = (
  explicit: boolean | undefined,
  asmrFlag: boolean | undefined,
): boolean => explicit ?? (asmrFlag ? false : true);
