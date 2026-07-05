# Workflow: Post-Beta Roadmap

**Objective:** Track ideas Neil has explicitly endorsed but deliberately deferred until after the 5–10 hand-picked Filipino-owner beta closes. **This is the next file to open when `workflows/launch_readiness.md` hits 100% and beta is live.**

This is a parking lot, not a wishlist. Items here have:
- Neil's endorsement (logged in chat or commit message)
- A clear reason for being parked
- A defined "when to resume" trigger
- Enough scope notes to start without re-litigating the idea

Half-baked ideas don't go here — they go in conversation and either die or get promoted in. Items here have already passed Neil's gate once.

---

## Parked Items

### 1. Nightly Regression `/loop` — dev velocity · ✅ v1 SHIPPED 2026-06-30 (adscript) — remainder still parked

> **v1 status (2026-06-30, Loop Engineering / Move 1):** The loop is ARMED as a
> cloud GitHub Actions schedule — see [nightly_regression.md](nightly_regression.md)
> and the Tier 3 entry in [loops.md](loops.md). Decisions made: hosting = **GitHub
> Actions cron** (free, survives the defreezer — picked over VPS/Vercel Cron);
> v1 module = **adscript** (the already-built `tests/regression/script-gen.regression.test.ts`,
> chosen over storyboard to prove the skeleton with zero new test code); evaluator =
> **deterministic invariants only** (no LLM critic / no `.golden/` diff in v1 —
> Gemini output is stochastic, so byte-diff is the wrong tool and an LLM critic
> needs `ANTHROPIC_API_KEY` in CI, which is security-gated). Output channel = GitHub
> Issue per fail, as planned below. `tools/regression_runner.*` was NOT needed — the
> workflow + vitest JSON reporter cover v1. **Still parked (the remainder of this
> item):** (a) the Step 5 **storyboard** regression test — the spec's original v1
> module, highest IDENTITY_LOCK history, now "increment 2"; (b) the **LLM
> harsh-evaluator** that verifies by acting (Move 2); (c) **Bake-and-Leap** (below);
> (d) expansion to the other modules + `.golden/` semantic baseline. The notes below
> remain the resume context for all four.

