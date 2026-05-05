# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

# App Overview

**GRIFON COMMAND** is a multi-module AI marketing platform built with React + Vite + TypeScript + Tailwind CSS. It guides users through creating video ad scripts, storyboards, avatars, and visual concepts. All generative features run through `services/geminiService.ts` (Google Gemini API).

## Dev Commands

```bash
npm install          # install dependencies
npm run dev          # start Vite dev server (also serves api/* via middleware bridge)
npm run build        # tsc type-check + Vite production build
npm run preview      # preview production build locally
```

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

## Shared Vocabulary & Skills

Before any planning conversation, large refactor, or new module spec, load:

- **[UBIQUITOUS_LANGUAGE.md](UBIQUITOUS_LANGUAGE.md)** — the canonical glossary for Grifon's domain. Use these terms verbatim in code, prompts, UI copy, and planning. Notable disambiguations: **Avatar** (wizard) vs **Influencer** (Influencer Forge); wizard **Script** vs **Influencer Script**; wizard **Storyboard** vs **Cinematic Relay**.
- **[agent_lessons.md](agent_lessons.md)** — living log of mistakes and lessons. Read at session start; add entries when something goes sideways. Behavioral rules go *here*, not in this file.
- **`.claude/skills/grill-me/`** — invoke before writing any non-trivial PRD or refactor plan. Forces interview-style alignment so the AI doesn't outrun its headlights.
- **`.claude/skills/ubiquitous-language/`** — re-run when domain concepts shift or new modules are added; updates `UBIQUITOUS_LANGUAGE.md` in place.
- **`.claude/skills/verify-changes/`** — run the verification loop (build, test, smoke) after any edit to `api/`, `services/`, `components/`, or `App.tsx`, and before reporting a task as complete.
- **`.claude/skills/surgical-edit/`** — invoke before any edit. Match the scope of the change to the scope of the request. Hard rules for `services/geminiService.ts` and `api/_lib/` live here.

If a planning conversation introduces a new domain concept not in `UBIQUITOUS_LANGUAGE.md`, propose adding it before writing code.

## Context Hygiene

LLM reasoning degrades sharply past ~100k tokens of context. Treat the conversation window as a budget.

- **Prefer `/clear` over `/compact`** when the current thread has wandered. Compaction keeps the model in a degraded state; clearing returns it to a fresh, smart baseline.
- **The Ralph Loop destination doc** is `workflows/launch_readiness.md`. When you `/clear`, that file plus this `CLAUDE.md` and `UBIQUITOUS_LANGUAGE.md` are enough to resume work — no need to re-explain context.
- **After exploring `services/geminiService.ts`** (91 KB), the smart zone is largely consumed. Finish the current task or summarize findings to a workflow file *before* taking on a second large exploration in the same session.
- **Sub-agent calls are expensive in tokens** — a single `Explore` agent can consume tens of thousands of tokens before reporting back. Use them once per session for big-picture exploration; afterwards work from the report, not from re-exploring.
- **Vertical slices over horizontal layers.** When adding a new module or feature, build types + service call + UI + state in one slice through one feature. Don't do "all types first, then all services" — it produces no working feedback until the very end.

## Architecture

**Routing** — `App.tsx` manages all routes as a single `Route` type (`landing | pricing | app | billing_success | terms | privacy | refund | support`). There is no React Router; path detection is manual via `window.location.pathname` in `detectInitialRoute()`.

**Auth** — Supabase auth (`services/supabaseClient.ts`). Session is checked on mount; `onAuthStateChange` drives `isAuthenticated` state. After sign-in, `billingService.ts` checks for a pending plan checkout (`popIntendedPlan`) and resumes it.

**Multi-step wizard** — The `/app` route renders an 8-step ad creation wizard (Steps 1–7 + storyboard). All wizard state lives in `App.tsx` and is passed as props. Step components are in `components/Step*.tsx`.

**Dashboard modules** — After the wizard, users access standalone tools from a `Dashboard` component. Each tool is its own component in `components/`. Module routing is a string `activeModule` state in `App.tsx`. Modules include: `MarketResearch`, `OfferOptimizer`, `EditVideo`, `ImageEditor`, `CaptionHeadline`, `OrganicCalendar`, `ImageAdsGen`, `CinematicSpecStudio`, `GenerateVideo`, `SignalModulator`, `InfluencerForge`.

**Services** — All services are lazily initialized singletons:
- `geminiService.ts` — all Gemini calls. **Prompts, system instructions, response schemas, and model IDs are tuned — do not edit their content without explicit approval.** Transport, types, error wrapping, and structural refactors are fair game. Models are defined at the top (`textModel`, `researchTextModel`, `avatarModel`, etc.).
- `supabaseClient.ts` — Supabase singleton via `getSupabase()`
- `billingService.ts` — PayMongo checkout flow
- `voiceService.ts` — ElevenLabs voice synthesis

**Types** — All shared TypeScript types are in `types.ts`. The main pipeline data type is `AllData`.

## Design System

All UI **must** follow [DESIGN.md](DESIGN.md). Key rules:

- **Canvas:** `bg-zinc-950` (never `bg-black`)
- **Primary accent:** `#FFCC00` (Grifon Gold) — active states, main buttons, focus rings
- **Panels:** Use `<GlassPanel>` (`components/ui/GlassPanel.tsx`) to wrap all forms and tool settings
- **Primary button:** `<GoldButton>` (`components/ui/GoldButton.tsx`)
- **Ghost button:** `bg-zinc-950 border border-white/10` with gold hover
- **Inputs:** `bg-zinc-950 border border-white/10 rounded-xl focus:border-[#FFCC00] focus:ring-1 focus:ring-[#FFCC00]`
- **Icons:** Only `lucide-react` SVG icons — never raw text strings
- **Typography:** Main text `text-white`/`text-zinc-300`; headers use `bg-gradient-to-r from-zinc-100 to-zinc-500`; sub-labels `text-[10px] text-zinc-500 font-mono uppercase tracking-widest`

Reusable UI primitives live in `components/ui/`. Use them; don't recreate them inline.

---

# WAT Framework (Agent Instructions)

You're working inside the **WAT framework** (Workflows, Agents, Tools). This architecture separates concerns so that probabilistic AI handles reasoning while deterministic code handles execution.

## The WAT Architecture

**Layer 1: Workflows (The Instructions)**
- Markdown SOPs stored in `workflows/`
- Each workflow defines the objective, required inputs, which tools to use, expected outputs, and how to handle edge cases

**Layer 2: Agents (The Decision-Maker)**
- Read the relevant workflow, run tools in the correct sequence, handle failures gracefully, and ask clarifying questions when needed
- Example: If you need to pull data from a website, read `workflows/scrape_website.md`, figure out the required inputs, then execute the appropriate tool script

**Layer 3: Tools (The Execution)**
- Python scripts in `tools/` that do the actual work
- Credentials and API keys are stored in `.env`

**Why this matters:** When AI handles every step directly, accuracy compounds down. Offloading execution to deterministic scripts keeps AI focused on orchestration.

## How to Operate

**1. Look for existing tools first.** Check `tools/` before building anything new.

**2. Learn and adapt when things fail.**
- Read the full error trace
- Fix the script and retest (check before re-running if it uses paid API calls)
- Document learnings in the workflow (rate limits, timing quirks, unexpected behavior)

**3. Keep workflows current.** Update workflows when you find better methods or discover constraints. Don't create or overwrite workflows without asking unless explicitly told to.

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

## The Self-Improvement Loop

1. Identify what broke
2. Fix the tool
3. Verify the fix works
4. Update the workflow with the new approach
5. Move on with a more robust system
