# Cafe Session Runbook

The SOP for renting a PC at a computer shop. The defreezer wipes
`C:\Users\Administrator\` every night, so only the GitHub repo survives.

Two routes. Start with **Route A**. Once a USB SSD is on hand, switch to
**Route B** and never go back to A.

---

## ⚠️ Why the old flow stopped working

A full `git clone` is now **1.5 GB**. It was 134 MB in June 2026. At the
~30 KiB/s measured on cafe wifi 2026-08-16 that is roughly **13 hours**, and
`git clone` has no resume, so every dropped connection restarts from zero. This
cost Neil 3 blocked days across 3 different shops.

Code is not what got heavy. The whole app is 6 MB. The 1.5 GB is video and PNG:

```
clients/oceanides                  1,131 MB   513 files
assets/wallpapers                    145 MB    58 files
all .md .yml .json .sh .ps1            4.7 MB   322 files
```

So **we stop cloning the whole repo.** The media is still on GitHub and gets
pulled one folder at a time when it is actually needed.

---

## ROUTE A — cafe PC, no USB (~8 min)

### A1. Tools (~5 min)

| Tool | URL |
|---|---|
| Git for Windows | https://git-scm.com/download/win |
| Node.js LTS | https://nodejs.org |
| VS Code | https://code.visualstudio.com |

Default settings, Next-Next-Install.

Once VS Code opens: Extensions (the four squares in the sidebar) → search
**Claude Code** → Install → sign in as `neilmaglaya.business22@gmail.com`.

### A2. Clone (~2 min, not 13 hours)

```powershell
cd $HOME\Desktop
git clone --filter=blob:none --no-checkout https://github.com/yopiheart/grifon-command.git
cd grifon-command
git sparse-checkout set --no-cone '/*' '!/clients' '!/assets' '!/baselines' '!/artifacts' '/artifacts/eli5-image-gate.html' '!/samples' '!/workflows/believability-samples' '!/workflows/concierge_poc' '!/workflows/assets' '!/tests/fixtures' '!/public/examples'
git checkout
```

First time: a browser opens to sign in to GitHub as `yopiheart` → Authorize →
close the browser.

⚠️ **`--filter=blob:none` on its own is a trap.** Without `--no-checkout`, the
checkout backfills every blob and you end up with **3.2 GB**, worse than a plain
clone. Both halves are load-bearing. Measured 2026-08-16.

What you get: **68 MB**, all 1,689 commits, every remote branch, all 30 skills,
8 hooks, 2 agents, the output style, the four GitHub Actions, and all 100
workflow docs. Verified 2026-08-16: `npm run build` passed, `npm test` 1,214
passed / 0 failed.

What is missing: client media, wallpapers, and the wizard's example photos. See
[Pulling media back](#pulling-media-back).

### A3. Environment file (~2 min)

```powershell
notepad .env
```

Notepad says "Cannot find the file, create?" → **Yes**. On the phone: Bitwarden
→ **GRIFON env** Secure Note → Notes → Copy. On the PC: `Ctrl+V`, `Ctrl+S`, close.

### A4. Restore scripts

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\restore-git-identity.ps1
git config --global user.name    # MUST print a name — see the warning below
npm install
```

**Do not skip `restore-git-identity`, and do not trust it silently.** The
defreezer wipes `~/.gitconfig`. Without an identity, git refuses `git commit` at
the *end* of the day, after a full day of work, on a machine where uncommitted
work dies at reboot. It **did not take on 2026-08-14** — always verify with
`git config --global user.name` before starting. `scripts/cafe-start.ps1` runs
this check for you and hard-fails if it did not take.

Optional, run only what this session will actually use:

```powershell
.\scripts\restore-gh.ps1              # gh CLI — needed for PR and issue tools
.\scripts\restore-playwright-mcp.ps1  # needed by the smoke-tester subagent
.\scripts\restore-python.ps1          # needed by tools/*.py
.\scripts\restore-codex.ps1           # Codex CLI executor lane
.\scripts\restore-vercel.ps1          # Vercel CLI + project link
.\scripts\restore-notebooklm.ps1      # NotebookLM MCP
npx playwright install chromium       # browser for smoke tests
```

### A5. Open it

```powershell
code .
```

The SessionStart hook reads `NOW.md` and prints the next action on its own.
**No orientation prompt is needed.** If a summary is still wanted:

> Read NOW.md, CLAUDE.md, agent_lessons.md, and the last 5 git log entries. Then
> tell me where the project is and what was finished yesterday.

### A6. Operating warnings on a cafe PC

Carried over from `NOW.md`'s gated block so they survive a resume-doc rewrite.
Every one of these is a mistake the repo has already paid for:

