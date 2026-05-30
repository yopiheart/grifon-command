# Restore the GitHub CLI (`gh`) after the cafe defreezer wipes the machine
# overnight. `gh` lets Claude Code open/manage PRs directly instead of handing
# you a manual create-URL. No package manager is installed on the cafe PCs, so
# this downloads the portable Windows zip into the repo-relative .tools\gh\
# folder (gitignored — the binary is NOT committed; we re-download each session).
#
# Usage (from the grifon-command folder, in PowerShell):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if not already set this session
#   .\scripts\restore-gh-cli.ps1
#
# After this finishes:
#   1. `gh` is at .tools\gh\bin\gh.exe and added to $env:PATH for THIS session.
#      To use it in a new terminal without re-running, add that bin dir to PATH,
#      or just re-run this script (it's idempotent — skips the download if present).
#   2. Authenticate once per session:  gh auth login   (or set $env:GH_TOKEN /
#      GITHUB_TOKEN to a PAT to skip the interactive flow).

$ErrorActionPreference = "Stop"

# Pin a known-good version; bump when a newer gh is needed. The cafe PCs are
# AMD64/64-bit Windows.
$Version = "2.93.0"
$Asset   = "gh_${Version}_windows_amd64.zip"
$Url     = "https://github.com/cli/cli/releases/download/v${Version}/${Asset}"

# Resolve repo root relative to this script (scripts\ -> repo root).
$repoRoot  = Split-Path -Parent $PSScriptRoot
$toolsDir  = Join-Path $repoRoot ".tools"
$ghHome    = Join-Path $toolsDir "gh"
$ghBin     = Join-Path $ghHome "bin"
$ghExe     = Join-Path $ghBin "gh.exe"

function Add-GhToPath {
    if ($env:Path -notlike "*$ghBin*") {
        $env:Path = "$ghBin;$env:Path"
    }
}

# Idempotent: if the right version is already extracted, just ensure PATH.
if (Test-Path $ghExe) {
    $existing = & $ghExe --version 2>$null | Select-Object -First 1
    if ($existing -match [regex]::Escape($Version)) {
        Add-GhToPath
        Write-Host "OK: gh $Version already present at $ghExe" -ForegroundColor Green
        Write-Host "PATH updated for this session." -ForegroundColor Cyan
        exit 0
    }
    # Wrong version present — clear it out and re-download.
    Remove-Item -Recurse -Force $ghHome
}

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null

$zipPath = Join-Path $toolsDir $Asset
Write-Host "Downloading $Asset ..." -ForegroundColor Cyan
# Faster download than the default progress-rendering path.
$oldPref = $ProgressPreference
$ProgressPreference = "SilentlyContinue"
try {
    Invoke-WebRequest -Uri $Url -OutFile $zipPath -UseBasicParsing
} finally {
    $ProgressPreference = $oldPref
}

Write-Host "Extracting to $ghHome ..." -ForegroundColor Cyan
# The zip contains a top-level bin\gh.exe (+ share\). Extract straight into $ghHome.
Expand-Archive -Path $zipPath -DestinationPath $ghHome -Force
Remove-Item -Force $zipPath

if (-not (Test-Path $ghExe)) {
    Write-Host "ERROR: expected $ghExe after extract, not found." -ForegroundColor Red
    Write-Host "Inspect $ghHome to see the actual layout." -ForegroundColor Red
    exit 1
}

Add-GhToPath

Write-Host ""
Write-Host "OK: gh $Version installed at $ghExe" -ForegroundColor Green
& $ghExe --version | Select-Object -First 1 | ForEach-Object { Write-Host "  $_" }
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Authenticate (once per session): gh auth login"
Write-Host "     ...or set `$env:GH_TOKEN to a PAT to skip the interactive flow."
Write-Host "  2. gh is on PATH for THIS PowerShell session only. New terminals"
Write-Host "     need this script re-run (it will skip the download if present)."
Write-Host ""
