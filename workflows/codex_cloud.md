# Codex Cloud development runbook

This is the browser-only development path for GRIFON COMMAND. The computer-shop
PC needs only a browser: Git checkout, dependencies, commands, commits, and pull
requests run in the cloud workspace. Keep `workflows/cafe_session.md` for the
legacy local Windows route during migration.

## Exact pre-merge Codex Cloud configuration

The official [Cloud environments documentation](https://learn.chatgpt.com/docs/environments/cloud-environment)
says a new run checks out the selected branch/commit and then runs Setup. Cache
preparation is the separate case that uses the default branch; Maintenance runs
when that cache is resumed.

For PR #124 validation, open **Settings -> Environments**, edit the environment
connected to `yopiheart/grifon-command`, and use these settings:

- Runtime selector: leave **Node 20** selected (the editor offers 18/20/22 only).
- Container caching: **Off**.
- Agent internet access: **Off**.
- Setup script: paste the complete block below.
- Maintenance script: leave empty while caching is Off.

Do not add `CODEX_ENV_NODE_VERSION` as a generic variable; the real editor
removes that row. The Setup block is intentionally self-contained instead of
calling a repo script that is not yet on `main`. It activates and persists Node
24/npm 11 **and runs `npm ci` on the selected PR commit**:

```bash
set -euo pipefail
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh"
if [ "$(nvm version v24.15.0)" = "N/A" ]; then
  nvm install v24.15.0
fi
nvm alias default v24.15.0
nvm use v24.15.0
if [ "$(npm --version | cut -d. -f1)" != "11" ]; then
  npm install --global npm@11.4.2
fi
if ! grep -Fq '# GRIFON_CODEX_NODE_BEGIN' "$HOME/.profile"; then
  cat >> "$HOME/.profile" <<'EOF'

# GRIFON_CODEX_NODE_BEGIN
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
  nvm use --silent v24.15.0 >/dev/null
fi
# GRIFON_CODEX_NODE_END
EOF
fi
node --version
npm --version
npm ci
```

Save the environment, update PR #124's branch, and start a new task. At the
start of that task, verify setup without changing `PATH`:

```bash
command -v node
node --version
command -v npm
npm --version
test -x node_modules/.bin/vitest
```

Expected exact versions are Node `v24.15.0` and npm `11.4.2`, and Vitest must
exist. If any check fails, stop; do not repair it with an agent-phase `PATH`
export or install.

## Configuration after phase 1 reaches `main`

Caching may be enabled only after `main` contains the repaired lockfile and
`scripts/codex-cloud-setup.sh`. Keep the same self-contained block above as the
initial **Setup script**, including its `npm ci`. Set **Maintenance script** to:

```bash
bash scripts/codex-cloud-setup.sh
```

Both paths therefore run a clean install: Setup covers a cold start, while
Maintenance refreshes dependencies on a resumed cache. Neither script switches
branches, runs `npm install` for project dependencies, or bypasses the lockfile.

Add secrets through environment settings, never through the task prompt or a
committed `.env`. The basic build and unit suite need no live provider secrets.
For zero-cost browser boot tests, add this to Setup after `npm ci` when needed:

```bash
npx playwright install chromium
```

## Start of each task

Codex reads `AGENTS.md` automatically. For continuity it must also read:

```bash
sed -n '1,220p' NOW.md
sed -n '1,220p' agent_lessons.md
git log -5 --oneline
git status --short --branch
```

Before declaring a feature absent, inspect remote branches and the actual tree.
`NOW.md` records the current product thread but does not override code or Git
history.

## Basic verification

Keep all live/paid switches unset. A normal application change uses:

```bash
npm run build
npm run test
npm run check:bundle-leak
npm run check:voice-sync
npm run check:domain
npm run check:artifact-anchors
```

`npm run build` already invokes `npm run check:ps1-ascii`. Use
`npm run test:e2e` only after Chromium is installed; its existing boot suite uses
dummy Supabase configuration and does not call paid AI providers.

Each `funnels/<name>/` project is independent. Run `npm ci` in that funnel only
when the task touches it; root setup does not install funnel dependencies.

## Diagnosing install failures by phase

Uncached Setup, cache preparation, cache-resume Maintenance, and the subsequent
agent run are separate phases. Do not use a result from one as evidence for
another.

The fresh verification task at remote PR head
`07edfb09c7d0346630d9b183b677fd0e41188e54` confirmed that the saved uncached
Setup produced Node 24.15.0/npm 11.4.2 and installed dependencies: build, unit,
bundle-leak, voice-sync, domain, and artifact-anchor checks passed. Cloud E2E
was not run because the Chromium 1228 executable was missing; GitHub E2E was a
separate green check. The task did not expose whether a cache hit or miss
occurred, so cache startup ordering remains unvalidated. Do not infer Setup
failure from an absent `SETUP_COMMIT` environment variable: that name was only
a printed log label, never an exported variable.

## Safety boundaries

- Do not set `RUN_REGRESSION`, `RUN_BURNIN`, `RUN_IMAGE_GATE_SMOKE`, or another
  paid/live switch during routine setup or verification.
- Do not run deployment commands merely to test the development environment.
- Do not read or print secret values. Presence-only checks are allowed.
- Paid renders, ad writes, publishing, production data changes, deploys, and
  merges require explicit user approval.
- Prompt/schema/model content in `services/geminiService.ts` and
  `api/_lib/prompts.ts` remains TUNED and requires approval for the exact diff.

## End of task

Review `git diff`, run the applicable checks, and report setup failures
separately from application failures. Commit and create a pull request only when
the task requests them. Do not merge the pull request from the development task.
