# NOW — the resume doc
**Stamped: 2026-08-28** (session 38)

## ▶ NEXT ACTION — one free storyboard run, THEN the seven

**Do not open the seven paid runs first.** The FLAT hook fix (`c9fe2b4`) has still never
faced a live generation, and the storyboard stage does not cost a video credit: the meter
is only touched in `api/gemini/video.ts:81`, `api/kling/video.ts:88`, and
`api/kling/omni-video.ts:98`, all via `meterVideoRequest`. Storyboard spends `images`.

So: run ONE brief to the storyboard gate, look at the hook end frame, and confirm the
problem area stayed FLAT instead of inflating into a glossy object. Free. Only then spend.

Session start: `.\scripts\restore-ffmpeg.ps1` (idempotent; skips the 32-min download if
`.tools\ffmpeg` survived). `/director-smoke` before driving the wizard, as always.

## 🎬 THE SEVEN — asset-complete today, exactly seven credits, no reset needed

| Format | Brand | Presenter |
|---|---|---|
| Unboxing | Bukid Coffee | Auto |
| Unboxing ASMR | Silid Home | Auto |
| Watch It Work | Kislap | Auto |
| Steps 1-2-3 | Timpla | Auto |
| Hype Drop | Tunog Audio | Auto |
| Rapid Fire | Lola Bising | Auto |
| **Pure Hype** | Hangin | Auto — **run this one LAST** |

Pure Hype is `producerOnly` and the producer path is opt-in (`?osaEngine=producer`,
`OneShotAd/index.tsx:19`), so the default legacy path hides it. Keep it — the only `sfx_only`
recipe, the cleanest proof of the editing preset — but run it last, the natural sacrifice.

**Blocked, a reset each:** Before & After (Buhok Lab), Try-On Reveal (Araw Wear). Both owe
`buhok-before`, `buhok-after`, `arawwear-onbody` — chain with `codex-image --edit` off one
base or the face drifts. Both upload the presenter BY HAND: `referenceImage="avatar"` and
the before/after slot share a scene, so an auto-cast face renders two people in one ad.

Neil rejected the current `before_after` model — that cut is a placeholder, re-shoot it.

## ✅ SHIPPED THIS SESSION (main, eight commits, ZERO credits spent)

- `42c2069` — **tap the tile, watch the WHOLE ad, with the voiceover.** The loop is 25.6%
  of the ad and silent; a `Maximize2` control opens a 9:16 modal playing the full 35.33s
  unmuted. Needs a `full` in `SAMPLES` — **so every one of the nine owes TWO files, the
  short tile cut and a `<recipe>-full.mp4`.** Verified: audio really decodes (275308 bytes).
- `1eb073a` `9878880` — **card chrome is tied to the renderer.** `drawPlan.ts:52` reserves
  `SZ_BOTTOM = 0.22`, so nothing is burned below `0.78h`; the name overlay is capped at
  `h-[22%]` and can never cover a caption. Measured 0.219 at 1440 and 390. Description
  moved out of the frame, `line-clamp-2` + `min-h` keeps a row level.
- `a837b29` — **gallery left the composer's `max-w-4xl`.** Tiles were ~170px and never grew
  with the monitor; now `max-w-7xl` + 4 columns = 311px measured. Composer untouched at 896.
- `6c7b7a2` — **`real_talk` re-cut**: `540x960 @ 386kbps` → `720x1280 @ ~1345kbps`, and
  `17.47-26.50` instead of `13.97-22.03` so it opens on the sentence and lands on the
  product. No render: the 1080p source came back out of R2.
- `c3604e3` — `scripts/pull-run-final.mjs`, and `79c0b8a` — `MEDIA_STORE` + `R2_*` in
  `.env.example`, which never listed them.

## 🔑 THE THING THAT SAVES MONEY

A finished run's mp4 is in R2 and `artifacts.finalVideoUrl` is a PRESIGNED url whose
signature expires. An old run looks unrecoverable while the object sits untouched. 403 =
expired signature, 404 = actually gone. **Never re-render to get a file you already own.**

The pull needs Neil's own terminal — the agent's env access is walled:
`node --env-file=<the env file> scripts/pull-run-final.mjs <run_id> .tmp/<name>.mp4`

Cut settings and the scene-cut finder are printed by `restore-ffmpeg.ps1`.

## ⚠ OPEN — ranked

1. **Nine empty tiles now dominate the gallery.** At 311px the missing samples are the
   biggest thing on the page. This is the cost of the bigger tiles and the reason the
   seven runs matter more than they did yesterday.
2. **A refused scene still dies** and the user regenerates by hand. Top pre-launch risk.
3. **Landing page has one false claim.** `ProofGallery` says real businesses ran these ads;
   `/exit/proof-ad.mp4` does not exist. Copy fix, no render.
4. **Quota race in `consumeFinishedAd`** — the meter can exceed its own limit.
5. **This PC's clock is skewed.** `[rateLimit] JWT issued at future` ran the limiter on its
   in-memory backstop all session. `w32tm /resync` before trusting any metering test.

## ⚠ CARRIED
- **Vite does not serve a file dropped into `public/` after the dev server started** — it
  returns the SPA fallback `index.html`, so a new sample plays nothing and looks like a code
  bug. Restart the dev server after adding one. Cost a full smoke cycle on 2026-08-28.
- Sparse-checkout needs `/tests/fixtures/sample-batch/` re-added on a fresh lite clone.
- `winget` is a dead stub on cafe PCs. `drawPlan.snapshot.test.ts.snap` shows modified but
  has zero content diff — it is a CRLF artifact, leave it.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
