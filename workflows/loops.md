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

**GitHub Actions CI** ([.github/workflows/ci.yml](../.github/workflows/ci.yml)). Runs
`npm run build` + `npm run test` + `npm run design:lint` on every `pull_request`
to `main` and every `push` to `main`. Same checks as the Tier 0 build-gate, but
cloud-side and agent-independent: build-gate = inner/local (only fires when a
Claude session is live, only on api/services/components/App.tsx edits), CI =
outer/cloud (fires on everything that reaches a PR or main, including worktree /
web-session / post-defreezer edits). Redundant on purpose. Status feeds the
Tier 5 PR-babysit loop.

- Arm: nothing — wired in the workflow file; runs on PR/push to main.
- Verifier: the `verify` job's exit code (build, unit tests, design lint).
- No secrets: regression (`RUN_REGRESSION`) and integration (`RUN_BURNIN`)
  suites stay off by default so CI never burns Gemini quota.
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

## Tier 3 — Nightly regression loop · ⏸ PARKED (do not arm)

Golden-path inputs through the 11 modules, output diffed against a `.golden/`
baseline by a separate harsh evaluator, failures posted to a channel. Full
spec: [post_beta_roadmap.md](post_beta_roadmap.md) #1.

- Resume trigger (Neil's, reconfirmed 2026-06-09): **beta is live AND a second
  post-beta change shipped without manual regression.** Until then, the manual
  harness is `RUN_REGRESSION=1 npx vitest run tests/regression/...`.
- v1 scope when armed: Step 5 storyboard only (highest regression history).

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
