# Desktop runtime audit

Read-only source audit, 2026-09-17. Scope: Codex hook registration/runtime, readiness, starter and optional restore scripts. No secrets, account state, dependencies, processes or application files were changed. This report is the only authored file.

## Main finding

The registered Codex runtime does not wipe local state, force logout, prohibit persistent installation, or reinstall on each reboot. The strongest obsolete assumptions are injected instructions and default runbook routing. Persistent installs already work. Preserve security and spending gates while removing the cafe-specific operational narrative.

## Active default surfaces

| Source | Evidence and implication | Minimal change |
|---|---|---|
| `.codex/hooks.json:10-16`, `:23-25` | SessionStart, PreToolUse, UserPromptSubmit and Stop route to `guard.mjs`. The second startup command runs `ad_asset_sweep.mjs --quiet --report`. Legacy `.sh` copies are not registered. | Leave registration and `--report` intact. No cleanup switch needs disabling. |
| `.codex/hooks/guard.mjs:45-48` | SessionStart preserves the existing baseline, then injects “Check Git identity and required account sign-ins after a cafe reboot.” This is the actual automatically supplied obsolete assumption. | Replace only that final sentence with persistent desktop context; verify identity/login when absent or failing, rather than after every reboot. Hook diff follows current review/trust controls. |
| `.codex/hooks/guard.mjs:24-28`, `:107-115`, `:154-162` | State persists under ignored `.tmp/codex-hook-state`; approval/counter writes are protected; paid roll locks/caps remain. | No change. Persistent disk does not justify persistent approval grants or counter resets. |
| `scripts/codex-cafe-start.ps1:1-12`, `:34-49` | Default and `-CheckOnly` are read-only. `npm.cmd ci` runs only under explicit `-InstallDependencies`. The filename and line 46 help text are cafe-branded. No browser launch, identity write, fetch, branch switch or logout occurs. | Establish a neutral desktop starter name and update default references/help. Retain old entrypoint only if deliberately preserved as historical/compatibility entrypoint; no need to change installation behavior. |
| `tools/codex-readiness.mjs:45-54`, `:65-74`, `:124` | Already recognizes installed dependencies, preserves checkout, checks configured identity without revealing values, and exits 1 only for core/desktop failures. Missing creative/browser assets do not block frontend work. | Keep these checks and exit semantics. Do not weaken identity, paid flag or hook requirements. |
| `tools/codex-readiness.mjs:86-91` | Python detection tries pinned portable `.tools` Python before `python`/`python3`, but does accept a global interpreter. Missing-Python action prescribes `restore-python.ps1 -Portable`. | Generalize the action to use/install a suitable persistent Python with pip, with portable restore as an optional fallback. Changing detection priority is optional and could change which package environment is selected; avoid casually changing it. |
| `.codex/config.toml:1-13` | Enables hooks and configures pinned Playwright MCP. No cafe mode, transient home or forced cleanup. | No runtime change needed. |
| `workflows/codex_desktop.md:1-12`, `:20-23`, `:79-86`, `:152-161` | Default runbook presents cafe continuity, wiped-PC installation, an old machine-specific MSI workaround and shared-PC signout as present-day instructions. | Describe daily persistent desktop resume separately from optional fresh setup. Keep portable Python as fallback. Remove shared-PC signout instruction from default workflow, retain GitHub backup/review and local-only credential storage rules. |

## Historical or explicitly invoked tools

