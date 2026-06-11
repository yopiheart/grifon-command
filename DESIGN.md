---
version: alpha
name: Grifon.AI
description: Cinematic, premium AI marketing SaaS. Dark mode only (one documented marketing light band excepted).
colors:
  primary: "#FFCC00"
  surface: "#09090B"
  surface-elevated: "#18181B"
  on-surface: "#FFFFFF"
  on-surface-muted: "#D4D4D8"
  on-surface-dim: "#A1A1AA"
  on-surface-sublabel: "#71717A"
  proof-band: "#F2F1EA"
typography:
  headline-display:
    fontFamily: Inter, Geist, SF Pro
    fontSize: 3rem
    fontWeight: 700
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Inter, Geist, SF Pro
    fontSize: 2rem
    fontWeight: 700
    letterSpacing: -0.02em
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
    fontWeight: 600
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 0.625rem
    fontWeight: 600
    letterSpacing: 0.15em
  serif-accent:
    fontFamily: Instrument Serif, Georgia
    fontStyle: italic
    fontWeight: 400
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
  proofBand:
    backgroundColor: "{colors.proof-band}"
    textColor: "#18181B"
---

## Overview

Cinematic, high-end, premium SaaS. Dark mode only. **Unreal Engine meets Hollywood production studio.**

Every surface should feel like a floating panel in a sci-fi interface: deep OLED black canvas, frosted glass with heavy backdrop blur, gold as the single electrifying accent. The goal is that a user opening the app feels they've entered a premium production environment, not a corporate dashboard.

This file is the **system tokens** spec. Real brand assets (product screenshots, logo files, capture log) live in [brand-spec.md](brand-spec.md) — the frozen asset manifest. DESIGN.md = what to build with. brand-spec.md = what to build *from*.

## Colors

A minimal palette: a single gold accent against neutral ink gradients on deep OLED black.

- **Primary (`#FFCC00`, "Grifon Gold"):** The sole driver of interaction — active states, selected toggles, main CTAs, focus rings, hover borders. Why gold instead of blue: signals premium + energetic action rather than corporate trust.
- **Surface (`#09090B`, zinc-950):** The canvas. **Never use pure `#000000`** — pure black reads flat, zinc-950 retains atmosphere so glass effects can land.
- **Surface-elevated (`#18181B`, zinc-900) at 80% opacity:** Glass panel base. Always paired with `backdrop-blur-xl`.
- **On-surface ladder (white → zinc-500):** A four-step text hierarchy — `on-surface` for active text, `on-surface-muted` for body, `on-surface-dim` for passive, `on-surface-sublabel` for meta.
- **Borders:** Subtle borders are `white` at 10% alpha (Tailwind `border-white/10`). Alpha-on-color is an *effect*, not a color role, so it isn't a token — apply it directly in component CSS.
- **Proof-band (`#F2F1EA`):** Warm off-white reserved EXCLUSIVELY for the marketing light band exception below. Never an in-app surface.

### Marketing light band exception

Marketing pages (landing, pricing, sales) MAY include **at most ONE** full-width section on `proof-band` (`#F2F1EA`) for editorial contrast — the high-trust "printed page" moment (testimonials, how-it-works). Rules inside the band:

- Text uses a dark zinc ladder: `text-zinc-900` headings, `text-zinc-600` body, `text-zinc-500` meta. Gold `#FFCC00` remains the sole accent.
- Cards are **solid** (`bg-white border border-zinc-900/10 rounded-2xl/3xl`) — no glass, no `backdrop-blur` on the band.
- The band must be fully opaque and sit above global chrome (flashlight/grid): `relative z-10`.
- Never propagate `proof-band` into the app shell, wizard, dashboard, or modules. One band per page, marketing only.

## Typography

