# UGC Pro Formats — Launch Format Expansion (PRD)

> **Provenance:** Grilled via AskUserQuestion alignment + 15-video evidence base
> (13 Higgsfield format demos + 2 One Peak Creative real ads), **decisions locked
> by Neil 2026-07-08**. Written on Fable 5 before the Jul 12 credit cutoff so the
> hard thinking (taxonomy, skeletons, draft prompt blocks) is done; **execution =
> next session** (paste-ready kickoff at the bottom).
> **Evidence-gate status: WAIVED by Neil 2026-07-08** — competitor-validated
> (Higgsfield productized these after their own TikTok research; One Peak = real
> studio ads). Logged in `viral_swipe_file.md` Competitor Format Intel. Post-launch,
> real user telemetry re-validates.

## Why (Context)

- Grifon's format menu today (MrBeast / Testimonial / Temu / Services / RealEstate)
  has a **fashion + physical-product UGC gap**: no try-on, no first-class unboxing,
  no before/after, no tutorial. Higgsfield (funded competitor) productized exactly
  these — but **only** for physical product/skincare/fashion. **They have no
  services/RE. Grifon ships their whole catalog PLUS the services moat.**
- Neil's launch goal: "pwede tayo sa iba't ibang niche na business pag launch."
- One Peak's own winning ad (168s VSL, autopsied) sells the thesis: creators need
  **proven formats**, not more hook theory. Formats-as-product is validated.

## Decisions (Neil, 2026-07-08)

| # | Decision | Choice |
|---|---|---|
| 1 | Evidence gate | **Waived** for this build (competitor-validated); swipe file logs the waiver |
| 2 | Scope | **All 4 families**: Virtual Try-On, Unboxing (std+ASMR), UGC Demo+Addiction, Before&After+Tutorial |
| 3 | Architecture | **One new `scriptType: 'UGCPro'` + sub-format classifier** (Temu-classifier precedent) — ONE tuned adscript branch + ONE storyboard branch, sub-format switches inside |
| 4 | Services moat | **Yes** — services/RE flavors of the same skeletons designed in this plan |
| 5 | Giant Figure (FOOH/CGI) | **Deferred** — different grammar (CGI compositing), not UGC; revisit post-launch |

## Evidence base (all autopsied, JSONs disposable, findings in swipe file)

Batch 1 (H1–H6): try-on transformation, talking-head demo, ASMR unboxing ×2,
haul+fit-proof, POV demo. Batch 2 (N1–N7): hidden-feature hack demo (blender),
skincare PAS glow toner, snack Addiction + glowing-tongue payoff, perfume
3-step tutorial, window-cleaning B&A, one-swipe beauty transformation,
upholstery spot-clean B&A. One Peak (real ads): 70s app tutorial ad; 168s
Format Finder VSL (P9-grammar captions: 1–3 words, 0.4s swap, white+gold).

**Shared demo DNA (13/13):** 10–16s · zero captions · spoken conversational hook
≤2s · product visible ≤3s · 1–7 shots, hard cuts only (P3-consistent) · sensory
or objection-killing proof beat · continuous performance (same avatar, same
place) · polished-ugc register. **One Peak real ads:** captions ON in P1/P2/P7
grammar — confirming the **Grifon hybrid bet: Higgsfield performance grammar +
Grifon caption system beats caption-less demos on sound-off paid feeds.**

## The 5 sub-formats (taxonomy + skeletons)

`UGCPro` sub-format is chosen by the user (picker chips) or auto-classified from
the brief (classifier prompt, Temu precedent). All storyboards inherit: same
avatar + same location across scenes, HARD CUTS between beats (**no morph** —
ships the P3 hard-cut hook variant as part of this build), captions ON by
default (renderer), 12–18s default runtime, product/subject in frame ≤3s.

