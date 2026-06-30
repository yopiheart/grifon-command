# Restore the GitHub CLI (`gh`) after the cafe defreezer wipes installed
# programs overnight. `gh` is not bundled with the repo (binaries don't belong
# in git), so this idempotent script re-downloads the latest release each
# session and puts it on PATH. Same model as restore-notebooklm.ps1: re-run
# once per fresh session.
#
# Usage (from the grifon-command folder):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if not already set this session
#   .\scripts\restore-gh.ps1
#
# After this finishes, `gh` is available in NEW terminals (and the current one).
# First use per session still needs auth — run `gh auth login` once, OR rely on
# the git credential helper that already authenticates pushes.

$ErrorActionPreference = "Stop"
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$installDir = "$env:LOCALAPPDATA\Programs\GitHubCLI"
$binDir     = Join-Path $installDir "bin"
$ghExe      = Join-Path $binDir "gh.exe"

if (Test-Path $ghExe) {
    Write-Host "gh already present at $ghExe" -ForegroundColor Green
} else {
    Write-Host "Resolving latest gh release..." -ForegroundColor Cyan
    $rel = Invoke-RestMethod -Uri "https://api.github.com/repos/cli/cli/releases/latest" `
        -Headers @{ "User-Agent" = "grifon-restore-gh" }
    $asset = $rel.assets | Where-Object { $_.name -match "windows_amd64\.zip$" } | Select-Object -First 1
    if (-not $asset) { throw "Could not find a windows_amd64.zip asset in the latest gh release." }

    $tmpZip = Join-Path $env:TEMP $asset.name
    Write-Host "Downloading $($asset.name) ..." -ForegroundColor Cyan
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $tmpZip -Headers @{ "User-Agent" = "grifon-restore-gh" }

    $tmpExtract = Join-Path $env:TEMP "gh_extract_$([System.IO.Path]::GetRandomFileName())"
    Expand-Archive -Path $tmpZip -DestinationPath $tmpExtract -Force

    # Layout varies by release: gh.exe may sit at <root>\bin\gh.exe directly, or
    # under a versioned wrapper folder. Locate gh.exe and treat its bin\ parent
    # as the install root so bin/share/ land correctly under $installDir.
    $found = Get-ChildItem $tmpExtract -Recurse -Filter "gh.exe" | Select-Object -First 1
    if (-not $found) { throw "gh.exe not found inside the downloaded zip." }
    $root = $found.Directory.Parent.FullName   # parent of bin\

    if (Test-Path $installDir) { Remove-Item $installDir -Recurse -Force }
    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Copy-Item -Path (Join-Path $root "*") -Destination $installDir -Recurse -Force

    Remove-Item $tmpZip -Force -ErrorAction SilentlyContinue
    Remove-Item $tmpExtract -Recurse -Force -ErrorAction SilentlyContinue

    if (-not (Test-Path $ghExe)) { throw "Install finished but $ghExe is missing." }
    Write-Host "Installed gh to $ghExe" -ForegroundColor Green
}

# Put gh on PATH for THIS session and persist for new terminals this session.
if ($env:Path -notlike "*$binDir*") { $env:Path = "$binDir;$env:Path" }
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$binDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$binDir;$userPath", "User")
}

Write-Host ""
& $ghExe --version
Write-Host ""
Write-Host "OK: gh is ready. If a command says you are not logged in, run: gh auth login" -ForegroundColor Green
