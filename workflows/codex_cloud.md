# Codex Cloud development runbook

This is the browser-only development path for GRIFON COMMAND. The computer-shop
PC needs only a browser: Git checkout, dependencies, commands, commits, and pull
requests run in the cloud workspace. Keep `workflows/cafe_session.md` for the
legacy local Windows route during migration.

## One-time Codex Cloud environment configuration

1. In Codex Cloud, open **Settings -> Environments** and edit the environment
   connected to `yopiheart/grifon-command`. Leave the runtime selector on Node
   20; the real editor currently offers only 18/20/22. Do not add
   `CODEX_ENV_NODE_VERSION` as a generic variable: the editor removes that row,
   so it is not a validated way to select Node 24.
2. Put this self-contained block in **Setup script**. Initial setup runs against
   the cached default-branch checkout, before a task branch is applied, so this
   block installs and persists the toolchain only. It deliberately does not run
   the default branch's older `npm ci` before PR #124's lock repair is present:

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
   ```

3. Put this block in **Maintenance script**. Maintenance runs after the task
   branch checkout, so it sees PR #124's script and repaired lockfile without
   switching branches. Once this commit is on the remote PR branch, use:

   ```bash
   bash scripts/codex-cloud-setup.sh
   ```

   If the branch has not been updated yet and that file is absent, use this
   self-contained maintenance block instead:

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
   node --version
   npm --version
   npm ci
   ```

   The initial Setup block has already written the login-shell persistence
   marker, so Maintenance only has to reassert the active version before the
   clean install.

   Do not use `git switch`, `git checkout`, `npm install`, or a fallback lockfile
   command in either box. Maintenance must run `npm ci` against the task branch
   exactly as checked out.
4. Leave setup/maintenance internet access enabled for `registry.npmjs.org`.
   Routine agent internet can remain disabled. Save the environment and use
   **Update branch** as needed, then start a **new task** so the cached setup,
   task checkout, and maintenance command all run in their real order.
5. At the start of the new task, verify persistence without changing `PATH`:

   ```bash
   command -v node
   node --version
   command -v npm
   npm --version
   test -x node_modules/.bin/vitest
   ```

   Expected exact versions are Node `v24.15.0` and npm `11.4.2`. If the agent
   shell still reports Node 20, stop: setup did not update the cached home or the
   task reused an old cache. Do not paper over it with a task-local `PATH`
   export.
6. Add secrets through the Codex Cloud environment settings, never through the
   task prompt and never by committing `.env`. The basic build and unit suite
   need no live provider secrets. Add only the variables required for an
   explicitly authorized integration task; names and purposes live in
   `.env.example`.
7. For zero-cost browser boot tests, install Chromium in the environment image or
   setup step:

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

Environment Setup, task-branch checkout, Maintenance, and the subsequent agent
run are separate phases.
Check the failing command's timestamp and task transcript before assigning a
cause. A failure from an `npm ci` typed by the agent proves only that agent-phase
network request failed; it does not prove setup-phase access failed.

The 2026-09-05 failure was reproduced in the **agent phase** with Node 24.15.0
and npm 11.4.2. npm requested `https://registry.npmjs.org/ink`; the CONNECT path
returned HTTP 403, and npm emitted `E403` with its generic message that the
package may be forbidden by security policy or inaccessible to the client. A
direct request also received `HTTP/1.1 403 Forbidden` from the configured Envoy
proxy. Those observations identify the failed boundary; they do not establish
whether the account policy, environment allowlist, or upstream access rule made
the decision. No setup-phase install log was available, so the earlier claim
that the Codex environment itself could not install dependencies was too broad.

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
