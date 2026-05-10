# Restore Vercel CLI + project link after the cafe defreezer wipes
# C:\Users\Administrator\ overnight. Mirrors the pattern of
# restore-notebooklm.ps1 — idempotent, safe to re-run.
#
# Usage (from the grifon-command folder):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if not already
#   .\scripts\restore-vercel.ps1
#
# After this finishes you will still need to run `vercel login` ONCE per
# session — that step is interactive (browser auth) and cannot be
# automated without committing a token, which would be a leak.
#
# First-time setup (one-shot, then forget):
#   1. Run `npm i -g vercel` and `vercel login`
#   2. From the repo root, run `vercel link` and pick the grifon-command project
#   3. Copy the generated .vercel/project.json into scripts/vercel-project.json
#      (`Copy-Item .vercel\project.json scripts\vercel-project.json`)
#   4. Commit scripts/vercel-project.json — projectId/orgId are public identifiers,
#      NOT secrets. The auth token lives elsewhere (~\AppData\Roaming\com.vercel.cli\)
#      and must NEVER be committed.
#
# Once scripts/vercel-project.json is in the repo, this script handles every
# future reboot: re-installs the CLI and re-creates .vercel/project.json so
# `vercel deploy` and `vercel inspect` work without re-linking.

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$savedProjectJson = Join-Path $PSScriptRoot "vercel-project.json"
$liveProjectDir = Join-Path $repoRoot ".vercel"
$liveProjectJson = Join-Path $liveProjectDir "project.json"

# 1) Ensure Vercel CLI is installed
$vercel = Get-Command vercel -ErrorAction SilentlyContinue
if (-not $vercel) {
    Write-Host "Vercel CLI not found. Installing globally via npm..." -ForegroundColor Yellow
    npm install -g vercel
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: npm install -g vercel failed." -ForegroundColor Red
        exit 1
    }
    Write-Host "OK: Vercel CLI installed." -ForegroundColor Green
} else {
    Write-Host "OK: Vercel CLI already installed at $($vercel.Source)" -ForegroundColor Green
}

# 2) Restore .vercel/project.json from the committed copy
if (Test-Path $savedProjectJson) {
    if (-not (Test-Path $liveProjectDir)) {
        New-Item -ItemType Directory -Path $liveProjectDir | Out-Null
    }
    Copy-Item -Path $savedProjectJson -Destination $liveProjectJson -Force
    Write-Host "OK: .vercel/project.json restored from scripts/vercel-project.json" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "WARN: scripts/vercel-project.json does not exist." -ForegroundColor Yellow
    Write-Host "First-time setup needed:" -ForegroundColor Cyan
    Write-Host "  1. vercel login"
    Write-Host "  2. vercel link    # pick the grifon-command project"
    Write-Host "  3. Copy-Item .vercel\project.json scripts\vercel-project.json"
    Write-Host "  4. git add scripts/vercel-project.json; git commit; git push"
    Write-Host ""
    Write-Host "After that, this script will handle every future reboot." -ForegroundColor Cyan
    exit 0
}

# 3) Remind about login (cannot be automated — token would have to be committed)
Write-Host ""
Write-Host "Next step:" -ForegroundColor Cyan
Write-Host "  vercel login   # one-time per session, browser auth"
Write-Host ""
Write-Host "Then deploy with:" -ForegroundColor Cyan
Write-Host "  vercel deploy             # preview"
Write-Host "  vercel deploy --prod      # production"
Write-Host ""
