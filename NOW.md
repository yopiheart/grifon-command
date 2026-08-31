# NOW — the resume doc
**Stamped: 2026-08-31** (session 42)

## ▶ NEXT ACTION — merge, then RE-RUN the unboxing sample before moving on

`claude/eval-managed-agents-vr01gs` is merged; `origin/main` carries it. The live branch is
**`claude/code-review-ecszcz` (+1, `34ccb7d`)** — three defects a `/code-review` pass found
under a green build. Merge it first.

Then **re-run the SAME unboxing brand, not Silid Home yet.** Session 41 could not tell whether
the blank-wordmark fix worked; we now know it was never active (see below), so that run is the
first real test of it. Only after a clean pair go to **2 · Silid Home (Unboxing ASMR)** from
`workflows/sample_brand_briefs.md` — it exercises the same S2 pair under `asmrFlag`.

Setup after a reboot: `restore-ffmpeg.ps1`, `enable-dev-unmetered-video.ps1`, `npm run dev`.
Run at `/app?osaEngine=producer`, vertical `product`, presenter `Auto`, BOTH photos.
**Paste the offer, never type it** — a past run typed 113 of 153 chars and lost the first
sentence. Smoke login: `workflows/expert_manual_mode.md:440`.

## 🔴 THE FINDING — the wordmark fix was pointing at the wrong photo
`SHEET_NOTE` opened with "Reference Image 1". That ordinal is POSITIONAL inside
`generateSceneImage`, which pushes avatar → product → continuity, and the sheet arrives as the
**productUrl**. The only path that composes a sheet (`reveals` → mode `'both'`) also passes an
avatar, so image 1 was the avatar PORTRAIT: the NO_UNSOLICITED_PRODUCT carve-out landed on the
wrong photo every time. `bbbed45` was not a 🎲 that lost a coin flip — it was never in play.
Now named by ROLE ("The product reference image"), which cannot go stale when parts order moves.
This is the third time an ordinal has drifted from its parts index in this file's history.

## ✅ FIXED + VERIFIED THIS SESSION (`34ccb7d`) — unit-verified, NOT yet eyeballed
1. `SHEET_NOTE` ordinal → role, above.
2. **The avatar write latched on a persist that had only been ATTEMPTED.** `deps.persist`
   swallows its own errors and always resolves, so a dropped create checkpoint spent the single
   try on the exact `run_not_found` 404 the ordering fix existed to avoid. Now closes the door
   on the AVATAR write settling, and retries on the next commit until it does.
3. **A REFUSED morph kept its 1.5s action hold.** `submitVideo` strips `config.lastFrame` and
   re-submits single-frame when the provider rejects the pair (Veo 3.1 Lite → 400), and nothing
   recorded it, so `hasEndFrame` stayed true off the STILLS and the render held static tail over
   padded silence. Downgrade now rides the job handle, so a resumed run reads it too.

Each new test was run against the unfixed source: **3 failed, 100 passed, no collateral.** Then
full suite **1356 passed / 32 skipped**, tsc clean, build clean, bundle-leak 0. **No render has
been eyeballed** — that is what the re-run above is for.

## ⚠ TUNED LIST — still needs Neil's go
1. **CONTINUITY_LOCK is appended to STRICT_NEGATIVE too** (`geminiService.ts:2560`). Reachable
   only when a scene OMITS `referenceImage`: the start frame defaults `'avatar'` and the end
   frame `'none'`, so one prompt bans all faces/skin/hands while the lock orders "that same
   person". Narrow — the storyboard prompt asks for the field on every scene — but it is the
   documented floating-head/disembodied-hand recipe. Fix is a guard, not prompt text.
2. **Pinned claim** for FEATURE FILTER. "unang 50 lang" has now dropped 4 runs straight.
3. **Route `objectionToUs`** (+ `bigIdea`, `deepFear`, `statusUpgrade`) into the script stage.
   Market Research already produces them; the ad-script prompt never sees them.

## ⚠ OPEN — ranked
1. **Garbled label SUB-LINE — deliberately shipped by Neil 2026-08-30.** "Barake Medium Roast
   250g" on the box; the standalone pouch is correct. The image gate passed all 4 scenes and
   always will: `expectedLabelText` is `run.input.productName` alone
   ([producerOrchestrator.ts:1830](services/producerOrchestrator.ts#L1830)), so it reads the
   brand name, matches, and never looks at the line underneath. Scope gap, not a gate defect.
   Recut `/samples/unboxing.*` from a clean run once fixed.
2. **Residual framing drift, and the fix is already named.** In the S2 pair the CAMERA PULLS
   BACK — the subject shrinks, and everything else appears to move with it, which is what reads
   as "gumalaw ang background". `CONTINUITY_LOCK` says to copy "camera distance and framing",
   which is abstract and gives the model nothing to hold. `HOOK_ANCHOR_RULE` already solved
   exactly this, in its own words: *"the SAME silhouette occupying the SAME position in frame"*.
   **Add that clause before testing a different video model** — the drift originates in the
   STILL, and no video model can decline to interpolate two frames that genuinely differ.
3. **The end-frame call now sends THREE inline images** (avatar + sheet + start frame) and
   `api/gemini/image.ts` sets no body limit against Vercel's 4.5 MB cap. `renderEndFrame`'s
   bare `catch { return undefined }` turns an overflow into a silently missing end frame — which
   also zeroes `hasEndFrame`, so both features fail together and look like pre-change behaviour.
   Downscale the continuity frame; emit an event instead of swallowing.
4. `SCENE_PROMPT_CAP = 400` (producerOrchestrator) is an unlinked duplicate of the literal at
   `geminiService.ts:2340`. Drift silently restores the invisible truncation. One line.
5. Two smaller things in the same storyboard: the box SHIFTS position between start and end
   frame (it should stay put, only the pouch appears), and S2 says "punit" over a box FLAP.
6. **No script gate exists.** Build it AFTER TUNED #3 — a gate hunting for a claim the script
   was never given is pointless.
7. **A refused scene still dies** and the user regenerates by hand. Top pre-launch risk.
8. **Landing page has one false claim** — `ProofGallery` says real businesses ran these ads.
9. **Quota race in `consumeFinishedAd`**; **fan-out paid-but-uncollected** on tab close (#29).

## ⚠ CARRIED
- **UNANSWERED: is this branch Vercel's Production source?** The deploy list showed
  "Environment Production" against a feature branch. If yes, every push here is a deploy.
- **The agent cannot read `.env`** (ENV WARDEN), so `scripts/pull-run-*.mjs` needs Neil's own
  terminal. Postgres via the Supabase MCP works fine; the finished MP4 pulls from its R2 url.
- **Vite will not serve a file dropped into `public/` after the dev server started** — restart
  it, then check the CONTENT TYPE, never the status code (the SPA fallback also answers 200).
- **NEVER pipe `npm run dev` into `head`** — EPIPE kills vite and it reads as a clean exit.
  A dead dev server leaves a vite child on 5173: `Get-NetTCPConnection -LocalPort 5173 -State
  Listen` → `Stop-Process -Id <pid>`.
- Sparse-checkout: `assets/` and `public/samples/` need `git add --sparse`;
  `/tests/fixtures/sample-batch` and `/public/examples` need re-adding on a fresh clone.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
