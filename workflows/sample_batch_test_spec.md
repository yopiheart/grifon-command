# Sample Batch Test Spec — the Slice B render batch + owed gemini-eval gate

**Status:** SPEC READY 2026-07-11. Assets generated (see inventory). Waiting on Neil's GO
(paid Gemini quota) + a pre-authenticated browser session.

**One batch, two deliverables — do not run it twice** (standing call, `e822647`):
1. The **owed `gemini-eval` batch** from UGC Pro Slices 1–4 (`ugc_pro_formats_plan.md`).
2. The **sample preset previews** for the Slice A recipe gallery
   (`oneshot_format_showcase.md` → Slice B).

The agent NEVER fires the paid runs autonomously. Neil drives the producer; the agent grades.

---

## 1. The locked brand brief (identical across ALL product runs)

Fictional brand — safe for the public samples gallery (no third-party trademarks).

| Field | Value |
|---|---|
| Brand | **Hiraya Glow** |
| Product | Vitamin C Brightening Serum, 30ml |
| Offer | **₱499 launch promo** (reg. ₱799) · free shipping nationwide · ends Sunday |
| Audience | Filipinas 20–35, busy/stressed, want glow without a 10-step routine |
| Key benefits | Visibly brighter skin + lighter dark spots in 2 weeks · lightweight, hindi malagkit · gentle enough for sensitive skin |
| Character | **Auto mode · Female** (exercise the default path real users hit) |
| Vertical | `product` · engine `?osaEngine=producer` |

Enter these verbatim in every run. Same brand/offer across runs is what makes the gallery
read as one coherent catalog (Higgsfield does the same).

## 2. Asset inventory → upload-slot mapping

Generated via `codex-image` (gpt-image-2, zero Gemini/Claude spend), committed at
`tests/fixtures/sample-batch/` so they survive the defreezer:

| Slot (`guidedPhotoSlots.tsx`) | File | Content |
|---|---|---|
| `hero` | `hero.png` | Amber dropper bottle, HIRAYA GLOW label, **held in-hand** — the hand anchors the 30ml scale so generation can't inflate the bottle (Neil's call 2026-07-11; same reason the slot's example is `ex-product-handheld.png`) |
| `packaging` | `packaging.png` | Same bottle + its retail box |
| `onbody` | `onbody.png` | Same woman applying serum to cheek, bottle in hand |
| `before` | `before.png` | Filipina mid-20s, bare face, dull/uneven skin |
| `after` | `after.png` | Same woman, same framing, glowing even skin |
| `inuse` | `inuse.png` | Hand dispensing a drop from the same dropper |

Consistency chain: `packaging`/`inuse` are edits of `hero`; `onbody`/`after` are edits of
`before` — same bottle, same face everywhere.

