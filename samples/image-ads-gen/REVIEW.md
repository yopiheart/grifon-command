> ⚠️ **SUPERSEDED 2026-06-20 by the v2 contrast redesign.** The `callout/`,
> `saas-upsell/`, and `product/` PNGs below are the OLD dark-on-dark muddy design
> Neil rejected. The rebuilt creatives (contrast-safe `utils/adTheme.ts` + Style
> Presets) are smoked in [`v2-redesign/contrast-matrix-full.png`](v2-redesign/contrast-matrix-full.png)
> — bold solid brand blocks, legible both ways. See
> `workflows/image_ads_design_system.md`. The old PNGs can be deleted once Neil
> has eyeballed the v2 matrix.

# Image Ads Gen — Sample Gallery (for Neil's review)

Generated 2026-06-20 while you were at dinner. Same test brand across all families
for comparison: **Kapeng Barako Co.** (Filipino coffee lovers 25–40, 4:5, brand
color = coffee brown). All creatives are **real outputs** from the live module.

## What's here

| Folder | Family | Files |
| --- | --- | --- |
| `callout/` | **Niche Callout** (GP-2) | 1 variant × Placement Pack (feed 4:5 / square 1:1 / story 9:16) + UI shot |
| `saas-upsell/` | **SaaS-Upsell** (GP-1) | 3 templates (Guarantee Hero / Ticket Compare / Offer Stack), each × Placement Pack + UI shot |
| `product/` | **Product** (legacy) | 1 variant (Gemini-generated Filipino lifestyle) + UI shot |
| `_slice1-smoke/` | first smoke run | the 4 verification screenshots |

Open the `feed_4x5.png` in each variant folder — that's the real ad. The 3 ratios
per pack are the **multi-ratio Placement Pack** (your aspect-ratio insight, shipped).

## One-line look per style

- **Niche Callout** — dark canvas, "If you run a *[niche]*, we built *[offer]* for you." Self-ID pattern-interrupt. Text-composited (no image model, free + instant).
- **SaaS-Upsell** — premium dark+gold offer mechanics: Guarantee Hero (refund promise), **Ticket Compare** (Instant-vs-Barako two-tier anchor — the strongest of the three), Offer Stack Checklist (✓ benefits + CTA).
- **Product** — the only model-generated family: photoreal Filipino man + Barako cup, "Benefit Anatomy" callouts. This is the **legacy weak formula** you flagged.

## Visual QA — findings worth your eyes

1. **Accent contrast on dark brand colors (top refinement).** The cards accent with the *customer's* brand color. Kapeng Barako's brown is dark, so on the near-black canvas the niche/eyebrow text **loses contrast** (see `callout/.../feed_4x5.png` — the brown niche line is hard to read; the white parts are crisp). Fix: enforce a **minimum-luminance accent** (lighten the brand color, or fall back toward gold when the brand color is too dark on dark). Easy follow-up.
2. **Product family text-in-image (confirms your audit call).** The Gemini product image baked in label text despite `NO_TEXT_CONSTRAINT` — exactly the legacy inconsistency. Reinforces the **GP-3 product-formula redesign**.
3. **`product/.../ad_visual.png` is actually a JPEG** (misnamed extension) — pre-existing export bug in the product path; fold into the GP-3 audit.
4. **Minor:** the "Offer Stack Checklist" folder name has a stray space (`replace(' ', '_')` only swaps the first space). Cosmetic.

## Your 6 questions — recap of answers

1. **Model:** already Nano-Banana-class (`gemini-3.1-flash-image-preview`, same as Director AI); callout/saas use **no model at all** (client composite). GPT-Image-2.0 tier-gating = clean future add.
2. **Quality:** keep **1K default / 2K optional**; **skip 4K** for social (it downscales/recompresses). Tier later.
3. **Brand kit upload:** yes, optional — we already use logo + brand colors; extend to a light brand kit. (And see finding #1 — brand color already drives the accent.)
4. **Filipino character:** the Product family **generates** Filipino characters from the `ethnicity` field (demonstrated here) — uploading is the *optional* path for a real face/product. So: **allow both** (generate by default, upload optional).
5. **How many:** **3** (callout + saas already do 3; bump Product to 3 in the GP-3 audit).
6. **AUTO mode:** great — add as a 4th selector that picks the family for them. Built the explicit selector now; AUTO is a clean next slice.

## ⚠️ Needs your approval before merge

The **SaaS-Upsell TUNED prompt** (`saas-offer` branch in `generateAdCreatives`) was
authored autonomously and is **on the branch only — not greenlit to main**. Per the
TUNED rule, review the prompt diff in commit `1e96149` before the PR merges. The
callout prompt (commit `1755d7b`) you already approved.

## Status

- ✅ Committed: GP-2 Niche Callout (`1755d7b`), GP-1 SaaS-Upsell (`1e96149`), this gallery + Vite fix.
- ✅ Build PASS · **274 tests pass** · smoke PASS (both families end-to-end).
- 🔭 Next slices (your pick): Market Research → Uplink auto-prefill · GP-3 product-formula redesign · AUTO mode · accent-contrast guard · brand kit · GP-4 premium lifestyle.

**Non-blocking:** the `image_ads` module has no `MODULE_TIER` entry in `Dashboard.tsx`,
so it's dev-gated (invisible to normal Pro accounts). One line if it should be user-facing.
