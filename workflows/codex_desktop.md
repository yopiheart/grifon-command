# Codex desktop cafe workflow

Work locally in Codex desktop; use GitHub for continuity between cafe PCs.
The application still uses Gemini, ElevenLabs, Kling, Supabase and its existing
API handlers. Migrating the coding workspace does not change those providers.
Cloud development is optional; its runbook is `codex_cloud.md`.

## Arrive and resume

1. Install/open Codex desktop and sign in yourself. Install Git for Windows,
   Node 24 and npm 11 if this PC has been wiped. Open the saved repository in
   Codex. Sign in to GitHub through its normal credential flow when requested.
2. For a fresh clone, use the lite clone below. For an existing checkout, read
   `git status --short --branch` before fetching or switching anything. Never
   replace untracked work or reset somebody else's branch.
3. Read `AGENTS.md`, `NOW.md`, `agent_lessons.md`, `UBIQUITOUS_LANGUAGE.md`, the
   latest five commits, and the saved PR. Resume its branch, or start a new
   `codex/<task>` branch from current `main` for new work.
4. Run the readiness check, then explicitly install dependencies if needed:

```powershell
.\scripts\codex-cafe-start.ps1 -CheckOnly
.\scripts\codex-cafe-start.ps1 -InstallDependencies
```

If Windows blocks script files, use a process-only invocation (no persistent
policy change): `powershell.exe -NoProfile -ExecutionPolicy Bypass -File
scripts/codex-cafe-start.ps1 -CheckOnly`. This affects PowerShell script loading,
not Codex hook trust or approval controls.

The script does not restore credentials, switch branches, push, or open VS Code.
Root installation uses `npm.cmd ci`. Each `funnels/<name>` has its own lockfile
and dependency installation; install there only when using that funnel.

Fresh clone (run from the parent directory):

```powershell
git clone --filter=blob:none --no-checkout https://github.com/yopiheart/grifon-command.git
cd grifon-command
git sparse-checkout set --no-cone '/*' '!/clients' '!/assets' '!/baselines' '!/artifacts' '/artifacts/eli5-image-gate.html' '!/samples' '!/workflows/believability-samples' '!/workflows/concierge_poc' '!/workflows/assets' '!/tests/fixtures' '!/public/examples'
git checkout main
npm.cmd ci
node tools/codex-assets.mjs instructions --apply
node tools/codex-assets.mjs wizard --apply
```

Check PR #126's status: use its branch if still open, or current `main` once
merged. Preserve a clone's existing sparse patterns: the asset helper
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
  each other PC still needs its own normal hook review/trust.
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
  bundle. Python tools may need their documented dependencies on a wiped PC.

For this PC's MSI installation failure, the tested Python route is
`.\scripts\restore-python.ps1 -Portable`. It restores the official CPython
3.12.8 NuGet package into ignored `.tools`, checks its pinned archive digest
and Python Software Foundation executable signature, and verifies pip.
In a new shell use `.tools/python-3.12.8/tools/python.exe` explicitly, or run
the restore script there to prepend that interpreter to that shell's PATH.
No global configuration is replaced.

## Secrets and starting the app

The user restores `.env` from Bitwarden locally. It stays ignored; the agent
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

## Save before leaving

Review the combined diff, including new files. Run relevant checks, commit only
intended work, push the branch and create/update its draft PR. No merge or
production deployment occurs without a separate explicit instruction.

Update `NOW.md` (the only resume document, maximum 90 lines) with the branch/PR,
checks, known limitations and next action. Verify the commit exists on GitHub;
a local commit or task completion alone is insufficient. Save the PR link on
your phone. Sign out of personal accounts on the shared PC before leaving.

## Scope kept for the next product tasks

Finish the pending One-Shot / Director sample formats, improve the website,
and plan inspiration/ad recreation with the user's character, location,
clothing, animation and effects as separate product tasks. This migration
neither implements that feature nor changes tuned prompts or generation models.

Official configuration references: [skills](https://learn.chatgpt.com/docs/build-skills),
[hooks](https://learn.chatgpt.com/docs/hooks),
[subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents), and
[MCP](https://developers.openai.com/codex/mcp).
