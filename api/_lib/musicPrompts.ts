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

export const MUSIC_STYLE_PROMPTS: Record<MusicStyle, string> = {
  // High-energy hype — MrBeast-style retention engine.
  mrbeast:
    'High-energy instrumental hype background music for a fast-paced social ad. ' +
    'Driving electronic drums, punchy bass, rising tension, ~120 BPM, modern and ' +
    'exciting. Strictly instrumental — no vocals, no lyrics, no vocal chops. Keep ' +
    'the midrange clean and the dynamics steady so a spoken voiceover sits clearly ' +
    'on top.',
  // Punchy, upbeat, slightly playful — Temu-style deal/value energy.
  temu:
    'Upbeat, playful instrumental background music for a bright value-for-money ' +
    'product ad. Bouncy plucks, light percussion, optimistic and catchy, ~110 BPM. ' +
    'Strictly instrumental — no vocals, no lyrics. Light and unobtrusive with a ' +
    'consistent energy so a spoken voiceover stays the focus.',
  // Warm, trustworthy, restrained — testimonial / authority.
  testimonial:
    'Warm, sincere instrumental background music for a trustworthy testimonial ad. ' +
    'Soft piano or warm pads, gentle pulse, understated and emotional, ~90 BPM. ' +
    'Strictly instrumental — no vocals, no lyrics. Low and supportive, leaving plenty ' +
    'of headroom for a calm spoken voiceover.',
};

export const musicPromptFor = (style: MusicStyle): string => MUSIC_STYLE_PROMPTS[style];
