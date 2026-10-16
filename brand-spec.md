# Grifon AI — Brand Spec (Asset Manifest)

This file is the **frozen asset inventory**. [DESIGN.md](DESIGN.md) is the system spec (tokens, components, rules); this file is what we build *from* — the real logos, product screenshots, and capture metadata. Components reference assets by path here; nothing on a marketing surface should be a CSS-drawn fake of UI we already shipped.

> **Discipline:** when a real product surface exists, the marketing site shows the real surface. CSS-mocked UI is a placeholder, not a final state. See [agent_lessons.md](agent_lessons.md) for the cost of "trust me, it's cool" landing pages.

---

## Logo

| Asset | Path | Notes |
|---|---|---|
| Primary logo (gold-on-dark) | [public/logo.png](public/logo.png) | Used in landing/pricing sticky header, OG share. |
| OG share card | [public/og-card.png](public/og-card.png) | Social preview. |

**Anti-patterns:** never redraw the logo inline as SVG; never recolor; never apply gradients or filters to it.

**Website wordmark (Neil approved, 2026-10-16):** public-site header/auth/legal/
checkout text beside the existing mark uses self-hosted Oxanium with a restrained
oblique metallic-gold highlight. The logo image remains unchanged. Font source:
`assets/fonts/oxanium/` with its SIL OFL. This website-only exception does not
alter the ad-creative lockup below. Companion Chat navigation uses the logo alone.

**Ad-creative lockup (canonical, per Neil 2026-07-13):** ONE lockup on every ad creative — the **GrifonMark** ([components/ui/GrifonMark.tsx](components/ui/GrifonMark.tsx)): CSS-drawn transparent circle with a thin `#FFCC00` hairline ring (no glow, no fill), [public/logo.png](public/logo.png) griffin at ~74% height inside + **GRIFON** in Inter Black *italic* (`font-black italic tracking-tight`), exactly matching the site header. Do NOT use [public/logo-badge.png](public/logo-badge.png) in creatives — it is a square raster with a baked black background that shows around the ring. This lockup applies to BOTH the Grifon AI page and the Zam Grifon personal page — no "Zam Grifon" or "GRIFON AI" text lockups inside creatives (the FB page chrome already names the page; identical mark everywhere compounds S13 recall). Reference implementations: `assets/ad-samples/ready/*.html`.

---

## Product screenshots

Captured surfaces — one row per asset. **Status legend:** ⏸ planned / ✅ captured / ⚠ needs recapture.

| Surface | Status | Path | Capture date | Resolution | Source route | Notes |
|---|---|---|---|---|---|---|
| Director AI — Step 1 (filled form, success state) | ⏸ planned | `public/marketing/director-step1.png` | — | ≥2400px wide | `/app` step 1 | Already exists as session-o-step1-marketmind-form-filled.png in repo root — promote on capture. |
| MarketMind — completed analysis | ⏸ planned | `public/marketing/marketmind-result.png` | — | ≥2400px wide | `/app` → MarketResearch module | session-o-step1-marketmind-success.png exists locally. |
| Avatar — generated portrait | ⏸ planned | `public/marketing/avatar-generated.png` | — | ≥2400px wide | `/app` → Avatar step | session-o-step4-avatar-generated.png exists locally. |
| Storyboard — 7-scene grid | ⏸ planned | `public/marketing/storyboard-7scenes.png` | — | ≥2400px wide | `/app` → Storyboard | session-o-step5-storyboard-7scenes.png exists locally. |
| Thumbnail — generated | ⏸ planned | `public/marketing/thumb-generated.png` | — | ≥2400px wide | `/app` → Thumbnail step | session-o-step6-thumb-generated.png exists locally. |
| Dashboard hero | ⏸ planned | `public/marketing/dashboard-hero.png` | — | ≥2400px wide | `/app` after wizard | Used in landing UI showcase. |
| InfluencerForge — main panel | ⏸ planned | `public/marketing/influencer-forge.png` | — | ≥2400px wide | `/app` → InfluencerForge | |
| CinematicSpecStudio — output | ⏸ planned | `public/marketing/cinematic-spec.png` | — | ≥2400px wide | `/app` → CinematicSpecStudio | |

**Quality rubric per asset (Huashu 5-10-2-8):** every captured image must score ≥8/10 on (a) resolution & sharpness, (b) brand-fit (gold accents visible, no debug text, no test data leakage), (c) representativeness (shows the actual feature value), (d) lighting/visual cleanliness. Re-capture rather than ship a 6/10.

---

## Color palette (canonical)

Reference only — see [DESIGN.md](DESIGN.md) for the full tokens block. Reproduced here as the brand-side view:

- **Grifon Gold** `#FFCC00` — the *only* interactive accent. Used on CTAs, focus rings, active states, hero progress. Never decorative.
- **OLED Canvas** `#09090B` (zinc-950) — page background. Pure `#000000` is forbidden — it reads flat and kills glass effects.
- **Elevated Surface** `#18181B` (zinc-900) — glass panel base, paired with `backdrop-blur-xl` at 80% opacity.
- **Text ladder** — `#FFFFFF` (active) → `#D4D4D8` (body) → `#A1A1AA` (passive) → `#71717A` (meta/sub-label).
- **Borders** — `white/10` alpha only. Never colored borders.

**Forbidden colors:** purple, cyan, pink, green, blue (as accents). Any non-gold accent is a brand violation.

---

## Typefaces (canonical)

- **Display & body:** Inter / Geist / SF Pro (fallback stack). Weights 400 / 600 / 700 only — **no 500**.
- **Mono / sub-labels:** JetBrains Mono, uppercase, wide-tracked. Reserved for control-panel sub-labels and technical data.

---

## Tone keywords

Premium · Cinematic · Filipino-SMB · Direct-response · Action-energetic · Production-grade · Confident · Earned

These are the words copy and visuals are graded against — see also `.claude/skills/grifon-cmo/` for the marketing voice and `.claude/skills/grifon-creative-director/` for the visual register.

---

## Capture log

When a screenshot is taken, append a row: `YYYY-MM-DD — surface — path — captured by`. Empty until Phase B begins.
