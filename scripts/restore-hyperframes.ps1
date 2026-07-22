# Restore the Hyperframes HTML->MP4 lane after the cafe defreezer wipes the
# machine overnight. The lane (workflows/hyperframes_decision.md) needs three
# things the wipe kills: a FULL FFmpeg build (ffprobe included -- the repo's
# ffmpeg-static has no ffprobe, Hyperframes requires both), the Chrome
# Headless Shell (npx hyperframes browser ensure), and the npx package cache.
# Node itself survives in the frozen image (C:\Program Files\nodejs).
#
# Idempotent, same pattern as restore-python.ps1. FFmpeg lands in the
# repo-relative .tools\ folder (gitignored); Chrome shell in the user cache.
#
# Usage (from the grifon-command folder, in PowerShell):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if needed
#   .\scripts\restore-hyperframes.ps1
#
# After this finishes, ffmpeg + ffprobe are on $env:PATH for THIS session.
# Compositions live in scratch dirs (never the product package.json); the
# committed bake-off composition is workflows/assets/hyperframes-bakeoff/
# composition-index.html -- copy it into an `npx hyperframes init` scaffold
# to re-render.

$ErrorActionPreference = "Stop"

$PinnedHyperframes = "hyperframes@0.7.68"  # bump deliberately; 0.x moves fast
$FfmpegUrl = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

$repoRoot = Split-Path -Parent $PSScriptRoot
$toolsDir = Join-Path $repoRoot ".tools"
$ffRoot   = Join-Path $toolsDir "ffmpeg"

function Find-FfmpegBin {
    if (Test-Path $ffRoot) {
        $exe = Get-ChildItem $ffRoot -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($exe) { return $exe.DirectoryName }
    }
    return $null
}

# --- 1. Node sanity (survives the freeze; Hyperframes needs 22+) ---
$nodeVer = & node --version
Write-Host "Node: $nodeVer" -ForegroundColor Cyan
if ([int]($nodeVer -replace '^v(\d+).*', '$1') -lt 22) {
    Write-Host "ERROR: Hyperframes needs Node 22+." -ForegroundColor Red
    exit 1
}

# --- 2. Full FFmpeg build (ffmpeg + ffprobe) ---
$ffBin = Find-FfmpegBin
if (-not $ffBin) {
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    $zip = Join-Path $toolsDir "ffmpeg-release-essentials.zip"
    Write-Host "Downloading FFmpeg full build (with ffprobe) ..." -ForegroundColor Cyan
    $oldPref = $ProgressPreference
    $ProgressPreference = "SilentlyContinue"
    try {
        Invoke-WebRequest -Uri $FfmpegUrl -OutFile $zip -UseBasicParsing
    } finally {
        $ProgressPreference = $oldPref
    }
    Expand-Archive -Path $zip -DestinationPath $ffRoot -Force
    Remove-Item -Force $zip
    $ffBin = Find-FfmpegBin
    if (-not $ffBin) {
        Write-Host "ERROR: ffmpeg.exe not found after extract; inspect $ffRoot" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "OK: FFmpeg already present at $ffBin" -ForegroundColor Green
}
if ($env:Path -notlike "*$ffBin*") { $env:Path = "$ffBin;$env:Path" }

# --- 3. Chrome Headless Shell for the pinned CLI ---
Write-Host "Ensuring Chrome Headless Shell ($PinnedHyperframes) ..." -ForegroundColor Cyan
$env:HYPERFRAMES_SKIP_SKILLS = "1"
& npx -y $PinnedHyperframes browser ensure
if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: browser ensure exited $LASTEXITCODE." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "OK: Hyperframes lane re-armed (this session)." -ForegroundColor Green
& ffmpeg -version  | Select-Object -First 1 | ForEach-Object { Write-Host "  $_" }
& ffprobe -version | Select-Object -First 1 | ForEach-Object { Write-Host "  $_" }
Write-Host ""
Write-Host "Verify with: npx -y $PinnedHyperframes doctor" -ForegroundColor Cyan
Write-Host "New terminals: re-run this script (idempotent) to restore PATH." -ForegroundColor Cyan
