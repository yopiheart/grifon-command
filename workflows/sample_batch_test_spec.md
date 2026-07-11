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
12. **Trailing ~2s dead air in the final render** — end-of-video not trimmed. This is the
    EDL cut-pacing evidence class the Rule 0a `ugcpro` gate waits on; needs the actual
    mp4s (all three presets) to diagnose end-trim vs padding source.
13. **Preset switcher farms multiple deliverables** — AUTO → download, IMPACT → download,
    CLEAN → download off one filmed run. FFmpeg re-edit only (no new Gemini spend), so
    likely fine — flag for pricing/abuse review. Omni edit presets absent from product =
    expected (dev-lab only, gated proposals; roadmap #18 two-layer editing).

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
