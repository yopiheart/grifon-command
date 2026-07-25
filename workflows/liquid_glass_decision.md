# Liquid Glass Evaluation — Decision

**Date:** 2026-07-24 · **Verdict:** **YES — as an inversion, not an addition.**
**Artifact (live spec + mocks):** https://claude.ai/code/artifact/e20664a5-541f-4e39-ae39-55742443d278
**Source page:** [assets/design/grifon-glass-v2.html](../assets/design/grifon-glass-v2.html) (committed so it survives the defreezer; redeploy the same path to update the URL)

Sources evaluated: Apple *Liquid Glass* overview, *Adopting Liquid Glass*, *Landmarks* sample, plus HIG *Materials* (the overview page is a JS hub with no prose — the material rules actually live in HIG Materials).

---

## The finding

Apple's rule is a **hierarchy** rule, not a visual-effect rule:

> "Liquid Glass forms a distinct functional layer for controls and navigation elements … that floats above the content layer."
> "**Don't use Liquid Glass in the content layer.**"
> "**Use Liquid Glass effects sparingly** … overusing this material in multiple custom controls … distract[s] from that content."

Grifon does the inverse. `GlassPanel` (`bg-zinc-900/80 backdrop-blur-xl border border-white/10`) wraps **all** forms, tool settings and data displays per DESIGN.md — i.e. the content layer — while most real chrome (SiteHeader, DashboardSidebar, StepFooter) is flat or lightly blurred.

### Measured on this branch (`components/` + `App.tsx`)

| Metric | Value | Note |
|---|---|---|
| `backdrop-blur` instances | **105** | vs Apple's "sparingly" |
| Distinct blur tiers | **6** (`xl` 47 · `sm` 24 · `md` 19 · bare-modifier 10 · plain 4 · `none` 3) | ad hoc; Apple ships 4 semantic tiers |
| `prefers-reduced-transparency` / `prefers-contrast` guards | **0** | 10 `prefers-reduced-motion` blocks exist — this is the one real defect |
| Radius tiers + control floor | already correct | `R_CTRL`/`R_PANEL`/`R_MODAL` + `CTRL_H = h-11` in `wizardTokens.ts` |

### The point no count shows

