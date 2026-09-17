---
name: artifact-noir
description: Create or revise Grifon HTML artifacts in the mobile-safe NOIR style. Load before artifact HTML/CSS work. Excludes product UI and client artifacts governed by their own DESIGN.md.
---

For Codex tool execution, read [the desktop adapter](../_shared/codex-runtime.md) before following the workflow below.

# 🛑 STOP — is this client work?

**If the artifact is for anything under `clients/<name>/`, this skill does not apply. Close it.**

Follow that client's `DESIGN.md` instead. For Oceanides / Kuya Marvin that is
[clients/oceanides/DESIGN.md](../../../clients/oceanides/DESIGN.md): matte **navy + amber** print —
**no glass, no charcoal, no `#FFCC00`**. The exact opposite of NOIR on every axis.

This carve-out cost a full artifact rebuild on 2026-07-28, because the NOIR rule reads as universal
and isn't. It is repeated here, at the top of the NOIR spec itself, because a one-line warning
upstream loses to a page of freshly-loaded charcoal-and-gold spec.

`clients/oceanides/DESIGN.md` is also the registry for all Oceanides artifacts (KM-003 campaign
dashboard, page-launch run sheet, consent walkthrough) — that file, not AGENTS.md, is their index.
Its legacy connector lessons describe the former Claude artifact runtime. In Codex, use the desktop adapter above; a local HTML file has no connector capability unless it is explicitly implemented and authenticated.

Still here? Then this is a Grifon-project artifact. Continue.

> **Note (2026-08-06):** this skill currently duplicates the reference half of AGENTS.md's
> "Artifact Reporting" section rather than replacing it. That is deliberate — this is Step 0 of a
> staged refactor, and nothing has been deleted from AGENTS.md yet. Until that changes, **AGENTS.md
> remains canonical** on any point where the two disagree.

---

## The NOIR treatment

Standing default for Grifon-project artifacts (Neil, 2026-07-22). The reference look lives in
[assets/grifon-social/noir/](../../../assets/grifon-social/noir/).

- **Ground** — charcoal radial `radial-gradient(#131316 → #09090B → #070708)`, faint gold ambient
  glow `rgba(255,204,0,.06)`, film grain (SVG turbulence, `opacity .15`, screen blend).
- **Display type** — 900-weight uppercase. On desktop this was a silver gradient
  (`#F4F4F5 → #71717A` background-clip); **in artifacts it must be solid** — see the ban in rule 6.
- **Emphasis line** — gold italic serif (Instrument Serif) with a gold bloom.
- **Eyebrow** — `// EYEBROW` in JetBrains Mono, gold, `letter-spacing .32em`.
- **Signature** — dim mono `GRIFON` at the foot.
- **Chrome** — liquid-glass panels (translucent cards), subject to rule 3.
- DESIGN.md typography rules apply. Target feel: premium, billion-dollar, stands out.
- **Fonts must be inlined or system-stack fallbacks** — self-contained delivery must not depend on font CDNs.

## Mobile-safe implementation — MANDATORY

Neil views artifacts on his phone. **Treat the Android WebView as the primary renderer, not
Chromium.** This bit us twice on 2026-07-27 and a third time on 2026-07-29.

1. **`background-attachment: fixed` detaches.** Put the radial ground on a
   `position:fixed; inset:0; z-index:0` DIV over solid `#070708` `html`/`body`.
2. **A naked fixed-position `<svg>` filter paints as a cut-off rectangle.** Grain must be a tiled
   data-URI SVG `background-image` (`background-repeat:repeat; background-size:240px`) on its own
   fixed DIV.
3. **`backdrop-filter` is unreliable.** Liquid-glass must be DESIGNED to work without it — layered
   sheen gradients, inner top-edge highlight, edge lighting, shadow. Keep `backdrop-filter` as
   progressive enhancement only.
4. **`text-shadow` does not render on `background-clip:text` transparent text.** Use
   `filter: drop-shadow()` for glow on gradient type, and keep clipped ranges bright enough to read
   on charcoal.
5. **When gold type looks weak, the cause is the glow radius, not the color.** A wide `drop-shadow`
   haze around already-high-contrast type softens the letter edges. Hug it in (≈9–14px, slightly
   higher alpha) — tighter reads as *more* gold **and** crisper at once.
6. ⛔ **`background-clip:text` + `color:transparent` is BANNED in artifacts.** Caught on Neil's real
   phone 2026-07-29. The Android WebView mispaints clipped-gradient text — every clipped heading came
   out **inverted and far darker than either gradient stop**, while every SOLID-colour element on the
   same screen rendered perfectly. So the silver-gradient display above is a **DESKTOP-ONLY** look:
   in artifacts, display type is a solid near-white **`#F5F5F7` (17.3:1)** with the gold bloom as a
   plain `text-shadow` (unreliable on clipped text, rock-solid on solid text). **Don't patch the
   clip — remove it.**

## Measured contrast floors

Contrast-audited on the charcoal ground 2026-07-29. **Ratios are computed, not estimated** — these
supersede the earlier "~`#A1A1AA`" guidance.

