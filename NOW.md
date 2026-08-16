# NOW — the resume doc
**Stamped: 2026-08-16** (session 26)

## ▶ NEXT ACTION — re-run `before_after` on prod, watched

Everything below shipped today. Nothing has been run against it yet.

```
https://grifon.ai/app?osaEngine=producer
```
Recipe `before_after` · Hiraya Glow · Presenter **SET** = `after.png` (not Auto) ·
slots `hero`/`before`/`after` from `tests/fixtures/sample-batch/`. Full input table +
pre-flight: [`sample_run_before_after_2026-08-16.md`](workflows/sample_run_before_after_2026-08-16.md).

🔴 **THE GATE — "is it the SAME woman in ALL FOUR scenes?"** Not just scene 1. Two runs
today each rendered a stranger, run 1 in S1 and run 2 in S3, because **two** beats permitted
`referenceImage="none"`. A one-scene gate was given on run 1 and it let run 2 through.

**Also watch, both first-time-live:**
1. Do the before/after frames actually resemble the uploaded photos? `avatar_state` has
   never run outside tests.
2. Is `"agad"` (or any instant-result claim) back in the script? That would be
   **corroboration #7** of a BANNED speed claim whose grill-me route triggered at #3 and
   has never been run. Our honest claim is 2 weeks.

## 🚀 MERGED + DEPLOYED 2026-08-16 — `77426d1` (merge, `--no-ff`)
**⏪ ONE-COMMAND ROLLBACK: `git revert -m 1 77426d1`.** Build passed, tsc clean, **1,219
tests passed**, bundle-leak 0 markers, verified on the merged tree before the push.

1. **Identity lock (TUNED, Neil-approved).** `referenceImage="none"` is now FORBIDDEN on the
   S1 and S3 beats of TRANSFORMATION for PERSON subjects; it survives only for surfaces,
   fabric, objects and spaces. Plus an IDENTITY RULE line: one ad, one face. This was filed
   as a gated proposal on **2026-07-11** (`sample_batch_test_spec.md` finding #7) and sat
   unactioned for five weeks. Guarded by a regression test.
2. **`venueSlot` finally reaches the scene image.** It had **zero** references in `services/`,
   so every uploaded before/after photo was discarded and the model invented the skin state —
   while the upload modal promised the opposite. Porting the wizard's router would NOT have
   fixed it: `sceneRender.ts` gates on `isRealEstate` or `!isAvatarScene`, and a person
   transformation is neither. New **`avatar_state`** render mode (TUNED, approved): face from
   the avatar, skin state from the upload, plus a FRAMING PARITY rule that makes the
   skeleton's "framed IDENTICALLY to S1" real instead of prose. Wired on **both** surfaces.
3. **3.7-flash on the customer-facing text lane.** ⚠️ **Corrected model map** — script,
   storyboard and Market Research do NOT use the `geminiService.ts` constants; they run
   server-side off `MODEL_TEXT` in `api/_lib/prompts.ts`, a second table. `MODEL_TEXT`
   flash-lite → `gemini-3.7-flash`; the `storyboard` flow moved off `MODEL_FAST` onto it;
   `MODEL_FAST` stays flash-lite (three enum classifiers); `premiseCheckModel` 3.5 → 3.7.
   **`researchTextModel` deliberately untouched** — it feeds the EDL, so the pending watched
   run stays a clean single-variable experiment. `sceneImageModel` untouched per Neil.
   ⚠️ 3x input rate, unmeasured in absolute terms — read it off `run_cogs` on the next run.
   ⚠️ **2027-01-01** the intro window closes and 3.7 doubles to $1.50/$7.50.
4. **Fixtures rebuilt.** Neil rejected the old `after.png` as slop. New pair generated on the
   raw-ugc scaffold + the `marvin-avatar` master-daylight rule (codex-image, ₱0 Gemini spend).
   Mirror selfie was tried and rejected: the phone covers half the face, and `after.png` is
   also the presenter. Findings in
   [`ugc-photoreal-prompt-pack.md`](workflows/believability-samples/ugc-photoreal-prompt-pack.md),
   the most reusable being that **`--edit` preserves identity where reference-generation
   drifts** — state-change pairs should always be edited off the approved frame.

## 🚀 SECOND MERGE, same session — `e4d2864` (`git revert -m 1 e4d2864`)
The first storyboard to PASS the identity gate exposed the next defect: S3 and S4 both showed
teeth while the reference photo does not. **Our instruction, not model randomness** —
`APPEARANCE_LOCK_RULE` listed Expression as REQUIRED and its three canonical examples were
"brow furrowed" / "eyes wide in surprise" / "lips parted in confusion". Capped at BOTH layers
(storyboard writes the text everything downstream reads; the video-prompt brain had no ceiling
at all), with a TEETH RULE and an explicit override of CINEMATIC VARIETY — that was the
loophole, "make each scene different" was being satisfied by escalating emotion. The video rule
sits ABOVE the type branches on purpose: the scene that broke classifies as **b-roll**, so an
OPTION-B-only rule would have missed it. `fastTextModel` → 3.7 (one call site, the video brain).

## ⚠ OPEN — owed, not blocking the run
- **Premise-check parse bug is LIVE.** `cleanJson` discards a valid grounded answer ~1 in 6,
  on every model. The 3.7 flip was neutral on this, not a fix. Parser hardening is its own job.
- **No price in any video beat** is now a product decision (wider than the CTA guard). It
  RETIRES the "offer never surfaced" defect logged across four runs. ⚠️ Before acting on the
  `feat/adscript-ab-harness` result *"flash-lite drops the offer 4/4"*, check whether it counts
  a missing PRICE as a miss — if so the harness is wrong, not the model.
- **`MODEL_RESEARCH`** (`gemini-3.5-flash`) is now referenced by no flow. Dead constant.
- **S4 camera mandate collapsed** to a medium shot instead of its mandated close-up. n=1, watch it.

## ⚠ OPEN DECISION — the repo still grows ~400 MB/month
The lite clone bought time, it is not a cure. Both are Neil's call:
1. **`clients/*/ads/*/clips/`** — heaviest (25 MB each) but **paid Veo generations**. Not
   gitignored on purpose: ignoring them without another home guarantees the defreezer eats
   them. Needs a destination first (Drive / R2 / Git LFS).
2. **`git filter-repo`** to strip the 1.5 GB from history. Irreversible, force push, breaks
   every clone and branch. **Never without Neil saying so.**

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Both rules also live in `CLAUDE.md`.
Cafe-PC operating warnings: [`cafe_session.md`](workflows/cafe_session.md) §A6.
