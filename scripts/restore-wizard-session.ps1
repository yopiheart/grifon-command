# Restore the Director AI wizard + MarketMind localStorage state from a
# previous snapshot (taken with snapshot-wizard-session.ps1). Useful after
# the cafe-PC defreezer wipes Chrome's user-data-dir.
#
# Usage (from the grifon-command folder):
#   .\scripts\restore-wizard-session.ps1                # use most recent snapshot
#   .\scripts\restore-wizard-session.ps1 -Path <path>   # use a specific snapshot
#
# This copies a one-line JS snippet to your Windows clipboard. Paste it
# into DevTools console at http://localhost:5173, hit Enter, then refresh
# the page - the wizard state should reappear.

[CmdletBinding()]
param(
    [string]$Path
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot

if (-not $Path) {
    # Find the newest grifon-wizard-snapshot-*.json under .tmp/ or $env:TEMP.
    $candidates = @()
    $tmp = Join-Path $repoRoot ".tmp"
    if (Test-Path $tmp) {
        $candidates += Get-ChildItem -Path $tmp -Filter "grifon-wizard-snapshot-*.json" -ErrorAction SilentlyContinue
    }
    $candidates += Get-ChildItem -Path $env:TEMP -Filter "grifon-wizard-snapshot-*.json" -ErrorAction SilentlyContinue
    if ($candidates.Count -eq 0) {
        Write-Host "ERROR: no grifon-wizard-snapshot-*.json found under .tmp/ or `$env:TEMP." -ForegroundColor Red
        Write-Host "Run .\scripts\snapshot-wizard-session.ps1 first."
        exit 1
    }
    $newest = $candidates | Sort-Object LastWriteTime -Descending | Select-Object -First 1
    $Path = $newest.FullName
}

if (-not (Test-Path $Path)) {
    Write-Host "ERROR: snapshot file not found: $Path" -ForegroundColor Red
    exit 1
}

$raw = [System.IO.File]::ReadAllText($Path)
$parsed = $raw | ConvertFrom-Json -ErrorAction Stop

if (-not $parsed.localStorage) {
    Write-Host "ERROR: snapshot file is malformed (no 'localStorage' field): $Path" -ForegroundColor Red
    exit 1
}

# Build a JS snippet that re-injects every key from the snapshot. The
# snippet is intentionally one expression so it can be pasted into DevTools
# console in a single line without trailing-paste artifacts.
$assignments = @()
foreach ($prop in $parsed.localStorage.PSObject.Properties) {
    $name = $prop.Name
    $value = $prop.Value
    # JSON-escape both the key and the value for safe embedding in JS.
    $kJs = (ConvertTo-Json $name -Compress)
    $vJs = (ConvertTo-Json $value -Compress)
    $assignments += "localStorage.setItem($kJs, $vJs);"
}
$ks = @($parsed.localStorage.PSObject.Properties.Name)
$keysJsArr = ($ks | ForEach-Object { "'$_'" }) -join ","
$snippet = "(()=>{" + ($assignments -join "") + "console.log('%c[grifon] restored " + $ks.Count + " keys: ' + [$keysJsArr].join(', ') + ' - reload the page to see the wizard resume','color:#FFCC00;font-weight:bold');})();"

Set-Clipboard -Value $snippet

Write-Host ""
Write-Host "OK: restore snippet copied to clipboard ($($snippet.Length) chars)" -ForegroundColor Green
Write-Host "    Source:   $Path"
Write-Host "    Origin:   $($parsed._origin)"
Write-Host "    Time:     $($parsed._snapshotAt)"
Write-Host "    Keys:     $($ks -join ', ')"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Open http://localhost:5173 in the same browser profile"
Write-Host "  2. Open DevTools console (F12)"
Write-Host "  3. Paste the snippet and hit Enter"
Write-Host "  4. Wait for the yellow [grifon] confirmation log"
Write-Host "  5. Refresh the page (F5) - the wizard's RESUME card should reappear"
Write-Host ""
