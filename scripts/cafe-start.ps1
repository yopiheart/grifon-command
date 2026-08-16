# Cafe session starter. Replaces phases 1-5 of the old SOP.
#
# Runs from two places and works out which on its own:
#
#   1. USB SSD (Route B) - copy this file to the root of the drive, beside
#      tools\ and grifon-command\:
#          E:\cafe-start.ps1
#          E:\tools\PortableGit\  E:\tools\node\  E:\tools\VSCode\
#          E:\grifon-command\
#      Then every session:  E:\cafe-start.ps1
#
#   2. Inside the repo (Route A) - when it sits in scripts\, the parent folder
#      is the repo. No portable tools, uses whatever is installed on the system:
#          .\scripts\cafe-start.ps1
#
# Idempotent. Deletes nothing, saves no secrets, and never reads the contents of
# the environment file (it checks size on disk only, never Get-Content).
#
# Full runbook: workflows/cafe_session.md

[CmdletBinding()]
param(
    # Skip opening VS Code at the end.
    [switch]$NoCode,
    # Skip the git fetch (for when the wifi is crawling).
    [switch]$NoFetch
)

$ErrorActionPreference = 'Stop'

# Some git reads are ALLOWED to fail: `git config <key>` exits 1 when the key is
# unset, and `rev-list HEAD..origin/<branch>` exits non-zero when the upstream
# ref does not exist. Both are normal states this script has to detect.
#
# Do NOT disable $PSNativeCommandUseErrorActionPreference script-wide to allow
# that. It would also swallow a failed `npm install` or `git fetch`, and the
# script would print a green "Ready." over a broken checkout. Set it inside this
# helper only, where PowerShell scopes it to the function body.
#
# Windows PowerShell 5.1 never throws on native exits at all, so the explicit
# $LASTEXITCODE checks further down are what make the loud paths loud there.
function Read-GitValue {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    $PSNativeCommandUseErrorActionPreference = $false
    $out = & git @GitArgs 2>$null
    return [pscustomobject]@{ Value = ($out | Select-Object -First 1); Code = $LASTEXITCODE }
}

function Say([string]$msg, [string]$color = 'Gray') { Write-Host $msg -ForegroundColor $color }
function Ok  ([string]$msg) { Say "  [ok]   $msg" 'Green' }
function Warn([string]$msg) { Say "  [warn] $msg" 'Yellow' }
function Info([string]$msg) { Say "  [..]   $msg" 'Cyan' }

Say ''
Say '=== GRIFON cafe session ===' 'White'
Say ''

# --- Where are we? ----------------------------------------------------------
$here = $PSScriptRoot
if (-not $here) { $here = (Get-Location).Path }

if (Test-Path (Join-Path $here 'grifon-command\.git')) {
    # Route B: at the USB root, repo is a sibling folder.
    $root     = $here
    $repoPath = Join-Path $here 'grifon-command'
    $mode     = 'USB'
} elseif (Test-Path (Join-Path (Split-Path -Parent $here) '.git')) {
    # Route A: in scripts\ inside the repo itself.
    $repoPath = Split-Path -Parent $here
    $root     = Split-Path -Parent $repoPath
    $mode     = 'repo'
} else {
    Say 'ERROR: cannot find the grifon-command repo.' 'Red'
    Say ''
    Say 'Put this script in one of two places:' 'Yellow'
    Say '  - the USB root, beside the grifon-command\ folder' 'Yellow'
    Say '  - inside the repo at scripts\cafe-start.ps1' 'Yellow'
    exit 1
}

Info "mode: $mode"
Info "repo: $repoPath"
Say ''