**PRESENTER-COHERENCE RULE (Neil's catch, 2026-07-11).** The storyboard's transformation
beats put BOTH `referenceImage="avatar"` AND `venueSlot="before"/"after"` on the same scene
(`api/_lib/prompts.ts` S1/S3) — so if the auto-cast avatar differs from the woman in the
uploaded person-state photos, one ad renders two different faces. Therefore:
- Runs using photos WITH her face (`before_after`, `try_on`): **Presenter = SET, upload
  `after.png`** so avatar lock == the same woman. NOT pure Auto.
- Runs whose uploads are face-free (`unboxing`, `unboxing_asmr`, `demo`, `tutorial` —
  hands/product only): **Presenter = Auto**, per the original default-path intent.
- **Eval observation point:** a real user uploading their own before/after selfies + Auto
  presenter hits this mismatch. If the batch confirms it renders incoherently, file it as a
  product bug/roadmap item (derive presenter from uploaded face, or a UI warning).

## 3. Run matrix — 12 runs

> **Priority order (Neil, 2026-07-11): the NEW formats are the gate — fire them first.**
> Runs 5–10 below (the UGC Pro sub-formats, never rendered) + runs 11–12 (service/RE
> arms) are the owed eval; start with `before_after`, then `try_on`, `unboxing`,
> `unboxing_asmr`, `demo`, `tutorial`, then the two non-product runs. Runs 1–4
> (`real_talk`/`hype_drop`/`rapid_fire`/`pure_hype`) are presets over formats that
> already shipped — still needed for their sample cards, but NOT gate-blocking; run
> them last or in a later session.

### A. The 10 product recipes (sample cards + eval) — Hiraya Glow, slots per recipe's sub-format

| # | Recipe (`recipes.ts`) | Format / sub | Extra eval attention |
|---|---|---|---|
| 1 | `real_talk` Real Talk Review | ugc · Testimonial | first-person authenticity, SOFT CTA GUARD |
| 2 | `hype_drop` Hype Drop | ugc · MrBeast | hook strength, no over-claim vs appearance guardrail |
| 3 | `rapid_fire` Rapid Fire | product_ugc | cut pacing (EDL Rule 0a evidence — flag only) |
| 4 | `pure_hype` Pure Hype | product_ugc · sfx_only | NO voiceover leaks; deal text carries ₱499 |
| 5 | `try_on` Try-On Reveal | ugc_pro · tryon | onbody anchor honored, no product hallucination |
| 6 | `before_after` Before & After | ugc_pro · transformation | before/after slot fidelity, appearance guardrail (skincare = derma-adjacent claims) |
| 7 | `unboxing` Unboxing | ugc_pro · unboxing, asmr:false | packaging co-star rule |
| 8 | `unboxing_asmr` Unboxing ASMR | ugc_pro · unboxing, asmr:true | whisper register (carried TTS gap — collect evidence) |
| 9 | `demo` Watch It Work | ugc_pro · demo | inuse anchor, payoff beat lands |
| 10 | `tutorial` Steps 1-2-3 | ugc_pro · tutorial | step structure, teach-then-sell |

(`auto` Let AI Pick shares whatever sub-format it resolves to — no separate run, no sample
card of its own; `commercial` is locked.)

### B. The 2 eval-only runs (Slice 4 debt — no sample card)

| # | Run | Brief | Assets (reuse `public/examples/`) |
|---|---|---|---|
| 11 | **Service B&A** | "Linis Pro PH" home deep-cleaning, Metro Manila, ₱1,499/session promo, book-a-slot CTA | `services-work-before.png`, `services-work-after.png`, `ex-staff.png` |
| 12 | **RE Walkthrough** | "Casa Verde Residences" 2BR condo, QC, **listingPrice ₱4.2M**, tripping/viewing CTA | `ex-facade.png`, `ex-living.png`, `ex-kitchen.png`, `ex-bedroom.png`, `ex-view.png` |

Run 11 must show FIRST-PERSON OPERATOR voice + "the WORK is the mechanism" + BOOK-don't-sell
CTA. Run 12 must show AGENT ON-SITE voice, agent-authority listicle, and honor the PRICE RULE
(₱4.2M appears per the hoisted single-source rule).

## 4. Eval protocol (per run)

Grade with the **`gemini-eval` skill** against the TUNED rulesets in
`services/geminiService.ts`, using the **fresh-context adversarial critic SOP** (separate
sub-agent per the 2026-07-05 scene-image eval precedent — builder ≠ grader). Universal checks
on every run: FILIPINO_CAST_LOCK · camera mandate · appearance guardrail · SOFT CTA GUARD ·
no person-leak on product-only shots · script↔storyboard↔EDL coherence · slot photos actually
anchor the scenes (no hallucinated product/face). Per-run extras: column 4 above.

**Verdict per run: PASS → sample card · FAIL → bug entry, no card.** Carried decision gates
that live or die on this batch's evidence: EDL Rule 0a `ugcpro` (only if eval shows cut-pacing
wrong) · TTS whisper register (run 8) · real `ugcpro.mp3` bed.

## 4b. Early findings (2026-07-11, pre-gate recon runs — storyboard stage, no filming spend)

1. **Steps-engine script, `before_after`-shaped brief:** "para kuminis agad" — instant-effect
   claim brushing the appearance guardrail (our honest claim is 2 weeks). Watch for it in the
   gate runs.
2. **Auto recipe + hero/inuse only (no before/after uploads): B&A structure silently degraded.**
   Producer storyboard came back **3 scenes** — matches NO UGC Pro skeleton (transformation=4,
   unboxing=4, demo=5, tutorial=5). No problem-hook (S1 had product in-hand), no instant-reveal
   beat. The "renderer falls back to representative generation" path did NOT synthesize the
   missing before-state; the model dropped the beats instead. Confirms the §2 observation point
   half-way: even before the face-mismatch case, missing state uploads deform the skeleton.
   → candidate bug: enforce beat count / synthesize representative states when slots are absent.
3. **Auto-cast avatar faces converge on the same "mean face" per age band** (the recognizable
   social-media AI face). Mitigation now = custom Presenter upload (the §2 rule). Roadmap
   candidate (TUNED, Neil-gated): persona-seed diversity in the avatar generation prompt.
4. Positive signals: slot anchoring works (S1 ≈ uploaded hero, bottle label legible), avatar
   identity lock holds across scenes, Taglish register natural, producer storyboard gate
   correctly holds the expensive filming step behind approval.
5. **No escape from the storyboard gate (UX bug).** `ProducerFlow` resumes any non-done run
   from `osa_producer_active_run` on every mount, and the only key-clearing affordances are
   the error branch and post-run "Make another" — a user at the approve-scenes screen who
   wants to abandon is trapped in a resume loop (Command Center → Director AI → same FILM IT
   page). Workaround: `localStorage.removeItem('osa_producer_active_run')`. Fix (post-batch):
   a "Start over" affordance at the storyboard gate that clears the key + abandons the run.
