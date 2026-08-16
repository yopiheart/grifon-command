# Enable unmetered local video generation for smoke testing.
#
# WHY THIS EXISTS: Smoke-testing the Director AI wizard end-to-end renders 6+
# video scenes. Two server-side gates block that on a real account:
#   1. Monthly `video_ads` quota (HTTP 402) - pro tier caps at 15/mo.
#   2. Hourly video rate-limit (HTTP 429) - 5 renders/hour, "50M TO RESUME".
# Both are bypassed ONLY when GRIFON_DEV_UNMETERED_VIDEO='true' is in .env
# (see api/_lib/quota.ts + api/kling/video.ts + api/kling/omni-video.ts +
# api/gemini/video.ts). The flag is LOCAL-ONLY - it is never set on Vercel,
# so production stays fully metered. Neil hit both gates mid-smoke twice on
# 2026-06-10; this script makes the dev-unmetered state one command to restore.
#
# The cafe-PC defreezer wipes .env (gitignored) on reboot, so this is NOT a
# one-time setup - run it at the START of any local smoke-test session, AFTER
# .env has its API keys restored.
#
# Usage (from the grifon-command folder):
#   .\scripts\enable-dev-unmetered-video.ps1
#
# Idempotent: if the flag is already present and 'true', it's a no-op. After
# running, RESTART the dev server (npm run dev) so the new env value is read.

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$envPath  = Join-Path $repoRoot ".env"

if (-not (Test-Path $envPath)) {
    Write-Host "ERROR: $envPath does not exist." -ForegroundColor Red
    Write-Host "Restore .env with its API keys first, then re-run this script."
    exit 1
}

# GRIFON_DEV_UNMETERED (all monthly meters: images/reports/workflows/captions/
# video_ads) is the one that matters for a full Director smoke - a storyboard
# renders 6+ scene IMAGES + a Market Research report, which the older video-only
# flag never covered (Neil burned images 150/150 mid-smoke 2026-06-21). We set
# BOTH: the broad flag, plus the legacy video-only flag for back-compat.
$lines = Get-Content $envPath
$flags = @('GRIFON_DEV_UNMETERED', 'GRIFON_DEV_UNMETERED_VIDEO')

foreach ($name in $flags) {
    $flagLine = "$name=true"
    $existing = $lines | Where-Object { $_ -match "^\s*$name\s*=" }
    if ($existing) {
        if ($existing -match '=\s*true\s*$') {
            Write-Host "OK: $name already = true (no change)." -ForegroundColor Green
        } else {
            $lines = $lines | ForEach-Object {
                if ($_ -match "^\s*$name\s*=") { $flagLine } else { $_ }
            }
            Write-Host "OK: flipped $name to true." -ForegroundColor Green
        }
    } else {
        # Use WriteAllLines (not Add-Content): if .env lacks a trailing newline,
        # Add-Content concatenates the flag onto the last line, silently breaking
        # BOTH vars. Rebuilding the array guarantees a newline between every element.
        $lines = $lines + $flagLine
        Write-Host "OK: appended $name=true to .env." -ForegroundColor Green
    }
}
[System.IO.File]::WriteAllLines($envPath, $lines)

Write-Host ""
Write-Host "NEXT: restart the dev server so the flag is read:" -ForegroundColor Cyan
Write-Host "  (stop the running 'npm run dev', then) npm run dev"
Write-Host ""
Write-Host "Local video renders now skip BOTH the monthly quota (402) and the" -ForegroundColor DarkGray
Write-Host "hourly rate-limit (429). Production on Vercel is unaffected." -ForegroundColor DarkGray
