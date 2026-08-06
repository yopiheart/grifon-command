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
- `SFX_V2_ENABLED` — `'true'` enables seeded per-ad SFX variant rotation in the final render ([api/_lib/renderFfmpeg.ts](api/_lib/renderFfmpeg.ts)); anything else = legacy static bank. CLASSIC never rotates regardless of the flag.
- `IMAGE_GATE_ENABLED` **+ `VITE_IMAGE_GATE_ENABLED`** — the P4 scene-image gate. **BOTH must be exactly `'true'`**; either absent = fully dark (pre-P4 behavior). The server flag is read at runtime ([api/gemini/image.ts](api/gemini/image.ts) → 503 when off); the client flag is **build-time**, baked into the bundle by `gateDepsFor` ([services/producerDeps.ts](services/producerDeps.ts)) — **changing it on Vercel does nothing until you redeploy.** ⚠ Asymmetric partial state: client-on + server-off wires the *deterministic* `checkSceneImage`, which HARD-FLAGS scenes and drives the only automated reroll, while the AI gate silently 503s. Set both or neither. Flag-ON preconditions are discharged (metering redesign 2026-07-23; live smoke 2026-07-24 — re-run `RUN_IMAGE_GATE_SMOKE=1` after any `sceneImageModel` change).
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
- **[agent_lessons.md](agent_lessons.md)** — distilled standing rules from real mistakes. Read at session start. When something goes sideways: prefer encoding the lesson as a **verifier** (hook, test, lint, skill checklist step) over prose; write the full story in [workflows/agent_lessons_archive.md](workflows/agent_lessons_archive.md) and only the durable rule in the live file. Behavioral rules go *there*, not in this file.
- **`.claude/skills/grill-me/`** — invoke before writing any non-trivial PRD or refactor plan. Forces interview-style alignment so the AI doesn't outrun its headlights.
- **`.claude/skills/ubiquitous-language/`** — re-run when domain concepts shift or new modules are added; updates `UBIQUITOUS_LANGUAGE.md` in place.
- **`.claude/skills/verify-changes/`** — run the verification loop (build, test, smoke) after any edit to `api/`, `services/`, `components/`, or `App.tsx`, and before reporting a task as complete.
- **`.claude/skills/surgical-edit/`** — invoke before any edit. Match the scope of the change to the scope of the request. Hard rules for `services/geminiService.ts` and `api/_lib/` live here.
- **`.claude/skills/director-smoke/`** — **MANDATORY before driving the Director AI wizard end-to-end as a smoke/manual test** (or generating a full N-scene ad to exercise downstream pipelines like Signal Modulator / AI Editor / FINAL_RENDER). Enforces hero-image-FIRST, Market Research before Director, and **never manually typing brand/offer fields** (they must auto-prefill from Market Research). Do NOT click "Start with Director" for a test without loading it first.
- **`.claude/skills/viral-autopsy/`** — invoke when Neil drops a social video/ad (URL or file) to analyze why it works. Runs `tools/analyze_video.py` (Gemini watches the video), appends an evidence-bound entry to `workflows/viral_swipe_file.md`, and optionally remixes findings via `grifon-cmo`. Never edits tuned prompts — proposals are gated behind ≥3 corroborating videos.
- **`.claude/skills/static-autopsy/`** — invoke when Neil drops a static image ad (or a folder of them) to analyze why it works. Runs `tools/analyze_ad_image.mjs` (Gemini vision decodes the still), commits the compressed source to `assets/ad-swipe/`, appends an evidence-bound entry to `workflows/static_ad_swipe_file.md`, and optionally remixes findings via `grifon-cmo` / `grifon-creative-director`. Never edits tuned prompts — template implications are gated behind ≥3 corroborating ads.
- **`.claude/skills/grifon-ad-strategist/`** — the senior paid-ads media buyer. Runs/optimizes Meta ads via the **Meta Ads CLI** (`pip install meta-ads`) and TikTok by hand, to 2026 Andromeda best practice. **Never spends autonomously** — reads insights freely but drafts every spend command for Neil to fire. Logs every campaign to `workflows/ad_performance_ledger.md` (≥3-corroboration gate, same pattern as the Swipe File) so it learns over time. Pairs with `grifon-cmo` (offers/hooks) and `grifon-creative-director` (creatives).
- **`.claude/skills/ai-editor/`** — the Omni Flash + FFmpeg editing lab and preset foundry. Invoke when Neil wants a Grifon marketing video edited, an editing preset tested/validated, or drops a viral video to COPY as an editing style. Preset registry + verbatim source workflows: `workflows/omni_edit_presets.md`; tool: `tools/omni_edit.py`. Paid calls ~$0.10/sec, all gated (`--dry-run` approval → `--yes` → `--budget`). Never edits TUNED files; product-shipping goes through Gated Proposals. NOT viral-autopsy (pattern analysis) and NOT the product's AI Editor screen.

