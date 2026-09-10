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
  on-surface-sublabel: "#82828B"
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
- **On-surface ladder:** A four-step text hierarchy — `on-surface` for active text, `on-surface-muted` for body, `on-surface-dim` for passive, `on-surface-sublabel` for meta. **Every step clears 4.5:1 on `surface`.** See the contrast floor below.

### Contrast floor (measured, non-negotiable)

Apple's HIG sets the accessibility minimum at **4.5:1 for text up to 17pt** and Dark Mode asks you to *"strive for a contrast ratio of 7:1, especially in small text."* Grifon's ladder was audited against `surface` (`#09090B`) and three steps failed:

| Role | Hex | vs `surface` | Verdict |
|---|---|---|---|
| `on-surface` | `#FFFFFF` | 19.90:1 | pass |
| `on-surface-muted` | `#D4D4D8` | 13.46:1 | pass |
| `on-surface-dim` | `#A1A1AA` | 7.76:1 | pass (clears 7:1) |
| `on-surface-sublabel` | **`#82828B`** | **5.22:1** | pass — *was `#71717A` at 4.12:1* ✗ |
| ~~`zinc-600`~~ | `#52525B` | 2.57:1 | **banned as text** |
| ~~`zinc-700`~~ | `#3F3F46` | 1.91:1 | **banned as text** |

- **Never use `text-zinc-500`, `text-zinc-600` or `text-zinc-700` on a dark surface.** They fail. Use `text-on-surface-sublabel` — that role exists precisely so the dimmest step is still legible. This matters most for the `//` mono meta-labels, which are 10px: the smallest type in the app was also the lowest-contrast.
- `zinc-500/600/700` remain fine for **borders, fills and backgrounds** — the floor governs text and icons only.
- **Light-band exception.** Inside the `proof-band` (`#F2F1EA`) the ladder inverts: a *brighter* grey is worse there (`#82828B` scores only 3.36:1 on the band). The band keeps the dark zinc ladder DESIGN.md already prescribes — `text-zinc-900` / `text-zinc-600` / `text-zinc-500`. The sweep deliberately excludes [CreamBand](components/landing/CreamBand.tsx) and [ReceiptsRail](components/landing/sections/ReceiptsRail.tsx).
- **Borders:** Subtle borders are `white` at 10% alpha (Tailwind `border-white/10`). Alpha-on-color is an *effect*, not a color role, so it isn't a token — apply it directly in component CSS.
- **Proof-band (`#F2F1EA`):** Warm off-white reserved EXCLUSIVELY for the marketing light band exception below. Never an in-app surface.

### Marketing light band exception

Marketing pages (landing, pricing, sales) MAY include **at most ONE** full-width section on `proof-band` (`#F2F1EA`) for editorial contrast — the high-trust "printed page" moment (testimonials, how-it-works). Rules inside the band:

- Text uses a dark zinc ladder: `text-zinc-900` headings, `text-zinc-600` body, `text-zinc-500` meta. Gold stays the sole accent *hue*, but `#FFCC00` is near-invisible on `#F2F1EA` (~1.3:1) — accent **text and icons** on the band use `brand-yellow-dark` (`#B28F00`); pure `#FFCC00` is reserved for decorative strokes (scribbles, stars, rules) that don't carry information.
- Serif (Instrument Serif italic) is additionally licensed on the band for testimonial pull-quotes and oversized decorative step numerals — the "printed editorial" register. This does NOT extend to dark surfaces or in-app.
- Cards are **solid** (`bg-white border border-zinc-900/10 rounded-2xl/3xl`) — no glass, no `backdrop-blur` on the band.
- The band must be fully opaque and sit above global chrome (flashlight/grid): `relative z-10`.
- Never propagate `proof-band` into the app shell, wizard, dashboard, or modules. One band per page, marketing only.

### Per-module identity (in-app)

Gold `#FFCC00` is the sole **action** color — every CTA, primary button, focus ring, toggle, selected/active state, and nav active state, app-wide. That rule is absolute and unchanged.

For module **identity** only, each dashboard module additionally carries a signature **hue** + **lucide icon** from the GRIFON COMMAND registry ([config/moduleIdentity.ts](config/moduleIdentity.ts)). The hue gives each module its own "world" without fracturing the one design system:

