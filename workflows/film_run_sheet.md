# Film run sheet — the branch `fix/poll-download-retry`

**Written 2026-08-25 (session 34).** Seven fixes are committed and pushed; not one has been
through a render. This sheet is the run that tests all seven at once. Follow it top to bottom.

---

## 0. The one rule that makes this a test instead of a dice roll

**Reuse the EXACT inputs of run `apr_fa7cedc3`.** Same brand, same hero photo, same presenter,
same offer, same price.

A generative pipeline returns a *distribution*, not an answer. With a new brand and a new photo,
a good scene 4 proves nothing — it could be the fix or it could be a lucky roll. With identical
inputs, the only thing that changed is our code, and the frames become evidence. This is the same
trap `workflows/locked_wins.md` exists to document (🎲 LUCK vs 🔒 CODE).

Corollary: **leave "Force fresh" UNTICKED.** The research cache is keyed on `brandName`
([LaunchScreen.tsx:449](../components/OneShotAd/LaunchScreen.tsx#L449)), so the same brand reuses
the same research. One less variable, and one less paid Gemini call.

---

## 1. Pre-flight (Neil's hands — the env-warden hook blocks the agent here)

```powershell
.\scripts\enable-dev-unmetered-video.ps1
npm run dev -- --port 5173 --strictPort
```

⚠ **CORRECTED 2026-08-27 — you need BOTH flags, and the script above already sets both.**
This sheet used to say `GRIFON_DEV_UNMETERED` (no suffix) was "not a real key". It is one:
[api/_lib/quota.ts](../api/_lib/quota.ts) reads it to bypass **all monthly meters** — images,
reports, captions — and a storyboard renders 6+ scene images before any video. Neil burned
images 150/150 mid-smoke on 2026-06-21 for exactly this reason.

`GRIFON_DEV_UNMETERED_VIDEO` is the other half — the video 402 quota and the 429 hourly
rate-limit, read at [api/gemini/video.ts](../api/gemini/video.ts) and the Kling pollers.
Arm only one and the run dies partway on the meter you skipped; the 429 window then locks
the account for ~50 minutes. Run the script rather than setting either by hand.

**Restart the dev server after setting it** — it is read at server start, not per request.

Balance check before starting: **Kling has 100 points, good to 09-22.** Only Kling accepts an end
frame (`image_tail`), so the morph hook cannot be tested on Veo.

---

## 2. The brief

One-Shot, **Product** vertical. Every field below is required by the launch gate at
[LaunchScreen.tsx:434](../components/OneShotAd/LaunchScreen.tsx#L434).

| Field | Value |
|---|---|
| Vertical | **Product** |
| Hero photo | The original **product-in-hand** shot from `apr_fa7cedc3` — held in a hand, not a packshot, label readable |
| Offer | The original offer text |
| Brand name | **Character-for-character identical** — this is the research cache key |
| Price | The original price |
| Presenter | The original presenter setup |
| Voice | Any — no fix in this branch touches voice |
| Force fresh | **Leave unticked** |

**Do NOT run Market Research separately.** Unlike the 8-step Director wizard, One-Shot runs it
inside the pipeline ([producerOrchestrator.ts:1415](../services/producerOrchestrator.ts#L1415)).

**The three `director-smoke` rules still bind:** hero image FIRST, the brand is DERIVED from the
label on that photo, and no brand/offer field is ever hand-typed to "just test quickly."

### If the original photos are gone

They live in Postgres on a FREE-tier project. `avatar_url` still held **833,726 bytes** as of
2026-08-24. Neil runs this (the agent is blocked from any command carrying the env-file flag):

```
node --env-file=.env scripts/pull-run-frames.mjs apr_fa7cedc3-d730-441c-b6c5-e2066b4b4868 .tmp/run-fa7cedc3
```

That recovers the scene stills. The *input* hero and avatar are separate columns on
`producer_runs` (`input.heroImageBase64`, `avatar_url`) and need their own query — ask the agent
to write it before the run rather than improvising at the keyboard.

---

## 3. What each fix predicts

The run is only a test if the predictions are written down first. Grade against these.

| Fix | Prediction if the fix works |
|---|---|
| 1 `ba88f43` | No scene dies on a transient 503 while downloading a finished clip. |
| 2+3 `eebb680` `e06e93f` | No stored `imagePrompt` invents packaging the hero photo does not show. |
| 4 `d22c85d` | The product's description is what the photo LOOKS like, not the offer text. |
| 5 `aea27bd` | Talking scenes speak the script line and stop — no improvised extra words. |
| 6 `bf1f60f` | **Scene 1 (the hook) opens on the performer, not on bare skin.** |
| 7 `def2a83` | **Scene 4 keeps the blouse and the light-wood bedroom** — and no scene shows a carton beside the bottle. |

### The two frames that answer fix 7

- **Scene 4** (`scene_idx` 3, file `-s03-`) — the only `both` scene holding both photos. In
  `apr_fa7cedc3` it was the ONLY human frame to lose the wardrobe entirely and swap to a dark
  walnut set with a freestanding vanity mirror. Scenes 2, 3, 5 and 7 all kept the beige blouse and
  the light-wood bedroom.
- **Scene 8** (`-s07-`) — had an invented HIRAYA GLOW carton standing beside the bottle.

**Scene numbering: Neil's scene N = `scene_idx` N-1.** Scene 1 is the hook, the only row carrying
an `end_frame_url`.

---

## 4. Hard stops — pause and report, do not push past

- The yellow **VISUAL ASSETS MISSING** banner. It is a stop, not a warning.
- Any field showing `[object Object]` or blank after prefill. That is a real bug.
- **A scene that failed while the app still reports success.** This is launch blocker #4 in
  NOW.md — in `apr_fa7cedc3`, 7 of 8 scenes died and the UI still presented a 4s clip titled
  YOUR FIRST CUT. If it happens again, capture what the UI claimed *and* what the run actually
  produced, because that pair is the bug report.

---

## 5. After the run

1. Pull the frames (command in §2) and compare scene 4 and scene 8 against
   `.tmp/run-fa7cedc3` if that directory still exists — otherwise against the description in §3.
2. Grade each of the seven predictions: met / not met / not exercised.
3. **Any frame Neil approves goes into `workflows/locked_wins.md` the same day**, with the run id,
   the verbatim prompt, and a committed copy of the frame. Approved stills exist ONLY in
   `producer_scenes` on a free-tier database; that register is the reason a 2026-08-13 approval
   could not be found three sessions later.
4. Rewrite `NOW.md` (overwrite, max 90 lines) with what the render actually proved.
