# Concierge / Director-Brain Plan

**Status:** PLANNING — **RESCOPED 2026-06-29 (see §10 — read it FIRST).** The build
is now scoped + verified; most of §7 is dissolved. **Read this top-to-bottom before
touching code.**
**Last updated:** 2026-06-29
**Branch this lives on:** `claude/video-ads-workflow-fgg2sy` (rescope folded in via
`docs/concierge-rescope`)

> **One-line vision:** Turn Grifon's ad pipeline into two end-user modes —
> **Auto** (hands-off: user drops assets + details, the AI Director decides
> everything) and **Concierge** (user controls the *script* + *editing style*,
> the AI Director optimizes storyboard + edit + execution) — gated to **Business
> tier**, replacing/evolving the current 8-step Expert/Manual wizard.

---

## 0. How to use this doc (for the next agent)

You are resuming a multi-session design conversation. **Do NOT `/compact` to get
context — start fresh and read these two files only:** `CLAUDE.md` (project
rules) + this doc. A fresh agent + this doc = full quality. A compacted agent =
degraded. That's the whole point of writing this down.

This doc is **the source of truth** for the Concierge/Director-brain initiative.
It captures: the vision, the *architecture truth* (critical — read §2), the
*current state of the code* with evidence (§3), the Concierge-vs-Expert decision
(§4), the **prioritized build order** (§5), the end-to-end PoC (§6), the open
decisions to settle via `grill-me` (§7), and guardrails (§8). §9 is a
paste-ready kickoff message.

**Nothing here greenlights editing a TUNED prompt** (`services/geminiService.ts`,
`api/_lib/prompts.ts`). Those stay locked — escalate to Neil. See §8.

---

## 1. The vision — two modes

Replace the current Expert/Manual surface with two tiers of control:

- **Auto mode (recommended default).** User provides: assets, niche, product
  details, character (upload OR auto-cast), settings (aspect ratio, quality,
  image model). Everything else — script pattern, storyboard sequence, editing
  style — is chosen automatically by the AI Director based on the product +
  market-research result. Fully hands-off after confirm.

- **Concierge mode (Business tier, locked).** Same inputs, but the user keeps
  control over the **script** (pick a pattern from our formula, OR paste their
  own script written to our standard) and the **editing style** (Auto
  recommended, or pick from options). The AI Director optimizes the storyboard
  sequence and edit decisions *for* them. "Let the Director AI listen to you —
  you're the director, it optimizes."

- **Image model picker** in both modes: `gemini-3.1-flash-image-preview`
  (current `sceneImageModel`) vs `gpt-image-2` (the `codex-image` skill path).
  Both providers already exist in the codebase.

**Script standard** (for the Concierge paste-your-own validator): the real
encoded rule is NOT a hard "30s / 8–12 words" constant. It's a *pacing
heuristic* in `suggestDurationForScript` (services/geminiService.ts): **~2.5
words/sec for Taglish + 0.8s opening/closing buffer, snap UP to nearest valid
duration.** ~8–12 words/scene lands ≈ 3–5s/scene, which is the right ballpark.
The validator should check **per-scene pacing**, not a raw word count. (The 0.8s
buffer was deliberately restored after a tighter 0.3s buffer truncated real
Taglish scripts mid-syllable — "dead air is trimmable, truncation is not.")

---

## 2. Architecture truth — READ THIS (the "tatawagin ka" reality)

**The production app CANNOT call the Claude Code terminal agent.** The agent Neil
talks to in VS Code / web is bound to his dev session. A real end-user clicking a
button in the deployed app cannot summon that terminal. So "the AI does
everything for you" in production = one of three things:

| Option | What it really is | Scalable? | Cost |
|---|---|---|---|
| **A. Server-side Claude API** | New `api/director/run.ts` calls a Claude model (Opus/Sonnet) via the Anthropic API as the "Director brain." **This is the real, productized "you."** | ✅ Yes, automatic | Per-run Claude API $ |
| **B. Beef up the Gemini agent** | Make the existing Gemini flow more agentic (already in the stack) | ✅ Yes | Cheaper (Gemini) |
| **C. Literal human concierge** | Neil (+ Claude Code behind him) fulfills Business orders by hand | ❌ No | Neil's time |

