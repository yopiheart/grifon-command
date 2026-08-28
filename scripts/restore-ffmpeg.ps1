# Restore ffmpeg + ffprobe after the cafe defreezer wipes the machine overnight.
#
# WHY THIS IS COMMITTED: every format sample in public/samples/ is an ffmpeg cut of
# a finished render, and there are nine still to make. The download is ~106 MB, which
# took 32 minutes on cafe wifi on 2026-08-28 (measured 56 KB/s). Paying that once per
# session by hand, and re-deriving which build to fetch each time, is exactly the tax
# the other restore-*.ps1 scripts exist to remove.
#
# winget is NOT an option on these machines: the winget.exe on PATH is a WindowsApps
# stub that fails with "The application cannot be started" (hit 2026-08-28). choco and
# scoop are absent too. So this pulls the gyan.dev release build straight into the
# repo-relative .tools\ folder, which is gitignored.
#
# Usage (from the grifon-command folder, in PowerShell):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if needed this session
#   .\scripts\restore-ffmpeg.ps1
#
# Idempotent: if .tools\ffmpeg already has a working binary it skips the download and
# just puts it back on PATH for this session.

$ErrorActionPreference = "Stop"

$Url = "https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip"

$repoRoot = Split-Path -Parent $PSScriptRoot
$toolsDir = Join-Path $repoRoot ".tools"
$ffDir    = Join-Path $toolsDir "ffmpeg"
$zipPath  = Join-Path $toolsDir "ffmpeg.zip"

function Find-FfmpegBin {
    if (-not (Test-Path $ffDir)) { return $null }
    $exe = Get-ChildItem -Path $ffDir -Recurse -Filter "ffmpeg.exe" -ErrorAction SilentlyContinue |
           Select-Object -First 1
    if ($exe) { return $exe.Directory.FullName }
    return $null
}

$bin = Find-FfmpegBin
if ($bin) {
    Write-Host "Already present, skipping download." -ForegroundColor Yellow
} else {
    New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
    Write-Host "Downloading ffmpeg (~106 MB). On cafe wifi this has taken ~30 min." -ForegroundColor Cyan
    Write-Host "  $Url"
    # SilentlyContinue on the progress bar is not cosmetic: the PowerShell progress
    # renderer slows Invoke-WebRequest down by a large factor on big files.
    $prev = $ProgressPreference
    $ProgressPreference = 'SilentlyContinue'
    $sw = [System.Diagnostics.Stopwatch]::StartNew()
    try {
        Invoke-WebRequest -Uri $Url -OutFile $zipPath -UseBasicParsing
    } finally {
        $ProgressPreference = $prev
    }
    $sw.Stop()
    $mb = (Get-Item $zipPath).Length / 1MB
    Write-Host ("Downloaded {0:N1} MB in {1:N0}s ({2:N0} KB/s)" -f $mb, $sw.Elapsed.TotalSeconds, ($mb * 1024 / $sw.Elapsed.TotalSeconds))

    Expand-Archive -Path $zipPath -DestinationPath $ffDir -Force
    Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

    $bin = Find-FfmpegBin
    if (-not $bin) {
        Write-Host "ERROR: ffmpeg.exe not found under $ffDir after extracting." -ForegroundColor Red
        exit 1
    }
}

if ($env:PATH -notlike "*$bin*") { $env:PATH = "$bin;$env:PATH" }

Write-Host ""
Write-Host "OK: ffmpeg on PATH for THIS session, from $bin" -ForegroundColor Green
& "$bin\ffmpeg.exe"  -version 2>$null | Select-Object -First 1 | ForEach-Object { Write-Host "  $_" }
& "$bin\ffprobe.exe" -version 2>$null | Select-Object -First 1 | ForEach-Object { Write-Host "  $_" }
Write-Host ""
Write-Host "What it is for: cutting public/samples/*.mp4 from a finished render." -ForegroundColor Cyan
Write-Host "  1. Pull the source. That step needs YOUR terminal - the agent's env is walled:"
Write-Host '       node --env-file=<the env file> scripts/pull-run-final.mjs <run_id> .tmp/<name>.mp4'
Write-Host "  2. Find the scene cuts, so an in/out lands on one and never mid-sentence:"
Write-Host '       ffmpeg -i .tmp/<name>.mp4 -filter:v "select=''gt(scene,0.3)'',showinfo" -f null -'
Write-Host "  3. Cut, at the settings public/samples/real_talk.mp4 was made with (all one line):"
Write-Host '       ffmpeg -ss <in> -to <out> -i .tmp/<name>.mp4 -vf scale=720:1280:flags=lanczos -c:v libx264 -crf 20 -preset slow -pix_fmt yuv420p -movflags +faststart -an public/samples/<recipe>.mp4'
Write-Host ""
