# Spawn parallel-Claude worktrees after the cafe defreezer wipes Desktop.
#
# Idempotent — nilalaktawan ang worktree na existing na, kinokopya ang
# environment file sa mga worktree na wala pa nito, at nag-i-install lang kung
# walang node_modules.
#
# NAKA-PARAMETER NA (2026-08-16). Dati ay hardcoded sa feat/wizard-persist at
# feat/camera-buckets. Parehong merged at binura na sa origin nung 2026-08-16,
# kaya palagi syang nag-e-error sa `git worktree add` bago pa makarating sa
# npm install. Ang branch names ay argument na ngayon at chine-check muna sa
# origin bago subukan.
#
# Gamit (mula sa loob ng grifon-command folder):
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\spawn-worktrees.ps1 feat/una feat/pangalawa
#
# Prereqs:
#   1. Naka-clone na ang grifon-command at natapos na ang `npm install` dito.
#   2. Nakapaste na ang environment file sa ugat ng main repo. Kinokopya ito ng
#      script sa bawat worktree — kung wala, di makakatakbo ang Vite dev server.
#   3. Existing sa origin ang bawat branch na ipapasa mo.
#
# Mura sya sa lite clone: minamana ng worktree ang sparse-checkout pattern, kaya
# 42 MB lang ang bawat isa imbes na 1.5 GB (sinukat 2026-08-16).
#
# Pagkatapos (~2-3 min para sa parallel npm install):
#   code ..\grifon-<pangalan>
#   Sa terminal ng bawat window: npm run dev (kukuha ang Vite ng 5174 / 5175),
#   tapos `claude` para magsimula ng bagong session.
#
# Buong runbook: workflows/cafe_session.md

[CmdletBinding()]
param(
    # Isa o higit pang branch na existing sa origin. Isang worktree kada branch.
    [Parameter(Position = 0, ValueFromRemainingArguments = $true)]
    [string[]]$Branches
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$desktop  = Split-Path -Parent $repoRoot

# --- Pre-flight: kailangan ng branch -----------------------------------------
if (-not $Branches -or $Branches.Count -eq 0) {
    Write-Host "ERROR: walang branch na ibinigay." -ForegroundColor Red
    Write-Host ""
    Write-Host "Gamit:" -ForegroundColor Yellow
    Write-Host "  .\scripts\spawn-worktrees.ps1 feat/una feat/pangalawa" -ForegroundColor Yellow
    Write-Host ""
    # Sinasadyang recency ang pinagbabatayan, hindi "ahead of main". Squash-merge
    # ang karamihan ng branch dito, kaya nagbibilang pa rin ng libo-libong commit
    # ang `rev-list origin/main..<branch>` kahit merged na ang laman — walang
    # kwentang signal yun (nasukat 2026-08-16: 1,233 sa isang merged na branch).
    Write-Host "Pinakabagong branch sa origin:" -ForegroundColor Cyan
    git -C $repoRoot fetch origin --quiet
    $recent = git -C $repoRoot for-each-ref --sort=-committerdate --count=15 `
        --format='%(refname:short)|%(committerdate:short)' refs/remotes/origin |
        Where-Object { $_ -notmatch '^origin/HEAD\|' }
    foreach ($line in $recent) {
        $parts = $line -split '\|'
        $name  = $parts[0] -replace '^origin/', ''
        Write-Host ("  {0,-12} {1}" -f $parts[1], $name)
    }
    Write-Host "  (lahat: $((git -C $repoRoot branch -r | Where-Object { $_ -notmatch 'HEAD' }).Count) na branch)" -ForegroundColor DarkGray
    exit 1
}

# --- Pre-flight: buhay pa ba ang bawat branch sa origin? --------------------
# Nauuna to sa environment-file check para sa mas mabilis na feedback: kung
# patay na ang branch, walang saysay na sabihin muna sa iyo ang tungkol sa
# environment file.
Write-Host "Fetching origin..." -ForegroundColor Cyan
git -C $repoRoot fetch origin --quiet

$worktrees = @()
$missing   = @()
foreach ($b in $Branches) {
    git -C $repoRoot show-ref --verify --quiet "refs/remotes/origin/$b"
    if ($LASTEXITCODE -ne 0) {
        $missing += $b
        continue
    }
    # grifon-command -> grifon-<huling bahagi ng branch>
    $leaf = ($b -split '/')[-1]
    $worktrees += @{ Path = Join-Path $desktop "grifon-$leaf"; Branch = $b }
}

if ($missing.Count -gt 0) {
    Write-Host "" -ForegroundColor Red
    Write-Host "ERROR: wala sa origin ang branch na to:" -ForegroundColor Red
    $missing | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    Write-Host "Baka merged at binura na. Patakbuhin nang walang argument para makita ang listahan." -ForegroundColor Yellow
    exit 1
}

# --- Pre-flight: kailangan ng environment file sa main repo ------------------
$mainEnv = Join-Path $repoRoot '.env'
if (-not (Test-Path $mainEnv)) {
    Write-Host "ERROR: $mainEnv not found." -ForegroundColor Red
    Write-Host "I-paste muna ang environment file mo mula Bitwarden sa main repo, tapos ulitin." -ForegroundColor Yellow
    exit 1
}

# --- Step 1: gumawa ng worktree (laktawan ang existing) ---------------------
foreach ($wt in $worktrees) {
    if (Test-Path $wt.Path) {
        Write-Host "[skip] Worktree exists: $($wt.Path)" -ForegroundColor DarkGray
    } else {
        Write-Host "[add]  $($wt.Path)  ->  $($wt.Branch)" -ForegroundColor Cyan
        git -C $repoRoot worktree add $wt.Path $wt.Branch
    }
}

# --- Step 2: kopyahin ang environment file kung wala ------------------------
foreach ($wt in $worktrees) {
    $wtEnv = Join-Path $wt.Path '.env'
    if (Test-Path $wtEnv) {
        Write-Host "[skip] environment file nandyan na: $($wt.Path)" -ForegroundColor DarkGray
    } else {
        Write-Host "[copy] environment file -> $($wt.Path)" -ForegroundColor Cyan
        Copy-Item $mainEnv $wtEnv
    }
}

# --- Step 3: parallel npm install kung walang node_modules ------------------
$jobs = @()
foreach ($wt in $worktrees) {
    $nm = Join-Path $wt.Path 'node_modules'
    if (Test-Path $nm) {
        Write-Host "[skip] node_modules nandyan na: $($wt.Path)" -ForegroundColor DarkGray
        continue
    }
    Write-Host "[npm]  nag-i-install sa $($wt.Path)" -ForegroundColor Cyan
    $jobs += Start-Job -Name "npm-install-$([System.IO.Path]::GetFileName($wt.Path))" -ScriptBlock {
        param($path)
        Set-Location $path
        npm install 2>&1
    } -ArgumentList $wt.Path
}

if ($jobs.Count -gt 0) {
    Write-Host ""
    Write-Host "Hinihintay ang $($jobs.Count) na parallel npm install..." -ForegroundColor Cyan
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
Write-Host "OK: handa na ang worktrees." -ForegroundColor Green
Write-Host ""
Write-Host "Susunod:" -ForegroundColor Cyan
foreach ($wt in $worktrees) {
    Write-Host "  code $($wt.Path)"
}
Write-Host "  Sa terminal ng bawat window: npm run dev, tapos claude"
Write-Host ""
