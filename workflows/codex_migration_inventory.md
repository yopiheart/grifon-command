# Claude Code to Codex migration inventory

## Desktop capability map

The current daily entry point is [codex_desktop.md](codex_desktop.md). This map
describes available entry points and validation boundaries; current task state
and remaining actions stay in `NOW.md`. The older phase-1 tables below are
retained historical context, not current "Pending" verdicts.

| Capability | Desktop implementation | Evidence boundary |
|---|---|---|
| Instructions and continuity | Root/scoped AGENTS.md; desktop runbook; Git branch/PR plus NOW.md | Files discovered; tracked controls travel with Git. Task state and auth do not. |
| All 30 original skills | `.agents/skills`, preserved with platform/path adapters | Full structural inventory and negative tests pass; does not prove every skill's subjective output. |
| Additional Zam skill | `.agents/skills/generate-zam-images` routes to original canonical workflow package | Canonical master and bundled references restored; no identity/prompt rewrite. |
| Executor and smoke agents | `.codex/agents/*.toml`; inherited selected model | TOML parsed; independent migration review and browser smoke performed. |
| Secret/tuned/ad/Veo guardrails | Native Node handler in `.codex/hooks/guard.mjs` | Protocol/Windows deny/allow/cap tests; trusted desktop runtime delivery verified on this PC, with harmless allowed/denied probes. Not every policy path. |
| Startup, language, build and lock checks | Supported SessionStart/UserPromptSubmit/PreToolUse/Stop hooks | Stop checks build only; tests remain explicit. Startup cleanup is report-only. |
| Browser tooling | Built-in browser tools or pinned Playwright MCP in project config | MCP initialize/tools-list passed; eight local Playwright tests passed. |
| Image generation | Native image tool first; optional local CLI adapter | Entrypoint/path/CLI flag checks; no paid generation during migration. |
| Video/ad editing and analysis | Existing tools/scripts and Gemini/FFmpeg/ElevenLabs workflows | Sources restored; bundled ffmpeg runs. Real media/provider calls need exact paid-test approval. |
| Static/viral/funnel research and swipe files | Existing skills and committed workflow libraries | Instruction coverage restored; login/network/provider inputs remain task-specific. |
| Growth and retargeting | Existing Python fixture/export entry points | Growth and segment fixture dry runs pass; no live account writes or roster upload. |
| Artifacts | Local standalone HTML and existing builders/gates; publish only on explicit request | Anchor twin rebuild/check passed; other builders use the asset profile and separate funnel deps. |
| Skills evaluation | Fresh-task manual Codex evaluation; existing aggregation/viewer/package tools | Old Claude subprocess trigger harness fails closed with an actionable message; no automatic trigger-parity claim. |
| Review/CI | Independent Codex critic before merge approval plus existing CI and new check:codex | Legacy Claude reviewer retained behind explicit repository-variable opt-in; no Claude account needed for normal PRs. |
| Cafe setup | `codex-cafe-start.ps1`, readiness, selective asset helper, portable Python option | Windows 5.1 checks and local runtime execution; no global config/secret copying. |

Skill coverage (all retained): ad-recon, ai-editor, artifact-noir, brand-check,
codex-executor, codex-image, director-smoke, eli5, fable-mode, funnel-autopsy,
funnel-forge, gauntlet-loop, gemini-eval, grifon-ad-strategist, grifon-cmo,
grifon-creative-director, grill-me, growth-debrief, img2threejs-lab,
kuya-marvin-ads, marvin-avatar, retargeting-briefs, skill-creator, static-autopsy,
straw-man-audit, surgical-edit, tldr, ubiquitous-language, verify-changes,
viral-autopsy; plus the newly discoverable generate-zam-images alias.

### Hook trust and limitations

Codex does not support the old `permissionDecision: ask` response. The native
gate denies a sensitive call and supplies `APPROVE CODEX HOOK <digest>` for the
user to send after reviewing that exact action. Approval is single-use, bound
to session/cwd/payload and expires in ten minutes. Tuned shell edits must be
expressed as a literal patch. Live ad activation/budget changes remain user-run.
Veo commands additionally require their nearby approved spec, passing preflight
and remaining paid-roll cap. A denial is never permission to switch tools.

On 2026-09-07, all five definitions at `438c651` were reviewed/trusted through
normal Codex controls on this PC. Fresh desktop tasks confirmed SessionStart
guard and report-only sweep launch, allowed/denied PreToolUse probes, Stop
dispatch, and UserPromptSubmit from the actual desktop composer. Verification
task: `01a07ac2-b795-7762-8c46-217f0fb1f539`; final prompt event at 08:00:26 UTC.
This confirms runtime delivery at the tested scope, not every policy path.
Other PCs still require review/trust; local approval/auth state is not committed.
Hooks are not a security sandbox: hosted/specialized tools, write_stdin continuations,
opaque connector names and indirect script behavior can fall outside matching;
local approval state is not tamper-proof. Root policy applies everywhere.
The eight old shell hook copies and original `.claude/` controls are retained;
the native registration invokes only the supported Node adapter.

