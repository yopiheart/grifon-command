# NOW — the resume doc
**Stamped: 2026-08-30** (session 41)

## ▶ NEXT ACTION — one unboxing run, to eyeball THREE unverified fixes at once

Nothing below has been seen on a pipeline render. The run checks all three together:

1. **Does the S2 pair read as ONE shot?** Same room, same person, same camera in start
   and end. Target committed at `assets/reference/unboxing/` — compare against it.
2. **Does the reveal finish?** The unbox scene should now run ~1.5s longer.
3. **Any fake wordmark, any hand over a label?** (`26a69ad`, still unseen.)

Setup: dev server EXITED, restart `npm run dev` (was :5173). `.\scripts\restore-ffmpeg.ps1`
and `.\scripts\enable-dev-unmetered-video.ps1` are already done but die on reboot.
Run at `/app?osaEngine=producer`, Bukid Coffee / 280 / Unboxing / product / Auto, BOTH
photos (`bukid-hero.jpg` + `bukid-packaging.jpg`, packaging slot is required). Full offer
text is in `workflows/sample_brand_briefs.md` §1 — **paste it, 153 chars**; a past run typed
113 and silently lost the first sentence. Smoke login: `workflows/expert_manual_mode.md:440`.

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
- `f43388c` — **tripwire.** The hold is unboxing-only because `prompts.ts` bans a frame pair
  everywhere else ("UNBOXING S2 only"). That scoping lives in a prompt and the code depending
  on it lives two files away, so a test now fails if anyone widens it.
- `cecc321` — the approved start/end pair + README, JPEG at 196 KB.

## 🔴 THE PROCESS FINDING — "VERIFIED" was claimed on a sample of ONE

Session 40 recorded the blank-wordmark fix as verified. It failed again today, and one
REGENERATE brought it back. So `bbbed45` **moved the odds and never pinned them** — a 🎲,
not a 🔒. Three hypotheses died before that was clear (truncation: 187+198<400; avatar slot:
identical in both runs; a regression from `26a69ad`: refuted by the regenerate). `locked_wins.md`
already says a good frame proves only that it CAN recur. One run is not verification here.

## 📐 THE CUT MECHANISM — measured, not inferred

ffprobe on the delivered MP4 (`apr_bed3c4d2`) vs the four VO MP3s: cuts at 2.90 / 5.667 /
9.033, total 13.600s; VO ends 2.400 / 2.880 / 3.280 / 6.037. Every scene sat on its voice
end, and s0 is +0.50 on its VO — the hook's `revealHoldSec` exactly, which is what named the
mechanism. 21s generated, 13.6s kept, **7.4s of paid footage binned.** Note the EDL's own
`keepSegments` (`scriptLine.length/18`) is computed then DISCARDED on any voiced run — it is
read only when `audioMode === 'sfx_only'`. Full numbers in `7cb2020`.

## ⚠ TUNED LIST — still needs Neil's go
1. **Pinned claim** for FEATURE FILTER. "unang 50 lang" has now dropped 4 runs straight.
2. **Route `objectionToUs`** (+ `bigIdea`, `deepFear`, `statusUpgrade`) into the script stage.
   Market Research already produces them; the ad-script prompt never sees them.

## ⚠ OPEN — ranked
1. The three unverified fixes at the top.
2. **No script gate exists.** Build it AFTER TUNED #2 — a gate hunting for a claim the
   script was never given is pointless.
3. **A refused scene still dies** and the user regenerates by hand. Top pre-launch risk.
4. **Landing page has one false claim** — `ProofGallery` says real businesses ran these ads.
5. **Quota race in `consumeFinishedAd`** — the meter can exceed its own limit.
6. **Fan-out scene: paid but uncollected** if the tab closes mid-run. Parked, roadmap #29.

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
