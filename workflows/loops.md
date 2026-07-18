# Loops — the Grifon Command loop registry

"Stop prompting, create loops" (Boris Cherny): instead of driving each turn by
hand, set up self-checking cycles — an action, a verifier the agent can run
itself, and a stop condition — and let the agent iterate to done. This file is
the registry of every loop in this project: what it does, how to arm it, what
verifies it, and how to kill it.

Ground rule for ALL loops here: a loop is only as good as its verifier. A loop
whose condition the agent can't check from the transcript (build output, test
summary, a skill's verdict) is just prompting with extra steps.

## Tier 0 — Per-edit (inner loop) · ✅ live, automatic

**Build-gate Stop hook.** Any turn that edits `api/`, `services/`,
`components/`, or `App.tsx` cannot end until `npm run build` (tsc + vite)
passes. Pass message: `Build-gate PASSED: …` — cite it in `/goal` conditions.

- Arm: nothing — wired in [.claude/settings.json](../.claude/settings.json) → [.claude/hooks/build-gate.sh](../.claude/hooks/build-gate.sh).
- Verifier: `npm run build` exit code (deterministic).
- Kill switch: Claude Code auto-overrides after 8 consecutive blocks.
- **Deliberately build-only.** Tests stay OUT of this hook (a red test mid-TDD
  must not trap the session — see the script header). Tests belong in Tier 1
  conditions and the `verify-changes` skill.

## Tier 0b — Cloud-side CI gate · ✅ live, automatic

**GitHub Actions CI** ([.github/workflows/ci.yml](../.github/workflows/ci.yml)). Two jobs
on every `pull_request` to `main` and every `push` to `main`:
- `verify` — `npm run build` + `npm run check:bundle-leak` (crown-jewel
  leak guard — fails if any of the 5 server-side prompts leaked into the
  client bundle) + `npm run test` (vitest) + `npm run design:lint`.
- `e2e` — boot/render smoke (`npm run test:e2e`, Playwright): boots the app
  against dummy Supabase env and asserts the public pre-auth routes render
  without crashing. Zero quota (never reaches auth/Gemini). Catches the
  green-build-but-white-screen class the build-only checks can't.

Same spirit as the Tier 0 build-gate, but cloud-side and agent-independent:
build-gate = inner/local (only fires when a Claude session is live, only on
api/services/components/App.tsx edits), CI = outer/cloud (fires on everything
that reaches a PR or main, including worktree / web-session / post-defreezer
edits). Redundant on purpose. Status feeds the Tier 5 PR-babysit loop.

- Arm: nothing — wired in the workflow file; runs on PR/push to main.
- Verifier: the `verify` + `e2e` job exit codes.
- No secrets: regression (`RUN_REGRESSION`) and integration (`RUN_BURNIN`)
  suites stay off by default so CI never burns Gemini quota; the `e2e` smoke
  uses dummy env and never reaches a real API.
