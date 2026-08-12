# NOW — the resume doc
**Stamped: 2026-08-13** (session 19)

## ▶ THE `grifon.ai` DOOR IS SHUT. THE LOCK IS LIVE.
Live 08-08. Codes **`FOUNDER-01`, `FOUNDER-02`, `BETA-01`**, sent as `grifon.ai/i/FOUNDER-01` —
redeems on arrival, scrubs itself from the bar. Audit `events where module='launch_gate'`
(waitlist: `funnel_leads`). Revoke via `LAUNCH_INVITE_CODES`, kill via `VITE_LAUNCH_LOCK`; **neither
works without a redeploy.**

## ▶ NEXT ACTION — THE SAMPLE BATCH ← the only focus, Neil 08-10
🔴 **[`format_sample_readiness.md`](workflows/format_sample_readiness.md)** — `SAMPLES` still empty, which blocks the **One-Shot gallery** (a wall of `Film` icons today), the **landing hero**, and `RecipeCard`'s hover-play, never once executed. **4 scenes** per `SCENE_CAP`, **~₱273/ad, ~₱3,280 for 12**, `npm run cost:estimate` is live. First three: `real_talk`, `before_after`, `unboxing_asmr`. ⚠️ Kling pricing is calibrated off one paid render.

**FIRE ONE PILOT FIRST — it clears three gates at once.** One `real_talk` with
`MID_GAP_TRIM_ENABLED=true` validates gate 5 (trim), gate 6 (the 0.35/0.7 dial, code-correct but
never watched), and is sample 1 of the ≥3 gates 8 and 9 need before a TUNED fix may be proposed.

**Ship them ONE AT A TIME, Neil-gated (agreed 08-13).** `SAMPLES` is `Partial`, so an absent recipe just shows "Sample soon" — no need to wait for all 12. Per format: render → **Neil watches** → only then into `public/samples/formats/` + one `SAMPLES` key. ⚠️ `real_talk` `apr_69e5adc6` (07-31) is rendered but **NOT a sample**: it is the run that produced the #89-#95 punch list, and it is 9 scenes not 4. Comparison only.