- **Neither `gh` nor `claude` is on PATH** after a wipe until the matching
  restore script runs.
- **Bash is network-sandboxed here — use PowerShell** for anything that needs
  the network.
- **Never pipe build output.** It truncates the part that carries the error.
- ⚠️ **The ENV WARDEN hook blocks every read of the environment file.** Ask Neil
  for a value, never route around the hook.
- **Each funnel under `funnels/` has its own `node_modules`** — a root
  `npm install` does not cover them.
- **Every `scripts/*.ps1` must stay pure ASCII.** The shop PC runs Windows
  PowerShell 5.1, which reads a BOM-less `.ps1` as Windows-1252. One em dash
  inside a quoted string decodes to a stray double quote and takes the whole
  file down with parse errors, as `cafe-start.ps1` did on 2026-08-16. Enforced
  by `npm run check:ps1-ascii`, which runs automatically before `npm run build`.

---

## ROUTE B — USB SSD (~1 min per session)

The defreezer does not touch a USB drive. The whole rig lives there.

### One-time setup

Needs a real **USB SSD**, not a thumb drive. `node_modules` is 595 MB spread
across 27,840 small files, and flash drives choke on that.

```
E:\
  tools\
    PortableGit\      PortableGit .7z.exe from git-scm.com, extracted here
    node\             node-v22-x64.zip from nodejs.org, extracted here
    VSCode\           VS Code "Windows x64 zip" + create a data\ folder
                      right beside code.exe (that is what portable mode is)
  grifon-command\     the lite clone from A2, with node_modules
  cafe-start.ps1      copied from scripts/cafe-start.ps1
```

