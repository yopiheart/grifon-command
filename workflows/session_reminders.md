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
brief to the `code-executor` subagent (Opus 5) — see the skill's SKILL.md.

## Desktop wallpaper (Grifon Noir) — wiped by defreezer

The defreezer resets the Windows wallpaper every reboot. Re-arm (v1 = "Ship one real
thing."; picker gallery at [assets/wallpapers/gallery.html](../assets/wallpapers/gallery.html)):

```
powershell -ExecutionPolicy Bypass -File scripts\set-wallpaper.ps1 -Variant v1
```

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

## Tooling: ffmpeg (sample-card cutting, render verification) — wiped by defreezer

No winget/scoop/choco on this PC (confirmed again 2026-07-12). Portable re-arm, no admin:

```
curl -sL -o .tmp/ffmpeg.zip "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"
unzip -qo .tmp/ffmpeg.zip -d .tmp/ffmpeg
.tmp/ffmpeg/ffmpeg-*-essentials_build/bin/ffmpeg.exe -version
```

Call it by full path (it is NOT on PATH). Needed for `sample_batch_test_spec.md` §5
(sample-card cutting) and any local render poking.

## Broken: scripts/get-smoke-otp.ps1 — generate_link 401 (found 2026-07-12)

The sb_secret service key still works for admin reads (`/auth/v1/admin/users` → 200) but
`/auth/v1/admin/generate_link` now returns 401 for BOTH smoke accounts — likely a Supabase
GoTrue policy change, NOT a stale key. Agent-driven browser smokes that need OTP login are
blocked on this until fixed. Workaround (fine when Neil drives): sign in as
`neilmaglaya.business22+smoke@gmail.com` — the app's real OTP email lands in Neil's Gmail
inbox (`+smoke` is an alias). Fix the script when smoke automation is next needed.

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

## RESOLVED 2026-07-20: Fable sunset cancelled — Fable 5 permanent on Max plans

Anthropic announcement (@claudeai, 2026-07-18): "Beginning July 20, Claude Fable 5
will be included in all Max and Team Premium plans, at 50% of limits." The staged
rollout / sunset cycle is over. The sunset flip block in `session-start.sh` and the
never-armed flip-PR Routine plan were removed 2026-07-20; the pin stays
`claude-fable-5` indefinitely.

Details from the support article
(https://support.claude.com/en/articles/15424964-claude-fable-5-on-your-plan):

- The 50% is NOT extra allowance — all models draw from the same weekly pool;
  Fable may consume up to half of it.
- **Credits trap:** when the Fable share is exhausted, Fable can CONTINUE on
  pay-as-you-go credits — it does not hard-stop. If `/usage` shows the Fable share
  at 100%, actively `/model` to **Opus 5** for the rest of the week (allowance
  resets weekly; no pin flip needed; was Opus 4.8 until the Opus 5 release
  2026-07-24). Do not keep running Fable on credits unnoticed.
- Claude Code needs v2.1.170+ for Fable.
- Transition note (2026-07-20): the old promo window expired 2:59 PM PHT the same
  day the new included-at-50% terms took effect; Neil hit a transient model-switch
  block around the cutover and had to re-select `/model claude-fable-5` manually.
  One-time event, no action needed.

Delete this note after a few sessions confirm the new steady state.
