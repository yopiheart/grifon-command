# Oceanides Daily Posts — Automated 30-Image Batch

**Status:** LIVE since 2026-07-15 (routine `oceanides-daily-posts`, trig_01GtbZRGJMmfwmTmrY7vqB98)
**Owner:** Neil (merge gate) · agent (copy variants, QA) · cloud routine (render + PR)

## What it is (FULL AUTO — no review, Neil approved 2026-07-14)

Every day at **6:00 AM Asia/Manila** a **GitHub Action**
([.github/workflows/oceanides-daily.yml](../.github/workflows/oceanides-daily.yml)) renders
**30 Facebook post images** (15 city branch pages × 2 posts) + captions and publishes them
**straight to the public mirror** — no PR, no merge. Neil does nothing.

- **Poster/VA link:** https://yopiheart.github.io/oceanides-posts/ (pick the date → per-branch,
  download button + copyable caption per post; no account needed).
- **Why no review gate:** content is deterministic — pre-approved templates + fixed variant
  pools rotating by date, nothing net-new generated per day — and the render self-verifies
  (30 PNGs, 2160×2700, >100 KB, zero residual tokens, 30 captions), failing the job rather than
  publishing garbage.
- **Source vs output split:** this private repo holds the source of truth (templates, script,
  `tb2-variants.json`, assets). Only rendered **images + captions** reach the public mirror
  ([publish-public.mjs](../clients/oceanides/publish-public.mjs) copies images/captions ONLY).
- **Auth:** the Action pushes to the mirror with the `MIRROR_TOKEN` repo secret (fine-grained
  PAT, Contents:write on `oceanides-posts` only). GitHub masks it in logs.
- **Manual controls:** re-run any date via the Action's **Run workflow** button (`date` input),
  or locally `node build-tb2-cities.mjs --date <d> && node publish-public.mjs --date <d>`.
  Kill switch: disable the workflow in the repo's Actions tab.

**Superseded:** the old cloud routine (`oceanides-daily-posts`, opened PRs for review) is
disabled at https://claude.ai/code/routines — the Action replaces it. New days no longer commit
images into this private repo (the mirror is the archive); `daily-2026-07-14/-15` remain as
historical committed batches.

## The anti-spam rotation (Andromeda-aligned creative diversification)

Driven by `clients/oceanides/build-tb2-cities.mjs` + `tb2-variants.json`, deterministic by date
(anchored to 2026-07-14 = day 20648):

- **10 styles** in 5 pairs: (news-graphic + niche-callout), (format-enemy + premium),
  (minimal + UGC), (checklist + crew), (kylie-quote + senyales). First of the pair = **1-MORNING**
  post, second = **2-AFTERNOON**.
- **Pair rotation:** city *i* gets pair `(i + (d−anchor) % 5) % 5` — adjacent days always differ per page
- **Copy rotation:** 3 variants per style, `variant = floor((d−anchor)/5) % 3`
- **Plate rotation** (`_plates` in the JSON): news-graphic cycles 3 hero photos (tank/banyo/manhole),
  premium cycles 3 truck shots (studio / barangay-street / night-service-in-action)
- **Kylie-quote crew roster** (S29): variant = crew member — v0 Rodel (Siphoning Expert),
  v1 Junel (Manual Cleaning), v2 Kambal (Driver/Response). Quotes are work-standard statements
  in the employee's voice (with the client's consent), never customer testimonials.
- **Net effect: an exact creative repeats on a given page only every 15 days**
- All city names/labels localized per branch; contact numbers + logo + CALL NOW + libreng inspection baked into every image (theft-proofing)

**Output structure (posting-VA-ready):** `out/daily-<date>/OCEANIDES-<CITY>-BRANCH/1-MORNING--<style>.png`
+ `2-AFTERNOON--<style>.png` — share the branch folder; the filename says what to post and when.
**Captions:** every PNG has a matching `.txt` beside it — variant hook/body + standard footer
(authority ✅ block, CALL NOW + numbers, SEO hashtags incl. #Malabanan + city tag). VA copies
the whole file as the FB caption. Caption hooks live in `tb2-variants.json` (`CAPTION` key);
the footer + hashtags are in `captionFooter()` in the build script.

**Believability notes (2026-07-14):** crew photos are mixed-quality/upscaled → the crew style
neutralizes it with a uniform B&W grade + navy tint + film grain (never use them as glossy
full-bleed portraits). UGC before/after: `_photoSets` pairs photos BY VARIANT — v0 = the real
job photos (only variant allowed to say "actual na trabaho"); v1/v2 = AI-recreated pairs
(after = codex `--edit` of the before, so it's visibly the same tank) whose copy is educational
framing only. Never reshuffle photo↔copy pairing.

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

## Assets (ALL must be committed — the cloud routine clones the repo)

- AI plates (gpt-image-2 via codex-image, reused daily): `tb2-hero-tank/banyo/manhole.png`
  (news-graphic), `tb2-truck-street/action.png` (premium; edits of the real van photo),
  `tb2-doodle-bottle.png` (format-enemy; canvas gold must match plate bg `#FAB811`)
- AI before/after pairs (ugc v1/v2, educational copy only): `tb2-ba2-before/after.png`,
  `tb2-ba3-before/after.png`
- Real photos: `before-1.jpg` + `after-1.jpg` (ugc v0 — "actual" claims allowed),
  `van-clean.png`, `CREW 1.png`/`CREW 2.png`/`CREW 3.png` (crew style, B&W-graded)
- Logo: `assets/logo.jpg` · badges: `badge-bir.png`

## Deliverable access (decision log 2026-07-14, Neil approved public mirror)

- **Poster/VA link (no account needed):** https://yopiheart.github.io/oceanides-posts/
  — public GitHub Pages mirror (repo `yopiheart/oceanides-posts`, images + captions ONLY,
  never code/research/templates). Per-day page: branch sections, download button per image,
  copyable caption box. Publish command (run after the day's batch lands on main):
  `node clients/oceanides/publish-public.mjs --date YYYY-MM-DD`
- **Review gate stays private:** routine PR sa grifon-command (Neil merges sa phone).
- **Automation gap (follow-up):** the cloud routine's credentials only reach grifon-command,
  so the public publish is a one-command manual step (or run in any agent session) after
  merge. Full auto = GitHub Action on grifon-command (push to main touching out/daily-*)
  mirroring via a PAT secret (`MIRROR_TOKEN`, repo scope sa oceanides-posts) — needs Neil
  to mint the PAT; guide him when requested.
- Google Drive connector: read-only — no agent upload path; Drive stays manual-only (ZIPs).

## Resume triggers

- Neil picks style winners from engagement/calls → prune weak styles, expand variant
  pools of winners (each style ships exactly 5×/day — clean A/B signal per day).
- Crew sends per-area job photos → localized UGC variants.
- New city/page launches → add row to CITIES in build-tb2-cities.mjs (posts scale +2/day per city).
- Log the chatgptricks news-graphic format as a swipe-file entry via /static-autopsy.