**Gates: ✅ 1-4, 6, 10 · 🔶 5 dark, needs your eyes · ⛔ 7, 8, 9 · ⬜ 11**
[#93](https://github.com/yopiheart/grifon-command/issues/93) (8, TUNED) ·
[#92](https://github.com/yopiheart/grifon-command/issues/92) (7) ·
[#104](https://github.com/yopiheart/grifon-command/issues/104)+[#59](https://github.com/yopiheart/grifon-command/issues/59) (11).

## 🔴 YOUR MOVE — one eyeball unlocks gate 5
**`MID_GAP_TRIM_ENABLED` is built and OFF.** Gaps ≥0.6s compress to a 0.15s floor, max 2/scene.
Jump cuts accepted on talking scenes per your call; b-roll/cinematic get audio-only compression. A
real-ffmpeg test proves the hole is gone, not just the scene shortened. **No test can close whether
lip-sync reads right on a real talking head.** That is the flag flip.

## ⛔ CORRECTION 08-13 — gate 7 is NOT the free agent task I said it was
Last session promised gate 7 as agent-doable. **Wrong, and I stopped before writing it.** Four
reasons in the workflow doc's gate 7 section; the two that decide it: the speed-ramp is the
documented **fallback** behind a TUNED prompt fix and is flagged
*"VO-sync makes this experimental"*, the exact desync class gates 1-5 just closed; and 🔴 **the
blob was declared DEAD on the wizard path in June**, while #92 was filed off the **producer**,
which had its hook-morph routing removed (`65e69de`). **Live hypothesis: a producer wiring
regression, not residual mush**, so a mask would hide a dropped fix. Cheapest next read is one
storyboard payload during the batch run you already pay for. **Fourth filed root cause in a row
that did not survive inspection.**

## 🤖 Tier 0c, the cloud-side REVIEWER · ✅ LIVE
Every PR to `main` gets one sticky comment, report-only, TUNED flagged not judged. Constraints:
**Tier 0c** in [`loops.md`](workflows/loops.md). ⚠️ Pinned `claude-opus-5` (Fable is Max-only, the
account is **Pro**); the Max assumption still lives in 5 files, policy, untouched. **$1.51 is a
FLOOR** — no code PR reviewed yet.

## 📊 NEW 08-13 — Meta ads brief filed; it exposed a hole in OUR tracking
Eval in [`post_beta_roadmap.md`](workflows/post_beta_roadmap.md) #17 (~80% already in
`grifon-ad-strategist`; **Hyros declined**). Ledger **A7**+**A8** at *0 campaigns of ours*, so
neither can graduate. 🔴 [`api/_lib/metaCapi.ts`](api/_lib/metaCapi.ts) sends hashed email +
`external_id` + IP + UA but **no `fbc`**, the click ID tying a Purchase to a specific ad click;
funnels fire `Lead` browser-only. **Attribution cannot be backfilled** and no paid traffic has run,
so this is the cheapest it will ever be. Recorded, not fixed.
🟢 **Same argument, minutes of clicking:** launch-stack #4 telemetry go-live needs only two Vercel vars (`VITE_META_PIXEL_ID`, `META_CAPI_ACCESS_TOKEN`) + apply `supabase/marketing_consent.sql`.

## ⏸ PAOLO / OCEANIDES — HELD by Neil 08-09. Do NOT restart it.
**Grifon launch blockers come first.** No call, no deploy, no spend until Neil lifts this. Page
stands (`funnels/oceanides-paolo/`), build green, not deployed, pixel off; nothing rots waiting.
⚠️ **Neil said "paperwork" but [`paolo-funnel-brief.md`](clients/oceanides/paolo-funnel-brief.md)
says CAPITAL** (no ESC, no open-tank tanker) and calls the **₱6,000/load mechanism suspect**
(Globaltec bills per KILO), putting the ₱4,900 price in doubt. **Reconcile both before spending.**
Evidence: [`compliance-findings-2026-08-08.md`](clients/oceanides/compliance-findings-2026-08-08.md).

**Standing facts:** route density is the lever, not price, one city first · **no CASH refunds**,
credit only, one year · geo radius lat `14.54` lng `121.02` · big client-list names are
**Enterprise**, not FB ads · ⛔ no CTAs on organic cards. Done: avatar, value stack, grill,
pixel-leak, copy, page, trust card.

## 🅿 PARKED
**Oceanides:** Week 02 pack · GB-001 · KM-004 hook2 · Kling b-roll · Gabriel's watermark · SEC
Reg. No. · FB About · reviews · **AEM unverified**. ⏸ Daily posting paused. **Grifon:** #89/#90
ride Slice B · `artifact-noir` Steps 1-4 · codex-sol lane at 0 · `@v5` bump · `/viral-autopsy` on
3 Savic · ledger Pattern Index is **mixed register** (A1-A6 Taglish, A7-A8 English), normalize when
convenient · **worktree parallelism unlocked only once you READ each review before merging**, Tier
0c never blocks. **Remotion + Hyperframes closed.**

## ⛔ Gated · 🔧 Arm before starting
🔴 **GEMINI API VIDEO BUDGET IS EXHAUSTED.** Manual via Flow. Gated: Kling. Re-arm:
`.\scripts\restore-git-identity.ps1` · `restore-gh.ps1` · `restore-codex.ps1` · `npx playwright
install chromium`. ⚠️ **Neither `gh` nor `claude` is on PATH** — `…\Programs\GitHubCLI\bin\gh.exe`
and `~\.vscode\extensions\anthropic.claude-code-<VER>\...\claude.exe` (**version is IN the path**,
so it breaks on every extension update, re-list the dir). Each funnel has its own
`node_modules` · **never pipe build output** · **Bash is network-sandboxed, use PowerShell** · ⚠️
`scripts/check-alignment-numerals.mjs` **costs real ElevenLabs calls**, answer already recorded.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90. Repo artifacts are ENGLISH (this file, commit subjects, workflow docs); ads stay Taglish.
