# NOW — the resume doc
**Stamped: 2026-08-15** (session 24)

## ✅ THE PILOT IS DONE — both gates PASSED, ad downloaded
Gates 5 (dead-air trim) + 6 (hook hold) **Neil-passed**, so `MID_GAP_TRIM_ENABLED` is out of the
dark. `apr_2f930418` = 10 scenes for **~$4.96 ≈ ₱288** (the COGS baseline everything above cites).
Write-up: [`pilot_run_2026-08-13.md`](workflows/pilot_run_2026-08-13.md).

## ▶ NEXT ACTION — one real run on the deployed code, watched by Neil
**SHIPPED 2026-08-14 17:47 — the EDL has its eyes back in production** (`a841f69`, `--no-ff`).
Files API URI minted per clip, uploads fanned out with `allSettled`, `EDL_MAX_ATTACHED_VIDEOS`
0 → 10. Design + 48h-retention reasoning: [`edl_files_api_plan.md`](workflows/edl_files_api_plan.md).
**⏪ ONE-COMMAND ROLLBACK:** `git revert -m 1 a841f69` → safe blind state; that is the whole reason
it went in as a merge. Measured pre-merge: ONE `files/*` part → **200, not 429** · **TEN** →
**200** on ~155s of video vs ~60s for a real 10-scene ad, so there is headroom.
⚠️ **STILL UNPROVEN, AND DO NOT CLAIM IT:** that an edit made WITH eyes beats the blind one. The
blind pilot scored well and passed both gates. All that is proven is that the model accepts the
video and does not 429. **Only a watched live run answers the quality question.**
**✅ CANARY ON A SCHEDULE (`0e326ef`).** Tier 3 nightly runs the EDL video-attach check at 02:00
PHT; a red night opens an issue naming the containment step. **First fire = first real proof.**
⚠️ 2 non-blocking follow-ups left in the plan doc; **#1 (`research-tier.ab`) FIXED 2026-08-15.**
▶ **RUN SHEET IS READY, run not started** — hero + brand + offer picked (same fixture as the blind
pilot, so the eyes are the only variable), and the two killers verified in code: the unmeter flag
CANNOT be used on prod, and **>5 `talking` scenes kills the run** (Veo is 5/hr). See the plan doc.

## 🚀 DEPLOYED TO PROD 2026-08-15 — `18d6310` (merge, `--no-ff`)
**⏪ ONE-COMMAND ROLLBACK: `git revert -m 1 18d6310`.** Deploy `dpl_DGZKBNQ…` READY. Two things:
**1. Both QA gates → `gemini-3.7-flash`**, $9.00→$3.75/Mtok. ⚠️ Watch reroll rates — the image
gate drives the only auto-reroll. Env vars `OMNI_GATE_MODEL`/`IMAGE_GATE_MODEL` still override
for an instant no-deploy rollback of just the gates.
**2. 🔴 PROD BUG FIXED — grounded JSON was being discarded.** `cleanJson` picked object-vs-array
by whichever delimiter came FIRST, so a grounded reply opening `…[1], …{json}` sliced garbage.
Real cause of the premise empty shell (**1/6 on BOTH 3.5 and 3.7, never a model defect**) and it
could **hard-throw `marketmind`**. Strictly widening + 14 tests.
⛔ `researchTextModel` NOT flipped — the watched EDL run is its only gate. ⛔ Premise pin
untouched: re-measure AFTER the parser fix runs in prod, then 3.5→3.7 is a free 4.2x.
🔴 **Para sa watched run:** with 4 clips attached **neither** arm made a *visual* observation
(`weaknessesFlagged` script-only). 1 run, not proof — but that is the thing to judge.

