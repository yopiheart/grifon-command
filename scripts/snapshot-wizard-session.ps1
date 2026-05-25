# Snapshot the Director AI wizard + MarketMind localStorage state so it
# survives the cafe-PC defreezer reboot. Runs in two phases:
#
#   Phase 1 (no args)     - Copies a one-line JS snippet to your Windows
#                           clipboard. Paste it into DevTools console at
#                           http://localhost:5173 (or whatever Vite port);
#                           the snippet writes a JSON blob back to your
#                           clipboard.
#
#   Phase 2 (-FromClipboard) - Reads the JSON blob from your clipboard and
#                              writes it to a timestamped file under either
#                              .tmp/ (default) or $env:TEMP (if Vite is
#                              actively watching .tmp/ - see lesson
#                              2026-05-24 in agent_lessons.md re: EBUSY).
#
# Usage (from the grifon-command folder):
#   .\scripts\snapshot-wizard-session.ps1                 # phase 1: copy snippet
#   # ...paste snippet into DevTools, hit enter...
#   .\scripts\snapshot-wizard-session.ps1 -FromClipboard  # phase 2: save JSON
#
# Restore later with .\scripts\restore-wizard-session.ps1

[CmdletBinding()]
param(
    [switch]$FromClipboard,
    [string]$OutDir
)

$ErrorActionPreference = "Stop"

$KEYS = @(
    "wizardSessionV1",
    "marketMindReport",
    "marketMindUserInputs",
    "marketMindReportSavedAt",
    "grifon_admin",
    "grifon_recent_work_v1",
    "grifon_onboarded"
)

if (-not $FromClipboard) {
    # Phase 1: emit the snippet to clipboard.
    $keysJs = ($KEYS | ForEach-Object { "'$_'" }) -join ","
    $snippet = "(()=>{const ks=[$keysJs];const o={};for(const k of ks){const v=localStorage.getItem(k);if(v!==null)o[k]=v;}const j=JSON.stringify({_snapshotAt:new Date().toISOString(),_origin:location.origin,localStorage:o});navigator.clipboard.writeText(j).then(()=>console.log('%c[grifon] snapshot copied to clipboard ('+j.length+' chars). Now run: snapshot-wizard-session.ps1 -FromClipboard','color:#FFCC00;font-weight:bold')).catch(e=>console.error('clipboard write failed - copy this manually:',j));})();"
    Set-Clipboard -Value $snippet
    Write-Host ""
    Write-Host "OK: DevTools snippet copied to clipboard ($($snippet.Length) chars)" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "  1. Open http://localhost:5173 (or whatever port Vite is on)"
    Write-Host "  2. Open DevTools console (F12)"
    Write-Host "  3. Paste the snippet and hit Enter"
    Write-Host "  4. Wait for the yellow [grifon] confirmation log"
    Write-Host "  5. Run: .\scripts\snapshot-wizard-session.ps1 -FromClipboard"
    Write-Host ""
    return
}

# Phase 2: read JSON from clipboard, write to file.
$raw = Get-Clipboard -Raw
if ([string]::IsNullOrWhiteSpace($raw)) {
    Write-Host "ERROR: clipboard is empty. Run without -FromClipboard first, then paste the snippet into DevTools." -ForegroundColor Red
    exit 1
}

try {
    $parsed = $raw | ConvertFrom-Json -ErrorAction Stop
} catch {
    Write-Host "ERROR: clipboard does not contain valid JSON." -ForegroundColor Red
    Write-Host "First 200 chars: $($raw.Substring(0, [Math]::Min(200, $raw.Length)))"
    exit 1
}

if (-not $parsed.localStorage) {
    Write-Host "ERROR: JSON is missing the 'localStorage' field. Did you paste the right thing?" -ForegroundColor Red
    exit 1
}

# Pick output directory. Default .tmp/, fall back to $env:TEMP if .tmp/ is
# locked by Vite (agent_lessons.md 2026-05-24).
$repoRoot = Split-Path -Parent $PSScriptRoot
if (-not $OutDir) {
    $tmp = Join-Path $repoRoot ".tmp"
    if (-not (Test-Path $tmp)) {
        New-Item -ItemType Directory -Path $tmp | Out-Null
    }
    # Probe writability - if Vite has it locked, fall back.
    $probe = Join-Path $tmp ".write-probe-$([Guid]::NewGuid().ToString('N'))"
    try {
        [System.IO.File]::WriteAllText($probe, "ok")
        Remove-Item $probe -Force
        $OutDir = $tmp
    } catch {
        Write-Host "NOTE: .tmp/ is locked (Vite watcher?). Falling back to `$env:TEMP." -ForegroundColor Yellow
        $OutDir = $env:TEMP
    }
}

$ts = Get-Date -Format "yyyyMMdd-HHmmss"
$dest = Join-Path $OutDir "grifon-wizard-snapshot-$ts.json"

[System.IO.File]::WriteAllText($dest, $raw, [System.Text.UTF8Encoding]::new($false))

$keysFound = @($parsed.localStorage.PSObject.Properties.Name)
Write-Host ""
Write-Host "OK: snapshot written" -ForegroundColor Green
Write-Host "    Path:    $dest"
Write-Host "    Origin:  $($parsed._origin)"
Write-Host "    Time:    $($parsed._snapshotAt)"
Write-Host "    Keys:    $($keysFound -join ', ')"
Write-Host ""
Write-Host "To restore after reboot:" -ForegroundColor Cyan
Write-Host "  .\scripts\restore-wizard-session.ps1"
Write-Host "  (auto-picks the most recent snapshot; use -Path to specify explicitly)"
Write-Host ""