**Recommendation: A** for the automated product (optionally B for cost on the
cheaper reasoning bits). C is a valid manual MVP / white-glove fallback to
validate demand before building A.

### MCP-ready flow layer (do this once, reuse everywhere)
Build Grifon's flows as a **clean callable tool layer** over `api/*`
(`grifon_generate_script`, `grifon_storyboard`, `grifon_render_ad`,
`grifon_caption`). Then:
- The in-app **Director brain** (Auto/Concierge) calls these tools.
- A future **Grifon MCP server** exposes the *same* tools to external agents
  (Claude Desktop, Cursor, agencies, and Claude Code itself — which is the
  cleanest way to power Concierge fulfillment without fragile Playwright UI
  driving).
- One backend, many heads. **Architect MCP-ready, but do NOT lead with MCP** —
  our market (Filipino SMBs) does not live in MCP clients. MCP is a
  power-user/agency/internal channel, not the consumer surface.

### Higgsfield MCP — not a competitor, a possible backend
Higgsfield MCP (launched 2026-04-28) exposes 30+ raw generation models (Soul,
Kling, Veo, Sora, Seedance...) as MCP tools: generate image/video, train
character, async job polling, ≤15s video, ≤4K image. **It is a generation
*primitive* layer — it has NO formula/judgment.** Grifon's IP is the *director
layer* (tuned prompts, MarketMind, script/storyboard/edit doctrine, Swipe File,
Taglish SMB direction). Different layers: **Higgsfield = engine, Grifon =
director.** Grifon could even *consume* Higgsfield as another video provider
(like Veo/Kling). Refs: higgsfield.ai/mcp, mcp.directory/blog/higgsfield-mcp-guide.

---

## 3. Current state of the code (evidence-bound)

There are **two separate systems** today:

### System A — Intelligence loop (CLI/agent skills, connected)
`ad-recon` (`.claude/skills/ad-recon/`, `tools/find_winning_ads.py`) → explicit
hand-off → `viral-autopsy` (`.claude/skills/viral-autopsy/`,
`tools/analyze_video.py`) → writes `workflows/viral_swipe_file.md` (decoded
competitor patterns; 226 lines, real). **Gated, human-reviewed.** No automatic
feed into the production pipeline — insights are carried by hand into a brief.

### System B — Production pipeline (web app, connected)
Market Research → One-Shot / 8-step Director → **GenerateVideo**
(`components/GenerateVideo/`) → **EditVideo** (`components/EditVideo.tsx`, EDL
brain + final render) → final MP4. Optional **SignalModulator** detour for
voice/TTS. `App.tsx` wires the hand-offs (`onSendToAiEditor`,
`onSendToSignalModulator`). **CaptionHeadline** (`components/CaptionHeadline.tsx`)
is a standalone module — pulls market research from localStorage; does NOT
auto-consume the rendered video.

### The two manual bridges (the real friction)
1. **autopsy → brief** — Swipe File insights are copy/pasted into a One-Shot /
   wizard brief by hand.
2. **final video → CaptionHeadline** — run separately after the video exists.

These two bridges are exactly what the end-to-end PoC (§6) will *measure*.

### Script formulas — ALREADY EXIST (do not rebuild)
Step 2 (`components/Step2BusinessInfo.tsx`) formula picker:
**MrBeast/Viral, Testimonial, Services, RealEstate, Custom, Cinematic.**
Server prompts (`api/_lib/prompts.ts`): `buildAdScriptPrompt` =
**Temu / Testimonial / MrBeast variants + a classifier.** So MrBeast,
Testimonial, and Temu are **built**. Adding new styles is **premature** until the
existing library is proven to convert (via `gemini-eval`). **Current formula is
sufficient for customization for now.**

### Current Expert/Manual mode = manual cockpit (control map)
8-step Director wizard; user manually drives + can override each stage:
- **Step 1** ClientDetails — brand + offer (auto-prefill w/ override).
- **Step 2** BusinessInfo — **script formula picker**, aspect ratio (9:16/16:9),
  6 business fields, hero-first product/service photo upload, **custom script
  paste/upload**.
- **Step 3** AdScript — language (EN/Taglish), optional MarketMind angle, **pick
  1 of 2 hooks (required)**, **fully editable script text**, regenerate.