## 🔴 FLASH-LITE DROPS THE OFFER — 4/4 (script A/B, 2026-08-15)
`3.1-flash-lite` (production, feeds all 5 crown-jewel flows) omitted the **OFFER** from the ad
script in **4 of 4** runs; `3.7-flash` included it **4 of 4**. A count, not taste — the offer is
what earns the click. Fix costs **+$0.009/ad (₱0.53)** on a **$4.96** ad = **+0.19%**.
⚠️ NOT flipped: `MODEL_TEXT` is LOCKED and moves all 5 flows at once. Narrow (adscript-only
constant) vs broad (own A/B per flow), plus the real risk that prompts were tuned against
flash-lite (3.7 runs 7–9 beats vs 6): [`gemini37_adoption.md`](workflows/gemini37_adoption.md)
Slice 4. Grade with `gemini-eval` before shipping. ⏸ Harness branch `feat/adscript-ab-harness`
(`a7ff5f3`) awaits your eye — `RUN_AB=1`, skipped by default, zero production touched.

## ✅ DAYLIGHT TYPO ON MAIN — `3ec2920` (PR #114). ⏪ ROLLBACK: `git revert -m 1 3ec2920`
13 instructions read `daylight` where they mean `like`, since the **initial commit**: 10 in
`geminiService.ts`, 1 in `prompts.ts`, +2 in `tools/eval_realism_formula.mjs`. Mostly *negative
constraints* — on-screen text, bracketed headers, symbols. ⚠️ Output effect UNMEASURED.
🔴 **OPEN:** eval harnesses hand-copy TUNED blocks, guarded only by a prose "re-sync" comment —
that prose failed IN this PR and CI could not see it. Copy `tools/check-voice-lint-sync.mjs`.

## 🔴 THE ANTI-SLOP NET HAS THREE NAMED HOLES
Gate is live and **not enough**: passed scene 9's unreadable "HIRAYA GLOW" label · scene 8's
`gate_verdict` was `null` · **stills only**, so the hook's blob in the *video* morph is invisible.
Salvage = **Neil's eye + NEW TAKE**; `Object Materialization` is high-variance.

## 📋 9 FINDINGS, NONE FILED — `gh` is not on PATH
Pilot doc. Sharpest: **#7 colour drift 3/3 → TUNED proposal UNLOCKED** · #4 `SCENE_CAP` unwired ·
#6 `producer_runs.cost_usd` is 0.

## 🅿 PARKED + ⚠️ DEAD ENDS (wag simulan / wag balikan)
**Preset styles + preview UI:** caption/text styles drawn live in the DOM with CSS; motion feel =
ONE tiny sample clip per preset, built once as a static asset. ⛔ Never render a preview from the
user's own ad (a full render per click × 7 presets). **Dead diagnoses:** `TEXT_LIMIT` · Google
project quota · "10 videos is over a ceiling" — the dashboard can't answer that class of question,
a two-line console reproducer can. **Offer box:** users paste **only their literal package offer**,
Market Research does the rest; `sample_batch_test_spec.md` §1 still carries the long brief.

## 🌿 THE BRANCH PILE (2026-08-15)
`node tools/branch_triage.mjs` — 7s, read-only, one verdict per branch. **28** (+1 mine above):
3 SUPERSEDED · 2 TUNED · 8 CONFLICT-CODE · 12 CONFLICT-DOC · 1 MERGE-DOCS · 2 STALE. Half is doc
churn. SOP: [`branch_triage.md`](workflows/branch_triage.md).

## 🧠 THE STRATEGIC ONE — every avatar has the same face
The auto-cast "mean face" is what every nano-banana user gets, so believability buys us nothing
competitively. Lever in `assets/house-model/README.md`: **"bone, not features"**, A/B it **alone**
(full raw-ugc scaffold failed 4/4, 07-16). Real moat: a **casting bank of 15–20 approved, distinct
faces** — an asset can't be copied from a prompt.

## ⛔ Gated · 🔧 Arm before starting
Re-arm: `.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1` ·
`npx playwright install chromium`. ⚠️ `restore-git-identity.ps1` did NOT take on 2026-08-14 —
verify `git config --global user.name` first. Neither `gh` nor `claude` is on PATH. Each funnel
has its own `node_modules` · **never pipe build output** · **Bash is network-sandboxed, use
PowerShell** · ⚠️ the ENV WARDEN blocks every read of `.env` — ask Neil, never route around.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90. Repo artifacts are ENGLISH; ads stay Taglish.
