# NOW — the resume doc
**Stamped: 2026-08-23** (session 32)

## ▶ NEXT ACTION — one diff closes four of tonight's five bugs

**The generation layers have no "never invent" rule. The script layer does.** That is not
four bugs, it is one gap with four symptoms, and it is the whole fix pass for tomorrow.

| Layer | Guard today |
|---|---|
| Script: price / scarcity / bonus | ✅ hard, `prompts.ts:512,940,941` — *"Do NOT invent or add any bonus that is not in the offer"* |
| Image: packaging + props | ❌ none — scene 8 rendered a HIRAYA GLOW box Neil never uploaded |
| Image: hair + wardrobe | ❌ none — plain-UGC block locks the ROOM only; `tryon` locks wardrobe too |
| Video: spoken dialogue | ❌ none — Veo improvised *"Ito nang kanina ka."* into scene 7 |

Fifth bug, unrelated and the cheapest of all: **[`poll.ts:135`](api/gemini/video/poll.ts#L135)
does a single `fetch` with no retry.** Two `veo download failed: 503` = two flagged scenes on a
clip that was already generated AND billed. `withRetry` already exists in the repo.

⛔ All four prompt edits are TUNED. Neil's explicit go, one diff, and **one layer per test**.

## ✅ WHAT LANDED — the first filmed ad under the new hook rule

**Run `apr_fa7cedc3-d730-441c-b6c5-e2066b4b4868`** — real_talk, AUTO presenter, `hero.png`
uploaded, 8 scenes storyboarded, **6 filmed**. Logged COGS **US$6.50** (~₱377), and that
UNDERCOUNTS: Kling bills in points, which `estUsd` does not track. Final MP4 is on R2 behind a
**signed URL that expires ~2026-08-24 13:00** — re-sign or download before then. Confirmed
holding on real output: the room lock, `ordinary indoor daylight`, and the W-005 hook anchor
(start = cropped performer detail, end = same performer with the bottle).

## ⚠ FIVE THINGS THE NEXT SESSION MUST NOT REDISCOVER

- **`GRIFON_DEV_UNMETERED` works.** It bypasses the meter without touching the counter, so the
  8/8 PRO wall is irrelevant locally and **no plan credits were spent tonight.** Arm it with
  `scripts/enable-dev-unmetered-video.ps1`, which sets BOTH flags including the broad one.
- **Two different 402s exist on `api/kling/video.ts`** — `quota_exceeded` (line 90, our meter)
  and `kling_balance_exhausted` (line 171, Kling's own balance). The browser shows both as a
  bare 402. **Read the body before diagnosing.** An expired Kling pack killed a whole run and
  was misread as the quota race for an hour. Kling is paid now: 100 points, valid to 09-22.
- **Only Kling takes an end frame** (`image_tail`, kling/video.ts:14). Veo has no equivalent.
  So the morph hook REQUIRES Kling — routing everything to Veo cannot test it.
- **Talking scenes go through STS, not TTS** (`api/voice/consolidate.ts:18`). STS re-voices
  Veo's OWN audio and never reads the script, so anything Veo improvises survives into the
  final mix and the trimmer correctly keeps it — it is real speech.
- **Start the dev server with `--port 5173 --strictPort`.** Without it Vite silently moves to
  5174 while the dying old process still answers on 5173 — a port probe is not a process check,
  and localStorage is per-origin, so a run key does not follow the port.

## ⏭ OPEN — ranked, with the trap in each

1. **The four-symptom diff above** + the `poll.ts` retry. Tomorrow's whole job.
2. **Identity reference dies on reload — LAUNCH BLOCKER.** `slimCheckpointInput` drops `data:`
   strings over 700KB; a 2K auto-cast avatar exceeds it and **"has never reached the database
   intact"** (`producerOrchestrator.ts:722`), so the durable `avatar_url` column never fills.
   After ONE refresh every scene fix is refused with *"Start over to re-shoot this scene"* —
   and Start over is a new run, a new credit. **Auto-cast is the RECOMMENDED default** (Neil's
   own A/B, `concierge_poc_findings.md:232`), so the recommended lane is the broken lane.
3. **"Presents as succeeding while failing" — LAUNCH BLOCKER.** 7 of 8 scenes died and the app
   still showed a 4-second one-scene video titled **YOUR FIRST CUT** with *"7 scenes ready."*
   No error, no warning. Inverted twin of [#90](https://github.com/yopiheart/grifon-command/issues/90).
4. **The hook opens on the wrong body part.** Two regenerations, two arm/shoulder close-ups on
   a script whose problem is on the FACE (beat 3 says concealer). CMO verdict: scroll-past, not
   scroll-stop — `S8` self-identification fails on an arm — plus a Meta risk, since a macro
   skin-lesion still is a visual medical claim our script guardrail bans in words only. Cause:
   the rule says *"whichever part the script's problem lives on"* and the hook line never says
   face. **Not a regenerate fix.**
5. **Landing page has zero video and one false claim.** `ProofGallery` headline reads *"THESE
   ADS WERE MADE WITH GRIFON. Real businesses RAN THEM."* over CSS mockups; `ExitIntentModal`
   points at `/exit/proof-ad.mp4`, which does not exist. `SAMPLES = {}`, all 13 recipes show
   "Sample soon". Fix the copy now; the videos come from the sample batch.
6. **Quota race in `consumeFinishedAd`.** peek → consume → mark is not atomic. Did NOT fire
   tonight (unmetered), but it is still there for the first real 8-scene customer.
7. **Supabase FREE tier is past its grace period.** Holds auth, runs, quota, billing.
8. **PRO is loss-making at full use.** 8 × ₱273 = ₱2,184 COGS vs ~₱2,140 net. The margin bets
   on breakage (~2 ads/mo). Cap the founder invites at 5–10 so the bet is cheap if wrong.

## ⚠ CARRIED
- **Scene grade stays REJECTED** — the **luma term** killed it. Do not re-propose with luma.
- `real_talk` is an 8-beat TUNED skeleton → 9 scenes, always; **no scene-count dial exists**.
  Only `before_after` / `unboxing` / `try_on` are 4-beat, and `cost:estimate` assumes 4 for all
  12. `before_after` is UGC Pro = **hard cut, no start/end frames** — it cannot test the morph.
- A scene that LOOKS differently lit is usually composition (the wide shot, the wooden vanity) —
  read the stored prompt before calling it a lighting regression, W-002.
- `MID_GAP_TRIM_ENABLED` ON in prod. Both image-gate flags ON, but **`VITE_` is build-time —
  Vercel needs a REDEPLOY**. Batch cost ₱273 per 4-scene ad.
- Sparse-excluded, fetch on demand: `baselines/locked-wins`. Sample-batch PNGs are on disk.
- Branch `feat/hook-layout-system` (`1245d14`) still unmerged, queued for after launch.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