- **Step 4** Avatar — generate by gender/ethnicity/age OR upload; regenerate.
- **Step 5** Storyboard — generate all / **per-scene regenerate** / **manual
  per-scene image upload** / re-map narrative. (Scene descriptions read-only.)
- **Step 6A** Thumbnail — generate/regenerate (no inline edit).
- **Step 6B** VideoPrompts — regenerate set / download (no per-prompt edit).
- **Step 7** FinalOutput — review tabs, export ZIP, hand-off to GenerateVideo.

### One-Shot = single-brief auto-run
`components/OneShotAd/` + `LaunchScreen.tsx`: one page collects brand/offer/price,
assets, presenter (AUTO default or upload), format (UGC / Product UGC /
Commercial), strategy (Real-talk vs Hype), settings modal (aspect ratio, quality
— 1080p locked to Business, language, voice picker). Then runs the full chain
automatically (`RunningScreen.tsx`) → routes to Step 7 for review. **No per-step
control during the run.**

---

## 4. Concierge vs current Expert — NOT the same; evolve, don't twin

They **overlap on script control** but differ on the fundamental axis: **who
optimizes the storyboard + editing.**
- **Expert** = the *user* drives it manually (per-scene regen, manual asset
  upload, step-by-step). No agentic optimizer.
- **Concierge** = the *Director brain* optimizes it automatically from the
  user's script + style choice.

Concierge sits **between** One-Shot (full auto) and Expert (full manual).

> **External validation (2026-07-16, OpenAI "Golden Age of AI Engineering" brief evaluation — record
> in `post_beta_roadmap.md` item #2):** OpenAI's stated optimal product shape for human-AI
> collaboration is exactly this spectrum — a **chat/auto entity** for hands-off requests plus a
> **hands-on collaborative UI** to inspect and steer when the user wants the weeds. Mapping: One-Shot
> ≈ the auto entity today; **Concierge = the hands-on collaborative UI** (Script Studio + per-scene
> `ShotIntent` sequence picker + advanced-override drawer); the deferred AUTO mode ≈ the chat-first
> future. Vocabulary/positioning support only — changes nothing in the §10 rescope or build order,
> and does NOT unpark the AUTO Director brain.

**The one capability Expert has that Concierge-as-described lacks:** granular
**per-scene override** (edit hook text inline, upload a custom image to Scene 3,
regenerate one scene).

**Decision (recommended, pending Neil): evolve Expert → Concierge.** Keep script
control, add the editing-style picker, replace the manual storyboard/thumbnail/
prompt clicking with Director-brain optimization, and **preserve per-scene
override as an optional "Advanced override" drawer** inside Concierge. Then
retire standalone Expert — no capability lost. **OPEN:** keep the override drawer
or drop it entirely (full hands-off Business tier)? → §7.

---

## 5. PRIORITIZED BUILD ORDER (the answer to "anong uunahin")

```
1. Phase 0→6 end-to-end PoC (1-scene, real keys)   ← FIRST. De-risk the foundation.
2. gemini-eval grade the output + fix what breaks  ← validate the EXISTING formula
3. grill-me → Concierge PRD                         ← settle §7 open decisions
4. Build Concierge (+ editing-preset picker inside) ← the big bet
```

**Why PoC first:** You cannot build the Director brain on a pipeline you haven't
proven end-to-end. The PoC reveals where the real friction is (esp. the two
bridges in §3). One real run > weeks of planning. **Cap to a 1-scene mini-ad** to
keep cost to coins before any full multi-scene render.

**Do NOT:** add new scripting styles (they exist — §3); build editing presets
standalone (they're a *component* of Concierge — §1).

---

## 6. The PoC — "One Competitor → One Posted Ad" (Phase 0→6)

🟢 = agent can do solo · 🟡 = needs keys/quota/app + a Neil checkpoint

- **Phase 0 — Setup (Neil, once):** `.env` has `GEMINI_API_KEY`,
  `ELEVEN_LABS_API_KEY`, Supabase keys; `npm run dev` running; pick a competitor
  brand (FB page) + niche.
- **Phase 1 — Ad Recon 🟢:** `find_winning_ads.py` → ranked shortlist of ads
  ≥30 days active. **Checkpoint A:** Neil picks one ad to autopsy.
- **Phase 2 — Viral Autopsy 🟢:** `analyze_video.py` (Gemini watches it) → hook
  anatomy / Edit DNA / format → `viral_swipe_file.md`. Output: 3 hooks/angles.
- **Phase 3 — Bridge #1 🟡:** build the One-Shot brief from autopsy findings +
  Neil's brand/offer. **Checkpoint B:** confirm brief (offer is Neil's, not the
  competitor's).
- **Phase 4 — Generate 🟡:** One-Shot/Director → script → storyboard → thumbnail
  → video prompts (Grifon-authored) → GenerateVideo render. **Biggest cost
  here.** Cap to **1 scene** first. **Checkpoint C:** OK before full render.
- **Phase 5 — Edit 🟡:** Send to AI Editor → EDL brain → final render → MP4.
  (Optional SignalModulator for voice.)
- **Phase 6 — Bridge #2 + Caption 🟡:** run CaptionHeadline → captions +
  headline (Taglish) aligned to the winning angle.

**Deliverable:** final MP4 + caption/headline + a Swipe File entry. **The real
output is also a map of where the two bridges hurt** — that informs what to
automate in Concierge.

---

## 7. Open decisions — settle via `grill-me` before building Concierge

1. **Director brain: Option A (server-side Claude API) vs B (beefed-up Gemini)?**
   Cost vs reasoning quality. (Could be hybrid: Claude for direction, Gemini for
   bulk generation.)
2. **Per-scene override drawer: preserve it in Concierge, or drop entirely**
   (full hands-off Business tier)? Decides whether any old Expert code survives.
3. **Editing-style options:** what's the actual menu? (Needs a pass over what the
   EDL brain / `LockablePresetId` in EditVideo already supports.)
4. **Business-tier pricing:** there's a new recurring opex (per-run Director-brain
   API cost). What price/credit model covers it?
