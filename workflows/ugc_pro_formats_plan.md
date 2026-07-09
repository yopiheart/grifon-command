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
- Slice 2: ✅ **SHIPPED 2026-07-09** — storyboard branch + hard-cut hook + product-state
  slots + routing, wired end-to-end. See Execution Log below.
- Slice 3: ✅ **SHIPPED 2026-07-09** — 5-format family complete + ASMR + deterministic
  caption/music identity. See Execution Log below.
- Slice 4: ✅ **SHIPPED 2026-07-09** — services/RE reach + flavors (operator/agent
  voice, service B&A + tutorial, RE tutorial) + classifier clamp + regression
  fixtures + docs. See Execution Log below. gemini-eval deferred to the batch gate.

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

### Slice 2 — SHIPPED 2026-07-09 (branch feat/niche-coverage-cheap-fixes, 8330741)

**Built (§1–§5 of the approved plan `~/.claude/plans/cuddly-cooking-phoenix.md`):**
- **§1 Sub-format propagation:** `Script.ugcProFormatResolved`; the `adscript` handler
  returns it; client back-fills `businessInfo.ugcProFormat` (nullish — an explicit chip
  pick is NEVER clobbered by the classifier) on all **three** live gen paths
  (`producerOrchestrator`, `useOneShotGeneration`, `Step3AdScript` via a new optional
  `setBusinessInfo` prop). Storyboard now always agrees with the script, even on Auto.
- **§2 TUNED storyboard branch** (`buildStoryboardPrompt`): `isUGCPro` strategy arm with
  TRY-ON + Before&After beat skeletons + continuous-performance grammar; **hard cuts only**
  — Scene 1 emits a single `imagePrompt`, no start/end frames, no `transitionEffect` (the
  P3 hard-cut hook ships here, prompt-only — the renderer already degrades to a still when
  the frame pair is absent, via `isHookMorph`). Hook block made 3-way (Services/UGCPro/
  morph); **PACING RULE 3-consecutive-avatar ban LIFTED for UGCPro** (deliberately one
  performer); OUTPUT SCHEMA gains the frameless Scene-1 shape. Unimplemented sub-formats
  degrade to Before&After, not the generic morph strategy.
- **§3 Reliability (the carried big one):** deterministic `hasApplicationVerb` guard
  (`capHookLine` pattern) + **detect-and-re-roll-ONCE** in `api/gemini/text.ts` when
  TRANSFORMATION `body[0]` lacks an application verb. Neil's call: re-roll, never
  regex-rewrite the model's line (matches the roll-5/5 behavior that actually passed).
- **§4 Product-state slots:** `hero`/`onbody`/`packaging`/`inuse` added to both type
  unions; `UGCPRO_UPLOAD_SLOTS` (hero-first invariant) + One-Shot guided tiles;
  `venueSlot` routing + product `slotLegend` opened to UGCPro (one tuned legend line).
- **§5 Ride-alongs (all 4):** TRY-ON line hygiene (mandatory keep-it verdict; no hook-echo
  opener) + CTA borrowed-verb guard (both TUNED); Step2 sub-format picker card (parity
  with One-Shot chips); "Before & After" replaces the lopsided-at-375px "TRANSFORMATION".

**Verified:** build-gate PASS · **565 tests** (+10 new: verb guard, propagation nullish-
preserve, storyboard branch content/absence assertions, hero-first invariant) · client-
bundle leak-check **0** for all crown-jewel phrases · brand-check (adversarial critic,
blind) **BRAND_PASS_WITH_NITS 38/50, 0 CRITICAL** — 3 nits fixed (shrink-0 + w-5/gap-3 on
the Step2 header icon; tile desc 10px→11px; chip `text-center leading-tight`).

**Both plan landmines handled** (they were the easiest to miss): the hook block was a hard
`isServices ? … : …` binary that would have fed UGCPro the morph HOOK ANCHOR RULE; and the
PACING RULE would have forced metaphor B-roll into a format that forbids it.

**Deferred (NOT done — do next session):**
1. **Live DOM smoke** — auth-gated: app is OTP-only; the documented Gmail-OTP relay was
   blocked by Claude Code's permission classifier (PII). Re-run once Neil pre-authenticates
   the smoke session OR approves the Gmail read. Confirms: 3 chips render at 375px, Try-On
   reveals hero-first `onbody` tile, `ugcProFormat` in the request payload. (Picker→intake
   wiring is already unit-tested; this is real-DOM confirmation.)
