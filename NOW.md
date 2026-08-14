# NOW — the resume doc
**Stamped: 2026-08-15** (session 24)

## ✅ THE PILOT IS DONE — both gates PASSED, ad downloaded
Gates 5 (mid-scene dead-air trim) and 6 (hook hold 0.35/0.7) are **Neil-passed**, so
`MID_GAP_TRIM_ENABLED` is out of the dark. Run `apr_2f930418` shipped 10 scenes for ~$4.96 ≈
₱288. Nothing perishable. Write-up: [`pilot_run_2026-08-13.md`](workflows/pilot_run_2026-08-13.md).

## ▶ NEXT ACTION — one real run on the deployed code, watched by Neil
**SHIPPED 2026-08-14 17:47 — the EDL has its eyes back in production** (`a841f69`, `--no-ff`).
Files API URI minted per clip, uploads fanned out with `allSettled`, `EDL_MAX_ATTACHED_VIDEOS`
0 → 10. Design + 48h-retention reasoning: [`edl_files_api_plan.md`](workflows/edl_files_api_plan.md).
**⏪ ONE-COMMAND ROLLBACK:** `git revert -m 1 a841f69` → safe blind state; that is the whole
reason it went in as a merge. Measured pre-merge: ONE `files/*` part → **200, not 429** · **TEN**
→ **200** on ~155s of video vs ~60s for a real 10-scene ad, so there is headroom.

⚠️ **STILL UNPROVEN, AND DO NOT CLAIM IT:** that an edit made WITH eyes is better than the
blind one. The blind pilot scored well and Neil passed both its gates. All that is proven is
that the model accepts the video and does not 429. **Only a watched live run answers the
quality question** — that is the next action, and nothing else can substitute for it.

**✅ CANARY ON A SCHEDULE (`0e326ef`).** Tier 3 nightly runs the EDL video-attach check at 02:00
PHT; a red night opens an issue naming the containment step. **First fire = first real proof.**

⚠️ 2 non-blocking follow-ups left in the plan doc; **#1 (`research-tier.ab`) FIXED 2026-08-15.**

## 🚀 DEPLOYED TO PROD 2026-08-15 — `18d6310` (merge, `--no-ff`)
**⏪ ONE-COMMAND ROLLBACK: `git revert -m 1 18d6310`.** Vercel prod deploy
`dpl_DGZKBNQ…` fired off this sha. Ships two things:
**1. Both QA gates → `gemini-3.7-flash`**, $9.00→$3.75/Mtok. ⚠️ Watch reroll rates — the image
gate drives the only auto-reroll. Env vars `OMNI_GATE_MODEL`/`IMAGE_GATE_MODEL` still override
for an instant no-deploy rollback of just the gates.
**2. 🔴 A REAL PROD BUG — grounded JSON was being thrown away.** `cleanJson` picked object-vs-array
by whichever delimiter came FIRST, so a grounded reply opening `Based on search results [1],
…{json}` took the array branch and sliced garbage. Reproduced in isolation (4 shapes fail on old,
pass on new). Real cause of the premise empty shell (**1/6 on BOTH 3.5 and 3.7 — never a model
defect**), and it could **hard-throw `marketmind`**, the wizard's entry point, which parses with
no try/catch. Fix is strictly widening (whatever parsed before is byte-identical) + 14 tests.
⛔ **`researchTextModel` NOT flipped** — the watched EDL run above is its only gate. ⛔ **Premise
pin untouched** on purpose: re-measure AFTER the parser fix runs in prod, then 3.5→3.7 is a free
4.2x. A/B evidence ($0.46, 26 calls, −59% cost / −24% latency, quality NOT established):
[`gemini37_adoption.md`](workflows/gemini37_adoption.md).
🔴 **Bears on the EDL question:** with 4 clips attached **neither** arm made a *visual* observation
(`weaknessesFlagged` script-only on both). 1 run, not proof — but it points the wrong way and
**raises** your watched run's value.

## 🔴 THE ANTI-SLOP NET HAS THREE NAMED HOLES
Scene-image gate is live and **not enough**: (1) it **passed** scene 9's unreadable "HIRAYA GLOW"
label, `expectedLabelText` didn't save it · (2) scene 8's `gate_verdict` was **`null`**, gate
never ran · (3) **stills only**, so the hook's blob in the *video* morph is invisible. Salvage =
**Neil's eye + NEW TAKE** (2 free); one re-roll cleared it, proving `Object Materialization` is
**high-variance**. Users without his eye will publish slop.

## 📋 9 FINDINGS, NONE FILED — `gh` is not on PATH
Ranked list in the pilot doc. Sharpest: **#7 colour drift hit 3/3 → gated TUNED proposal
UNLOCKED** (render-stage LUT) · #4 `SCENE_CAP` unwired · #6 `producer_runs.cost_usd` is 0.

## 🅿 PARKED (Neil's call — do not start mid-session)
**Preset styles + preview UI.** Zero-marginal-cost shape: caption/text styles drawn live in the
DOM with CSS; motion feel = ONE tiny sample clip per preset, built once as a static asset.
⛔ Never render a preview from the user's own ad (a full render per click × 7 presets).
**Thumbnail** is on-format; grade with `gemini-eval` in its own session.

## ⚠️ THREE WRONG DIAGNOSES, ALL DEAD — do not re-walk
`TEXT_LIMIT` · Google project quota · "10 videos is over a ceiling". Evidence in the pilot doc.
**The dashboard can't answer this class of question; a two-line console reproducer can.**

## 🌿 THE BRANCH PILE IS NOW READABLE (2026-08-15)
`node tools/branch_triage.mjs` — 7s, read-only, one verdict per branch. **28 left**: 3 SUPERSEDED
· 2 TUNED · 8 CONFLICT-CODE · 12 CONFLICT-DOC · 1 MERGE-DOCS · 2 STALE. Half the scare is doc
churn, not code. Next cheap win: the 3 SUPERSEDED. SOP: [`branch_triage.md`](workflows/branch_triage.md).

## 🧠 THE STRATEGIC ONE — every avatar has the same face
The auto-cast "mean face" is what every nano-banana user gets, so believability buys us nothing
competitively. Cheap lever in `assets/house-model/README.md`: **"bone, not features"** — A/B it
**alone** on Gemini (full raw-ugc scaffold failed 4/4, 07-16). Real moat: a **casting bank of
15–20 approved, structurally distinct faces** — an asset can't be copied from a prompt.

## 📝 PRODUCT TRUTH — the offer box
Real users paste **only their literal package offer**; Market Research does the rest.
`sample_batch_test_spec.md` §1 carries the long brief — **fix before the other 11 run.**

## ⛔ Gated · 🔧 Arm before starting
Re-arm: `.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1` ·
`npx playwright install chromium`. ⚠️ `restore-git-identity.ps1` did NOT take on 2026-08-14 —
verify `git config --global user.name` first. Neither `gh` nor `claude` is on PATH. Each funnel
has its own `node_modules` · **never pipe build output** · **Bash is network-sandboxed, use
PowerShell** · ⚠️ the ENV WARDEN blocks every read of `.env` — ask Neil, never route around.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90. Repo artifacts are ENGLISH; ads stay Taglish.
