# NOW — the resume doc
**Stamped: 2026-08-15** (session 24)

## ✅ THE PILOT IS DONE — both gates PASSED, ad downloaded
Gates 5 (mid-scene dead-air trim) and 6 (hook hold 0.35/0.7) are **Neil-passed**, so
`MID_GAP_TRIM_ENABLED` is out of the dark. Run `apr_2f930418` shipped 10 scenes for ~$4.96 ≈
₱288. Nothing perishable. Write-up: [`pilot_run_2026-08-13.md`](workflows/pilot_run_2026-08-13.md).

## ▶ NEXT ACTION — one real run on the deployed code, watched by Neil
**SHIPPED 2026-08-14 17:47 — the EDL has its eyes back in production.** Merged as ONE commit
`a841f69` (`--no-ff` on purpose). `api/gemini/files/upload.ts` mints a Files API URI per
clip, `geminiService.ts` fans the uploads out with `allSettled`, `EDL_MAX_ATTACHED_VIDEOS`
0 → 10. Design + the 48h-retention reasoning: [`edl_files_api_plan.md`](workflows/edl_files_api_plan.md).

**⏪ ONE-COMMAND ROLLBACK:** `git revert -m 1 a841f69` → safe blind state. That is the whole
reason it went in as a merge commit. Measured live pre-merge: ONE `files/*` part → **200, not
429** · **TEN** → **200** on ~155s of video vs ~60s for a real 10-scene ad, so there is headroom.

⚠️ **STILL UNPROVEN, AND DO NOT CLAIM IT:** that an edit made WITH eyes is better than the
blind one. The blind pilot scored well and Neil passed both its gates. All that is proven is
that the model accepts the video and does not 429. **Only a watched live run answers the
quality question** — that is the next action, and nothing else can substitute for it.

**✅ CANARY ON A SCHEDULE (`0e326ef`).** Tier 3 nightly runs the EDL video-attach check at 02:00
PHT; a red night opens an issue naming the containment step. **First fire = first real proof.**

⚠️ 2 non-blocking follow-ups left in the plan doc; **#1 (`research-tier.ab`) FIXED 2026-08-15.**

## 🧪 GEMINI 3.7 FLASH — gates SHIPPED, and a real bug found
Branch `feat/gemini37-cogs-prep` (pushed, $0.46 / 26 live calls). A/B 3.6 vs 3.7: **−59% cost,
−24% latency per pass, on-contract 6/6** — beats the −50% rate cut alone because 3.7 thinks less
(EDL 1072→483 thoughts), which survives the 2027-01-01 expiry. ⚠️ **Quality NOT established**
(1 sample/flow): same ad scripts cheaper, not better ones.
✅ **Both QA gates → 3.7** (`13bd5bc`), $9.00→$3.75. **Effective next deploy**; env var is still
the instant rollback. ⚠️ Watch reroll rates (image gate drives the only auto-reroll).
⛔ NOT `researchTextModel` before the watched EDL run — same variable.
🔴 **PREMISE PIN IS BUYING NOTHING.** 6 paired samples: pinned `gemini-3.5-flash` flaked **1/6**,
same as 3.7 — but the 3.6 eval recorded it **0/6**, the entire reason to pin. Both failures
byte-identical and **both models emitted 450–520 output tokens**: the model answers, the pipeline
discards it → `googleSearch`+JSON-in-prompt **parser bug**, not the model. Pin costs **4.2x**
for the same flake. ▶ Parser-hardening grill-me FIRST; flip is a free follow-on. **~1 in 6 users
lose this feature today.**
🔴 **Bears on the EDL question:** with 4 clips attached **neither** arm made a *visual* observation
(`weaknessesFlagged` script-only on both). 1 run, not proof, but it points the wrong way and
**raises** your watched run's value. Details: [`gemini37_adoption.md`](workflows/gemini37_adoption.md).

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