### Sparse coverage

Baseline HEAD had 2,565 tracked paths: 1,189 present and 1,376 sparse-excluded.
Migration selectively restored 247 instruction/script/template inputs, the 44
wizard files, Zam's missing anchors and 14 Marvin reference inputs. All other
tracked paths remain inventoried by Git, including media intentionally omitted.
Use `tools/codex-assets.mjs` profiles rather than deleting all exclusions.
NOIR reference imagery, the large ad-swipe library, ad clips and per-artifact
dependencies remain on-demand inputs. Root installation does not install
funnel or Python workflow-specific dependencies.

The checked dependency audit remained 15 development findings (9 high, 4 moderate,
2 low), zero production findings. Existing install-script warnings did not block
the tested Vite build, Sharp PNG render or ffmpeg executable. Broad remediation,
prompt audits, duplicate cleanup and new product features are separate work.

## Historical Cloud phase-1 inventory

**Scope:** migration phase 1 inventory only. Existing Claude files and assets
remain in place. Status meanings:

- **Bridged** — the durable rule is present in Codex `AGENTS.md`; the original is
  retained for Claude compatibility.
- **Pending** — inventoried but not yet ported or replaced. Do not assume Codex
  loads or executes it.
- **Retain** — provider-neutral source material that Codex instructions already
  point to; no format migration is required in phase 1.
- **Retire later** — the function is redundant in Codex Cloud, but no file is
  removed in this phase.

## Instruction and control files

| Existing path | Status | Phase-1 disposition |
|---|---|---|
| `AGENTS.md` | Bridged | Codex root instruction source. |
| `api/AGENTS.md` | Bridged | Codex API-scoped instruction source. |
| `components/AGENTS.md` | Bridged | Codex component-scoped instruction source. |
| `services/AGENTS.md` | Bridged | Codex service-scoped instruction source. |
| `tests/AGENTS.md` | Bridged | Codex test-scoped instruction source. |
| `CLAUDE.md` | Bridged | Root architecture, preferences, continuity, tuned rules, and paid-operation rules are in `AGENTS.md`; full skill/artifact detail remains Claude-only. |
| `api/CLAUDE.md` | Bridged | API contracts and tuned prompt boundary are in `api/AGENTS.md`. |
| `components/CLAUDE.md` | Bridged | Component architecture and design constraints are in `components/AGENTS.md`. |
| `services/CLAUDE.md` | Bridged | Singleton patterns and tuned service boundary are in `services/AGENTS.md`. |
| `tests/CLAUDE.md` | Bridged | Vitest, Playwright, ESM, seam, and live-test rules are in `tests/AGENTS.md`. |
| `.claude/settings.json` | Pending | Claude permissions and lifecycle registration do not configure Codex; safety rules are bridged in prose, deterministic enforcement is a later phase. |
| `.claude/output-styles/grifon.md` | Pending | Claude-only output-style registration; evaluate as a Codex response-style instruction later. |
| `.claude/statusline.ps1` | Pending | Windows/Claude status UI; unnecessary for basic cloud setup. |
| `.mcp.json` | Pending | Playwright command uses Windows `cmd`; replace only in a later MCP/browser phase. |
| `.github/workflows/claude-review.yml` | Pending | Claude OAuth/model/action review lane remains active until a later automation phase. |
| `.claude/skills/_shared/pricing-ladder.md` | Retain | Provider-neutral business reference used by marketing skills. |
| `.claude/skills/_shared/taglish-voice.md` | Retain | Root `AGENTS.md` points Codex to this canonical voice reference. |
| `.claude/skills/_shared/thumbnail-law.md` | Retain | Provider-neutral creative reference; skill wiring remains pending. |
| `.claude/skills/_shared/vo-direction.md` | Retain | Provider-neutral voice reference; skill wiring remains pending. |

## Skills

All 30 skill files are retained. “Rule surfaced” means only the critical safety
rule reached `AGENTS.md`; it does not mean the skill is Codex-native.

