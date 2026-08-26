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
- **⚠ 2026-08-19 — the second repo-wide outage, and it was not a bug at all.**
  Every job in every workflow began failing in **3 seconds** with one annotation.
  Nothing was broken: `main` built clean, 1264 tests passed, all five gates
  passed, and all four workflow files parsed. The account had simply **used 100%
  of its 2,000 included Actions minutes** (GitHub emailed on Aug 19, 21:08; the
  cycle resets on the 1st). With a $0 Actions budget GitHub **refuses to start
  the job**, which is why even `main-status` died — it runs no code, only a
  github-script call, and it never got the chance.
  - **The tell that separates this from a code failure: 3 seconds.** `npm ci`
    needs 20–60s to even fail. A job that dies before its first step did not run.
    Check billing before reading a single log.
  - **It was a RATE problem, not an accident.** 2,000 minutes went in 19 days,
    about 105/day. Waiting for the reset would have re-capped around the 19th of
    the next month. Four causes, all measured on 2026-08-23:
    1. **No `paths-ignore` anywhere.** Docs-only pushes ran tsc + vite + 1264
       tests + an uncached Playwright browser download. **102 of the 254
       first-parent commits on main since Aug 1 (40%) were docs-only** — including
       all four Aug 20 failures. Now skipped on `push`. The list is deliberately
       narrow (`NOW.md`, `agent_lessons.md`, `workflows/**`, `baselines/**`);
       `DESIGN.md` is excluded because `design:lint` reads it. Verified first:
       no test opens any ignored path at runtime, only comments mention them.
    2. **No workflow-level `concurrency`.** A burst of pushes spawned a full
       parallel run each and only the last was ever read. Now supersedes PR runs
       only — a push-to-main run must never be cancelled, because `main-status`
       is the alarm and a cancelled alarm reads as a false all-clear.
    3. **Playwright uncached.** Browser + apt deps downloaded on every e2e job.
       Now cached on `~/.cache/ms-playwright`, keyed on the lockfile, with
       `install-deps` on a cache hit (the libs live outside the cached path).
    4. **No `timeout-minutes`.** A hung step could bill the 6-hour default
       against the pool that ran out. Now capped at 15 on both jobs.
  - **`claude-review` was NOT a cause** — it already had `cancel-in-progress: true`
    since it was written. Checked before blaming it.
  - **The alarm was blind; the monitor was NOT. Verified 2026-08-23 by reading the
    routine's own run logs** (`RemoteTrigger list_runs` + `get_run_log` on
    `trig_01EwWDbLuXyegg39L61XwVbS` — no `gh` needed, and far cheaper than the
    claude.ai UI). An exhausted-minutes outage is invisible to the Tier 0b alarm
    **by construction**: `main-status` cannot start, so no `ci-red` issue ever
    opens. The Health Watch's *second* check — the newest `main` run's conclusion
    — carried the whole load and worked:
    - **Aug 21, 08:14 PHT** (~15h after main went red) it pushed CRITICAL, named
      the commit, **and independently reached the same 3-second infra diagnosis**
      a session reached by hand two days later. It also flagged that no `ci-red`
      issue existed. It fired again Aug 23, 08:10 PHT.
    - It could not read the job logs (HTTP 404 on all three), which is itself
      consistent: GitHub serves no logs for a job it never started.
    - **Keep that redundant check.** On its own, the `ci-red` issue would have
      reported this outage as healthy for as long as it lasted.
  - **⚠ The real gap is the READER, for the THIRD time.** Tier 0b wrote off the
    GitHub email firehose as noise Neil scrolls past, and named the push
    notification the channel whose delivery is CONFIRMED. This outage inverted
    it: the pushes landed on Aug 21 and Aug 23 and did not get acted on, while
    **the GitHub emails are what Neil brought to a session on Aug 23** — the
    dismissed channel did the job the designated one was built for. Delivery was
    never the problem in any of the three rounds; being read is. Before adding a
    fourth channel, re-read this: two of the three failures so far were caused by
    adding one.

