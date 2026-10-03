# Codex personal desktop workflow

Work directly on Neil's persistent Windows desktop, including when controlling it
remotely from mobile. Reuse the existing checkout, installed tools, dependencies,
assets, and signed-in accounts. GitHub remains the backup and review channel.
The application still uses Gemini, ElevenLabs, Kling, Supabase and its existing
API handlers. Migrating the coding workspace does not change those providers.
Cloud development is optional; its runbook is `codex_cloud.md`.

## Resume work

1. Open the saved repository in Codex. Reuse working installations and account
   sessions. Install Git for Windows, Node 24 and npm 11 only if missing or
   incompatible; use normal sign-in only when an account actually requires it.
2. Read the existing checkout first. A full clone is supported; the lite clone
   below is optional for storage or transfer constraints. For an existing checkout, read
   `git status --short --branch` before fetching or switching anything. Never
   replace untracked work or reset somebody else's branch.
3. Read `AGENTS.md`, `NOW.md`, `agent_lessons.md`, `UBIQUITOUS_LANGUAGE.md`, the
   latest five commits, and the saved PR. Resume its branch, or start a new
   `codex/<task>` branch from current `main` for new work.
4. If setup needs diagnosis, run the read-only readiness check. Install
   dependencies only when missing or when the lockfile requires it:

```powershell
npm.cmd run codex:ready
# Only when dependency installation is needed:
npm.cmd ci
```

Run existing restore/setup helpers only for a demonstrated missing dependency.
They are not a daily routine and must not overwrite working configuration or
credentials. Each `funnels/<name>` has its own manifest and lockfile.
The old `scripts/codex-cafe-start.ps1` filename is retained for historical callers;
it is not the default entry point or a restriction on personal-desktop installs.

Optional lite clone (run from the parent directory):

```powershell
git clone --filter=blob:none --no-checkout https://github.com/yopiheart/grifon-command.git
cd grifon-command
git sparse-checkout set --no-cone '/*' '!/clients' '!/assets' '!/baselines' '!/artifacts' '/artifacts/eli5-image-gate.html' '!/samples' '!/workflows/believability-samples' '!/workflows/concierge_poc' '!/workflows/assets' '!/tests/fixtures' '!/public/examples'
git checkout main
npm.cmd ci
node tools/codex-assets.mjs instructions --apply
node tools/codex-assets.mjs wizard --apply
```

Use the current task branch when resuming or updated `main` for new work.
Preserve a clone's existing sparse patterns when using selective restoration: the asset helper
adds exact tracked files, never replaces rules or restores non-sparse deletions.

## Controls and connections

- `.agents/skills` contains the migrated workflow entry points; `.codex/agents`
  contains the executor and smoke contracts. New tasks discover these files.
  After editing them, start a fresh task if the current task lists stale skills.
- Review and trust the project configuration and hook source in Codex when
  prompted. Do not use `--dangerously-bypass-hook-trust`. A hook file on disk
  is not evidence that the running app trusted and executed it.
  This PC passed fresh desktop delivery checks on 2026-09-07 at `438c651`:
  SessionStart guard/sweep, allowed/denied PreToolUse probes, Stop dispatch,
  and direct-composer UserPromptSubmit. This is not every-policy-path coverage;
  changed hook source still needs its normal review/trust on this desktop.
- `.codex/config.toml` configures the optional Playwright MCP server using a
  pinned package. Built-in browser tools can also drive manual checks. The old
  `restore-playwright-mcp.ps1` writes Claude configuration and is unnecessary
  for Codex. Browser installation/account sign-in are separate readiness steps.
- Account connectors (GitHub, Supabase, Meta, NotebookLM and others) require
  the user's own sign-in when used. Do not copy `.claude.json` or tokens into
  the project. Tool visibility is not proof of working account access: use a
  task-relevant read-only call before declaring a connection ready.
- Normal PRs use CI and independent Codex review. The preserved Claude reviewer
  runs only for non-draft PRs when `ENABLE_LEGACY_CLAUDE_REVIEW=true` is explicitly
  configured as a GitHub repository variable. It is not needed for desktop work.
- Legacy Bash creative scripts need Git Bash. The bundled `ffmpeg-static`
  executable supports the app renderer. Standalone editing also needs ffmpeg
  and ffprobe: `scripts/restore-ffmpeg.ps1` restores the existing optional tool
  bundle. Reuse installed Python and FFmpeg; repair only a dependency that is absent
  or incompatible with the task.

If a normal Python installation is unavailable, an optional tested fallback is
`.\scripts\restore-python.ps1 -Portable`. It restores the official CPython
3.12.8 NuGet package into ignored `.tools`, checks its pinned archive digest
and Python Software Foundation executable signature, and verifies pip.
In a new shell use `.tools/python-3.12.8/tools/python.exe` explicitly, or run
the restore script there to prepend that interpreter to that shell's PATH.
No global configuration is replaced.

