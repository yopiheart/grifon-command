# NOW — the resume doc
**Stamped: 2026-08-30** (session 41)

## ▶ NEXT ACTION — merge the branch, then produce the next sample

The unboxing sample is DONE and shipped to the recipe card. `claude/eval-managed-agents-vr01gs`
is now ~20 commits ahead of `main` and is a clean fast-forward (0 commits on main are missing
from it). Merge it before starting anything new — it has been carrying tonight's fixes alone.

Then the next brand from `workflows/sample_brand_briefs.md`: **2 · Silid Home (Unboxing ASMR)**
is the natural follow-on, since it exercises the same S2 frame pair under `asmrFlag`.

Setup after a reboot: `restore-ffmpeg.ps1`, `enable-dev-unmetered-video.ps1`, `npm run dev`.
Run at `/app?osaEngine=producer`, vertical `product`, presenter `Auto`, BOTH photos.
**Paste the offer, never type it** — a past run typed 113 of 153 chars and lost the first
sentence. Smoke login: `workflows/expert_manual_mode.md:440`.

## ✅ VERIFIED TONIGHT — measured, not reported

- **The action hold works, to the number.** The unbox scene ran **2.77s before and 4.29s
  after**, against a predicted 4.27s, measured with ffprobe on the delivered MP4. Cause was
  never mysterious once measured: every scene was cut the instant the VO stopped, so a 5s clip
  gave 2.77s because that is how long its line takes to say. 21s generated, 13.6s kept.
- **CONTINUITY_LOCK works.** The S2 pair now reads as one take — same room, person, table and
  camera. It never could before: `renderEndFrame` passed only `{avatarUrl, productUrl}`, so
  two stills of ONE shot were generated blind to each other and landed in different rooms.
- **The sample shipped** (`cc9ceab`): `/samples/unboxing.{mp4,jpg}` + `-full.mp4`, cut
  2.90-9.90s. `before_after`'s sample entry and media are retired; its RECIPE stays.

## 🔴 THE PROCESS FINDING — "VERIFIED" was claimed on a sample of ONE
Session 40 marked the blank-wordmark fix verified. It failed again today and one REGENERATE
brought it back, so `bbbed45` **moved the odds and never pinned them** — a 🎲, not a 🔒. Three
hypotheses died first (truncation 187+198<400; avatar slot identical in both runs; a `26a69ad`
regression, refuted by the regenerate). One run is not verification on a generative pipeline.

## ⚠ TUNED LIST — still needs Neil's go
1. **Pinned claim** for FEATURE FILTER. "unang 50 lang" has now dropped 4 runs straight.
2. **Route `objectionToUs`** (+ `bigIdea`, `deepFear`, `statusUpgrade`) into the script stage.
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
   Neil deferred this to save credits; he intends to test it later.
3. Two smaller things in the same storyboard: the box SHIFTS position between start and end
   frame (it should stay put, only the pouch appears), and S2 says "punit" over a box FLAP.
4. **No script gate exists.** Build it AFTER TUNED #2 — a gate hunting for a claim the script
   was never given is pointless.
5. **A refused scene still dies** and the user regenerates by hand. Top pre-launch risk.
6. **Landing page has one false claim** — `ProofGallery` says real businesses ran these ads.
7. **Quota race in `consumeFinishedAd`** — the meter can exceed its own limit.
8. **Fan-out scene: paid but uncollected** if the tab closes mid-run. Parked, roadmap #29.

## ⚠ CARRIED
- **UNANSWERED: is this branch Vercel's Production source?** The deploy list showed
  "Environment Production" against a feature branch. If yes, every push here is a deploy.
- **The agent cannot read `.env`** (ENV WARDEN), so `scripts/pull-run-*.mjs` needs Neil's own
  terminal. Postgres via the Supabase MCP works fine and did all of tonight's forensics; the
  finished MP4 pulls straight from its R2 signed url with curl.
- **Vite will not serve a file dropped into `public/` after the dev server started** — restart
  it, then check the CONTENT TYPE, never the status code (the SPA fallback also answers 200,
  and returns `text/html` for a file that is genuinely gone).
- **NEVER pipe `npm run dev` into `head`.** head closes the pipe and the EPIPE kills vite; it
  dies as `ECONNRESET` + `exited with code 0`, which reads like a clean shutdown. Redirect to a
  log file and read the log.
- **A dead `npm run dev` leaves a vite child holding the port**, so the restart lands on 5174.
  Free it: `Get-NetTCPConnection -LocalPort 5173 -State Listen` -> `Stop-Process -Id <pid>`.
- Sparse-checkout: `assets/` and `public/samples/` need `git add --sparse`;
  `/tests/fixtures/sample-batch` and `/public/examples` need re-adding on a fresh clone.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
