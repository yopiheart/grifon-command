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
- **🔔 `main-status` alarm job — the reader fix, added 2026-08-07.** A third job,
  `main-status` (`needs: [verify, e2e]`, `if: always() && push`), keeps **exactly one**
  open issue labelled `ci-red` alive while `main` is failing, appends a dated line per
  red push, and **closes it automatically** on the first green push. That issue — not
  the GitHub email — is the alert. **Read by** the Tier 6 Health Watch v2 Routine at
  08:00 PHT, which reports an open `ci-red` (with its age in days) as CRITICAL to the
  one channel whose delivery to Neil's phone is CONFIRMED.
  - **Why this shape.** The 3-day outage was never a *detection* failure — CI went red
    instantly and stayed red. It was a **reader** failure: ~20 identical emails in a
    channel Neil had learned to scroll past. The rule below demanded a named reader and
    a signal that stands out; this discharges it. One issue whose *age* is the severity
    metric stands out; twenty identical emails do not.
  - **push-to-main only, deliberately.** A red PR is normal and Neil is in-session for
    it. Paging on PRs would rebuild the noise this job exists to delete.
  - Trade: detection latency goes from instant-but-unread to ≤24h-and-read. That is a
    strict win against a 3-day miss — but it means **the issue is the durable record and
    the push is the nudge**; don't add a second alerting channel without re-reading the
    rule below.
  - Self-heals the `ci-red` label if absent. Kill switch: delete the `main-status` job
    (the `verify`/`e2e` gate is untouched by it — it can never turn a red build green).
  - **Verified 2026-08-07 on live runs, both paths:** green (`main is green, no open
    alarm — nothing to do`) and auto-close (hand-planted `ci-red` #101 → commented +
    closed by the next green push). The close path is the one worth testing — an alarm
    that never clears is worse than no alarm.
  - ⚠ **Cost-of-admission lesson: the Actions runner scans the ENTIRE workflow file for
    `${{ … }}`, including inside a JS comment inside a YAML block scalar.** An *empty*
    one is a parse error that kills the whole workflow — no job runs, no annotation is
    exposed via the API, and `gh run view` says only "likely failed because of a workflow
    file issue." It was introduced by a comment *explaining* interpolation, and it passed
    both a local YAML parse and `node --check`, because **Actions is stricter than YAML
    and stricter than JS**. Guard before pushing any workflow edit:
    ```bash
    node -e "const fs=require('fs');for(const f of fs.readdirSync('.github/workflows')){fs.readFileSync('.github/workflows/'+f,'utf8').split('\n').forEach((l,i)=>{let m,re=/\\\$\{\{(.*?)\}\}/g;while((m=re.exec(l)))if(!m[1].trim())console.log('EMPTY EXPR',f+':'+(i+1));});}"
    ```
