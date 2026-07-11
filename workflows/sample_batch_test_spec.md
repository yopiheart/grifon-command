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

## 3. Run matrix — 12 runs

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