5. **Replace vs demote Expert:** retire the standalone manual wizard, or keep it
   on a lower tier as a fallback?
6. **Auto-bridge scope:** does Concierge auto-run CaptionHeadline at the end
   (close Bridge #2)? Does it auto-inject autopsy hooks (close Bridge #1)?
7. **Persona identity for the Director brain.** Per the module-naming decision
   (2026-07-03, plan `is-changing-my-module-deep-swan`): modules KEEP their
   place/unit codenames (Recon, War Room, Render Bay…) — the "AI employee"
   metaphor's endorsed home is HERE, as a named persona/character for Director AI
   + Concierge (the agentic modes are already persona-shaped), plus marketing-layer
   "your AI studio crew" copy via `grifon-cmo`. Settle the persona's name/character
   via `grill-me` + `grifon-cmo` when this work resumes — do NOT rename modules
   to job titles instead.

---

## 8. Guardrails / what not to forget

- **gemini-eval gate.** A test run proves nothing without grading whether the
  output is convert-grade. Always grade Phase 4–6 output with `gemini-eval`.
- **Cost cap.** Full renders cost real money (Veo/Kling/ElevenLabs + Claude API).
  1-scene first, always.
- **TUNED-file guardrail.** Do NOT edit prompt/schema/model content in
  `services/geminiService.ts` or `api/_lib/prompts.ts` without explicit Neil
  approval. Applying the formula = fine; editing it = escalate. (CLAUDE.md +
  `surgical-edit` skill.)
- **The two manual bridges** (§3) are the metric the PoC exists to measure — don't
  paper over them.
- **`/goal` + build-gate.** Any code touching `api/`, `services/`, `components/`,
  `App.tsx` must cite the build-gate Stop hook's pass message. Plan→Goal pipeline
  in CLAUDE.md applies.
- **Smoke tests → `smoke-tester` subagent only** (foreground). Never drive
  Playwright in the main conversation.

---

## 9. Paste-ready kickoff message for the next agent

> Read `CLAUDE.md` and `workflows/concierge_director_plan.md` in full before doing
> anything — do not `/compact`, start fresh. We're resuming the Concierge /
> Director-brain initiative. I'm on the cafe PC with `.env` keys and want to start
> with **Step 1 of the build order: the Phase 0→6 end-to-end PoC, capped to a
> 1-scene mini-ad**, to de-risk the pipeline before building Concierge. Confirm
> you've read the plan, tell me the 3 checkpoints where you'll need me, then walk
> me through Phase 0 setup (what to put in `.env`, `npm run dev`) and ask me for a
> competitor brand + niche to recon. Do not edit any TUNED prompt. Delegate any
> smoke test to the `smoke-tester` subagent.

---

# 10. RESCOPE (2026-06-29) — "You direct, the engine executes" · verified, NOT a new AI brain

> Supersedes the scary framing of §1–§2 for the **Concierge** half. Neil's 2026-06-29
> realization + a code-verified scoping pass. **Read this before §1–§9 when working
> Concierge.** The **AUTO** half of the vision is unchanged and **deferred**.

## The reframe that kills the "this is hard/long" fear

Neil's fear came from conflating **two different "AI Directors"**:

| | **AUTO mode** | **Concierge mode (what Neil wants)** |
|---|---|---|
| Who directs? | AI decides script + sequence + angles | **The user** — they bring the script + sequence |
| Needs the server-side Claude "Director brain" (§7 #1, §2 Option A)? | **YES** (expensive, slow, uncertain) | **NO — the user IS the brain** |

The hard/expensive Director brain belongs to **AUTO**. **Concierge does not need it** →
deletes ~80% of the perceived difficulty. **Defer AUTO; ship Concierge** as an evolution
of the **already-built Expert mode** (branch `feat/expert-mode-directors-cut`).

## Verdict: BUILD it. Concierge = Expert mode, productized for Business tier.

## The 3 "hard parts" — VERIFIED already built, ZERO tuned-prompt edits needed

1. **Formula-free storyboard + strict 1:1 line→scene mapping — DONE.**
   `generateStoryboard(script: string[], …)` (`services/geminiService.ts:1880`) is
   format-agnostic — raw lines as-is, `businessInfo` near-empty OK, `scriptType`
   guidance-only (`api/_lib/prompts.ts:867-1166`); blank persuasion fields tolerated.
   The prompt doesn't mechanically enforce 1:1, **but we never touch the tuned prompt** —
   the Expert branch already guarantees it client-side via the **non-tuned**
   `reconcileSceneCount(scenes, lines)` (`hooks/useExpertGeneration.ts`), forcing exactly
   N scenes = lines in order.
2. **Auto-assemble + dead-air trim + preset-at-end — DONE.** `EditVideo.tsx`
   `handleRenderFinal` → `renderFinalVideo()` = server-side trim + voice-mux + concat in
   one job (`components/EditVideo.tsx:206-289`); dead-air trim is automatic + deterministic
   (`api/_lib/renderFfmpeg.ts:394`, forced-alignment VO end, never mid-word). **Preset is
   ALREADY chosen at the END** (GenerateVideo post-render: AUTO + IMPACT/HYPE/CLEAN,
   `components/GenerateVideo/index.tsx:1757`) → answers the end-vs-upfront question: **end,
   AUTO default, already there.**
3. **Business-tier gate — reusable.** `MODULE_TIER` + `planAtLeast` + `<PlanGate requires>`
   (`components/Dashboard.tsx:85`, `hooks/useSubscription.ts`); `cinematic_studio: 'business'`
   is the copy-paste precedent; `grifon_dev_unlock` bypass for testing.

**Per-scene sequence control also already exists** (Expert branch): `ShotIntent` =
`'auto' | 'talking-avatar' | 'b-roll' | 'product-highlight' | 'avatar-product'` per scene,
enforced non-tuned via `applyShotIntents` + `overrideVideoPromptTypes`.

## The delta Concierge actually needs (small, all non-tuned)

1. **Drop the script-format card** → free-form paste (one box/scene, add/remove), keep only
   the soft pacing meter (`estimateSpokenSec`) + total-vs-duration budget. Pass
   `scriptType: 'Custom'`.
2. **Promote the per-scene `ShotIntent` picker to first-class** ("you set the sequence").
3. **Business gate + entry door** (`concierge_mode` tile, `MODULE_TIER` `business`,
   `<PlanGate>` in App.tsx). One-Shot stays the beginner door; standalone Expert **retires
   into** Concierge (no capability lost — §4).

Everything downstream (storyboard, render/consistency moat, thumbnail, video prompts,
auto-assemble, dead-air trim, preset-at-end) is **reused unchanged.**

## Build slices (vertical, each build-gated + brand-checked)

0. **Land the Expert branch foundation** (merge-vs-evolve — see Open Decisions; HELD Bucket B
   stays gated). 1. Concierge door + Business gate. 2. Free-form Script Studio. 3. Sequence
   picker first-class. 4. Route through GenerateVideo → EditVideo (reused), retire standalone Expert.

## Open decisions still gating the build (the §7 survivors)

Rescope dissolves most of §7 (no Director brain; Expert→Concierge; override drawer kept as
optional "advanced"). Remaining:
- **Slice-0 merge-vs-evolve** of `feat/expert-mode-directors-cut`, **and** whether the HELD
  tuned Bucket B (+ open **Scene-6 avatar-composite** issue + pending **auto-cast test**) ships
  first or stays parked. This is the literal first gate — Concierge slices can't start on `main`
  until the Expert branch is landed.
- **Uploaded-presenter image model.** The Scene-6 composite defect hits Concierge too; the PoC
  found **gpt-image-2 edit-mode relights uploads cleanly**. Decide: default uploads to gpt-image-2,
  and/or make auto-cast the Concierge default. **Ties into the pending auto-cast vs upload test.**
- **Business-tier pricing** line (no new per-run opex now that the Claude brain is deferred).

## Tracking pilot: GitHub Issues as the initiative map (decided 2026-07-08)

When this work resumes, pilot **GitHub Issues** as the cross-session tracker for THIS initiative
only (adapted from Matt Pocock's `wayfinder` skill — evaluation in the 2026-07-08 skills-v1.1
session). Why: Issues survive the defreezer exactly like the repo does, remote sessions already
have GitHub MCP, the nightly regression already files Issues, and issues-as-external-memory
attacks the `agent_lessons.md` 2026-06-27 failure (stale planning doc said "not built" 3×) —
an Issue closed with a decision can't silently drift the way a doc section can.

Shape:
- **One map issue** (label `concierge:map`): Destination (the §10 verdict line) / Decisions so
  far (one line per closed child) / Not yet specified / Out of scope. The map is an index —
  detail lives in the child issues.
- **One child issue per open decision** above (Slice-0 merge-vs-evolve, uploaded-presenter
  image model, Business-tier pricing) and per build slice, with "Blocked by" stated in the body
  (slices 1–4 blocked by Slice 0).
- **One ticket per session**, resolved via the matching skill (`grill-me` for decisions, the
  Plan→Goal pipeline for slices); post the outcome, close, update the map's Decisions-so-far.

Deliberate adaptations: no claim-by-assignment ceremony (single operator), and
`launch_readiness.md` stays the global scoreboard — it *links* to the map issue rather than
duplicating it. This doc remains the source of truth for design; Issues track *state*.

## Verification (when built)

Dev-unlock + `GRIFON_DEV_UNMETERED=true`(+`_VIDEO`) + test acct `smoketest-dc@grifon.dev` /
`GrifonDcSmoke!2026`, via the `smoke-tester` subagent (foreground): enter Concierge (Business gate
/ dev-bypass) → paste custom multi-scene script (soft meter, no format card) → set per-scene
sequence → generate → 1:1 holds → Render All → pick preset at end → EditVideo auto-assembles one
dead-air-trimmed MP4. Build-gate pass + brand-check + **Neil eyeballs the renders himself**
(Scene-6 lesson — don't trust the subagent's prose verdict). **No tuned edits anywhere;** any
`geminiService.ts` / `prompts.ts` / `renderPresets.ts` change = escalate to Neil.

> **§10 OPEN-DECISION UPDATE (2026-07-21, PoC V4 — see `concierge_poc_findings.md`):**
> The pending **auto-cast vs upload test RAN and is ANSWERED.** Neil verdict: auto-cast
> (no reference) is MORE believable in motion than reference-anchored, on BOTH gpt-image-2
> and the tuned gemini flash-lite lane; raw-multi-ref anchoring (Marvin-grade) is the only
> acceptable upload path, polished single-ref (old Zam ref) is a believability trap.
> Product direction: **auto-cast stays/becomes the default presenter lane; presenter upload
> is the Business-tier consistency lane gated on a raw multi-angle ref set** (onboarding SOP
> candidate). Validated motion recipe: Veo 3.1 Lite + close-up + expression lock + locked
> camera hand.