- **`.claude/skills/funnel-autopsy/`** — invoke when Neil drops a live landing-page/funnel URL to decode. Evidence-bound teardown (section walk, verbatim copy, form anatomy, dummy-data post-opt-in walk via `smoke-tester`, Meta Ads Library ad→LP mapping) appended to `workflows/funnel_swipe_file.md` (F-entries / L-patterns, same gates as static-autopsy). NOT for image ads (static-autopsy) or building our own (funnel-forge).
- **`.claude/skills/funnel-forge/`** — invoke to build+ship a lead-gen funnel from `funnels/_template/` (config-driven Vite MPA, leads → Supabase `funnel_leads`, Vercel deploy). The repeatable client rep: market research → offer (grifon-cmo) → per-client DESIGN.md → config+copy → brand-check → smoke → deploy → live lead test, with 3 Neil gates. Proven on `grifon-starter` (2026-07-29, live). Hard-won build rules (ESM `.js` imports, env-paste discipline, self-hosted fonts, email hand-off) are in the skill — read them before any funnel work.

**User-invoked skills (summon by name — `disable-model-invocation: true`, they will NOT auto-fire):** `grill-me`, `ubiquitous-language`, `viral-autopsy`, `static-autopsy`, `funnel-autopsy`, `funnel-forge`, `ad-recon`, `growth-debrief`, `retargeting-briefs`, `ai-editor`, `fable-mode`. These are deliberate, on-demand tools, so they're kept off model-invocation to cut passive context load and remove mis-fire risk — invoke them explicitly (`/grill-me`, `/viral-autopsy`, etc.) when you want them.

All smoke tests must be delegated to the `smoke-tester` subagent (defined in [.claude/agents/smoke-tester.md](.claude/agents/smoke-tester.md)).

If a planning conversation introduces a new domain concept not in `UBIQUITOUS_LANGUAGE.md`, propose adding it before writing code.

## Language Register — reply in Neil's register

**When Neil writes in Tagalog/Taglish, reply in Taglish.** Not deep translated Tagalog — his
register. The full spec is [.claude/skills/_shared/taglish-voice.md](.claude/skills/_shared/taglish-voice.md);
read it before writing any *copy* (ad, post, caption, page, script). For ordinary chat
replies, four rules:

1. **Tagalog frame, English only in the carve-outs.** Verbs, connectors and pronouns are
   Tagalog; English is reserved for (a) brand/institution names, (b) prices and numbers,
   (c) borrowed verbs inside a Tagalog frame (`i-confirm`, `mag-book`), (d) nouns Filipinos
   genuinely say in English (septic tank, truck, schedule, receipt). **Don't chase a ratio**
   — the old "50/50" framing was a symptom, not the rule, and it led to swapping perfectly
   good Tagalog for English. See the **LANGUAGE LOCK** in `taglish-voice.md`, ported from
   the TUNED formula in `api/_lib/prompts.ts` (Neil pointed at it: *"ganun ung gusto ko"*).
