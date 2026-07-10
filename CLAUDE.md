# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# App Overview

**GRIFON COMMAND** is a multi-module AI marketing platform built with React + Vite + TypeScript + Tailwind CSS. It guides users through creating video ad scripts, storyboards, avatars, and visual concepts. Generative features span three AI providers, all proxied through `api/*` handlers: **Gemini** (text/image/video) via `services/geminiService.ts` + `api/gemini/*`, **Kling** (alternate video provider) via `api/kling/*`, and **ElevenLabs** (voice) via `services/voiceService.ts` + `api/elevenlabs/*`.

## Dev Commands

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server (also serves api/* via middleware bridge)
npm run build        # tsc type-check + Vite production build
npm run preview      # preview production build locally
npm run test         # vitest, one-shot (CI mode)
npm run test:watch   # vitest, watch mode
npm run design:lint  # lint DESIGN.md tokens (also: design:tailwind, design:spec)
```

Tests use **vitest** (no Jest/Playwright). The live Gemini regression test
([tests/regression/script-gen.regression.test.ts](tests/regression/script-gen.regression.test.ts))
is skipped by default to avoid burning quota — opt in with `RUN_REGRESSION=1`
(PowerShell: `$env:RUN_REGRESSION='1'; npx vitest run tests/regression/...`). Test
patterns and the mandatory `.js`-extension import rule for ESM live in
[tests/CLAUDE.md](tests/CLAUDE.md). The `design:*` scripts are the `@google/design.md`
token tooling that backs [DESIGN.md](DESIGN.md).

`npm run dev` serves `api/*.ts` handlers locally through a Vite middleware (`vercelApiDevPlugin` in [vite.config.ts](vite.config.ts)) so the Gemini proxy works in dev exactly as it does on Vercel. The plugin reads all `.env` keys (no prefix filter) into `process.env` so server handlers see the unprefixed secrets below.

Environment variables (required in `.env`):

Client-side (`VITE_`-prefixed, bundled into the browser):
- `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` — auth + database
- `VITE_PAYMONGO_PUBLIC_KEY` — billing (Philippines)

Server-side (no prefix, read by `api/*` handlers in dev and on Vercel):
- `GEMINI_API_KEY` — required by [api/gemini/text.ts](api/gemini/text.ts) and [api/gemini/image.ts](api/gemini/image.ts). Without it the proxy throws `GEMINI_NOT_CONFIGURED`.
- `ELEVEN_LABS_API_KEY` — required by [api/elevenlabs/text-to-speech.ts](api/elevenlabs/text-to-speech.ts), [api/elevenlabs/speech-to-speech.ts](api/elevenlabs/speech-to-speech.ts), [api/elevenlabs/voices.ts](api/elevenlabs/voices.ts). Without it the proxy throws `ELEVEN_LABS_NOT_CONFIGURED`.
- `GRIFON_VOICE_CLONING_ENABLED` — `'true'` opens the voice-cloning POST/DELETE branches in [api/elevenlabs/voices.ts](api/elevenlabs/voices.ts). Anything else returns 503 on POST. Stays off until ElevenLabs is on Starter+.
- `SUPABASE_SERVICE_ROLE_KEY` — used by [api/_lib/supabaseAdmin.ts](api/_lib/supabaseAdmin.ts) for token verification and rate-limit RPCs.

## Working Environment

Sessions run on rented cafe PCs with a defreezer that wipes `C:\Users\Administrator\` (including `~/.claude/` and `~/.claude.json`) on reboot. **Only the GitHub repo persists across sessions.** Practical implications:

- "Save this for later" almost always means commit + push, not write to `~/.claude/` or any local path. Commit early and often — uncommitted work dies with the reboot.
- **Built work often lives on an unmerged remote branch, not `main` — check before concluding "not built."** The defreezer wipes *local* branches, so only `main` + `origin/*` survive: a feature can be fully built, tested, and integrated-with-main on a pushed `feat/*` branch while `main`'s working tree shows no code and its planning doc still reads "not started." **Before declaring any feature unbuilt / not-started / missing, run `git branch -a`, `git log --all --grep=<feature>`, and `git diff --name-only origin/main...origin/<branch>` — never trust `main` + a workflow doc alone** (a stale planning doc does NOT outvote a branch). The SessionStart hook lists every remote branch ahead of `main` ("UNMERGED WORK IN FLIGHT") for exactly this reason. This mistake recurred 3× on Expert Mode / Director's Cut — see [agent_lessons.md](agent_lessons.md) 2026-06-27.
- Project-level [.claude/settings.json](.claude/settings.json) and [.claude/skills/](.claude/skills/) survive in the repo; user-global `~/.claude/` config does not.
- For external state that genuinely must live outside the repo (MCP server registrations in `~/.claude.json`, auth tokens, etc.), commit a restore script under [scripts/](scripts/) — see [scripts/restore-notebooklm.ps1](scripts/restore-notebooklm.ps1) as the established idempotent pattern.
- The auto-memory system at `~/.claude/projects/.../memory/` is itself ephemeral on this machine. Treat it as within-session memory only; durable cross-session knowledge belongs in this file or [agent_lessons.md](agent_lessons.md).

## Shared Vocabulary & Skills

Before any planning conversation, large refactor, or new module spec, load:

- **[UBIQUITOUS_LANGUAGE.md](UBIQUITOUS_LANGUAGE.md)** — the canonical glossary for Grifon's domain. Use these terms verbatim in code, prompts, UI copy, and planning. Notable disambiguations: **Avatar** (wizard) vs **Influencer** (Influencer Forge); wizard **Script** vs **Influencer Script**; wizard **Storyboard** vs **Cinematic Relay**.
- **[agent_lessons.md](agent_lessons.md)** — living log of mistakes and lessons. Read at session start; add entries when something goes sideways. Behavioral rules go *here*, not in this file.
- **`.claude/skills/grill-me/`** — invoke before writing any non-trivial PRD or refactor plan. Forces interview-style alignment so the AI doesn't outrun its headlights.
- **`.claude/skills/ubiquitous-language/`** — re-run when domain concepts shift or new modules are added; updates `UBIQUITOUS_LANGUAGE.md` in place.
- **`.claude/skills/verify-changes/`** — run the verification loop (build, test, smoke) after any edit to `api/`, `services/`, `components/`, or `App.tsx`, and before reporting a task as complete.
- **`.claude/skills/surgical-edit/`** — invoke before any edit. Match the scope of the change to the scope of the request. Hard rules for `services/geminiService.ts` and `api/_lib/` live here.
- **`.claude/skills/director-smoke/`** — **MANDATORY before driving the Director AI wizard end-to-end as a smoke/manual test** (or generating a full N-scene ad to exercise downstream pipelines like Signal Modulator / AI Editor / FINAL_RENDER). Enforces hero-image-FIRST, Market Research before Director, and **never manually typing brand/offer fields** (they must auto-prefill from Market Research). Do NOT click "Start with Director" for a test without loading it first.
- **`.claude/skills/viral-autopsy/`** — invoke when Neil drops a social video/ad (URL or file) to analyze why it works. Runs `tools/analyze_video.py` (Gemini watches the video), appends an evidence-bound entry to `workflows/viral_swipe_file.md`, and optionally remixes findings via `grifon-cmo`. Never edits tuned prompts — proposals are gated behind ≥3 corroborating videos.
- **`.claude/skills/grifon-ad-strategist/`** — the senior paid-ads media buyer. Runs/optimizes Meta ads via the **Meta Ads CLI** (`pip install meta-ads`) and TikTok by hand, to 2026 Andromeda best practice. **Never spends autonomously** — reads insights freely but drafts every spend command for Neil to fire. Logs every campaign to `workflows/ad_performance_ledger.md` (≥3-corroboration gate, same pattern as the Swipe File) so it learns over time. Pairs with `grifon-cmo` (offers/hooks) and `grifon-creative-director` (creatives).
- **`.claude/skills/ai-editor/`** — the Omni Flash + FFmpeg editing lab and preset foundry. Invoke when Neil wants a Grifon marketing video edited, an editing preset tested/validated, or drops a viral video to COPY as an editing style. Preset registry + verbatim source workflows: `workflows/omni_edit_presets.md`; tool: `tools/omni_edit.py`. Paid calls ~$0.10/sec, all gated (`--dry-run` approval → `--yes` → `--budget`). Never edits TUNED files; product-shipping goes through Gated Proposals. NOT viral-autopsy (pattern analysis) and NOT the product's AI Editor screen.

**User-invoked skills (summon by name — `disable-model-invocation: true`, they will NOT auto-fire):** `grill-me`, `ubiquitous-language`, `viral-autopsy`, `ad-recon`, `growth-debrief`, `retargeting-briefs`, `ai-editor`, `fable-mode`. These are deliberate, on-demand tools, so they're kept off model-invocation to cut passive context load and remove mis-fire risk — invoke them explicitly (`/grill-me`, `/viral-autopsy`, etc.) when you want them.

All smoke tests must be delegated to the `smoke-tester` subagent (defined in [.claude/agents/smoke-tester.md](.claude/agents/smoke-tester.md)).

If a planning conversation introduces a new domain concept not in `UBIQUITOUS_LANGUAGE.md`, propose adding it before writing code.

## Context Hygiene

LLM reasoning degrades sharply past ~100k tokens of context. Treat the conversation window as a budget.

- **Prefer `/clear` over `/compact`** when the current thread has wandered. Compaction keeps the model in a degraded state; clearing returns it to a fresh, smart baseline.
- **Use `/btw` for throwaway side questions** — the answer lands in a dismissible overlay and never enters conversation history, so a quick check doesn't spend the context budget.
- **The Ralph Loop destination doc** is `workflows/launch_readiness.md`. When you `/clear`, that file plus this `CLAUDE.md` and `UBIQUITOUS_LANGUAGE.md` are enough to resume work — no need to re-explain context.
- **After exploring `services/geminiService.ts`** (91 KB), the smart zone is largely consumed. Finish the current task or summarize findings to a workflow file *before* taking on a second large exploration in the same session.
- **Never drive playwright MCP tools in the main conversation.** Every browser session (smoke tests, brand-check screenshots, manual verification) is delegated to the `smoke-tester` subagent, spawned in the **foreground** (background agents auto-deny permission prompts — see agent_lessons 2026-06-10). Page snapshots are 10–50k tokens each and stay in context for the rest of the session; inside a subagent they die with it and only findings return. Playwright results were 50% of Neil's plan usage as of 2026-06.
- **Usage budget (Max 5x) — quality first, per Neil 2026-06-12; per-role model allocation, per Neil 2026-07-01.** Fable 5 is included in plan limits (up to 50% of weekly) **until Jul 13, 2026 2:59 PM PHT** (confirmed 2026-07-10 — the Jul 7 "credits depleted" re-pin to Opus was premature and has been reverted). After that sunset — or earlier if `/usage` shows the Fable allowance at 100% — **Opus 4.8** takes the main loop. The handover is automated (SessionStart-hook pin flip + a run-once flip-PR Routine); the early-exhaustion case is manual — see the Fable-sunset section in `workflows/session_reminders.md`. Models are allocated per role:
  - **Fable 5** (`claude-fable-5`, pinned in `.claude/settings.json`) — the main loop: planning, orchestration, verification/review of executor diffs — until the Jul 13 sunset, then **Opus 4.8**. While the main loop runs on Opus/Sonnet, `/fable-mode` loads Fable's working discipline as the quality hedge.
  - **Opus 4.8** — the `code-executor` subagent ([.claude/agents/code-executor.md](.claude/agents/code-executor.md)). **Hard rule:** implementation of an approved non-trivial plan (multi-file or multi-step edits to `api/`, `services/`, `components/`, `App.tsx`) MUST be delegated to `code-executor` with a full brief (plan file path or inline spec + acceptance criteria — it has no conversation context). Tiny edits (one-liners, docs, config tweaks) stay in the main loop, where delegation overhead would cost more than it saves.
  - **GPT 5.6 Sol via Codex CLI bridge** (`.claude/skills/codex-executor/`, added 2026-07-10, **gated trial** — see `workflows/codex_executor_trial.md`) — the second executor lane for **mechanical, spec-tight briefs only** (api/ handlers, type plumbing, refactors with clear acceptance criteria, test writing). Billed to the ChatGPT plan, so it draws zero Claude quota. UI-heavy / DESIGN.md-touching / ambiguous briefs stay with `code-executor`. Fallback is deterministic at the dispatch layer: wrapper exit 10/11/12 (Codex missing / not logged in / **Sol plan limit hit**) → dispatch the SAME brief to `code-executor` (Opus 4.8). **Sol is never the checker/reviewer** — diff review stays in the Claude main loop (builder ≠ reviewer; Sol's benchmark failure modes — dead handlers, unwired UI — are exactly what the checker must catch). Cafe-PC only (needs Codex CLI + `codex login`; re-arm via `scripts/restore-codex.ps1`). On mobile/remote sessions the sandbox has no Codex, so the wrapper exits 10 and the brief routes to `code-executor` — that fallback IS the designed mobile path.
  - **Sonnet 5** — the `smoke-tester` subagent (Playwright was ~50% of historical usage; it now burns at Sonnet rates).

  This pin + frontmatter split is the only supported auto-routing (there is no `fableplan` composite setting and hooks can't switch models), so delegation is enforced by this rule, not the harness. **Never downgrade the main model to save tokens** — savings come exclusively from the zero-quality-cost levers: subagent delegation (above) and `/clear` between unrelated tasks — 80% of historical usage burned at >150k context, where reasoning is also degraded, so context hygiene saves tokens AND improves output. There is no auto-pause or usage-threshold auto-switch; check `/usage` at the start of a heavy session. Drop to `/model sonnet` only if Neil explicitly asks. **Decided 2026-07-10:** re-pinned to Fable 5 (plan window confirmed live until Jul 13 2:59 PM PHT); the sunset handover to Opus 4.8 is automated — see the Fable-sunset section in `workflows/session_reminders.md`.
- **Sub-agent calls are expensive in tokens** — a single `Explore` agent can consume tens of thousands of tokens before reporting back. Use them once per session for big-picture exploration; afterwards work from the report, not from re-exploring.
- **Vertical slices over horizontal layers.** When adding a new module or feature, build types + service call + UI + state in one slice through one feature. Don't do "all types first, then all services" — it produces no working feedback until the very end.

### Goal-driven execution (`/goal`)

When a task has a single measurable end state and would otherwise need 5+ manual back-and-forth turns (audit punch-list items, multi-module refactors, regression chasing), set a [`/goal`](https://code.claude.com/docs/en/goal) instead of driving each turn by hand. Requires Claude Code v2.1.139+.

Condition template — **end state + stated check + constraints + turn cap**:

> *"<end state>, verified by <check that lands in the transcript>, with <constraint>, OR stop after 20 turns."*

Project-specific rules:

- **Evaluator is blind to tools.** It only reads the transcript (defaults to Haiku; configurable via `/model-config`). Conditions must reference output Claude can paste — test results, `git status`, a `gemini-eval` rubric verdict — not "the wizard feels better."
- **`/goal` is itself a Stop hook.** It layers on top of the existing build-gate Stop hook in `.claude/settings.json`. Any goal that touches `api/`, `services/`, `components/`, or `App.tsx` MUST cite the build-gate's pass message in its condition, or the goal can finish while the build-gate is still complaining.
- **TUNED-file guardrail.** No condition may target prompt/schema content inside `services/geminiService.ts` or `api/_lib/prompts.ts`. Escalate to Neil first — the evaluator must not autonomously greenlight tuned-prompt diffs (see `agent_lessons.md` 2026-05-09).
- **Drive with `/goal`, check with existing skills.** Reference `verify-changes` for build/test/smoke, `gemini-eval` for stochastic Gemini output, `brand-check` for UI fidelity. Example clause: *"…AND `gemini-eval` returns no Critical findings…"*.
- **`/clear` kills an active goal.** Mid-goal context hygiene is a hard reset, not a refresh — wrap up or capture status (`◎ /goal active`) before clearing.
- **Single-session only on cafe PCs.** `--resume` carries the condition but resets timer + token baseline, and the defreezer wipes the session anyway. Plan to finish in one sitting; commit incrementally.

#### Plan → Goal pipeline

After every approved plan (`ExitPlanMode` accepted) that involves code changes to `api/`, `services/`, `components/`, or `App.tsx`, your FIRST action in execution mode must be:

1. Re-read the plan file at the path the system reported.
2. Draft a `/goal` invocation using the condition template above. Cite the existing build-gate Stop hook's pass message and any relevant verifier skill (`verify-changes`, `gemini-eval`, `brand-check`) explicitly in the condition.
3. **Skip clause.** If the plan is trivial (single-line fix, docs-only edit, single-var rename, infra-config touch with no code change, or research-only with no artifact), say *"no `/goal` needed — executing directly"* and proceed without a goal.
4. Otherwise, output the draft `/goal` in a fenced code block and ask Neil to **approve / edit / skip**.
5. Do NOT begin code edits until Neil responds.

This gives Neil a two-gate workflow: approve the plan, then approve the goal that executes it. Both gates are user-controlled — the agent never fires `/goal` on its own.

## Architecture

**Routing** — `App.tsx` manages all routes as a single `Route` type (`landing | pricing | app | billing_success | terms | privacy | refund | support`). There is no React Router; path detection is manual via `window.location.pathname` in `detectInitialRoute()`.

**Auth** — Supabase auth (`services/supabaseClient.ts`). Session is checked on mount; `onAuthStateChange` drives `isAuthenticated` state. After sign-in, `billingService.ts` checks for a pending plan checkout (`popIntendedPlan`) and resumes it.

**Multi-step wizard** — The `/app` route renders an 8-step ad creation wizard (Steps 1–7 + storyboard). All wizard state lives in `App.tsx` and is passed as props. Step components are in `components/Step*.tsx`.

**Dashboard modules** — After the wizard, users access standalone tools from a `Dashboard` component. Each tool is its own component in `components/`. Module routing is a string `activeModule` state in `App.tsx`. Modules include: `MarketResearch`, `OfferOptimizer`, `EditVideo`, `ImageEditor`, `CaptionHeadline`, `OrganicCalendar`, `ImageAdsGen`, `CinematicSpecStudio`, `GenerateVideo`, `SignalModulator`, `InfluencerForge`, `IntelligenceUplink`.

**Services** — All services are lazily initialized singletons:
- `geminiService.ts` — all Gemini calls. **Prompts, system instructions, response schemas, and model IDs are tuned — do not edit their content without explicit approval.** Transport, types, error wrapping, and structural refactors are fair game. Models are defined at the top (`textModel`, `researchTextModel`, `avatarModel`, etc.).
- `supabaseClient.ts` — Supabase singleton via `getSupabase()`
- `billingService.ts` — PayMongo checkout flow
- `voiceService.ts` — ElevenLabs voice synthesis

  Also: `activeJobsService.ts` / `activeJobStore.ts` (async render-job tracking → `ui/ActiveJobsPanel.tsx`), `wizardSessionStore.ts` (wizard draft persistence/resume → `ui/ResumeDraftCard.tsx`), `recentWorkService.ts` (→ `ui/RecentWorkCard.tsx`), `checkoutService.ts` (checkout state), `phoneticNormalizer.ts` (voice text normalization).

**Async video pattern** — Video renders are long-running, so they are fire-then-poll: a generate call returns a job, then the client polls `api/gemini/video/poll.ts` / `api/kling/video/poll.ts` until done. A Vercel cron, `api/cron/cleanup-gemini-videos.ts`, reaps expired Gemini video artifacts.

**Types** — All shared TypeScript types are in `types.ts`. The main pipeline data type is `AllData`.

## Design System

All UI **must** follow [DESIGN.md](DESIGN.md) — canvas `bg-zinc-950` (never `bg-black`), accent `#FFCC00` (Grifon Gold), `<GlassPanel>` + `<GoldButton>` primitives from `components/ui/`, `lucide-react` icons only. The full token rules (buttons, inputs, typography) live in DESIGN.md; the `brand-check` skill diffs UI work against them. Use the `components/ui/` primitives — don't recreate them inline.

---

# WAT Framework, File Structure & Workflows

You operate inside the **WAT framework** (Workflows → Agents → Tools): markdown SOPs in `workflows/` drive deterministic Python tools in `tools/`, with the agent orchestrating. The full operating rules — the three layers, "look for existing tools first," learn-and-adapt-on-failure, keep-workflows-current, and the self-improvement loop — live in [workflows/wat-framework.md](workflows/wat-framework.md). **Read it before building or editing anything under `tools/` or `workflows/`.**

## File Structure

```
.tmp/           # Temporary files — regenerated as needed, disposable
tools/          # Python scripts for deterministic execution
workflows/      # Markdown SOPs
services/       # TypeScript service singletons (Gemini, Supabase, billing, voice)
components/     # React UI modules and shared ui/ primitives
types.ts        # All shared TypeScript types
App.tsx         # Root — routing, auth, wizard state, module switching
.env            # API keys (NEVER store secrets anywhere else)
```

Deliverables go to cloud services (Google Sheets, Slides, etc.) where the user can access them. Everything in `.tmp/` is disposable.

## Workflows Index

- `workflows/app_audit.md` — prioritized punch list of what's broken/stubbed/risky
- `workflows/fix_broken_feature.md` — SOP for fixing one item from the audit
- `workflows/infra_setup.md` — Supabase, PayMongo, Google OAuth, domain, hosting checklist
- `workflows/post_beta_roadmap.md` — **next file to open when `launch_readiness.md` hits 100%.** Endorsed-but-deferred ideas with resume triggers (currently: nightly regression `/loop`, Odyssey-as-Cron / Autopilot tier).
- `workflows/session_reminders.md` — re-arm commands for in-session loops the defreezer wipes (currently: hourly break reminder). The SessionStart hook surfaces these automatically.
- `workflows/loops.md` — the loop registry: every self-checking loop (build-gate, cloud CI, `/goal`, session re-arm, parked nightly regression, meta, PR-babysit), its arm command, verifier, and kill switch.
- `workflows/pr_review_loop.md` — SOP for the fresh-context PR critic: a separate `general-purpose` sub-agent reviews the diff (builder ≠ reviewer), posts ranked findings, flags-not-applies TUNED-file changes. The review step of the Tier 5 PR-babysit loop.
- `workflows/viral_swipe_file.md` — the (video) Swipe File: compounding database of Viral Autopsy entries, Pattern Index, and gated proposals. Maintained by the `viral-autopsy` skill.
- `workflows/static_ad_swipe_file.md` — the Static Ad Swipe File: decoded still-image ad patterns (persuasion lever + visual DNA), Pattern Index, and gated Image Ads Gen template proposals (e.g. the SaaS Offer/Upsell family). Maintained by `grifon-creative-director` + `grifon-cmo`.
- `workflows/ad_performance_ledger.md` — the Ad Performance Ledger: compounding database of every paid campaign (Meta + TikTok), North-Star (MER) tracker, Pattern Index, and gated spend-strategy proposals. Maintained by the `grifon-ad-strategist` skill.
- `workflows/growth_loop.md` — spec for the ingest-only data-driven growth loop: pixel + CAPI + telemetry foundation, client-feedback capture, ad-performance ingestion feeding the viral-autopsy/CMO loop, and tier retargeting. Built in phases, Neil-as-approver. Unblocks roadmap Items #7 + #16.
- `workflows/growth_debriefs.md` — the compounding debrief log (Phase 2b): the `growth-debrief` skill reads `ad_performance` + `events` + `feedback` (via `tools/growth_debrief_pull.py`) → ranked "why it won / failed" entries → routes winners into the viral-autopsy/CMO loop (gated). Ingest-only; live entries pending Neil's `ads_read` token.
- `workflows/retargeting_briefs.md` — the compounding brief log (Phase 3): the `retargeting-briefs` skill joins `subscriptions` + `events` + `feedback` (via `tools/segment_pull.py`) → 5 segments → per-segment creative briefs for Neil to build + publish. Roster-export-only (hashed-email CSVs Neil uploads by hand); consent-gated; live briefs pending Phase-0 telemetry + a marketing-consent capture. See `growth_loop_phase3_checklist.md`.
- `workflows/consent_capture_plan.md` — the marketing/retargeting consent capture that gates Phase 3 going live (SHIPPED 2026-06-27, PR #21): resolved grill decisions, Meta Custom Audience compliance constraints (esp. §4 withdrawal→removal), the Slice 1 (code) + Slice 2 (enforcement) plan, and the surface map.
- `workflows/advanced_mode_cleanup.md` — planned: reorganize the 8-step wizard to read as clean as the One-Shot composer (token system, progressive disclosure, less scroll). Has a paste-ready kickoff message for the next session.
- `workflows/concierge_director_plan.md` — **the Concierge / Director-brain initiative.** Two end-user modes (Auto + Concierge, Business-tier) that evolve/replace the 8-step Expert wizard; the "tatawagin ka" architecture truth (production AI = server-side Claude API, NOT the terminal agent); MCP-ready flow layer; the prioritized build order (Phase 0→6 PoC first → gemini-eval → grill-me → build); open decisions for grill-me; and a paste-ready kickoff message. **Open this when resuming the video-ads/Concierge work.**
- `workflows/figma_motion_handoff.md` — SOP for landing Figma Motion designs as `motion@12` React code via the motion-token system (`components/ui/motionTokens.ts`). Owned by `grifon-creative-director`; app UI only, not the generated ad pipeline.
