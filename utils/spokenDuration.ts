// Deterministic spoken-length estimate for per-scene dead-air trimming.
//
// The final-render trim used to rely on ffmpeg `silencedetect` over the voice
// track. That fails on talking scenes because Veo fills the over-long clip with
// hallucinated FILLER speech/SFX — audible, not silent — so no trailing silence
// is found and the filler tail survives. This helper gives the client a
// deterministic spoken-length cap to trim each scene to, with NO dependency on
// the TUNED geminiService.ts (it mirrors that file's words/2.5 cadence constant
// but lives standalone).
//
// Usage: talking + regular b-roll scenes are capped to estimateSpokenSec(line);
// the hook keeps its full clip (see FinalRenderScene.keepFullClip).

/** Average spoken words per second (matches geminiService suggestDurationForScript). */
export const SPOKEN_WORDS_PER_SEC = 2.5;

/** Conservative tail pad so a real final word is never clipped. */
export const SPOKEN_TRIM_PAD_SEC = 1.0;

/**
 * Estimate the spoken duration (seconds) of a script line from its word count.
 * Returns 0 for an empty/whitespace line (caller should treat 0 as "no cap").
 */
export const estimateSpokenSec = (
  scriptLine: string,
  pad: number = SPOKEN_TRIM_PAD_SEC
): number => {
  const words = (scriptLine ?? '').trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return 0;
  return words / SPOKEN_WORDS_PER_SEC + pad;
};