- Kill switch: delete `.github/workflows/ci.yml` (or disable the workflow in the
  repo's Actions settings).

## Tier 0c — Cloud-side REVIEWER · ✅ LIVE (verified on #106, 2026-08-10)

**Claude Review** ([.github/workflows/claude-review.yml](../.github/workflows/claude-review.yml)).
Tier 0b answers *does it build*; this answers *should it merge*. Runs
`anthropics/claude-code-action@v1` on every PR to `main` and posts ranked
findings as **one sticky PR comment**, edited in place on each re-push.

- **Why it exists.** The review logic already existed — it lived in PreToolUse
  hooks (`tuned-file-gate`, `taglish-guard`, `check:domain`, the em-dash rule)
  that only fire when a Claude session happens to be alive on the cafe PC.
  Anything authored from a worktree, a web session, a phone, or a
  post-defreezer machine reached `main` unreviewed. **`grifon-starter` shipped
  LIVE with 30 em dashes through exactly that hole** (NOW.md 2026-08-10): a
  universal rule thrown out with an English-funnel voice-lint carve-out, with
  nothing outside the session watching. Tier 0c is those guards lifted
  somewhere they run without Neil.
- **The step gate.** In Boris Cherny's *Steps of AI Adoption* (2026-07-16) the
  step 1 → 2 transition needs four things: a self-verification loop you trust,
  auto mode, **automated code review**, and running more than one agent at a
  time. Grifon had the first two over-built (Tier 0/0b, `defaultMode: "auto"`)
  and this one missing. Order matters and is not cosmetic: step 2's own
  bottleneck is *reviewing output*, so **going parallel before this exists
  multiplies the step-1 bottleneck instead of relieving it.** ✅ That condition
  is now satisfied — Tier 0c is live and verified, so **worktree parallelism is
  UNLOCKED ONCE `main` REQUIRES A PR *AND* AN APPROVING REVIEW** (2026-08-10).
  The condition is in the headline on purpose: a reader skimming for the verdict
  must not be able to take the permission without the guard.
  - ⚠ **Branch protection alone is NOT the condition, and an earlier draft of this
    line said it was.** Protection forces every change through a PR, which is the
    premise the sub-bullet below needs — but **Tier 0c is report-only and never
    blocks a merge**, and plain protection does not require an approving review.
    So the weaker condition can be fully met while every review goes unread: four
    agents open four PRs, Tier 0c posts four sticky comments, all four merge
    green, nothing is blocked and nothing is read. That multiplies the review
    burden by four — the exact outcome the step-gate bullet above says the
    ordering exists to prevent. **A human reading the comment before merge is the
    thing being protected; the PR is only the container.** If merges stay
    unblocked by choice, then the rule is that Neil reads each sticky comment
    before merging, and that is what has to be true before agent count goes up.
  NOW.md's PARKED line says the same; if these two ever disagree, this entry
  is the one NOW.md points at, so fix both.
  - ⚠ **The unlock rests on a precondition nothing enforces: every change reaches
    `main` through a PR.** Tier 0c fires on `pull_request` only, so a direct push
    to `main` is unreviewed, and a PR editing **`claude-review.yml` itself** is
    skipped by GitHub's token guard (the ⛔ bullet at the end of this entry, which
    also records what is still untested about it). Parallel agents multiply exactly
    the paths that skip the reviewer, so **if agent count goes up, put branch
    protection on `main` first** — otherwise the unlock is louder than the guard
    behind it. NOW.md's PARKED line carries this caveat too; keep them together.
- Arm: nothing — wired to `pull_request` on `main`, and armed since 2026-08-10.
  The Claude GitHub App is installed and `CLAUDE_CODE_OAUTH_TOKEN` (from
  `claude setup-token`) is set, which bills the **Pro subscription, not the API**
  — an `ANTHROPIC_API_KEY` secret would bill pay-as-you-go instead. To re-arm on
  a new account, those two steps are the whole setup.
- **First real review, #106 (2026-08-10): round one alone caught five findings in the diff of
  the agent that built it** — four stale facts in `NOW.md` (including a
  Max-vs-Pro contradiction against its own workflow comment) and a `MAX_LINES`
  breach against `tools/resume_doc_check.mjs`, a verifier the author had not
  found. It correctly reported no TUNED change and correctly exempted the
  em-dash and Taglish rules on a repo-internal doc. One sub-claim was stale
  (it said loops.md recorded neither new fact; #107 had already added the
  opus-5 pin). **That ratio is the point: builder ≠ reviewer earns its keep on
  the builder's own work, and the reviewer is a strong signal, not an oracle.**
- **Fails SOFT, deliberately.** With no token the job emits a `::notice` and
  no-ops. It never paints a PR red, because a red check nobody can fix rebuilds
  the unread-channel failure this file keeps relearning.
