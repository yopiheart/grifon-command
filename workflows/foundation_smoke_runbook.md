# Foundation Smoke Runbook — step 1 of `this_week_plan.md`

**Goal:** one one-pass render that re-confirms the render foundation before the new
ad styles get built on it. Verifies in a SINGLE render: render-quality eyeball + R2
media-URL check + music-under-VO + (regression noted below). Neil at the wheel
(Google OAuth has no headless login bypass); driving delegated to the `smoke-tester`
subagent (foreground); pre-flight per `.claude/skills/director-smoke`.

> Staged 2026-06-16. Music merged to main dormant (`4d57cfa`); this is the first
> render on the reconciled R2 + music base.

## Environment — ALREADY SET (this session)
- `npm run dev` running on http://localhost:5173 (background task `bblbd11g6`).
- `.env`: `GRIFON_DEV_UNMETERED_VIDEO=true` (unmeter — skips 402 quota + 429 rate-limit,
  LOCAL ONLY), `MEDIA_STORE=r2` (renders write to / serve from R2), `GRIFON_MUSIC_GEN_ENABLED`
  **OFF** (Neil's call — smoke the **static** bed; the generated-bed ear test stays separate).
- If the cafe-PC rebooted since staging: restore `.env` keys, re-run
  `.\scripts\enable-dev-unmetered-video.ps1`, restart `npm run dev`, re-source the hero.

## Hero (Neil's pick — Snapple, candidate 1)
- **File:** `.tmp/hero_smoke/snapple-mango-hero.jpg` (handheld, readable label — verified).
- **Brand (read off label):** Snapple
- **Product:** Mango Madness — flavored juice drink, 473 mL (16 fl oz) bottle
- **Description:** Snapple Mango Madness — an all-natural ready-to-drink flavored juice drink, a
  sweet tropical blend of mango and kiwi from concentrate, 190 cal per bottle. Sold in a 473 mL bottle.
- **Price:** ₱95 (plausible PH retail for an imported Snapple bottle)
- **Source:** Unsplash (free commercial use), handheld convenience-store shot.

## Sequence (director-smoke — do NOT improvise)
1. **Hero FIRST.** Use the staged photo above; brand is DERIVED from its label ("The Ordinary").
2. **Market Research (MarketMind)** with brand + product + description + ₱650. Confirm the
   report surfaced (headlines/hooks/ads arrays present).
3. **Send to Director AI.** VERIFY Step 1 + Step 2 **auto-prefilled** (brand, offer, product,
   audience, dream result, 3 AM worry, differentiator, features) — **no empties, no
   `[object Object]`**. NEVER hand-type these. Broken prefill = STOP, it's a bug.
4. **Upload the handheld hero at Step 2** → AI Analysis → confirm it reads The Ordinary HA serum.
5. **Confirm the script-angle picker appears at Step 3** (proves Market Research context flowed).
6. **Step 5 "VISUAL ASSETS MISSING" yellow banner = HARD STOP**, not a warning to click past.
7. RENDER ALL → Signal Modulator → AI Editor → FINAL_RENDER (one full ad).

## What to verify in the single render
**Render-quality eyeball (code shipped 2026-06-13, never eyeballed live):**
- [ ] **Ghost-tail killed** — scenes 5/6 have NO ghost/dissolve frame overlapping speech (END-CLEAN).
- [ ] **End-card overlays** — `₱` glyph renders in EVERY preset font (no tofu/box); gold offer-recap
      legible; price-anchor "ding" timing lands with the callout.
- [ ] **Female Filipino voice default** — the Scene Pipeline/avatar defaults to a female Filipino
      voice (skincare → female audience; confirm the default, don't hand-pick).

**R2 cutover (FREE RIDER — this render exercises it):**
- [ ] Rendered media URL is the **R2 domain** (`*.r2.cloudflarestorage.com`), **NOT `*.supabase.co`**,
      and the clip plays + shows in the Rendered Rail. → confirms R2 live end-to-end locally.

**Music-under-VO (static bed):**
- [ ] The static bed sits UNDER the VO — **invisible > impressive**: no clashing, no vocal/singing
      intro, doesn't fight the voice. (Generated-bed A/B is Neil's separate step-2 ear test.)

## Regression — HARNESS STALE, not a product regression (flagged 2026-06-16)
`tests/regression/script-gen.regression.test.ts` currently FAILS (8/8) with a `@google/genai`
`formatMap` null crash. Root cause: `generateAdScript` was migrated to the server-side flow
registry (posts `{flow:'adscript', input}` to `/api/gemini/text`; the server builds
model/contents/config), but the test's fetch stub still re-implements the OLD direct-SDK path
and reads `body.model`/`body.contents` (now undefined) → forwards `model: undefined` to the SDK.
**This is test drift from the 2026-05-09 crown-jewel refactor — independent of the music merge,
and NOT evidence of a script-gen regression.** Script quality is judged by the live render here
(via `gemini-eval` / `grifon-cmo`). **Follow-up (separate, ~1 task):** update the harness stub to
hit the real flow handler or replicate the flow-registry prompt build. Test-file only (not a
tuned prompt) → fair game to fix without an approval gate.
