# NOW — the resume doc
**Stamped: 2026-08-30** (session 40 — docs only; the blocker below is unchanged)

## ▶ NEXT ACTION — Neil is bringing a sample of the unboxing reveal he wants

**Do not start fixing before he shows it.** He ended the session with *"may ipapakita akong
sample para magets mo ung gusto ko mangyari"* — the reference shot for how the product
should come out of its packaging. Everything below is context for that conversation.

Session start: `.\scripts\restore-ffmpeg.ps1`, `.\scripts\enable-dev-unmetered-video.ps1`
(then RESTART the dev server), and the two sparse-checkout pulls in `sample_brand_briefs.md`.
`/director-smoke` before driving the wizard.

## 🔴 THE OPEN DEFECT — the wordmark vanished from BOTH objects

Last run (`?osaEngine=producer`, Bukid Coffee, Unboxing). The scene-2 END frame finally held
**both** real objects — kraft box AND brown pouch, side by side. Two things went wrong:

1. **Both lost their "BUKID COFFEE" wordmark.** Blank kraft, blank brown, only the bean
   window survived. Scenes 1/2/4 kept their labels, so it is the END frame specifically.
2. **It reproduced the side-by-side layout** the appended prompt line told it not to — the
   two objects just stand next to each other instead of one coming out of the other.

**DIAGNOSED 2026-08-30 from Postgres — the resolution/JPEG hypothesis is REFUTED; do not spend
a run on sheet quality.** Every tuned branch taking a product photo bans a "second unit"
(NO_UNSOLICITED_PRODUCT: `product` r8, `both` r10). The sheet IS one, so the model was told to
reproduce Ref 1 exactly AND not to render it, and blanked both wordmarks while keeping the
unbranded bean window. Lost pixels blur a label; they do not delete exactly the class a rule names.

**Fix pushed (`bbbed45`), NOT yet eyeballed.** The per-scene line now names both objects, riding
r8/r10's own carve-out ("unless the Scene Prompt explicitly names it"); no tuned file touched.
Also fixed a silent truncation (the 400-char cap ate blind appends). ▶ **Next: run Bukid Coffee
Unboxing, look at the S2 END frame.** If wordmarks return, done; if not, Option B (third
reference + "Reference Image 3" block) is TUNED and needs your go.

**Second fix in the same run (`45f2127`):** the presenter reference never reached
`producer_runs.avatar_url` on a fresh run (fired before the row existed → 404 → eaten by a bare
`catch {}`; 25 of 33 runs NULL), so `identityRefLost`'s "Start over" was a dead end. Now fires
after the first persist. ▶ **Same run answers both: wordmarks back? `avatar_url` non-NULL?**

## ✅ SHIPPED THIS SESSION — 10 commits, ZERO video credits (storyboards spend `images`)

- `20f6e97` — **the packaging slot could not be routed to.** `venueSlot` legend listed
  `packaging`, but the sentence telling the model WHEN to set a slot named only onbody/inuse/
  after, while PRODUCT_TRUTH_RULE bans inventing a box. Unreachable by construction.
- `c82b5ec` — **and the orchestrator threw it away anyway.** A product-state slot on a scene
  WITH a performer matched neither `usePersonState` nor `useVenue`, so it fell back to the
  hero; the two REGENERATE paths had no slot lookup at all. Proven from Postgres.
- `ab57726` — **S2 carries a frame pair now.** A single still cannot tell the video model
  what a sealed box opens INTO. `isHookMorph` was scoped to scene 0 (it kills both slot
  routes, so unscoped it would have undone `c82b5ec`); the two bans were narrowed rather than
  deleted, and `transitionEffect` stays banned everywhere — hard cuts still hold.
- `e8d80d6` — composed two-object reference sheet + **S3 framed on the label** (TACTILE
  SHOWCASE's texture close-up fought the readable-wordmark rule). **The S3 half worked.**
- `10d1c31` — three script-stage rules: `body` pinned to N-1 entries (per-beat shot direction
  is POSITIONAL), CTA must name what to click, hook may not invent an occupation.
- `158f453` — **voice and auto-cast decided gender separately.** Pinay Vlogger voice, male
  avatar. Presenter SET → the picker filters; AUTO → the VOICE decides the cast, since the
  user's pick is explicit and the cast gender was only inferred. Tested, and the test was
  proved to bite by flipping a row.
- `bcba547` — packaging photos AND the upload example now show the container ALONE; the app
  was teaching users to upload the two-object shot.
- `ebf8f01` `1990647` `2e5c8d3` — nine brand briefs, engine rationale, examples checkout gap.

## ⚠ OPEN — ranked

1. **The wordmark loss above.** Blocks the Unboxing sample, which blocks 2 of the 9.
2. **CTA still drops "unang 50"** though the brief now states it. The tuned CTA block calls
   scarcity OPTIONAL in this format, so the model is inside its rules. Needs a TUNED go.
3. **A refused scene still dies** and the user regenerates by hand. Top pre-launch risk.
4. **Landing page has one false claim** — `ProofGallery` says real businesses ran these ads.
5. **Quota race in `consumeFinishedAd`** — the meter can exceed its own limit.
6. **Fan-out scene: paid but uncollected** if the tab closes mid-run. Parked, roadmap #29.

## ⚠ CARRIED
- **Two sparse-checkout holes**, both present as broken UI rather than missing files:
  `/tests/fixtures/sample-batch` (hero photos) and `/public/examples` (the upload guides).
  From Git Bash prefix `MSYS_NO_PATHCONV=1` or the leading slash is rewritten to
  `C:/Program Files/Git/...` and the add silently does nothing.
- **Vite does not serve a file dropped into `public/` after the dev server started.** Verify
  with the CONTENT TYPE, never the status code — the SPA fallback also answers 200.
- **Killing `npm run dev` leaves the vite child holding the port.** It keeps answering 200
  with the OLD code while the restart lands on 5174. Kill the listener by PID.
- `drawPlan.snapshot.test.ts.snap` shows modified with ZERO content diff. CRLF. Leave it.
  The clock skew warning is retired: `w32tm /resync` on 2026-08-29 moved it 0.2s.

### Maintain: **overwrite, never append**, last step of any session that changed state, max 90.
Repo artifacts are ENGLISH; ads stay Taglish. Cafe-PC warnings: `cafe_session.md` §A6.
