# NOW — the resume doc
**Stamped: 2026-08-27** (session 36)

## ▶ NEXT ACTION — one line in a TUNED prompt, before any new sample run

The hook morph turns a FLAT problem area into a 3D OBJECT. Two independent rolls on the same
scene, same failure class: a cluster of peanuts stuck to the cheek, then a raised glossy
blister. Both sat under the caption for ~1.5s of a 3s hook.

The rule at [`api/_lib/prompts.ts:1735`](api/_lib/prompts.ts#L1735) says the START frame is a
cropped detail of the performer and the END frame is that same performer holding the product.
It never says **the problem area must stay flat and must not become an object**, so the model
fills the gap between "textured patch" and "woman holding bottle" by growing the patch.

⛔ TUNED file — propose the line, get Neil's per-diff yes, never edit it and report after.
This blocks the sample batch: every new sample run passes through the same morph.

## 🎬 THE PRODUCER PATH IS PROVEN END TO END

Run `apr_34d06c7f` (Hiraya Glow, Real Talk Review, **auto-cast presenter**) reached FIRST CUT on
**grifon.ai**, 8 scenes, `final_render` done. Neil's verdict: *"pati ung pag bigkas, lipsync!
Solid!"* — character consistency, wardrobe/set, legible label, clean resolve. Fixes 1 and 5 met
video at last. Three cuts saved in `.tmp/` (RAW / EDITED / EDITED WITH NEW HOOK).

The URL is still flag-gated: `https://grifon.ai/app?osaEngine=producer` (`?osaEngine=steps`
reverts). Client-side only — no rebuild needed, but the defreezer wipes `localStorage`.

## ✅ SHIPPED THIS SESSION (main, deployed to prod)

`e11535e` — **the watchdog was killing renders that were still working.** ffmpeg runs under
`spawnSync`, which blocks the event loop, so the heartbeat PUT can never leave the process; a
120s gap therefore failed EVERY render over two minutes. Raised to 330s to clear the 300s
`maxDuration` in vercel.json. A live 134s render had been declared dead twice, the second time
8 seconds before it wrote a finished 11.3MB MP4. Also: a Veo RAI refusal now separates from
`VEO_NO_OUTPUT` and stops taking the re-render path. Tests pin both.

`34cbaef` — `scripts/pull-run-input.mjs`: pull a run's hero photo, presenter and typed brief
back out of `producer_runs`. Sibling of `pull-run-frames.mjs`.

## ⏭ THE SAMPLE PLAN — decided with Neil, do it in this order

Preview cards live **inside the app** (One-Shot LaunchScreen, logged in), NOT on the landing
page. `SAMPLES = {}` — all 13 recipes still read "Sample soon". Purpose per Neil: *"para
magkaroon lang sila ng idea ano ung pagkakaiba ng mga format."*

1. **Prompt fix above.** Nothing else runs first.
2. **Cut samples from the ad we already have — free, no credit, no meter.** The card wants a
   6–10s muted loop, not 35s: three usable clips live in one finished ad (bottle reveal,
   a talking beat, product b-roll). ffmpeg locally. This also makes the blister moot — no short
   cut has to contain the morph.
3. **Fill every empty card, video where we have it, STILL where we don't.** Higgsfield mixes
   static and motion tiles in one grid; a good still beats "Sample soon". Needs a small change:
   `RecipeSample` requires both `video` and `poster` ([recipes.ts:41](components/OneShotAd/recipes.ts#L41)) —
   make `video` optional and branch the render. Every run already yields 8 stills.
4. **Play on scroll-into-view, not on hover.** Today desktop needs a hover and mobile shows a
   poster + Play chip ([LaunchScreen.tsx:1543](components/OneShotAd/LaunchScreen.tsx#L1543)), so
   phone users never see the one thing that sells. Higgsfield starts playback on viewport entry,
   muted, `preload="none"` — verified in their DOM.
5. **Then batch the remaining formats — 4 this month, MAX.** Pro = 8 video ads/month, 1 spent.
   13 recipes cannot be done in one wave; that is arithmetic, not preference.

**Where we can beat them:** their tiles are gorgeous and anonymous — Western studio stock, and
every one is a *look*, not an *ad*. No hook, no offer, no CTA. Ours are muted too, but SPOTLIGHT
already burns the Taglish line. A silent looping card reading "TIGILAN ANG PEELING!" over a
Filipina in a Filipino room tells Bryan in one second: *para sa merkado ko to.*

## ⚠ OPEN — ranked

1. **A refused scene still dies and the user must regenerate by hand** — exactly what Neil did.
   Correctly labelled now, but no auto-reroll and no user-facing explanation. Top pre-launch risk.
2. **The in-memory flag reason is generic.** [`producerOrchestrator.ts:1795`](services/producerOrchestrator.ts#L1795)
   writes `video: failed`; the true reason reaches Postgres but never the UI.
3. **Landing page has one false claim.** `ProofGallery` says real businesses ran these ads over
   CSS mockups; `/exit/proof-ad.mp4` does not exist. Copy fix, no render.
4. **Quota race in `consumeFinishedAd`** — the meter read 9/8 before this session's reset.
   Supabase FREE tier past grace. Cap founder invites at 5–10.

## ⚠ CARRIED
- `video_ads` counter was reset on prod with Neil's yes (was 9/8, 0 credits). Now 1 of 8 used.
- Uncommitted junk in the repo root: `scene*.png`, `storyboard-gate.png`, `.playwright-mcp/`.
- Desktop assets pulled from Postgres live in `Desktop\oneshot-assets\` — the defreezer eats them.
- 31 branches still ahead of `main`.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
