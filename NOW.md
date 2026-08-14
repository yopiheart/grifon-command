# NOW — the resume doc
**Stamped: 2026-08-14** (session 22)

## ✅ THE PILOT IS DONE — both gates PASSED, ad downloaded
Gate 5 (mid-scene dead-air trim) and gate 6 (hook hold 0.35/0.7) are **Neil-passed**.
`MID_GAP_TRIM_ENABLED` comes out of the dark; gate 5 of `format_sample_readiness.md` is
discharged. Run `apr_2f930418` shipped 10 scenes for ~$4.96 ≈ ₱288. Nothing is paused and
nothing is perishable any more — full write-up, corrected root cause, cost table and the
9-item finding list are in [`pilot_run_2026-08-13.md`](workflows/pilot_run_2026-08-13.md).

## ▶ NEXT ACTION — give the EDL its eyes back (Gemini Files API)
**The editor is currently BLIND for every user.** Gemini stopped accepting our R2 object
URL as `fileData.fileUri`; it only takes URIs minted by its own **Files API**. One video
part on the request = 429 `RESOURCE_EXHAUSTED`, zero parts = 200 (isolated live 08-14, same
model/endpoint/second). Shipped mitigation on main (`2a1860b`): `EDL_MAX_ATTACHED_VIDEOS = 0`
— every scene rides in the prompt as `videoAttached: no`, a branch the tuned prompt already
had. **Fix: upload each scene video to the Files API, pass the `files/*` URI, raise the cap.**
Restore note is in the constant's doc comment in [geminiService.ts](services/geminiService.ts).
It also survives R2 presign expiry, which the current design does not.

⚠️ It broke ~2 weeks before anyone noticed, because no run was attempted in between.

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
Full text + evidence in the pilot doc. Ranked: 1 blind EDL · 2 gate passed an illegible
label · 3 nothing watches video + gate coverage holes · 4 `SCENE_CAP` not wired to the
producer (why runs come back 9 or 10) · 5 `modelCosts.ts` has no row for `veo-3.1-lite` or
`kling-v3` · 6 `producer_runs.cost_usd` is 0 on every row · 7 colour drift at **3/3 → the
gated TUNED proposal is unlocked** (a render-stage LUT fixes it without touching a prompt) ·
8 no shot-variety rule on the ugc/testimonial skeleton (1/3) · 9 preset styles are bare text
labels. File these when `gh` is back: `.\scripts\restore-gh.ps1`.

## 🅿 PARKED THIS SESSION (Neil's call — do not start these mid-session)
**Preset styles + their preview UI.** Right shape at zero marginal cost: caption/text styles
drawn live in the DOM with CSS; motion feel shown by ONE tiny sample clip per preset, built
once, shipped as a static asset. ⛔ Never render a preview from the user's own ad — that is a
full render per click × 7 presets. **Thumbnail** looks on-format (MrBeast shape); grade it
with `gemini-eval` in its own session, not by eyeball mid-pilot.

## ⚠️ TWO WRONG DIAGNOSES WERE PUBLISHED BEFORE THE RIGHT ONE
Recorded so nobody re-walks them. (a) "our `TEXT_LIMIT` limiter" — dead, `Retry-After: 30` is
the Google branch, ours sets 60. (b) "Google project quota" — dead, every quota row 0% on a
paid tier 3 account. (c) "10 attached videos is over a ceiling" — dead, capping to 8 still
429'd, and 8 < 9 which had worked twice. **The dashboard cannot answer this class of
question; a two-line console reproducer can.** One is in the pilot doc.

## 🧠 THE STRATEGIC ONE — every avatar has the same face
The auto-cast "mean face" is what every nano-banana user gets, so believability buys us
nothing competitively. Cheap lever: `assets/house-model/README.md` already proved the fix is
**"bone, not features."** ⚠️ A/B it **alone** on Gemini — the full raw-ugc scaffold failed
4/4 there on 07-16. Real moat: extend the locked house model into a **casting bank of 15–20
approved, structurally distinct faces** and cast from it. An asset cannot be copied from a
prompt.

## 📝 PRODUCT TRUTH — the offer box
Real users paste **only their literal package offer**; Market Research does the rest.
`sample_batch_test_spec.md` §1 still carries the long brief — **update it before the other
11 formats run.**

## ⛔ Gated · 🔧 Arm before starting
Re-arm: `.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1` ·
`npx playwright install chromium`. ⚠️ `restore-git-identity.ps1` did NOT take on 2026-08-14 —
verify with `git config --global user.name` before trusting it. Neither `gh` nor `claude` is
on PATH. Each funnel has its own `node_modules` · **never pipe build output** · **Bash is
network-sandboxed, use PowerShell** · ⚠️ the ENV WARDEN blocks every read of `.env` — ask
Neil, never route around.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90. Repo artifacts are ENGLISH; ads stay Taglish.
