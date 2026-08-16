# Spawn the parallel-Claude worktrees after the cafe defreezer wipes Desktop.
#
# Idempotent — skips worktrees that already exist, copies the environment file
# only into worktrees that lack it, and runs npm install only where node_modules
# is absent.
#
# PARAMETERIZED 2026-08-16. This used to be hardcoded to feat/wizard-persist and
# feat/camera-buckets. Both were merged and deleted from origin, and with
# $ErrorActionPreference = "Stop" the script died inside `git worktree add`
# before ever reaching npm install — so it failed on every run. Branch names are
# arguments now and are validated against origin first.
#
# Usage (from the grifon-command folder):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\spawn-worktrees.ps1 feat/one feat/two
#
# Prereqs:
#   1. grifon-command cloned and `npm install` already run in it.
#   2. The environment file pasted into the repo root. The script copies it into
#      each worktree — without it, the worktrees cannot run the Vite dev server.
#   3. Every branch you pass exists on origin.
#
# Cheap on a lite clone: a worktree inherits the sparse-checkout pattern, so each
# one is 42 MB rather than 1.5 GB (measured 2026-08-16).
#
# After this finishes (~2-3 min for the parallel npm install):
#   code ..\grifon-<name>
#   In each window's terminal: npm run dev (Vite picks 5174 / 5175), then `claude`.
#
# Full runbook: workflows/cafe_session.md

[CmdletBinding()]
param(
    # One or more branches that exist on origin. One worktree per branch.
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$Branches
)

$ErrorActionPreference = "Stop"

# The branch pre-flight NEEDS `git show-ref --verify --quiet` to exit 1 for a
# missing ref without throwing, so it can collect every bad branch and report
# them together.
#
# Do NOT disable $PSNativeCommandUseErrorActionPreference script-wide for that.
# It would also swallow a failed `git worktree add`, and Step 2 would then try to
# copy the environment file into a directory that was never created — burying
# git's real, actionable error under a confusing Copy-Item path error. Set it
# inside this helper only, where PowerShell scopes it to the function body.
function Test-OriginBranch {
    param([string]$RepoRoot, [string]$Branch)
    $PSNativeCommandUseErrorActionPreference = $false
    git -C $RepoRoot show-ref --verify --quiet "refs/remotes/origin/$Branch"
    return ($LASTEXITCODE -eq 0)
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$desktop  = Split-Path -Parent $repoRoot

# --- Pre-flight: at least one branch is required -----------------------------
if (-not $Branches -or $Branches.Count -eq 0) {
    Write-Host "ERROR: no branch given." -ForegroundColor Red
    Write-Host ""
    Write-Host "Usage:" -ForegroundColor Yellow
    Write-Host "  .\scripts\spawn-worktrees.ps1 feat/one feat/two" -ForegroundColor Yellow
    Write-Host ""
    # Sorted by recency on purpose, NOT by "ahead of main". Most branches here
    # were squash-merged, so `rev-list origin/main..<branch>` still counts
    # thousands of commits on branches whose content landed long ago — measured
    # 2026-08-16: 1,233 on one fully merged branch. That signal is worthless.
    Write-Host "Most recent branches on origin:" -ForegroundColor Cyan
    git -C $repoRoot fetch origin --quiet
    $recent = git -C $repoRoot for-each-ref --sort=-committerdate --count=15 `
        --format='%(refname:short)|%(committerdate:short)' refs/remotes/origin |
        Where-Object { $_ -notmatch '^origin/HEAD\|' }
    foreach ($line in $recent) {
        $parts = $line -split '\|'
        $name  = $parts[0] -replace '^origin/', ''
        Write-Host ("  {0,-12} {1}" -f $parts[1], $name)
    }
    $total = (git -C $repoRoot branch -r | Where-Object { $_ -notmatch 'HEAD' }).Count
    Write-Host "  ($total branches total)" -ForegroundColor DarkGray
    exit 1
}

# --- Pre-flight: does each branch still exist on origin? ---------------------
# Ordered before the environment-file check on purpose: if the branch is dead,
# there is no point telling you about the environment file first.
Write-Host "Fetching origin..." -ForegroundColor Cyan
git -C $repoRoot fetch origin --quiet

$worktrees = @()
$missing   = @()
$seenLeaf = @{}
$collide  = @()
foreach ($b in $Branches) {
    if (-not (Test-OriginBranch -RepoRoot $repoRoot -Branch $b)) {
        $missing += $b
        continue
    }
    # grifon-command -> grifon-<last segment of the branch name>. Two branches can
    # share a leaf (feat/foo and fix/foo), which would silently collapse into one
    # worktree while the summary still printed two paths. Refuse instead.
    $leaf = ($b -split '/')[-1]
    if ($seenLeaf.ContainsKey($leaf)) {
        $collide += "$($seenLeaf[$leaf]) and $b both map to grifon-$leaf"
        continue
    }
    $seenLeaf[$leaf] = $b
    $worktrees += @{ Path = Join-Path $desktop "grifon-$leaf"; Branch = $b }
}

if ($collide.Count -gt 0) {
    Write-Host ""
    Write-Host "ERROR: two branches would land in the same worktree folder:" -ForegroundColor Red
    $collide | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host "Run them one at a time, or rename one branch." -ForegroundColor Yellow
    exit 1
}

if ($missing.Count -gt 0) {
    Write-Host ""
    Write-Host "ERROR: these branches are not on origin:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host "Probably merged and deleted. Run with no arguments to see the list." -ForegroundColor Yellow
    exit 1
}

# --- Pre-flight: the main repo needs its environment file --------------------
$mainEnv = Join-Path $repoRoot '.env'
if (-not (Test-Path $mainEnv)) {
    Write-Host "ERROR: $mainEnv not found." -ForegroundColor Red
    Write-Host "Paste the environment file from Bitwarden into the main repo first, then re-run." -ForegroundColor Yellow
    exit 1
}

# --- Step 1: spawn worktrees (skip any that already exist) ------------------
foreach ($wt in $worktrees) {
    if (Test-Path $wt.Path) {
        Write-Host "[skip] Worktree exists: $($wt.Path)" -ForegroundColor DarkGray
    } else {
        Write-Host "[add]  $($wt.Path)  ->  $($wt.Branch)" -ForegroundColor Cyan
        git -C $repoRoot worktree add $wt.Path $wt.Branch
        if ($LASTEXITCODE -ne 0) {
            Write-Host ""
            Write-Host "ERROR: git worktree add failed for $($wt.Branch)." -ForegroundColor Red
            Write-Host "Git's message above is the real one. A common cause is the branch" -ForegroundColor Yellow
            Write-Host "already being checked out in the main repo or another worktree." -ForegroundColor Yellow
            exit 1
        }
    }
}

# --- Step 2: copy the environment file into each worktree if missing --------
foreach ($wt in $worktrees) {
    $wtEnv = Join-Path $wt.Path '.env'
    if (Test-Path $wtEnv) {
        Write-Host "[skip] environment file already present: $($wt.Path)" -ForegroundColor DarkGray
    } else {
        Write-Host "[copy] environment file -> $($wt.Path)" -ForegroundColor Cyan
        Copy-Item $mainEnv $wtEnv
    }
}

# --- Step 3: npm install in parallel where node_modules is absent -----------
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

# --- Done -------------------------------------------------------------------
Write-Host ""
Write-Host "OK: worktrees ready." -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
foreach ($wt in $worktrees) {
    Write-Host "  code $($wt.Path)"
}
Write-Host "  In each window's terminal: npm run dev, then claude"
Write-Host ""
