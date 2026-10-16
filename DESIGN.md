---
version: alpha
name: Grifon.AI
description: Cinematic, premium AI marketing SaaS. Dark-first, with approved light/dark Companion Chat and one marketing light band.
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
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 3rem
    fontWeight: 600
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 2rem
    fontWeight: 600
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 1.125rem
    fontWeight: 400
  body-md:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
    fontSize: 0.875rem
    fontWeight: 400
  label-md:
    fontFamily: Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif
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

Cinematic, high-end, premium SaaS. Dark-first, with the owner-approved Companion Chat appearance exception below. **Unreal Engine meets Hollywood production studio.**

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

### Companion Chat appearance (Neil approved, 2026-10-16)

Companion Chat supports **Obsidian Gold** and **Pearl Gold**, based on the approved
Messages/Liquid Glass/Roadster study. This is a local chat appearance preference,
not a global theme change for the Studio, wizard, or marketing pages. The chat
sidebar shows the approved griffin mark alone, without a text wordmark.

- Light surfaces use neutral pearl, dark zinc text, and dark gold for readable
  accent text; `#FFCC00` stays the action fill. Light appearance includes chat
  navigation, reference briefs, review cards, cloud jobs, Assets, the viewer,
  loading/error states, and the chat account-settings portal.
- The approved appearance selector uses a raised neutral pill for its selected
  state, with clear pressed semantics and brighter readable text. Gold remains
  the action fill and keyboard-focus accent.
- Self-hosted **Oxanium**, licensed under the adjacent SIL OFL, provides the
  angular display register for the companion identity and conversation titles.
  Ordinary messages, controls, and form content retain Inter at 14px. Mobile
  message input is 16px to avoid input zoom. The commercial Hyperspace Race font
  used in the local study is not distributed with the application.
- Functional chrome can use a bounded refractive backdrop with a thin specular
  edge. Message bubbles and content cards remain readable PLATE surfaces.
  Preserve selectable messages, 44px targets, and the live 56px mobile / 64px
  desktop companion. Theme changes must not remount the chat or companion.
- The horizontal identity, composer, appearance control, and navigation follow
  the approved study. Header/footer clearances remain measured so every message,
  review heading, and action is reachable at 375px and desktop widths.
- Use one backdrop layer per chrome surface, without a second rim filter or
  animated blur. Generate displacement maps only when geometry changes. Reduced
  transparency and increased contrast use solid fills, readable text, and no
  optical decoration; reduced motion disables motion.

### Website wordmark (Neil approved, 2026-10-16)

Public website brand lockups use a modestly oblique **Oxanium** wordmark with a
static metallic gold/cream highlight, beside the unchanged approved griffin
mark. Keep the plain accessible text and the caller's navigation behavior. The
effect belongs to the text only, adds no backdrop-filter, and falls back to a
solid readable color in forced-colors mode. This exception does not restyle
approved ad artwork, export lockups, or the Studio rail.

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