> **Primitive mapping (2026-05-15):** This is the textbook [`/loop`](https://code.claude.com/docs/en/scheduled-tasks#run-a-prompt-repeatedly-with-%2Floop) use case (time-driven). The per-run verification step inside the loop is a [`/goal`](https://code.claude.com/docs/en/goal) — e.g., `/goal "all 11 modules produce baseline-matching outputs against .golden/, OR stop after 20 turns"`. When you unpark this, see the "Goal-driven execution" section in `CLAUDE.md` for the condition template and TUNED-file guardrails.

> **Headless fan-out option (2026-06-04, from the CC best-practices doc):** The runner body can also be non-interactive [`claude -p`](https://code.claude.com/docs/en/headless) instead of (or inside) a `/loop` — e.g. loop the 11 modules with `claude -p "regress module $m against .golden/$m.json. Return PASS or FAIL." --allowedTools "Read,Bash(npx vitest run:*)" --output-format json` and pipe the JSON to the failure channel. Same fan-out pattern applies to one-off batch jobs (e.g. the deferred conversion items): generate a file list, then loop `claude -p` per item with `--allowedTools` scoped tight. Test on 2–3 items, refine the prompt, then run at scale. This is the headless analogue of the `/loop`+`/goal` design above — pick whichever the chosen host supports (a VPS/GitHub-Actions cron can run `claude -p`; the in-IDE `/loop` cannot survive the cafe-PC defreezer).

> **Generator-Evaluator architecture (2026-05-20 brief):** Per the NotebookLM brief *Build Agents That Run for Hours* (Prabaker & Wilson, Anthropic) — when this loop is built, the per-module check must be a *separate harsh evaluator sub-agent*, not the runner grading its own output (a builder cannot reliably self-critique). Store the `.golden/` baseline as **JSON**: it is machine-diffed, not human-read, and the brief notes models overwrite Markdown more readily than JSON — so JSON fits *here*, even though the handoff docs deliberately stay Markdown. Flow: runner generates → fresh `general-purpose` evaluator sub-agent diffs the output against `.golden/*.json` → returns pass/fail → failures post to the output channel. The evaluator pattern is the same one now in `.claude/skills/{brand-check,gemini-eval}/SKILL.md` ("Run as a separate critic").

> **Second verdict type — Bake-and-Leap (2026-06-29):** This same harness gets a *second*, inverse verdict. Tier-1 regression asks "did anything REGRESS vs `.golden/`?"; Bake-and-Leap asks "did anything BLOCKED finally CROSS the threshold?" — the OpenAI-Codex "bake and leap" idea (keep model-capped features frozen with a test input, re-run them the instant a frontier model ships, see what's now good enough). Same runner, same separate-evaluator, opposite sign. The frozen-test registry is the model-capped parked items: #4 (Veo product-scale, `api/_lib/prompts.ts` storyboard builder), #5 (avatar emotion vs IDENTITY_LOCK, `services/geminiService.ts` ~1377-1390), #9 (Omni dead-first-second, `VIDEO_MODEL_SPECS['Kling_O1']`), #10 (trailing-silence trim, `components/EditVideo.tsx`). **Flags-not-applies on TUNED files** — a CROSSED verdict surfaces "the avatar-emotion test now passes on model X"; it does NOT autonomously edit the tuned prompt (TUNED-file guardrail + Neil approval, same flag-don't-apply rule as `pr_review_loop.md`). **Not a separate roadmap item** — it's one extra verdict on this loop, deliberately not built standalone. **Resume trigger (distinct from this item's regression trigger):** Vertex / Phase 5 lands, OR a frontier model update drops with ≥3 features waiting on the threshold. Until then the cheap version is a 20-min manual re-smoke of one capped feature when a model update ships. Don't build the leap-detector before the `.golden/` baseline it diffs against exists. *Source: 2026-06-29 session evaluating the OpenAI-Codex / Andrew Ambrosino "new shape of product work" brief against the codebase — verdict: most of the brief is already absorbed (WAT framework, loops, generator/evaluator); Bake-and-Leap was the one new idea; needed-now check = no, park it here.*

**What:** A Claude Code `/loop` (or an always-on VPS cron equivalent) that runs golden-path inputs through each of the 11 modules every night, captures outputs, diffs against last-known-good, and posts failures to a single channel (GitHub Issue, Discord webhook, or email).

**Why it matters:** Solo dev + 11 modules + tuned prompts that regress silently when Gemini ships model updates = a guaranteed Friday-night fire. The `/loop` converts that fragility from "I find out when a beta user complains" to "I see a diff in the morning."

**Why parked:** Beta + Bukidnon Brew regression + wizard state persistence (`launch_readiness.md` P0s) come first. Nothing about this loop helps the first 5–10 owners. It's leverage that pays off when there are *more* users + *more* releases.

**When to resume:** When beta is live AND Neil has shipped his second post-beta change without manual regression. The trigger is "I'm scared to ship without re-testing all 11 modules by hand" — that's the moment this loop pays for itself.

**Where to start:**
1. Define golden-path inputs per module — Bukidnon Brew brief is the model template (per `launch_readiness.md`). One brand-brief per module.
2. New `workflows/nightly_regression.md` SOP defining: trigger, golden inputs, success criteria, failure-output format.
3. New `tools/regression_runner.ts` (or `.py`) that hits each module via the existing API surface, captures outputs, diffs vs last-known-good baseline.
4. Hosting decision: cafe-PC won't survive (defreezer per `CLAUDE.md`). Options: cheapest always-on VPS (~$5/mo Hetzner/Vultr), GitHub Actions cron (free, Vercel-style ephemeral), or Vercel Cron (already paid).
5. Output channel: start with GitHub Issue per fail (zero setup, native diff viewer). Discord webhook is v2.

**Scope estimate:** 1–2 days for v1. Single fragile module first (Step 5 storyboard, given the IDENTITY_LOCK regression history) — expand once signal proves out.

**Source:** Idea originated from 2026-05-09 NotebookLM brief on Boris Cherny's "Sloop / agent loops" framework. Neil endorsed the dev-side application; rejected the consumer-side moat-shift framing from the same brief (see `~/.claude/projects/.../memory/feedback_outside_frameworks.md`).

---

### 2. Odyssey-as-Cron — the actual Autopilot tier feature

> **Primitive mapping (2026-05-15):** Trigger is `pg_cron` (or Vercel Cron); the per-Day verification inside `api/odyssey/tick.ts` is conceptually a [`/goal`](https://code.claude.com/docs/en/goal) condition — "Day N is published, verified by Supabase row marked posted, with no scene exceeding budget cap." `/goal` itself is a session-scoped Claude Code primitive and won't run inside the cron handler; the framework here is design vocabulary for how the handler should express its success/failure contract. When you unpark this, see the "Goal-driven execution" section in `CLAUDE.md`.

**What:** Turn Influencer Forge from on-demand-per-day into a true autopilot. User configures one Odyssey, sets `startDate` + `cadence` (daily / 3× weekly / weekly), then walks away. Content drops on schedule for 30 days without them logging in.

**Why it matters:** This is the **Autopilot tier** in your existing Free → Creator → Pro → Business → Autopilot pricing ladder — currently a tier name with no feature behind it. It's the single largest revenue lever on the post-beta roadmap. Once 10–20 paying Autopilot customers exist at ₱29K–49K/mo each, that's ₱500K+ MRR from one feature.

**Why parked:** Two reasons. (1) `launch_readiness.md` P0 wizard state persistence comes first — autopilot is meaningless if a session can't survive auth expiration. (2) Don't build a beautiful Autopilot tier for a tool nobody has validated demand for. **Beta has to prove Influencer Forge is wanted before this is worth 3–5 days of build.**

**When to resume:** When ≥3 of the 5–10 beta users have asked for "can this just keep running" or equivalent. The signal is unprompted demand for automation, not Neil deciding it'd be cool.

**Where to start:**
1. Add `OdysseySchedule { startDate, cadence, dayCount, status }` to `InfluencerConfig` in `types.ts`.
2. New `api/odyssey/tick.ts` handler. Idempotent by `(odyssey_id, day_number)` to survive cron retries. Cost-guarded via existing rate-limit RPC in `api/_lib/supabaseAdmin.ts`.
3. Scheduler: Supabase pg_cron preferred (no new infra), hits the endpoint hourly, endpoint decides whose Day-N is due. Vercel Cron is the fallback.
4. UI in `components/InfluencerForge/`: schedule config in setup, "Pause / Resume / Skip Day" controls in the runtime view.
5. Billing gate: Autopilot tier check via real `useSubscription` plan-tier check, NOT `localStorage.grifon_admin` (per the `agent_lessons.md:33-36` lesson about that key being load-bearing for the admin preview switch).

**Scope estimate:** 3–5 days for v1. Bulk of the work is the cron + idempotency + cost guard, not the UI.

**Source:** Same NotebookLM brief as item #1. Neil endorsed the consumer-side application of agent loops as the headline Autopilot feature.

---

### 3. MarketMind / Offer Optimizer "Reuse Previous Research" UX

> **Status (2026-05-12):** ✅ Tier 1 shipped — [`components/ui/PreviousResearchCard.tsx`](../components/ui/PreviousResearchCard.tsx) (gold-accent banner with subject + relative timestamp + LOAD button + dismiss X) renders above the form in both [components/MarketResearch.tsx](../components/MarketResearch.tsx) and [components/OfferOptimizer.tsx](../components/OfferOptimizer.tsx) entry views. Click "LOAD" → restores results view directly (skips form). Reads `localStorage.marketMindReport` / `localStorage.offerOptimizerResult` plus new `savedAt` and `subject` sidecar keys. Card dismissable; form stays visible below. Insertion point 3 (Step 2 "auto-fill from last research" button) remains parked — separate feature, inputs aren't persisted today. Multi-history, PDF/JSON re-upload, and cross-device persistence all parked for Phase 6+ / Phase 5.2+ Supabase work.

**What:** Add a "Use last research" card / quick-fill button so users don't have to dig for their downloaded `.pdf` or re-type business info when iterating on a campaign. Three insertion points:

1. **MarketResearch entry view** — "Last research: [brand X · N min/days ago] · [Use this] · [Run new]" card. Loads the persisted MarketMind report from `localStorage` (already cached — Step 3 reads it at [components/Step3AdScript.tsx:50](../components/Step3AdScript.tsx#L50)) back into the active state.
2. **OfferOptimizer entry view** — same pattern, needs verification that OfferOptimizer also persists to `localStorage` (probably yes, same shape; check before building).
3. **Step 2 BusinessInfo** — "Auto-fill from last research" button that pulls product/audience/pain from the most recent MarketMind. Pre-populates Step 2 fields so the user only has to confirm + override.

**Why it matters:** Filipino-owner beta users iterate on campaigns. Each new wizard run today forces them to re-enter business info or search their downloads folder for last week's MarketMind PDF. That's friction on the path to paid usage. Data is already in localStorage — this is purely surface, no infra.

**Why parked:** Pure polish. Phase 4 cost-control + beta-merge come first. Doesn't block any P0 use case.

**When to resume:** Immediately post-beta-merge, or when ≥2 beta users complain about retyping. Whichever comes first.

**Where to start:**
1. `grep -r 'localStorage' components/MarketResearch.tsx components/OfferOptimizer.tsx` — confirm both modules already persist + the key names.
2. New shared component `components/ui/LastResearchCard.tsx` consuming a typed loader (returns the saved report + `savedAt` timestamp).
3. Insert the card at the top of MarketResearch and OfferOptimizer entry views.
4. Add the "Auto-fill from last research" button to Step 2 — wires the same loader into `setFormData`.

**Scope estimate:** ~1–2h. Pure UI + localStorage reads.

**Source:** Neil during 2026-05-11 MrBeast smoke test — *"if the user wanted to use the same research/offer, is there any way that the user can use the previous generated marketmind or offer?"*

---

### 4. Generative Video — Product Scale Anchoring (Veo limitation)

> **Status (2026-05-12):** ✅ Mitigations 1 & 2 shipped in [components/Step2BusinessInfo.tsx](../components/Step2BusinessInfo.tsx) — product field now renders a persistent helper line below the input (`"// Physical product? Include size + color + shape + label so the AI matches your actual product."`) using a reusable `helper` field on the form-config array, and the upload zone has a gold-accent Pro Tip line. Helper-below-input pattern chosen over placeholder-edit because placeholders disappear when the user types — instructional hints need persistence. Note: the original roadmap listed Step 1 for the upload hint, but the actual product-image upload zone lives in Step 2. Bigger fix (start-frame scale anchoring, Phase 5+) remains parked.
>
> **Update (2026-05-12 follow-up):** Pro Tip copy rewritten to plain English — was `"Pro tip: Hand-for-scale or product-in-context shot helps Veo render product size accurately."` (Filipino SMB users didn't parse "hand-for-scale" jargon), now reads `"Pro tip: Show your product being held — helps the AI match the real size (otherwise it tends to render bigger than reality)."` Same product-spec helper line also surfaced upstream at [components/MarketResearch.tsx](../components/MarketResearch.tsx) below the `productDescription` textarea — covers the auto-fill path where users go MarketResearch → "SEND TO DIRECTOR AI" → Step 2 with values pre-populated (App.tsx:306-314), since the upstream entry point is where they first type product info from scratch.
>
> **Update 2 (2026-05-12 service-coverage):** Added 3-thumbnail visual example strip above the dropzone in [components/Step2BusinessInfo.tsx](../components/Step2BusinessInfo.tsx) with icon placeholders (`Package` / `Store` / `Sparkles` from `lucide-react`) and captions (`Product in hand` / `Storefront + logo` / `Service in action`). Replaced single product-only Pro Tip with TWO parallel business-type lines — products: "Selling products? Include one photo with the product held in a hand — keeps the AI from rendering it too big." | services: "Service business (salon, gym, restaurant)? Storefront with logo + interior + work-in-action shots." Unsplash auto-curation blocked (`source.unsplash.com` returns HTTP 503 — deprecated). Real curated photos can be swapped in by dropping JPGs into `public/examples/` and setting `imageUrl` on the inline examples array (zero structural change).

**What:** Mitigations for the known generative-video issue where Veo (and peer models) renders product props at unrealistic scale — usually too large for the actual SKU.

Two cheap mitigations + one bigger one:

1. **Step 2 product-description hint** — placeholder/copy update to nudge users toward `"Include actual size — e.g., compact 100ml palm-sized spray bottle"` so the size gets carried into the imagePrompt downstream.
2. **Step 1 hero-image upload-zone hint** — `"For best results, include a hand-for-scale or product-with-context shot"`. When the hero image shows the product in a human hand, Veo can use the reference to match scale in derived scenes.
3. **Bigger fix (Phase 5+):** when the user uploads a context-shot hero, anchor it as a scale reference to start-frames at storyboard time. Requires changes to the storyboard prompt builder in `api/_lib/prompts.ts`.

**Why it matters:** Buyer-side trust. A 100ml face mist rendered to look like 250ml on Facebook → customer receives the actual size → feels ad-deceived → refund + bad review. Edge case at low volume, accumulates as a real liability at beta+.

**Why parked:** Mitigations 1 & 2 are 10–20 min of copy work; intentionally bundled with the next post-beta UX polish PR to keep Phase 4 surgical. Bigger fix is Phase 5+ tied to Vertex's better control surface.

**When to resume:** When the post-beta UX polish PR is being scoped (likely the same one that delivers item #3 above), OR when a beta user reports a customer complaint about size mismatch.

**Where to start:**
1. [components/Step2BusinessInfo.tsx](../components/Step2BusinessInfo.tsx) — update the product description input placeholder/help text.
2. [components/Step1ClientDetails.tsx](../components/Step1ClientDetails.tsx) (or wherever the hero-image upload zone lives) — add the scale-reference hint copy.
3. Smoke test on next render — does the scale visibly improve when "100ml palm-sized" is in the brief? If yes, ship. If no, escalate to the Phase 5+ start-frame anchoring change.

**Scope estimate:** ~20 min for mitigations 1+2. ~4-6h for Phase 5+ start-frame anchoring.

**Source:** Neil during 2026-05-11 MrBeast smoke test — Scenes 5 & 7 showed the 100ml Monat bottle rendered ~2x its real-world size. *"its unrealistic to the part of the buyer where they saw an ad that looks a big product but when they receive it, its a small only."*

---

### 5. Generative Video — Avatar Emotion vs Identity Tradeoff Dial

**What:** Investigate whether the talking/b-roll template's IDENTITY_LOCK system instruction (in [services/geminiService.ts](../services/geminiService.ts) ~lines 1377-1390) is over-weighting identity preservation at the cost of per-scene emotional expression. Currently the avatar reliably stays *the same person* across scenes but the prompt's emotional cues ("looking tired with brow slightly furrowed") render as muted compared to what a human director would deliver.

**Why it matters:** Emotional range is what separates a passable AI ad from a converting one. If every scene's facial expression reads identical, the ad feels uncanny / lifeless even with technically correct identity preservation.

**Why parked:** This is a TUNED-FILE EDIT to the talking template (`services/geminiService.ts:1377-1390` region) per the surgical-edit hard rules — requires explicit per-edit approval from Neil. AND it's a tradeoff dial, not a clear-cut fix: too much weight on emotion → identity drift returns (different faces per scene → trust collapse). Needs a more controlled experiment to dial in, ideally on Vertex (Phase 5) where the control surface is finer than Gemini API Veo.

**When to resume:** When Phase 5 (Vertex migration) lands. Vertex's finer control gives us a real lever to dial emotion up without identity drift.

**Where to start:**
1. Define a test set: 3 prompts with explicit emotional cues (tired, joyful, suspicious) × identical hero avatar.
2. Render once on current Gemini API surface (baseline).
3. Render same set on Vertex with an adjusted system instruction that explicitly weights emotional cues.
4. Compare identity-lock + emotional fidelity side-by-side. Land the change only if both stay strong.

**Scope estimate:** ~1 day (test set + comparison + tuned-prompt edit + smoke test). Cannot ship before Phase 5 Vertex.

**Source:** Neil during 2026-05-11 MrBeast smoke test — Scene 2 with "looking tired" prompt rendered avatar at normal alertness. *"We forgot the scenario/story that should ignore this or follow the changes to the physical appearance if the prompt says."*

---

### 6. CTA Parity Audit — MrBeast vs Testimonial Real-Output A/B

**What:** Side-by-side comparison of generated CTA copy from the **MrBeast** and **Testimonial** scriptTypes against an identical product/audience/offer brief. Goal: confirm or rule out a real structural gap in MrBeast CTAs that makes them feel weaker than Testimonial CTAs.

**Why it matters:** Neil flagged during 2026-05-11 ChillCool/MrBeast smoke test that MrBeast CTAs "felt weaker" than Testimonial CTAs. Phase 4h grep-investigation on [`api/_lib/prompts.ts`](../api/_lib/prompts.ts) found the two structures are **structurally identical** at the CTA beat:

| Aspect | TESTIMONIAL (line 369+) | MRBEAST (line 403+) |
|---|---|---|
| Required scarcity word | ✅ same | ✅ same |
| Value-adds verbatim from offer | ✅ same | ✅ same |
| Banned phrases (`link sa bio`, `DM us`) | ✅ same | ✅ same |
| Example pattern | `"Click below — first 50 may free shipping..."` | `"I-click below — first 50 lang may free shipping..."` |
| **Tone framing** | `"WARM recommendation tone (not direct-sell)"` | `"High-energy ad-native call-to-action"` |

The *only* difference is tone framing. The "weaker CTA" perception is most likely tone-execution by the LLM — the warm-recommendation tone pairs naturally with the Testimonial story arc (Before → After → Proof → CTA), making the CTA feel earned. MrBeast's "high-energy" tone, in Filipino, may land flatter without the right body-paragraph buildup.

**Why parked:** This is a TUNED-FILE prompt edit territory in [`api/_lib/prompts.ts`](../api/_lib/prompts.ts) and needs:
1. Actual side-by-side generated CTAs (same product, both scriptTypes) to confirm the gap is structural vs perceptual
2. Explicit Neil approval per the surgical-edit rule on `_lib/` prompts
3. A clear "what's the better tone directive" hypothesis (e.g., "command-tone, urgency-stacking, dare-the-viewer phrasing" vs current "high-energy")

Phase 4 beta-merge should not wait on this. Defer to next session.

**When to resume:** Next session after beta-merge. Neil pastes a real MrBeast Step-3 CTA + a Testimonial Step-3 CTA generated for the same Step 2 inputs (same product/audience/offer). Compare side-by-side. If structurally different in execution, propose a targeted tone-directive edit. If perceptually different only, leave both structures stable and document the choice.

**Where to start:**
1. Have Neil rerun the wizard twice on the same Step 2 input — once with MrBeast, once with Testimonial. Paste both Step 3 CTA outputs.
2. Compare: scarcity word, value-adds, urgency cue, command verbs, sentence length, exclamation use.
3. Identify the actual gap. Likely candidates: MrBeast lacks "DARE/COMMAND" phrasing (e.g., "Stop scrolling and tap below NOW") that drives high-energy CTAs in actual MrBeast YouTube videos.
4. Draft a tone-directive update for MRBEAST CTA beat #6 — keep all banned phrases + required mechanics intact.
5. Neil-approve, edit `api/_lib/prompts.ts`, smoke test on next ChillCool-class wizard run.

**Scope estimate:** ~30 min for the A/B comparison, then ~10-20 min for the prompt edit + smoke test. Total under an hour if the gap is clear.

**Source:** Neil during 2026-05-11 MrBeast smoke test after Phase 4g shipped — *"can you check if testimonial have the same call to action for mrbeast in terms of formula? Because the call to action in mrbeast script is not that strong like testimonial."*

---

### 7. OfferOptimizer as Post-Render Rescue Tool (not pre-render prefill)

**What:** Reposition OfferOptimizer from "primary autofill source for the wizard's offer field" to "rescue tool surfaced when ads underperform." Triggered by a post-launch performance signal (low CTR / low conversions after N days), not by a pre-render CTA on MarketResearch.

**Why it matters:** Grifon's target user is the Filipino SMB owner who already has a working product + a working offer (₱280 marmalade, 50% spa promo, ₱150 laundry per kilo). They are not in the market for offer redesign — they need ads + targeting strategy. Treating OfferOptimizer as a default upstream tool wastes that user's time AND mislabels the wizard's "Current Offer / Pricing" field with an AI thesis they didn't want. OfferOptimizer's real value lands when the user's existing offer ISN'T converting — that's when a Hormozi-tier Grand Slam Offer redesign earns its keep.

**Why parked:** Three reasons. (1) Requires performance-tracking infrastructure that doesn't exist yet — need CTR, conversion, ROAS surface per campaign before "underperform" can be defined. (2) Today's flow (MarketResearch → "build stronger offer first" CTA → OfferOptimizer) is opt-in and not actively harmful as long as MarketMind's offer autofill is stripped (shipped 2026-05-13). (3) The autofill-priority bug between MarketMind and OfferOptimizer (handoff fact #4: both use same `wizardPristine` guard so MarketMind silently blocks OfferOptimizer when both reports exist) is real but not user-facing until performance tracking exists.

**When to resume:** When EITHER (a) ≥2 beta users complain that their ads aren't converting and ask "how do I make the offer stronger?" — that's the signal that the rescue surface has demand; OR (b) post-render performance tracking (CTR, conversions, ROAS) ships as a separate roadmap item.

**Where to start:**
1. Performance-tracking surface must exist first — likely a Dashboard module showing per-campaign metrics. Out of scope of this item; treat as a prerequisite.
2. Define "underperform" thresholds: e.g., CTR < 1% after 100 impressions, OR no conversions after N days. Make these admin-tunable, not hardcoded.
3. Build a "Your ads aren't converting — let's upgrade your offer →" CTA inside the campaign performance view that deeplinks into OfferOptimizer pre-populated with the campaign's businessInfo.
4. Refactor `App.tsx` autofill priorities: when OfferOptimizer runs AFTER MarketMind for the same campaign, its `payload.offer` should OVERRIDE the user's typed `priceOffer` (signaling intentional offer replacement). Today's `prev.offer || ...` order silently locks the user's typed offer in place even after they explicitly opt into OfferOptimizer.
5. Update the "build stronger offer first" CTA on MarketResearch — consider downgrading it or removing it entirely once the rescue surface exists, since most users won't need it on the first pass.

**Scope estimate:** OfferOptimizer-as-rescue UX itself is ~4-6 hours. But the performance-tracking surface that triggers it is a separate ~3-5 day item. Don't start this without that prerequisite.

**Source:** Neil during 2026-05-13 Decision Gate session — *"Ung offer for sure di nila un aalisin kasi currently nag wowork na un sa kanila ng matagal. If hindi sila makabenta, that the only time I think na mas maganda i-optimize ung offer nila para tumaas ung conversion nila dahil it has value stack and free."* This reframed OfferOptimizer's role from default-prefill to conditional-rescue, leading to the same-session decision to drop MarketMind's `bigIdea → offer` mapping and carry the user's MarketResearch `priceOffer` forward instead.

---

### 8. Evaluator Taste-Calibration — Neil-curated reference set

**What:** A curated `references/eval-calibration/` set of approved-good vs. rejected-slop Grifon outputs (scripts, storyboards, scene images, thumbnails), committed to the repo. `gemini-eval` and `brand-check` load it as few-shot calibration so their critic grades output *quality* against Neil's taste — on top of the existing rule-compliance checklist.

**Why it matters:** Today the evaluator skills check *rule compliance* — does the storyboard violate `STILL_FRAME_RULE`, does the component use `bg-black`. They do not grade *quality*: "is this ad actually good, would it convert, or is it competent slop." For a product whose entire output is subjective creative, "passes every rule and is still mediocre" is a real failure mode the harness currently cannot catch. The brief's contention is that taste *is* gradable once it is written down as a strong, specific, example-anchored rubric.

**Why parked:** Three reasons. (1) The good/slop examples must be Neil-curated — taste is Neil's to define, not Claude's (`agent_lessons.md` 2026-05-09: outside frameworks must not rewrite Neil's strategic judgment; the same applies to the quality bar). (2) The "good" examples are best drawn from a corpus of real shipped beta outputs that does not exist yet. (3) Beta + `launch_readiness.md` P0s come first — calibration is leverage for *more* releases, not the first 5–10 owners.

**When to resume:** Post-beta, when there is a corpus of shipped outputs Neil has personally eyeballed and sorted — OR earlier if a beta user's complaint is "it followed the brief but the ad is just bad," which is the signal that rule-checking alone is not enough.

**Where to start:**
1. Neil curates 3–5 good + 3–5 slop examples per artifact type (script / storyboard / scene image / thumbnail). Karit Coffee, Bukidnon Brew, and TEMU+TESTIMONIAL regression artifacts are the obvious candidates.
2. Store under `references/eval-calibration/` — committed, so it survives the cafe-PC defreezer.
3. Add a short section to `.claude/skills/gemini-eval/SKILL.md` and `brand-check/SKILL.md` telling the separate critic (already spec'd — see each skill's "Run as a separate critic" section) to load the reference set and grade output quality against it.
4. Keep quality a *separate verdict line* (e.g. `QUALITY: below-bar / at-bar / above-bar`) — do not fold it into the compliance `PASS/FAIL`. Compliance and taste are different axes.

**Scope estimate:** ~half a day for the skill edits + folder scaffold. The curation itself is Neil's ongoing effort, not a fixed-size task.

**Source:** 2026-05-20 NotebookLM brief — *Build Agents That Run for Hours Without Losing the Plot* (Ash Prabaker & Andrew Wilson, Anthropic). Strategy "Weight the Rubric / few-shot examples" + contrarian idea "subjective taste is quantifiable." Neil endorsed parking it during the 2026-05-20 plan-mode review and declined to detail it now, to keep the quality rubric Neil-owned. The same brief produced the separate-critic skill edits shipped that session and the Generator-Evaluator annotation on item #1 above.

---

### 9. Omni Hook — Trim the Dead First Second (post-render head-trim)

**What:** Kling Omni hook renders hold the `first_frame` static for the first
~1–2 seconds, then back-load the entire morph into a late burst. Session G
(2026-05-22) proved empirically that this is a structural Omni limit — neither
prompt language (a maximally front-loaded prompt, n=2) nor a shorter `duration`
(3s, which made the dead head *worse* — ~2s / 67% of the clip) moves the morph
earlier. The structural fix: render the hook clip ~1s longer than the target
length, then trim the dead head frames in post so the delivered clip opens on
already-moving morph.

**Why it matters:** The hook's first second is what stops the scroll. Shipping a
hook that is visually frozen for its most important second is a real conversion
weakness — flagged across all Session F effects, confirmed structural in Session
G. Trimming is the only remaining lever once prompt + duration are ruled out.

**Why parked:** It is a render/storage-pipeline change — a different layer than
Session G's prompt / `Option A-Hook` scope. It needs (a) a head-trim mechanism —
either an ffmpeg server-side re-encode (ffmpeg is not in the cafe-PC environment,
nor currently in the Vercel function runtime) or a player-side `currentTime`
start offset (trivial, but the *exported/downloaded* MP4 keeps the dead head);
and (b) a longer render-duration request. Beta + `launch_readiness.md` P0s come
first; the hook still works today, it is just slow to open.

**When to resume:** When EITHER (a) a beta user flags the hook feels slow/static
on open, OR (b) post-beta video-polish work is scoped (likely the same PR as item
#4's Phase 5+ start-frame work).

**Where to start:**
1. Measure the dead-head length across several Omni renders — Session G saw ~1.2s
   on 5s clips and ~2s on 3s clips, so the trim amount is **not constant**; it
   scales with duration. Decide a fixed render length + measured trim, or a
   dynamic trim.
2. Trim mechanism: ffmpeg re-encode (genuine trim, exported file is clean — needs
   ffmpeg available server-side) vs. player-side offset (free, but only fixes
   playback, not the downloaded file). The genuine fix is the re-encode.
3. Bump the hook render duration: `suggestDurationForScript` + the
   `VIDEO_MODEL_SPECS['Kling_O1']` durations table in `services/geminiService.ts`
   — render at target + ~1s.
4. Wire the trim into the Omni poll handler `api/kling/omni-video/poll.ts` (it
   already downloads the MP4 then uploads to Supabase Storage — the trim slots in
   between), OR into the Edit Video module if the editor is the natural trim point.
5. Smoke-test on the committed Session F beans→latte substrate
   (`workflows/assets/session-f/`) — confirm the trimmed clip opens on morph.

**Scope estimate:** ~1–2 days for v1. The unknown is ffmpeg availability in the
Vercel runtime; if unavailable, the trim mechanism needs rethinking (a player
offset is the fallback but only a partial fix).

**Source:** Session G, 2026-05-22 —
`workflows/handoff_2026-05-22-session-g-dead-first-second.md`. Both no-code levers
(prompt FRAME-0 language, shorter duration) empirically FAILed; trim is the
remaining structural fix. Neil endorsed scoping it during the Session G grill
(locked decision #3: "document the limit + scope a trim follow-up").

---

### 10. AI Editor — Final-Render Executor + Trailing-Silence Trim (the unbuilt Remotion Lambda)

**What:** Build the Phase-2 executor that renders the AI Editor's EDL (cut-list JSON)
into a single trimmed final MP4, including **audio-based trailing-silence trim** — cut
each scene at speech-end so the dead air (and the post-speech blur the video model
back-loads) is removed from the delivered video. This is distinct from item #9 (that
trims the Omni **hook's dead HEAD**; this trims **every talking scene's dead TAIL**).

**Why it matters:** Veo renders fixed ~6s clips but the VO ends earlier. In the
2026-05-29 in-vivo CTA render (Ninja Blast, Taglish), the avatar speaks **0–4s** then
**4–6s is silent + has stray blur effects** — Neil's exact observation. Every talking
scene overshoots the same way (handoff 2026-05-29 backlog #3). The deliverable today
**keeps** that dead tail, which reads as amateur and pads runtime.

**Why parked:** It is a **render/storage-pipeline build**, not a prompt fix — the single
biggest launch-readiness gap surfaced by the gate work. Verified 2026-05-29 (PM handoff):
the EDL's `keepSegments` is a **script-text heuristic** (`scriptLine.length/18`, clamped
3–8s — `services/geminiService.ts:1269-1273`), **not** audio speech-end detection; and the
Remotion Lambda that would assemble + trim the EDL into a final MP4 is **not wired**
(`components/EditVideo.tsx:266-269` is a "stub brain"; the only output today is a
downloadable EDL JSON, `EditVideo.tsx:70-71`). So nothing assembles a final video, so
nothing trims silence. **Do NOT prompt-hack clip lengths to mask it** (handoff #3).

**When to resume:** When EITHER (a) a beta user flags trailing dead air / padded clips,
OR (b) the AI Editor is promoted from EDL-export to actual final-render (this IS that
work). Likely the same PR as item #9 (both are post-render video-pipeline trims) — share
the ffmpeg/Remotion mechanism.

**Where to start:**
1. Decide the trim signal: **audio speech-end detection** (accurate — detect last
   non-silent audio frame per scene) over the current script-text heuristic. The
   heuristic can stay as a fallback when audio analysis is unavailable.
2. Executor: Remotion Lambda (or ffmpeg server-side — **not in the cafe-PC env nor
   currently the Vercel function runtime**, same blocker as item #9) that takes the EDL
   JSON + the scene MP4s/audio and renders one trimmed, concatenated final MP4.
3. Wire it into the AI Editor flow in `components/EditVideo.tsx` (replace the
   EDL-JSON-only output with a "render final video" action) — or the async poll pattern
   if the render is long-running.
4. Smoke-test on a known-overshoot clip (the 2026-05-29 Ninja CTA: talks 0–4s, dead
   4–6s) — confirm the delivered MP4 ends ~4s with no blur tail.

**Scope estimate:** Multi-day — this is a new render pipeline, not a tweak. ffmpeg/Remotion
runtime availability is the key unknown (shared with item #9).

**Source:** 2026-05-29 gate session — Neil's in-vivo CTA render observation ("talks 0–4,
4–6 is dead air + blur, my editor will cut it, correct?") + the 2026-05-29 PM handoff #3
verification that the trimmer/executor is unbuilt. Neil endorsed scoping (not building) it
during the gate session.

---

### 11. Client-Facing Edit Style Preset Picker (autopsy-derived styles as a product feature)

> **Status (2026-06-27): ✅ Lock-only picker SHIPPED on `drawplan-refactor` (commit `d308061`),
> not yet merged to main.** The picker + persistence MECHANISM this item describes (steps 2–3
> below) is now live as the **pre-render look-lock**: a `// LOOK` row at GenerateVideo's "Render
> All" lets the user lock **AUTO / Impact / Hype / Clean** (`classic` kept as an unsurfaced
> kill-switch). The choice threads through one pure tested chokepoint (`services/renderLock.ts`
> `buildLockedPreset`) → `FinalRenderRequest.preset.id`, which `resolvePreset()` already honored;
> AUTO = today's deterministic rotation, byte-identical. Note the **location differs from this
> item's original step 3**: Neil settled on the GenerateVideo Render All command bar (the spend
> gate), NOT the AI Editor step. **Still open:** (a) the differentiated styles themselves — this
> item's core leverage — still need to ship via the viral-autopsy → Swipe File pipeline (step 1;
> a picker over the existing looks is the polish, the new styles are the product); (b) the
> **composite image preview (option B)** — a server `api/render/preview-frame.ts` reusing
> `drawPlan` to burn the caption/hook onto the scene still so the user SEES the look before
> locking. Option B was scoped + offered 2026-06-27; **Neil chose to ship lock-only (option C)
> for v1** and defer the visual preview. If B is built later, restore the panel label *"static
> look preview — motion & timing added at render"* (the lock-only UI deliberately doesn't use it,
> since there's no preview image yet). Full handoff: [`drawplan_refactor_resume.md`](drawplan_refactor_resume.md).

**What:** Let users choose their ad's **Edit Style Preset** (`classic` / `impact` / `hype` / `clean` + future autopsy-derived presets like a `vsl` style) instead of the current deterministic rotation in `api/_lib/renderPresets.ts`. A picker in the AI Editor step (or Step 7), with the sincerity guard kept as a hard filter (Testimonial never offers `hype`) and the rotation seed kept as the default when the user doesn't choose.

**Why it matters:** Pairs with the `viral-autopsy` → Swipe File → preset pipeline: every pattern that crosses the 3-video corroboration threshold can become a new named style, and "N editing styles cloned from proven viral ads" is a sellable pricing-page line. Choice also reduces "my ad looks like everyone else's" objections.

**Why parked:** (1) The pipeline hasn't produced its first new preset yet — a picker over the existing four is polish, not leverage; the differentiated styles are what make it worth UI surface. (2) It's app-surface work (`components/` + render contract) competing with `launch_readiness.md` P0s. (3) Needs a design decision on how user choice coexists with the deterministic re-render seed (same ad must still re-render identically once chosen — persist the choice, don't re-roll).

**When to resume:** When the first autopsy-derived preset ships via a Gated Proposal (the `vsl` candidate in `workflows/viral_swipe_file.md` is closest — needs 1 more corroborating video), OR when a beta user asks to change how their ad is edited.

**Where to start:**
1. Ship the new preset itself first (renderPresets.ts, via the Swipe File Gated Proposal flow — `surgical-edit` + `verify-changes`).
2. Persist an explicit `presetId` on the ad (extend the render contract `/api/render/final` + wherever the rotation seed is computed) — explicit choice overrides rotation, absent choice falls back to rotation.
3. Picker UI in the AI Editor step: GlassPanel cards per preset (name, 3-word description, mini style chips), sincerity guard filters the options per ScriptStyle.
4. Smoke: same ad re-rendered twice with a chosen preset must be byte-identical in style decisions; Testimonial must never show `hype`.

**Scope estimate:** ~1 day for picker + persistence once a 5th preset exists. The preset itself ships separately via the autopsy pipeline.

**Source:** Neil, 2026-06-11 viral-autopsy session — *"would that be possible that viral autopsy could help to communicate it directly to my viral editor so that i could easily copy or create different types of editing style that my clients could choose from?"* Endorsed parking the picker and pointing near-term effort at earning the first autopsy-derived preset.

---

### 12. New Ad Style — Services vertical

> **Status (2026-06-22): ✅ SHIPPED & MERGED TO MAIN.** Phase 1 (archetypes A + C on existing
> rails) AND Phase 2 (per-scene real-photo routing + venue render mode + archetype qualifier)
> are both merged to `main` (merge `5395e00`, branch `feat/services-phase2`). Locked spec:
> [`services_phase2_spec.md`](services_phase2_spec.md). Venue (Naya Boutique Spa) + work
> (Oceanides) smokes PASS; fresh-context PR critic clean. **Open follow-ups:** practitioner
> archetype not yet smoke-tested; avatar-in-venue carve-out (Q8) deferred.

**What:** A new ad-creation style tuned for **service businesses** (salons, gyms, clinics,
restaurants, agencies) — distinct from the current product-e-commerce assumption baked into
the wizard/storyboard. Likely covers service-in-action scenes, storefront/staff framing, and
booking/appointment CTAs rather than buy-now product CTAs.

**Why it matters:** Expands the addressable market beyond physical-product sellers to the much
larger Filipino service-SMB segment — the same users who already see the "Service business?"
hints added in roadmap item #4. The render pipeline exists; this is a style/prompt layer on top.

**Why parked:** *Not parked* — promoted to active 2026-06-16. Sequenced **first** of the three
new styles because it's closest to the existing product/testimonial flow (least bespoke).

**When to resume:** Now (this week).

**Where to start:** `grill-me` spec session → vertical slice (types + service call + UI + state
through the Services style) → `smoke-tester`. TUNED-prompt edits in
`services/geminiService.ts` / `api/_lib/prompts.ts` need Neil's explicit go (surgical-edit).

**Scope estimate:** TBD pending the grill-me spec.

**Source:** Neil, 2026-06-16 — *"im planning to add a new ads style for services."*

---

#### Services — grill-me spec + Phase 1 shipped (2026-06-21)

**Spec (locked via grill-me):** new peer `scriptType: 'Services'`. Hybrid avatar talking-head +
service-in-action b-roll. 6-beat arc: hook → trust → action → before/after → proof → CTA.
**Book/inquire CTA** (Viber/Messenger/DM + walk-in), NOT buy-now. Music reuses the warm
`testimonial` bed; `clean` preset. Sub-vertical inferred from description + hero (no new field).

**Three archetypes (Real Estate is separate — see #13):**
- **A · Practitioner-led** (advisor, coach, agency): person is hero; reuses existing avatar lock.
- **B · Venue-led** (restaurant, salon, gym, clinic): place is hero; needs per-scene photo routing.
- **C · Work/result-led** (cleaning, pest control, siphoning): result is hero; uniform + before/after.

**Phase 1 — SHIPPED `feat/services-ad-style` (commit 397dec2):** A + C on existing rails.
Type union + Step 2 Services card + dedicated tuned adscript branch (Neil-approved) + bundle-leak
marker. Build/tests/leak green. Before/after for C is generated representative b-roll (honest).

**Phase 2 — ✅ SHIPPED & MERGED (2026-06-22, merge `5395e00`).** The per-scene real-photo-routing
layer is built and live. Implemented as 5 slices (all build/tests/leak green, each TUNED edit
Neil-approved): (1) `serviceArchetype` field + Step 2 smart-defaulted archetype qualifier (3
outcome-labeled buttons — "Show off my place" / "Show the results" / "Feature me & my team" —
statement-with-✓ framing + archetype-aware upload sample strip); (2) `servicePhotos {url,slot}` +
archetype-driven **guided upload slots** (the slot IS the tag — implicit classification; synced to
`productImageUrls` for back-compat); (3) storyboard emits per-scene `venueSlot` (Services-only,
additive); (4) new **VENUE render mode** in `generateSceneImage` (PLACE_IDENTITY_LOCK +
CAMERA_FREEDOM — same real place, scene-fitting angle, Filipino people allowed; additive 5th branch,
the 4 originals byte-identical); (5) `sceneRender.ts` routes `venueSlot` → the matching uploaded
photo in venue mode (replaces the old `productImageUrls[0]`-only behavior; falls back to
representative gen on any miss). Plus `FILIPINO_CAST_LOCK` (foreigner-in-hook fix) + venue
tier-drift guard (no "high-end/luxury") + hook gender-coherence. Architecture-aware: venue = full
routing; work = representative-by-default, before/after-routing only if uploaded; practitioner =
headshot/logo. **Smokes:** Naya Boutique Spa (venue) PASS — real storefront + treatment room
rendered, true-to-tier; Oceanides (work) PASS, no regression — real aluminum closed-van truck routed
from upload. Fresh-context PR critic clean (Minor 4/5 + Major 1/2 resolved; quota dev-bypass
confirmed fail-CLOSED). **Open follow-ups:** practitioner archetype not yet smoke-tested;
avatar-in-venue carve-out (Q8) deferred; venue same-place-multi-angle consistency only lightly
tested (one scene per space so far).

**Two product decisions (Neil, 2026-06-21) — to honor in Phase 2 / a Services-tune pass:**

1. **Advanced Mode = Business-tier gate for Phase 2.** ⚠️ **SUPERSEDED 2026-06-22:** Neil chose to
   ship Phase 2 real-photo routing **services-wide (NOT Business-gated)** — for venue-led services the
   real place IS the conversion asset, so accuracy is a core need, not a premium perk. The original
   gating idea below is kept for the record but is no longer how it shipped. Default (all tiers): an uploaded image is
   **reference/context only** — Director understands it and generates **fresh, scene-fitting**
   visuals; it must NEVER just animate the user's raw photo into a scene. Placing the user's
   **literal photos into specific scenes** (real venue/before-after/crew — the Phase 2 routing)
   is an **Advanced Mode reserved for Business**. *Nuance to confirm:* product-identity fidelity
   (a real SKU must look like itself) stays on lower tiers; what's gated is literal-photo-into-scene,
   not product accuracy. Connects to the Business "commercial-grade" differentiator + cinematic gate.

2. **Authenticity / expectation-accuracy guardrail.** The style must NOT over-glamorize humble
   trades (e.g. dress a sando-and-tsinelas malabanan crew in a fake logo'd uniform / shiny branded
   truck) — that sets on-arrival expectations the business can't meet and burns trust. Likely a
   small tuned-prompt addition (Neil-approval gated). Reframe humble realities as benefits where
   honest (e.g. plain closed van = *discreet*, "walang kaalam-alam ang kapitbahay").

**Oceanides smoke #1 (2026-06-21) — surfaced 3 coherence gaps → drove v2.** Script formula was
good (Taglish, discreet angle, book CTA); the breakage was everywhere Phase 1 left on PRODUCT rails:
(1) hook did a product-reveal (hose nozzle in a clean sink) instead of a problem-open; (2) the
COMPANY-voice script clashed with a CUSTOMER avatar ("Anxious Homeowner Anna" appeared to be selling
the service); (3) scene-gen invented glamorized, non-PH industrial equipment (real rig = a steel tank
hidden in a plain closed van). Diagnosis: only the ad-script was Services-tuned; storyboard/avatar/
scene-gen still ran product-centric.

**Services formula v2 — SHIPPED (customer-testimonial + PH-realism, GENERAL across all service types).**
Driven by the smoke + a grifon-cmo pressure-test. Key calls:
- **Voice = first-person CUSTOMER testimonial** ("Ako si [name]") — fixes the avatar mismatch WITHOUT
  touching the avatar engine (the customer persona was always correct; the script voice was the outlier).
- **Category auto-adapt (not siphoning-tuned)** per Neil 2026-06-21 ("fit for ALL service types"):
  the prompt infers the customer's #1 emotional payoff (privacy / confidence / peace-of-mind / time /
  pride) and disarms the category's #1 trust fear (surprise pricing / "gagana ba sa akin" / hygiene /
  reliability) from the user's own inputs — no hardcoded vertical.
- **Storyboard:** Scene-1 hook = THE PROBLEM (product-reveal hook rules made conditional, off for
  Services); customer talking-head + service-in-action/relief b-roll.
- **PH ground-truth realism guardrail** (mandatory, all services): depict the real PH version, treat
  uploaded-photo description as ground truth, never invent Western/premium/industrial gear.
- **Archetype-aware b-roll (Neil 2026-06-21)**: storyboard now infers VENUE-LED (spa/salon/clinic/gym/
  restaurant → SHOWCASE the venue, grounded in their real tier — don't suppress, don't upgrade a modest
  spa to a 5-star resort) vs WORK/RESULT-LED (cleaning/pest/siphoning → humble, de-emphasize gear,
  favor problem→relief) vs PRACTITIONER-LED (person + outcome). Default mode = representative-but-true-to-
  tier venue; EXACT venue per scene = Phase 2 / Business Advanced Mode (real-photo routing).
- **No peso figure in the script** (CMO + house rule); offer stated as words ("libreng inspection").
- Files: `api/_lib/prompts.ts` (adscript + storyboard Services branches), leak-guard markers updated.
  Build/tests/leak green. The accuracy GUARANTEE (their real photos per scene) still = Phase 2 / Business.

**Open — Oceanides re-smoke (queued):** confirm v2 — problem-hook (no hose-in-sink), customer-voice
script, PH-humble visuals (no glamorized rig), book/inquire CTA. Hero `siphoning-service.jpg` + real
photos must be RE-DROPPED into `.tmp/hero_smoke/` next session (defreezer wipes `.tmp`). Blocked on
Neil: Google OAuth login + the photos.

---

### 13. New Ad Style — Real Estate vertical

> **Status (2026-06-22): ✅ SHIPPED & merged to main.** Spec LOCKED via grill-me →
> [`real_estate_spec.md`](real_estate_spec.md). Agent-led property walkthrough: types + Step 2 UI +
> tuned ad-script + storyboard routing + cast-lock + bundle-leak marker, PLUS CMO-tuned refinements
> (legitimacy/affordability/keyword-DM beats), agent wardrobe (lanyard), and **avatar-in-property**
> (`avatar_venue` render mode — the agent stands INSIDE the real uploaded rooms, incl. the facade on
> the CTA shot). Smoke PASSED 2026-06-22 (Bahay Realty / Imus 3BR, uploaded Filipino agent): agent in
> real sala/bedroom, identity + lanyard preserved across scenes, b-roll anchored to uploads. Build +
> bundle-leak + 278 tests green. Key reuse: rides the Services Phase 2 venue render-mode + venueSlot.
>
> **Follow-up (Neil, 2026-06-22) — add more Real Estate formats:** beyond the agent-led walkthrough,
> add a **buyer/owner UGC-testimonial** format — a client who BOUGHT a house sharing their experience
> (first-person buyer voice, softer "inquire/ask them how" CTA, pambahay OK). Door already left open:
> the Testimonial/Services voice exists; expose via a small "Who's on camera?" toggle inside Real
> Estate (Agent broker ↔ Happy buyer). Possibly also a developer-pre-selling format. Spec via grill-me
> when picked up.

**What:** An ad style tuned for **real-estate** listings/agents — property walkthroughs,
location/lifestyle framing, price + inquiry CTAs. More bespoke scene logic than Services
(property as the hero, not a held product or a talking avatar).

**Why it matters:** A high-ticket Filipino vertical (brokers, developers, condo/lot sellers)
where a strong scroll-stopping video ad maps directly to lead value.

**Why parked:** *Not parked* — active 2026-06-16. Sequenced **second** (after Services).

**When to resume:** Now (this week), after the Services slice lands.

**Where to start:** `grill-me` spec → vertical slice → `smoke-tester`. Watch the property-scale
/ scene-identity behavior (related to the Veo scale limits in item #4).

**Scope estimate:** TBD pending spec.

**Source:** Neil, 2026-06-16 — *"Real estate ... commercial ads will be finish this week."*

---

### 14. New Ad Style — App / Commercial vertical

> **Status (2026-06-16): ⚡ PROMOTED TO ACTIVE — building this week.** Not parked.
> Working plan: [`this_week_plan.md`](this_week_plan.md) (step 4). Spec via `grill-me` first.

**What:** An ad style for **apps and general commercial spots** — UI/screen-in-context shots,
feature-benefit beats, download/sign-up CTAs. The most bespoke of the three (digital product,
no physical SKU; may need screen-recording/mockup framing in the storyboard).

**Why it matters:** Opens Grifon to app developers and brands wanting polished commercial
spots, broadening beyond SMB product/service sellers.

**Why parked:** *Not parked* — active 2026-06-16. Sequenced **third** (most bespoke).

**When to resume:** Now (this week), after Services + Real Estate.

**Where to start:** `grill-me` spec → vertical slice → `smoke-tester`. Decide how app
screens/mockups enter the storyboard (upload vs generated) during the spec.

**Scope estimate:** TBD pending spec.

**Source:** Neil, 2026-06-16 — *"App, commercial ads will be finish this week."*

---

### 15. Agent-Scaling / CI Validation-Pipeline Follow-ons

> **Context (2026-06-17):** From the session evaluating Kun Chen's "40 PRs/day" multi-agent brief
> against Grifon. Verdict: adopt the *validation-pipeline* half, reject the *velocity/token-maxing*
> half (conflicts with the Max-5x quality-first budget + single-session cafe-PC reality + the
> prompt-as-moat guardrail). **Already shipped to `main` that session** (so these are the *leftovers*,
> not the whole thing): cloud CI (`.github/workflows/ci.yml` — build + test + design:lint), the
> crown-jewel bundle-leak guard (`tools/check-bundle-leak.mjs`), the zero-quota Playwright boot/render
> smoke (`tests/e2e/boot.spec.ts` + the CI `e2e` job), and the fresh-context PR critic SOP
> (`workflows/pr_review_loop.md`, wired into `loops.md` Tier 5). Three follow-ons were deferred:

**What — three independent sub-items, each separately resumable:**

- **A. Mocked wizard walk (Playwright scope B).** Extend the boot smoke past the auth wall: stub the
  Supabase session + route-intercept the Gemini call-graph with canned fixtures, then navigate the
  wizard Steps 1→7 asserting render/navigation (still zero quota).
  - *Why parked:* getting past the auth hard-wall needs a brittle Supabase-session stub keyed on
    supabase-js's localStorage storage-key derivation, AND the authoring sandbox **blocks the
    Playwright browser download** — so it can't be iterated locally, only via slow push-to-CI cycles.
    High effort + brittle + bad dev loop.
  - *When to resume:* when Playwright browsers can run locally (different env), OR when the auth-stub
    is worth the CI-only iteration. Reuses the canned-fixture patterns in
    `tests/regression/script-gen.regression.test.ts` + `tests/unit/geminiService.schemas.test.ts`.
    Related to item #1 (Tier-3 regression) — coordinate so they don't duplicate.

- **B. Extend doc-lint beyond design tokens.** `npm run design:lint` only checks DESIGN.md tokens.
  Add a light consistency lint (e.g. UBIQUITOUS_LANGUAGE term drift, dead `workflows/*.md` links).
  - *Why parked:* nice-to-have, not load-bearing; lowest lever of the four moves.
  - *When to resume:* when a doc-drift bug actually bites, or as a quiet-day cleanup. Wire into the CI
    `verify` job beside `design:lint`.

- **C. Full-auto Claude-in-CI review.** A GitHub Action that runs the fresh-context critic
  automatically on every PR open (no human in the loop), vs. today's in-session
  `workflows/pr_review_loop.md` convention.
  - *Why parked:* needs an `ANTHROPIC_API_KEY` **secret in CI** — a security-surface change. Deferred
    deliberately; the in-session critic already delivers the value with zero secret.
  - *When to resume:* only after running `straw-man-audit` on adding a CI secret, AND Neil's explicit
    go. Do not add the secret unilaterally.

**Why it matters:** Compounds the validation pipeline already on `main` — each closes a gap CI can't
currently see (A: authenticated-app render regressions; B: doc rot; C: removes the human trigger from
the review loop).

**When to resume:** Per-sub-item triggers above. None blocks beta.

**Where to start:** Re-read `workflows/loops.md` (the current loop registry — Tier 0b CI, Tier 5 PR
critic) and `workflows/pr_review_loop.md` for what already exists before building.

**Scope estimate:** A ≈ 1 day (brittle); B ≈ 2–3h; C ≈ half a day + the security review.

**Source:** 2026-06-17 session evaluating Kun Chen's "How This Ex-Meta L8 Engineer Ships 40 PRs a Day
with AI Agents" brief against the Grifon codebase. Neil shipped Moves 1/2A/bundle-guard/3, chose to
defer 2B / doc-lint / full-auto-CI.

---

### 16. CAC / LTV instrumentation — close the acquisition-economics loop

> **Context (2026-06-19):** During the pricing restructure (Free→Pro→Business→Autopilot, one-shot
> flow), Neil asked whether to add ad/acquisition spend "on top of" the per-ad COGS. Decision:
> **NO — track it as a separate layer, not inside gross margin.** The full finalized model + this
> reasoning live in the durable doc [`pricing_unit_economics.md`](pricing_unit_economics.md) (§5–§6).
> This roadmap item is the "go gather the data" trigger.

**What:** Instrument the four acquisition/economics inputs the finalized pricing leaves as
placeholders, then re-run the margin + CAC math and lock final included video-ad quotas:
1. Avg scenes (and seconds) per finished ad — validates the scene-cap COGS.
2. Regeneration rate — validates the ~30% buffer.
3. Avg finished ads a real Pro user makes/month — the breakage number that sets safe quotas.
4. CAC inputs: FB cost per free signup · **Free→Pro conversion rate** · avg paid tenure (churn).

**Why it matters:** Every quota/price number in `pricing_unit_economics.md` is a defensible
*estimate* until these land. Free→Pro conversion in particular decides whether the entire free-
consultation strategy is profitable (10% → ~₱2,200 CAC healthy; 3% → ~₱7,300 underwater). The
locked-video upsell (`components/LockedVideoPreview.tsx`) is the lever that moves it.

**Why parked:** No live paid traffic + no shipped one-shot render logs yet → nothing to measure.
The pricing ships on conservative estimates now; this is the post-data tuning pass.

**When to resume:** When EITHER (a) the restructure is live AND there's ≥2–4 weeks of one-shot
render logs + paid checkouts to read, OR (b) margin looks off in practice (COGS creeping above
target). Pull the four numbers, re-run §2–§4 of `pricing_unit_economics.md`, lock final quotas.

**Where to start:**
1. Render logs: avg scenes/ad + regen rate from the one-shot job records (the `consumeMonthly`
   call site + `activeJobsService` history).
2. Conversion + tenure: Supabase `subscriptions` (free→paid transitions, tenure before churn) +
   whatever FB Ads spend/signup attribution exists.
3. Re-run the margin tables; adjust `PLAN_LIMITS` / `MONTHLY_LIMITS` included counts + scene caps.

**Scope estimate:** ~half a day once the data exists (mostly analysis + a quota-number tune, not
a build). The instrumentation to capture it may be a separate small task if logs are thin —
that instrumentation is now specced as **Item #17 / [`growth_loop.md`](growth_loop.md) Phase 0**
(Meta CAPI + `events` table). Build Phase 0 and these four numbers fall out of it.

**Source:** Neil, 2026-06-19 pricing restructure session — *"should we add also a ads expense on
the top of it or not a good idea?"* → decision to keep CAC separate from COGS and log it for a
data-driven pass post-launch.

---

### 17. Data-Driven Growth Loop (ingest-only) — full spec in [`growth_loop.md`](growth_loop.md)

> **Context (2026-06-24):** Neil's brief — make the app improve over time from client feedback, and
> automate his *own* Grifon growth marketing with himself as approver only. Evaluated against the
> codebase and scoped via grill: **for Grifon's own growth** (single-tenant, not a client feature) ·
> **ingest-only** (read ad performance & learn; Neil still publishes — no autonomous spend) ·
> **build the data plumbing now**, parallel to beta. Full evaluation, metrics taxonomy, phased build,
> skills assessment, and risks live in the durable doc — this is just the parking-lot pointer.

**What:** Give Grifon the measurement foundation it completely lacks (no pixel / telemetry / ad-perf /
feedback today), then run two human-gated loops on top: an app-improvement loop (feedback + telemetry
→ ranked fixes) and a creative-performance loop (read ad results → learn *why* a creative sold →
propose the next creative → Neil ships). Reuses the proven `viral-autopsy → viral_swipe_file.md →
grifon-cmo` brain, fed with real performance data instead of only external swipe videos.

**Why it matters:** "Learn from past creative results" is impossible today because the app never sees
results. This unblocks Item #16 (CAC/LTV) and Item #7 (perf-triggered OfferOptimizer rescue), both of
which wait on a perf-tracking surface that does not exist.

**Why parked:** Beta + `launch_readiness.md` P0s come first. But **Phase 0 (Meta CAPI + `events`
table) is the one piece Neil endorsed building now**, parallel to beta, so the data exists when the
post-beta tuning items fire.

**When to resume:** Phase 0 — anytime (endorsed for parallel build). Phases 1–3 — post-beta, each its
own plan + `/goal`.

**Where to start:** `growth_loop.md` → Phase 0, as one thin vertical slice (pixel + Purchase CAPI via
reused `api/webhook.ts` + one telemetry event end-to-end). Run `straw-man-audit` on the new `api/`.

**Scope estimate:** Phase 0 ≈ 1–2 days (vertical slice). Phases 1–3 are separate efforts.

**Source:** Neil, 2026-06-24 — *"DATA DRIVEN LEARNING/Feedback LOOP… gusto ko approver or reviewer
lang ako."* Evaluation persisted at his request (chose to persist the doc over building immediately).

---

### 18. Gemini Omni Flash — b-roll camera-choreography PoC (Layer 2 of the per-scene engagement plan)

> **Context (2026-07-05):** Neil brought the Gemini Omni Flash sources (model card, API docs,
> prompt guide) and asked whether to apply them to the AI Editor. Original verdict said Omni
> "cannot ingest our rendered scenes" — **CORRECTED same day:** that 3s/broken limit applies to
> the `reference_to_video` task only. The **`edit` task DOES accept user-uploaded videos via the
> Files API** (no stated duration cap; blocked in EEA/UK/CH only — PH fine; Higgsfield resells
> exactly this with 60s uploads). So per-scene conversational editing of our rendered clips is
> possible TODAY. What still holds: **voice editing unsupported** (any edit that alters the
> avatar's mouth pixels risks ElevenLabs lip-sync — talking scenes need empirical testing before
> trust), accurate text rendering is a stated model weakness (critical text stays FFmpeg),
> preview-status instability, English-only evaluation, ~$0.10/sec output per edit iteration, and
> the determinism trade (a stochastic edit pass vs the tested EDL+FFmpeg contract). ⚠️ Naming:
> this is Google's Omni, NOT Kling Omni O1 (item #9 / the Session C–G hook arc) — always say
> "Omni Flash" vs "Kling O1".
>
> **The two-layer architecture (Neil-approved 2026-07-05):** Neil's product idea — an AI that
> plans, per scene, the editing moves that maximize retention (camera push in/out, rack focus
> product→face, angle switches, motion graphics, text) — splits into:
> - **Layer 1 (FIRST, cheap, deterministic):** expand the EDL brain + FFmpeg vocabulary with
>   retention moves FFmpeg can execute (digital punch-ins/push-ins, speed ramps, whip-pan
>   transitions, shake, kinetic caption styles). Which moves = decided by a UGC-editor study via
>   `/viral-autopsy` → `viral_swipe_file.md` → ≥3-corroboration Gated Proposals (Neil collects the
>   creator videos). Pairs with item #11 (each proven pattern can become a sellable Edit Style
>   preset). No Omni, no new cost, no stochastic risk.
> - **Layer 2 (THIS item, parked):** the moves FFmpeg physically can't do must be baked at
>   GENERATION time — Omni Flash image-to-video from the scene still.
> - **Shared brain:** one per-scene "engagement plan" pass decides which moves are
>   FFmpeg-executable (→ EDL) and which need generation (→ the video-gen prompt). Layer 1 work
>   should keep this split in mind so the planner isn't rebuilt twice.

**What:** A contained PoC with TWO test arms (post-correction, both are testable today):
**(a) Edit arm — the "compete against FFmpeg" bake-off (Neil's framing, 2026-07-05):** upload
1–2 REAL rendered scenes (one b-roll, one talking) via the Files API `edit` task and apply the
per-scene engagement plan conversationally (push-in, rack focus product→face, angle switch,
motion-graphics flourish). Grade: identity preserved? talking-scene mouth pixels intact enough
for the ElevenLabs VO mux? label/text uncorrupted? Compare the same scene styled by the current
EDL+FFmpeg pass. If the edit arm wins, the EDL's VISUAL vocabulary migrates to Omni and FFmpeg
keeps only the deterministic jobs (VO mux, forced-alignment captions, exact ₱/offer text,
end-card, concat, music duck) — FFmpeg is never fully kicked, per the constraints below.
**(b) Generate arm:** scene still as `<FIRST_FRAME>`, timecode camera choreography, stateful
`previous_interaction_id` refinement instead of full re-rolls. Mirror the
`api/kling/omni-video.ts` proxy pattern for whichever arm wins.
**Evidence — 4-video capability autopsy DONE (2026-07-05, Gemini 3.5-flash watched each;
Higgsfield demos ×3 + IG creator):** all four confirmed **uploaded-and-edited real footage**
(performance/geometry preserved across edits). Findings that shape the PoC:
- **Lip-sync SURVIVED editing in all 3 talking-head videos** — edits preserve the source mouth
  performance ("perfectly synced, no artificial lip-sync artifacts"). Talking scenes are back on
  the candidate list (favorable prior; still verify against our STS+mux on the PoC).
- **Cleanly executed baked-in ops:** background replacement/cleanup, relighting, object
  insertion/swap (incl. car swap with lighting integration), dynamic zoom/reframe-to-speech,
  fisheye/lens emulation, style transfer. **Recurring artifacts:** hair/edge blending on bg
  swaps, finger warping on close object interactions, texture flicker on fast motion.
- **Text verdict = our constraint, validated:** baked-in generative text is GARBLED ("dems
  resenttion est otjer"); every clean caption in the demos was a deterministic overlay added by
  the platform. Even Higgsfield runs the hybrid architecture we proposed: Omni for pixel edits +
  a deterministic layer for text/graphics. FFmpeg keeps captions/₱/end-card/concat/VO mux.
- **PoC step 0:** check whether our `GEMINI_API_KEY` can reach the Omni edit task at all
  (preview rollout is gated); if not, Higgsfield is the interim playground for manual tests.

**Why it matters:** Real in-pixel camera work is the biggest visible gap between Grifon output and
human-edited UGC ads; FFmpeg can fake zooms but not focus pulls or angle changes. Conversational
refinement also fixes the "one bad detail = re-roll the whole scene" UX.

**Why parked:** Preview-model instability on the launch-critical path; per-iteration cost
(~$0.10/sec ≈ $1/10s/attempt); English-only evaluated; launch gate (producer smoke) comes first;
Layer 1 delivers most of the retention value deterministically and should land first.

**Hard constraints when built:**
- Talking scenes stay on the ElevenLabs lip-sync pipeline (Omni voice editing unsupported; its
  generated audio gets stripped, our VO muxes over in FINAL_RENDER as today).
- Critical text (offer, price, ₱, captions) stays FFmpeg-burned — the model card lists accurate
  text rendering as a known weakness; a wrong price in-pixels is a client-facing disaster.
- Plan-first, generate-once: the engagement plan is drafted and approved BEFORE the paid call.
- SynthID watermark is embedded in all Omni output — disclose if a client asks.

**When to resume:** the `edit` task works TODAY, so the gate is priority, not capability:
resume when the launch gate (producer smoke) is closed, OR earlier if Neil green-lights the
bake-off PoC as a deliberate side-session. Cheap step available anytime: autopsy Neil's 4
sample videos (no build, no credits). Still worth waiting for before PRODUCTIONIZING (not for
the PoC): Omni leaving preview + non-English evaluation.

**Where to start:**
1. Re-read the full evaluation: plan file `sources-https-deepmind-google-models-mod-jolly-hammock.md`
   (2026-07-05) + the three sources (deepmind.google model card, ai.google.dev/gemini-api/docs/omni,
   the prompt guide).
2. Proxy: `api/gemini/omni-video.ts` modeled on `api/kling/omni-video.ts` (Interactions API is a
   different endpoint/body than generateContent — read the docs page fresh; no system instructions,
   temperature, or negative prompts supported).
3. PoC scene: one product b-roll (e.g. the Session-F beans→latte substrate) — scene still +
   "slow push-in, rack focus from steam to label" plan; grade vs the Veo/Kling render of the same
   scene with `gemini-eval` + Neil eyeball.
4. Decide routing signal (like `scene.transitionEffect` drove Kling O1 routing in Session E).

**Scope estimate:** PoC ≈ 1 day (proxy + one scene + comparison). Productionizing (routing,
polling, cost guards, quota) is a separate multi-day effort — do not start it before the PoC verdict.

**Source:** Neil, 2026-07-05 — the Gemini Omni sources evaluation session. Neil's framing: *"before
editing our ai should create each per scene what would be the editing plan that will help this
scenes to be more engaging and will make them stay to watch"* + goal *"not just engaging but high
converting"*. Two-layer split + Layer-1-first sequencing approved same session (AskUserQuestion
record); UGC-editor study explicitly Neil-driven via viral-autopsy. **Neil scheduled the PoC for
the NEXT session (2026-07-05, pre-breakfast call).**

**✅ EDIT-ARM PoC EXECUTED (2026-07-05, ~$1.64: 3 paid generations + 1 free safety block).**
Tool: `tools/omni_edit_poc.py` (probe / edit / refine subcommands; paid calls gated behind
`--yes`; probe is zero-cost — an incomplete request that 400s proves access without generating).
Test clips cut from `baselines/2026-06-10-bean-block-final-baseline.mp4` (only surviving pipeline
artifact): beans-pour b-roll 4.1s + FIRST-50-LANG talking scene 7.9s. ⚠️ PoC caveat: both inputs
had FFmpeg captions already burned in — production would edit pre-caption clips.

**Results:**
- **Step 0:** ACCESS_OK — our `GEMINI_API_KEY` reaches `gemini-omni-flash-preview` via
  `POST /v1beta/interactions`. No Higgsfield needed. Output is 720p/24fps (down from our
  1080p/30) — production needs an upscale step.
- **Test 1, b-roll push-in: PASS.** Real parallax push-in; scene, bean physics, timing, brand
  wordmark and label art near-identical. But Omni REWROTE the caption layer — invented
  "BAGONG ROAST ITO" (transcribed from the VO) and retimed/restyled the rest.
- **Test 2, rack focus (same clip): FAIL.** Focus never racked to the label, and the label
  artwork was hallucinated (added sun + red flowers). Same clip that Test 1 preserved —
  label integrity is STOCHASTIC across runs, exactly the determinism trade we flagged.
  Stateful `refine` (previous_interaction_id) not yet tried on this failure.
- **Test 3, talking-scene bg swap: REJECTED for talking scenes.** The café environment swap
  looks great and gestures/shirt/bag/VO are preserved (original ElevenLabs audio intact,
  transcript verbatim) — but a blind `analyze_video.py` believability grade flipped from
  **real-human / "perfect lip-sync" (source)** to **likely-ai / mouth-lag / over-smoothed
  skin / "pasted" bag (Omni output)**, both high confidence. Omni re-renders the person even
  when told not to. Direct contradiction of the Higgsfield-demo prior ("lip-sync survives
  edits") on OUR footage. Background chalkboard text also garbled ("COFEE").
- **Safety filter gotcha:** the prompt phrase "preserve the man's identity … frame-for-frame"
  was BLOCKED as harmful content (pre-generation, unbilled); neutral phrasing ("keep everything
  else exactly as filmed") passed. Never use identity-preservation legalese in Omni prompts.

**Verdict (pending Neil eyeball of the actual videos in `.tmp/omni-poc/edits/`):** talking
scenes stay 100% on the ElevenLabs pipeline — even "background-only" Omni edits degrade
believability, which is disqualifying. B-roll edit arm is PROMISING (push-in beat the FFmpeg
zoompan punch-in on parallax realism) but stochastic on label integrity → usable only with
edits-before-caption-burn ordering, a per-output label/identity eval gate, retry budget, and
an upscale step. The marquee FFmpeg-impossible move (rack focus) failed its first attempt —
run 1-2 `refine` iterations before finalizing the Layer-2 scope. Text-stays-FFmpeg constraint
is now empirically validated from three directions (invented captions, restyled captions,
garbled background text).

**✅ ROUND 2 — RAW-INPUT RETENTION-EDITOR PoC (same day, ~$1.27, 3 samples).** Neil's pivot:
round 1 fed FINISHED renders (captions burned in — confound); round 2 feeds RAW caption-free
clips, testing Omni as the retention editor (the IG-creator workflow from his screenshots —
that creator's literal prompt: "Add subtle zoom effects… Cut aggressively between sentences…
optimized for Shorts and Reels"). Raw source: the LEFT (unedited) half of
`demos/viral-editor-2-demo-side-by-side.mp4` (Olivia skincare ad) — raw talking 5.05s +
raw serum-bottle b-roll 3.75s, cropped via ffmpeg. Note: even "raw" Veo scenes carry a faint
baked-in push — truly locked-off source footage doesn't exist in our pipeline.

- **Sample 4, IG-creator retention edit on RAW TALKING: PASS — the headline result.** Quick
  punch-in/out reframes synced to sentence emphasis + a speech-matched motion graphic (water
  droplet timed to the serum line). Blind believability grade: **real-human, perfect lip-sync
  (high confidence) — same as its raw control.** This overturns round 1's talking-scene
  rejection: the failure mode is PERSON RE-RENDERING (bg swap/relight), not editing per se.
  Zoom/cut edits reuse source pixels and keep believability. Caveat: "cut aggressively /
  remove pauses" did NOT shorten the clip (5.05→5.18s) — Omni does in-place visual editing,
  not timeline surgery. Pacing trims stay EDL/FFmpeg.
- **Sample 5, dolly zoom on RAW B-ROLL: camera move executed** (strong continuous push;
  true vertigo-stretch needs Neil eyeball). Text integrity is SCALE-DEPENDENT: the big
  "The Ordinary." wordmark stayed perfect, but fine-print label text was hallucinated into
  gibberish once the zoom magnified past what the 540×960 source resolved.
- **Sample 6, explicit text render: PASS, letter-perfect.** "SOBRANG SULIT" in clean bold
  sans-serif + drop shadow + pop-in, exactly as directed. REFINES the text constraint: Omni
  garbles text it PRESERVES/INVENTS incidentally, but renders EXPLICITLY DIRECTED display
  text accurately (Google's claim validated). Critical text (₱/price/offer/captions) still
  FFmpeg — deterministic and exact — but stylistic display words are now an Omni candidate.

**Layer-2 shape after both rounds:** raw scene → Omni engagement pass (speech-synced
reframes, camera choreography, motion graphics, display text) → FFmpeg deterministic layer
(pacing cuts, captions, ₱/offer text, VO mux, end-card, concat). Never feed captioned
renders; never bg-swap/relight talking scenes; expect 720p/24 output (upscale step needed);
keep the per-output eval gate (label drift is stochastic — Test 2 vs Sample 5 wordmark).
Prompt vocab that works: "punch-in synced to sentence emphasis", "natural smartphone zoom",
"dolly zoom", "spell it exactly as written: …". Never use identity-preservation legalese
(safety filter). Session total ≈ $2.91 for 6 generations + 1 free block.

**✅ REFINE-CHAIN TEST (same day, ~$0.52).** `previous_interaction_id` works mechanically
(no re-upload; kept Sample 4's edit skeleton and correctly amplified the punch-ins as asked)
**BUT each chained pass re-renders from the previous 720p OUTPUT and degrades compounds:**
Sample 4 (gen 1 from raw) graded real-human/perfect-lip-sync; its refine (gen 2) graded
**likely-ai with mouth warping at 3.5s**. Photocopy-of-a-photocopy. Rule: **talking scenes
get ONE generation pass max** — to iterate on a talking scene, re-roll from the RAW SOURCE
with a merged prompt (full cost), don't chain. Refine chains remain viable for b-roll
(no face to degrade — still needs the label eval gate per pass). This halves the hoped-for
refine economics on talking scenes; b-roll iteration still benefits.

**✅ NEIL EYEBALL VERDICTS (2026-07-05):** (1) Sample 4 zooms too fast — punch-ins read as a
"blink" straight to the face, not a felt camera move. Prompt-template fix for the preset:
ask for eased fast zooms ("smooth fast zoom with visible easing — the viewer should FEEL the
camera travel in and out; no instant jump-cut reframes"). (2) Dolly zoom: approved — beautiful,
consistent, nothing broken. Wants CAMERA ANGLE SWITCH tested next. (3) Directed display text:
approved — animation + drop-shadow readability both good.

**PIPELINE INTEGRATION SHAPE (agreed direction, not yet built):** per scene:
raw render → engagement plan → [Omni pass if plan calls a generation-class move] → 720p→1080p
upscale → EDL/FFmpeg deterministic layer. Routing signal on the storyboard scene (pattern:
`scene.transitionEffect` → Kling O1), e.g. `scene.omniMoves[]`. Gates: Business tier, cost
guard, label/identity eval + 1 retry, talking scenes reframe-class only + one-pass max.
**Presets AND storyboard, not either/or:** a preset library of PoC-validated move recipes
(tuned prompt templates — felt-zoom, dolly zoom, angle switch, display-text pop; pairs with
item #11 sellable Edit Styles) selected + parameterized per scene by the engagement-plan brain
from storyboard content. Build order unchanged: proxy `api/gemini/omni-video.ts` + routing is
a code-executor delegation AFTER Neil merges this branch and green-lights the plan.

**▶ PASTE-READY KICKOFF (next session — the copy-a-video test):**
> Read workflows/post_beta_roadmap.md item #18 (Omni PoC results + pipeline shape). I have a
> video I want to copy — this session reverse-engineers it into our first Omni presets.
> Protocol (Neil's rule, 2026-07-05): (1) I drop the video (file/URL) → run
> `tools/analyze_video.py` (Gemini watches it → Edit-DNA JSON). (2) MANDATORY before any
> prompt-writing: summon the smoke-tester subagent (foreground) to visually verify the
> analysis — extract frame contact sheets + per-moment crops of every text overlay, animation,
> motion graphic, zoom/angle move, and confirm/correct the Edit-DNA claims frame-by-frame so
> we fully understand how text/animations/motion graphics are built before copying them.
> (3) Translate the VERIFIED spec into: FFmpeg-executable moves (→ EDL vocabulary) vs
> Omni moves (→ preset prompt templates using the validated vocab + the eased-zoom fix).
> (4) Test the Omni presets on raw clips (re-cut from demos/viral-editor-2-demo-side-by-side.mp4
> left half via tools/omni_edit_poc.py — .tmp was wiped). Include the pending CAMERA ANGLE
> SWITCH test. Constraints hold: critical text stays FFmpeg; talking scenes one-pass
> reframe-only; no identity legalese in prompts; ~$0.10/sec, --yes gate on every paid call.

---

## How to add new items

When Neil endorses an idea but says "not now":

1. Confirm with him: *"Should I add this to `workflows/post_beta_roadmap.md`?"*
2. If yes, add a new `### N. <Name>` block following the template above (What / Why it matters / Why parked / When to resume / Where to start / Scope / Source).
3. Don't backfill stale items. If something has been parked for >6 months without a resume trigger firing, it's probably dead — ask Neil.

## When the roadmap fires

When `launch_readiness.md` hits 100% and beta is live, the very first action in the next session is to open this file and rank the parked items by:
- Is the resume trigger met?
- What's the size of the lever?
- What's the dependency order?

Then promote 1–2 items into active workflow files (e.g., `workflows/nightly_regression.md`) and start.
