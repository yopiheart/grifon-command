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

## ⏭ THE SAMPLE BATCH — Neil decided 2026-08-27: do ALL of them, one wave

Preview cards live **inside the app** (One-Shot LaunchScreen, logged in), NOT on the landing
page. `SAMPLES = {}` — every card reads "Sample soon". Purpose per Neil: *"para magkaroon lang
sila ng idea ano ung pagkakaiba ng mga format."*

**12 recipes, not 13** ([recipes.ts:44](components/OneShotAd/recipes.ts#L44)). `commercial` is
locked so it needs no sample; `real_talk` is done. **10 runs to go.**

0. **The prompt fix above — FIRST.** All 10 runs pass through the same hook morph. Two rolls,
   two object-artifacts. Shipping the batch before the fix risks 10 cards with the same defect.
1. **Hero photos via `codex-image`** (gpt-image-2, billed to the ChatGPT plan — zero Claude
   quota, zero video credits). **One product cannot carry every format**: Try-On needs apparel,
   Unboxing needs packaging, Before & After needs a visible change, Watch It Work needs
   something that visibly works. A serum bottle can do none of those. Budget 4–5 invented
   brands, not 10.
2. **The 10 runs**, ordered by which card a user actually reaches for.
   **Credits: Pro = 8/month, 1 spent, 7 left. Neil's call — reset the counter as we go**, the
   same prod write done once this session (delete the `video_ads:monthly:<YYYY-MM>:<uid>` row in
   `rate_limits`). Stays Pro, so the tier UI on First Cut stays honest. He holds each reset.
3. **Cut each card to a 6–10s muted loop** — ffmpeg locally, free. One finished ad yields three
   usable clips (reveal, a talking beat, product b-roll), so a run can fill more than one slot.
4. **Make `video` optional on `RecipeSample`** ([recipes.ts:41](components/OneShotAd/recipes.ts#L41))
   so a card can ship as a STILL while its video is pending. Higgsfield mixes static and motion
   tiles in one grid; a good still beats "Sample soon". Every run already yields 8 stills.
5. **Play on scroll-into-view, not on hover.** Today desktop needs a hover and mobile shows a
   poster + Play chip ([LaunchScreen.tsx:1543](components/OneShotAd/LaunchScreen.tsx#L1543)), so
   phone users never see the one thing that sells. Higgsfield starts playback on viewport entry,
   muted, `preload="none"` — verified in their DOM.

**Where we beat them:** Higgsfield's tiles are gorgeous and anonymous — Western studio stock,
and every one is a *look*, not an *ad*: no hook, no offer, no CTA. Ours are muted too, but
SPOTLIGHT already burns the Taglish line, and a silent card reading "TIGILAN ANG PEELING!" over
a Filipina in a Filipino room tells Bryan in one second: *para sa merkado ko to.*

## ⚠ OPEN — ranked

1. **A refused scene still dies and the user must regenerate by hand** — exactly what Neil did.
   Correctly labelled now, but no auto-reroll and no user-facing explanation. Top pre-launch risk.
2. **The in-memory flag reason is generic.** [`producerOrchestrator.ts:1795`](services/producerOrchestrator.ts#L1795)
   writes `video: failed`; the true reason reaches Postgres but never the UI.
3. **Landing page has one false claim.** `ProofGallery` says real businesses ran these ads over
   CSS mockups; `/exit/proof-ad.mp4` does not exist. Copy fix, no render.
4. **Quota race in `consumeFinishedAd`** — the meter read 9/8 before this session's reset (it
   can exceed its own limit). Supabase FREE tier past grace. Cap founder invites at 5–10.

## ⚠ CARRIED
- Uncommitted junk in the repo root: `scene*.png`, `storyboard-gate.png`, `.playwright-mcp/`.
- Pulled assets live in `Desktop\oneshot-assets\`; the three approved cuts in `.tmp/` — the
  defreezer eats both. The MP4s persist in R2; re-sign rather than re-render.
- 31 branches still ahead of `main`.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
