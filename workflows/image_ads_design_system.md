# Image Ads Gen — Creative Design System (v2 redesign brief)

**Why (2026-06-20):** the first text-composited templates (GP-2 callout, GP-1
saas) wrongly shipped *Grifon's dark app theme* (`zinc-950` + faint brand tint)
onto the **customer's** ad → muddy, dark-on-dark, low-contrast, nothing like the
bright/bold references (Iman gold-on-black, Grüns color blocks, IM8 crimson).
Neil rejected it. **The ad matches the CUSTOMER's brand and must be BOLD +
LEGIBLE — not Grifon's UI aesthetic.** See `workflows/static_ad_swipe_file.md`.

## Hard rules
1. **Contrast is non-negotiable.** Pick text color (near-white or near-black) by
   background luminance (target ≥ 4.5:1). NEVER brand-color body text on a dark
   bg. Add a `pickTextColor(bg)` / contrast util.
2. **Bold, not muddy.** Background = a SOLID saturated brand block, OR clean
   light, OR true-dark-with-STRONG-accent — never a 10% tint on near-black.
3. **It's the customer's brand, not Grifon's.** Do not impose zinc-950/gold by
   default. Grifon gold is only the *last-resort* accent fallback.

## Background/color resolution (fallback chain)
1. **Brand Kit uploaded** (logo + colors [+ font/vibe]) → use it.
2. **Else brand color provided** (`hexCodes`) → bold block of it; text color from
   luminance; if the color is too dark/light for its role, shift it (never render
   invisible).
3. **Else** → clean default: **white bg + near-black text + one accent**
   (Sabri-clean), or brand-primary block + white text. Both must pass contrast.

## Brand Kit input (optional, per Neil — the agreed answer)
- Optional: logo, 1–2 brand colors, font choice, vibe (Bold / Premium / Playful /
  Clean). Auto-extract palette from the logo when possible.
- Skipped → fallback chain above. Never blocks the fast "fill 4 fields → go" path.

## Current bugs to fix in the rebuild
- **Guarantee Hero rendered only the brand name** → the `saas-offer` prompt must
  REQUIRE a visible `headline` for every template (it returned empty). 
- **CTA pill off-center** → `inline-flex` + `justifyContent:center` + `textAlign:center`.
- **Product (legacy) baked `#FFCC00` text into the image** → stop injecting raw
  `#hex` into `generateAdCreatives` product `imagePrompt`; describe color in words,
  rely on `NO_TEXT_CONSTRAINT`. (Part of the GP-3 product-formula redesign.)
- **Eyebrow/brand name was a faint ghost** → must be legible (contrast).

## Visual targets per family (match the swipe-file refs, NOT the dark app theme)
- **Niche Callout** → bold flat brand block or clean light; huge legible headline;
  niche/qualifier emphasized by CONTRAST + weight, not color alone.
- **SaaS-Upsell** → premium but BRIGHT enough (IM8 lane = dark + STRONG accent +
  bright white, high contrast). Ticket Compare needs obvious free-vs-paid contrast.
- **Product (GP-3)** → redesign the legacy formula; no baked hex text; bold/bright.

## Rebuild checklist (post-/clear)
1. `utils/adTheme.ts` — resolve {bg, text, accent} from brand kit / brand color /
   default, with luminance-based contrast. Single source of truth for all cards.
2. Rewrite `NicheCalloutCard` + `SaasOfferCard` to consume `adTheme` (kill the
   `radial-gradient … #09090B` muddy bg). Require headline; fix CTA centering.
3. `saas-offer` + `callout` prompts: require `headline` on every variant.
4. (GP-3) product `imagePrompt`: remove raw hex injection.
5. Optional Brand Kit upload UI in `IntelligenceUplink` (logo + colors + vibe).
6. Re-smoke all families with a DARK brand (Barako brown) AND a bright brand to
   prove contrast holds both ways. Replace `samples/image-ads-gen/`.

## Resume context
This file + `workflows/static_ad_swipe_file.md` + `samples/image-ads-gen/REVIEW.md`
are enough to resume after `/clear`. Branch: `feat/ad-strategist-skill-and-swipe-files`.