- Kill switch: delete `.github/workflows/ci.yml` (or disable the workflow in the
  repo's Actions settings).

## Tier 1 — Per-task (outer loop) · ✅ live, armed per task

**`/goal` with the condition template** (CLAUDE.md → "Goal-driven execution"):
*end state + stated check + constraints + turn cap*. The Plan → Goal pipeline
in CLAUDE.md is the two-gate workflow: Neil approves the plan, then approves
the goal that executes it.

- Arm: draft per CLAUDE.md template; Neil approves/edits/skips.
- Verifiers to cite in conditions: build-gate pass message, `npm run test`
  exit 0 (the unit suite is green as of 2026-06-09 — keep it that way),
  `verify-changes` / `gemini-eval` / `brand-check` verdicts.
- Kill switch: the turn cap in the condition; `/clear` also kills a goal (hard
  reset — capture status first).
- TUNED-file guardrail: no condition may target prompt/schema content in
  `services/geminiService.ts` or `api/_lib/prompts.ts`.

## Tier 2 — Per-session (human + re-arm loops) · ✅ live

**Break reminder** — `/loop 60m …` per
[session_reminders.md](session_reminders.md). Session-state only.

**SessionStart re-arm hook** — [.claude/hooks/session-start.sh](../.claude/hooks/session-start.sh)
fires on every session start (and `/clear`) and re-surfaces, deterministically:
every `/loop` re-arm command in `session_reminders.md`, the dead-`/goal`
warning, and this registry. The defreezer can wipe session state; it can't
wipe the repo.

- Arm: nothing — wired in `.claude/settings.json`.
- Kill switch: remove the `SessionStart` block from settings.json.
- Adding a new session loop? Document its arm command as a `/loop …` line in
  `session_reminders.md` — the hook picks it up automatically.

## Tier 3 — Nightly regression loop · ✅ live, automatic (v1: adscript, deterministic invariants)

Armed 2026-06-30 (Loop Engineering / Move 1). A cloud-scheduled GitHub Action
runs the live Gemini ad-script regression nightly and surfaces any regression as
a GitHub Issue. The first Grifon loop that discovers its own work and runs while
Neil sleeps — cloud, so it survives the defreezer (local `/loop` can't). Full
SOP: [nightly_regression.md](nightly_regression.md); spec:
[post_beta_roadmap.md](post_beta_roadmap.md) #1.

- Arm: nothing — wired in [.github/workflows/nightly-regression.yml](../.github/workflows/nightly-regression.yml)
  (`cron '0 18 * * *'` ≈ 02:00 PHT + `workflow_dispatch`). Schedule fires from
  `main` only; test on a branch via dispatch.
- Verifier: the suite's deterministic-invariant assertions
  (`RUN_REGRESSION=1 npx vitest run tests/regression/script-gen.regression.test.ts`)
  — hook/body starvation + schema shape. Stable across Gemini's stochastic output.
- Persistence: GitHub Issue per failing night (label `regression`) + a
  `nightly-regression-results` artifact every run (30-day retention).
- Human-review door: read-only — opens an issue for Neil, never edits a tuned
  prompt or merges. TUNED fixes escalate (flag-don't-apply, as `pr_review_loop.md`).
- Prerequisite: `GEMINI_API_KEY` repo Actions secret (the first secret in CI).
- Kill switch: disable the workflow in the repo's Actions settings, or delete the
  workflow file.
- Remaining increments: Step 5 storyboard test (inc 2, the spec's original v1
  module) → LLM harsh-critic that verifies by acting (Move 2, needs
  `ANTHROPIC_API_KEY` + a security review) → Bake-and-Leap inverse verdict (still
  parked). Manual harness anytime: `RUN_REGRESSION=1 npx vitest run tests/regression/...`.

## Tier 3b — Oceanides daily-content loop · ✅ live, automatic (GitHub Action, full-auto)

Armed 2026-07-14 as a cloud routine; **converted to a full-auto GitHub Action same day**
(Neil chose no-review — deterministic pre-approved content). `.github/workflows/oceanides-daily.yml`
renders the 30-image + caption batch at 06:00 PHT (`cron 0 22 * * *` UTC) and publishes
straight to the public mirror (`yopiheart/oceanides-posts` →
https://yopiheart.github.io/oceanides-posts/). No PR, no merge. Full SOP:
[oceanides_daily_posts.md](oceanides_daily_posts.md).

- Arm: nothing — scheduled workflow on `main`; manual re-run via Actions → Run workflow (`date` input).
- Verifier: `build-tb2-cities.mjs` self-checks (30 PNGs, 2160×2700, >100 KB, 30 captions,
  zero residual `{{tokens}}`) — the job FAILS rather than publishing a bad batch. No human gate.
- Auth: `MIRROR_TOKEN` repo secret (fine-grained PAT, Contents:write on the public mirror only).
- Kill switch: disable the workflow in the repo Actions tab.
- Copy guardrail: variants live ONLY in `clients/oceanides/tb2-variants.json`, native-ear
  Taglish check required (agent_lessons.md 2026-07-14). To change what posts, edit the pools —
  the rolling 15-day cycle means edits reach every page within the cycle.
- Superseded: cloud routine `oceanides-daily-posts` (trig_01GtbZRGJMmfwmTmrY7vqB98) — DISABLED.

## Tier 4 — Meta loop (self-improvement) · ✅ live, by habit

Something went sideways → fix → verify → **append the lesson to
[agent_lessons.md](../agent_lessons.md)** and update the relevant workflow
(wat-framework.md → "The Self-Improvement Loop"). When the same lesson lands
twice, promote it: turn it into a skill (`skill-creator`) or a hook so the
loop enforces it instead of memory.

## Tier 5 — Remote/web session loop · ✅ available

When working from Claude Code on the web with a PR open:
`subscribe_pr_activity` to babysit it — CI failures and review comments arrive
as events and get fixed without polling. Unsubscribe (or merge/close) ends the
loop.

**Fresh-critic review step.** While babysitting (or right after opening a PR),
run [pr_review_loop.md](pr_review_loop.md): a *fresh* `general-purpose`
sub-agent reviews the head diff (builder ≠ reviewer), posts ranked findings as a
PR comment, and flags — never auto-applies — anything touching the TUNED files
(`services/geminiService.ts`, `api/_lib/prompts.ts`). Report-only; merge stays
gated by Tier 0b CI + Neil.

## Tier 6 — Account-level cloud Routines · ✅ live (server-side, defreezer-proof)

Cloud Routines are scheduled triggers on the Claude account, managed from remote
sessions via the Claude_Code_Remote MCP (`list_triggers` / `create_trigger` /
`update_trigger` / `delete_trigger`). They live server-side — the only loop layer
the defreezer cannot touch. **Ground rule: a Routine without a named READER (a
human or downstream consumer that acts on its output) is quota burn.** Every new
Routine must be registered here with schedule, reader, and kill switch.

Registry (audited 2026-07-18 via `list_triggers`; v2 rewire landed later the
same day via the in-session `RemoteTrigger` tool):

| Routine | Schedule | Status | Reader | Kill switch |
|---|---|---|---|---|
| **GRIFON Daily Prod Health Watch v2** (`trig_01EwWDbLuXyegg39L61XwVbS`) | daily 08:00 PHT (`0 0 * * *` UTC) | ✅ enabled — created 2026-07-18; Vercel + Supabase connectors CONFIRMED attached in the trigger record | Neil via completion push notification (quiet-when-clear prompt); run log on claude.ai Routines | `RemoteTrigger update enabled:false` (any session with the tool) or `delete_trigger` (remote session) |
| **GRIFON Daily Prod Health Watch** (v1, `trig_019v1jD9L7MMTdrHPXYAc9tE`) | daily ~08:00 PHT | ⏸ disabled 2026-07-18 — superseded by v2; ⚠ **DELETION PENDING** (needs a remote session: `delete_trigger` — the in-session `RemoteTrigger` tool has no delete action) | none (the original reader problem) | already off; `delete_trigger` to purge |
| **oceanides-daily-posts** (`trig_01GtbZRGJMmfwmTmrY7vqB98`) | daily 06:00 PHT | ⏸ disabled — superseded 2026-07-14 by the Tier 3b GitHub Action | n/a (Action publishes to the public mirror) | already off; `delete_trigger` to purge |
| **Supabase Pro→free downgrade reminder** (`trig_014SAzGWHPRYhxcHo7Vt7HE8`) | one-shot | ✔ fired 2026-06-24, self-ended | Neil (Gmail draft) | none needed |

- **Reader problem — Neil chose (a) push-alerting rewire, 2026-07-18 — ✅ v2
  LIVE same day.** The earlier "connector limit" turned out to be a limit of
  the remote-session MCP wrapper (`create_trigger`) only, NOT the triggers
  API: a cafe-PC session's `RemoteTrigger` tool (direct `/v1/code/triggers`
  HTTP API) created v2 WITH `mcp_connections` (Vercel + Supabase connector
  UUIDs copied from v1) — no Routines-UI manual step needed after all. v2
  runs Sonnet 5, sources the repo, prompt = the paste-ready block below
  (verbatim = deployed). Test run fired 2026-07-18 ~11:38 UTC (session
  `cse_01MjA4MXKXkoxWrZv8DQzJwP`) — ✅ **VERIFIED by Neil same day**: headline
  `[GRIFON Health] 0 critical / 0 new warnings / all clear — baseline only`,
  real Vercel data (20/20 READY, prod `dpl_BWG57cQ3hBDJtAkxyTwQnnsbm7oL`) +
  both Supabase advisors, baseline matched exactly with zero false alarms —
  connector pass-through to fired sessions works. **Still unconfirmed: the
  push notification reaching Neil's phone** (none arrived for the test run;
  needs the Claude mobile app installed + notifications allowed — the
  2026-07-19 08:00 PHT scheduled run is the real test; if it stays silent
  with correct app setup, fallback rewire = add the Gmail connector and email
  on CRITICAL, per the downgrade-reminder pattern). Remaining cleanup: delete
  v1 from a remote session (row above). On-demand fallback anytime: ask a
  session to run the check
  (~4 tool calls — Vercel deployments + Supabase security/performance advisors).

  <details><summary>Paste-ready v2 prompt (Health Watch, baseline-aware, quiet-when-clear)</summary>

  ```
  You are the production health monitor for GRIFON COMMAND (React/Vite/TS on
  Vercel, Supabase backend; repo yopiheart/grifon-command). Run a daily
  READ-ONLY health check. Your final message is the deliverable; a completion
  push notification reaches Neil's phone when it contains something noteworthy
  — so make issues loud and all-clear runs quiet.

  1. Vercel (teamId team_3t7oOfo3QPnPMHaCqEKtrCQS, projectId
     prj_TaZpp0I0x0nyOmWE4XvzGmglXtsd): list recent deployments. Flag any
     deployment in the last 24h with state ERROR or CANCELED, and confirm the
     latest PRODUCTION deployment is READY. Production not READY = CRITICAL.
  2. Supabase (project_id varoqxjccqmskzeejagn): run get_advisors for BOTH
     security and performance.
  3. Compare against the ACCEPTED BASELINE (workflows/loops.md Tier 6, as of
     2026-07-18): 3 security WARNs (handle_new_user SECURITY DEFINER
     executable by anon + authenticated; leaked-password protection disabled),
     5 auth_rls_initplan perf WARNs, RLS-enabled-no-policy INFOs on the
     service-role telemetry tables, unused-index INFOs. These are KNOWN — never
     report them as new ("baseline unchanged" is enough).
  4. Triage the rest: CRITICAL = prod down / failed production deployment /
     security exposure beyond baseline. NEW WARNING = anything not in baseline.
     HEALTHY = baseline only.
  5. Final message — START with exactly: [GRIFON Health] <N critical / M new
     warnings / all clear — baseline only>. Criticals/new warnings lead, each
     with what, where (deployment ID / advisor name / table), and a one-line
     recommended action. If healthy: headline + one short line confirming both
     checks ran. If a tool is unavailable, say so in the headline (e.g.
     "Vercel unreachable — partial check") — never report a clean bill you
     didn't verify.

  Hard rules: read-only. No code changes, deployments, schema changes, emails,
  or PRs.
  ```
  </details>
- 2026-07-18 manual spot check (this audit): Vercel 20/20 recent deployments
  READY (latest prod = `ead765a`); Supabase — 3 security WARNs
  (`handle_new_user` SECURITY DEFINER callable by `anon` + `authenticated`;
  leaked-password protection off) + 5 `auth_rls_initplan` perf WARNs
  (per-row `auth.uid()` re-eval; trivial `(select auth.uid())` rewrite).
  No criticals. RLS-no-policy INFOs on the telemetry tables are expected —
  they're written via service role; no-policy = deny-all for clients.
