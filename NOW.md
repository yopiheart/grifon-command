# NOW — the resume doc
**Stamped: 2026-09-05** (Codex Cloud migration phase 1)
## ▶ NEXT ACTION — produce the next sample

Nothing to merge: `origin/main` is at `4f76359` and carries session 41 + 42 in full.
The shipped `/samples/unboxing.*` is FINE — the wordmark came back on a regenerate in session 41
and nothing since has touched it. So the next run is a free choice, not a rescue: re-run the same
unboxing brand to add a second data point to the 🎲 (`bbbed45` still has a sample of one), or go
straight to **2 · Silid Home (Unboxing ASMR)** in `workflows/sample_brand_briefs.md`, which
exercises the same S2 pair under `asmrFlag` and doubles as that data point. Neil picks.

Setup after a reboot: `restore-ffmpeg.ps1`, `enable-dev-unmetered-video.ps1`, `npm run dev`.
Run at `/app?osaEngine=producer`, vertical `product`, presenter `Auto`, BOTH photos. **Paste the
offer, never type it** — a past run typed 113 of 153 chars and lost the first sentence. Smoke
login: `workflows/expert_manual_mode.md:440`.

## CODEX CLOUD BASELINE — implemented, dependency download blocked in this workspace
Root/scoped `AGENTS.md`, the setup runbook, and `codex_migration_inventory.md` define phase 1. PR #124 review corrections now match the live API (`gemini/text.ts`, `getUserFromAccessToken`) and actual component/service ownership. Node 24.15.0/npm 11.4.2 added only the missing optional-peer lock record; no version changed. Set `CODEX_ENV_NODE_VERSION=24`, run `npm ci` in cloud Setup, then start a new task and run the zero-cost verification block; this task's agent-phase registry access remains blocked.
## 🔴 THE FINDING — SHEET_NOTE's ordinal was right only while the avatar was missing
`SHEET_NOTE` opened with "Reference Image 1". `bbbed45` chose that DELIBERATELY and was correct
for the two runs it diagnosed: the avatar was absent from the checkpoint, so the sheet really
was image 1. But the ordinal is POSITIONAL — `generateSceneImage` pushes avatar → product →
continuity — so the moment an avatar IS present the sheet becomes image 2 and the carve-out
points at the portrait. Right sometimes, wrong sometimes, on a condition nobody was tracking.
Now named by ROLE, correct either way. **Note the interaction: the avatar-persist fix below
makes the avatar present MORE often, i.e. it would have made this ordinal wrong more often.**
⚠ This is hardening, NOT the missing fix — `bbbed45` stays a 🎲. Do not re-verify on one run.

## ✅ ALSO FIXED — unit-verified, NOT yet eyeballed on a render
1. **The avatar write latched on a persist that had only been ATTEMPTED.** `deps.persist`
   swallows its own errors and always resolves, so a dropped create checkpoint spent the single
   try on the exact `run_not_found` 404 the ordering fix existed to avoid. Now closes on the
   AVATAR write settling, and retries on the next commit until it does.
2. **A REFUSED morph kept its 1.5s action hold.** `submitVideo` strips `config.lastFrame` and
   re-submits single-frame when the provider rejects the pair (Veo 3.1 Lite → 400) and nothing
   recorded it, so `hasEndFrame` stayed true off the STILLS and the render held static tail over
   padded silence. The downgrade now rides the job handle, so a resumed run reads it too.

Each new test was run against the unfixed source: **3 failed, 100 passed, no collateral.** Then
**1356 passed / 32 skipped**, tsc + build clean, bundle-leak 0. **No render eyeballed.**

## ⚠ TUNED LIST — still needs Neil's go
1. **CONTINUITY_LOCK is appended to STRICT_NEGATIVE too** (`geminiService.ts:2560`). Reachable
   only when a scene OMITS `referenceImage`: the start frame defaults `'avatar'` and the end
   frame `'none'`, so one prompt bans faces/skin/hands while the lock orders "that same person".
   Narrow, but it is the documented floating-head recipe. A guard, not prompt text.
2. **Pinned claim** for FEATURE FILTER. "unang 50 lang" has now dropped 4 runs straight.
3. **Route `objectionToUs`** (+ `bigIdea`, `deepFear`, `statusUpgrade`) into the script stage.
   Market Research already produces them; the ad-script prompt never sees them.

## ⚠ OPEN — ranked
1. **Garbled label SUB-LINE — deliberately shipped by Neil 2026-08-30.** "Barake Medium Roast
   250g" on the box; the pouch is correct. The gate passed all 4 scenes and always will:
   `expectedLabelText` is `run.input.productName` alone
   ([producerOrchestrator.ts:1830](services/producerOrchestrator.ts#L1830)), so it matches the
   brand name and never reads the line underneath. Scope gap, not a gate defect. Recut the
   sample from a clean run once fixed.
2. **Residual framing drift, and the fix is already named.** In the S2 pair the CAMERA PULLS
   BACK, which reads as "gumalaw ang background". `CONTINUITY_LOCK` says to copy "camera
   distance and framing" — abstract, nothing to hold. `HOOK_ANCHOR_RULE` already solved this:
   *"the SAME silhouette occupying the SAME position in frame"*. **Add that clause before
   testing another video model** — the drift is in the STILL, and no video model can decline to
   interpolate two frames that genuinely differ.
3. **The end-frame call now sends THREE inline images** (avatar + sheet + start frame), no body
   limit in `api/gemini/image.ts` against Vercel's 4.5 MB cap, and `renderEndFrame`'s bare
   `catch { return undefined }` turns an overflow into a silently missing end frame — which also
   zeroes `hasEndFrame`. Downscale the continuity frame; emit an event instead of swallowing.
4. `SCENE_PROMPT_CAP = 400` duplicates the literal at `geminiService.ts:2340`; drift silently
   restores the invisible truncation. One line.
5. Same storyboard: the box SHIFTS between the frames, and S2 says "punit" over a box FLAP.
6. **No script gate exists.** Build it AFTER TUNED #3 — a gate hunting a claim the script was never given is pointless.
7. **A refused scene still dies** and the user regenerates by hand. Top pre-launch risk.
8. **Landing page has one false claim** — `ProofGallery` says real businesses ran these ads.
9. **Quota race in `consumeFinishedAd`**; **fan-out paid-but-uncollected** on tab close (#29).

## ⚠ CARRIED
- **UNANSWERED: is this branch Vercel's Production source?** The deploy list showed
  "Environment Production" against a feature branch. If yes, every push here is a deploy.
- **The agent cannot read the env file** (ENV WARDEN) — `scripts/pull-run-*.mjs` needs Neil's
  own terminal. Supabase MCP works fine; the finished MP4 pulls from its R2 url.
- **Vite will not serve a file dropped into `public/` after startup** — restart, then check the
  CONTENT TYPE, never the status code (the SPA fallback also answers 200).
- **NEVER pipe `npm run dev` into `head`** — EPIPE kills vite and it reads as a clean exit. A
  dead server leaves a vite child on 5173: `Get-NetTCPConnection -LocalPort 5173 -State Listen`
  → `Stop-Process -Id <pid>`.
- Sparse-checkout: `assets/` + `public/samples/` need `git add --sparse`; `sample-batch` +
  `/public/examples` need re-adding on a fresh clone.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