### 1. TRY-ON (fashion flagship)
- Evidence: H1, H4 + Higgsfield "Virtual Try-On / Unboxing Virtual Try-On / Sneakers"
- Script formula: Hook w/ product in-hand or on-hanger ("Okay, I had to try this
  set. Watch this.") → HARD CUT to worn → styling escalation OR fit-proof beat
  (squat test = objection killer) → verdict ("Obsessed. This is staying on.")
- Storyboard skeleton: S1 Hook (product held, NO morph — hard-cut reveal), S2
  worn reveal (same avatar, same room), S3 styling/fit-proof action, S4 verdict
  close-up. 4–5 scenes.
- Uploads (REQUIRED for consistency): product flat/hanger + **worn on-body**
  photo. Generating "worn" from flat = fit/drape hallucination; real worn photo
  anchors it. Packaging optional (enables unbox-try-on combo).

### 2. UNBOXING (standard + ASMR flag)
- Evidence: H3, H6 + Higgsfield "Unboxing / Unboxing ASMR"
- Script formula: sensory hook ("Okay, mic check… just listen to the taps." /
  pure taps) → unbox @~3s → tactile showcase (foam, wrap, clicks) → soft CTA
  ("tell me and I'll do the full setup next").
- ASMR flag: audio-led, minimal/no VO, whispered register, captions minimal.
- Storyboard: S1 Hook (taps/mic-check), S2 unbox reveal, S3 tactile demo, S4
  place/wear + soft CTA. Overhead or locked-off framing variant.
- Uploads (REQUIRED): product + **packaging/box** (packaging is the co-star).

### 3. DEMO / ADDICTION (talking-head product demo, hidden-feature hack, obsession loop)
- Evidence: H2, H5, N1 (blender secret mode), N3 (snack "I cannot stop" +
  glowing-tongue payoff) + Higgsfield "UGC / UGC Addiction"
- Script formula: bold-claim or secret hook ("Nobody uses this blender's secret
  pro mode." / "I need to warn you — dangerously addictive.") → demo beats →
  sensory/stunt payoff (the mid-video dip killer) → spoken CTA holds to end.
- Storyboard: S1 Hook (product in-hand), S2–S3 demo/proof, S4 payoff stunt or
  close-up, S5 CTA. Fastest cuts of the family (1.4–2.4s median).
- Uploads: hero + in-use/in-hand shot (recommended).

### 4. TRANSFORMATION (Before & After) — **the services bridge**
- Evidence: N2 (skin glow), N6 (one-swipe beauty), N5 (window B&A), N7
  (upholstery extraction) + Higgsfield "Before and After"
- Script formula: visual problem hook ("Tell me why my skin looks exhausted?" /
  "Look at this window: dust, fingerprints…") → application ("watch this — one
  swipe / two sprays") → INSTANT hard-cut reveal → verdict + CTA ("If yours
  looks like this, hit it back.")
- Storyboard: S1 Problem close-up (the before IS the hook — no product reveal,
  mirrors the Services hook rule), S2 application, S3 hard-cut after-reveal, S4
  verdict/CTA.
- **Services flavor (moat):** identical skeleton, `work`-archetype
  before/after slots already exist and route via venueSlot — cleaning, pest,
  derma clinics, detailing. This sub-format serves BOTH businessType=product and
  businessType=service from one skeleton.
- Uploads: product path = product + (optional but recommended) real before/after
  states; services path = existing before/after slots.
- ⚠️ **CMO/policy caveat:** Meta restricts personal-health/appearance before-after
  claims (skincare especially). Copy must show *product result on surfaces/fabric
  freely*, but skin transformations need soft framing ("glow", not medical
  claims). Bake a guardrail line into the sub-format prompt.

### 5. TUTORIAL / HACK (steps + how-to)
- Evidence: N4 (perfume 3-step layering), One Peak 70s app walkthrough +
  Higgsfield "Tutorial"
- Script formula: pain/question hook ("Your perfume fades by noon? You're
  skipping one step.") → steps 1-2-3 (tight, ≤3s each) → result → CTA. Long
  variant (apps/SaaS, One Peak style): hook joke → walkthrough → social proof →
  CTA.
- Storyboard: S1 Hook, S2–S4 one step per scene (numbered captions — our caption
  system shines here), S5 result/CTA.
- Uploads: product + step-context shots (optional).
- Services flavor: "how we deep-clean an aircon in 4 steps" — authority-builder
  for practitioners; RE flavor: "3 things to check before buying a condo" (agent
  authority — pairs with the walking/authority UGC hunt).

## Architecture / touch surface (execution session)

**TUNED (gated, the crown-jewel work — do on the strongest model available):**
1. `api/_lib/prompts.ts` — `buildAdScriptPrompt`: one `isUGCPro` branch with the
   5 sub-format formulas above (draft skeletons in this doc are the starting
   text). A `UGCPRO_CLASSIFIER_PROMPT` mirroring `TEMU_CLASSIFIER_PROMPT`
   (:257) for auto sub-format pick from the brief when the user doesn't choose.
2. `api/_lib/prompts.ts` — `buildStoryboardPrompt`: one `isUGCPro`
   `strategyInstructions` branch encoding: continuous-performance grammar (same
   avatar/location lock), HARD-CUT Scene-1 hook (**no morph frames** — the P3
   gated proposal ships here; scene 1 emits a single `imagePrompt` like scenes
   2+, or start/end frames constrained to hard-cut states), per-sub-format beat
   skeletons, product-state anchoring (see slots below).
3. `api/_lib/renderPresets.ts` — captions-on defaults per sub-format (ASMR =
   minimal); candidate: word-pop chunking per P1/P2 (already applied patterns).
4. `types.ts:589` `scriptStyleDetected` + EDL keying for `ugcpro`.

**Plain config/UI (free):**
5. `types.ts` — `scriptType` union += `'UGCPro'`; `ugcProFormat?: 'tryon' |
   'unboxing' | 'demo' | 'transformation' | 'tutorial'` + `asmrFlag?`.
6. One-Shot `LaunchScreen.tsx` — Format axis gains the sub-format chips (mirror
   Higgsfield's composer UX: format + sub-choice, not a flat list); wizard
   `Step2BusinessInfo.tsx` picker card.
7. **Product-state upload slots** — extend the `guidedPhotoSlots.tsx` machinery
   to physical products per sub-format: `hero` / `onbody` / `packaging` /
   `inuse` / `before` / `after`. Slot lists = plain config; the slot→scene
   routing legend line for products = ONE tuned line (same shape as the
   bathroom line, Neil-gated, precedent set 2026-07-08).

**Build slices (each build-gated + brand-checked + gemini-eval'd; implementation → code-executor):**
- Slice 1: ✅ **SHIPPED 2026-07-09** — types + classifier + adscript branch (TRY-ON +
  TRANSFORMATION) + One-Shot picker, wired end-to-end. See Execution Log below.
- Slice 2: storyboard branch + hard-cut hook + product-state slots + routing.
- Slice 3: remaining 3 sub-formats + ASMR flag + caption defaults.
- Slice 4: services/RE flavors + regression (gemini-eval per sub-format) + docs.

## Verification
Per slice: `npm run build` + `npm run test` + new unit tests (classifier
mapping, sub-format→skeleton selection, slot routing). End-to-end per
sub-format: dev-seeded run → `gemini-eval` against the new rules → **Neil
eyeballs rendered output** (Scene-6 lesson). Regression brands: add a fashion
brand (try-on) + reuse Bukidnon Brew (demo/tutorial).

## Swipe-file bookkeeping (done this session)
Competitor Format Intel holds all 15 autopsies; gate waiver logged; P3
hard-cut proposal ships via this build (update its status when Slice 2 lands);
One Peak #2 noted as P1/P2/P7/P9-consistent real-ad evidence (counts NOT
incremented — render_audit ground-truth not run; optional next session).

## Execution Log

### Slice 1 — SHIPPED 2026-07-09 (branch feat/niche-coverage-cheap-fixes, e93b018 + follow-up)

**Built:** `UGCPro` scriptType + `ugcProFormat`/`asmrFlag` types (all 5 values typed);
`UGCPRO_CLASSIFIER_PROMPT` (TRYON vs TRANSFORMATION only — extend in Slice 3);
`isUGCPro` adscript branch (TRY-ON + TRANSFORMATION skeletons); One-Shot LaunchScreen
picker (Auto / Try-On / Transformation chips) wired end-to-end through
`ProductionInput` (both defs) → `mapReportToWizard` → `businessInfo.ugcProFormat`
→ server (explicit pick skips classifier; Auto/unimplemented values classify);
draft persistence for the chip choice; 9 unit tests + 2 skip-gated live regression
fixtures (new fashion fixture "Hiraya Active" for try-on; skincare fixture reused
for transformation).

**Verified:** build-gate PASS · 545 tests · client-bundle leak-check 0 hits ·
brand-check (adversarial critic, 2 passes) BRAND_PASS_WITH_NITS 43/50 ·
gemini-eval (adversarial critic, 5 rounds) FINAL **GEMINI_PASS_WITH_NITS** on the
shipping pair (round-3 TRY-ON + round-5 TRANSFORMATION). Zero banned CTA phrases
across all 8 generated outputs; zero price leaks ever; appearance guardrail held.

**Tuned additions beyond the original draft skeletons (each Neil-gated in-session):**
SOFT CTA GUARD (banned CTA phrases + price-leak guard + offer soft-weave — Neil
ruled the weave OPTIONAL, UGC-native + CTA CLOSE HARD RULE: final word Tagalog);
exemplar anti-copy caveat on TRY-ON beat 0; UGC-adapted DIRECTOR_CRITIQUE (4-12
range); beat-1 verb reinforcement (posed "Eto ang [product]" ban).

**Carried into Slice 2 (from the eval loop — read before starting):**
1. **RELIABILITY (the big one):** TRANSFORMATION beat 1 (Application verb) failed
   4/4 prompt formulations and only passed on a pure re-roll (roll 5/5). Critic's
   standing recommendation: deterministic post-parse verb check on the beat-1 line
   (`capHookLine` pattern, prompts.ts ~:708) — Neil-gated, decide in Slice 2.
2. TRY-ON systematic nits, one-line TUNED fixes next pass: beat-3 keep-it verdict
   sometimes dropped; "Grabe" hook-echo opened body line 1 in 3/3 rolls (add "do
   not reuse the hook's opening exclamation in any body line").
3. Optional guard line (critic round-4): "if the CTA uses a borrowed verb, open on
   'Tara,' — never open the CTA on the English verb."
4. Brand nit: "TRANSFORMATION" chip renders lopsided at 375px (no overflow —
   cosmetic); consider a shorter label. Optional: smoke-tester click-through
   confirming `ugcProFormat` in the request payload.
5. Step2BusinessInfo wizard picker card (plan item 6) deferred out of Slice 1.

## Paste-ready kickoff (next session)

> Read `CLAUDE.md`, `workflows/ugc_pro_formats_plan.md` (in full), and the
> Competitor Format Intel section of `workflows/viral_swipe_file.md`. We are
> executing the UGC Pro formats plan — all decisions are locked in the doc
> (gate waived, 5 sub-formats, one UGCPro scriptType + classifier, services
> flavors). Start with Slice 1 (TRY-ON + TRANSFORMATION + picker). Draft the
> /goal per the Plan→Goal pipeline citing the build-gate pass message +
> gemini-eval. Tuned edits to prompts.ts follow the draft skeletons in the plan
> doc — show me the final prompt text before applying. Implementation via
> code-executor.