- **Allowed (identity surfaces only):** the module's icon, its icon-tile background (hue at ~10% alpha), the module header glow, and decorative in-module accents. Apply via **inline style** (hex + alpha) — never dynamic Tailwind classes, which the purge step strips.
- **Forbidden:** never tint an action with the hue. CTAs, buttons, focus rings, selected/active states, and links stay gold. "Gold = do this" must never be diluted.
- **Palette (tactical; no banned pink/cyan):** Director AI `#FFCC00` · Concierge `#C084FC` · Recon `#60A5FA` · War Room `#F87171` · Broadcast `#34D399` · Render Bay `#A78BFA` · Signal Modulator `#818CF8` · Edit Bay `#94A3B8` · Hook Lab `#A3E635` · Cinema Command `#2DD4BF` · Influencer Forge `#FB923C` · Creative Strike `#FBBF24` · Image Lab `#4ADE80` · Campaign Planner `#A8A29E` · Intelligence Uplink `#818CF8` (internal).

This is the ONLY sanctioned use of non-gold hues. Outside module identity, gold remains the only accent.

### Feedback states (in-app)

Gold means "do this" — it must never be overloaded to mean "watch out." For **non-blocking caution/over-limit feedback** (an over-budget duration meter, a word/sentence count past its cap, a "this won't render" notice), use the sanctioned warning hue **`#F59E0B` (amber-500, Tailwind `text-amber-500`)**. It reads as caution without competing with gold CTAs.

- **Allowed:** validation/over-limit text, meter values that crossed a soft limit, the inline AlertTriangle/Clock signal next to them. Pair with a lucide icon, not color alone.
- **Forbidden:** never on an action (buttons, focus rings, selected states stay gold), and never as a decorative accent. Warning hue appears only when something is actually out of range.
- **Distinct from module identity:** do NOT use the Creative Strike identity hue `#FBBF24` (amber-400) for warnings — that hue is reserved for that module's identity. The feedback warning hue is the deeper `#F59E0B`.

## Typography

