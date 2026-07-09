# One-Shot Format Showcase — recipe gallery, sample batch, and the deferred on-ramps

**Status:** Slice A SHIPPED 2026-07-09 (`d8384a1`, branch `feat/niche-coverage-cheap-fixes`).
Slice B (paid sample renders) NOT started — Neil fires it.

Origin: Neil's 2026-07-09 teardown of Higgsfield Marketing Studio
(`https://higgsfield.ai/marketing-studio/product`) against our One-Shot composer.

---

## Why this exists

Recon (Playwright + Firecrawl, 2026-07-09) established three things about Higgsfield:

1. Formats are merchandised as a **below-the-fold catalog of ~25 cards**, each carrying real sample
   video — some are literal user renders (`cdn.higgsfield.ai/user_*/…_thumbnail.webp`). The modal is
   only a curated shortcut into that catalog. Their CTA stays high; picking a card loads it back
   into the composer.
2. Their format names are **outcomes** ("This Gadget Saved Me", "Crush Test", "Mess to Fresh",
   "Unboxing ASMR"), not mechanisms. We had built the same catalog and hidden it behind a 4×2×5
   axis picker (Format × Strategy × Sub-format).
3. Their weakest surface is a **flat, search-less 25-card scroll**. They have no research step, so
   they structurally cannot rank formats per-user. **We can.** That is the leapfrog, not the copy.

Sole accent stays `#FFCC00`. Their lime `#D1FE17` is not ours.

---

## Slice A — SHIPPED

`components/OneShotAd/recipes.ts` (new) — 11 outcome-named recipes, each a **pure preset over the
existing axes**. `visibleRecipes(vertical)` *derives* from the authoritative Slice-4 clamps
(`ALLOWED_FORMATS`, `SUBFORMATS_BY_VERTICAL`, relocated here verbatim) rather than restating them,
so `real_estate` still forces Walkthrough and `app` still shows no picker — for free.

The format modal is **deleted**. Strategy, sub-format and the ASMR toggle became cards, so the
modal's sticky footer had nothing left to hold. A 9:16 `RecipeCard` grid renders below the CTA;
`Format ▾` is now a scroll-to-gallery summary chip. Net **−86 lines**.

`launchDerivation.ts`, `api/_lib/prompts.ts`, `services/` are untouched. The emitted
`ProductionInput` is byte-identical to the equivalent axis selection —
`tests/unit/recipes.test.ts` (9 assertions, parity table) is the proof, and it is the only thing
standing between this refactor and a silent prompt regression. Do not delete it.

`SAMPLES` ships **empty** → every card renders the `Sample soon` placeholder. Slice A and B are
fully decoupled by design.

### Known gaps carried
- **No live-DOM smoke.** `/app` is behind Supabase auth and there is **no dev bypass**
  (`grifon_dev_unlock` gates plan-tier only, *not* `isAuthenticated`). Verified visually via a
  static reproduction instead. Same OTP-wall gap logged in `ugc_pro_formats_plan.md`.
- **"Recommended" badge specced but not rendered** — no recommendation data source exists in
  Slice A. Not invented. See Deferred #2.
- **`RecipeCard` hover-play / touch Play-chip code paths have never executed** — they are dead
  until `SAMPLES` is populated. Slice B is their first real test.
- **"Recipe" is not yet in `UBIQUITOUS_LANGUAGE.md`.** It currently lives only in
  `components/OneShotAd/`. Propose it before it leaks into service or prompt code.

---

## Slice B — the sample render batch (paid; Neil fires)

**This IS the `gemini-eval` batch already owed from UGC Pro Slices 1–4** (deferred in
`ugc_pro_formats_plan.md`; restated as a standing call in `e822647`). One batch, two deliverables.
Do not run it twice.

1. Pick **one hero product whose assets cover every upload slot** — `hero`, `onbody`, `packaging`,
   `before`, `after`, `inuse` (see `components/guidedPhotoSlots.tsx`). Skincare or a wearable gadget
   covers all ten unlocked recipes; most products cover fewer, and a recipe with no footage gets no
   card.
2. Run all 10 unlocked recipes through the real pipeline (`?osaEngine=producer`), same brand/offer.
3. **Grade each with the `gemini-eval` skill.** This discharges the owed eval. A recipe that fails
   eval does not get a sample card — it gets a bug.
4. Cut the best 2–3s beat per winner: `public/samples/formats/<recipeId>.mp4` (h264, muted, ≤400KB)
   + `<recipeId>.webp` poster (≤40KB). ~4MB static total; `preload="none"` costs nothing until hover.
5. Populate the `SAMPLES` manifest in `recipes.ts`. Cards absent from it keep the placeholder.

**Until Slice B lands, the gallery is a wall of `Film` icons — worse than the modal it replaced.
Slice B is the feature; Slice A is the frame.** Do not ship this to users first.

**Cost gate:** ~10 full producer runs. The agent never fires these autonomously.

---

## Deferred — with resume triggers

### 1. Ad Reference / "Steal This Ad" — approved in direction, unplanned
Neil approved it as a **distinct third on-ramp** (2026-07-09):
One-Shot = "here's my offer" · Concierge = "I have a script" · Ad Reference = "copy that ad."
**It is not Concierge.** Concierge (`components/ExpertMode/`, Business-tier) is script-driven and
takes no reference video. Zero overlap.

We are closer than it looks: `api/gemini/omni-video.ts:274` already uploads video to the Gemini
Files API, and `tools/analyze_video.py` + the `viral-autopsy` skill already decode a viral ad
end-to-end — it has simply never been productized. Higgsfield's version is a black box; ours could
show the **decoded hook/beat structure** before generating, and write into the Swipe File.

**Blocked on a cost/risk read**, not on engineering: per-analysis token spend, Files API quota, and
the abuse surface of accepting arbitrary user-uploaded video.
**Resume trigger:** after Slice B lands.

### 2. Research-ranked recipes — the move Higgsfield cannot copy
Once a Market Research report is cached, sort the gallery by fit and badge the top two
"Recommended for your niche." The `RecipeCard` badge slot already exists.
Deliberately not faked with a static curated badge — that would be dishonest until the report
drives it.
**Resume trigger:** after Slice B (needs real cards to rank).

### 3. Library / Projects / Favorites — blocked on a real prerequisite
Higgsfield: Projects scope generations (folders); Favorites is an orthogonal star across them;
"All generations" is the unscoped superset.

We have **none of it**. No `generations`, `projects`, or `favorites` table in `supabase/*.sql` —
only a 12-item localStorage list of *module visits* (`recentWorkService.ts`), a 30-cap Storage video
listing inside `GenerateVideo`, and one resumable wizard draft.

The blocker is structural: **`DashboardSidebar` is rendered by `Dashboard` and unmounts the moment
you enter a module** (`App.tsx:1388`). There is no persistent rail to hang "All generations" on
until `App.tsx`'s shell is refactored. That refactor is the largest of the three items.
**Sequence this last.**
