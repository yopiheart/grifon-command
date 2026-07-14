# Oceanides Daily Posts — Automated 30-Image Batch

**Status:** LIVE since 2026-07-15 (routine `oceanides-daily-posts`, trig_01GtbZRGJMmfwmTmrY7vqB98)
**Owner:** Neil (merge gate) · agent (copy variants, QA) · cloud routine (render + PR)

## What it is

Every day at **6:00 AM Asia/Manila** a cloud routine renders **30 Facebook post images**
(15 city branch pages × 2 posts) for Oceanides and opens a **PR** titled
`Oceanides daily posts <date> (30 images)`. Neil reviews the images in the PR's
**Files changed** tab (GitHub mobile renders them) and merges. Merged images live at
`clients/oceanides/out/daily-<date>/` + a per-day review board `gallery-daily-<date>.html`.

Manage/disable the routine: https://claude.ai/code/routines (it runs in Anthropic's
cloud — survives the cafe-PC defreezer, no local re-arm needed).

## The anti-spam rotation (Andromeda-aligned creative diversification)

Driven by `clients/oceanides/build-tb2-cities.mjs` + `tb2-variants.json`, deterministic by date:

- **6 styles** in 3 pairs: (news-graphic + niche-callout), (format-enemy + premium), (minimal + UGC)
- **Pair rotation:** city *i* gets pair `(i + dayNumber % 3) % 3` — each page cycles all 6 styles across 3 days; neighboring cities look different on the same day
- **Copy rotation:** 3 headline variants per style, `variant = floor(dayNumber/3) % 3`
- **Net effect: an exact creative repeats on a given page only every 9 days**
- All city names/labels localized per branch; contact numbers + logo + CALL NOW + libreng inspection baked into every image (theft-proofing)

## Volume rules (max per day)

Pipeline capacity is not the limit (~5s/image, 100+ easy). **FB page health is the limit:
1–2 organic posts per page per day; 3+ risks spam classification.** 15 pages × 2 = 30/day
is the sweet spot. Scale by adding **cities/pages** (edit the CITIES table in
`build-tb2-cities.mjs`), not by adding posts per page.

Cities (15): QC, Manila, Caloocan, Makati, Pasig, Taguig, Parañaque, Valenzuela ·
Antipolo, Bacoor, Dasmariñas, Calamba · Malolos, San Jose del Monte, Angeles.

## Manual run / fallback (kung nag-fail ang routine)

```bash
cd clients/oceanides
node build-tb2-cities.mjs                 # today (Asia/Manila)
node build-tb2-cities.mjs --date 2026-07-16   # specific date
```
Script self-verifies (30 PNGs, 2160×2700, >100 KB, zero residual {{tokens}}); commit
`out/daily-<date>/` + `gallery-daily-<date>.html`. The routine no-ops if today's folder
already exists on main or the `content/daily-<date>` branch exists — safe overlap.

Cafe-PC prereq after defreezer wipe: `npx playwright install chromium`.

## Copy rules (TUNED-adjacent — treat with care)

- `tb2-variants.json` is the ONLY place copy lives; templates hold layout + tokens only.
- Every new variant passes the **native-ear Taglish check** (linkers -ng/na, verb aspect,
  contractions — agent_lessons.md 2026-07-14). Modern Taglish ~50/50, never deep Tagalog.
- Never "Malabanan" in image copy (grifon-cmo hard rule).
- **Trust line:** UGC-style variants stay city-neutral — the before/after photos are from
  ONE real job site; per-city location claims would be fabricated proof. New real crew
  photos per area unlock localized UGC claims.
- Line lengths are fitted to fixed font sizes — keep new variants within the max chars
  of the variant they replace (see _readme in the JSON).

## Assets

- AI plates (gpt-image-2 via codex-image, reused daily): `assets/tb2-hero-tank.png`,
  `assets/tb2-doodle-bottle.png` (canvas gold must match plate bg `#FAB811`)
- Real photos: `assets/before-1.jpg`, `after-1.jpg`, `van-clean.png`
- Logo: `assets/logo.jpg` · badges: `badge-bir.png`

## Deliverable access (decision log 2026-07-14)

- **Current:** GitHub PR (mobile image previews) + merged archive in-repo.
- Google Drive connector: not yet authorized on claude.ai; likely read-only even when
  authorized — no agent upload path today.
- Optional upgrade (Neil's call, not done): separate PUBLIC repo + GitHub Pages hosted
  gallery for the posting team (exposes client content publicly).

## Resume triggers

- Neil picks style winners from engagement/calls → prune weak styles, expand variant
  pools of winners (each style ships exactly 5×/day — clean A/B signal per day).
- Crew sends per-area job photos → localized UGC variants.
- New city/page launches → add row to CITIES in build-tb2-cities.mjs (posts scale +2/day per city).
- Log the chatgptricks news-graphic format as a swipe-file entry via /static-autopsy.
