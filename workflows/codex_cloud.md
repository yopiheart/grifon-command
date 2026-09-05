# Codex Cloud development runbook

This is the browser-only development path for GRIFON COMMAND. The computer-shop
PC needs only a browser: Git checkout, dependencies, commands, commits, and pull
requests run in the cloud workspace. Keep `workflows/cafe_session.md` for the
legacy local Windows route during migration.

## One-time Codex Cloud environment configuration

1. In Codex Cloud, open **Settings -> Environments**, create or edit the Grifon
   environment, and connect `yopiheart/grifon-command` with permission to create
   branches and pull requests.
2. In that environment's **Environment variables**, set the non-secret variable
   `CODEX_ENV_NODE_VERSION` to `24`. The audited universal image reads this
   variable before the repository setup script, runs `nvm alias default 24`,
   and activates Node 24. This matters because a temporary `export PATH=...`
   inside setup does not prove that a later agent shell gets the same Node.
3. In **Setup script**, use the inline bootstrap below until the commit adding
   `scripts/codex-cloud-setup.sh` exists on the remote branch selected for the
   task. Setup runs after checkout, so it cannot call a file that is still only
   in an unpushed working tree:

   ```bash
   set -euo pipefail
   test "$(node --version | cut -d. -f1)" = "v24"
   if [ "$(npm --version | cut -d. -f1)" != "11" ]; then
     npm install --global npm@11.4.2
   fi
   node --version
   npm --version
   npm ci
   ```

4. After this migration commit is available remotely, replace the inline
   bootstrap with:

   ```bash
   bash scripts/codex-cloud-setup.sh
   ```

   Leave setup-phase internet access enabled for `registry.npmjs.org`. Routine
   agent internet access can remain disabled; dependency installation belongs
   in setup. Save the environment and start a **new task** so both setup and the
   later agent shell are created from the revised configuration.
5. At the beginning of that new task, verify persistence rather than exporting a
   path manually:

   ```bash
   command -v node
   node --version
   command -v npm
   npm --version
   test -x node_modules/.bin/vitest
   ```

   Expected majors are Node 24 and npm 11. If the agent shell still reports Node
   20, stop: the environment variable was not saved or the task reused an old
   container. Do not paper over it with a task-local `PATH` export.
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

The environment Setup script and the subsequent agent run are separate phases.
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
