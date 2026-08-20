# NOW — the resume doc
**Stamped: 2026-08-20** (session 30)

## ▶ NEXT ACTION — the film run, and it needs a credit decision FIRST

**The storyboard gate is DISCHARGED.** Run `apr_377a69a0-2c11-4ce4-b6b9-66bf0567dd85`
(2026-08-20), the first under the new hook rule, came back clean on every open question:
the hook anchored on the performer own body (start = a flaking, blemished cheek carrying the
hook line; end = the same performer holding the bottle), the room lock held, and the lighting
rule held **8 of 8 scenes** — every stored prompt ends `ordinary indoor daylight`.

**Neil is at 8/8 video ads on PRO, so nothing films until that credit decision is made.**
One film run then settles three things at once: the half-face crop on close-ups, the camera
framing across scenes, and whether the new pull-back hook still goes to goo (issue #92 — far
less likely now, since the morph no longer interpolates between two unrelated subjects).

Logged, NOT blocking: card 3 reads brighter and cooler, but its prompt is identical to every
other scene — it is the only WIDE shot, so it carries the most window, plus a mirror.
Composition, not rule; the full note is under W-002 in `locked_wins.md`.

Still owed, both cheap: pull run `apr_377a69a0` scene 0 into `baselines/locked-wins/`
(`scripts/pull-run-frames.mjs`, Neil runs it), and the Savic autopsy below.

## ✅ WHAT LANDED — the recall system, and the hook Neil asked for

**`877b0a7`** merged to main and deployed. Two commits, one root cause.

- **`d9614cc` — the Locked Wins register.** Neil correctly remembered a hook he approved on
  2026-08-13; three searches denied it before it turned up in a Postgres row and in no repo
  doc. Cause: decisions lived in `workflows/`, the frames they were about lived only in
  `producer_scenes`, and nothing linked them. Now every approved look carries its run_id, its
  verbatim prompt, a committed frame, and a **🔒 CODE / 🎲 LUCK / 🔴 REJECTED** verdict.
  **🎲 is the load-bearing column** — most "this used to work" reports are an unpinned win
  losing a coin flip, not a regression. `scripts/pull-run-frames.mjs` commits a still (Neil
  runs it — the ENV WARDEN blocks the agent).
- **`ba512bc` — the hook morph anchors on the performer's body.** Was: anchor colour came
  FROM THE PRODUCT, so any similarly-coloured stand-in could carry it — that is why 08-19
  opened on an orange fruit, working exactly as written. Now: start = a cropped detail of the
  performer, end = that same performer pulled back holding the product at the same position,
  and **both frames are built from scene 1's own scriptLine**. Scoped to `real_talk`,
  `hype_drop`, `rapid_fire`, `pure_hype`. Services, UGC Pro and Real Estate keep their
  branches verbatim. Suite 1264 passed, build clean.

**No code change was needed.** The variance was `renderEndFrame` forcing mode `'both'` while
the prompt said "NO people in the hook end frame." Neil resolved it in the prompt's favour, so
`'both'` is now correct instead of contradictory.

## ⚠ TWO THINGS THE NEXT SESSION MUST NOT REDISCOVER

- **The motion layer was deliberately left alone.** [`geminiService.ts:2725`](services/geminiService.ts#L2725)
  still describes `Object Materialization` as *"anchor element resolves from amorphous into
  the target subject"* — object-swap language, while the new stills describe a pull-back on one
  continuous subject. One layer per test, or the run cannot attribute the change. Re-read after
  the verification run.
- **The CMO recommended the opposite and Neil overrode it, knowingly.** `P3` in
  `viral_swipe_file.md` — *"Nobody morphs, ever"* — carries **12 corroborations**, and
  `before_after` (hard cut) is the clean baseline. Neil's call stands. Do not re-argue it from
  scratch; if the morph underperforms, the trade is already written up in W-005.

## ⏭ OPEN — ranked, with the trap in each

1. **Savic autopsy, 3rd corroboration.** Neil has the latest Nikolai Savic video. `yt-dlp` and
   `ffmpeg` are NOT on this PC, and `analyze_video.mjs` takes a local file or a direct file URL
   — not a TikTok page link. Neil saves the file, then `/viral-autopsy`. Two of his videos are
   already decoded (`archive/2026-05-19-session-e-hook-audit.md`), so this one hits the ≥3 gate.
2. **Auto-cast slop.** Neil LIKES the lighting and dislikes the sameness of the FACE. Attack the
   retouch layer and the texture bans in `generateAvatarImage` only.
3. **Floating product.** No gate observation covers hand contact. Copy the `BAG_ORIENTATION_RULE`
   pattern + a 7th observation.
4. **Garbled label at distance.** Scene 5 of the 08-20 run; clean on the same product 08-13, so
   it is variance. `labelLegible` exists in the gate but the gate is **FLAG-ONLY, never rerolls**,
   and needs BOTH `IMAGE_GATE_ENABLED` + `VITE_IMAGE_GATE_ENABLED`. 2nd corroboration.
5. **Quota race in `consumeFinishedAd`.** peek → consume → mark is not atomic. An owner never
   notices; the first 8-scene customer will.
6. **Supabase FREE tier is past its grace period.** It holds auth, runs, quota, billing — and it
   was the ONLY copy of every approved frame until this session.

## ⚠ CARRIED
- **Scene grade stays REJECTED**, flag deleted on Vercel, code dark. The **luma term** is what
  killed it. Do not re-propose without dropping luma; grey-world was separately thrown away.
- Lighting (`b1632b0`+`35cd3ed`) and the room lock are **🔒 confirmed by Neil** on a real run.
- `onbody.png` / `inuse.png` are still the 2026-07-11 files, warmer and darker than the rebuilt
  pair. If warmth returns in Try-On / Demo / Tutorial, suspect the ASSET first.
- Sparse-excluded, fetch on demand: `tests/fixtures/sample-batch` (the ONLY fixture set) and `baselines/locked-wins`.
- `MID_GAP_TRIM_ENABLED` is ON in production.
- Branch `feat/hook-layout-system` (`1245d14`) still unmerged, queued for after launch.
- Batch cost: **₱273 per 4-scene ad**. Hard limit 6 renders / 10 min.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