- Reader: the sticky PR comment — **not** the workflow run log. The action's
  automation mode writes to the run log by default, which is precisely the Tier
  0b/Tier 6 reader failure; the `github-script` post step exists to defeat that.
  One comment, edited in place, for the same reason `main-status` keeps one
  issue instead of twenty emails.
- **Report-only, always.** Never pushes a commit, never edits a file (except its
  own `review.md` scratch), never blocks a merge. TUNED-file content changes are
  **flagged and explicitly not judged** — same doctrine as
  [pr_review_loop.md](pr_review_loop.md), which this automates rather than
  replaces (that SOP stays the in-session path for non-PR diffs).
- Model: **`claude-opus-5`**. CLAUDE.md's per-role allocation puts review in the
  main-loop role and pins that role to Fable 5 — but **Fable is a Max-plan
  inclusion and Neil confirmed the account is Pro** (in session, 2026-08-10;
  the run evidence alone would only have proven the plan of that *token*, which
  is a distinction worth keeping since the remedy differs). The first live run
  initialised on `claude-fable-5` and died 524ms later with `is_error:true`
  after one turn (#106). Worth knowing the shape: an out-of-plan model does not
  return a clear "no such model", it fails fast and quiet. **Do not downgrade to
  save quota** — a reviewer Neil does not trust costs more than it saves. If Pro
  limits bind, cut the NUMBER of reviews (path filters, skip draft PRs) before
  the quality of one.
  - 💰 **Measured cost, 2026-08-10 — and the cap is now 60, not 20.** A pass over
    a 2-file docs diff ran 216s and **20 turns, exactly the then-`--max-turns 20`
    cap**, at $1.51 equivalent. The cap binding on the easiest possible input is
    why **#110 raised it to 60** and added a prompt rule to write a partial report
    rather than run out silently — a short report is indistinguishable from a
    clean diff. **$1.51 is therefore a FLOOR, not the standing price:** it is the
    cheapest run that will ever happen, and a real `api/` + `components/` review
    can cost materially more. No code PR has been reviewed yet, so the true
    per-review cost is still unmeasured.
  - ⚠ **The Max assumption is NOT confined to two files.** It also lives in
    [`session_reminders.md`](session_reminders.md) (a re-arm doc the SessionStart
    hook surfaces, telling the next session to keep the Fable pin *indefinitely*),
    [`post_beta_roadmap.md`](post_beta_roadmap.md), and
    [`codex-executor/SKILL.md`](../.claude/skills/codex-executor/SKILL.md),
    beside [`.claude/settings.json`](../.claude/settings.json) and CLAUDE.md's
    budget section. Not fixed here — policy, and it needs Neil. **The first
    write of this entry said "only" the two, from a grep over five files. The
    reviewer found the rest. Do not write "only" off a scoped grep.**
- Scoped against overlap: the prompt names CI's deterministic checks (build,
  tsc, vitest, `design:lint`, `check:bundle-leak`, `check:voice-sync`, the
  gate harness, boot smoke) and forbids re-reporting them.
- ⛔ **It cannot review changes to itself, and this is not configurable.** The
  action refuses to run when the workflow file on the PR branch differs from the
  copy on the default branch — GitHub's guard against a PR rewriting the workflow
  to exfiltrate the token. Found on the first live run (2026-08-10): the job went
  **green having reviewed nothing**, because the action skipped cleanly and the
  post step swallowed the missing report. Two consequences, both permanent:
  1. **A PR editing `claude-review.yml` always needs a human reviewer.** There is
     no version of this that self-reviews. ⚠ **Whether a PR touching only
     `ci.yml` still gets reviewed is UNTESTED.** The error names *the* workflow
     file, singular, which reads as the one being executed — so it probably is
     reviewed — but nothing here has proven that, and an earlier version of this
     entry stated the broad claim as fact. Treat any `.github/workflows/` PR as
     needing human eyes until one is observed getting reviewed.
  2. **The reviewer only starts working once the workflow is merged to `main`.**
     Its first real review is the NEXT PR, never its own.
  Fixed by making the absence loud: the post step now writes a "NOT reviewed"
  sticky comment instead of returning quietly. A green check that means *nothing
  ran* is the same unread-channel failure as Tier 0b's 20 emails, rebuilt from the
  inside — silence must never be indistinguishable from a clean bill.
