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

## Dated: on/after Jul 7, 2026 — Fable 5 promo ends, re-evaluate the model pin

The 50%-of-weekly-limits Fable 5 promo expires **Jul 7, 2026**; after that Fable draws
down at its full (much-faster-than-Opus) rate. On or after that date: check `/usage` with
Neil and decide **together** whether to keep `"model": "claude-fable-5"` in
`.claude/settings.json` or re-pin `claude-opus-4-8` — then update the CLAUDE.md
usage-budget bullet to match. The `code-executor` (Opus 4.8) and `smoke-tester`
(Sonnet 5) frontmatter pins stay regardless — they save tokens at zero quality cost.
Delete this section once decided.
