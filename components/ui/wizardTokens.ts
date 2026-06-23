// ===========================================================================
// WIZARD TOKEN SYSTEM — one source of truth for the ad-creation wizard + One-Shot.
//
// Values are COPIED verbatim from the One-Shot composer
// (components/OneShotAd/LaunchScreen.tsx, lines 25-37), which remains the
// untouched gold standard. Every interactive control sits on the h-11 (44px)
// tap-target floor; radii follow three tiers (control / panel / modal); type
// follows one scale. Steps import these instead of inlining ad-hoc strings, so
// heights / radii / spacing / colors never drift step-to-step.
//
// Documented in DESIGN.md so `brand-check` lints against the same source.
// See workflows/oneshot_composer_redesign.md for the rationale.
// ===========================================================================

/** 44px control floor — pills, tiles, selects, inputs. Primary CTA may go h-12. */
export const CTRL_H = 'h-11';

/** Radius tiers. */
export const R_CTRL = 'rounded-xl'; // controls (12px)
export const R_PANEL = 'rounded-2xl'; // panels (16px)
export const R_MODAL = 'rounded-3xl'; // modals (24px)

/** Type scale. */
export const T_DISPLAY = 'text-4xl md:text-5xl font-black tracking-tight';
export const T_CTRL = 'text-sm font-semibold'; // control labels
export const T_VALUE = 'text-xs font-mono'; // current value
export const T_LABEL = 'text-[10px] uppercase tracking-widest font-mono'; // meta labels only

// --- Shared surface strings (reused so the glass/border/accent grammar is uniform) ---

/** Subtle hairline border used on every resting control / panel edge. */
export const BORDER_SUBTLE = 'border-white/10';

/** Glass panel fill (matches <GlassPanel>). */
export const GLASS = 'bg-zinc-900/80 backdrop-blur-xl';

/** Grifon Gold accent. */
export const ACCENT = '#FFCC00';

/** Active / selected control treatment (gold border + tint + gold text). */
export const ACCENT_ACTIVE = 'border-[#FFCC00] bg-[#FFCC00]/10 text-[#FFCC00]';

/** Resting interactive control (border + hover lift toward white/30). */
export const CTRL_RESTING = 'border border-white/10 text-zinc-300 hover:border-white/30';

/** The canonical text-input shell (h-11 floor, gold focus ring). Compose with R_CTRL. */
export const INPUT_SHELL =
  'w-full border border-white/10 bg-zinc-950 px-4 text-sm text-white placeholder-zinc-600 transition-all focus:border-[#FFCC00] focus:outline-none focus:ring-1 focus:ring-[#FFCC00]';
