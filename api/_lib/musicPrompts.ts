// Canned music briefs for ElevenLabs Music, one per render script-style. These
// map the SAME three styles the render already keys off (EDL
// meta.scriptStyleDetected → mrbeast | temu | testimonial) to a text prompt.
//
// TUNABLE COPY — gated behind a listen test, NOT a crown-jewel prompt. These are
// the first-pass briefs; treat any change as creative copy to be A/B'd against
// the static beds (and gemini-eval / smoke-tester), never autonomously
// "improved". Every prompt MUST assert instrumental / no vocals and explicitly
// leave headroom for a voiceover so the bed ducks as cleanly as the tuned static
// beds (mix discipline: 0.18 gain + sidechain duck + -14 LUFS master, unchanged).

import type { FinalRenderRequest } from '../../types.js';

export type MusicStyle = NonNullable<FinalRenderRequest['music']>['style'];

// Hard no-vocals guarantee, appended to EVERY style so none can drift. The API's
// force_instrumental:true (set in composeMusic) is the primary lever; this is the
// belt-and-suspenders prompt reinforcement. "from the very first second" is
// deliberate — the model's known leak is a sung/vocal INTRO (Neil heard a woman
// singing at the start of a bed, 2026-06-16). In a DR ad any vocal fights the
// voiceover, which IS the sale — so this is a correctness rule, not a taste call.
const NO_VOCALS =
  ' Purely instrumental — absolutely NO vocals of any kind: no singing, no human ' +
  'voice, no spoken words, no rapping, no choir, no "ooh"/"aah" vocal pads, and no ' +
  'vocal samples or chops anywhere. Music and instruments only, with no vocal intro ' +
  '— instrumental from the very first second to the last.';

export const MUSIC_STYLE_PROMPTS: Record<MusicStyle, string> = {
  // High-energy hype — MrBeast-style retention engine.
  mrbeast:
    'High-energy instrumental hype background music for a fast-paced social ad. ' +
    'Driving electronic drums, punchy bass, rising tension, ~120 BPM, modern and ' +
    'exciting. Keep the midrange clean and the dynamics steady so a spoken ' +
    'voiceover sits clearly on top.' + NO_VOCALS,
  // Punchy, upbeat, slightly playful — Temu-style deal/value energy.
  temu:
    'Upbeat, playful instrumental background music for a bright value-for-money ' +
    'product ad. Bouncy plucks, light percussion, optimistic and catchy, ~110 BPM. ' +
    'Light and unobtrusive with a consistent energy so a spoken voiceover stays ' +
    'the focus.' + NO_VOCALS,
  // Warm, trustworthy, restrained — testimonial / authority.
  testimonial:
    'Warm, sincere instrumental background music for a trustworthy testimonial ad. ' +
    'Soft piano or warm pads, gentle pulse, understated and emotional, ~90 BPM. ' +
    'Low and supportive, leaving plenty of headroom for a calm spoken voiceover.' +
    NO_VOCALS,
};

export const musicPromptFor = (style: MusicStyle): string => MUSIC_STYLE_PROMPTS[style];