| Existing skill | Status | Notes |
|---|---|---|
| `.claude/skills/ad-recon/SKILL.md` | Pending | Discovery workflow and Meta tooling need a Codex skill port. |
| `.claude/skills/ai-editor/SKILL.md` | Pending; rule surfaced | Paid-test/spec boundary is in root instructions. |
| `.claude/skills/artifact-noir/SKILL.md` | Pending | Replace Claude Artifact mechanics while retaining standalone HTML gates. |
| `.claude/skills/brand-check/SKILL.md` | Pending; rule surfaced | `DESIGN.md` and mobile smoke requirements are in root/component instructions. |
| `.claude/skills/codex-executor/SKILL.md` | Retire later | Nested Codex CLI delegation is redundant inside Codex Cloud. |
| `.claude/skills/codex-image/SKILL.md` | Pending | Replace local Codex CLI/auth bridge with the available cloud image path. |
| `.claude/skills/director-smoke/SKILL.md` | Pending; rule surfaced | Paid/live smoke restrictions are bridged; full intake workflow is not. |
| `.claude/skills/eli5/SKILL.md` | Pending | Depends on Claude Artifact delivery. |
| `.claude/skills/fable-mode/SKILL.md` | Pending | Working discipline may become general Codex guidance. |
| `.claude/skills/funnel-autopsy/SKILL.md` | Pending | Browser/evidence workflow needs porting. |
| `.claude/skills/funnel-forge/SKILL.md` | Pending | Build/deploy workflow needs cloud-safe gates. |
| `.claude/skills/gauntlet-loop/SKILL.md` | Pending | Builder/critic orchestration needs a Codex equivalent. |
| `.claude/skills/gemini-eval/SKILL.md` | Pending; rule surfaced | Paid/live switches remain off by default. |
| `.claude/skills/grifon-ad-strategist/SKILL.md` | Pending; rule surfaced | No-autonomous-spend rule is in root instructions. |
| `.claude/skills/grifon-cmo/SKILL.md` | Pending | Marketing role and references need a Codex skill port. |
| `.claude/skills/grifon-creative-director/SKILL.md` | Pending; rule surfaced | Design rules are bridged; role workflow is not. |
| `.claude/skills/grill-me/SKILL.md` | Pending | Interview workflow needs a Codex skill port. |
| `.claude/skills/growth-debrief/SKILL.md` | Pending | Read-only data workflow needs credential scoping. |
| `.claude/skills/img2threejs-lab/SKILL.md` | Pending | Tool/runtime requirements need an Ubuntu audit. |
| `.claude/skills/kuya-marvin-ads/SKILL.md` | Pending; rule surfaced | Paid-operation and exact-input approval rules are bridged. |
| `.claude/skills/marvin-avatar/SKILL.md` | Pending | Image-generation bridge needs replacement. |
| `.claude/skills/retargeting-briefs/SKILL.md` | Pending | Read/export-only guarantees need deterministic enforcement. |
| `.claude/skills/skill-creator/SKILL.md` | Pending | Claude-specific eval harness must be evaluated against Codex skills. |
| `.claude/skills/static-autopsy/SKILL.md` | Pending | Gemini vision and swipe-file workflow need a Codex skill port. |
| `.claude/skills/straw-man-audit/SKILL.md` | Pending | Fresh-context critic workflow needs a Codex equivalent. |
| `.claude/skills/surgical-edit/SKILL.md` | Pending; rule surfaced | Surgical scope and tuned restrictions are in root instructions. |
| `.claude/skills/tldr/SKILL.md` | Pending | Optional conversational skill. |
| `.claude/skills/ubiquitous-language/SKILL.md` | Pending; rule surfaced | Canonical vocabulary is required by root instructions. |
| `.claude/skills/verify-changes/SKILL.md` | Pending; rule surfaced | Build/test/check requirements are in root instructions and runbook. |
| `.claude/skills/viral-autopsy/SKILL.md` | Pending | Gemini analysis and swipe-file workflow need a Codex skill port. |

## Hooks

Codex does not execute these through `.claude/settings.json`. All scripts remain
untouched and available to Claude.

| Existing hook | Status | Required later migration |
|---|---|---|
| `.claude/hooks/ad-spend-gate.sh` | Pending; rule surfaced | Enforce at the write command/credential boundary. |
| `.claude/hooks/build-gate.sh` | Pending; rule surfaced | Replace Stop-hook state with explicit checks and CI. |
| `.claude/hooks/env-warden.sh` | Pending; rule surfaced | Enforce secret-file access outside Claude hooks. |
| `.claude/hooks/lock-sync-gate.sh` | Pending | Make lock consistency a provider-neutral command/CI gate. |
| `.claude/hooks/session-start.sh` | Pending; rule surfaced | Codex continuity reads are documented in the cloud runbook. |
| `.claude/hooks/taglish-guard.sh` | Pending; rule surfaced | Port trigger behavior or add an applicable copy lint. |
| `.claude/hooks/tuned-file-gate.sh` | Pending; rule surfaced | Add deterministic diff/approval enforcement. |
| `.claude/hooks/veo-render-gate.sh` | Pending; rule surfaced | Move preflight and paid-roll enforcement into the render entry point. |

## Agents

| Existing agent | Status | Required later migration |
|---|---|---|
| `.claude/agents/code-executor.md` | Pending | Convert the spec-tight executor contract or use root task instructions. |
| `.claude/agents/smoke-tester.md` | Pending | Replace Claude Playwright tool names with repository/browser tooling. |
| `.claude/skills/skill-creator/agents/analyzer.md` | Pending | Part of the Claude skill-evaluation harness. |
| `.claude/skills/skill-creator/agents/comparator.md` | Pending | Part of the Claude skill-evaluation harness. |
| `.claude/skills/skill-creator/agents/grader.md` | Pending | Part of the Claude skill-evaluation harness. |

## Phase-1 boundary

Phase 1 establishes instruction discovery, toolchain/setup documentation, lock
reproducibility, and this inventory. It deliberately does not port skills,
replace hooks, change MCP configuration, remove Claude assets, deploy, or touch
TUNED product content.
