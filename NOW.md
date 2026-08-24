# NOW — the resume doc
**Stamped: 2026-08-25** (session 34)

## ▶ NEXT ACTION — seven fixes are written and NONE has met a real render

Branch **`fix/poll-download-retry`** (7 fixes + docs, pushed, unmerged). Build clean,
**1307 tests passing**, bundle-leak 0. Every claim was verified at a seam — a stubbed fetch, a
captured prompt, a mutation test, a Postgres row. **Not one has been through a film run.**
Neil is holding spend, so the gate is his.

**Stop hunting at the seam. There is nothing left to learn there.** The next evidence has to come
from a render, and the whole sheet for it is **[`workflows/film_run_sheet.md`](workflows/film_run_sheet.md)** —
reuse `apr_fa7cedc3`'s EXACT inputs, and arm **`GRIFON_DEV_UNMETERED_VIDEO`** (the suffix matters).

## ✅ WHAT LANDED

Sessions 32/33 found "four unrelated bugs" that turned out to be one blind writer. Session 34
found that scene 4 was not a new mystery either — it is the same shape as open item 3 was.
**The count of commits is rising while the count of real causes falls.**

| # | Commit | What was actually wrong |
|---|---|---|
| 1 | `ba88f43` | Veo AND Kling fetched a finished, billed clip **once**. Two 503s killed two paid scenes. Now 3 tries, 400/1200ms; 403 and 404 still settle first try. |
| 2 | `eebb680` | Scene 8's stored `imagePrompt` literally said *"next to its outer package box"*. **The storyboard wrote the box**; the image model obeyed. |
| 3 | `e06e93f` | Commit 2 was misaimed — `text.ts:317` sends `contents: prompt`, a plain string. **The storyboard never receives the hero image.** The rule now removes the need to guess instead of forbidding it. |
| 4 | `d22c85d` | `productImageDescription` was the OFFER. `LaunchScreen:455-458` sends one field as both. The hero is now described at upload by `describeBusinessAsset`. |
| 5 | `aea27bd` | OPTION B never said the quoted line was ALL the speech, and two of its own rules demand the mouth still be moving. On a short line the only way to obey is to invent words. |
| 6 | `bf1f60f` | **The hook is not allowed to show a face.** A morph hook withholds `productUrl` by design while passing mode `both` → falls to `STRICT_NEGATIVE` while the camera mandate still demands a face. Every morph hook on a `both` scene. |
| 7 | `def2a83` | **The `both` branch was written from wording a smoke had already condemned.** See below. |

### Fix 7, because the mechanism is the lesson
`c45c018` (2026-05-08) strengthened the **`avatar`** LOCKED rule after an E2E smoke.
`6c26161` (2026-05-10) then created `DUAL_REFERENCE_LOCK` — **two days later, from the text
c45c018 had just replaced.** It does not exist in `c45c018^`, so it never inherited the fix.
Cost: run `apr_fa7cedc3` scene 4, the only `both` scene holding BOTH photos, was the only
human frame to lose the beige blouse entirely and swap the bedroom set. Scenes 2, 3, 5, 7 kept
both. Not anatomy — which is why `ANATOMICAL_LOCK` being present read as a red herring.
Same commit closes old item 3: `NO_UNSOLICITED_PRODUCT` now has a sibling in `product` and
`both`, worded for a branch that HAS a product ref (reproduce that product, nothing around it).

## ⚠ SIX THINGS THE NEXT SESSION MUST NOT REDISCOVER

- **A test that pins a prompt block's NAME pins nothing.** The old `both` test asserted only
  `toContain('DUAL_REFERENCE_LOCK')`, so a lossy rewrite of everything inside passed for three
  months. `referenceModeResolution.test.ts` now asserts a shared clause list against BOTH
  `avatar` and `both`. **Mutation-check any new prompt test the same way** — revert the clause,
  confirm the right assertions fail and the sibling stays green.
- **Scene numbering: Neil's scene N = `scene_idx` N-1.** Scene 1 is the hook, the only row with
  an `end_frame_url`. `pull-run-frames.mjs` names files by **idx**, so scene 4 is `-s03-`.
- **`slimCheckpointArtifacts` empties `businessInfo.productImageUrls` before saving** — by
  design, a transport guard against the 2mb cap. The durable copy is `input.heroImageBase64`.
  An empty array in Postgres is NORMAL. Do not read it as a lost upload.
- **`avatar_url` is NOT always dropped.** In run `apr_fa7cedc3` it holds **833,726 bytes**. The
  >700KB slim rule applies to `input`, not that column. Re-diagnose blocker #3 before repeating
  its mechanism.
- **STS re-voices the clip's OWN audio** (`consolidate.ts:107`). `scriptLine` is used only for
  caption alignment. Anything the video model improvises is real speech downstream.
- **The append-verbatim pattern works.** END-CLEAN's sentence appeared word for word in the
  stored scene-7 prompt. That is why the DIALOGUE LOCK ends with an append instruction.

## ⏭ OPEN — ranked

1. **A film run on this branch.** It tests fixes 1–7 at once. Nothing is proven until it does.
   If scene 4's blouse returns, fix 7's mechanism is confirmed; today it is still correlation
   from one `both` scene against six others.
2. **Nothing feeds a real visual description into any text stage** except fix 4's new path.
3. **Identity reference dies on reload — LAUNCH BLOCKER**, but see the `avatar_url` correction.
4. **"Presents as succeeding while failing" — LAUNCH BLOCKER.** 7 of 8 scenes died and the app
   still showed a 4s clip titled YOUR FIRST CUT. Inverted twin of issue #90.
5. **Landing page has zero video and one false claim.** `ProofGallery` says real businesses ran
   these ads over CSS mockups; `/exit/proof-ad.mp4` does not exist.
6. **Quota race in `consumeFinishedAd`** (peek → consume → mark, not atomic). **Supabase FREE
   tier past grace.** **PRO is loss-making at full use** — cap founder invites at 5–10.

## ⚠ CARRIED
- Run `apr_fa7cedc3` frames were pulled to `.tmp/run-fa7cedc3` on 2026-08-24. **`.tmp` does not
  survive the defreezer** and the only other copy is a FREE-tier Postgres. Re-pull with
  `scripts/pull-run-frames.mjs` (run id `apr_fa7cedc3-d730-441c-b6c5-e2066b4b4868`, out dir
  `.tmp/run-fa7cedc3`). **Neil runs it** — the env-warden hook blocks the agent from any
  command carrying the env-file flag. Usage header is at the top of the script.
- Scene grade stays REJECTED — the **luma term** killed it. Do not re-propose with luma.
- `real_talk` is an 8-beat TUNED skeleton → 9 scenes; **no scene-count dial exists.**
- Only Kling takes an end frame (`image_tail`). The morph hook cannot be tested on Veo.
- Two different 402s on `api/kling/video.ts` — our meter vs Kling's balance. **Read the body.**
  Kling paid: 100 points to 09-22.
- `MID_GAP_TRIM_ENABLED` ON in prod. Both image-gate flags ON, but **`VITE_` is build-time.**
- Branch `feat/hook-layout-system` (`1245d14`) still unmerged, queued for after launch.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