6. **Transformation beat-0 hook violation, 2/3 runs (GEMINI_FAIL on the explicit gate run).**
   Producer `before_after` run with full uploads + presenter=after.png produced hook
   "Finally, serum na hindi malagkit" — a product hook, violating the tuned "the BEFORE is
   the hook — NO product in beat 0" rule (`api/_lib/prompts.ts` ~L661). Cascade: storyboard
   S1 = generic unbranded bottle (S1 has no product reference by design), uploaded
   `before.png` never consumed, no before→after contrast. Beats 1–3 complied, so wiring is
   fine — model compliance flake. Steps-engine run DID comply ("Ang dull at pagod ng mukha
   ko"). **If a 3rd violation appears in the re-run → systematic; route hook-rule
   strengthening through grill-me (TUNED).**
7. **S3 after-reveal identity drift (gated TUNED proposal).** Skeleton allows S3
   referenceImage="none (or avatar)"; when the model picks "none", the after money-shot is a
   re-imagination of after.png with NO avatar lock → face drift, breaking the same-person
   proof. Proposal (grill-me → Neil before any edit): for PERSON transformations, S3 MUST
   use referenceImage="avatar" (+ venueSlot=after). S4 mild drift = per-scene REGENERATE,
   not a rule change.
8. **Untested path to add as a free storyboard-stage check:** presenter photo with
   white/no background — presenter should anchor identity only (environment comes from
   scene prompts + ONE PERFORMER ONE PLACE + state photos); never actually exercised.
9. **Producer research-cache bypass — FIXED in-session.** `ProducerFlow.start()` called
   `generateMarketResearch` directly and seeded the run `doneStages:['market_research']`,
   so the orchestrator's cache seam (researchCacheStore) never ran on the UI path — every
   producer run paid for fresh research while the LaunchScreen "saved research" hint
   claimed reuse. Fix mirrors the stage's cache logic in `start()` (read unless
   forceFreshResearch, write on miss). First run per brand still researches (and now
   caches); subsequent runs are instant.
10. **Beat-0 violation is SYSTEMATIC — 3/4 runs.** Run 3 hook: "Akala ko trend lang, pero
    it works" — skeptic/testimonial hook, not the problem-state; `before.png` unused again
    (S1 frame was product-free this time — partial compliance). Next step: **grill-me on
    the TRANSFORMATION beat-0 rule strengthening (TUNED, Neil-gated), post-batch.**
    Otherwise avatar↔presenter consistency was CLEAN on run 3 (the §2 rule works).
11. **First Cut auto-edits immediately** — AUTO preset applied without asking; **no
    NONE/raw preset** for users who want the stitched-only cut (Neil's recalled design:
    first cut = scenes joined, no dead air, no text/SFX/music until the user picks).
    UX finding + feature ask, post-batch.
12. **Trailing ~2s "dead air" re-diagnosed (Gemini watched all 3 preset renders).**
    Not literal silence — all three analyses report 0 silences >0.3s (music runs to the
    end) and CTA `holds_to_final_frame`. The VO ends ~2s early and the final scene HOLDS
    static to fill the 15s target — reads dead to a human. Fix direction: trim or
    micro-move (slow push-in) the post-VO tail, not audio-gap detection. Still Rule 0a
    evidence, reclassified.
12b. **First filmed render — Gemini analysis verdicts (all 3 presets, run 3).** All
    three: `real-human` believability at high confidence, `raw-ugc` register, perfect
    lip-sync note, real skin texture — the core product promise HELD on the producer
    pipeline + Hiraya Glow assets. Presets DO differentiate (A: water-ripple + white
    flash + shutter SFX; B: single flash + whoosh; C: water-splash wipe; caption color
    treatments differ). Gemini independently flagged the missing before/after proof
    ("Lacks visual before-and-after proof of dark spot reduction") — third corroboration
    of finding #10. CTA occupies the final ~6s (40% of runtime) — CMO review item.