That `data\` folder is the whole reason this works. VS Code writes its
extensions and settings there, so the defreezer cannot reach them.

### Every session

```powershell
E:\cafe-start.ps1
```

That is it. It puts the portable tools on PATH, verifies the git identity,
fetches, and opens VS Code.

### Four things to know first

1. **A real USB SSD.** See the file count above.
2. **Some shops block USB**, or run antivirus that refuses `.exe` from a
   removable drive. Only the shop itself will tell you.
3. **The environment file holds live API keys.** If the USB is lost, the keys are
   lost. Use BitLocker To Go, or leave it in Bitwarden and paste per session.
4. **Not yet verified:** whether the Claude Code sign-in survives in VS Code
   portable mode. Probably yes, because of `data\`, but it has not been tested on
   Windows. If not, it is one extra sign-in.

---

## Pulling media back

The lite clone has no `clients/`, `assets/`, `samples/`, or `public/examples`.
All of it is still on GitHub. Pull one folder, not everything:

```powershell
git sparse-checkout add clients/oceanides/kuya-marvin/ads/km-004
git sparse-checkout add assets/wallpapers
```

⚠️ **Before any wizard smoke test, add `public/examples`:**

```powershell
git sparse-checkout add public/examples
```

`components/guidedPhotoSlots.tsx` serves 23 reference shots from `/examples/*.png`.
Without them `npm run dev` renders that surface with broken images, and a
`smoke-tester` run will report a checkout artifact as a real UI regression. Prod
is unaffected — Vercel builds from the full repo.

⚠️ **Before rebuilding any artifact twin, add what its builder reads.** CLAUDE.md
makes the committed twin under `artifacts/` a standing deliverable, and three
builders read straight out of excluded paths:

| Builder | Reads |
|---|---|
| `tools/artifacts/build-one-hook-twelve-worlds.mjs` | `assets/ad-swipe/` |
| `tools/artifacts/build-km-week01-runsheet.mjs` | `clients/oceanides/kuya-marvin/organic/` |
| `tools/artifacts/build-gabriel-review.mjs` | `clients/oceanides/kuya-gabriel/identity-lock/` |

⚠️ **`/artifacts` stays excluded, but the ONE anchored twin is re-included** (2026-08-26). The
sparse line carries `'!/artifacts' '/artifacts/eli5-image-gate.html'` — the later pattern wins and
exactly that 16 KB file comes down.

**That was asserted before it was measured, and `gitignore(5)` says the opposite for its own
engine** (*"It is not possible to re-include a file if a parent directory of that file is
excluded"*). Flagged by the PR #118 reviewer, who could not run the check. Verified on git 2.43.0
— sparse-checkout does NOT inherit that restriction; the twin comes down and the heavy pages do
not. Re-run it before trusting any change to this line:

```powershell
printf '/*\n!/clients\n!/assets\n!/baselines\n!/artifacts\n/artifacts/eli5-image-gate.html\n' > rules.txt
echo "artifacts/eli5-image-gate.html" | git sparse-checkout check-rules --no-cone --rules-file rules.txt   # prints the path = included
echo "artifacts/km-value-week-01.html" | git sparse-checkout check-rules --no-cone --rules-file rules.txt  # prints nothing = excluded
```

Why not just drop the exclusion: an earlier version of this block did, on the grounds that
"it is text, so it costs nothing." **Measured, that was wrong.** `artifacts/` is 3.5 MB and 96% of
it is two base64-heavy pages — `km-value-week-01.html` 2.3 MB, `gabriel-review.html` 628 KB — none
of which any check reads. At the ~30 KiB/s this file records for cafe wifi that is ~2 extra minutes
on a clone whose whole purpose is avoiding a 13-hour one, and it grows with every kept artifact. A
sentence that says "costs nothing" never gets re-measured, so it must not be written.

The reason the path matters at all: `npm run check:artifact-anchors` — the `artifacts` CI job's
local equivalent (`loops.md` Tier 0d) — is *unreliable* when the twin is sparse-excluded. The
builder `mkdir`+`writeFile`s into the excluded directory regardless, the twin still reads as
tracked, and `git diff HEAD` then either ignores the entry (**false green**, the exact failure the
check exists to kill) or cries wolf. `check-anchors.mjs` now detects the skip-worktree flag and
refuses to answer rather than guess — that refusal is what actually closes the hole; re-including
the file is the convenience on top of it.

Note this is the inverse of the table above: those builders *read* an excluded folder, this one
*writes into one*. **A second anchored artifact needs its twin added to the sparse line too.**

On a lite clone the best case is an ENOENT and a session burned diagnosing a
checkout artifact as a code bug. The worse case is a twin that builds with
missing images: `finalize()` in `tools/artifacts/_gates.mjs` gates ASCII purity,
not asset presence, so nothing catches it. Add the folder first.

`tests/fixtures` is safe to leave out: its only consumers are the opt-in
regression tests, which are skipped by default. That is why the 1,214-passing
figure holds on a lite clone.

List the current patterns:

```powershell
git sparse-checkout list
```

To take the whole 1.5 GB anyway (clear an afternoon):

```powershell
git sparse-checkout disable
```

---

## End of session

```powershell
git add .
git commit -m "what you actually did"
git push -u origin <branch>
```

If the current branch is `main`, branch first. Auto-deploys to app.grifon.ai
about 2-3 minutes after the push.

**Overwrite `NOW.md` before leaving** if the state of the work changed. It is the
first thing the next session reads, it is capped at 90 lines, and it is
overwritten, never appended.

---

## Parallel worktrees (optional)

For two Claude sessions running at once on different branches:

```powershell
.\scripts\spawn-worktrees.ps1 feat/one feat/two
```

Cheap on a lite clone: a worktree inherits the sparse-checkout pattern, so each
one is **42 MB** rather than 1.5 GB (measured 2026-08-16).

Until 2026-08-16 the script was hardcoded to `feat/wizard-persist` and
`feat/camera-buckets`, both long since merged and deleted from origin, so it
errored on every run before reaching `npm install`. It takes branch names as
arguments now, and validates them against origin first.

---

## ⚠ Open decisions: stopping the growth

The repo has been adding roughly **400 MB per month** since June. The lite clone
buys time, it is not a cure — 68 MB creeps up in step with the repo.

**Done, and only this much:** `.gitignore` rules for the large wallpaper variants
and the upscaled motion tests. Be precise about what that achieves. `.gitignore`
has no effect on files already tracked, and all 19 wallpaper variants (113 MB)
plus both upscaled clips (81 MB) are tracked at HEAD and still ship in every
clone. Re-rendering an existing filename is a *modification to a tracked file*,
which `.gitignore` also does not suppress. **These rules only stop brand-new
filenames.** Actually removing that 194 MB needs `git rm --cached`, which is a
separate decision.

**Not done, needs Neil's call:** `clients/*/ads/*/clips/`. Heaviest of all at
25 MB each, but these are **paid Veo generations** and unrecoverable if lost.
Deliberately not gitignored: ignoring them without another home is the same as
guaranteeing the defreezer eats the next batch. Needs a destination first —
Google Drive, Cloudflare R2, or Git LFS.

**Separate and larger:** `git filter-repo` to strip the 1.5 GB out of history.
That is the only thing that shrinks an actual clone. **Irreversible**, needs a
force push, and breaks every existing clone and branch. Never without Neil.

---

*Written 2026-08-16 after 3 days of failed clones at 3 different shops. Every
number here was measured that day, not estimated.*