2. **The enemy is MANUAL-Tagalog, not Tagalog.** If a person wouldn't say it out loud,
   replace it — and the replacement is sometimes English, sometimes just simpler Tagalog.
   Pick the word a person would *speak*, never the language. ⛔ `datos`, `detalye`,
   `rehistrado`, `awtomatiko`, `kumpirmahin`, `napagkakasunduan`, `naitatala`, `pahintulot`,
   `naka-imbak`, `naserbisyuhan`, `opisyal`, `kalibrasyon`, `pananagutan`, `humaharang`,
   `samakatuwid`, `gayunpaman` → ✅ `data`, `info`, `registered`, `automatic`, `i-confirm`,
   `nagkakasundo`, `naka-save`, `consent`, `naka-store`, `na-service`, `official`, `testing`,
   `sagot namin`, `blocker`, `kaya`, `pero`. **A pure-Tagalog sentence is not automatically
   wrong** — the KM-003 hook is pure Tagalog and is the best-performing line we own.
3. **No em dash. No apostrophes in contractions** — `nyo`, `yun`, `yan`, `to`, `wag`, `di`.
4. **Calm expert, not excited salesman.** No emoji stacks.

⚠️ **Internal dashboards and artifacts are NOT exempt** — Neil reads them on his phone.
This rule exists because the agent kept drifting into literary Tagalog; his verdict on the
KM-003 dashboard was *"sakit sa mata basahin."*

Enforced by [.claude/hooks/taglish-guard.sh](.claude/hooks/taglish-guard.sh) (`UserPromptSubmit`),
which now has **two triggers** (widened 2026-08-02): ≥2 distinct Tagalog markers in the prompt
(→ reply in register), **and** any copy/sales/marketing noun in *any* language — `copy`,
`caption`, `script`, `headline`, `landing page`, `funnel`, `post`, `CTA`… (→ run STEP 0, then
the LANGUAGE LOCK). The second trigger exists because copy is usually *requested in English*,
so the old hook stayed silent at exactly the moment the spec was needed. Fail-open — it never
blocks a prompt. This file is the durable half; the hook is the automatic half.

**Copy inside a funnel is also gated at build time** by `funnels/*/scripts/lint-voice.mjs`
(wired to `prebuild`). It scans `src/` **and** `public/` **and** the root HTML — the blind spot
that let a whole deep-Tagalog page ship on 2026-08-02 was *scope*, not the word list. When
customer-facing copy moves into a new location, add that location to the walker in the same commit.

## Context Hygiene

LLM reasoning degrades sharply past ~100k tokens of context. Treat the conversation window as a budget.

