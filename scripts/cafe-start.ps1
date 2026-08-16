# Cafe session starter. Replaces phases 1-5 of the old SOP.
#
# Runs from two places and works out which on its own:
#
#   1. USB SSD (Route B) — copy this file to the root of the drive, beside
#      tools\ and grifon-command\:
#          E:\cafe-start.ps1
#          E:\tools\PortableGit\  E:\tools\node\  E:\tools\VSCode\
#          E:\grifon-command\
#      Then every session:  E:\cafe-start.ps1
#
#   2. Inside the repo (Route A) — when it sits in scripts\, the parent folder
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

# PowerShell 7.3+ turns a non-zero exit from a native command into a terminating
# error when $ErrorActionPreference is 'Stop'. This script deliberately reads
# $LASTEXITCODE and empty output from `git config` (exit 1 when a key is unset),
# so that behaviour has to stay off or the identity check below never runs.
# Harmless on Windows PowerShell 5.1, where the variable does not exist.
$PSNativeCommandUseErrorActionPreference = $false

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
        Say "  [MISSING] $cmd — not on PATH" 'Red'
        Say '            See workflows/cafe_session.md phase A1.' 'Yellow'
        exit 1
    }
}
Say ''

# --- Git identity -----------------------------------------------------------
# The defreezer wipes ~/.gitconfig. Without an identity, git refuses the commit
# at the END of the day, after a full day of work. restore-git-identity.ps1 did
# NOT take on 2026-08-14, so running it is not enough — verify it afterwards.
Say 'Git identity' 'White'
$gitName  = (git -C $repoPath config user.name  2>$null)
$gitEmail = (git -C $repoPath config user.email 2>$null)
if ($gitName -and $gitEmail) {
    Ok "$gitName <$gitEmail>"
} else {
    Warn 'no git identity — commits would fail at the end of the day'
    $restore = Join-Path $repoPath 'scripts\restore-git-identity.ps1'
    if (Test-Path $restore) {
        Info 'running restore-git-identity.ps1'
        & $restore

        # Verify it actually took. It silently no-opped once before.
        $gitName  = (git -C $repoPath config user.name  2>$null)
        $gitEmail = (git -C $repoPath config user.email 2>$null)
        if ($gitName -and $gitEmail) {
            Ok "restored: $gitName <$gitEmail>"
        } else {
            Say '' 'Red'
            Say '  [FAIL] restore-git-identity.ps1 ran but the identity is STILL unset.' 'Red'
            Say '         This is the 2026-08-14 failure repeating. Set it by hand NOW,' 'Red'
            Say '         before doing any work — otherwise the whole day is lost at reboot:' 'Red'
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
        Warn 'environment file exists but is EMPTY — paste it from Bitwarden'
    }
} else {
    Warn 'NO environment file — the dev server and the api\ handlers will not run'
    Say '  Bitwarden -> GRIFON env Secure Note -> Copy -> notepad .env -> paste -> save' 'Yellow'
}
Say ''

# --- Fetch ------------------------------------------------------------------
if (-not $NoFetch) {
    Say 'Git' 'White'
    Info 'fetching origin'
    git -C $repoPath fetch origin --quiet
    $branch = (git -C $repoPath branch --show-current)

    if (-not $branch) {
        Warn 'detached HEAD — cannot compare against origin'
    } else {
        Ok "branch: $branch"

        # Distinguish "0 behind" from "the check could not run at all". A local-only
        # branch has no origin/<branch>, and the revspec below just errors; falling
        # through to a green "up to date" would be a lie.
        $behind = (git -C $repoPath rev-list --count "HEAD..origin/$branch" 2>$null)
        if ($LASTEXITCODE -ne 0 -or -not $behind) {
            Warn "cannot measure drift — origin/$branch may not exist yet"
        } elseif ([int]$behind -gt 0) {
            Warn "$behind commit(s) ahead of you on origin. Run: git pull"
        } else {
            Ok 'up to date'
        }
    }

    $sparse = (git -C $repoPath config core.sparseCheckout)
    if ($sparse -eq 'true') {
        Ok 'lite clone (sparse-checkout on)'
    } else {
        Warn 'full clone — 1.5 GB. See workflows/cafe_session.md phase A2.'
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
    Ok 'npm install finished'
}
Say ''

# --- NOW.md -----------------------------------------------------------------
$now = Join-Path $repoPath 'NOW.md'
if (Test-Path $now) {
    Say 'NOW.md — where the work stopped' 'White'
    Get-Content $now -TotalCount 12 | ForEach-Object { Say "  $_" }
    Say ''
}

# --- Open -------------------------------------------------------------------
if (-not $NoCode) {
    if (Get-Command code -ErrorAction SilentlyContinue) {
        Info 'opening VS Code'
        Start-Process -FilePath 'code' -ArgumentList $repoPath -NoNewWindow
    } else {
        Warn "'code' not on PATH — open VS Code by hand at $repoPath"
    }
}

Say ''
Say 'Ready.' 'Green'
Say ''
