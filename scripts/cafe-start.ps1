# Cafe session starter. Pinapalitan nito ang Phase 1-5 ng lumang SOP.
#
# Dalawang lugar syang tumatakbo, at kusa nyang nahuhulaan kung alin:
#
#   1. USB SSD (Daan B) — kopyahin ang file na to sa ugat ng drive, katabi ng
#      tools\ at grifon-command\:
#          E:\cafe-start.ps1
#          E:\tools\PortableGit\  E:\tools\node\  E:\tools\VSCode\
#          E:\grifon-command\
#      Tapos kada session:  E:\cafe-start.ps1
#
#   2. Loob ng repo (Daan A) — kung nasa scripts\ sya, ang magulang na folder
#      ang repo. Walang portable tools, gagamitin ang naka-install sa system:
#          .\scripts\cafe-start.ps1
#
# Idempotent. Walang binubura, walang sine-save na secret, walang binabasang
# laman ng environment file (tinitingnan lang kung meron).
#
# Buong runbook: workflows/cafe_session.md

[CmdletBinding()]
param(
    # Laktawan ang pagbukas ng VS Code sa dulo.
    [switch]$NoCode,
    # Laktawan ang git fetch (kapag sobrang bagal ng wifi).
    [switch]$NoFetch
)

$ErrorActionPreference = 'Stop'

function Say([string]$msg, [string]$color = 'Gray') { Write-Host $msg -ForegroundColor $color }
function Ok ([string]$msg) { Say "  [ok]   $msg" 'Green' }
function Warn([string]$msg) { Say "  [warn] $msg" 'Yellow' }
function Info([string]$msg) { Say "  [..]   $msg" 'Cyan' }

Say ''
Say '=== GRIFON cafe session ===' 'White'
Say ''

# --- Saan tayo? -------------------------------------------------------------
$here = $PSScriptRoot
if (-not $here) { $here = (Get-Location).Path }

if (Test-Path (Join-Path $here 'grifon-command\.git')) {
    # Daan B: nasa ugat ng USB, ang repo ay isang sibling folder.
    $root     = $here
    $repoPath = Join-Path $here 'grifon-command'
    $mode     = 'USB'
} elseif (Test-Path (Join-Path (Split-Path -Parent $here) '.git')) {
    # Daan A: nasa scripts\ sa loob mismo ng repo.
    $repoPath = Split-Path -Parent $here
    $root     = Split-Path -Parent $repoPath
    $mode     = 'repo'
} else {
    Say 'ERROR: hindi ko mahanap ang grifon-command repo.' 'Red'
    Say ''
    Say 'Ilagay ang script na to sa isa sa dalawa:' 'Yellow'
    Say '  - ugat ng USB, katabi ng grifon-command\ folder' 'Yellow'
    Say '  - loob ng repo sa scripts\cafe-start.ps1' 'Yellow'
    exit 1
}

Info "mode: $mode"
Info "repo: $repoPath"
Say ''

# --- Portable tools sa PATH (USB mode lang) ---------------------------------
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
    Info 'walang portable tools, gagamitin ang naka-install sa system'
}

foreach ($cmd in @('git', 'node', 'npm')) {
    $found = Get-Command $cmd -ErrorAction SilentlyContinue
    if ($found) {
        $v = (& $cmd --version 2>&1 | Select-Object -First 1)
        Ok "$cmd  $v"
    } else {
        Say "  [MISSING] $cmd — wala sa PATH" 'Red'
        Say '            Tingnan ang workflows/cafe_session.md phase A1.' 'Yellow'
        exit 1
    }
}
Say ''

# --- Git identity -----------------------------------------------------------
# Binubura ng defreezer ang ~/.gitconfig. Kapag wala to, bibigo ang commit mo sa
# DULO ng araw, pagkatapos mo nang magtrabaho buong araw.
Say 'Git identity' 'White'
$gitName  = (git -C $repoPath config user.name  2>$null)
$gitEmail = (git -C $repoPath config user.email 2>$null)
if ($gitName -and $gitEmail) {
    Ok "$gitName <$gitEmail>"
} else {
    Warn 'walang git identity — bibigo ang git commit mo mamaya'
    $restore = Join-Path $repoPath 'scripts\restore-git-identity.ps1'
    if (Test-Path $restore) {
        Info 'pinapatakbo ang restore-git-identity.ps1'
        & $restore
    } else {
        Say '  Patakbuhin: git config --global user.name "..." at user.email "..."' 'Yellow'
    }
}
Say ''

# --- Environment file (existence check LANG, walang binabasang laman) --------
Say 'Environment' 'White'
$envPath = Join-Path $repoPath '.env'
if (Test-Path $envPath) {
    $lines = (Get-Content $envPath | Measure-Object -Line).Lines
    Ok "environment file nandyan ($lines na linya)"
} else {
    Warn 'WALANG environment file — hindi tatakbo ang dev server at ang api\ handlers'
    Say '  Bitwarden -> GRIFON env Secure Note -> Copy -> notepad .env -> paste -> save' 'Yellow'
}
Say ''

# --- Fetch ------------------------------------------------------------------
if (-not $NoFetch) {
    Say 'Git' 'White'
    Info 'nag-fe-fetch sa origin'
    git -C $repoPath fetch origin --quiet
    $branch = (git -C $repoPath branch --show-current)
    Ok "branch: $branch"

    $sparse = (git -C $repoPath config core.sparseCheckout)
    if ($sparse -eq 'true') {
        Ok 'lite clone (sparse-checkout naka-on)'
    } else {
        Warn 'buong clone — 1.5 GB. Tingnan ang workflows/cafe_session.md phase A2.'
    }

    $behind = (git -C $repoPath rev-list --count "HEAD..origin/$branch" 2>$null)
    if ($behind -and [int]$behind -gt 0) {
        Warn "$behind na commit ang nauna sa iyo. Patakbuhin: git pull"
    } else {
        Ok 'up to date'
    }
    Say ''
}

# --- Dependencies -----------------------------------------------------------
Say 'Dependencies' 'White'
if (Test-Path (Join-Path $repoPath 'node_modules')) {
    Ok 'node_modules nandyan'
} else {
    Info 'walang node_modules, nag-i-install (~3 min)'
    Push-Location $repoPath
    try { npm install } finally { Pop-Location }
    Ok 'tapos ang npm install'
}
Say ''

# --- NOW.md -----------------------------------------------------------------
$now = Join-Path $repoPath 'NOW.md'
if (Test-Path $now) {
    Say 'NOW.md — kung saan tumigil ang trabaho' 'White'
    Get-Content $now -TotalCount 12 | ForEach-Object { Say "  $_" }
    Say ''
}

# --- Buksan -----------------------------------------------------------------
if (-not $NoCode) {
    if (Get-Command code -ErrorAction SilentlyContinue) {
        Info 'binubuksan ang VS Code'
        Start-Process -FilePath 'code' -ArgumentList $repoPath -NoNewWindow
    } else {
        Warn "wala ang 'code' sa PATH — buksan mo na lang ang VS Code nang manu-mano sa $repoPath"
    }
}

Say ''
Say 'Handa ka na.' 'Green'
Say ''