- **headline-display / headline-lg:** Inter / Geist / SF Pro — clean geometric sans. Page titles frequently use a gradient fill (`bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500`) for the cinematic effect. Vertical (`to-b`) over horizontal (`to-r`) — multi-line headlines fade top-to-bottom like a movie title card; horizontal washes look like a banner gradient and break the cinematic register.
- **Display tracking is tight, not default.** Headlines use negative letter-spacing (`tracking-tight` ≈ -0.025em on display, -0.02em on h-lg). Inter's default tracking reads loose at display sizes; tightening pulls headlines into the "premium tech" register without abandoning the cinematic dark identity. Body sizes (`body-lg` / `body-md`) keep default tracking — only display sizes get tightened.
- **Weight ladder is 400 / 600 / 700 — no 500.** Weight 500 reads in-between and undermines hierarchy; if a label needs more presence than body (400), go to 600. Bold is 700. (Aligned with Apple's typographic discipline.)
- **body-lg / body-md:** Same sans family.
- **label-caps:** JetBrains Mono, uppercase, wide tracking. Reserved for sub-labels and technical data to reinforce the "control panel" feel.
- **serif-accent:** Instrument Serif italic 400, **marketing surfaces only** (the pre-auth gateway — sign-in/sign-up screen — counts as a marketing surface; the authed app does not). Used for a maximum of 1–2 accent words per headline (rendered in Grifon Gold) and for kinetic marquee strips. Because the global heading LAW (`index.html`) forces Inter 900 uppercase on `h1`–`h6` with `!important`, serif accents MUST be `<span className="font-serif italic normal-case tracking-normal">` inside the heading — never applied to the heading element itself. Never in-app, never for body text, never a third weight.

## Layout

- Content sits in floating `glassPanel` cards, not full-bleed surfaces.
- Cards are separated by `spacing.lg` or `spacing.xl`.
- Panel padding: `spacing.lg` (p-6) default, `spacing.xl` (p-8) for primary forms.

## Elevation & Depth — the material tier system

Elevation is expressed through **material tier**, not drop shadows. Tokens live in
[components/ui/materialTokens.ts](components/ui/materialTokens.ts); the CSS bodies are in
[index.css](index.css) (the rim lens needs `mask-composite`, which Tailwind can't express).

This replaces the former blanket rule *"panels are `backdrop-blur-xl` glass."* Evaluated against
Apple's Liquid Glass docs — see [workflows/liquid_glass_decision.md](workflows/liquid_glass_decision.md).
Their rule is a **hierarchy** rule, not a visual-effect rule: the material belongs to the
**functional layer** (nav + controls floating above content) and explicitly **not** to the content
layer. Grifon had it inverted — 105 `backdrop-filter`s, most of them wrapping forms and data.

| Tier | Class | Job | Treatment |
|---|---|---|---|
| **CHROME** | `MAT_CHROME` | floats above content, operable | `blur(28px) saturate(190%)` + 7px masked rim lens + travelling specular. **The only tier that refracts.** |
| **PLATE** | `MAT_PLATE` | content at rest | tonal fill ~94% + inset top hairline, **no** backdrop-filter |
| **SLAB** | `MAT_SLAB` | has taken the screen | fully opaque, deep falloff |
| **VEIL** | `MAT_VEIL` | suppresses what's behind | `blur(8px)` + 72% dim, never holds text |

- **Picking one:** does it float above content the user is reading, and can you operate it? → CHROME.
  Is it *the* content? → PLATE. Has it taken over the screen? → SLAB. Does it exist to dim? → VEIL.
- **CHROME must earn it.** Over a flat `zinc-950` field, glass is optically a no-op — a GPU
  compositing pass for a faint grey wash. Give it something to bend (the `Aurora` field, the
  `GatewayReel`, scrolling content) or use PLATE. **If a change raises the app's `backdrop-filter`
  count, it's the wrong change.**
- **Primitives:** [`<GlassPanel>`](components/ui/GlassPanel.tsx) is PLATE by default (content layer);
  [`<LiquidGlass>`](components/ui/LiquidGlass.tsx) is CHROME (functional layer). Both take a `tier` prop.
- **Scroll edge effect** (`SCROLL_EDGE`) on any sticky bar — content grades out beneath it instead
  of colliding with its labels.
- **Accessibility is not optional.** `prefers-reduced-transparency` and `prefers-contrast: more`
  collapse every glass surface to a solid tonal fill (rim + specular off, contrast ring on). Any new
  material must carry the same guards — same standing as `prefers-reduced-motion`.
- **Concentric radii.** A nested corner is the outer radius **minus** the padding between them, so
  curves stay parallel. Use `concentricRadius(outer, padding)` — a 16px panel with `p-3` wants a 4px
  inner corner, not another `rounded-xl`.
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

- **glassPanel:** `MAT_PLATE border border-white/10 rounded-2xl p-6` (or `p-8`). Wraps ALL forms, tool settings, data displays. Tonal, **not** blurred — see Elevation & Depth; pass `tier="chrome"` only when it floats over live content.
- **liquidGlass:** the CHROME primitive — floating nav, rails, command palette, sticky bars. Radii are the caller's (`rounded-full` on a pill nav, `rounded-3xl` on a card); the rim lens inherits them.
- **goldButton:** `bg-[#FFCC00] text-black font-black uppercase tracking-widest px-8 py-4 rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] hover:scale-105 transition-all`. (In-app primary CTA. Use `rounded-full` instead of `rounded-xl` on marketing surfaces — see Shapes.)
- **goldButtonGhost:** `bg-transparent border border-[#FFCC00] text-[#FFCC00] font-black uppercase tracking-widest px-5 py-2 rounded-full hover:bg-[#FFCC00]/10 hover:shadow-[0_0_15px_rgba(255,204,0,0.3)] hover:scale-105 transition-all`. Persistent secondary CTA — use in sticky navs or footer when a primary `goldButton` exists elsewhere on the same surface, so the nav doesn't compete with the hero CTA.
- **ghostButton:** `bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white hover:border-[#FFCC00] transition-all rounded-xl`.
- **input / select:** `w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]`.
- **uploadDropzone:** `bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-xl hover:border-[#FFCC00] hover:bg-zinc-800/80 transition-all cursor-pointer flex flex-col items-center justify-center p-6`. Native `<input type="file">` MUST be hidden.
- **Icons:** ONLY `lucide-react` SVGs. Never raw text strings like `movie_filter`.

## Wizard control system (shared tokens)

The ad-creation wizard and the One-Shot composer read from ONE token source —
[components/ui/wizardTokens.ts](components/ui/wizardTokens.ts) — so heights, radii, type, and
spacing never drift step-to-step. Values were lifted from the One-Shot composer
([components/OneShotAd/LaunchScreen.tsx](components/OneShotAd/LaunchScreen.tsx)), the reference
for "clean." Import the consts (or the primitives below) instead of inlining strings.

- **Control floor — `h-11` (44px, `CTRL_H`).** Every interactive control — pills, selects,
  inputs, segmented toggles, popover triggers — sits on this tap-target floor. The primary CTA
  may step up to `h-12`. No ad-hoc `py-*` heights on controls.
- **Three radius tiers.** Controls `rounded-xl` (`R_CTRL`, 12px) · panels/cards `rounded-2xl`
  (`R_PANEL`, 16px) · modals `rounded-3xl` (`R_MODAL`, 24px). (Consistent with Shapes above —
  in-app controls stay rectangular, not pills.)
- **Type scale.** `T_DISPLAY` (page title) · `T_CTRL` (`text-sm font-semibold`, control labels) ·
  `T_VALUE` (`text-xs font-mono`, current values) · `T_LABEL` (`text-[10px]` mono caps, the
  `//` meta-labels). These are the label-caps register applied consistently.
- **Progressive disclosure (anti-dumbing rule).** Secondary/optional controls may be tucked into a
  [Popover](components/ui/Popover.tsx) or [Modal](components/ui/Modal.tsx) to cut scroll — BUT
  the control's current value stays visible on the collapsed trigger (`T_VALUE`), nothing used on
  every run gets buried, and expand is one click. Disclosure must feel like *tidy*, not *taken
  away*. Advanced/Director mode is the expert surface — never hide what an expert reaches for.

**Shared primitives (use them; don't re-style inline):**
[StepShell](components/ui/StepShell.tsx) (panel + standardized header) ·
[StepFooter](components/ui/StepFooter.tsx) (sticky BACK/CONFIRM nav) ·
[Popover](components/ui/Popover.tsx) · [Modal](components/ui/Modal.tsx) ·
[FieldLabel](components/ui/FieldLabel.tsx) · [TextField + TextArea](components/ui/TextField.tsx)
(tokenized successors to ui/Input + ui/Textarea) ·
[SegButton + Pill](components/ui/SegButton.tsx) (toggle groups).

## Motion system (shared tokens)

App-wide `motion@12` animation reads from ONE token source —
[components/ui/motionTokens.ts](components/ui/motionTokens.ts) — the motion sibling of
`wizardTokens.ts`. Where that file fixes heights/radii/type, this one fixes **easing**,
**duration**, and **spring physics** so motion never drifts component-to-component. Import the
tokens and snap to the nearest tier; don't inline raw numbers into a `transition`. (`brand-check`
flags inline transition values against this section.)

- **Easing (`EASE`).** `out` (`easeOut`, the default reveal) · `inOut` (`easeInOut`, ambient
  loops) · `expressive` (`[0.22, 1, 0.36, 1]`, premium hero/card entrances) · `veil`
  (`[0.65, 0, 0.35, 1]`, full-screen route wipes). Reach past these only for a genuinely new feel.
- **Duration (`DUR`), seconds.** `instant` 0.15 · `fast` 0.2 · `base` 0.3 · `slow` 0.45 ·
  `entrance` 0.6 · `expressive` 0.8. Infinite decorative loops use the separate
  `DUR.ambient` family (`pulse` 2.5 · `breathe` 4 · `drift` 8 · `slowDrift` 12) — pick by feel.
- **Spring (`SPRING`).** `pop` (modal/panel entrances) · `standard` (sliding chrome — sidebars,
  layout indicators) · `snappy` (segmented toggles) · `overshoot` (reserved for signature beats
  like the clapper snap). Spread into a transition to add a `delay` (`{ ...SPRING.standard, delay }`).
- **Reduced motion.** Tokens replace the *values*, not the accessibility gating. Keep every
  `useReducedMotion()` guard and the `prefers-reduced-motion` CSS in [index.css](index.css); use
  the `reducedMotion(reduce, transition)` helper to standardize the `reduce ? {duration:0} : …`
  ternary.

### Landing editorial direction

The approved September 2026 landing design is scoped to `.landing-page`.
It uses sentence-case headings at 600, a regular-weight hero headline, and
regular Instrument Serif accents. The approved hero line "Made to move." is
licensed as a whole serif line. Marketing buttons use Inter at 600; metadata
keeps JetBrains Mono. The resumed website phase extends this register to pricing,
the pre-auth gateway and checkout under `.public-purchase`: sentence-case headings
at 600, page display headings at 400, Inter button labels and restrained gold.
These public purchase surfaces use pill buttons and the existing material tiers;
inputs retain rounded-xl. The authenticated app remains outside this exception.
Native scrolling reveals an intentionally blank film frame. Motion stays
decorative, hidden hero controls leave the focus order, and reduced-motion
visitors receive a static hero. Gold remains the only interaction accent.

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
- Don't introduce new accent colors — gold is the only driver. (Sole exception: the documented per-module **identity** hues — icon/header/glow only, never actions. See Colors → Per-module identity.)
- Don't use icon fonts or text-string icons — lucide-react only.
