---
version: alpha
name: Grifon.AI
description: Cinematic, premium AI marketing SaaS. Dark mode only.
colors:
  primary: "#FFCC00"
  surface: "#09090B"
  surface-elevated: "#18181B"
  on-surface: "#FFFFFF"
  on-surface-muted: "#D4D4D8"
  on-surface-dim: "#A1A1AA"
  on-surface-sublabel: "#71717A"
typography:
  headline-display:
    fontFamily: Inter, Geist, SF Pro
    fontSize: 3rem
    fontWeight: 700
  headline-lg:
    fontFamily: Inter, Geist, SF Pro
    fontSize: 2rem
    fontWeight: 700
  body-lg:
    fontFamily: Inter, Geist, SF Pro
    fontSize: 1.125rem
    fontWeight: 400
  body-md:
    fontFamily: Inter, Geist, SF Pro
    fontSize: 1rem
    fontWeight: 400
  label-md:
    fontFamily: Inter, Geist, SF Pro
    fontSize: 0.875rem
    fontWeight: 500
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 0.625rem
    fontWeight: 500
    letterSpacing: 0.15em
rounded:
  none: 0
  sm: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  goldButton:
    backgroundColor: "{colors.primary}"
    textColor: "#000000"
    rounded: "{rounded.md}"
    typography: "{typography.label-md}"
  glassPanel:
    backgroundColor: "{colors.surface-elevated}"
    textColor: "{colors.on-surface-muted}"
    rounded: "{rounded.xl}"
    padding: "{spacing.lg}"
  ghostButton:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface-dim}"
    rounded: "{rounded.md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.md}"
    typography: "{typography.body-md}"
  subLabel:
    textColor: "{colors.on-surface-sublabel}"
    typography: "{typography.label-caps}"
---

## Overview

Cinematic, high-end, premium SaaS. Dark mode only. **Unreal Engine meets Hollywood production studio.**

Every surface should feel like a floating panel in a sci-fi interface: deep OLED black canvas, frosted glass with heavy backdrop blur, gold as the single electrifying accent. The goal is that a user opening the app feels they've entered a premium production environment, not a corporate dashboard.

## Colors

A minimal palette: a single gold accent against neutral ink gradients on deep OLED black.

- **Primary (`#FFCC00`, "Grifon Gold"):** The sole driver of interaction — active states, selected toggles, main CTAs, focus rings, hover borders. Why gold instead of blue: signals premium + energetic action rather than corporate trust.
- **Surface (`#09090B`, zinc-950):** The canvas. **Never use pure `#000000`** — pure black reads flat, zinc-950 retains atmosphere so glass effects can land.
- **Surface-elevated (`#18181B`, zinc-900) at 80% opacity:** Glass panel base. Always paired with `backdrop-blur-xl`.
- **On-surface ladder (white → zinc-500):** A four-step text hierarchy — `on-surface` for active text, `on-surface-muted` for body, `on-surface-dim` for passive, `on-surface-sublabel` for meta.
- **Borders:** Subtle borders are `white` at 10% alpha (Tailwind `border-white/10`). Alpha-on-color is an *effect*, not a color role, so it isn't a token — apply it directly in component CSS.

## Typography

- **headline-display / headline-lg:** Inter / Geist / SF Pro — clean geometric sans. Page titles frequently use a gradient fill (`bg-gradient-to-r from-zinc-100 to-zinc-500`) for the cinematic effect.
- **body-lg / body-md:** Same sans family.
- **label-caps:** JetBrains Mono, uppercase, wide tracking. Reserved for sub-labels and technical data to reinforce the "control panel" feel.

## Layout

- Content sits in floating `glassPanel` cards, not full-bleed surfaces.
- Cards are separated by `spacing.lg` or `spacing.xl`.
- Panel padding: `spacing.lg` (p-6) default, `spacing.xl` (p-8) for primary forms.

## Elevation & Depth

Elevation is expressed through **frosted glass**, not drop shadows:

- Panels: `backdrop-blur-xl` + `border border-white/10` over `surface-elevated` at 80% opacity.
- Primary action hover: gold glow `shadow-[0_0_20px_rgba(255,204,0,0.4)]` + slight `scale-105`.
- Avoid conventional drop shadows — they break the cinematic feel.

## Shapes

- Panels/cards: `rounded.xl` (rounded-2xl) or `rounded-3xl`.
- Buttons/inputs rectangles: `rounded.md` (rounded-xl).
- Pill buttons where appropriate: `rounded.full`.

## Components

- **glassPanel:** `bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6` (or `p-8`). Wraps ALL forms, tool settings, data displays.
- **goldButton:** `bg-[#FFCC00] text-black font-black uppercase tracking-widest px-8 py-4 rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] hover:scale-105 transition-all`.
- **ghostButton:** `bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white hover:border-[#FFCC00] transition-all rounded-xl`.
- **input / select:** `w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]`.
- **uploadDropzone:** `bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-xl hover:border-[#FFCC00] hover:bg-zinc-800/80 transition-all cursor-pointer flex flex-col items-center justify-center p-6`. Native `<input type="file">` MUST be hidden.
- **Icons:** ONLY `lucide-react` SVGs. Never raw text strings like `movie_filter`.

## Do's and Don'ts

**Do:**
- Reference color roles (`primary`, `surface`) in code comments and new components, not hex literals.
- Purge legacy styles (pink/cyan borders, pure `#000000` bg, default browser inputs) on any component you touch.
- Keep `geminiservice.ts` logic untouched when making UI changes.
- Re-read this file before generating any new `.tsx` UI.

**Don't:**
- Don't use `bg-black` — always `bg-zinc-950` (surface).
- Don't use conventional drop shadows for elevation — use glass + blur.
- Don't introduce new accent colors — gold is the only driver.
- Don't use icon fonts or text-string icons — lucide-react only.
