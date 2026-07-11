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

## Dated: re-pin the main model OFF Fable after Jul 12, 2026

**Fixed 2026-07-09.** The main-loop pin in `.claude/settings.json` is back to
`claude-fable-5`. Fable credits run **through Jul 12, 2026** (Neil, 2026-07-08).

**What went wrong (do not repeat):** on 2026-07-07 the pin was flipped to
`claude-opus-4-8` on the false belief that the promo had ended and credits were
depleted. It had not. Neil kept picking Fable in the `/model` UI; the committed
project pin silently overrode it, and two sessions of "Fable work" — including the
Slice-4 plan and its tuned prompt drafts — actually ran on Opus 4.8. Nobody noticed
until Neil cross-checked `/model` against `/context`.

**The rule that would have caught it:** `.claude/settings.json` `"model"` OVERRIDES
the `/model` picker. The picker's checkmark can show Fable while the session runs
Opus. **Trust `/context`, not the checkmark.** A model claim in CLAUDE.md is not
evidence — the pin and the runtime identity are.

**Next trigger (after Jul 12, 2026):** when Fable credits lapse, re-pin
`"model": "claude-opus-4-8"` in `.claude/settings.json`, update the CLAUDE.md
usage-budget bullet, and note the date here. Until then `/fable-mode` is unnecessary
— the main loop IS Fable. The `code-executor` (Opus 4.8) and `smoke-tester`
(Sonnet 5) frontmatter pins are unchanged and correct.
