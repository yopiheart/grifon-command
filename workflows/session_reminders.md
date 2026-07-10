# Session Reminders (re-arm each session)

Cron/loop reminders live in Claude **session state** — they are not written to disk
and the cafe-PC defreezer wipes them on reboot (see CLAUDE.md → Working Environment).
A PowerShell restore script can't recreate them (the scheduler is a Claude tool, not a
shell command), so this doc is the restore mechanism: paste the command to re-arm.

## Hourly break reminder

**To re-arm**, run:

```
/loop 60m Remind me to take a break — stand up, stretch, rest my eyes for a minute. Keep it short and friendly.
```

- Fires every hour while the terminal is idle (lands at :07 past the hour to avoid the API rush).
- Session-only, recurring; auto-expires after 7 days.
- Cancel early: ask Claude to `CronDelete` the job (it returns the job ID when armed).

> The SessionStart hook ([.claude/hooks/session-start.sh](../.claude/hooks/session-start.sh))
> surfaces every `/loop` line in this file automatically at session start — keep new
> re-arm commands on their own line starting with `/loop` so the hook picks them up.

## Tooling: Codex CLI (codex-image + codex-executor / GPT 5.6 Sol lane) — wiped by defreezer

Both Codex bridge skills (`.claude/skills/codex-image/`, `.claude/skills/codex-executor/`)
need the Codex CLI installed and logged in. The defreezer wipes `~/.codex/` and the
global npm install every reboot — re-arm with:

```
scripts/restore-codex.ps1
```

(Neil signs in with the ChatGPT account when `codex login` prompts.) If the Sol
executor lane exits 10/11/12 mid-session, the fallback SOP is: dispatch the same
brief to the `code-executor` subagent (Opus 4.8) — see the skill's SKILL.md.

## Tooling: Python — wiped by defreezer

`tools/*.py` (omni_edit, analyze_video, …) need Python; the defreezer removes it every
reboot and the silent installer gets blocked (needs a human to click the prompt).
Either re-run the installer WITH UI (Neil clicks through):

```
curl -sL -o python-installer.exe https://www.python.org/ftp/python/3.12.8/python-3.12.8-amd64.exe
./python-installer.exe InstallAllUsers=0 PrependPath=1 Include_test=0 Include_launcher=0
```

or, zero-prompt portable fallback (works headless):

```
curl -sL -o pyembed.zip https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-amd64.zip
unzip -qo pyembed.zip -d pyembed && sed -i 's/^#import site/import site/' pyembed/python312._pth
curl -sL -o get-pip.py https://bootstrap.pypa.io/get-pip.py && ./pyembed/python.exe get-pip.py --quiet
```

## Tooling: poppler (PDF page renderer) — wiped by defreezer

The johnsavage workflow PDFs in `workflows/assets/johnsavage/` (paper-style + VOX)
are image-only; reading them (or any screenshot PDF) needs `pdftoppm`, which this PC
lacks after every reboot (no winget/scoop/choco). Portable re-install, no admin:

```
curl -sL -o poppler.zip https://github.com/oschwartz10612/poppler-windows/releases/download/v26.02.0-0/Release-26.02.0-0.zip
unzip -q poppler.zip -d poppler
poppler/poppler-26.02.0/Library/bin/pdftoppm.exe -png -r 100 <file.pdf> out/pg
```

Verbatim transcriptions already live in `workflows/omni_edit_presets.md` appendices —
only re-install if you need to re-read pages visually.

## Omni Edit Styles — .env re-arm (flag not yet moved to Vercel)

The Omni proxy 503s without its kill-switch flag. When restoring `.env`, include:

```
OMNI_STYLES_ENABLED=true
MEDIA_STORE=r2
```

Resume doc: `workflows/omni_edit_styles_plan.md` → **RESUME STATE** section
(branch status, smoke account, dev seed hook, kickoff message).
Delete this section once `OMNI_STYLES_ENABLED` + `OMNI_STYLES_BETA_ALLOWLIST`
are set in Vercel (the feature merged to main 2026-07-07, PR #47).

## Dated: Fable sunset — Jul 13, 2026 2:59 PM PHT (2026-07-13T06:59Z)

**Decided 2026-07-10** (Neil + Claude — screenshot confirmed Fable 5 is included in
plan limits until Jul 13 2:59 PM PHT, up to 50% of weekly limits): the main-loop pin
is back on `claude-fable-5`. The Jul 7 re-pin to Opus was premature (its
depleted-credits premise turned out stale) and was what auto-switched Neil's sessions
off Fable. Successor after sunset: **Opus 4.8** (main loop + checker, `/fable-mode`
as discipline hedge). Executor/smoke pins unchanged.

The handover is automated two ways; the early-exhaustion case is manual:

1. **SessionStart hook** ([.claude/hooks/session-start.sh](../.claude/hooks/session-start.sh)):
   after the deadline, flips the settings.json pin to `claude-opus-4-8` in the working
   tree and prints a loud banner (current session may still be on Fable at prepaid API
   rates — switch/restart, then commit the flip).
2. **Run-once Routine** (remote, fires 2026-07-13T06:59Z): a fresh session opens a
   one-line flip PR for Neil to merge, so origin/main is correct at the deadline.
3. **Manual — Fable allowance hits 100% BEFORE Jul 13** (no hook/Routine can read the
   usage meter): check `/usage` at session start; if the Fable share (50% of weekly)
   is exhausted, tell Claude "flip the pin to Opus" — one-line settings.json edit,
   commit, push. Do NOT keep running Fable on prepaid credits ($10/$50 per M).

**Cleanup after the flip merges:** delete this section, the sunset block in
session-start.sh, and re-check the CLAUDE.md usage-budget bullet says Opus 4.8.