# --- Portable tools on PATH (USB mode only) ---------------------------------
Say 'Tools' 'White'
$portable = @(
    @{ Name = 'git';  Path = Join-Path $root 'tools\PortableGit\cmd' }
    @{ Name = 'node'; Path = Join-Path $root 'tools\node' }
    @{ Name = 'code'; Path = Join-Path $root 'tools\VSCode\bin' }
)
$addedAny = $false
foreach ($t in $portable) {
    if (Test-Path $t.Path) {
        if ($env:PATH -notlike "*$($t.Path)*") {
            $env:PATH = "$($t.Path);$env:PATH"
        }
        Ok "portable $($t.Name)"
        $addedAny = $true
    }
}
if (-not $addedAny) {
    Info 'no portable tools found, using whatever is installed on the system'
}

foreach ($cmd in @('git', 'node', 'npm')) {
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($found) {
        $v = (& $cmd --version 2>&1 | Select-Object -First 1)
        Ok "$cmd  $v"
    } else {
        Say "  [MISSING] $cmd - not on PATH" 'Red'
        Say '            See workflows/cafe_session.md phase A1.' 'Yellow'
        exit 1
    }
}
Say ''

# --- Git identity -----------------------------------------------------------
# The defreezer wipes ~/.gitconfig. Without an identity, git refuses the commit
# at the END of the day, after a full day of work. restore-git-identity.ps1 did
# NOT take on 2026-08-14, so running it is not enough - verify it afterwards.
Say 'Git identity' 'White'
$gitName  = (Read-GitValue -C $repoPath config user.name).Value
$gitEmail = (Read-GitValue -C $repoPath config user.email).Value
if ($gitName -and $gitEmail) {
    Ok "$gitName <$gitEmail>"
} else {
    Warn 'no git identity - commits would fail at the end of the day'
    $restore = Join-Path $repoPath 'scripts\restore-git-identity.ps1'
    if (Test-Path $restore) {
        Info 'running restore-git-identity.ps1'
        & $restore

        # Verify it actually took. It silently no-opped once before.
        $gitName  = (Read-GitValue -C $repoPath config user.name).Value
        $gitEmail = (Read-GitValue -C $repoPath config user.email).Value
        if ($gitName -and $gitEmail) {
            Ok "restored: $gitName <$gitEmail>"
        } else {
            Say '' 'Red'
            Say '  [FAIL] restore-git-identity.ps1 ran but the identity is STILL unset.' 'Red'
            Say '         This is the 2026-08-14 failure repeating. Set it by hand NOW,' 'Red'
            Say '         before doing any work - otherwise the whole day is lost at reboot:' 'Red'
            Say '' 'Red'
            Say '           git config --global user.name  "Neil Maglaya"' 'Yellow'
            Say '           git config --global user.email "neilmaglaya.business22@gmail.com"' 'Yellow'
            Say '' 'Red'
            exit 1
        }
    } else {
        Say '  Run: git config --global user.name "..." and user.email "..."' 'Yellow'
        exit 1
    }
}
Say ''

# --- Environment file (existence + size only, contents are NEVER read) -------
Say 'Environment' 'White'
$envPath = Join-Path $repoPath '.env'
if (Test-Path $envPath) {
    $bytes = (Get-Item $envPath).Length
    if ($bytes -gt 0) {
        Ok "environment file present ($bytes bytes)"
    } else {
        Warn 'environment file exists but is EMPTY - paste it from Bitwarden'
    }
} else {
    Warn 'NO environment file - the dev server and the api\ handlers will not run'
    Say '  Bitwarden -> GRIFON env Secure Note -> Copy -> notepad .env -> paste -> save' 'Yellow'
}
Say ''