2. **gemini-eval** on a fresh TRY-ON + Before&After storyboard pair (burns Gemini quota via
   a seeded gen) — assert hard cuts (no `transitionEffect`), same-avatar/same-location
   continuity, no banned CTA phrases, no price leaks, Meta health-claim guardrail on
   TRANSFORMATION. **Needs a Test Spec + Neil GO** (paid; `smoke_test_setup.md` gate).
3. **Neil eyeballs a rendered TRY-ON output** before Slice 2 is "done-done" (Scene-6 lesson).
4. Example assets for the new non-hero slots (onbody/packaging/before/after/inuse) — none
   exist under `public/examples/`; tiles ship without a reference example. Generate via
   `codex-image` when convenient.

**Carried into Slice 3 (unchanged from the plan's Out-of-Scope):** unboxing/demo/tutorial
sub-formats, ASMR flag, caption defaults (`renderPresets.ts`), `scriptStyleDetected` EDL
keying for `ugcpro`, services/RE flavors, and folding `Step2BusinessInfo`'s duplicate slot
lists into `guidedPhotoSlots.tsx`.

### Slice 3 — SHIPPED 2026-07-09 (branch feat/niche-coverage-cheap-fixes, ea3fe17)

**Built (two-phase: Phase A structural via code-executor, Phase B TUNED Neil-approved x1):**
- **5-format family complete:** UNBOXING / DEMO / TUTORIAL adscript + storyboard arms
  (verbatim skeletons per PRD §2/§3/§5); classifier 5-way with precedence rules;
  honor-explicit widened to all 5 (**closed the bug-in-waiting:** an explicit Unboxing
  pick was falling to a classifier that could only answer 2 ways).
- **Deterministic render identity (Neil's call — never ask the EDL what we already
  know):** `music.style` overridden to `'ugcpro'` when scriptType==='UGCPro' at both
  live sites; `ROTATION.ugcpro=['hype']` ships the P1/P2 word-pop + gold caption bet;
  `MUSIC_STYLE_PROMPTS.ugcpro` phone-shot lo-fi brief. TUNED EDL Rule 0a untouched —
  before this a UGCPro ad detected as `testimonial` → CLEAN preset (no word-pop).
- **ASMR v1 (prompt-register + defaults, NO TTS changes** — no whisper register exists
  in the ElevenLabs surface; deliberate scope call): asmrFlag plumbed end-to-end;
  Unboxing-only toggle (both composers, reset-on-switch, aria-pressed); ASMR REGISTER
  (adscript) + ASMR TREATMENT (storyboard) gated blocks; captions + music seeded OFF
  for ASMR runs via `utils/asmrSeeds.ts` (user-flippable — the taps ARE the audio).
- Picker → 2×3 chip grid (holds at 375px, critic-verified with column math); slots:
  unboxing = hero+packaging(required)+inuse, demo/tutorial = hero+inuse; hero-first.

**Verified:** build-gate PASS · **608 tests** (+43 this slice) under the default vitest
pool · client-bundle leak-check **0** across 7 phrases · brand-check (adversarial,
blind) **BRAND_PASS_WITH_NITS 38/50, 0 CRITICAL** — 4 nits fixed (aria-pressed +
no-fill toggle style on both surfaces; 44px floor on Step2's toggle; w-4 icon rhythm;
stale Auto sub-label).

**Known gaps / deferred (add to the Slice-2 deferred list):**
1. **No static `ugcpro` music bed file** — a non-ASMR UGCPro render without a generated
   bed degrades to no static music (warn + skip). Supply a bed or rely on the
   ElevenLabs-generated path.
2. An executor-reported vitest-threads crash did NOT reproduce under plain
   `npm run test` in the main environment (608 green, default pool) — no action taken;
   noted in case CI ever shows it (one-line fix would be `pool:'forks'`).
3. Live DOM smoke (OTP auth wall — classifier blocked the Gmail relay), gemini-eval per
   sub-format (Test Spec + Neil GO), Neil eyeballs an unboxing + TRY-ON render.
4. Example assets for non-hero slots still missing (codex-image when convenient).

**Carried into Slice 4:** services/RE flavors + regression sweep + docs (per original
slice list); teaching Rule 0a `ugcpro` ONLY if gemini-eval shows EDL cut-pacing wrong;
TTS whisper register (real ASMR read); Step2 duplicate-slot-list fold; static ugcpro bed.

### Slice 4 — SHIPPED 2026-07-09 (branch feat/niche-coverage-cheap-fixes; Phase A 59da67a, Phase B/C this commit)

**Built (three-phase: A structural via code-executor 59da67a; B TUNED drafted → Neil
APPROVED verbatim → applied in main loop; C tests via code-executor):**
- **Phase A (59da67a):** `businessType` as the vertical's own field on `ProductionInput`
  (both defs); LaunchScreen format axis unlocked for service/RE with per-vertical
  sub-format chips; Step2 UGC Pro card in all three groups + the `productOk` clobber
  LIVE BUG fixed; `MUSIC_BED_ALIAS ugcpro → testimonial` (a real ugcpro.mp3 supersedes
  with no code change). Details in the Phase-A commit message.
- **Phase B (TUNED, Neil-approved 2026-07-09):** all gated on
  `bt = businessInfo.businessType ?? 'product'` —
  - adscript: FIRST-PERSON OPERATOR voice (service — explicitly overrides the Services
    customer-voice rule for UGC Pro only) + AGENT ON-SITE voice (RE); service B&A
    skeleton (the WORK is the mechanism, book CTA); service Tutorial ("ganito namin
    ginagawa" authority-builder); RE Tutorial (agent-authority listicle + the hoisted
    PRICE RULE — same string, single source now); appearance guardrail extended to
    derma/aesthetic/dental/clinic results; "BOOK, DON'T SELL" line in the SOFT CTA
    GUARD for non-product only.
  - storyboard: service B&A / service Tutorial / RE Tutorial continuous-performance
    arms; PHILIPPINE GROUND-TRUTH REALISM blocks extracted to consts (byte-identical)
    and grafted into the non-product arms; slotLegend + venueSlot routing switched to
    the service/RE legends for non-product runs.
  - `UGCPRO_SERVICE_CLASSIFIER_PROMPT` (2-way: TRANSFORMATION vs TUTORIAL).
- **Phase C + A4:** classifier clamp in `api/gemini/text.ts` via exported
  `resolveUgcProSubType` — realestate → forced `'tutorial'`, NO Gemini call; service →
  honor explicit transformation/tutorial else the 2-way classifier; product unchanged.
  +31 unit tests (product-path invariance, clamp with never-invoked mock assertions,
  prompt-branch substrings, storyboard branches) + 2 skip-gated live regression
  fixtures (services B&A cleaning, RE tutorial with listingPrice).

**Verified:** build-gate PASS · **664 tests** (+31 this slice) · client-bundle
leak-check **0** with 3 new marker phrases (`ONE OPERATOR, ONE JOBSITE`,
`agent-authority listicle`, `FIRST-PERSON OPERATOR`) · **byte-for-byte invariance
proven by diff**: all 17 pre-edit fixtures (5 product subs × adscript+storyboard,
ASMR unboxing, Services, RE priced/unpriced) dumped before and after the Phase-B
edits — zero bytes changed. UBIQUITOUS_LANGUAGE.md gained the Operator/Customer/
Agent-on-site voice distinction + sub-format gating.

**Deferred to the batch gate (Neil's standing call 2026-07-09 — ONE batch after all
slices):** gemini-eval per sub-format (now incl. service B&A + RE tutorial), live DOM
smoke (OTP wall), Neil eyeballs rendered outputs (try-on, unboxing, and now a service
B&A). Carried (unchanged): EDL Rule 0a `ugcpro` ONLY if eval says so; TTS whisper
register; Step2 duplicate-slot-list fold; real `ugcpro.mp3` bed; example assets for
non-hero slots (codex-image).

## Next session: the batch evaluation gate

> All 4 slices are SHIPPED on `feat/niche-coverage-cheap-fixes`. What remains is the
> deferred batch gate (lists in the Slice 2/3/4 logs): write the Test Spec, get
> Neil's GO (paid Gemini quota), run gemini-eval per sub-format, live DOM smoke once
> Neil pre-authenticates, and Neil eyeballs rendered outputs. Then the PR.