13. **Preset switcher farms multiple deliverables** — AUTO → download, IMPACT → download,
    CLEAN → download off one filmed run. FFmpeg re-edit only (no new Gemini spend), so
    likely fine — flag for pricing/abuse review. Omni edit presets absent from product =
    expected (dev-lab only, gated proposals; roadmap #18 two-layer editing).
14. **POST-FIX GATE RE-RUN (2026-07-12, Neil live, `before_after` full uploads + Auto):
    beat-0 fix CONFIRMED + dead-air fix CONFIRMED.** Hook = "Pagod na 'ko sa dry, dull
    skin." (problem-state, no product — the 797ce08 root-cause fix held on run 1);
    4-beat skeleton intact; presenter derived from after.png, same face all 4 scenes;
    Start-over + RAW-default both live. No trailing static hold on the final cut
    (finding #12 resolved on a real render). Preset switcher AUTO/IMPACT/CLEAN all
    worked off the one filmed run.
15. **S1 hallucinated product cutaway (~3s mark) — CONFIRMED by Gemini watch
    (2026-07-12, `tools/analyze_video.mjs` on the complete RAW).** Gemini timeline:
    hook VO 0–2s (problem state, compliant), then "quick cut to a close-up of the
    product bottle on the sink" at 2.0–3.0s — INSIDE scene 1's clip, exactly the
    post-VO tail-fill hypothesis (VO ~2s, clip 4s; the video model invents a B-roll
    cutaway to fill, and with no product reference on S1 the label comes out gibberish
    — Neil's frame shows "RYA CWYA"-style text; Gemini generously mis-read it as the
    real bottle, which is itself evidence it LOOKS like a product insert). Fix
    candidates, cheapest first: (a) tighten per-scene VO-end trim so S1's tail is cut
    (chooseTrim already trims the FINAL scene; S1's internal tail survived), (b)
    request shorter clips for hook scenes, (c) TUNED no-invented-props rule in the S1
    motion prompt (grill-me gate). 2nd corroboration; 1 more before the TUNED route.
    **The "heart" effect — RESOLVED, reframe:** Gemini identifies it as "a digital
    dry-skin texture overlay on her cheek" in the 0–2s hook and grades it a hook
    STRENGTH ("instantly visualizes the problem", high confidence) — generated-footage
    visualization, mood-appropriate, not a defect. No action.
    **Also from the watch:** dead air 0 silences >0.3s, "dead_air_notes: None"
    (finding #12 fix re-confirmed); believability real-human/high (4th corroboration);
    listed weakness = "complete lack of on-screen captions" on the RAW cut — by
    design, and exactly the gap the approved bold-overlay presets close. NOTE: RAW
    carries continuous soft music despite stitchedOnly — that music is INSIDE the
    generated scene audio (native model audio), not our bed; expected, not a leak.
16. **Scene 2 transient generation failure** — 502 Bad Gateway from
    /api/kling/video/poll mid-run; scene flagged, per-scene REGENERATE recovered
    cleanly (designed path works). Console also spams "[producer] checkpoint
    superseded (revision conflict) — adopted server revision N" ~20× per run —
    checkpoint sync works but the log noise obscures real errors; log-hygiene
    candidate, not a bug.
17. **P0 — manual Presenter upload kills the run at FILM (2026-07-14, try_on gate run).**
    `LaunchScreen`'s Presenter dropzone (and the non-guided "Product photo" modal) read
    files RAW via `fileToDataUrl` — no `compressImageForUpload` like the guided slots —
    so `after.png` (2.6MB PNG → ~3.5MB base64) rode `run.input` into the CREATE
    checkpoint and 413'd against `api/producer/run.ts`'s 2mb cap on every retry
    ("revision stays 0 → retries WITH input"). Run row never created → video stage's
    `seedScenes`/`advance` → 404 `run_not_found` → PRODUCTION PAUSED at FILM. Zero film
    spend lost (died pre-render). **Real-user P0:** any custom-presenter upload from a
    normal 3–10MB phone photo hits this. Why run 1 passed: Auto presenter (derive path),
    no raw upload. FIX (same session): compress both raw call sites + `slimCheckpointInput`
    transport guard in `producerRunService.ts` (mirror of `slimCheckpointArtifacts`).
    Storyboard-stage observations from the dead run (evidence still counts): instant-claim
    guardrail brush corroboration **#2** — S2 "ang bilis nitong mag-brighten" + S3 "kintab
    agad" vs the honest 2-week claim (finding #6 ladder: 3rd → grill-me TUNED route); offer
    (₱499/free shipping/ends Sunday) never surfaced in any of the 4 script lines — this
    try_on run does NOT count toward the literal-price SFX ear-gate runs; try_on-on-skincare
    itself rendered correctly as an application reveal (onbody anchor honored, no
    hallucinated apparel, identity lock held across 4 scenes).
18. **P0 — R2 CORS blocks the EDL stage on ALL producer runs post-R2-migration
    (2026-07-14, try_on run 2 on the fixed preview).** The 413 fix held (FILM completed,
    scenes persisted), then "CUTTING THE EDIT" died with `edl: Failed to fetch`:
    `generateEditDecisionList` fetches each scene's audio overlay IN THE BROWSER
    (`services/geminiService.ts` ~L1440 — written for blob: URLs) but post-migration
    `audioUrl` is an R2 presigned URL, and the `grifon-media` bucket has NO CORS policy →
    browser fetch hard-fails from any vercel.app origin. Scene VIDEOS are unaffected
    (fileData URIs, fetched server-side by Gemini). Run 1 (2026-07-12) predates the R2
    cutover for this path — why it passed. Fix = one-time bucket CORS (GET/HEAD; presigned
    URLs remain the auth — uploads are all server-side so no PUT needed); run is rescuable
    via RETRY after (film spend banked). Pending Neil's GO (shared-infra change).
    **RESOLVED 2026-07-15 (Day 3):** Neil GO'd Option A; the .env R2 token turned out
    object-scoped (PutBucketCors → 403 AccessDenied; bucket config needs an Admin
    Read & Write token), so applied via Option C — Neil pasted the policy in the
    Cloudflare dash. **Diagnosis correction:** the bucket DID have a prior CORS policy
    (`grifon.ai` + `www.grifon.ai` + `localhost:5173`, GET only) — the real gap was
    Vercel *preview* origins (+ HEAD), i.e. prod on grifon.ai would likely have passed;
    every preview run could not. New policy: `AllowedOrigins:*`, GET/HEAD, headers `*`,
    max-age 3600 (signed URLs remain the auth). Verified end-to-end from the agent:
    preflight OPTIONS → 204 + `Access-Control-Allow-Origin: *`; real presigned GET with
    a vercel.app Origin → 206 + ACAO `*`.
    **Storyboard observations, same run:** instant-claim corroboration **#3** — S2
    "Literal na instant glow ang binigay" (after run 1 "para kuminis agad" + run 2a "ang
    bilis nitong mag-brighten"/"kintab agad") → **the finding #6 ladder is now TRIGGERED:
    systematic, route claims-guardrail strengthening through grill-me (TUNED), Fable
    window open until Jul 20.** Also: S1 first-gen hallucinated hand/product physics
    (dropper dispensing at the face while the bottle sat in the same palm) — one
    per-scene REGENERATE fixed it (designed path works, 2nd data point after #16);
    offer/price absent from the script again (2nd corroboration for the
    offer-never-surfaced observation).
19. **try_on run 2 RE-RUN storyboard (2026-07-15, post-CORS-fix, presenter=after.png
    manual):** 5 scenes, identity lock ×5 — first run where a MANUAL presenter photo
    survived to storyboard (the 413 fix at work); uniform after-state glow across all
    scenes is the §2 rule working as designed, CMO-passed for tryon (reveal format, no
    before-beat owed). **Instant-claim corroboration #4:** S3 "Vitamin C nito,
    nagbibigay ng instant bright look" (grill-me route already triggered at #3 — this
    strengthens the case, no new action). **Offer-absent corroboration #3:** ₱499 in
    no beat; S5 CTA surfaces "free shipping ngayon" (CTA price ban is by design, so
    the only legal slots for ₱499 are mid-beats) → literal-price ear-gate runs must
    come from pure_hype / UGC+HYPE, not ugc_pro. Neil verdict: FILM.
20. **P0 — Kling keys were NEVER in Vercel env (2026-07-15, try_on run 2 FILM).**
    4/5 scenes died 502 at submit; runtime logs: `KLING_NOT_CONFIGURED: set
    KLING_ACCESS_KEY and KLING_SECRET_KEY`. Keys lived only in local `.env` (dev always
    worked); `vercel env ls` showed NO Kling entries in any environment — **prod launch
    would have shipped with every Kling-routed scene broken** (hook-scene morphs route
    to kling-video-o1, others to kling-v3; the lone success was the Veo-routed scene,
    4s vs Kling's 5s submits). NOT the Omni edit feature — `api/kling/omni-video` is
    the Kling O1 *generation* model for hook scenes; the gated edit feature is
    `api/gemini/omni-video/*`, untouched. Fix (Neil GO'd): both keys added to Vercel
    Preview+Production as Sensitive (piped from .env), branch redeployed (`ee32914`)
    to bake them in. **Prod note: keys land on prod's NEXT deploy — the merge train
    covers it; verify at launch gate.** Billing check: video_ads metered once per
    finishedAdId (limit-1 marker `vidjob:*`), so the 4 failed submits consumed ZERO
    extra credits and never reached Kling's wallet; per-scene FIX SCENE stays free.
    Open Qs folded in: the 3–4s FILM-IT pause = checkpoint PUT + quota consume +
    serverless cold starts before the first submit returns (no spinner in that gap —
    UX-polish candidate, not a bug).
21. **try_on run 3 (2026-07-15, branch alias, post-Kling-fix) storyboard = PASS after
    one fix, 4-beat exact skeleton.** CMO+CD pass: skeptic-test hook, onbody application
    match, identity lock ×4, compliant CTA w/ free-shipping surfaced. **Instant-claim
    corroboration #5:** S2 "ang ganda AGAD ng effect sa skin". **Hand/product-physics
    hallucination corroboration #2 (Neil's catch, zoomed):** S2 first-gen pressed the
    whole dropper assembly against the cheek with a detached serum drop under the eye —
    same class as run 2's S1 (dropper dispensing at face, bottle in palm). Recovery =
    per-scene REGENERATE (3rd clean recovery for the designed path). **Ladder: at
    corroboration #3, physics guardrail in the storyboard imagePrompt goes to grill-me
    (TUNED) — bundle with the instant-claim grill.** Notes: (a) research cache is localStorage
    (origin-scoped) — every preview-URL hop re-spent one research call; STANDARDIZE ON
    THE BRANCH-ALIAS URL (`grifon-command-git-b252dd-…vercel.app`) for all batch runs,
    prod unaffected (single domain); (b) **feature ask (Neil)**: tap-to-expand/lightbox
    on scene thumbnails during assembly + at the storyboard gate — approval is currently
    asked off tiny thumbs; client-only, post-batch.
22. **Design flaw — failed Kling submits still consume rate-limit slots (2026-07-15,
    try_on run 3 FILM).** The 5/hr per-user pool (VIDEO_LIMIT=5, window 3600s, shared
    across api/kling/video + omni-video) was pre-drained by the 4 KLING_NOT_CONFIGURED
    502s from the dead run (~09:46 UTC / 5:46 PM PHT) because rateLimitCheck runs BEFORE
    Kling auth/config — submits that never reached upstream ate 4/5 slots. Run 3's
    submits then 429'd mid-run (2 scenes filmed, 2 FLAGGED). Recovery path: window
    rolls → FIX SCENE per flagged scene (~6:50 PM PHT). Two punch-list candidates
    (api/_lib TUNED — Neil-gated, grill bundle): (a) don't count (or refund) a slot when
    the submit fails before reaching Kling; (b) the 5/hr pool predates the producer's
    4–5-scene batch reality — one run ≈ the whole hourly budget, so any failure+retry
    within the hour hits the wall by construction. Also: 429s never reached Kling —
    zero wallet impact; video_ads metering unaffected (once per finishedAdId).
23. **try_on run 3 First Cut = EVAL FAIL, no sample card (2026-07-15, fresh-context
    2-pass critic: gemini-3.1-flash-lite + gemini-2.5-flash corroboration, 15s RAW).**
    Dominant cause **CONFIRMS Neil's live observation**: S1 hook 0:01–0:03 is a full
    Kling-O1 morph artifact — face/hair/bottle "melt into jagged translucent crystalline
    form", dissolving into S2 (both passes, high confidence). Root: `routeModel()` in
    producerOrchestrator.ts:409 routes sceneIdx===0 + b-roll to Kling_O1 FORMAT-BLIND —
    with a single start frame O1 degrades to camera-motion/warp; person-held hook shots
    misfire. Secondary fails: S2 application physics (finger glides, zero skin
    displacement — onbody anchor FAIL), S4 post-VO dead air ~3s (VO ends ~0:12, clip
    holds to 0:15) + S2 ~1s tail → **post-VO tail/dead-air ladder: 3rd corroboration —
    original P1 fix #3 (EDL tail trim / push-in) never shipped in the 8114e63 batch;
    now evidence-complete.** Passes: audio (clean Taglish VO, no gibberish), product
    fidelity (label legible ×3, no hallucinated products; pass-B refuted pass-A's blur
    claim), identity lock (pass-B: same woman ×4, refuted pass-A drift), zero burned
    text, CTA compliant. Instant-claim verbatim: S2 "ang ganda agad ng effect sa skin"
    (= corrob #5 confirmed on RENDER, not just storyboard). Lighting continuity noted:
    S2 reads natural-bathroom vs studio-lit S1/S3/S4. **Fix candidates:** (A) one-line —
    drop the scene-0 O1 special case (hooks route like any b-roll → Kling_3_0);
    (B) plumb format into routeModel, keep O1 for hype-morph formats only. Run's value:
    full pipeline E2E proof (Kling env + CORS + EDL) + the O1 format-fit bug nailed.
24. **P1 — preset (IMPACT-family) final render fails `scene_build_failed: … 'filter_complex':
    Filter not found` (2026-07-15 ~23:49 PHT, branch preview, Neil clicked a preset chip
    after the RAW download).** Runtime log shows the failing chain is the HOOK BURN
    light-leak (eq brightness/gamma steps + `gblur=sigma=6`, from
    `buildTransitionFilters`/hook `burnTransition` in api/_lib/drawPlan.ts:889-916) — the
    error echo starts at `blur=sigma=6` (leading `g` absent) + "Error parsing global
    options", so EITHER the Vercel `ffmpeg-static` binary lacks `gblur` OR the graph arg
    is getting mangled before spawnSync. RAW/none preset unaffected (stitchedOnly skips
    transitions). IMPACT rendered fine on Jul 13 — suspect the burn path first fires on
    multi-scene hook ads or regressed with the overlay-engine commit (`d74ee61`).
    **NARROWED (same night, Neil tested ALL chips — impact/clean/punch/bars/spotlight
    all fail, rollback banner works as designed):** every failure has the same shape —
    **scene 0 (hook, layers=0, NO drawtext) builds fine in ~12s; scene 1 (first
    captioned scene) dies at graph parse.** Two different truncated tails confirm two
    different graphs failing identically (burn-head chain AND a drawtext/shadowcolor
    chain). ffmpeg does not name the missing filter (it echoes the graph +
    "Filter not found"), so by elimination the caption `drawtext` chain is the prime
    suspect. Ruled out: version drift (all lockfiles pin ffmpeg-static@5.3.0,
    integrity-locked) and the filter set per se (local 5.3.0 win32 binary = ffmpeg
    6.1.1 gyan essentials, HAS drawtext/gblur/zoompan/amix). Remaining suspects: the
    5.3.0 LINUX release asset lacking a filter the win asset has, or a build-cache
    bust today (lockfile-restore commit dc05043) swapping the cached binary for a
    fresh postinstall download. **Decisive next-session test:** run `-filters` on the
    DEPLOYED binary (one-off probe) or diff `ffmpeg -version` banner via a temp log in
    the render handler (api/_lib TUNED — needs Neil GO), then fix at the real layer.
    Presets worked Jul 11/13 on older deployments of THIS branch — environment
    regression, not graph regression (overlay engine verified byte-invariant).
    Until fixed: RAW downloads fine; preset chips dead on current branch previews —
    NOTE: if the cache-bust theory is right, PROD's next deploy (merge train) could
    hit the same wall — **preset render smoke is now a launch-gate item.**
    **RESOLVED 2026-07-16 (~00:25 PHT):** temp probe route (api/debug/ffmpeg-probe,
    token-guarded, DELETE before merge) proved the deployed linux binary was **ffmpeg
    7.0.2-static johnvansickle WITHOUT drawtext** (ffmpeg 7 needs libharfbuzz for
    drawtext; the static build omits it) while the win32 asset of the SAME
    ffmpeg-static@5.3.0 is gyan 6.1.1 WITH drawtext — per-platform feature drift
    inside one package version. Presets worked Jul 11/13 off an older cached binary;
    today's lockfile-restore commit busted Vercel's build cache and pulled the broken
    7.0.2 asset. **Fix `39c27d4`: pin ffmpeg-static@5.2.0** (linux asset = ffmpeg
    6.0-static, drawtext present) — burn-in harness 2/2 + 705 tests green locally,
    post-deploy probe confirms `drawtext:true` + full filter set. npm-11 lockfile
    churn guard applied during the pin (optional @types/react entry re-restored).
    Launch-gate item STAYS: preset-render smoke after every prod deploy (binary is
    downloaded at build time — this class can recur on any cache bust/version bump).

## 4c. try_on LAUNCH-GATE run findings (2026-07-18, storyboard stage, Neil's eyeball — pre-filming)

Run: `try_on`, v2 assets (`tests/fixtures/sample-batch-v2/`), Presenter = SET (`after.png`),
prod (`grifon.ai/app?osaEngine=producer`). Storyboard came back 4 scenes, avatar identity
lock held across all 4, v2 realism scaffold visibly carried into the frames.

1. **S1 color-grade mismatch (warm/orange cast) vs S2–S4's neutral bathroom grade.** One ad
   should read as one look. Mitigated in-run via per-scene REGENERATE; log corroboration if
   other runs show a per-scene grade drift pattern (candidate: color/grade consistency rule,
   TUNED, gated).
2. **S2 product hallucination: floating dropper** — dropper hovering mid-air at face level
   while the avatar holds the bottle; physically impossible frame. THE eval focus of this run
   ("no product hallucination") — first live hit. Mitigated via REGENERATE; corroborate
   across runs before any prompt proposal.
3. **Taglish naturalness, S4 script line:** "Bet ko na, kaya click mo na para free shipping
   ngayon." Neil: "Bet ko na" is off — natural register is "Bet ko 'to" / "Bet na bet ko";
   CTA is missing a linker ("para **makakuha ka ng** free shipping" / "para **sa** free
   shipping"). First corroboration point (1/3) toward a Taglish-naturalness pass on the
   script prompt (TUNED, ≥3 gate). Accepted for this run — image regen doesn't re-roll the
   line and Gates A/B/C don't depend on it.
4. **tryon instant-claim guardrail watch:** S1 = product in-hand + "Skeptical ako, pero look
   at this glow" — instant-reveal shape in beat 0, no problem-hook beat. Echoes the
   transformation beat-0 pattern (4b #6/#10, systematic there). Watch whether the tryon
   guardrail from the grill bundle held or this counts as a violation instance.

## 5. Post-batch (agent work, after Neil's eyeball)

1. Cut the best 2–3s beat per winner →
   `public/samples/formats/<recipeId>.mp4` (h264, **muted**, ≤400KB) +
   `<recipeId>.webp` poster (≤40KB). ~4MB total budget, `preload="none"`.
2. Populate the `SAMPLES` manifest in `components/OneShotAd/recipes.ts` (winners only;
   absent cards keep the placeholder).
3. File bugs for failures; update `ugc_pro_formats_plan.md` + `launch_readiness.md`.
4. Then: open the PR for `feat/niche-coverage-cheap-fixes` → `main` (Neil's call) and
   propose **"Recipe"** into `UBIQUITOUS_LANGUAGE.md`.

## 6. Neil's checklist (the only human steps)

1. **GO** — confirms paid Gemini quota spend (~12 producer runs).
2. Log in at the app so the browser session is authenticated (OTP wall, no dev bypass).
3. Fire runs 1–12 per the matrix, uploading the mapped assets each time.
4. Eyeball priority renders: try-on (5), unboxing ASMR (8), service B&A (11).
25. **P1 — hook goes BLANK (no title, no captions) on every caption preset when the EDL
    omits scene-0 overlayText (2026-07-16, punch/spotlight cuts, try_on run 3).**
    drawPlan.ts:511-513: for isHook scenes the ONLY text source is `overlayText[0].text`
    — absent → `return []` (log-proof: scene=0 layers=0 on all preset jobs, while
    scenes 1-3 get 4/1/1). The tryon EDL emitted no hook overlay; Jul-13's run did —
    why hook titles "worked" before. Fix candidate (TUNED, grill item 5): fallback
    `overlay?.text ?? scene.scriptLine` (title-rules-truncated) so hooks are never
    naked. RAW unaffected (stitchedOnly plans no layers by design).
26. **P1 — hook VO missing/inaudible on preset cuts; RAW hook VO is fine (2026-07-16,
    Neil's ears + measurements).** Voice mp3 IS downloaded per job (identical
    detectedSec=2.59) and [1:a] is the mux base, so suspicion falls on the concat/music
    stage (ugcpro→testimonial.mp3 alias bed): envelope INVERTS (RAW t0=-14dB speech
    burst; PUNCH t0=-18.5 quiet, t1=-15 music ramp) and speech-band 300-3400Hz over
    the hook is LOWER on punch (-19.8) than raw (-17.7) despite added music energy —
    VO absent or fully buried at the mix. Needs one code pass over music gain/ducking
    for scene-0 (renderFfmpeg concat stage, TUNED — grill item 6).
27. **P2 — SPOTLIGHT karaoke-invert active-word box MISALIGNED, overlaps the base
    phrase (2026-07-16, Neil's preset-switch test).** Frame-proof at ~4.5s: base
    "Grabe, ang" outlined + white invert box drawn over "a[ng]" at wrong x — reads as
    double captions. NOT cross-preset contamination: the punch cut at the same
    timestamp is clean (pure word-pop, no box) — Neil's switch flow was a valid test
    and preset state does NOT leak between renders. Likely estWidth() estimate vs
    drawtext kerning drift on the per-word x (drawPlan, TUNED — grill item 7).
28. **WATCHLIST — caption timing vs VO (Neil's premortem, 2026-07-16):** "hindi timing
    dun sa script ung paglabas ng text" — chunk timings are estimate-driven; no logged
    finding yet with timestamps. Eval critics on runs 4–8: grade caption-to-VO sync
    explicitly (flag lines appearing >300ms off their spoken word).
29. **FEATURE ASK — "All generations" library (Neil, 2026-07-16, Higgsfield ref):**
    users who don't download at First Cut have no way back to their rendered videos.
    Producer runs persist server-side (producer_runs/scenes + R2 finals) so the DATA
    exists — missing is the user-facing gallery (list + replay + re-download; respects
    R2 lifecycle). Roadmap: post-launch scope decision pending Neil.
30. **P2 — thumbnail generated but UNSURFACED in producer flow (2026-07-16):** the
    orchestrator runs a `thumbnail` stage ("Polishing the final cut") — paid output —
    but FirstCutScreen renders no thumbnail preview/download. Users can't get the
    thumbnail they paid compute for. Fix: surface + download button on First Cut (UI).
31. **P2 — resume-to-First-Cut shows a bare black screen w/ tiny spinner (Neil,
    2026-07-16 screenshot):** command center → back into an active/done run hits
    ProducerFlow.fromRow rehydration with no branded loading state. Fix: GlassPanel
    skeleton + copy ("Binabalik ang cut mo…") on the resume path (UI, components/).
32. **EXPERIMENT RESULTS — audio lane (2026-07-16, ~01:20):**
    (a) **Tail item = NO BUG, dropped from the bundle.** The S4 voice mp3 (pulled from
    R2) is 6.09s with real speech to ~4.74s — the razor trim (4.80) is near-perfect,
    ~0.06s hold. The critic's "~3s dead air" was an anchoring artifact (pass B was
    asked to confirm/refute pass A's timestamps — it confirmed a wrong one). Eval SOP
    correction: corroboration passes must NOT see the first pass's timestamps.
    (b) **Hook VO (#26) evidence upgraded to DEFINITIVE:** spectrogram of the punch
    cut's hook = pure music texture, ZERO speech harmonics (raw = clear syllable
    bursts). Exonerated by exact local repro on the raw cut: mixMusic duck graph
    (t0 -14.0 preserved) AND loudnorm master (-13.9) — both innocent; ffmpeg
    auto-splits input streams so the [0:a] double-use is legal. Remaining suspect:
    per-scene mux for isHook+keepFullClip under a non-stitchedOnly preset. Next:
    RUN_BURNIN-style harness repro with tone-voice on the hook, AFTER the in-flight
    executor bundle lands (same files — avoid the race).
