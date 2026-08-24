# NOW — the resume doc
**Stamped: 2026-08-24** (session 33)

## ▶ NEXT ACTION — six fixes are written and NONE has met a real render

Branch **`fix/poll-download-retry`** (6 commits, pushed, unmerged). Build clean, **1297 tests
passing**. Every claim below was verified at a seam — a stubbed fetch, a captured prompt, a
Postgres row. **Not one has been through a film run.** Neil is holding spend, so the gate is his.

One thing still needs him at a keyboard first: **scene 4's frame.** The env-warden hook blocks
any command containing `.env`, so the pull is his to run, not the agent's:

```
node --env-file=.env scripts/pull-run-frames.mjs apr_fa7cedc3-d730-441c-b6c5-e2066b4b4868 .tmp/run-fa7cedc3
```

Scene 4 is the file named `-s03-`. Open it beside scene 5 (`-s04-`, which came out fine).

## ✅ WHAT LANDED — one blind writer, not four unrelated bugs

Session 32 called it "the generation layers have no never-invent rule." Half right. The rule was
missing, but the deeper cause is that **the storyboard writes product visuals blind.**

| # | Commit | What was actually wrong |
|---|---|---|
| 1 | `ba88f43` | Veo AND Kling fetched a finished, billed clip **once**. Two 503s killed two paid scenes. Now 3 tries, 400/1200ms; 403 and 404 still settle first try. |
| 2 | `eebb680` | Scene 8's stored `imagePrompt` literally said *"next to its outer package box"*. **The storyboard wrote the box**; the image model obeyed. |
| 3 | `e06e93f` | Commit 2 was misaimed — `text.ts:317` sends `contents: prompt`, a plain string. **The storyboard never receives the hero image.** The rule now removes the need to guess instead of forbidding it. |
| 4 | `d22c85d` | `productImageDescription` was the OFFER. `LaunchScreen:455-458` sends one field as both. The hero is now described at upload by `describeBusinessAsset` — the same call the guided slots already made. |
| 5 | `aea27bd` | OPTION B never said the quoted line was ALL the speech, and two of its own rules ("ends on the next breath", "Last frame = next syllable") demand the mouth still be moving. On a short line the only way to obey is to invent words. |
| 6 | `bf1f60f` | **The hook is not allowed to show a face.** A morph hook withholds `productUrl` by design while passing mode `both`, which needs both photos → falls to `STRICT_NEGATIVE` ("NO faces, NO skin, NO hands") while the camera mandate still demands a face. Every morph hook on a `both` scene, not just this run. |

## ⚠ FIVE THINGS THE NEXT SESSION MUST NOT REDISCOVER

- **Scene numbering: Neil's scene N = `scene_idx` N-1.** Scene 1 is the hook, the only row with
  an `end_frame_url`. `pull-run-frames.mjs` names files by **idx**, so scene 4 is `-s03-`. This
  cost a full round of wrong conclusions.
- **`slimCheckpointArtifacts` empties `businessInfo.productImageUrls` before saving** — by
  design, a transport guard against the 2mb cap. The durable copy is `input.heroImageBase64`.
  An empty array in Postgres is NORMAL. Do not read it as a lost upload.
- **Correction to session 32:** `avatar_url` is **NOT** always dropped. In this run the column
  holds **833,726 bytes**. The >700KB slim rule applies to `input`, not that column. Re-diagnose
  launch blocker #2 before repeating its mechanism.
- **STS re-voices the clip's OWN audio** (`consolidate.ts:107` — `extractAudioFromMp4` →
  `convertSts`). `scriptLine` is used only for caption alignment. Anything the video model
  improvises is real speech downstream and the trimmer is right to keep it.
- **The append-verbatim pattern works.** END-CLEAN's sentence appeared word for word in the
  stored scene-7 prompt. That is why the DIALOGUE LOCK ends with an append instruction — the
  video model never sees the instruction block, only the prose the writer emits.

## ⏭ OPEN — ranked

1. **A film run on this branch.** It tests fixes 1–6 at once. Nothing is proven until it does.
2. **Scene 4 is still unexplained.** It was the other `both` scene but it HAD both photos, so
   fix 6 does not cover it. Clean prompt, both refs, `ANATOMICAL_LOCK` present, wrong output.
   Needs the frame.
3. **`NO_UNSOLICITED_PRODUCT` exists only in the `avatar` branch** of `generateSceneImage`. The
   `product` and `both` branches never got the sibling rule.
4. **Nothing feeds a real visual description into any text stage** except fix 4's new path.
5. **Identity reference dies on reload — LAUNCH BLOCKER**, but see the correction above.
6. **"Presents as succeeding while failing" — LAUNCH BLOCKER.** 7 of 8 scenes died and the app
   still showed a 4s clip titled YOUR FIRST CUT. Inverted twin of issue #90.
7. **Landing page has zero video and one false claim.** `ProofGallery` says real businesses ran
   these ads over CSS mockups; `/exit/proof-ad.mp4` does not exist.
8. **Quota race in `consumeFinishedAd`** (peek → consume → mark, not atomic). **Supabase FREE
   tier past grace.** **PRO is loss-making at full use** — cap founder invites at 5–10.

## ⚠ CARRIED
- Scene grade stays REJECTED — the **luma term** killed it. Do not re-propose with luma.
- `real_talk` is an 8-beat TUNED skeleton → 9 scenes; **no scene-count dial exists.**
- Only Kling takes an end frame (`image_tail`). The morph hook cannot be tested on Veo.
- Two different 402s on `api/kling/video.ts` — our meter vs Kling's balance. **Read the body.**
  Kling paid: 100 points to 09-22. `GRIFON_DEV_UNMETERED` works; arm it before any local run.
- Start dev with `--port 5173 --strictPort`. A port probe is not a process check.
- `MID_GAP_TRIM_ENABLED` ON in prod. Both image-gate flags ON, but **`VITE_` is build-time.**
- Branch `feat/hook-layout-system` (`1245d14`) still unmerged, queued for after launch.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
