# Spawn the parallel-Claude worktrees after the cafe defreezer wipes Desktop.
# Idempotent — re-running will skip worktrees that already exist, copy .env
# only into worktrees that lack it, and run npm install only where node_modules
# is absent.
#
# Worktrees spawned (siblings of grifon-command on Desktop):
#   ..\grifon-wizard-persist  (feat/wizard-persist)
#   ..\grifon-camera-buckets  (feat/camera-buckets)
#
# Prereqs (do these BEFORE running this script):
#   1. Cloned grifon-command into Desktop and run `npm install` in it.
#   2. Pasted your .env from Bitwarden into the main repo (.env at the root).
#      The script copies that file into each worktree — without it, the worktrees
#      can't run the Vite dev server.
#   3. Both feat/wizard-persist and feat/camera-buckets exist on origin.
#      If either was force-deleted upstream, `git worktree add` will fail clearly.
#
# Usage (from the grifon-command folder):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass   # if not already set this session
#   .\scripts\spawn-worktrees.ps1
#
# After this finishes (~2-3 min for parallel npm install):
#   code ..\grifon-wizard-persist
#   code ..\grifon-camera-buckets
# In each window's terminal: `npm run dev` then `claude` to start a fresh session.

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$desktop  = Split-Path -Parent $repoRoot

$worktrees = @(
    @{ Path = Join-Path $desktop 'grifon-wizard-persist'; Branch = 'feat/wizard-persist' }
    @{ Path = Join-Path $desktop 'grifon-camera-buckets'; Branch = 'feat/camera-buckets' }
)

# --- Pre-flight: main repo .env must exist ---
$mainEnv = Join-Path $repoRoot '.env'
if (-not (Test-Path $mainEnv)) {
    Write-Host "ERROR: $mainEnv not found." -ForegroundColor Red
    Write-Host "Paste your .env from Bitwarden into the main repo first, then re-run this script." -ForegroundColor Yellow
    exit 1
}

# --- Pre-flight: ensure remote refs are current so worktree-add finds the branches ---
Write-Host "Fetching origin..." -ForegroundColor Cyan
git -C $repoRoot fetch origin --quiet

# --- Step 1: spawn worktrees (skip any that already exist) ---
foreach ($wt in $worktrees) {
    if (Test-Path $wt.Path) {
        Write-Host "[skip] Worktree exists: $($wt.Path)" -ForegroundColor DarkGray
    } else {
        Write-Host "[add]  $($wt.Path)  ->  $($wt.Branch)" -ForegroundColor Cyan
        git -C $repoRoot worktree add $wt.Path $wt.Branch
    }
}

# --- Step 2: copy .env into each worktree if missing ---
foreach ($wt in $worktrees) {
    $wtEnv = Join-Path $wt.Path '.env'
    if (Test-Path $wtEnv) {
        Write-Host "[skip] .env already present: $($wt.Path)" -ForegroundColor DarkGray
    } else {
        Write-Host "[copy] .env -> $($wt.Path)" -ForegroundColor Cyan
        Copy-Item $mainEnv $wtEnv
    }
}

# --- Step 3: npm install in parallel where node_modules is absent ---
$jobs = @()
foreach ($wt in $worktrees) {
    $nm = Join-Path $wt.Path 'node_modules'
    if (Test-Path $nm) {
        Write-Host "[skip] node_modules already present: $($wt.Path)" -ForegroundColor DarkGray
        continue
    }
    Write-Host "[npm]  starting install in $($wt.Path)" -ForegroundColor Cyan
    $jobs += Start-Job -Name "npm-install-$([System.IO.Path]::GetFileName($wt.Path))" -ScriptBlock {
        param($path)
        Set-Location $path
        npm install 2>&1
    } -ArgumentList $wt.Path
}

if ($jobs.Count -gt 0) {
    Write-Host ""
    Write-Host "Waiting for $($jobs.Count) parallel npm install(s) to finish..." -ForegroundColor Cyan
    $jobs | Wait-Job | Out-Null
    foreach ($job in $jobs) {
        $tail = (Receive-Job -Job $job) | Select-Object -Last 5
        Write-Host ""
        Write-Host "--- $($job.Name) (state: $($job.State)) ---" -ForegroundColor White
        $tail | ForEach-Object { Write-Host "  $_" }
    }
    $jobs | Remove-Job
}

# --- Done ---
Write-Host ""
Write-Host "OK: worktrees ready." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
foreach ($wt in $worktrees) {
    Write-Host "  code $($wt.Path)"
}
Write-Host "  In each window's terminal: npm run dev (Vite picks 5174 / 5175), then claude"
Write-Host ""
