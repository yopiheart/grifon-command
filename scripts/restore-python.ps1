# Restore Python after the cafe defreezer wipes the machine overnight. The WAT
# tools under tools\ are Python (find_winning_ads.py, analyze_video.py,
# smoke_music_bed.py, ...) and they pip-install their own deps at runtime
# (yt-dlp, google-genai, firecrawl-py), so we need a REAL interpreter with pip
# -- not the embeddable zip. No package manager (winget/choco) exists on the
# cafe PCs, so this downloads the official python.org user-scope installer into
# the repo-relative .tools\ folder (gitignored) and runs it silently. The
# install lands in %LOCALAPPDATA%\Programs\Python and is wiped again next
# reboot -- that's why this script is committed: one command re-arms it.
#
# Usage (from the grifon-command folder, in PowerShell):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if needed this session
#   .\scripts\restore-python.ps1
#
# After this finishes:
#   1. python + pip are on $env:PATH for THIS session. New terminals either
#      re-run this script (idempotent -- it skips the install if present) or
#      rely on the installer's PrependPath (effective after a fresh login).
#   2. The tools self-install their pip deps on first run; just call them.

[CmdletBinding()]
param([switch]$Portable)

$ErrorActionPreference = "Stop"

# Pin a known-good 3.12 patch; bump when a newer Python is needed. Cafe PCs are
# AMD64/64-bit Windows. User-scope install (no admin) -> %LOCALAPPDATA%.
$Version   = "3.12.8"
$Asset     = "python-${Version}-amd64.exe"
$Url       = "https://www.python.org/ftp/python/${Version}/${Asset}"

$repoRoot  = Split-Path -Parent $PSScriptRoot
$toolsDir  = Join-Path $repoRoot ".tools"
$installDir = Join-Path $env:LOCALAPPDATA "Programs\Python\Python312"
$pyExe     = Join-Path $installDir "python.exe"
$scriptsDir = Join-Path $installDir "Scripts"

# Official CPython NuGet distribution for machines where the MSI service cannot
# access the per-user package cache. Same pinned interpreter, includes pip.
# https://docs.python.org/3.12/using/windows.html#the-nuget-org-packages
if ($Portable) {
    $portableDir = Join-Path $toolsDir "python-$Version"
    $portableBin = Join-Path $portableDir 'tools'
    $portableExe = Join-Path $portableBin 'python.exe'
    if (-not (Test-Path -LiteralPath $portableExe)) {
        New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
        $archive = Join-Path $toolsDir "python-$Version-nuget.zip"
        $expectedHash = '406856BE971D957E0BEE7A5CEFE20A5EC78D70A495E9E33CD0E53D31FAEC049D'
        if (-not (Test-Path -LiteralPath $archive)) {
            Invoke-WebRequest -Uri "https://api.nuget.org/v3-flatcontainer/python/$Version/python.$Version.nupkg" -OutFile $archive -UseBasicParsing
        }
        if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne $expectedHash) {
            throw 'Portable Python archive checksum mismatch. Do not extract it.'
        }
        Expand-Archive -LiteralPath $archive -DestinationPath $portableDir -Force
    }
    $signature = Get-AuthenticodeSignature -LiteralPath $portableExe
    if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Python Software Foundation') {
        throw 'Portable Python executable does not have a valid Python Software Foundation signature.'
    }
    & $portableExe --version
    if ($LASTEXITCODE -ne 0) { throw 'Portable Python could not start.' }
    & $portableExe -m pip --version
    if ($LASTEXITCODE -ne 0) { throw 'Portable Python pip is missing.' }
    $env:Path = "$portableBin;$(Join-Path $portableBin 'Scripts');$env:Path"
    Write-Host "OK: portable Python ready at $portableExe. PATH updated for this shell only."
    return
}

function Add-PythonToPath {
    foreach ($dir in @($installDir, $scriptsDir)) {
        if ($env:Path -notlike "*$dir*") { $env:Path = "$dir;$env:Path" }
    }
}

# Idempotent: if the right minor is already installed, just ensure PATH.
if (Test-Path $pyExe) {
    $existing = & $pyExe --version 2>&1 | Select-Object -First 1
    if ($existing -match "3\.12\.") {
        Add-PythonToPath
        Write-Host "OK: $existing already present at $pyExe" -ForegroundColor Green
        Write-Host "PATH updated for this session." -ForegroundColor Cyan
        exit 0
    }
}

New-Item -ItemType Directory -Force -Path $toolsDir | Out-Null
$exePath = Join-Path $toolsDir $Asset

Write-Host "Downloading $Asset ..." -ForegroundColor Cyan
$oldPref = $ProgressPreference
$ProgressPreference = "SilentlyContinue"
try {
    Invoke-WebRequest -Uri $Url -OutFile $exePath -UseBasicParsing
} finally {
    $ProgressPreference = $oldPref
}

Write-Host "Installing Python $Version (user-scope, silent) ..." -ForegroundColor Cyan
# /quiet = no UI; InstallAllUsers=0 = per-user (no admin); PrependPath=1 = future
# shells get it on PATH; Include_pip/launcher = pip + the `py` launcher.
$proc = Start-Process -FilePath $exePath -WindowStyle Hidden -Wait -PassThru -ArgumentList @(
    "/quiet", "InstallAllUsers=0", "PrependPath=1",
    "Include_pip=1", "Include_launcher=1", "Include_test=0"
)
Remove-Item -Force $exePath

if ($proc.ExitCode -ne 0) {
    Write-Host "ERROR: installer exited $($proc.ExitCode)." -ForegroundColor Red
    Write-Host 'For a blocked MSI package cache, use .\scripts\restore-python.ps1 -Portable.'
    exit 1
}
if (-not (Test-Path $pyExe)) {
    Write-Host "ERROR: expected $pyExe after install, not found." -ForegroundColor Red
    Write-Host "Inspect $installDir for the actual layout." -ForegroundColor Red
    exit 1
}

Add-PythonToPath

Write-Host ""
Write-Host "OK: Python installed at $pyExe" -ForegroundColor Green
& $pyExe --version       | ForEach-Object { Write-Host "  $_" }
& $pyExe -m pip --version | ForEach-Object { Write-Host "  $_" }
Write-Host ""
Write-Host "python + pip are on PATH for THIS session. The WAT tools self-install" -ForegroundColor Cyan
Write-Host "their pip deps on first run -- just call them, e.g.:" -ForegroundColor Cyan
Write-Host "  python tools\find_winning_ads.py --page-id <id> --print-url"
Write-Host ""
