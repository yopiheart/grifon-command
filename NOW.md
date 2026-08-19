# NOW — the resume doc
**Stamped: 2026-08-19** (session 29)

## ▶ NEXT ACTION — one Real Talk storyboard run, then the film run

**Do this first, it is free-ish and takes one sitting.** Confirm Vercel PRODUCTION is on
`35cd3ed`, then run ONE storyboard-only `real_talk` at
`grifon.ai/app?osaEngine=producer` — same Hiraya Glow brief, AUTO presenter, TALENT
Filipino, and `tests/fixtures/sample-batch/hero.png` as the only upload. **Stop at the
storyboard gate.** Images bill against the 150/month image meter, not a video credit.

One question only: **are all the scenes that SHOW the performer in the SAME room?**
The product macro shot is exempt by design. Scene 1 opening amber is CORRECT, not a bug
(the hook's anchor colour is derived from the product, and the bottle is amber).

**Then the film run**, which needs a credit decision first (see below). It settles three
open things in one payment: the half-face crop on close-ups, the camera framing across
scenes, and whether scene 1's morph goes to goo (issue #92, predicted — see the log).

📕 **Read [`workflows/lighting_fix_2026-08-19.md`](workflows/lighting_fix_2026-08-19.md)
before touching any format.** It carries the per-format expectations table, the run IDs
and how to reopen a run, the open bugs, and the method lessons. This file is the pointer;
that file is the knowledge.

## ✅ WHAT LANDED — lighting is fixed, and it is confirmed in the output

Two commits, two different causes, both verified against real storyboard runs:

- **`b1632b0`** — `Lighting/mood for that spot` was in the **REQUIRED** list of every
  avatar-scene prompt, and the worked example ended *"warm afternoon sunlight."* Every
  beat was INSTRUCTED to invent its own light. Untouched since 2026-05-09. Now: ordinary
  ambient room light, the same in every scene. The model's own stored prompts now end
  with the exact phrase `ordinary indoor daylight`.
- **`35cd3ed`** — the plain-UGC strategy block was the ONLY one in the file with no place
  rule, so a Real Talk performer walked hallway → sala → bedroom → kitchen. The "warm"
  scene 3 was a **wooden vanity table**, not warm light; its own prompt read
  `ordinary indoor daylight` and obeyed. Also scoped the light ban to the LIGHT (a warm
  smile and an amber bottle are legal again) and banned `studio`.

Neil, on the first clean storyboard: *"BROOO THIS IS ABSOLUTE CINEMA."*

## 🔴 SCENE GRADE — REJECTED, flag off, code stays dark

`22ca43b` wired `SCENE_GRADE_ENABLED` with tests and a free ffmpeg harness. Neil watched
a real render and said no: *"ang dilim at mukang patay na ad."* The env var is deleted on
Vercel. **The luma term is what killed it** — it pulls every scene to the median, so no
scene may be brighter than the middle and all four converge downward. Do not re-propose
without dropping luma entirely. Do not re-propose grey-world either (measured and thrown
away in session 28).

## ⏭ OPEN — ranked, with the trap in each

1. **Auto-cast slop** (Neil's standing request, never implemented). Three drivers in
   `generateAvatarImage`: `ALWAYS Commercial Beauty Lighting`, a retouch layer, and a
   negative list banning every real-face marker. ⚠️ **Neil LIKES the lighting and dislikes
   the sameness of the FACE.** Attack the retouch layer and the texture bans only.
2. **Floating product.** The image gate makes six observations and none covers hand
   contact. Copy the `BAG_ORIENTATION_RULE` pattern + add a 7th gate observation.
3. **Quota race in `consumeFinishedAd`.** peek → consume → mark is not atomic while scenes
   fan out in parallel. One 4-scene run produced 3 submissions, one 402, and jumped the
   counter to 8/8. An owner never notices; the first 8-scene customer will.
4. **Neil is at 8/8 video ads on PRO.** Any film run needs a credit decision first.
5. **Supabase FREE tier is past its grace period.** It holds auth, runs, quota, billing.

## ⚠ CARRIED
- **`onbody.png` / `inuse.png` are still the 2026-07-11 files** and measurably warmer
  (VAVG 141.3 vs the rebuilt pair's 134.9) and 15 units darker. Used by Try-On, Watch It
  Work, Steps 1-2-3. If warmth returns there, suspect the ASSET first.
- `tests/fixtures/sample-batch` is the ONLY fixture set; `-v2` was older than it and is
  deleted (`af0be7a`). Sparse-excluded here: `git sparse-checkout add tests/fixtures/sample-batch`.
- `MID_GAP_TRIM_ENABLED` is ON in production (confirmed by Neil this session).
- **Branch `feat/hook-layout-system` (`1245d14`, pushed, NOT merged)** — four real hook
  layouts, font decision made: ship the 8 on the branch, add nothing. Queued for after
  launch. Metallic gradient Neil approved 2026-06-10 is still OFF everywhere.
- Batch cost, computed live: **₱273 per 4-scene ad, ₱3,280 for all 12.** Hard parallel
  limit: 6 renders / 10 min (`api/render/final.ts`).
- Open question for Neil, unanswered: 10 of the 12 gallery cards would be one skincare
  serum. Proposal is a small second strip carrying the service + real-estate runs, which
  costs zero extra render spend.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