| Use | Value | Ratio | Why not the obvious choice |
|---|---|---|---|
| Clipped-gradient dark stop | `#C4C4CB` | 10.8:1 | On a 3-line heading, line 3 lands here; `#A1A1AA` (7.3:1) visibly reads as fading out |
| Small mono captions / meta, 9–12px | `#9A9AA3` | 6.7:1 | `#71717A` is **3.89:1 — fails even AA** |
| Semantic warning / flag hue at that size | `#FF8563` | 7.9:1 | A mid red like `#E0563A` is only 4.98:1 |
| Gold accent | `#FFCC00` | 12.4:1 | Never the contrast problem — see rule 5 |

## Delivery gate

**Before handing Neil any Grifon artifact URL** (new, or redeployed with visual changes): spawn
`smoke-tester` to open the local HTML at a **390×844 viewport** and screenshot it. Eyeball for
continuous ground, visible glass, luminous display type. **No mobile screenshot = not done.**

⚠️ **Know what the gate CANNOT do.** It is a *viewport-size* check in headless Chromium — it emulates
the screen, not the engine. Chromium supports `background-clip:text`; the WebView mispaints it, so
the gate **passed a page Neil's phone rendered wrong** (2026-07-29). It catches layout, overflow,
missing assets and dark-ground breakage. It does **not** prove any CSS feature paints correctly on a
real device.

The defence is not more screenshots — it is **not depending on fragile features in the first place**
(rules 1–6). When a look genuinely needs a risky property, ship a solid-colour default, treat the
effect as pure enhancement, and let Neil's own eyeball on the live URL be the final gate.

## Sharing in Codex desktop

Deliver the verified local HTML with a clickable absolute file link and open it with the available Codex file/browser panel tool. Publishing is a separate, explicitly requested operation using an available hosting integration. Legacy Claude organization-sharing restrictions do not establish Codex sharing behavior.

## The standalone twin — standing rule

**Every artifact ships with a committed standalone twin** (Neil, 2026-07-29). A chat-only response is not a durable delivery path, so an artifact is **not delivered** until its self-contained
HTML also exists at **`artifacts/<slug>.html`**, committed, built by a script under `tools/artifacts/`
that regenerates it **from committed sources only** — never rely solely on a disposable `.tmp/` cache.

Because the page inlines every asset, that one file *is* the share mechanism: Neil sends it over
Viber/email/Drive and it opens offline in any browser — no sign-in, no link permissions.

### The twin needs an encoding, and nothing gives it one

The published page gets a `<head>` from the platform. **The twin gets nothing** — it is opened
straight off disk, so with no `<meta charset>` the browser guesses windows-1252 and every
non-ASCII character mojibakes: `·` → `Â·`, `—` → `â€"`, `₱` → `â‚±`.

This bug shipped **twice**, and the second time the fix already existed:

- **2026-07-30** — `gabriel-review`: every `·` in the Oceanides copy broke. Fixed *in that one
  builder* by emitting a full document for the twin and a fragment for publishing.
- **2026-08-06** — `grifon-session`: every literal em-dash broke. Same root cause, caught by the
  390×844 gate. An audit then found `gb-001-brief` — a **client-facing brief** — shipping 45 raw
  non-ASCII characters including every `₱`.

The fix existed and did not travel. So it lives in code now:
**[`tools/artifacts/_gates.mjs`](../../../tools/artifacts/_gates.mjs), which every builder imports.**

```js
import { finalize } from './_gates.mjs';
const html = finalize(rawHtml, {
  label: 'my-artifact',
  required: ['<title>', 'class="ground"'],   // truncation guard
  leftover: [/\{\{[A-Z_]+\}\}/g],            // unsubstituted tokens
});
```

`finalize()` entity-escapes every non-ASCII character, then asserts. Pure-ASCII bytes decode
identically under **every** encoding guess, so one single file is correct in both roles at once:
safe as a local file. Include a full HTML document and UTF-8 charset for the Codex/browser file preview.

Two things to know when you hit it:

- **Keep `<style>` ASCII yourself.** Entities are not decoded inside CSS, so the gate excludes the
  stylesheet and asserts it instead. Write `--` in CSS comments, not an em-dash. The error tells
  you which character.
- **Banned-pattern checks run on comment-stripped source**, so a template may name the banned
  property in a comment explaining *why* it is banned. A checker that punishes good comments
  teaches people to delete the comments.

**The twin is HTML — do not offer a PDF.** One was built and Neil rejected it on sight: *"di rin
katulad ng feel kapag totoong na-navigate mo ung artifacts."* Flattening a scrolling, hover-and-swipe
page into paged print throws away the thing that made it worth building. The page IS the deliverable.

Give him the local file path and, only when publishing was requested and succeeded, the verified hosted URL. Keep the source template beside its builder so a future session can regenerate the page.

## Constraints

- Strict CSP — self-contained pages, assets embedded as data URIs, **fonts inlined or system-stack**.
- Snapshot-only unless a real integration is implemented and verified. The historical artifact-capabilities skill is not installed here.
- **Never put secrets, keys, or tokens in an artifact.**
- **The standalone twin makes exposure a real decision, not a click.** A forwarded file spreads exactly
  as far as it is sent. Pause before putting unshipped strategy in one, and say so when the content
  warrants it.