- **Sans family:** Inter is the loaded, portable UI font, followed by `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, and `sans-serif` when unavailable. This is the actual stack; SF Pro and other proprietary brand fonts are not downloaded.
- **headline-display / headline-lg:** Sentence case, semibold 600, with restrained `-0.02em` tracking. Existing gradient fills (`bg-clip-text text-transparent bg-gradient-to-b from-zinc-100 to-zinc-500`) may stay; typography does not require a gradient. No global 900 weight or uppercase heading rule.
- **Weight ladder:** 400 regular / 500 medium / 600 semibold / 700 bold. Body and entered values use 400; buttons and shared field labels use 600. Use 500 and 700 for deliberate hierarchy rather than forcing every control bold.
- **body-lg / body-md:** Same sans family with normal tracking. The default app body is `body-md`, 14px (0.875rem) at 400; explicit larger reading and display sizes remain purposeful.
- **Ordinary controls:** Labels, buttons, inputs, selects, textareas, and navigation use sans, normal case, and normal tracking. Buttons are 14px at 600; shared field labels are 14px at 600; plain labels and entered values inherit regular 400. Human-readable helpers use sans at 12–13px.
- **label-caps:** JetBrains Mono, uppercase, wide tracking, only for genuine metadata. Preserve explicit code, keyboard hints, technical IDs, timers, and standalone `.font-mono` / `.tech-data` metadata; a label, button, input, select, or textarea's legacy `font-mono` class does not make that control technical — use `.tech-data` deliberately for that exception. Do not override `.uppercase`, `.font-black`, or `.font-mono` utilities globally; approved ad export artwork and wordmarks retain their typography.
- **serif-accent:** Instrument Serif italic 400, **marketing surfaces only** (the pre-auth gateway — sign-in/sign-up screen — counts as a marketing surface; the authed app does not). Used for a maximum of 1–2 accent words per headline (rendered in Grifon Gold) and for kinetic marquee strips. Use `<span className="font-serif italic normal-case tracking-normal">` for accent words; the approved whole serif hero line is documented below. The `.landing-page` and `.public-purchase` typography stays scoped to those surfaces. Never in-app or for body text.

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
- **Companion chat glass (owner-approved scope):** the compact horizontal identity and message
  composer float above the scrolling conversation. Use local neutral CHROME treatment with
  restrained tint, refraction and edge highlights; messages and output cards stay PLATE. See the
  2026-10-16 appearance exception for the approved navigation/appearance controls. Keep the
  area around the identity transparent so history remains visible beneath it. This explicit
  scope permits the two functional surfaces to add bounded blur passes; it does not relax
  the filter budget elsewhere. Do not add a second rim filter or animate blur strength.
  Measure header/footer clearance so new messages and review headings stay fully reachable.
  Keep 44px controls, 14px text, normal message selection, and the approved 56/64px mascot;
  disable selection and image dragging only on the decorative identity. Reduced transparency
  and higher contrast use solid compact controls with the same layout and safe clearances.
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
- **goldButton:** `bg-[#FFCC00] text-black font-sans text-sm font-semibold normal-case tracking-normal px-8 py-4 rounded-xl hover:shadow-[0_0_20px_rgba(255,204,0,0.4)] hover:scale-105 transition-all`. (In-app primary CTA. Use `rounded-full` instead of `rounded-xl` on marketing surfaces — see Shapes.)
- **goldButtonGhost:** `bg-transparent border border-[#FFCC00] text-[#FFCC00] font-sans text-sm font-semibold normal-case tracking-normal px-5 py-2 rounded-full hover:bg-[#FFCC00]/10 hover:shadow-[0_0_15px_rgba(255,204,0,0.3)] hover:scale-105 transition-all`. Persistent secondary CTA — use in sticky navs or footer when a primary `goldButton` exists elsewhere on the same surface, so the nav doesn't compete with the hero CTA.
- **ghostButton:** `bg-zinc-950 border border-white/10 text-zinc-400 hover:text-white hover:border-[#FFCC00] transition-all rounded-xl`.
- **input / select:** `w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 font-sans text-sm font-normal normal-case tracking-normal text-white focus:outline-none focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]`.
- **uploadDropzone:** `bg-zinc-950/50 border-2 border-dashed border-white/10 rounded-xl hover:border-[#FFCC00] hover:bg-zinc-800/80 transition-all cursor-pointer flex flex-col items-center justify-center p-6`. Native `<input type="file">` MUST be hidden.
- **Icons:** ONLY `lucide-react` SVGs. Never raw text strings like `movie_filter`.

## Wizard control system (shared tokens)

The ad-creation wizard and the One-Shot composer read from ONE token source —
[components/ui/wizardTokens.ts](components/ui/wizardTokens.ts) — so heights, radii, type, and
spacing never drift step-to-step. Sizing and surfaces were lifted from the One-Shot composer
([components/OneShotAd/LaunchScreen.tsx](components/OneShotAd/LaunchScreen.tsx)), the reference
for "clean"; typography follows the current rules above. Import the consts (or the primitives below) instead of inlining strings.

- **Control floor — `h-11` (44px, `CTRL_H`).** Every interactive control — pills, selects,
  inputs, segmented toggles, popover triggers — sits on this tap-target floor. The primary CTA
  may step up to `h-12`. No ad-hoc `py-*` heights on controls.
- **Three radius tiers.** Controls `rounded-xl` (`R_CTRL`, 12px) · panels/cards `rounded-2xl`
  (`R_PANEL`, 16px) · modals `rounded-3xl` (`R_MODAL`, 24px). (Consistent with Shapes above —
  in-app controls stay rectangular, not pills.)
- **Type scale.** `T_DISPLAY` (sentence-case, semibold page title at `-0.02em`) ·
  `T_CTRL` (14px sans semibold, buttons and field labels) · `T_VALUE` (14px sans, current values) ·
  `T_LABEL` (`text-[10px]` mono caps, genuine metadata only). `FieldLabel` uses `T_CTRL`;
  workflow helpers in `StepShell` and `Card` use regular sans at 12px and 13px.
- **Progressive disclosure (anti-dumbing rule).** Secondary/optional controls may be tucked into a
  [Popover](components/ui/Popover.tsx) or [Modal](components/ui/Modal.tsx) to cut scroll — BUT
  the control's current value stays visible on the collapsed trigger (`T_VALUE`), nothing used on
  every run gets buried, and expand is one click. Disclosure must feel like *tidy*, not *taken
  away*. Advanced/Director mode is the expert surface — never hide what an expert reaches for.

**Shared primitives (use them; don't re-style inline):**
[StepShell](components/ui/StepShell.tsx) (panel + standardized header) ·
[StepFooter](components/ui/StepFooter.tsx) (sticky Back/Confirm nav) ·
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
The hero alone uses gold ribbons that unfold from the center after the copy clears,
with staggered leading light coordinated with the blank film's rise. Their shape
and internal current keep flowing at both margins during the film hold, leaving
its center clear. Native scrolling reverses the opening; the edge aura leaves with
the film stage. It uses no literal wings or stars and suspends drawing offscreen.
The gold headline receives one deliberate highlight pass on entry. Both effects
are omitted for reduced motion, and motion below the hero stays restrained.

## Dashboard pilot (Gemini-inspired)

The dashboard (`components/Dashboard.tsx` and its exclusive cards — `CommandPalette`, `RecentWorkCard`, `ResumeDraftCard`, `OnboardingNudge`, `ActiveJobsPanel`) runs a scoped pilot for borderless tonal surfaces. Keep that surface treatment scoped unless approved; calm typography is now the shared app default.

- **Borderless tonal surfaces.** Dashboard cards drop `border border-white/10` and separate by tonal fill alone (`bg-zinc-900/70`, `bg-white/[0.03]`). Elevation is still glass + blur — no drop shadows. The hero card (Director) signals priority with a gold-tinted fill (`bg-[#FFCC00]/[0.06]`) instead of a gold border.
- **Calm typography.** The dashboard hero remains a regular-weight, sentence-case greeting and module card titles use sentence case. Shared app headings now use semibold 600 with restrained tracking; the dashboard no longer needs non-heading elements to escape a global uppercase rule. Monospace remains for genuine metadata.

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
