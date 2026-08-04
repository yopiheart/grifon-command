# NOIR Artifact Style — the full spec

> Extracted from CLAUDE.md on 2026-08-05 to cut session boot cost — content unchanged,
> only reformatted. CLAUDE.md keeps a one-bullet pointer here. **Read this file BEFORE
> writing any Grifon-project artifact HTML.** Client artifacts (`clients/<name>/`) do
> NOT use this — they follow the client's own `DESIGN.md` (for Oceanides: matte
> navy + amber print, no glass, no charcoal, no `#FFCC00`).

**NOIR treatment is the standing default for Grifon-project artifacts** (Neil,
2026-07-22): the look of [assets/grifon-social/noir/](../assets/grifon-social/noir/).
Target feel: premium, billion-dollar, stands out. DESIGN.md typography rules apply.
Fonts must be inlined or system-stack fallbacks (artifact CSP blocks font CDNs).

## The visual world

- **Ground:** charcoal radial `radial-gradient(#131316 → #09090B → #070708)` with a
  faint gold ambient glow (`rgba(255,204,0,.06)`) and film grain (SVG turbulence,
  `opacity .15`, screen blend).
- **Display type:** 900-weight uppercase. The silver-gradient look
  (`#F4F4F5 → #71717A` background-clip) is **DESKTOP-ONLY** — in artifacts, display
  type is solid near-white (see the ban below).
- **Emphasis line:** gold italic serif (Instrument Serif w/ `text-shadow` gold bloom).
- **Eyebrow:** `// EYEBROW` in JetBrains Mono gold, `letter-spacing .32em`.
- **Foot:** dim mono `GRIFON` signature.
- **UI chrome:** liquid-glass panels (translucent `backdrop-filter: blur` cards) —
  but see mobile rule 3.

## Mobile-safe implementation (MANDATORY)

Neil views artifacts on his phone; this bit us TWICE on 2026-07-27. Treat the
**Android WebView as the primary renderer.** Known breakages + required patterns:

1. `background-attachment: fixed` detaches → put the radial ground on a
   `position:fixed; inset:0; z-index:0` DIV over solid `#070708` `html`/`body`.
2. A naked fixed-position `<svg>` filter element paints as a cut-off rectangle →
   grain is a **tiled data-URI SVG background-image** (`background-repeat:repeat;
   background-size:240px`) on its own fixed DIV.
3. `backdrop-filter` is unreliable → liquid-glass must be DESIGNED to work without
   it (layered sheen gradients + inner top-edge highlight + edge lighting + shadow),
   keeping `backdrop-filter` as progressive enhancement only.
4. `text-shadow` does not render on `background-clip:text` transparent text → use
   `filter: drop-shadow()` for glow on gradient type, and keep clipped-gradient
   ranges bright enough to read on charcoal.
5. When gold type looks weak, the cause is the **glow radius, not the color**: a wide
   `drop-shadow` haze around already-high-contrast type softens the letter edges.
   Hug it in (≈9–14px, slightly higher alpha) — tighter reads as *more* gold **and**
   crisper at once.

⛔ **`background-clip:text` + `color:transparent` is BANNED in artifacts** (caught on
Neil's real phone 2026-07-29, third mobile miss). The Android WebView the Claude app
renders artifacts in mispaints clipped-gradient text — every clipped heading came out
**inverted and far darker than either gradient stop**, while every SOLID-colour
element on the same screen (gold eyebrow, gold italic serif, body, mono captions)
rendered perfectly. **In artifacts, display type is a solid near-white (`#F5F5F7`,
17.3:1) with the gold bloom as a plain `text-shadow`** (text-shadow is unreliable on
clipped text but rock-solid on solid text). Don't try to patch the clip; remove it.

## Measured color floors (contrast-audited on the charcoal ground, 2026-07-29)

Ratios are computed, not estimated — supersedes the earlier "~`#A1A1AA`" guidance.

- Clipped-gradient dark stop (desktop-only use) ends at **`#C4C4CB` (10.8:1)** — on a
  3-line heading, line 3 lands on that stop, and `#A1A1AA` (7.3:1) visibly reads as
  fading out.
- Small mono captions/meta at 9–12px: **`#9A9AA3` (6.7:1)** — `#71717A` is **3.89:1
  and fails even AA**.
- Semantic warning/flag hue at that size: **`#FF8563` (7.9:1)**, not a mid red like
  `#E0563A` (4.98:1).
- Gold `#FFCC00` measures **12.4:1** and is never the contrast problem — if it looks
  weak, see mobile rule 5 (glow radius).

## Delivery gate (MANDATORY)

**Before handing Neil any Grifon artifact URL (new or redeployed with visual
changes), spawn `smoke-tester` to open the local HTML at a 390×844 viewport and
screenshot it; eyeball for continuous ground, visible glass, and luminous display
type. No mobile screenshot = not done.**

⚠️ **Know what that gate CANNOT do.** It is a *viewport-size* check in headless
Chromium — it emulates the screen, not the engine. Chromium supports
`background-clip:text`; the WebView mispaints it, so the gate **passed a page Neil's
phone rendered wrong** (2026-07-29). It catches layout, overflow, missing assets and
dark-ground breakage; it does **not** prove any CSS feature paints correctly on a
real device. The defence is not more screenshots — it is **not depending on fragile
features in the first place** (rules 1–5 above). When a look genuinely needs a risky
property, ship a solid-colour default and treat the effect as pure enhancement, then
let Neil's own eyeball on the live URL be the final gate.
