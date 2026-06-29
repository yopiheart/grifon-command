import {
  Clapperboard, Radar, Target, Megaphone, Film, AudioWaveform,
  Scissors, FlaskConical, Aperture, Flame, Zap, Wand2, LayoutGrid,
  Satellite, Layers, SlidersHorizontal, type LucideIcon,
} from 'lucide-react';

/**
 * GRIFON COMMAND — module identity registry (single source of truth).
 *
 * Every module gets a BRANDED name + a one-line OUTCOME descriptor (always shown
 * beside the name — branded ≠ mystery; the descriptor is the comprehension
 * guardrail) + a signature HUE + a signature lucide ICON.
 *
 * HUE RULES (see DESIGN.md "Per-module identity" amendment):
 *   - The hue is IDENTITY ONLY — module icon tile, header glow, in-module accents.
 *   - Gold `#FFCC00` stays the SOLE action color app-wide: every CTA, primary
 *     button, focus ring, and nav active state. Never tint those with the hue.
 *   - Hues are applied via INLINE STYLE (hex + alpha), never dynamic Tailwind
 *     classes, which the purge step would strip.
 *
 * Keys are the internal `activeModule` ids from App.tsx — renaming here changes
 * every surface that reads the registry. Internal keys never change.
 */

export const GRIFON_GOLD = '#FFCC00';

export interface ModuleIdentity {
  /** Internal activeModule id (unchanged). */
  key: string;
  /** Branded, user-facing name. */
  name: string;
  /** One-line outcome — what the user GETS. Always rendered with the name. */
  descriptor: string;
  /** Signature hue (hex). Identity surfaces only — never CTAs. */
  hue: string;
  /** Signature lucide icon. */
  icon: LucideIcon;
}

export const MODULE_IDENTITY: Record<string, ModuleIdentity> = {
  creative_director: {
    key: 'creative_director',
    name: 'Director AI',
    descriptor: 'Direct a full ad, scene by scene',
    hue: GRIFON_GOLD, // flagship rides the brand gold
    icon: Clapperboard,
  },
  concierge_mode: {
    key: 'concierge_mode',
    name: 'Concierge',
    descriptor: 'Bring your own script; control every shot',
    hue: '#C084FC', // purple-400
    icon: SlidersHorizontal,
  },
  market_research: {
    key: 'market_research',
    name: 'Recon',
    descriptor: 'Find your dream customers',
    hue: '#60A5FA', // blue-400
    icon: Radar,
  },
  offer_optimizer: {
    key: 'offer_optimizer',
    name: 'War Room',
    descriptor: "Build an offer they can't refuse",
    hue: '#F87171', // red-400
    icon: Target,
  },
  caption_headline: {
    key: 'caption_headline',
    name: 'Broadcast',
    descriptor: 'Captions & headlines that stop the scroll',
    hue: '#34D399', // emerald-400
    icon: Megaphone,
  },
  generate_video: {
    key: 'generate_video',
    name: 'Render Bay',
    descriptor: 'Turn your script into video',
    hue: '#A78BFA', // violet-400
    icon: Film,
  },
  signal_modulator: {
    key: 'signal_modulator',
    name: 'Signal Modulator',
    descriptor: "Lock your character's voice",
    hue: '#818CF8', // indigo-400
    icon: AudioWaveform,
  },
  edit_video: {
    key: 'edit_video',
    name: 'Edit Bay',
    descriptor: 'Auto-edit your final ad',
    hue: '#94A3B8', // slate-400
    icon: Scissors,
  },
  hook_lab: {
    key: 'hook_lab',
    name: 'Hook Lab',
    descriptor: 'Engineer scroll-stopping hooks',
    hue: '#A3E635', // lime-400
    icon: FlaskConical,
  },
  cinematic_studio: {
    key: 'cinematic_studio',
    name: 'Cinema Command',
    descriptor: 'Commercial-grade cinematic ads',
    hue: '#2DD4BF', // teal-400 (teal ≠ banned cyan)
    icon: Aperture,
  },
  influencer_forge: {
    key: 'influencer_forge',
    name: 'Influencer Forge',
    descriptor: 'Build a persistent AI creator',
    hue: '#FB923C', // orange-400
    icon: Flame,
  },
  image_ads: {
    key: 'image_ads',
    name: 'Creative Strike',
    descriptor: 'Generate scroll-stopping ad images',
    hue: '#FBBF24', // amber-400
    icon: Zap,
  },
  batch_fanout: {
    key: 'batch_fanout',
    name: 'Swarm',
    descriptor: '100+ ad creatives from one hero image',
    hue: '#F472B6', // pink-400
    icon: Layers,
  },
  image_editor: {
    key: 'image_editor',
    name: 'Image Lab',
    descriptor: 'Edit & retouch any image',
    hue: '#4ADE80', // green-400
    icon: Wand2,
  },
  organic_calendar: {
    key: 'organic_calendar',
    name: 'Campaign Planner',
    descriptor: 'Plan & schedule your content',
    hue: '#A8A29E', // stone-400
    icon: LayoutGrid,
  },
  intelligence_uplink: {
    key: 'intelligence_uplink',
    name: 'Intelligence Uplink',
    descriptor: 'Internal intelligence relay',
    hue: '#818CF8', // indigo-400
    icon: Satellite,
  },
};

/** Safe lookup — falls back to a neutral identity for unknown keys. */
export const getModuleIdentity = (key: string): ModuleIdentity =>
  MODULE_IDENTITY[key] ?? {
    key,
    name: key,
    descriptor: '',
    hue: GRIFON_GOLD,
    icon: Aperture,
  };

/**
 * Append an 8-digit-hex alpha to a `#RRGGBB` hue for tints/glows applied via
 * inline style. `alpha` is 0–1. Falls back to the raw value for non-hex inputs.
 */
export const hueAlpha = (hex: string, alpha: number): string => {
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return hex;
  const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
};
