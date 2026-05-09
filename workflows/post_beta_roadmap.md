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
