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

## Status

Evaluation + spec + prototype complete. **No app code changed** — moves 01–06 touch `components/ui/`, `index.css` and ~90 call sites, so they need a plan + `/goal` gate before implementation (CLAUDE.md → Plan → Goal pipeline), and the non-trivial slices belong with `code-executor`.

**Kill switch:** none needed — nothing is wired into the app. Deleting `assets/design/grifon-glass-v2.html` and this file reverts the entire initiative.