- **headline-display / headline-lg:** Inter / Geist / SF Pro — clean geometric sans. Page titles frequently use a gradient fill (`bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500`) for the cinematic effect. Vertical (`to-b`) over horizontal (`to-r`) — multi-line headlines fade top-to-bottom like a movie title card; horizontal washes look like a banner gradient and break the cinematic register.
- **Display tracking is tight, not default.** Headlines use negative letter-spacing (`tracking-tight` ≈ -0.025em on display, -0.02em on h-lg). Inter's default tracking reads loose at display sizes; tightening pulls headlines into the "premium tech" register without abandoning the cinematic dark identity. Body sizes (`body-lg` / `body-md`) keep default tracking — only display sizes get tightened.
- **Weight ladder is 400 / 600 / 700 — no 500.** Weight 500 reads in-between and undermines hierarchy; if a label needs more presence than body (400), go to 600. Bold is 700. (Aligned with Apple's typographic discipline.)
- **body-lg / body-md:** Same sans family.
- **label-caps:** JetBrains Mono, uppercase, wide tracking. Reserved for sub-labels and technical data to reinforce the "control panel" feel.
- **serif-accent:** Instrument Serif italic 400, **marketing surfaces only**. Used for a maximum of 1–2 accent words per headline (rendered in Grifon Gold) and for kinetic marquee strips. Because the global heading LAW (`index.html`) forces Inter 900 uppercase on `h1`–`h6` with `!important`, serif accents MUST be `<span className="font-serif italic normal-case tracking-normal">` inside the heading — never applied to the heading element itself. Never in-app, never for body text, never a third weight.

## Layout

- Content sits in floating `glassPanel` cards, not full-bleed surfaces.
- Cards are separated by `spacing.lg` or `spacing.xl`.
- Panel padding: `spacing.lg` (p-6) default, `spacing.xl` (p-8) for primary forms.

## Elevation & Depth

Elevation is expressed through **frosted glass**, not drop shadows:

- Panels: `backdrop-blur-xl` + `border border-white/10` over `surface-elevated` at 80% opacity.
- Primary action hover: gold glow `shadow-[0_0_20px_rgba(255,204,0,0.4)]` + slight `scale-105`.
- Avoid conventional drop shadows on UI chrome — they break the cinematic feel.
- **Demo-mockup chrome exception:** simulated browser windows or app frames *inside* marketing sections (e.g. "see it in action" composites) MAY use shadows for layering. Shadow color is either Grifon Gold tinted glow (`shadow-[#FFCC00]/15` to `shadow-[#FFCC00]/25`) or pure black falloff (`shadow-[0_30px_60px_rgba(0,0,0,0.8)]`). Never another hue. Real UI panels still use glass + blur.

## Shapes

- Panels/cards: `rounded.xl` (rounded-2xl) or `rounded-3xl`.
- Buttons rounding rule:
  - **Marketing surfaces** (landing, pricing, sales pages, ad creatives): `rounded.full` for primary / secondary / ghost — pills sell premium action.
  - **In-app surfaces** (wizard, dashboard, modules, settings): `rounded.md` (rounded-xl) — rectangles read transactional, which is correct for forms.
- Inputs/selects: always `rounded.md` regardless of surface — pill inputs create awkward tangents with adjacent fields.

## Components

- **glassPanel:** `bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6` (or `p-8`). Wraps ALL forms, tool settings, data displays.
- **goldButton:** `bg-[#FFCC00] text-black font-black uppercase tracking-widest px-8 py-4 rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] hover:scale-105 transition-all`. (In-app primary CTA. Use `rounded-full` instead of `rounded-xl` on marketing surfaces — see Shapes.)
- **goldButtonGhost:** `bg-transparent border border-[#FFCC00] text-[#FFCC00] font-black uppercase tracking-widest px-5 py-2 rounded-full hover:bg-[#FFCC00]/10 hover:shadow-[0_0_15px_rgba(255,204,0,0.3)] hover:scale-105 transition-all`. Persistent secondary CTA — use in sticky navs or footer when a primary `goldButton` exists elsewhere on the same surface, so the nav doesn't compete with the hero CTA.
- **ghostButton:** `bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white hover:border-[#FFCC00] transition-all rounded-xl`.
- **input / select:** `w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]`.
- **uploadDropzone:** `bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-xl hover:border-[#FFCC00] hover:bg-zinc-800/80 transition-all cursor-pointer flex flex-col items-center justify-center p-6`. Native `<input type="file">` MUST be hidden.
- **Icons:** ONLY `lucide-react` SVGs. Never raw text strings like `movie_filter`.

## Dashboard pilot (Gemini-inspired)

The dashboard (`components/Dashboard.tsx` and its exclusive cards — `CommandPalette`, `RecentWorkCard`, `ResumeDraftCard`, `OnboardingNudge`, `ActiveJobsPanel`) runs a scoped pilot that intentionally deviates from two rules above. The rest of the app still follows them — do not propagate these without sign-off.

- **Borderless tonal surfaces.** Dashboard cards drop `border border-white/10` and separate by tonal fill alone (`bg-zinc-900/70`, `bg-white/[0.03]`). Elevation is still glass + blur — no drop shadows. The hero card (Director) signals priority with a gold-tinted fill (`bg-[#FFCC00]/[0.06]`) instead of a gold border.
- **Calm typography.** The dashboard hero is a regular-weight, sentence-case greeting and module card titles are sentence case — rendered as non-heading elements so they bypass the global `h1`–`h6` uppercase rule. The uppercase gradient headline and the mono `//` sub-labels still apply everywhere else.

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
