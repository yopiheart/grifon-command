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

Pure Hype is `producerOnly: true` and the producer path is opt-in (`?osaEngine=producer`,
`components/OneShotAd/index.tsx:19`), so a customer on the default legacy path cannot see
it today. Keep it — it is the only `sfx_only` recipe, the cleanest proof of the editing
preset — but run it last, so it is the natural sacrifice if an earlier run needs a retry.

**Blocked, needs a reset each:** Before & After (Buhok Lab) and Try-On Reveal (Araw Wear).
Both owe person assets that do not exist: `buhok-before`, `buhok-after`, `arawwear-onbody`.
Chain them with `codex-image --edit` off one base or the face drifts — the old Hiraya set
is the cautionary tale. Both also upload the presenter BY HAND: the storyboard puts
`referenceImage="avatar"` and the before/after slot on the SAME scene, so an auto-cast face
renders two different people in one ad.

Neil also wants `before_after` re-shot entirely — he rejected the current model. The cut
now shipping is a placeholder.

## ✅ SHIPPED THIS SESSION (main, seven commits, ZERO credits spent)

- `1eb073a` `9878880` — **the card chrome is now tied to the renderer.** `drawPlan.ts:52`
  reserves `SZ_BOTTOM = 0.22`, so nothing is ever burned below `0.78h`. The card's name
  overlay is capped at `h-[22%]`, which means it can never cover a burned caption on any
  clip or preset, including the nine not yet made. Measured 0.219 at both 1440 and 390.
  Description moved out of the frame; `line-clamp-2` + `min-h` makes every card in a row
  the same height.
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
- Sparse-checkout needs `/tests/fixtures/sample-batch/` re-added on a fresh lite clone.
- `winget` is a dead stub on cafe PCs. `drawPlan.snapshot.test.ts.snap` shows modified but
  has zero content diff — it is a CRLF artifact, leave it.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