- `scripts/cafe-start.ps1` is a legacy mutating starter: missing identity triggers repair (`:130-134`); default fetch at `:178`; full checkout warning at `:211`; missing dependencies trigger `npm install` (`:223`); default VS Code launch (`:269`). It does not delete work or enforce sparse checkout. It is not referenced by the Codex hook registration. Keep it clearly historical and out of default instructions; avoid rewriting its legacy behavior merely to remove cafe words.
- `scripts/restore-python.ps1:41-67` provides a verified portable fallback. Normal path at `:77-84` reuses installed Python and at `:99-105` uses a persistent per-user installer (`PrependPath=1`). Its opening claims of no package manager and guaranteed reboot wipe are obsolete comments, not enforced restrictions. Preserve archive/signature checks. No need to reinstall or migrate a working interpreter.
- `scripts/restore-gh.ps1:24-27` reuses its installed binary; `:59-64` explicitly persists user PATH. `:84-94` inspects auth status and only asks login when missing. Wipe/per-session login claims at `:1-11`, `:73` are obsolete comments. Cleanup at `:48-53` occurs inside the missing-binary installation branch and concerns installation/extraction directories, not routine session state. Do not execute for this cleanup task.
- `scripts/restore-codex.ps1:17-29` installs globally only if missing; `:33-47` reuses existing login-file presence. It already supports persistent installation/auth. Its cafe opening and Claude image bridge output are historical context. The final suggested image-generation test is paid-capability work and must not run as a routine desktop check.
- `scripts/restore-ffmpeg.ps1:29-42` reuses local `.tools/ffmpeg`; `:70` adds PATH for the current shell only. `:1-12` overgeneralizes old cafe package-manager/network limitations. The binary persists; only PATH injection is session-scoped. Treat this as an optional local bundle, not a ban on a normal installed FFmpeg.
- `scripts/restore-playwright-mcp.ps1` and `restore-notebooklm.ps1` restore Claude registration, not Codex configuration. The desktop runbook already identifies the former as unnecessary for Codex (`workflows/codex_desktop.md:63-65`). Keep them legacy.
- `scripts/restore-vercel.ps1:19-31`, `:144`, `:186` contain wipe/per-session authentication guidance. Preserve the outside-repository token-file restriction (`:135-146`): it remains a secret safety rule. Vercel is already optional for local development. Do not invoke it for this task or alter credentials.
- `scripts/enable-dev-unmetered-video.ps1:13-15` explicitly tells users to re-enable unmetered flags at the start of any local smoke session because reboot supposedly clears them. Actual `:40-64` writes two flags into the ignored environment file, so on a persistent desktop they remain until manually removed. Remove this routine-setup advice or mark the helper strictly opt-in under approved paid test specs. Do not execute, inspect `.env`, or silently change paid behavior. Default Codex runbook already says to leave unmetered-video off.
- `tools/ad_asset_sweep.mjs:114-118` deletes edit folders when invoked without `--report`, and `:126-129` deletes flagged files under `--apply`. Active Codex hook uses report-only and its fixture test asserts that. Retain this distinction; do not describe every invocation of the underlying sweep as harmless.

## Verification for the minimal fix

- Run `npm.cmd run check:codex` before committing control/migration changes. This runs skill-path checks and hook/readiness/asset contract tests (`package.json:29`).
- Existing `tools/codex-hooks.test.mjs:25-33` proves registration includes native gates and both sweep commands retain `--report`. Gate tests cover secrets, exact approval, paid caps and malformed input. Keep them passing.
- Existing `tools/codex-readiness.test.mjs` covers installed-module inspection, sparse inputs and hook registration. If only action copy changes, no new implementation-mirroring tests are needed.
- If introducing a neutral starter, parse it with PowerShell and run its read-only `-CheckOnly`; validate mutually exclusive flags without installing packages. `npm.cmd run check:ps1-ascii` applies (`package.json:27`, also prebuild).
- For guard context changes, a narrow SessionStart regression asserting persistent desktop context and absence of the reboot restoration instruction can demonstrate the original failure before the fix. Runtime trust is separate from static tests; changing hook source may require normal Codex review/trust.
- Do not run restore/install scripts, generation, live tests, process cleanup or production commands as verification of this documentation/control cleanup.

## Limits

This is source inspection, not proof of current Codex hook trust or account readiness. No operating-system registry, installed browser profile or external defreezer service was inspected. The repo's registered Codex path contains no reboot cleanup or logout operation. Historical Bash session hooks include cafe restoration advice, but they are not registered by `.codex/hooks.json`.
