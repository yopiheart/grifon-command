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

### Slice 3 (not started)
Remaining `backdrop-blur` literals → tiers: modals + quota wall → SLAB, module chrome per the picking rule. Then move 06's concentric radii on whatever gets touched.

**Kill switch:** revert `GlassPanel.tsx` to `bg-zinc-900/80 backdrop-blur-xl …` and the app returns to v1 look; the tier CSS becomes dead but harmless. Full revert = this commit.