# --- Fetch ------------------------------------------------------------------
if (-not $NoFetch) {
    Say 'Git' 'White'
    Info 'fetching origin'
    git -C $repoPath fetch origin --quiet
    if ($LASTEXITCODE -ne 0) {
        Say '' 'Red'
        Say '  [FAIL] git fetch failed. Everything below would compare against stale' 'Red'
        Say '         refs and could report a green "up to date" that is not true.' 'Red'
        Say '         Check the wifi, then re-run. -NoFetch skips this step.' 'Yellow'
        exit 1
    }
    $branch = (Read-GitValue -C $repoPath branch --show-current).Value

    if (-not $branch) {
        Warn 'detached HEAD - cannot compare against origin'
    } else {
        Ok "branch: $branch"

        # Distinguish "0 behind" from "the check could not run at all". A local-only
        # branch has no origin/<branch>, and the revspec below just errors; falling
        # through to a green "up to date" would be a lie.
        $drift  = Read-GitValue -C $repoPath rev-list --count "HEAD..origin/$branch"
        $behind = $drift.Value
        if ($drift.Code -ne 0 -or -not $behind) {
            Warn "cannot measure drift - origin/$branch may not exist yet"
        } elseif ([int]$behind -gt 0) {
            Warn "$behind commit(s) ahead of you on origin. Run: git pull"
        } else {
            Ok 'up to date'
        }
    }

    $sparse = (Read-GitValue -C $repoPath config core.sparseCheckout).Value
    if ($sparse -eq 'true') {
        Ok 'lite clone (sparse-checkout on)'
    } else {
        Warn 'full clone - 1.5 GB. See workflows/cafe_session.md phase A2.'
    }
    Say ''
}

# --- Dependencies -----------------------------------------------------------
Say 'Dependencies' 'White'
if (Test-Path (Join-Path $repoPath 'node_modules')) {
    Ok 'node_modules present'
} else {
    Info 'no node_modules, installing (~3 min)'
    Push-Location $repoPath
    try { npm install } finally { Pop-Location }
    if ($LASTEXITCODE -ne 0) {
        Say '' 'Red'
        Say '  [FAIL] npm install exited non-zero. node_modules is incomplete.' 'Red'
        Say '         Do NOT start work - this surfaces later as module-not-found' 'Red'
        Say '         from npm run dev, 20 minutes from now. Usually the wifi died.' 'Yellow'
        Say '         Re-run this script; npm install resumes from the cache.' 'Yellow'
        exit 1
    }
    Ok 'npm install finished'
}
Say ''

# --- NOW.md -----------------------------------------------------------------
$now = Join-Path $repoPath 'NOW.md'
if (Test-Path $now) {
    # Print the NEXT ACTION section specifically. The first 12 lines used to be
    # printed instead, which stopped short of the one line this preview exists
    # to surface - the heading currently sits well below line 12.
    Say 'NOW.md - the next action' 'White'
    $lines   = Get-Content $now
    # Matched loosely on purpose. The real heading carries a U+25B6 glyph, and a
    # literal one in this file is exactly the bug that broke this script on
    # 2026-08-16: Windows PowerShell 5.1 reads a BOM-less .ps1 as Windows-1252,
    # so any multi-byte character mojibakes, and an em dash's third byte (0x94)
    # decodes to a double quote that terminates the surrounding string. Keep this
    # file pure ASCII; `npm run check:ps1-ascii` enforces it.
    $start   = ($lines | Select-String -Pattern '^##\s.*NEXT ACTION' | Select-Object -First 1).LineNumber
    if ($start) {
        $body = @()
        for ($i = $start - 1; $i -lt $lines.Count; $i++) {
            if ($i -gt ($start - 1) -and $lines[$i] -match '^## ') { break }
            $body += $lines[$i]
        }
        $body | ForEach-Object { Say "  $_" }
    } else {
        Warn 'no "NEXT ACTION" heading in NOW.md - the SessionStart hook greps for it'
        $lines | Select-Object -First 12 | ForEach-Object { Say "  $_" }
    }
    Say ''
}

# --- Open -------------------------------------------------------------------
if (-not $NoCode) {
    if (Get-Command code -ErrorAction SilentlyContinue) {
        Info 'opening VS Code'
        Start-Process -FilePath 'code' -ArgumentList $repoPath -NoNewWindow
    } else {
        Warn "'code' not on PATH - open VS Code by hand at $repoPath"
    }
}

Say ''
Say 'Ready.' 'Green'
Say ''
