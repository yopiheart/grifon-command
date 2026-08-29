# NOW — the resume doc
**Stamped: 2026-08-29** (session 39)

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

**Leading hypothesis, NOT verified:** `composeReferenceSheet`
([producerOrchestrator.ts](services/producerOrchestrator.ts), added `e8d80d6`) caps each photo
at 1024 height side by side, so each object carries roughly half the pixel width a single
reference would, then ships as JPEG 0.92 — less text detail to copy. Cheap probes first: raise
the sheet resolution, use PNG, or crop tighter so each object fills more of its half.

**If that fails, Option B is unavoidable** and was already scoped: widen
`generateSceneImage`'s `references` ([geminiService.ts:2328](services/geminiService.ts#L2328))
to a third image, add a `referenceImageMode`, and write a "Reference Image 3" instruction
block. That is a TUNED edit and needs Neil's explicit go.

## ✅ SHIPPED THIS SESSION — 10 commits, ZERO video credits (storyboards spend `images`)

- `20f6e97` — **the packaging slot could not be routed to.** `venueSlot` legend listed
  `packaging`, but the sentence telling the model WHEN to set a slot named only onbody/inuse/
  after, while PRODUCT_TRUTH_RULE bans inventing a box. Unreachable by construction.
- `c82b5ec` — **and the orchestrator threw it away anyway.** A product-state slot on a scene
  WITH a performer matched neither `usePersonState` (wants person-state) nor `useVenue`
  (wants no performer), so it silently fell back to the hero. Proven from Postgres: the
  storyboard emitted `venueSlot="packaging"` on scenes 1 AND 2 and both rendered the pouch.
  Same half-finished repair as the 2026-08-16 REAL-PHOTO ROUTING note 20 lines above it.
  The two REGENERATE paths had no slot lookup at all.
- `ab57726` — **S2 carries a frame pair now.** A single still cannot tell the video model
  what a sealed box opens INTO. `isHookMorph` was scoped to scene 0 (it kills both slot
  routes, so unscoped it would have undone `c82b5ec`); the two bans were narrowed rather than
  deleted, and `transitionEffect` stays banned everywhere — hard cuts still hold.
- `e8d80d6` — composed two-object reference sheet + **S3 framed on the label**. S3 was
  rendering as the back of the pack: TACTILE SHOWCASE wants an extreme texture close-up and
  the front-of-label rule wants a readable wordmark, and a tight crop on bare film cannot do
  both. **The S3 half worked** — the label is readable now.
- `10d1c31` — three script-stage rules. `body` pinned to N-1 entries (6 scenes on a 4-beat
  spec is what broke the per-beat shot direction, which is POSITIONAL); CTA must name what to
  click (the SOFT CTA GUARD's ban on "link sa bio" had the model dropping "link" entirely);
  hook may not invent an occupation ("bago mag-login" on a coffee brief).
- `158f453` — **voice and auto-cast decided gender separately.** Pinay Vlogger voice, male
  avatar. Presenter SET → the picker filters; AUTO → the VOICE decides the cast, since the
  user's pick is explicit and the cast gender was only inferred. Tested, and the test was
  proved to bite by flipping a row.
- `bcba547` — packaging photos and the upload EXAMPLE now show the container ALONE. The
  example mattered as much: the app was teaching users to upload the two-object shot.
- `ebf8f01` `1990647` `2e5c8d3` — the nine brand briefs (they had photos and no offer),
  the corrected engine rationale, and the `public/examples` sparse-checkout gap.

## ⚠ OPEN — ranked

1. **The wordmark loss above.** Blocks the Unboxing sample, which blocks 2 of the 9.
2. **CTA still drops "unang 50"** though the brief now states it. The tuned CTA block calls
   scarcity OPTIONAL in this format, so the model is inside its rules. Needs a TUNED go.
3. **A refused scene still dies** and the user regenerates by hand. Top pre-launch risk.
4. **Landing page has one false claim** — `ProofGallery` says real businesses ran these ads.
5. **Quota race in `consumeFinishedAd`** — the meter can exceed its own limit.

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
