# NOW — the resume doc
**Stamped: 2026-08-30** (session 41)

## ▶ NEXT ACTION — one unboxing run, to eyeball THREE unverified fixes at once

Nothing below has been seen on a pipeline render. The run checks all three together:

1. **Does the S2 pair read as ONE shot?** Same room, same person, same camera in start
   and end. Target committed at `assets/reference/unboxing/` — compare against it.
2. **Does the reveal finish?** The unbox scene should now run ~1.5s longer.
3. **Any fake wordmark, any hand over a label?** (`26a69ad`, still unseen.)

Setup after a reboot: `restore-ffmpeg.ps1`, `enable-dev-unmetered-video.ps1`, `npm run dev`.
Run at `/app?osaEngine=producer`, Bukid Coffee / 280 / Unboxing / product / Auto, BOTH photos
(`bukid-hero.jpg` + `bukid-packaging.jpg`; packaging slot required). Offer text is in
`sample_brand_briefs.md` §1 — **paste it, 153 chars**; a past run typed 113 and lost the first
sentence. Smoke login: `workflows/expert_manual_mode.md:440`.

## ✅ SHIPPED — 5 commits, pushed to `claude/eval-managed-agents-vr01gs`

- `4bc850d` — **CONTINUITY_LOCK.** The end frame now receives the START frame as a third
  reference. It never had it: `renderEndFrame` passed only `{avatarUrl, productUrl}`, so
  two stills of ONE shot were generated blind to each other and landed in different rooms
  at different distances (Neil: *"magiging magic/blink"*). The ordinal is COMPUTED, not
  hard-coded — "Reference Image N" is positional and a stale ordinal has bitten this file
  twice. Camera rotation suppressed when a continuity frame is present, or the prompt would
  contradict itself. Orthogonal to `referenceImageMode`; absent = zero behavior change.
- `7cb2020` + `29fe7eb` — **the action hold.** Every scene was cut the instant the VO
  stopped, so a 5s unbox clip ran 2.77s and the pouch never came out. Gated on
  `hasEndFrame` (a frame PAIR = a motion), NOT on scene type — the narrowing is Neil's, to
  keep silent no-action scenes from gaining dead air.
- `f43388c` — **tripwire.** The hold is unboxing-only only because `prompts.ts` bans a frame
  pair everywhere else; that scoping lives in a prompt and the code needing it two files away,
  so a test now fails if anyone widens it.
- `cecc321` — the approved start/end pair + README, JPEG at 196 KB.

## 🔴 THE PROCESS FINDING — "VERIFIED" was claimed on a sample of ONE
Session 40 marked the blank-wordmark fix verified. It failed again today and one REGENERATE
brought it back, so `bbbed45` **moved the odds and never pinned them** — a 🎲, not a 🔒. Three
hypotheses died first (truncation 187+198<400; avatar slot identical in both runs; a `26a69ad`
regression, refuted by the regenerate). One run is not verification on a generative pipeline.

## 📐 THE CUT MECHANISM — measured off the MP4, not inferred
Every scene sat on its voice end; s0 was +0.50, the hook's `revealHoldSec` exactly, which is
what named it. 21s generated, 13.6s kept, **7.4s of paid footage binned.** The EDL's own
`keepSegments` is computed then DISCARDED unless `audioMode === 'sfx_only'`. Numbers: `7cb2020`.

## ⚠ TUNED LIST — still needs Neil's go
1. **Pinned claim** for FEATURE FILTER. "unang 50 lang" has now dropped 4 runs straight.
2. **Route `objectionToUs`** (+ `bigIdea`, `deepFear`, `statusUpgrade`) into the script stage.
   Market Research already produces them; the ad-script prompt never sees them.

## ⚠ OPEN — ranked
1. **Garbled label SUB-LINE — known, deliberately deferred by Neil 2026-08-30.** The wordmark
   renders clean but the line under it does not: "Barake Medium Raast 250g" for "Barako Medium
   Roast 250g", worse on the end frame. The image gate PASSED all 4 scenes with zero flags and
   always will: `expectedLabelText` is `run.input.productName` alone
   ([producerOrchestrator.ts:1830](services/producerOrchestrator.ts#L1830)), so the gate reads
   the brand name, matches it, and never looks at the sub-line. Scope gap, not a gate defect.
   A customer sees this on a pause — do not ship the nine samples with it.
2. The fixes at the top — storyboard read right on 2026-08-30, video not yet measured. Two
   smaller things in that same storyboard: the box SHIFTS between start and end frame (it
   should stay put, only the pouch appears), and S2 says "punit" while the shot opens a FLAP.
3. **No script gate exists.** Build it AFTER TUNED #2 — a gate hunting for a claim the
   script was never given is pointless.
4. **A refused scene still dies** and the user regenerates by hand. Top pre-launch risk.
5. **Landing page has one false claim** — `ProofGallery` says real businesses ran these ads.
6. **Quota race in `consumeFinishedAd`** — the meter can exceed its own limit.
7. **Fan-out scene: paid but uncollected** if the tab closes mid-run. Parked, roadmap #29.

## ⚠ CARRIED
- **UNANSWERED: is this branch Vercel's Production source?** The deploy list showed
  "Environment Production" against a feature branch. If yes, every push here is a deploy.
- **The agent cannot read `.env`** (ENV WARDEN), so `scripts/pull-run-*.mjs` needs Neil's
  own terminal. Postgres via the Supabase MCP works fine and did all today's forensics.
- Branch is 15 commits ahead of `main`, still NOT merged. Merge after the eyeball.
- **Vite will not serve a file dropped into `public/` after the dev server started.** Check
  the CONTENT TYPE, never the status code — the SPA fallback also answers 200.
- **NEVER pipe `npm run dev` into `head`.** `head` closes the pipe once it has its lines and
  the EPIPE kills vite — twice tonight, the second time within 2 minutes, and it dies with
  `code: 'ECONNRESET'` + `exited with code 0`, which reads like a clean shutdown. Redirect to
  a log file and `cat` the log; do not probe the server with `curl` to check it is up.
- **A dead `npm run dev` leaves a vite child holding the port.** The restart then lands on
  5174 while 5173 still answers (sometimes with OLD code, sometimes not at all). Free it with
  `Get-NetTCPConnection -LocalPort 5173 -State Listen` -> `Stop-Process -Id <OwningProcess>`.
- Sparse-checkout: `assets/` needs `git add --sparse`; `/tests/fixtures/sample-batch` and
  `/public/examples` need re-adding on a fresh clone (both pulled today).

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