- **Prefer `/clear` over `/compact`** when the current thread has wandered. Compaction keeps the model in a degraded state; clearing returns it to a fresh, smart baseline.
- **Use `/btw` for throwaway side questions** — the answer lands in a dismissible overlay and never enters conversation history, so a quick check doesn't spend the context budget.
- **The resume doc is [`NOW.md`](NOW.md)** (root, one screen, stamped) — read it first, before any workflow file. When you `/clear`, `NOW.md` plus this `CLAUDE.md` and `UBIQUITOUS_LANGUAGE.md` are enough to resume work — no need to re-explain context. `workflows/launch_readiness.md` is the **scoreboard** (what's left before paying users), not the resume doc; it was serving both jobs and rotted into a three-deep pointer chain (2026-08-01). The SessionStart hook prints NOW.md's next action automatically and flags it as unverified past 5 days. **Rewriting `NOW.md` — overwrite, never append — is the last action of any session that changed the state of the work.**
- **After exploring `services/geminiService.ts`** (91 KB), the smart zone is largely consumed. Finish the current task or summarize findings to a workflow file *before* taking on a second large exploration in the same session.
- **Never drive playwright MCP tools in the main conversation.** Every browser session (smoke tests, brand-check screenshots, manual verification) is delegated to the `smoke-tester` subagent, spawned in the **foreground** (background agents auto-deny permission prompts — see agent_lessons 2026-06-10). Page snapshots are 10–50k tokens each and stay in context for the rest of the session; inside a subagent they die with it and only findings return. Playwright results were 50% of Neil's plan usage as of 2026-06.
- **Usage budget (Max 5x) — quality first; per-role model allocation (all per Neil, current state as of 2026-07-24; policy history in git).** Fable 5 is permanently included in Max plans at 50% of limits, resetting weekly. If `/usage` shows the Fable allowance at 100% mid-week, run the rest of the week on **Opus 5** via `/model` — no pin flip needed. Roles:
  - **Fable 5** (`claude-fable-5`, pinned in `.claude/settings.json`) — the main loop: planning, orchestration, verification/review of executor diffs. Whenever the main loop runs on Opus/Sonnet instead (e.g. Fable allowance exhausted), `/fable-mode` loads Fable's working discipline as the quality hedge.
  - **Opus 5** (`claude-opus-5`) — the `code-executor` subagent ([.claude/agents/code-executor.md](.claude/agents/code-executor.md)). **Hard rule:** implementation of an approved non-trivial plan (multi-file or multi-step edits to `api/`, `services/`, `components/`, `App.tsx`) MUST be delegated to `code-executor` with a full brief (plan file path or inline spec + acceptance criteria — it has no conversation context). Tiny edits (one-liners, docs, config tweaks) stay in the main loop, where delegation overhead would cost more than it saves.
  - **GPT 5.6 Sol via Codex CLI bridge** (`.claude/skills/codex-executor/`, adopted 2026-07-24 — see `workflows/codex_executor_trial.md`) — the **default** executor lane for **mechanical, spec-tight briefs** (api/ handlers, type plumbing, refactors with clear acceptance criteria, test writing). Billed to the ChatGPT plan — zero Claude quota. UI-heavy / DESIGN.md-touching / ambiguous briefs stay with `code-executor`. (Trial verdicts were vs the Opus 4.8 executor baseline; Opus 5 raises that bar — watch the next few runs.) Fallback is deterministic: wrapper exit 10/11/12 (Codex missing / not logged in / Sol limit hit) → dispatch the SAME brief to `code-executor`; on mobile/remote sessions that fallback IS the designed path. **Sol never reviews Sol's diffs** — executor-diff review stays in the Claude main loop (builder ≠ reviewer). On Claude-authored high-risk diffs only, Sol may run as an advisory-only second lens (gated trial, `workflows/sol_advisory_review_trial.md`); the Claude main loop remains the deciding reviewer. Cafe-PC only; re-arm via `scripts/restore-codex.ps1`.
  - **Sonnet 5** — the `smoke-tester` subagent (Playwright was ~50% of historical usage; it now burns at Sonnet rates).
  - **Executor attribution (convention, since 2026-08-02).** When the main loop commits a reviewed executor diff, it stamps a git trailer above the `Co-Authored-By` line: `Executor: codex-sol` | `code-executor` | `main-loop`. The executors never commit, so the main loop is always the one stamping. This is what makes the reopenable Sol gate measurable — `workflows/codex_executor_trial.md` adopted the lane against an **Opus 4.8** baseline and `code-executor` now runs Opus 5, and without the trailer that re-scoring runs on memory, which the defreezer eats. Read it with `node tools/executor_ledger.mjs [--since=YYYY-MM-DD]`: commits, churn, and follow-up-fix rate per lane. **Baselines measured 2026-08-02** (untagged history, follow-up = a `fix(`/`revert` within 5 commits touching the same files): **15%** since 2026-07-01, **25%** since 2026-07-24 — use the 25% figure for the Sol-vs-Opus-5 comparison, since that's the window the new baseline actually covers. A lane materially above it is carrying review burden, which is the trial doc's DROP criterion. Below ~3 tagged commits per lane it's an anecdote; the repo's ≥3-corroboration bar applies here too.

  This pin + frontmatter split is the only supported auto-routing (there is no `fableplan` composite setting and hooks can't switch models), so delegation is enforced by this rule, not the harness. **Never downgrade the main model to save tokens** — savings come exclusively from the zero-quality-cost levers: subagent delegation (above) and `/clear` between unrelated tasks — 80% of historical usage burned at >150k context, where reasoning is also degraded, so context hygiene saves tokens AND improves output. There is no auto-pause or usage-threshold auto-switch; check `/usage` at the start of a heavy session. Drop to `/model sonnet` only if Neil explicitly asks.
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

## Artifact Reporting

Claude Artifacts — private claude.ai-hosted pages published from sessions via the Artifact tool — are the preferred delivery format for review/eval/debrief outputs (decided with Neil 2026-07-18). They survive the defreezer and are phone-readable, unlike `.tmp/` outputs or raw repo markdown. Workflow layer only — NOT a product feature; nothing in the app codebase integrates with Artifacts.

- **Offer an artifact** when the output is: an eyeball-gate review (eval image pairs, Slice-B grading), a session/launch dashboard, a growth-debrief or ledger report, a swipe-file gallery, a UI mockup before dispatching `code-executor`, or PR-review findings. Quick answers stay in chat.
- **Reuse URLs — don't mint new ones.** Redeploy the same file path in-session, or from a fresh session pass the registered URL as the Artifact tool's `url` param (`action: "list"` rediscovers them). Registry:
  - **Launch Readiness dashboard** — `https://claude.ai/code/artifact/8821822a-06e0-484d-ba94-2e83d565e1a0` — refresh from `workflows/launch_readiness.md` after each major session.
  - **Kuya Marvin Messenger cheat sheet** — `https://claude.ai/code/artifact/3c5a2aec-2c71-4866-b454-8a57530025de` — the 3 reply scripts + tone rules Neil uses live while answering Oceanides ad inquiries; source of truth is `clients/oceanides/kuya-marvin/ads/NEXT-SESSION.md`.
  - **One Hook, Twelve Worlds (Brunson teardown)** — `https://claude.ai/code/artifact/6a32f03b-89af-4a98-a207-55e904b499c9` — the S34/S35 static-autopsy teardown (E82–E93) + the Grifon port + the 8 production worlds. Source of truth is `workflows/static_ad_swipe_file.md`; refresh when another brand corroborates S34 and GP-6 moves toward `proposed`.
  - **Grifon Session Dashboard** — `https://claude.ai/code/artifact/adbf6084-cc8d-436c-9ec4-84be839099d3` — state of the *Grifon repo itself* while it's parked: open issues, every branch ahead of `main`, the executor ledger. Rebuild via `node tools/artifacts/build-grifon-session.mjs` (twin: `artifacts/grifon-session.html`). Branches + ledger are computed live from git; the issue list is a hand-refreshed snapshot at `tools/artifacts/data/grifon-session-issues.json` (regeneration command is inside it). Refresh at the start of any session that returns to Grifon.
  - **Grifon Funnel Review (F01–F06 vs our landing)** — `https://claude.ai/code/artifact/c064e718-e311-40a9-aa01-9af81f63e350` — GOAT funnel patterns held against the Grifon landing: matched / add / fix + the run sheet. Rebuild via `node tools/artifacts/build-funnel-review.mjs` (twin: `artifacts/grifon-funnel-review.html`); sources of truth are `workflows/funnel_swipe_file.md` + `components/landing/*`. Refresh when run-sheet items land.
  - **All other Oceanides artifacts** (live KM-003 campaign dashboard, page-launch run sheet, consent walkthrough) are registered in [clients/oceanides/DESIGN.md](clients/oceanides/DESIGN.md) — that file, not this list, is their registry. It also carries the three hard-won `mcp`-capability lessons (call `callTool` with the connector's **display name**, not the `mcp__<segment>__` prefix; make `callTool` the primary path because `watchTool` can be refused; always render the error `code` on screen) — read them before building any live-data artifact.
- **Design is automatic** — the harness auto-loads design guidance; artifacts for Grifon internal tooling follow DESIGN.md's visual world (zinc-950 canvas, Grifon Gold `#FFCC00`, glass panels, `// LABEL` terminal styling). Neil never needs to specify styling unless he wants a specific look — his words then win.
- ⚠️ **"Grifon-project" is literal — client work has its own system.** Anything under `clients/<name>/` follows that client's `DESIGN.md`, and the NOIR rule below does **not** apply to it. For Oceanides / Kuya Marvin the correct world is [clients/oceanides/DESIGN.md](clients/oceanides/DESIGN.md): matte **navy + amber** print, **no glass, no charcoal, no `#FFCC00`** — the exact opposite of NOIR on every axis. Cost a full artifact rebuild on 2026-07-28 because this carve-out wasn't written down; the rule below reads as universal and isn't.
- **NOIR treatment is the standing default for Grifon-project artifacts** (Neil, 2026-07-22): the look of [assets/grifon-social/noir/](assets/grifon-social/noir/) — charcoal radial ground `radial-gradient(#131316 → #09090B → #070708)` with a faint gold ambient glow (`rgba(255,204,0,.06)`) and film grain (SVG turbulence, `opacity .15`, screen blend); silver-gradient 900-weight uppercase display (`#F4F4F5 → #71717A` background-clip), gold italic serif for the emphasis line (Instrument Serif w/ `text-shadow` gold bloom), `// EYEBROW` in JetBrains Mono gold `letter-spacing .32em`, dim mono `GRIFON` signature at the foot; plus **liquid-glass panels** (translucent `backdrop-filter: blur` cards) for any UI chrome. DESIGN.md typography rules apply. Target feel: premium, billion-dollar, stands out. Fonts must be inlined or system-stack fallbacks (artifact CSP blocks font CDNs). **Mobile-safe implementation (MANDATORY — Neil views artifacts on his phone; bit us TWICE on 2026-07-27):** treat the Android WebView as the primary renderer. Known breakages + required patterns: (1) `background-attachment: fixed` detaches → put the radial ground on a `position:fixed; inset:0; z-index:0` DIV over solid `#070708` `html`/`body`; (2) a naked fixed-position `<svg>` filter element paints as a cut-off rectangle → grain is a **tiled data-URI SVG background-image** (`background-repeat:repeat; background-size:240px`) on its own fixed DIV; (3) `backdrop-filter` is unreliable → liquid-glass must be DESIGNED to work without it (layered sheen gradients + inner top-edge highlight + edge lighting + shadow), keeping `backdrop-filter` as progressive enhancement only; (4) `text-shadow` does not render on `background-clip:text` transparent text → use `filter: drop-shadow()` for glow on gradient type, and keep clipped-gradient ranges bright enough to read on charcoal. **Measured floors (contrast-audited on the charcoal ground 2026-07-29, ratios are computed not estimated — supersedes the earlier "~`#A1A1AA`" guidance):** clipped-gradient dark stop ends at **`#C4C4CB` (10.8:1)**, because on a 3-line heading line 3 lands on that stop and `#A1A1AA` (7.3:1) visibly reads as fading out; small mono captions/meta at 9–12px use **`#9A9AA3` (6.7:1)** — `#71717A` is **3.89:1 and fails even AA**; a semantic warning/flag hue at that size uses **`#FF8563` (7.9:1)**, not a mid red like `#E0563A` (4.98:1). Gold `#FFCC00` measures **12.4:1** and is never the contrast problem — (5) when gold type looks weak, the cause is the **glow radius, not the color**: a wide `drop-shadow` haze around already-high-contrast type softens the letter edges. Hug it in (≈9–14px, slightly higher alpha) — tighter reads as *more* gold **and** crisper at once. (5) ⛔ **`background-clip:text` + `color:transparent` is BANNED in artifacts** (caught on Neil's real phone 2026-07-29, third mobile miss). The Android WebView the Claude app renders artifacts in mispaints clipped-gradient text — every clipped heading came out **inverted and far darker than either gradient stop**, while every SOLID-colour element on the same screen (gold eyebrow, gold italic serif, body, mono captions) rendered perfectly. **So the "silver-gradient display" above is a DESKTOP-ONLY look — in artifacts, display type is a solid near-white (`#F5F5F7`, 17.3:1) with the gold bloom as a plain `text-shadow`** (text-shadow is unreliable on clipped text but rock-solid on solid text). Don't try to patch the clip; remove it.

**Delivery gate: before handing Neil any Grifon artifact URL (new or redeployed with visual changes), spawn `smoke-tester` to open the local HTML at a 390×844 viewport and screenshot it; eyeball for continuous ground, visible glass, and luminous display type. No mobile screenshot = not done.**
⚠️ **Know what that gate CANNOT do.** It is a *viewport-size* check in headless Chromium — it emulates the screen, not the engine. Chromium supports `background-clip:text`; the WebView mispaints it, so the gate **passed a page Neil's phone rendered wrong** (2026-07-29). It catches layout, overflow, missing assets and dark-ground breakage; it does **not** prove any CSS feature paints correctly on a real device. The defence is not more screenshots — it is **not depending on fragile features in the first place** (rules 1–5 above). When a look genuinely needs a risky property, ship a solid-colour default and treat the effect as pure enhancement, then let Neil's own eyeball on the live URL be the final gate.
- ⛔ **"Anyone with the link" will NEVER work on this account — don't retry it, and don't republish trying to fix it.** Root cause found 2026-07-29 in [Anthropic's own docs](https://support.claude.com/en/articles/9547008-publish-and-share-artifacts): *"Artifacts created on Team or Enterprise accounts can only be shared within your organization—they cannot be published publicly."* Neil's artifact URLs carry an `?org=<uuid>` parameter, i.e. a Team/Enterprise account, so public publishing is blocked **by policy, not by a bug**. The error it throws — *"This version can't be shared publicly. Publish a new version or change the shared version, then try again"* — is misleading: neither suggested remedy can ever succeed, and two rounds of both were burned before the docs were checked. **The supported path is org sharing:** `Only people with access` + add teammates in the same workspace (also verify Settings → Capabilities → "Code execution and file creation" is on, a publishing prerequisite). When someone outside the org needs it, that's what the standalone twin below is for. **Check the docs before the third retry of anything platform-side.**
- **Every artifact ships with a committed standalone twin (Neil, 2026-07-29 — standing rule).** The claude.ai share button is not a dependable delivery path (see above). So an artifact is not delivered until its self-contained HTML also exists at **`artifacts/<slug>.html`**, committed, built by a script under `tools/artifacts/` that regenerates it **from committed sources only** (never a `.tmp/` cache — the defreezer eats it). Because the page inlines every asset, that one file is the share mechanism: Neil sends it over Viber/email/Drive and it opens offline in any browser, no sign-in, no link permissions. **The twin is HTML — do not offer a PDF.** One was built and Neil rejected it on sight: *"di rin katulad ng feel kapag totoong na-navigate mo ung artifacts."* Flattening a scrolling, hover-and-swipe page into paged print throws away the thing that made it worth building. The page IS the deliverable, so the twin has to stay a page. Give him **both** the artifact URL and the file path. Keep the source template beside the script so a future session can redeploy in place (pass the existing URL as the Artifact tool's `url`) instead of minting a second URL.
- Constraints: strict CSP (self-contained pages; embed images as data URIs), snapshot-only unless runtime capabilities are enabled (check the `artifact-capabilities` skill first), and never put secrets/keys/tokens in an artifact that might be shared. **The standalone twin makes exposure a real decision, not a click** — a forwarded file spreads exactly as far as it is sent, so pause before putting unshipped strategy in one, and say so when the content warrants it.

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

  Also: `activeJobsService.ts` / `activeJobStore.ts` (async render-job tracking → `ui/ActiveJobsPanel.tsx`), `wizardSessionStore.ts` (wizard draft persistence/resume → `ui/ResumeDraftCard.tsx`), `recentWorkService.ts` (→ `ui/RecentWorkCard.tsx`), `checkoutService.ts` (checkout state). *(`phoneticNormalizer.ts` was listed here until 2026-08-01 but was DELETED in `2e70c5a` on 2026-06-13 — Neil A/B-listened and dropped Taglish respelling entirely; raw script now goes to TTS verbatim. Do not resurrect it: any future TTS text normalization, e.g. the numeral gap in issue #94, needs a fresh decision about where it lives.)*

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
- `workflows/static_ad_swipe_file.md` — the Static Ad Swipe File: decoded still-image ad patterns (persuasion lever + visual DNA), Pattern Index, and gated Image Ads Gen template proposals (e.g. the SaaS Offer/Upsell family). Maintained by the `static-autopsy` skill (images in `assets/ad-swipe/`) with `grifon-creative-director` + `grifon-cmo`.
- `workflows/funnel_swipe_file.md` — the Funnel Swipe File: decoded LIVE lead-gen funnels (section walks, form anatomy, post-opt-in maps, ad→LP mapping) from Suby/Hormozi/Brunson et al. F-entries / L-patterns / FGP gated proposals. Maintained by the `funnel-autopsy` skill; feeds `funnel-forge` builds (every structural choice cites F-/L-IDs).
- `workflows/funnel_deploys.md` — the funnel deploy registry: every `funnels/<slug>/` Vercel project (URLs, env vars, redeploy runbook). Vercel settings aren't in git — this file is how a post-defreezer session relinks.
- `workflows/ad_performance_ledger.md` — the Ad Performance Ledger: compounding database of every paid campaign (Meta + TikTok), North-Star (MER) tracker, Pattern Index, and gated spend-strategy proposals. Maintained by the `grifon-ad-strategist` skill.
- `workflows/growth_loop.md` — spec for the ingest-only data-driven growth loop: pixel + CAPI + telemetry foundation, client-feedback capture, ad-performance ingestion feeding the viral-autopsy/CMO loop, and tier retargeting. Built in phases, Neil-as-approver. Unblocks roadmap Items #7 + #16.
- `workflows/growth_debriefs.md` — the compounding debrief log (Phase 2b): the `growth-debrief` skill reads `ad_performance` + `events` + `feedback` (via `tools/growth_debrief_pull.py`) → ranked "why it won / failed" entries → routes winners into the viral-autopsy/CMO loop (gated). Ingest-only; live entries pending Neil's `ads_read` token.
- `workflows/retargeting_briefs.md` — the compounding brief log (Phase 3): the `retargeting-briefs` skill joins `subscriptions` + `events` + `feedback` (via `tools/segment_pull.py`) → 5 segments → per-segment creative briefs for Neil to build + publish. Roster-export-only (hashed-email CSVs Neil uploads by hand); consent-gated; live briefs pending Phase-0 telemetry + a marketing-consent capture. See `growth_loop_phase3_checklist.md`.
- `workflows/consent_capture_plan.md` — the marketing/retargeting consent capture that gates Phase 3 going live (SHIPPED 2026-06-27, PR #21): resolved grill decisions, Meta Custom Audience compliance constraints (esp. §4 withdrawal→removal), the Slice 1 (code) + Slice 2 (enforcement) plan, and the surface map.
- `workflows/advanced_mode_cleanup.md` — planned: reorganize the 8-step wizard to read as clean as the One-Shot composer (token system, progressive disclosure, less scroll). Has a paste-ready kickoff message for the next session.
- `workflows/concierge_director_plan.md` — **the Concierge / Director-brain initiative.** Two end-user modes (Auto + Concierge, Business-tier) that evolve/replace the 8-step Expert wizard; the "tatawagin ka" architecture truth (production AI = server-side Claude API, NOT the terminal agent); MCP-ready flow layer; the prioritized build order (Phase 0→6 PoC first → gemini-eval → grill-me → build); open decisions for grill-me; and a paste-ready kickoff message. **Open this when resuming the video-ads/Concierge work.**
- `workflows/figma_motion_handoff.md` — SOP for landing Figma Motion designs as `motion@12` React code via the motion-token system (`components/ui/motionTokens.ts`). Owned by `grifon-creative-director`; app UI only, not the generated ad pipeline.
- `workflows/hyperframes_decision.md` — the HeyGen Hyperframes (HTML→MP4) evaluation verdict (2026-07-22, Claude + GPT 5.6 Sol): product renderer = NO (FFmpeg stays frozen), Neil's-own-marketing pilot via `ai-editor` = YES; Omni narrowed to generative-pixel work only. Pilot moves, pass criteria, and guardrails (incl. the "hyperframes" name collision with `believability_dna.md`) live there. Open before any Hyperframes work.
- `workflows/twelvelabs_decision.md` — the TwelveLabs "video memory" evaluation verdict (2026-07-24): YES-narrow — Jockey knowledge store as a workflow-layer video vault + corpus-query assist under the Swipe File's existing gates; product integration = NO, tuned analyzer + render_audit untouched. Pilot runbook (blocked on Jockey connector re-auth), pass gate, and kill switch live there. Open before any TwelveLabs work.
