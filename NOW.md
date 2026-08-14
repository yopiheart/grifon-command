# NOW — the resume doc
**Stamped: 2026-08-14** (session 22)

## ✅ THE PILOT IS DONE — both gates PASSED, ad downloaded
Gates 5 (mid-scene dead-air trim) and 6 (hook hold 0.35/0.7) are **Neil-passed**, so
`MID_GAP_TRIM_ENABLED` is out of the dark. Run `apr_2f930418` shipped 10 scenes for ~$4.96 ≈
₱288. Nothing is perishable. Full write-up: [`pilot_run_2026-08-13.md`](workflows/pilot_run_2026-08-13.md).

## ▶ NEXT ACTION — one real run on the deployed code, watched by Neil
**SHIPPED 2026-08-14 17:47 — the EDL has its eyes back in production.** Merged as ONE commit
`a841f69` (`--no-ff` on purpose). `api/gemini/files/upload.ts` mints a Files API URI per
clip, `geminiService.ts` fans the uploads out with `allSettled`, `EDL_MAX_ATTACHED_VIDEOS`
0 → 10. Design + the 48h-retention reasoning: [`edl_files_api_plan.md`](workflows/edl_files_api_plan.md).

**⏪ ONE-COMMAND ROLLBACK:** `git revert -m 1 a841f69` puts the editor back to the safe
blind state. That is the whole reason it went in as a merge commit.

Measured live before merging: ONE `files/*` part → **200, not 429** · **TEN** → **200**, on
~155s of video vs ~60s for a real 10-scene ad, so there is headroom. Build 0, 1195 tests.

⚠️ **STILL UNPROVEN, AND DO NOT CLAIM IT:** that an edit made WITH eyes is better than the
blind one. The blind pilot scored well and Neil passed both its gates. All that is proven is
that the model accepts the video and does not 429. **Only a watched live run answers the
quality question** — that is the next action, and nothing else can substitute for it.

**✅ THE CANARY IS ON A SCHEDULE (`0e326ef`).** Tier 3 nightly runs the EDL video-attach check
at 02:00 PHT; a red night opens an issue naming the containment step. **The first night it
fires is the first real proof** — glance at the Actions tab.

⚠️ Three non-blocking follow-ups sit at the bottom of the plan doc. Sharpest:
`research-tier.ab.test.ts` (`RUN_AB=1`) degrades silently and would print a wrong A/B result.

## 🔴 THE ANTI-SLOP NET HAS THREE NAMED HOLES
The scene-image gate is live and **it is not enough**:
1. It **passed** scene 9's hero shot whose "HIRAYA GLOW" label is unreadable —
   `{"pass": true, "flags": []}`. `expectedLabelText` exists and did not save it.
2. Scene 8's `gate_verdict` is **`null`** — the gate did not run at all.
3. It inspects **stills only**. The hook's blob was in the *video* morph, so it is
   structurally invisible to the gate.

Today's only salvage is **Neil's eye + NEW TAKE** (2 free). One re-roll did clear the blob,
which also proves the hook's `Object Materialization` morph is **high-variance**, not a
one-off. Users without Neil's eye will publish the slop.

## 📋 9 FINDINGS, NONE FILED — `gh` is not on PATH
Ranked list + evidence in the pilot doc. Sharpest: **#7 colour drift hit 3/3, so the gated
TUNED proposal is UNLOCKED** (render-stage LUT, no prompt touched) · #4 `SCENE_CAP` isn't
wired to the producer (why runs return 9 or 10) · #6 `producer_runs.cost_usd` is 0 on every
row. File when `gh` is back: `.\scripts\restore-gh.ps1`.

## 🅿 PARKED THIS SESSION (Neil's call — do not start these mid-session)
**Preset styles + their preview UI.** Right shape at zero marginal cost: caption/text styles
drawn live in the DOM with CSS; motion feel shown by ONE tiny sample clip per preset, built
once, shipped as a static asset. ⛔ Never render a preview from the user's own ad — that is a
full render per click × 7 presets. **Thumbnail** looks on-format (MrBeast shape); grade it
with `gemini-eval` in its own session, not by eyeball mid-pilot.

## ⚠️ THREE WRONG DIAGNOSES, ALL DEAD — do not re-walk
`TEXT_LIMIT` · Google project quota · "10 videos is over a ceiling". Evidence for each is in
the pilot doc. **The dashboard cannot answer this class of question; a two-line console
reproducer can.** One is in there.

## 🌿 THE BRANCH PILE IS NOW READABLE (2026-08-15)
`node tools/branch_triage.mjs` — 7s, read-only, one verdict per branch. Today: **1 DELETE ·
3 SUPERSEDED · 2 TUNED · 8 CONFLICT-CODE · 12 CONFLICT-DOC · 1 MERGE-DOCS · 2 STALE.** The
"29 unmerged branches" scare is half doc churn — `CLAUDE.md`/`post_beta_roadmap.md`/
`agent_lessons.md` collide, not code. Delete commands print paste-ready; **Neil's call, the
tool never deletes.** SOP + what it deliberately can't decide: [`branch_triage.md`](workflows/branch_triage.md).

## 🧠 THE STRATEGIC ONE — every avatar has the same face
The auto-cast "mean face" is what every nano-banana user gets, so believability buys us
nothing competitively. Cheap lever proved in `assets/house-model/README.md`: **"bone, not
features"** — but A/B it **alone** on Gemini (the full raw-ugc scaffold failed 4/4, 07-16).
Real moat: a **casting bank of 15–20 approved, structurally distinct faces**. An asset
cannot be copied from a prompt.

## 📝 PRODUCT TRUTH — the offer box
Real users paste **only their literal package offer**; Market Research does the rest.
`sample_batch_test_spec.md` §1 still carries the long brief — **fix before the other 11 run.**

## ⛔ Gated · 🔧 Arm before starting
Re-arm: `.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1` ·
`npx playwright install chromium`. ⚠️ `restore-git-identity.ps1` did NOT take on 2026-08-14 —
verify with `git config --global user.name` before trusting it. Neither `gh` nor `claude` is
on PATH. Each funnel has its own `node_modules` · **never pipe build output** · **Bash is
network-sandboxed, use PowerShell** · ⚠️ the ENV WARDEN blocks every read of `.env` — ask
Neil, never route around.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90. Repo artifacts are ENGLISH; ads stay Taglish.
