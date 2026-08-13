# NOW — the resume doc
**Stamped: 2026-08-13** (session 21)

## 🔴 A PAID RUN IS PAUSED AND ITS POINTER DIES WITH THE REBOOT

```
apr_2f930418-0766-43ad-9bd2-f23abea8382e
```

Ten scenes **filmed and persisted** (`producer_scenes`: 10/10 video + image). Only the EDL
step failed, on a Gemini `RESOURCE_EXHAUSTED` 429. **No spend is lost and RETRY does not
re-film.** But `ProducerFlow` resumes from `localStorage['osa_producer_active_run']`
([ProducerFlow.tsx:173](components/OneShotAd/ProducerFlow.tsx#L173)) and the defreezer eats
the Chrome profile, so on a fresh machine: log in, DevTools console,
`localStorage.setItem('osa_producer_active_run','apr_2f930418-0766-43ad-9bd2-f23abea8382e')`,
reload `grifon.ai/app?osaEngine=producer`, click **RETRY**. ⚠️ **Never START OVER** — it is
the only thing that clears the key.

**Everything else about the run is in [`pilot_run_2026-08-13.md`](workflows/pilot_run_2026-08-13.md). Read it before touching anything below.**

## ▶ NEXT ACTION — finish the pilot, then grade it
Gate 5 (mid-scene trim, flag ON in Vercel Preview **and** Production) and gate 6 (hook hold
0.35 / 0.7) are the **only** reasons this run exists. Neither depends on scene count or
colour. 🔴 **Only Neil can pass them.** While the run is live, also grab the storyboard
payload for [#92](https://github.com/yopiheart/grifon-command/issues/92) — $0, and gone once
the run is.

## 🟢 KLING PRICE IS VERIFIED — `$0.084/sec` std, two sources
Collapses a **3.3x** uncertainty on 80% of COGS. The repo was wrong three ways: the tool
listed `$0.05 UNVERIFIED`, the one-render back-solve said `$0.167` (that is Kling's *Pro
with video input* rate — it was never measuring std), and the telemetry actually logs
`$0.10` because **`modelCosts.ts` has no row for `veo-3.1-lite` or `kling-v3` at all.**

**This 10-scene run really cost ~$4.96 ≈ ₱288**, from live console durations (Veo 6s
talking, Kling 5s b-roll, 10 images). ⛔ The "₱680" said mid-session was a bad extrapolation
— roughly double. A 10-scene ad costs about what 4 was budgeted at. **Do NOT cut the Pro
tier from 8 ads:** the ladder holds on breakage (~53% margin at 3.5 ads/mo), and real usage
is `pricing_unit_economics.md` §6 item 3, which needs beta data, not another guess.

## 🔴 SEVEN FINDINGS, NONE FILED YET (details + evidence in the pilot doc)
1. **`SCENE_CAP` is not wired to the producer** — only ScriptStudio / GenerateVideo /
   scriptGuardrails import it; the orchestrator follows `scenes.length`. **This is why this
   run was 10 and why `apr_69e5adc6` was 9** — recorded as a mystery on 07-31. Margin hole:
   one credit per finished ad regardless of length.
2. `modelCosts.ts` has no price row for either model we run → telemetry is a placeholder.
3. `producer_runs.cost_usd` is `0` on **every** row. Fix 2+3 and the next run self-measures.
4. **Colour drift at 3/3 → the gated TUNED proposal is unlocked.** No shared grade anchor
   across scenes. ⚠️ We already ship 7 LUTs + `tools/grade.mjs` — a render-stage LUT fixes
   it without touching a tuned prompt.
5. No shot-variety rule on the `ugc`/Testimonial skeleton (scenes 5≈6). **1/3.**
6. `TEXT_LIMIT = 30/60s` is mis-sized for the producer burst — one normal run trips our own
   limiter and burns ~2 min in backoff. Twin of the filed Kling 5/hr finding.
7. Eye dead zone confirmed live (scenes 2, 9; scene 9's eyes hallucinated). Neil's rule:
   **talking avatars close, b-roll may be far.**

## ⛔ CORRECTION — the 429 is Google's, not ours
Mid-session the agent said the 429s were our per-user limiter and therefore would not worsen
with scale. Wrong: `RESOURCE_EXHAUSTED` is the **project-level Gemini quota, shared by every
user**. Neil's original worry was right. **Launch-gate item: read the actual quota headroom
in Google Cloud and file an increase request before public launch.** Nobody has looked.

## 🧠 THE STRATEGIC ONE — every avatar has the same face
The auto-cast "mean face" is what every nano-banana user gets, so believability buys us
nothing competitively. Cheap lever: the brief carries only age/gender/ethnicity/market, and
`assets/house-model/README.md` already proved the fix is **"bone, not features."** ⚠️ A/B it
**alone** on Gemini — the full raw-ugc scaffold failed 4/4 there on 07-16. Real moat: extend
the locked house model into a **casting bank of 15–20 approved, structurally distinct faces**
and cast from it. An asset cannot be copied from a prompt.

## 📝 PRODUCT TRUTH LEARNED — the offer box
Real users paste **only their literal package offer**; Market Research does the rest. Neil
deleted the benefits paragraph as unrealistic. `sample_batch_test_spec.md` §1 still carries
the long brief — **update it before the other 11 formats run.**

## ✅ SHIPPED THIS SESSION
**Omni Edit Styles PARKED** (`OMNI_STYLES_ENABLED=false`, Vercel + local). Fails closed; the
allowlist is cohort control and is **inverted** (empty = open to everyone), so it is never
the off switch. Resume trigger + the stale "arm the allowlist" tombstone are in
[`omni_edit_styles_plan.md`](workflows/omni_edit_styles_plan.md). `codex-image` bridge fixed
(`--full-auto` removed upstream → `--approve-for-me`); every generate call had been dying
silently. `.env.example` now documents the OMNI keys + `MID_GAP_TRIM_ENABLED`, including
that **a Vercel env edit needs a REDEPLOY** — "runtime-read" never meant otherwise, and
CLAUDE.md said it did.

## 🅿 PARKED
Hero re-roll (b2/b3 light + first-batch closeness; the second prompt over-described the room
so the camera pulled back). ⚠️ `.tmp/hiraya-v3/` **dies with the reboot** — regenerate, do
not hunt. **Oceanides still HELD by Neil 08-09.** Instruction-stack prune = roadmap #28.

## ⛔ Gated · 🔧 Arm before starting
Re-arm: `.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1` ·
`npx playwright install chromium`. ⚠️ Neither `gh` nor `claude` is on PATH. Each funnel has
its own `node_modules` · **never pipe build output** · **Bash is network-sandboxed, use
PowerShell** · ⚠️ the ENV WARDEN blocks every read of `.env` — ask Neil, never route around.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90. Repo artifacts are ENGLISH; ads stay Taglish.
