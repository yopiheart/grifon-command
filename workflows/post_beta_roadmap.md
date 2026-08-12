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

> **Design checklist from the 2026-07-16 brief evaluation (see evaluation record below):** when this
> unparkes, the OpenAI "Three Pillars" agent-loop frame maps 1:1 onto the build — **triggers** =
> pg_cron hitting `api/odyssey/tick.ts`; **persistent context** = the Odyssey schedule/state rows in
> Supabase (idempotent by `(odyssey_id, day_number)`); **delegation** = the per-day tick handler doing
> the work while the user stays outer-loop (Pause / Resume / Skip Day). This item IS the brief's
> "agent-loop-as-product" idea (Paul Salt's Chief-of-Staff pattern, productized for end users) — the
> brief validates the tier, but does NOT change the resume trigger: unprompted beta demand first.
>
> **Brief evaluation record (2026-07-16):** *The Golden Age of AI Engineering* (Embiricos / Huet /
> Steinberger, OpenAI Dev Day) evaluated against the codebase — verdict: **~85% already absorbed**
> (outer/inner loop = Plan→Goal + build-gate; delegation = per-role model allocation + fresh-critic;
> triggers = `loops.md` Tiers 0–5; value-maxing = the 2026-07-01 allocation decision). Rejected as
> conflicts: server-side compaction (keep the `/clear` doctrine), default parallel fan-out (Max-5x
> quality-first budget, same call as the 2026-06-17 Kun Chen verdict), fully-unattended intermediate
> steps (TUNED-file + PoC cost checkpoints stay), and any re-inflation of the deferred AUTO-mode
> Director brain (`concierge_director_plan.md` §10 rescope stands). Net-new output: this design
> checklist + a product-shape note in `concierge_director_plan.md` §4. No new parked item, no code.
> Do not re-evaluate this brief.

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

> **Positioning language parked (2026-08-05, Boris Cherny / Claude Code brief eval):** the
> brief's enterprise thesis — "place AI at the center of company operations, un-bottleneck
> one constraint at a time" — is the exact pitch frame for THIS tier, SMB-sized. Oceanides /
> Kuya Marvin is the living case study (ads → landing page → Tawag Cockpit → ledger = AI sa
> gitna ng operations ng maliit na negosyo). When Autopilot selling resumes, hand this frame
> to `grifon-cmo` as swipe material. Workflow-layer verdict of the same eval: **zero edits**
> — auto-permission-mode, loop registry, evals-vs-vibes split, and model-as-orchestrator
> (WAT) were already house doctrine; Cherny's "deterministic engines are obsolete" targets
> rigid DAG pipelines, NOT WAT's agent-at-center shape. No loop to arm from this brief
> (nightly regression stays quota-parked).

---

### 3. MarketMind / Offer Optimizer "Reuse Previous Research" UX

> **Status (2026-05-12):** ✅ Tier 1 shipped — [`components/ui/PreviousResearchCard.tsx`](../components/ui/PreviousResearchCard.tsx) (gold-accent banner with subject + relative timestamp + LOAD button + dismiss X) renders above the form in both [components/MarketResearch.tsx](../components/MarketResearch.tsx) and [components/OfferOptimizer.tsx](../components/OfferOptimizer.tsx) entry views. Click "LOAD" → restores results view directly (skips form). Reads `localStorage.marketMindReport` / `localStorage.offerOptimizerResult` plus new `savedAt` and `subject` sidecar keys. Card dismissable; form stays visible below. Insertion point 3 (Step 2 "auto-fill from last research" button) remains parked — separate feature, inputs aren't persisted today. Multi-history, PDF/JSON re-upload, and cross-device persistence all parked for Phase 6+ / Phase 5.2+ Supabase work.
>
> **⏭ RE-GRADED 2026-08-01 — the parked remainder now lives in [#25 Brand Brain](#25-brand-brain--server-backed-per-brand-context-reuse-the-retention--moat-item).** The "pure surface, no infra, localStorage" framing below was accurate when written (2026-05-12) and is now out of date: `producer_runs` was built since, and already persists per-user research + artifacts server-side. Don't build cross-device persistence as UX polish off this item — build #25.

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
`workflows/archive/2026-05-22-session-g-dead-first-second.md`. Both no-code levers
(prompt FRAME-0 language, shorter duration) empirically FAILed; trim is the
remaining structural fix. Neil endorsed scoping it during the Session G grill
(locked decision #3: "document the limit + scope a trim follow-up").

---

### 10. ✅ SHIPPED — AI Editor Final-Render Executor + Trailing-Silence Trim (built on FFmpeg, NOT Remotion)

> **STATUS CORRECTED 2026-08-10.** This item read "the unbuilt Remotion Lambda" and
> described a stub. **It is built.** Not on Remotion — on the FFmpeg pipeline that shipped
> in the meantime. Every load-bearing claim in the old "Why parked" was verified false:
>
> | Old claim | Reality (verified 2026-08-10) |
> |---|---|
> | "the Remotion Lambda … is **not wired**" | `api/render/final.ts` + `api/_lib/renderFfmpeg.ts` (1,144 lines, `ffmpeg-static` + `spawnSync`) ship the render server-side |
> | "`EditVideo.tsx:266-269` is a **stub brain**" | `components/EditVideo.tsx:495` calls `renderFinalVideo()` from `services/finalRenderService.ts`, with error handling |
> | "the only output today is a **downloadable EDL JSON**" | EDL download still exists, but final-render is a real action beside it |
> | "`keepSegments` is a **script-text heuristic**, not audio speech-end detection" | `resolveSpeechEndSec()` (`renderFfmpeg.ts:542`) runs `silencedetect` on the voice MP3. The EDL heuristic survives only as the **fallback for audio-less scenes** |
> | "So nothing assembles a final video, so **nothing trims silence**" | Both exist. `SILENCE_MIN_SEC = 0.4`, `PAD_SEC = 0.18` so the last word is never clipped, and the **last scene trims razor-tight (0.06s)** after a 2026-06-10 review caught a Kling ghost/dissolve tail |
>
> The stale `services/geminiService.ts:1269-1273` line reference now points at unrelated
> prompt text — the file moved out from under the citation. **Lesson: a roadmap item that
> cites line numbers rots silently.** Verify before resuming any parked item here.
>
> Related follow-on work continued through 2026-08-09 (lead-in/head trim in
> `api/_lib/voiceLeadIn.ts`, STS video cut, hook hold 1.0 → 0.5s), so the tail trim this
> item asked for is now one part of a broader, tuned trim system. **Treat
> `renderFfmpeg.ts` as TUNED.** Do not rebuild any of this.

**⛔ Remotion verdict: CLOSED, twice, and the case got weaker since.**

1. **2026-06-08** — FFmpeg burn-in was chosen over Remotion for the caption/overlay
   engine, marked *do not reopen*.
2. **2026-07-22** ([`hyperframes_decision.md`](hyperframes_decision.md)) — *"if the parked
   Remotion Lambda final-render executor ever revives, **Hyperframes supersedes Remotion
   as the candidate** (plain HTML > framework-specific React for LLM authoring)."*
3. **Since then** the FFmpeg executor actually shipped (above), so the vacancy Remotion
   was proposed to fill no longer exists.

Remotion is still headless Chrome underneath, so it hits the **same 300s Vercel wall**
that ruled out browser rendering in the product. And it would be a *fourth* renderer beside
FFmpeg / Hyperframes / Omni (plus the `grifon-promo-canvas` lane) — which is `ai-editor`
premortem #3, "the registry rots." Note also that the canvas lane already implements
Remotion's actual core idea: `drawFrame(ctx, t)` is `useCurrentFrame()`. Adopting Remotion
would buy React syntax and AWS Lambda, not the concept.

**↻ The ONE condition that reopens it.** Remotion Lambda's real moat is **server-side,
horizontally-scaled, data-driven template rendering** — one motion template + an array of
data → N variants rendered in parallel in the cloud. Nothing we own can do that:
Hyperframes is a local CLI, the canvas lane is single-process, FFmpeg is per-job.
**If a product feature ever needs that** (e.g. "render 20 variants of one template from a
data set"), Remotion is the right tool and **beats Hyperframes for that specific job** —
a local CLI does not scale. Today we have no such need: the 12-recipe sample batch is full
AI-pipeline renders where the cost is Veo/Kling model calls, not compositing, so Remotion
would save nothing. Do not reopen on general enthusiasm; reopen only on that requirement.

<details>
<summary>Original item text (kept for provenance — describes the pre-FFmpeg world)</summary>

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

</details>

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

> **Brief evaluation record (2026-08-12):** *Meta Ads: Scaling from Scrappy to Sophisticated
> ($100 vs $100,000 Facebook Ads Strategy)*, brought by Neil as a structured knowledge-transfer
> doc. ⚠ **This is a paid-ads brief, NOT an agent-architecture brief.** Do not add it to the
> tally in item #27, which counts a different family and whose "marginal return has flattened"
> note does not apply here. Filed under #17 because everything that survived evaluation is an
> attribution/measurement question, which is this item's territory.
>
> **Verdict: ~80% already absorbed** by [`grifon-ad-strategist/SKILL.md`](../.claude/skills/grifon-ad-strategist/SKILL.md),
> which already carries Advantage+ as the 2026 cold default, 10-20% always-on testing, CBO vs
> ABO by budget tier, break-even ROAS = 1 ÷ margin, ~50 optimization events / 7 days to exit
> learning, and MER as north star. Four things survived, ranked:
>
> 1. 🔴 **The `fbc` gap, and it is the highest-value finding in this entry.** The brief's one
>    verified claim is that native Meta tracking is off 20-50%; Hyros exists to sell that fix.
>    We already built most of the fix and omitted the field that matters most.
>    [`api/_lib/metaCapi.ts`](../api/_lib/metaCapi.ts) sends hashed email, hashed `external_id`,
>    `client_ip_address` and `client_user_agent` with `event_id` dedup and `value`/`currency`,
>    but **no `fbc` and no `fbp`.** `fbc` is the click ID derived from `fbclid`, the strongest
>    match key Meta accepts and the only one tying a Purchase to a *specific ad click* rather
>    than a probabilistic guess about a person. Second instance of the same hole: the funnels
>    fire `Lead` browser-only via `fbq` ([`pixel.ts`](../funnels/oceanides-price-page/src/lib/pixel.ts))
>    with no server-side counterpart and no `event_id`, even though every lead already lands in
>    Supabase `funnel_leads`. **Attribution cannot be backfilled** — a Purchase that arrives
>    without `fbc` is unattributable forever, so the cheapest moment to close this is before
>    the first paid traffic, which the launch lock means has not happened yet.
> 2. **Value Rules** (bid +N% for segments with higher repeat-purchase or phone-conversion
>    rates, set above ad-set level) are genuinely new and genuinely not for us yet: they need
>    enough conversions to know which segment deserves the bump. At ₱500/day with one logged
>    order we would be bidding off noise. Parked, not discarded.
> 3. **Account-level audience definitions** (declare customer vs engaged vs cold lists so Meta
>    can see warm reach) cost nothing and need no spend. Consent-gated via
>    [`marketing_consent.sql`](../supabase/marketing_consent.sql) + the Phase 3 roster-export
>    path. Do it when Oceanides resumes.
> 4. **Positioning:** *"The $100 advertiser's job is to get out of the algorithm's way."* Grifon's
>    whole market is that advertiser, and by the brief's own logic targeting, bidding, structure
>    and attribution are all unavailable at that budget, leaving **creative as the only lever.**
>    An outside source independently derived our wedge. Swipe material for `grifon-cmo`, sitting
>    beside the Cherny Autopilot frame under item #2.
>
> **Three conflicts. Two resolved against the brief.**
> - ⛔ **Do not import its low-budget creative rule.** It says 1 creative format, 1 test/month;
>   our skill says 4-6 genuinely distinct creatives even under ₱1k/day, because Andromeda prices
>   near-identical videos as cosmetic dupes. The ledger has an open action on exactly this
>   (hook1/hook2 shared seg2-seg6 byte-for-byte). The brief reads pre-Andromeda here.
> - ⚠ **The brief wins the scaling argument, but the rule does not change yet.** It says jump
>   200%+ at $3/day; the skill says never jump 3× overnight. At ₱500/day a sales objective gets
>   ~10 events/week against the ~50 needed, so there is no learning phase to reset and the
>   skill's absolute is scale-blind. Logged as ledger **A7 at 0 corroborating campaigns of our
>   own**; the ≥3 gate holds and the skill text is untouched.
> - ✅ **Our ledger already beats the brief on one point.** Pattern **A3** (₱12.85/message, 3×
>   better than target, 1% close) proves a tracked event can be cheap and worthless. The brief's
>   low-budget framework optimizes CPA/ROAS while assuming the tracked event *is* the money
>   event, which is false for messaging and call businesses. We paid to learn that.
>
> **Hyros: NO.** Both pages fetched 2026-08-12. Headline *"Our Tracking Data Grows Your Ad ROI.
> Or You Don't Pay"* / *"Your Ads Grow 15% Or You Don't Pay"*; pricing and minimum spend are
> published on neither page, gated behind a business-model selector and a booked call, so the
> commercial terms remain unverified and are not guessed at here. Four reasons: (a) the
> transcript discloses its own bias (40% lifetime affiliate commissions, 30% discount via the
> creator's link), so the 10-15% lift figure is a marketing claim from an interested party, and
> the brief's own Gaps section says so; (b) we would be buying the part we can build for free,
> since stripped of the AI language Hyros is first-party server-side tracking with click IDs,
> identity stitching, call tracking, and API conversion push, and we already have the push;
> (c) it does not fit the business, because Oceanides converts in Messenger and on the phone and
> KM-003 deliberately runs with no pixel attached (messaging conversions are counted at the
> Page); (d) total logged spend is ₱1,284.92. **Revisit only if Grifon itself ever spends real
> money on paid acquisition against a web checkout.** Never for Oceanides.
>
> **Not done here:** items 1 and 2 above are code and were not written. NOW.md's only focus is
> the sample batch, and Paolo/Oceanides is HELD.

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

### 19. New First-Class Scripting Formats (walking UGC · before/after · unboxing/POV promotion · tutorial)

- **What:** Promote evidence-backed formats to first-class `scriptType` values with
  their own picker cards, script formulas, and storyboard skeletons. Candidates in
  priority order (Neil, 2026-07-08): walking/authority UGC (swipe-file P10),
  before/after transformation, unboxing + POV promotion (today they live only as
  Temu sub-types: ASMR = "Unbox with me", Utility = "POV Problem Solving"),
  tutorial/how-to (no scaffolding at all).
- **Why it matters:** Format variety is the moat once users ship their 5th–10th ad —
  every format today funnels through the same MrBeast/Testimonial/Temu skeletons,
  and the storyboard Scene-1 start/end-frame semantics are format-conditioned, so
  variety must be built, not prompted around.
- **Why parked:** Zero users pre-launch = zero evidence which formats users exhaust
  first; a new format is a TUNED edit (`buildAdScriptPrompt` + `buildStoryboardPrompt`
  branches in `api/_lib/prompts.ts`, plus `scriptStyleDetected`/EDL keying) — the
  ≥3-corroboration gate exists precisely so these branches aren't guessed.
- **When to resume:** A candidate pattern hits 3/3 in `viral_swipe_file.md`
  (Active Format Evidence Hunt section) **OR** ≥2 beta users ask for format variety.
- **Where to start:** `workflows/viral_swipe_file.md` → the graduated pattern's Gated
  Proposal; touch surface map is in plan `by-the-way-fable-precious-hellman`
  (types.ts enum → picker cards → 2 TUNED prompt branches → EDL keying).
- **Scope:** 1 format ≈ one focused session (grill-me → tuned branches → gemini-eval
  regression). Do ONE format end-to-end before starting a second (vertical slices).
- **Source:** Neil product-check session 2026-07-08; format hunt priorities his call.

### 20. Food & Fashion Niche Treatment (signaling shipped; dedicated verticals parked)

- **What:** Dedicated Food and Fashion verticals with their own storyboard skeletons
  (à la Services/RealEstate). The cheap half already shipped 2026-07-08
  (`feat/niche-coverage-cheap-fixes`): food-venue keywords in `inferServiceArchetype`
  + food/fashion mentions in the vertical pickers, so those Bryans recognize
  themselves in the existing flows (food venue → Services `venue`; packaged
  food/fashion → Product).
- **Why it matters:** Food + fashion are arguably the two biggest PH SMB ad
  categories on Facebook — if generic formats underserve them, that's churn in the
  largest cohorts.
- **Why parked:** The pipeline already serves both via Product/Services; a dedicated
  vertical = new TUNED storyboard skeleton + archetype system with zero evidence the
  generic ones fall short. Evidence-first, same as #19.
- **When to resume:** ≥3 food or fashion beta users **AND** autopsy/debrief evidence
  of niche-specific patterns the generic formats miss (e.g. appetite shots /
  try-on-haul grammar not expressible today).
- **Where to start:** `workflows/viral_swipe_file.md` (autopsy food/fashion winners
  first), then mirror the Services vertical pattern (#12) for the build.
- **Scope:** Comparable to #12/#13 (a full vertical: archetype meta + slots + script
  formula + storyboard skeleton + regression).
- **Source:** Neil product-check session 2026-07-08 ("we don't have FOOD & Fashion
  niche as well").

### 21. Last30Days community-pulse skill — gated trial (blocked in remote sandbox, resume on cafe PC)

- **What:** Trial [mvanhorn/last30days-skill](https://github.com/mvanhorn/last30days-skill)
  (MIT, ~52k stars, installs as a Claude Code plugin) as a dev-side data source: 30-day,
  engagement-ranked community pulse from Reddit/X/YouTube/TikTok/HN. Fit identified
  2026-07-16: (a) upstream trend radar for ad-recon → viral-autopsy → Swipe File (feeds
  Bridge #1 candidates; ≥3-corroboration gates unchanged); (b) TikTok/community intel for
  `grifon-ad-strategist` + `grifon-cmo` — the current blind spot (Motion MCP is Meta-only).
  NOT for the product/MarketMind (tatawagin-ka truth; server-side rebuild + opex — separate
  decision later, only if the dev-side data proves out).
- **Why parked:** The 2026-07-16 remote-session trial was **blocked three ways, honestly**:
  (1) sandbox permission classifier denied executing the cloned third-party code (correct
  caution — it ships cookie-harvesting machinery, and the session holds repo + MCP creds);
  (2) built-in WebSearch cannot reach reddit.com (Reddit blocks Anthropic's crawler — the
  brief's platform-walling thesis, demonstrated live); (3) firecrawl (which can reach Reddit)
  needed an interactive approval with Neil away. Verdict so far: **fit is real, value unproven —
  no data seen yet.**
- **When to resume:** Next cafe-PC session (or any session with Neil present to approve
  firecrawl as the interim keyless-value probe).
- **Where to start (paste-ready cafe-PC kickoff):** install via
  `/plugin marketplace add mvanhorn/last30days-skill`. **House rules for the trial:**
  NO cookie mode on the rented PC (skip browser-cookie extraction; keyless sources +
  optional ScrapeCreators key in `.env` only — 10k free calls, third-party SPOF, log spend);
  run output through a subagent or straight to a file (5–14 min runs, big outputs — context
  hygiene); trial topic: `/last30days AI video ad generators` (doubles as competitor/objection
  intel for CMO). **Judge test:** did it produce an autopsy candidate or CMO hook we wouldn't
  have found by hand? Adopt → add `scripts/restore-last30days.ps1` (idempotent, per
  `restore-codex.ps1` pattern) + a line here; else park permanently.
- **Scope:** ~30 min trial on the cafe PC. Adoption plumbing (restore script + skill-integration
  notes in `ad-recon`/`viral-autopsy`) ≈ 1 hour more.
- **Source:** Neil, 2026-07-16 — NotebookLM brief *"LLM Can't Search TikTok or Reddit"* +
  "okay bro g!!" endorsing the gated trial. Repo verified real same session (WebFetch).

### 22. Skill hygiene — remainder (no-op body purge + skill-creator trigger spot-check)

> **Brief evaluation record (2026-07-18):** *Don't Ship Skills Without Evals* (Philipp Schmid,
> Google DeepMind) evaluated against the codebase — verdict: **~60% already absorbed**
> ("deterministic process → script" = the WAT framework verbatim; over-trigger control =
> the `disable-model-invocation: true` decision on 9 heavy skills, a cheaper instrument than
> eval suites for a solo operator; trial-then-retire = codex-executor gated trial /
> Last30Days park / fable-mode sunset trigger; eval-where-it-matters = gemini-eval +
> `RUN_REGRESSION` suite on the TUNED product prompts, the real user-facing "skill").
> **Applied same day (commit below):** the description diet — the 11 model-visible skill
> descriptions (the always-paid per-invocation context tax) cut 1,038 → 706 words (~440
> tokens/session, permanent), with negative triggers added so every auto-firing skill now
> names its nearest confusable neighbor (brand-check ↔ grifon-creative-director ↔
> gemini-eval, codex-image ↔ static-autopsy, straw-man-audit ↔ brand-check). Trigger
> keywords (ROAS/MER, invoke-by-name aliases, NOT-for lanes) kept verbatim — the diet cut
> prose, not discriminators. **Rejected as conflicts:** the full CI skills-harness
> (isolated workspaces × 10–20 prompts × 3–6 trials — DeepMind team economics; on Max-5x
> the eval runs would burn the budget the skills conserve) and the literal 500-word cap on
> skill *bodies* (persona playbooks are user/on-demand-loaded — their depth is a feature;
> in Claude Code the binding constraint is the description, not the body). **Adopted as
> doctrine:** when a skill is retired, keep its eval/trial criteria alive as regression
> radar (codex_executor_trial.md, the Last30Days judge test) — cheap early warning for
> model regressions.

- **What (still parked):** (a) no-op purge of the most-fired skill *bodies* (brand-check
  2,276w / gemini-eval 1,954w / verify-changes / director-smoke) — strip fluff directives
  that don't change behavior, keep every real rule; (b) a 10-prompt trigger spot-check
  (5 positive / 5 negative) on the 2–3 most-fired auto skills using `skill-creator`'s
  existing eval capability — validates the new dieted descriptions empirically.
- **Why parked:** The diet already banked the always-paid savings; body purge pays only
  per-invocation and risks trimming a load-bearing rule if rushed. Not launch-critical.
- **When to resume:** First session where a dieted skill visibly mis-fires or fails to
  fire (that's the empirical signal the spot-check would have caught), or the next
  slow-day hygiene session post-beta.
- **Scope:** ~1 hour total (30 min purge + 30 min spot-check).
- **Source:** Neil, 2026-07-18 — NotebookLM brief *Don't Ship Skills Without Evals*
  (Philipp Schmid, DeepMind) + "Okay G! surprise me" endorsing move #1 execution.
  Session report artifact (before/after chart + verdict):
  <https://claude.ai/code/artifact/0db89255-01ec-461b-a6fd-6ec100eddbe7>

---

### 23. Product-facing image-to-3D viewer (hosted-API lane only)

> **Brief evaluation record (2026-07-21):** *From Pictures of Objects to 3D Three.js in
> MINUTES* (img2threejs, github.com/hoainho/img2threejs) evaluated against the codebase —
> verdict: the repo is an **agent-native authoring pipeline** (staged passes + agent-vision
> gates), not a runtime library or API, so it CANNOT power a user-facing feature (each
> conversion is a multi-stage agent session — violates the `concierge_director_plan.md` §2
> architecture truth). **Adopted instead as the internal foundry skill**
> `.claude/skills/img2threejs-lab/` (landing centerpiece prototypes, client-flex interactive
> artifacts, turntable b-roll). This parked item is the *product-facing* remainder only.

- **What:** "Upload your product photo → interactive 3D viewer" as an app feature, via a
  **hosted image-to-3D API** (Tripo/Meshy class — real mesh generation behind an `api/*`
  proxy, async fire-then-poll like Kling), NOT img2threejs.
- **Why it matters:** E-commerce differentiation — 2D product photos become rotatable 3D
  product visualizers without a 3D artist; a possible Business-tier "commercial-grade" line.
- **Why parked:** (1) No demand signal — Grifon ships video ads, not web embeds; no beta
  user has asked. (2) New paid provider + new render pipeline while `launch_readiness.md`
  P0s are open. (3) three.js in the app bundle needs its own plan (`check:bundle-leak`).
- **When to resume:** ≥2 beta/paying users ask for interactive product embeds, OR a client
  deal hinges on it. Prototype the *look* first with `img2threejs-lab` (zero product code).
- **Where to start:** Provider eval (Tripo vs Meshy: PH pricing, glTF output, API shape) →
  grill-me spec → proxy handler on the Kling async pattern → lazy-loaded viewer module.
- **Scope estimate:** Multi-day (new provider + async pipeline + viewer UI). Not before beta.
- **Source:** Neil, 2026-07-21 — img2threejs knowledge-transfer brief evaluation ("surprise
  me brother!"); skill adopted same session, product lane parked here.
- **Update 2026-07-22 (Griffin Emblem eyeball gate):** Neil FAILED the proof run for
  brand-mark use — a stylized near-match of a known logo reads as a bootleg of the brand
  ("kung hindi parehas… ano nalang mararamdaman ng viewers"). Standing rule: **procedural
  `img2threejs-lab` output must never ship as a brand mark or any asset viewers already
  know from 2D** — stylized-acceptable subjects only. Pixel-faithful 3D (brand marks,
  recognizable products) requires this hosted-API lane. Quick provider snapshot from that
  session: Meshy free tier = 100 credits/mo (~5 image-to-3D runs, CC BY 4.0, no card;
  Pro $20/mo), strongest textures/PBR from the source image; Tripo = fastest + cleanest
  geometry. A $0 free-tier bake-off on `public/griffin-emblem.png` is the natural first
  step if Neil wants the 3D emblem itself (internal marketing use — does NOT require
  unparking the product feature).

### 24. Gemini 3.6-era capability runway (Batch API · whole-video autopsy · context caching)

> **Brief evaluation record (2026-07-22):** Google's Gemini 3.6 Flash / 3.5 Flash-Lite GA
> drop evaluated against the codebase (jointly with GPT 5.6 Sol, read-only Codex
> brainstorm; plan file `gemini 3.6 adoption`). Verdict: **adopt surgically** — Slice 0
> (billing-grade `modelCosts.ts` + thoughts-token telemetry + legacy model allowlist)
> SHIPPED same session; research-tier → 3.6-flash and the 3.5-flash-lite extraction pilot
> are eval-gated slices in flight (Neil-gated LOCKED-line flips). The release does NOT
> touch image/video gen — workhorse creative tier stays on 3.1-flash-lite (price UP +67%
> output on 3.5-lite; schema-valid-but-creatively-wrong drift risk on locked Taglish
> prompts). This parked item is the *second-order capability* remainder only.

- **What:** Three deferred levers the new models unlock: (a) **Batch/Flex API at ~half
  price** for non-interactive workloads — nightly regression runs (#1), batch headlines,
  calendar gen, offline audits; (b) **whole-video understanding** via 3.6's long-context
  accuracy jump (91.8% vs 77.3% @128k) — upgrade `tools/analyze_video.py` / viral-autopsy
  synthesis to single-pass full-video analysis (needs Files API path, not the 55s
  synchronous proxy); (c) **context caching** for repeatedly-queried brand dossiers /
  swipe-library corpora.
- **Why it matters:** (a) halves the Gemini bill on every batch job; (b) deeper autopsy
  evidence per video = better Pattern Index entries; (c) margin on any future
  Concierge/Director flow that re-reads the same brand context per session.
- **Why parked:** All three are optimizations with no current bottleneck: nightly
  regression v1 is deterministic-invariants-only, viral-autopsy works chunked today, and
  no flow re-queries a large corpus yet. Slices 1–3 of the adoption plan (eval + flips)
  come first — no point batching on models we haven't validated.
- **When to resume:** (a) when nightly regression expands past adscript (item #1
  increment 2) or a recurring batch job shows up in the cogs logs; (b) when a
  viral-autopsy entry is blocked by chunking artifacts, or Concierge needs full-video
  input; (c) when any flow sends the same >32k-token context ≥3× per session.
- **Where to start:** (a) point the regression workflow's vitest calls at the Batch API
  surface; (b) add a Files-API upload path to `tools/analyze_video.py`; (c) measure
  candidate corpora sizes from cogs logs before writing any caching code.
- **Scope estimate:** Each lever is 0.5–1 day independently; no ordering dependency
  between them.
- **Source:** Neil, 2026-07-22 — "most powerful model" brief evaluation; Slice 0 shipped
  same session, capability runway parked here per the approved plan.

### 25. Brand Brain — server-backed per-brand context reuse (the retention + moat item)

> **Absorbs the parked remainder of [#3](#3-marketmind--offer-optimizer-reuse-previous-research-ux)**
> (cross-device persistence / multi-history). #3 Tier 1 shipped as UI polish over `localStorage`
> and was correctly graded "pure surface, no infra" — **in May 2026, when that was true.**
> `producer_runs` did not exist yet. It does now, and it changes the grade: this is no longer
> polish, it is the retention story and the one asset a competitor renting the same models
> cannot copy. Build this one, not #3's remainder.

**What:** Move per-brand accumulated context (market research, brand identity, target-market
lock, what won last time) off the client and onto the user's account, then read it back on the
next run so ad #2 starts from everything ad #1 learned.

**The finding (2026-08-01):** the brain is *already being written and never read.*

- [`services/researchCacheStore.ts`](../services/researchCacheStore.ts) is `localStorage`,
  `MAX_ENTRIES = 10`, per-device. The customer's context dies on browser-clear, on a second
  device, and at ad #11.
- [`supabase/producer_runs.sql:11-27`](../supabase/producer_runs.sql#L11-L27) *already* persists
  `input` (full ProductionInput) and `artifacts` (report / script / storyboard / EDL), keyed by
  `user_id`, server-side, durable, revision-guarded.
- The swap seam is already cut and already async:
  [`producerOrchestrator.ts:313-314`](../services/producerOrchestrator.ts#L313-L314) declares
  `getCachedResearch` / `putCachedResearch` as injected `Promise`-returning deps;
  [`producerDeps.ts:171-172`](../services/producerDeps.ts#L171-L172) is the **single wiring
  point**. A server-backed store is a drop-in there — no TUNED file touched.

**Why it matters:** (a) **Retention** — ad #2 being visibly better than ad #1 is the reason a
Filipino SMB pays for month 2; today every ad starts from zero. (b) **Moat** — everyone rents
Gemini, and Higgsfield rents better models than we do; per-brand accumulated context is the
director-layer asset they structurally cannot copy (the memory half of the "Higgsfield = engine,
Grifon = director" position in [`concierge_director_plan.md:111-119`](concierge_director_plan.md)).
(c) **Serves both businesses** — the same artifact is retention in the product and the thing that
makes client rep #2 profitable in the services lane.

**Why parked:** It is a *retention* feature, and retention needs users to retain. Shipping it
before launch means building a moat around an empty field. The 7-issue Producer punch list
(`NOW.md`) and the P5 engine-default flip come first — full stop.

**When to resume:** **First build after the launch gate closes.** Trigger = engine landed as
default AND first real users on the Producer flow. Do not let it jump the queue; do not let it
slip either — it is the first thing in the post-launch slot, ahead of everything else in this file.

**Where to start:** (1) read `producer_runs.input`/`artifacts` for the user's prior runs; (2) new
server-backed store behind the *existing* `getCachedResearch`/`putCachedResearch` signature;
(3) swap the wiring at `producerDeps.ts:171-172`, keep `localStorage` as offline fallback;
(4) keep `forceFreshResearch` (the intake "Re-research" toggle) as the escape hatch — a locked
brand identity that can't be overridden is a bug, not a feature.

**Scope estimate:** ~1 day for the store + wiring. Larger if it grows a "what won last time"
signal, which should be a **separate** slice — ship reuse first, learning second.

**Source:** Garry Tan / Y Combinator "The New Physics of Business" brief, second evaluation
2026-08-01 (*"Model quality is rented, but if you build your brain, you own that brain"*). The
first eval (2026-07-28, `c521a5b`) scoped only the agent/workflow layer and correctly found it
already-built; this pass scoped the **product** layer and found the same doctrine unapplied where
it actually earns money. Sequencing (launch first, brain second) is Neil's call, same session.

---

### 26. Client-Artifact Promotion Rule — "built twice for clients → product candidate"

> **Brief evaluation record (2026-08-04):** *How Forward Deployed Engineering is Done at
> Cognition* (Jia Wu) evaluated against the codebase — verdict: **~80% already absorbed.**
> The FDE core loop (embed with customer → high-fidelity field evidence → gated product
> feedback) is structurally the swipe-file system (`viral/static/funnel-autopsy` →
> ≥3-corroboration gated proposals → Neil-approved TUNED edits); "token maxing is dead" =
> the context-hygiene + quality-first budget doctrine; "coding is 20%, SDLC is 80%"
> translates to "generation is 20%, the marketing lifecycle is 80%" and validates the
> existing `growth_loop.md` / `ad_performance_ledger.md` / Odyssey-as-Cron prioritization;
> "automate out of the loop" = `loops.md` Tiers 0–5. **Rejected as conflicts:** T-shaped FDE
> hiring (solo founder), enterprise embedding economics at PH SMB price points, any
> loosening of TUNED-file / builder≠reviewer discipline, and re-inflation of the AUTO-mode
> Director brain (`concierge_director_plan.md` §10 rescope stands — the brief changes **no
> resume trigger** in this file). Net-new output: this item + the Option C reframe note in
> `concierge_director_plan.md` §2. **Do not re-evaluate this brief.**

**What:** A standing promotion rule for the *ops tooling* half of client work. Creative
patterns already have a pipe into the product (swipe files → Pattern Index → gated
proposals). The artifacts hand-built for a client's *operations* — price cheat sheet
(`/presyo`), weekly posting pack, Messenger reply scripts, ops-passphrase pages, funnel
pages — had no such pipe. The rule: **the second time an artifact of the same shape gets
built for a second client, it triggers a product-candidate evaluation** — does this become
a Grifon feature (product layer), a reusable skill (workflow layer, the `funnel-forge`
precedent), or does it stay bespoke?

**Why it matters:** Reframes the client lane as the product's R&D department instead of
side income. Cognition's entire model is that manual embedding IS the discovery engine —
the workarounds an embedded engineer builds by hand become the roadmap. `funnel-forge` is
the existing proof this works here (one client rep → productized repeatable skill). This
item just makes the trigger explicit so the next occurrence doesn't slip past unnoticed.

**Why parked:** Only one client exists (Oceanides). The rule fires on the *second* build
for a *second* client, which hasn't happened. Nothing to build now — this item IS the
rule; parking it here is the implementation.

**When to resume:** The moment any Oceanides-shaped artifact gets requested or rebuilt for
a second client. That session: compare the two builds, and if the shape corroborates, draft
the candidate through the normal gates (`grill-me` if product-layer, skill-creator if
workflow-layer).

**Where to start:** List what Oceanides got (`clients/oceanides/` + `funnels/`), diff the
second client's ask against it, promote the overlap.

**Scope estimate:** Zero now; per-candidate later.

**Source:** Jia Wu (Cognition) FDE knowledge-transfer brief, evaluated 2026-08-04, Neil
endorsed same session ("Okay bro G" — stamp the record + park the rule, then back to the
live campaign).

---

### 27. Production Incident Agent (the "AI SRE" / on-call assistant pattern)

> **Brief evaluation record (2026-08-07):** *How Ramp Engineers Work with AI Agents at Every
> Step* evaluated against the codebase — verdict: **~70% already absorbed.** Horizontal
> loops/routines = [`loops.md`](loops.md) Tiers 0–6; the test-time-compute dial = the
> per-role model allocation in CLAUDE.md; adversarial sub-agent verification =
> [`pr_review_loop.md`](pr_review_loop.md) (builder ≠ reviewer) + `gemini-eval` /
> `brand-check` / `straw-man-audit`; least-privilege agent access = the
> `ad-spend-gate` / `veo-render-gate` hooks + read-only Meta allowlist + the TUNED-file
> guardrail; declarative prompting ("state the outcome, not the steps") = the `/goal`
> condition template; build-for-future-models = Bake-and-Leap, already parked as item #1's
> second verdict type.
>
> **Rejected as conflicts:** (a) *eliminate token budgets / ignore cost when ROI is
> positive* — Grifon runs on a capped Max 5x plan with the Gemini video budget currently
> exhausted, and with zero paying users "positive ROI" is unmeasurable, so the premise
> fails on its own terms. **This is the third brief to carry this claim (Kun Chen
> 2026-06-17, OpenAI Dev Day 2026-07-16, Ramp 2026-08-07); the context-hygiene doctrine
> stands and does not need a fourth review.** (b) *deprecate prompt scaffolding as models
> outgrow it* — sound for agent-harness scaffolding, **actively dangerous here**, because
> Grifon's prompts are product IP, not harness (that is what
> [`check-bundle-leak.mjs`](../tools/check-bundle-leak.mjs) exists to protect). The two
> senses of "scaffolding" must not be conflated. (c) *autonomous PR fixes from the on-call
> agent* — collides with the standing flag-don't-apply rule; the brief lists write-access
> governance under its own admitted gaps. Take the detection, never the application.
> (d) Modal-style remote dev environments, Project Glass, decentralized multi-team tool
> adoption — no org, and the cheap 80% (GitHub Actions + cloud Routines) already ships.
>
> **Net-new output (all landed 2026-08-07, none of it code):** the trace-based-evaluation
> stopping rule as rule 9 in [`gauntlet_loop_decision.md`](gauntlet_loop_decision.md); the
> `workflows/` handoff-doc archive sweep (36 files → [`archive/`](archive/README.md), with
> the archiving rule written down so the pile does not rebuild); and this item. **Do not
> re-evaluate this brief.**

> **Corroboration #2 — Guillermo Rauch / Vercel "Eve" brief, evaluated 2026-08-07 (same
> day).** Verdict: **~90% already absorbed**, the highest of any brief evaluated here.
> `instructions.md`/`soul.md` = CLAUDE.md + agent_lessons.md; `skills/` = the 28 skills in
> `.claude/skills/`; `tools/` = `tools/`; and the thesis binding them is
> [`wat-framework.md`](wat-framework.md), written before the brief. Router + sub-agents =
> the main loop + `.claude/agents/`; "D0" data agent = `growth_debrief_pull.py` /
> `segment_pull.py` / `meta_insights_pull.py` / `executor_ledger.mjs`; dynamic model
> routing = the per-role allocation in CLAUDE.md. **Genuinely absent: only two things —**
> an ambient multi-channel interface, and event-driven (non-cron) triggers. The second IS
> this item, so Rauch is corroboration, not a new item.
>
> **The one thing acted on:** the brief's channel insight — *put the agent where the human
> already reads*. Applied as the Tier 0b `main-status` alarm + the CI read added to Health
> Watch v2 ([`loops.md`](loops.md)); that is step 1 (now ✅ confirmed) and a scoped step 2
> below. Nothing else built.
>
> **Rejected as conflicts:** (a) *"interactive prompting is an obsolete paradigm"* — the
> **fourth** arrival of the eliminate-the-human-gate claim (Kun Chen, OpenAI Dev Day, Ramp,
> now Rauch), and the note above already said a fourth review is not needed. Sharper danger
> here though, worth one line: in Grifon the prompts **are** the guardrails
> (`ad-spend-gate`, `veo-render-gate`, TUNED-file approval, flag-don't-apply, "never spends
> autonomously") — removing the prompt removes the gate. (b) *route models on latency vs
> reasoning* — Grifon routes on quota + quality + executor attribution, and CLAUDE.md bans
> downgrading the main loop to save tokens. Same mechanism, wrong criterion; don't import
> it. (c) *Vercel Connect / 100+ integrations* — the 2026-08-07 audit found the Meal
> Reminder carrying **nine** connectors to use one tool; this repo is already
> over-connected relative to readers. (d) *serverless hibernation, 1000-employee adoption,
> cross-team tool rollout* — all coordination-cost problems; the org here is one person,
> whose actual constraints are the defreezer and unread channels. (e) *"build the agent
> before the website"* — must not reopen the §10 Concierge rescope or its two gates
> (demand + the closed-loop eval harness). **Do not re-evaluate this brief.**
>
> **Meta-observation worth keeping:** this is the *seventh* agent-architecture brief
> evaluated against this repo since May (Cherny, Kun Chen, OpenAI, Garry Tan, Cognition,
> Waymo, Ramp, Rauch). Each has produced ~one small apply plus a re-rejection of the same
> cost/autonomy claim. **Marginal return has flattened — treat the next one as a 30-minute
> skim against this table, not a session.**

**What:** An agent that triggers on a production incident — a failed Vercel deployment, a
runtime error spike, a Supabase advisor crossing baseline, a support complaint — pulls the
relevant telemetry, does root-cause analysis, and opens a GitHub Issue with a diagnosis and
a *proposed* diff. Detection and diagnosis are autonomous; application stays gated.

**Why it matters:** It is the one genuinely missing loop tier. Everything in
[`loops.md`](loops.md) today fires on a *schedule* or on an *edit*; nothing fires on
*production reality*. Today the first signal that a beta user's render broke is the user
saying so — the exact fragility item #1 was parked to fix on the generation side.

**Why parked:** No production traffic. An incident agent with no incidents is the *"a
Routine without a named READER is quota burn"* rule in [`loops.md`](loops.md) Tier 6,
violated on purpose. The substrate is genuinely ready and that is the tempting part —
[`api/events.ts`](../api/events.ts) + `supabase/events.sql` + `producer_runs.sql` +
`feedback.sql` are live, Vercel `get_runtime_errors` and Supabase `get_logs` are connected,
and Health Watch v2 already runs daily with both connectors attached. Ready is not the same
as needed.

**When to resume:** First paying cohort on `app.grifon.ai` — i.e. when
[`launch_readiness.md`](launch_readiness.md) closes. Earlier only if a beta user hits a
production failure Neil learned about from the user rather than from a monitor.

**Where to start:**
1. ✅ **DONE 2026-08-07.** The Health Watch v2 push was confirmed end-to-end (Routines UI:
   `Sent notification` + *"Pushed the details to your phone."*). The channel is live —
   the Gmail fallback is moot and should not be built. ⚠ Still pending: delete the v1
   trigger + ~11 dead `send_later` triggers (Routines UI; the in-session `RemoteTrigger`
   tool has no delete action).
2. Widen v2's read set from advisors-only to `get_runtime_errors` + Supabase `get_logs` +
   the `events` / `producer_runs` failure rows. Same read-only posture.
   - ✅ **Partially done 2026-08-07 (CI slice only):** v2 now reads the Tier 0b `ci-red`
     issue and reports a red `main` — with its age in days — as CRITICAL. Taken early
     because it cost one prompt edit and closed a failure that had already happened
     (the 3-day outage). `get_runtime_errors` / `get_logs` / failure-row widening is
     still parked — those need traffic to be worth reading.
3. Add the diagnosis step: on CRITICAL, open a GitHub Issue (label `incident`) with the
   trace, the suspected cause, and a proposed fix — **never a commit, never a merge**, and
   flag-don't-apply on anything touching the TUNED files.
4. Only then consider a trigger richer than cron.

**Scope estimate:** Step 1 is minutes. Steps 2–3 are ~half a day on the existing Routine —
no new infra, since the connectors and tables already exist.

**Source:** Ramp agent-engineering brief, evaluated 2026-08-07. Neil approved stamping the
record + parking the item ("Alright go!") in the same session.

---

### 28. Instruction-Stack Prune Loop — a registered cadence, prose-only

> **Brief evaluation record (2026-08-12):** *3 Secret Ways Claude Code's Creator Actually
> Uses It* (Boris Cherny interview, YC channel; evaluated from Nate's structured summary).
> Core thesis: over-specified prompts and skills "hobble" a strong model; switch from
> micromanagement to goal + guardrails + exit criteria + self-verification. Verdict:
> **~85% already absorbed**, two applies, one hard reject.
>
> **What makes this eval unusual — it was measured, not argued.** The same session ran a
> line-by-line audit of everything that loads before the first instruction
> ([`instruction_stack_audit.md`](instruction_stack_audit.md)): 13,494 words / ~18k tokens
> across `CLAUDE.md`, `agent_lessons.md`, 28 skill descriptions, and `NOW.md`, each line
> tagged FACT / GATE / PROC / CONV. **Procedure — the only category "unhobbling" targets —
> is ~7% of the stack**, and half of that is discipline earned by documented repeats. The
> 80%-deletion headline describes scaffolding written for weaker models; this repo's stack
> is 93% environment facts, Neil-set gates, and pointers. Same word "prompt", different
> artifact. The audit's real finding was **~1,500 words of cross-file duplication** and
> ~5,700 tokens of situational detail that should load on demand — none of it a constraint
> on how the model thinks.
>
> **Already absorbed (do not re-import):** "task + guardrails + exit criteria, let it cook"
> is the `/goal` condition template verbatim (`CLAUDE.md:152`); "embed verification systems"
> is 8 wired hooks + Tier 0/0b/0c + `verify-changes` / `gemini-eval` / `brand-check` /
> `render_audit.mjs` / `ad_preflight.mjs` / `resume_doc_check.mjs` / `librarian_sweep.mjs`;
> "devil's advocate sub-agents" is [`pr_review_loop.md`](pr_review_loop.md) (builder ≠
> reviewer) + `straw-man-audit` + the Sol advisory trial; "strip mechanics, keep brand
> assets" is the FACT/GATE-vs-PROC split; "prompting tactics expire" is
> `agent_lessons.md:44`. The brief's own Gaps section concedes it is vague on verification
> mechanics — this repo is the concrete implementation it lacks. **On cadence Grifon is
> already faster than the brief's 6-month advice:** two prunes in ~4 months (the 2026-07-28
> lessons split, the 2026-08-05 NOIR extraction).
>
> **Applied / to apply:** (a) **this item** — the prune exists as a habit but not as a
> registered loop with an arm command, a verifier, and a kill switch, which is the shape
> every other entry in [`loops.md`](loops.md) has. (b) **The dev-vs-knowledge-worker split
> as a lens** — the sharpest idea in the brief, because Grifon is both halves at once: the
> marketing lane (`grifon-cmo`, `grifon-creative-director`, `grifon-ad-strategist`, the
> swipe files, brand tokens) is knowledge-work context the brief itself says to KEEP, while
> orchestration prose is where "let the harness handle it" actually applies. That is a
> better cut line than "delete 80%". (c) **Low-confidence, cheap to test:** emotional
> framing ("QA'd 10x, ready to launch tomorrow") in `code-executor` briefs — measurable
> against the executor ledger's 25% follow-up-fix baseline. **Never in the TUNED prompts.**
>
> **Rejected as conflicts:** (a) 🔴 ***"Every six months delete your `.claude`, delete your
> skills, delete your hooks"* — hard no as written.** The eight hooks here are
> `ad-spend-gate` · `veo-render-gate` · `tuned-file-gate` · `env-warden` ·
> `lock-sync-gate` · `build-gate` · `taglish-guard` · `session-start`. Four stand between an
> agent and Neil's money or secrets, and `agent_lessons.md:88` records the veo gate already
> having a hole that let a real paid call through *with the gate installed*. The brief is
> internally inconsistent here — it says delete hooks AND embed verification, and in this
> repo those are the same objects. Resolve toward keeping them: **prune prose, never gates.**
> (b) *"Let the model cook"* as autonomy — the **fifth** arrival of the eliminate-the-human-
> gate claim (Kun Chen, OpenAI Dev Day, Ramp, Rauch, now this). Standing answer, unchanged:
> in Grifon the prompts **are** the guardrails; removing the prompt removes the gate. Do not
> re-review. (c) *"Messier outputs can be higher quality"* — reject for anything
> user-facing; DESIGN.md, `brand-check`, the NOIR spec and Neil's own *"sakit sa mata"*
> verdict all say formatting IS the product. Fine for internal analysis only. (d) *"More
> skills degrade systems"* — true in general, mis-aimed here: skill **bodies** load on
> demand, so the 28-skill count is not the tax people assume; only ~1,924 words of
> descriptions are always-on, half of them for skills that cannot auto-fire.
>
> ⚠️ **Two caveats worth carrying forward.** (1) **Source quality:** this is a summary of an
> interview, i.e. tertiary, and the 80% figure could not be verified anywhere. Per
> `agent_lessons.md:22` a document is not evidence and copies of one source do not
> corroborate each other — it must not outvote the measurement above. (2) **The recursion:**
> the last Boris Cherny brief evaluated here (2026-05-09) was applied as a lens and produced
> 7 unauthorized copy edits to landing + pricing; that incident is *why* the
> analyze-and-flag-don't-rewrite rule in `agent_lessons.md:9` exists. Applying this brief
> uncritically would use a Cherny brief to delete the rule created by the last Cherny brief.
> Flagged, not resolved — Neil sees the loop.
>
> **Correctness bug found while auditing (fixed 2026-08-12, outside this item):**
> `CLAUDE.md:137-144` was built on a **Max 5x** plan with Fable 5 pinned as the main loop,
> while `NOW.md:43` records the account as **Pro** and Fable as Max-only. Both loaded every
> session, so the model read a routing policy it could not execute. Corrected in place.
> `.claude/settings.json:3` pinned `"model": "claude-fable-5"` — a Max-only model on a Pro
> plan. Raised rather than changed, since the main-loop model is Neil's call, not the
> agent's (`agent_lessons.md:16`); **he instructed the repoint the same day and it now reads
> `claude-opus-5`**, with `tools/hook_gate_test.sh` re-run at 25/25 per the standing rule.

**What:** Register the instruction-stack prune in [`loops.md`](loops.md) as a real loop —
arm command, verifier, kill switch, cadence — instead of the ad-hoc habit it is today.
Scope is **prose only: duplication, situational detail, and narrative justification.** Gates,
hooks, and environment facts are out of scope permanently.

**Why it matters:** ~18k tokens load before Neil types anything, and `CLAUDE.md:144` records
that 80% of historical usage burned above 150k context where reasoning also degrades. Every
always-on token moves a session toward that wall sooner. The prune has fired twice, both
times reactively, after something hurt. A registered loop makes it periodic and *measured* —
delete, run a real task, compare — rather than a blind sweep on a calendar.

**Why parked:** The sample batch is the only focus (Neil, 08-10) and `SAMPLES` is still
empty. The tokens are not hurting today; the empty gallery is. This is workflow-layer polish
on a system that already works.

**When to resume:** After the sample batch ships, or the next time a session visibly degrades
from context pressure — whichever comes first. The delete-list is already written and ranked
in [`instruction_stack_audit.md`](instruction_stack_audit.md), so the resume cost is low.

**Where to start:**
1. Execute audit items 1-7 and 9-11 (mechanical: duplication, the skill catalog that
   duplicates auto-loaded frontmatter, the workflows index, the artifact registry). ~5,700
   tokens, zero gates touched.
2. Items 8 and 12 (ffmpeg/Veo facts to the render skill; thinning generic engineering
   advice) need Neil's eye — they are judgment calls, not sweeps.
3. Add the loop to `loops.md` with the standard four fields. Verifier candidate: a word-count
   ceiling on the always-loaded set, checked by the SessionStart hook the way
   `resume_doc_check.mjs` already checks `NOW.md`.
4. Re-run the tagging pass to measure the delta. A prune with no before/after is a vibe.

**Scope estimate:** ~2h for step 1, most of it verification that nothing referenced the
deleted duplicates. Steps 3-4 ~1h.

**Source:** Boris Cherny "unhobbling" brief (Nate's summary), evaluated 2026-08-12 against a
same-session measurement of the actual stack. Neil approved filing the record and fixing the
Max→Pro block; the prune itself stays parked behind the sample batch.

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