## Secrets and starting the app

Reuse existing local configuration. If credentials are missing, the user supplies
them through the normal local secret workflow (for example Bitwarden). `.env`
stays ignored; the agent
does not open or print its contents. Restore only the credentials the intended
feature needs. Readiness reports file/variable presence, never values.

```powershell
npm.cmd run dev
```

Vite serves the frontend and the existing `/api/*` development middleware, so
Vercel CLI is not required just to start local API development. A rendered
homepage establishes frontend boot only. Provider calls still need valid
accounts and a paid-test approval where applicable. Do not turn on development
unmetered-video or paid/live flags during migration verification.

## Workflow inputs

Run a profile without flags to preview coverage; `--check` fails on absent
inputs; `--apply` downloads only that profile's absent tracked files.

| Profile | Purpose |
|---|---|
| `instructions` | Hidden client rules, workflow scripts/manifests and source templates. |
| `wizard` | All 23 upload examples and 21 sample-batch files (about 84 MB at migration baseline). |
| `zam` | Canonical Zam skill package plus the approved master outside that package. |
| `marvin` | Original identity references, approved taste frames and company vehicle. |
| `artifact-sources` | Inputs and retained twins for the existing artifact builders. |

For example: `node tools/codex-assets.mjs zam --apply`. Restore a specific ad's
clips only when editing that ad; the profiles deliberately avoid a bulk media
download. A full checkout is optional for offline work and still cannot restore
uncommitted files, account sessions, Python environments or funnel dependencies.

## Free validation and hands-on testing

For One-Shot saved-work reports, start with the
[recovery feature map](recovery-feature-map.md). `npm.cmd run verify:recovery`
runs the mapped consumer recovery cases and writes evidence with explicit
PASS, FAIL and NOT RUN coverage. It uses simulated services, not paid providers.

```powershell
npm.cmd run check:codex
npm.cmd run build
npm.cmd run test
npm.cmd run check:bundle-leak
npm.cmd run check:voice-sync
npm.cmd run check:domain
npm.cmd run check:artifact-anchors
npm.cmd run test:e2e
```

Build includes the PowerShell ASCII check. The migration checks exercise skill
paths, asset selection, readiness and the Codex hook protocol. Existing CI also
retains the legacy Claude hook harness for compatibility. Browser E2E normally
checks public routes using dummy configuration; account-backed wizard and paid
generation are separate tests. If port 5173 already has a server, verify which
configuration it uses before reusing it; never kill unrelated processes.

For a first hands-on session: open the homepage, pricing and `/app`; sign in
yourself, inspect the dashboard, then open One-Shot and its photo-upload guide.
Confirm the example images and shipped Real Talk/Unboxing previews load. Stop
before generation. For an actual sample, read `sample_brand_briefs.md` and the
Director Smoke skill, select the exact brand/assets/format, and approve the
purpose, pass/fail criteria, evidence and maximum cost first.

Do not treat a successful build or fixture dry run as proof that a provider,
voice clone, paid model or completed render works. Current run evidence and
remaining manual checks belong in `NOW.md` and the draft PR.

## Checkpoint and remote use

Review the combined diff, including new files. Run relevant checks, commit only
intended work, push the branch and create/update its draft PR. No merge or
production deployment occurs without a separate explicit instruction.

Use the [PR handoff and recurring-finding workflow](pr_review_loop.md#pr-handoff)
to summarize change, evidence, risk and the next decision, including for PRs
created through a connector or CLI. Keep improvements tied to observed failures.

Update `NOW.md` (the only resume document, maximum 90 lines) with the branch/PR,
checks, known limitations and next action. Verify the commit exists on GitHub;
a claim that work is backed up requires the remote commit to exist. Local drafts
and assets may remain on this desktop between tasks. Checkpoint at meaningful
review boundaries; do not force a commit or sign out because mobile disconnects.

Remote control uses the same desktop state. A disconnected phone does not erase
files or necessarily stop desktop work, but do not assume a job survives sleep,
shutdown, or an app exit. Inspect actual process/task status when reconnecting.
Keep mobile previews readable; use the existing remote connection instead of
opening public ports or deploying a page solely for phone access. Change remote
access or power settings only when that setup is requested.

## Scope kept for the next product tasks

Finish the pending One-Shot / Director sample formats, improve the website,
and plan inspiration/ad recreation with the user's character, location,
clothing, animation and effects as separate product tasks. This migration
neither implements that feature nor changes tuned prompts or generation models.

Official configuration references: [skills](https://learn.chatgpt.com/docs/build-skills),
[hooks](https://learn.chatgpt.com/docs/hooks),
[subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents), and
[MCP](https://developers.openai.com/codex/mcp).