Glass over `zinc-950` with a static gold radial behind it is **optically a no-op** — refraction needs something worth bending. It costs a GPU compositing pass per surface (relevant on the mid-range Android hardware Grifon's SMB users run) and returns a faint grey wash. Apple's glass sits over photos and scrolling content. The unlock is that Grifon *has* that content — its own generated ad frames — and doesn't put it behind the chrome.

The Dashboard borderless-tonal pilot (DESIGN.md → "Dashboard pilot") independently landed on Apple's answer. **It is the template, not the exception.**

---

## Ranked moves

| # | Move | Impact | Effort | Risk |
|---|---|---|---|---|
| 01 | **Invert the layers.** Demote `GlassPanel` → PLATE (tonal, no filter); promote `SiteHeader`, `DashboardSidebar`, `StepFooter`, `CommandPalette`, `PinnedCtaPill`, toolbars → CHROME. | ●●●●● | ●●○○○ | ●○○○○ |
| 02 | **Put footage behind the glass.** Extend the ad montage / `Aurora` under floating bars (Apple's background-extension effect) instead of stopping at their edge. | ●●●●● | ●●○○○ | ●○○○○ |
| 03 | **Upgrade the material.** Masked rim band with its own heavier blur + saturation, inset top/bottom lights, travelling specular on hover. Pure CSS. | ●●●●○ | ●○○○○ | ●○○○○ |
| 04 | **Ship the a11y guards.** `prefers-reduced-transparency` + `prefers-contrast: more` beside the reduced-motion blocks in `index.css`. | ●●●○○ | ●○○○○ | ○○○○○ |
| 05 | **Scroll edge effect** under every sticky bar (pricing nav, dashboard top bar). | ●●●○○ | ●○○○○ | ○○○○○ |
| 06 | **Concentric radii** — inner radius = outer − padding, not another `rounded-xl`. | ●●○○○ | ●●○○○ | ●○○○○ |

**Sequencing:** 01 + 04 first (one session). 02 + 03 next — that pair is where the premium jump lands. 05 + 06 fold into whatever surface gets touched next.

---

## The tier system (replaces "backdrop-blur, pick one")

| Tier | Job | Treatment | Target count |
|---|---|---|---|
| **CHROME** | floats above content, operable | `blur(28px) saturate(190%) brightness(1.10)` + 7px masked rim lens + inset specular | ~12 |
| **PLATE** | content at rest | tonal fill ~94%, inset top hairline, **no** backdrop-filter | ~90 |
| **SLAB** | demands a decision | fully opaque, 24px radius, deep falloff (Apple: expanded sheets go opaque) | ~8 |
| **VEIL** | suppresses | `blur(8px)` + 72% dim, never holds its own text | ~5 |

Net: **105 → ~17** backdrop-filters, with the survivors doing visibly more work.

Nothing in DESIGN.md's colour law changes — gold stays the sole action colour, the light band stays solid, module identity hues stay on icons. One line changes: *"elevation is expressed through frosted glass"* → *"elevation is expressed through **tier**."*

---

## Where it does NOT fit

- **Landing hero.** Liquid Glass is a *deference* material; a hero must assert. Glass the nav that floats over it, not the hero itself.
- **Proof band (`#F2F1EA`).** Solid by rule, and the rule is right — Apple agrees: no glass in the content layer.
- **Generated ad output.** UI chrome only. Nothing here touches prompts, templates, or the render pipeline.
- **Dense wizard forms (Steps 1–7).** Translucency behind small text is a legibility tax. Plate them; glass only the sticky footer.
- **Anything expecting SwiftUI APIs.** `glassEffect`, `GlassEffectContainer`, `ConcentricRectangle`, adaptive tint/luminosity are free on Apple platforms and absent on the web — budget for hand-built CSS.
- **As a reason to add blur.** If a change raises the `backdrop-blur` count, it's the wrong change.

---

## Status — SHIPPED (slice 1), 2026-07-24

Moves **01 · 02 · 03 · 04 · 05** are in the app. Move **06** (concentric radii) has its helper but no call sites yet.

**New files**
- `components/ui/materialTokens.ts` — the fourth token sibling (after wizard/dashboard/motion). Tier constants, `MaterialTier`, `concentricRadius()`.
- `components/ui/LiquidGlass.tsx` — the CHROME primitive (counterpart to GlassPanel), with `tier`, `scrollEdge`, `as`.
- `components/ui/GatewayReel.tsx` — abstract gold/zinc ad plates drifting behind the auth glass. Move 02.

**Changed**
- `index.css` — the four tier bodies in `@layer components` (native cascade layer: Tailwind here is the **Play CDN**, whose output is unlayered, so a caller's one-off utility still wins), `.scroll-edge`, `.mat-chrome-mobile`, the `gateway-reel` keyframe, and the **`prefers-reduced-transparency` + `prefers-contrast: more` guards** (move 04 — the one genuine defect).
- `components/ui/GlassPanel.tsx` — default flipped to PLATE, `tier` escape hatch. **64 of its 65 call sites lost their backdrop-filter**; the auth gateway is the one that kept it.
- `components/ui/SiteHeader.tsx` — CHROME + scroll edge once scrolled; fully transparent at rest so the hero still leads.
- `components/ui/StepFooter.tsx` — CHROME below `md` only, where it actually detaches and floats.
- `components/ui/CommandPalette.tsx` — panel → CHROME, scrim → VEIL.
- `App.tsx` — gateway gets the reel behind it and `tier="chrome"` in front. The one panel that genuinely floats over live content.
- `DESIGN.md` — "Elevation & Depth" rewritten as the tier system; `glassPanel`/`liquidGlass` component entries updated.

**Verified:** `npm run build` clean · `npm test` 1005 passed / 26 skipped · `npm run design:lint` 0 errors, 0 warnings · tier CSS + both a11y guards confirmed present in the built bundle.

**Not verified:** no browser pass. Visual confirmation of the rim lens, the gateway reel and the scroll edge still needs a `smoke-tester` run on `/`, `/pricing`, the gateway and the dashboard.

**On the 105 → ~17 target:** the source-literal count moved 105 → 104, because the reduction happened *inside* a shared primitive. The metric that matters is rendered blurred surfaces, and that's down by 64 in one edit. The remaining literals are the un-swept surfaces — modules, modals, dashboard chrome — for slice 2.

### Slice 2 — SHIPPED (dashboard + loading), 2026-07-24

**Dashboard chrome**
- `DashboardSidebar` desktop rail → CHROME. Earns it: `SmokeAura` is a fixed full-screen field rendered behind it, so there is real content to refract.
- Mobile drawer → CHROME, its scrim → VEIL.
- Dashboard mobile top bar → CHROME + scroll edge (the slate scrolls under it).
- Hero input → **deliberately not chrome**. It sits in the flow of the slate and floats over nothing; its `backdrop-blur-xl` was blurring a near-black field, so it's simply gone. Ring + tonal fill carry the treatment.

**Loading**
- `Loader` → the **lens ring**: a conic sweep masked to an annulus with a bright leading head and a falloff tail (`.lens-ring`), replacing the border-with-one-transparent-side spinner. Speaks the same specular vocabulary as CHROME. The message no longer pulses — animating the one honest string made it harder to read.
- `BootScreen` → CHROME (it floats over the same `GatewayReel` as the sign-in card), plus a gold light source that travels **behind** the pane. Because the panel's backdrop filter samples it, the glass brightens and its rim lenses as the light passes: the indicator is the surface reacting, not a widget bolted on. Hidden entirely under reduced motion.

**Rim retune (applies to every CHROME surface).** The 7px / `brightness(1.28)` rim read as a hard second border on the tall dashboard rail. Now `--mat-rim: 4px` / `brightness(1.16)` / `saturate(210%)`, with the width exposed per-surface via `rim(px)` from materialTokens — both rails use `rim(2)`.

**Verified in Chromium** (1600×1000 and 390×844): dashboard collapsed rail, expanded rail, scrolled module grid, mobile drawer, landing header at the new rim. Build clean, 1005 tests, design:lint silent.

**Not verified:** `BootScreen` — it only renders during a real OAuth return and the local `sessionStorage` flag didn't reproduce it; it shares the CHROME tier with the verified gateway card, but its travelling-light beat has not been seen. The lens ring was confirmed as a static specimen page, not inside a live module run.

---

## Full HIG review, 2026-07-24 — the finding the Liquid Glass pages missed

Reviewed the wider Human Interface Guidelines (Color, Typography, Layout, Motion, Dark Mode, Accessibility, Loading) rather than just the two Liquid Glass pages. Most of it confirmed decisions Grifon had already made. Four things did not.

### 1. The contrast floor — SHIPPED (a real WCAG failure, not a taste call)

HIG Accessibility: *"Minimum contrast ratio: 4.5:1 for text up to 17 pts."* Dark Mode: *"strive for a contrast ratio of 7:1, especially in small text."* Measured against `surface` (`#09090B`):

| Token | Hex | Ratio | |
|---|---|---|---|
| `text-zinc-500` (the `on-surface-sublabel` value) | `#71717A` | **4.12:1** | ✗ — **575 uses** |
| `text-zinc-600` | `#52525B` | **2.57:1** | ✗ |
| `text-zinc-700` | `#3F3F46` | **1.91:1** | ✗ |

The smallest type in the app — the 10px `//` mono meta-labels — was also the lowest-contrast. Fixed by moving `on-surface-sublabel` to **`#82828B` (5.22:1)** and sweeping all 575 sub-floor text greys onto that semantic role, which also pulls the codebase toward DESIGN.md's own "reference roles, not hex literals" rule. The ladder is now 19.9 / 13.5 / 7.8 / 5.2 — four distinct steps, every one passing.

**Carve-out:** the `proof-band` (`#F2F1EA`) inverts — `#82828B` scores only 3.36:1 there, *worse* than what it replaced. `CreamBand.tsx` and `ReceiptsRail.tsx` (8 occurrences) are excluded and keep the band's dark zinc ladder.

### 2. Monochrome rails — OPEN, needs Neil

HIG Color: *"Avoid using similar colors in control labels if your app has a colorful background. Prefer a monochromatic appearance for toolbars and tab bars, or choose an accent color with sufficient visual differentiation."*

The dashboard rail now carries 15 module identity hues on a CHROME surface floating over a gold aura field — exactly the case that rule addresses. But per-module identity hues are a documented, deliberate Grifon decision (DESIGN.md → Per-module identity). **Not changed unilaterally.** The options are: keep as-is (identity wins), monochrome the rail and keep hues only on module headers/tiles, or desaturate hues ~40% on the rail only. Neil's call.

### 3. Colour placement across layers — partly addressed

HIG Color: *"Be aware of the placement of color in the content layer… avoid overlap of similar colors in the content layer and controls."* This is precisely the gateway bug already fixed with the dimming layer. The same pattern is still live but milder on the dashboard: a gold `New Ad` CTA on a glass rail over a gold `SmokeAura`. Watch it; not currently failing.

### 4. Loading that blocks — OPEN, product call

HIG Motion: *"Let people cancel motion. Avoid making people wait for an animation to complete before they can do anything."* HIG Loading: *"Show something as soon as possible… Let people do other things while they wait."*

`BootScreen` enforces an artificial minimum hold (`MIN_MS - elapsed` in App.tsx) — it literally makes people wait for an animation after the session is ready. That is the film-leader beat working as designed, and it is also the thing the HIG names. Flagged, not removed: it's a brand decision, not a bug.

**Confirmed, no action needed:** weight ladder (400/600/700, no light weights) already matches *"avoid light font weights"*; the 44px control floor matches the 44pt minimum; "differentiate controls from content" is the inversion thesis restated; "apply color sparingly to the Liquid Glass material" is already how gold is used.

---

---

## Icon + layout audit, 2026-07-25

### Icons — SHIPPED

Rendered every module icon at rail size (20px) **with the colour removed**. That is the real test: if two silhouettes collide in greyscale, the hue is carrying the meaning, not the icon.

- **Three concentric-circle glyphs** — Radar (Recon), Target (War Room), Aperture (Cinema Command). Radar and Target were near-indistinguishable at 20px. Replaced with **Binoculars / Swords / Projector**; one circle kept, all three now separable without colour. This matters more since the HIG Color finding above may push the rail monochrome — at which point the icon must stand alone.
- **The registry was not actually the single source of truth.** Three surfaces kept private icon maps, and they had drifted badly: `RecentWorkCard` showed Director AI as a *film strip* and Render Bay as a *clapperboard* — **the two modules were wearing each other's icons** depending on which screen you were on. `HookLab`'s own header wore Aperture, which belonged to Cinema Command. All three now read `getModuleIdentity()`; the rule is documented in the registry docblock.
- Remaining, not changed: **level of detail is inconsistent** (Clapperboard/FlaskConical are dense, Zap/Flame are three strokes) against HIG's *"consistent size, level of detail, stroke thickness"*, and the set mixes physical studio objects with abstract concepts. Cosmetic, needs a design call.

### Layout — measured across 3 pages × 2 widths

Measured in Chromium, not eyeballed.

**Passes outright:** zero horizontal overflow on all six combos, and **zero mobile lines over 75ch** on all three pages. The dashboard is the cleanest layout in the app — 2 distinct container widths where landing has 7.

| Finding | Before | After | Status |
|---|---|---|---|
| Tap targets <44px, landing mobile | 17 | **10** | fixed the icon buttons + near-misses |
| Tap targets <44px, pricing mobile | 12 | **5** | " |
| Widest desktop line | **127ch** | 105ch | worst one capped at 68ch |
| Distinct container max-widths, landing | 7 | 7 | **open** |
| Distinct section paddings, landing desktop | 7 | 7 | **open** |

Fixed: mobile menu button (32→44), sound toggle (16→44), consent dismiss (32→44), carousel arrows (36→44), header mobile CTA (29→44), consent Accept/Decline (42→44), pricing billing switcher (40→44).

### Container + rhythm scales — SHIPPED

`components/ui/layoutTokens.ts` — the fifth token sibling. Two scales, three steps each.

| | Steps | |
|---|---|---|
| **Containers** | `SHELL` 1280 · `COLUMN` 896 · `MEASURE` 68ch | plus `GUTTER`, and `PX` for the inline-style holdouts |
| **Rhythm** | `BAND_HERO` 80/128 · `BAND` 64/96 · `BAND_TIGHT` 48/64 | symmetric, 4:3:2 on desktop |

Measured before → after, 1440px:

| | Landing before | Landing after | Pricing before | Pricing after |
|---|---|---|---|---|
| Page container widths ≥400px | 7 | **2** (1280, 896) | 6 | **3** (1280, 896, 68ch) |
| Section paddings | 7, two asymmetric | **4, one asymmetric** (the hero, deliberate) | 3, two asymmetric | **2, symmetric** |
| Section left edges | — | **all 0** | 4 distinct | **3** |
| Widest paragraph | 127ch | ~69ch | 87ch | ~69ch |

Two things worth recording:

- **`MEASURE` is in `ch`, not px.** The first pass used 640px and the pricing FAQ answers still measured over the band, because their type is smaller than the body — a pixel cap is only the right measure at one font size.
- **Widening the containers made line length worse before it got better.** Snapping `max-w-6xl` up to `SHELL` gave the prose more room to run, and the over-75ch count went 7 → 10 before the `MEASURE` caps brought it back. Container scale and reading measure have to move together.

**Measurement caveat:** the audit's "ch" is an approximation (`width ÷ 0.5em`), which overestimates real `ch` for Inter by ~18%. The remaining flags reported at 76–81ch are ~65–69 real ch — inside the 45–75 band, not defects. The 127ch and 105ch outliers were real and are fixed.

**Still open, needs Neil — these change composition, not just size:**

1. **Legal text links are 16–17px tall** (Terms, Privacy, Refund, Support in the footers). Wide enough to hit, too short vertically. Fixing means giving the footer link rows real height, which changes the footer's look.
2. **Landing uses 7 different container max-widths** (1280 / 1152 / 896 / 512 / 360 / 280 / 180) and pricing uses 6 (340 / 1280 / 600 / 900 / 1440 / 700). Section edges therefore don't align down the page — against HIG Layout's *"Align components with one another."* Consolidating to 2–3 is a real restructure.
3. **No vertical rhythm.** Landing desktop runs 80/96 · 112/112 · 128/128 · 64/64 · 80/80 · 128/128 · 96/96 — seven values, one asymmetric. Pricing uses 60px paddings, which are off the 4px scale entirely.
4. **6 remaining desktop lines over 75ch** (worst 105ch on landing, 87ch on pricing, 112ch on the dashboard hero subcopy).

### Slice 4 — module sweep, SHIPPED 2026-07-25

The 93 remaining raw `backdrop-blur` literals across 30 module files are gone. **1 left**, and it's a `lg:backdrop-blur-none` modifier that legitimately *disables* the effect at a breakpoint.

| Category | Count | Disposition |
|---|---|---|
| Content-layer surfaces (module cards, panels, tiles) | **61** | filter **stripped**. Nothing was behind them but `zinc-950`, so this is 61 GPU compositing passes bought back for no visual change. Their tonal `bg-*` stays; they are de-glassed, not yet formally on the PLATE token. |
| Floating action bars, sticky headers, toasts | **11** | → CHROME |
| Overlays sitting on a generated frame, scrims, lock states | **20** | → VEIL |
| Modal backdrops | **1** | → VEIL |

**The judgement call worth recording:** an overlay on `absolute inset-0` over an image is the one place a blur was always doing real work — there is a picture behind it to obscure. Those kept their filter and got named VEIL rather than stripped. The `VEIL` docblock was amended to say so, and to allow a scrim to carry a brief status line (a loader label, a lock message) but never the surface's real content.

**Verified:** build clean, 1005 tests, design:lint silent, and Recon opened in Chromium with no page errors — panels render tonal, `//` labels legible at the new contrast floor.

### Slice 5 (not started)
Formally move the 61 de-glassed content surfaces onto `MAT_PLATE` rather than leaving their ad-hoc `bg-zinc-9xx/xx`. Then move 06's concentric radii on whatever gets touched next.

**Kill switch:** revert `GlassPanel.tsx` to `bg-zinc-900/80 backdrop-blur-xl …` and the app returns to v1 look; the tier CSS becomes dead but harmless. Full revert = this commit.