- Kill switch: delete the workflow file, or delete the
  `CLAUDE_CODE_OAUTH_TOKEN` secret (which returns it to a clean no-op).
- ⚠ Before editing: run the Tier 0b empty-expression guard. Same file class,
  same trap.

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

## Tier 3 — Nightly regression loop · ✅ live, automatic (v2: adscript + EDL video-attach canary)

Armed 2026-06-30 (Loop Engineering / Move 1). A cloud-scheduled GitHub Action
runs the live Gemini ad-script regression nightly and surfaces any regression as
a GitHub Issue. The first Grifon loop that discovers its own work and runs while
Neil sleeps — cloud, so it survives the defreezer (local `/loop` can't). Full
SOP: [nightly_regression.md](nightly_regression.md); spec:
[post_beta_roadmap.md](post_beta_roadmap.md) #1.

- Arm: nothing — wired in [.github/workflows/nightly-regression.yml](../.github/workflows/nightly-regression.yml)
  (`cron '0 18 * * *'` ≈ 02:00 PHT + `workflow_dispatch`). Schedule fires from
  `main` only; test on a branch via dispatch.
- Verifier, two halves, both deterministic (no LLM judge — stable across Gemini's
  stochastic output):
  - **adscript** (`tests/regression/script-gen.regression.test.ts`) — hook/body
    starvation + schema shape.
  - **EDL video-attach canary** (`tests/regression/edl-video-part.regression.test.ts`,
    added 2026-08-14) — ONE `files/*` video part must come back **200, not 429**.
    This is the loop's reason to exist: the EDL went blind for every user for ~2
    weeks and nothing noticed, because no run was attempted and every unit test
    mocks the proxy. A red canary means the editor is going blind again; the issue
    body carries the containment step (`EDL_MAX_ATTACHED_VIDEOS = 0`).
  - ⛔ NOT nightly: the full-cap 10-video probe in the same file, gated separately on
    `RUN_EDL_FULL_CAP`. Ten videos a night is real spend for a question already
    answered by hand (2026-08-14: ten parts → 200). Re-run it manually after any
    change to the cap, the attach path, or the EDL model id.
  - Both run in ONE `vitest` invocation → one `results.json` → one issue. Verified
    live end to end on 2026-08-14: 13 passed, 1 skipped, 62s.
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
| ~~**GRIFON Daily Prod Health Watch** (v1, `trig_019v1jD9L7MMTdrHPXYAc9tE`)~~ | — | ✅ **DELETED 2026-08-07 by Neil in the Routines UI**, together with the ~11 dead `send_later` triggers. The registry is clean again. | — | — |
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
- **📱 2026-08-07 — the mobile app has NO Routines UI. This is a design constraint,
  not trivia.** Neil's phone nav is: New chat · Chats · Projects · Artifacts · Code ·
  Dispatch — **no Routines entry**. Run history and run transcripts are desktop-only.
  Consequence for every Routine registered here: **on the phone, the push notification
  IS the entire deliverable.** There is no "tap to see details" — a notification that
  says *"check the run for details"* is a dead end on the surface Neil actually reads.
  - **Rule:** a Routine's final message must be self-sufficient — the finding, where it
    is, and the one-line action, all in the notification body. Never defer detail to a
    run log the reader cannot open.
  - This also retires a wrong assumption baked into the earlier reader debate: silence
    was treated as *possibly* "he'll see it in the UI later." He will not, on mobile.
    Push delivery is not a convenience path here; it is the only path.

- **🔴 2026-08-07 — and it immediately earned its keep. Two ERROR-level findings
  beyond baseline, both now CLOSED same-day:**
  1. **`public.run_cogs` and `public.run_attribution_anomalies` are SECURITY
     DEFINER views.** They execute with the *creator's* permissions, bypassing
     the querying user's RLS on the underlying tables. If they read
     `producer_runs` / `ad_performance`, they can expose **cross-user** data
     regardless of RLS. ✅ **FIXED same day** (`9a13838`) — it was NOT deliberate:
     `anon` (the key that ships in the browser bundle) held SELECT, and 5 rows
     carrying `user_id` were provably readable by `anon` before the fix. Migration
     `harden_telemetry_views_security_invoker` + `supabase/events.sql`; anon now
     denied, service_role unaffected, ERROR advisor gone.
     [Supabase lint 0010](https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view)
  2. **Duplicate index on `public.funnel_leads`** — ✅ **FIXED 2026-08-07.**
     `funnel_leads_client_created` and `funnel_leads_client_created_idx` were
     byte-identical btrees on `(client_id, created_at DESC)`, neither backing a
     constraint. Dropped the **`_idx`** one — it was created out-of-band and is
     **not** in [`supabase/funnel_leads.sql`](../supabase/funnel_leads.sql), so
     keeping the repo-declared name leaves that file the source of truth
     (migration `drop_duplicate_funnel_leads_client_created_idx`). Re-ran the
     performance advisors: **baseline only, `duplicate_index` gone.**
     [Supabase lint 0009](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index)
     - **Tie-breaker rule worth reusing:** when two objects are truly identical,
       drop the one the repo does NOT declare. That converts an arbitrary
       coin-flip into a rule that keeps committed SQL and live schema converging.

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

- **✅ 2026-08-07 — the CI read is VERIFIED WORKING, and the verification changed the
  prompt.** The 4:22 PM manual run (`cse_01HF89mF4kX1ZxLqL9Do3tR9`) reported
  `CI / main: Green. Latest main CI run … is SUCCESS … No open ci-red issue`. But read
  *how* it got there, because that is the real finding:
  1. It tried `gh` first, as instructed, and found **`gh` is NOT installed in the cloud
     environment**. (It then mis-attributed this to the defreezer by reading NOW.md's
     `gh` note — which is about the cafe PC, not the cloud env. A monitor reasoning from
     the repo's *local* setup notes about its *own* environment is a subtle trap.)
  2. The fail-safe held exactly as designed: it said **"CI status unavailable"** and did
     **not** assume green. That clause is the whole reason a wrong tool choice degraded
     visibly instead of silently.
  3. It then self-recovered — *"`gh` CLI isn't installed, but the GitHub MCP tools are
     available"* — and pulled real CI status through those.
  - **Step 3 is luck, not design.** A different run, or a terser model, stops at step 2
    and reports "unavailable" forever while CI is fine — a monitor that cries wolf gets
    ignored, which is the Tier 0b reader failure rebuilt from the other direction. So
    the prompt now **names the GitHub MCP tools as the path and states `gh` is absent**,
    making the working path deterministic instead of rediscovered nightly.
  - **Generalised rule:** when a Routine's tool choice is a guess, the run that proves
    it works is also the run that tells you to stop guessing. Fold the discovered path
    back into the prompt the same day, or the next model change silently un-discovers it.

  <details><summary>Paste-ready v2 prompt (Health Watch, CI + Vercel + Supabase, baseline-aware, quiet-when-clear) — verbatim = deployed, updated 2026-08-07 (post-verification)</summary>

  ```
  You are the production health monitor for GRIFON COMMAND (React/Vite/TS on
  Vercel, Supabase backend; repo yopiheart/grifon-command). Run a daily
  READ-ONLY health check. Your final message is the deliverable; it is delivered
  to Neil as a phone push notification, and **the phone has no Routines UI** — he
  cannot open the run log. So the message must stand alone: finding, where, and
  the one-line action, all in the text. Never write "see the run for details".
  Make issues loud and all-clear runs quiet.

  1. CI / `main` health. **`gh` is NOT installed in this environment — do not try
     it, and do not reason from NOW.md's `gh` note (that describes Neil's local
     PC, not here).** Use the **GitHub MCP tools** against repo
     yopiheart/grifon-command to get:
       - open issues with the label `ci-red`
       - the conclusion of the most recent CI workflow runs on branch `main`
     An OPEN `ci-red` issue means `main` is failing CI right now: report CRITICAL
     and state **how many days it has been open** (from its createdAt) — that
     number is the point. A `failure` conclusion on the newest `main` CI run is
     the same signal. Only if the GitHub tools are ALSO unavailable, put "CI
     status unavailable" in the headline — never assume green.
  2. Vercel (teamId team_3t7oOfo3QPnPMHaCqEKtrCQS, projectId
     prj_TaZpp0I0x0nyOmWE4XvzGmglXtsd): list recent deployments. Flag any
     deployment in the last 24h with state ERROR or CANCELED, and confirm the
     latest PRODUCTION deployment is READY. Production not READY = CRITICAL.
  3. Supabase (project_id varoqxjccqmskzeejagn): run get_advisors for BOTH
     security and performance.
  4. Compare against the ACCEPTED BASELINE (workflows/loops.md Tier 6, as of
     2026-08-07): 3 security WARNs (handle_new_user SECURITY DEFINER executable
     by anon + authenticated; leaked-password protection disabled), 5
     auth_rls_initplan perf WARNs, RLS-enabled-no-policy INFOs on the
     service-role telemetry tables, unused-index INFOs. These are KNOWN — never
     report them as new ("baseline unchanged" is enough). Two items were FIXED on
     2026-08-07 and must NOT reappear: the run_cogs / run_attribution_anomalies
     SECURITY DEFINER views, and the funnel_leads duplicate index. If either
     returns, that is a REGRESSION — report it as CRITICAL.
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

---

## Tier 0d — Artifact anchor check · ✅ LIVE, automatic (wired 2026-08-26, Neil's call)

**Arm:** automatic — the `artifacts` job in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml),
on every PR and every push to main.
**Local equivalent:** `npm run check:artifact-anchors`
**Verifier:** [`tools/artifacts/check-anchors.mjs`](../tools/artifacts/check-anchors.mjs) rebuilds
every anchored twin, then `git diff HEAD --exit-code` on each.

⛔ **`HEAD` is load-bearing — never drop it back to a bare `git diff`.** Bare `git diff` compares
the INDEX to the working tree, and the builder writes the twin *before* the diff runs. So once
the twin is staged the rebuild reproduces the staged bytes and the check exits 0 whatever moved.
Reproduced 2026-08-26: move a call site, run (exit 1, correct), `git add` the twin, run again ->
**exit 0**. A dev doing `git add -A` then re-running as a pre-commit sanity pass would get a
green light on a citation that silently changed — the exact outcome this tier exists to prevent,
arriving through the run a human is most likely to make. Found by the PR #118 reviewer.
**Kill switch:** delete the `artifacts` job, and drop it from `main-status`'s `needs`.

An explainer that cites `foo.ts:412` is wrong the moment a line is inserted above it, and a
confidently-wrong page is worse than no page. `tools/artifacts/build-eli5-image-gate.mjs`
resolves all five of its citations from unique anchor strings and throws when an anchor is
missing or ambiguous.

Before this job nothing rebuilt it — verified 2026-08-26: no artifact builder was referenced
from `package.json` or from any file in `.github/workflows/`. The guarantee was real *per
rebuild* and absent *per commit*, while `CLAUDE.md` told the reader a build would catch it.

Proven, not assumed: inserting one blank line above the `if (deps.checkSceneImage)` anchor
moved the citations 1592 -> 1593 and 1613 -> 1614 and the check exited 1; reverting returned
exit 0.

**It is in `main-status`'s `needs`** alongside `verify` and `e2e`. Leaving it out would have
recreated that job's own founding failure in miniature: the signal exists (the job goes red)
but reaches nobody, so a merged refactor leaves the published page citing a line that moved.

### Two design constraints — reread before changing this

1. **No `npm ci`, no git history.** The builder imports only `node:` builtins plus
   `./_gates.mjs`, so the job is checkout + node + run, in seconds. That cheapness is why it
   can gate every PR. Verified 2026-08-26 by running the builder in a bare directory with no
   `.git` at all: exit 0, byte-identical twin.
2. **⛔ Never make the page depend on git history.** A draft stamped it with
   `git log -1 --format=%cs` over the cited sources. That needs `fetch-depth: 0` (a ~1.5 GB
   repo), and worse, ANY later commit to `producerOrchestrator.ts` would flip the stamp and
   turn this job red on every unrelated PR — paging `main-status` over a date string, which is
   precisely the noise that job exists to remove. The stamp was dropped instead: CI enforcing
   freshness is what a "last changed" date was for, so once this job existed the stamp was
   redundant. The page now depends on the cited files' CONTENT alone.

### Adding another anchored artifact

Add it to the `ANCHORED` list in [`tools/artifacts/check-anchors.mjs`](../tools/artifacts/check-anchors.mjs) —
one place, with the joining rule written beside it. The script name `check:artifact-anchors`
reads as repo-wide but covers exactly that list; that gap is why the list lives in a commented
file instead of an uncommentable `package.json` one-liner (PR #118 review, nit 3).

Keep the no-deps rule: builders needing `sharp` or funnel fonts (e.g. `build-gb-001-brief.mjs`)
must NOT join, or an unrelated PR starts failing on a missing dependency.
