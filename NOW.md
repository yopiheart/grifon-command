# NOW — the resume doc
**Stamped: 2026-09-01** (session 43)

## ▶ NEXT ACTION — execute the one-week plan

Session 43 was research only, no code. `origin/main` is at `4f76359`; three docs sit on
`claude/project-viability-research-8se685` (`c3c70c0`), not merged.

**THE CALL: [`workflows/one_week_plan_2026-09.md`](workflows/one_week_plan_2026-09.md).** For seven
days Grifon stops being a product launch and becomes a service that manufactures proof. The pivot is
an asset already in the repo, in the wrong folder: KM-003 hit **₱13.33 per message** against a
₱40-80 band on Day 1, pulled from Meta's API. Grok, Meta automation and Higgsfield cannot show a
Filipino owner a septic-tank business with a receipt. ⚠ Verified to **Day 1 only** and that record is
a month old, so pull the current number before publishing anything.

**Day 0 is tonight, ~2 hours:** pull KM-003's real numbers, rip out the false `ProofGallery` claim
(open item #8), replace it with the Oceanides receipt. Then Day 1 one case-study page via
`funnel-forge`, Day 2 thirty real conversations (one inside a PH AI-OS community), Days 3-4 three
pilot ads by hand, Day 5 one client spends their own money, Day 6 publish the win or the failure,
Day 7 three real numbers. **Not this week: samples, pipeline work, self-serve launch, paid spend.**

Reasoning: [`workflows/market_viability_2026.md`](workflows/market_viability_2026.md). Everything
below is the build backlog, parked seven days. Reboot setup: `restore-ffmpeg.ps1`,
`enable-dev-unmetered-video.ps1`, `npm run dev`. Smoke login: `workflows/expert_manual_mode.md:440`.
Sample path if the week is abandoned: `workflows/sample_brand_briefs.md` · 2 · Silid Home.

## 🔴 THE FINDING (session 42) — SHEET_NOTE's ordinal was right only while the avatar was missing
`SHEET_NOTE` opened with "Reference Image 1". `bbbed45` chose that DELIBERATELY and was right for
the two runs it diagnosed: the avatar was absent, so the sheet really was image 1. But the ordinal
is POSITIONAL — `generateSceneImage` pushes avatar → product → continuity — so once an avatar IS
present the sheet becomes image 2 and the carve-out points at the portrait. Now named by ROLE.
**The avatar-persist fix below makes the avatar present MORE often, i.e. it would have made this
ordinal wrong more often.** ⚠ Hardening, NOT the missing fix — `bbbed45` stays a 🎲.

## ✅ ALSO FIXED (session 42) — unit-verified, NOT yet eyeballed on a render
1. **The avatar write latched on a persist that had only been ATTEMPTED.** `deps.persist` swallows
   its errors and always resolves, so a dropped create checkpoint spent the single try on the exact
   `run_not_found` 404 the ordering fix existed to avoid. Now closes on the AVATAR write settling.
2. **A REFUSED morph kept its 1.5s action hold.** `submitVideo` strips `config.lastFrame` and
   re-submits single-frame when the provider rejects the pair (Veo 3.1 Lite → 400); nothing recorded
   it, so `hasEndFrame` stayed true off the STILLS. The downgrade now rides the job handle.

New tests vs unfixed source: **3 failed, 100 passed.** Then **1356 passed / 32 skipped**, tsc +
build clean, bundle-leak 0. **No render eyeballed.**

## ⚠ TUNED LIST — still needs Neil's go
1. **CONTINUITY_LOCK is appended to STRICT_NEGATIVE too** (`geminiService.ts:2560`). Reachable only
   when a scene OMITS `referenceImage`: the start frame defaults `'avatar'`, the end frame `'none'`,
   so one prompt bans faces/skin/hands while the lock orders "that same person". Narrow, but it is
   the documented floating-head recipe. A guard, not prompt text.
2. **Pinned claim** for FEATURE FILTER. "unang 50 lang" has now dropped 4 runs straight.
3. **Route `objectionToUs`** (+ `bigIdea`, `deepFear`, `statusUpgrade`) into the script stage —
   Market Research already produces them; the ad-script prompt never sees them.

## ⚠ OPEN — ranked
1. **Garbled label SUB-LINE — deliberately shipped by Neil 2026-08-30.** "Barake Medium Roast 250g"
   on the box; the pouch is correct. The gate passed all 4 scenes and always will:
   `expectedLabelText` is `run.input.productName` alone
   ([producerOrchestrator.ts:1830](services/producerOrchestrator.ts#L1830)) — it matches the brand
   name, never the line underneath. Scope gap, not a gate defect. Recut once fixed.
2. **Residual framing drift, and the fix is already named.** In the S2 pair the CAMERA PULLS BACK
   ("gumalaw ang background"). `CONTINUITY_LOCK` says copy "camera distance and framing" — abstract.
   `HOOK_ANCHOR_RULE` already solved it: *"the SAME silhouette occupying the SAME position in
   frame"*. **Add that clause before testing another video model** — the drift is in the STILL, and
   no video model can decline to interpolate two frames that genuinely differ.
3. **The end-frame call now sends THREE inline images** (avatar + sheet + start frame), no body
   limit in `api/gemini/image.ts` against Vercel's 4.5 MB cap, and `renderEndFrame`'s bare
   `catch { return undefined }` turns an overflow into a silently missing end frame, zeroing
   `hasEndFrame` too. Downscale the continuity frame; emit an event instead of swallowing.
4. `SCENE_PROMPT_CAP = 400` duplicates the literal at `geminiService.ts:2340`. One line.
5. Same storyboard: the box SHIFTS between the frames, and S2 says "punit" over a box FLAP.
6. **No script gate exists.** Build AFTER TUNED #3 — a gate hunting a claim the script was never given is pointless.
7. **A refused scene still dies** and the user regenerates by hand. Top pre-launch risk.
8. **Landing page has one false claim** — `ProofGallery` says real businesses ran these ads.
   Promoted by the viability check: free to fix, expensive to keep once traffic starts.
9. **Quota race in `consumeFinishedAd`**; **fan-out paid-but-uncollected** on tab close (#29).

## ⚠ CARRIED
- **UNANSWERED: is this branch Vercel's Production source?** The deploy list showed "Environment
  Production" against a feature branch. If yes, every push here is a deploy.
- **The agent cannot read the env file** (ENV WARDEN) — `scripts/pull-run-*.mjs` needs Neil's own
  terminal. Supabase MCP works fine; the finished MP4 pulls from its R2 url.
- **Vite will not serve a file dropped into `public/` after startup** — restart, then check the
  CONTENT TYPE, never the status code (the SPA fallback also answers 200).
- **NEVER pipe `npm run dev` into `head`** — EPIPE kills vite and it reads as a clean exit. A dead
  server leaves a vite child on 5173: `Get-NetTCPConnection -LocalPort 5173 -State Listen` → kill.
- Sparse-checkout: `assets/` + `public/samples/` need `git add --sparse`; `sample-batch` +
  `/public/examples` need re-adding on a fresh clone.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
