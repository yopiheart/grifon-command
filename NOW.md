# NOW — the resume doc
**Stamped: 2026-08-23** (session 31)

## ▶ NEXT ACTION — the film run, and it needs a credit decision FIRST

**The storyboard gate is DISCHARGED.** Run `apr_377a69a0-2c11-4ce4-b6b9-66bf0567dd85`
(2026-08-20), the first under the new hook rule, came back clean on every open question:
the hook anchored on the performer's own body (start = a flaking, blemished cheek carrying
the hook line; end = the same performer holding the bottle), the room lock held, and the
lighting rule held **8 of 8 scenes** — every stored prompt ends `ordinary indoor daylight`.

**Neil is at 8/8 video ads on PRO, so nothing films until that credit decision is made.**
One film run then settles three things at once: the half-face crop on close-ups, the camera
framing across scenes, and whether the new pull-back hook still goes to goo (issue #92 — far
less likely now, since the morph no longer interpolates between two unrelated subjects).

Logged, NOT blocking: card 3 reads brighter and cooler on an identical prompt — it is the
only WIDE shot, so it carries the most window, plus a mirror. Composition, not rule; the
full note is under W-002 in `locked_wins.md`.

Still owed, both cheap: pull run `apr_377a69a0` scene 0 into `baselines/locked-wins/`
(`scripts/pull-run-frames.mjs`, Neil runs it), and the Savic autopsy below.

## ✅ WHAT LANDED — CI was dead for 4 days and it was never a bug

**`965a95b`** on main, CI run **#752 GREEN** (verify 3m2s, e2e 2m0s, main-status 3s, 1264
tests). Every job in every workflow had failed in **3 seconds** since 08-20. Nothing was
broken: main built clean, all five gates passed, all four workflow files parsed. The account
had used **100% of its 2,000 included Actions minutes** on 08-19, and a $0 Actions budget
makes GitHub **refuse to start the job** — which is why even `main-status` died. Neil set a
**$5 Actions budget** (Stop usage ON); billed in arrears at the 09-01 reset, actual usage
only, ~$0.07 so far.

It was a **rate** problem: 2,000 minutes in 19 days (~105/day), so the 09-01 reset alone
would have re-capped around 09-19. Four fixes in `ci.yml` — `paths-ignore` on push for
`NOW.md` / `agent_lessons.md` / `workflows/**` / `baselines/**` (**102 of 254 first-parent
commits on main since 08-01 were docs-only**); workflow-level `concurrency` that supersedes
PR runs but NEVER a push-to-main run; a Playwright browser cache; `timeout-minutes: 15`.
`DESIGN.md` is deliberately NOT ignored — `design:lint` reads it.

## ⚠ FOUR THINGS THE NEXT SESSION MUST NOT REDISCOVER

- **The 3-second tell.** A job that dies in 3s never ran a step (`npm ci` needs 20–60s to
  even fail). Check billing before reading a single log. Job logs 404 — GitHub serves none
  for a job it never started.
- **The alarm is blind to this class by construction; the monitor was not.** `main-status`
  cannot open a `ci-red` issue if it cannot start. The Health Watch's *other* check (newest
  `main` run conclusion) caught it and pushed CRITICAL on 08-21 08:14 PHT. **Keep that
  redundant check.** What failed was the READER, third time — write-up in loops.md Tier 0b.
  Do not add a fourth channel; two of the three failures were caused by adding one.
- **The motion layer was deliberately left alone.** [`geminiService.ts:2725`](services/geminiService.ts#L2725)
  still says `Object Materialization` *"resolves from amorphous into the target subject"* —
  object-swap language, while the new stills describe a pull-back on one continuous subject.
  One layer per test. Re-read after the verification run.
- **The CMO recommended the opposite and Neil overrode it, knowingly.** `P3` in
  `viral_swipe_file.md` — *"Nobody morphs, ever"* — carries **12 corroborations**. Neil's
  call stands; if the morph underperforms, the trade is already written up in W-005.

## ⏭ OPEN — ranked, with the trap in each

1. **Savic autopsy, 3rd corroboration.** `yt-dlp` and `ffmpeg` are NOT on this PC, and
   `analyze_video.mjs` takes a local file or a direct file URL — not a TikTok page link. Neil
   saves the file, then `/viral-autopsy`. Two are already decoded, so this hits the ≥3 gate.
2. **Auto-cast slop.** Neil LIKES the lighting and dislikes the sameness of the FACE. Attack
   the retouch layer and the texture bans in `generateAvatarImage` only.
3. **Floating product.** No gate observation covers hand contact. Copy the
   `BAG_ORIENTATION_RULE` pattern + a 7th observation.
4. **Garbled label at distance.** Variance (clean on the same product 08-13). `labelLegible`
   is **FLAG-ONLY, never rerolls**, and needs BOTH `IMAGE_GATE_ENABLED` +
   `VITE_IMAGE_GATE_ENABLED`. 2nd corroboration.
5. **Quota race in `consumeFinishedAd`.** peek → consume → mark is not atomic. An owner never
   notices; the first 8-scene customer will.
6. **Supabase FREE tier is past its grace period.** It holds auth, runs, quota, billing.
7. **Node 20 deprecation, cosmetic.** `checkout@v4`, `setup-node@v4`, `cache@v4`,
   `upload-artifact@v4`, `github-script@v7` are force-run on 24. Bump to `@v5` in one pass.

## ⚠ CARRIED
- **Scene grade stays REJECTED**, flag deleted on Vercel, code dark. The **luma term** is what
  killed it. Do not re-propose without dropping luma; grey-world was separately thrown away.
- Lighting (`b1632b0`+`35cd3ed`) and the room lock are **🔒 confirmed by Neil** on a real run.
- `onbody.png` / `inuse.png` are still the 2026-07-11 files, warmer and darker than the rebuilt
  pair. If warmth returns in Try-On / Demo / Tutorial, suspect the ASSET first.
- Sparse-excluded, fetch on demand: `tests/fixtures/sample-batch` (the ONLY fixture set) and
  `baselines/locked-wins`.
- `MID_GAP_TRIM_ENABLED` is ON in production. Batch cost **₱273 per 4-scene ad**; hard limit
  6 renders / 10 min.
- Branch `feat/hook-layout-system` (`1245d14`) still unmerged, queued for after launch.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
