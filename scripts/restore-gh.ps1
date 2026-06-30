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

# ── GH_TOKEN for headless use (lets the Claude Code tools drive gh) ───────────
# Claude's sandboxed shells can't read the Windows keyring that `gh auth login`
# writes to, so an interactive login is invisible to the agent. A Personal
# Access Token stored at User scope IS readable by the agent via
# [Environment]::GetEnvironmentVariable('GH_TOKEN','User'), so it can create/
# merge PRs without you pasting commands. The defreezer wipes this, so re-run
# this script each session. The token never enters the repo or any chat.
#
# Create a fine-grained PAT once (save it in your password manager):
#   https://github.com/settings/tokens?type=beta
#   Repository access: yopiheart/grifon-command
#   Permissions: Contents = Read and write, Pull requests = Read and write
$existing = [Environment]::GetEnvironmentVariable("GH_TOKEN", "User")
if (-not [string]::IsNullOrWhiteSpace($existing)) {
    Write-Host ""
    Write-Host "GH_TOKEN already set at User scope — Claude can drive gh." -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "Paste your GitHub Personal Access Token to let Claude open/merge PRs for you." -ForegroundColor Cyan
    Write-Host "(Press Enter to skip — gh still works for YOU via 'gh auth login'.)" -ForegroundColor DarkGray
    $sec = Read-Host "GH_TOKEN" -AsSecureString
    $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
    $tok  = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    if (-not [string]::IsNullOrWhiteSpace($tok)) {
        [Environment]::SetEnvironmentVariable("GH_TOKEN", $tok.Trim(), "User")
        Write-Host "GH_TOKEN stored at User scope. Claude can now run gh headlessly." -ForegroundColor Green
    } else {
        Write-Host "Skipped GH_TOKEN. Claude can't drive gh until it's set; use 'gh auth login' for your own use." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "OK: gh is ready." -ForegroundColor Green
