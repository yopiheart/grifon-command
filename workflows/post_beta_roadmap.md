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

### 1. Nightly Regression `/loop` — dev velocity

> **Primitive mapping (2026-05-15):** This is the textbook [`/loop`](https://code.claude.com/docs/en/scheduled-tasks#run-a-prompt-repeatedly-with-%2Floop) use case (time-driven). The per-run verification step inside the loop is a [`/goal`](https://code.claude.com/docs/en/goal) — e.g., `/goal "all 12 modules produce baseline-matching outputs against .golden/, OR stop after 20 turns"`. When you unpark this, see the "Goal-driven execution" section in `CLAUDE.md` for the condition template and TUNED-file guardrails.

> **Headless fan-out option (2026-06-04, from the CC best-practices doc):** The runner body can also be non-interactive [`claude -p`](https://code.claude.com/docs/en/headless) instead of (or inside) a `/loop` — e.g. loop the 12 modules with `claude -p "regress module $m against .golden/$m.json. Return PASS or FAIL." --allowedTools "Read,Bash(npx vitest run:*)" --output-format json` and pipe the JSON to the failure channel. Same fan-out pattern applies to one-off batch jobs (e.g. the deferred conversion items): generate a file list, then loop `claude -p` per item with `--allowedTools` scoped tight. Test on 2–3 items, refine the prompt, then run at scale. This is the headless analogue of the `/loop`+`/goal` design above — pick whichever the chosen host supports (a VPS/GitHub-Actions cron can run `claude -p`; the in-IDE `/loop` cannot survive the cafe-PC defreezer).

> **Generator-Evaluator architecture (2026-05-20 brief):** Per the NotebookLM brief *Build Agents That Run for Hours* (Prabaker & Wilson, Anthropic) — when this loop is built, the per-module check must be a *separate harsh evaluator sub-agent*, not the runner grading its own output (a builder cannot reliably self-critique). Store the `.golden/` baseline as **JSON**: it is machine-diffed, not human-read, and the brief notes models overwrite Markdown more readily than JSON — so JSON fits *here*, even though the handoff docs deliberately stay Markdown. Flow: runner generates → fresh `general-purpose` evaluator sub-agent diffs the output against `.golden/*.json` → returns pass/fail → failures post to the output channel. The evaluator pattern is the same one now in `.claude/skills/{brand-check,gemini-eval}/SKILL.md` ("Run as a separate critic").

**What:** A Claude Code `/loop` (or an always-on VPS cron equivalent) that runs golden-path inputs through each of the 12 modules every night, captures outputs, diffs against last-known-good, and posts failures to a single channel (GitHub Issue, Discord webhook, or email).

**Why it matters:** Solo dev + 12 modules + tuned prompts that regress silently when Gemini ships model updates = a guaranteed Friday-night fire. The `/loop` converts that fragility from "I find out when a beta user complains" to "I see a diff in the morning."

**Why parked:** Beta + Bukidnon Brew regression + wizard state persistence (`launch_readiness.md` P0s) come first. Nothing about this loop helps the first 5–10 owners. It's leverage that pays off when there are *more* users + *more* releases.

**When to resume:** When beta is live AND Neil has shipped his second post-beta change without manual regression. The trigger is "I'm scared to ship without re-testing all 12 modules by hand" — that's the moment this loop pays for itself.

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