- **⚠ 2026-08-07 — the three-day red-CI outage, and the rule that came out of it.**
  Every workflow in the repo (CI, Nightly Regression, Oceanides daily) failed
  from 2026-08-04 to 2026-08-07, all at the **same** step — `npm ci` — before
  reaching a single API call: `Missing: @types/react@19.2.18 from lock file`.
  Root cause was an **environment split, not a bad commit**: the cafe PC runs
  Node 24 / npm 11, CI ran Node 20 / npm 10, and npm 11 deterministically drops
  the nested optional-peer `@types/react` record under `@google/design.md` that
  npm 10 requires. Whichever machine wrote the lockfile broke the other.
  `323da07` wrote it the npm 11 way to stop local churn and CI's npm 10 rejected
  it — **neither side could be right while the two npm versions disagreed.**
  Fixed by bumping CI to **Node 24** in all four places (`ci.yml` ×2,
  `nightly-regression.yml`, `oceanides-daily.yml`) and pinning `engines`
  (`node >=24`, `npm >=11`) in `package.json`. Green again at `0a7c7a7`.
  - **The rule:** a lockfile is only reproducible against a pinned toolchain.
    When `npm ci` starts disagreeing with local `npm install`, compare **npm
    major versions first** — do not rewrite the lockfile to match whichever
    machine you happen to be sitting at.
  - **Why it ran three days:** the failure notice reached Neil as ~20 identical
    GitHub emails, which is a channel he had learned to scroll past. Same shape
    as the Health Watch reader problem in Tier 6, inverted — that one is silent
    when healthy so silence means nothing; this one is loud on every failure so
    noise means nothing. **Both are unread-channel failures.** Any new alerting
    added here must state who reads it and how a real signal stands out.
  - Leftover, cosmetic: `actions/checkout@v4` / `setup-node@v4` still target
    Node 20 and are force-run on 24. Bump to `@v5` when convenient.
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
warning, this registry, the unmerged-branch list, the git-identity check, and
(since 2026-07-31) the **wayfinder frontier** — open `concierge:*` tickets from
the Concierge map (issue #87), degrading gracefully when gh is wiped/unauthed.
The defreezer can wipe session state; it can't wipe the repo.

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

## Tier 3b — Oceanides daily-content loop · ⏸ PAUSED 2026-08-07 (was live, full-auto)

> **⏸ PAUSED 2026-08-07 at Neil's request** — *"i would like to request to stop
> temporarily the oceanides daily posting."* The `schedule:` block in
> [`.github/workflows/oceanides-daily.yml`](../.github/workflows/oceanides-daily.yml)
> is **commented out, not deleted**; `workflow_dispatch` stays live, so a single
> day can still be rendered by hand from the Actions tab. **To resume:** uncomment
> the two `schedule:` lines. Nothing else changed — pools, templates and the
> mirror token are untouched.
>
> Note the loop was already **not publishing** before the pause: every run since
> 2026-08-04 died at `npm ci` on the repo-wide lockfile desync (see Tier 0b), so
> the last successful publish predates that. Fixing the lockfile does **not**
> un-pause this loop; the commented schedule is the pause.

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
| **GRIFON Daily Prod Health Watch v2** (`trig_01EwWDbLuXyegg39L61XwVbS`) | daily 08:00 PHT (`0 0 * * *` UTC) | ✅ enabled — created 2026-07-18; Vercel + Supabase connectors CONFIRMED attached; **firing confirmed 2026-08-07** (`last_fired_at` 00:15:25Z that morning, `next_run_at` 2026-08-08) | Neil via completion push notification (quiet-when-clear prompt); run log on claude.ai Routines | `RemoteTrigger update enabled:false` (any session with the tool) or `delete_trigger` (remote session) |
| **GRIFON Daily Prod Health Watch** (v1, `trig_019v1jD9L7MMTdrHPXYAc9tE`) | daily ~08:00 PHT | ⏸ disabled 2026-07-18 — superseded by v2; ⚠ **DELETION PENDING** (needs a remote session: `delete_trigger` — the in-session `RemoteTrigger` tool has no delete action) | none (the original reader problem) | already off; `delete_trigger` to purge |
| **oceanides-daily-posts** (`trig_01GtbZRGJMmfwmTmrY7vqB98`) | daily 06:00 PHT | ⏸ disabled — superseded 2026-07-14 by the Tier 3b GitHub Action | n/a (Action publishes to the public mirror) | already off; `delete_trigger` to purge |
| **Supabase Pro→free downgrade reminder** (`trig_014SAzGWHPRYhxcHo7Vt7HE8`) | one-shot | ✔ fired 2026-06-24, self-ended | Neil (Gmail draft) | none needed |
| **Neil Meal Reminder** (`trig_01B5soYW2eZfr7EGDvt7Ucy7`) | `30 2,7,12,16,21 * * *` (5×/day PHT) | ✅ enabled — created 2026-08-05, **registered here 2026-08-07** after an audit found it unlisted | Neil, via push. Personal, not engineering — Haiku 4.5, `allowed_tools: ["PushNotification"]` only, one warm Taglish nudge to eat | `RemoteTrigger update enabled:false` |

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

- **✅ 2026-08-07 — READER CONFIRMED. The three-week question is CLOSED.** Neil
  verified the manual test run end-to-end on the Routines UI: run completed,
  `Sent notification` step present, final line *"Pushed the details to your
  phone."* The push channel works. Run history shows daily `Completed` from
  2026-07-25 through 2026-08-07 with a single `Failed` on **2026-08-05** (same
  window as the lockfile outage — worth a glance if it recurs, otherwise noise).
  **v2 is fully verified: fires, reads, and reaches Neil.** No fallback needed —
  the Gmail rewire and the weekly-heartbeat proposal below are both **moot for
  the delivery question** and should not be built for that reason.
- **🔴 2026-08-07 — and it immediately earned its keep. Two ERROR-level findings
  beyond baseline, OPEN:**
  1. **`public.run_cogs` and `public.run_attribution_anomalies` are SECURITY
     DEFINER views.** They execute with the *creator's* permissions, bypassing
     the querying user's RLS on the underlying tables. If they read
     `producer_runs` / `ad_performance`, they can expose **cross-user** data
     regardless of RLS. **Action: confirm intent.** If deliberate (admin-only
     cost aggregation) document them into the accepted baseline; if not,
     recreate as `SECURITY INVOKER`.
     [Supabase lint 0010](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
  2. **Duplicate index on `public.funnel_leads`** — `funnel_leads_client_created`
     and `funnel_leads_client_created_idx` are identical. Low urgency; drop one.
     [Supabase lint 0009](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index)

  Vercel was clean (prod `dpl_7EFtgd2mWfMNGJfKWsYmE4pSSeXp` READY, no
  ERROR/CANCELED in the 20 most recent). **Note what this costs the "wait for
  paying users" argument in [`post_beta_roadmap.md`](post_beta_roadmap.md) #27:**
  it was too strong. Zero traffic ≠ nothing to watch — **schema and security
  drift accrue without a single user.** The AI-SRE *diagnosis* layer stays parked;
  the *detection* layer already pays for itself today.

- **2026-08-07 registry audit (full `RemoteTrigger list`) — three housekeeping
  findings:**
  1. **`Neil Meal Reminder` was unregistered** — now added to the table above.
     Harmless, but the Tier 6 ground rule exists so the registry can be trusted;
     an audit with a known gap is not an audit. ⚠ Minor least-privilege note: it
     carries **nine MCP connectors** (Gmail, Calendar, Motion, Meta Ads, Drive,
     Vercel, Supabase, Claude_Code_Remote, Jockey) while needing exactly one
     tool. `allowed_tools: ["PushNotification"]` does constrain it in practice,
     so this is tidiness, not an exposure — strip the connectors next time it is
     edited.
  2. **Health Watch v1 (`trig_019v1jD9L7MMTdrHPXYAc9tE`) still exists.** Neil
     asked for deletion 2026-08-07; **it could not be done from a cafe-PC
     session** — the in-session `RemoteTrigger` tool exposes only
     list/get/create/update/run, with **no delete action**. Confirmed inert
     (`enabled: false`, last fired 2026-07-18), so the only cost is clutter.
     **Two ways to finish it:** the Routines UI (open the row → Details →
     delete), or a remote session with the `delete_trigger` MCP.
  3. **~11 dead `send_later …` triggers** from the Jul 25–28 PR-babysit re-arms
     (#72, #75, #76), all `enabled: false` / `ended_reason: run_once_fired`.
     They are inert but they are why a registry audit is now slow to read. Purge
     them in the same UI pass as v1.

- **⚠ 2026-08-07 — why this question stayed open for three weeks (kept as the
  lesson, now that the answer is in).** The trigger record was pulled directly
  (`RemoteTrigger get`): **the monitor was healthy and firing all along** —
  enabled, both connectors attached,
  `last_fired_at` 2026-08-07T00:15:25Z, `next_run_at` 2026-08-08T00:06Z. So the
  *loop* was never in question. What could not be settled is the **reader**, and
  the reason is structural: the prompt is deliberately **quiet-when-clear**, and
  production has been clear. That makes silence ambiguous — *"working, nothing to
  say"* and *"notification channel dead"* produce **the identical observation**,
  so no amount of waiting can distinguish them. Three weeks of "unconfirmed" was
  not neglect; it was an unfalsifiable check. **This is the Tier 6 ground rule one
  level up:** a Routine needs a named reader, and a monitor needs a signal proving
  the *channel* is alive independently of whether the *subject* is healthy.
  - Settled by firing a manual run (session `cse_01B2mWu7qnsFQcpbebJ8nHYp`,
    2026-08-07 15:04 PHT) and reading the Routines UI directly — **the lesson is
    that this took ten minutes and could have been done on day one.** An
    unfalsifiable check should be converted into a falsifiable one immediately,
    not left to accumulate calendar time.
  - **Weekly heartbeat — NOT needed for delivery** (that question is answered
    above) but still the right shape if this monitor is ever suspected again:
    one fixed weekday it reports out loud even when clear, so silence becomes
    evidence on a known day. Park it; do not build it now.

- **📡 2026-08-07 — v2 widened to read CI (the Rauch/Vercel brief's one real apply).**
  v2 now runs a **three-check** sweep: CI/`main` first, then Vercel, then Supabase. A
  `main` left red is CRITICAL, reported **with its age in days** — the number that
  would have made the 3-day outage impossible to scroll past. Mechanism: it reads the
  Tier 0b `ci-red` issue via `gh` (repo is PRIVATE, so an unauthenticated API fallback
  does not exist — hence the explicit "if `gh` is unavailable, say *CI status
  unavailable* in the headline, never assume green" clause). Everything else — cron,
  both connectors, model, quiet-when-clear posture, headline format — unchanged.
  - This is **step 2 of `post_beta_roadmap.md` #27** ("widen v2's read set"), taken
    early because it costs one prompt edit and closes a failure that already happened.
    The rest of #27 (diagnosis, proposed diffs, richer-than-cron triggers) stays parked;
    detection widened, application untouched.

  <details><summary>Paste-ready v2 prompt (Health Watch, CI + Vercel + Supabase, baseline-aware, quiet-when-clear) — verbatim = deployed, updated 2026-08-07</summary>

  ```
  You are the production health monitor for GRIFON COMMAND (React/Vite/TS on
  Vercel, Supabase backend; repo yopiheart/grifon-command). Run a daily
  READ-ONLY health check. Your final message is the deliverable; a completion
  push notification reaches Neil's phone when it contains something noteworthy
  — so make issues loud and all-clear runs quiet.

  1. CI / `main` health. The repo is PRIVATE — use the authenticated `gh` CLI
     against the checkout you are given:
       gh issue list --label ci-red --state open --json number,title,createdAt
       gh run list --branch main --workflow CI --limit 5 --json conclusion,displayTitle,createdAt
     An OPEN `ci-red` issue means `main` is failing CI right now: report it as
     CRITICAL and state how many days it has been open (from createdAt). A
     `failure` conclusion on the newest `main` CI run is the same signal. If
     `gh` is unavailable or unauthenticated, put "CI status unavailable" in the
     headline — never assume green.
  2. Vercel (teamId team_3t7oOfo3QPnPMHaCqEKtrCQS, projectId
     prj_TaZpp0I0x0nyOmWE4XvzGmglXtsd): list recent deployments. Flag any
     deployment in the last 24h with state ERROR or CANCELED, and confirm the
     latest PRODUCTION deployment is READY. Production not READY = CRITICAL.
  3. Supabase (project_id varoqxjccqmskzeejagn): run get_advisors for BOTH
     security and performance.
  4. Compare against the ACCEPTED BASELINE (workflows/loops.md Tier 6, as of
     2026-07-18): 3 security WARNs (handle_new_user SECURITY DEFINER
     executable by anon + authenticated; leaked-password protection disabled),
     5 auth_rls_initplan perf WARNs, RLS-enabled-no-policy INFOs on the
     service-role telemetry tables, unused-index INFOs. These are KNOWN — never
     report them as new ("baseline unchanged" is enough).
  5. Triage the rest: CRITICAL = `main` red / prod down / failed production
     deployment / security exposure beyond baseline. NEW WARNING = anything not
     in baseline. HEALTHY = baseline only.
  6. Final message — START with exactly: [GRIFON Health] <N critical / M new
     warnings / all clear — baseline only>. Criticals/new warnings lead, each
     with what, where (deployment ID / advisor name / table / issue number), and
     a one-line recommended action. If healthy: headline + one short line
     confirming all three checks ran. If a tool is unavailable, say so in the
     headline (e.g. "Vercel unreachable — partial check") — never report a clean
     bill you didn't verify.

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
